import type { APIRoute } from "astro";

export const prerender = true;

export const GET: APIRoute = ({ site }) => {
  const base = site ?? new URL("http://localhost:4321");
  const sitemap = new URL("/sitemap.xml", base);

  return new Response(`User-agent: *\nAllow: /\nSitemap: ${sitemap}\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
