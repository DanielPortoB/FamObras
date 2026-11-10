import { sqliteTable, text, integer, real, uniqueIndex } from "drizzle-orm/sqlite-core";

const createdAt = integer("created_at", { mode: "timestamp" })
  .notNull()
  .$defaultFn(() => new Date());

// Funcionários (banco de dados)
export const employees = sqliteTable("employees", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  role: text("role").notNull(), // função
  cpf: text("cpf").notNull().unique(),
  phone: text("phone"),
  city: text("city").notNull(), // cidade onde mora (define se é local da obra)
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  asoValidUntil: text("aso_valid_until"), // ASO (atestado de saúde) - validade informada
  contractType: text("contract_type"), // obra_certa | experiencia
  photo: text("photo"), // foto do funcionário (data URL JPEG reduzida)
  createdAt,
});

// Integrações válidas do funcionário, por cliente / unidade (validade informada pelo usuário)
export const employeeIntegrations = sqliteTable("employee_integrations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  employeeId: integer("employee_id").notNull(),
  client: text("client").notNull(),
  unit: text("unit").notNull(), // cidade / unidade
  integrationDate: text("integration_date").notNull(), // YYYY-MM-DD
  validUntil: text("valid_until").notNull(), // YYYY-MM-DD
});

// NRs e habilitações do funcionário (ex: NR-35, Operador de PTA, Sinaleiro)
export const employeeNrs = sqliteTable("employee_nrs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  employeeId: integer("employee_id").notNull(),
  name: text("name").notNull(),
  validUntil: text("valid_until"),
});

// Obras
export const works = sqliteTable("works", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  city: text("city").notNull(),
  client: text("client"),
  responsible: text("responsible"),
  startDate: text("start_date").notNull(), // YYYY-MM-DD
  endDate: text("end_date").notNull(), // YYYY-MM-DD
  contractValue: real("contract_value").notNull().default(0), // valor recebido/orçado (para lucro)
  status: text("status").notNull().default("planejada"), // planejada | em_andamento | concluida
  functionsCount: integer("functions_count").notNull().default(0), // quantidade de funções
  pricingModel: text("pricing_model").notNull().default("pacote"), // pacote | hh
  hasSedeFabrication: integer("has_sede_fabrication", { mode: "boolean" }).notNull().default(false),
  requiredCrew: integer("required_crew").notNull().default(0), // quantas pessoas a obra pede (titulares)
  crewPlan: text("crew_plan"), // JSON: [{ role: "Soldador", qty: 2 }] - quantidade por função
  coverImage: text("cover_image"), // imagem de capa da obra (data URL JPEG reduzida)
  createdAt,
});

// Escala: funcionário alocado na obra
export const workEmployees = sqliteTable(
  "work_employees",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    workId: integer("work_id").notNull(),
    employeeId: integer("employee_id").notNull(),
    crewType: text("crew_type").notNull().default("titular"), // titular | reserva
    salary: real("salary").notNull().default(0), // salário mensal CLT (desta obra)
    adicional: text("adicional").notNull().default("nenhum"), // nenhum | periculosidade | insalubridade
    monthlyAllowance: real("daily_allowance").notNull().default(0), // ajuda de custo por MÊS (coluna antiga mantida)
    monthlyFuel: real("daily_fuel").notNull().default(0), // combustível por MÊS
    monthlyTransport: real("daily_transport").notNull().default(0), // vale-transporte por MÊS
    voucher: real("voucher").notNull().default(0), // vale (total na obra)
    periodStart: text("period_start"), // YYYY-MM-DD - entrada do funcionário na obra (vazio = início da obra)
    periodEnd: text("period_end"), // YYYY-MM-DD - saída do funcionário da obra (vazio = fim da obra)
    createdAt,
  },
  (t) => [uniqueIndex("work_employee_unique").on(t.workId, t.employeeId)],
);

// Ferramentas da obra (editável por obra)
export const workTools = sqliteTable("work_tools", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workId: integer("work_id").notNull(),
  name: text("name").notNull(),
  unit: text("unit").notNull().default("UNIDADE"),
  quantity: integer("quantity").notNull().default(1),
  attended: integer("attended", { mode: "boolean" }).notNull().default(false), // atendido
  sortOrder: integer("sort_order").notNull().default(0),
});

// Checklist da obra (hospedagem, alimentação, transporte, outros)
export const workChecklist = sqliteTable("work_checklist", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workId: integer("work_id").notNull(),
  category: text("category").notNull(), // hospedagem | alimentacao | transporte | outros
  description: text("description").notNull(),
  note: text("note"), // valor/observação (ex: 380V, 32A, "precisa de projeto")
  done: integer("done", { mode: "boolean" }).notNull().default(false),
});

// Entrada / presença diária do funcionário na obra
export const attendance = sqliteTable(
  "attendance",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    workId: integer("work_id").notNull(),
    employeeId: integer("employee_id").notNull(),
    date: text("date").notNull(), // YYYY-MM-DD
    entryTime: text("entry_time"), // HH:mm
    exitTime: text("exit_time"), // HH:mm
    breakHours: real("break_hours").notNull().default(0), // intervalo do turno, em horas
    hoursWorked: real("hours_worked").notNull().default(0), // calculado: saída - entrada - intervalo
    presence: text("presence").notNull().default("presente"), // presente | falta | atraso
    note: text("note"),
    createdAt,
  },
  (t) => [uniqueIndex("attendance_unique").on(t.workId, t.employeeId, t.date)],
);

// Avaliação final do funcionário (notas 0 a 10)
export const evaluations = sqliteTable(
  "evaluations",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    workId: integer("work_id").notNull(),
    employeeId: integer("employee_id").notNull(),
    productivity: integer("productivity").notNull(),
    assiduity: integer("assiduity").notNull(),
    relationship: integer("relationship").notNull(),
    average: real("average").notNull(),
    comment: text("comment"),
    createdAt,
  },
  (t) => [uniqueIndex("evaluation_unique").on(t.workId, t.employeeId)],
);

// Lançamentos do relatório diário (custos da obra)
// category: viagem_carro | viagem_caminhao | diaria_equipamento | hora_trabalhada | hospedagem | combustivel | transporte_pecas | alimentacao_almoco | alimentacao_jantar | outros
export const expenses = sqliteTable("expenses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workId: integer("work_id").notNull(),
  date: text("date").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  employeeId: integer("employee_id"), // obrigatório em combustível (funcionário local) e hospedagem
  quantity: real("quantity").notNull().default(1), // viagens, diárias, horas, noites...
  unitCost: real("unit_cost").notNull().default(0),
  total: real("total").notNull().default(0),
  createdAt,
});

// RDO - relatório diário de obra
export const rdos = sqliteTable(
  "rdos",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    workId: integer("work_id").notNull(),
    date: text("date").notNull(),
    weather: text("weather"),
    activities: text("activities").notNull(), // atividades executadas no dia
    incidents: text("incidents"), // ocorrências / problemas
    notes: text("notes"),
    createdAt,
  },
  (t) => [uniqueIndex("rdo_unique").on(t.workId, t.date)],
);

// Fotos do RDO (imagem reduzida em base64 data URL)
export const rdoPhotos = sqliteTable("rdo_photos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  rdoId: integer("rdo_id").notNull(),
  dataUrl: text("data_url").notNull(),
  caption: text("caption"),
});

// Efetivo do RDO: horas produtivas e improdutivas por funcionário/função no dia
export const rdoCrew = sqliteTable("rdo_crew", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  rdoId: integer("rdo_id").notNull(),
  employeeId: integer("employee_id"), // vazio = pessoa de fora da equipe (terceiro)
  name: text("name").notNull(),
  role: text("role").notNull(),
  productiveHours: real("productive_hours").notNull().default(0),
  unproductiveHours: real("unproductive_hours").notNull().default(0),
  reason: text("reason"), // motivo das horas improdutivas
});
