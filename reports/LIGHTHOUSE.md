# Reporte Lighthouse

Auditoría ejecutada el 15 de julio de 2026 sobre el build estático servido localmente, con la emulación móvil predeterminada de Lighthouse CI y Chrome Headless.

| Métrica | Run 1 | Run 2 | Run 3 | Presupuesto |
|---|---:|---:|---:|---:|
| Performance | 100 | 100 | 100 | ≥ 95 |
| Accessibility | 100 | 100 | 100 | ≥ 95 |
| Best Practices | 100 | 100 | 100 | ≥ 95 |
| SEO | 100 | 100 | 100 | ≥ 95 |
| LCP | 1.363 ms | 1.357 ms | 1.356 ms | < 1.500 ms |
| CLS | 0 | 0 | 0 | < 0,1 |
| Total Blocking Time | 0 ms | 0 ms | 0 ms | proxy de laboratorio para respuesta |
| Transferencia total | 80.407 B | 80.407 B | 80.407 B | < 307.200 B |

El tercer run queda guardado como [`lighthouse.html`](./lighthouse.html) y [`lighthouse.json`](./lighthouse.json). El workflow regenera tres ejecuciones y las conserva como artifact en cada push o pull request.

## Nota sobre INP

INP es una métrica de campo y necesita interacciones reales suficientes; Lighthouse no la produce como número de laboratorio comparable. El sitio entrega 0 ms de Total Blocking Time, usa un script propio pequeño y no hidrata ningún framework cliente. INP deberá verificarse con datos de producción (CrUX o RUM) tras el despliegue.
