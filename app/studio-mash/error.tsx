"use client";
import Link from "next/link";
export default function StudioError({ reset }: { reset: () => void }) {
  return (
    <main className="studio-error-page">
      <section className="studio-card" role="alert">
        <p className="studio-kicker">MASH Studio · Conexión</p>
        <h1>No pudimos cargar esta sección</h1>
        <p>
          Comprueba tu conexión e intenta de nuevo. No se han confirmado
          cambios.
        </p>
        <div className="studio-heading-actions">
          <button className="admin-button" onClick={reset}>
            Reintentar
          </button>
          <Link
            href="/studio-mash"
            className="admin-button admin-button--secondary"
          >
            Volver al inicio
          </Link>
        </div>
      </section>
    </main>
  );
}
