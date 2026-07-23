import { initMotion } from "./motion";
import { initScrollThread } from "./scroll-thread";

declare global {
  interface Window {
    plausible?: ((
      event: string,
      options?: { props?: Record<string, string> },
    ) => void) & {
      q?: unknown[];
    };
    va?: (...args: unknown[]) => void;
    vaq?: unknown[];
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
      invalidPhone: "Enter a valid phone number (7 to 11 digits).",
      shortContext: "Add a little more context. Use at least 12 characters.",
      reviewFields: "Review the highlighted fields.",
      sending: "Sending…",
      sendingContext: "Sending your context…",
      sent: "Context sent",
      receivedOpening: "Context received. Opening confirmation…",
      timeout: "The request took too long. Check your connection and try again.",
      network: "We could not send the form. Check your connection and try again, or send it by email:",
      serverError: "The server did not accept the submission. Send it by email instead, your message is ready:",
      sendByEmail: "Send by email",
      mailtoSubject: "Operational context",
      confirmationStatus: "message received",
      confirmationTitle: "We have the context.",
      confirmationCopy: "We reply within 1 business day with a proposed time for the 30 minute call. If you want a head start, have in mind: which process hurts the most, which systems are involved and who operates it.",
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
      invalidPhone: "Escribe un teléfono válido (entre 7 y 11 dígitos).",
      shortContext: "Añade un poco más de contexto. Usa al menos 12 caracteres.",
      reviewFields: "Revisa los campos marcados.",
      sending: "Enviando…",
      sendingContext: "Enviando tu contexto…",
      sent: "Contexto enviado",
      receivedOpening: "Contexto recibido. Abriendo la confirmación…",
      timeout: "El envío tardó demasiado. Revisa tu conexión e inténtalo de nuevo.",
      network: "No pudimos enviar el formulario. Revisa tu conexión e inténtalo de nuevo, o envíalo por correo:",
      serverError: "El servidor no aceptó el envío. Envíalo por correo, tu mensaje ya queda listo:",
      sendByEmail: "Enviar por correo",
      mailtoSubject: "Contexto operativo",
      confirmationStatus: "mensaje recibido",
      confirmationTitle: "Ya tenemos el contexto.",
      confirmationCopy: "Te respondemos en 1 día hábil con una propuesta de horario para la llamada de 30 minutos. Si quieres adelantar, ten presente: qué proceso duele más, qué sistemas intervienen y quién lo opera.",
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

// Vercel Web Analytics: si el script está presente, los eventos también se
// duplican ahí. El stub encola llamadas hasta que el script cargue.
const vercelAnalytics = Boolean(
  document.querySelector("script[data-vercel-analytics]"),
);
if (vercelAnalytics) {
  window.va ||= (...args: unknown[]) => {
    (window.vaq ||= []).push(args);
  };
}

const track = (event: string, props?: Record<string, string>) => {
  window.plausible?.(event, props ? { props } : undefined);
  if (vercelAnalytics) window.va?.("event", { name: event, data: props });
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

// Entrada por ancla: content-visibility estima alturas y el scroll nativo puede
// aterrizar en la sección equivocada con los reveals aún ocultos. Se renderiza
// el destino y todo lo anterior, se muestra sin stagger y se corrige el scroll.
const revealHashTarget = (correctScroll: boolean) => {
  const hash = window.location.hash;
  if (!hash || hash.length < 2) return;
  let target: HTMLElement | null = null;
  try {
    target = document.querySelector<HTMLElement>(hash);
  } catch {
    return;
  }
  if (!target) return;

  const section = target.closest<HTMLElement>("[data-scroll-section]") || target;
  document.querySelectorAll<HTMLElement>(".section").forEach((candidate) => {
    const follows =
      candidate === section ||
      Boolean(candidate.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING);
    if (follows) candidate.style.contentVisibility = "visible";
  });

  section.classList.add("is-visible");
  section
    .querySelectorAll<HTMLElement>("[data-animate]")
    .forEach((element) => element.classList.add("is-visible"));
  section
    .querySelectorAll<HTMLElement>("[data-animate-item]")
    .forEach((element) => {
      element.style.setProperty("--motion-sequence-delay", "0ms");
      element.classList.add("is-item-visible");
    });

  const align = () => target?.scrollIntoView({ behavior: "auto", block: "start" });
  const misaligned = () => {
    if (!target) return false;
    const padding =
      Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    return Math.abs(target.getBoundingClientRect().top - padding) > 8;
  };

  if (correctScroll) {
    // El re-scroll del navegador al fragmento en load respeta scroll-behavior:
    // smooth y convierte la llegada en un planeo de ~1,5 s. En la entrada
    // externa el usuario quiere el destino, no la coreografía: instantáneo.
    const root = document.documentElement;
    const previousBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    align();
    window.requestAnimationFrame(() => window.requestAnimationFrame(align));
    window.setTimeout(() => {
      if (misaligned()) align();
    }, 250);
    window.setTimeout(() => {
      root.style.scrollBehavior = previousBehavior;
    }, 600);
  } else {
    // Navegación interna: el scroll suave nativo sigue al mando; solo se
    // verifica el punto de llegada cuando la animación ya terminó.
    window.setTimeout(() => {
      if (misaligned()) align();
    }, 800);
  }
};

revealHashTarget(true);
window.addEventListener("hashchange", () => revealHashTarget(false));

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

type CurrencyCode = "COP" | "MXN" | "PEN" | "USD";
type CurrencyValueKind = "card" | "sentence";

interface CachedExchangeRates {
  fetchedAt: number;
  updatedAt: number;
  rates: Record<CurrencyCode, number>;
}

const currencyStorageKey = "consultoria-country-currency";
const exchangeCacheKey = "consultoria-cop-exchange-rates-v1";
const exchangeEndpoint = "https://open.er-api.com/v6/latest/COP";
const exchangeCacheTtl = 24 * 60 * 60 * 1_000;
const currencyCountries: Record<CurrencyCode, string> = {
  COP: "CO",
  MXN: "MX",
  PEN: "PE",
  USD: "US",
};
// Indicativo telefónico por defecto según la moneda. USD no tiene país propio
// en el selector, así que reutiliza Colombia como base editable.
const currencyDialCodes: Record<CurrencyCode, string> = {
  COP: "+57",
  MXN: "+52",
  PEN: "+51",
  USD: "+57",
};
const isCurrencyCode = (value: string | null): value is CurrencyCode =>
  value !== null && Object.prototype.hasOwnProperty.call(currencyCountries, value);
const currencySelectors = Array.from(
  document.querySelectorAll<HTMLSelectElement>("[data-currency-select]"),
);
const currencyValues = Array.from(
  document.querySelectorAll<HTMLElement>("[data-currency-value]"),
);
const currencyFields = Array.from(
  document.querySelectorAll<HTMLInputElement>("[data-currency-field]"),
);
const countryFields = Array.from(
  document.querySelectorAll<HTMLInputElement>("[data-country-field]"),
);
const dialSelects = Array.from(
  document.querySelectorAll<HTMLSelectElement>("[data-dial-select]"),
);
// El indicativo sigue a la moneda hasta que la persona lo elige a mano; a
// partir de ahí respetamos su elección aunque cambie de moneda.
let dialTouched = false;
const diagnosisReferenceFields = Array.from(
  document.querySelectorAll<HTMLInputElement>(
    "[data-diagnosis-reference-field]",
  ),
);

const locale = isEnglish ? "en-US" : "es-CO";
const numberFormatter = new Intl.NumberFormat(locale, {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});
const validRates = (
  rates: Partial<Record<CurrencyCode, unknown>> | undefined,
): rates is Record<CurrencyCode, number> =>
  Boolean(
    rates &&
      (["COP", "MXN", "PEN", "USD"] as CurrencyCode[]).every(
        (currency) =>
          typeof rates[currency] === "number" &&
          Number.isFinite(rates[currency]) &&
          Number(rates[currency]) > 0,
      ) &&
      rates.COP === 1,
  );

const readCachedExchangeRates = (): CachedExchangeRates | null => {
  try {
    const raw = localStorage.getItem(exchangeCacheKey);
    if (!raw) return null;
    const cached = JSON.parse(raw) as Partial<CachedExchangeRates>;
    if (
      !Number.isFinite(cached.fetchedAt) ||
      !Number.isFinite(cached.updatedAt) ||
      !validRates(cached.rates)
    ) {
      return null;
    }
    return cached as CachedExchangeRates;
  } catch {
    return null;
  }
};

const writeCachedExchangeRates = (rates: CachedExchangeRates) => {
  try {
    localStorage.setItem(exchangeCacheKey, JSON.stringify(rates));
  } catch {
    // La conversión sigue disponible durante la sesión si no hay almacenamiento.
  }
};

let exchangeRatesRequest: Promise<CachedExchangeRates | null> | null = null;
const loadExchangeRates = () => {
  if (exchangeRatesRequest) return exchangeRatesRequest;

  const cached = readCachedExchangeRates();
  if (cached && Date.now() - cached.fetchedAt < exchangeCacheTtl) {
    exchangeRatesRequest = Promise.resolve(cached);
    return exchangeRatesRequest;
  }

  exchangeRatesRequest = (async () => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 6_000);

    try {
      const response = await fetch(exchangeEndpoint, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("exchange-rate-response");

      const payload = (await response.json()) as {
        result?: string;
        base_code?: string;
        time_last_update_unix?: number;
        rates?: Partial<Record<CurrencyCode, unknown>>;
      };
      if (
        payload.result !== "success" ||
        payload.base_code !== "COP" ||
        !validRates(payload.rates)
      ) {
        throw new Error("exchange-rate-payload");
      }

      const live: CachedExchangeRates = {
        fetchedAt: Date.now(),
        updatedAt: Number.isFinite(payload.time_last_update_unix)
          ? Number(payload.time_last_update_unix) * 1_000
          : Date.now(),
        rates: payload.rates,
      };
      writeCachedExchangeRates(live);
      return live;
    } catch {
      return cached;
    } finally {
      window.clearTimeout(timeout);
    }
  })();

  return exchangeRatesRequest;
};

const currencyKindFor = (element: HTMLElement): CurrencyValueKind =>
  element.dataset.currencyKind === "sentence" ? "sentence" : "card";

const syncDiagnosisReference = () => {
  const reference = currencyValues.find(
    (element) => currencyKindFor(element) === "card",
  )?.textContent;
  if (!reference) return;
  diagnosisReferenceFields.forEach((field) => {
    field.value = reference.trim();
  });
};

const renderCop = () => {
  currencyValues.forEach((element) => {
    const value = element.dataset.cop;
    if (value) element.textContent = value;
    element.removeAttribute("aria-busy");
  });
  syncDiagnosisReference();
};

const renderRateLoading = (currency: CurrencyCode) => {
  // El valor base en COP nunca desaparece: la conversión se añade como contexto.
  currencyValues.forEach((element) => {
    const base = element.dataset.cop || "";
    element.setAttribute("aria-busy", "true");
    element.textContent =
      currencyKindFor(element) === "sentence"
        ? isEnglish
          ? `${base} (calculating the ${currency} equivalent…)`
          : `${base} (calculando la equivalencia en ${currency}…)`
        : `${base} · ≈ ${currency} …`;
  });
  syncDiagnosisReference();
};

const renderEquivalent = (currency: CurrencyCode, rate: number) => {
  currencyValues.forEach((element) => {
    const baseMin = Number(element.dataset.baseMin);
    const baseMax = Number(element.dataset.baseMax);
    if (!Number.isFinite(baseMin) || !Number.isFinite(baseMax)) return;

    const base = element.dataset.cop || "";
    const minimum = numberFormatter.format(Math.round(baseMin * rate));
    const maximum = numberFormatter.format(Math.round(baseMax * rate));
    element.textContent =
      currencyKindFor(element) === "sentence"
        ? isEnglish
          ? `${base} (≈ ${currency} ${minimum} to ${maximum}, today’s rate)`
          : `${base} (≈ ${currency} ${minimum} a ${maximum}, tasa del día)`
        : isEnglish
          ? `${base} · ≈ ${currency} ${minimum} to ${maximum}`
          : `${base} · ≈ ${currency} ${minimum} a ${maximum}`;
    element.removeAttribute("aria-busy");
  });
  syncDiagnosisReference();
};

let activeCurrency: CurrencyCode = "COP";
const refreshEquivalent = async (currency: CurrencyCode) => {
  if (currency === "COP" || currencyValues.length === 0) return;
  const result = await loadExchangeRates();
  if (activeCurrency !== currency) return;

  const rate = result?.rates[currency];
  if (!result || !Number.isFinite(rate) || Number(rate) <= 0) {
    renderCop();
    return;
  }

  renderEquivalent(currency, Number(rate));
};

const applyCurrency = (
  currency: CurrencyCode,
  persist = false,
  refreshRate = true,
) => {
  activeCurrency = currency;
  document.documentElement.dataset.currency = currency;
  currencySelectors.forEach((selector) => {
    selector.value = currency;
  });
  if (currency === "COP") renderCop();
  else renderRateLoading(currency);
  currencyFields.forEach((field) => {
    field.value = currency;
  });
  countryFields.forEach((field) => {
    field.value = currencyCountries[currency];
  });
  if (!dialTouched) {
    const dial = currencyDialCodes[currency];
    dialSelects.forEach((select) => {
      select.value = dial;
    });
  }

  if (currency !== "COP" && refreshRate) void refreshEquivalent(currency);

  if (!persist) return;
  try {
    localStorage.setItem(currencyStorageKey, currency);
  } catch {
    // El selector sigue funcionando durante la sesión si el almacenamiento está bloqueado.
  }
  track("Currency Changed", {
    country: currencyCountries[currency],
    currency,
  });
};

let initialCurrency: CurrencyCode = "COP";
try {
  const storedCurrency = localStorage.getItem(currencyStorageKey);
  if (isCurrencyCode(storedCurrency)) initialCurrency = storedCurrency;
} catch {
  // COP permanece como valor seguro cuando el navegador bloquea localStorage.
}
applyCurrency(initialCurrency, false, false);

// Una preferencia extranjera guardada se actualiza después de load para no
// competir por red con el LCP. Un cambio explícito del selector sí es inmediato.
if (initialCurrency !== "COP" && currencyValues.length > 0) {
  const refreshInitialCurrency = () => {
    window.setTimeout(() => void refreshEquivalent(initialCurrency), 0);
  };
  if (document.readyState === "complete") refreshInitialCurrency();
  else window.addEventListener("load", refreshInitialCurrency, { once: true });
}

currencySelectors.forEach((selector) => {
  selector.addEventListener("change", () => {
    const currency = isCurrencyCode(selector.value) ? selector.value : "COP";
    applyCurrency(currency, true);
  });
});

dialSelects.forEach((select) => {
  select.addEventListener("change", () => {
    dialTouched = true;
    // Todos los selectores comparten el mismo indicativo elegido a mano.
    dialSelects.forEach((other) => {
      other.value = select.value;
    });
    track("Dial Code Changed", { dial: select.value });
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
const scrollThread = initScrollThread();

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
  scrollThread.update(progress);
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
      if (field.name === "contexto") return ui.requiredContext;
      // El teléfono es opcional: vacío es válido.
      return "";
    }
    if (field.name === "nombre" && value.length < 2)
      return ui.shortName;
    if (field.name === "email" && field.validity.typeMismatch)
      return ui.invalidEmail;
    if (field.name === "telefono") {
      const digits = value.replace(/\D/g, "");
      if (digits.length < 7 || digits.length > 11) return ui.invalidPhone;
    }
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

  // Inicio de formulario: primer focus en cualquier campo, una vez por página.
  let formStarted = false;
  fields.forEach((field) => {
    field.addEventListener("focus", () => {
      if (formStarted) return;
      formStarted = true;
      track("Form Start", { form: "contacto" });
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

  const contactEmail = form.dataset.contactEmail || "";

  const buildMailto = () => {
    const value = (name: string) =>
      form.querySelector<HTMLInputElement>(`[name='${name}']`)?.value.trim() || "";
    const subject = `${ui.mailtoSubject} · ${value("nombre")}`;
    const telefono = value("telefono");
    const body = [
      `${value("nombre")}`,
      `${value("email")}`,
      telefono ? `${value("indicativo")} ${telefono}`.trim() : null,
      "",
      `${value("contexto")}`,
    ]
      .filter((line) => line !== null)
      .join("\n");
    return `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  // Cuando el envío falla, el mensaje distingue servidor de red y ofrece una
  // vía que siempre funciona: el correo con el contexto ya redactado.
  const showFailure = (message: string) => {
    if (!formStatus) return;
    formStatus.textContent = `${message} `;
    if (!contactEmail) return;
    const link = document.createElement("a");
    link.href = buildMailto();
    link.textContent = ui.sendByEmail;
    formStatus.append(link);
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
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: body.toString(),
        signal: controller.signal,
      });

      if (!response.ok) {
        resetSubmitState();
        showFailure(ui.serverError);
        track("Form Submit Failed", { reason: `http-${response.status}` });
        return;
      }
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
      if (timedOut) {
        if (formStatus) formStatus.textContent = ui.timeout;
      } else {
        showFailure(ui.network);
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
