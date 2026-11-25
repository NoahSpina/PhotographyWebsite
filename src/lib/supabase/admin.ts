import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getServerEnv, publicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

export function createAdminClient() {
  const { supabaseServiceRoleKey } = getServerEnv();

  return createClient<Database>(publicEnv.supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
