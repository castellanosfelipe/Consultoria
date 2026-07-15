import { readFile, readdir, stat } from "node:fs/promises";
import { brotliCompressSync, constants, gzipSync } from "node:zlib";
import { createServer } from "node:http";
import { extname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const projectDirectory = fileURLToPath(new URL("../", import.meta.url));
const distDirectory = resolve(projectDirectory, "dist");
const host = "127.0.0.1";
const port = Number.parseInt(process.env.PORT || "4174", 10);
const compressed = new Map();

const deployHeaders = await readFile(resolve(distDirectory, "_headers"), "utf8");
const criticalLink = deployHeaders.match(/^\s*Link:\s*(.+)$/im)?.[1]?.trim();
const criticalAssetPath = criticalLink?.match(/^<(\/(?:.*\/)?_astro\/[A-Za-z0-9._-]+\.css)>; rel=preload; as=style$/)?.[1];
if (!criticalLink || !criticalAssetPath) {
  throw new Error("dist/_headers no contiene un preload CSS v\u00e1lido. Ejecuta el build completo.");
}
const deployedBasePath = criticalAssetPath.slice(0, criticalAssetPath.lastIndexOf("/_astro/"));
const deployedRoot = deployedBasePath ? `${deployedBasePath}/` : "/";

const netlifyConfig = await readFile(resolve(projectDirectory, "netlify.toml"), "utf8");
const securityHeaderNames = [
  "Content-Security-Policy",
  "Permissions-Policy",
  "Referrer-Policy",
  "Strict-Transport-Security",
  "X-Content-Type-Options",
  "X-Frame-Options",
];
const securityHeaders = Object.fromEntries(securityHeaderNames.map((name) => {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const configured = netlifyConfig.match(new RegExp(`^\\s*${escapedName}\\s*=\\s*"([^"\\r\\n]*)"\\s*$`, "m"))?.[1];
  if (!configured) throw new Error(`Falta ${name} en netlify.toml.`);
  return [name, configured];
}));
// El servidor QA usa HTTP local; el resto de la CSP sí replica producción.
securityHeaders["Content-Security-Policy"] = securityHeaders["Content-Security-Policy"]
  .split(";")
  .map((directive) => directive.trim())
  .filter((directive) => directive !== "upgrade-insecure-requests")
  .join("; ");

const contentTypes = new Map([
  [".avif", "image/avif"],
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".webp", "image/webp"],
  [".woff2", "font/woff2"],
  [".xml", "application/xml; charset=utf-8"],
]);

const insideDist = (path) => {
  const child = relative(distDirectory, path);
  return child === "" || (child !== ".." && !child.startsWith(`..${sep}`) && !child.startsWith(sep));
};

const representation = (path, source, encoding) => {
  const key = `${path}:${encoding || "identity"}`;
  if (compressed.has(key)) return compressed.get(key);

  let body = source;
  if (encoding === "br") {
    body = brotliCompressSync(source, {
      params: { [constants.BROTLI_PARAM_QUALITY]: 5 },
    });
  } else if (encoding === "gzip") {
    body = gzipSync(source, { level: 6 });
  }
  compressed.set(key, body);
  return body;
};

const cacheControl = (pathname, file) => {
  if (file.endsWith(".html")) return "no-cache";
  if (pathname.includes("/_astro/")) return "public, max-age=31536000, immutable";
  if (pathname.includes("/fonts/") || pathname.includes("/images/")) {
    return "public, max-age=86400, must-revalidate";
  }
  return "public, max-age=0, must-revalidate";
};

const compressibleExtensions = new Set([".css", ".html", ".js", ".json", ".svg", ".txt", ".xml"]);
const warmCompressionCache = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  await Promise.all(entries.map(async (entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return warmCompressionCache(path);
    if (!compressibleExtensions.has(extname(entry.name).toLowerCase())) return;
    const source = await readFile(path);
    representation(path, source, "br");
    representation(path, source, "gzip");
  }));
};

const server = createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url || "/", `http://${host}:${port}`);
    let pathname = decodeURIComponent(requestUrl.pathname);
    const artifactPathname = deployedBasePath && (pathname === deployedBasePath || pathname.startsWith(deployedRoot))
      ? pathname.slice(deployedBasePath.length) || "/"
      : pathname;
    let file = resolve(distDirectory, `.${artifactPathname}`);
    if (!insideDist(file)) throw new Error("Ruta inválida");

    try {
      if ((await stat(file)).isDirectory()) file = resolve(file, "index.html");
    } catch {
      if (!extname(file)) file = resolve(file, "index.html");
    }

    let status = 200;
    let source;
    try {
      source = await readFile(file);
    } catch {
      status = 404;
      file = resolve(distDirectory, "404.html");
      source = await readFile(file);
    }

    const accepted = request.headers["accept-encoding"] || "";
    const canCompress = compressibleExtensions.has(extname(file).toLowerCase());
    const encoding = canCompress && accepted.includes("br") ? "br" : canCompress && accepted.includes("gzip") ? "gzip" : "";
    const body = representation(file, source, encoding);
    const headers = {
      ...securityHeaders,
      "Cache-Control": cacheControl(pathname, file),
      "Content-Length": body.length,
      "Content-Type": contentTypes.get(extname(file).toLowerCase()) || "application/octet-stream",
      Vary: "Accept-Encoding",
    };
    if (status === 200 && (pathname === deployedRoot || pathname === `${deployedRoot}index.html`)) {
      headers.Link = criticalLink;
    }
    if (encoding) headers["Content-Encoding"] = encoding;
    response.writeHead(status, headers);
    if (request.method === "HEAD") response.end();
    else response.end(body);
  } catch {
    response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Bad request");
  }
});

await warmCompressionCache(distDirectory);

server.listen(port, host, () => {
  console.log(`QA server ready at http://${host}:${port}`);
});

const stop = () => server.close(() => process.exit(0));
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
