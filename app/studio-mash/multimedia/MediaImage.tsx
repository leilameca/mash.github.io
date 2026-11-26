"use client";
import { useState } from "react";
/* eslint-disable @next/next/no-img-element -- precomputed variants avoid request-time reprocessing. */
import type { MediaVariant } from "@/lib/media/types";
export function MediaImage({
  src,
  variants = [],
  alt = "",
  className,
  onLoad,
  eager = false,
}: {
  src?: string | null;
  variants?: MediaVariant[];
  alt?: string;
  className?: string;
  onLoad?: (width: number, height: number) => void;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState<string>();
  if (!src || failed === src)
    return (
      <span
        className="studio-media-placeholder"
        role="img"
        aria-label={src ? "Imagen no disponible" : "Imagen pendiente de verificación"}
      >
        —
      </span>
    );
  const sizes = [...new Map(variants.map((v) => [v.width, v])).values()].sort(
    (a, b) => a.width - b.width,
  );
  return (
    <img
      src={src}
      srcSet={
        sizes.length
          ? sizes.map((v) => `${v.public_url} ${v.width}w`).join(", ")
          : undefined
      }
      sizes="(max-width: 600px) 44vw, (max-width: 1000px) 30vw, 280px"
      alt={alt}
      className={className}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailed(src)}
      onLoad={
        onLoad
          ? (event) =>
              onLoad(
                event.currentTarget.naturalWidth,
                event.currentTarget.naturalHeight,
              )
          : undefined
      }
    />
  );
}
