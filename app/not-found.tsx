import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found section-shell">
      <p className="eyebrow">MASH</p>
      <h1>Pagina no encontrada</h1>
      <p>La ruta solicitada no esta disponible en esta version del sitio.</p>
      <Link href="/es" className="button button--gold">
        Volver al inicio
      </Link>
    </main>
  );
}
