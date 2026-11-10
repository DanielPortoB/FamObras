import { cn } from "../lib/utils";

/** Foto do funcionário ou iniciais */
export function Avatar({ name, photo, size = 40, className }: { name: string; photo?: string | null; size?: number; className?: string }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return (
    <div
      className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-accent font-bold text-primary", className)}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      {photo ? <img src={photo} alt={`Foto de ${name}`} className="h-full w-full object-cover" /> : initials || "?"}
    </div>
  );
}
