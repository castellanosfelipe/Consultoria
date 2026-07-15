# Felipe Peña · landing de software de operaciones

Landing estática en español para presentar servicios de software interno y automatización de datos. Implementa la dirección **“columna narrativa + artefactos de sistema”** definida en Fase 2: documento técnico, color usado como estado y una sola animación importante.

## Stack y decisión

**Astro 7 + CSS moderno + JavaScript mínimo.**

- Astro genera HTML estático y envía cero runtime de framework.
- La página tiene suficiente estructura —10 secciones, SEO, 404, formulario, sitemap y componentes visuales— para beneficiarse de layouts y componentes sin introducir React.
- HTML/CSS/JS puro habría sido viable, pero menos mantenible para esta cantidad de contenido y variantes.
- Next.js no aporta nada a una landing sin datos dinámicos y aumentaría la superficie de ejecución.
- No se usa Tailwind, librería de iconos, SDK de agenda ni librería de animación.

La salida inicial medida por Lighthouse móvil es **80.407 bytes**. El guardrail de build usa un cálculo aún más conservador de **147,3 KB / 300 KB**.

## Estado de calidad

Tres ejecuciones consecutivas de Lighthouse CI con emulación móvil:

| Categoría | Resultado |
|---|---:|
| Performance | 100 |
| Accessibility | 100 |
| Best Practices | 100 |
| SEO | 100 |
| LCP | 1.356–1.363 ms |
| CLS | 0 |
| Total Blocking Time | 0 ms |
| Transferencia | 80.407 B |

Consulta [`reports/LIGHTHOUSE.md`](./reports/LIGHTHOUSE.md) y el [reporte HTML](./reports/lighthouse.html).

Capturas de referencia: [desktop 1440 px](./reports/visual/desktop-1440.png) y [móvil 393 px](./reports/visual/mobile-393.png).

QA adicional ejecutado en viewports de 1440×1000, 768×1024 y 393×852:

- un solo `h1`;
- landmarks `header`, `nav`, `main` y `footer` únicos;
- cero overflow horizontal;
- cero errores de consola;
- campos del formulario limitados a nombre, email y una línea de contexto;
- imágenes con dimensiones explícitas;
- layout reducido a una columna, grafo antes→después y carriles de proceso en móvil;
- `prefers-reduced-motion` deja el grafo en su estado final.

Lighthouse no produce INP como métrica de laboratorio. Debe confirmarse con CrUX o RUM después de publicar; 0 ms de Total Blocking Time es el proxy sintético disponible.

## Desarrollo local

Requisitos: Node.js 22.12 o superior; Node 24 recomendado.

```bash
npm ci
npm run dev
```

Comandos:

```bash
npm run check       # tipos y diagnóstico Astro
npm run build       # build estático + presupuesto de 300 KB
npm run preview     # sirve dist/ localmente
npm run lighthouse  # tres auditorías móviles y asserts >= 95
```

## Configuración de producción

Copia `.env.example` a `.env` para desarrollo. En Netlify, define las variables en **Site configuration → Environment variables**.

| Variable | Requerida | Uso |
|---|---|---|
| `PUBLIC_SITE_URL` | Sí fuera de Netlify | canonical, OG, sitemap y Schema.org; Netlify aporta `URL` automáticamente |
| `PUBLIC_CAL_URL` | Para agenda | URL real de Cal.com o Calendly |
| `PUBLIC_LINKEDIN_URL` | Recomendable | enlace y `sameAs` de Person |
| `PUBLIC_PLAUSIBLE_DOMAIN` | Para analítica | dominio registrado en Plausible |
| `PUBLIC_PLAUSIBLE_SRC` | Opcional | script de Plausible; permite proxy/self-host |
| `PUBLIC_PORTRAIT_PATH` | Recomendable | ruta local a retrato WebP/AVIF |

Si no hay URL de agenda, el formulario alternativo ocupa el bloque de conversión completo. Si se configura, el `iframe` se crea **solo después del clic** y no afecta LCP.

Para el retrato, guarda por ejemplo `public/images/felipe-pena.webp`, conserva el ancho/alto de `560×700` o la misma proporción y configura `/images/felipe-pena.webp`.

## Conversión

- CTA principal y repetido hacia `#contacto`.
- Cal.com/Calendly diferido hasta interacción.
- Formulario Netlify Forms con tres campos, honeypot y página `/gracias/`.
- Sin popup, chat ni SDK de terceros en la carga inicial.
- Eventos Plausible:
  - `CTA Click` con propiedad `location`;
  - `Form Submit`;
  - `Proof Viewed`;
  - `Booking Loaded` con proveedor.

En Plausible, crea los tres primeros como custom events después de conectar el dominio. El formulario se activa automáticamente en el primer deploy de Netlify; verifica una entrega real antes del lanzamiento.

## SEO

- `title` y description escritos a mano.
- Un `h1` con “software interno”.
- canonical, Open Graph y Twitter Card con PNG propio de 1200×630.
- JSON-LD `ProfessionalService` + `Person`.
- `robots.txt` y `sitemap.xml` generados con la URL del sitio.
- 404 propia y páginas auxiliares con `noindex`.
- Sitio monolingüe; `hreflang` no aplica.

El fallback local es `http://localhost:4321`. En Netlify, la variable automática `URL` mantiene canonical, OG, Schema.org, robots y sitemap en el mismo dominio; `PUBLIC_SITE_URL` permite fijar el dominio propio desde el primer build.

## Despliegue recomendado: Netlify

Netlify gana aquí porque aporta previews por PR y procesa el formulario estático sin backend adicional.

1. Sube este repositorio a GitHub.
2. En Netlify, **Add new site → Import an existing project**.
3. Build command: `npm run build`; publish directory: `dist` (ya están en `netlify.toml`).
4. Añade las variables de entorno anteriores.
5. Conecta el dominio y fuerza HTTPS.
6. Elige la versión canónica del dominio. Para redirigir `www` a raíz, agrega después de conocer el dominio:

```toml
[[redirects]]
  from = "https://www.TU-DOMINIO.com/*"
  to = "https://TU-DOMINIO.com/:splat"
  status = 301
  force = true
```

7. Haz una prueba real de agenda, formulario, OG en LinkedIn Post Inspector y eventos de Plausible.

El workflow `.github/workflows/ci.yml` ejecuta check, build, presupuesto y Lighthouse CI móvil en cada push a `main` y cada pull request, y conserva los reportes como artifact durante 14 días.

## Decisiones por datos ausentes

Fase 2 marcaba casos, métricas y capacidad del equipo con corchetes y decía explícitamente que no eran copy publicable. Para evitar credenciales inventadas:

- la sección “Compromisos” conserva el artefacto diff ámbar→verde y evita presentar promesas como casos no autorizados;
- el retrato ausente usa un monograma técnico deliberado y desaparece al configurar una foto real;
- el tamaño del equipo se expresa según alcance, sin publicar un número no confirmado;
- LinkedIn, agenda y analítica se ocultan o degradan con honestidad hasta configurar URLs reales.

Antes del lanzamiento final todavía deben suministrarse:

- dominio y preferencia raíz/`www`;
- URL real de Cal.com/Calendly;
- LinkedIn y retrato;
- dominio/ID de analítica;
- casos y métricas autorizados, si van a reemplazar la prueba operativa;
- validación manual con lector de pantalla y un móvil físico.

## Estructura

```text
src/
  components/       # header, grafo, proceso y conversión
  layouts/          # SEO y documento base
  pages/            # landing, 404, gracias, robots y sitemap
  scripts/          # agenda diferida + eventos
  styles/           # tokens y estilos globales
public/
  fonts/             # WOFF2 self-hosted
  images/            # OG y retrato opcional
reports/             # snapshot Lighthouse + capturas verificadas
scripts/             # budget de build
```

## Fuentes y licencia

Archivo, IBM Plex Sans e IBM Plex Mono se sirven localmente en WOFF2 y usan `font-display: swap`. Consulta [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md) y `LICENSES/OFL-1.1.txt`.
