"use client";

import { isHttpsUrl } from "@/lib/security";
import { useSiteSettings } from "@/components/SiteSettingsProvider";

export function QuoteLink({
  children,
  className,
  message,
}: {
  children: React.ReactNode;
  className?: string;
  message?: string;
}) {
  const settings = useSiteSettings();
  if (!settings?.whatsapp || !isHttpsUrl(settings.whatsapp))
    return (
      <span className={className} aria-disabled="true">
        {children}
      </span>
    );
  const url = new URL(settings.whatsapp);
  if (message) url.searchParams.set("text", message);
  return (
    <a
      data-analytics="click_whatsapp"
      href={url.toString()}
      target="_blank"
      rel="noreferrer"
      className={className}
    >
      {children}
    </a>
  );
}
