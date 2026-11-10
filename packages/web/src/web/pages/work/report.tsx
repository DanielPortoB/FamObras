import { Link, useParams } from "wouter";
import { Layout } from "../../components/layout";
import { Badge, Card, ErrorBox, PageHeader, Stat } from "../../components/ui-kit";
import { useWorkReport } from "../../queries/works";
import { btnGhost } from "../../lib/cls";
import { brl, fmtDate, fmtHours } from "../../lib/format";
import { CATEGORY_LABEL, PRICING_LABEL, STATUS_LABEL } from "../../lib/labels";

export default function WorkReportPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { data: r, isLoading, error } = useWorkReport(id);

  if (isLoading) return <Layout><p className="text-sm text-muted-foreground">Carregando...</p></Layout>;
  if (error || !r) return <Layout><ErrorBox error={error ?? new Error("Obra não encontrada")} /></Layout>;

  const profit = r.result >= 0;
  const categories = Object.entries(r.byCategory).sort((a, b) => b[1].total - a[1].total);
  const hhCost = r.labor.hours > 0 ? r.labor.total / r.labor.hours : 0;
  const pr = r.productivity;

  return (
    <Layout>
      <PageHeader
        title={`Relatório final · ${r.work.name}`}
        subtitle={`${r.work.city}${r.work.client ? ` · ${r.work.client}` : ""} · ${fmtDate(r.work.startDate)} a ${fmtDate(r.work.endDate)} · ${STATUS_LABEL[r.work.status]} · ${PRICING_LABEL[r.work.pricingModel] ?? r.work.pricingModel}${r.work.hasSedeFabrication ? " · Fabricação na sede" : ""}`}
        actions={
          <>
            <Link href={`/obras/${r.work.id}`} className={btnGhost + " no-print"}>Voltar à obra</Link>
            <button className={btnGhost + " no-print"} onClick={() => window.print()}>Imprimir</button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Valor do contrato" value={brl(r.revenue)} />
        <Stat label="Custo total" value={brl(r.totalCost)} />
        <Stat label={profit ? "Lucro" : "Prejuízo"} value={brl(r.result)} tone={profit ? "good" : "bad"} />
        <Stat
          label="Margem"
          value={r.margin === null ? "-" : `${r.margin.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}
          tone={profit ? "good" : "bad"}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-lg font-bold">Mão de obra CLT (registro de ponto)</h2>
          <table className="w-full text-left text-sm">
            <tbody>
              <tr className="border-b border-border/60"><td className="py-2">Salários (horas normais, extras e adicionais)</td><td className="py-2 text-right font-medium">{brl(r.labor.gross)}</td></tr>
              <tr className="border-b border-border/60"><td className="py-2">Encargos (INSS 20%, FGTS 8%, 13º e férias 19,44%)</td><td className="py-2 text-right font-medium">{brl(r.labor.encargos)}</td></tr>
              <tr className="border-b border-border/60"><td className="py-2">Benefícios mensais rateados (ajuda de custo, combustível, VT ÷ 30 × dias na obra)</td><td className="py-2 text-right font-medium">{brl(r.labor.beneficios)}</td></tr>
              <tr className="border-b border-border/60"><td className="py-2">Vales na obra</td><td className="py-2 text-right font-medium">{brl(r.labor.vouchers)}</td></tr>
              <tr><td className="pt-3 font-bold">Total mão de obra</td><td className="pt-3 text-right font-bold">{brl(r.labor.total)}</td></tr>
            </tbody>
          </table>
          <p className="mt-3 text-sm text-muted-foreground">
            {fmtHours(r.labor.hours)} trabalhadas · custo médio {brl(hhCost)} por HH
          </p>
        </Card>

        <Card>
          <h2 className="mb-3 text-lg font-bold">Despesas por categoria</h2>
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma despesa lançada.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-2 pr-3">Categoria</th>
                  <th className="py-2 pr-3 text-right">Quantidade</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {categories.map(([cat, v]) => (
                  <tr key={cat} className="border-b border-border/60 last:border-0">
                    <td className="py-2 pr-3">{CATEGORY_LABEL[cat] ?? cat}</td>
                    <td className="py-2 pr-3 text-right">{v.quantity.toLocaleString("pt-BR")}</td>
                    <td className="py-2 text-right font-semibold">{brl(v.total)}</td>
                  </tr>
                ))}
                <tr>
                  <td className="pt-3 font-bold" colSpan={2}>Total despesas</td>
                  <td className="pt-3 text-right font-bold">{brl(r.expensesTotal)}</td>
                </tr>
              </tbody>
            </table>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold">Equipe, custo e avaliação</h2>
            <div className="flex flex-wrap gap-2">
              <Badge>
                {r.crew.titulares} titular(es){r.crew.required ? ` de ${r.crew.required}` : ""} · {r.crew.reservas} reserva(s)
              </Badge>
              {r.teamAverage !== null && <Badge>Média da equipe {r.teamAverage.toLocaleString("pt-BR")}</Badge>}
            </div>
          </div>
          {r.team.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum funcionário escalado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="py-2 pr-3">Nome</th>
                    <th className="py-2 pr-3">Tipo</th>
                    <th className="py-2 pr-3 text-right">Presente</th>
                    <th className="py-2 pr-3 text-right">Faltas</th>
                    <th className="py-2 pr-3 text-right">Atrasos</th>
                    <th className="py-2 pr-3 text-right">Horas</th>
                    <th className="py-2 pr-3 text-right">Custo</th>
                    <th className="py-2 text-right">Nota</th>
                  </tr>
                </thead>
                <tbody>
                  {r.team.map((t) => (
                    <tr key={t.id} className="border-b border-border/60 last:border-0">
                      <td className="py-2 pr-3">
                        <p className="font-medium">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.role}{t.isLocal ? " · local" : ""}</p>
                      </td>
                      <td className="py-2 pr-3">{t.crewType === "reserva" ? "Reserva" : "Titular"}</td>
                      <td className="py-2 pr-3 text-right">{t.presentDays}</td>
                      <td className="py-2 pr-3 text-right">{t.absentDays}</td>
                      <td className="py-2 pr-3 text-right">{t.lateDays}</td>
                      <td className="py-2 pr-3 text-right">{fmtHours(t.hours)}</td>
                      <td className="py-2 pr-3 text-right font-medium">{brl(t.cost)}</td>
                      <td className="py-2 text-right font-semibold">{t.evaluation ? Number(t.evaluation.average).toLocaleString("pt-BR") : "Pendente"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {r.pendingEvaluations.length > 0 && (
            <p className="mt-4 text-sm text-amber-700">Sem avaliação: {r.pendingEvaluations.join(", ")}.</p>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold">Produtividade (efetivo do RDO)</h2>
            {pr.productive + pr.unproductive > 0 && (
              <div className="flex flex-wrap gap-2">
                <Badge tone="green">{fmtHours(pr.productive)} produtivas</Badge>
                <Badge tone="amber">{fmtHours(pr.unproductive)} improdutivas</Badge>
                <Badge tone="gray">{pct(pr.rate)} de aproveitamento</Badge>
              </div>
            )}
          </div>
          {pr.productive + pr.unproductive === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum efetivo lançado nos RDOs.</p>
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              <ProdTable title="Por função" rows={pr.byRole} />
              <ProdTable title="Por funcionário" rows={pr.byEmployee} />
              <div>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Motivos de horas improdutivas</h3>
                {pr.byReason.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma hora improdutiva.</p>
                ) : (
                  <table className="w-full text-left text-sm">
                    <tbody>
                      {pr.byReason.map((x) => (
                        <tr key={x.reason} className="border-b border-border/60 last:border-0">
                          <td className="py-2 pr-3">{x.reason}</td>
                          <td className="py-2 text-right font-medium">{fmtHours(x.hours)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="mb-3 text-lg font-bold">Diário de obra (RDO)</h2>
          {r.rdos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum RDO lançado.</p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {[...r.rdos].reverse().map((d) => (
                <div key={d.id} className="break-inside-avoid py-4 first:pt-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold">{fmtDate(d.date)}</p>
                    {d.weather && <Badge tone="gray">{d.weather}</Badge>}
                  </div>
                  <p className="mt-1 whitespace-pre-line text-sm">{d.activities}</p>
                  {d.incidents && <p className="mt-1 whitespace-pre-line text-sm text-amber-800"><b>Ocorrências:</b> {d.incidents}</p>}
                  {d.notes && <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{d.notes}</p>}
                  {d.crew.length > 0 && (
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="uppercase tracking-wider text-muted-foreground">
                          <tr className="border-b border-border">
                            <th className="py-1 pr-3">Efetivo ({d.crew.length})</th>
                            <th className="py-1 pr-3">Função</th>
                            <th className="py-1 pr-3 text-right">Produtivas</th>
                            <th className="py-1 pr-3 text-right">Improdutivas</th>
                            <th className="py-1">Motivo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {d.crew.map((c) => (
                            <tr key={c.id} className="border-b border-border/40 last:border-0">
                              <td className="py-1 pr-3 font-medium">{c.name}</td>
                              <td className="py-1 pr-3">{c.role}</td>
                              <td className="py-1 pr-3 text-right">{fmtHours(c.productiveHours)}</td>
                              <td className="py-1 pr-3 text-right">{c.unproductiveHours ? fmtHours(c.unproductiveHours) : "-"}</td>
                              <td className="py-1 text-muted-foreground">{c.reason ?? ""}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {d.photos.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                      {d.photos.map((p) => (
                        <img key={p.id} src={p.dataUrl} alt={`Foto ${fmtDate(d.date)}`} className="aspect-square w-full rounded-lg border border-border object-cover" />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}

const pct = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

function ProdTable({ title, rows }: { title: string; rows: { key: string; productive: number; unproductive: number; rate: number }[] }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase tracking-wider text-muted-foreground">
          <tr className="border-b border-border">
            <th className="py-1 pr-2"><span className="sr-only">Nome</span></th>
            <th className="py-1 pr-2 text-right">Prod.</th>
            <th className="py-1 pr-2 text-right">Improd.</th>
            <th className="py-1 text-right">%</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((x) => (
            <tr key={x.key} className="border-b border-border/60 last:border-0">
              <td className="py-2 pr-2">{x.key}</td>
              <td className="py-2 pr-2 text-right">{fmtHours(x.productive)}</td>
              <td className="py-2 pr-2 text-right">{fmtHours(x.unproductive)}</td>
              <td className="py-2 text-right font-semibold">{pct(x.rate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
