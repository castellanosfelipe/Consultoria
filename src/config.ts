const trimTrailingSlash = (value: string) => value.replace(/\/$/, "");
const env = (value: string | undefined) => value?.trim() || "";
const ensureTrailingSlash = (value: string) => (value.endsWith("/") ? value : `${value}/`);

const siteUrl = trimTrailingSlash(env(import.meta.env.PUBLIC_SITE_URL) || "http://localhost:4321");
export const basePath = ensureTrailingSlash(import.meta.env.BASE_URL || "/");
export const withBasePath = (path = "/") => {
  const relativePath = path.replace(/^\/+/, "");
  return relativePath ? `${basePath}${relativePath}` : basePath;
};

const configuredPortraitPath = env(import.meta.env.PUBLIC_PORTRAIT_PATH);
const portraitPath = configuredPortraitPath || "/images/felipe-pena.webp";
const plausibleSrc = env(import.meta.env.PUBLIC_PLAUSIBLE_SRC) || "https://plausible.io/js/script.js";

export const siteConfig = {
  name: "Felipe Peña",
  shortName: "FP",
  title: "Software interno y automatización de datos | Felipe Peña",
  description:
    "Diseñamos y construimos software interno, automatizaciones de datos e integraciones con IA para poner al día operaciones B2B entre 4 y 8 semanas.",
  siteUrl,
  locale: "es_CO",
  language: "es",
  email: env(import.meta.env.PUBLIC_CONTACT_EMAIL) || "hola@felipepena.co",
  basePath,
  bookingUrl: env(import.meta.env.PUBLIC_CAL_URL),
  formEndpoint: env(import.meta.env.PUBLIC_FORM_ENDPOINT),
  linkedInUrl: env(import.meta.env.PUBLIC_LINKEDIN_URL),
  portraitPath: withBasePath(portraitPath),
  portraitAvifPath: configuredPortraitPath
    ? ""
    : withBasePath("/images/felipe-pena.avif"),
  plausibleDomain: env(import.meta.env.PUBLIC_PLAUSIBLE_DOMAIN),
  plausibleSrc: plausibleSrc.startsWith("/") ? withBasePath(plausibleSrc) : plausibleSrc,
  vercelAnalytics: env(import.meta.env.PUBLIC_VERCEL_ANALYTICS) === "true",
  ogImage: withBasePath("/images/og-felipe-pena.png"),
} as const;
