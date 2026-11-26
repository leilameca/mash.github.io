import type { ReactNode } from "react";
import { stateLabels } from "@/lib/admin/presentation";
export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <section className="studio-heading">
      <div>
        {eyebrow && <p className="studio-kicker">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      <div className="studio-heading-actions">{children}</div>
    </section>
  );
}
export function StatusBadge({ state }: { state: string }) {
  return (
    <span className={`studio-status studio-status--${state}`}>
      {stateLabels[state] ?? state}
    </span>
  );
}
export function EmptyState({
  title = "No hay resultados",
  description = "Prueba otra búsqueda o cambia los filtros.",
  children,
}: {
  title?: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="studio-empty">
      <span aria-hidden="true" className="studio-empty-mark">
        —
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
    </div>
  );
}
