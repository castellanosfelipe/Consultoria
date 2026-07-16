export interface MotionOptions {
  onReveal?: (element: HTMLElement) => void;
}

const motionSelector =
  "[data-animate], [data-track-view], [data-scroll-section]";
const itemSelector = "[data-animate-item]";
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const mobileMotion = window.matchMedia("(max-width: 56.25rem)");

const milliseconds = (value: string | undefined, fallback: number) => {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed)
    ? Math.min(Math.max(parsed, 0), 2_000)
    : fallback;
};

const ownedItemsFor = (element: HTMLElement) =>
  Array.from(element.querySelectorAll<HTMLElement>(itemSelector)).filter(
    (item) => item.closest<HTMLElement>("[data-animate]") === element,
  );

const prepare = (element: HTMLElement) => {
  const delay = milliseconds(element.dataset.delay, 0);
  const stagger = milliseconds(element.dataset.stagger, 0);
  element.style.setProperty("--motion-delay", `${delay}ms`);
  element.style.setProperty("--motion-stagger", `${stagger}ms`);

  const ownedItems = ownedItemsFor(element);

  ownedItems.forEach((item, index) => {
    const declaredIndex = Number.parseInt(item.dataset.motionIndex || "", 10);
    const motionIndex = Number.isFinite(declaredIndex) ? declaredIndex : index;
    const itemDelay = milliseconds(item.dataset.delay, 0);
    item.style.setProperty("--motion-index", String(motionIndex));
    item.style.setProperty("--motion-item-delay", `${itemDelay}ms`);
    item.style.setProperty(
      "--motion-sequence-delay",
      `${itemDelay + motionIndex * stagger}ms`,
    );
  });
};

const isInInitialViewport = (element: HTMLElement) => {
  const rect = element.getBoundingClientRect();
  const revealBoundary = window.innerHeight * 0.92;
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.top < revealBoundary &&
    rect.bottom > 0
  );
};

/**
 * Activa reveals declarativos una sola vez. El estado base permanece visible sin JS;
 * `motion-ready` solo se añade cuando el observer ya puede garantizar el estado final.
 */
export const initMotion = ({ onReveal }: MotionOptions = {}) => {
  const elements = Array.from(
    document.querySelectorAll<HTMLElement>(motionSelector),
  );
  const graphElements = elements.filter(
    (element) => element.dataset.animate === "system-graph",
  );
  const deferredElements = elements.filter(
    (element) => element.dataset.animate !== "system-graph",
  );
  const mobileItems = mobileMotion.matches
    ? [
        ...new Set(
          Array.from(
            document.querySelectorAll<HTMLElement>(
              '[data-mobile-reveal="items"]',
            ),
          ).flatMap(ownedItemsFor),
        ),
      ]
    : [];

  // El artefacto visible del hero se prepara en un scope local para evitar un
  // flash del estado final sin activar todavía los selectores de toda la página.
  graphElements.forEach((element) => {
    prepare(element);
    element.classList.add("graph-motion-ready");
  });

  const reveal = (element: HTMLElement) => {
    if (element.classList.contains("is-visible")) return;
    element.classList.add("is-visible");
    onReveal?.(element);
  };

  if (!("IntersectionObserver" in window)) {
    // El fallback prioriza contenido visible; no inventa eventos de vista sin viewport fiable.
    deferredElements.forEach(prepare);
    document.documentElement.classList.add("motion-ready");
    elements.forEach((element) => element.classList.add("is-visible"));
    mobileItems.forEach((item) => item.classList.add("is-item-visible"));
    return;
  }

  if (reduceMotion.matches) {
    deferredElements.forEach(prepare);
    document.documentElement.classList.add("motion-ready");
    elements.forEach((element) => element.classList.add("is-visible"));
    mobileItems.forEach((item) => item.classList.add("is-item-visible"));

    // La preferencia visual no debe desactivar la medición de secciones realmente vistas.
    const trackObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const element = entry.target as HTMLElement;
          onReveal?.(element);
          trackObserver.unobserve(element);
        }
      },
      { threshold: 0.14, rootMargin: "0px 0px -8%" },
    );

    elements
      .filter((element) => element.hasAttribute("data-track-view"))
      .forEach((element) => trackObserver.observe(element));
    return;
  }

  const observeOnce = (targets: HTMLElement[]) => {
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const element = entry.target as HTMLElement;
          reveal(element);
          observer.unobserve(element);
        }
      },
      { threshold: 0.14, rootMargin: "0px 0px -8%" },
    );

    targets.forEach((element) => observer.observe(element));
  };

  const observeMobileItems = (targets: HTMLElement[]) => {
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const item = entry.target as HTMLElement;
          item.classList.add("is-item-visible");
          observer.unobserve(item);
        }
      },
      { threshold: 0.18, rootMargin: "0px 0px -10%" },
    );

    targets.forEach((item) => observer.observe(item));
  };

  // Dos frames separan el primer paint de la preparación masiva de motion.
  // También permiten que el navegador resuelva un hash inicial antes de decidir
  // si el gráfico del hero está realmente dentro del viewport.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const initializeGraphMotion = () => {
        graphElements.filter(isInInitialViewport).forEach(reveal);
        observeOnce(
          graphElements.filter(
            (element) => !element.classList.contains("is-visible"),
          ),
        );
      };

      // Chrome aplica el salto de ancla con scroll suave después de los primeros
      // frames. Se espera a que el destino entre al viewport antes de medir el hero.
      if (window.location.hash) {
        const initializeAfterHash = () => {
          const targetId = decodeURIComponent(window.location.hash.slice(1));
          const target = document.getElementById(targetId);
          const deadline = performance.now() + 2_000;

          const waitForTarget = () => {
            const targetReached =
              !target || target.getBoundingClientRect().top < window.innerHeight;
            if (targetReached || performance.now() >= deadline) {
              requestAnimationFrame(initializeGraphMotion);
              return;
            }
            requestAnimationFrame(waitForTarget);
          };

          waitForTarget();
        };

        if (document.readyState === "complete") initializeAfterHash();
        else window.addEventListener("load", initializeAfterHash, { once: true });
      } else {
        initializeGraphMotion();
      }

      deferredElements.forEach(prepare);
      // Un deep link puede situar una sección dentro del viewport antes de este
      // punto. Se fija primero su estado final para que nunca haga flash visible→oculto.
      deferredElements.filter(isInInitialViewport).forEach(reveal);
      mobileItems
        .filter(isInInitialViewport)
        .forEach((item) => item.classList.add("is-item-visible"));
      document.documentElement.classList.add("motion-ready");
      observeOnce(
        deferredElements.filter(
          (element) => !element.classList.contains("is-visible"),
        ),
      );
      observeMobileItems(
        mobileItems.filter(
          (item) => !item.classList.contains("is-item-visible"),
        ),
      );
    });
  });
};
