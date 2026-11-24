"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  analyticsHostAllowed,
  createAnalyticsCollector,
} from "@/lib/analytics";

export function PublicAnalytics() {
  const pathname = usePathname();
  const [collect] = useState(() =>
    createAnalyticsCollector((detail) =>
      window.dispatchEvent(new CustomEvent("mash:analytics", { detail })),
    ),
  );

  useEffect(() => {
    const host = location.hostname;
    if (!analyticsHostAllowed(host)) return;
    collect(host, pathname);

    const onClick = (event: MouseEvent) => {
      const name =
        event.target instanceof Element
          ? event.target
              .closest("[data-analytics]")
              ?.getAttribute("data-analytics")
          : null;
      if (name) collect(host, pathname, name);
    };
    const onCompare = () => collect(host, pathname, "compare_photos");
    document.addEventListener("click", onClick);
    document.addEventListener("mash:compare", onCompare);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("mash:compare", onCompare);
    };
  }, [collect, pathname]);

  return null;
}
