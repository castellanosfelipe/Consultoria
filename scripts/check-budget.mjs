import { readdir, stat } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const root = new URL("../dist/", import.meta.url);
const budget = 300 * 1024;
const initialExtensions = new Set([".html", ".css", ".js", ".woff2"]);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else files.push(path);
  }

  return files;
}

const directory = root.pathname.replace(/^\/(.:)/, "$1");
const files = await walk(directory);
const initial = files.filter((file) => initialExtensions.has(extname(file)));
const measurements = await Promise.all(
  initial.map(async (file) => ({
    file: relative(directory, file),
    bytes: (await stat(file)).size,
  })),
);
const total = measurements.reduce((sum, item) => sum + item.bytes, 0);

console.log(`Presupuesto estático conservador: ${(total / 1024).toFixed(1)} KB / 300 KB`);

if (total > budget) {
  console.error("El build excede el presupuesto inicial de 300 KB.");
  process.exit(1);
}
