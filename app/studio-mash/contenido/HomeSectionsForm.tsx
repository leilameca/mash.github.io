"use client";

import Image from "next/image";
import { useActionState } from "react";
import type { HomeSectionsContent } from "@/lib/supabase/site-content";
import { upsertHomeSections, type ActionState } from "../actions";

const initialState: ActionState = {};

const textGroups = [
  { title: "Introduccion", fields: [["introEyebrow", "Etiqueta"], ["introTitle", "Titulo"]] },
  { title: "Colecciones", fields: [["collectionsEyebrow", "Etiqueta"], ["collectionsTitle", "Titulo"], ["collectionsDescription", "Descripcion"]] },
  { title: "Productos destacados", fields: [["featuredEyebrow", "Etiqueta"], ["featuredTitle", "Titulo"], ["featuredDescription", "Descripcion"]] },
  { title: "Franja visual", fields: [["lifestyleLabelOne", "Etiqueta 1"], ["lifestyleLabelTwo", "Etiqueta 2"], ["lifestyleLabelThree", "Etiqueta 3"]] },
  { title: "Filosofia", fields: [["philosophyEyebrow", "Etiqueta"], ["philosophyTitle", "Titulo"], ["philosophyDescription", "Descripcion"]] },
  { title: "Proyectos", fields: [["projectsEyebrow", "Etiqueta"], ["projectsTitle", "Titulo"], ["projectsDescription", "Descripcion"]] },
  { title: "Materiales", fields: [["materialsEyebrow", "Etiqueta"], ["materialsTitle", "Titulo"], ["materialsLead", "Introduccion"], ["materialOneTitle", "Material 1"], ["materialOneDescription", "Descripcion 1"], ["materialTwoTitle", "Material 2"], ["materialTwoDescription", "Descripcion 2"]] }
  ,{ title: "Beneficios", fields: [["benefitsEyebrow", "Etiqueta"], ["benefitsTitle", "Titulo"], ["benefitsDescription", "Descripcion"], ["benefit1Title", "Beneficio 1"], ["benefit1Description", "Detalle 1"], ["benefit2Title", "Beneficio 2"], ["benefit2Description", "Detalle 2"], ["benefit3Title", "Beneficio 3"], ["benefit3Description", "Detalle 3"], ["benefit4Title", "Beneficio 4"], ["benefit4Description", "Detalle 4"]] },
  { title: "Preguntas frecuentes", fields: [["faqEyebrow", "Etiqueta"], ["faqTitle", "Titulo"], ["faqDescription", "Descripcion"], ["faq1Question", "Pregunta 1"], ["faq1Answer", "Respuesta 1"], ["faq2Question", "Pregunta 2"], ["faq2Answer", "Respuesta 2"], ["faq3Question", "Pregunta 3"], ["faq3Answer", "Respuesta 3"], ["faq4Question", "Pregunta 4"], ["faq4Answer", "Respuesta 4"], ["faq5Question", "Pregunta 5"], ["faq5Answer", "Respuesta 5"], ["faq6Question", "Pregunta 6"], ["faq6Answer", "Respuesta 6"]] }
] as const;

const imageFields = [
  ["introImage", "intro_image", "Introduccion"],
  ["philosophyImage", "philosophy_image", "Filosofia"],
  ["projectsImage", "projects_image", "Proyectos"],
  ["materialsPrimaryImage", "materials_primary_image", "Material principal"],
  ["materialsSecondaryImage", "materials_secondary_image", "Material secundario"]
] as const;

const sectionLabels = [
  ["intro", "Introduccion"], ["collections", "Colecciones"], ["featured", "Productos destacados"],
  ["lifestyle", "Franja visual"], ["philosophy", "Filosofia"], ["projects", "Proyectos"], ["materials", "Materiales"], ["benefits", "Beneficios"], ["faq", "Preguntas frecuentes"]
] as const;

function textValue(content: HomeSectionsContent, key: string) {
  if (key === "lifestyleLabelOne") return content.lifestyleLabels[0];
  if (key === "lifestyleLabelTwo") return content.lifestyleLabels[1];
  if (key === "lifestyleLabelThree") return content.lifestyleLabels[2];
  if (/^benefit\d+Title$/.test(key)) return content.benefits[Number(key.match(/\d+/)?.[0] ?? 1) - 1]?.title ?? "";
  if (/^benefit\d+Description$/.test(key)) return content.benefits[Number(key.match(/\d+/)?.[0] ?? 1) - 1]?.description ?? "";
  if (key.startsWith("faq") && key.endsWith("Question")) return content.faqs[Number(key.match(/\d+/)?.[0] ?? 1) - 1]?.question ?? "";
  if (key.startsWith("faq") && key.endsWith("Answer")) return content.faqs[Number(key.match(/\d+/)?.[0] ?? 1) - 1]?.answer ?? "";
  return String((content as unknown as Record<string, unknown>)[key] ?? "");
}

export function HomeSectionsForm({ es, en }: { es: HomeSectionsContent; en: HomeSectionsContent }) {
  const [state, action, pending] = useActionState(upsertHomeSections, initialState);
  return (
    <form action={action} className="studio-form">
      <fieldset className="studio-fieldset">
        <legend>Secciones visibles</legend>
        <div className="studio-visibility-grid">
          {sectionLabels.map(([id, label]) => (
            <label className="studio-checkbox" key={id}><input type="checkbox" name={`visible_${id}`} defaultChecked={es.visible[id]} />{label}</label>
          ))}
        </div>
      </fieldset>

      {textGroups.map((group) => (
        <fieldset className="studio-fieldset" key={group.title}>
          <legend>{group.title}</legend>
          <div className="studio-form__grid">
            {group.fields.map(([key, label]) => (
              <div className="studio-bilingual-field" key={key}>
                <label>{label} ES<textarea name={`${key}_es`} defaultValue={textValue(es, key)} rows={key.toLowerCase().includes("description") || key === "materialsLead" ? 4 : 2} required /></label>
                <label>{label} EN<textarea name={`${key}_en`} defaultValue={textValue(en, key)} rows={key.toLowerCase().includes("description") || key === "materialsLead" ? 4 : 2} required /></label>
              </div>
            ))}
          </div>
        </fieldset>
      ))}

      <fieldset className="studio-fieldset">
        <legend>Imagenes de secciones</legend>
        <p>Cambia una imagen por guardado para mantener la subida estable.</p>
        <div className="studio-media-editor-grid">
          {imageFields.map(([key, field, label]) => {
            const src = String((es as unknown as Record<string, unknown>)[key]);
            return (
              <label key={key}>{label}
                <span className="studio-image-preview studio-image-preview--wide"><Image src={src} alt="" fill sizes="260px" /></span>
                <input type="hidden" name={`existing_${key}`} value={src} />
                <input name={field} type="file" accept="image/jpeg,image/png,image/webp,image/avif" />
              </label>
            );
          })}
        </div>
      </fieldset>
      {state.message && <p className={state.ok ? "admin-success" : "admin-error"}>{state.message}</p>}
      <button className="admin-button" type="submit" disabled={pending}>{pending ? "Guardando..." : "Guardar secciones del inicio"}</button>
    </form>
  );
}
