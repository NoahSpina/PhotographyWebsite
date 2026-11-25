import "server-only";
import { connection } from "next/server";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/types";

export type SiteViewer = {
  name: string;
  role: Role;
};

/** The signed-in person, or null. Deduped for the request. */
export const getSiteViewer = cache(async (): Promise<SiteViewer | null> => {
  // Supabase checks token expiry with Date.now(). Wait for the request
  // first so that read is not treated as a prerender.
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, full_name, email")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Could not read the signed-in profile:", error.message);
  }

  const role: Role = profile?.role === "admin" ? "admin" : "client";
  const name = profile?.full_name?.trim() || emailName(profile?.email) || "there";
  return { name, role };
});

function emailName(email: string | null | undefined): string | null {
  const local = email?.split("@")[0]?.trim();
  return local || null;
}
