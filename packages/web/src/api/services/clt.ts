/**
 * Custo CLT diário do funcionário na obra.
 * Premissas (ajustáveis aqui):
 * - valor da hora = salário mensal / 220 h
 * - jornada normal de 8 h/dia; o que passar disso é hora extra a 50%
 * - domingo: todas as horas a 100%
 * - periculosidade 30% e insalubridade 40% incidem sobre a hora (inclusive na base da hora extra)
 * - encargos: INSS patronal 20%, FGTS 8%, 13º + férias provisionados 19,44%
 * - ajuda de custo, combustível e vale-transporte são valores MENSAIS, rateados por dia corrido:
 *   valor mensal ÷ 30 × dias corridos que o funcionário fica na obra (ver periodBenefits)
 */
export const CLT = {
  monthlyHours: 220,
  normalDayHours: 8,
  overtimeRate: 1.5,
  sundayRate: 2,
  encargosRate: 0.2 + 0.08 + 0.1944,
  adicional: { nenhum: 0, periculosidade: 0.3, insalubridade: 0.4 } as Record<string, number>,
};

export type DayCostInput = {
  salary: number;
  adicional: string;
  hours: number;
  presence: string;
  date?: string;
};

export type DayCost = { hours: number; gross: number; encargos: number; total: number };

const r2 = (n: number) => Math.round(n * 100) / 100;

export function dayLaborCost(i: DayCostInput): DayCost {
  if (i.presence === "falta") return { hours: 0, gross: 0, encargos: 0, total: 0 };
  // Dia sem horário lançado conta como jornada normal
  const hours = i.hours > 0 ? i.hours : CLT.normalDayHours;
  const hv = (i.salary / CLT.monthlyHours) * (1 + (CLT.adicional[i.adicional] ?? 0));
  const sunday = i.date ? new Date(`${i.date}T12:00:00`).getDay() === 0 : false;
  const normal = sunday ? 0 : Math.min(hours, CLT.normalDayHours);
  const extra = sunday ? 0 : Math.max(0, hours - CLT.normalDayHours);
  const sundayHours = sunday ? hours : 0;
  const gross = normal * hv + extra * hv * CLT.overtimeRate + sundayHours * hv * CLT.sundayRate;
  const encargos = gross * CLT.encargosRate;
  return {
    hours: r2(hours),
    gross: r2(gross),
    encargos: r2(encargos),
    total: r2(gross + encargos),
  };
}

/** Horas do turno: saída - entrada - intervalo. Se não tiver horário, retorna 0. */
export function shiftHours(entry: string | null | undefined, exit: string | null | undefined, breakHours: number) {
  if (!entry || !exit) return 0;
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  let diff = toMin(exit) - toMin(entry);
  if (diff < 0) diff += 24 * 60; // virou a noite
  return r2(Math.max(0, diff / 60 - (breakHours || 0)));
}

/** Dias corridos entre duas datas (inclusivo). */
export function calendarDays(start: string, end: string) {
  const a = Date.parse(`${start}T12:00:00Z`);
  const b = Date.parse(`${end}T12:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return 0;
  return Math.round((b - a) / 86_400_000) + 1;
}

/**
 * Benefícios mensais rateados pelo período na obra: valor mensal ÷ 30 × dias corridos.
 * Período = entrada/saída do funcionário na obra; se não informado, usa as datas da obra.
 */
export function periodBenefits(i: {
  monthlyAllowance: number;
  monthlyFuel: number;
  monthlyTransport: number;
  periodStart: string | null;
  periodEnd: string | null;
  workStart: string;
  workEnd: string;
}) {
  const start = i.periodStart || i.workStart;
  const end = i.periodEnd || i.workEnd;
  const days = calendarDays(start, end);
  const f = days / 30;
  const allowance = r2(i.monthlyAllowance * f);
  const fuel = r2(i.monthlyFuel * f);
  const transport = r2(i.monthlyTransport * f);
  return { start, end, days, allowance, fuel, transport, total: r2(allowance + fuel + transport) };
}
