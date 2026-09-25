import { redirect } from "next/navigation";
import { adminRoute, getSupabaseSetupIssues } from "./env";
import { createSupabaseAdminClient } from "./admin";
import { createSupabaseServerClient } from "./server";

export type AdminProfile = {
  id: string;
  email: string;
  user_id: string | null;
};

export async function getCurrentAdmin() {
  if (getSupabaseSetupIssues().length > 0) return null;

  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user?.email) return null;

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("admin_users")
    .select("id,email,user_id")
    .eq("email", user.email)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return null;

  if (!data.user_id) {
    const { data: linked, error: linkError } = await admin
      .from("admin_users")
      .update({ user_id: user.id })
      .eq("id", data.id)
      .is("user_id", null)
      .select("id,email,user_id")
      .maybeSingle();

    if (linkError || !linked || linked.user_id !== user.id) return null;
    return linked as AdminProfile;
  }

  if (data.user_id !== user.id) return null;

  return data as AdminProfile;
}

export async function requireAdmin() {
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect(`${adminRoute}/login`);
  }

  return admin;
}
