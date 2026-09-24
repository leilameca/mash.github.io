import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/supabase/auth";
import { adminRoute, getSupabaseSetupIssues } from "@/lib/supabase/env";
import { LoginForm } from "./LoginForm";

export default async function AdminLoginPage() {
  const currentAdmin = await getCurrentAdmin();
  if (currentAdmin) redirect(adminRoute);

  const setupIssues = getSupabaseSetupIssues();

  return (
    <main className="admin-login">
      <section className="admin-login__visual" aria-hidden="true" />
      <section className="admin-login__content">
        {setupIssues.length > 0 ? (
          <div className="admin-login__panel">
            <div className="admin-brand">
              <span>MASH</span>
              <small>Setup pendiente</small>
            </div>
            <h1>Faltan credenciales Supabase</h1>
            <p>Configura estas variables en `.env.local` antes de usar el acceso administrativo.</p>
            <ul className="admin-setup-list">
              {setupIssues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </div>
        ) : (
          <LoginForm />
        )}
      </section>
    </main>
  );
}
