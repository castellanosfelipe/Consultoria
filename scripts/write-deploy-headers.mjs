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

const hasInlineStyles = /<style\b[^>]*>[\s\S]*?<\/style>/i.test(html);
if (stylesheetPaths.length !== 0 || !hasInlineStyles) {
  throw new Error(
    `Se esperaba CSS integrado y ninguna hoja externa; se encontraron: ${stylesheetPaths.join(", ") || "ninguna externa"}.`,
  );
}

const headersComment = "# CSS crítico integrado en HTML; no requiere preload.\n";
await writeFile(headersFile, headersComment, "utf8");

console.log("CSS crítico integrado: no se genera un preload redundante.");
