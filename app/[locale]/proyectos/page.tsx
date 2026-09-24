import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { projects } from "@/lib/content";
import { isLocale, type Locale } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "es" ? "Proyectos" : "Projects",
    description:
      locale === "es"
        ? "Fundacion visual para proyectos e instalaciones completadas por MASH."
        : "Visual foundation for MASH completed installations and projects."
  };
}

export default async function ProjectsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale = rawLocale as Locale;

  return (
    <section className="section-shell page-hero">
      <p className="eyebrow">{locale === "es" ? "Proyectos" : "Projects"}</p>
      <h1>{locale === "es" ? "Instalaciones reales, preparadas para crecer." : "Real installations, ready to grow."}</h1>
      <p>
        {locale === "es"
          ? "Esta seccion queda estructurada para galerias de proyectos completados. Por ahora usa imagenes existentes como base temporal."
          : "This section is structured for completed project galleries. For now, existing images are used as temporary visual foundations."}
      </p>
      <div className="project-list">
        {projects.map((project) => (
          <article key={project.slug} className="project-feature">
            <div className="project-feature__image">
              <Image src={project.image} alt={project.alt[locale]} fill sizes="(max-width: 900px) 92vw, 48vw" />
            </div>
            <div>
              <p className="eyebrow">{project.location[locale]}</p>
              <h2>{project.title[locale]}</h2>
              <p>{project.description[locale]}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
