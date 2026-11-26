import type { Locale } from "@/lib/i18n";

export const workshopDefaults = {
  latitude: 19.486419,
  longitude: -70.664113,
  directions: "https://maps.app.goo.gl/boeE5xkJGyu5Pw4m9",
};

export function isMapsLink(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port &&
      ((url.hostname === "maps.app.goo.gl" && url.pathname.length > 1) ||
       (["google.com", "www.google.com", "maps.google.com"].includes(url.hostname) &&
        (url.pathname === "/maps" || url.pathname.startsWith("/maps/"))));
  } catch {
    return false;
  }
}

export function workshopContent(locale: Locale, raw: unknown, copy: unknown) {
  const row = (raw ?? {}) as Record<string, unknown>;
  const translated = (copy ?? {}) as Record<string, unknown>;
  const coordinate = (value: unknown, limit: number, fallback: number) =>
    typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= limit ? value : fallback;
  const label = (key: string, fallback: string) =>
    typeof translated[key] === "string" && translated[key].trim() ? translated[key] : fallback;
  return {
    visible: row.visible !== false,
    latitude: coordinate(row.latitude, 90, workshopDefaults.latitude),
    longitude: coordinate(row.longitude, 180, workshopDefaults.longitude),
    directions: typeof row.directions === "string" && isMapsLink(row.directions) ? row.directions : workshopDefaults.directions,
    name: label("name", locale === "es" ? "Ubicación del taller" : "Workshop location"),
    address: label("address", ""),
    button: label("button", locale === "es" ? "Cómo llegar" : "Get directions"),
  };
}
