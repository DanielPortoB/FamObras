export const CATEGORIES = [
  { value: "viagem_carro", label: "Viagem de carro", qty: "Qtd. viagens", cost: "Valor por viagem (R$)" },
  { value: "viagem_caminhao", label: "Viagem de caminhão", qty: "Qtd. viagens", cost: "Valor por viagem (R$)" },
  { value: "diaria_equipamento", label: "Diária de equipamento", qty: "Qtd. diárias", cost: "Valor da diária (R$)" },
  { value: "hora_trabalhada", label: "Hora trabalhada", qty: "Horas", cost: "Custo por hora (R$)" },
  { value: "hospedagem", label: "Hospedagem", qty: "Qtd. diárias (noites)", cost: "Valor por diária (R$)" },
  { value: "combustivel", label: "Combustível (funcionário local)", qty: "Qtd. (litros ou viagens)", cost: "Valor unitário (R$)" },
  { value: "transporte_pecas", label: "Transporte de peças", qty: "Qtd. viagens", cost: "Valor por viagem (R$)" },
  { value: "alimentacao_almoco", label: "Alimentação - almoço", qty: "Qtd. refeições", cost: "Valor por refeição (R$)" },
  { value: "alimentacao_jantar", label: "Alimentação - jantar", qty: "Qtd. refeições", cost: "Valor por refeição (R$)" },
  { value: "outros", label: "Outros", qty: "Quantidade", cost: "Valor unitário (R$)" },
] as const;

export const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label]));

export const CHECKLIST_CATEGORIES: Record<string, string> = {
  hospedagem: "Hospedagem",
  alimentacao: "Alimentação",
  transporte: "Transporte",
  outros: "Outros",
  equipamentos: "Equipamentos",
  eletrico: "Elétrico",
};

export const ADICIONAL_LABEL: Record<string, string> = {
  nenhum: "Nenhum",
  periculosidade: "Periculosidade (30%)",
  insalubridade: "Insalubridade (40%)",
};

export const CREW_LABEL: Record<string, string> = { titular: "Titular", reserva: "Reserva" };

export const PRICING_LABEL: Record<string, string> = { pacote: "Pacote fechado", hh: "HH (homem-hora)" };

export const NR_SUGGESTIONS = ["NR-35 (trabalho em altura)", "NR-10 (eletricidade)", "NR-12 (máquinas)", "NR-33 (espaço confinado)", "NR-11 (movimentação de carga)", "NR-18", "NR-06 (EPI)", "PTA (plataforma)", "Sinaleiro / Rigger", "Operador de Munck"];

export const STATUS_LABEL: Record<string, string> = {
  planejada: "Planejada",
  em_andamento: "Em andamento",
  concluida: "Concluída",
};

export const PRESENCE_LABEL: Record<string, string> = {
  presente: "Presente",
  falta: "Falta",
  atraso: "Atraso",
};

export const CONTRACT_LABEL: Record<string, string> = {
  obra_certa: "Obra certa",
  experiencia: "Experiência",
};
