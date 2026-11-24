"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { localizedPath, type Locale } from "@/lib/i18n";
import type { PublicAnnouncement } from "@/lib/editorial/queries";
import {
  withinAnnouncementWindow,
  type pageTargets,
} from "@/lib/editorial/schema";
import "./editorial.css";

type Target = (typeof pageTargets)[number];
function targetOf(path: string): Target {
  const section = path.split("/")[2];
  return section === "noticias"
    ? "news"
    : section === "proyectos"
      ? "projects"
      : section === "nosotros"
        ? "about"
        : section === "contacto"
          ? "contact"
          : section === "productos" || section === "colecciones"
            ? "catalog"
            : !section
              ? "home"
              : "all";
}
export function AnnouncementBanner({
  entry,
  locale,
  preview = false,
  onDismiss,
}: {
  entry: PublicAnnouncement;
  locale: Locale;
  preview?: boolean;
  onDismiss?: () => void;
}) {
  const path = entry.data.href.startsWith("/")
    ? localizedPath(locale, entry.data.href)
    : entry.data.href;
  return (
    <aside
      className={
        "editorial-banner editorial-banner--" + entry.data.presentation
      }
      aria-label={locale === "es" ? "Anuncio de MASH" : "MASH announcement"}
    >
      <p>{entry.message}</p>
      {!!path &&
        !!entry.cta &&
        (preview ? (
          <strong>{entry.cta}</strong>
        ) : (
          <a href={path}>{entry.cta}</a>
        ))}
      {entry.data.dismissible && onDismiss && (
        <button
          onClick={onDismiss}
          type="button"
          aria-label={
            locale === "es" ? "Cerrar anuncio" : "Dismiss announcement"
          }
        >
          ×
        </button>
      )}
    </aside>
  );
}
export function ScheduledAnnouncements({
  initial,
  locale,
}: {
  initial: PublicAnnouncement[];
  locale: Locale;
}) {
  const route = usePathname();
  const [entries, setEntries] = useState(initial);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [time, setTime] = useState<number | null>(null);
  const lastPath = useRef(route);
  useEffect(() => {
    setTime(Date.now());
    try {
      setDismissed(
        JSON.parse(
          sessionStorage.getItem("mash-announcements-dismissed") ?? "[]",
        ),
      );
    } catch {}
    const timer = setInterval(() => setTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    async function update() {
      try {
        const result = await fetch("/api/announcements?locale=" + locale, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (result.ok) setEntries(await result.json());
      } catch {}
    }
    if (lastPath.current !== route) {
      lastPath.current = route;
      void update();
    }
    const refresh = setInterval(() => void update(), 60000);
    return () => {
      controller.abort();
      clearInterval(refresh);
    };
  }, [route, locale]);
  const identity = (entry: PublicAnnouncement) =>
    entry.id + ":" + entry.publishedAt;
  const current = entries.find(
    (row) =>
      !dismissed.includes(identity(row)) &&
      (time === null
        ? row.data.pages.includes("all") ||
          row.data.pages.includes(targetOf(route))
        : withinAnnouncementWindow(row.data, locale, targetOf(route), time)),
  );
  if (!current) return null;
  return (
    <div className="editorial-announcement-placement">
      <AnnouncementBanner
        entry={current}
        locale={locale}
        onDismiss={() => {
          const next = [...dismissed, identity(current)].slice(-60);
          setDismissed(next);
          try {
            sessionStorage.setItem(
              "mash-announcements-dismissed",
              JSON.stringify(next),
            );
          } catch {}
        }}
      />
    </div>
  );
}
