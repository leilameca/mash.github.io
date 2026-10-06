"use client";

import { useEffect } from "react";

export function PwaRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    let registration: ServiceWorkerRegistration | undefined;
    let cancelled = false;

    const checkForUpdates = () => {
      if (document.visibilityState === "visible") registration?.update().catch(() => {});
    };
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((result) => { if (!cancelled) registration = result; })
      .catch((error) => { console.error("No pudimos activar el modo PWA de MASH.", error); });
    document.addEventListener("visibilitychange", checkForUpdates);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", checkForUpdates);
    };
  }, []);

  return null;
}
