import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectDirectory = fileURLToPath(new URL("../", import.meta.url));
const distDirectory = resolve(projectDirectory, "dist");
const homeFile = resolve(distDirectory, "index.html");
const headersFile = resolve(distDirectory, "_headers");

const html = await readFile(homeFile, "utf8");
const stylesheetTags = [...html.matchAll(/<link\b[^>]*>/gi)]
  .map(([tag]) => tag)
  .filter((tag) => /\brel\s*=\s*(?:"[^"]*\bstylesheet\b[^"]*"|'[^']*\bstylesheet\b[^']*')/i.test(tag));

const stylesheetPaths = stylesheetTags.map((tag) => {
  const match = tag.match(/\bhref\s*=\s*(?:"([^"]+)"|'([^']+)')/i);
  return match?.[1] ?? match?.[2] ?? "";
});

const stylesheetPath = stylesheetPaths[0] ?? "";
const stylesheetMatch = stylesheetPath.match(/^(\/.*)?\/_astro\/[A-Za-z0-9._-]+\.css$/);
if (stylesheetPaths.length !== 1 || !stylesheetMatch) {
  throw new Error(`Se esperaba exactamente una hoja CSS local versionada; se encontraron: ${stylesheetPaths.join(", ") || "ninguna"}.`);
}

const basePath = stylesheetPath.slice(0, stylesheetPath.lastIndexOf("/_astro/"));
const headerScope = basePath ? `${basePath}/*` : "/";
const linkValue = `<${stylesheetPath}>; rel=preload; as=style`;
await writeFile(headersFile, `${headerScope}\n  Link: ${linkValue}\n`, "utf8");

console.log(`Cabecera de preload generada para ${stylesheetPath}.`);
