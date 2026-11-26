import type { Locale } from "@/lib/i18n";
import { workshopContent } from "@/lib/workshop";
import "./workshop-location.css";

export function WorkshopLocation({
  locale,
  map = workshopContent(locale, null, null),
  preview = false,
}: {
  locale: Locale;
  map?: ReturnType<typeof workshopContent>;
  preview?: boolean;
}) {
  const es = locale === "es";
  if (!map.visible) return null;
  const embed = "https://www.google.com/maps/embed?origin=mfe&pb=!1m3!2m1!1s" +
    map.latitude + "," + map.longitude + "!6i16";

  return (
    <section
      className="section-shell workshop-location"
      aria-label={map.name}
    >
      <div className="workshop-location__heading">
        <div>
          <h2>{map.name}</h2>
          {map.address && <p>{map.address}</p>}
        </div>
        {preview ? <span className="button button--gold">{map.button}</span> : <a
          className="button button--gold"
          data-analytics="click_directions"
          href={map.directions}
          target="_blank"
          rel="noopener noreferrer"
        >
          {map.button}
        </a>}
      </div>
      <iframe
        className="workshop-location__map"
        title={
          es ? "Taller MASH en Google Maps" : "MASH workshop on Google Maps"
        }
        src={embed + (es ? "&hl=es" : "&hl=en")}
        loading="lazy"
        referrerPolicy="no-referrer"
        allowFullScreen
      />
    </section>
  );
}
