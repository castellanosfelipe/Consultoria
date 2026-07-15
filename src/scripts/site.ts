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

window.plausible ||= fallbackPlausible;

const plausibleDomain = document.querySelector<HTMLMetaElement>("meta[name='plausible-domain']")?.content;
const plausibleSrc = document.querySelector<HTMLMetaElement>("meta[name='plausible-src']")?.content;

if (plausibleDomain && plausibleSrc) {
  const loadAnalytics = () => {
    if (document.querySelector("script[data-plausible-loader]")) return;
    const script = document.createElement("script");
    script.src = plausibleSrc;
    script.defer = true;
    script.dataset.domain = plausibleDomain;
    script.dataset.plausibleLoader = "true";
    document.head.append(script);
  };
  const scheduleAnalytics = () => window.setTimeout(loadAnalytics, 1_200);
  if (document.readyState === "complete") scheduleAnalytics();
  else window.addEventListener("load", scheduleAnalytics, { once: true });
}

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

const navigation = document.querySelector<HTMLElement>(".site-nav");
const menuToggle = document.querySelector<HTMLButtonElement>("[data-menu-toggle]");
const mobileMenu = document.querySelector<HTMLElement>("[data-mobile-menu]");
const menuLabel = menuToggle?.querySelector<HTMLElement>("[data-menu-label]");

const closeMenu = (restoreFocus = false) => {
  if (!menuToggle || !mobileMenu) return;
  mobileMenu.hidden = true;
  menuToggle.setAttribute("aria-expanded", "false");
  if (menuLabel) menuLabel.textContent = "Menú";
  if (restoreFocus) menuToggle.focus();
};

menuToggle?.addEventListener("click", () => {
  if (!mobileMenu) return;
  const willOpen = mobileMenu.hidden;
  mobileMenu.hidden = !willOpen;
  menuToggle.setAttribute("aria-expanded", String(willOpen));
  if (menuLabel) menuLabel.textContent = willOpen ? "Cerrar" : "Menú";
});

mobileMenu?.addEventListener("click", (event) => {
  if (event.target instanceof Element && event.target.closest("a")) closeMenu();
});

document.addEventListener("click", (event) => {
  if (!(event.target instanceof Node) || navigation?.contains(event.target)) return;
  closeMenu();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menuToggle?.getAttribute("aria-expanded") === "true") {
    closeMenu(true);
  }
});

const mobileBreakpoint = window.matchMedia("(max-width: 43.75rem)");
mobileBreakpoint.addEventListener("change", () => closeMenu());

const sectionLinks = Array.from(
  document.querySelectorAll<HTMLAnchorElement>("[data-nav-links] a[href*='#']"),
);

const setActiveSection = (hash: string) => {
  for (const link of sectionLinks) {
    const linkUrl = new URL(link.href, window.location.href);
    const isCurrent = window.location.pathname === "/" && linkUrl.hash === hash;
    if (isCurrent) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  }
};

if (window.location.pathname === "/") {
  if (window.location.hash) setActiveSection(window.location.hash);

  const observedSections = [...new Set(sectionLinks.map((link) => new URL(link.href).hash.slice(1)))]
    .map((id) => document.getElementById(id))
    .filter((section): section is HTMLElement => Boolean(section));

  let activeTimer = 0;
  let hashNavigationDeadline = window.location.hash ? performance.now() + 500 : 0;
  const updateActiveSection = () => {
    activeTimer = 0;
    const hashNavigationRemaining = hashNavigationDeadline - performance.now();
    if (window.location.hash && hashNavigationRemaining > 0) {
      setActiveSection(window.location.hash);
      activeTimer = window.setTimeout(updateActiveSection, hashNavigationRemaining + 20);
      return;
    }
    const marker = window.innerHeight * 0.35;
    const current = observedSections.find((section) => {
      const rect = section.getBoundingClientRect();
      return rect.top <= marker && rect.bottom > marker;
    });
    setActiveSection(current ? `#${current.id}` : "");
  };
  const scheduleActiveSection = () => {
    window.clearTimeout(activeTimer);
    activeTimer = window.setTimeout(updateActiveSection, 120);
  };

  window.addEventListener("scroll", scheduleActiveSection, { passive: true });
  window.addEventListener("resize", scheduleActiveSection);
  window.addEventListener("hashchange", () => {
    hashNavigationDeadline = performance.now() + 500;
    setActiveSection(window.location.hash);
    scheduleActiveSection();
  });
  window.addEventListener("pageshow", () => {
    if (window.location.hash) {
      hashNavigationDeadline = performance.now() + 500;
      setActiveSection(window.location.hash);
    }
    scheduleActiveSection();
  });
  if (window.location.hash) scheduleActiveSection();
  else updateActiveSection();
}

const form = document.querySelector<HTMLFormElement>("[data-contact-form]");

if (form) {
  form.noValidate = true;
  const fields = Array.from(form.querySelectorAll<HTMLInputElement>("input:not([type='hidden'])"));
  const submitButton = form.querySelector<HTMLButtonElement>("[data-form-submit]");
  const formStatus = form.querySelector<HTMLElement>("[data-form-status]");
  const defaultSubmitLabel = submitButton?.innerHTML || "";
  let submitting = false;

  const errorFor = (field: HTMLInputElement) =>
    form.querySelector<HTMLElement>(`[data-error-for='${field.id}']`);

  const messageFor = (field: HTMLInputElement) => {
    const value = field.value.trim();
    if (!value) {
      if (field.name === "nombre") return "Escribe tu nombre.";
      if (field.name === "email") return "Escribe tu email de trabajo.";
      return "Resume el contexto en una línea.";
    }
    if (field.name === "nombre" && value.length < 2) return "Usa al menos 2 caracteres.";
    if (field.name === "email" && field.validity.typeMismatch) return "Usa un email válido, por ejemplo nombre@empresa.com.";
    if (field.name === "contexto" && value.length < 12) return "Añade un poco más de contexto (mínimo 12 caracteres).";
    return "";
  };

  const validateField = (field: HTMLInputElement) => {
    const message = messageFor(field);
    const error = errorFor(field);
    if (error) error.textContent = message;
    if (message) field.setAttribute("aria-invalid", "true");
    else field.removeAttribute("aria-invalid");
    return !message;
  };

  fields.forEach((field) => {
    field.addEventListener("blur", () => validateField(field));
    field.addEventListener("input", () => {
      if (field.getAttribute("aria-invalid") === "true") validateField(field);
      if (formStatus) formStatus.textContent = "";
    });
  });

  const resetSubmitState = () => {
    submitting = false;
    form.removeAttribute("aria-busy");
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.innerHTML = defaultSubmitLabel;
    }
  };

  window.addEventListener("pageshow", resetSubmitState);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submitting) return;

    fields.forEach((field) => {
      field.value = field.value.trim();
    });

    const invalid = fields.filter((field) => !validateField(field));
    if (invalid.length > 0) {
      invalid[0].focus();
      if (formStatus) formStatus.textContent = "Revisa los campos marcados.";
      return;
    }

    submitting = true;
    form.setAttribute("aria-busy", "true");
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Enviando…";
    }
    if (formStatus) formStatus.textContent = "Enviando tu contexto…";
    track("Form Submit Attempt", { form: "contacto" });

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12_000);

    try {
      const body = new URLSearchParams();
      for (const [key, value] of new FormData(form).entries()) {
        if (typeof value === "string") body.append(key, value);
      }

      const response = await fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      try {
        sessionStorage.setItem("contacto-enviado", "true");
      } catch {
        // La confirmación conserva un copy neutro si el navegador bloquea sessionStorage.
      }
      track("Form Submit", { form: "contacto" });
      window.location.assign(form.action);
    } catch (error) {
      resetSubmitState();
      const timedOut = error instanceof DOMException && error.name === "AbortError";
      if (formStatus) {
        formStatus.textContent = timedOut
          ? "El envío tardó demasiado. Revisa tu conexión e inténtalo de nuevo."
          : "No pudimos enviar el formulario. Revisa tu conexión e inténtalo de nuevo.";
      }
      track("Form Submit Failed", { reason: timedOut ? "timeout" : "network" });
    } finally {
      window.clearTimeout(timeout);
    }
  });
}

const confirmation = document.querySelector<HTMLElement>("[data-submission-confirmation]");
if (confirmation) {
  let submitted = false;
  try {
    submitted = sessionStorage.getItem("contacto-enviado") === "true";
    sessionStorage.removeItem("contacto-enviado");
  } catch {
    // El copy por defecto no afirma que hubo un envío.
  }

  if (submitted) {
    const status = confirmation.querySelector<HTMLElement>("[data-confirmation-status]");
    const title = confirmation.querySelector<HTMLElement>("[data-confirmation-title]");
    const copy = confirmation.querySelector<HTMLElement>("[data-confirmation-copy]");
    if (status) status.textContent = "mensaje recibido";
    if (title) title.textContent = "Ya tengo el contexto.";
    if (copy) copy.textContent = "Lo revisaré personalmente. Recibirás una respuesta clara sobre encaje y siguiente paso.";
  }
}

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

const bookingButton = document.querySelector<HTMLButtonElement>("[data-booking-open]");

bookingButton?.addEventListener("click", () => {
  const frame = document.querySelector<HTMLElement>("[data-booking-frame]");
  const status = document.querySelector<HTMLElement>("[data-booking-status]");
  if (!frame || !bookingButton.dataset.bookingUrl || bookingButton.dataset.loading === "true") return;

  try {
    const bookingUrl = new URL(bookingButton.dataset.bookingUrl);
    const isCal = bookingUrl.hostname === "cal.com" || bookingUrl.hostname.endsWith(".cal.com");
    const isCalendly = bookingUrl.hostname === "calendly.com" || bookingUrl.hostname.endsWith(".calendly.com");
    if (bookingUrl.protocol !== "https:" || (!isCal && !isCalendly)) throw new Error("Proveedor inválido");
    if (isCal) bookingUrl.searchParams.set("embed", "true");

    const iframe = document.createElement("iframe");
    iframe.src = bookingUrl.toString();
    iframe.title = "Agenda para reservar una llamada de encaje de 30 minutos";
    iframe.loading = "lazy";
    iframe.tabIndex = 0;
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    iframe.allow = "fullscreen";

    let settled = false;
    const hadButtonFocus = document.activeElement === bookingButton;
    const finishWithError = () => {
      if (settled) return;
      settled = true;
      iframe.remove();
      frame.hidden = true;
      bookingButton.removeAttribute("aria-busy");
      delete bookingButton.dataset.loading;
      if (status) status.textContent = "La agenda no respondió. Usa el enlace directo o inténtalo de nuevo.";
      track("Booking Load Failed", { provider: bookingUrl.hostname });
    };

    const timeout = window.setTimeout(finishWithError, 12_000);
    iframe.addEventListener(
      "load",
      () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        bookingButton.hidden = true;
        bookingButton.removeAttribute("aria-busy");
        delete bookingButton.dataset.loading;
        if (status) status.textContent = "Agenda lista.";
        track("Booking Loaded", { provider: bookingUrl.hostname });
        if (hadButtonFocus) iframe.focus({ preventScroll: true });
      },
      { once: true },
    );
    iframe.addEventListener("error", finishWithError, { once: true });

    frame.replaceChildren(iframe);
    frame.hidden = false;
    bookingButton.dataset.loading = "true";
    bookingButton.setAttribute("aria-busy", "true");
    if (status) status.textContent = "Cargando agenda…";
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    frame.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  } catch {
    if (status) status.textContent = "La URL de agenda no es válida. Usa el formulario alternativo.";
    track("Booking Load Failed", { provider: "invalid" });
  }
});

export {};
