"use client";

import { createContext, useContext } from "react";

type SiteSettingsContextValue = {
  whatsapp: string;
};

const SiteSettingsContext = createContext<SiteSettingsContextValue | null>(null);

export function SiteSettingsProvider({ children, value }: { children: React.ReactNode; value: SiteSettingsContextValue }) {
  return <SiteSettingsContext.Provider value={value}>{children}</SiteSettingsContext.Provider>;
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}
