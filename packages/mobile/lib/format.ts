export function brl(value: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value ?? 0);
}

/** "2026-11-09" -> "09/11/2026" */
export function fmtDate(iso: string | null | undefined) {
  if (!iso) return "-";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** Data de hoje no fuso local, no formato YYYY-MM-DD */
export function todayISO() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function maskCPF(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

export function unmaskCPF(v: string) {
  return v.replace(/\D/g, "");
}

/** Máscara de telefone brasileiro: (00) 00000-0000 ou (00) 0000-0000 */
export function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Dias até a data (negativo = vencido). null se não tem data */
export function daysUntil(iso: string | null | undefined) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(y, m - 1, d).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((target - today) / 86400000);
}

/** Situação de um documento com validade: ok | vence (até 30 dias) | vencido | sem */
export function validity(iso: string | null | undefined): "ok" | "vence" | "vencido" | "sem" {
  const d = daysUntil(iso);
  if (d === null) return "sem";
  if (d < 0) return "vencido";
  if (d <= 30) return "vence";
  return "ok";
}

/** Horas decimais -> "8h30" */
export function fmtHours(h: number) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return mm ? `${hh}h${String(mm).padStart(2, "0")}` : `${hh}h`;
}

/** Aceita "1.234,56" ou "1234.56" */
export function parseNum(v: string) {
  const s = v.trim();
  if (s.includes(",")) return Number(s.replace(/\./g, "").replace(",", ".")) || 0;
  return Number(s) || 0;
}

/** Soma dias a uma data ISO */
export function addDays(iso: string, n: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n);
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

export const pct = (n: number | null) => (n === null ? "-" : `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`);
