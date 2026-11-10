import { z } from "zod";
import { and, eq, ne, lte, gte } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { base } from "../__core/app";
import { db } from "../database";
import * as schema from "../database/schema";
import { evaluationAverage, normalizeCity } from "./works";
import { shiftHours } from "../services/clt";
import { checkCompliance, todayISO } from "../services/compliance";

const termsInput = z.object({
  crewType: z.enum(["titular", "reserva"]).default("titular"),
  salary: z.number().min(0).default(0),
  adicional: z.enum(["nenhum", "periculosidade", "insalubridade"]).default("nenhum"),
  monthlyAllowance: z.number().min(0).default(0),
  monthlyFuel: z.number().min(0).default(0),
  monthlyTransport: z.number().min(0).default(0),
  voucher: z.number().min(0).default(0),
  // período do funcionário na obra (vazio = obra inteira); usado no rateio dos benefícios mensais
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

const idSchema = z.object({ id: z.number() });

/** Período do funcionário precisa estar dentro da obra e com saída depois da entrada */
function checkPeriod(work: { startDate: string; endDate: string }, t: { periodStart?: string | null; periodEnd?: string | null }) {
  const start = t.periodStart || work.startDate;
  const end = t.periodEnd || work.endDate;
  if (end < start) throw new ORPCError("BAD_REQUEST", { message: "A saída da obra não pode ser antes da entrada." });
  if (start < work.startDate || end > work.endDate)
    throw new ORPCError("BAD_REQUEST", { message: `O período precisa estar dentro da obra (${work.startDate} a ${work.endDate}).` });
}

export const workItems = {
  // ---------- EQUIPE (escala) ----------
  addEmployee: base
    .input(z.object({ workId: z.number(), employeeId: z.number() }).merge(termsInput))
    .handler(async ({ input }) => {
      const [work] = await db.select().from(schema.works).where(eq(schema.works.id, input.workId));
      if (!work) throw new ORPCError("NOT_FOUND", { message: "Obra não encontrada." });
      const [emp] = await db.select().from(schema.employees).where(eq(schema.employees.id, input.employeeId));
      if (!emp) throw new ORPCError("NOT_FOUND", { message: "Funcionário não encontrado." });
      if (!emp.active) throw new ORPCError("BAD_REQUEST", { message: `${emp.name} está inativo.` });
      checkPeriod(work, input);

      // Conflito: o funcionário já está em outra obra com datas que se sobrepõem
      const conflicts = await db
        .select({ w: schema.works })
        .from(schema.workEmployees)
        .innerJoin(schema.works, eq(schema.works.id, schema.workEmployees.workId))
        .where(
          and(
            eq(schema.workEmployees.employeeId, emp.id),
            ne(schema.works.id, work.id),
            lte(schema.works.startDate, work.endDate),
            gte(schema.works.endDate, work.startDate),
          ),
        );
      if (conflicts.length > 0) {
        const c = conflicts[0].w;
        throw new ORPCError("CONFLICT", {
          message: `Conflito de agenda: ${emp.name} já está na obra "${c.name}" (${c.startDate} a ${c.endDate}). Reprograme uma das obras.`,
        });
      }
      try {
        const { workId: _w, employeeId: _e, ...terms } = input;
        await db.insert(schema.workEmployees).values({ workId: work.id, employeeId: emp.id, ...terms });
      } catch {
        throw new ORPCError("CONFLICT", { message: `${emp.name} já está nesta obra.` });
      }
      // Avisos de documentação (não bloqueia a escala)
      const integrations = await db.select().from(schema.employeeIntegrations).where(eq(schema.employeeIntegrations.employeeId, emp.id));
      const nrs = await db.select().from(schema.employeeNrs).where(eq(schema.employeeNrs.employeeId, emp.id));
      const issues = checkCompliance({ role: emp.role, asoValidUntil: emp.asoValidUntil, integrations, nrs, work, today: todayISO() });
      return { ok: true, issues };
    }),

  /** Edita tipo (titular/reserva), salário e benefícios do funcionário nesta obra */
  updateTerms: base
    .input(z.object({ workId: z.number(), employeeId: z.number() }).merge(termsInput))
    .handler(async ({ input }) => {
      const { workId, employeeId, ...terms } = input;
      const [work] = await db.select().from(schema.works).where(eq(schema.works.id, workId));
      if (!work) throw new ORPCError("NOT_FOUND", { message: "Obra não encontrada." });
      checkPeriod(work, terms);
      const [row] = await db
        .update(schema.workEmployees)
        .set(terms)
        .where(and(eq(schema.workEmployees.workId, workId), eq(schema.workEmployees.employeeId, employeeId)))
        .returning();
      if (!row) throw new ORPCError("NOT_FOUND", { message: "Funcionário não está nesta obra." });
      return row;
    }),

  removeEmployee: base
    .input(z.object({ workId: z.number(), employeeId: z.number() }))
    .handler(async ({ input }) => {
      await db
        .delete(schema.workEmployees)
        .where(and(eq(schema.workEmployees.workId, input.workId), eq(schema.workEmployees.employeeId, input.employeeId)));
      return { ok: true };
    }),

  // ---------- PRESENÇA / ENTRADAS ----------
  setAttendance: base
    .input(
      z.object({
        workId: z.number(),
        employeeId: z.number(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        entryTime: z.string().optional().nullable(),
        exitTime: z.string().optional().nullable(),
        breakHours: z.number().min(0).max(12).default(0),
        presence: z.enum(["presente", "falta", "atraso"]),
        note: z.string().optional().nullable(),
      }),
    )
    .handler(async ({ input }) => {
      const entryTime = input.entryTime ?? null;
      const exitTime = input.exitTime ?? null;
      const hoursWorked = input.presence === "falta" ? 0 : shiftHours(entryTime, exitTime, input.breakHours);
      const data = {
        workId: input.workId,
        employeeId: input.employeeId,
        date: input.date,
        presence: input.presence,
        entryTime,
        exitTime,
        breakHours: input.breakHours,
        hoursWorked,
        note: input.note ?? null,
      };
      const existing = await db
        .select()
        .from(schema.attendance)
        .where(
          and(
            eq(schema.attendance.workId, input.workId),
            eq(schema.attendance.employeeId, input.employeeId),
            eq(schema.attendance.date, input.date),
          ),
        );
      if (existing[0]) {
        const [row] = await db
          .update(schema.attendance)
          .set(data)
          .where(eq(schema.attendance.id, existing[0].id))
          .returning();
        return row;
      }
      const [row] = await db.insert(schema.attendance).values(data).returning();
      return row;
    }),

  removeAttendance: base.input(idSchema).handler(async ({ input }) => {
    await db.delete(schema.attendance).where(eq(schema.attendance.id, input.id));
    return { ok: true };
  }),

  // ---------- FERRAMENTAS ----------
  addTool: base
    .input(z.object({ workId: z.number(), name: z.string().min(2), unit: z.string().min(1), quantity: z.number().int().min(0) }))
    .handler(async ({ input }) => {
      const rows = await db.select().from(schema.workTools).where(eq(schema.workTools.workId, input.workId));
      const [row] = await db
        .insert(schema.workTools)
        .values({ ...input, attended: false, sortOrder: rows.length + 1 })
        .returning();
      return row;
    }),

  updateTool: base
    .input(z.object({ id: z.number(), name: z.string().min(2), unit: z.string().min(1), quantity: z.number().int().min(0), attended: z.boolean() }))
    .handler(async ({ input }) => {
      const { id, ...data } = input;
      const [row] = await db.update(schema.workTools).set(data).where(eq(schema.workTools.id, id)).returning();
      return row;
    }),

  removeTool: base.input(idSchema).handler(async ({ input }) => {
    await db.delete(schema.workTools).where(eq(schema.workTools.id, input.id));
    return { ok: true };
  }),

  // ---------- CHECKLIST ----------
  addChecklistItem: base
    .input(z.object({ workId: z.number(), category: z.string(), description: z.string().min(2) }))
    .handler(async ({ input }) => {
      const [row] = await db.insert(schema.workChecklist).values({ ...input, done: false }).returning();
      return row;
    }),

  updateChecklistItem: base
    .input(z.object({ id: z.number(), description: z.string().min(2), note: z.string().optional().nullable() }))
    .handler(async ({ input }) => {
      const [row] = await db
        .update(schema.workChecklist)
        .set({ description: input.description, note: input.note ?? null })
        .where(eq(schema.workChecklist.id, input.id))
        .returning();
      return row;
    }),

  toggleChecklistItem: base.input(z.object({ id: z.number(), done: z.boolean() })).handler(async ({ input }) => {
    const [row] = await db
      .update(schema.workChecklist)
      .set({ done: input.done })
      .where(eq(schema.workChecklist.id, input.id))
      .returning();
    return row;
  }),

  removeChecklistItem: base.input(idSchema).handler(async ({ input }) => {
    await db.delete(schema.workChecklist).where(eq(schema.workChecklist.id, input.id));
    return { ok: true };
  }),

  // ---------- RELATÓRIO DIÁRIO (CUSTOS) ----------
  addExpense: base
    .input(
      z.object({
        workId: z.number(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        category: z.enum([
          "viagem_carro",
          "viagem_caminhao",
          "diaria_equipamento",
          "hora_trabalhada",
          "hospedagem",
          "combustivel",
          "transporte_pecas",
          "alimentacao_almoco",
          "alimentacao_jantar",
          "outros",
        ]),
        description: z.string().optional().nullable(),
        employeeId: z.number().optional().nullable(),
        quantity: z.number().min(0),
        unitCost: z.number().min(0),
      }),
    )
    .handler(async ({ input }) => {
      const [work] = await db.select().from(schema.works).where(eq(schema.works.id, input.workId));
      if (!work) throw new ORPCError("NOT_FOUND", { message: "Obra não encontrada." });

      if (input.category === "combustivel") {
        if (!input.employeeId) {
          throw new ORPCError("BAD_REQUEST", { message: "Combustível precisa informar o funcionário local." });
        }
        const [emp] = await db.select().from(schema.employees).where(eq(schema.employees.id, input.employeeId));
        if (!emp) throw new ORPCError("NOT_FOUND", { message: "Funcionário não encontrado." });
        if (normalizeCity(emp.city) !== normalizeCity(work.city)) {
          throw new ORPCError("BAD_REQUEST", {
            message: `Combustível só para funcionário local. ${emp.name} mora em ${emp.city}, a obra é em ${work.city}.`,
          });
        }
      }

      const [row] = await db
        .insert(schema.expenses)
        .values({
          workId: input.workId,
          date: input.date,
          category: input.category,
          description: input.description ?? null,
          employeeId: input.employeeId ?? null,
          quantity: input.quantity,
          unitCost: input.unitCost,
          total: Math.round(input.quantity * input.unitCost * 100) / 100,
        })
        .returning();
      return row;
    }),

  removeExpense: base.input(idSchema).handler(async ({ input }) => {
    await db.delete(schema.expenses).where(eq(schema.expenses.id, input.id));
    return { ok: true };
  }),

  // ---------- RDO (relatório diário de obra) ----------
  saveRdo: base
    .input(
      z.object({
        workId: z.number(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        weather: z.string().optional().nullable(),
        activities: z.string().min(3),
        incidents: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
        // efetivo do dia; se vier, substitui o que estava gravado
        crew: z
          .array(
            z.object({
              employeeId: z.number().nullable().optional(),
              name: z.string().min(1),
              role: z.string().min(1),
              productiveHours: z.number().min(0).max(24),
              unproductiveHours: z.number().min(0).max(24),
              reason: z.string().optional().nullable(),
            }),
          )
          .optional(),
      }),
    )
    .handler(async ({ input }) => {
      for (const c of input.crew ?? []) {
        if (c.productiveHours + c.unproductiveHours > 24)
          throw new ORPCError("BAD_REQUEST", { message: `${c.name}: horas produtivas + improdutivas passam de 24 h.` });
      }
      const data = {
        workId: input.workId,
        date: input.date,
        weather: input.weather ?? null,
        activities: input.activities,
        incidents: input.incidents ?? null,
        notes: input.notes ?? null,
      };
      const existing = await db
        .select()
        .from(schema.rdos)
        .where(and(eq(schema.rdos.workId, input.workId), eq(schema.rdos.date, input.date)));
      const [row] = existing[0]
        ? await db.update(schema.rdos).set(data).where(eq(schema.rdos.id, existing[0].id)).returning()
        : await db.insert(schema.rdos).values(data).returning();
      if (input.crew) {
        await db.delete(schema.rdoCrew).where(eq(schema.rdoCrew.rdoId, row.id));
        if (input.crew.length)
          await db.insert(schema.rdoCrew).values(
            input.crew.map((c) => ({
              rdoId: row.id,
              employeeId: c.employeeId ?? null,
              name: c.name.trim(),
              role: c.role.trim(),
              productiveHours: c.productiveHours,
              unproductiveHours: c.unproductiveHours,
              reason: c.unproductiveHours > 0 ? c.reason?.trim() || null : null,
            })),
          );
      }
      return row;
    }),

  /** Foto do RDO, já reduzida no navegador (data URL JPEG) */
  addRdoPhoto: base
    .input(z.object({ rdoId: z.number(), dataUrl: z.string().startsWith("data:image/").max(3_000_000), caption: z.string().optional().nullable() }))
    .handler(async ({ input }) => {
      const [row] = await db
        .insert(schema.rdoPhotos)
        .values({ rdoId: input.rdoId, dataUrl: input.dataUrl, caption: input.caption ?? null })
        .returning();
      return row;
    }),

  listRdoPhotos: base.input(z.object({ rdoId: z.number() })).handler(async ({ input }) => {
    return db.select().from(schema.rdoPhotos).where(eq(schema.rdoPhotos.rdoId, input.rdoId));
  }),

  removeRdoPhoto: base.input(idSchema).handler(async ({ input }) => {
    await db.delete(schema.rdoPhotos).where(eq(schema.rdoPhotos.id, input.id));
    return { ok: true };
  }),

  removeRdo: base.input(idSchema).handler(async ({ input }) => {
    await db.delete(schema.rdoPhotos).where(eq(schema.rdoPhotos.rdoId, input.id));
    await db.delete(schema.rdoCrew).where(eq(schema.rdoCrew.rdoId, input.id));
    await db.delete(schema.rdos).where(eq(schema.rdos.id, input.id));
    return { ok: true };
  }),

  // ---------- AVALIAÇÃO DE FUNCIONÁRIO ----------
  saveEvaluation: base
    .input(
      z.object({
        workId: z.number(),
        employeeId: z.number(),
        productivity: z.number().int().min(0).max(10),
        assiduity: z.number().int().min(0).max(10),
        relationship: z.number().int().min(0).max(10),
        comment: z.string().optional().nullable(),
      }),
    )
    .handler(async ({ input }) => {
      const average = evaluationAverage(input.productivity, input.assiduity, input.relationship);
      const data = { ...input, average, comment: input.comment ?? null };
      const existing = await db
        .select()
        .from(schema.evaluations)
        .where(and(eq(schema.evaluations.workId, input.workId), eq(schema.evaluations.employeeId, input.employeeId)));
      if (existing[0]) {
        const [row] = await db.update(schema.evaluations).set(data).where(eq(schema.evaluations.id, existing[0].id)).returning();
        return row;
      }
      const [row] = await db.insert(schema.evaluations).values(data).returning();
      return row;
    }),
};
