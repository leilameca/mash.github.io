-- Idempotent seed for current MASH content.
-- Spanish is source/default. English fields are placeholders marked needs_review.

insert into public.collections (slug, cover_image_path, status, featured, sort_order, published_at)
values
  ('terraza', '/assets/images/oasis-set.jpg', 'draft', true, 10, null),
  ('dining', '/assets/images/oculus-mare-dining.jpg', 'draft', true, 20, null),
  ('piscina', '/assets/images/cama-balinesa-trap.jpg', 'draft', true, 30, null)
on conflict (slug) do update
set cover_image_path = excluded.cover_image_path,
    status = excluded.status,
    featured = excluded.featured,
    sort_order = excluded.sort_order,
    published_at = excluded.published_at;

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

-- Preserve the existing catalogue in the database while images continue to
-- resolve from the site's current /assets library. No files are copied here.
with seed(slug, collection_slug, name_es, name_en, description_es, description_en, materials_es, materials_en, care_es, care_en, image_path, dimensions, finishes, featured, sort_order) as (
  values
  ('oasis-set','terraza','Oasis Set','Oasis Set','Un juego de sala exterior amplio y elegante para terrazas donde quieres recibir con estilo, comodidad y una presencia impecable.','A spacious and elegant outdoor lounge set for terraces where style, comfort and presence matter.','Fibra sintetica y perfiles galvanizados.','Synthetic fiber and galvanized profiles.','Limpiar con pano humedo, jabon neutro y secado al aire.','Clean with a damp cloth, mild soap and air drying.','/assets/images/oasis-set.jpg','Dimensiones por confirmar segun composicion.','Acabados sujetos a disponibilidad.',true,10),
  ('candor-clasico','terraza','Candor Clasico','Candor Classic','Un set sobrio y facil de combinar para patios, balcones amplios o terrazas que necesitan un look limpio y acogedor.','A calm, easy-to-pair set for patios, generous balconies or terraces that need a clean, welcoming look.','Fibra sintetica y estructura galvanizada.','Synthetic fiber and galvanized structure.','Evitar productos abrasivos. Lavar cojineria en ciclo delicado.','Avoid abrasive products. Wash cushion covers on delicate cycle.','/assets/images/candor-clasico.jpg','Consultar medidas disponibles.','Tonos neutros y acabados segun disponibilidad.',true,20),
  ('media-luna','terraza','Media Luna','Half Moon','Una opcion con personalidad para proyectos que quieren un punto focal diferente y elegante en exterior.','A distinctive option for projects that want a different and elegant outdoor focal point.','Fibra sintetica apta para exterior.','Outdoor-ready synthetic fiber.','Cepillo suave, agua y shampoo delicado para la fibra.','Soft brush, water and gentle shampoo for the fiber.','/assets/images/media-luna.jpg','Consultar medidas disponibles.','Acabados por disponibilidad.',false,30),
  ('oculus-mare','dining','Oculus Mare','Oculus Mare','Una mesa con presencia moderna para quienes quieren un comedor exterior con caracter y gran valor visual.','A table with modern presence for outdoor dining spaces with character and visual value.','Estructura preparada para exterior y acabado tejido.','Outdoor-ready structure and woven finish.','Limpiar despues de lluvia fuerte y dejar secar al aire.','Clean after heavy rain and let air dry.','/assets/images/oculus-mare-dining.jpg','Consultar configuracion y medidas.','Acabados segun disponibilidad.',true,40),
  ('rombois-set','dining','Rombois Set','Rombois Set','Calido, elegante y muy acogedor para cenas en familia o reuniones en ambientes de hospitalidad.','Warm, elegant and welcoming for family dinners or hospitality spaces.','Fibra sintetica con estructura firme.','Synthetic fiber with a firm structure.','Usar jabon neutro y pano humedo.','Use mild soap and a damp cloth.','/assets/images/rombois-set.jpg','Consultar medidas disponibles.','Acabados neutros sujetos a disponibilidad.',false,50),
  ('balinesa-trap','piscina','Balinesa Trap','Trap Daybed','Una cama balinesa que transforma cualquier area de piscina en un espacio de descanso premium.','An outdoor daybed that turns any pool area into a premium rest space.','Fibra sintetica y perfiles galvanizados.','Synthetic fiber and galvanized profiles.','Secar cojines al aire si se humedecen.','Air dry cushions if they become wet.','/assets/images/cama-balinesa-trap.jpg','Consultar medidas y composicion.','Acabados por disponibilidad.',true,60),
  ('chaise-candor','piscina','Chaise Candor','Candor Chaise','Una chaise comoda y bonita para tomar sol, leer o simplemente descansar mejor.','A comfortable chaise for sun, reading or quiet rest.','Materiales pensados para sol, humedad y uso constante.','Materials chosen for sun, humidity and frequent use.','Limpiar estructura con pano humedo y jabon neutro.','Clean structure with a damp cloth and mild soap.','/assets/images/chaise-candor.jpg','Consultar medidas disponibles.','Tonos neutros segun disponibilidad.',false,70),
  ('candor-mix-collection','terraza','Candor Mix Collection','Candor Mix Collection','Un set completo que equilibra confort, elegancia y materiales de calidad para crear un ambiente exterior que invita a quedarse.','A complete set balancing comfort, elegance and quality materials for an outdoor setting that invites people to stay.','Fibra sintetica y estructura galvanizada.','Synthetic fiber and galvanized structure.','Rutina simple con pano humedo, jabon neutro y secado natural.','Simple routine with damp cloth, mild soap and natural drying.','/assets/images/candor-mix-collection.jpeg','Consultar composicion y medidas.','Acabados sujetos a disponibilidad.',true,80)
), upserted as (
  insert into public.products (slug, collection_id, status, featured, sort_order, dimensions, finishes, published_at)
  select s.slug, c.id, 'draft', s.featured, s.sort_order, s.dimensions, array[s.finishes], null
  from seed s join public.collections c on c.slug = s.collection_slug
  on conflict (slug) do update set collection_id = excluded.collection_id, status = excluded.status,
    featured = excluded.featured, sort_order = excluded.sort_order, dimensions = excluded.dimensions,
    finishes = excluded.finishes, published_at = excluded.published_at
  returning id, slug
)
insert into public.product_translations (product_id, locale, name, description, materials, care, translation_status)
select p.id, t.locale, t.name, t.description, t.materials, t.care, 'complete'
from upserted p join seed s on s.slug = p.slug
cross join lateral (values
  ('es', s.name_es, s.description_es, s.materials_es, s.care_es),
  ('en', s.name_en, s.description_en, s.materials_en, s.care_en)
) as t(locale, name, description, materials, care)
on conflict (product_id, locale) do update set name = excluded.name, description = excluded.description,
  materials = excluded.materials, care = excluded.care, translation_status = excluded.translation_status;

with seed(slug, image_path, name_es, name_en, sort_order) as (
  values
  ('oasis-set','/assets/images/oasis-set.jpg','Juego de terraza Oasis para patio amplio','Oasis terrace set for a spacious patio',0),
  ('oasis-set','/assets/images/oasis-hero.jpg','Ambiente exterior Oasis','Oasis outdoor setting',1),
  ('oasis-set','/assets/images/oasis-op.jpg','Detalle del conjunto Oasis','Oasis set detail',2),
  ('candor-clasico','/assets/images/candor-clasico.jpg','Muebles para patio Candor Clasico','Candor Classic patio furniture',0),
  ('candor-clasico','/assets/images/candor-l.jpg','Detalle del conjunto Candor Clasico','Candor Classic set detail',1),
  ('media-luna','/assets/images/media-luna.jpg','Set Media Luna para terraza','Media Luna terrace set',0),
  ('media-luna','/assets/images/area-set-patio-terraza-santiago.jpeg','Set exterior en patio de Santiago','Outdoor set on a Santiago patio',1),
  ('oculus-mare','/assets/images/oculus-mare-dining.jpg','Comedor exterior Oculus Mare','Oculus Mare outdoor dining set',0),
  ('oculus-mare','/assets/images/oculus-mare-compacto.jpg','Comedor compacto Oculus Mare','Oculus Mare compact dining set',1),
  ('rombois-set','/assets/images/rombois-set.jpg','Rombois Set para restaurante o balcon','Rombois Set for restaurant or balcony',0),
  ('rombois-set','/assets/images/candor-combinado.jpg','Comedor exterior de fibra tejida','Woven outdoor dining set',1),
  ('balinesa-trap','/assets/images/cama-balinesa-trap.jpg','Cama balinesa para piscina y villa','Outdoor daybed for pool and villa',0),
  ('balinesa-trap','/assets/images/set-cama-trap.jpeg','Set de cama balinesa Trap','Trap outdoor daybed set',1),
  ('chaise-candor','/assets/images/chaise-candor.jpg','Chaise exterior resistente al sol','Outdoor chaise for sunny areas',0),
  ('chaise-candor','/assets/images/oculus-chaise.jpg','Chaise exterior Oculus','Oculus outdoor chaise',1),
  ('candor-mix-collection','/assets/images/candor-mix-collection.jpeg','Candor Mix Collection para terraza premium','Candor Mix Collection for a premium terrace',0),
  ('candor-mix-collection','/assets/images/candor-collection.jpeg','Detalles de Candor Mix Collection','Candor Mix Collection detail',1)
)
insert into public.product_images (product_id, storage_path, alt_es, alt_en, sort_order, is_primary)
select p.id, s.image_path, s.name_es, s.name_en, s.sort_order, s.sort_order = 0
from seed s join public.products p on p.slug = s.slug
on conflict (product_id, storage_path) do update set alt_es = excluded.alt_es, alt_en = excluded.alt_en,
  sort_order = excluded.sort_order, is_primary = excluded.is_primary;

with seed(slug, image_path, location, title_es, title_en, description_es, description_en) as (
  values
  ('terraza-social','/assets/images/area-set-patio-terraza-santiago.jpeg','Santiago','Terraza social','Social terrace','Ambiente exterior residencial presentado como referencia visual.','Residential outdoor setting shown as a visual reference.'),
  ('piscina-villa','/assets/images/oculus-descanso-piscina-villa-rd.jpeg','Republica Dominicana','Piscina de villa','Villa pool','Espacio de descanso junto a piscina presentado como referencia visual.','Poolside lounge setting shown as a visual reference.')
), upserted as (
  insert into public.projects (slug, cover_image_path, location, status, featured, sort_order, published_at)
  select slug, image_path, location, 'draft', false, row_number() over (order by slug) * 10, null from seed
  on conflict (slug) do update set cover_image_path = excluded.cover_image_path, location = excluded.location,
    status = excluded.status, featured = excluded.featured, sort_order = excluded.sort_order,
    published_at = excluded.published_at
  returning id, slug
)
insert into public.project_translations (project_id, locale, title, description, translation_status)
select p.id, t.locale, t.title, t.description, 'complete'
from upserted p join seed s on s.slug = p.slug
cross join lateral (values
  ('es', s.title_es, s.description_es),
  ('en', s.title_en, s.description_en)
) as t(locale, title, description)
on conflict (project_id, locale) do update set title = excluded.title, description = excluded.description,
  translation_status = excluded.translation_status;

with seed(slug, image_path, title_es, title_en) as (
  values
  ('terraza-social','/assets/images/area-set-patio-terraza-santiago.jpeg','Terraza social','Social terrace'),
  ('piscina-villa','/assets/images/oculus-descanso-piscina-villa-rd.jpeg','Piscina de villa','Villa pool')
)
insert into public.project_images (project_id, storage_path, alt_es, alt_en, sort_order, is_cover)
select p.id, s.image_path, s.title_es, s.title_en, 0, true
from seed s join public.projects p on p.slug = s.slug
on conflict (project_id, storage_path) do update set alt_es = excluded.alt_es, alt_en = excluded.alt_en,
  sort_order = excluded.sort_order, is_cover = true;
;
