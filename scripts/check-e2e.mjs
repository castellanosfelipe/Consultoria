// Pruebas E2E mínimas sobre dist/: entrada por ancla y accesibilidad (axe).
// Requiere un build previo y el navegador Chromium de Playwright instalado.
import { spawn } from "node:child_process";
import process from "node:process";
import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";

const normalizeBasePath = (raw) => {
  const value = (raw || "/").trim() || "/";
  return value.endsWith("/") ? value : `${value}/`;
};
const basePath = normalizeBasePath(process.env.PUBLIC_BASE_PATH);
const origin = "http://127.0.0.1:4174";
const failures = [];

const server = spawn(process.execPath, ["scripts/serve-dist.mjs"], {
  stdio: ["ignore", "pipe", "inherit"],
});
await new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error("El servidor QA no arrancó en 15 s.")), 15_000);
  server.stdout.on("data", (chunk) => {
    if (String(chunk).includes("QA server ready")) {
      clearTimeout(timeout);
      resolve();
    }
  });
  server.on("exit", (code) => reject(new Error(`serve-dist terminó con código ${code}.`)));
});

const browser = await chromium.launch();

try {
  // 1) Entrada por ancla: la sección correcta, alineada y visible en <350 ms.
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${origin}${basePath}#contacto`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(350);
  const anchor = await page.evaluate(() => {
    const section = document.querySelector("#contacto");
    const title = document.querySelector("#contact-title");
    const padding =
      Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    return {
      delta: section ? Math.abs(section.getBoundingClientRect().top - padding) : Number.NaN,
      titleOpacity: title ? Number(getComputedStyle(title).opacity) : 0,
    };
  });
  if (!(anchor.delta <= 8)) {
    failures.push(`Entrada por #contacto: la sección quedó a ${Math.round(anchor.delta)}px del destino (máx. 8).`);
  }
  if (!(anchor.titleOpacity >= 0.9)) {
    failures.push(`Entrada por #contacto: el título sigue oculto (opacity ${anchor.titleOpacity}).`);
  }
  await page.close();

  // 2) axe-core WCAG 2.x A/AA en escritorio y móvil: cero violaciones.
  for (const [name, viewport] of [
    ["escritorio", { width: 1440, height: 900 }],
    ["móvil", { width: 390, height: 844 }],
  ]) {
    const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
    const axePage = await context.newPage();
    await axePage.goto(`${origin}${basePath}`, { waitUntil: "networkidle" });
    const results = await new AxeBuilder({ page: axePage })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    if (results.violations.length > 0) {
      const ids = results.violations.map((violation) => violation.id).join(", ");
      failures.push(`axe (${name}): ${results.violations.length} violaciones (${ids}).`);
    }
    await context.close();
  }
} finally {
  await browser.close();
  server.kill();
}

if (failures.length > 0) {
  console.error(`E2E: FAIL (${failures.length})`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log("E2E: PASS (entrada por ancla + axe escritorio y móvil).");
