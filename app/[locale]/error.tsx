"use client";
export default function ContentErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="section-shell">
      <h1>Contenido no disponible / Content unavailable</h1>
      <p>No pudimos consultar el contenido actual. Intenta de nuevo.</p>
      <button className="button button--dark" onClick={reset}>
        Reintentar / Retry
      </button>
    </section>
  );
}
