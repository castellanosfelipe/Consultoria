# Reporte Lighthouse

Auditoría ejecutada el 15 de julio de 2026 sobre el build estático integrado, servido localmente con Brotli/gzip, las cabeceras de seguridad de Netlify (salvo `upgrade-insecure-requests` por usar HTTP local) y la emulación móvil predeterminada de Lighthouse CI. La compuerta usa agregación pesimista: debe pasar el peor de los tres runs.

| Métrica | Run 1 | Run 2 | Run 3 | Presupuesto |
|---|---:|---:|---:|---:|
| Performance | 100 | 100 | 100 | ≥ 95 |
| Accessibility | 100 | 100 | 100 | ≥ 95 |
| Best Practices | 100 | 100 | 100 | ≥ 95 |
| SEO | 100 | 100 | 100 | ≥ 95 |
| LCP | 1.359,7 ms | 1.360,2 ms | 1.359,1 ms | < 1.500 ms |
| CLS | 0 | 0 | 0 | < 0,1 |
| Total Blocking Time | 0 ms | 0 ms | 0 ms | < 200 ms |
| Transferencia total | 84.173 B | 84.173 B | 84.173 B | < 307.200 B |

El run pesimista queda guardado como [`lighthouse.html`](./lighthouse.html) y [`lighthouse.json`](./lighthouse.json). El workflow regenera tres ejecuciones y conserva sus reportes como artifact en cada push o pull request.

El build auditado usó fixtures sintéticos para ejercer las ramas de agenda, LinkedIn y Plausible. Esta auditoría no demuestra que esos servicios estén configurados o funcionen en un despliegue público.

## Nota sobre INP

INP es una métrica de campo y necesita interacciones reales suficientes; Lighthouse no la produce como número de laboratorio comparable. El sitio entrega 0 ms de Total Blocking Time, usa un script propio pequeño y no hidrata ningún framework cliente. INP deberá verificarse con CrUX o RUM después del despliegue.
