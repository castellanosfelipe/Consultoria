import { initMotion } from "./motion";

declare global {
  interface Window {
    plausible?: ((
      event: string,
      options?: { props?: Record<string, string> },
    ) => void) & {
      q?: unknown[];
    };
  }
}

type Plausible = NonNullable<Window["plausible"]>;

const fallbackPlausible = ((
  event: string,
  options?: { props?: Record<string, string> },
) => {
  (fallbackPlausible.q ||= []).push([event, options]);
}) as Plausible;

window.plausible ||= fallbackPlausible;

const isEnglish = document.documentElement.lang.toLowerCase().startsWith("en");
const ui = isEnglish
  ? {
      menu: "Menu",
      close: "Close",
      requiredName: "Enter your name.",
      requiredEmail: "Enter your work email.",
      requiredContext: "Summarize the context in one line.",
      shortName: "Use at least 2 characters.",
      invalidEmail: "Enter a valid email, for example name@company.com.",
      shortContext: "Add a little more context. Use at least 12 characters.",
      reviewFields: "Review the highlighted fields.",
      sending: "Sending…",
      sendingContext: "Sending your context…",
      sent: "Context sent",
      receivedOpening: "Context received. Opening confirmation…",
      timeout: "The request took too long. Check your connection and try again.",
      network: "We could not send the form. Check your connection and try again.",
      confirmationStatus: "message received",
      confirmationTitle: "I have the context.",
      confirmationCopy: "I will review it personally. You will receive a clear answer about fit and next steps.",
      invalidProvider: "Invalid provider",
      calendarTitle: "Calendar to book a 30 minute fit call",
      calendarFailure: "The calendar did not respond. Use the direct link or try again.",
      calendarReady: "Calendar ready.",
      calendarLoading: "Loading calendar…",
      invalidCalendar: "The calendar URL is not valid. Use the alternate form.",
    }
  : {
      menu: "Menú",
      close: "Cerrar",
      requiredName: "Escribe tu nombre.",
      requiredEmail: "Escribe tu correo de trabajo.",
      requiredContext: "Resume el contexto en una línea.",
      shortName: "Usa al menos 2 caracteres.",
      invalidEmail: "Usa un correo válido, por ejemplo nombre@empresa.com.",
      shortContext: "Añade un poco más de contexto. Usa al menos 12 caracteres.",
      reviewFields: "Revisa los campos marcados.",
      sending: "Enviando…",
      sendingContext: "Enviando tu contexto…",
      sent: "Contexto enviado",
      receivedOpening: "Contexto recibido. Abriendo la confirmación…",
      timeout: "El envío tardó demasiado. Revisa tu conexión e inténtalo de nuevo.",
      network: "No pudimos enviar el formulario. Revisa tu conexión e inténtalo de nuevo.",
      confirmationStatus: "mensaje recibido",
      confirmationTitle: "Ya tengo el contexto.",
      confirmationCopy: "Lo revisaré personalmente. Recibirás una respuesta clara sobre encaje y siguiente paso.",
      invalidProvider: "Proveedor inválido",
      calendarTitle: "Agenda para reservar una llamada de encaje de 30 minutos",
      calendarFailure: "La agenda no respondió. Usa el enlace directo o inténtalo de nuevo.",
      calendarReady: "Agenda lista.",
      calendarLoading: "Cargando agenda…",
      invalidCalendar: "La URL de agenda no es válida. Usa el formulario alternativo.",
    };

const basePath = document.documentElement.dataset.basePath || "/";
const configuredHomePath = document.documentElement.dataset.homePath || basePath;
const homePath = new URL(configuredHomePath, window.location.origin).pathname;
const isHomePath = (pathname: string) =>
  pathname === homePath ||
  (homePath !== "/" && pathname === homePath.replace(/\/$/, ""));

const plausibleDomain = document.querySelector<HTMLMetaElement>(
  "meta[name='plausible-domain']",
)?.content;
const plausibleSrc = document.querySelector<HTMLMetaElement>(
  "meta[name='plausible-src']",
)?.content;

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

initMotion({
  onReveal: (element) => {
    const event = element.dataset.trackView;
    if (!event) return;
    track(event, {
      section: element.dataset.trackSection || element.id || "unknown",
    });
  },
});

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const tracked = target.closest<HTMLElement>("[data-track='cta']");
  if (tracked) {
    track("CTA Click", { location: tracked.dataset.location || "unknown" });
  }
});

document.querySelectorAll<HTMLAnchorElement>("[data-language-link]").forEach((link) => {
  link.addEventListener("click", () => {
    if (!window.location.hash) return;
    const destination = new URL(link.href, window.location.href);
    destination.hash = window.location.hash;
    link.href = destination.toString();
  });
});

const navigation = document.querySelector<HTMLElement>(".site-nav");
const scrollHeader = document.querySelector<HTMLElement>(
  "[data-scroll-header]",
);
const menuToggle =
  document.querySelector<HTMLButtonElement>("[data-menu-toggle]");
const mobileMenu = document.querySelector<HTMLElement>("[data-mobile-menu]");
const menuLabel = menuToggle?.querySelector<HTMLElement>("[data-menu-label]");
const menuReduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let headerFrame = 0;
const updateScrolledHeader = () => {
  headerFrame = 0;
  scrollHeader?.classList.toggle("is-scrolled", window.scrollY > 12);
  const scrollRange = Math.max(
    document.documentElement.scrollHeight - window.innerHeight,
    1,
  );
  const progress = Math.min(Math.max(window.scrollY / scrollRange, 0), 1);
  scrollHeader?.style.setProperty("--page-scroll-progress", String(progress));
};
const scheduleScrolledHeader = () => {
  if (headerFrame) return;
  headerFrame = window.requestAnimationFrame(updateScrolledHeader);
};
// En la carga inicial la página está arriba y el progreso ya es cero. Evitar
// leer scrollHeight aquí ahorra un layout completo antes del primer paint.
scrollHeader?.style.setProperty("--page-scroll-progress", "0");
window.addEventListener("scroll", scheduleScrolledHeader, { passive: true });
window.addEventListener("pageshow", (event) => {
  // bfcache y enlaces con ancla pueden restaurar una posición distinta de cero.
  if (event.persisted || window.scrollY > 12) scheduleScrolledHeader();
});

let menuCloseTimer = 0;
const closeMenu = (restoreFocus = false) => {
  if (!menuToggle || !mobileMenu) return;
  window.clearTimeout(menuCloseTimer);
  const wasHidden = mobileMenu.hidden;
  mobileMenu.classList.remove("is-open");
  mobileMenu.setAttribute("aria-hidden", "true");
  mobileMenu.inert = true;
  menuToggle.setAttribute("aria-expanded", "false");
  if (menuLabel) menuLabel.textContent = ui.menu;
  if (restoreFocus) menuToggle.focus();

  const finish = () => {
    mobileMenu.hidden = true;
    menuCloseTimer = 0;
  };
  if (wasHidden || menuReduceMotion.matches) finish();
  else menuCloseTimer = window.setTimeout(finish, 300);
};

menuToggle?.addEventListener("click", () => {
  if (!mobileMenu) return;
  const willOpen = menuToggle.getAttribute("aria-expanded") !== "true";
  if (!willOpen) {
    closeMenu();
    return;
  }

  window.clearTimeout(menuCloseTimer);
  mobileMenu.hidden = false;
  mobileMenu.inert = false;
  mobileMenu.setAttribute("aria-hidden", "false");
  menuToggle.setAttribute("aria-expanded", "true");
  if (menuLabel) menuLabel.textContent = ui.close;
  // Un único layout read garantiza que opacity tenga un frame inicial visible.
  void mobileMenu.offsetWidth;
  mobileMenu.classList.add("is-open");
});

mobileMenu?.addEventListener("click", (event) => {
  if (event.target instanceof Element && event.target.closest("a")) closeMenu();
});

document.addEventListener("click", (event) => {
  if (!(event.target instanceof Node) || navigation?.contains(event.target))
    return;
  closeMenu();
});

document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape" &&
    menuToggle?.getAttribute("aria-expanded") === "true"
  ) {
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
    const isCurrent =
      isHomePath(window.location.pathname) &&
      linkUrl.pathname === homePath &&
      linkUrl.hash === hash;
    if (isCurrent) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  }
};

if (isHomePath(window.location.pathname)) {
  if (window.location.hash) setActiveSection(window.location.hash);

  const observedSections = [
    ...new Set(sectionLinks.map((link) => new URL(link.href).hash.slice(1))),
  ]
    .map((id) => document.getElementById(id))
    .filter((section): section is HTMLElement => Boolean(section));

  let activeFrame = 0;
  let hashTimer = 0;
  let hashNavigationDeadline = window.location.hash
    ? performance.now() + 500
    : 0;
  const updateActiveSection = () => {
    activeFrame = 0;
    const hashNavigationRemaining = hashNavigationDeadline - performance.now();
    if (window.location.hash && hashNavigationRemaining > 0) {
      setActiveSection(window.location.hash);
      window.clearTimeout(hashTimer);
      hashTimer = window.setTimeout(
        scheduleActiveSection,
        hashNavigationRemaining + 20,
      );
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
    if (activeFrame) return;
    activeFrame = window.requestAnimationFrame(updateActiveSection);
  };

  window.addEventListener("scroll", scheduleActiveSection, { passive: true });
  window.addEventListener("resize", scheduleActiveSection);
  window.addEventListener("hashchange", () => {
    hashNavigationDeadline = performance.now() + 500;
    setActiveSection(window.location.hash);
    scheduleActiveSection();
  });
  window.addEventListener("pageshow", (event) => {
    if (window.location.hash) {
      hashNavigationDeadline = performance.now() + 500;
      setActiveSection(window.location.hash);
      scheduleActiveSection();
    } else if (event.persisted) {
      // Solo una página restaurada necesita medir secciones antes de otro scroll.
      scheduleActiveSection();
    }
  });
  if (window.location.hash) scheduleActiveSection();
  else setActiveSection("");
}

const faq = document.querySelector<HTMLElement>("[data-faq]");
const faqItems = Array.from(
  faq?.querySelectorAll<HTMLElement>("[data-faq-item]") || [],
);

const setFaqItem = (item: HTMLElement, open: boolean) => {
  const button = item.querySelector<HTMLButtonElement>("[data-faq-toggle]");
  const panel = item.querySelector<HTMLElement>("[data-faq-panel]");
  item.classList.toggle("is-open", open);
  button?.setAttribute("aria-expanded", String(open));
  panel?.setAttribute("aria-hidden", String(!open));
};

if (faq && faqItems.length > 0) {
  // El acordeón obtiene su estado interactivo antes del primer paint y no
  // depende de la activación diferida de los reveals de scroll.
  document.documentElement.classList.add("faq-ready");
  faqItems.forEach((item) => setFaqItem(item, false));
  faq.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>("[data-faq-toggle]");
    const item = button?.closest<HTMLElement>("[data-faq-item]");
    if (!button || !item) return;

    const willOpen = button.getAttribute("aria-expanded") !== "true";
    faqItems.forEach((candidate) =>
      setFaqItem(candidate, candidate === item && willOpen),
    );
  });
}

const form = document.querySelector<HTMLFormElement>("[data-contact-form]");

if (form) {
  form.noValidate = true;
  const fields = Array.from(
    form.querySelectorAll<HTMLInputElement>("input:not([type='hidden'])"),
  );
  const submitButton =
    form.querySelector<HTMLButtonElement>("[data-form-submit]");
  const formStatus = form.querySelector<HTMLElement>("[data-form-status]");
  const defaultSubmitLabel = submitButton?.innerHTML || "";
  let submitting = false;

  const errorFor = (field: HTMLInputElement) =>
    form.querySelector<HTMLElement>(`[data-error-for='${field.id}']`);

  const messageFor = (field: HTMLInputElement) => {
    const value = field.value.trim();
    if (!value) {
      if (field.name === "nombre") return ui.requiredName;
      if (field.name === "email") return ui.requiredEmail;
      return ui.requiredContext;
    }
    if (field.name === "nombre" && value.length < 2)
      return ui.shortName;
    if (field.name === "email" && field.validity.typeMismatch)
      return ui.invalidEmail;
    if (field.name === "contexto" && value.length < 12)
      return ui.shortContext;
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
      delete submitButton.dataset.state;
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
      if (formStatus) formStatus.textContent = ui.reviewFields;
      return;
    }

    submitting = true;
    form.setAttribute("aria-busy", "true");
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = ui.sending;
      submitButton.dataset.state = "loading";
    }
    if (formStatus) formStatus.textContent = ui.sendingContext;
    track("Form Submit Attempt", { form: "contacto" });

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12_000);

    try {
      const body = new URLSearchParams();
      for (const [key, value] of new FormData(form).entries()) {
        if (typeof value === "string") body.append(key, value);
      }

      const response = await fetch(form.dataset.submitUrl || homePath, {
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
      form.removeAttribute("aria-busy");
      if (submitButton) {
        submitButton.dataset.state = "success";
        submitButton.textContent = ui.sent;
      }
      if (formStatus)
        formStatus.textContent = ui.receivedOpening;
      // La pausa permite que el estado y el anuncio live se perciban; no es movimiento.
      await new Promise((resolve) => window.setTimeout(resolve, 650));
      window.location.assign(form.action);
    } catch (error) {
      resetSubmitState();
      const timedOut =
        error instanceof DOMException && error.name === "AbortError";
      if (formStatus) {
        formStatus.textContent = timedOut ? ui.timeout : ui.network;
      }
      track("Form Submit Failed", { reason: timedOut ? "timeout" : "network" });
    } finally {
      window.clearTimeout(timeout);
    }
  });
}

const confirmation = document.querySelector<HTMLElement>(
  "[data-submission-confirmation]",
);
if (confirmation) {
  let submitted = false;
  try {
    submitted = sessionStorage.getItem("contacto-enviado") === "true";
    sessionStorage.removeItem("contacto-enviado");
  } catch {
    // El copy por defecto no afirma que hubo un envío.
  }

  if (submitted) {
    const status = confirmation.querySelector<HTMLElement>(
      "[data-confirmation-status]",
    );
    const title = confirmation.querySelector<HTMLElement>(
      "[data-confirmation-title]",
    );
    const copy = confirmation.querySelector<HTMLElement>(
      "[data-confirmation-copy]",
    );
    if (status) status.textContent = ui.confirmationStatus;
    if (title) title.textContent = ui.confirmationTitle;
    if (copy) copy.textContent = ui.confirmationCopy;
  }
}

const bookingButton = document.querySelector<HTMLButtonElement>(
  "[data-booking-open]",
);

bookingButton?.addEventListener("click", () => {
  const frame = document.querySelector<HTMLElement>("[data-booking-frame]");
  const status = document.querySelector<HTMLElement>("[data-booking-status]");
  if (
    !frame ||
    !bookingButton.dataset.bookingUrl ||
    bookingButton.dataset.loading === "true"
  )
    return;

  try {
    const bookingUrl = new URL(bookingButton.dataset.bookingUrl);
    const isCal =
      bookingUrl.hostname === "cal.com" ||
      bookingUrl.hostname.endsWith(".cal.com");
    const isCalendly =
      bookingUrl.hostname === "calendly.com" ||
      bookingUrl.hostname.endsWith(".calendly.com");
    if (bookingUrl.protocol !== "https:" || (!isCal && !isCalendly))
      throw new Error(ui.invalidProvider);
    if (isCal) {
      bookingUrl.searchParams.set("embed", "true");
      bookingUrl.searchParams.set("locale", isEnglish ? "en" : "es");
    }

    const iframe = document.createElement("iframe");
    iframe.src = bookingUrl.toString();
    iframe.title = ui.calendarTitle;
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
      if (status)
        status.textContent = ui.calendarFailure;
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
        if (status) status.textContent = ui.calendarReady;
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
    if (status) status.textContent = ui.calendarLoading;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    frame.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
  } catch {
    if (status)
      status.textContent = ui.invalidCalendar;
    track("Booking Load Failed", { provider: "invalid" });
  }
});

export {};
