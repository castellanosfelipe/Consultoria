import type { APIRoute } from "astro";

export const prerender = true;

export const GET: APIRoute = ({ site }) => {
  const base = site ?? new URL("http://localhost:4321");
  const home = new URL(import.meta.env.BASE_URL || "/", base);
  const englishHome = new URL("en/", home);
  const privacy = new URL("privacidad/", home);
  const englishPrivacy = new URL("en/privacy/", home);
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>${home}</loc>
    <xhtml:link rel="alternate" hreflang="es-CO" href="${home}" />
    <xhtml:link rel="alternate" hreflang="en" href="${englishHome}" />
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${englishHome}</loc>
    <xhtml:link rel="alternate" hreflang="es-CO" href="${home}" />
    <xhtml:link rel="alternate" hreflang="en" href="${englishHome}" />
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${privacy}</loc>
    <xhtml:link rel="alternate" hreflang="es-CO" href="${privacy}" />
    <xhtml:link rel="alternate" hreflang="en" href="${englishPrivacy}" />
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>${englishPrivacy}</loc>
    <xhtml:link rel="alternate" hreflang="es-CO" href="${privacy}" />
    <xhtml:link rel="alternate" hreflang="en" href="${englishPrivacy}" />
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
</urlset>`;

  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
