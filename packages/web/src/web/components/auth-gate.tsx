import { createContext, useContext, useEffect, useState, type FormEvent, type ReactNode } from "react";

type AuthContextValue = { logout: () => Promise<void> };
const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth precisa ser usado dentro de AuthGate.");
  return value;
}

export function AuthGate({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [checked, setChecked] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (import.meta.env.DEV) {
      setAuthenticated(true);
      setChecked(true);
      return;
    }
    let active = true;
    fetch("/api/auth/session", { credentials: "same-origin" })
      .then(async (response) => {
        if (active) {
          setAuthenticated(response.ok);
          if (response.status === 503) setError("A proteção ainda não foi configurada na Vercel.");
        }
      })
      .catch(() => {
        if (active) setError("Não foi possível conectar à API do app.");
      })
      .finally(() => {
        if (active) setChecked(true);
      });
    return () => {
      active = false;
    };
  }, []);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(result?.error ?? "Não foi possível entrar.");
      }
      setPassword("");
      setAuthenticated(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível entrar.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }).catch(() => undefined);
    setAuthenticated(false);
  }

  if (!checked) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Carregando…</div>;
  }

  if (error && !authenticated && !password) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <section className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
          <Brand />
          <p className="mt-6 text-sm text-red-700">{error}</p>
          <button className="mt-5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white" onClick={() => window.location.reload()}>
            Tentar novamente
          </button>
        </section>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <section className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
          <Brand />
          <h1 className="mt-8 text-xl font-bold text-slate-900">Acesso restrito</h1>
          <p className="mt-2 text-sm text-slate-600">Digite sua senha para abrir o painel.</p>
          <form className="mt-6 space-y-4" onSubmit={login}>
            <label className="block text-sm font-medium text-slate-700" htmlFor="app-password">Senha</label>
            <input
              id="app-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border px-3 py-2 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <button disabled={busy} className="w-full rounded-lg bg-primary px-4 py-2.5 font-semibold text-white disabled:opacity-60">
              {busy ? "Verificando…" : "Entrar"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return <AuthContext.Provider value={{ logout }}>{children}</AuthContext.Provider>;
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary font-extrabold text-white">FM</div>
      <div className="leading-tight">
        <p className="font-extrabold tracking-tight text-primary">FAM Obras</p>
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">FAM Metal</p>
      </div>
    </div>
  );
}
