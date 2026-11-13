import { createClient, type Client } from "@libsql/client";
import { checkEmployeeSchema } from "../src/api/database/check-employees";
import { databaseErrorCode } from "../src/api/database/errors";

const url = process.env.DATABASE_URL ?? process.env.TURSO_DATABASE_URL;
if (!url) {
  console.error("Configure DATABASE_URL ou TURSO_DATABASE_URL no ambiente local.");
  process.exit(1);
}
let client: Client | undefined;
try {
  client = createClient({
    url,
    authToken: process.env.DATABASE_AUTH_TOKEN ?? process.env.TURSO_AUTH_TOKEN,
  });
  const report = await checkEmployeeSchema(client);
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exitCode = 1;
} catch (error) {
  console.error("Não foi possível verificar o banco.", { code: databaseErrorCode(error) });
  process.exitCode = 1;
} finally {
  client?.close();
}
