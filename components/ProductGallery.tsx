"use client";
import Image from "next/image";
import { useRef, useState } from "react";
export function ProductGallery({ images, name, locale }: { images: string[]; name: string; locale: string }) {
  const [selected, setSelected] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const es = locale === "es";
  const move = (direction: number) => setSelected((index) => (index + direction + images.length) % images.length);
  return <div className="interactive-gallery">
    <button className="interactive-gallery__main" onClick={() => dialog.current?.showModal()} aria-label={es ? `Ampliar imagen de ${name}` : `Enlarge image of ${name}`}>
      <Image src={images[selected]} alt={`${name} · ${selected + 1}`} fill priority sizes="(max-width: 900px) 92vw, 52vw" />
      <span>{es ? "Ampliar" : "Enlarge"} ↗</span>
    </button>
    {images.length > 1 && <div className="interactive-gallery__thumbs" aria-label={es ? "Fotografías del producto" : "Product photos"}>{images.map((src, index) => <button key={src} aria-pressed={index === selected} aria-label={`${es ? "Ver imagen" : "View image"} ${index + 1}`} onClick={() => setSelected(index)}><Image src={src} alt="" fill sizes="96px" /></button>)}</div>}
    <dialog ref={dialog} className="product-lightbox" aria-label={es ? `Fotografías de ${name}` : `Photos of ${name}`} onKeyDown={(event) => { if (event.key === "ArrowRight") move(1); if (event.key === "ArrowLeft") move(-1); }}>
      <button className="button button--dark" onClick={() => dialog.current?.close()}>{es ? "Cerrar" : "Close"} ×</button>
      <div className="product-lightbox__image"><Image src={images[selected]} alt={name} fill sizes="90vw" /></div>
      {images.length > 1 && <div className="product-lightbox__controls"><button className="button button--dark" onClick={() => move(-1)} aria-label={es ? "Anterior" : "Previous"}>←</button><span aria-live="polite">{selected + 1} / {images.length}</span><button className="button button--dark" onClick={() => move(1)} aria-label={es ? "Siguiente" : "Next"}>→</button></div>}
    </dialog>
  </div>;
}
