import { readFile } from "node:fs/promises";
import { createClient, type Client } from "@libsql/client";
import { getTableConfig, SQLiteTable } from "drizzle-orm/sqlite-core";
import * as schema from "../src/api/database/schema";
import { databaseErrorCode } from "../src/api/database/errors";

if (process.env.VERCEL_ENV === "production") {
  let client: Client | undefined;
  try {
    const url = process.env.DATABASE_URL ?? process.env.TURSO_DATABASE_URL;
    const authToken = process.env.DATABASE_AUTH_TOKEN ?? process.env.TURSO_AUTH_TOKEN;
    if (!url || !authToken || !/^(libsql|https|wss):\/\//.test(url)) {
      throw Object.assign(new Error("Missing remote database configuration"), { code: "DB_CONFIG_MISSING" });
    }

    const sql = await readFile(new URL("../drizzle/0000_initial_schema.sql", import.meta.url), "utf8");
    const statements = sql.split("--> statement-breakpoint").map((statement) => statement.trim()).filter(Boolean);
    const createStatement = /^CREATE (TABLE|UNIQUE INDEX)\s+/i;
    if (!statements.length || statements.some((statement) => !createStatement.test(statement))) {
      throw Object.assign(new Error("Unexpected bootstrap SQL"), { code: "DB_BOOTSTRAP_INVALID" });
    }

    client = createClient({ url, authToken });
    const tx = await client.transaction("write");
    try {
      await tx.batch(statements.map((statement) => statement.replace(createStatement, "CREATE $1 IF NOT EXISTS ")));

      const missing: string[] = [];
      const tables = Object.values(schema).filter((value) => value instanceof SQLiteTable).map(getTableConfig);
      const tableInfo = await tx.batch(tables.map(({ name }) => ({ sql: "SELECT name FROM pragma_table_info(?)", args: [name] })));
      for (const [index, { name, columns }] of tables.entries()) {
        const { rows } = tableInfo[index];
        const present = new Set(rows.map((row) => row.name));
        for (const column of columns) {
          if (!present.has(column.name)) missing.push(`${name}.${column.name}`);
        }
      }
      if (missing.length) {
        console.error("Colunas ausentes no banco do Fam Obras:", missing.join(", "));
        throw Object.assign(new Error("Existing schema requires a migration"), { code: "DB_SCHEMA_INCOMPLETE" });
      }

      await tx.commit();
      console.log(`Fam Obras: ${tables.length} tabelas disponíveis no Turso de produção.`);
    } finally {
      tx.close();
    }
  } catch (error) {
    console.error("Falha ao preparar o Turso de produção.", { code: databaseErrorCode(error) });
    process.exitCode = 1;
  } finally {
    client?.close();
  }
}
