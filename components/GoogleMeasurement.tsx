"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  analyticsHostAllowed,
  createAnalyticsCollector,
  isAnalyticsEvent,
  type AnalyticsEvent,
} from "@/lib/analytics";
import type { Locale } from "@/lib/i18n";

type Choice = "allow" | "deny";
const storageKey = "mash.analytics-consent.v1";

export function GoogleMeasurement({
  id,
  locale,
}: {
  id: string;
  locale: Locale;
}) {
  const pathname = usePathname();
  const [supported, setSupported] = useState(false);
  const [choice, setChoice] = useState<Choice | null>(null);
  const [editing, setEditing] = useState(false);
  const initialized = useRef(false);
  const currentPath = useRef(pathname);
  currentPath.current = pathname;
  const es = locale === "es";

  useEffect(() => {
    if (!analyticsHostAllowed(location.hostname) || !/^G-[A-Z0-9]+$/.test(id))
      return;
    setSupported(true);
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved === "allow" || saved === "deny") setChoice(saved);
      else setEditing(true);
    } catch {
      setEditing(true);
    }
  }, [id]);

  useEffect(() => {
    if (!supported) return;
    const browser = window as Window & { dataLayer?: unknown[] };
    const disable = `ga-disable-${id}` as const;
    Object.assign(browser, { [disable]: choice !== "allow" });
    if (choice !== "allow") return;
    const layer = (browser.dataLayer ??= []);
    function tag(..._args: unknown[]) {
      layer.push(arguments);
    }

    const locationFor = (language: string) =>
      `${location.origin}/${language === "en" ? "en" : "es"}`;
    if (!initialized.current) {
      initialized.current = true;
      tag("consent", "default", {
        analytics_storage: "granted",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
      });
      tag("js", new Date());
      tag("config", id, {
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        page_location: locationFor(locale),
        page_referrer: "",
      });
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
      script.referrerPolicy = "no-referrer";
      document.head.append(script);
    }
    const send = ({ event, language, page_type }: AnalyticsEvent) => {
      tag("event", event, {
        send_to: id,
        language,
        page_type,
        page_title: page_type,
        page_location: locationFor(language),
        page_referrer: "",
      });
    };
    const receive = (event: Event) => {
      const detail: unknown = (event as CustomEvent).detail;
      if (isAnalyticsEvent(detail)) send(detail);
    };
    window.addEventListener("mash:analytics", receive);
    createAnalyticsCollector(send)(location.hostname, currentPath.current);
    return () => window.removeEventListener("mash:analytics", receive);
  }, [choice, id, locale, supported]);

  if (!supported) return null;
  function select(value: Choice) {
    try {
      localStorage.setItem(storageKey, value);
    } catch {
      /* Current tab still honors the choice. */
    }
    setChoice(value);
    setEditing(false);
  }
  return (
    <section
      className="section-shell mash-privacy-settings"
      aria-label={es ? "Privacidad y analítica" : "Privacy and analytics"}
    >
      {editing ? (
        <>
          <p>
            {es
              ? "¿Permites que usemos Google Analytics para medir cómo se usa el sitio?"
              : "May we use Google Analytics to understand how this site is used?"}
          </p>
          <button type="button" onClick={() => select("deny")}>
            {es ? "Rechazar" : "Decline"}
          </button>
          <button type="button" onClick={() => select("allow")}>
            {es ? "Aceptar analítica" : "Allow analytics"}
          </button>
        </>
      ) : (
        <button type="button" onClick={() => setEditing(true)}>
          {es ? "Preferencias de analítica" : "Analytics preferences"}
        </button>
      )}
    </section>
  );
}
