import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { resolveSignInDestination } from "@/lib/auth/destination";
import { publicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

const AUTH_CACHE_HEADERS = ["cache-control", "expires", "pragma"] as const;

/**
 * Refreshes the Supabase auth cookies, then applies route guards.
 *
 * The JWT `role` claim is the Postgres role (`authenticated`), not the
 * studio role. Admin access is read from `profiles.role`.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    publicEnv.supabaseUrl,
    publicEnv.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
          Object.entries(headers).forEach(([key, value]) => {
            supabaseResponse.headers.set(key, value);
          });
        },
      },
    },
  );

  // Nothing else may run between creating the client and getClaims().
  // getClaims() validates the JWT and refreshes it when it is near expiry.
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;

  const { pathname } = request.nextUrl;
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const isGalleryRoute =
    pathname === "/gallery" || pathname.startsWith("/gallery/");

  if ((isAdminRoute || isGalleryRoute) && !userId) {
    return redirectToLogin(request, supabaseResponse);
  }

  if (isAdminRoute && userId) {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("Admin route guard could not read the profile:", error.message);
    }

    if (error || profile?.role !== "admin") {
      return redirectToLogin(request, supabaseResponse, "forbidden");
    }
  }

  // A signed-in visitor should not see the login form. Activity keeps that
  // page mounted after a successful sign-in, and returning to it otherwise
  // restores the stuck "Signing in…" button.
  if (pathname === "/login" && userId) {
    const destination = await resolveSignInDestination(
      supabase,
      request.nextUrl.searchParams.get("next"),
    );
    if (destination !== "/login") {
      return redirectTo(request, supabaseResponse, destination);
    }
  }

  return supabaseResponse;
}

function redirectToLogin(
  request: NextRequest,
  sessionResponse: NextResponse,
  errorCode?: "forbidden",
) {
  const next = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  return redirectTo(request, sessionResponse, "/login", {
    next,
    ...(errorCode ? { error: errorCode } : {}),
  });
}

function redirectTo(
  request: NextRequest,
  sessionResponse: NextResponse,
  pathname: string,
  searchParams?: Record<string, string>,
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      url.searchParams.set(key, value);
    }
  }

  const redirectResponse = NextResponse.redirect(url);
  sessionResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });
  for (const header of AUTH_CACHE_HEADERS) {
    const value = sessionResponse.headers.get(header);
    if (value) redirectResponse.headers.set(header, value);
  }
  return redirectResponse;
}
