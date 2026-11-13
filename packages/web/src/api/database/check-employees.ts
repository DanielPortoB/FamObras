import type { Client } from "@libsql/client";
import { getTableConfig } from "drizzle-orm/sqlite-core";
import { employees, employeeIntegrations, employeeNrs } from "./schema";

/** Read-only schema check. Never returns names, CPFs, photos or credentials. */
export async function checkEmployeeSchema(client: Client) {
  const problems: string[] = [];
  for (const table of [employees, employeeIntegrations, employeeNrs]) {
    const { name, columns } = getTableConfig(table);
    const result = await client.execute(`PRAGMA table_info("${name}")`);
    if (!result.rows.length) {
      problems.push(`Tabela ausente: ${name}`);
      continue;
    }
    const present = new Set(result.rows.map((row) => String(row.name)));
    for (const column of columns) {
      if (!present.has(column.name)) problems.push(`Coluna ausente: ${name}.${column.name}`);
    }
  }
  const indexes = await client.execute('PRAGMA index_list("employees")');
  let cpfUnique = false;
  for (const index of indexes.rows) {
    if (Number(index.unique) !== 1 || Number(index.partial) !== 0) continue;
    const name = String(index.name).replaceAll('"', '""');
    const columns = await client.execute(`PRAGMA index_info("${name}")`);
    if (columns.rows.length === 1 && columns.rows[0].name === "cpf") cpfUnique = true;
  }
  if (!cpfUnique) problems.push("Restrição UNIQUE ausente: employees.cpf");
  return { ok: problems.length === 0, problems };
}
