-- Idempotent seed for current MASH content.
-- Spanish is source/default. English fields are placeholders marked needs_review.

insert into public.collections (slug, cover_image_path, status, featured, sort_order, published_at)
values
  ('terraza', 'collections/oasis-set.jpg', 'published', true, 10, now()),
  ('dining', 'collections/oculus-mare-dining.jpg', 'published', true, 20, now()),
  ('piscina', 'collections/cama-balinesa-trap.jpg', 'published', true, 30, now())
on conflict (slug) do update
set cover_image_path = excluded.cover_image_path,
    status = excluded.status,
    featured = excluded.featured,
    sort_order = excluded.sort_order;

insert into public.collection_translations (collection_id, locale, name, description, seo_title, seo_description)
select c.id, v.locale, v.name, v.description, v.seo_title, v.seo_description
from public.collections c
join (values
  ('terraza', 'es', 'Terraza', 'Sets para patios, terrazas sociales y villas donde la comodidad, la presencia visual y la resistencia importan por igual.', 'Muebles de terraza MASH', 'Coleccion de muebles para terraza, patios y areas sociales exteriores.'),
  ('terraza', 'en', 'Terrace', null, null, null),
  ('dining', 'es', 'Dining', 'Mesas y sillas con presencia moderna para comer, conversar y recibir en espacios exteriores residenciales o comerciales.', 'Dining exterior MASH', 'Comedores exteriores para balcones, rooftops, hoteles y restaurantes.'),
  ('dining', 'en', 'Dining', null, null, null),
  ('piscina', 'es', 'Piscina', 'Camas balinesas, chaise lounges y piezas de descanso para crear un ambiente tipo resort.', 'Muebles para piscina MASH', 'Muebles exteriores para piscina, jardin, villas y zonas de descanso.'),
  ('piscina', 'en', 'Pool', null, null, null)
) as v(slug, locale, name, description, seo_title, seo_description) on v.slug = c.slug
on conflict (collection_id, locale) do update
set name = excluded.name,
    description = excluded.description,
    seo_title = excluded.seo_title,
    seo_description = excluded.seo_description;
