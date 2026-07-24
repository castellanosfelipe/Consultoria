import type { APIRoute } from "astro";

export const prerender = true;

// Crawlers de motores de respuesta IA: se declaran explícitamente para dejar la
// intención auditable (el sitio busca visibilidad, no bloqueo).
const aiUserAgents = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-Web",
  "PerplexityBot",
  "Google-Extended",
  "CCBot",
];

export const GET: APIRoute = ({ site }) => {
  const base = site ?? new URL("http://localhost:4321");
  const root = new URL(import.meta.env.BASE_URL || "/", base);
  const sitemap = new URL("sitemap.xml", root);
  const llms = new URL("llms.txt", root);

  const lines = [
    "User-agent: *",
    `Allow: ${root.pathname}`,
    "",
    ...aiUserAgents.map((agent) => `User-agent: ${agent}`),
    `Allow: ${root.pathname}`,
    "",
    `Sitemap: ${sitemap}`,
    `# Guía para asistentes: ${llms}`,
    "",
  ];

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
