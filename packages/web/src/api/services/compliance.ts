/**
 * Conferência de documentação do funcionário para uma obra:
 * ASO, integração no cliente e NRs/habilitações exigidas pela função.
 *
 * A lista ROLE_REQUIREMENTS é o ponto de ajuste: se a função do funcionário contém
 * uma das palavras de "match", ele precisa ter as NRs de "nrs" válidas até o fim da obra.
 */
export const ROLE_REQUIREMENTS: { match: string[]; nrs: string[] }[] = [
  { match: ["eletric"], nrs: ["NR-10"] },
  {
    match: ["montador", "soldador", "caldeir", "mecanic", "ajudante", "encarregado", "supervisor", "lider", "pintor", "jatista"],
    nrs: ["NR-35"],
  },
  { match: ["sinaleiro", "rigger", "amarrador"], nrs: ["Sinaleiro"] },
  { match: ["pta", "plataforma"], nrs: ["PTA"] },
  { match: ["munck", "guindaste", "empilhadeira", "ponte rolante"], nrs: ["NR-11"] },
  { match: ["vigia", "espaco confinado"], nrs: ["NR-33"] },
];

export function norm(s: string | null | undefined) {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** "NR-35", "nr 35", "NR35" -> "nr35" */
const key = (s: string) => norm(s).replace(/ /g, "");

export function requiredNrsForRole(role: string) {
  const r = norm(role);
  const out = new Set<string>();
  for (const req of ROLE_REQUIREMENTS) if (req.match.some((m) => r.includes(m))) req.nrs.forEach((n) => out.add(n));
  return [...out];
}

export type Issue = { level: "erro" | "aviso"; message: string };

const br = (iso: string) => iso.split("-").reverse().join("/");

export function checkCompliance(args: {
  role: string;
  asoValidUntil: string | null;
  integrations: { client: string; unit: string; validUntil: string }[];
  nrs: { name: string; validUntil: string | null }[];
  work: { client: string | null; startDate: string; endDate: string };
  today: string;
}): Issue[] {
  const { work, today } = args;
  const issues: Issue[] = [];
  const limit = work.endDate;

  // ASO
  if (!args.asoValidUntil) issues.push({ level: "aviso", message: "ASO não informado" });
  else if (args.asoValidUntil < today) issues.push({ level: "erro", message: `ASO vencido em ${br(args.asoValidUntil)}` });
  else if (args.asoValidUntil < limit)
    issues.push({ level: "aviso", message: `ASO vence em ${br(args.asoValidUntil)}, antes do fim da obra` });

  // Integração no cliente da obra
  if (work.client) {
    const wc = norm(work.client);
    const matches = args.integrations.filter((i) => {
      const c = norm(i.client);
      const full = norm(`${i.client} ${i.unit}`);
      return (c && wc.includes(c)) || full.includes(wc) || wc.includes(full);
    });
    if (matches.length === 0) issues.push({ level: "erro", message: `Sem integração no cliente "${work.client}"` });
    else {
      const best = matches.reduce((a, b) => (a.validUntil > b.validUntil ? a : b));
      if (best.validUntil < today)
        issues.push({ level: "erro", message: `Integração ${best.client}/${best.unit} vencida em ${br(best.validUntil)}` });
      else if (best.validUntil < limit)
        issues.push({ level: "aviso", message: `Integração ${best.client}/${best.unit} vence em ${br(best.validUntil)}, antes do fim da obra` });
    }
  }

  // NRs exigidas pela função
  for (const req of requiredNrsForRole(args.role)) {
    const has = args.nrs.filter((n) => key(n.name).includes(key(req)));
    if (has.length === 0) {
      issues.push({ level: "erro", message: `Função "${args.role}" exige ${req}, não cadastrada` });
      continue;
    }
    const valid = has.map((n) => n.validUntil).filter(Boolean) as string[];
    if (valid.length === 0) continue; // sem validade informada: considera ok
    const best = valid.sort()[valid.length - 1];
    if (best < today) issues.push({ level: "erro", message: `${req} vencida em ${br(best)}` });
    else if (best < limit) issues.push({ level: "aviso", message: `${req} vence em ${br(best)}, antes do fim da obra` });
  }
  return issues;
}

export function todayISO() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
