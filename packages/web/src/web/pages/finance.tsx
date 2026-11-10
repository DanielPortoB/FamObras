import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Layout } from "../components/layout";
import { Badge, Card, Empty, PageHeader, Stat } from "../components/ui-kit";
import { useFinance, useFinanceDetail } from "../queries/works";
import { btnGhost, inputCls } from "../lib/cls";
import { brl, fmtDate, fmtHours } from "../lib/format";
import { CATEGORY_LABEL, PRICING_LABEL, STATUS_LABEL } from "../lib/labels";

export default function FinancePage() {
  const { data: rows = [], isLoading } = useFinance();
  const [status, setStatus] = useState("todas");
  const [workId, setWorkIdState] = useState<number | null>(() => Number(new URLSearchParams(window.location.search).get("obra")) || null);
  const setWorkId = (id: number | null) => {
    setWorkIdState(id);
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("obra", String(id));
    else url.searchParams.delete("obra");
    window.history.replaceState(null, "", url);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const statusRows = useMemo(() => (status === "todas" ? rows : rows.filter((r) => r.status === status)), [rows, status]);

  const list = statusRows;
  const sum = (k: "revenue" | "laborCost" | "expensesCost" | "totalCost" | "result") => list.reduce((s, r) => s + r[k], 0);
  const revenue = sum("revenue");
  const result = sum("result");
  const margin = revenue > 0 ? (result / revenue) * 100 : null;

  return (
    <Layout>
      <PageHeader
        title="Financeiro"
        subtitle="Receita, mão de obra CLT (do registro de ponto) e despesas de cada obra."
        actions={
          <>
            <label className="flex w-44 flex-col gap-1 text-xs font-medium text-muted-foreground">
              Status
            <select aria-label="Filtrar por status" className={inputCls} value={status} onChange={(e) => { setStatus(e.target.value); setWorkId(null); }}>
              <option value="todas">Todos os status</option>
              {Object.entries(STATUS_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            </label>
            <label className="flex w-64 flex-col gap-1 text-xs font-medium text-muted-foreground">
              Obra
            <select aria-label="Escolher obra" className={inputCls} value={workId ?? ""} onChange={(e) => setWorkId(Number(e.target.value) || null)}>
              <option value="">Todas as obras (resumo)</option>
              {statusRows.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} · {r.city}
                </option>
              ))}
            </select>
            </label>
          </>
        }
      />

      {workId ? (
        <WorkFinance id={workId} onBack={() => setWorkId(null)} />
      ) : (
      <>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Receita (contratos)" value={brl(revenue)} />
        <Stat label="Mão de obra" value={brl(sum("laborCost"))} />
        <Stat label="Despesas" value={brl(sum("expensesCost"))} />
        <Stat label={result >= 0 ? "Lucro" : "Prejuízo"} value={brl(result)} tone={result >= 0 ? "good" : "bad"} />
        <Stat
          label="Margem"
          value={margin === null ? "-" : `${margin.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}
          tone={result >= 0 ? "good" : "bad"}
        />
      </div>

      <Card className="mt-6">
        <h2 className="mb-4 text-lg font-bold">Por obra</h2>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : list.length === 0 ? (
          <Empty>Nenhuma obra neste filtro.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-2 pr-3">Obra</th>
                  <th className="py-2 pr-3 text-right">Receita</th>
                  <th className="py-2 pr-3 text-right">Salários</th>
                  <th className="py-2 pr-3 text-right">Encargos</th>
                  <th className="py-2 pr-3 text-right">Benefícios</th>
                  <th className="py-2 pr-3 text-right">Despesas</th>
                  <th className="py-2 pr-3 text-right">Custo total</th>
                  <th className="py-2 pr-3 text-right">Resultado</th>
                  <th className="py-2 text-right">Margem</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => {
                  const m = r.revenue > 0 ? (r.result / r.revenue) * 100 : null;
                  return (
                    <tr key={r.id} className="border-b border-border/60 align-top last:border-0">
                      <td className="py-3 pr-3">
                        <button type="button" onClick={() => setWorkId(r.id)} className="text-left font-semibold text-primary hover:underline">
                          {r.name}
                        </button>
                        <p className="text-xs text-muted-foreground">
                          {r.city}
                          {r.client ? ` · ${r.client}` : ""} · {fmtDate(r.startDate)} a {fmtDate(r.endDate)}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <Badge tone={r.status === "concluida" ? "gray" : r.status === "em_andamento" ? "green" : "amber"}>{STATUS_LABEL[r.status]}</Badge>
                          <Badge tone="gray">{PRICING_LABEL[r.pricingModel] ?? r.pricingModel}</Badge>
                          {r.hours > 0 && <Badge tone="gray">{fmtHours(r.hours)}</Badge>}
                        </div>
                      </td>
                      <td className="py-3 pr-3 text-right">{brl(r.revenue)}</td>
                      <td className="py-3 pr-3 text-right">{brl(r.laborGross)}</td>
                      <td className="py-3 pr-3 text-right">{brl(r.laborEncargos)}</td>
                      <td className="py-3 pr-3 text-right">{brl(r.laborBeneficios)}</td>
                      <td className="py-3 pr-3 text-right">{brl(r.expensesCost)}</td>
                      <td className="py-3 pr-3 text-right font-medium">{brl(r.totalCost)}</td>
                      <td className={"py-3 pr-3 text-right font-bold " + (r.result >= 0 ? "text-primary" : "text-destructive")}>{brl(r.result)}</td>
                      <td className="py-3 text-right">{m === null ? "-" : `${m.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-4 text-xs text-muted-foreground">
          Mão de obra = horas do ponto × (salário ÷ 220) com periculosidade/insalubridade, HE 50% acima de 8 h, domingo 100%, + encargos INSS 20%, FGTS 8%, 13º e férias 19,44%, + ajuda de custo, combustível e VT mensais (÷ 30 × dias corridos na obra) + vales.
        </p>
      </Card>
      </>
      )}
    </Layout>
  );
}

const pctFmt = (m: number | null) => (m === null ? "-" : `${m.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`);

function WorkFinance({ id, onBack }: { id: number; onBack: () => void }) {
  const { data: d, isLoading, error } = useFinanceDetail(id);
  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando financeiro da obra...</p>;
  if (error || !d) return <Empty>Não foi possível abrir o financeiro desta obra.</Empty>;
  const profit = d.result >= 0;
  const cats = Object.entries(d.byCategory).sort((a, b) => b[1].total - a[1].total);
  const laborRows: [string, number][] = [
    ["Salários (horas normais, extras e adicionais)", d.labor.gross],
    ["Encargos (INSS, FGTS, 13º e férias)", d.labor.encargos],
    ["Benefícios mensais rateados", d.labor.beneficios],
    ["Vales", d.labor.vouchers],
  ];
  return (
    <>
      <Card className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Financeiro da obra</p>
          <h2 className="text-xl font-bold">{d.work.name}</h2>
          <p className="text-sm text-muted-foreground">
            {d.work.city}
            {d.work.client ? ` · ${d.work.client}` : ""} · {fmtDate(d.work.startDate)} a {fmtDate(d.work.endDate)} · {PRICING_LABEL[d.work.pricingModel] ?? d.work.pricingModel}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            <Badge tone={d.work.status === "concluida" ? "gray" : d.work.status === "em_andamento" ? "green" : "amber"}>{STATUS_LABEL[d.work.status]}</Badge>
            {d.labor.hours > 0 && <Badge tone="gray">{fmtHours(d.labor.hours)} no ponto</Badge>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnGhost} onClick={onBack}>Voltar para todas</button>
          <Link href={`/obras/${d.work.id}?tab=diario`} className={btnGhost}>Lançar custos</Link>
          <Link href={`/obras/${d.work.id}/relatorio`} className={btnGhost}>Relatório final</Link>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Receita (contrato)" value={brl(d.revenue)} />
        <Stat label="Mão de obra" value={brl(d.labor.total)} />
        <Stat label="Despesas" value={brl(d.expensesTotal)} />
        <Stat label={profit ? "Lucro" : "Prejuízo"} value={brl(d.result)} tone={profit ? "good" : "bad"} />
        <Stat label="Margem" value={pctFmt(d.margin)} tone={profit ? "good" : "bad"} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-lg font-bold">Mão de obra CLT</h3>
          <table className="w-full text-left text-sm">
            <tbody>
              {laborRows.map(([l, v]) => (
                <tr key={l} className="border-b border-border/60">
                  <td className="py-2 pr-3">{l}</td>
                  <td className="py-2 text-right font-medium">{brl(v)}</td>
                </tr>
              ))}
              <tr>
                <td className="pt-3 font-bold">Total mão de obra</td>
                <td className="pt-3 text-right font-bold">{brl(d.labor.total)}</td>
              </tr>
            </tbody>
          </table>
        </Card>

        <Card>
          <h3 className="mb-3 text-lg font-bold">Despesas por categoria</h3>
          {cats.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma despesa lançada.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <tbody>
                {cats.map(([c, v]) => (
                  <tr key={c} className="border-b border-border/60">
                    <td className="py-2 pr-3">
                      {CATEGORY_LABEL[c] ?? c} <span className="text-xs text-muted-foreground">({v.entries} lanç.)</span>
                    </td>
                    <td className="py-2 text-right font-medium">{brl(v.total)}</td>
                  </tr>
                ))}
                <tr>
                  <td className="pt-3 font-bold">Total despesas</td>
                  <td className="pt-3 text-right font-bold">{brl(d.expensesTotal)}</td>
                </tr>
              </tbody>
            </table>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <h3 className="mb-3 text-lg font-bold">Custo por funcionário</h3>
          {d.labor.perEmployee.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum funcionário escalado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="py-2 pr-3">Funcionário</th>
                    <th className="py-2 pr-3 text-right">Dias</th>
                    <th className="py-2 pr-3 text-right">Horas</th>
                    <th className="py-2 pr-3 text-right">Benefícios</th>
                    <th className="py-2 pr-3 text-right">Vale</th>
                    <th className="py-2 text-right">Custo total</th>
                  </tr>
                </thead>
                <tbody>
                  {d.labor.perEmployee.map((p) => (
                    <tr key={p.employeeId} className="border-b border-border/60 last:border-0">
                      <td className="py-2 pr-3">
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.role} · {p.crewType === "reserva" ? "Reserva" : "Titular"}</p>
                      </td>
                      <td className="py-2 pr-3 text-right">{p.presentDays}</td>
                      <td className="py-2 pr-3 text-right">{fmtHours(p.hours)}</td>
                      <td className="py-2 pr-3 text-right">{brl(p.benefits)}</td>
                      <td className="py-2 pr-3 text-right">{brl(p.voucher)}</td>
                      <td className="py-2 text-right font-semibold">{brl(p.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <h3 className="mb-3 text-lg font-bold">Lançamentos ({d.expenses.length})</h3>
          {d.expenses.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum lançamento de custo nesta obra.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="py-2 pr-3">Data</th>
                    <th className="py-2 pr-3">Categoria</th>
                    <th className="py-2 pr-3">Descrição</th>
                    <th className="py-2 pr-3 text-right">Qtd.</th>
                    <th className="py-2 pr-3 text-right">Unitário</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {d.expenses.map((e) => (
                    <tr key={e.id} className="border-b border-border/60 last:border-0">
                      <td className="py-2 pr-3 whitespace-nowrap">{fmtDate(e.date)}</td>
                      <td className="py-2 pr-3">{CATEGORY_LABEL[e.category] ?? e.category}</td>
                      <td className="py-2 pr-3 text-muted-foreground">
                        {e.description || "-"}
                        {e.employeeName ? ` · ${e.employeeName}` : ""}
                      </td>
                      <td className="py-2 pr-3 text-right">{e.quantity.toLocaleString("pt-BR")}</td>
                      <td className="py-2 pr-3 text-right">{brl(e.unitCost)}</td>
                      <td className="py-2 text-right font-semibold">{brl(e.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
