import { Link } from "wouter";
import { Layout } from "../components/layout";
import { Badge, Card, Empty, PageHeader, Stat } from "../components/ui-kit";
import { useWorks } from "../queries/works";
import { useEmployees } from "../queries/employees";
import { fmtDate } from "../lib/format";
import { STATUS_LABEL } from "../lib/labels";
import { btnPrimary } from "../lib/cls";

function Home() {
  const { data: works = [] } = useWorks();
  const { data: employees = [] } = useEmployees();
  const active = works.filter((w) => w.status === "em_andamento");
  const planned = works.filter((w) => w.status === "planejada");
  const done = works.filter((w) => w.status === "concluida");

  return (
    <Layout>
      <PageHeader
        title="Painel de obras"
        subtitle="Visão geral da programação, da equipe e dos custos."
        actions={
          <>
            <Link href="/obras" className={btnPrimary}>Nova obra</Link>
            <Link href="/funcionarios" className="inline-flex items-center rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold hover:bg-accent">
              Funcionários
            </Link>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Obras em andamento" value={active.length} />
        <Stat label="Em planejamento" value={planned.length} />
        <Stat label="Obras concluídas" value={done.length} />
        <Stat label="Funcionários ativos" value={employees.filter((e) => e.active).length} />
      </div>

      {active.length > 0 && (
        <div className="mt-6 rounded-2xl border border-accent-strong/60 bg-accent p-4 text-sm text-foreground">
          <strong className="text-primary">Lembrete diário:</strong> alimente o relatório de hoje das obras em andamento
          (viagens, diárias de equipamento, horas, hospedagem, combustível e transporte de peças). Assim o fechamento
          final sai sem buracos.
        </div>
      )}

      <h2 className="mb-3 mt-8 text-lg font-bold">Obras em andamento</h2>
      {active.length === 0 ? (
        <Empty>Nenhuma obra em andamento. Mude o status de uma obra para "Em andamento" quando ela começar.</Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {active.map((w) => (
            <Card key={w.id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold">{w.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {w.city} · {fmtDate(w.startDate)} a {fmtDate(w.endDate)}
                  </p>
                </div>
                <Badge>{STATUS_LABEL[w.status]}</Badge>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/obras/${w.id}?tab=diario`} className={btnPrimary}>Lançar relatório do dia</Link>
                <Link href={`/obras/${w.id}`} className="inline-flex items-center rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold hover:bg-accent">
                  Abrir obra
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <WorkList title="Em planejamento" works={planned} empty="Nenhuma obra em planejamento." tone="amber" />
        <WorkList title="Concluídas" works={done} empty="Nenhuma obra concluída ainda." tone="gray" report />
      </div>
    </Layout>
  );
}

type WorkRow = ReturnType<typeof useWorks>["data"] extends (infer T)[] | undefined ? T : never;

function WorkList({ title, works, empty, tone, report }: { title: string; works: WorkRow[]; empty: string; tone: "amber" | "gray"; report?: boolean }) {
  return (
    <div>
      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
        {title} <Badge tone={tone}>{works.length}</Badge>
      </h2>
      {works.length === 0 ? (
        <Empty>{empty}</Empty>
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-border">
            {works.map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <Link href={`/obras/${w.id}`} className="min-w-0 hover:text-primary">
                  <p className="truncate font-semibold">{w.name}</p>
                  <p className="text-xs text-muted-foreground">{w.city} · {fmtDate(w.startDate)} a {fmtDate(w.endDate)}</p>
                </Link>
                <Link href={report ? `/obras/${w.id}/relatorio` : `/obras/${w.id}`} className="shrink-0 text-sm font-semibold text-primary hover:underline">
                  {report ? "Relatório" : "Abrir"}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

export default Home;
