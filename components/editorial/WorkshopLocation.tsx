import type { Locale } from "@/lib/i18n";
import "./workshop-location.css";

const directions = "https://maps.app.goo.gl/boeE5xkJGyu5Pw4m9";
const embed =
  "https://www.google.com/maps/embed?origin=mfe&pb=!1m3!2m1!1s19.486419,-70.664113!6i16";

export function WorkshopLocation({ locale }: { locale: Locale }) {
  const es = locale === "es";
  const title = es ? "Ubicación del taller" : "Workshop location";

  return (
    <section
      className="section-shell workshop-location"
      aria-labelledby="workshop-location-title"
    >
      <div className="workshop-location__heading">
        <h2 id="workshop-location-title">{title}</h2>
        <a
          className="button button--gold"
          data-analytics="click_directions"
          href={directions}
          target="_blank"
          rel="noopener noreferrer"
        >
          {es ? "Cómo llegar" : "Get directions"}
        </a>
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
