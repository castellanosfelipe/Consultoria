import { existsSync } from "node:fs";
import { resolve, sep } from "node:path";
import { defineConfig } from "astro/config";
import { loadEnv } from "vite";

const env = loadEnv(process.env.NODE_ENV || "production", process.cwd(), "");
const value = (name) => (env[name] || "").trim();
const site = value("PUBLIC_SITE_URL") || value("URL") || "http://localhost:4321";

const normalizeBasePath = (raw) => {
  if (raw === "/") return "/";
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\") || /[?#]/.test(raw)) {
    throw new Error("PUBLIC_BASE_PATH debe ser una ruta absoluta simple, por ejemplo /Consultoria.");
  }
  const normalized = raw.endsWith("/") ? raw.slice(0, -1) : raw;
  const segments = normalized.slice(1).split("/");
  if (!segments.length || segments.some((segment) => !segment || segment === "." || segment === ".." || !/^[A-Za-z0-9._~-]+$/.test(segment))) {
    throw new Error("PUBLIC_BASE_PATH contiene un segmento no válido.");
  }
  return normalized;
};

const basePath = normalizeBasePath(value("PUBLIC_BASE_PATH") || "/");

const exactOrSubdomain = (hostname, domain) => hostname === domain || hostname.endsWith(`.${domain}`);
const validDnsHostname = (hostname) => {
  if (hostname.length > 253) return false;
  const labels = hostname.split(".");
  return labels.every((label) =>
    label.length > 0 &&
    label.length <= 63 &&
    /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label),
  );
};
const placeholderHostname = (hostname) => {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return (
    normalized === "localhost" ||
    normalized === "::1" ||
    /^127(?:\.\d{1,3}){3}$/.test(normalized) ||
    ["example.com", "example.org", "example.net"].some((domain) => exactOrSubdomain(normalized, domain)) ||
    ["example", "test", "invalid", "localhost"].some(
      (suffix) => normalized === suffix || normalized.endsWith(`.${suffix}`),
    )
  );
};

const parseAbsoluteUrl = (name, raw, { httpsOnly = false, allowedHosts } = {}) => {
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`${name} debe ser una URL absoluta válida.`);
  }

  const allowedProtocol = httpsOnly ? parsed.protocol === "https:" : /^https?:$/.test(parsed.protocol);
  if (!allowedProtocol || parsed.username || parsed.password) {
    throw new Error(`${name} debe usar ${httpsOnly ? "https" : "http(s)"} y no incluir credenciales.`);
  }

  if (allowedHosts && !allowedHosts.some((host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`))) {
    throw new Error(`${name} debe apuntar a ${allowedHosts.join(" o ")}.`);
  }
  return parsed;
};

const parsedSite = parseAbsoluteUrl("PUBLIC_SITE_URL", site);
if (parsedSite.pathname !== "/" || parsedSite.search || parsedSite.hash) {
  throw new Error("PUBLIC_SITE_URL debe contener solo el origen, sin ruta, query ni fragmento.");
}

const productionBuild =
  value("CONTEXT").toLowerCase() === "production" ||
  value("REQUIRE_PRODUCTION_CONFIG").toLowerCase() === "true";
if (productionBuild && (
  parsedSite.protocol !== "https:" ||
  placeholderHostname(parsedSite.hostname) ||
  !validDnsHostname(parsedSite.hostname)
)) {
  throw new Error("Un deploy de producción requiere PUBLIC_SITE_URL/URL https y no provisional.");
}

const bookingUrl = value("PUBLIC_CAL_URL");
if (bookingUrl) {
  parseAbsoluteUrl("PUBLIC_CAL_URL", bookingUrl, {
    httpsOnly: true,
    allowedHosts: ["cal.com", "calendly.com"],
  });
}

const linkedInUrl = value("PUBLIC_LINKEDIN_URL");
if (linkedInUrl) {
  parseAbsoluteUrl("PUBLIC_LINKEDIN_URL", linkedInUrl, {
    httpsOnly: true,
    allowedHosts: ["linkedin.com"],
  });
}

const plausibleDomain = value("PUBLIC_PLAUSIBLE_DOMAIN");
if (plausibleDomain) {
  const domains = plausibleDomain.split(",").map((domain) => domain.trim()).filter(Boolean);
  if (!domains.length || domains.some((domain) => {
    try {
      const parsed = new URL(`https://${domain}`);
      return (
        parsed.hostname !== domain.toLowerCase() ||
        parsed.pathname !== "/" ||
        Boolean(parsed.search || parsed.hash) ||
        !validDnsHostname(parsed.hostname) ||
        (productionBuild && placeholderHostname(parsed.hostname))
      );
    } catch {
      return true;
    }
  })) {
    throw new Error("PUBLIC_PLAUSIBLE_DOMAIN debe contener uno o más hostnames válidos separados por coma.");
  }
}

const plausibleSrc = value("PUBLIC_PLAUSIBLE_SRC");
if (plausibleSrc) {
  const safeLocalPath = plausibleSrc.startsWith("/") && !plausibleSrc.startsWith("//") && !plausibleSrc.includes("..") && !plausibleSrc.includes("\\");
  if (!safeLocalPath) {
    parseAbsoluteUrl("PUBLIC_PLAUSIBLE_SRC", plausibleSrc, {
      httpsOnly: true,
      allowedHosts: ["plausible.io"],
    });
  }
}

const portraitPath = value("PUBLIC_PORTRAIT_PATH") || "/images/felipe-pena.webp";
{
  const publicRoot = resolve(process.cwd(), "public");
  const portraitFile = resolve(publicRoot, `.${portraitPath}`);
  const validPath =
    portraitPath.startsWith("/") &&
    !portraitPath.includes("..") &&
    /\.(?:avif|webp)$/i.test(portraitPath) &&
    portraitFile.startsWith(`${publicRoot}${sep}`) &&
    existsSync(portraitFile);
  if (!validPath) {
    throw new Error("PUBLIC_PORTRAIT_PATH debe ser una ruta local existente bajo public/ en WebP o AVIF.");
  }
}

export default defineConfig({
  site,
  base: basePath,
  output: "static",
  trailingSlash: "always",
  compressHTML: true,
  build: {
    format: "directory",
    // La landing usa una sola hoja: integrarla evita un RTT render blocking en
    // Lighthouse y en visitas frías sin añadir bytes a la carga inicial.
    inlineStylesheets: "always",
  },
  vite: {
    build: {
      cssCodeSplit: false,
      cssMinify: "lightningcss",
    },
  },
});
