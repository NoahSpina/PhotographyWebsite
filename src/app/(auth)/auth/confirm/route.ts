import type { EmailOtpType } from "@supabase/supabase-js";
import { connection, NextResponse } from "next/server";
import { resolveSignInDestination } from "@/lib/auth/destination";
import { internalPathFromRedirect } from "@/lib/auth/paths";
import { publicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const EMAIL_OTP_TYPES: readonly EmailOtpType[] = ["email", "magiclink", "signup", "invite"];

function isEmailOtpType(value: string | null): value is EmailOtpType {
  return value !== null && (EMAIL_OTP_TYPES as readonly string[]).includes(value);
}

/**
 * Verifies a `token_hash` email link server-side. Unlike the PKCE code in
 * /auth/callback, this works when the link is opened on a different device
 * than the one that requested it (e.g. a gallery link the studio sent).
 *
 * The Supabase "Magic link" and "Confirm signup" templates must link to:
 * {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next={{ .RedirectTo }}
 */
export async function GET(request: Request) {
  await connection();

  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const allowedOrigins = [url.origin];
  if (publicEnv.appUrl) allowedOrigins.push(new URL(publicEnv.appUrl).origin);
  const next = internalPathFromRedirect(url.searchParams.get("next"), allowedOrigins);

  if (tokenHash && isEmailOtpType(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

    if (!error) {
      const destination = await resolveSignInDestination(supabase, next);
      return NextResponse.redirect(new URL(destination, url.origin));
    }

    console.error("Email link verification failed:", error.message);
  }

  const loginUrl = new URL("/login", url.origin);
  loginUrl.searchParams.set("error", "auth");
  return NextResponse.redirect(loginUrl);
}
