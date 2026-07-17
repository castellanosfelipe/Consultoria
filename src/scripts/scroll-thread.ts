export interface ScrollThreadController {
  update: (progress: number) => void;
}

const clamp = (value: number) => Math.min(Math.max(value, 0), 1);

/**
 * Hilo de progreso continuo inspirado en una ruta de despliegue, sin dependencias.
 * El suavizado es deliberadamente amortiguado: sigue el scroll sin rebote.
 */
export const initScrollThread = (): ScrollThreadController => {
  const thread = document.querySelector<HTMLElement>("[data-scroll-thread]");
  const svg = thread?.querySelector<SVGSVGElement>(".scroll-thread__svg");
  const path = thread?.querySelector<SVGPathElement>(
    "[data-scroll-thread-path]",
  );
  const progressPaths = Array.from(
    thread?.querySelectorAll<SVGPathElement>("[data-scroll-thread-progress]") ?? [],
  );
  const plane = thread?.querySelector<HTMLElement>(
    "[data-scroll-thread-plane]",
  );
  const waypoints = Array.from(
    thread?.querySelectorAll<SVGGElement>("[data-scroll-thread-waypoint]") ?? [],
  ).map((element) => ({
    element,
    progress: clamp(Number(element.dataset.progress) || 0),
  }));

  if (!thread || !svg || !path || !plane || progressPaths.length === 0) {
    return { update: () => undefined };
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mobileMotion = window.matchMedia("(max-width: 56.25rem)");

  let ready = false;
  let frame = 0;
  let resizeFrame = 0;
  let current = 0;
  let target = 0;
  let pathLength = 0;
  let threadWidth = 0;
  let threadHeight = 0;
  let viewBoxX = 0;
  let viewBoxY = 0;
  let viewBoxWidth = 1;
  let viewBoxHeight = 1;

  const setStaticState = (isStatic: boolean) => {
    thread.classList.toggle("is-static", isStatic);

    if (!isStatic) return;
    window.cancelAnimationFrame(frame);
    frame = 0;
    thread.classList.remove("is-moving");
    progressPaths.forEach((progressPath) =>
      progressPath.style.removeProperty("stroke-dasharray"),
    );
    plane.style.removeProperty("transform");
    waypoints.forEach(({ element }) => element.classList.remove("is-passed"));
  };

  const refreshGeometry = () => {
    const rect = thread.getBoundingClientRect();
    const viewBox = svg.viewBox.baseVal;
    threadWidth = rect.width;
    threadHeight = rect.height;
    viewBoxX = viewBox.x;
    viewBoxY = viewBox.y;
    viewBoxWidth = Math.max(viewBox.width, 1);
    viewBoxHeight = Math.max(viewBox.height, 1);
    pathLength = path.getTotalLength();
  };

  const renderThread = (progress: number) => {
    const boundedProgress = clamp(progress);
    progressPaths.forEach((progressPath) => {
      progressPath.style.strokeDasharray = `${boundedProgress} 1`;
    });
    waypoints.forEach(({ element, progress: waypointProgress }) => {
      element.classList.toggle("is-passed", boundedProgress >= waypointProgress);
    });

    if (mobileMotion.matches || pathLength <= 0) return;

    const distance = boundedProgress * pathLength;
    const sampleDistance = 6;
    const previous = path.getPointAtLength(
      Math.max(0, distance - sampleDistance),
    );
    const next = path.getPointAtLength(
      Math.min(pathLength, distance + sampleDistance),
    );
    const point = path.getPointAtLength(distance);
    const deltaX = ((next.x - previous.x) / viewBoxWidth) * Math.max(threadWidth, 1);
    const deltaY = ((next.y - previous.y) / viewBoxHeight) * Math.max(threadHeight, 1);
    const angle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI;
    const x = ((point.x - viewBoxX) / viewBoxWidth) * threadWidth;
    const y = ((point.y - viewBoxY) / viewBoxHeight) * threadHeight;

    plane.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${angle}deg) translate(-50%, -50%)`;
  };

  const animate = () => {
    frame = 0;
    if (!ready || reduceMotion.matches) return;

    const delta = target - current;
    current += delta * 0.14;
    if (Math.abs(delta) < 0.0005) current = target;

    renderThread(current);

    const moving = Math.abs(target - current) >= 0.0005;
    thread.classList.toggle("is-moving", moving);
    if (moving) frame = window.requestAnimationFrame(animate);
  };

  const startAnimation = () => {
    if (!ready || reduceMotion.matches || frame) return;
    thread.classList.add("is-moving");
    frame = window.requestAnimationFrame(animate);
  };

  const update = (progress: number) => {
    target = clamp(progress);
    startAnimation();
  };

  const syncFromPage = () => {
    const scrollRange = Math.max(
      document.documentElement.scrollHeight - window.innerHeight,
      1,
    );
    update(window.scrollY / scrollRange);
  };

  const configure = () => {
    refreshGeometry();
    thread.hidden = false;
    ready = true;
    const scrollRange = Math.max(
      document.documentElement.scrollHeight - window.innerHeight,
      1,
    );
    target = current = clamp(window.scrollY / scrollRange);

    setStaticState(reduceMotion.matches);
    if (!reduceMotion.matches) renderThread(current);
    thread.classList.add("is-ready");
  };

  const begin = () => {
    thread.hidden = false;
    window.requestAnimationFrame(configure);
  };
  if (document.readyState === "complete") window.setTimeout(begin, 0);
  else window.addEventListener("load", begin, { once: true });

  const scheduleRefresh = () => {
    if (resizeFrame) return;
    resizeFrame = window.requestAnimationFrame(() => {
      resizeFrame = 0;
      refreshGeometry();
      if (mobileMotion.matches) plane.style.removeProperty("transform");
      syncFromPage();
    });
  };

  window.addEventListener("resize", scheduleRefresh);
  window.addEventListener("pageshow", scheduleRefresh);
  reduceMotion.addEventListener("change", () => {
    setStaticState(reduceMotion.matches);
    if (!reduceMotion.matches) {
      refreshGeometry();
      syncFromPage();
      startAnimation();
    }
  });
  mobileMotion.addEventListener("change", scheduleRefresh);

  if ("ResizeObserver" in window) {
    const layoutObserver = new ResizeObserver(scheduleRefresh);
    layoutObserver.observe(document.body);
  }

  return { update };
};
