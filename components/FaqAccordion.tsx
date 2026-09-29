"use client";

import { useState } from "react";

export function FaqAccordion({ items }: { items: Array<{ question: string; answer: string }> }) {
  const [open, setOpen] = useState<number | null>(0);
  return <div className="faq-grid">{items.map((item, index) => {
    const isOpen = open === index;
    return <article className={`faq-item${isOpen ? " is-open" : ""}`} key={item.question}>
      <button className="faq-item__trigger" type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : index)}>
        <span>{item.question}</span><span className="faq-item__icon" aria-hidden="true">{isOpen ? "−" : "+"}</span>
      </button>
      <div className="faq-item__answer" hidden={!isOpen}><p>{item.answer}</p></div>
    </article>;
  })}</div>;
}
