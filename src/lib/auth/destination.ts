import "server-only";
import { destinationAfterSignIn } from "@/lib/auth/paths";
import type { ServerSupabaseClient } from "@/lib/supabase/server";
import type { Role } from "@/types";

/** Where to send the user whose session was just established. */
export async function resolveSignInDestination(
  supabase: ServerSupabaseClient,
  next: string | null,
): Promise<string> {
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

  return destinationAfterSignIn({ role, albumId, next });
}
