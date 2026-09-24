export const adminRoute = "/studio-mash";

export type SupabasePublicConfig = {
  url: string;
  anonKey: string;
};

export type SupabaseServerConfig = SupabasePublicConfig & {
  serviceRoleKey?: string;
};

export function getSupabasePublicConfig(): SupabasePublicConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;

  return { url, anonKey };
}

export function getSupabaseServerConfig(): SupabaseServerConfig | null {
  const publicConfig = getSupabasePublicConfig();
  if (!publicConfig) return null;

  return {
    ...publicConfig,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  };
}

export function isSupabaseCatalogEnabled() {
  return process.env.NEXT_PUBLIC_ENABLE_SUPABASE_CATALOG === "true";
}

export function getSupabaseSetupIssues() {
  const issues: string[] = [];

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) issues.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) issues.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) issues.push("SUPABASE_SERVICE_ROLE_KEY");

  return issues;
}
