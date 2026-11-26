"use client";

import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { Locale } from "@/lib/i18n";

export function HomeCanvas({ children, title, locale }: { children: ReactNode; title: string; locale: Locale }) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    let observer: MutationObserver | undefined;
    const connect = () => {
      observer?.disconnect();
      const owner = element.contentDocument;
      const find = () => {
        const target = owner?.querySelector<HTMLElement>("[data-home-canvas]") ?? null;
        setHost(target);
        if (target) observer?.disconnect();
        return target;
      };
      if (!find() && owner?.documentElement) {
        observer = new MutationObserver(find);
        observer.observe(owner.documentElement, { childList: true, subtree: true });
      }
    };
    element.addEventListener("load", connect);
    connect();
    return () => {
      element.removeEventListener("load", connect);
      observer?.disconnect();
    };
  }, []);
  useEffect(() => {
    if (host) host.ownerDocument.documentElement.lang = locale;
  }, [host, locale]);
  function preventNavigation(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("a")) event.preventDefault();
  }
  return (
    <>
      <iframe
        ref={frame}
        className="visual-home-frame"
        title={title}
        src="/studio-mash/contenido/lienzo"
      />
      {host && createPortal(
        <div
          onClickCapture={preventNavigation}
          onAuxClickCapture={preventNavigation}
          onKeyDown={(event) => {
            if (event.key === "Escape" && !host.querySelector('.menu-toggle[aria-expanded="true"]')) {
              document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
            }
          }}
        >
          {children}
        </div>,
        host,
      )}
    </>
  );
}
