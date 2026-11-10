import { ORPCError } from "@orpc/server";

export type Attachment = { filename: string; contentBase64: string; contentType?: string };

/**
 * Envio de e-mail via Resend (HTTP). Precisa de RESEND_API_KEY e RESEND_FROM no .env,
 * com o domínio fammetal.com.br verificado no Resend.
 */
export async function sendEmail(opts: { to: string; subject: string; html: string; attachments: Attachment[] }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!key || !from) {
    throw new ORPCError("BAD_REQUEST", {
      message: "E-mail não configurado. Defina RESEND_API_KEY e RESEND_FROM no arquivo .env.",
    });
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
      attachments: opts.attachments.map((a) => ({ filename: a.filename, content: a.contentBase64 })),
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new ORPCError("BAD_REQUEST", { message: `Falha ao enviar e-mail: ${text}` });
  }
  return { ok: true };
}
