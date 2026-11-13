import { expect, mock, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";

let query = { data: [], isLoading: false, isError: true, isFetching: false, refetch: async () => {} };
mock.module("../src/web/queries/employees", () => ({
  useEmployees: () => query,
  useEmployeeMutations: () => ({ create: {}, update: {}, remove: {} }),
}));
mock.module("../src/web/components/layout", () => ({
  Layout: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
const { default: EmployeesPage } = await import("../src/web/pages/employees");

test("failed employee query displays an error and retry, not an empty database", () => {
  query = { ...query, isError: true, isLoading: false };
  const html = renderToStaticMarkup(<EmployeesPage />);
  expect(html).toContain("Não foi possível carregar os funcionários");
  expect(html).toContain("Tentar novamente");
  expect(html).not.toContain("Nenhum funcionário cadastrado ainda.");
  expect(html).not.toContain("Cadastrados (0)");
});

test("successful empty query still shows the empty state", () => {
  query = { ...query, isError: false, isLoading: false };
  expect(renderToStaticMarkup(<EmployeesPage />)).toContain("Nenhum funcionário cadastrado ainda.");
});

test("pending query does not claim the database is empty", () => {
  query = { ...query, isError: false, isLoading: true };
  const html = renderToStaticMarkup(<EmployeesPage />);
  expect(html).toContain("Carregando...");
  expect(html).not.toContain("Nenhum funcionário cadastrado ainda.");
});
