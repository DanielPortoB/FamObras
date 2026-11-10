import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "fam_obras_session";
const SESSION_SECONDS = 60 * 60 * 12;

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function sessionSignature(expiresAt: string, secret: string) {
  return createHmac("sha256", secret).update(expiresAt).digest("base64url");
}

function hasSession(request: Request, secret: string) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const item = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`));
  const value = item?.slice(COOKIE_NAME.length + 1);
  if (!value) return false;

  const [expiresAt, signature, extra] = value.split(".");
  if (!expiresAt || !signature || extra || Number(expiresAt) <= Math.floor(Date.now() / 1000)) return false;
  return safeEqual(signature, sessionSignature(expiresAt, secret));
}

function json(body: unknown, status = 200, headers?: HeadersInit) {
  return Response.json(body, { status, headers });
}

function authConfig() {
  return {
    password: process.env.APP_PASSWORD,
    secret: process.env.APP_AUTH_SECRET,
  };
}

export default {
  async fetch(request: Request) {
    const { pathname } = new URL(request.url);
    const { password, secret } = authConfig();

    if (pathname === "/api/auth/login" && request.method === "POST") {
      if (!password || !secret) return json({ error: "A proteção do app ainda não foi configurada." }, 503);
      let body: { password?: string };
      try {
        body = await request.json();
      } catch {
        return json({ error: "Pedido inválido." }, 400);
      }
      if (typeof body.password !== "string" || !safeEqual(body.password, password)) {
        return json({ error: "Senha incorreta." }, 401);
      }

      const expiresAt = String(Math.floor(Date.now() / 1000) + SESSION_SECONDS);
      const signature = sessionSignature(expiresAt, secret);
      return json(
        { ok: true },
        200,
        {
          "Set-Cookie": `${COOKIE_NAME}=${expiresAt}.${signature}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_SECONDS}`,
        },
      );
    }

    if (pathname === "/api/auth/session" && request.method === "GET") {
      if (!password || !secret) return json({ error: "A proteção do app ainda não foi configurada." }, 503);
      return hasSession(request, secret) ? json({ authenticated: true }) : json({ authenticated: false }, 401);
    }

    if (pathname === "/api/auth/logout" && request.method === "POST") {
      return json(
        { ok: true },
        200,
        { "Set-Cookie": `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0` },
      );
    }

    if (!password || !secret) return json({ error: "A proteção do app ainda não foi configurada." }, 503);
    if (!hasSession(request, secret)) return json({ error: "Sessão expirada. Entre novamente." }, 401);

    const { default: app } = await import("../src/api/index");
    return app.fetch(request);
  },
};
