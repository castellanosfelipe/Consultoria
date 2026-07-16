const trimTrailingSlash = (value: string) => value.replace(/\/$/, "");
const env = (value: string | undefined) => value?.trim() || "";
const ensureTrailingSlash = (value: string) => (value.endsWith("/") ? value : `${value}/`);

const siteUrl = trimTrailingSlash(env(import.meta.env.PUBLIC_SITE_URL) || "http://localhost:4321");
export const basePath = ensureTrailingSlash(import.meta.env.BASE_URL || "/");
export const withBasePath = (path = "/") => {
  const relativePath = path.replace(/^\/+/, "");
  return relativePath ? `${basePath}${relativePath}` : basePath;
};

const portraitPath = env(import.meta.env.PUBLIC_PORTRAIT_PATH);
const plausibleSrc = env(import.meta.env.PUBLIC_PLAUSIBLE_SRC) || "https://plausible.io/js/script.js";

export const siteConfig = {
  name: "Felipe Peña",
  shortName: "FP",
  title: "Software interno y automatización de datos | Felipe Peña",
  description:
    "Diseño y construyo software interno y automatizaciones de datos para poner al día operaciones B2B entre 8 y 16 semanas.",
  siteUrl,
  locale: "es_CO",
  language: "es",
  city: "Bogotá",
  country: "CO",
  email: "",
  basePath,
  bookingUrl: env(import.meta.env.PUBLIC_CAL_URL),
  linkedInUrl: env(import.meta.env.PUBLIC_LINKEDIN_URL),
  portraitPath: portraitPath ? withBasePath(portraitPath) : "",
  plausibleDomain: env(import.meta.env.PUBLIC_PLAUSIBLE_DOMAIN),
  plausibleSrc: plausibleSrc.startsWith("/") ? withBasePath(plausibleSrc) : plausibleSrc,
  ogImage: withBasePath("/images/og-felipe-pena.png"),
} as const;
