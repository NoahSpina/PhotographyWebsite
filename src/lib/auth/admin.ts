import "server-only";
import { createClient, type ServerSupabaseClient } from "@/lib/supabase/server";

export type AdminCheck =
  | { ok: true; supabase: ServerSupabaseClient; userId: string }
  | { ok: false; reason: "unauthenticated" | "forbidden" };

/**
 * Server-side RBAC gate for admin Route Handlers and Server Actions.
 * Returns the RLS-bound client so queries are also checked by policies.
 */
export async function verifyAdmin(): Promise<AdminCheck> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;

  if (!userId) {
    return { ok: false, reason: "unauthenticated" };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Admin check could not read the profile:", error.message);
  }

  if (error || profile?.role !== "admin") {
    return { ok: false, reason: "forbidden" };
  }

  return { ok: true, supabase, userId };
}
