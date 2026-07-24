# Auditoría en vivo — https://consultoria.felipepena.co/

> **Fecha:** 24 de julio de 2026 · **Alcance:** sitio EN PRODUCCIÓN (Vercel) cruzado con el código fuente (`castellanosfelipe/felipe-pena-landing`, Astro 7).
> **Complementa** (no reemplaza) `reports/QA-REPORT.md` y `reports/LIGHTHOUSE.md` (15 jul 2026, pre‑lanzamiento). Solo diagnóstico y snippets; **ningún cambio de código aplicado.**
> **Evidencia visual** en `reports/audit-live/*.jpg` (9 anchos + estados + `/en/` + `/privacidad/`).

---

## 1) Resumen ejecutivo

El QA‑REPORT dictaminó **⛔ NO LISTO PARA PRODUCCIÓN** por bloqueadores externos (deploy, dominio, conversión, analítica). Verificado hoy en vivo:

**✅ Resuelto en producción:**
- **Deploy + dominio + HTTPS:** `consultoria.felipepena.co` sirve HTTP/2 200 desde **Vercel** (no Netlify). `http→https` 308, HSTS activo, canonical/hreflang/OG correctos.
- **Cabeceras de seguridad:** CSP completa, `nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`, `Permissions-Policy` — todas aplicadas desde `vercel.json`.
- **Formulario (conversión):** ⚠️→✅ **Migró de Netlify Forms a una función serverless `api/contact.js` + Resend.** El endpoint `/api/contact/` responde en vivo: honeypot `{"ok":true}` (200), datos inválidos `{"error":"invalid-fields"}` (422) y un envío válido de prueba devolvió **`{"ok":true}` (200)** → Resend está configurado y acepta el envío. **Los leads se entregan.**

**❌ / ⚠️ Sigue abierto:**
- **Agenda Cal.com:** ❌ **NO activa.** `PUBLIC_CAL_URL` sin valor en Vercel → la tarjeta de agenda **no se renderiza**; el formulario es la única ruta de contacto.
- **Plausible:** ❌ **NO activa.** `PUBLIC_PLAUSIBLE_DOMAIN` sin valor → el script **no carga**; no hay analítica en producción.
- **Restos de Netlify Forms:** ⚠️ markup vestigial (`data-netlify`, `data-netlify-honeypot`, `<input name="form-name">`) muerto en Vercel; el fallback sin‑JS `action="/gracias/"` **no entrega** en Vercel.
- **HSTS** sin `includeSubDomains`/`preload` (deuda aceptada en QA‑REPORT, sigue igual).
- **Cobertura visual:** el QA‑REPORT afirmó probar 7 anchos (incl. frontera 700/701 px) pero `reports/visual/` solo tenía 2 capturas → **laguna real confirmada**. Y la frontera 700/701 es justo donde esta auditoría encontró un **overflow horizontal no documentado** (§3‑R1): la cobertura visual incompleta lo ocultó.

---

## 2) Frente 0 — Cierre de producción (reservas del QA‑REPORT vs. estado real)

| # | Reserva original (QA‑REPORT) | Estado real hoy (en vivo) | Evidencia |
|---|---|---|---|
| 0.1 | Deploy público validado — ❌ Pendiente | ✅ **Vercel**, `HTTP/2 200`, `server: Vercel` | `curl -I` |
| 0.2 | Dominio, HTTPS, redirección raíz/www — ❌ Pendiente | ✅ HTTPS válido; `http→https` **308**; `www.consultoria…` sin DNS (N/A en subdominio). El apex `felipepena.co` es el **portfolio** (fuera de alcance) | `curl -I`, `curl -I http://…` |
| 0.3 | Netlify Forms recibe el envío — ⚠️ Parcial | ✅ **Reemplazado por `/api/contact/` + Resend.** Envío válido → `{"ok":true}` 200; honeypot 200; inválido 422 | POST en vivo a `/api/contact/` |
| 0.4 | Agenda Cal.com/Calendly — ⚠️ Parcial | ❌ **NO activa** — sin `data-booking-url` en el HTML; `PUBLIC_CAL_URL` sin valor en Vercel | `grep data-booking-url` (vacío) |
| 0.5 | Plausible — ⚠️ Parcial | ❌ **NO activa** — sin meta `plausible-domain`/script; `PUBLIC_PLAUSIBLE_DOMAIN` sin valor | `grep plausible` (vacío) |
| 0.6 | Cabeceras de seguridad/CSP en vivo — ⚠️ no verificado | ✅ Aplicadas por Vercel: CSP, HSTS (`max-age=31536000`, **sin** `includeSubDomains`/`preload`), `nosniff`, `SAMEORIGIN`, `Referrer-Policy`, `Permissions-Policy` | `curl -I` |
| 0.7 | Mixed content | ✅ Ninguno — CSP `default-src 'self'` + `upgrade-insecure-requests`; todos los recursos same‑origin | CSP + HTML |

**Detalle CSP en vivo:** `script-src 'self' https://plausible.io https://*.plausible.io; connect-src 'self' https://open.er-api.com https://plausible.io…; frame-src https://cal.com … https://calendly.com …; style-src 'self' 'unsafe-inline'`. La CSP ya autoriza Plausible, ExchangeRate API y Cal/Calendly, pero esas integraciones no están conectadas por env vars.

**Nota sobre el endpoint:** `vercel.json` usa `cleanUrls:true` + `trailingSlash:true`. Por eso `/api/contact` (sin `/`) hace 308 → `/api/contact/`. El formulario ya postea directo a `/api/contact/` (con `/`), así que no sufre el redirect. `GET /api/contact/` → 405 correcto.

---

## 3) Frente 1 — Responsive (verificación con evidencia)

Mediciones tomadas en vivo con Playwright (viewport real, fuentes/CDN de producción). `overflowX = scrollWidth > innerWidth`.

| Ancho | overflow X | Header | Contenido (contact/industrias) | Nota |
|---:|:--:|---|---|---|
| 320 | ✅ no | hamburguesa | 1 col | limpio |
| 375 | ✅ no | hamburguesa | 1 col | limpio |
| 700 | ✅ no | hamburguesa | contact 2 col | último ancho móvil de header |
| **701** | ⛔ **SÍ (766px, +65)** | **nav desktop** | industrias 1 col | **el nav desktop aparece pero no cabe** |
| **750** | ⛔ **SÍ (774px, +24)** | nav desktop | industrias 1 col | overflow persiste |
| 850 | ✅ no | nav desktop | industrias 1 col | ya cabe |
| 900 | ✅ no | nav desktop | industrias 1 col | |
| 1024 | ✅ no | nav desktop | industrias 2 col | |
| 1440 | ✅ no | nav desktop | hero 2 col | |

### Hallazgos

| # | Sección | Ancho | Problema | Severidad | Evidencia |
|---|---|---|---|---|---|
| **R1** | Header / nav | **701–~849 px** | **Overflow horizontal (barra de scroll).** El header sale de modo móvil en `max-width:43.75rem` (700 px), pero el nav desktop (enlaces + selector de idioma + **selector de moneda**) mide ~766 px y no cabe hasta ~850 px. Elemento culpable: `nav.site-nav` con `label.currency-switch` como borde derecho (766 px @ 701). | **P1** (defecto visible de layout en un rango común de tablet/laptop pequeño; afecta ES y EN) | `home-701.jpg`, `home-750.jpg`, mediciones; culpa: `SiteHeader.astro:498` (`@media max-width: 43.75rem`) |
| R2 | Header (breakpoints) | 700–900 px | **Desalineación de breakpoints:** header colapsa a 700 px pero el contenido reestructura a 900 px (`ContactPanel.astro:646`) y 1024 px (industrias). Zona donde nav y contenido "no se ponen de acuerdo" sobre desktop/móvil. Es la causa estructural de R1. | P2 | mediciones por ancho; `SiteHeader.astro:498` vs `ContactPanel.astro:646` |
| R3 | HeroGraph / ProcessArtifact | 320–375 px | **Sin defecto.** Ambos diagramas ("datos dispersos → operación conectada" y la tabla "capacidad por semana") se renderizan **legibles y contenidos, sin overflow**. Hipótesis **descartada**. | — | `herograph-320.jpg`, `proceso-320.jpg` |
| R4 | Header móvil (moneda + idioma) | 375 px | Conviven `ES/EN` + `CO·COP` en la barra superior; **funcionales**. Tap targets: selector de moneda **96×48 px** ✅, selector de indicativo del teléfono **108×52 px** ✅ (ambos ≥44 px). Se sienten algo juntos pero no rotos. | P3 (refinamiento) | `menu-abierto-375.jpg`, `form-foco-375.jpg`, mediciones tap |
| R5 | Conversión de moneda | red lenta | **No reproducido con red degradada** en esta pasada. Por diseño, el valor COP base nunca desaparece y la conversión se **añade** como texto (no reemplaza el layout) → coherente con CLS 0 de Lighthouse. Recomendado: prueba con throttling 3G para confirmar cero salto. | P3 (no verificado) | — |

**Paridad `/en/` y `/privacidad/`:** capturas `en-375/1440.jpg` y `privacidad-375/1440.jpg`. Layout equivalente al ES (mismo componente). **R1 afecta también a `/en/`** (mismo header).

---

## 4) Frente 2 — UX del selector de idioma (hallazgos priorizados)

| # | Hallazgo | Estado | Prioridad |
|---|---|---|---|
| L1 | **¿Preserva la sección/ancla al cambiar de idioma?** | ✅ **SÍ.** Desde `/#proceso` → clic EN → `/en/#proceso`. Verificado en vivo. (`site.ts` añade `location.hash` al destino del `[data-language-link]`.) | — (ya resuelto) |
| L2 | **¿Preserva la moneda al cambiar de idioma?** | ✅ **SÍ.** Fijado MXN → cambio a EN → `data-currency=MXN` y `select=MXN` persisten (localStorage). | — (ya resuelto) |
| L3 | **Jerarquía visual idioma vs. moneda** | ⚠️ `ES/EN` (texto) y `CO·COP` (dropdown) van adyacentes con tratamiento tipográfico similar. Distinguibles (el dropdown tiene chevron y label país·moneda), pero un usuario nuevo podría tardar en separarlos. **Refinamiento:** separador visual/agrupación o un microicono (🌐 idioma / 🏳️ país) — sin sobrecargar. | P3 |
| L4 | **Detección automática de idioma** | ❌ No existe (`navigator.language`/`Accept-Language`) ni banner. **Recomendación:** banner discreto y descartable sugiriendo EN a navegadores en inglés (**nunca** redirect automático). Coste si se implementa: ~0.3–0.5 KiB JS. | P3 (opcional) |
| L5 | **Benchmark (Linear, Stripe)** | Ambos ubican el selector de idioma/región en el **footer** o en un menú de settings, no prominente en el header. Para un sitio de una página como este, el header es aceptable; si se busca minimalismo, mover a footer es un patrón de precedente válido. | Referencia |

---

## 5) Frente 3 — SEO e indexabilidad para IA

### Confirmado en producción (se sirve igual que el código)
`title` único, `canonical`, `hreflang` (es‑CO / en / x‑default), OG/Twitter, JSON‑LD **Person + ProfessionalService**, `robots.txt`, `sitemap.xml` (4 URLs: `/`, `/en/`, `/privacidad/`, `/en/privacy/`). **`/gracias/` y `/en/thanks/` con `noindex,nofollow` y fuera del sitemap** ✅ (Frente 3‑gap 5 cerrado).

### Gaps

| # | Gap | Estado | Impacto | Coste (presupuesto 310 KiB) |
|---|---|---|---|---|
| S1 | **`llms.txt`** | ❌ 404 | Answer engines no tienen un resumen curado y citable | Archivo nuevo en `public/`, **0 KiB** al presupuesto de `/` (no lo carga la home) |
| S2 | **Declaración explícita de crawlers IA en `robots.txt`** | Genérico `User-agent:* Allow:/` (ya los permite por omisión) | Intención auditable; visibilidad, no bloqueo | Cambio en `robots.txt.ts`, **0 KiB** al presupuesto de `/` |
| S3 | **`FAQPage` JSON‑LD** | ❌ Ausente (el sitio tiene 9 preguntas Q/A) | Rich results + extracción directa por answer engines | Inline en la home → **~+2 KiB al presupuesto de `/`** ⚠️ (ver §6) |
| S4 | **Indexación (`site:`)** | Dominio creado hoy; sin acceso a GSC | Aún no indexable de verificar | — (verificar en 7–14 días) |
| S5 | Thanks `noindex` + fuera de sitemap | ✅ Correcto | — | — |

### Snippets listos para pegar

#### S1 — `public/llms.txt` (completo)

```text
# Felipe Peña — Software de operaciones

> Consultoría B2B que diseña y construye software interno, automatización de
> datos e integraciones con IA para poner al día operaciones que crecieron más
> rápido que sus sistemas. Entrega en producción entre 4 y 8 semanas. Con sede
> en Bogotá (Colombia) y proyectos en Colombia, México y Perú.

## Qué ofrece
- Diagnóstico técnico de operación: mapa de procesos, arquitectura propuesta y
  propuesta con alcance, plazo y valor. Costo COP 600.000 a 1.000.000; el
  documento es del cliente aunque construya con otro equipo.
- Construcción de software interno y automatización de datos.
- Integraciones con IA aplicadas a la operación.
- Propiedad del código, repositorios y accesos a nombre del cliente desde el
  día uno. Felipe Peña lidera diseño, decisiones y gestión; un núcleo de
  ingeniería construye y demuestra avance cada semana.

## Enlaces principales
- [Inicio](https://consultoria.felipepena.co/): landing completa (ES).
- [Servicios](https://consultoria.felipepena.co/#servicios): diagnóstico y etapas.
- [Compromisos / prueba](https://consultoria.felipepena.co/#prueba): garantías verificables.
- [Proceso](https://consultoria.felipepena.co/#proceso): del diagnóstico a producción.
- [Preguntas frecuentes](https://consultoria.felipepena.co/#preguntas): inversión, propiedad, equipo.
- [Contacto](https://consultoria.felipepena.co/#contacto): formulario de contacto.
- [English version](https://consultoria.felipepena.co/en/): full landing in English.
- [Privacidad](https://consultoria.felipepena.co/privacidad/): política de datos.

## Contacto
- Correo: hola@felipepena.co
- Cobertura: Colombia, México, Perú (monedas COP, MXN, PEN, USD).
```

#### S2 — Adición sugerida a `robots.txt` (declaración explícita, permitir)

> Solo si se decide dejar la intención explícita (el sitio busca visibilidad, no bloqueo). Editar `src/pages/robots.txt.ts` para emitir, tras el bloque `User-agent: *`:

```text
User-agent: GPTBot
User-agent: OAI-SearchBot
User-agent: ChatGPT-User
User-agent: ClaudeBot
User-agent: Claude-Web
User-agent: PerplexityBot
User-agent: Google-Extended
User-agent: CCBot
Allow: /

# Referencia a la guía para asistentes
# https://consultoria.felipepena.co/llms.txt
```

#### S3 — `FAQPage` JSON‑LD (9 preguntas, para inyectar en la home; ~2 KiB)

> Añadir un tercer bloque `<script type="application/ld+json">` en el `<head>` de la home. **Advertencia de presupuesto en §6.** El precio del diagnóstico se deja resuelto en COP (fuente de verdad del sitio).

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "@id": "https://consultoria.felipepena.co/#faq",
  "inLanguage": "es-CO",
  "mainEntity": [
    { "@type": "Question", "name": "¿Cómo se define la inversión?", "acceptedAnswer": { "@type": "Answer", "text": "La primera llamada no tiene costo: ahí determinamos si el proyecto es viable. Si avanzamos, el diagnóstico cuesta COP 600.000 a 1.000.000. El resultado es tuyo, decidas construir con nosotros o con otro equipo: mapa de procesos, arquitectura y propuesta con alcance, plazo y valor." } },
    { "@type": "Question", "name": "¿Qué pasa si el diagnóstico no me convence?", "acceptedAnswer": { "@type": "Answer", "text": "El documento es tuyo: el mapa, la arquitectura y la propuesta sirven aunque construyas con otro equipo. Y si construimos juntos, el diagnóstico se abona al valor del proyecto." } },
    { "@type": "Question", "name": "¿Quién hace realmente el trabajo?", "acceptedAnswer": { "@type": "Answer", "text": "Felipe lidera el diseño, las decisiones y la gestión. Un núcleo estable construye según el módulo y cada entrega pasa por revisión del equipo." } },
    { "@type": "Question", "name": "¿Cuánto se demora?", "acceptedAnswer": { "@type": "Answer", "text": "Normalmente entre 4 y 8 semanas en total, incluido el diagnóstico. El plazo se compromete en la propuesta y no queda como una estimación abierta." } },
    { "@type": "Question", "name": "¿Voy a terminar hablando con alguien con poca experiencia?", "acceptedAnswer": { "@type": "Answer", "text": "No. Felipe permanece como interlocutor y líder del proyecto. Quien entiende el problema decide junto al equipo que construye, sin intermediarios." } },
    { "@type": "Question", "name": "¿Qué necesito preparar para la llamada?", "acceptedAnswer": { "@type": "Answer", "text": "Solo tres cosas: qué proceso te duele más, qué sistemas intervienen y quién lo opera. No necesitas documentación técnica." } },
    { "@type": "Question", "name": "¿De quién es el código?", "acceptedAnswer": { "@type": "Answer", "text": "Tuyo. Repositorios, documentación y accesos están a tu nombre desde el día uno." } },
    { "@type": "Question", "name": "¿Qué tan grande es el equipo?", "acceptedAnswer": { "@type": "Answer", "text": "Depende del alcance. En tu propuesta aparecen el nombre, el rol y el momento de entrada de cada persona. Nunca una capacidad anónima." } },
    { "@type": "Question", "name": "¿Qué pasa si alguien desaparece?", "acceptedAnswer": { "@type": "Answer", "text": "Tablero, documentación y al menos otra persona con contexto reducen esa dependencia. Felipe permanece como responsable contractual y el equipo conserva continuidad operativa." } }
  ]
}
```

---

## 6) Plan priorizado (impacto / esfuerzo) y respeto al presupuesto de CI

| Prioridad | Acción | Impacto | Esfuerzo | Presupuesto/Lighthouse |
|---|---|---|---|---|
| **P1** | **Corregir overflow del header (R1).** Subir el breakpoint móvil del header de `43.75rem` (700 px) a ~`53rem` (~848 px) en `SiteHeader.astro`, o reducir el ancho del nav desktop en la zona. | Elimina barra de scroll horizontal en 701–849 px (ES y EN) | Bajo (CSS) | **0 KiB, sin riesgo de Lighthouse.** ⚠️ Decisión de diseño: el hamburguesa quedaría hasta ~848 px (tablets). Requiere visto bueno visual. |
| **P1** | **Decidir agenda (0.4).** Setear `PUBLIC_CAL_URL` en Vercel o quitar toda referencia a agenda del copy si no habrá. | Cierra ruta de conversión secundaria / evita promesa muerta | Bajo (config) | 0 KiB |
| **P1** | **Decidir analítica (0.5).** Setear `PUBLIC_PLAUSIBLE_DOMAIN` (+`PUBLIC_PLAUSIBLE_SRC`) en Vercel al dominio real, o asumir "sin analítica". | Sin datos, no hay medición de conversión | Bajo (config) | Plausible carga post‑`load`: no afecta LCP |
| **P2** | **Limpiar restos de Netlify Forms** en `ContactPanel.astro` (`data-netlify`, `data-netlify-honeypot`, `<input name="form-name">`) y actualizar el `action` sin‑JS (o documentar que el envío requiere JS). | Coherencia; evita confusión de mantenimiento | Bajo | 0 KiB (quita bytes) |
| **P2** | **`llms.txt` (S1).** | Visibilidad en answer engines | Bajo | **0 KiB** al presupuesto de `/` |
| **P2** | **`FAQPage` JSON‑LD (S3).** | Rich results + extracción IA | Bajo | ⚠️ **~+2 KiB al presupuesto de `/`.** Último build medido ~303.7/310 KiB → quedaría ~305–306/310. **Pasa, pero achica margen.** Minificar el JSON y **re‑correr `npm run build` para confirmar el gate antes de fusionar.** |
| **P3** | Declarar crawlers IA en `robots.txt` (S2). | Intención auditable | Bajo | 0 KiB |
| **P3** | Banner discreto de idioma (L4) y/o separar visualmente idioma vs. moneda (L3). | Refinamiento UX | Medio | ~0.3–0.5 KiB JS si banner |
| **P3** | Prueba de conversión de moneda con red 3G (R5) y validación con lector de pantalla + móvil físico (pendiente del QA‑REPORT). | Confirma CLS y accesibilidad manual | Medio | — |
| **P3** | Añadir HSTS `includeSubDomains; preload` cuando se confirme política de subdominios. | Endurecimiento | Bajo | 0 KiB |

> **Restricción respetada:** ninguna acción sube JS/assets de `/` salvo el `FAQPage` JSON‑LD (~2 KiB, marcado). El resto es CSS, config o archivos no incluidos en la carga inicial. **Nada propuesto pone en riesgo Lighthouse ≥95, LCP<1500 ms, CLS<0.1, TBT<200 ms** — pero el gate de 310 KiB debe re‑verificarse tras S3.

---

## 7) Quick wins (<30 min c/u)

1. **`llms.txt`** — crear `public/llms.txt` con el snippet S1. 0 KiB, 0 riesgo. (~10 min)
2. **Setear `PUBLIC_CAL_URL` y `PUBLIC_PLAUSIBLE_DOMAIN`** en Vercel (o decidir explícitamente que no van). Redeploy. (~15 min)
3. **Quitar el markup muerto de Netlify** del formulario (3 atributos/inputs). (~10 min)
4. **Subir el breakpoint del header** a ~`53rem` y re‑verificar 701/750/850 px con las capturas de `reports/audit-live/`. (~20 min)
5. **Declarar crawlers IA** en `robots.txt.ts` (S2). (~10 min)

---

## Anexo — Inventario de evidencia (`reports/audit-live/`)

- **Full‑page por ancho:** `home-320/375/700/701/750/850/900/1024/1440.jpg`
- **Estados:** `menu-abierto-375.jpg`, `form-foco-375.jpg`, `menu-o-nav-850.jpg`
- **Diagramas 320 px:** `herograph-320.jpg`, `proceso-320.jpg`
- **Paridad:** `en-375.jpg`, `en-1440.jpg`, `privacidad-375.jpg`, `privacidad-1440.jpg`

*Método:* Playwright/Chromium contra la URL de producción; mediciones de `scrollWidth`, visibilidad de nav/hamburguesa, columnas de grid y tap targets tomadas en el DOM en vivo. Los envíos de prueba al formulario se hicieron contra `/api/contact/` (honeypot, inválido y un envío válido etiquetado "[AUDITORIA]").
