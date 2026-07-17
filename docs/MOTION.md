# Motion language

La motion cuenta un cambio de estado: fragmentos manuales que se ordenan hasta convertirse en un sistema en producción. No usa rebotes, springs, parallax ni fondos animados. La actualización toma como referencia la claridad cinética, las líneas autodibujadas y la narrativa progresiva de los [ejemplos de landing animadas de SVGator](https://www.svgator.com/blog/animated-landing-pages-examples/) y la gramática de ruta, estela y objeto guía de la [página Scroll de GSAP](https://gsap.com/scroll/), reinterpretadas como lenguaje de ingeniería y no como decoración.

## Decisión técnica

La página mantiene un solo bundle de navegador. `src/scripts/site.ts` importa la utilidad reutilizable `src/scripts/motion.ts`; Astro compone ambos desde el único `<script>` de `BaseLayout.astro`.

No se incorporó GSAP. El sitio estaba a menos de 24 KiB de su presupuesto inicial y GSAP con ScrollTrigger y MotionPath lo habría superado. El hilo continuo usa `getPointAtLength()`, una tangente para orientar el paquete y un `requestAnimationFrame` amortiguado; el resto conserva `IntersectionObserver` y timelines CSS. No hay pinning, scroll artificial ni cambios sobre el desplazamiento nativo.

## API declarativa

```html
<section data-animate="fade-up" data-delay="100">
  <!-- reveal individual -->
</section>

<ul data-animate="fade-left" data-stagger="70">
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
| `data-animate`      | Patrón genérico o coreografía semántica del contenedor.                                 |
| `data-animate-item` | Hijo que recibe el stagger del grupo.                                                    |
| `data-stagger="70"` | Separación entre hijos, en milisegundos.                                                 |
| `data-delay="200"`  | Espera adicional del contenedor o del hijo, en milisegundos.                             |
| `data-motion-index` | Índice explícito cuando dos segmentos representan una misma fila.                        |
| `data-scroll-section` | Activa una marca de progreso breve cuando una sección entra al viewport.                |
| `data-mobile-reveal="items"` | Observa cada ítem móvil por separado para no revelar contenido aún fuera de pantalla. |
| `.motion-ready`     | Scope global que JS activa después del primer paint.                                     |
| `.graph-motion-ready` | Scope local del diagrama; evita flashes y desacopla su reloj del resto de la página.    |
| `.faq-ready`        | Activa el estado del acordeón antes del primer paint, separado de los reveals de scroll. |
| `.is-visible`       | Estado final one-shot; el observer deja de observar inmediatamente.                      |
| `data-scroll-thread` | Ruta global decorativa que muestra el progreso manual → producción.                      |
| `data-scroll-guidance` | Conducto local de Proceso; la esfera y el gradiente siguen el progreso de esa escena.   |

Sin JavaScript no se aplica el estado oculto: el contenido SSR permanece visible.

Los presets reutilizables son `fade`, `fade-up`, `fade-left`, `fade-right`, `scale-in`, `scale-x` y `heading`. Las coreografías de dominio son `problem`, `comparison`, `offer-flow`, `diff`, `process`, `capacity`, `assembly`, `filter`, `faq-list`, `contact`, `footer` y `system-graph`.

Cada `data-animate-item` pertenece a su contenedor `data-animate` más cercano. Esto permite componer artefactos sin que un grupo exterior duplique los índices o delays de una secuencia interior.

## Verbos visuales por sección

- **Hero — declarar:** el H1 entra por dos máscaras verticales sin animar su opacidad; el párrafo LCP nunca espera al JavaScript.
- **Diagrama — ordenar y desplegar:** cuatro actos one-shot — fuentes, operación manual, build/normalización y deploy — en unos 9,8 segundos en escritorio. En móvil, una secuencia de fades de unos 7,5 segundos presenta fuentes, falla manual, transición, pipeline y nodos de producción con tiempo de lectura. Ningún fragmento sale del marco y el estado final queda centrado y sostenido, sin loop.
- **Dolores — registrar:** señales laterales, puntos de estado y separadores que completan cada fila.
- **Comparativa — converger:** extremos laterales y columna central que se confirma con borde y lift.
- **Oferta — encadenar:** card, conector, core, conector y salida se revelan como un pipeline.
- **Compromisos — aplicar diff:** estado anterior, tachado, inserción nueva y confirmación de commit.
- **Proceso y capacidad — activar:** conectores, responsables, demos semanales y estado final aparecen en orden operativo.
- **Contacto — enrutar:** introducción, pasos, cards y campos forman una única secuencia hasta el envío.
- **Hilo global — guiar:** un paquete de despliegue recorre tres trazos laterales. La estela recorrida cambia a producción y la ruta pendiente conserva la señal manual.
- **Proceso — transferir:** una esfera avanza por un conducto que cambia gradualmente de manual a producción, sin copiar recursos ni geometrías de la referencia.

El scroll también mantiene un progreso continuo en el borde inferior del nav, actualiza el enlace de sección activa y alimenta el hilo dentro del mismo `requestAnimationFrame`. Los reveals continúan siendo one-shot; solo el indicador de progreso avanza y retrocede con el scroll. En móvil, los grupos largos se revelan ítem por ítem y el hilo se reduce a un rail lateral que se completa, sin paquete flotante ni esfera. Los ítems se observan desde la carga aunque el viewport sea de escritorio, por lo que una rotación o un resize nunca deja contenido oculto.

## Timings

- `--motion-fast: 300ms`: estados cortos, badges e iconos.
- `--motion-duration: 500ms`: reveal editorial base.
- `--motion-slow: 600ms`: convergencia y líneas.
- `--motion-stagger: 70ms`: base; las secuencias densas usan 55 ms y los cambios de estado complejos hasta 110 ms.
- `--motion-ease: cubic-bezier(0.22, 1, 0.36, 1)`: llegada precisa, sin overshoot.

`will-change` solo existe mientras un elemento espera su reveal. Las geometrías se reservan antes de animar y la motion usa `transform` y `opacity`; las dos excepciones pedidas son el panel FAQ (`grid-template-rows`) y la capa ya desenfocada del header, cuya entrada anima únicamente `opacity`.

El párrafo principal del hero permanece visible desde el primer paint porque Chrome lo identifica como el elemento LCP. Los demás elementos conservan sus slots y el stagger relativo de 70 ms. La preparación masiva de reveals se difiere dos `requestAnimationFrame`; el gráfico usa un scope local inmediato para fijar su estado inicial, pero decide el reveal después de que el navegador resuelve un posible hash. Así el recálculo del resto de la página no compite con el LCP ni se ejecutan animaciones fuera de pantalla al entrar por un enlace profundo.

## Degradación con `prefers-reduced-motion`

- Hero, dolores, comparativas, ofertas, identidad, FAQ, footer y contacto aparecen inmediatamente en su posición final.
- No se ejecutan stagger, drift, convergencia, lift ni dibujo de líneas.
- El diagrama oculta el estado manual y muestra la composición estática `DESPUÉS · SISTEMA` con `EN PRODUCCIÓN`.
- El diff muestra el estado anterior ya tachado y el nuevo visible.
- El conector del proceso, las barras de capacidad y los hitos semanales aparecen completos.
- El nav cambia de estado sin tween; los underlines responden de forma inmediata.
- El hilo y el conducto aparecen completos; el paquete y la esfera quedan ocultos y no se registra un loop de seguimiento.
- El FAQ conserva teclado y semántica, pero abre y cierra sin transición.
- Loading, error y success del formulario conservan texto y `aria-live`, sin animación.
- La agenda usa desplazamiento instantáneo al cargarse.

En pantallas de hasta `56.25rem` se eliminan drift, convergencia, escalado, lifts y objetos que recorren rutas. Los reveals se reducen a fades simples, el diagrama recorre una composición before/after sin desplazamiento espacial y el hilo conserva únicamente su progreso lateral.
