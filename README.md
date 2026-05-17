# Estratego Talent — Sitio Web

## Producción
- **URL:** estratego.com.mx
- **Deploy:** Netlify (auto-deploy al hacer push a `main`)
- **Repo:** `C:\Users\aleja\estratego-talent`

## Estructura del proyecto
Un solo archivo: `index.html` — todo el CSS y JS está inline.

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
2. Pedir cambios — Claude edita `index.html` directamente
3. Claude hace `git commit + git push origin main` automáticamente tras cada cambio
4. Netlify despliega en ~30 segundos a estratego.com.mx

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
