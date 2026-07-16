export interface MotionOptions {
  onReveal?: (element: HTMLElement) => void;
}

const motionSelector = "[data-animate], [data-track-view]";
const itemSelector = "[data-animate-item]";
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const milliseconds = (value: string | undefined, fallback: number) => {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed)
    ? Math.min(Math.max(parsed, 0), 2_000)
    : fallback;
};

const prepare = (element: HTMLElement) => {
  const delay = milliseconds(element.dataset.delay, 0);
  const stagger = milliseconds(element.dataset.stagger, 0);
  element.style.setProperty("--motion-delay", `${delay}ms`);
  element.style.setProperty("--motion-stagger", `${stagger}ms`);

  element.querySelectorAll<HTMLElement>(itemSelector).forEach((item, index) => {
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

/**
 * Activa reveals declarativos una sola vez. El estado base permanece visible sin JS;
 * `motion-ready` solo se añade cuando el observer ya puede garantizar el estado final.
 */
export const initMotion = ({ onReveal }: MotionOptions = {}) => {
  const elements = Array.from(
    document.querySelectorAll<HTMLElement>(motionSelector),
  );
  elements.forEach(prepare);
  document.documentElement.classList.add("motion-ready");

  const reveal = (element: HTMLElement) => {
    if (element.classList.contains("is-visible")) return;
    element.classList.add("is-visible");
    onReveal?.(element);
  };

  if (!("IntersectionObserver" in window)) {
    // El fallback prioriza contenido visible; no inventa eventos de vista sin viewport fiable.
    elements.forEach((element) => element.classList.add("is-visible"));
    return;
  }

  if (reduceMotion.matches) {
    elements.forEach((element) => element.classList.add("is-visible"));

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

  elements.forEach((element) => observer.observe(element));
};
