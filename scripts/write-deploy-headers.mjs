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

if (stylesheetPaths.length !== 1 || !/^\/_astro\/[A-Za-z0-9._-]+\.css$/.test(stylesheetPaths[0])) {
  throw new Error(`Se esperaba exactamente una hoja CSS local versionada; se encontraron: ${stylesheetPaths.join(", ") || "ninguna"}.`);
}

const linkValue = `<${stylesheetPaths[0]}>; rel=preload; as=style`;
await writeFile(headersFile, `/\n  Link: ${linkValue}\n`, "utf8");

console.log(`Cabecera de preload generada para ${stylesheetPaths[0]}.`);
