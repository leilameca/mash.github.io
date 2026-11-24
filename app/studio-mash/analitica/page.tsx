import { requireAdmin } from "@/lib/supabase/auth";
import { getCommercialEvents } from "@/lib/ga-report";
import { StudioShell } from "../StudioShell";
import { PageHeader, EmptyState } from "../StudioPrimitives";

export default async function Page() {
  const admin = await requireAdmin();
  const report = await getCommercialEvents();
  return (
    <StudioShell admin={admin}>
      <PageHeader
        title="Analítica"
        eyebrow="Google Analytics 4"
        description="Últimos 30 días completos. Los clics en WhatsApp indican intención de contacto."
      />
      <section className="studio-card">
        {report.status === "ready" && report.rows.length > 0 ? (
          <table className="studio-table">
            <caption>Eventos del sitio</caption>
            <thead>
              <tr>
                <th scope="col">Evento</th>
                <th scope="col">Total</th>
              </tr>
            </thead>
            <tbody>
              {report.rows.map(({ event, count }) => (
                <tr key={event}>
                  <th scope="row">{event}</th>
                  <td>{count.toLocaleString("es-DO")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState
            title={
              report.status === "ready"
                ? "Sin eventos en este periodo"
                : "Analítica no disponible"
            }
            description={
              report.status === "unconfigured"
                ? "Conecta la propiedad autorizada de Google Analytics para consultar sus métricas."
                : report.status === "unavailable"
                  ? "Google Analytics no respondió o la cuenta no tiene acceso a la propiedad."
                  : "Google Analytics no devolvió eventos comerciales para los últimos 30 días."
            }
          />
        )}
      </section>
    </StudioShell>
  );
}
