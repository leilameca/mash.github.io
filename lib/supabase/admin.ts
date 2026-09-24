import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerConfig } from "./env";

export function createSupabaseAdminClient() {
  const config = getSupabaseServerConfig();

  if (!config?.serviceRoleKey) {
    throw new Error("Supabase service role is not configured.");
  }

  return createClient(config.url, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
