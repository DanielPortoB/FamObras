/** Drizzle wraps driver errors in `cause`; inspect the driver, not SQL/params. */
export function isEmployeeCpfConflict(error: unknown): boolean {
  const seen = new Set<unknown>();
  while (error && typeof error === "object" && !seen.has(error)) {
    seen.add(error);
    const item = error as { code?: unknown; message?: unknown; cause?: unknown };
    if (
      (item.code === "SQLITE_CONSTRAINT_UNIQUE" || item.code === "SQLITE_CONSTRAINT") &&
      typeof item.message === "string" &&
      /UNIQUE constraint failed: employees\.cpf\s*$/i.test(item.message)
    ) return true;
    error = item.cause;
  }
  return false;
}

/** Log only a driver code: wrapped messages may contain CPF, photo or tokens. */
export function databaseErrorCode(error: unknown): string {
  const seen = new Set<unknown>();
  let code = "UNKNOWN";
  while (error && typeof error === "object" && !seen.has(error)) {
    seen.add(error);
    const item = error as { code?: unknown; cause?: unknown };
    if (typeof item.code === "string" && /^[A-Z][A-Z0-9_]{0,63}$/.test(item.code)) code = item.code;
    error = item.cause;
  }
  return code;
}
