/**
 * Static job-board generator for estratego.com.mx
 *
 * Runs at Netlify build time. Fetches published vacancies from Supabase
 * and writes:
 *   /vacantes/index.html              → job listing (SEO)
 *   /vacantes/<slug>.html             → one page per vacancy with JobPosting JSON-LD (Google Jobs)
 *   /sitemap.xml                      → regenerated to include all job pages
 *
 * Env vars (Netlify): SUPABASE_URL, SUPABASE_ANON_KEY
 * If env vars are missing, it still generates an empty board so the build never fails.
 */
import { createClient } from '@supabase/supabase-js'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SITE = 'https://estratego.com.mx'
const ORG  = 'Estratego Talent'
const LOGO = `${SITE}/logo.png`

const EMPLOYMENT = {
  tiempo_completo: 'FULL_TIME',
  medio_tiempo:    'PART_TIME',
  temporal:        'TEMPORARY',
  practicas:       'INTERN',
  por_proyecto:    'CONTRACTOR',
}
const MODALIDAD = { presencial: 'Presencial', hibrido: 'Híbrido', remoto: 'Remoto' }

/* ---------- data ---------- */
async function fetchVacantes() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_ANON_KEY
  if (!url || !key) {
    console.warn('⚠ SUPABASE_URL / SUPABASE_ANON_KEY no configuradas — generando bolsa vacía.')
    return []
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } })
  const { data, error } = await supabase
    .from('vacantes')
    .select('*, clientes(company_name)')
    .eq('publica', true)
    .eq('status', 'activa')
    .order('publicada_at', { ascending: false })
  if (error) { console.error('Error Supabase:', error.message); return [] }
  return data ?? []
}

/* ---------- helpers ---------- */
const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
const fmtMoney = n => n ? `$${Number(n).toLocaleString('es-MX')}` : null
function parseLocation(loc) {
  // "Monterrey, NL" → { city, region }
  const [city, region] = (loc || 'Monterrey, NL').split(',').map(s => s.trim())
  return { city: city || 'Monterrey', region: region || 'NL' }
}
function slugFor(v) {
  return v.slug || (v.title || 'vacante').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + String(v.id).slice(0, 6)
}

/* ---------- JobPosting JSON-LD ---------- */
function jobPostingLD(v) {
  const { city, region } = parseLocation(v.location)
  const datePosted = (v.publicada_at || v.created_at || new Date().toISOString()).slice(0, 10)
  const validThrough = v.expira_at
    ? v.expira_at.slice(0, 10)
    : new Date(Date.now() + 60 * 864e5).toISOString().slice(0, 10)
  const hiring = v.mostrar_empresa && v.clientes?.company_name ? v.clientes.company_name : ORG
  const desc = v.descripcion_publica || v.ideal_profile || `Posición de ${v.title} en ${city}, ${region}.`

  const ld = {
    '@context': 'https://schema.org/',
    '@type': 'JobPosting',
    title: v.title,
    description: `<p>${esc(desc).replace(/\n/g, '</p><p>')}</p>`,
    datePosted,
    validThrough,
    employmentType: EMPLOYMENT[v.tipo_contrato] || 'FULL_TIME',
    hiringOrganization: { '@type': 'Organization', name: hiring, sameAs: SITE, logo: LOGO },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: city,
        addressRegion: region,
        addressCountry: 'MX',
      },
    },
    directApply: true,
  }
  if (v.modalidad === 'remoto') ld.jobLocationType = 'TELECOMMUTE'
  if (v.mostrar_salario && v.salary_min) {
    ld.baseSalary = {
      '@type': 'MonetaryAmount',
      currency: 'MXN',
      value: {
        '@type': 'QuantitativeValue',
        minValue: Number(v.salary_min),
        maxValue: Number(v.salary_max || v.salary_min),
        unitText: 'MONTH',
      },
    }
  }
  return ld
}

/* ---------- shared shell ---------- */
const NAV = `
<nav style="display:flex;align-items:center;justify-content:space-between;padding:12px 36px;background:#091929;position:sticky;top:0;z-index:100">
  <a href="/" style="display:flex;align-items:center;gap:12px;text-decoration:none">
    <svg width="26" height="26" viewBox="0 0 100 100"><polygon points="50,4 93,27 93,73 50,96 7,73 7,27" fill="#E8B4A0"/><rect x="24" y="24" width="52" height="52" fill="#7BA7B0" rx="3"/><circle cx="50" cy="50" r="16" fill="#1B3A5C"/></svg>
    <span style="font-size:13px;font-weight:600;letter-spacing:.18em;color:#fff;text-transform:uppercase">Estratego Talent</span>
  </a>
  <a href="/vacantes/" style="font-size:12px;color:#B8D3D8;text-decoration:none">Vacantes</a>
</nav>`

const FOOT = `
<footer style="background:#091929;color:rgba(255,255,255,.6);padding:32px 36px;text-align:center;font-size:13px">
  © ${new Date().getFullYear()} Estratego Talent · Reclutamiento y selección en Monterrey ·
  <a href="/" style="color:#E8B4A0;text-decoration:none">Inicio</a>
</footer>`

function page({ title, description, canonical, body, jsonLd }) {
  return `<!DOCTYPE html><html lang="es"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="website"><meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${canonical}">
<meta property="og:locale" content="es_MX">
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cpolygon points='50,4 93,27 93,73 50,96 7,73 7,27' fill='%23E8B4A0'/%3E%3Crect x='24' y='24' width='52' height='52' fill='%237BA7B0' rx='3'/%3E%3Ccircle cx='50' cy='50' r='16' fill='%231B3A5C'/%3E%3C/svg%3E">
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : ''}
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#FAF8F6;color:#1B2A38;line-height:1.6}
a{color:#1B3A5C}
.wrap{max-width:880px;margin:0 auto;padding:40px 24px}
.card{background:#fff;border:1px solid #ECE7DF;border-radius:16px;padding:24px;box-shadow:0 1px 2px rgba(27,42,56,.04)}
.pill{display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:999px;font-size:13px;font-weight:500;background:#E7EDF3;color:#1B3A5C}
.btn{display:inline-flex;align-items:center;gap:8px;background:#1B3A5C;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:12px}
.btn:hover{background:#0F2540}
h1{font-size:30px;font-weight:800;color:#1B3A5C;line-height:1.2}
h2{font-size:20px;font-weight:700;color:#1B3A5C;margin:24px 0 10px}
.muted{color:#5C6B78}
</style></head><body>
${NAV}
<div class="wrap">${body}</div>
${FOOT}
</body></html>`
}

/* ---------- listing page ---------- */
function listingPage(vacantes) {
  const items = vacantes.length === 0
    ? `<div class="card"><p class="muted">Por el momento no hay vacantes publicadas. Vuelve pronto o <a href="/postulacion">únete a nuestra bolsa de talento</a>.</p></div>`
    : vacantes.map(v => {
        const { city, region } = parseLocation(v.location)
        const salary = v.mostrar_salario && fmtMoney(v.salary_min)
          ? `${fmtMoney(v.salary_min)}${v.salary_max ? '–' + fmtMoney(v.salary_max) : ''} MXN/mes`
          : 'Sueldo competitivo'
        return `<a href="/vacantes/${slugFor(v)}.html" class="card" style="display:block;text-decoration:none;margin-bottom:14px">
          <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap">
            <div>
              <h2 style="margin:0 0 6px;font-size:18px">${esc(v.title)}</h2>
              <div class="muted" style="font-size:14px">${esc(city)}, ${esc(region)}${v.area_publica ? ' · ' + esc(v.area_publica) : ''}</div>
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
              ${v.modalidad ? `<span class="pill">${MODALIDAD[v.modalidad]}</span>` : ''}
              <span class="muted" style="font-size:13px">${salary}</span>
            </div>
          </div>
        </a>`
      }).join('')

  return page({
    title: 'Vacantes en Monterrey | Bolsa de empleo — Estratego Talent',
    description: 'Vacantes activas de reclutamiento y selección en Monterrey y NL: posiciones gerenciales, directivas y especializadas. Postúlate con Estratego Talent.',
    canonical: `${SITE}/vacantes/`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Vacantes — Estratego Talent',
      url: `${SITE}/vacantes/`,
    },
    body: `
      <p class="muted" style="font-size:14px;margin-bottom:6px">Bolsa de empleo</p>
      <h1>Vacantes en Monterrey</h1>
      <p class="muted" style="margin:10px 0 28px">${vacantes.length} ${vacantes.length === 1 ? 'posición activa' : 'posiciones activas'} en reclutamiento especializado, gerencial y directivo.</p>
      ${items}
    `,
  })
}

/* ---------- detail page ---------- */
function detailPage(v) {
  const { city, region } = parseLocation(v.location)
  const slug = slugFor(v)
  const salary = v.mostrar_salario && fmtMoney(v.salary_min)
    ? `${fmtMoney(v.salary_min)}${v.salary_max ? '–' + fmtMoney(v.salary_max) : ''} MXN / mes`
    : 'Sueldo competitivo según experiencia'
  const desc = (v.descripcion_publica || v.ideal_profile || '')
    .split('\n').filter(Boolean).map(p => `<p style="margin-bottom:10px">${esc(p)}</p>`).join('')
  const empresa = v.mostrar_empresa && v.clientes?.company_name ? v.clientes.company_name : 'Empresa confidencial (cliente de Estratego Talent)'

  return page({
    title: `${v.title} en ${city} | Vacante — Estratego Talent`,
    description: `Vacante de ${v.title} en ${city}, ${region}. ${(v.descripcion_publica || v.ideal_profile || '').slice(0, 120)}`.trim(),
    canonical: `${SITE}/vacantes/${slug}.html`,
    jsonLd: jobPostingLD(v),
    body: `
      <a href="/vacantes/" class="muted" style="font-size:13px;text-decoration:none">← Todas las vacantes</a>
      <h1 style="margin-top:14px">${esc(v.title)}</h1>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 24px">
        <span class="pill">📍 ${esc(city)}, ${esc(region)}</span>
        ${v.modalidad ? `<span class="pill">${MODALIDAD[v.modalidad]}</span>` : ''}
        ${v.tipo_contrato ? `<span class="pill">${esc(v.tipo_contrato.replace(/_/g,' '))}</span>` : ''}
        <span class="pill">${salary}</span>
      </div>
      <div class="card">
        ${desc || '<p class="muted">Descripción disponible al postularte.</p>'}
        <h2>Empresa</h2>
        <p class="muted">${esc(empresa)}</p>
        <div style="margin-top:24px">
          <a class="btn" href="https://portal.estratego.com.mx/postulacion?vacante=${encodeURIComponent(slug)}">Postularme a esta vacante →</a>
        </div>
      </div>
      <p class="muted" style="font-size:13px;margin-top:20px">Publicada por Estratego Talent · Reclutamiento y selección de personal en Monterrey.</p>
    `,
  })
}

/* ---------- sitemap ---------- */
function sitemap(vacantes) {
  const urls = [
    { loc: `${SITE}/`, pri: '1.0' },
    { loc: `${SITE}/vacantes/`, pri: '0.9' },
    ...vacantes.map(v => ({ loc: `${SITE}/vacantes/${slugFor(v)}.html`, pri: '0.8' })),
  ]
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u.loc}</loc><changefreq>daily</changefreq><priority>${u.pri}</priority></url>`).join('\n')}
</urlset>`
}

/* ---------- main ---------- */
async function main() {
  const vacantes = await fetchVacantes()
  await mkdir(join(ROOT, 'vacantes'), { recursive: true })

  await writeFile(join(ROOT, 'vacantes', 'index.html'), listingPage(vacantes))
  for (const v of vacantes) {
    await writeFile(join(ROOT, 'vacantes', `${slugFor(v)}.html`), detailPage(v))
  }
  await writeFile(join(ROOT, 'sitemap.xml'), sitemap(vacantes))

  console.log(`✓ Bolsa de empleo generada: ${vacantes.length} vacante(s) + listado + sitemap`)
}

main().catch(e => { console.error(e); process.exit(0) }) // never fail the build
