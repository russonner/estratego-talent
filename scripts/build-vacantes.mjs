/**
 * Static SEO build for estratego.com.mx
 *
 * Runs at Netlify build time. Generates:
 *   /<slug>.html            → service/zone landing pages (unique content + Service/FAQ schema)
 *   /vacantes/index.html    → job listing (SEO)
 *   /vacantes/<slug>.html   → one page per published vacancy with JobPosting JSON-LD (Google Jobs)
 *   /sitemap.xml            → unified sitemap (home + landings + job pages)
 *
 * Env vars (Netlify): SUPABASE_URL, SUPABASE_ANON_KEY
 * If missing, still generates landings + empty job board so the build never fails.
 */
import { createClient } from '@supabase/supabase-js'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SITE = 'https://estratego.com.mx'
const ORG  = 'Estratego Talent'
const LOGO = `${SITE}/logo.png`

/* ===========================================================
   Shared shell
   =========================================================== */
const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')

const NAV = `
<nav style="display:flex;align-items:center;justify-content:space-between;padding:14px 36px;background:#091929;position:sticky;top:0;z-index:100">
  <a href="/" style="display:flex;align-items:center;gap:12px;text-decoration:none">
    <svg width="26" height="26" viewBox="0 0 100 100"><polygon points="50,4 93,27 93,73 50,96 7,73 7,27" fill="#E8B4A0"/><rect x="24" y="24" width="52" height="52" fill="#7BA7B0" rx="3"/><circle cx="50" cy="50" r="16" fill="#1B3A5C"/></svg>
    <span style="font-size:13px;font-weight:600;letter-spacing:.18em;color:#fff;text-transform:uppercase">Estratego Talent</span>
  </a>
  <div style="display:flex;gap:18px;align-items:center">
    <a href="/vacantes/" style="font-size:13px;color:#B8D3D8;text-decoration:none">Vacantes</a>
    <a href="https://portal.estratego.com.mx/contacto-empresas" style="font-size:12px;font-weight:600;background:#E8B4A0;color:#0F2540;padding:8px 16px;border-radius:8px;text-decoration:none">Solicitar propuesta</a>
  </div>
</nav>`

const FOOT = `
<footer style="background:#091929;color:rgba(255,255,255,.6);padding:36px;text-align:center;font-size:13px;line-height:1.9">
  <div style="margin-bottom:8px">
    <a href="/reclutamiento-y-seleccion-monterrey.html" style="color:#B8D3D8;text-decoration:none;margin:0 8px">Reclutamiento Monterrey</a> ·
    <a href="/headhunting-monterrey.html" style="color:#B8D3D8;text-decoration:none;margin:0 8px">Headhunting</a> ·
    <a href="/estudios-socioeconomicos-monterrey.html" style="color:#B8D3D8;text-decoration:none;margin:0 8px">Estudios socioeconómicos</a> ·
    <a href="/pruebas-psicometricas-monterrey.html" style="color:#B8D3D8;text-decoration:none;margin:0 8px">Psicometría</a> ·
    <a href="/sueldos/" style="color:#B8D3D8;text-decoration:none;margin:0 8px">Sueldos</a> ·
    <a href="/insights/" style="color:#B8D3D8;text-decoration:none;margin:0 8px">Insights</a> ·
    <a href="/vacantes/" style="color:#B8D3D8;text-decoration:none;margin:0 8px">Vacantes</a>
  </div>
  © ${new Date().getFullYear()} Estratego Talent · Reclutamiento y selección de personal en Monterrey, Nuevo León.
</footer>`

function page({ title, description, canonical, body, jsonLd = [] }) {
  const blocks = (Array.isArray(jsonLd) ? jsonLd : [jsonLd]).filter(Boolean)
  return `<!DOCTYPE html><html lang="es"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="website"><meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${canonical}">
<meta property="og:locale" content="es_MX">
<meta name="twitter:card" content="summary">
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cpolygon points='50,4 93,27 93,73 50,96 7,73 7,27' fill='%23E8B4A0'/%3E%3Crect x='24' y='24' width='52' height='52' fill='%237BA7B0' rx='3'/%3E%3Ccircle cx='50' cy='50' r='16' fill='%231B3A5C'/%3E%3C/svg%3E">
${blocks.map(b => `<script type="application/ld+json">${JSON.stringify(b)}</script>`).join('\n')}
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#FAF8F6;color:#1B2A38;line-height:1.7}
a{color:#1B3A5C}
.wrap{max-width:880px;margin:0 auto;padding:48px 24px}
.hero{background:#1B3A5C;color:#fff;padding:56px 24px}
.hero .in{max-width:880px;margin:0 auto}
.tag{display:inline-block;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#E8B4A0;margin-bottom:14px}
h1{font-size:34px;font-weight:800;line-height:1.2}
.hero p{font-size:17px;color:rgba(255,255,255,.85);margin-top:14px;max-width:640px}
h2{font-size:22px;font-weight:700;color:#1B3A5C;margin:34px 0 12px}
h3{font-size:16px;font-weight:700;color:#1B2A38;margin:20px 0 6px}
p{margin-bottom:14px}
ul{margin:0 0 14px 22px}
li{margin-bottom:6px}
.btn{display:inline-flex;align-items:center;gap:8px;background:#1B3A5C;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 26px;border-radius:12px;margin-top:8px}
.btn:hover{background:#0F2540}
.btn-sal{background:#E8B4A0;color:#0F2540}
.card{background:#fff;border:1px solid #ECE7DF;border-radius:16px;padding:24px;box-shadow:0 1px 2px rgba(27,42,56,.04);margin-bottom:14px}
.faq summary{cursor:pointer;font-weight:600;color:#1B3A5C;padding:14px 0;border-bottom:1px solid #ECE7DF;list-style:none}
.faq summary::-webkit-details-marker{display:none}
.faq p{padding:10px 0 16px;color:#5C6B78}
.muted{color:#5C6B78}
</style></head><body>
${NAV}
${body}
${FOOT}
</body></html>`
}

/* ===========================================================
   Service / zone landing pages (unique content)
   =========================================================== */
const LANDINGS = [
  {
    slug: 'reclutamiento-y-seleccion-monterrey',
    title: 'Reclutamiento y Selección de Personal en Monterrey | Estratego Talent',
    description: 'Agencia de reclutamiento y selección en Monterrey especializada en mandos medios y posiciones directivas. Metodología propia, tiempo de cierre promedio de 30 días.',
    h1: 'Reclutamiento y selección de personal en Monterrey',
    lead: 'Encontramos al talento que tu empresa necesita en Monterrey y su zona metropolitana, con una metodología propia que va más allá del CV: evaluamos competencias, fit cultural e integridad.',
    sections: [
      { h: '¿Qué hacemos?', html: `<p>En Estratego Talent nos especializamos en <strong>reclutamiento y selección de personal especializado, gerencial y directivo</strong> para empresas en Monterrey, San Pedro, Apodaca, Santa Catarina y todo Nuevo León. No llenamos vacantes: construimos equipos.</p>
      <p>Cada proceso incluye definición del perfil real (no el de papel), búsqueda activa de candidatos pasivos, entrevistas por competencias, pruebas psicométricas y verificación de referencias.</p>` },
      { h: 'Industrias que atendemos', html: `<ul>
        <li>Manufactura y producción</li>
        <li>Servicios financieros y fintech</li>
        <li>Logística y supply chain</li>
        <li>Tecnología y software</li>
        <li>Retail y consumo</li>
        <li>Construcción y real estate</li>
      </ul>` },
      { h: '¿Por qué Estratego Talent?', html: `<ul>
        <li><strong>Tiempo de cierre promedio de 30 días</strong> por vacante.</li>
        <li>Más de 5,000 perfiles en nuestra base de talento.</li>
        <li>95% de candidatos colocados con retención mayor a 12 meses.</li>
        <li>Garantía de reposición incluida en cada búsqueda.</li>
      </ul>` },
    ],
    faq: [
      { q: '¿Cuánto cuesta una agencia de reclutamiento en Monterrey?', a: 'El costo se calcula como un porcentaje del sueldo anual de la posición, y varía según el nivel del puesto y la dificultad de la búsqueda. Solicita una propuesta sin costo y te damos una cotización clara.' },
      { q: '¿Cuánto tarda el proceso de reclutamiento?', a: 'Nuestro tiempo de cierre promedio es de 30 días desde el levantamiento del perfil hasta la presentación de candidatos finalistas. Las posiciones directivas pueden tomar un poco más.' },
      { q: '¿Ofrecen garantía?', a: 'Sí. Cada búsqueda incluye una garantía de reposición sin costo si el candidato no concluye su periodo de prueba.' },
      { q: '¿Atienden empresas fuera de Monterrey?', a: 'Sí, atendemos toda la zona metropolitana de Monterrey y posiciones en el resto de México y Latinoamérica.' },
    ],
    serviceType: 'Reclutamiento y selección de personal',
  },
  {
    slug: 'headhunting-monterrey',
    title: 'Headhunting y Búsqueda de Ejecutivos en Monterrey | Estratego Talent',
    description: 'Headhunting especializado en Monterrey para posiciones directivas y C-Suite. Búsqueda discreta de candidatos pasivos de alto nivel.',
    h1: 'Headhunting y búsqueda de ejecutivos en Monterrey',
    lead: 'Búsqueda directa y confidencial de líderes para posiciones críticas. Llegamos a los ejecutivos que no están buscando empleo pero que pueden transformar tu organización.',
    sections: [
      { h: 'Búsqueda de ejecutivos de alto nivel', html: `<p>El <strong>headhunting</strong> es distinto al reclutamiento tradicional: el mejor candidato para una dirección rara vez está aplicando a vacantes. Nuestra labor es identificarlo, contactarlo con discreción y despertar su interés en tu proyecto.</p>
      <p>Trabajamos posiciones de <strong>Dirección General, Finanzas, Operaciones, Comercial, Recursos Humanos y Tecnología</strong> en Monterrey y Nuevo León.</p>` },
      { h: 'Nuestro proceso de executive search', html: `<ul>
        <li>Mapeo de mercado y empresas objetivo.</li>
        <li>Identificación de candidatos pasivos calificados.</li>
        <li>Primer contacto confidencial y manejo de la relación.</li>
        <li>Evaluación profunda de competencias y motivaciones.</li>
        <li>Acompañamiento en oferta, contraoferta y cierre.</li>
      </ul>` },
    ],
    faq: [
      { q: '¿Qué diferencia al headhunting del reclutamiento normal?', a: 'El headhunting busca de forma directa y confidencial a candidatos pasivos de alto nivel, en lugar de esperar postulaciones. Es ideal para posiciones directivas y críticas.' },
      { q: '¿Manejan la búsqueda con confidencialidad?', a: 'Sí. Tanto la identidad de tu empresa como la de los candidatos se manejan con total discreción durante todo el proceso.' },
    ],
    serviceType: 'Headhunting ejecutivo',
  },
  {
    slug: 'estudios-socioeconomicos-monterrey',
    title: 'Estudios Socioeconómicos en Monterrey | Estratego Talent',
    description: 'Estudios socioeconómicos profesionales en Monterrey para procesos de selección y contratación. Visita domiciliaria, verificación de referencias y reporte detallado.',
    h1: 'Estudios socioeconómicos en Monterrey',
    lead: 'Verifica la información de tus candidatos antes de contratar. Estudios socioeconómicos confiables que reducen el riesgo de una mala contratación.',
    sections: [
      { h: '¿Qué incluye un estudio socioeconómico?', html: `<ul>
        <li>Visita domiciliaria y verificación de entorno.</li>
        <li>Validación de datos personales y laborales.</li>
        <li>Verificación de referencias laborales y personales.</li>
        <li>Análisis de situación económica y patrimonial.</li>
        <li>Reporte profesional con observaciones y nivel de riesgo.</li>
      </ul>` },
      { h: '¿Por qué hacer un estudio socioeconómico?', html: `<p>Una contratación equivocada cuesta tiempo, dinero y clima laboral. El estudio socioeconómico confirma que la información del candidato es veraz y detecta señales de riesgo antes de la contratación, especialmente en posiciones de confianza y manejo de recursos.</p>` },
    ],
    faq: [
      { q: '¿Cuánto tarda un estudio socioeconómico?', a: 'Normalmente entre 3 y 5 días hábiles desde que se agenda la visita, dependiendo de la ubicación y disponibilidad del candidato.' },
      { q: '¿Atienden estudios en toda la zona de Monterrey?', a: 'Sí, cubrimos toda la zona metropolitana de Monterrey y podemos coordinar estudios en otras ciudades de México.' },
    ],
    serviceType: 'Estudios socioeconómicos',
  },
  {
    slug: 'pruebas-psicometricas-monterrey',
    title: 'Pruebas Psicométricas en Monterrey | Estratego Talent',
    description: 'Aplicación e interpretación de pruebas psicométricas en Monterrey: Cleaver DISC, aptitud cognitiva y valores. Reportes claros para tu decisión de contratación.',
    h1: 'Pruebas psicométricas en Monterrey',
    lead: 'Evalúa el comportamiento, la aptitud y los valores de tus candidatos con pruebas psicométricas aplicadas e interpretadas por especialistas.',
    sections: [
      { h: 'Pruebas que aplicamos', html: `<ul>
        <li><strong>Cleaver DISC</strong> — perfil de comportamiento y estilos (natural, adaptado y bajo estrés).</li>
        <li><strong>Aptitud cognitiva</strong> — razonamiento verbal, numérico, abstracto y práctico.</li>
        <li><strong>Valores e integridad</strong> — ética, apego a normas y factores de riesgo.</li>
      </ul>` },
      { h: 'Interpretación profesional', html: `<p>No entregamos solo números: cada evaluación incluye una interpretación en lenguaje claro con fortalezas, áreas de atención, fit con el puesto y preguntas sugeridas para la entrevista. Las pruebas se aplican en línea, desde cualquier dispositivo.</p>` },
    ],
    faq: [
      { q: '¿Las pruebas psicométricas se pueden aplicar en línea?', a: 'Sí, todas nuestras pruebas se aplican en línea mediante un enlace único, desde computadora o celular, y los resultados se procesan automáticamente.' },
      { q: '¿Qué entregan al final?', a: 'Un reporte por candidato con puntajes, gráficas e interpretación profesional, además de recomendaciones para la entrevista.' },
    ],
    serviceType: 'Pruebas psicométricas',
  },
]

// Landings locales por zona (SEO local "reclutamiento en <zona>")
const slugZona = z => z.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
function localLanding(zona) {
  return {
    slug: `reclutamiento-en-${slugZona(zona)}`,
    title: `Reclutamiento y Selección en ${zona} | Estratego Talent`,
    description: `Agencia de reclutamiento y selección de personal en ${zona}, Nuevo León. Especialistas en mandos medios, gerenciales y directivos. Solicita una propuesta sin costo.`,
    h1: `Reclutamiento y selección de personal en ${zona}`,
    lead: `Atraemos al mejor talento para empresas en ${zona} y toda la zona metropolitana de Monterrey, con una metodología que evalúa competencias, fit cultural e integridad.`,
    sections: [
      { h: `Reclutamiento especializado en ${zona}`, html: `<p>En Estratego Talent ayudamos a las empresas de <strong>${zona}</strong> a cubrir posiciones especializadas, gerenciales y directivas con candidatos evaluados a profundidad. Conocemos el mercado laboral local y la dinámica industrial de la región.</p>
      <p>Cada búsqueda incluye definición del perfil real, búsqueda de candidatos pasivos, entrevistas por competencias, psicometría y verificación de referencias.</p>` },
      { h: `Servicios para empresas en ${zona}`, html: `<ul>
        <li>Reclutamiento y selección de personal</li>
        <li>Headhunting de posiciones directivas</li>
        <li>Estudios socioeconómicos con visita domiciliaria</li>
        <li>Pruebas psicométricas validadas</li>
        <li>Encuestas y benchmarking de sueldos</li>
      </ul>` },
    ],
    faq: [
      { q: `¿Atienden empresas en ${zona}?`, a: `Sí. Damos servicio de reclutamiento y selección a empresas en ${zona} y toda la zona metropolitana de Monterrey, Nuevo León.` },
      { q: '¿Cuánto tarda el proceso?', a: 'Nuestro tiempo de cierre promedio es de 30 días desde el levantamiento del perfil hasta la presentación de finalistas.' },
      { q: '¿Ofrecen garantía de reposición?', a: 'Sí, cada búsqueda incluye garantía de reposición sin costo si el candidato no concluye su periodo de prueba.' },
    ],
    serviceType: 'Reclutamiento y selección de personal',
  }
}
LANDINGS.push(...['San Pedro Garza García', 'Apodaca', 'Santa Catarina', 'Guadalupe', 'San Nicolás de los Garza', 'García'].map(localLanding))

function landingLD(l) {
  const service = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: l.serviceType,
    serviceType: l.serviceType,
    provider: { '@type': 'Organization', name: ORG, url: SITE },
    areaServed: { '@type': 'City', name: 'Monterrey' },
    url: `${SITE}/${l.slug}.html`,
    description: l.description,
  }
  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: l.faq.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: l.h1, item: `${SITE}/${l.slug}.html` },
    ],
  }
  return [service, faq, breadcrumb]
}

function landingPage(l) {
  const body = `
  <header class="hero"><div class="in">
    <span class="tag">${esc(l.serviceType)} · Monterrey</span>
    <h1>${esc(l.h1)}</h1>
    <p>${esc(l.lead)}</p>
    <a class="btn btn-sal" href="https://portal.estratego.com.mx/contacto-empresas" style="margin-top:22px">Solicitar propuesta sin costo →</a>
  </div></header>
  <div class="wrap">
    ${l.sections.map(s => `<h2>${esc(s.h)}</h2>${s.html}`).join('')}

    <h2>Preguntas frecuentes</h2>
    <div class="faq">
      ${l.faq.map(f => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}
    </div>

    <div class="card" style="margin-top:32px;text-align:center">
      <h3 style="margin-top:0">¿Listo para empezar?</h3>
      <p class="muted">Cuéntanos qué buscas y te contactamos en menos de 24 horas.</p>
      <a class="btn" href="https://portal.estratego.com.mx/contacto-empresas">Solicitar propuesta →</a>
    </div>
  </div>`
  return page({
    title: l.title,
    description: l.description,
    canonical: `${SITE}/${l.slug}.html`,
    body,
    jsonLd: landingLD(l),
  })
}

/* ===========================================================
   Salary guides  /sueldos/<slug>-monterrey
   High search volume, low competition. Ranges are Estratego
   market estimates for the Monterrey metro area (MXN gross/month).
   =========================================================== */
const SUELDOS_FALLBACK = [
  { slug:'gerente-de-operaciones', puesto:'Gerente de Operaciones', area:'Operaciones',
    rangos:{ junior:[35000,50000], medio:[50000,80000], senior:[80000,130000] },
    resumen:'El gerente de operaciones lidera la producción, logística y mejora continua de una planta o unidad de negocio. En Monterrey, polo industrial del país, es una de las posiciones mejor pagadas y con mayor demanda.',
    factores:['Tamaño de la planta y número de personas a cargo','Experiencia en lean manufacturing / Six Sigma','Industria (automotriz y acero pagan por encima del promedio)','Manejo de inglés para reportar a corporativos'],
    demanda:'Alta. La concentración de manufactura en Apodaca, Santa Catarina y García mantiene una demanda constante de líderes de operaciones.' },
  { slug:'gerente-de-recursos-humanos', puesto:'Gerente de Recursos Humanos', area:'Recursos Humanos',
    rangos:{ junior:[35000,55000], medio:[55000,85000], senior:[85000,130000] },
    resumen:'Responsable de atracción de talento, relaciones laborales, compensaciones y cultura. En Monterrey la función de RH se ha vuelto estratégica ante la competencia por talento.',
    factores:['Número de colaboradores en la organización','Experiencia en relaciones laborales y sindicato','Especialización (atracción, compensaciones, desarrollo)','Certificaciones y manejo de inglés'],
    demanda:'Alta, especialmente perfiles con experiencia en atracción de talento y relaciones laborales.' },
  { slug:'contralor', puesto:'Contralor', area:'Finanzas y Contabilidad',
    rangos:{ junior:[40000,60000], medio:[60000,90000], senior:[90000,140000] },
    resumen:'El contralor supervisa la contabilidad, los controles internos, la información financiera y el cumplimiento fiscal. Es una posición de alta confianza y responsabilidad.',
    factores:['Tamaño y complejidad de la empresa','Experiencia en NIF/US GAAP y consolidación','Manejo de ERP (SAP, Oracle)','Inglés para corporativos extranjeros'],
    demanda:'Constante. Las empresas extranjeras instaladas en Nuevo León buscan contralores bilingües con experiencia en normas internacionales.' },
  { slug:'ingeniero-de-procesos', puesto:'Ingeniero de Procesos', area:'Ingeniería',
    rangos:{ junior:[22000,35000], medio:[35000,55000], senior:[55000,80000] },
    resumen:'Diseña, optimiza y estandariza procesos productivos. Es un perfil técnico muy solicitado en la industria manufacturera del área metropolitana.',
    factores:['Dominio de herramientas de mejora continua','Experiencia en la industria específica','Manejo de software CAD/simulación','Inglés técnico'],
    demanda:'Muy alta en el corredor industrial de Monterrey.' },
  { slug:'gerente-de-ventas', puesto:'Gerente de Ventas', area:'Comercial',
    rangos:{ junior:[30000,50000], medio:[50000,80000], senior:[80000,120000] },
    resumen:'Lidera al equipo comercial, define la estrategia de ventas y es responsable del cumplimiento de cuota. La compensación suele incluir un esquema variable importante.',
    factores:['Esquema de comisiones y bonos (puede duplicar el fijo)','Industria y ticket promedio','Tamaño del equipo a cargo','Cartera de clientes y relaciones'],
    demanda:'Alta. Suele complementarse con comisiones, por lo que el ingreso total puede superar el rango base.' },
  { slug:'desarrollador-de-software', puesto:'Desarrollador de Software', area:'Tecnología',
    rangos:{ junior:[25000,45000], medio:[45000,75000], senior:[75000,110000] },
    resumen:'Construye y mantiene aplicaciones y sistemas. Monterrey se ha consolidado como hub de tecnología y los perfiles senior compiten con ofertas remotas internacionales.',
    factores:['Stack tecnológico y especialización','Inglés (abre ofertas remotas en USD)','Experiencia en cloud y arquitectura','Modalidad remota vs presencial'],
    demanda:'Muy alta. La competencia con empleadores remotos presiona los sueldos al alza.' },
  { slug:'gerente-financiero', puesto:'Gerente Financiero', area:'Finanzas y Contabilidad',
    rangos:{ junior:[45000,70000], medio:[70000,100000], senior:[100000,160000] },
    resumen:'Dirige la planeación financiera, tesorería, financiamiento y relación con inversionistas. Es una de las posiciones gerenciales mejor remuneradas.',
    factores:['Tamaño de la empresa y complejidad financiera','Experiencia en M&A, financiamiento y FP&A','Inglés y manejo de corporativos','Industria'],
    demanda:'Constante para perfiles bilingües con experiencia en planeación financiera.' },
  { slug:'analista-de-datos', puesto:'Analista de Datos', area:'Tecnología',
    rangos:{ junior:[25000,40000], medio:[40000,60000], senior:[60000,90000] },
    resumen:'Convierte datos en información para la toma de decisiones. Una de las funciones de mayor crecimiento en empresas de Monterrey de todos los sectores.',
    factores:['Dominio de SQL, Python y BI (Power BI, Tableau)','Experiencia en modelado y machine learning','Inglés','Industria y volumen de datos'],
    demanda:'Creciente y transversal a todas las industrias.' },
]
// Live benchmarks are loaded from Supabase in main(); falls back to the static array.
let SUELDOS = SUELDOS_FALLBACK
const fmtRange = (r) => {
  const [a, b] = Array.isArray(r) ? r : []
  if (a == null && b == null) return 'Sueldo competitivo'
  const f = n => n == null ? '' : `$${Number(n).toLocaleString('es-MX')}`
  return a != null && b != null ? `${f(a)} – ${f(b)}` : (f(a) || f(b))
}

// Pull published salary benchmarks from Supabase (table: sueldos_mercado).
async function fetchSueldos() {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_ANON_KEY
  if (!url || !key) { console.warn('⚠ SUPABASE creds ausentes — usando sueldos estáticos.'); return SUELDOS_FALLBACK }
  try {
    const supabase = createClient(url, key, { auth: { persistSession: false } })
    const { data, error } = await supabase.from('sueldos_mercado')
      .select('*').eq('publicado', true).order('puesto')
    if (error) { console.warn('⚠ sueldos_mercado:', error.message, '— usando estáticos.'); return SUELDOS_FALLBACK }
    if (!data || data.length === 0) return SUELDOS_FALLBACK
    return data.map(r => ({
      slug: r.slug, puesto: r.puesto, area: r.area || '',
      rangos: {
        junior: [r.junior_min, r.junior_max],
        medio:  [r.medio_min,  r.medio_max],
        senior: [r.senior_min, r.senior_max],
      },
      resumen: r.resumen || '',
      factores: Array.isArray(r.factores) ? r.factores : [],
      demanda: r.demanda || '',
    }))
  } catch (e) {
    console.warn('⚠ fetchSueldos falló:', e.message, '— usando estáticos.')
    return SUELDOS_FALLBACK
  }
}

function sueldoLD(s) {
  const year = new Date().getFullYear()
  const faqItems = [
    { q:`¿Cuánto gana un ${s.puesto.toLowerCase()} en Monterrey?`, a:`En Monterrey, un ${s.puesto.toLowerCase()} gana entre ${fmtRange(s.rangos.junior)} (nivel inicial) y ${fmtRange(s.rangos.senior)} MXN brutos al mes (nivel senior), según experiencia, industria y tamaño de la empresa.` },
    { q:`¿Qué factores influyen en el sueldo?`, a: s.factores.join('. ') + '.' },
    { q:`¿Hay demanda de ${s.puesto.toLowerCase()} en Monterrey?`, a: s.demanda },
  ]
  return [
    { '@context':'https://schema.org', '@type':'FAQPage', mainEntity: faqItems.map(f => ({ '@type':'Question', name:f.q, acceptedAnswer:{ '@type':'Answer', text:f.a } })) },
    { '@context':'https://schema.org', '@type':'BreadcrumbList', itemListElement:[
      { '@type':'ListItem', position:1, name:'Inicio', item:`${SITE}/` },
      { '@type':'ListItem', position:2, name:'Sueldos', item:`${SITE}/sueldos/` },
      { '@type':'ListItem', position:3, name:`Sueldo de ${s.puesto} en Monterrey`, item:`${SITE}/sueldos/${s.slug}-monterrey.html` },
    ] },
  ]
}

function sueldoPage(s) {
  const year = new Date().getFullYear()
  const niveles = [
    ['Nivel inicial (0–3 años)', s.rangos.junior],
    ['Nivel intermedio (3–7 años)', s.rangos.medio],
    ['Nivel senior (+7 años)', s.rangos.senior],
  ]
  const body = `
  <header class="hero"><div class="in">
    <span class="tag">Guía de sueldos · Monterrey ${year}</span>
    <h1>Sueldo de ${esc(s.puesto)} en Monterrey (${year})</h1>
    <p>${esc(s.resumen)}</p>
  </div></header>
  <div class="wrap">
    <h2>Rango salarial en Monterrey</h2>
    <div class="card" style="padding:0;overflow:hidden">
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="background:#F4F1EC"><th style="text-align:left;padding:14px 18px;font-size:13px;color:#5C6B78">Nivel de experiencia</th><th style="text-align:right;padding:14px 18px;font-size:13px;color:#5C6B78">Sueldo bruto mensual (MXN)</th></tr></thead>
        <tbody>${niveles.map(([n,r]) => `<tr style="border-top:1px solid #ECE7DF"><td style="padding:14px 18px">${n}</td><td style="padding:14px 18px;text-align:right;font-weight:600">${fmtRange(r)}</td></tr>`).join('')}</tbody>
      </table>
    </div>
    <p class="muted" style="font-size:13px">Cifras estimadas por Estratego Talent con base en el mercado del área metropolitana de Monterrey. El ingreso total puede variar por bonos, prestaciones superiores y esquema variable.</p>

    <h2>¿Qué influye en el sueldo?</h2>
    <ul>${s.factores.map(f => `<li>${esc(f)}</li>`).join('')}</ul>

    <h2>Demanda en Monterrey</h2>
    <p>${esc(s.demanda)}</p>

    <h2>Preguntas frecuentes</h2>
    <div class="faq">
      <details><summary>¿Cuánto gana un ${esc(s.puesto.toLowerCase())} en Monterrey?</summary><p>Entre ${fmtRange(s.rangos.junior)} (inicial) y ${fmtRange(s.rangos.senior)} MXN brutos al mes (senior), según experiencia e industria.</p></details>
      <details><summary>¿El rango incluye bonos y comisiones?</summary><p>No. Los rangos son sueldo base bruto mensual; el ingreso total puede ser mayor con esquema variable y prestaciones.</p></details>
    </div>

    <div class="card" style="margin-top:32px;display:grid;grid-template-columns:1fr 1fr;gap:14px">
      <div><h3 style="margin-top:0">¿Eres empresa?</h3><p class="muted" style="font-size:14px">Te ayudamos a definir una oferta competitiva y atraer al mejor talento.</p><a class="btn" href="https://portal.estratego.com.mx/contacto-empresas">Solicitar propuesta →</a></div>
      <div><h3 style="margin-top:0">¿Buscas empleo?</h3><p class="muted" style="font-size:14px">Únete a nuestra bolsa de talento y entérate de vacantes para tu perfil.</p><a class="btn btn-sal" href="https://portal.estratego.com.mx/postulacion">Postularme →</a></div>
    </div>
  </div>`
  return page({
    title: `Sueldo de ${s.puesto} en Monterrey ${year} | Estratego Talent`,
    description: `¿Cuánto gana un ${s.puesto.toLowerCase()} en Monterrey? Rango salarial ${year}: ${fmtRange(s.rangos.junior)} a ${fmtRange(s.rangos.senior)} MXN/mes según experiencia.`,
    canonical: `${SITE}/sueldos/${s.slug}-monterrey.html`,
    jsonLd: sueldoLD(s),
    body,
  })
}

function sueldosHub() {
  const year = new Date().getFullYear()
  const items = SUELDOS.map(s => `<a href="/sueldos/${s.slug}-monterrey.html" class="card" style="display:block;text-decoration:none">
    <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap">
      <div><h3 style="margin:0 0 4px;color:#1B3A5C">${esc(s.puesto)}</h3><div class="muted" style="font-size:14px">${esc(s.area)}</div></div>
      <div class="muted" style="font-size:13px;text-align:right">${fmtRange(s.rangos.medio)} MXN/mes</div>
    </div></a>`).join('')
  return page({
    title: `Sueldos en Monterrey ${year} — Guía salarial por puesto | Estratego Talent`,
    description: `Guía de sueldos en Monterrey ${year}: cuánto gana cada puesto por nivel de experiencia. Datos de mercado de Estratego Talent.`,
    canonical: `${SITE}/sueldos/`,
    jsonLd: { '@context':'https://schema.org', '@type':'CollectionPage', name:'Guía de sueldos en Monterrey', url:`${SITE}/sueldos/` },
    body: `<header class="hero"><div class="in"><span class="tag">Guía salarial · Monterrey ${year}</span><h1>¿Cuánto se gana en Monterrey?</h1><p>Rangos salariales por puesto y nivel de experiencia, basados en el mercado del área metropolitana.</p></div></header><div class="wrap">${items}</div>`,
  })
}

/* ===========================================================
   Job board (from Supabase)
   =========================================================== */
const EMPLOYMENT = { tiempo_completo:'FULL_TIME', medio_tiempo:'PART_TIME', temporal:'TEMPORARY', practicas:'INTERN', por_proyecto:'CONTRACTOR' }
const MODALIDAD = { presencial:'Presencial', hibrido:'Híbrido', remoto:'Remoto' }
const fmtMoney = n => n ? `$${Number(n).toLocaleString('es-MX')}` : null
function parseLocation(loc) { const [city, region] = (loc || 'Monterrey, NL').split(',').map(s => s.trim()); return { city: city || 'Monterrey', region: region || 'NL' } }
function slugFor(v) {
  return v.slug || (v.title || 'vacante').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') + '-' + String(v.id).slice(0,6)
}

async function fetchVacantes() {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_ANON_KEY
  if (!url || !key) { console.warn('⚠ SUPABASE creds ausentes — bolsa vacía.'); return [] }
  const supabase = createClient(url, key, { auth: { persistSession: false } })
  const { data, error } = await supabase.from('vacantes').select('*, clientes(company_name)')
    .eq('publica', true).eq('status', 'activa').order('publicada_at', { ascending: false })
  if (error) { console.error('Supabase:', error.message); return [] }
  return data ?? []
}

function jobPostingLD(v) {
  const { city, region } = parseLocation(v.location)
  const datePosted = (v.publicada_at || v.created_at || new Date().toISOString()).slice(0,10)
  const validThrough = v.expira_at ? v.expira_at.slice(0,10) : new Date(Date.now()+60*864e5).toISOString().slice(0,10)
  const hiring = v.mostrar_empresa && v.clientes?.company_name ? v.clientes.company_name : ORG
  const desc = v.descripcion_publica || v.ideal_profile || `Posición de ${v.title} en ${city}, ${region}.`
  const ld = {
    '@context':'https://schema.org/', '@type':'JobPosting', title:v.title,
    description:`<p>${esc(desc).replace(/\n/g,'</p><p>')}</p>`, datePosted, validThrough,
    employmentType: EMPLOYMENT[v.tipo_contrato] || 'FULL_TIME',
    hiringOrganization:{ '@type':'Organization', name:hiring, sameAs:SITE, logo:LOGO },
    jobLocation:{ '@type':'Place', address:{ '@type':'PostalAddress', addressLocality:city, addressRegion:region, addressCountry:'MX' } },
    directApply:true,
  }
  if (v.modalidad === 'remoto') ld.jobLocationType = 'TELECOMMUTE'
  if (v.mostrar_salario && v.salary_min) ld.baseSalary = { '@type':'MonetaryAmount', currency:'MXN', value:{ '@type':'QuantitativeValue', minValue:Number(v.salary_min), maxValue:Number(v.salary_max||v.salary_min), unitText:'MONTH' } }
  return ld
}

function jobListing(vacantes) {
  const items = vacantes.length === 0
    ? `<div class="card"><p class="muted">Por el momento no hay vacantes publicadas. <a href="https://portal.estratego.com.mx/postulacion">Únete a nuestra bolsa de talento</a> y te contactamos cuando haya una posición para ti.</p></div>`
    : vacantes.map(v => {
        const { city, region } = parseLocation(v.location)
        const salary = v.mostrar_salario && fmtMoney(v.salary_min) ? `${fmtMoney(v.salary_min)}${v.salary_max?'–'+fmtMoney(v.salary_max):''} MXN/mes` : 'Sueldo competitivo'
        return `<a href="/vacantes/${slugFor(v)}.html" class="card" style="display:block;text-decoration:none">
          <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap">
            <div><h3 style="margin:0 0 4px;color:#1B3A5C">${esc(v.title)}</h3><div class="muted" style="font-size:14px">${esc(city)}, ${esc(region)}${v.area_publica?' · '+esc(v.area_publica):''}</div></div>
            <div class="muted" style="font-size:13px;text-align:right">${salary}</div>
          </div></a>`
      }).join('')
  return page({
    title: 'Vacantes en Monterrey | Bolsa de empleo — Estratego Talent',
    description: 'Vacantes activas en Monterrey y Nuevo León: posiciones gerenciales, directivas y especializadas. Postúlate con Estratego Talent.',
    canonical: `${SITE}/vacantes/`,
    jsonLd: { '@context':'https://schema.org', '@type':'CollectionPage', name:'Vacantes — Estratego Talent', url:`${SITE}/vacantes/` },
    body: `<header class="hero"><div class="in"><span class="tag">Bolsa de empleo</span><h1>Vacantes en Monterrey</h1><p>${vacantes.length} ${vacantes.length===1?'posición activa':'posiciones activas'} en reclutamiento especializado, gerencial y directivo.</p></div></header><div class="wrap">${items}</div>`,
  })
}

function jobDetail(v) {
  const { city, region } = parseLocation(v.location)
  const slug = slugFor(v)
  const salary = v.mostrar_salario && fmtMoney(v.salary_min) ? `${fmtMoney(v.salary_min)}${v.salary_max?'–'+fmtMoney(v.salary_max):''} MXN / mes` : 'Sueldo competitivo según experiencia'
  const desc = (v.descripcion_publica || v.ideal_profile || '').split('\n').filter(Boolean).map(p => `<p>${esc(p)}</p>`).join('')
  const empresa = v.mostrar_empresa && v.clientes?.company_name ? v.clientes.company_name : 'Empresa confidencial (cliente de Estratego Talent)'
  return page({
    title: `${v.title} en ${city} | Vacante — Estratego Talent`,
    description: `Vacante de ${v.title} en ${city}, ${region}. ${(v.descripcion_publica||v.ideal_profile||'').slice(0,120)}`.trim(),
    canonical: `${SITE}/vacantes/${slug}.html`,
    jsonLd: jobPostingLD(v),
    body: `<header class="hero"><div class="in"><a href="/vacantes/" style="color:#B8D3D8;font-size:13px;text-decoration:none">← Todas las vacantes</a><h1 style="margin-top:12px">${esc(v.title)}</h1><p>${esc(city)}, ${esc(region)} · ${esc(salary)}</p></div></header>
    <div class="wrap"><div class="card">${desc || '<p class="muted">Descripción disponible al postularte.</p>'}<h3>Empresa</h3><p class="muted">${esc(empresa)}</p><a class="btn" href="https://portal.estratego.com.mx/postulacion?vacante=${encodeURIComponent(slug)}" style="margin-top:18px">Postularme a esta vacante →</a></div></div>`,
  })
}

/* ===========================================================
   Sitemap (unified)
   =========================================================== */
/* ===========================================================
   Insights / Blog (SEO de contenido)
   =========================================================== */
const ARTICLES = [
  {
    slug: 'cuanto-cuesta-estudio-socioeconomico-monterrey',
    title: '¿Cuánto cuesta un estudio socioeconómico en Monterrey?',
    description: 'Cuánto cuesta un estudio socioeconómico en Monterrey, qué incluye, qué hace variar el precio y cuándo conviene aplicarlo antes de contratar.',
    date: '2026-05-20', cat: 'Estudios socioeconómicos',
    lead: 'El precio de un estudio socioeconómico depende de qué tan a fondo necesites validar al candidato. Esto es lo que pagas y lo que recibes a cambio.',
    sections: [
      { h: '¿Qué incluye el precio?', html: `<p>Un estudio socioeconómico profesional cubre <strong>visita domiciliaria, validación de datos personales y laborales, verificación de referencias y un reporte con nivel de riesgo</strong>. El costo refleja el trabajo de campo de un investigador, no solo una consulta en línea.</p>` },
      { h: '¿Qué hace variar el costo?', html: `<ul>
        <li>Profundidad: básico (validación documental) vs. integral (visita + patrimonial + referencias extendidas).</li>
        <li>Ubicación del candidato: zonas alejadas o foráneas implican traslado.</li>
        <li>Tiempo de entrega: un estudio urgente cuesta más que uno con 3 a 5 días hábiles.</li>
        <li>Volumen: a mayor número de estudios al mes, mejor precio por unidad.</li>
      </ul>` },
      { h: '¿Cuándo conviene aplicarlo?', html: `<p>En posiciones de confianza, manejo de efectivo, acceso a información sensible o trato directo con clientes. El costo del estudio es marginal frente al de una contratación equivocada en un puesto crítico.</p>` },
    ],
    faq: [
      { q: '¿Cuánto tarda un estudio socioeconómico?', a: 'Normalmente entre 3 y 5 días hábiles desde que se agenda la visita, dependiendo de la ubicación del candidato.' },
      { q: '¿Puedo solicitar estudios en línea?', a: 'Sí. Puedes solicitar y dar seguimiento a tus estudios socioeconómicos en línea con Estratego Talent, con reporte digital al finalizar.' },
    ],
  },
  {
    slug: 'nom-035-que-es-y-como-cumplirla',
    title: 'NOM-035: qué es y cómo cumplirla en tu empresa',
    description: 'Guía rápida de la NOM-035: qué obliga, a quién aplica y cómo cumplir con la identificación de factores de riesgo psicosocial en el trabajo.',
    date: '2026-05-15', cat: 'Cumplimiento',
    lead: 'La NOM-035 obliga a las empresas en México a identificar y prevenir factores de riesgo psicosocial. Cumplirla es más sencillo de lo que parece si lo abordas por pasos.',
    sections: [
      { h: '¿Qué es la NOM-035?', html: `<p>Es la Norma Oficial Mexicana que obliga a los centros de trabajo a <strong>identificar, analizar y prevenir los factores de riesgo psicosocial</strong> y a promover un entorno organizacional favorable. Aplica a todas las empresas, con requisitos que escalan según el número de trabajadores.</p>` },
      { h: '¿Qué tienes que hacer?', html: `<ul>
        <li>Aplicar los cuestionarios de identificación de factores de riesgo psicosocial.</li>
        <li>Analizar los resultados y definir acciones de control.</li>
        <li>Difundir una política de prevención de riesgos psicosociales.</li>
        <li>Conservar los registros como evidencia ante una inspección.</li>
      </ul>` },
      { h: 'Cómo simplificar el cumplimiento', html: `<p>La parte más operativa es aplicar y procesar los cuestionarios. Con una herramienta en línea que los aplique, califique automáticamente y genere el reporte por nivel de riesgo, el cumplimiento deja de ser una carga administrativa.</p>` },
    ],
    faq: [
      { q: '¿A qué empresas aplica la NOM-035?', a: 'A todos los centros de trabajo en México. Los requisitos aumentan según el número de trabajadores: hasta 15, de 16 a 50, y más de 50.' },
      { q: '¿Cómo se identifican los factores de riesgo psicosocial?', a: 'Mediante cuestionarios estandarizados que evalúan condiciones del entorno, carga de trabajo, liderazgo y relaciones. Estratego Talent los aplica e interpreta en línea.' },
    ],
  },
  {
    slug: 'como-reducir-la-rotacion-de-personal',
    title: 'Cómo reducir la rotación de personal en tu empresa',
    description: 'Causas reales de la rotación de personal y acciones concretas para reducirla: selección, onboarding, liderazgo y compensación.',
    date: '2026-05-10', cat: 'Gestión de talento',
    lead: 'La rotación alta drena dinero y conocimiento. La buena noticia es que la mayoría de sus causas son atacables desde la selección y los primeros 90 días.',
    sections: [
      { h: 'Empieza por la selección', html: `<p>Gran parte de la rotación temprana viene de contratar por urgencia y solo con el CV. Evaluar <strong>fit cultural, motivación e integridad</strong> desde el inicio reduce las salidas en los primeros meses.</p>` },
      { h: 'Los primeros 90 días deciden', html: `<p>Un onboarding estructurado con objetivos claros a 30, 60 y 90 días acelera la productividad y reduce el abandono temprano. La falta de claridad en las primeras semanas es una causa común de salida.</p>` },
      { h: 'Liderazgo y compensación', html: `<ul>
        <li>La gente renuncia a jefes, no a empresas: forma a tus líderes.</li>
        <li>Compara tu compensación con el mercado real de Monterrey para no perder talento por sueldo.</li>
        <li>Da retroalimentación y plan de crecimiento; la falta de futuro es un motor de rotación.</li>
      </ul>` },
    ],
    faq: [
      { q: '¿Qué se considera una rotación alta?', a: 'Depende de la industria, pero una rotación que supera de forma sostenida el promedio de tu sector suele indicar problemas de selección, liderazgo o compensación.' },
      { q: '¿Cómo ayuda la psicometría a reducir la rotación?', a: 'Permite evaluar comportamiento, valores y fit con el puesto antes de contratar, reduciendo las salidas tempranas por desajuste cultural o de motivación.' },
    ],
  },
  {
    slug: 'que-prueba-psicometrica-aplicar-por-puesto',
    title: 'Qué prueba psicométrica aplicar según el puesto',
    description: 'Guía para elegir la prueba psicométrica correcta según el puesto: comportamiento, aptitud cognitiva, valores, liderazgo y juicio situacional.',
    date: '2026-05-06', cat: 'Psicometría',
    lead: 'No todas las pruebas miden lo mismo. Elegir la correcta según el puesto te da información útil en lugar de un reporte que nadie usa.',
    sections: [
      { h: 'Posiciones operativas y de confianza', html: `<p>Prioriza <strong>valores e integridad</strong> y un perfil de comportamiento. Para puestos con manejo de recursos, complementa con un estudio socioeconómico.</p>` },
      { h: 'Mandos medios y especialistas', html: `<p>Combina <strong>perfil de comportamiento (Cleaver DISC)</strong> con <strong>aptitud cognitiva</strong> para medir cómo trabaja y cómo resuelve problemas. Para roles comerciales, añade aptitud comercial.</p>` },
      { h: 'Posiciones directivas', html: `<p>Suma <strong>liderazgo, juicio situacional</strong> y un perfil más profundo de personalidad. Aquí lo importante no es solo la aptitud, sino la toma de decisiones y el manejo de personas bajo presión.</p>` },
    ],
    faq: [
      { q: '¿Cuántas pruebas conviene aplicar por candidato?', a: 'Para la mayoría de los puestos, una batería de dos o tres pruebas complementarias da una visión completa sin saturar al candidato.' },
      { q: '¿Las pruebas se aplican en línea?', a: 'Sí. Con Estratego Talent se aplican mediante un enlace único desde cualquier dispositivo y se califican automáticamente.' },
    ],
  },
  {
    slug: 'cuanto-tarda-contratar-en-mexico',
    title: '¿Cuánto tarda contratar a alguien en México?',
    description: 'Cuánto tarda un proceso de contratación en México por nivel de puesto y qué hacer para reducir el tiempo de cierre sin sacrificar calidad.',
    date: '2026-05-03', cat: 'Reclutamiento',
    lead: 'El tiempo de contratación varía mucho según el nivel del puesto. Conocer el promedio te ayuda a planear y a no perder a los mejores candidatos por lentitud.',
    sections: [
      { h: 'Tiempos típicos por nivel', html: `<ul>
        <li><strong>Operativo:</strong> de días a un par de semanas, con buena oferta de talento activo.</li>
        <li><strong>Mandos medios y especialistas:</strong> alrededor de 30 días desde el levantamiento del perfil.</li>
        <li><strong>Directivos y C-Suite:</strong> de uno a tres meses, por la búsqueda de candidatos pasivos.</li>
      </ul>` },
      { h: 'Qué alarga el proceso', html: `<p>Perfiles mal definidos, demasiados entrevistadores, agendas lentas y decisiones que se posponen. El cuello de botella suele estar del lado de la empresa, no del candidato.</p>` },
      { h: 'Cómo acelerar sin perder calidad', html: `<p>Define el perfil real desde el inicio, acota a pocos tomadores de decisión, agiliza las agendas y apóyate en evaluaciones en línea para filtrar rápido. Una agencia con red de candidatos pasivos reduce el tiempo de búsqueda.</p>` },
    ],
    faq: [
      { q: '¿Cuál es el tiempo de cierre promedio de Estratego Talent?', a: 'Nuestro promedio es de alrededor de 30 días para mandos medios, desde el levantamiento del perfil hasta la presentación de finalistas. Las posiciones directivas pueden tomar más.' },
    ],
  },
  {
    slug: 'como-elegir-agencia-de-reclutamiento-monterrey',
    title: 'Cómo elegir una agencia de reclutamiento en Monterrey',
    description: 'Guía práctica para elegir agencia de reclutamiento en Monterrey: qué preguntar, cómo comparar honorarios, garantías y metodología antes de contratar.',
    date: '2026-05-01', cat: 'Reclutamiento',
    lead: 'No todas las agencias de reclutamiento trabajan igual. Estos son los criterios que separan a un proveedor que llena vacantes de un socio que construye equipos.',
    sections: [
      { h: '1. Metodología, no base de datos', html: `<p>Pregunta cómo definen el perfil y cómo buscan. Una agencia seria <strong>levanta el perfil real</strong> (no el de papel), busca candidatos pasivos y evalúa competencias e integridad, no solo revisa CVs de una base preexistente.</p>` },
      { h: '2. Honorarios y garantía claros', html: `<p>El estándar en México es un porcentaje del sueldo anual del puesto. Exige por escrito el porcentaje, los hitos de pago y la <strong>garantía de reposición</strong> si el candidato no concluye su periodo de prueba.</p>` },
      { h: '3. Tiempo de cierre y comunicación', html: `<p>Pide su tiempo de cierre promedio (un buen referente son ~30 días para mandos medios) y cómo te reportan el avance. La falta de comunicación es la queja #1 de las empresas.</p>` },
      { h: '4. Evaluación más allá del CV', html: `<p>Psicometría validada, verificación de referencias y, para posiciones de confianza, estudios socioeconómicos. Una mala contratación cuesta mucho más que el honorario.</p>` },
    ],
    faq: [
      { q: '¿Cuánto cobra una agencia de reclutamiento en Monterrey?', a: 'Generalmente un porcentaje del sueldo anual del puesto, que varía según el nivel y la dificultad de la búsqueda. Pide una propuesta sin costo.' },
      { q: '¿Conviene una agencia o reclutar internamente?', a: 'Para posiciones especializadas, gerenciales o directivas, una agencia con metodología y red de candidatos pasivos suele ser más rápida y reduce el riesgo de una mala contratación.' },
    ],
  },
  {
    slug: 'costo-de-una-mala-contratacion',
    title: 'El costo oculto de una mala contratación',
    description: 'Una mala contratación cuesta mucho más que el sueldo: rotación, capacitación perdida, impacto en el equipo y en el cliente. Cómo reducir el riesgo.',
    date: '2026-04-15', cat: 'Gestión de talento',
    lead: 'Contratar a la persona equivocada es uno de los errores más caros para una empresa, y casi nunca se mide. Desglosamos el costo real y cómo evitarlo.',
    sections: [
      { h: '¿Qué incluye el costo de una mala contratación?', html: `<ul><li>Sueldo y prestaciones pagados sin retorno.</li><li>Tiempo de reclutamiento y capacitación perdido.</li><li>Caída de productividad del equipo y del área.</li><li>Impacto en clientes y en el clima laboral.</li><li>Costo de volver a buscar y reentrenar.</li></ul>` },
      { h: 'Las causas más comunes', html: `<p>La mayoría de las malas contrataciones no fallan por falta de habilidad técnica, sino por <strong>fit cultural, motivación o integridad</strong>. Por eso evaluar solo el CV no basta.</p>` },
      { h: 'Cómo reducir el riesgo', html: `<p>Definición precisa del perfil, entrevistas por competencias, <strong>pruebas psicométricas</strong>, verificación de referencias y, en posiciones de confianza, estudios socioeconómicos. La inversión en evaluación es marginal frente al costo de equivocarse.</p>` },
    ],
    faq: [
      { q: '¿Cuánto cuesta una mala contratación?', a: 'Diversos estudios la estiman entre varias veces el sueldo mensual y hasta el equivalente a un año de sueldo del puesto, sumando rotación, capacitación e impacto en el equipo.' },
    ],
  },
  {
    slug: 'headhunting-vs-bolsa-de-trabajo',
    title: 'Headhunting vs. bolsa de trabajo: cuándo usar cada uno',
    description: 'Para posiciones directivas, el mejor candidato rara vez está aplicando. Diferencias entre headhunting y bolsa de trabajo y cuándo conviene cada uno.',
    date: '2026-03-20', cat: 'Headhunting',
    lead: 'Publicar una vacante funciona para muchos puestos, pero para el talento crítico suele no alcanzar. Esta es la diferencia.',
    sections: [
      { h: 'Bolsa de trabajo: candidatos activos', html: `<p>Funciona bien para posiciones operativas y algunos mandos medios, donde hay suficiente talento buscando empleo de forma activa.</p>` },
      { h: 'Headhunting: candidatos pasivos', html: `<p>Para dirección, C-Suite y perfiles escasos, el mejor candidato <strong>ya tiene trabajo y no está buscando</strong>. El headhunting lo identifica, lo contacta con discreción y despierta su interés en tu proyecto.</p>` },
      { h: '¿Cuál necesitas?', html: `<p>Si la posición es crítica, confidencial o el perfil es escaso, headhunting. Si hay oferta amplia de talento activo, una buena bolsa de trabajo bien gestionada es suficiente.</p>` },
    ],
    faq: [
      { q: '¿Qué es el headhunting?', a: 'Es la búsqueda directa y confidencial de candidatos pasivos de alto nivel, en lugar de esperar postulaciones. Es ideal para posiciones directivas y críticas.' },
    ],
  },
]

function articleLD(a) {
  const fechaISO = a.date
  return [
    { '@context':'https://schema.org', '@type':'Article', headline:a.title, description:a.description,
      datePublished:fechaISO, dateModified:fechaISO, author:{ '@type':'Organization', name:ORG },
      publisher:{ '@type':'Organization', name:ORG, logo:{ '@type':'ImageObject', url:LOGO } },
      mainEntityOfPage:`${SITE}/insights/${a.slug}.html` },
    { '@context':'https://schema.org', '@type':'FAQPage', mainEntity:(a.faq||[]).map(f => ({ '@type':'Question', name:f.q, acceptedAnswer:{ '@type':'Answer', text:f.a } })) },
    { '@context':'https://schema.org', '@type':'BreadcrumbList', itemListElement:[
      { '@type':'ListItem', position:1, name:'Inicio', item:`${SITE}/` },
      { '@type':'ListItem', position:2, name:'Insights', item:`${SITE}/insights/` },
      { '@type':'ListItem', position:3, name:a.title, item:`${SITE}/insights/${a.slug}.html` },
    ] },
  ]
}

function articlePage(a) {
  const fecha = new Date(a.date + 'T12:00:00').toLocaleDateString('es-MX', { day:'2-digit', month:'long', year:'numeric' })
  const body = `
  <header class="hero"><div class="in">
    <a href="/insights/" style="color:#B8D3D8;font-size:13px;text-decoration:none">← Insights</a>
    <span class="tag" style="margin-top:12px">${esc(a.cat)} · ${fecha}</span>
    <h1>${esc(a.title)}</h1>
    <p>${esc(a.lead)}</p>
  </div></header>
  <div class="wrap">
    ${a.sections.map(s => `<h2>${esc(s.h)}</h2>${s.html}`).join('')}
    <h2>Preguntas frecuentes</h2>
    <div class="faq">${(a.faq||[]).map(f => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}</div>
    <div class="card" style="margin-top:32px"><h3 style="margin-top:0">¿Buscas talento o asesoría?</h3><p class="muted" style="font-size:14px">Cuéntanos tu necesidad y un consultor te contacta.</p><a class="btn" href="https://portal.estratego.com.mx/contacto-empresas">Solicitar propuesta →</a></div>
  </div>`
  return page({ title: `${a.title} | Estratego Talent`, description: a.description, canonical: `${SITE}/insights/${a.slug}.html`, jsonLd: articleLD(a), body })
}

function insightsHub() {
  const items = ARTICLES.map(a => `<a href="/insights/${a.slug}.html" class="card" style="display:block;text-decoration:none">
    <div class="muted" style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#4A7D88">${esc(a.cat)}</div>
    <h3 style="margin:6px 0 6px;color:#1B3A5C">${esc(a.title)}</h3>
    <p class="muted" style="font-size:14px">${esc(a.description)}</p></a>`).join('')
  return page({
    title: 'Insights — Reclutamiento y talento en Monterrey | Estratego Talent',
    description: 'Artículos prácticos sobre reclutamiento, selección, headhunting y gestión de talento en Monterrey y México.',
    canonical: `${SITE}/insights/`,
    jsonLd: { '@context':'https://schema.org', '@type':'CollectionPage', name:'Insights — Estratego Talent', url:`${SITE}/insights/` },
    body: `<header class="hero"><div class="in"><span class="tag">Insights</span><h1>Perspectiva del mercado de talento</h1><p>Ideas prácticas sobre reclutamiento, selección y liderazgo en Monterrey y México.</p></div></header><div class="wrap">${items}</div>`,
  })
}

function sitemap(vacantes) {
  const urls = [
    { loc:`${SITE}/`, pri:'1.0' },
    ...LANDINGS.map(l => ({ loc:`${SITE}/${l.slug}.html`, pri:'0.9' })),
    { loc:`${SITE}/sueldos/`, pri:'0.8' },
    ...SUELDOS.map(s => ({ loc:`${SITE}/sueldos/${s.slug}-monterrey.html`, pri:'0.8' })),
    { loc:`${SITE}/insights/`, pri:'0.7' },
    ...ARTICLES.map(a => ({ loc:`${SITE}/insights/${a.slug}.html`, pri:'0.7' })),
    { loc:`${SITE}/vacantes/`, pri:'0.8' },
    ...vacantes.map(v => ({ loc:`${SITE}/vacantes/${slugFor(v)}.html`, pri:'0.7' })),
  ]
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u.loc}</loc><changefreq>weekly</changefreq><priority>${u.pri}</priority></url>`).join('\n')}
</urlset>`
}

/* ===========================================================
   Main
   =========================================================== */
async function main() {
  // Landing pages
  for (const l of LANDINGS) await writeFile(join(ROOT, `${l.slug}.html`), landingPage(l))

  // Salary guides (live benchmarks from Supabase, fallback to static)
  SUELDOS = await fetchSueldos()
  console.log(`  ${SUELDOS.length} guías de sueldos`)
  await mkdir(join(ROOT, 'sueldos'), { recursive: true })
  await writeFile(join(ROOT, 'sueldos', 'index.html'), sueldosHub())
  for (const s of SUELDOS) await writeFile(join(ROOT, 'sueldos', `${s.slug}-monterrey.html`), sueldoPage(s))

  // Insights / blog
  await mkdir(join(ROOT, 'insights'), { recursive: true })
  await writeFile(join(ROOT, 'insights', 'index.html'), insightsHub())
  for (const a of ARTICLES) await writeFile(join(ROOT, 'insights', `${a.slug}.html`), articlePage(a))

  // Job board
  const vacantes = await fetchVacantes()
  await mkdir(join(ROOT, 'vacantes'), { recursive: true })
  await writeFile(join(ROOT, 'vacantes', 'index.html'), jobListing(vacantes))
  for (const v of vacantes) await writeFile(join(ROOT, 'vacantes', `${slugFor(v)}.html`), jobDetail(v))

  // Sitemap
  await writeFile(join(ROOT, 'sitemap.xml'), sitemap(vacantes))

  console.log(`✓ SEO build: ${LANDINGS.length} landings + ${vacantes.length} vacante(s) + sitemap`)
}

main().catch(e => { console.error(e); process.exit(0) })
