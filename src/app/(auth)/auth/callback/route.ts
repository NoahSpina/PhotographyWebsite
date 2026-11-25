import { connection, NextResponse } from "next/server";
import { resolveSignInDestination } from "@/lib/auth/destination";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  await connection();

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const destination = await resolveSignInDestination(supabase, next);
      return NextResponse.redirect(new URL(destination, url.origin));
    }
  }

  const loginUrl = new URL("/login", url.origin);
  loginUrl.searchParams.set("error", "auth");
  return NextResponse.redirect(loginUrl);
}
