# QA REPORT — Landing de Felipe Peña — 15 de julio de 2026

## Dictamen ejecutivo

**Estado final: ⛔ NO LISTO PARA PRODUCCIÓN.**

El candidato local está verde dentro del alcance ejecutable sin servicios externos: compila, valida su artefacto, cumple el presupuesto de peso, supera la regresión responsive/accesible automatizada y obtiene 100 en las cuatro categorías de Lighthouse durante tres runs.

El estado de producción permanece bloqueado porque no existe un despliegue público verificado ni se han probado en su entorno real el dominio, Netlify Forms, la agenda y Plausible. Tampoco se ejecutaron las validaciones manuales obligatorias con lector de pantalla y móvil físico. Este reporte no atribuye a la aplicación capacidades que solo están configuradas en código.

## Resumen cuantitativo

| Indicador | Resultado |
|---|---:|
| Total de ejecuciones/comprobaciones con resultado trazable | 635 |
| PASS observados a lo largo de las iteraciones | 569 |
| FAIL de iteraciones, posteriormente resueltos | 65 |
| WARN inicial documentado | 1 |
| Fallos locales abiertos en la regresión final | 0 |
| Ciclos funcionales mayores | 4: baseline, primera regresión, regresión de rendimiento y hardening final |
| Lotes de Lighthouse | 22 lotes / 66 runs |

Metodología del conteo:

- baseline de navegador: 94 comprobaciones —89 PASS, 4 FAIL, 1 WARN—;
- baseline de entorno/configuración: 40 comprobaciones —33 PASS, 7 FAIL—;
- cuatro regresiones completas de navegador: 68/68, 63/68, 68/68 y 68/68; los cinco fallos de la segunda se corrigieron antes de la tercera;
- regresión final: artefacto 106/106 y entorno 45/45;
- 66 reportes Lighthouse conservados: 17 ya cumplían todas las compuertas finales y 49 documentan iteraciones anteriores que no cumplían el LCP estricto u otra aserción vigente;
- seis checks específicos de mejora progresiva/CSP verificaron validación nativa sin JS, fallback de agenda, menú listo al `DOMContentLoaded` y consola limpia;
- Astro Check y presupuesto se cuentan una vez cada uno; las comprobaciones finales de auditoría completa, auditoría de runtime, árbol de dependencias y healthcheck de LHCI suman cuatro PASS;
- no se multiplican artificialmente las 19 unidades revisadas por Astro ni cada métrica interna de Lighthouse;
- revisiones estáticas, búsqueda de secretos, builds repetidos y reruns dirigidos sin contador estable no se añadieron al total.

Los cuatro ciclos mayores agrupan varios reruns dirigidos. El primero produjo inventario y baseline; el segundo validó las correcciones funcionales; el tercero volvió a romper cinco checks tras cambios de rendimiento/configuración y los corrigió; el cuarto endureció mejora progresiva, CI y CSP, y cerró otra regresión 68/68. Los 22 lotes Lighthouse fueron iteraciones de medición y optimización, no 22 releases.

## Alcance auditado

Proyecto Astro 7 de salida estática, sin backend propio ni runtime de framework en el navegador. El alcance cubrió:

- contenido y navegación de la landing;
- formulario de contacto y confirmación;
- agenda opcional Cal.com/Calendly;
- instrumentación opcional de Plausible;
- responsive, estados interactivos, teclado y accesibilidad automatizada;
- SEO técnico, Open Graph, Twitter Card, JSON-LD, robots, sitemap, 404 y páginas `noindex`;
- configuración de producción, variables de entorno, cabeceras y caché;
- build, peso inicial, dependencias y CI;
- comportamiento degradado cuando faltan las integraciones opcionales.

### Mapa de funcionalidades

| Funcionalidad | Estado al cierre | Prioridad | Notas |
|---|---|---:|---|
| Landing y diez secciones de contenido | ✅ Completa localmente | P0 | HTML estático y jerarquía semántica validados |
| Navegación desktop y móvil | ✅ Completa localmente | P1 | Menú móvil, Escape, cierre exterior y sección activa |
| Responsive y reduced motion | ✅ Completa localmente | P1 | Regresión final en siete anchos, incluidos 700/701 px como frontera |
| Formulario accesible | ✅ Completo localmente | P0 | Tres campos, validación inline, loading, anti-doble envío y error |
| Entrega mediante Netlify Forms | ⚠️ Parcial | P0 | Markup y POST implementados; servicio real no desplegado ni probado |
| Confirmación `/gracias/` | ✅ Completa localmente | P1 | Copy neutro en acceso directo y confirmación tras envío local simulado |
| Agenda Cal.com/Calendly | ⚠️ Parcial | P1 | Carga diferida, timeout y fallback implementados; URL real no verificada |
| Analítica Plausible | ⚠️ Parcial | P1 | Carga diferida y eventos implementados; cuenta/dominio reales ausentes |
| SEO y datos estructurados | ✅ Completo en artefacto | P0 | 106 comprobaciones del output; origen público aún pendiente |
| 404 propia | ✅ Completa localmente | P1 | Servidor QA devuelve `404.html`; falta probar el CDN real |
| Cabeceras de seguridad y caché | ✅ Configuradas | P1 | `netlify.toml` y preload generado; efectividad live no verificada |
| CI de calidad | ✅ Implementada | P1 | Build, audit de producción, Astro Check y Lighthouse; no despliega |
| Deploy, DNS, HTTPS y redirección raíz/`www` | ❌ Pendiente | P0 | No existe evidencia de un sitio público operativo |

### Dependencias e integraciones externas

| Dependencia | Uso | Estado real |
|---|---|---|
| Netlify | Hosting, Forms, cabeceras y redirects | Configurado en repositorio; no desplegado/verificado |
| Cal.com o Calendly | Agenda embebida bajo demanda | Código condicional listo; integración real pendiente |
| Plausible | Analítica y eventos | Código condicional listo; cuenta/dominio reales pendientes |
| LinkedIn | `rel=me` y `Person.sameAs` | Valor real pendiente |
| GitHub Actions | Build y Lighthouse CI | Workflow definido; no equivale a deploy |
| Lighthouse CI | Auditoría sintética local | Ejecutado; dependencia solo de desarrollo |

### Variables de entorno

| Variable | Estado en repositorio | Protección/validación |
|---|---|---|
| `PUBLIC_SITE_URL` | Sin valor real versionado | Solo origen `http(s)`; producción exige HTTPS y host no provisional |
| `PUBLIC_CAL_URL` | Sin valor real versionado | Solo HTTPS de Cal.com/Calendly |
| `PUBLIC_LINKEDIN_URL` | Sin valor real versionado | Solo HTTPS de LinkedIn |
| `PUBLIC_PLAUSIBLE_DOMAIN` | Sin valor real versionado | Hostnames DNS válidos; admite lista separada por comas |
| `PUBLIC_PLAUSIBLE_SRC` | Sin valor real versionado | Ruta raíz segura o HTTPS de Plausible; requiere dominio |
| `PUBLIC_PORTRAIT_PATH` | Sin valor real versionado | Archivo WebP/AVIF existente dentro de `public/` |
| `URL` | La aporta Netlify cuando exista sitio | Fallback del origen de build |
| `CONTEXT` / `REQUIRE_PRODUCTION_CONFIG` | Controles de build | Fuerzan las reglas estrictas de producción |

`.env` y sus variantes locales están ignorados por Git; no se encontraron secretos hardcodeados en la revisión. CI utiliza valores sintéticos para recorrer ramas opcionales: esos fixtures no representan integraciones activas.

## Elementos excluidos explícitamente como N/A

| Área del checklist general | Motivo de exclusión |
|---|---|
| Autenticación, sesiones, OAuth y recuperación de contraseña | La landing no tiene usuarios ni sesiones |
| Roles, permisos, rutas protegidas e IDOR | No existe modelo de autorización |
| Base de datos, migraciones, transacciones e índices | No hay base de datos propia |
| CRUD, paginación, filtros y búsqueda | No hay entidades persistentes ni API CRUD |
| APIs internas, tokens, rate limiting y carga de endpoints | El build es estático y no expone endpoints de aplicación |
| Pagos | No existe checkout ni procesamiento financiero |
| Email transaccional | La aplicación no envía email; una eventual notificación pertenece a Netlify |
| Uploads | No hay carga de archivos |
| Bilingüe y `hreflang` | El producto fue diseñado como sitio monolingüe en español |
| Concurrencia, pooling y pruebas de 50 usuarios contra servidor | No existe servidor de aplicación que probar |

CSRF, almacenamiento del formulario y entrega de notificaciones no se marcaron N/A ni PASS: dependen de Netlify Forms y quedan pendientes de una prueba real tras el despliegue.

## Cinco riesgos principales identificados

| Riesgo | Impacto | Tratamiento |
|---|---|---|
| El formulario podía comunicar éxito antes de confirmar el POST | Pérdida silenciosa de leads | Corregido localmente; falta E2E contra Netlify |
| Configuración inválida podía contaminar canonical, OG o integraciones | SEO roto o carga de terceros no autorizados | Validación estricta y allowlists en build |
| Navegación móvil y nombres accesibles incompletos | Flujo inutilizable para móvil, teclado o voz | Menú, estado activo y nombre accesible corregidos |
| Presupuesto y CI no representaban el grafo inicial ni ramas opcionales | Falso verde de rendimiento/calidad | Grafo recursivo, fixtures y validador de artefacto |
| Deploy y servicios externos no disponibles | Imposibilidad de cerrar conversión y requisitos de Fase 3 | Bloqueador externo abierto; requiere staging público |

## Ciclo de corrección

### Baseline

- Navegador/UI: 89/94 PASS, 4 FAIL y 1 WARN.
- Entorno/configuración: 33/40 PASS, 7 FAIL.
- La revisión estática encontró además riesgos de conversión, representatividad de CI, caché, cabeceras y dependencias de desarrollo.
- Lighthouse mostraba 100 en la categoría de accesibilidad aunque una auditoría individual de coincidencia etiqueta/nombre fallaba; se evitó tratar el score agregado como evidencia suficiente.

### Corrección y revalidación

Se corrigieron primero los riesgos P1, después P2 y P3. Cada familia se volvió a probar de forma dirigida; finalmente se ejecutaron las matrices completas de artefacto, entorno, navegador y Lighthouse. El resultado local final quedó sin fallos abiertos en las pruebas ejecutadas.

## Defectos encontrados y corregidos

La tabla consolida síntomas con una misma causa raíz para no duplicar el conteo. No incluye los bloqueadores externos, que aparecen en una sección separada.

| ID | Severidad | Causa raíz | Corrección aplicada | Evidencia final |
|---|---:|---|---|---|
| QA-01 | P1 | El texto visible “FP” no coincidía con el nombre accesible del enlace de marca | Nombre accesible reconstruido desde contenido visible y texto solo para lector; assert Lighthouse explícito | Lighthouse 3/3 y regresión axe |
| QA-02 | P1 | El formulario registraba intento como éxito y no esperaba confirmación del servidor | POST `fetch` URL-encoded, evento de éxito solo tras `response.ok`, timeout, error recuperable y fallback HTML | Browser 68/68; backend real pendiente |
| QA-03 | P1 | URLs y rutas opcionales aceptaban configuración inválida o provisional | Validación de origen, HTTPS, host allowlist, DNS, credenciales, traversal y existencia de retrato | Entorno 45/45 |
| QA-04 | P1 | El presupuesto anterior no representaba con precisión el grafo inicial y podía omitir recursos | Recorrido recursivo de HTML/CSS/JS, assets únicos y fallo ante imports dinámicos no resolubles | 148,3 KiB/300 KiB, 8 archivos |
| QA-05 | P1 | El CI no ejercitaba integraciones condicionales ni validaba la coherencia del artefacto | Fixtures sintéticos, `check-output.mjs` y asserts de seguridad/SEO/formulario | Artefacto 106/106 |
| QA-06 | P2 | En móvil se ocultaban enlaces primarios sin alternativa | Menú móvil accesible, `aria-expanded`, Escape, cierre exterior y foco de retorno | Browser final en 320, 375 y frontera 700/701 |
| QA-07 | P2 | Los campos dependían de validación nativa sin errores inline asociados | Mensajes por campo, `aria-describedby`, `aria-invalid`, blur/submit y foco al primer error | Browser 68/68 y axe |
| QA-08 | P2 | El botón de envío permitía duplicados y no exponía estado de carga | `aria-busy`, botón disabled, estado live y restauración tras error/pageshow | Browser 68/68 |
| QA-09 | P2 | La agenda se consideraba cargada al insertar el iframe y no tenía timeout/fallo | Evento al `load`, timeout de 12 s, error live, foco y enlace directo | Estados locales validados; proveedor real pendiente |
| QA-10 | P2 | El script solo vivía en la home; header, 404 y gracias perdían instrumentación/comportamiento | Módulo global diferido por el navegador desde `BaseLayout`; Plausible permanece post-`load` | Artefacto y navegación final |
| QA-11 | P2 | `<figure role="img">` generaba semántica HTML/ARIA inválida | Eliminación del rol redundante y conservación de `figcaption` | Axe final sin violaciones |
| QA-12 | P2 | Faltaban HSTS/CSP y la caché era inmutable en assets no versionados | Cabeceras Netlify, CSP, caché larga solo en `/_astro/` y revalidación para fuentes/imágenes | Configuración/artefacto; live pendiente |
| QA-13 | P2 | Acciones de CI obsoletas y vulnerabilidades transitivas en LHCI | Acciones fijadas por SHA actual, audit de producción y overrides temporales exactos | Build local verde; audit final indicado abajo |
| QA-14 | P2 | Fuente y CSS crítico reducían el margen de LCP; terceros podían competir con carga inicial | Subset WOFF2, preload CSS generado, tipografía crítica de sistema y Plausible post-`load` | LCP <1,5 s en 3/3 |
| QA-15 | P3 | La navegación no comunicaba la sección visible | `aria-current="location"` y estilo activo, actualizado por scroll/hash | Browser 68/68 |
| QA-16 | P3 | Abrir `/gracias/` directamente afirmaba implícitamente un envío | Copy neutro por defecto y confirmación condicionada por `sessionStorage` | Estado directo y success local validados |
| QA-17 | P3 | Astro Preview no reproducía de forma fiable el 404/CDN y faltaba texto alternativo de Twitter | Servidor QA con fallback a `404.html` y `twitter:image:alt` | Artefacto 106/106; CDN real pendiente |

Resumen por severidad de las familias anteriores:

| Severidad | Corregidas | Abiertas localmente |
|---|---:|---:|
| P0 | 0 | 0 |
| P1 | 5 | 0 |
| P2 | 9 | 0 |
| P3 | 3 | 0 |

## Evidencia de regresión final

| Suite | Resultado | Detalle |
|---|---|---|
| Astro Check | ✅ PASS | 19 archivos; 0 errores, 0 warnings, 0 hints |
| Build y contrato del artefacto | ✅ PASS | 106/106 comprobaciones |
| Presupuesto inicial | ✅ PASS | 148,3 KiB/300 KiB sin compresión; 8 archivos |
| Navegador/UI | ✅ PASS | 68/68 en 320, 375, 700, 701, 1024, 1440 y 2560 px; axe y estados |
| Entorno/configuración | ✅ PASS | 45/45; el baseline era 33/40 y se corrigieron los 7 fallos |
| Lighthouse CI | ✅ PASS | 3/3 runs; agregación pesimista |
| Dependencias finales | ✅ PASS | `npm audit`: 0 vulnerabilidades; `npm audit --omit=dev`: 0; `npm ls --all`: 0 problemas; LHCI healthcheck PASS |

### Lighthouse final

| Métrica | Run 1 | Run 2 | Run 3 | Umbral |
|---|---:|---:|---:|---:|
| Performance | 100 | 100 | 100 | ≥ 95 |
| Accessibility | 100 | 100 | 100 | ≥ 95 |
| Best Practices | 100 | 100 | 100 | ≥ 95 |
| SEO | 100 | 100 | 100 | ≥ 95 |
| LCP | 1.359,7 ms | 1.360,2 ms | 1.359,1 ms | < 1.500 ms |
| CLS | 0 | 0 | 0 | < 0,1 |
| Total Blocking Time | 0 ms | 0 ms | 0 ms | < 200 ms |
| Transferencia total | 84.173 B | 84.173 B | 84.173 B | < 307.200 B |

Lighthouse no mide INP de campo. No se sustituye INP por TBT: el reporte conserva TBT como señal sintética y deja INP pendiente de RUM/CrUX.

## Seguridad

Validado localmente:

- no se encontraron secretos hardcodeados y los archivos `.env` locales están ignorados;
- las integraciones aceptan únicamente protocolos, hosts y rutas autorizados;
- el build de producción rechaza origen HTTP, local o provisional cuando se activa el contexto estricto;
- se configuraron CSP, HSTS, `nosniff`, política de referrer, permisos y restricciones de framing;
- la landing no expone autenticación, sesiones, base de datos ni API propia.

No se marca como validado en producción:

- redirección HTTP→HTTPS y aplicación real de cabeceras;
- protección/almacenamiento del POST gestionado por Netlify Forms;
- comportamiento frente a XSS/CSRF dentro de la infraestructura externa de Netlify;
- auditoría completa y de runtime del lockfile final: ambas cerraron con cero vulnerabilidades.

## Rendimiento y accesibilidad

El artefacto local queda dentro de todos los presupuestos ejecutados: peso sin comprimir 148,3 KiB, transferencia Lighthouse 84,17 KB con cabeceras, LCP máximo 1.360,2 ms, CLS 0 y TBT 0. La agenda y Plausible se cargan de manera diferida.

La automatización cubrió axe, teclado, foco, labels, errores asociados, menú móvil, sección activa, reduced motion, overflow y estados de formulario/agenda. Esto no reemplaza una sesión con lector de pantalla real ni la prueba táctil en hardware móvil.

Las pruebas de carga de endpoints, memoria, DB y concurrencia son N/A porque no existe servidor de aplicación. El POST externo sí requiere una prueba funcional en Netlify; no se infiere su rendimiento desde el servidor estático local.

## Deuda técnica aceptada

| Deuda | Impacto | Esfuerzo estimado | Tratamiento |
|---|---|---:|---|
| Overrides de dependencias transitivas de `@lhci/cli` | Bajo en runtime; mantenimiento de CI | Bajo | Retirarlos cuando upstream publique una release corregida y repetir audit/Lighthouse |
| `style-src` conserva `'unsafe-inline'` para propiedades de estilo generadas; `script-src` ya no lo permite | Reduce parcialmente la defensa CSS | Medio | Externalizar atributos de estilo o aplicar hashes después de fijar plataforma de deploy |
| HSTS sin `includeSubDomains`/`preload` | Cobertura parcial hasta decidir DNS | Bajo | Activar solo tras confirmar dominio, subdominios y política raíz/`www` |
| Regresión de navegador no está integrada como suite versionada en CI | Riesgo de regresión UI futura | Medio | Convertir los 68 checks en Playwright persistente sobre deploy preview |
| No hay E2E contra un entorno Netlify real | Riesgo alto para conversión | Medio | Crear staging y pruebas de formulario, agenda, 404, headers y analítica |
| Sin datos de campo de Core Web Vitals | INP y variabilidad real desconocidos | Bajo tras deploy | Activar RUM/CrUX y revisar a 7/28 días |

## Pruebas no ejecutadas

No se ejecutaron y no se marcan como PASS:

- despliegue público y navegación sobre la URL final;
- DNS, certificado y redirección consistente raíz↔`www`;
- POST y recepción real en Netlify Forms;
- agenda real de Cal.com/Calendly, incluidas disponibilidad y políticas del iframe;
- carga y recepción real de eventos Plausible;
- lector de pantalla real;
- móvil físico;
- INP de campo mediante CrUX o RUM;
- confirmación live de cabeceras, CSP, caché y 404 en el CDN;

## Bloqueadores de liberación

| Bloqueador | Prioridad de release | Criterio de cierre |
|---|---:|---|
| No existe sitio público validado | P0 | Deploy de staging/producción accesible por HTTPS |
| Dominio y variante canónica no definidos | P0 | DNS activo, canonical correcto y 301 raíz/`www` verificada |
| Conversión externa no probada | P0 | Entrega real de formulario y agenda completada de extremo a extremo |
| Analítica no conectada | P1 | Eventos mínimos visibles en la cuenta real sin penalizar LCP |
| Accesibilidad manual pendiente | P1 | Flujo principal aprobado con lector de pantalla y móvil físico |
| INP real desconocido | P1 de observabilidad | Datos RUM/CrUX y umbral <200 ms una vez exista tráfico suficiente |

## Recomendaciones para el siguiente sprint

1. Crear un sitio de staging en Netlify y fijar todas las variables con valores controlados.
2. Ejecutar E2E real del formulario, agenda, confirmación, 404, cabeceras y caché.
3. Configurar el dominio y decidir raíz/`www`; verificar HTTPS y redirecciones con una herramienta externa.
4. Conectar Plausible, registrar los eventos implementados y comprobar su recepción.
5. Ejecutar el flujo completo con lector de pantalla y en al menos un dispositivo iOS/Android físico.
6. Convertir la matriz de navegador en pruebas Playwright versionadas dentro del workflow.
7. Mantener `npm audit` en cada actualización, retirar overrides cuando LHCI publique solución upstream y monitorizar Core Web Vitals de campo.

## Estado final

**Candidato local:** ✅ VERDE en las pruebas ejecutadas.

**Producción:** ⛔ **NO LISTO PARA PRODUCCIÓN**.

No quedan P0/P1 de código abiertos dentro del alcance local ejecutado, pero los requisitos de Fase 3 incluyen sitio desplegado, conversión y analítica funcionando. Esos resultados dependen de infraestructura y valores reales que todavía no existen o no fueron autorizados para esta prueba; por tanto, el criterio de salida de producción no está cumplido.
