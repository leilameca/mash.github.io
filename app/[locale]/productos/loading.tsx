export default function Loading() {
  return <section className="section-shell page-hero" role="status" aria-busy="true"><p>MASH · …</p><div className="product-grid">{[1, 2, 3].map((id) => <div key={id} className="interactive-gallery__main" />)}</div></section>;
}
