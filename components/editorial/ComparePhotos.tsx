/* eslint-disable @next/next/no-img-element */
"use client";
import { useRef, useState } from "react";
import type { Locale } from "@/lib/i18n";
import type { Comparison } from "@/lib/editorial/schema";
import "./editorial.css";

export function ComparePhotos({
  comparison,
  locale = "es",
  beforeLabel,
  afterLabel,
  beforeAlt,
  afterAlt,
  inheritCrop = false,
}: {
  comparison: Comparison;
  locale?: Locale;
  beforeLabel?: string;
  afterLabel?: string;
  beforeAlt?: string;
  afterAlt?: string;
  inheritCrop?: boolean;
}) {
  const [position, setPosition] = useState(50);
  const images = useRef<HTMLDivElement>(null);
  const control = useRef<HTMLInputElement>(null);
  const reported = useRef(false);
  const drag = useRef<{ startX: number; startPosition: number } | null>(null);
  function move(next: number) {
    if (next === position) return;
    setPosition(next);
    if (!reported.current) {
      reported.current = true;
      images.current?.dispatchEvent(
        new Event("mash:compare", { bubbles: true }),
      );
    }
  }
  const es = locale === "es";
  const labels = [
    beforeLabel || (es ? "Antes" : "Before"),
    afterLabel || (es ? "Después" : "After"),
  ];
  const style = {
    objectPosition: inheritCrop
      ? "var(--focus)"
      : comparison.x + "% " + comparison.y + "%",
    objectFit: inheritCrop ? undefined : comparison.fit,
  } as const;
  if (!comparison.before && !comparison.after) return null;
  if (!comparison.before || !comparison.after) {
    const first = Boolean(comparison.before);
    return (
      <figure className="editorial-compare editorial-compare-static">
        <img
          src={comparison.before || comparison.after}
          alt={(first ? beforeAlt : afterAlt) || labels[first ? 0 : 1]}
          style={style}
        />
        <figcaption>{labels[first ? 0 : 1]}</figcaption>
      </figure>
    );
  }
  return (
    <figure
      className="editorial-compare"
      aria-label={es ? "Comparación de fotografías" : "Photo comparison"}
    >
      <div className="editorial-compare-images" ref={images}>
        <img src={comparison.after} alt={afterAlt || labels[1]} style={style} />
        <img
          src={comparison.before}
          alt={beforeAlt || labels[0]}
          style={{ ...style, clipPath: `inset(0 ${100 - position}% 0 0)` }}
        />
        <span className="editorial-compare-label editorial-compare-start">
          {labels[0]}
        </span>
        <span className="editorial-compare-label editorial-compare-end">
          {labels[1]}
        </span>
        <span
          className="editorial-compare-divider"
          style={{ left: position + "%" }}
          aria-hidden="true"
        />
        <div
          className="editorial-compare-handle"
          style={{ left: `clamp(24px, ${position}%, calc(100% - 24px))` }}
          onPointerDown={(event) => {
            if (!event.isPrimary || event.button !== 0) return;
            event.preventDefault();
            control.current?.focus({ preventScroll: true });
            event.currentTarget.setPointerCapture(event.pointerId);
            drag.current = { startX: event.clientX, startPosition: position };
          }}
          onPointerMove={(event) => {
            if (
              !drag.current ||
              !event.currentTarget.hasPointerCapture(event.pointerId)
            )
              return;
            const width = images.current?.getBoundingClientRect().width;
            if (!width) return;
            const { startX, startPosition } = drag.current;
            const next = Math.round(
              startPosition + ((event.clientX - startX) / width) * 100,
            );
            move(Math.max(0, Math.min(100, next)));
          }}
          onLostPointerCapture={() => {
            drag.current = null;
          }}
        >
          <input
            ref={control}
            type="range"
            min={0}
            max={100}
            value={position}
            aria-label={es ? "Desliza para comparar" : "Slide to compare"}
            aria-valuetext={`${labels[0]} ${position}%, ${labels[1]} ${100 - position}%`}
            onChange={(event) => move(Number(event.target.value))}
          />
          <span aria-hidden="true">↔</span>
        </div>
      </div>
    </figure>
  );
}
