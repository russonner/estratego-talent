/**
 * Programmatic SEO: landings de "Reclutamiento de [Puesto] en [Ciudad]".
 *
 * Genera ~60 páginas (10 puestos × 6 ciudades) en /reclutamiento/<slug>.html
 * con contenido único por combinación, JSON-LD (Service + FAQPage + Breadcrumb),
 * sueldos del mercado y enlaces internos cruzados.
 *
 * Se ejecuta en build time, junto con build-vacantes.mjs.
 * Salida: /reclutamiento/<puesto-slug>-en-<ciudad-slug>.html
 *         /reclutamiento/index.html (hub)
 *         Agrega entradas al sitemap.xml
 */
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'reclutamiento')
const SITE = 'https://estratego.com.mx'

const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')

/* ===========================================================
   Catálogos
   =========================================================== */
const PUESTOS = [
  {
    slug: 'gerente-de-operaciones',
    nombre: 'Gerente de Operaciones',
    area: 'Operaciones',
    sueldo: { min: 50000, max: 80000, senior: 110000 },
    sueldoGuia: '/sueldos/gerente-de-operaciones-monterrey.html',
    perfil: 'Profesional con sólida experiencia en manufactura, lean manufacturing y liderazgo de equipos multidisciplinarios. Inglés intermedio es deseable en empresas con casa matriz internacional.',
    competencias: ['Liderazgo de equipos', 'Lean / Six Sigma', 'Gestión de KPIs operativos', 'Manejo presupuestal', 'Resolución de problemas'],
    industrias: ['manufactura', 'logística', 'agroindustria', 'consumo'],
  },
  {
    slug: 'gerente-financiero',
    nombre: 'Gerente Financiero',
    area: 'Finanzas y Contabilidad',
    sueldo: { min: 70000, max: 100000, senior: 160000 },
    sueldoGuia: '/sueldos/gerente-financiero-monterrey.html',
    perfil: 'CP, CPA o LAE con sólida experiencia en planeación financiera, tesorería y manejo de flujo de efectivo. Inglés indispensable en corporativos.',
    competencias: ['Planeación financiera', 'Tesorería', 'Análisis FP&A', 'Reporting a corporativo', 'Negociación bancaria'],
    industrias: ['servicios financieros', 'manufactura', 'tecnología', 'retail'],
  },
  {
    slug: 'gerente-de-ventas',
    nombre: 'Gerente de Ventas',
    area: 'Comercial',
    sueldo: { min: 50000, max: 80000, senior: 130000 },
    sueldoGuia: '/sueldos/gerente-de-ventas-monterrey.html',
    perfil: 'Profesional comercial con track record demostrable, experiencia liderando equipos de venta consultiva y manejo de cuentas corporativas.',
    competencias: ['Venta consultiva B2B', 'Liderazgo de equipos comerciales', 'Forecasting', 'CRM y pipeline management', 'Negociación'],
    industrias: ['tecnología', 'servicios financieros', 'industrial', 'consumo'],
  },
  {
    slug: 'gerente-de-recursos-humanos',
    nombre: 'Gerente de Recursos Humanos',
    area: 'Recursos Humanos',
    sueldo: { min: 55000, max: 85000, senior: 130000 },
    sueldoGuia: '/sueldos/gerente-de-recursos-humanos-monterrey.html',
    perfil: 'Profesional con experiencia integral en atracción, desarrollo, relaciones laborales y cumplimiento normativo (LFT, NOM-035, IMSS).',
    competencias: ['Atracción de talento', 'Desarrollo organizacional', 'Relaciones laborales', 'Cumplimiento LFT', 'NOM-035'],
    industrias: ['manufactura', 'servicios', 'retail', 'tecnología'],
  },
  {
    slug: 'contralor',
    nombre: 'Contralor',
    area: 'Finanzas y Contabilidad',
    sueldo: { min: 60000, max: 90000, senior: 130000 },
    sueldoGuia: '/sueldos/contralor-monterrey.html',
    perfil: 'CP con experiencia en cierre contable, NIF, fiscal (CFDI 4.0, ISR, IVA) y auditoría. Manejo de ERP indispensable.',
    competencias: ['Contabilidad bajo NIF', 'Fiscal mexicano', 'Cierre y consolidación', 'ERP (SAP/Oracle/Aspel)', 'Auditoría'],
    industrias: ['manufactura', 'servicios financieros', 'retail', 'agroindustria'],
  },
  {
    slug: 'desarrollador-de-software',
    nombre: 'Desarrollador de Software',
    area: 'Tecnología',
    sueldo: { min: 45000, max: 75000, senior: 130000 },
    sueldoGuia: '/sueldos/desarrollador-de-software-monterrey.html',
    perfil: 'Ingeniero de software con dominio del stack que utiliza la empresa, capacidad de diseño y experiencia en equipos ágiles.',
    competencias: ['JavaScript / TypeScript', 'Backend (Node, Python, Java o .NET)', 'Bases de datos SQL/NoSQL', 'CI/CD', 'Metodologías ágiles'],
    industrias: ['tecnología', 'servicios financieros', 'fintech', 'retail digital'],
  },
  {
    slug: 'analista-de-datos',
    nombre: 'Analista de Datos',
    area: 'Tecnología',
    sueldo: { min: 40000, max: 60000, senior: 90000 },
    sueldoGuia: '/sueldos/analista-de-datos-monterrey.html',
    perfil: 'Profesional con dominio de SQL, herramientas de visualización (Power BI o Tableau) y capacidad de traducir datos a decisiones.',
    competencias: ['SQL avanzado', 'Power BI / Tableau', 'Python o R', 'Comunicación con stakeholders', 'Estadística aplicada'],
    industrias: ['retail', 'servicios financieros', 'manufactura', 'tecnología'],
  },
  {
    slug: 'ingeniero-de-procesos',
    nombre: 'Ingeniero de Procesos',
    area: 'Ingeniería',
    sueldo: { min: 35000, max: 55000, senior: 80000 },
    sueldoGuia: '/sueldos/ingeniero-de-procesos-monterrey.html',
    perfil: 'Ingeniero industrial o químico con experiencia en mejora continua, mapeo de procesos y proyectos de productividad.',
    competencias: ['Mejora continua (Lean / Six Sigma)', 'Mapeo de procesos', 'Análisis estadístico', 'Gestión de proyectos', 'Manejo de planta'],
    industrias: ['manufactura', 'automotriz', 'consumo', 'químico'],
  },
  {
    slug: 'director-comercial',
    nombre: 'Director Comercial',
    area: 'Comercial',
    sueldo: { min: 110000, max: 180000, senior: 260000 },
    sueldoGuia: '/sueldos/gerente-de-ventas-monterrey.html',
    perfil: 'Líder con visión estratégica de ventas, manejo de presupuesto multimillonario, experiencia liderando varias gerencias y track record en crecimiento de mercado.',
    competencias: ['Estrategia comercial', 'Liderazgo de gerentes', 'Manejo de P&L', 'Relaciones con clientes clave', 'Inglés ejecutivo'],
    industrias: ['industrial', 'tecnología', 'servicios financieros', 'consumo'],
  },
  {
    slug: 'director-de-operaciones',
    nombre: 'Director de Operaciones',
    area: 'Operaciones',
    sueldo: { min: 130000, max: 200000, senior: 300000 },
    sueldoGuia: '/sueldos/gerente-de-operaciones-monterrey.html',
    perfil: 'Líder operativo con experiencia dirigiendo varias plantas o regiones, manejo de P&L y reporte a Dirección General o casa matriz.',
    competencias: ['Liderazgo multi-sitio', 'Manejo de P&L', 'Supply chain integral', 'Reporting a corporativo', 'Inglés ejecutivo'],
    industrias: ['manufactura', 'logística', 'agroindustria', 'consumo'],
  },
]

const CIUDADES = [
  {
    slug: 'monterrey',
    nombre: 'Monterrey',
    extendido: 'Monterrey, Nuevo León',
    contexto: 'Monterrey es la capital industrial del norte de México, sede de grupos como FEMSA, Alfa, Cemex y Banorte, además de un ecosistema fuerte de manufactura, banca, retail y tecnología.',
    industriasFuertes: ['manufactura pesada', 'servicios financieros', 'tecnología', 'consumo'],
  },
  {
    slug: 'san-pedro-garza-garcia',
    nombre: 'San Pedro Garza García',
    extendido: 'San Pedro Garza García, Nuevo León',
    contexto: 'San Pedro concentra las oficinas corporativas y dirección general de los grupos económicos más relevantes del país. Es la zona de mayor PIB per cápita de México y el epicentro del talento ejecutivo.',
    industriasFuertes: ['corporativos', 'servicios financieros', 'fintech', 'consultoría'],
  },
  {
    slug: 'apodaca',
    nombre: 'Apodaca',
    extendido: 'Apodaca, Nuevo León',
    contexto: 'Apodaca es el corazón de la actividad manufacturera y logística del área metropolitana de Monterrey. Alberga el Aeropuerto Internacional Mariano Escobedo y los principales parques industriales del norte.',
    industriasFuertes: ['manufactura', 'logística', 'automotriz', 'metalmecánica'],
  },
  {
    slug: 'santa-catarina',
    nombre: 'Santa Catarina',
    extendido: 'Santa Catarina, Nuevo León',
    contexto: 'Santa Catarina concentra parques industriales importantes con presencia fuerte de manufactura automotriz, cemento, vidrio y plásticos.',
    industriasFuertes: ['manufactura', 'automotriz', 'materiales', 'químico'],
  },
  {
    slug: 'guadalupe',
    nombre: 'Guadalupe',
    extendido: 'Guadalupe, Nuevo León',
    contexto: 'Guadalupe es la segunda ciudad más poblada del estado, con perfil mixto entre industria ligera, comercio y servicios.',
    industriasFuertes: ['comercio', 'servicios', 'manufactura ligera', 'distribución'],
  },
  {
    slug: 'san-nicolas-de-los-garza',
    nombre: 'San Nicolás de los Garza',
    extendido: 'San Nicolás de los Garza, Nuevo León',
    contexto: 'San Nicolás alberga importantes centros educativos (UANL, ITESM Eugenio Garza Sada), una base manufacturera consolidada y empresas de servicios.',
    industriasFuertes: ['manufactura', 'educación', 'servicios profesionales', 'tecnología'],
  },
]

/* ===========================================================
   Helpers
   =========================================================== */
const money = n => '$' + Number(n).toLocaleString('es-MX')
const intersect = (a, b) => a.filter(x => b.includes(x))

function shellCss() {
  return `*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#FAF8F6;color:#1B2A38;line-height:1.7}
a{color:#1B3A5C}
.wrap{max-width:880px;margin:0 auto;padding:48px 24px}
.hero{background:#1B3A5C;color:#fff;padding:56px 24px}
.hero .in{max-width:880px;margin:0 auto}
.tag{display:inline-block;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#E8B4A0;margin-bottom:14px}
h1{font-size:32px;font-weight:800;line-height:1.2}
.hero p{font-size:17px;color:rgba(255,255,255,.85);margin-top:14px;max-width:680px}
h2{font-size:22px;font-weight:700;color:#1B3A5C;margin:34px 0 12px}
h3{font-size:16px;font-weight:700;color:#1B2A38;margin:20px 0 6px}
p{margin-bottom:14px}
ul{margin:0 0 14px 22px}
li{margin-bottom:6px}
.btn{display:inline-flex;align-items:center;gap:8px;background:#1B3A5C;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 26px;border-radius:12px;margin-top:8px}
.btn:hover{background:#0F2540}
.card{background:#fff;border:1px solid #ECE7DF;border-radius:16px;padding:24px;box-shadow:0 1px 2px rgba(27,42,56,.04);margin-bottom:14px}
.muted{color:#5C6B78}
.row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #ECE7DF}
.row:last-child{border-bottom:none}
.row strong{color:#1B2A38;font-variant-numeric:tabular-nums}
.chip{display:inline-block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#1B3A5C;background:#E7EDF3;padding:4px 10px;border-radius:999px;margin-right:6px}
.faq summary{cursor:pointer;font-weight:600;color:#1B3A5C;padding:14px 0;border-bottom:1px solid #ECE7DF;list-style:none}
.faq summary::-webkit-details-marker{display:none}
.faq[open] p{padding:10px 0 16px;color:#5C6B78}
.cross{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px}
.cross a{display:block;background:#fff;border:1px solid #ECE7DF;border-radius:12px;padding:14px 16px;text-decoration:none;color:#1B2A38;font-size:14px}
.cross a:hover{border-color:#1B3A5C;background:#FAFAF8}`
}

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
    <a href="/calculadoras/" style="color:#B8D3D8;text-decoration:none;margin:0 8px">Calculadoras</a> ·
    <a href="/reclutamiento/" style="color:#B8D3D8;text-decoration:none;margin:0 8px">Búsquedas por puesto</a> ·
    <a href="/insights/" style="color:#B8D3D8;text-decoration:none;margin:0 8px">Insights</a> ·
    <a href="/vacantes/" style="color:#B8D3D8;text-decoration:none;margin:0 8px">Vacantes</a>
  </div>
  © ${new Date().getFullYear()} Estratego Talent · Reclutamiento y selección de personal en Monterrey, Nuevo León.
</footer>`

/* ===========================================================
   Render: landing puesto × ciudad
   =========================================================== */
function renderLanding(puesto, ciudad) {
  const url = `${SITE}/reclutamiento/${puesto.slug}-en-${ciudad.slug}.html`
  const h1 = `Reclutamiento de ${puesto.nombre} en ${ciudad.nombre}`
  const titulo = `${h1} | Estratego Talent`
  const descripcion = `Buscamos y seleccionamos ${puesto.nombre} para empresas en ${ciudad.extendido}. Sueldo de mercado, perfil ideal y proceso de evaluación serio. Tiempo de cierre 30 días.`

  const industriasComunes = intersect(puesto.industrias.map(s => s.toLowerCase()), ciudad.industriasFuertes.map(s => s.toLowerCase()))
  const industriaFraseList = industriasComunes.length
    ? industriasComunes
    : ciudad.industriasFuertes

  const otrasCiudades = CIUDADES.filter(c => c.slug !== ciudad.slug).slice(0, 5)
  const otrosPuestos = PUESTOS.filter(p => p.slug !== puesto.slug && p.area === puesto.area).slice(0, 3)
  const otrosPuestosFallback = otrosPuestos.length ? otrosPuestos : PUESTOS.filter(p => p.slug !== puesto.slug).slice(0, 3)

  const faqs = [
    {
      q: `¿Cuánto gana un ${puesto.nombre.toLowerCase()} en ${ciudad.nombre}?`,
      a: `En ${ciudad.nombre} y la zona metropolitana de Monterrey, un ${puesto.nombre.toLowerCase()} percibe en promedio entre ${money(puesto.sueldo.min)} y ${money(puesto.sueldo.max)} MXN mensuales en nivel intermedio. Perfiles senior pueden alcanzar ${money(puesto.sueldo.senior)} o más, según industria y responsabilidades.`,
    },
    {
      q: `¿Cuánto tarda Estratego en cubrir una vacante de ${puesto.nombre.toLowerCase()}?`,
      a: 'Nuestro tiempo de cierre promedio es de 30 días desde el levantamiento del perfil hasta la presentación de candidatos finalistas. Para posiciones directivas o muy especializadas puede extenderse a 45-60 días.',
    },
    {
      q: `¿Atienden empresas en ${ciudad.extendido}?`,
      a: `Sí. Trabajamos toda la zona metropolitana de Monterrey, incluyendo ${ciudad.extendido}. Aplicamos el mismo proceso de evaluación (entrevistas por competencias, psicometría, estudio socioeconómico) sin importar la ubicación específica.`,
    },
    {
      q: '¿Ofrecen garantía de reposición?',
      a: 'Sí. Cada búsqueda incluye garantía de reposición sin costo adicional si el candidato seleccionado no concluye su periodo de prueba.',
    },
  ]

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: `Reclutamiento de ${puesto.nombre} en ${ciudad.nombre}`,
      description: descripcion,
      provider: { '@type': 'Organization', name: 'Estratego Talent', url: SITE },
      areaServed: { '@type': 'City', name: ciudad.extendido },
      serviceType: `Reclutamiento de ${puesto.nombre}`,
      url,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE },
        { '@type': 'ListItem', position: 2, name: 'Reclutamiento', item: `${SITE}/reclutamiento/` },
        { '@type': 'ListItem', position: 3, name: h1, item: url },
      ],
    },
  ]

  const body = `
<header class="hero"><div class="in">
  <span class="tag">Reclutamiento especializado · ${esc(ciudad.nombre)}</span>
  <h1>${esc(h1)}</h1>
  <p>Encontramos al ${esc(puesto.nombre.toLowerCase())} que tu empresa necesita en ${esc(ciudad.extendido)}, con un proceso de evaluación que va más allá del CV.</p>
</div></header>

<div class="wrap">

  <p>${esc(ciudad.contexto)}</p>

  <h2>Sueldo de ${puesto.nombre} en ${ciudad.nombre} (2026)</h2>
  <div class="card" style="padding:0;overflow:hidden">
    <table style="width:100%;border-collapse:collapse">
      <thead><tr style="background:#F4F1EC"><th style="text-align:left;padding:14px 18px;font-size:13px;color:#5C6B78">Nivel</th><th style="text-align:right;padding:14px 18px;font-size:13px;color:#5C6B78">Sueldo bruto mensual (MXN)</th></tr></thead>
      <tbody>
        <tr style="border-top:1px solid #ECE7DF"><td style="padding:14px 18px">Nivel inicial</td><td style="padding:14px 18px;text-align:right;font-weight:600">${esc(money(Math.round(puesto.sueldo.min * 0.7)))} – ${esc(money(puesto.sueldo.min))}</td></tr>
        <tr style="border-top:1px solid #ECE7DF"><td style="padding:14px 18px">Nivel intermedio</td><td style="padding:14px 18px;text-align:right;font-weight:600">${esc(money(puesto.sueldo.min))} – ${esc(money(puesto.sueldo.max))}</td></tr>
        <tr style="border-top:1px solid #ECE7DF"><td style="padding:14px 18px">Nivel senior</td><td style="padding:14px 18px;text-align:right;font-weight:600">${esc(money(puesto.sueldo.max))} – ${esc(money(puesto.sueldo.senior))}</td></tr>
      </tbody>
    </table>
  </div>
  <p class="muted" style="font-size:13px">Rangos referenciales del mercado. Variaciones por industria, tamaño de empresa y nivel de responsabilidad. Consulta la <a href="${esc(puesto.sueldoGuia)}">guía completa de sueldos de ${esc(puesto.nombre)}</a>.</p>

  <h2>Perfil ideal de ${puesto.nombre} en ${ciudad.nombre}</h2>
  <p>${esc(puesto.perfil)}</p>
  <p>En ${esc(ciudad.nombre)}, las industrias con mayor demanda de este perfil son ${esc(industriaFraseList.join(', '))}. Esto influye en la disponibilidad del talento y los rangos de compensación que el mercado considera competitivos.</p>

  <h3>Competencias clave que evaluamos</h3>
  <ul>
    ${puesto.competencias.map(c => `<li>${esc(c)}</li>`).join('\n    ')}
  </ul>

  <h2>Nuestro proceso para esta búsqueda</h2>
  <ol style="margin:0 0 14px 22px">
    <li><strong>Levantamiento del perfil</strong> — sesión con el área contratante para definir el perfil real, no el de papel.</li>
    <li><strong>Búsqueda activa y filtrado</strong> — combinamos nuestra base de más de 5,000 candidatos con búsqueda directa en ${esc(ciudad.nombre)}.</li>
    <li><strong>Entrevista por competencias</strong> — evaluación estructurada del fit técnico y conductual.</li>
    <li><strong>Pruebas psicométricas</strong> — Cleaver, aptitud cognitiva y valores. Resultados interpretados por especialista.</li>
    <li><strong>Estudio socioeconómico</strong> — verificación de datos, referencias y entorno.</li>
    <li><strong>Presentación de finalistas</strong> — terna ya validada con reporte completo de cada candidato.</li>
    <li><strong>Acompañamiento en oferta y cierre</strong> — manejo de contraoferta y onboarding inicial.</li>
  </ol>

  <h2>Garantía y compromiso</h2>
  <p>Si el candidato seleccionado no concluye su periodo de prueba, lo reemplazamos sin costo adicional. Estamos comprometidos con tu contratación, no solo con cerrarla.</p>

  <div class="card" style="background:#F4F1EC;border:none;margin:30px 0">
    <h3 style="margin:0 0 6px">¿Listo para buscar tu próximo ${esc(puesto.nombre.toLowerCase())}?</h3>
    <p style="margin:0 0 12px;color:#5C6B78">Solicita una propuesta sin costo. Te respondemos en menos de 24 horas con tiempos, costo y siguiente paso.</p>
    <a href="https://portal.estratego.com.mx/contacto-empresas" class="btn">Solicitar propuesta</a>
  </div>

  <h2>Preguntas frecuentes</h2>
  ${faqs.map(f => `<details class="faq" style="margin-bottom:8px"><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('\n  ')}

  ${otrosPuestosFallback.length ? `<h2>Otras búsquedas en ${esc(ciudad.nombre)}</h2>
  <div class="cross">
    ${otrosPuestosFallback.map(p => `<a href="/reclutamiento/${esc(p.slug)}-en-${esc(ciudad.slug)}.html"><strong>${esc(p.nombre)}</strong><div class="muted" style="font-size:12px;margin-top:2px">${esc(ciudad.nombre)}</div></a>`).join('\n    ')}
  </div>` : ''}

  <h2>${esc(puesto.nombre)} en otras ciudades de Nuevo León</h2>
  <div class="cross">
    ${otrasCiudades.map(c => `<a href="/reclutamiento/${esc(puesto.slug)}-en-${esc(c.slug)}.html"><strong>${esc(puesto.nombre)}</strong><div class="muted" style="font-size:12px;margin-top:2px">${esc(c.nombre)}</div></a>`).join('\n    ')}
  </div>

</div>`

  return `<!DOCTYPE html><html lang="es"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(descripcion)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website"><meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(descripcion)}"><meta property="og:url" content="${url}">
<meta property="og:locale" content="es_MX">
<meta name="twitter:card" content="summary">
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cpolygon points='50,4 93,27 93,73 50,96 7,73 7,27' fill='%23E8B4A0'/%3E%3Crect x='24' y='24' width='52' height='52' fill='%237BA7B0' rx='3'/%3E%3Ccircle cx='50' cy='50' r='16' fill='%231B3A5C'/%3E%3C/svg%3E">
${jsonLd.map(b => `<script type="application/ld+json">${JSON.stringify(b)}</script>`).join('\n')}
<style>${shellCss()}</style>
</head><body>
${NAV}
${body}
${FOOT}
</body></html>`
}

/* ===========================================================
   Render: hub /reclutamiento/index.html
   =========================================================== */
function renderHub() {
  const titulo = 'Reclutamiento por puesto y ciudad en Nuevo León | Estratego Talent'
  const descripcion = 'Búsqueda de talento por puesto y ciudad en el área metropolitana de Monterrey: gerentes, directores, contralores, ingenieros, desarrolladores y más.'

  const url = `${SITE}/reclutamiento/`
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Reclutamiento por puesto y ciudad',
      url,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE },
        { '@type': 'ListItem', position: 2, name: 'Reclutamiento por puesto', item: url },
      ],
    },
  ]

  const body = `
<header class="hero"><div class="in">
  <span class="tag">Búsquedas especializadas</span>
  <h1>Reclutamiento por puesto y ciudad</h1>
  <p>Encuentra el servicio de búsqueda exacto que tu empresa necesita: filtrado por puesto y por ciudad del área metropolitana de Monterrey.</p>
</div></header>

<div class="wrap">

  ${PUESTOS.map(p => `
  <h2 style="margin-top:34px">${esc(p.nombre)}</h2>
  <p class="muted" style="font-size:14px;margin-bottom:8px">${esc(p.perfil)}</p>
  <div class="cross">
    ${CIUDADES.map(c => `<a href="/reclutamiento/${esc(p.slug)}-en-${esc(c.slug)}.html"><strong>${esc(p.nombre)}</strong><div class="muted" style="font-size:12px;margin-top:2px">en ${esc(c.nombre)}</div></a>`).join('\n    ')}
  </div>`).join('\n')}

  <div class="card" style="background:#F4F1EC;border:none;margin-top:30px">
    <h3 style="margin:0 0 6px">¿No encuentras el puesto que buscas?</h3>
    <p style="margin:0 0 12px;color:#5C6B78">Buscamos cualquier perfil especializado, gerencial o directivo en Nuevo León. Cuéntanos el puesto y te respondemos en menos de 24 horas.</p>
    <a href="https://portal.estratego.com.mx/contacto-empresas" class="btn">Solicitar propuesta</a>
  </div>

</div>`

  return `<!DOCTYPE html><html lang="es"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(descripcion)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website"><meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(descripcion)}"><meta property="og:url" content="${url}">
<meta property="og:locale" content="es_MX">
<meta name="twitter:card" content="summary">
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cpolygon points='50,4 93,27 93,73 50,96 7,73 7,27' fill='%23E8B4A0'/%3E%3Crect x='24' y='24' width='52' height='52' fill='%237BA7B0' rx='3'/%3E%3Ccircle cx='50' cy='50' r='16' fill='%231B3A5C'/%3E%3C/svg%3E">
${jsonLd.map(b => `<script type="application/ld+json">${JSON.stringify(b)}</script>`).join('\n')}
<style>${shellCss()}</style>
</head><body>
${NAV}
${body}
${FOOT}
</body></html>`
}

/* ===========================================================
   Sitemap merge
   =========================================================== */
async function updateSitemap(urls) {
  const path = join(ROOT, 'sitemap.xml')
  let xml
  try { xml = await readFile(path, 'utf8') } catch { return }
  // Quita entradas previas de /reclutamiento/* (excepto reclutamiento-y-seleccion-monterrey.html)
  xml = xml.replace(/\s*<url><loc>https:\/\/estratego\.com\.mx\/reclutamiento\/[^<]+<\/loc>[^<]*(<[^>]+>[^<]*)*<\/url>/g, '')
  const block = urls.map(u => `  <url><loc>${u}</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>`).join('\n')
  xml = xml.replace('</urlset>', `${block}\n</urlset>`)
  await writeFile(path, xml, 'utf8')
}

/* ===========================================================
   Main
   =========================================================== */
async function main() {
  await mkdir(OUT, { recursive: true })
  const urls = []

  // Hub
  await writeFile(join(OUT, 'index.html'), renderHub(), 'utf8')
  urls.push(`${SITE}/reclutamiento/`)

  // Combinaciones puesto × ciudad
  let n = 0
  for (const p of PUESTOS) {
    for (const c of CIUDADES) {
      const fname = `${p.slug}-en-${c.slug}.html`
      await writeFile(join(OUT, fname), renderLanding(p, c), 'utf8')
      urls.push(`${SITE}/reclutamiento/${fname}`)
      n++
    }
  }

  await updateSitemap(urls)
  console.log(`[puesto-ciudad] Generadas ${n} landings + 1 hub. Sitemap actualizado con ${urls.length} URLs.`)
}

main().catch(err => { console.error('[puesto-ciudad] Falló la generación:', err); process.exit(1) })
