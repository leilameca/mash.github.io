"use client";
import { useParams } from "next/navigation";
export default function CatalogError({ reset }: { reset: () => void }) {
  const es = useParams().locale !== "en";
  return <section className="section-shell page-hero" role="alert"><h1>{es ? "El catálogo no está disponible en este momento" : "The catalog is temporarily unavailable"}</h1><p>{es ? "Intenta de nuevo en unos instantes." : "Please try again shortly."}</p><button className="button button--gold" onClick={reset}>{es ? "Reintentar" : "Retry"}</button></section>;
}
