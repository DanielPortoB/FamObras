import { useQueryClient } from "@tanstack/react-query";
import { orpc } from "../lib/api";

/** Após qualquer gravação, recarrega todos os dados da tela (app pequeno, simples e sempre atualizado) */
export function useInvalidateAll() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: orpc.key() });
  };
}
