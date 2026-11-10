import { useMutation, useQuery } from "@tanstack/react-query";
import { orpc } from "../lib/api";
import { useInvalidateAll } from "./invalidate";

export function useEmployees() {
  return useQuery(orpc.employees.list.queryOptions());
}

export function useEmployeeMutations() {
  const invalidate = useInvalidateAll();
  const create = useMutation(orpc.employees.create.mutationOptions({ onSuccess: () => invalidate() }));
  const update = useMutation(orpc.employees.update.mutationOptions({ onSuccess: () => invalidate() }));
  const remove = useMutation(orpc.employees.remove.mutationOptions({ onSuccess: () => invalidate() }));
  return { create, update, remove };
}
