import { connection, NextResponse } from "next/server";
import { destinationAfterSignIn } from "@/lib/auth/paths";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/types";

export async function GET(request: Request) {
  await connection();

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { data } = await supabase.auth.getClaims();
      const userId = data?.claims.sub;
      let role: Role | null = null;
      let albumId: string | null = null;

      if (userId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userId)
          .maybeSingle();
        role = profile?.role ?? null;

        if (role !== "admin") {
          const { data: album } = await supabase
            .from("albums")
            .select("id")
            .eq("client_id", userId)
            .eq("status", "published")
            .order("shoot_date", { ascending: false, nullsFirst: false })
            .limit(1)
            .maybeSingle();
          albumId = album?.id ?? null;
        }
      }

      const destination = destinationAfterSignIn({ role, albumId, next });
      return NextResponse.redirect(new URL(destination, url.origin));
    }
  }

  const loginUrl = new URL("/login", url.origin);
  loginUrl.searchParams.set("error", "auth");
  return NextResponse.redirect(loginUrl);
}
