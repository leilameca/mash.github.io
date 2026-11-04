"use client";

import { site } from "@/lib/content";
import { useSiteSettings } from "@/components/SiteSettingsProvider";

export function QuoteLink({ children, className, message }: { children: React.ReactNode; className?: string; message?: string }) {
  const settings = useSiteSettings();
  const url = new URL(settings?.whatsapp ?? site.whatsapp);
  if (message) url.searchParams.set("text", message);
  return (
    <a href={url.toString()} target="_blank" rel="noreferrer" className={className}>
      {children}
    </a>
  );
}
