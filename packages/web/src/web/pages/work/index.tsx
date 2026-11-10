import { useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { Layout } from "../../components/layout";
import { Badge, Card, ErrorBox, PageHeader } from "../../components/ui-kit";
import { useWork, useWorkMutations } from "../../queries/works";
import { btnGhost, btnPrimary } from "../../lib/cls";
import { fmtDate } from "../../lib/format";
import { STATUS_LABEL } from "../../lib/labels";
import { TeamTab } from "./team-tab";
import { AttendanceTab } from "./attendance-tab";
import { ToolsTab } from "./tools-tab";
import { ChecklistTab } from "./checklist-tab";
import { CostsTab } from "./costs-tab";
import { EvaluationTab } from "./evaluation-tab";
import { RdoTab } from "./rdo-tab";
import { WorkForm, type WorkFormValues } from "../../components/work-form";
import { PRICING_LABEL } from "../../lib/labels";

const TABS = [
  { key: "equipe", label: "Equipe" },
  { key: "presenca", label: "Registro de ponto" },
  { key: "ferramentas", label: "Ferramentas" },
  { key: "checklist", label: "Checklist" },
  { key: "rdo", label: "RDO" },
  { key: "diario", label: "Custos do dia" },
  { key: "avaliacao", label: "Avaliação de funcionário" },
] as const;

export type WorkData = NonNullable<ReturnType<typeof useWork>["data"]>;

export default function WorkPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const [, navigate] = useLocation();
  const initialTab = new URLSearchParams(window.location.search).get("tab") ?? "equipe";
  const [tab, setTab] = useState<string>(initialTab);
  const { data, isLoading, error } = useWork(id);
  const { update, remove } = useWorkMutations();
  const [statusError, setStatusError] = useState<unknown>(null);

  if (isLoading) return <Layout><p className="text-sm text-muted-foreground">Carregando...</p></Layout>;
  if (error || !data) return <Layout><ErrorBox error={error ?? new Error("Obra não encontrada")} /></Layout>;

  const { work } = data;

  const changeStatus = async (status: string) => {
    setStatusError(null);
    try {
      await update.mutateAsync({ id: work.id, ...formValuesOf(work), status });
    } catch (e) {
      setStatusError(e);
    }
  };

  const onDelete = async () => {
    if (!confirm(`Excluir a obra "${work.name}" e todos os seus lançamentos?`)) return;
    await remove.mutateAsync({ id: work.id });
    navigate("/obras");
  };

  return (
    <Layout>
      <PageHeader
        title={work.name}
        subtitle={`${work.city} · ${fmtDate(work.startDate)} a ${fmtDate(work.endDate)}${work.responsible ? ` · Resp.: ${work.responsible}` : ""}`}
        actions={
          <>
            <Badge tone={work.status === "concluida" ? "gray" : "green"}>{STATUS_LABEL[work.status]}</Badge>
            <Link href={`/obras/${work.id}/relatorio`} className={btnPrimary}>Relatório final</Link>
          </>
        }
      />

      {work.coverImage && (
        <div className="mb-6 h-44 overflow-hidden rounded-2xl border border-border sm:h-56">
          <img src={work.coverImage} alt={`Capa da obra ${work.name}`} className="h-full w-full object-cover" />
        </div>
      )}

      <div className="mb-6 grid gap-4 md:grid-cols-[1fr_auto]">
        <WorkDataCard data={data} />
        <Card className="flex min-w-[260px] flex-col gap-3">
          <p className="text-sm font-semibold">Status da obra</p>
          <div className="flex flex-wrap gap-2">
            {(["planejada", "em_andamento", "concluida"] as const).map((s) => (
              <button
                key={s}
                disabled={update.isPending || work.status === s}
                onClick={() => changeStatus(s)}
                className={work.status === s ? btnPrimary : btnGhost}
              >
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Para concluir, todos os funcionários da equipe precisam ter avaliação de funcionário.
          </p>
          <ErrorBox error={statusError} />
          <button className="mt-auto text-left text-xs font-medium text-destructive hover:underline" onClick={onDelete}>
            Excluir obra
          </button>
        </Card>
      </div>

      <div className="no-print mb-5 flex gap-1 overflow-x-auto rounded-xl border border-border bg-white p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={
              "whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition " +
              (tab === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-primary")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "equipe" && <TeamTab data={data} />}
      {tab === "presenca" && <AttendanceTab data={data} />}
      {tab === "ferramentas" && <ToolsTab data={data} />}
      {tab === "checklist" && <ChecklistTab data={data} />}
      {tab === "rdo" && <RdoTab data={data} />}
      {tab === "diario" && <CostsTab data={data} />}
      {tab === "avaliacao" && <EvaluationTab data={data} />}
    </Layout>
  );
}

export function formValuesOf(work: WorkData["work"]): WorkFormValues {
  return {
    name: work.name,
    city: work.city,
    client: work.client,
    responsible: work.responsible,
    startDate: work.startDate,
    endDate: work.endDate,
    contractValue: work.contractValue,
    pricingModel: work.pricingModel === "hh" ? "hh" : "pacote",
    hasSedeFabrication: work.hasSedeFabrication,
    crewPlan: work.plan,
    coverImage: work.coverImage ?? null,
  };
}

function WorkDataCard({ data }: { data: WorkData }) {
  const { work } = data;
  const { update } = useWorkMutations();
  const [editing, setEditing] = useState(false);

  const save = async (v: WorkFormValues) => {
    await update.mutateAsync({ id: work.id, ...v, status: work.status });
    setEditing(false);
  };

  if (!editing) {
    const titulares = data.team.filter((t) => t.terms.crewType === "titular").length;
    const reservas = data.team.length - titulares;
    return (
      <Card>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Dados da obra</p>
          <button className={btnGhost} onClick={() => setEditing(true)}>Editar dados</button>
        </div>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-4">
          <div><dt className="text-xs text-muted-foreground">Cliente</dt><dd className="font-medium">{work.client || "-"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Responsável</dt><dd className="font-medium">{work.responsible || "-"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Início / fim</dt><dd className="font-medium">{fmtDate(work.startDate)} · {fmtDate(work.endDate)}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Valor do contrato</dt><dd className="font-medium">{Number(work.contractValue).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Modelo de preço</dt><dd className="font-medium">{PRICING_LABEL[work.pricingModel] ?? work.pricingModel}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Fabricação na sede</dt><dd className="font-medium">{work.hasSedeFabrication ? "Sim" : "Não"}</dd></div>
          <div>
            <dt className="text-xs text-muted-foreground">Equipe</dt>
            <dd className="font-medium">
              {titulares} titular(es){work.requiredCrew ? ` de ${work.requiredCrew} pedidas` : ""} · {reservas} reserva(s)
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Funções pedidas</dt>
            <dd className="font-medium">{work.plan.length ? work.plan.map((p) => `${p.qty} ${p.role}`).join(", ") : "-"}</dd>
          </div>
        </dl>
      </Card>
    );
  }

  return (
    <Card>
      <WorkForm initial={formValuesOf(work)} submitLabel="Salvar" pending={update.isPending} onSubmit={save} onCancel={() => setEditing(false)} />
    </Card>
  );
}
