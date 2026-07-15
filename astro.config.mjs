import { defineConfig } from "astro/config";
import { loadEnv } from "vite";

const env = loadEnv(process.env.NODE_ENV || "production", process.cwd(), "");
const site = env.PUBLIC_SITE_URL || env.URL || "http://localhost:4321";

try {
  const parsed = new URL(site);
  if (!/^https?:$/.test(parsed.protocol)) throw new Error();
} catch {
  throw new Error("PUBLIC_SITE_URL debe ser una URL absoluta http(s).");
}

export default defineConfig({
  site,
  output: "static",
  trailingSlash: "always",
  compressHTML: true,
  build: {
    format: "directory",
  },
  vite: {
    build: {
      cssMinify: "lightningcss",
    },
  },
});
