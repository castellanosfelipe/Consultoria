const trimTrailingSlash = (value: string) => value.replace(/\/$/, "");

const siteUrl = trimTrailingSlash(import.meta.env.PUBLIC_SITE_URL || "http://localhost:4321");

export const siteConfig = {
  name: "Felipe Peña",
  shortName: "FP",
  title: "Software interno y automatización de datos | Felipe Peña",
  description:
    "Diseño y construyo software interno y automatizaciones de datos para poner al día operaciones B2B en 8–16 semanas.",
  siteUrl,
  locale: "es_CO",
  language: "es",
  city: "Bogotá",
  country: "CO",
  email: "",
  bookingUrl: import.meta.env.PUBLIC_CAL_URL || "",
  linkedInUrl: import.meta.env.PUBLIC_LINKEDIN_URL || "",
  portraitPath: import.meta.env.PUBLIC_PORTRAIT_PATH || "",
  plausibleDomain: import.meta.env.PUBLIC_PLAUSIBLE_DOMAIN || "",
  plausibleSrc:
    import.meta.env.PUBLIC_PLAUSIBLE_SRC ||
    "https://plausible.io/js/script.js",
  ogImage: "/images/og-felipe-pena.png",
} as const;
