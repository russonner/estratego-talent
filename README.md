# Estratego Talent — Sitio público / SEO

> 📌 **Memoria viva completa del proyecto (ambos repos):** ver el README de
> **estratego-app** (`C:\Users\aleja\estratego-app\README.md`). Ahí está todo el
> contexto del portal admin/cliente, base de datos, features de IA, design system,
> decisiones de la conversación y pendientes. Este README cubre solo el sitio público.

## Producción
- **URL:** estratego.com.mx
- **Deploy:** **Vercel** (migrado de Netlify; auto-deploy al hacer push a `main`)
- **Repo:** `C:\Users\aleja\estratego-talent` · GitHub `russonner/estratego-talent`
- **Supabase:** proyecto `qszeiosdlgaloncuqcpu` (compartido con el portal)

## Estructura del proyecto
- `index.html` — landing principal (CSS y JS inline)
- `scripts/build-vacantes.mjs` — **motor SEO** (Node): genera landings de servicios/locales,
  hub + guías de sueldos, bolsa de empleo y sitemap. Ver sección "Motor SEO".
- `vercel.json` — `{ buildCommand: "npm run build", outputDirectory: ".", framework: null }`
- Salidas generadas: `sueldos/*.html`, `vacantes/*.html`, `*.html` de landings, `sitemap.xml`

## Motor SEO (`scripts/build-vacantes.mjs`)
Se ejecuta en el build de Vercel (`npm run build`). Lee de Supabase con `SUPABASE_URL` /
`SUPABASE_ANON_KEY`:
- **Guías de sueldos** ← tabla `sueldos_mercado` (filas `publicado = true`). Si no hay creds o la
  tabla está vacía, usa `SUELDOS_FALLBACK` (array estático). Genera FAQPage + BreadcrumbList JSON-LD.
- **Bolsa de empleo** ← tabla `vacantes` (`publica = true`, `status = activa`). Genera **JobPosting**
  schema para Google Jobs.
- **Landings** de servicios + locales (reclutamiento, headhunting, psicometría, estudios — Monterrey).
- **Sitemap unificado** + `index.html` con Organization + LocalBusiness JSON-LD.

> ⚠️ Editar un benchmark en el portal (`/admin/sueldos`) actualiza la base, pero la guía estática se
> regenera solo al re-ejecutar el build. **Pendiente:** Deploy Hook en Vercel + webhook de Supabase
> para rebuild automático.

**Objetivo:** que estratego.com.mx sea la página más visitada de forma orgánica en reclutamiento y
selección de personal en Monterrey.

## Secciones de index.html

| Sección        | ID             | Líneas aprox. |
|----------------|----------------|---------------|
| Nav            | —              | 157–174       |
| Hero           | `#hero`        | 177–202       |
| Metodología    | `#metodologia` | 205–216       |
| Servicios      | `#servicios`   | 219–231       |
| Nosotros       | `#nosotros`    | 234–255       |
| Internacional  | —              | 258–297       |
| Contacto       | `#contacto`    | 300–323       |
| Footer         | —              | 326–341       |

## Paleta de colores (CSS variables)
| Variable  | Valor     | Uso                        |
|-----------|-----------|----------------------------|
| `--sal`   | `#E8B4A0` | Salmón — acentos primarios |
| `--tl`    | `#7BA7B0` | Teal — acentos secundarios |
| `--nv`    | `#1B3A5C` | Navy — fondos oscuros      |
| `--nv-dd` | `#091929` | Navy profundo — nav/footer |
| `--off`   | `#FAF8F6` | Off-white — fondos claros  |

## Flujo de trabajo con Claude Code
1. Abrir sesión en Claude Code con el proyecto `C:\Users\aleja\estratego-talent`
2. Pedir cambios — Claude edita `index.html` o `scripts/build-vacantes.mjs`
3. Claude hace `git commit + git push origin main` automáticamente tras cada cambio
4. Vercel despliega en ~30 segundos a estratego.com.mx (corre `npm run build`)

**No se necesita confirmación para el push** — cada cambio aprobado va directo a producción.

## Dev servers (preview local)
Configurados en `.claude/launch.json`:
- `npx serve` → http://localhost:3000
- `npx http-server` → http://localhost:8080

## Contacto configurado
- Email: alejandro@estratego.com.mx
- WhatsApp: https://wa.link/estratego

## Historial de sesiones
### Sesión 1 — 2026-05-17
- Se migró la edición del sitio del artefacto a Claude Code
- Se detectaron y configuraron dev servers en `.claude/launch.json`
- Se conectó el flujo Git → Netlify → producción
- Se estableció workflow de commit/push automático tras cada cambio
- Se creó `CLAUDE.md` con 30 agentes de comportamiento del proyecto
- **Revisión general + 12 fixes aplicados:**
  - Fix 1: Formulario con Netlify Forms (reemplaza mailto:)
  - Fix 2: SEO — meta description, canonical, Open Graph, Twitter Card
  - Fix 3: Menú hamburguesa para móvil
  - Fix 4: Stat del hero corregido (C-Suite)
  - Fix 5: Labels de accesibilidad en formulario
  - Fix 6: Favicon SVG con el logo
  - Fix 7: Sección "Casos representativos" por industria (6 casos anónimos)
  - Fix 8: "Casos" e "Insights" en nav y footer
  - Fix 9: CTA de WhatsApp en hero y sección de contacto
  - Fix 10: Schema.org ProfessionalService con JSON-LD
  - Fix 11: Google Analytics GA4 — Measurement ID `G-JCYEFGW93V` activo en producción
  - Fix 12: Sección "Insights" con 3 artículos de mercado de talento
- **GA4 completamente configurado:** cuenta "Estratego Talent", propiedad "estratego.com.mx", stream web activo

### Sesión 2 — 2026-05-17
- **Fix: Netlify Forms** — se agregó `data-netlify="true"`, `netlify-honeypot="bot-field"` y campo honeypot oculto para que el formulario sea detectado correctamente por Netlify
- **Fix: Links de WhatsApp** — reemplazados todos los `wa.link/estratego` por `wa.me/5218183663346` con mensaje pre-llenado
- **Nuevo: `/gracias`** — página de confirmación post-envío de formulario (`gracias.html`) con checkmark, CTA de WhatsApp y meta noindex
- **Nuevo: GA4 eventos** — `form_submit`, `whatsapp_click`, `scroll_contacto` + evento `conversion` en `/gracias`
- **Nuevo: `sitemap.xml`** — incluye index y `/gracias` con prioridades correctas
- **Nuevo: `robots.txt`** — permite todo el sitio, bloquea `/gracias` de indexación, apunta al sitemap
- **Nuevo: Animaciones scroll** — `.reveal` / `.visible` con IntersectionObserver en tarjetas de servicios, casos e insights
- **Netlify email notification** — configurada notificación a alejandro@estratego.com.mx para cada envío del formulario "contacto"

### Sesión 3 — 2026-05-20
- **Migración Netlify → Vercel** del sitio público (Netlify cobró demasiado rápido). DNS en Akky con nameservers actualizados; MX/SPF de Google Workspace pre-cargados en Vercel DNS para no perder correo.
- **Motor SEO** (`scripts/build-vacantes.mjs`): landings de servicios/locales, hub + guías de sueldos, bolsa de empleo con JobPosting schema, sitemap unificado.
- **Guías de sueldos en vivo desde Supabase** — el build ahora lee la tabla `sueldos_mercado` (gestionada desde el portal `/admin/sueldos`); fallback al array estático si no hay datos.
- **README actualizado** + puntero al README "memoria viva" en estratego-app.
