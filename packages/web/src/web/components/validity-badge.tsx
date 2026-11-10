import { Badge } from "./ui-kit";
import { fmtDate, validity } from "../lib/format";

/** Selo de validade: verde ok, âmbar vence em 30 dias, vermelho vencido */
export function ValidityBadge({ label, date }: { label: string; date: string | null | undefined }) {
  const v = validity(date);
  if (v === "sem") return <Badge tone="gray">{label}: sem data</Badge>;
  const tone = v === "vencido" ? "red" : v === "vence" ? "amber" : "green";
  return (
    <Badge tone={tone}>
      {label} {v === "vencido" ? "venceu" : "até"} {fmtDate(date)}
    </Badge>
  );
}
