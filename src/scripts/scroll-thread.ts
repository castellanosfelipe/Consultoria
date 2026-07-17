export interface ScrollThreadController {
  update: (progress: number, scrollPosition: number) => void;
}

const clamp = (value: number) => Math.min(Math.max(value, 0), 1);

/**
 * Hilo de progreso continuo inspirado en un motion path, sin dependencias.
 * El suavizado es deliberadamente amortiguado: sigue el scroll sin rebote.
 */
export const initScrollThread = (): ScrollThreadController => {
  const thread = document.querySelector<HTMLElement>("[data-scroll-thread]");
  const path = thread?.querySelector<SVGPathElement>(
    "[data-scroll-thread-path]",
  );
  const clip = thread?.querySelector<SVGRectElement>(
    "[data-scroll-thread-clip]",
  );
  const packet = thread?.querySelector<HTMLElement>(
    "[data-scroll-thread-packet]",
  );
  const guidance = document.querySelector<HTMLElement>(
    "[data-scroll-guidance]",
  );
  const guidancePath = guidance?.querySelector<SVGPathElement>(
    "[data-scroll-guidance-path]",
  );
  const guidanceClip = guidance?.querySelector<SVGRectElement>(
    "[data-scroll-guidance-clip]",
  );
  const guidanceBall = guidance?.querySelector<SVGGElement>(
    "[data-scroll-guidance-ball]",
  );

  if (!thread || !path || !clip || !packet) {
    return { update: () => undefined };
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mobileMotion = window.matchMedia("(max-width: 56.25rem)");

  let ready = false;
  let frame = 0;
  let resizeFrame = 0;
  let current = 0;
  let target = 0;
  let currentGuidance = 0;
  let targetGuidance = 0;
  let pathLength = 0;
  let guidanceLength = 0;
  let threadWidth = 0;
  let threadHeight = 0;
  let guidanceStart = 0;
  let guidanceEnd = 1;

  const setStaticState = (isStatic: boolean) => {
    thread.classList.toggle("is-static", isStatic);
    guidance?.classList.toggle("is-static", isStatic);

    if (!isStatic) return;
    window.cancelAnimationFrame(frame);
    frame = 0;
    thread.classList.remove("is-moving");
    guidance?.classList.remove("is-moving");
    clip.style.removeProperty("transform");
    guidanceClip?.style.removeProperty("transform");
    packet.style.removeProperty("transform");
    guidanceBall?.removeAttribute("transform");
  };

  const refreshGuidanceMetrics = () => {
    if (!guidance || !guidancePath) return;
    const rect = guidance.getBoundingClientRect();
    const absoluteTop = window.scrollY + rect.top;
    guidanceStart = absoluteTop - window.innerHeight * 0.84;
    guidanceEnd = Math.max(
      guidanceStart + 1,
      absoluteTop + rect.height - window.innerHeight * 0.28,
    );
    guidanceLength = guidancePath.getTotalLength();
  };

  const refreshGeometry = () => {
    const rect = thread.getBoundingClientRect();
    threadWidth = rect.width;
    threadHeight = rect.height;
    pathLength = path.getTotalLength();
    refreshGuidanceMetrics();
  };

  const renderThread = (progress: number) => {
    clip.style.transform = `scaleY(${progress})`;
    if (mobileMotion.matches || pathLength <= 0) return;

    const distance = progress * pathLength;
    const point = path.getPointAtLength(distance);
    const tangentDistance = Math.min(pathLength, distance + 2);
    const tangent = path.getPointAtLength(tangentDistance);
    const previous =
      tangentDistance === distance
        ? path.getPointAtLength(Math.max(0, distance - 2))
        : point;
    const deltaX =
      ((tangent.x - previous.x) / 180) * Math.max(threadWidth, 1);
    const deltaY =
      ((tangent.y - previous.y) / 1000) * Math.max(threadHeight, 1);
    const angle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI;
    const x = (point.x / 180) * threadWidth;
    const y = (point.y / 1000) * threadHeight;

    packet.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${angle}deg) translate(-50%, -50%)`;
  };

  const renderGuidance = (progress: number) => {
    if (
      mobileMotion.matches ||
      !guidance ||
      !guidancePath ||
      !guidanceClip ||
      !guidanceBall ||
      guidanceLength <= 0
    ) {
      return;
    }

    guidanceClip.style.transform = `scaleX(${progress})`;
    const point = guidancePath.getPointAtLength(progress * guidanceLength);
    guidanceBall.setAttribute("transform", `translate(${point.x} ${point.y})`);
  };

  const animate = () => {
    frame = 0;
    if (!ready || reduceMotion.matches) return;

    const threadDelta = target - current;
    const guidanceDelta = targetGuidance - currentGuidance;
    current += threadDelta * 0.14;
    currentGuidance += guidanceDelta * 0.16;

    if (Math.abs(threadDelta) < 0.0005) current = target;
    if (Math.abs(guidanceDelta) < 0.0005)
      currentGuidance = targetGuidance;

    renderThread(current);
    renderGuidance(currentGuidance);

    const moving =
      Math.abs(target - current) >= 0.0005 ||
      Math.abs(targetGuidance - currentGuidance) >= 0.0005;
    thread.classList.toggle("is-moving", moving);
    guidance?.classList.toggle("is-moving", moving);
    if (moving) frame = window.requestAnimationFrame(animate);
  };

  const startAnimation = () => {
    if (!ready || reduceMotion.matches || frame) return;
    thread.classList.add("is-moving");
    if (!mobileMotion.matches) guidance?.classList.add("is-moving");
    frame = window.requestAnimationFrame(animate);
  };

  const update = (progress: number, scrollPosition: number) => {
    target = clamp(progress);
    targetGuidance = clamp(
      (scrollPosition - guidanceStart) /
        Math.max(guidanceEnd - guidanceStart, 1),
    );
    startAnimation();
  };

  const syncFromPage = () => {
    const scrollRange = Math.max(
      document.documentElement.scrollHeight - window.innerHeight,
      1,
    );
    update(window.scrollY / scrollRange, window.scrollY);
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
    targetGuidance = currentGuidance = clamp(
      (window.scrollY - guidanceStart) /
        Math.max(guidanceEnd - guidanceStart, 1),
    );

    setStaticState(reduceMotion.matches);
    if (!reduceMotion.matches) {
      renderThread(current);
      renderGuidance(currentGuidance);
    }
    thread.classList.add("is-ready");
    guidance?.classList.add("is-ready");
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
      if (mobileMotion.matches) {
        guidanceClip?.style.removeProperty("transform");
        guidanceBall?.removeAttribute("transform");
      }
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

  if (guidance && "IntersectionObserver" in window) {
    const guidanceObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          refreshGuidanceMetrics();
          syncFromPage();
        }
      },
      { rootMargin: "65% 0px" },
    );
    guidanceObserver.observe(guidance);
  }

  return { update };
};
