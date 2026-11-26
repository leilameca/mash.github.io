"use client";
import Image from "next/image";
import type { Product } from "@/lib/content";
import { useRef, useState } from "react";
export function ProductGallery({
  images,
  name,
  locale,
  alts,
  variants,
}: {
  images: string[];
  name: string;
  locale: string;
  alts?: string[];
  variants?: Product["galleryVariants"];
}) {
  const [selected, setSelected] = useState(0);
  const [failed, setFailed] = useState<Set<string>>(() => new Set());
  const dialog = useRef<HTMLDialogElement>(null);
  const es = locale === "es";
  const active = variants?.[selected];
  const move = (direction: number) =>
    setSelected((index) => (index + direction + images.length) % images.length);
  const unavailable = es ? "Fotografía no disponible" : "Photo unavailable";
  const primary = active?.gallery ?? images[selected];
  const large = active?.large ?? images[selected];
  const markFailed = (src: string) =>
    setFailed((current) =>
      current.has(src) ? current : new Set([...current, src]),
    );
  return (
    <div className="interactive-gallery">
      {!primary || failed.has(primary) ? (
        <p className="interactive-gallery__unavailable">{unavailable}</p>
      ) : (
        <button
          data-analytics="view_gallery"
          className="interactive-gallery__main"
          onClick={() => dialog.current?.showModal()}
          aria-label={
            es ? `Ampliar imagen de ${name}` : `Enlarge image of ${name}`
          }
        >
          <Image
            src={primary}
            onError={() => markFailed(primary)}
            unoptimized={Boolean(active?.gallery)}
            alt={alts?.[selected] || `${name} · ${selected + 1}`}
            fill
            priority
            sizes="(max-width: 900px) 92vw, 52vw"
          />
          <span>{es ? "Ampliar" : "Enlarge"} ↗</span>
        </button>
      )}
      {images.length > 1 && (
        <div
          className="interactive-gallery__thumbs"
          aria-label={es ? "Fotografías del producto" : "Product photos"}
        >
          {images.map((src, index) => {
            const thumbnail = variants?.[index]?.thumbnail ?? src;
            return (
              <button
                key={src}
                data-analytics="view_gallery"
                aria-pressed={index === selected}
                aria-label={`${es ? "Ver imagen" : "View image"} ${index + 1}`}
                onClick={() => setSelected(index)}
              >
                {failed.has(thumbnail) ? (
                  <span
                    aria-hidden="true"
                    className="interactive-gallery__unavailable"
                  >
                    —
                  </span>
                ) : (
                  <Image
                    src={thumbnail}
                    onError={() => markFailed(thumbnail)}
                    unoptimized={Boolean(variants?.[index]?.thumbnail)}
                    alt=""
                    fill
                    sizes="96px"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
      <dialog
        ref={dialog}
        className="product-lightbox"
        aria-label={es ? `Fotografías de ${name}` : `Photos of ${name}`}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") move(1);
          if (event.key === "ArrowLeft") move(-1);
        }}
      >
        <button
          className="button button--dark"
          onClick={() => dialog.current?.close()}
        >
          {es ? "Cerrar" : "Close"} ×
        </button>
        {large && !failed.has(large) ? (
          <div className="product-lightbox__image">
            <Image
              src={large}
              onError={() => markFailed(large)}
              unoptimized={Boolean(active?.large)}
              alt={alts?.[selected] || name}
              fill
              sizes="90vw"
            />
          </div>
        ) : (
          <p className="interactive-gallery__unavailable">{unavailable}</p>
        )}
        {images.length > 1 && (
          <div className="product-lightbox__controls">
            <button
              className="button button--dark"
              onClick={() => move(-1)}
              aria-label={es ? "Anterior" : "Previous"}
            >
              ←
            </button>
            <span aria-live="polite">
              {selected + 1} / {images.length}
            </span>
            <button
              className="button button--dark"
              onClick={() => move(1)}
              aria-label={es ? "Siguiente" : "Next"}
            >
              →
            </button>
          </div>
        )}
      </dialog>
    </div>
  );
}
