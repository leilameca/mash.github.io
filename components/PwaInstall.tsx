"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";

type InstallPrompt = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PwaInstall({ locale }: { locale: Locale }) {
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)");
    const updateInstalled = () => setInstalled(standalone.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    updateInstalled();
    setIsIos(/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
    const onPrompt = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPrompt); };
    const onInstalled = () => { setInstalled(true); setInstallPrompt(null); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    standalone.addEventListener("change", updateInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      standalone.removeEventListener("change", updateInstalled);
    };
  }, []);

  if (installed || (!installPrompt && !isIos && !showHelp)) return null;

  async function install() {
    if (!installPrompt) { setShowHelp((value) => !value); return; }
    setPending(true);
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
    } catch {
      setShowHelp(true);
    } finally {
      setInstallPrompt(null);
      setPending(false);
    }
  }

  return (
    <div className="pwa-install">
      <button type="button" className="pwa-install__button" onClick={install} disabled={pending} aria-expanded={showHelp} aria-controls="pwa-install-help">
        {locale === "es" ? "Instalar MASH" : "Install MASH"}
      </button>
      {showHelp && <p id="pwa-install-help" role="status">
        {isIos
          ? locale === "es" ? "En Safari, abre Compartir y elige Añadir a pantalla de inicio." : "In Safari, open Share and choose Add to Home Screen."
          : locale === "es" ? "Abre el menú del navegador y elige Instalar MASH." : "Open your browser menu and choose Install MASH."}
      </p>}
    </div>
  );
}
