"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  analyticsHostAllowed,
  publicAnalyticsPage,
  type Interaction,
} from "@/lib/analytics";

const interactions = new Set<Interaction>([
  "click_whatsapp",
  "view_gallery",
  "compare_photos",
  "change_language",
  "click_directions",
]);

export function PublicAnalytics() {
  const pathname = usePathname();
  const previous = useRef("");

  useEffect(() => {
    if (!analyticsHostAllowed(location.hostname)) return;
    const page = publicAnalyticsPage(pathname);
    if (!page) return;
    const emit = (event: string) => {
      window.dispatchEvent(
        new CustomEvent("mash:analytics", {
          detail: { event, language: page.language, page_type: page.page_type },
        }),
      );
    };

    if (previous.current !== pathname) {
      previous.current = pathname;
      emit("page_view");
      if (page.detailEvent) emit(page.detailEvent);
    }

    const onClick = (event: MouseEvent) => {
      const control =
        (event.target instanceof Element &&
          event.target.closest("[data-analytics]")) ||
        null;
      const name = control?.getAttribute(
        "data-analytics",
      ) as Interaction | null;
      if (name && interactions.has(name)) emit(name);
    };
    const onCompare = () => emit("compare_photos");
    document.addEventListener("click", onClick);
    document.addEventListener("mash:compare", onCompare);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("mash:compare", onCompare);
    };
  }, [pathname]);

  return null;
}
