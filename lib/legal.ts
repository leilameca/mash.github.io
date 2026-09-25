import type { Locale } from "./i18n";

export type LegalDocumentKey = "privacy" | "cookies" | "terms";

export type LegalSection = {
  title: string;
  paragraphs?: string[];
  items?: string[];
};

export type LegalDocumentCopy = {
  eyebrow: string;
  title: string;
  summary: string;
  updatedLabel: string;
  updatedDate: string;
  contactTitle: string;
  contactText: string;
  sections: LegalSection[];
};

const updatedDate = "2026-09-25";

export const legalDocuments: Record<Locale, Record<LegalDocumentKey, LegalDocumentCopy>> = {
  es: {
    privacy: {
      eyebrow: "Privacidad",
      title: "Política de privacidad",
      summary:
        "Esta política explica qué información puede tratar MASH cuando visitas el sitio o te comunicas con nosotros para solicitar orientación o una cotización.",
      updatedLabel: "Última actualización",
      updatedDate,
      contactTitle: "Contacto sobre privacidad",
      contactText:
        "Para consultar, actualizar o solicitar la eliminación de información personal, escríbenos desde el correo relacionado con tu solicitud.",
      sections: [
        {
          title: "1. Responsable y alcance",
          paragraphs: [
            "MASH, Martinez Star Home, opera este sitio desde Santiago, República Dominicana. Esta política aplica a las páginas públicas del sitio y al acceso privado de administración.",
            "Los servicios externos que abras desde nuestros enlaces, como WhatsApp o Instagram, aplican sus propias políticas de privacidad desde el momento en que visitas esas plataformas."
          ]
        },
        {
          title: "2. Información que podemos tratar",
          items: [
            "Datos que decides compartir al escribirnos por WhatsApp, correo electrónico, teléfono o redes sociales, como nombre, datos de contacto, mensajes e información sobre el espacio o producto que deseas cotizar.",
            "Información técnica básica que puede recibir la infraestructura de alojamiento y seguridad, como dirección IP, tipo de navegador, páginas solicitadas, fecha y hora de acceso y registros de errores.",
            "Para administradores autorizados de MASH, correo electrónico, identificador de usuario y datos técnicos de la sesión necesarios para acceder a Studio."
          ]
        },
        {
          title: "3. Para qué usamos la información",
          items: [
            "Responder consultas, preparar cotizaciones y dar seguimiento a una conversación iniciada por la persona interesada.",
            "Confirmar características, disponibilidad, medidas, acabados, entrega y demás condiciones comerciales antes de una compra.",
            "Operar, proteger y diagnosticar el sitio, prevenir accesos no autorizados y mantener el panel administrativo.",
            "Atender obligaciones legales, contables o solicitudes válidas de autoridades cuando corresponda."
          ],
          paragraphs: [
            "El sitio no utiliza decisiones automatizadas ni perfiles comerciales automatizados. Tampoco vende bases de datos personales."
          ]
        },
        {
          title: "4. Origen y fundamento del tratamiento",
          paragraphs: [
            "La información proviene directamente de quien se comunica con MASH o de los datos técnicos generados al utilizar el sitio. La tratamos para responder una solicitud, tomar medidas previas a una posible contratación, mantener la seguridad del servicio, cumplir obligaciones aplicables o con el consentimiento de la persona cuando sea necesario."
          ]
        },
        {
          title: "5. Proveedores y transferencias",
          paragraphs: [
            "Podemos utilizar proveedores tecnológicos para alojamiento, base de datos, autenticación, correo y comunicaciones. Entre ellos puede estar Supabase para el acceso administrativo y las plataformas que la persona elija para contactarnos.",
            "Estos proveedores pueden procesar información fuera de República Dominicana conforme a sus propias condiciones, medidas de seguridad y ubicaciones operativas. Solo compartimos la información necesaria para prestar o proteger el servicio, o cuando una obligación legal lo requiera."
          ]
        },
        {
          title: "6. Conservación",
          paragraphs: [
            "Conservamos las conversaciones y datos relacionados durante el tiempo razonablemente necesario para responder, gestionar una cotización, mantener una relación comercial o cumplir obligaciones legales. Los datos de sesiones administrativas se conservan conforme a la configuración de autenticación y se eliminan o invalidan al cerrar sesión o vencer la sesión correspondiente."
          ]
        },
        {
          title: "7. Derechos de las personas",
          paragraphs: [
            "De acuerdo con la legislación dominicana aplicable, puedes solicitar acceso, rectificación, actualización, oposición o supresión de tus datos cuando corresponda. Para proteger la información, podremos pedir datos razonables para verificar la identidad y la relación con la solicitud.",
            "Una solicitud puede conservarse en la medida necesaria para demostrar que fue atendida o cuando exista una obligación legal de conservación."
          ]
        },
        {
          title: "8. Seguridad y menores de edad",
          paragraphs: [
            "Aplicamos medidas técnicas y organizativas razonables para limitar accesos no autorizados, aunque ningún servicio conectado a internet puede garantizar seguridad absoluta.",
            "El sitio y los servicios de cotización no están dirigidos deliberadamente a menores de edad. Si una persona responsable entiende que un menor compartió información sin autorización, puede solicitar su revisión o eliminación."
          ]
        },
        {
          title: "9. Cambios a esta política",
          paragraphs: [
            "Actualizaremos esta política si cambian las funciones del sitio, los proveedores utilizados o las obligaciones aplicables. La fecha publicada al inicio indica la versión vigente."
          ]
        }
      ]
    },
    cookies: {
      eyebrow: "Cookies",
      title: "Política de cookies",
      summary:
        "Esta política describe el uso actual de cookies y tecnologías similares en el sitio de MASH, incluyendo las sesiones del panel administrativo privado.",
      updatedLabel: "Última actualización",
      updatedDate,
      contactTitle: "Preguntas sobre cookies",
      contactText: "Si necesitas información adicional sobre el uso técnico de cookies en MASH, puedes escribirnos.",
      sections: [
        {
          title: "1. Qué es una cookie",
          paragraphs: [
            "Una cookie es un pequeño archivo o dato que un sitio puede guardar en el navegador para recordar una sesión, mantener una función técnica, conservar una preferencia o medir el uso del servicio. Tecnologías como almacenamiento local o identificadores de sesión pueden cumplir funciones similares."
          ]
        },
        {
          title: "2. Uso actual en las páginas públicas",
          paragraphs: [
            "La implementación pública actual de MASH no integra herramientas propias de analítica, publicidad, remarketing ni personalización basadas en cookies. Tampoco existe carrito, pago en línea o cuenta pública de cliente.",
            "La infraestructura de alojamiento puede procesar datos técnicos necesarios para entregar y proteger el sitio, pero MASH no utiliza actualmente esos datos para crear perfiles publicitarios de visitantes."
          ]
        },
        {
          title: "3. Cookies estrictamente necesarias",
          items: [
            "Sesión administrativa: Supabase Auth utiliza cookies técnicas para mantener y renovar la sesión de las personas autorizadas a entrar en /studio-mash.",
            "Seguridad y funcionamiento: pueden utilizarse datos técnicos temporales cuando sean necesarios para entregar una página, conservar una sesión segura o prevenir abuso."
          ],
          paragraphs: [
            "Estas funciones son necesarias para el área privada y no se utilizan para publicidad. Quienes solo navegan por el catálogo público no necesitan iniciar sesión."
          ]
        },
        {
          title: "4. Servicios y enlaces externos",
          paragraphs: [
            "El sitio contiene enlaces a WhatsApp, Instagram y otros servicios externos. Al abrirlos, esos proveedores pueden utilizar sus propias cookies o tecnologías de seguimiento. MASH no controla las cookies instaladas directamente por sitios de terceros."
          ]
        },
        {
          title: "5. Cómo gestionar las cookies",
          paragraphs: [
            "Puedes revisar, bloquear o eliminar cookies desde la configuración de tu navegador. Bloquear cookies estrictamente necesarias puede impedir el acceso o cierre correcto de una sesión administrativa, pero no debería impedir la consulta básica del catálogo público.",
            "Si en el futuro incorporamos analítica, publicidad u otra tecnología no esencial, actualizaremos esta política y añadiremos los controles de consentimiento que correspondan antes de activarla."
          ]
        },
        {
          title: "6. Cambios a esta política",
          paragraphs: [
            "La lista de tecnologías puede cambiar cuando se incorporen funciones nuevas. La fecha publicada al inicio identifica la versión vigente."
          ]
        }
      ]
    },
    terms: {
      eyebrow: "Términos",
      title: "Términos y condiciones",
      summary:
        "Estos términos regulan el uso del sitio de MASH y explican cómo se presenta el catálogo y cómo comienza un proceso de cotización.",
      updatedLabel: "Última actualización",
      updatedDate,
      contactTitle: "Consultas comerciales o legales",
      contactText: "Si tienes dudas sobre un producto, una cotización o estos términos, comunícate con MASH antes de confirmar la compra.",
      sections: [
        {
          title: "1. Identidad y aceptación",
          paragraphs: [
            "Este sitio es operado por MASH, Martinez Star Home, desde Santiago, República Dominicana. Al navegarlo aceptas estos términos de uso. Si no estás de acuerdo, puedes dejar de utilizar el sitio.",
            "Estos términos no sustituyen las condiciones específicas incluidas en una cotización, factura, orden o acuerdo confirmado con el cliente."
          ]
        },
        {
          title: "2. Finalidad del sitio",
          paragraphs: [
            "El sitio presenta colecciones, productos, materiales e información general sobre muebles de exterior. No funciona actualmente como tienda en línea: no incluye carrito, cobro, reserva automática ni confirmación inmediata de pedidos.",
            "Los botones de cotización abren canales de contacto para conversar sobre necesidades, disponibilidad y condiciones antes de cualquier compromiso comercial."
          ]
        },
        {
          title: "3. Información de productos",
          paragraphs: [
            "Trabajamos para que fotografías, descripciones y especificaciones sean claras. Sin embargo, el color puede variar según la pantalla y la iluminación, y las medidas, acabados, composición, accesorios y disponibilidad deben confirmarse en la cotización.",
            "Una imagen ambiental puede mostrar elementos decorativos o de contexto que no forman parte del producto cotizado. La cotización final debe identificar las piezas y condiciones incluidas."
          ]
        },
        {
          title: "4. Cotizaciones, precios y pedidos",
          paragraphs: [
            "Los precios, impuestos, transporte, instalación, forma de pago, vigencia de la oferta y fecha estimada de entrega se comunicarán en la cotización aplicable. Una conversación inicial o el envío de una consulta no confirma por sí solo un pedido.",
            "El pedido queda sujeto a la aceptación de las condiciones comerciales indicadas por MASH y el cliente, así como a la confirmación de disponibilidad o capacidad de producción. Guarda la cotización, comprobantes y mensajes relacionados con la operación."
          ]
        },
        {
          title: "5. Productos configurados o fabricados a medida",
          paragraphs: [
            "Cuando una cotización incluya medidas, colores, tejidos, acabados o configuraciones especiales, las condiciones de aprobación, cambios, producción, cancelación y entrega deben quedar indicadas en esa cotización antes de confirmar el pedido.",
            "Nada en estos términos limita los derechos obligatorios que correspondan a consumidores y usuarios conforme a la legislación aplicable."
          ]
        },
        {
          title: "6. Uso permitido del sitio",
          items: [
            "No intentar acceder sin autorización al panel administrativo, servidores, cuentas o datos.",
            "No interferir con el funcionamiento, seguridad o disponibilidad del sitio.",
            "No copiar de forma masiva el catálogo ni utilizar imágenes, textos o marcas de MASH con fines comerciales sin autorización."
          ]
        },
        {
          title: "7. Propiedad intelectual",
          paragraphs: [
            "La marca MASH, el diseño del sitio, las fotografías, textos, gráficos y demás contenido pertenecen a sus respectivos titulares y están protegidos por la normativa aplicable. La navegación del sitio no concede una licencia para explotar comercialmente ese contenido."
          ]
        },
        {
          title: "8. Enlaces y servicios de terceros",
          paragraphs: [
            "Los enlaces a WhatsApp, Instagram u otros servicios se ofrecen para facilitar la comunicación. Cada plataforma opera bajo sus propios términos, disponibilidad y políticas."
          ]
        },
        {
          title: "9. Disponibilidad y responsabilidad",
          paragraphs: [
            "Podemos corregir errores, actualizar información o suspender temporalmente partes del sitio por mantenimiento o seguridad. MASH no garantiza que el sitio permanezca disponible sin interrupciones.",
            "Estas limitaciones no excluyen responsabilidad ni derechos que no puedan ser limitados conforme a la legislación dominicana de protección al consumidor."
          ]
        },
        {
          title: "10. Ley aplicable y solución de diferencias",
          paragraphs: [
            "Estos términos se interpretan conforme a las leyes de la República Dominicana. Ante una diferencia, las partes pueden intentar primero una solución directa y conservar evidencia de la cotización y del acuerdo. Esto no impide acudir a Pro Consumidor, a otra autoridad competente o a los tribunales cuando corresponda."
          ]
        },
        {
          title: "11. Cambios",
          paragraphs: [
            "Podemos actualizar estos términos para reflejar cambios del sitio o del proceso comercial. La versión vigente será la publicada aquí con su fecha de actualización."
          ]
        }
      ]
    }
  },
  en: {
    privacy: {
      eyebrow: "Privacy",
      title: "Privacy policy",
      summary:
        "This policy explains what information MASH may process when you visit the site or contact us for guidance or a quotation.",
      updatedLabel: "Last updated",
      updatedDate,
      contactTitle: "Privacy contact",
      contactText:
        "To ask about, update or request deletion of personal information, contact us from the email address associated with your request.",
      sections: [
        {
          title: "1. Who we are and scope",
          paragraphs: [
            "MASH, Martinez Star Home, operates this website from Santiago, Dominican Republic. This policy applies to the public pages and the private administration area.",
            "External services opened from our links, such as WhatsApp or Instagram, apply their own privacy policies once you visit those platforms."
          ]
        },
        {
          title: "2. Information we may process",
          items: [
            "Information you choose to share through WhatsApp, email, telephone or social media, such as your name, contact details, messages and information about the space or product you want to quote.",
            "Basic technical information that hosting and security infrastructure may receive, such as IP address, browser type, requested pages, access date and time, and error logs.",
            "For authorized MASH administrators, email address, user identifier and technical session data required to access Studio."
          ]
        },
        {
          title: "3. How we use information",
          items: [
            "Respond to questions, prepare quotations and follow up on a conversation initiated by an interested person.",
            "Confirm features, availability, dimensions, finishes, delivery and other commercial conditions before a purchase.",
            "Operate, protect and diagnose the site, prevent unauthorized access and maintain the administration area.",
            "Meet applicable legal or accounting obligations and respond to valid requests from authorities when required."
          ],
          paragraphs: [
            "The site does not use automated decision-making or automated commercial profiling, and MASH does not sell personal databases."
          ]
        },
        {
          title: "4. Source and grounds for processing",
          paragraphs: [
            "Information comes directly from people who contact MASH or from technical data generated when the site is used. We process it to answer a request, take steps before a possible agreement, maintain service security, comply with applicable obligations or with consent when required."
          ]
        },
        {
          title: "5. Providers and international processing",
          paragraphs: [
            "We may use technology providers for hosting, database, authentication, email and communications. These may include Supabase for administrative access and the platforms a person chooses to contact us through.",
            "These providers may process information outside the Dominican Republic under their own terms, security measures and operating locations. We share only what is necessary to provide or protect the service, or when legally required."
          ]
        },
        {
          title: "6. Retention",
          paragraphs: [
            "We keep conversations and related data for as long as reasonably necessary to reply, manage a quotation, maintain a business relationship or comply with legal obligations. Administrative session data is retained according to authentication settings and is deleted or invalidated when the relevant session ends or expires."
          ]
        },
        {
          title: "7. Individual rights",
          paragraphs: [
            "Under applicable Dominican law, you may request access, correction, updating, objection or deletion when appropriate. To protect information, we may request reasonable details to verify identity and the connection to the request.",
            "A request may be retained as necessary to demonstrate that it was handled or when a legal retention obligation applies."
          ]
        },
        {
          title: "8. Security and children",
          paragraphs: [
            "We apply reasonable technical and organizational safeguards to limit unauthorized access, although no internet-connected service can guarantee absolute security.",
            "The site and quotation services are not intentionally directed to children. A parent or guardian who believes a child shared information without authorization may request its review or deletion."
          ]
        },
        {
          title: "9. Changes to this policy",
          paragraphs: [
            "We will update this policy if site features, providers or applicable obligations change. The date at the top identifies the current version."
          ]
        }
      ]
    },
    cookies: {
      eyebrow: "Cookies",
      title: "Cookie policy",
      summary:
        "This policy describes the current use of cookies and similar technologies on the MASH website, including sessions for the private administration area.",
      updatedLabel: "Last updated",
      updatedDate,
      contactTitle: "Cookie questions",
      contactText: "If you need additional information about MASH's technical use of cookies, contact us.",
      sections: [
        {
          title: "1. What is a cookie?",
          paragraphs: [
            "A cookie is a small file or piece of data that a website may store in a browser to remember a session, maintain a technical function, save a preference or measure use of a service. Local storage and session identifiers may serve similar purposes."
          ]
        },
        {
          title: "2. Current use on public pages",
          paragraphs: [
            "The current public MASH implementation does not include first-party analytics, advertising, remarketing or cookie-based personalization tools. It also has no cart, online payment or public customer account.",
            "Hosting infrastructure may process technical data needed to deliver and protect the site, but MASH does not currently use that data to create visitor advertising profiles."
          ]
        },
        {
          title: "3. Strictly necessary cookies",
          items: [
            "Administrative session: Supabase Auth uses technical cookies to maintain and refresh sessions for people authorized to access /studio-mash.",
            "Security and operation: temporary technical data may be used when necessary to deliver a page, maintain a secure session or prevent abuse."
          ],
          paragraphs: [
            "These functions are necessary for the private area and are not used for advertising. Visitors browsing the public catalog do not need to sign in."
          ]
        },
        {
          title: "4. External services and links",
          paragraphs: [
            "The site links to WhatsApp, Instagram and other external services. Once opened, those providers may use their own cookies or tracking technologies. MASH does not control cookies placed directly by third-party websites."
          ]
        },
        {
          title: "5. Managing cookies",
          paragraphs: [
            "You can review, block or delete cookies through your browser settings. Blocking strictly necessary cookies may prevent an administrative session from working or closing correctly, but should not prevent basic browsing of the public catalog.",
            "If we add analytics, advertising or another non-essential technology in the future, we will update this policy and add any required consent controls before activating it."
          ]
        },
        {
          title: "6. Changes to this policy",
          paragraphs: [
            "The technologies used may change when new features are introduced. The date at the top identifies the current version."
          ]
        }
      ]
    },
    terms: {
      eyebrow: "Terms",
      title: "Terms and conditions",
      summary:
        "These terms govern use of the MASH website and explain how the catalog is presented and how a quotation process begins.",
      updatedLabel: "Last updated",
      updatedDate,
      contactTitle: "Commercial or legal questions",
      contactText: "If you have questions about a product, quotation or these terms, contact MASH before confirming a purchase.",
      sections: [
        {
          title: "1. Identity and acceptance",
          paragraphs: [
            "This website is operated by MASH, Martinez Star Home, from Santiago, Dominican Republic. By browsing it, you accept these website terms. If you disagree, you may stop using the site.",
            "These terms do not replace specific conditions included in a quotation, invoice, order or agreement confirmed with a customer."
          ]
        },
        {
          title: "2. Purpose of the website",
          paragraphs: [
            "The site presents collections, products, materials and general information about outdoor furniture. It is not currently an online store: it has no cart, payment, automatic reservation or immediate order confirmation.",
            "Quotation buttons open communication channels to discuss needs, availability and conditions before any commercial commitment."
          ]
        },
        {
          title: "3. Product information",
          paragraphs: [
            "We work to make photographs, descriptions and specifications clear. However, color may vary by screen and lighting, while dimensions, finishes, composition, accessories and availability must be confirmed in the quotation.",
            "A lifestyle image may show decorative or contextual elements that are not part of the quoted product. The final quotation should identify the pieces and conditions included."
          ]
        },
        {
          title: "4. Quotations, prices and orders",
          paragraphs: [
            "Prices, taxes, transport, installation, payment method, offer validity and estimated delivery date will be stated in the applicable quotation. An initial conversation or inquiry does not by itself confirm an order.",
            "An order is subject to the commercial conditions accepted by MASH and the customer, as well as confirmation of availability or production capacity. Keep the quotation, receipts and messages related to the transaction."
          ]
        },
        {
          title: "5. Configured or made-to-order products",
          paragraphs: [
            "When a quotation includes special dimensions, colors, fabrics, finishes or configurations, approval, change, production, cancellation and delivery conditions should be stated in that quotation before the order is confirmed.",
            "Nothing in these terms limits mandatory consumer rights under applicable law."
          ]
        },
        {
          title: "6. Permitted use",
          items: [
            "Do not attempt to access the administration area, servers, accounts or data without authorization.",
            "Do not interfere with the operation, security or availability of the site.",
            "Do not copy the catalog in bulk or use MASH images, text or marks commercially without authorization."
          ]
        },
        {
          title: "7. Intellectual property",
          paragraphs: [
            "The MASH brand, website design, photographs, text, graphics and other content belong to their respective owners and are protected by applicable law. Browsing the site does not grant a license to exploit that content commercially."
          ]
        },
        {
          title: "8. Third-party links and services",
          paragraphs: [
            "Links to WhatsApp, Instagram and other services are provided to facilitate communication. Each platform operates under its own terms, availability and policies."
          ]
        },
        {
          title: "9. Availability and liability",
          paragraphs: [
            "We may correct errors, update information or temporarily suspend parts of the site for maintenance or security. MASH does not guarantee uninterrupted site availability.",
            "These limitations do not exclude liability or rights that cannot be limited under Dominican consumer protection law."
          ]
        },
        {
          title: "10. Governing law and disputes",
          paragraphs: [
            "These terms are interpreted under the laws of the Dominican Republic. If a dispute arises, the parties may first seek a direct resolution and preserve evidence of the quotation and agreement. This does not prevent either party from contacting Pro Consumidor, another competent authority or the courts when appropriate."
          ]
        },
        {
          title: "11. Changes",
          paragraphs: [
            "We may update these terms to reflect changes to the site or commercial process. The current version will be published here with its update date."
          ]
        }
      ]
    }
  }
};

export function getLegalDocument(locale: Locale, document: LegalDocumentKey) {
  return legalDocuments[locale][document];
}
