declare global {
  interface Window {
    plausible?: ((event: string, options?: { props?: Record<string, string> }) => void) & {
      q?: unknown[];
    };
  }
}

type Plausible = NonNullable<Window["plausible"]>;

const fallbackPlausible = ((event: string, options?: { props?: Record<string, string> }) => {
  (fallbackPlausible.q ||= []).push([event, options]);
}) as Plausible;

const plausible = window.plausible || fallbackPlausible;

window.plausible = plausible;

const track = (event: string, props?: Record<string, string>) => {
  window.plausible?.(event, props ? { props } : undefined);
};

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const tracked = target.closest<HTMLElement>("[data-track='cta']");
  if (tracked) {
    track("CTA Click", { location: tracked.dataset.location || "unknown" });
  }
});

document.querySelector<HTMLFormElement>("[data-contact-form]")?.addEventListener("submit", () => {
  track("Form Submit", { form: "contacto" });
});

const proof = document.querySelector<HTMLElement>("[data-proof-section]");
if (proof && "IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      track("Proof Viewed", { section: "compromisos-verificables" });
      observer.disconnect();
    },
    { threshold: 0.15 },
  );
  observer.observe(proof);
}

document.querySelector<HTMLButtonElement>("[data-booking-open]")?.addEventListener("click", (event) => {
  const button = event.currentTarget;
  const frame = document.querySelector<HTMLElement>("[data-booking-frame]");
  if (!(button instanceof HTMLButtonElement) || !frame || !button.dataset.bookingUrl) return;
  if (button.dataset.loading === "true") return;

  try {
    const bookingUrl = new URL(button.dataset.bookingUrl);
    if (!/^https?:$/.test(bookingUrl.protocol)) return;

    if (bookingUrl.hostname === "cal.com" || bookingUrl.hostname.endsWith(".cal.com")) {
      bookingUrl.searchParams.set("embed", "true");
    }

    const iframe = document.createElement("iframe");
    iframe.src = bookingUrl.toString();
    iframe.title = "Agenda para reservar una llamada de encaje de 30 minutos";
    iframe.loading = "lazy";
    iframe.tabIndex = 0;
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    iframe.allow = "fullscreen";

    iframe.addEventListener(
      "load",
      () => {
        const shouldTransferFocus = document.activeElement === button;
        button.hidden = true;
        button.removeAttribute("aria-busy");
        delete button.dataset.loading;
        if (shouldTransferFocus) iframe.focus({ preventScroll: true });
      },
      { once: true },
    );

    frame.replaceChildren(iframe);
    frame.hidden = false;
    button.dataset.loading = "true";
    button.setAttribute("aria-busy", "true");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    frame.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    track("Booking Loaded", { provider: bookingUrl.hostname });
  } catch {
    // Una URL de agenda inválida no rompe la ruta alternativa del formulario.
  }
});

export {};
