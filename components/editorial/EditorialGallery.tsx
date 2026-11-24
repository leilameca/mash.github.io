/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import type { Locale } from "@/lib/i18n";

export type EditorialImage = {
  id: string;
  src: string;
  alt: string;
  caption?: string | null;
};

function GalleryImage({
  photo,
  locale,
}: {
  photo: EditorialImage;
  locale: Locale;
}) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <p className="editorial-photo-fallback">
      {locale === "es" ? "Fotografía no disponible" : "Photo unavailable"}
    </p>
  ) : (
    <img
      src={photo.src}
      alt={photo.alt}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

export function EditorialGallery({
  photos,
  locale,
}: {
  photos: EditorialImage[];
  locale: Locale;
}) {
  if (!photos.length) return null;
  return (
    <div
      className="editorial-photos"
      role="group"
      aria-label={locale === "es" ? "Galería de fotografías" : "Photo gallery"}
    >
      {photos.map((photo) => (
        <figure key={photo.id}>
          <GalleryImage key={photo.src} photo={photo} locale={locale} />
          {photo.caption && <figcaption>{photo.caption}</figcaption>}
        </figure>
      ))}
    </div>
  );
}
