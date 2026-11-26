"use client";

import { useEffect, useRef } from "react";

export function CanvasMount() {
  const surface = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = surface.current;
    if (!root) return;
    // Publish the portal target only after this Next.js document has hydrated.
    const target = root.ownerDocument.createElement("div");
    target.dataset.homeCanvas = "";
    root.append(target);
    return () => target.remove();
  }, []);
  return <div ref={surface} className="page-shell mash-public" />;
}
