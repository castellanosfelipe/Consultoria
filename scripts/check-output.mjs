import { readFile } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const projectDirectory = fileURLToPath(new URL("../", import.meta.url));
const distDirectory = resolve(projectDirectory, "dist");
const failures = [];
let checks = 0;
let publicBasePath = "/";

function check(condition, message) {
  checks += 1;
  if (!condition) failures.push(message);
}

function decodeHtml(value) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function attributes(source) {
  const result = {};
  const pattern = /([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;
  while ((match = pattern.exec(source))) {
    result[match[1].toLowerCase()] = decodeHtml(match[2] ?? match[3] ?? match[4] ?? "");
  }
  return result;
}

function tags(html, name) {
  const pattern = new RegExp(`<${name}\\b([^>]*)>`, "gi");
  const result = [];
  let match;
  while ((match = pattern.exec(html))) result.push({ attrs: attributes(match[1]), raw: match[0] });
  return result;
}

function hasAttribute(attrs, name) {
  return Object.prototype.hasOwnProperty.call(attrs, name);
}

function relIncludes(attrs, value) {
  return (attrs.rel ?? "").toLowerCase().split(/\s+/).includes(value);
}

function metaContent(html, key, value) {
  return tags(html, "meta").find(({ attrs }) => attrs[key]?.toLowerCase() === value.toLowerCase())?.attrs.content;
}

function absoluteHttpUrl(value, label) {
  try {
    const url = new URL(value);
    check(/^https?:$/.test(url.protocol), `${label} debe usar http(s).`);
    return url;
  } catch {
    check(false, `${label} no es una URL absoluta válida: ${value ?? "(ausente)"}`);
    return null;
  }
}

function resolvedHttpUrl(value, base, label) {
  try {
    return absoluteHttpUrl(new URL(value, base).href, label);
  } catch {
    check(false, `${label} no se puede resolver: ${value ?? "(ausente)"}`);
    return null;
  }
}

function stripMarkup(value) {
  return decodeHtml(value.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

function visibleText(html) {
  return stripMarkup(
    html
      .replace(/<!--([\s\S]*?)-->/g, " ")
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " "),
  );
}

function h1Count(html) {
  return [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].filter((match) => stripMarkup(match[1])).length;
}

function isLocalHost(hostname) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return host === "localhost" || host.endsWith(".localhost") || /^127(?:\.\d{1,3}){3}$/.test(host) || host === "::1" || host === "0.0.0.0";
}

function isPlaceholderHost(hostname) {
  const host = hostname.toLowerCase();
  return (
    ["example.com", "example.org", "example.net"].some((domain) => host === domain || host.endsWith(`.${domain}`)) ||
    ["example", "test", "invalid"].some((suffix) => host === suffix || host.endsWith(`.${suffix}`)) ||
    host.includes("tu-dominio")
  );
}

function sameOrigin(url, origin, label) {
  check(Boolean(url) && url.origin === origin, `${label} debe usar el origen ${origin}.`);
}

function normalizeBasePath(raw) {
  const trimmed = (raw || "/").trim();
  if (trimmed === "/") return "/";
  const normalized = trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
  check(/^\/(?:[A-Za-z0-9._~-]+\/)+$/.test(normalized), "PUBLIC_BASE_PATH debe ser una ruta absoluta simple.");
  check(!normalized.split("/").some((segment) => segment === "." || segment === ".."), "PUBLIC_BASE_PATH no puede contener . ni ...");
  return normalized;
}

function withPublicBasePath(pathname) {
  const relativePath = pathname.replace(/^\/+/, "");
  return relativePath ? `${publicBasePath}${relativePath}` : publicBasePath;
}

function flattenSchema(value) {
  if (Array.isArray(value)) return value.flatMap(flattenSchema);
  if (value && typeof value === "object" && Array.isArray(value["@graph"])) return flattenSchema(value["@graph"]);
  return value && typeof value === "object" ? [value] : [];
}

function schemaNodes(html) {
  const nodes = [];
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attrs = attributes(match[1]);
    if (attrs.type?.toLowerCase() !== "application/ld+json") continue;
    try {
      nodes.push(...flattenSchema(JSON.parse(match[2].trim())));
    } catch (error) {
      check(false, `JSON-LD inválido: ${error.message}`);
    }
  }
  return nodes;
}

function typeIncludes(node, type) {
  const types = Array.isArray(node?.["@type"]) ? node["@type"] : [node?.["@type"]];
  return types.includes(type);
}

function isInsideDist(path) {
  const relativePath = relative(distDirectory, path);
  return relativePath === "" || (!relativePath.startsWith(`..${sep}`) && relativePath !== ".." && !relativePath.startsWith(sep));
}

function outputPathFromUrl(url) {
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    check(false, `Ruta URL con codificación inválida: ${url.pathname}`);
    return null;
  }
  const basePrefix = publicBasePath === "/" ? "" : publicBasePath.slice(0, -1);
  if (basePrefix) {
    const insideBase = pathname === basePrefix || pathname.startsWith(`${basePrefix}/`);
    check(insideBase, `La URL ${url.href} no está bajo ${publicBasePath}.`);
    if (!insideBase) return null;
    pathname = pathname.slice(basePrefix.length) || "/";
  }
  const path = resolve(distDirectory, `.${pathname}`);
  check(isInsideDist(path), `La URL ${url.href} sale de dist/.`);
  return isInsideDist(path) ? path : null;
}

async function readRequired(path, label) {
  try {
    return await readFile(path, "utf8");
  } catch {
    check(false, `Falta ${label}: ${relative(projectDirectory, path)}`);
    return "";
  }
}

function parseEnvFile(source) {
  const result = {};
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      const quote = value[0];
      value = value.slice(1, -1);
      if (quote === '"') value = value.replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    } else {
      value = value.replace(/\s+#.*$/, "").trim();
    }
    result[match[1]] = value;
  }
  return result;
}

async function publicEnvironment() {
  const loaded = {};
  for (const filename of [".env", ".env.local", ".env.production", ".env.production.local"]) {
    try {
      Object.assign(loaded, parseEnvFile(await readFile(resolve(projectDirectory, filename), "utf8")));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  return { ...loaded, ...process.env };
}

const env = await publicEnvironment();
publicBasePath = normalizeBasePath(env.PUBLIC_BASE_PATH);
// Un PUBLIC_FORM_ENDPOINT configurado (por ejemplo /api/contact en Vercel)
// reemplaza el POST al base path; ambos idiomas comparten ese endpoint.
const formEndpoint = (env.PUBLIC_FORM_ENDPOINT || "").trim();
const homePath = resolve(distDirectory, "index.html");
const englishHomePath = resolve(distDirectory, "en", "index.html");
const thanksPath = resolve(distDirectory, "gracias", "index.html");
const englishThanksPath = resolve(distDirectory, "en", "thanks", "index.html");
const notFoundPath = resolve(distDirectory, "404.html");
const robotsPath = resolve(distDirectory, "robots.txt");
const deployHeadersPath = resolve(distDirectory, "_headers");
const netlifyConfigPath = resolve(projectDirectory, "netlify.toml");

const [home, englishHome, thanks, englishThanks, notFound, robots, deployHeaders, netlifyConfig] = await Promise.all([
  readRequired(homePath, "la página principal"),
  readRequired(englishHomePath, "la página principal en inglés"),
  readRequired(thanksPath, "la página de gracias"),
  readRequired(englishThanksPath, "la página de confirmación en inglés"),
  readRequired(notFoundPath, "la página 404"),
  readRequired(robotsPath, "robots.txt"),
  readRequired(deployHeadersPath, "dist/_headers"),
  readRequired(netlifyConfigPath, "netlify.toml"),
]);

const proseDashPattern = /[-\u2013\u2014\u2212]/;
for (const [label, html] of [
  ["la home en español", home],
  ["la home en inglés", englishHome],
  ["la confirmación en español", thanks],
  ["la confirmación en inglés", englishThanks],
  ["la página 404", notFound],
]) {
  check(!proseDashPattern.test(visibleText(html)), `La redacción visible de ${label} no debe contener guiones.`);
}

check(h1Count(home) === 1, "La home debe contener exactamente un h1 no vacío.");
check(tags(home, "html")[0]?.attrs.lang === "es", "La home en español debe declarar lang=es.");
check(metaContent(home, "name", "description")?.trim(), "La home debe tener meta description no vacía.");
const homeRobots = (metaContent(home, "name", "robots") ?? "").toLowerCase();
check(homeRobots.includes("index") && !homeRobots.includes("noindex"), "La home debe ser indexable.");

const spanishHomeText = visibleText(home);
const englishHomeText = visibleText(englishHome);
const spanishSectionIds = new Set(tags(home, "section").map(({ attrs }) => attrs.id).filter(Boolean));
check(spanishSectionIds.has("integracion-ia"), "La home debe incluir la sección de integración con IA.");
check(spanishSectionIds.has("industrias"), "La home debe incluir la sección de industrias.");
check(spanishHomeText.includes("4 a 8 semanas"), "La home debe comunicar el plazo de 4 a 8 semanas.");
check(!spanishHomeText.includes("8 a 16 semanas"), "La home no debe conservar el plazo anterior.");
check(!spanishHomeText.includes("Qué no hago"), "La sección Qué no hago debe estar eliminada.");
check(!spanishHomeText.includes("¿Trabajan con cualquier empresa?"), "La pregunta sobre trabajar con cualquier empresa debe estar eliminada.");
check(!/\b(?:PYTHON|TYPESCRIPT|KAFKA|AIRFLOW|PYSPARK|FASTAPI)\b/.test(spanishHomeText), "La home no debe mostrar lenguajes o tecnologías en el pie.");
check(!/\beyebrow\b/.test(home) && !/\beyebrow\b/.test(englishHome), "Las etiquetas previas a los títulos deben estar eliminadas.");
check(englishHomeText.includes("4 to 8 weeks"), "La home en inglés debe comunicar el plazo de 4 a 8 semanas.");
for (const currency of ["MXN", "PEN", "USD"]) {
  const numericForeignPrice = new RegExp(`(?:${currency}\\s*[0-9]|[0-9][0-9.,]*\\s*${currency})`, "i");
  check(!numericForeignPrice.test(`${spanishHomeText} ${englishHomeText}`), `El HTML inicial no debe incrustar una tasa numérica obsoleta en ${currency}.`);
}
check(spanishHomeText.includes("COP 600.000") && spanishHomeText.includes("COP 1.000.000"), "La home debe mostrar únicamente el rango autorizado para el diagnóstico.");
check(!spanishHomeText.includes("Usamos la tasa diaria guardada más reciente"), "La home no debe mostrar el estado extenso de caché de moneda.");
check(spanishHomeText.includes("primera llamada") && spanishHomeText.includes("viable"), "La home debe explicar que la viabilidad se determina en la primera llamada.");
check(!/\bS(?:9|10|11|12)\b/.test(spanishHomeText), "La línea de tiempo española no debe superar la semana 8.");
check(!/\bW(?:9|10|11|12)\b/.test(englishHomeText), "La línea de tiempo inglesa no debe superar la semana 8.");
check(tags(home, "span").filter(({ attrs }) => hasAttribute(attrs, "data-line-icon")).length === 12, "Las secciones de IA e industrias deben incluir doce iconos SVG.");

const homeCanonicalTags = tags(home, "link").filter(({ attrs }) => relIncludes(attrs, "canonical"));
check(homeCanonicalTags.length === 1, "La home debe contener exactamente un canonical.");
const homeCanonical = absoluteHttpUrl(homeCanonicalTags[0]?.attrs.href, "El canonical de la home");
const origin = homeCanonical?.origin ?? null;
check(homeCanonical?.pathname === publicBasePath, `El canonical de la home debe apuntar a ${publicBasePath}.`);

check(h1Count(englishHome) === 1, "La home en inglés debe contener exactamente un h1 no vacío.");
check(tags(englishHome, "html")[0]?.attrs.lang === "en", "La home en inglés debe declarar lang=en.");
check(metaContent(englishHome, "name", "description")?.trim(), "La home en inglés debe tener meta description no vacía.");
const englishRobots = (metaContent(englishHome, "name", "robots") ?? "").toLowerCase();
check(englishRobots.includes("index") && !englishRobots.includes("noindex"), "La home en inglés debe ser indexable.");
const englishCanonicalTags = tags(englishHome, "link").filter(({ attrs }) => relIncludes(attrs, "canonical"));
check(englishCanonicalTags.length === 1, "La home en inglés debe contener exactamente un canonical.");
const englishCanonical = absoluteHttpUrl(englishCanonicalTags[0]?.attrs.href, "El canonical de la home en inglés");
check(englishCanonical?.pathname === withPublicBasePath("/en/"), `El canonical inglés debe apuntar a ${withPublicBasePath("/en/")}.`);
if (origin) sameOrigin(englishCanonical, origin, "Canonical de la home en inglés");

for (const [label, html] of [["español", home], ["inglés", englishHome]]) {
  const alternates = tags(html, "link").filter(({ attrs }) => relIncludes(attrs, "alternate"));
  const byLanguage = (language) => alternates.find(({ attrs }) => attrs.hreflang?.toLowerCase() === language.toLowerCase());
  check(byLanguage("es-CO")?.attrs.href === homeCanonical?.href, `El hreflang es-CO de ${label} debe apuntar a la home española.`);
  check(byLanguage("en")?.attrs.href === englishCanonical?.href, `El hreflang en de ${label} debe apuntar a la home inglesa.`);
  check(byLanguage("x-default")?.attrs.href === homeCanonical?.href, `El hreflang x-default de ${label} debe apuntar a la home española.`);
}

for (const [label, html, expectedCurrent] of [
  ["español", home, publicBasePath],
  ["inglés", englishHome, withPublicBasePath("/en/")],
]) {
  const languageLinks = tags(html, "a").filter(({ attrs }) => hasAttribute(attrs, "data-language-link"));
  check(languageLinks.length === 4, `La home en ${label} debe incluir el selector ES/EN en escritorio y móvil.`);
  check(languageLinks.filter(({ attrs }) => attrs.href === publicBasePath).length === 2, `El selector en ${label} debe enlazar dos veces a español.`);
  check(languageLinks.filter(({ attrs }) => attrs.href === withPublicBasePath("/en/")).length === 2, `El selector en ${label} debe enlazar dos veces a inglés.`);
  check(
    languageLinks.filter(({ attrs }) => attrs["aria-current"] === "page" && attrs.href === expectedCurrent).length === 2,
    `El selector en ${label} debe marcar el idioma actual en ambas variantes.`,
  );
}

for (const [label, html] of [
  ["la home en español", home],
  ["la home en inglés", englishHome],
  ["la confirmación en español", thanks],
  ["la confirmación en inglés", englishThanks],
  ["la página 404", notFound],
]) {
  check(tags(html, "html")[0]?.attrs["data-currency"] === "COP", `${label} debe declarar COP como moneda inicial.`);
  const currencySelectors = tags(html, "select").filter(({ attrs }) => hasAttribute(attrs, "data-currency-select"));
  check(currencySelectors.length === 1, `${label} debe incluir un solo selector global de país y moneda.`);
  check(Boolean(currencySelectors[0]?.attrs["aria-label"]?.trim()), `El selector de moneda de ${label} debe tener nombre accesible.`);

  const currencyOptions = tags(html, "option").filter(({ attrs }) => ["COP", "MXN", "PEN", "USD"].includes(attrs.value));
  check(currencyOptions.length === 4, `El selector de ${label} debe ofrecer COP, MXN, PEN y USD.`);
  check(currencyOptions.filter(({ attrs }) => hasAttribute(attrs, "selected") && attrs.value === "COP").length === 1, `COP debe ser la moneda inicial de ${label}.`);
  for (const [currency, country] of [["COP", "CO"], ["MXN", "MX"], ["PEN", "PE"], ["USD", "US"]]) {
    check(currencyOptions.some(({ attrs }) => attrs.value === currency && attrs["data-country"] === country), `${label} debe asociar ${country} con ${currency}.`);
  }
}

for (const [label, html] of [["español", home], ["inglés", englishHome]]) {
  const currencyValueElements = [...tags(html, "p"), ...tags(html, "span")]
    .filter(({ attrs }) => hasAttribute(attrs, "data-currency-value"));
  check(currencyValueElements.length === 2, `La tarjeta y la FAQ del diagnóstico en ${label} deben responder al selector de moneda.`);
  check(currencyValueElements.filter(({ attrs }) => attrs["data-currency-kind"] === "card").length === 1, `La conversión en ${label} debe identificar una sola tarjeta.`);
  check(currencyValueElements.filter(({ attrs }) => attrs["data-currency-kind"] === "sentence").length === 1, `La conversión en ${label} debe identificar una sola frase de FAQ.`);
  for (const element of currencyValueElements) {
    check(element.attrs["data-base-currency"] === "COP", `Cada conversión en ${label} debe declarar COP como base.`);
    check(element.attrs["data-base-min"] === "600000" && element.attrs["data-base-max"] === "1000000", `Cada conversión en ${label} debe usar únicamente el rango autorizado del diagnóstico.`);
    check(Boolean(element.attrs["data-cop"]?.trim()), `Cada conversión en ${label} debe conservar su texto COP de respaldo.`);
    check(!["data-mxn", "data-pen", "data-usd"].some((attribute) => hasAttribute(element.attrs, attribute)), `Las tasas extranjeras de ${label} no deben quedar hardcodeadas en HTML.`);
  }

  const rateAttributions = tags(html, "a").filter(({ attrs }) => hasAttribute(attrs, "data-rate-attribution"));
  check(rateAttributions.length === 1, `La conversión en ${label} debe atribuir una sola vez la fuente de tasa.`);
  check(rateAttributions[0]?.attrs.href === "https://www.exchangerate-api.com", `La atribución de tasa en ${label} debe enlazar a ExchangeRate API.`);
  check(tags(html, "span").filter(({ attrs }) => hasAttribute(attrs, "data-rate-status")).length === 0, `La conversión en ${label} no debe mostrar un estado extenso de tasa.`);

  const scrollThreads = tags(html, "div").filter(({ attrs }) => hasAttribute(attrs, "data-scroll-thread"));
  const scrollGuidance = tags(html, "div").filter(({ attrs }) => hasAttribute(attrs, "data-scroll-guidance"));
  check(scrollThreads.length === 1, `La home en ${label} debe incluir un solo hilo conductor global.`);
  check(scrollThreads[0] && hasAttribute(scrollThreads[0].attrs, "aria-hidden"), `El hilo conductor de ${label} debe ser decorativo para lectores de pantalla.`);
  check(scrollGuidance.length === 0, `La home en ${label} no debe incluir el conducto decorativo retirado de Proceso.`);
  check(tags(html, "span").filter(({ attrs }) => hasAttribute(attrs, "data-scroll-thread-plane")).length === 1, `El hilo conductor de ${label} debe incluir un solo avión de despliegue.`);
}

check(/\.offer-arrow[^{}]*\{[^{}]*--arrow-rotation:90deg[^{}]*justify-self:center/i.test(home), "Las flechas móviles de la oferta deben quedar centradas y verticales.");

const contentSecurityPolicy = /Content-Security-Policy\s*=\s*"([^"]+)"/i.exec(netlifyConfig)?.[1] ?? "";
const connectSource = /(?:^|;)\s*connect-src\s+([^;]+)/i.exec(contentSecurityPolicy)?.[1] ?? "";
check(connectSource.split(/\s+/).includes("https://open.er-api.com"), "La CSP debe permitir la consulta diferida de tasas en open.er-api.com.");

const stylesheets = tags(home, "link").filter(({ attrs }) => relIncludes(attrs, "stylesheet"));
check(stylesheets.length === 0, "La home no debe bloquear el render con una hoja CSS externa.");
check(/<style\b[^>]*>[\s\S]*?<\/style>/i.test(home), "La home debe integrar su CSS crítico.");
const englishStylesheets = tags(englishHome, "link").filter(({ attrs }) => relIncludes(attrs, "stylesheet"));
check(englishStylesheets.length === 0, "La home en inglés no debe bloquear el render con una hoja CSS externa.");
check(/<style\b[^>]*>[\s\S]*?<\/style>/i.test(englishHome), "La home en inglés debe integrar su CSS crítico.");
check(
  deployHeaders === "# CSS crítico integrado en HTML; no requiere preload.\n",
  "dist/_headers no debe declarar un preload redundante para CSS integrado.",
);

const configuredSite = (env.PUBLIC_SITE_URL || env.URL || "").trim();
let configuredUrl = null;
if (configuredSite) {
  configuredUrl = absoluteHttpUrl(configuredSite, "PUBLIC_SITE_URL/URL");
  if (configuredUrl && !isLocalHost(configuredUrl.hostname)) {
    check(configuredUrl.protocol === "https:", "El sitio no local debe usar HTTPS.");
    check(!isPlaceholderHost(configuredUrl.hostname), "PUBLIC_SITE_URL/URL no puede ser un dominio example ni un marcador TU-DOMINIO en un build no local.");
    check(homeCanonical?.origin === configuredUrl.origin, `El build usa ${homeCanonical?.origin ?? "un origen inválido"}, no el origen configurado ${configuredUrl.origin}.`);
  }
}

const ogRequired = ["og:type", "og:title", "og:description", "og:url", "og:image", "og:image:alt"];
for (const property of ogRequired) {
  check(metaContent(home, "property", property)?.trim(), `Falta ${property} o está vacío.`);
}
const ogUrl = absoluteHttpUrl(metaContent(home, "property", "og:url"), "og:url");
const ogImage = absoluteHttpUrl(metaContent(home, "property", "og:image"), "og:image");
if (origin) {
  sameOrigin(ogUrl, origin, "og:url");
  sameOrigin(ogImage, origin, "og:image");
}
check(ogUrl?.href === homeCanonical?.href, "og:url debe coincidir con el canonical de la home.");

if (ogImage && origin && ogImage.origin === origin) {
  const imagePath = outputPathFromUrl(ogImage);
  if (imagePath) await readRequired(imagePath, "la imagen Open Graph");
}

const schemas = schemaNodes(home);
const services = schemas.filter((node) => typeIncludes(node, "ProfessionalService"));
const people = schemas.filter((node) => typeIncludes(node, "Person"));
check(services.length === 1, "Debe existir exactamente un ProfessionalService en JSON-LD.");
check(people.length === 1, "Debe existir exactamente una Person en JSON-LD.");
const service = services[0];
const person = people[0];

for (const [label, value] of [
  ["ProfessionalService.url", service?.url],
  ["ProfessionalService.@id", service?.["@id"]],
  ["ProfessionalService.image", service?.image],
  ["Person.url", person?.url],
  ["Person.@id", person?.["@id"]],
]) {
  const url = absoluteHttpUrl(value, label);
  if (origin) sameOrigin(url, origin, label);
}
check(service?.founder?.["@id"] === person?.["@id"], "ProfessionalService.founder debe enlazar con Person.@id.");
check(!Object.prototype.hasOwnProperty.call(service ?? {}, "priceRange"), "ProfessionalService no debe publicar un rango de precio para los proyectos.");

for (const [label, html, expectedPath] of [
  ["/gracias/", thanks, withPublicBasePath("/gracias/")],
  ["/en/thanks/", englishThanks, withPublicBasePath("/en/thanks/")],
  ["/404/", notFound, withPublicBasePath("/404/")],
]) {
  check(h1Count(html) === 1, `${label} debe contener exactamente un h1 no vacío.`);
  const robotsMeta = (metaContent(html, "name", "robots") ?? "").toLowerCase();
  check(robotsMeta.includes("noindex"), `${label} debe declarar noindex.`);
  const canonicalTags = tags(html, "link").filter(({ attrs }) => relIncludes(attrs, "canonical"));
  check(canonicalTags.length === 1, `${label} debe contener exactamente un canonical.`);
  const canonical = absoluteHttpUrl(canonicalTags[0]?.attrs.href, `Canonical de ${label}`);
  if (origin) sameOrigin(canonical, origin, `Canonical de ${label}`);
  check(canonical?.pathname === expectedPath, `El canonical de ${label} debe terminar en ${expectedPath}.`);
  const pageOgUrl = absoluteHttpUrl(metaContent(html, "property", "og:url"), `og:url de ${label}`);
  const pageOgImage = absoluteHttpUrl(metaContent(html, "property", "og:image"), `og:image de ${label}`);
  if (origin) {
    sameOrigin(pageOgUrl, origin, `og:url de ${label}`);
    sameOrigin(pageOgImage, origin, `og:image de ${label}`);
  }
  check(pageOgUrl?.href === canonical?.href, `og:url de ${label} debe coincidir con su canonical.`);
}

check(/^\s*User-agent:\s*\*/im.test(robots), "robots.txt debe incluir reglas para User-agent: *.");
check(!/^\s*Disallow:\s*\/\s*$/im.test(robots), "robots.txt no debe bloquear todo el sitio.");
const sitemapDirectives = [...robots.matchAll(/^\s*Sitemap:\s*(\S+)\s*$/gim)].map((match) => match[1]);
check(sitemapDirectives.length === 1, "robots.txt debe declarar exactamente un sitemap.");
const sitemapDirective = sitemapDirectives[0];
const sitemapUrl = absoluteHttpUrl(sitemapDirective, "La directiva Sitemap de robots.txt");
if (origin) sameOrigin(sitemapUrl, origin, "La directiva Sitemap de robots.txt");

const visitedSitemaps = new Set();
const indexedUrls = [];
async function inspectSitemap(url, depth = 0) {
  if (!url || depth > 5 || visitedSitemaps.has(url.href)) return;
  visitedSitemaps.add(url.href);
  if (origin) sameOrigin(url, origin, `Sitemap ${url.pathname}`);
  const path = outputPathFromUrl(url);
  if (!path) return;
  const xml = await readRequired(path, `el sitemap ${url.pathname}`);
  const locations = [...xml.matchAll(/<loc>\s*([\s\S]*?)\s*<\/loc>/gi)].map((match) => decodeHtml(match[1].trim()));
  check(locations.length > 0, `El sitemap ${url.pathname} debe contener al menos un <loc>.`);
  const isIndex = /<sitemapindex\b/i.test(xml);
  for (const location of locations) {
    const child = absoluteHttpUrl(location, `<loc> de ${url.pathname}`);
    if (!child) continue;
    if (origin) sameOrigin(child, origin, `<loc> ${location}`);
    if (isIndex) await inspectSitemap(child, depth + 1);
    else indexedUrls.push(child.href);
  }
}
await inspectSitemap(sitemapUrl);
check(indexedUrls.includes(homeCanonical?.href), "El sitemap debe incluir el canonical de la home.");
check(indexedUrls.includes(englishCanonical?.href), "El sitemap debe incluir el canonical de la home en inglés.");
check(!indexedUrls.some((url) => /\/(?:404|gracias|thanks)\/?$/.test(new URL(url).pathname)), "El sitemap no debe incluir páginas noindex.");

const formMatches = [...home.matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/gi)].map((match) => ({ attrs: attributes(match[1]), body: match[2] }));
const contactForms = formMatches.filter(({ attrs }) => hasAttribute(attrs, "data-contact-form") || attrs.name === "contacto");
check(contactForms.length === 1, "Debe existir exactamente un formulario de contacto.");
const contactForm = contactForms[0];
if (contactForm) {
  check(contactForm.attrs.method?.toLowerCase() === "post", "El formulario de contacto debe usar POST.");
  check(contactForm.attrs["data-netlify"]?.toLowerCase() === "true", "El formulario debe conservar data-netlify=true.");
  const action = resolvedHttpUrl(contactForm.attrs.action, homeCanonical ?? "http://local.invalid/", "Action del formulario");
  if (origin) sameOrigin(action, origin, "Action del formulario");
  check(action?.pathname === withPublicBasePath("/gracias/"), `El formulario debe terminar en ${withPublicBasePath("/gracias/")}.`);
  check(contactForm.attrs["data-submit-url"] === (formEndpoint || publicBasePath), "El formulario debe enviar al endpoint configurado o al base path.");

  const inputs = tags(contactForm.body, "input").map(({ attrs }) => attrs);
  const visibleInputs = inputs.filter((attrs) => (attrs.type ?? "text").toLowerCase() !== "hidden");
  const labelMatches = [...contactForm.body.matchAll(/<label\b([^>]*)>([\s\S]*?)<\/label>/gi)].map((match) => ({
    attrs: attributes(match[1]),
    inputs: tags(match[2], "input").map(({ attrs }) => attrs),
  }));
  check(visibleInputs.length === 3, "El formulario debe pedir exactamente tres campos visibles.");
  const countryField = inputs.filter((attrs) => attrs.name === "country" && hasAttribute(attrs, "data-country-field"));
  const currencyField = inputs.filter((attrs) => attrs.name === "currency" && hasAttribute(attrs, "data-currency-field"));
  const diagnosisReferenceField = inputs.filter((attrs) => attrs.name === "diagnosis_reference" && hasAttribute(attrs, "data-diagnosis-reference-field"));
  check(countryField.length === 1 && countryField[0]?.type === "hidden" && countryField[0]?.value === "CO", "El formulario debe registrar CO como país inicial.");
  check(currencyField.length === 1 && currencyField[0]?.type === "hidden" && currencyField[0]?.value === "COP", "El formulario debe registrar COP como moneda inicial.");
  check(diagnosisReferenceField.length === 1 && diagnosisReferenceField[0]?.type === "hidden" && (diagnosisReferenceField[0]?.value ?? "").includes("COP 600.000"), "El formulario debe registrar la referencia de diagnóstico mostrada.");
  for (const [name, expectedType] of [["nombre", "text"], ["email", "email"], ["contexto", "text"]]) {
    const matches = visibleInputs.filter((attrs) => attrs.name === name);
    check(matches.length === 1, `El formulario debe incluir una sola vez el campo ${name}.`);
    const input = matches[0];
    if (!input) continue;
    check((input.type ?? "text").toLowerCase() === expectedType, `${name} debe usar type=${expectedType}.`);
    check(hasAttribute(input, "required"), `${name} debe ser obligatorio.`);
    check(Number.parseInt(input.maxlength, 10) > 0, `${name} debe limitar su longitud.`);
    const hasLabel = labelMatches.some((label) =>
      (Boolean(input.id) && label.attrs.for === input.id) || label.inputs.some((nestedInput) => nestedInput.name === name),
    );
    check(hasLabel, `${name} debe tener un label asociado.`);
  }
}

const englishFormMatches = [...englishHome.matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/gi)].map((match) => ({ attrs: attributes(match[1]), body: match[2] }));
const englishContactForms = englishFormMatches.filter(({ attrs }) => hasAttribute(attrs, "data-contact-form") || attrs.name === "contacto");
check(englishContactForms.length === 1, "Debe existir exactamente un formulario de contacto en inglés.");
const englishContactForm = englishContactForms[0];
if (englishContactForm) {
  const action = resolvedHttpUrl(englishContactForm.attrs.action, englishCanonical ?? "http://local.invalid/", "Action del formulario inglés");
  if (origin) sameOrigin(action, origin, "Action del formulario inglés");
  check(action?.pathname === withPublicBasePath("/en/thanks/"), `El formulario inglés debe terminar en ${withPublicBasePath("/en/thanks/")}.`);
  check(englishContactForm.attrs["data-submit-url"] === (formEndpoint || withPublicBasePath("/en/")), "El formulario inglés debe enviar al endpoint configurado o a la ruta inglesa.");
  const englishInputs = tags(englishContactForm.body, "input").map(({ attrs }) => attrs);
  check(englishInputs.some((attrs) => attrs.name === "country" && attrs.value === "CO" && hasAttribute(attrs, "data-country-field")), "El formulario inglés debe registrar el país seleccionado.");
  check(englishInputs.some((attrs) => attrs.name === "currency" && attrs.value === "COP" && hasAttribute(attrs, "data-currency-field")), "El formulario inglés debe registrar la moneda seleccionada.");
  check(englishInputs.some((attrs) => attrs.name === "diagnosis_reference" && (attrs.value ?? "").includes("COP 600,000") && hasAttribute(attrs, "data-diagnosis-reference-field")), "El formulario inglés debe registrar la referencia de diagnóstico mostrada.");
}

const scriptTags = tags(home, "script");
const metaTags = tags(home, "meta");
const anchorTags = tags(home, "a");
const inertScriptTypes = new Set(["application/ld+json", "application/json", "importmap", "speculationrules"]);
check(
  !scriptTags.some(({ attrs }) => !attrs.src && !inertScriptTypes.has((attrs.type ?? "").toLowerCase())),
  "La home no debe requerir 'unsafe-inline' para JavaScript ejecutable.",
);
const calUrl = (env.PUBLIC_CAL_URL ?? "").trim();
const bookingButtons = tags(home, "button").filter(({ attrs }) => hasAttribute(attrs, "data-booking-open"));
if (calUrl) {
  check(bookingButtons.length === 1, "PUBLIC_CAL_URL exige un único botón de agenda.");
  check(bookingButtons[0]?.attrs["data-booking-url"] === calUrl, "El botón de agenda no contiene PUBLIC_CAL_URL.");
  check(anchorTags.some(({ attrs }) => attrs.href === calUrl), "Debe existir un enlace directo de respaldo a PUBLIC_CAL_URL.");
} else {
  check(bookingButtons.length === 0, "No debe renderizarse la agenda sin PUBLIC_CAL_URL.");
}

const linkedInUrl = (env.PUBLIC_LINKEDIN_URL ?? "").trim();
const sameAs = Array.isArray(person?.sameAs) ? person.sameAs : person?.sameAs ? [person.sameAs] : [];
if (linkedInUrl) {
  check(anchorTags.some(({ attrs }) => attrs.href === linkedInUrl && relIncludes(attrs, "me")), "PUBLIC_LINKEDIN_URL debe aparecer en un enlace rel=me.");
  check(sameAs.includes(linkedInUrl), "PUBLIC_LINKEDIN_URL debe aparecer en Person.sameAs.");
} else {
  check(sameAs.length === 0, "Person.sameAs no debe inventarse sin PUBLIC_LINKEDIN_URL.");
}

const plausibleDomain = (env.PUBLIC_PLAUSIBLE_DOMAIN ?? "").trim();
const plausibleSrcEnv = (env.PUBLIC_PLAUSIBLE_SRC ?? "").trim();
const plausibleDomainMeta = metaTags.filter(({ attrs }) => attrs.name === "plausible-domain");
const plausibleSrcMeta = metaTags.filter(({ attrs }) => attrs.name === "plausible-src");
if (plausibleDomain) {
  const configuredPlausibleSrc = plausibleSrcEnv || "https://plausible.io/js/script.js";
  const plausibleSrc = configuredPlausibleSrc.startsWith("/") ? withPublicBasePath(configuredPlausibleSrc) : configuredPlausibleSrc;
  check(plausibleDomainMeta.length === 1, "PUBLIC_PLAUSIBLE_DOMAIN exige una única configuración diferida.");
  check(plausibleSrcMeta.length === 1, "PUBLIC_PLAUSIBLE_DOMAIN exige un único origen de script diferido.");
  check(plausibleDomainMeta[0]?.attrs.content === plausibleDomain, "La configuración diferida no coincide con PUBLIC_PLAUSIBLE_DOMAIN.");
  check(plausibleSrcMeta[0]?.attrs.content === plausibleSrc, "El origen diferido de Plausible no coincide con la configuración.");
  check(!scriptTags.some(({ attrs }) => attrs.src === plausibleSrc), "Plausible no debe competir en la carga inicial.");
} else {
  check(!plausibleSrcEnv, "PUBLIC_PLAUSIBLE_SRC requiere PUBLIC_PLAUSIBLE_DOMAIN.");
  check(plausibleDomainMeta.length === 0 && plausibleSrcMeta.length === 0, "No debe configurarse analítica sin PUBLIC_PLAUSIBLE_DOMAIN.");
}

const configuredPortraitPath = (env.PUBLIC_PORTRAIT_PATH ?? "").trim();
const portraitPath = configuredPortraitPath || "/images/felipe-pena.webp";
const deployedPortraitPath = withPublicBasePath(portraitPath);
const portraits = tags(home, "img").filter(({ attrs }) => attrs.src === deployedPortraitPath);
check(portraits.length === 1, "La home debe renderizar exactamente un retrato de Felipe.");
const portrait = portraits[0]?.attrs;
check(Number.parseInt(portrait?.width, 10) > 0 && Number.parseInt(portrait?.height, 10) > 0, "El retrato debe declarar width y height.");
check(portrait?.loading?.toLowerCase() === "lazy", "El retrato fuera del viewport debe usar loading=lazy.");
check(Boolean(portrait?.alt?.trim()), "El retrato debe tener alt real.");
if (!configuredPortraitPath) {
  const deployedAvifPath = withPublicBasePath("/images/felipe-pena.avif");
  check(tags(home, "source").some(({ attrs }) => attrs.srcset === deployedAvifPath && attrs.type === "image/avif"), "El retrato predeterminado debe ofrecer una fuente AVIF.");
  if (homeCanonical) {
    const avifUrl = new URL(deployedAvifPath, homeCanonical);
    const avifFile = outputPathFromUrl(avifUrl);
    if (avifFile) await readRequired(avifFile, "el retrato AVIF");
  }
}
if (homeCanonical) {
  const portraitUrl = new URL(deployedPortraitPath, homeCanonical);
  if (origin) sameOrigin(portraitUrl, origin, "el retrato");
  const portraitFile = outputPathFromUrl(portraitUrl);
  if (portraitFile) await readRequired(portraitFile, "el retrato");
}

if (origin && configuredUrl && !isLocalHost(configuredUrl.hostname)) {
    const siteUrls = [homeCanonical, ogUrl, ogImage, sitemapUrl]
      .concat(indexedUrls.map((url) => new URL(url)))
      .filter(Boolean);
    check(!siteUrls.some((url) => isLocalHost(url.hostname) || isPlaceholderHost(url.hostname)), "Los metadatos públicos contienen localhost o un dominio de ejemplo.");
}

if (failures.length) {
  console.error(`Validación del artefacto: FAIL (${failures.length}/${checks} comprobaciones fallaron)`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(`Validación del artefacto: PASS (${checks} comprobaciones).`);
