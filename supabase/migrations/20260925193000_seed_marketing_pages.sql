insert into public.site_content (key, value, is_public)
values
  ('page.about', '{"image_path":"/assets/images/yascari.jpeg"}'::jsonb, true),
  ('page.contact', '{}'::jsonb, true),
  ('page.projects', '{}'::jsonb, true)
on conflict (key) do nothing;

insert into public.site_content_translations (site_content_id, locale, value)
select content.id, translation.locale, translation.value
from public.site_content content
join (
  values
    ('page.about', 'es', '{"eyebrow":"MASH | Martinez Star Home","title":"Más que muebles, creamos espacios que se viven.","description":"MASH es una mueblería en Santiago, República Dominicana, especializada en muebles de exterior para balcones, patios, terrazas, piscinas, hoteles, restaurantes, villas y proyectos comerciales."}'::jsonb),
    ('page.about', 'en', '{"eyebrow":"MASH | Martinez Star Home","title":"More than furniture, we shape outdoor spaces to be lived in.","description":"MASH is a furniture brand in Santiago, Dominican Republic, specializing in outdoor furniture for balconies, patios, terraces, pools, hotels, restaurants, villas and commercial projects."}'::jsonb),
    ('page.contact', 'es', '{"eyebrow":"Contacto","title":"Cuéntanos qué espacio quieres transformar.","description":"El canal principal de cotización se mantiene por WhatsApp para responder con asesoría, disponibilidad y siguientes pasos."}'::jsonb),
    ('page.contact', 'en', '{"eyebrow":"Contact","title":"Tell us what space you want to transform.","description":"The main quotation channel remains WhatsApp so we can reply with guidance, availability and next steps."}'::jsonb),
    ('page.projects', 'es', '{"eyebrow":"Proyectos","title":"Instalaciones reales, preparadas para crecer.","description":"Explora instalaciones y ambientes realizados por MASH."}'::jsonb),
    ('page.projects', 'en', '{"eyebrow":"Projects","title":"Real installations, ready to grow.","description":"Explore installations and settings completed by MASH."}'::jsonb)
) as translation(content_key, locale, value) on translation.content_key = content.key
on conflict (site_content_id, locale) do nothing;
