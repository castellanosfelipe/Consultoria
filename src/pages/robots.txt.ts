import type { APIRoute } from "astro";

export const prerender = true;

export const GET: APIRoute = ({ site }) => {
  const base = site ?? new URL("http://localhost:4321");
  const root = new URL(import.meta.env.BASE_URL || "/", base);
  const sitemap = new URL("sitemap.xml", root);

  return new Response(`User-agent: *\nAllow: ${root.pathname}\nSitemap: ${sitemap}\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
