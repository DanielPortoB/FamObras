import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Layout } from "../components/layout";
import { Badge, Card, Empty, PageHeader } from "../components/ui-kit";
import { EMPTY_WORK, WorkForm, type WorkFormValues } from "../components/work-form";
import { useWorkMutations, useWorks } from "../queries/works";
import { btnGhost, btnPrimary } from "../lib/cls";
import { brl, fmtDate } from "../lib/format";
import { PRICING_LABEL, STATUS_LABEL } from "../lib/labels";

export default function WorksPage() {
  const { data: works = [], isLoading } = useWorks();
  const { create } = useWorkMutations();
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);

  const submit = async (v: WorkFormValues) => {
    const work = await create.mutateAsync(v);
    navigate(`/obras/${work.id}`);
  };

  return (
    <Layout>
      <PageHeader
        title="Obras"
        subtitle="Cada obra já nasce com a lista de ferramentas e o checklist prontos para editar."
        actions={
          <button className={btnPrimary} onClick={() => setOpen((v) => !v)}>
            {open ? "Fechar" : "Nova obra"}
          </button>
        }
      />

      {open && (
        <Card className="mb-6">
          <h2 className="mb-4 text-lg font-bold">Criar obra</h2>
          <WorkForm initial={EMPTY_WORK} submitLabel="Criar obra" pending={create.isPending} onSubmit={submit} onCancel={() => setOpen(false)} />
        </Card>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : works.length === 0 ? (
        <Empty>Nenhuma obra cadastrada. Clique em "Nova obra" para começar.</Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {works.map((w) => (
            <Link key={w.id} href={`/obras/${w.id}`} className="group block">
              <Card className="h-full overflow-hidden transition group-hover:-translate-y-0.5 group-hover:border-primary/40">
                {w.coverImage && (
                  <div className="-mx-5 -mt-5 mb-4 h-32 overflow-hidden border-b border-border">
                    <img src={w.coverImage} alt={`Capa da obra ${w.name}`} loading="lazy" className="h-full w-full object-cover" />
                  </div>
                )}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{w.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {w.city} {w.client ? `· ${w.client}` : ""} · {PRICING_LABEL[w.pricingModel]}
                      {w.hasSedeFabrication ? " · Fabricação na sede" : ""}
                    </p>
                  </div>
                  <Badge tone={w.status === "concluida" ? "gray" : w.status === "em_andamento" ? "green" : "amber"}>
                    {STATUS_LABEL[w.status]}
                  </Badge>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Período</p>
                    <p className="font-medium">{fmtDate(w.startDate)} a {fmtDate(w.endDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Equipe</p>
                    <p className="font-medium">
                      {w.teamSize}
                      {w.requiredCrew ? ` / ${w.requiredCrew} pedidas` : " pessoa(s)"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Custo lançado</p>
                    <p className="font-medium">{brl(w.totalCost)}</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
      <p className="mt-6 text-xs text-muted-foreground">
        <Link href="/" className={btnGhost + " !px-2 !py-1 !text-xs"}>Voltar ao início</Link>
      </p>
    </Layout>
  );
}
