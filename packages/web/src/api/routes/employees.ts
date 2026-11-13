import { z } from "zod";
import { eq, asc } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { base } from "../__core/app";
import { db } from "../database";
import * as schema from "../database/schema";
import { databaseErrorCode, isEmployeeCpfConflict } from "../database/errors";

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
type EmployeeTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function saveRelations(tx: EmployeeTransaction, employeeId: number, input: EmployeeInput) {
  await tx.delete(schema.employeeIntegrations).where(eq(schema.employeeIntegrations.employeeId, employeeId));
  await tx.delete(schema.employeeNrs).where(eq(schema.employeeNrs.employeeId, employeeId));
  if (input.integrations.length) {
    await tx
      .insert(schema.employeeIntegrations)
      .values(input.integrations.map((i) => ({ ...i, employeeId })));
  }
  if (input.nrs.length) {
    await tx
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

function throwEmployeeWriteError(error: unknown): never {
  if (error instanceof ORPCError) throw error;
  if (isEmployeeCpfConflict(error)) {
    throw new ORPCError("CONFLICT", { message: "Já existe um funcionário com este CPF." });
  }
  console.error("[employees.save] Database failure", { code: databaseErrorCode(error) });
  throw new ORPCError("INTERNAL_SERVER_ERROR", {
    message: "Não foi possível salvar o funcionário. Tente novamente.",
  });
}

export const employees = {
  list: base.handler(async () => {
    try {
      const rows = await db.select().from(schema.employees).orderBy(asc(schema.employees.name));
      const ints = await db.select().from(schema.employeeIntegrations);
      const nrs = await db.select().from(schema.employeeNrs);
      return rows.map((e) => ({
        ...e,
        integrations: ints.filter((i) => i.employeeId === e.id),
        nrs: nrs.filter((n) => n.employeeId === e.id),
      }));
    } catch (error) {
      console.error("[employees.list] Database failure", { code: databaseErrorCode(error) });
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Não foi possível carregar os funcionários. Tente novamente.",
      });
    }
  }),

  create: base.input(employeeInput).handler(async ({ input }) => {
    try {
      return await db.transaction(async (tx) => {
        const [row] = await tx.insert(schema.employees).values(baseValues(input)).returning();
        await saveRelations(tx, row.id, input);
        return row;
      });
    } catch (error) {
      throwEmployeeWriteError(error);
    }
  }),

  update: base.input(employeeInput.extend({ id: z.number() })).handler(async ({ input }) => {
    const { id, ...data } = input;
    try {
      return await db.transaction(async (tx) => {
        const [row] = await tx.update(schema.employees).set(baseValues(data)).where(eq(schema.employees.id, id)).returning();
        if (!row) throw new ORPCError("NOT_FOUND", { message: "Funcionário não encontrado." });
        await saveRelations(tx, id, data);
        return row;
      });
    } catch (error) {
      throwEmployeeWriteError(error);
    }
  }),

  remove: base.input(z.object({ id: z.number() })).handler(async ({ input }) => {
    await db.delete(schema.employeeIntegrations).where(eq(schema.employeeIntegrations.employeeId, input.id));
    await db.delete(schema.employeeNrs).where(eq(schema.employeeNrs.employeeId, input.id));
    await db.delete(schema.employees).where(eq(schema.employees.id, input.id));
    return { ok: true };
  }),
};
