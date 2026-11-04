export default function Loading() {
  return (
    <section className="studio-loading" role="status" aria-live="polite" aria-label="Cargando contenido">
      <div className="studio-loading__heading">
        <div className="studio-loading__mark" aria-hidden="true"><span>M</span></div>
        <div><p className="studio-loading__eyebrow">MASH · Tu espacio de gestión</p><h2>Cargando contenido<span className="studio-loading__dots" aria-hidden="true"><i /><i /><i /></span></h2><p>Preparando esta sección para ti.</p></div>
      </div>
      <div className="studio-loading__preview" aria-hidden="true">
        <div className="studio-loading__toolbar"><span /><span /></div>
        {[0, 1, 2].map((row) => <div className="studio-loading__row" key={row}><div className="studio-loading__photo" /><div className="studio-loading__lines"><span /><span /></div><div className="studio-loading__pill" /></div>)}
      </div>
    </section>
  );
}
