import { afterAll, beforeEach, expect, spyOn, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createRouterClient } from "@orpc/server";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import { createApp } from "../src/api/__core/app";
import { LibsqlError } from "@libsql/client";
import { checkEmployeeSchema } from "../src/api/database/check-employees";
import { databaseErrorCode, isEmployeeCpfConflict } from "../src/api/database/errors";

// Override before importing the app's database: tests must never use remote credentials.
const directory = mkdtempSync(join(tmpdir(), "famobras-employees-"));
process.env.DATABASE_URL = pathToFileURL(join(directory, "test.db")).href;
delete process.env.DATABASE_AUTH_TOKEN;
delete process.env.TURSO_AUTH_TOKEN;
const { db } = await import("../src/api/database");
const { employees } = await import("../src/api/routes/employees");
const client = createRouterClient(employees, { context: { headers: new Headers() } });
const log = spyOn(console, "error").mockImplementation(() => {});

const input = {
  name: "Funcionário Teste", role: "Soldador", cpf: "00000000001", city: "Porto Alegre",
  integrations: [{ client: "Cliente teste", unit: "Unidade", integrationDate: "2026-01-01", validUntil: "2027-01-01" }],
  nrs: [{ name: "NR-35", validUntil: "2027-01-01" }],
};

beforeEach(async () => {
  log.mockClear();
  await db.$client.executeMultiple(`
    DROP TABLE IF EXISTS employee_integrations;
    DROP TABLE IF EXISTS employee_nrs;
    DROP TABLE IF EXISTS employees;
    CREATE TABLE employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, role TEXT NOT NULL,
      cpf TEXT NOT NULL UNIQUE, phone TEXT, city TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1,
      aso_valid_until TEXT, contract_type TEXT, photo TEXT, created_at INTEGER NOT NULL
    );
    CREATE TABLE employee_integrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT, employee_id INTEGER NOT NULL, client TEXT NOT NULL,
      unit TEXT NOT NULL, integration_date TEXT NOT NULL, valid_until TEXT NOT NULL
    );
    CREATE TABLE employee_nrs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, employee_id INTEGER NOT NULL, name TEXT NOT NULL, valid_until TEXT
    );
  `);
});

afterAll(async () => {
  log.mockRestore();
  db.$client.close();
  // Release native prepared statements before deleting the file on Windows.
  Bun.gc(true);
  try {
    await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  } catch (error) {
    // libSQL native transaction handles can retain files until process exit on Windows.
    // The OS temporary directory can clean these; do not suppress other cleanup errors.
    if (process.platform !== "win32" || (error as NodeJS.ErrnoException).code !== "EBUSY") throw error;
  }
});

test("empty database accepts an employee and returns relations in the list", async () => {
  expect(await client.list()).toEqual([]);
  const row = await client.create(input);
  const rows = await client.list();
  expect(rows).toHaveLength(1);
  expect(rows[0].id).toBe(row.id);
  expect(rows[0].integrations[0].client).toBe("Cliente teste");
  expect(rows[0].nrs[0].name).toBe("NR-35");
  expect(await checkEmployeeSchema(db.$client)).toEqual({ ok: true, problems: [] });
});

test("real duplicate CPF remains a conflict on create and update", async () => {
  const first = await client.create(input);
  await expect(client.create(input)).rejects.toMatchObject({ code: "CONFLICT", status: 409 });
  const second = await client.create({ ...input, cpf: "00000000002" });
  await expect(client.update({ ...input, id: second.id })).rejects.toMatchObject({ code: "CONFLICT" });
  await client.update({ ...input, id: first.id, name: "Nome atualizado" });
  expect((await client.list()).find((row) => row.id === first.id)?.name).toBe("Nome atualizado");
  expect(await client.list()).toHaveLength(2);
});

test("missing column is an internal failure, never a CPF conflict", async () => {
  await db.$client.execute("ALTER TABLE employees DROP COLUMN photo");
  await expect(client.create(input)).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR", status: 500 });
  await expect(client.list()).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  expect((await checkEmployeeSchema(db.$client)).problems).toContain("Coluna ausente: employees.photo");
  expect(JSON.stringify(log.mock.calls)).not.toContain(input.cpf);
});

test("missing relation table rolls back create, then retry succeeds after repair", async () => {
  await db.$client.execute("DROP TABLE employee_nrs");
  await expect(client.create(input)).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  expect((await db.$client.execute("SELECT count(*) AS count FROM employees")).rows[0].count).toBe(0);
  expect((await db.$client.execute("SELECT count(*) AS count FROM employee_integrations")).rows[0].count).toBe(0);
  expect((await checkEmployeeSchema(db.$client)).problems).toContain("Tabela ausente: employee_nrs");
  await db.$client.execute("CREATE TABLE employee_nrs (id INTEGER PRIMARY KEY, employee_id INTEGER NOT NULL, name TEXT NOT NULL, valid_until TEXT)");
  await client.create(input);
  expect(await client.list()).toHaveLength(1);
});

test("relation failure during edit preserves employee and existing relations", async () => {
  const row = await client.create(input);
  await db.$client.execute(`CREATE TRIGGER reject_nr BEFORE INSERT ON employee_nrs
    BEGIN SELECT RAISE(ABORT, 'test relation failure'); END`);
  await expect(client.update({ ...input, id: row.id, name: "Should roll back", integrations: [] }))
    .rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  const [saved] = await client.list();
  expect(saved.name).toBe(input.name);
  expect(saved.integrations).toHaveLength(1);
  expect(saved.nrs).toHaveLength(1);
});

test("updating a missing employee preserves NOT_FOUND", async () => {
  await expect(client.update({ ...input, id: 999 })).rejects.toMatchObject({ code: "NOT_FOUND" });
});

test("HTTP RPC returns 409 for a duplicate and a sanitized 500 for schema failures", async () => {
  const app = createApp(employees);
  const statuses: number[] = [];
  const bodies: string[] = [];
  const http = createORPCClient<RouterClient<typeof employees>>(new RPCLink({
    url: "http://localhost/api/rpc",
    fetch: async (request) => {
      const response = await app.fetch(request);
      statuses.push(response.status);
      bodies.push(await response.clone().text());
      return response;
    },
  }));
  await http.create(input);
  await expect(http.create(input)).rejects.toMatchObject({ code: "CONFLICT" });
  await db.$client.execute("DROP TABLE employee_nrs");
  await expect(http.list()).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  expect(statuses).toEqual([200, 409, 500]);
  expect(bodies[2]).not.toContain("SELECT");
  expect(bodies[2]).not.toContain(input.cpf);
  expect(bodies[2]).not.toContain("employee_nrs");
});

test("connection/authentication failures are not presented as CPF conflicts", async () => {
  const transaction = spyOn(db, "transaction").mockRejectedValue(new LibsqlError("private connection details", "SERVER_ERROR"));
  try {
    await expect(client.create(input)).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR", message: "Não foi possível salvar o funcionário. Tente novamente.",
    });
    expect(JSON.stringify(log.mock.calls)).not.toContain("private connection details");
  } finally {
    transaction.mockRestore();
  }
});

test("driver classifier follows cause but rejects other constraints and infrastructure errors", () => {
  for (const code of ["SQLITE_CONSTRAINT_UNIQUE", "SQLITE_CONSTRAINT"]) {
    const cause = new LibsqlError("UNIQUE constraint failed: employees.cpf", code);
    expect(isEmployeeCpfConflict(new Error("query wrapper", { cause }))).toBe(true);
  }
  for (const [code, message] of [
    ["SQLITE_CONSTRAINT_UNIQUE", "UNIQUE constraint failed: employees.id"],
    ["SQLITE_CONSTRAINT", "NOT NULL constraint failed: employees.name"],
    ["SQLITE_ERROR", "no such table: employees"],
    ["SQLITE_ERROR", "table employees has no column named photo"],
    ["SERVER_ERROR", "authentication failed"],
    ["HRANA_WEBSOCKET_ERROR", "connection failed"],
  ]) expect(isEmployeeCpfConflict(new LibsqlError(message, code))).toBe(false);
  expect(isEmployeeCpfConflict(new Error("UNIQUE constraint failed: employees.cpf"))).toBe(false);
  const cyclic: { cause?: unknown } = {};
  cyclic.cause = cyclic;
  expect(isEmployeeCpfConflict(cyclic)).toBe(false);
  expect(databaseErrorCode(cyclic)).toBe("UNKNOWN");
});

test("read-only diagnostic identifies a missing CPF unique constraint", async () => {
  await db.$client.executeMultiple("DROP TABLE employees; CREATE TABLE employees (id INTEGER PRIMARY KEY, cpf TEXT)");
  const report = await checkEmployeeSchema(db.$client);
  expect(report.ok).toBe(false);
  expect(report.problems).toContain("Restrição UNIQUE ausente: employees.cpf");
});
