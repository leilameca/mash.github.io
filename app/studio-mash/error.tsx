"use client";
export default function StudioError({ reset }: { reset: () => void }) {
  return <section className="studio-card" role="alert"><h2>No pudimos cargar esta sección</h2><p>Comprueba tu conexión e intenta de nuevo. No se han confirmado cambios.</p><button className="admin-button" onClick={reset}>Reintentar</button></section>;
}
