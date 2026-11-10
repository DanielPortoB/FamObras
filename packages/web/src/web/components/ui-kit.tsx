import type { ReactNode } from "react";
import { cn } from "../lib/utils";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(18,95,61,0.06)]", className)}>
      {children}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("flex flex-col gap-1.5 text-sm", className)}>
      <span className="font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

export function ErrorBox({ error }: { error: unknown }) {
  if (!error) return null;
  const msg = error instanceof Error ? error.message : "Erro inesperado";
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-destructive">{msg}</div>
  );
}

export function Badge({ children, tone = "green" }: { children: ReactNode; tone?: "green" | "gray" | "red" | "amber" }) {
  const tones = {
    green: "bg-emerald-50 text-primary border-emerald-200",
    gray: "bg-zinc-100 text-zinc-600 border-zinc-200",
    red: "bg-red-50 text-destructive border-red-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", tones[tone])}>
      {children}
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{children}</div>;
}

export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: "default" | "good" | "bad" }) {
  return (
    <Card className="relative overflow-hidden">
      <div className={cn("absolute inset-x-0 top-0 h-1", tone === "bad" ? "bg-destructive" : tone === "good" ? "bg-accent-strong" : "bg-primary")} />
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("mt-2 text-2xl font-bold", tone === "bad" ? "text-destructive" : tone === "good" ? "text-primary" : "text-foreground")}>{value}</p>
    </Card>
  );
}
