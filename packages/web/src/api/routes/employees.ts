import { z } from "zod";
import { eq, asc } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { base } from "../__core/app";
import { db } from "../database";
import * as schema from "../database/schema";

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const integrationInput = z.object({
  client: z.string().min(1),
  unit: z.string().min(1),
  integrationDate: dateStr,
  validUntil: dateStr,
});

const nrInput = z.object({
  name: z.string().min(2),
  validUntil: dateStr.optional().nullable(),
});

const employeeInput = z.object({
  name: z.string().min(2),
  role: z.string().min(2),
  cpf: z.string().min(11),
  phone: z.string().optional().nullable(),
  city: z.string().min(2),
  active: z.boolean().optional(),
  asoValidUntil: dateStr.optional().nullable(),
  contractType: z.enum(["obra_certa", "experiencia"]).optional().nullable(),
  // foto reduzida no navegador; undefined = mantém a atual, null = remove
  photo: z.string().startsWith("data:image/").max(600_000).optional().nullable(),
  integrations: z.array(integrationInput).default([]),
  nrs: z.array(nrInput).default([]),
});

type EmployeeInput = z.infer<typeof employeeInput>;

/** Grava integrações e NRs do funcionário (substitui as anteriores) */
async function saveRelations(employeeId: number, input: EmployeeInput) {
  await db.delete(schema.employeeIntegrations).where(eq(schema.employeeIntegrations.employeeId, employeeId));
  await db.delete(schema.employeeNrs).where(eq(schema.employeeNrs.employeeId, employeeId));
  if (input.integrations.length) {
    await db
      .insert(schema.employeeIntegrations)
      .values(input.integrations.map((i) => ({ ...i, employeeId })));
  }
  if (input.nrs.length) {
    await db
      .insert(schema.employeeNrs)
      .values(input.nrs.map((n) => ({ employeeId, name: n.name, validUntil: n.validUntil ?? null })));
  }
}

function baseValues(input: EmployeeInput) {
  const { integrations: _i, nrs: _n, ...rest } = input;
  return {
    ...rest,
    phone: input.phone ?? null,
    active: input.active ?? true,
    asoValidUntil: input.asoValidUntil ?? null,
    contractType: input.contractType ?? null,
  };
}

export const employees = {
  list: base.handler(async () => {
    const rows = await db.select().from(schema.employees).orderBy(asc(schema.employees.name));
    const ints = await db.select().from(schema.employeeIntegrations);
    const nrs = await db.select().from(schema.employeeNrs);
    return rows.map((e) => ({
      ...e,
      integrations: ints.filter((i) => i.employeeId === e.id),
      nrs: nrs.filter((n) => n.employeeId === e.id),
    }));
  }),

  create: base.input(employeeInput).handler(async ({ input }) => {
    let row;
    try {
      [row] = await db.insert(schema.employees).values(baseValues(input)).returning();
    } catch {
      throw new ORPCError("CONFLICT", { message: "Já existe um funcionário com este CPF." });
    }
    await saveRelations(row.id, input);
    return row;
  }),

  update: base.input(employeeInput.extend({ id: z.number() })).handler(async ({ input }) => {
    const { id, ...data } = input;
    let row;
    try {
      [row] = await db.update(schema.employees).set(baseValues(data)).where(eq(schema.employees.id, id)).returning();
    } catch {
      throw new ORPCError("CONFLICT", { message: "Já existe um funcionário com este CPF." });
    }
    if (!row) throw new ORPCError("NOT_FOUND", { message: "Funcionário não encontrado." });
    await saveRelations(id, data);
    return row;
  }),

  remove: base.input(z.object({ id: z.number() })).handler(async ({ input }) => {
    await db.delete(schema.employeeIntegrations).where(eq(schema.employeeIntegrations.employeeId, input.id));
    await db.delete(schema.employeeNrs).where(eq(schema.employeeNrs.employeeId, input.id));
    await db.delete(schema.employees).where(eq(schema.employees.id, input.id));
    return { ok: true };
  }),
};
