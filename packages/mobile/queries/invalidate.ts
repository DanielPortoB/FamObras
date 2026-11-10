import { useQueryClient } from "@tanstack/react-query";
import { orpc } from "../lib/api";

/** Após qualquer gravação, recarrega os dados (app pequeno, sempre atualizado) */
export function useInvalidateAll() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: orpc.key() });
  };
}
