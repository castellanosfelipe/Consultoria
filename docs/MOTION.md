# Motion language

La motion cuenta un cambio de estado: fragmentos manuales que se ordenan hasta convertirse en un sistema en producción. No usa rebotes, springs, parallax ni fondos animados.

## Decisión técnica

La página mantiene un solo bundle de navegador. `src/scripts/site.ts` importa la utilidad reutilizable `src/scripts/motion.ts`; Astro compone ambos desde el único `<script>` de `BaseLayout.astro`.

No se incorporó GSAP. El diagrama requiere una secuencia que se ejecuta una sola vez al entrar al viewport, no scrub, pinning, reversa ni cálculos dinámicos. `IntersectionObserver` activa una timeline CSS determinista con menor peso.

## API declarativa

```html
<section data-animate="fade-up" data-delay="100">
  <!-- reveal individual -->
</section>

<ul data-animate="fade-up" data-stagger="70">
  <li data-animate-item>Primero</li>
  <li data-animate-item>Después</li>
</ul>

<div data-animate="scale-x" data-stagger="90">
  <span data-animate-item data-motion-index="0"></span>
  <span data-animate-item data-motion-index="1"></span>
</div>
```

| Atributo o clase    | Responsabilidad                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------- |
| `data-animate`      | Patrón del contenedor: `fade-up`, `fade`, `scale-x`, `diff`, `process` o `system-graph`. |
| `data-animate-item` | Hijo que recibe el stagger del grupo.                                                    |
| `data-stagger="70"` | Separación entre hijos, en milisegundos.                                                 |
| `data-delay="200"`  | Espera adicional del contenedor o del hijo, en milisegundos.                             |
| `data-motion-index` | Índice explícito cuando dos segmentos representan una misma fila.                        |
| `.motion-ready`     | Se añade al documento solo cuando JS está disponible.                                    |
| `.is-visible`       | Estado final one-shot; el observer deja de observar inmediatamente.                      |

Sin JavaScript no se aplica el estado oculto: el contenido SSR permanece visible.

## Timings

- `--motion-fast: 300ms`: estados cortos, badges e iconos.
- `--motion-duration: 500ms`: reveal editorial base.
- `--motion-slow: 600ms`: convergencia y líneas.
- `--motion-stagger: 70ms`: orden perceptible sin teatralidad.
- `--motion-ease: cubic-bezier(0.22, 1, 0.36, 1)`: llegada precisa, sin overshoot.

`will-change` solo existe mientras un elemento espera su reveal. Las geometrías se reservan antes de animar y la motion usa `transform` y `opacity`; las dos excepciones pedidas son el panel FAQ (`grid-template-rows`) y la capa ya desenfocada del header, cuya entrada anima únicamente `opacity`.

## Degradación con `prefers-reduced-motion`

- Hero, dolores, comparativas, ofertas y contacto aparecen inmediatamente en su posición final.
- No se ejecutan stagger, drift, convergencia, lift ni dibujo de líneas.
- El diagrama oculta el estado manual y muestra la composición estática `DESPUÉS · SISTEMA` con `EN PRODUCCIÓN`.
- El diff muestra el estado anterior ya tachado y el nuevo visible.
- El conector del proceso y las barras de capacidad aparecen completos.
- El nav cambia de estado sin tween; los underlines responden de forma inmediata.
- El FAQ conserva teclado y semántica, pero abre y cierra sin transición.
- Loading, error y success del formulario conservan texto y `aria-live`, sin animación.
- La agenda usa desplazamiento instantáneo al cargarse.

En pantallas de hasta `56.25rem` se eliminan drift, convergencia y lifts. Los reveals se reducen a fades simples y el diagrama usa su composición before/after estática.
