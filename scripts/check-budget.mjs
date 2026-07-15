import { readFile, stat } from "node:fs/promises";
import { extname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const projectDirectory = fileURLToPath(new URL("../", import.meta.url));
const distDirectory = resolve(projectDirectory, "dist");
const homeFile = resolve(distDirectory, "index.html");
const limitBytes = 300 * 1024;

const failures = [];
const assets = new Map();
const pendingCss = [];
const parsedCss = new Set();
const pendingJavaScript = [];
const parsedJavaScript = new Set();
const externalReferences = new Set();
let publicBasePrefix = "";

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

function htmlTags(html, names) {
  const wanted = names.join("|");
  const pattern = new RegExp(`<(${wanted})\\b([^>]*)>`, "gi");
  const result = [];
  let match;

  while ((match = pattern.exec(html))) {
    result.push({ name: match[1].toLowerCase(), attrs: attributes(match[2]) });
  }

  return result;
}

function srcsetReferences(value) {
  return value
    .split(",")
    .map((candidate) => candidate.trim().split(/\s+/, 1)[0])
    .filter(Boolean);
}

function cssReferences(css) {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const result = [];
  const imports = /@import\s+(?!url\()(?:"([^"]+)"|'([^']+)')/gi;
  const urls = /url\(\s*(?:"([^"]+)"|'([^']+)'|([^)'"\s][^)]*?))\s*\)/gi;
  let match;

  while ((match = imports.exec(withoutComments))) {
    result.push({ reference: match[1] ?? match[2], css: true });
  }

  while ((match = urls.exec(withoutComments))) {
    const reference = (match[1] ?? match[2] ?? match[3] ?? "").trim();
    if (reference) result.push({ reference, css: /\.css(?:[?#]|$)/i.test(reference) });
  }

  return result;
}

function isIdentifierStart(character) {
  return Boolean(character) && /[A-Za-z_$]/.test(character);
}

function isIdentifierPart(character) {
  return Boolean(character) && /[A-Za-z0-9_$]/.test(character);
}

function skipTrivia(source, start) {
  let index = start;
  while (index < source.length) {
    if (/\s/.test(source[index])) {
      index += 1;
    } else if (source[index] === "/" && source[index + 1] === "/") {
      index = source.indexOf("\n", index + 2);
      if (index === -1) return source.length;
    } else if (source[index] === "/" && source[index + 1] === "*") {
      const end = source.indexOf("*/", index + 2);
      return end === -1 ? source.length : skipTrivia(source, end + 2);
    } else {
      break;
    }
  }
  return index;
}

function quotedJavaScriptValue(source, start) {
  const quote = source[start];
  let value = "";
  let index = start + 1;

  while (index < source.length) {
    const character = source[index];
    if (character === quote) return { value, end: index + 1, closed: true };
    if (character !== "\\") {
      value += character;
      index += 1;
      continue;
    }

    const escaped = source[index + 1];
    if (escaped === "\n" || escaped === "\r") {
      index += escaped === "\r" && source[index + 2] === "\n" ? 3 : 2;
      continue;
    }

    const simpleEscapes = { b: "\b", f: "\f", n: "\n", r: "\r", t: "\t", v: "\v", "0": "\0" };
    if (Object.prototype.hasOwnProperty.call(simpleEscapes, escaped)) {
      value += simpleEscapes[escaped];
      index += 2;
      continue;
    }

    if (escaped === "x" && /^[0-9A-Fa-f]{2}$/.test(source.slice(index + 2, index + 4))) {
      value += String.fromCodePoint(Number.parseInt(source.slice(index + 2, index + 4), 16));
      index += 4;
      continue;
    }

    if (escaped === "u" && /^[0-9A-Fa-f]{4}$/.test(source.slice(index + 2, index + 6))) {
      value += String.fromCodePoint(Number.parseInt(source.slice(index + 2, index + 6), 16));
      index += 6;
      continue;
    }

    value += escaped ?? "";
    index += 2;
  }

  return { value, end: source.length, closed: false };
}

function previousSignificantCharacter(source, start) {
  let index = start - 1;
  while (index >= 0 && /\s/.test(source[index])) index -= 1;
  return source[index];
}

function importFromSpecifier(source, start) {
  let index = start;
  while (index < source.length) {
    index = skipTrivia(source, index);
    const character = source[index];
    if (!character || character === ";") return null;

    if (character === '"' || character === "'" || character === "`") {
      index = quotedJavaScriptValue(source, index).end;
      continue;
    }

    if (isIdentifierStart(character)) {
      const tokenStart = index;
      index += 1;
      while (isIdentifierPart(source[index])) index += 1;
      if (source.slice(tokenStart, index) !== "from") continue;
      const valueStart = skipTrivia(source, index);
      if (source[valueStart] !== '"' && source[valueStart] !== "'") continue;
      const parsed = quotedJavaScriptValue(source, valueStart);
      return parsed.closed ? parsed.value : null;
    }

    index += 1;
  }
  return null;
}

function javascriptReferences(source) {
  const references = [];
  const unresolvedDynamicImports = [];
  let index = 0;

  while (index < source.length) {
    index = skipTrivia(source, index);
    const character = source[index];
    if (!character) break;

    if (character === '"' || character === "'" || character === "`") {
      index = quotedJavaScriptValue(source, index).end;
      continue;
    }

    if (!isIdentifierStart(character)) {
      index += 1;
      continue;
    }

    const tokenStart = index;
    index += 1;
    while (isIdentifierPart(source[index])) index += 1;
    const token = source.slice(tokenStart, index);
    if ((token !== "import" && token !== "export") || previousSignificantCharacter(source, tokenStart) === ".") continue;

    let next = skipTrivia(source, index);
    if (token === "import") {
      if (source[next] === ".") continue;
      if (source[next] === "(") {
        next = skipTrivia(source, next + 1);
        if (source[next] === '"' || source[next] === "'" || source[next] === "`") {
          const parsed = quotedJavaScriptValue(source, next);
          if (parsed.closed && !(source[next] === "`" && parsed.value.includes("${"))) {
            references.push({ reference: parsed.value, kind: "import dinámico" });
          } else {
            unresolvedDynamicImports.push(tokenStart);
          }
        } else {
          unresolvedDynamicImports.push(tokenStart);
        }
        continue;
      }

      if (source[next] === '"' || source[next] === "'") {
        const parsed = quotedJavaScriptValue(source, next);
        if (parsed.closed) references.push({ reference: parsed.value, kind: "import estático" });
        continue;
      }

      const reference = importFromSpecifier(source, next);
      if (reference) references.push({ reference, kind: "import estático" });
      continue;
    }

    if (source[next] === "*" || source[next] === "{") {
      const reference = importFromSpecifier(source, next);
      if (reference) references.push({ reference, kind: "re-export" });
    }
  }

  return { references, unresolvedDynamicImports };
}

function importedAssetType(reference) {
  let pathname = reference;
  try {
    pathname = new URL(reference, "http://local.invalid/").pathname;
  } catch {
    // localAsset() dará el error de URL con el contexto completo.
  }
  const extension = extname(pathname).toLowerCase();
  if (extension === ".css") return { css: true, javascript: false };
  const nonJavaScript = new Set([".avif", ".gif", ".jpeg", ".jpg", ".json", ".png", ".svg", ".txt", ".wasm", ".webp", ".woff", ".woff2"]);
  return { css: false, javascript: !nonJavaScript.has(extension) };
}

function isInsideDist(path) {
  const relativePath = relative(distDirectory, path);
  return relativePath === "" || (!relativePath.startsWith(`..${sep}`) && relativePath !== ".." && !relativePath.startsWith(sep));
}

function localAsset(reference, basePathname, siteOrigin) {
  const cleanReference = reference.trim();
  if (!cleanReference || cleanReference.startsWith("#") || /^(?:data|blob|javascript|mailto|tel):/i.test(cleanReference)) {
    return null;
  }

  let url;
  try {
    url = new URL(cleanReference, `${siteOrigin}${basePathname}`);
  } catch {
    failures.push(`Referencia inválida desde ${basePathname}: ${cleanReference}`);
    return null;
  }

  if (!/^https?:$/.test(url.protocol) || url.origin !== siteOrigin) {
    externalReferences.add(url.href);
    return null;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    failures.push(`Ruta con codificación inválida: ${url.pathname}`);
    return null;
  }

  if (publicBasePrefix) {
    const insideBase = pathname === publicBasePrefix || pathname.startsWith(`${publicBasePrefix}/`);
    if (!insideBase) {
      failures.push(`La referencia local queda fuera del base path ${publicBasePrefix}/: ${cleanReference}`);
      return null;
    }
    pathname = pathname.slice(publicBasePrefix.length) || "/";
  }

  const absolutePath = resolve(distDirectory, `.${pathname}`);
  if (!isInsideDist(absolutePath)) {
    failures.push(`La referencia sale de dist/: ${cleanReference}`);
    return null;
  }

  return { absolutePath, pathname: url.pathname };
}

async function addAsset(reference, basePathname, siteOrigin, reason, parseAsCss = false, parseAsJavaScript = false) {
  const asset = localAsset(reference, basePathname, siteOrigin);
  if (!asset) return;

  let info = assets.get(asset.absolutePath);
  if (!info) {
    try {
      const details = await stat(asset.absolutePath);
      if (!details.isFile()) throw new Error("no es un archivo");
      info = {
        absolutePath: asset.absolutePath,
        pathname: asset.pathname,
        bytes: details.size,
        reasons: new Set(),
        parseAsCss: false,
        parseAsJavaScript: false,
      };
      assets.set(asset.absolutePath, info);
    } catch {
      failures.push(`Recurso local ausente: ${asset.pathname} (referido por ${reason})`);
      return;
    }
  }

  info.reasons.add(reason);
  if (parseAsCss && !info.parseAsCss) {
    info.parseAsCss = true;
    pendingCss.push(info);
  }
  if (parseAsJavaScript && !info.parseAsJavaScript) {
    info.parseAsJavaScript = true;
    pendingJavaScript.push(info);
  }
}

function category(pathname) {
  const extension = extname(pathname).toLowerCase();
  if (extension === ".html") return "HTML";
  if (extension === ".css") return "CSS";
  if ([".js", ".mjs", ".cjs"].includes(extension)) return "JavaScript";
  if ([".woff", ".woff2", ".ttf", ".otf"].includes(extension)) return "Fuentes";
  if ([".avif", ".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp"].includes(extension)) return "Imágenes";
  return "Otros";
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

let html;
try {
  html = await readFile(homeFile, "utf8");
  const details = await stat(homeFile);
  assets.set(homeFile, {
    absolutePath: homeFile,
    pathname: "/index.html",
    bytes: details.size,
    reasons: new Set(["documento / "]),
    parseAsCss: false,
    parseAsJavaScript: false,
  });
} catch {
  console.error("No existe dist/index.html. Ejecuta el build antes de comprobar el presupuesto.");
  process.exit(1);
}

const canonicalTag = htmlTags(html, ["link"]).find(
  ({ attrs }) => attrs.rel?.toLowerCase().split(/\s+/).includes("canonical"),
);
let siteOrigin = "http://local.invalid";
if (canonicalTag?.attrs.href) {
  try {
    const canonicalUrl = new URL(canonicalTag.attrs.href);
    siteOrigin = canonicalUrl.origin;
    publicBasePrefix = canonicalUrl.pathname === "/" ? "" : canonicalUrl.pathname.replace(/\/$/, "");
  } catch {
    failures.push("El canonical de / no es una URL absoluta válida.");
  }
}
const homeDocumentPathname = `${publicBasePrefix}/index.html`;

const htmlReferences = [];
const downloadRels = new Set(["icon", "manifest", "modulepreload", "preload", "stylesheet"]);

for (const { name, attrs } of htmlTags(html, ["link", "script", "img", "source", "video", "audio", "iframe", "object", "embed", "input", "image"])) {
  if (name === "link") {
    const rels = (attrs.rel ?? "").toLowerCase().split(/\s+/).filter(Boolean);
    if (rels.some((rel) => downloadRels.has(rel)) && attrs.href) {
      htmlReferences.push({
        reference: attrs.href,
        css: rels.includes("stylesheet"),
        javascript: rels.includes("modulepreload") || attrs.as?.toLowerCase() === "script",
        reason: `<link rel="${rels.join(" ")}">`,
      });
    }
    continue;
  }

  if (name === "script" && attrs.src) {
    htmlReferences.push({ reference: attrs.src, css: false, javascript: true, reason: "<script src>" });
    continue;
  }

  if (name === "iframe") {
    if (attrs.loading?.toLowerCase() !== "lazy" && attrs.src) {
      htmlReferences.push({ reference: attrs.src, css: false, reason: "<iframe src>" });
    }
    continue;
  }

  if (name === "img") {
    if (attrs.loading?.toLowerCase() !== "lazy") {
      if (attrs.src) htmlReferences.push({ reference: attrs.src, css: false, reason: "<img src>" });
      for (const reference of srcsetReferences(attrs.srcset ?? "")) {
        htmlReferences.push({ reference, css: false, reason: "<img srcset>" });
      }
    }
    continue;
  }

  if (name === "source") {
    if (attrs.src) htmlReferences.push({ reference: attrs.src, css: false, reason: "<source src>" });
    for (const reference of srcsetReferences(attrs.srcset ?? "")) {
      htmlReferences.push({ reference, css: false, reason: "<source srcset>" });
    }
    continue;
  }

  if (name === "video") {
    if (attrs.poster) htmlReferences.push({ reference: attrs.poster, css: false, reason: "<video poster>" });
    if (attrs.preload?.toLowerCase() !== "none" && attrs.src) {
      htmlReferences.push({ reference: attrs.src, css: false, reason: "<video src>" });
    }
    continue;
  }

  if (name === "audio" && attrs.preload?.toLowerCase() !== "none" && attrs.src) {
    htmlReferences.push({ reference: attrs.src, css: false, reason: "<audio src>" });
  } else if (name === "object" && attrs.data) {
    htmlReferences.push({ reference: attrs.data, css: false, reason: "<object data>" });
  } else if (name === "embed" && attrs.src) {
    htmlReferences.push({ reference: attrs.src, css: false, reason: "<embed src>" });
  } else if (name === "input" && attrs.type?.toLowerCase() === "image" && attrs.src) {
    htmlReferences.push({ reference: attrs.src, css: false, reason: "<input type=image>" });
  } else if (name === "image") {
    const reference = attrs.href ?? attrs["xlink:href"];
    if (reference) htmlReferences.push({ reference, css: false, reason: "<svg:image href>" });
  }
}

for (const item of htmlReferences) {
  await addAsset(item.reference, homeDocumentPathname, siteOrigin, item.reason, item.css, item.javascript);
}

for (const match of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
  for (const item of cssReferences(match[1])) {
    await addAsset(item.reference, homeDocumentPathname, siteOrigin, "CSS inline", item.css);
  }
}

for (const match of html.matchAll(/\sstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
  for (const item of cssReferences(decodeHtml(match[1] ?? match[2] ?? ""))) {
    await addAsset(item.reference, homeDocumentPathname, siteOrigin, "atributo style", item.css);
  }
}

async function addJavaScriptReferences(source, basePathname, reason) {
  const parsed = javascriptReferences(source);
  if (parsed.unresolvedDynamicImports.length) {
    failures.push(`${reason} contiene ${parsed.unresolvedDynamicImports.length} import dinámico no literal que no puede presupuestarse.`);
  }
  for (const item of parsed.references) {
    const type = importedAssetType(item.reference);
    await addAsset(item.reference, basePathname, siteOrigin, `${reason} (${item.kind})`, type.css, type.javascript);
  }
}

for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
  const attrs = attributes(match[1]);
  const type = (attrs.type ?? "").toLowerCase();
  if (!attrs.src && !["application/ld+json", "application/json", "importmap", "speculationrules"].includes(type)) {
    await addJavaScriptReferences(match[2], homeDocumentPathname, "JavaScript inline");
  }
}

while (pendingCss.length || pendingJavaScript.length) {
  while (pendingCss.length) {
    const stylesheet = pendingCss.shift();
    if (parsedCss.has(stylesheet.absolutePath)) continue;
    parsedCss.add(stylesheet.absolutePath);

    const css = await readFile(stylesheet.absolutePath, "utf8");
    for (const item of cssReferences(css)) {
      await addAsset(item.reference, stylesheet.pathname, siteOrigin, stylesheet.pathname, item.css);
    }
  }

  while (pendingJavaScript.length) {
    const module = pendingJavaScript.shift();
    if (parsedJavaScript.has(module.absolutePath)) continue;
    parsedJavaScript.add(module.absolutePath);
    await addJavaScriptReferences(await readFile(module.absolutePath, "utf8"), module.pathname, module.pathname);
  }
}

const measurements = [...assets.values()].sort((a, b) => b.bytes - a.bytes || a.pathname.localeCompare(b.pathname));
const totals = new Map();
for (const asset of measurements) {
  const name = category(asset.pathname);
  totals.set(name, (totals.get(name) ?? 0) + asset.bytes);
}
const totalBytes = measurements.reduce((sum, asset) => sum + asset.bytes, 0);

console.log("Presupuesto de carga inicial local para / (bytes sin compresión):");
for (const [name, bytes] of [...totals].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${name.padEnd(12)} ${formatBytes(bytes)}`);
}
console.log(`  ${"TOTAL".padEnd(12)} ${formatBytes(totalBytes)} / ${formatBytes(limitBytes)} (${measurements.length} archivos)`);
console.log("Recursos incluidos:");
for (const asset of measurements) {
  console.log(`  ${formatBytes(asset.bytes).padStart(9)}  ${asset.pathname}`);
}
if (externalReferences.size) {
  console.log(`Referencias externas excluidas del presupuesto local: ${externalReferences.size}.`);
}

if (totalBytes > limitBytes) {
  failures.push(`La carga inicial local excede 300 KiB por ${formatBytes(totalBytes - limitBytes)}.`);
}

if (failures.length) {
  console.error("Errores del presupuesto:");
  for (const failure of [...new Set(failures)]) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log("Presupuesto inicial: PASS.");
