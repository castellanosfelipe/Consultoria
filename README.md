# Felipe Peña · landing de software de operaciones

Landing estática en español para presentar servicios de software interno y automatización de datos. Implementa la dirección **“columna narrativa + artefactos de sistema”** definida en Fase 2: documento técnico, color usado como estado y una sola animación importante.

## Stack y decisión

**Astro 7 + CSS moderno + JavaScript mínimo.**

- Astro genera HTML estático y no envía runtime de framework.
- La página reúne diez secciones, SEO, 404, formulario, sitemap y componentes visuales; layouts y componentes reducen duplicación sin introducir React.
- HTML/CSS/JS puro habría sido viable, pero menos mantenible para esta cantidad de contenido y variantes.
- Next.js añadiría ejecución y dependencias sin aportar valor a una landing sin datos dinámicos.
- No se usa Tailwind, librería de iconos, SDK de agenda ni librería de animación.

La última auditoría móvil, incluyendo las cabeceras de seguridad emuladas, transfirió **84.173 B**. El guardrail independiente del build recorre el grafo local inicial de `/` —HTML, CSS, JavaScript, fuentes e imágenes— y mide **148,3 KiB / 300 KiB sin compresión** en ocho archivos. Los recursos externos diferidos no se cuentan como archivos locales.

## Estado de calidad

Última ejecución local: tres runs consecutivos de Lighthouse CI sobre el build estático, servido con Brotli/gzip y emulación móvil. Se usaron valores sintéticos para recorrer también las ramas opcionales de agenda, LinkedIn y Plausible; esto **no** acredita que esas integraciones estén activas en producción.

| Categoría o métrica | Resultado | Presupuesto |
|---|---:|---:|
| Performance | 100 / 100 / 100 | ≥ 95 |
| Accessibility | 100 / 100 / 100 | ≥ 95 |
| Best Practices | 100 / 100 / 100 | ≥ 95 |
| SEO | 100 / 100 / 100 | ≥ 95 |
| LCP | 1.359,1–1.360,2 ms | < 1.500 ms |
| CLS | 0 | < 0,1 |
| Total Blocking Time | 0 ms | < 200 ms |
| Transferencia total | 84.173 B | < 307.200 B |

La configuración usa agregación pesimista y añade una aserción explícita para la coincidencia entre etiqueta visible y nombre accesible. Lighthouse no produce INP como métrica de laboratorio; debe confirmarse con CrUX o RUM después de publicar. TBT es solo el proxy sintético disponible.

[`reports/LIGHTHOUSE.md`](./reports/LIGHTHOUSE.md) y el [reporte HTML](./reports/lighthouse.html) son snapshots versionados de referencia. El workflow genera resultados nuevos por commit y los conserva como artifact durante 14 días.

QA adicional ejecutado:

- viewports de 320, 375, 428, 768, 1024, 1280, 1440 y 2560 px, más zoom al 200 %;
- un solo `h1`, landmarks e IDs válidos, navegación completa por teclado y foco visible;
- cero overflow horizontal, errores de consola o violaciones detectadas por axe en la matriz automatizada;
- menú móvil, estado de sección activa, anclas, volver/recargar con hash y `prefers-reduced-motion`;
- formulario con labels, errores en línea, foco en el primer error y estados de envío;
- imágenes con dimensiones explícitas y layout de una columna en móvil.

Capturas de referencia: [desktop 1440 px](./reports/visual/desktop-1440.png) y [móvil 393 px](./reports/visual/mobile-393.png). La validación manual con lector de pantalla y móvil físico sigue pendiente.

## Desarrollo local

Requisitos: Node.js 22.12 o superior; Node 24 es la versión de CI. El proyecto declara npm 11.13.0.

```bash
npm ci
npm run dev
```

Comandos:

```bash
npm run check       # tipos y diagnóstico Astro
npm run build       # build + preload CSS + validación del artefacto + presupuesto
npm run test        # check + build completo
npm run preview     # sirve dist/ con Astro Preview
npm run lighthouse  # tres auditorías móviles y asserts de calidad/rendimiento
npm run audit:prod  # vulnerabilidades de dependencias que llegan al sitio
```

`check-output.mjs` valida el HTML generado, canonical/OG/JSON-LD, robots y sitemap, formulario, páginas `noindex`, integraciones condicionales y coherencia del origen. `check-budget.mjs` falla si el grafo local inicial supera 300 KiB o contiene una referencia local no resoluble.

Lighthouse CI permanece como dependencia de desarrollo. Sus dependencias transitivas vulnerables conocidas están fijadas temporalmente mediante overrides exactos (`inquirer@8.2.7`, `tmp@0.2.7` y `uuid@11.1.1`) hasta que exista una release corregida de `@lhci/cli`.

## Configuración de producción

Copia `.env.example` a `.env` para desarrollo. En Netlify, define los valores reales en **Site configuration → Environment variables**.

| Variable | Requerida | Validación y uso |
|---|---|---|
| `PUBLIC_SITE_URL` | Sí fuera de Netlify | Origen de canonical, OG, sitemap y Schema.org; solo origen `http(s)`, sin ruta, query ni credenciales. Netlify también expone `URL` |
| `PUBLIC_CAL_URL` | Para agenda | HTTPS de `cal.com` o `calendly.com`, incluidos subdominios |
| `PUBLIC_LINKEDIN_URL` | Recomendable | HTTPS de LinkedIn; enlace `rel=me` y `Person.sameAs` |
| `PUBLIC_PLAUSIBLE_DOMAIN` | Para analítica | Uno o más hostnames válidos separados por coma |
| `PUBLIC_PLAUSIBLE_SRC` | Opcional | Ruta raíz del mismo sitio para proxy, o HTTPS de `plausible.io`; requiere dominio y por defecto usa el script oficial |
| `PUBLIC_PORTRAIT_PATH` | Recomendable | Ruta existente bajo `public/`, sin traversal y con extensión WebP o AVIF |

El fallback de desarrollo es `http://localhost:4321`. En un contexto de producción de Netlify, la configuración exige un origen HTTPS no provisional; en otro proveedor puede activarse la misma comprobación con `REQUIRE_PRODUCTION_CONFIG=true`. Conviene fijar `PUBLIC_SITE_URL` al dominio canónico para que los previews no sustituyan ese origen.

Si no hay URL de agenda, solo se muestra el formulario. Si se configura, el `iframe` se crea después del clic, valida el proveedor, informa el estado y ofrece un enlace directo si no carga. Para el retrato, guarda por ejemplo `public/images/felipe-pena.webp`, usa proporción 4:5 y configura `/images/felipe-pena.webp`.

## Conversión y analítica

- CTA principal, header y enlaces de agenda instrumentados por ubicación.
- Agenda Cal.com/Calendly creada bajo demanda, con timeout de 12 segundos, foco gestionado y enlace directo de respaldo.
- Formulario Netlify Forms con nombre, email y contexto, honeypot, validación accesible en línea y bloqueo de doble envío.
- Con JavaScript, el formulario hace un POST URL-encoded por `fetch`, informa errores de red/timeout y navega a `/gracias/` solo tras una respuesta correcta. Sin JavaScript conserva `method`, `action` y el envío HTML nativo.
- La confirmación usa `sessionStorage` para no afirmar un envío cuando `/gracias/` se abre directamente.
- Sin popup, chat ni SDK de agenda en la carga inicial.

Plausible se inyecta solo cuando hay dominio configurado, 1,2 segundos después de `load`. Eventos implementados:

- `CTA Click`, con `location`;
- `Form Submit Attempt`, `Form Submit` y `Form Submit Failed`, con formulario o motivo;
- `Proof Viewed`, al entrar en la sección de compromisos;
- `Booking Loaded` y `Booking Load Failed`, con proveedor.

Los eventos deben crearse y comprobarse en la cuenta real de Plausible. Netlify detecta el formulario en el primer deploy, pero hace falta verificar una entrega real antes del lanzamiento. Los valores usados en CI son únicamente fixtures de compilación y prueba.

## SEO

- `title` y description escritos a mano.
- Un `h1` con “software interno” y jerarquía semántica.
- canonical, Open Graph y Twitter Card con PNG propio de 1200×630 y texto alternativo.
- JSON-LD `ProfessionalService` + `Person`.
- `robots.txt` y sitemap generados con el origen configurado; las páginas `noindex` quedan fuera del sitemap.
- 404 propia y `/gracias/` con `noindex`.
- Sitio monolingüe; `hreflang` no aplica.

## Despliegue recomendado: Netlify

Netlify aporta previews por PR y procesa el formulario estático sin backend adicional. `netlify.toml` ya define `npm run build`, `dist` y Node 24.

Cabeceras preparadas para Netlify:

- HSTS, `nosniff`, `SAMEORIGIN`, Referrer Policy y Permissions Policy;
- CSP limitada al propio sitio, Plausible y los iframes admitidos de Cal.com/Calendly;
- caché inmutable para assets versionados de `/_astro/` y revalidación diaria para fuentes e imágenes con nombre estable;
- preload de la hoja CSS versionada, generado durante cada build en `dist/_headers`.

Pasos pendientes de publicación:

1. Importar este repositorio en Netlify.
2. Añadir las variables reales y desplegar.
3. Conectar el dominio, forzar HTTPS y elegir raíz o `www` como versión canónica.
4. Añadir la redirección 301 de la variante secundaria cuando se conozca el dominio.
5. Probar en el sitio público agenda, formulario, 404, cabeceras, OG/LinkedIn y eventos de Plausible.

El workflow `.github/workflows/ci.yml` usa acciones fijadas por SHA y ejecuta en Node 24: `npm ci`, auditoría de dependencias de producción, check, build con fixtures de integración y tres runs de Lighthouse. Corre en cada push y pull request, y conserva los reportes durante 14 días. **El workflow valida el artefacto local; no despliega ni demuestra que Netlify Forms, agenda o analítica funcionen en un dominio público.**

## Decisiones por datos ausentes

Fase 2 marcaba casos, métricas y capacidad del equipo como información no publicable. Para no inventar credenciales:

- “Compromisos” muestra condiciones verificables, no casos atribuidos sin autorización;
- el retrato ausente usa un monograma técnico y se reemplaza al configurar una imagen real;
- el tamaño del equipo se expresa según alcance, sin publicar un número no confirmado;
- LinkedIn, agenda y analítica se ocultan o degradan hasta configurar valores reales.

No se ha realizado ni verificado un despliegue público. Antes del lanzamiento todavía faltan:

- dominio y preferencia raíz/`www`;
- URL real de Cal.com/Calendly;
- LinkedIn y retrato;
- dominio/cuenta de analítica;
- casos y métricas autorizados, si van a reemplazar la prueba operativa;
- prueba real de Netlify Forms, agenda, analítica y cabeceras;
- validación manual con lector de pantalla y móvil físico.

## Estructura

```text
src/
  components/       # header, grafo, proceso y conversión
  layouts/          # SEO y documento base
  pages/            # landing, 404, gracias, robots y sitemap
  scripts/          # menú, navegación, formulario, agenda y eventos
  styles/           # tokens y estilos globales
public/
  fonts/             # WOFF2 self-hosted
  images/            # OG y retrato opcional
reports/             # snapshots Lighthouse y capturas de referencia
scripts/             # servidor QA, validadores, preload y presupuesto
```

## Fuentes y licencia

Archivo, IBM Plex Sans e IBM Plex Mono se sirven localmente en WOFF2 y usan `font-display: swap`. Consulta [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md) y `LICENSES/OFL-1.1.txt`.
