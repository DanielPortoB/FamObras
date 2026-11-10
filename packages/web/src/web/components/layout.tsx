import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "../lib/utils";
import { useAuth } from "./auth-gate";

const NAV = [
  { href: "/", label: "Início" },
  { href: "/obras", label: "Obras" },
  { href: "/funcionarios", label: "Funcionários" },
  { href: "/financeiro", label: "Financeiro" },
];

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { logout } = useAuth();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="no-print sticky top-0 z-30 border-b border-border bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-extrabold text-white">
              FM
            </div>
            <div className="leading-tight">
              <p className="text-base font-extrabold tracking-tight text-primary">FAM Obras</p>
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">FAM Metal</p>
            </div>
          </Link>
          <div className="flex min-w-0 items-center gap-2">
            <nav className="flex gap-1 overflow-x-auto">
              {NAV.map((n) => {
                const active = n.href === "/" ? location === "/" : location.startsWith(n.href);
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    className={cn(
                      "whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition",
                      active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-primary",
                    )}
                  >
                    {n.label}
                  </Link>
                );
              })}
            </nav>
            <button
              type="button"
              onClick={() => void logout()}
              className="whitespace-nowrap rounded-lg border px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-primary"
            >
              Sair
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:py-8">{children}</main>
      <footer className="no-print border-t border-border/70 py-5 text-center text-xs text-muted-foreground">
        FAM Obras · FAM Metal · Criado por <span className="font-semibold text-primary">Daniel Porto</span>
      </footer>
    </div>
  );
}
