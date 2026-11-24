/* eslint-disable @next/next/no-img-element */
"use client";
import { useId, useState } from "react";
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
  const marker = useId();
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
      <div className="editorial-compare-images">
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
        >
          <i>↔</i>
        </span>
      </div>
      <figcaption className="editorial-compare-control">
        <label htmlFor={marker}>
          {es ? "Desliza para comparar" : "Slide to compare"}
        </label>
        <input
          id={marker}
          type="range"
          min={0}
          max={100}
          value={position}
          aria-valuetext={`${labels[0]} ${position}%, ${labels[1]} ${100 - position}%`}
          onChange={(event) => setPosition(Number(event.target.value))}
        />
      </figcaption>
    </figure>
  );
}
