import { useMutation, useQuery } from "@tanstack/react-query";
import { orpc } from "../lib/api";
import { useInvalidateAll } from "./invalidate";

/** Todas as gravações de dentro de uma obra (equipe, presença, ferramentas, checklist, custos, avaliação) */
export function useWorkItemMutations() {
  const invalidate = useInvalidateAll();
  const on = { onSuccess: () => invalidate() };
  return {
    addEmployee: useMutation(orpc.workItems.addEmployee.mutationOptions(on)),
    removeEmployee: useMutation(orpc.workItems.removeEmployee.mutationOptions(on)),
    setAttendance: useMutation(orpc.workItems.setAttendance.mutationOptions(on)),
    removeAttendance: useMutation(orpc.workItems.removeAttendance.mutationOptions(on)),
    addTool: useMutation(orpc.workItems.addTool.mutationOptions(on)),
    updateTool: useMutation(orpc.workItems.updateTool.mutationOptions(on)),
    removeTool: useMutation(orpc.workItems.removeTool.mutationOptions(on)),
    addChecklistItem: useMutation(orpc.workItems.addChecklistItem.mutationOptions(on)),
    toggleChecklistItem: useMutation(orpc.workItems.toggleChecklistItem.mutationOptions(on)),
    removeChecklistItem: useMutation(orpc.workItems.removeChecklistItem.mutationOptions(on)),
    addExpense: useMutation(orpc.workItems.addExpense.mutationOptions(on)),
    removeExpense: useMutation(orpc.workItems.removeExpense.mutationOptions(on)),
    saveEvaluation: useMutation(orpc.workItems.saveEvaluation.mutationOptions(on)),
    updateTerms: useMutation(orpc.workItems.updateTerms.mutationOptions(on)),
    updateChecklistItem: useMutation(orpc.workItems.updateChecklistItem.mutationOptions(on)),
    saveRdo: useMutation(orpc.workItems.saveRdo.mutationOptions(on)),
    removeRdo: useMutation(orpc.workItems.removeRdo.mutationOptions(on)),
    addRdoPhoto: useMutation(orpc.workItems.addRdoPhoto.mutationOptions(on)),
    removeRdoPhoto: useMutation(orpc.workItems.removeRdoPhoto.mutationOptions(on)),
  };
}

export function useRdoPhotos(rdoId: number | null) {
  return useQuery({
    ...orpc.workItems.listRdoPhotos.queryOptions({ input: { rdoId: rdoId ?? 0 } }),
    enabled: rdoId != null,
  });
}
