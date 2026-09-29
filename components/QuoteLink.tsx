"use client";

import { site } from "@/lib/content";
import { useSiteSettings } from "@/components/SiteSettingsProvider";

export function QuoteLink({ children, className }: { children: React.ReactNode; className?: string }) {
  const settings = useSiteSettings();
  return (
    <a href={settings?.whatsapp ?? site.whatsapp} target="_blank" rel="noreferrer" className={className}>
      {children}
    </a>
  );
}
