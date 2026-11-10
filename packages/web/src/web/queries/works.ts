import { useMutation, useQuery } from "@tanstack/react-query";
import { orpc } from "../lib/api";
import { useInvalidateAll } from "./invalidate";

export function useWorks() {
  return useQuery(orpc.works.list.queryOptions());
}

export function useWork(id: number) {
  return useQuery(orpc.works.get.queryOptions({ input: { id } }));
}

export function useWorkReport(id: number) {
  return useQuery(orpc.works.report.queryOptions({ input: { id } }));
}

export function useFinanceDetail(id: number | null) {
  return useQuery({ ...orpc.works.financeDetail.queryOptions({ input: { id: id ?? 0 } }), enabled: !!id });
}

export function useFinance() {
  return useQuery(orpc.works.finance.queryOptions());
}

/** Arquivos e e-mails (Excel das ferramentas, checklist em Word) */
export function useWorkFiles() {
  return {
    toolsExcel: useMutation(orpc.works.toolsExcel.mutationOptions()),
    toolsEmail: useMutation(orpc.works.toolsEmail.mutationOptions()),
    checklistDoc: useMutation(orpc.works.checklistDoc.mutationOptions()),
    checklistEmail: useMutation(orpc.works.checklistEmail.mutationOptions()),
  };
}

export function useWorkMutations() {
  const invalidate = useInvalidateAll();
  const create = useMutation(orpc.works.create.mutationOptions({ onSuccess: () => invalidate() }));
  const update = useMutation(orpc.works.update.mutationOptions({ onSuccess: () => invalidate() }));
  const remove = useMutation(orpc.works.remove.mutationOptions({ onSuccess: () => invalidate() }));
  return { create, update, remove };
}
