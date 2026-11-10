import { z } from "zod";
import { eq, desc, inArray } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { base } from "../__core/app";
import { db } from "../database";
import * as schema from "../database/schema";
import { defaultTools } from "../database/default-tools";
import { dayLaborCost, periodBenefits } from "../services/clt";
import { buildChecklistHtml, buildToolsXlsx } from "../services/files";
import { sendEmail } from "../services/email";
import { checkCompliance, todayISO } from "../services/compliance";

const CHECKLIST_DEFAULT: { category: string; description: string }[] = [
  { category: "hospedagem", description: "Reservar hospedagem para a equipe" },
  { category: "hospedagem", description: "Confirmar endereço e check-in" },
  { category: "alimentacao", description: "Definir café, almoço e janta (marmitex / restaurante)" },
  { category: "alimentacao", description: "Verificar água potável e lanches" },
  { category: "transporte", description: "Definir veículos (carros e caminhões)" },
  { category: "transporte", description: "Programar transporte de peças e materiais" },
  { category: "transporte", description: "Programar transporte da equipe (ida e volta)" },
  { category: "outros", description: "Confirmar EPIs e documentos de segurança (ASO, NR)" },
  { category: "outros", description: "Confirmar acesso e autorização de entrada na obra" },
];

export const EQUIPMENT_SEED = ["Munck", "Guindastes", "PTA", "Compressor", "Jato de granalha", "Cesto para munck", "Carreta"];

export const ELECTRIC_SEED = [
  "Tensão da unidade: 220V",
  "Tensão da unidade: 380V",
  "Tensão da unidade: 440V",
  "Tomada 16A (steck)",
  "Tomada 32A (steck)",
  "Extensão precisa de DR",
  "Robô precisa de projeto elétrico na tampa",
  "Aterramento verificado",
  "Quadro com disjuntor e proteção",
];

/** Garante os itens de equipamentos e elétrico em obras antigas (sem duplicar) */
export async function ensureSeedChecklist(workId: number) {
  const rows = await db.select().from(schema.workChecklist).where(eq(schema.workChecklist.workId, workId));
  const has = (cat: string) => rows.some((r) => r.category === cat);
  const toInsert: { workId: number; category: string; description: string; note: null; done: boolean }[] = [];
  if (!has("equipamentos"))
    toInsert.push(...EQUIPMENT_SEED.map((d) => ({ workId, category: "equipamentos", description: d, note: null, done: false })));
  if (!has("eletrico"))
    toInsert.push(...ELECTRIC_SEED.map((d) => ({ workId, category: "eletrico", description: d, note: null, done: false })));
  if (toInsert.length) await db.insert(schema.workChecklist).values(toInsert);
}

const workInput = z.object({
  name: z.string().min(2),
  city: z.string().min(2),
  client: z.string().optional().nullable(),
  responsible: z.string().optional().nullable(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  contractValue: z.number().min(0),
  functionsCount: z.number().int().min(0).optional(),
  pricingModel: z.enum(["pacote", "hh"]).optional(),
  hasSedeFabrication: z.boolean().optional(),
  requiredCrew: z.number().int().min(0).optional(),
  // quantidade por função; se não vier, mantém o que já estava gravado
  // capa da obra reduzida no navegador; undefined = mantém a atual, null = remove
  coverImage: z.string().startsWith("data:image/").max(1_500_000).optional().nullable(),
  crewPlan: z
    .array(
      z.object({
        role: z.string().min(1),
        qty: z.number().int().min(1),
        salary: z.number().min(0).optional(), // salário mensal padrão da função nesta obra
        adicional: z.enum(["nenhum", "periculosidade", "insalubridade"]).optional(),
      }),
    )
    .optional(),
});

/** Plano de funções -> colunas da obra (JSON + totais). Campos ausentes não são alterados */
function planValues(input: z.infer<typeof workInput>) {
  const { crewPlan, ...rest } = input;
  const out: Record<string, unknown> & typeof rest & { crewPlan?: string | null } = {
    ...rest,
    client: input.client ?? null,
    responsible: input.responsible ?? null,
  };
  for (const k of ["functionsCount", "pricingModel", "hasSedeFabrication", "requiredCrew"] as const) {
    if (out[k] === undefined) delete out[k];
  }
  if (crewPlan) {
    const plan = crewPlan.filter((p) => p.role.trim()).map((p) => ({ role: p.role.trim(), qty: p.qty, salary: p.salary ?? 0, adicional: p.adicional ?? "nenhum" }));
    out.crewPlan = plan.length ? JSON.stringify(plan) : null;
    out.functionsCount = plan.length;
    out.requiredCrew = plan.reduce((s, p) => s + p.qty, 0);
  }
  return out;
}

export type PlanRow = { role: string; qty: number; salary: number; adicional: "nenhum" | "periculosidade" | "insalubridade" };

export function parsePlan(raw: string | null): PlanRow[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    return v.map((p) => ({
      role: String(p.role ?? ""),
      qty: Number(p.qty) || 1,
      salary: Number(p.salary) || 0,
      adicional: ["periculosidade", "insalubridade"].includes(p.adicional) ? p.adicional : "nenhum",
    }));
  } catch {
    return [];
  }
}

/** Nota final da avaliação: média simples das três notas, 1 casa decimal */
export function evaluationAverage(p: number, a: number, r: number) {
  return Math.round(((p + a + r) / 3) * 10) / 10;
}

export function normalizeCity(c: string) {
  return c.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export const works = {
  list: base.handler(async () => {
    const rows = await db.select().from(schema.works).orderBy(desc(schema.works.startDate));
    const expenseRows = await db.select().from(schema.expenses);
    const teamRows = await db.select().from(schema.workEmployees);
    return rows.map((w) => ({
      ...w,
      totalCost: expenseRows.filter((e) => e.workId === w.id).reduce((s, e) => s + e.total, 0),
      teamSize: teamRows.filter((t) => t.workId === w.id).length,
    }));
  }),

  get: base.input(z.object({ id: z.number() })).handler(async ({ input }) => {
    const [work] = await db.select().from(schema.works).where(eq(schema.works.id, input.id));
    if (!work) throw new ORPCError("NOT_FOUND", { message: "Obra não encontrada." });
    await ensureSeedChecklist(work.id);
    const team = await db
      .select({ link: schema.workEmployees, emp: schema.employees })
      .from(schema.workEmployees)
      .innerJoin(schema.employees, eq(schema.employees.id, schema.workEmployees.employeeId))
      .where(eq(schema.workEmployees.workId, work.id));
    const tools = await db
      .select()
      .from(schema.workTools)
      .where(eq(schema.workTools.workId, work.id))
      .orderBy(schema.workTools.sortOrder);
    const checklist = await db
      .select()
      .from(schema.workChecklist)
      .where(eq(schema.workChecklist.workId, work.id));
    const att = await db.select().from(schema.attendance).where(eq(schema.attendance.workId, work.id));
    const evals = await db.select().from(schema.evaluations).where(eq(schema.evaluations.workId, work.id));
    const rdoRows = await db.select().from(schema.rdos).where(eq(schema.rdos.workId, work.id)).orderBy(desc(schema.rdos.date));
    const crewRows = rdoRows.length ? await db.select().from(schema.rdoCrew).where(inArray(schema.rdoCrew.rdoId, rdoRows.map((r) => r.id))) : [];
    const exps = await db
      .select()
      .from(schema.expenses)
      .where(eq(schema.expenses.workId, work.id))
      .orderBy(desc(schema.expenses.date));
    const empIds = team.map((t) => t.emp.id);
    const ints = (await db.select().from(schema.employeeIntegrations)).filter((i) => empIds.includes(i.employeeId));
    const nrRows = (await db.select().from(schema.employeeNrs)).filter((n) => empIds.includes(n.employeeId));
    const today = todayISO();
    return {
      work: { ...work, plan: parsePlan(work.crewPlan) },
      team: team.map((t) => ({
        ...t.emp,
        linkId: t.link.id,
        terms: termsOf(t.link),
        benefits: periodBenefits({
          monthlyAllowance: t.link.monthlyAllowance,
          monthlyFuel: t.link.monthlyFuel,
          monthlyTransport: t.link.monthlyTransport,
          periodStart: t.link.periodStart,
          periodEnd: t.link.periodEnd,
          workStart: work.startDate,
          workEnd: work.endDate,
        }),
        issues: checkCompliance({
          role: t.emp.role,
          asoValidUntil: t.emp.asoValidUntil,
          integrations: ints.filter((i) => i.employeeId === t.emp.id),
          nrs: nrRows.filter((n) => n.employeeId === t.emp.id),
          work,
          today,
        }),
      })),
      tools,
      checklist,
      attendance: att
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
        .map((a) => {
          const link = team.find((t) => t.emp.id === a.employeeId)?.link;
          const cost = link
            ? dayLaborCost({
                salary: link.salary,
                adicional: link.adicional,
                hours: a.hoursWorked,
                presence: a.presence,
                date: a.date,
              })
            : null;
          return { ...a, cost };
        }),
      evaluations: evals,
      expenses: exps,
      rdos: rdoRows.map((r) => ({ ...r, crew: crewRows.filter((c) => c.rdoId === r.id) })),
    };
  }),

  create: base.input(workInput).handler(async ({ input }) => {
    if (input.endDate < input.startDate) {
      throw new ORPCError("BAD_REQUEST", { message: "A data fim não pode ser antes do início." });
    }
    const [work] = await db
      .insert(schema.works)
      .values(planValues(input))
      .returning();
    // Já cria a lista de ferramentas (modelo da planilha) e o checklist
    await db.insert(schema.workTools).values(
      defaultTools.map((t, i) => ({
        workId: work.id,
        name: t.name,
        unit: t.unit,
        quantity: t.quantity,
        attended: false,
        sortOrder: i,
      })),
    );
    await db.insert(schema.workChecklist).values(
      CHECKLIST_DEFAULT.map((c) => ({ ...c, workId: work.id, note: null, done: false })),
    );
    await ensureSeedChecklist(work.id);
    return work;
  }),

  update: base.input(workInput.extend({ id: z.number(), status: z.string() })).handler(async ({ input }) => {
    const { id, status, ...rest } = input;
    const data = { ...planValues(rest), status };
    if (data.endDate < data.startDate) {
      throw new ORPCError("BAD_REQUEST", { message: "A data fim não pode ser antes do início." });
    }
    if (!["planejada", "em_andamento", "concluida"].includes(data.status)) {
      throw new ORPCError("BAD_REQUEST", { message: "Status inválido." });
    }
    if (data.status === "concluida") {
      await assertReadyToClose(id);
    }
    const [row] = await db
      .update(schema.works)
      .set(data)
      .where(eq(schema.works.id, id))
      .returning();
    return row;
  }),

  remove: base.input(z.object({ id: z.number() })).handler(async ({ input }) => {
    const id = input.id;
    await db.delete(schema.workEmployees).where(eq(schema.workEmployees.workId, id));
    await db.delete(schema.workTools).where(eq(schema.workTools.workId, id));
    await db.delete(schema.workChecklist).where(eq(schema.workChecklist.workId, id));
    await db.delete(schema.attendance).where(eq(schema.attendance.workId, id));
    await db.delete(schema.evaluations).where(eq(schema.evaluations.workId, id));
    await db.delete(schema.expenses).where(eq(schema.expenses.workId, id));
    const rdoIds = (await db.select({ id: schema.rdos.id }).from(schema.rdos).where(eq(schema.rdos.workId, id))).map((r) => r.id);
    if (rdoIds.length) {
      await db.delete(schema.rdoPhotos).where(inArray(schema.rdoPhotos.rdoId, rdoIds));
      await db.delete(schema.rdoCrew).where(inArray(schema.rdoCrew.rdoId, rdoIds));
      await db.delete(schema.rdos).where(eq(schema.rdos.workId, id));
    }
    await db.delete(schema.works).where(eq(schema.works.id, id));
    return { ok: true };
  }),

  /** Relatório final: custos por categoria, mão de obra CLT, equipe (titular/reserva), avaliações e RDO */
  report: base.input(z.object({ id: z.number() })).handler(async ({ input }) => {
    const [work] = await db.select().from(schema.works).where(eq(schema.works.id, input.id));
    if (!work) throw new ORPCError("NOT_FOUND", { message: "Obra não encontrada." });
    const exps = await db.select().from(schema.expenses).where(eq(schema.expenses.workId, work.id));
    const evals = await db.select().from(schema.evaluations).where(eq(schema.evaluations.workId, work.id));
    const rdoRows = await db.select().from(schema.rdos).where(eq(schema.rdos.workId, work.id)).orderBy(desc(schema.rdos.date));
    const crewRows = rdoRows.length ? await db.select().from(schema.rdoCrew).where(inArray(schema.rdoCrew.rdoId, rdoRows.map((r) => r.id))) : [];
    const rdoIds = rdoRows.map((r) => r.id);
    const photos = rdoIds.length
      ? (await db.select().from(schema.rdoPhotos)).filter((p) => rdoIds.includes(p.rdoId))
      : [];
    const labor = await laborForWork(work.id);

    const byCategory: Record<string, { total: number; quantity: number }> = {};
    for (const e of exps) {
      byCategory[e.category] ??= { total: 0, quantity: 0 };
      byCategory[e.category].total += e.total;
      byCategory[e.category].quantity += e.quantity;
    }
    const expensesTotal = exps.reduce((s, e) => s + e.total, 0);
    const totalCost = expensesTotal + labor.total;
    const result = work.contractValue - totalCost;
    const avgOf = (arr: number[]) => (arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null);

    return {
      work,
      byCategory,
      expensesTotal,
      labor,
      totalCost,
      revenue: work.contractValue,
      result, // positivo = lucro, negativo = prejuízo
      margin: work.contractValue > 0 ? (result / work.contractValue) * 100 : null,
      hoursWorked: labor.hours,
      team: labor.perEmployee.map((p) => {
        const ev = evals.find((e) => e.employeeId === p.employeeId);
        return {
          id: p.employeeId,
          name: p.name,
          role: p.role,
          city: p.city,
          crewType: p.crewType,
          isLocal: normalizeCity(p.city) === normalizeCity(work.city),
          presentDays: p.presentDays,
          absentDays: p.absentDays,
          lateDays: p.lateDays,
          hours: p.hours,
          cost: p.cost,
          evaluation: ev ?? null,
        };
      }),
      crew: {
        required: work.requiredCrew,
        titulares: labor.perEmployee.filter((p) => p.crewType === "titular").length,
        reservas: labor.perEmployee.filter((p) => p.crewType === "reserva").length,
      },
      teamAverage: avgOf(evals.map((e) => e.average)),
      pendingEvaluations: labor.perEmployee.filter((p) => !evals.some((e) => e.employeeId === p.employeeId)).map((p) => p.name),
      rdos: rdoRows.map((r) => ({ ...r, photos: photos.filter((p) => p.rdoId === r.id), crew: crewRows.filter((c) => c.rdoId === r.id) })),
      productivity: productivitySummary(crewRows),
    };
  }),

  /** Painel financeiro: todas as obras, com receita, custos e resultado */
  finance: base.handler(async () => {
    const rows = await db.select().from(schema.works).orderBy(desc(schema.works.startDate));
    const exps = await db.select().from(schema.expenses);
    const out = [];
    for (const w of rows) {
      const labor = await laborForWork(w.id);
      const expensesTotal = exps.filter((e) => e.workId === w.id).reduce((s, e) => s + e.total, 0);
      const totalCost = expensesTotal + labor.total;
      out.push({
        id: w.id,
        name: w.name,
        city: w.city,
        client: w.client,
        status: w.status,
        pricingModel: w.pricingModel,
        revenue: w.contractValue,
        startDate: w.startDate,
        endDate: w.endDate,
        laborCost: labor.total,
        laborGross: labor.gross,
        laborEncargos: labor.encargos,
        laborBeneficios: labor.beneficios + labor.vouchers,
        hours: labor.hours,
        expensesCost: expensesTotal,
        totalCost,
        result: w.contractValue - totalCost,
      });
    }
    return out;
  }),

  /** Financeiro completo de uma obra: mão de obra por funcionário, despesas por categoria e lançamento a lançamento */
  financeDetail: base.input(z.object({ id: z.number() })).handler(async ({ input }) => {
    const [work] = await db.select().from(schema.works).where(eq(schema.works.id, input.id));
    if (!work) throw new ORPCError("NOT_FOUND", { message: "Obra não encontrada." });
    const exps = await db.select().from(schema.expenses).where(eq(schema.expenses.workId, work.id)).orderBy(desc(schema.expenses.date));
    const emps = await db.select({ id: schema.employees.id, name: schema.employees.name }).from(schema.employees);
    const labor = await laborForWork(work.id);
    const byCategory: Record<string, { total: number; quantity: number; entries: number }> = {};
    for (const e of exps) {
      byCategory[e.category] ??= { total: 0, quantity: 0, entries: 0 };
      byCategory[e.category].total += e.total;
      byCategory[e.category].quantity += e.quantity;
      byCategory[e.category].entries += 1;
    }
    const expensesTotal = exps.reduce((s, e) => s + e.total, 0);
    const totalCost = expensesTotal + labor.total;
    const result = work.contractValue - totalCost;
    return {
      work: { id: work.id, name: work.name, city: work.city, client: work.client, status: work.status, pricingModel: work.pricingModel, startDate: work.startDate, endDate: work.endDate },
      revenue: work.contractValue,
      labor: { ...labor, perEmployee: labor.perEmployee.map((p) => ({ employeeId: p.employeeId, name: p.name, role: p.role, crewType: p.crewType, hours: p.hours, presentDays: p.presentDays, benefits: p.benefits.total, voucher: p.terms.voucher, cost: p.cost })) },
      byCategory,
      expensesTotal,
      expenses: exps.map((e) => ({ ...e, employeeName: e.employeeId ? emps.find((x) => x.id === e.employeeId)?.name ?? null : null })),
      totalCost,
      result,
      margin: work.contractValue > 0 ? (result / work.contractValue) * 100 : null,
    };
  }),

  /** Excel da lista de ferramentas (base64) */
  toolsExcel: base.input(z.object({ workId: z.number() })).handler(async ({ input }) => {
    const [work] = await db.select().from(schema.works).where(eq(schema.works.id, input.workId));
    if (!work) throw new ORPCError("NOT_FOUND", { message: "Obra não encontrada." });
    const tools = await db.select().from(schema.workTools).where(eq(schema.workTools.workId, work.id)).orderBy(schema.workTools.sortOrder);
    const base64 = await buildToolsXlsx(work.name, tools);
    return { filename: `ferramentas-${slug(work.name)}.xlsx`, base64 };
  }),

  /** Envia por e-mail o Excel das ferramentas */
  toolsEmail: base.input(z.object({ workId: z.number(), to: z.string().email() })).handler(async ({ input }) => {
    const [work] = await db.select().from(schema.works).where(eq(schema.works.id, input.workId));
    if (!work) throw new ORPCError("NOT_FOUND", { message: "Obra não encontrada." });
    const tools = await db.select().from(schema.workTools).where(eq(schema.workTools.workId, work.id)).orderBy(schema.workTools.sortOrder);
    const base64 = await buildToolsXlsx(work.name, tools);
    return sendEmail({
      to: input.to,
      subject: `Lista de ferramentas - ${work.name}`,
      html: `<p>Segue em anexo a lista de ferramentas da obra <b>${work.name}</b> (${work.city}).</p><p>FAM Obras</p>`,
      attachments: [{ filename: `ferramentas-${slug(work.name)}.xlsx`, contentBase64: base64 }],
    });
  }),

  /** Checklist da obra em formato Word (.doc) (base64) */
  checklistDoc: base.input(z.object({ workId: z.number() })).handler(async ({ input }) => {
    const [work] = await db.select().from(schema.works).where(eq(schema.works.id, input.workId));
    if (!work) throw new ORPCError("NOT_FOUND", { message: "Obra não encontrada." });
    const items = await db.select().from(schema.workChecklist).where(eq(schema.workChecklist.workId, work.id));
    const html = buildChecklistHtml(work.name, items);
    return { filename: `checklist-${slug(work.name)}.doc`, base64: Buffer.from(html, "utf8").toString("base64") };
  }),

  /** Envia o checklist (Word) por e-mail */
  checklistEmail: base.input(z.object({ workId: z.number(), to: z.string().email() })).handler(async ({ input }) => {
    const [work] = await db.select().from(schema.works).where(eq(schema.works.id, input.workId));
    if (!work) throw new ORPCError("NOT_FOUND", { message: "Obra não encontrada." });
    const items = await db.select().from(schema.workChecklist).where(eq(schema.workChecklist.workId, work.id));
    const html = buildChecklistHtml(work.name, items);
    return sendEmail({
      to: input.to,
      subject: `Checklist da obra - ${work.name}`,
      html: `<p>Segue em anexo o checklist da obra <b>${work.name}</b> (${work.city}).</p><p>FAM Obras</p>`,
      attachments: [
        { filename: `checklist-${slug(work.name)}.doc`, contentBase64: Buffer.from(html, "utf8").toString("base64"), contentType: "application/msword" },
      ],
    });
  }),
};

const slug = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/** Tipo, salário e benefícios do funcionário nesta obra */
export function termsOf(link: {
  crewType: string;
  salary: number;
  adicional: string;
  monthlyAllowance: number;
  monthlyFuel: number;
  monthlyTransport: number;
  voucher: number;
  periodStart: string | null;
  periodEnd: string | null;
}) {
  return {
    crewType: link.crewType,
    salary: link.salary,
    adicional: link.adicional,
    monthlyAllowance: link.monthlyAllowance,
    monthlyFuel: link.monthlyFuel,
    monthlyTransport: link.monthlyTransport,
    voucher: link.voucher,
    periodStart: link.periodStart,
    periodEnd: link.periodEnd,
  };
}

/** Custo de mão de obra CLT da obra, por funcionário e por dia trabalhado */
export async function laborForWork(workId: number) {
  const team = await db
    .select({ link: schema.workEmployees, emp: schema.employees })
    .from(schema.workEmployees)
    .innerJoin(schema.employees, eq(schema.employees.id, schema.workEmployees.employeeId))
    .where(eq(schema.workEmployees.workId, workId));
  const att = await db.select().from(schema.attendance).where(eq(schema.attendance.workId, workId));
  const [work] = await db.select().from(schema.works).where(eq(schema.works.id, workId));

  let total = 0;
  let hours = 0;
  let gross = 0;
  let encargos = 0;
  let beneficios = 0;
  let vouchers = 0;
  const perEmployee = team.map((t) => {
    const days = att.filter((a) => a.employeeId === t.emp.id);
    let cost = 0;
    let h = 0;
    for (const d of days) {
      const c = dayLaborCost({
        salary: t.link.salary,
        adicional: t.link.adicional,
        hours: d.hoursWorked,
        presence: d.presence,
        date: d.date,
      });
      cost += c.total;
      h += c.hours;
      gross += c.gross;
      encargos += c.encargos;
    }
    // Benefícios mensais rateados pelos dias corridos na obra
    const ben = periodBenefits({
      monthlyAllowance: t.link.monthlyAllowance,
      monthlyFuel: t.link.monthlyFuel,
      monthlyTransport: t.link.monthlyTransport,
      periodStart: t.link.periodStart,
      periodEnd: t.link.periodEnd,
      workStart: work?.startDate ?? "",
      workEnd: work?.endDate ?? "",
    });
    cost += ben.total;
    beneficios += ben.total;
    cost += t.link.voucher;
    vouchers += t.link.voucher;
    total += cost;
    hours += h;
    return {
      employeeId: t.emp.id,
      name: t.emp.name,
      role: t.emp.role,
      city: t.emp.city,
      crewType: t.link.crewType,
      presentDays: days.filter((d) => d.presence === "presente").length,
      absentDays: days.filter((d) => d.presence === "falta").length,
      lateDays: days.filter((d) => d.presence === "atraso").length,
      hours: Math.round(h * 100) / 100,
      cost: Math.round(cost * 100) / 100,
      terms: termsOf(t.link),
      benefits: ben,
    };
  });
  const r = (n: number) => Math.round(n * 100) / 100;
  return {
    total: r(total),
    hours: r(hours),
    gross: r(gross),
    encargos: r(encargos),
    beneficios: r(beneficios),
    vouchers: r(vouchers),
    perEmployee,
  };
}

export async function assertReadyToClose(workId: number) {
  const team = await db
    .select({ employeeId: schema.workEmployees.employeeId })
    .from(schema.workEmployees)
    .where(eq(schema.workEmployees.workId, workId));
  const evals = await db
    .select({ employeeId: schema.evaluations.employeeId })
    .from(schema.evaluations)
    .where(eq(schema.evaluations.workId, workId));
  const missing = team.filter((t) => !evals.some((e) => e.employeeId === t.employeeId));
  if (missing.length > 0) {
    throw new ORPCError("BAD_REQUEST", {
      message: `Falta a avaliação de ${missing.length} funcionário(s). Avalie todos antes de concluir a obra.`,
    });
  }
}

/** Horas produtivas x improdutivas somando todos os RDOs da obra */
export function productivitySummary(
  rows: { name: string; role: string; employeeId: number | null; productiveHours: number; unproductiveHours: number; reason: string | null }[],
) {
  const r = (n: number) => Math.round(n * 100) / 100;
  const productive = rows.reduce((s, c) => s + c.productiveHours, 0);
  const unproductive = rows.reduce((s, c) => s + c.unproductiveHours, 0);
  const total = productive + unproductive;
  const group = <K extends string>(keyOf: (c: (typeof rows)[number]) => K) => {
    const map = new Map<K, { key: K; productive: number; unproductive: number; entries: number }>();
    for (const c of rows) {
      const k = keyOf(c);
      const g = map.get(k) ?? { key: k, productive: 0, unproductive: 0, entries: 0 };
      g.productive += c.productiveHours;
      g.unproductive += c.unproductiveHours;
      g.entries += 1;
      map.set(k, g);
    }
    return [...map.values()]
      .map((g) => ({ ...g, productive: r(g.productive), unproductive: r(g.unproductive), rate: g.productive + g.unproductive ? r((g.productive / (g.productive + g.unproductive)) * 100) : 0 }))
      .sort((a, b) => b.productive + b.unproductive - (a.productive + a.unproductive));
  };
  const reasons = new Map<string, number>();
  for (const c of rows) {
    if (c.unproductiveHours > 0) {
      const k = c.reason?.trim() || "Sem motivo informado";
      reasons.set(k, (reasons.get(k) ?? 0) + c.unproductiveHours);
    }
  }
  return {
    productive: r(productive),
    unproductive: r(unproductive),
    rate: total ? r((productive / total) * 100) : 0,
    byRole: group((c) => c.role.trim() || "Sem função"),
    byEmployee: group((c) => c.name.trim()),
    byReason: [...reasons.entries()].map(([reason, hours]) => ({ reason, hours: r(hours) })).sort((a, b) => b.hours - a.hours),
  };
}
