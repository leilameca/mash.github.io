-- Seed the first editable global blocks without overwriting content already
-- created by an administrator.

insert into public.site_content (key, value, is_public)
values
  (
    'site.settings',
    '{"full_name":"Martinez Star Home","phone":"+1 (809) 327-2139","whatsapp":"https://wa.me/18093272139","instagram":"https://instagram.com/martinez_star_home","instagram_handle":"@martinez_star_home","email":"martinezstarhome@gmail.com"}'::jsonb,
    true
  ),
  (
    'site.navigation',
    '{"items":[{"id":"home","href":"","visible":true},{"id":"collections","href":"/colecciones","visible":true},{"id":"products","href":"/productos","visible":true},{"id":"projects","href":"/proyectos","visible":true},{"id":"about","href":"/nosotros","visible":true},{"id":"contact","href":"/contacto","visible":true}]}'::jsonb,
    true
  ),
  ('site.footer', '{}'::jsonb, true),
  ('home.hero', '{"image_path":"/assets/images/oasis-hero-v2.jpg"}'::jsonb, true)
on conflict (key) do nothing;

insert into public.site_content_translations (site_content_id, locale, value)
select content.id, translation.locale, translation.value
from public.site_content content
join (
  values
    ('site.settings', 'es', '{"location":"Santiago, Republica Dominicana"}'::jsonb),
    ('site.settings', 'en', '{"location":"Santiago, Dominican Republic"}'::jsonb),
    ('site.navigation', 'es', '{"labels":{"home":"Inicio","collections":"Colecciones","products":"Productos","projects":"Proyectos","about":"Nosotros","contact":"Contacto"},"quote_label":"Cotizar","request_quote_label":"Solicitar cotizacion","menu_label":"Abrir menu","close_label":"Cerrar menu"}'::jsonb),
    ('site.navigation', 'en', '{"labels":{"home":"Home","collections":"Collections","products":"Products","projects":"Projects","about":"About","contact":"Contact"},"quote_label":"Quote","request_quote_label":"Request quote","menu_label":"Open menu","close_label":"Close menu"}'::jsonb),
    ('site.footer', 'es', '{"cta":"¿Tienes un proyecto en mente?","description":"Muebles de exterior para terrazas, patios, balcones, piscinas, hoteles, restaurantes, villas y proyectos comerciales.","navigation_title":"Navegacion","legal_title":"Legal","copyright":"© 2026 Martinez Star Home. Todos los derechos reservados."}'::jsonb),
    ('site.footer', 'en', '{"cta":"Have a project in mind?","description":"Outdoor furniture for terraces, patios, balconies, pools, hotels, restaurants, villas and commercial projects.","navigation_title":"Navigation","legal_title":"Legal","copyright":"© 2026 Martinez Star Home. All rights reserved."}'::jsonb),
    ('home.hero', 'es', '{"title":"Diseñamos espacios para disfrutarlos afuera.","description":"En MASH encuentras muebles resistentes para terrazas, patios, balcones y piscinas, con asesoría para elegir piezas que funcionen en tu espacio y respondan al exterior."}'::jsonb),
    ('home.hero', 'en', '{"title":"We design spaces made to be enjoyed outside.","description":"At MASH, you will find outdoor-ready furniture for terraces, patios, balconies and pools, with guidance to choose pieces that work for your space."}'::jsonb)
) as translation(content_key, locale, value) on translation.content_key = content.key
on conflict (site_content_id, locale) do nothing;
