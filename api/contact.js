// Vercel Function: recibe el POST del formulario y reenvía el lead por correo.
// No usa base de datos: solo notifica. El proveedor de correo es Resend
// (https://resend.com), llamado por HTTP para no añadir dependencias.
//
// Variables de entorno requeridas en Vercel:
//   RESEND_API_KEY   Clave de API de Resend.
//   CONTACT_EMAIL    Correo que recibe los leads.
// Opcionales:
//   RESEND_FROM      Remitente verificado. Por defecto "Contacto <onboarding@resend.dev>"
//                    (válido solo para pruebas; en producción verifica tu dominio).

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const readBody = (req) => {
  const body = req.body;
  if (body && typeof body === "object" && !Buffer.isBuffer(body)) return body;
  const raw = typeof body === "string" ? body : "";
  return Object.fromEntries(new URLSearchParams(raw));
};

const clean = (value, max) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "method-not-allowed" });
  }

  const data = readBody(req);

  // Honeypot: un bot rellena el campo oculto. Fingimos éxito y no enviamos.
  if (clean(data["bot-field"], 200)) {
    return res.status(200).json({ ok: true });
  }

  const nombre = clean(data.nombre, 80);
  const email = clean(data.email, 120);
  const contexto = clean(data.contexto, 280);
  const telefono = clean(data.telefono, 24);
  const indicativo = clean(data.indicativo, 6);
  const pais = clean(data.country, 8);
  const moneda = clean(data.currency, 8);

  if (
    nombre.length < 2 ||
    !EMAIL_PATTERN.test(email) ||
    contexto.length < 12
  ) {
    return res.status(422).json({ ok: false, error: "invalid-fields" });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_EMAIL;
  const from = process.env.RESEND_FROM || "Contacto <onboarding@resend.dev>";

  if (!apiKey || !to) {
    console.error("Falta RESEND_API_KEY o CONTACT_EMAIL en el entorno.");
    return res.status(500).json({ ok: false, error: "not-configured" });
  }

  const lines = [
    `Nombre: ${nombre}`,
    `Correo: ${email}`,
    telefono ? `Teléfono: ${indicativo ? `${indicativo} ` : ""}${telefono}` : null,
    pais || moneda ? `País/moneda: ${pais || "?"} · ${moneda || "?"}` : null,
    "",
    "Contexto:",
    contexto,
  ].filter((line) => line !== null);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject: `Nuevo contexto · ${nombre}`,
        text: lines.join("\n"),
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("Resend respondió con error:", response.status, detail);
      return res.status(502).json({ ok: false, error: "provider" });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("No se pudo contactar a Resend:", error);
    return res.status(502).json({ ok: false, error: "network" });
  }
}
