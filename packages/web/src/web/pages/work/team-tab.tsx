import { useState } from "react";
import { Badge, Card, Empty, ErrorBox, Field } from "../../components/ui-kit";
import { useEmployees } from "../../queries/employees";
import { useWorkItemMutations } from "../../queries/work-items";
import { btnDanger, btnGhost, btnPrimary, inputCls } from "../../lib/cls";
import { brl, fmtDate } from "../../lib/format";
import { ADICIONAL_LABEL, CONTRACT_LABEL } from "../../lib/labels";
import { Avatar } from "../../components/avatar";
import { ValidityBadge } from "../../components/validity-badge";
import type { WorkData } from "./index";

type Terms = WorkData["team"][number]["terms"];
type TermsForm = {
  crewType: "titular" | "reserva";
  salary: string;
  adicional: "nenhum" | "periculosidade" | "insalubridade";
  monthlyAllowance: string;
  monthlyFuel: string;
  monthlyTransport: string;
  voucher: string;
  periodStart: string;
  periodEnd: string;
};

const num = (v: string) => Number(v.replace(",", ".")) || 0;
const toForm = (t: Terms): TermsForm => ({
  crewType: t.crewType === "reserva" ? "reserva" : "titular",
  salary: t.salary ? String(t.salary) : "",
  adicional: (["nenhum", "periculosidade", "insalubridade"].includes(t.adicional) ? t.adicional : "nenhum") as TermsForm["adicional"],
  monthlyAllowance: t.monthlyAllowance ? String(t.monthlyAllowance) : "",
  monthlyFuel: t.monthlyFuel ? String(t.monthlyFuel) : "",
  monthlyTransport: t.monthlyTransport ? String(t.monthlyTransport) : "",
  voucher: t.voucher ? String(t.voucher) : "",
  periodStart: t.periodStart ?? "",
  periodEnd: t.periodEnd ?? "",
});
const fromForm = (f: TermsForm) => ({
  crewType: f.crewType,
  salary: num(f.salary),
  adicional: f.adicional,
  monthlyAllowance: num(f.monthlyAllowance),
  monthlyFuel: num(f.monthlyFuel),
  monthlyTransport: num(f.monthlyTransport),
  voucher: num(f.voucher),
  periodStart: f.periodStart || null,
  periodEnd: f.periodEnd || null,
});
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

type Period = { startDate: string; endDate: string };

/** Prévia do rateio: valor mensal ÷ 30 × dias corridos na obra (mesma regra do servidor) */
function benefitPreview(f: TermsForm, work: Period) {
  const start = f.periodStart || work.startDate;
  const end = f.periodEnd || work.endDate;
  const a = Date.parse(`${start}T12:00:00Z`);
  const b = Date.parse(`${end}T12:00:00Z`);
  const days = Number.isNaN(a) || Number.isNaN(b) || b < a ? 0 : Math.round((b - a) / 86_400_000) + 1;
  const monthly = num(f.monthlyAllowance) + num(f.monthlyFuel) + num(f.monthlyTransport);
  return { days, monthly, total: Math.round(((monthly * days) / 30) * 100) / 100 };
}

function TermsFields({ f, set, work }: { f: TermsForm; set: (f: TermsForm) => void; work: Period }) {
  const prev = benefitPreview(f, work);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Tipo na escala">
        <div className="grid grid-cols-2 gap-2">
          {(["titular", "reserva"] as const).map((c) => (
            <button key={c} type="button" className={f.crewType === c ? btnPrimary : btnGhost} onClick={() => set({ ...f, crewType: c })}>
              {c === "titular" ? "Titular" : "Reserva"}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Salário mensal CLT (R$)">
        <input aria-label="Salário mensal" className={inputCls} inputMode="decimal" placeholder="Ex: 3200" value={f.salary} onChange={(e) => set({ ...f, salary: e.target.value })} />
      </Field>
      <Field label="Adicional" className="sm:col-span-2">
        <select aria-label="Adicional" className={inputCls} value={f.adicional} onChange={(e) => set({ ...f, adicional: e.target.value as TermsForm["adicional"] })}>
          {Object.entries(ADICIONAL_LABEL).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Ajuda de custo por mês (R$)">
        <input aria-label="Ajuda de custo por mês" className={inputCls} inputMode="decimal" value={f.monthlyAllowance} onChange={(e) => set({ ...f, monthlyAllowance: e.target.value })} />
      </Field>
      <Field label="Combustível por mês (R$)">
        <input aria-label="Combustível por mês" className={inputCls} inputMode="decimal" value={f.monthlyFuel} onChange={(e) => set({ ...f, monthlyFuel: e.target.value })} />
      </Field>
      <Field label="Vale-transporte por mês (R$)">
        <input aria-label="Vale-transporte por mês" className={inputCls} inputMode="decimal" value={f.monthlyTransport} onChange={(e) => set({ ...f, monthlyTransport: e.target.value })} />
      </Field>
      <Field label="Vale / adiantamento na obra (R$)">
        <input aria-label="Vale na obra" className={inputCls} inputMode="decimal" placeholder="Valor total na obra" value={f.voucher} onChange={(e) => set({ ...f, voucher: e.target.value })} />
      </Field>
      <Field label="Entrada na obra">
        <input aria-label="Entrada na obra" type="date" className={inputCls} min={work.startDate} max={work.endDate} value={f.periodStart || work.startDate} onChange={(e) => set({ ...f, periodStart: e.target.value === work.startDate ? "" : e.target.value })} />
      </Field>
      <Field label="Saída da obra">
        <input aria-label="Saída da obra" type="date" className={inputCls} min={work.startDate} max={work.endDate} value={f.periodEnd || work.endDate} onChange={(e) => set({ ...f, periodEnd: e.target.value === work.endDate ? "" : e.target.value })} />
      </Field>
      <p className="rounded-lg bg-primary/5 px-3 py-2 text-xs text-muted-foreground sm:col-span-2">
        Benefícios na obra: <b className="text-foreground">{brl(prev.total)}</b> = {brl(prev.monthly)}/mês ÷ 30 × {prev.days} dia(s) corridos.
      </p>
    </div>
  );
}

function IssuesList({ issues }: { issues: { level: string; message: string }[] }) {
  if (issues.length === 0) return <Badge>Documentação ok</Badge>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {issues.map((i, k) => (
        <Badge key={k} tone={i.level === "erro" ? "red" : "amber"}>
          {i.message}
        </Badge>
      ))}
    </div>
  );
}

export function TeamTab({ data }: { data: WorkData }) {
  const { data: employees = [] } = useEmployees();
  const m = useWorkItemMutations();
  const { work } = data;
  const workId = work.id;
  const titulares = data.team.filter((t) => t.terms.crewType === "titular");
  const fullCrew = work.requiredCrew > 0 && titulares.length >= work.requiredCrew;

  const [employeeId, setEmployeeId] = useState("");
  const [terms, setTerms] = useState<TermsForm>(toForm({ crewType: "titular", salary: 0, adicional: "nenhum", monthlyAllowance: 0, monthlyFuel: 0, monthlyTransport: 0, voucher: 0, periodStart: null, periodEnd: null }));
  const [error, setError] = useState<unknown>(null);
  const [lastIssues, setLastIssues] = useState<{ name: string; issues: { level: string; message: string }[] } | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<TermsForm | null>(null);

  const available = employees.filter((e) => e.active && !data.team.some((t) => t.id === e.id));
  const selected = employees.find((e) => String(e.id) === employeeId);

  const select = (id: string) => {
    setEmployeeId(id);
    // Puxa salário e adicional da função cadastrada na obra (se houver)
    const emp = employees.find((e) => String(e.id) === id);
    const row = emp ? work.plan.find((p) => norm(emp.role).includes(norm(p.role)) || norm(p.role).includes(norm(emp.role))) : undefined;
    setTerms({
      ...terms,
      crewType: fullCrew ? "reserva" : "titular",
      ...(row && row.salary ? { salary: String(row.salary), adicional: row.adicional } : {}),
    });
  };

  const add = async () => {
    setError(null);
    setLastIssues(null);
    if (!selected) return;
    try {
      const res = await m.addEmployee.mutateAsync({ workId, employeeId: selected.id, ...fromForm(terms) });
      if (res.issues.length) setLastIssues({ name: selected.name, issues: res.issues });
      setEmployeeId("");
    } catch (e) {
      setError(e);
    }
  };

  const remove = async (id: number, name: string) => {
    if (!confirm(`Remover ${name} desta obra?`)) return;
    setError(null);
    try {
      await m.removeEmployee.mutateAsync({ workId, employeeId: id });
    } catch (e) {
      setError(e);
    }
  };

  const saveTerms = async (employeeId: number) => {
    if (!editForm) return;
    setError(null);
    try {
      await m.updateTerms.mutateAsync({ workId, employeeId, ...fromForm(editForm) });
      setEditId(null);
    } catch (e) {
      setError(e);
    }
  };

  // Integrações do selecionado que batem com o cliente da obra
  const clientMatch = (client: string, unit: string) => {
    if (!work.client) return false;
    const wc = norm(work.client);
    return wc.includes(norm(client)) || norm(`${client} ${unit}`).includes(wc);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
      <Card className="h-fit">
        <h2 className="mb-1 text-lg font-bold">Escalar funcionário</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Salário e benefícios valem só para esta obra. Conflito de datas com outra obra bloqueia a escala.
        </p>
        <div className="flex flex-col gap-3">
          <select aria-label="Funcionário" className={inputCls} value={employeeId} onChange={(e) => select(e.target.value)}>
            <option value="">Selecione o funcionário</option>
            {available.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} · {e.role} · {e.city}
              </option>
            ))}
          </select>

          {selected && (
            <div className="rounded-xl border border-border bg-muted/40 p-3 text-sm">
              <p className="mb-2 font-semibold">Documentos de {selected.name}</p>
              <div className="flex flex-wrap gap-1.5">
                <ValidityBadge label="ASO" date={selected.asoValidUntil} />
                {selected.nrs.map((n) => (
                  <ValidityBadge key={n.id} label={n.name} date={n.validUntil} />
                ))}
              </div>
              <p className="mb-1 mt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Integrações</p>
              {selected.integrations.length === 0 ? (
                <p className="text-xs text-destructive">Sem integração cadastrada.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {selected.integrations.map((i) => (
                    <span key={i.id} className={clientMatch(i.client, i.unit) ? "rounded-full ring-2 ring-primary/40" : ""}>
                      <ValidityBadge label={`${i.client}/${i.unit}`} date={i.validUntil} />
                    </span>
                  ))}
                </div>
              )}
              {work.client && !selected.integrations.some((i) => clientMatch(i.client, i.unit)) && (
                <p className="mt-2 text-xs font-medium text-destructive">Não tem integração em "{work.client}".</p>
              )}
            </div>
          )}

          {selected && <TermsFields f={terms} set={setTerms} work={work} />}
          {fullCrew && selected && terms.crewType === "titular" && (
            <p className="text-xs text-amber-700">A obra já tem {titulares.length} titular(es) de {work.requiredCrew} pedidos.</p>
          )}

          <button className={btnPrimary} disabled={!employeeId || m.addEmployee.isPending} onClick={add}>
            Adicionar à obra
          </button>
          <ErrorBox error={error} />
          {lastIssues && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
              <p className="mb-2 font-semibold text-amber-800">{lastIssues.name} foi escalado, mas confira:</p>
              <IssuesList issues={lastIssues.issues} />
            </div>
          )}
        </div>
      </Card>

      <div className="flex flex-col gap-6">
        {work.plan.length > 0 && (
          <Card>
            <h2 className="mb-3 text-lg font-bold">Funções pedidas x escaladas</h2>
            <div className="flex flex-wrap gap-2">
              {work.plan.map((p) => {
                const have = titulares.filter((t) => norm(t.role).includes(norm(p.role)) || norm(p.role).includes(norm(t.role))).length;
                return (
                  <Badge key={p.role} tone={have >= p.qty ? "green" : "amber"}>
                    {p.role}: {have}/{p.qty}
                  </Badge>
                );
              })}
            </div>
          </Card>
        )}

        <Card>
          <h2 className="mb-4 text-lg font-bold">
            Equipe da obra ({titulares.length} titular(es){work.requiredCrew ? ` de ${work.requiredCrew}` : ""}, {data.team.length - titulares.length} reserva(s))
          </h2>
          {data.team.length === 0 ? (
            <Empty>Nenhum funcionário escalado ainda.</Empty>
          ) : (
            <ul className="flex flex-col divide-y divide-border/70">
              {[...data.team]
                .sort((a, b) => (a.terms.crewType === b.terms.crewType ? a.name.localeCompare(b.name) : a.terms.crewType === "titular" ? -1 : 1))
                .map((t) => (
                  <li key={t.id} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                      <Avatar name={t.name} photo={t.photo} size={40} />
                      <div>
                        <p className="font-semibold">
                          {t.name} {t.contractType && <Badge tone="amber">{CONTRACT_LABEL[t.contractType] ?? t.contractType}</Badge>} <Badge tone={t.terms.crewType === "titular" ? "green" : "gray"}>{t.terms.crewType === "titular" ? "Titular" : "Reserva"}</Badge>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t.role} · {t.city}
                          {t.phone ? ` · ${t.phone}` : ""}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Salário {t.terms.salary ? brl(t.terms.salary) : "não informado"}
                          {t.terms.adicional !== "nenhum" ? ` + ${ADICIONAL_LABEL[t.terms.adicional]}` : ""}
                          {t.terms.monthlyAllowance ? ` · Ajuda ${brl(t.terms.monthlyAllowance)}/mês` : ""}
                          {t.terms.monthlyFuel ? ` · Comb. ${brl(t.terms.monthlyFuel)}/mês` : ""}
                          {t.terms.monthlyTransport ? ` · VT ${brl(t.terms.monthlyTransport)}/mês` : ""}
                          {t.terms.voucher ? ` · Vale ${brl(t.terms.voucher)}` : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Na obra {fmtDate(t.benefits.start)} a {fmtDate(t.benefits.end)} ({t.benefits.days} dias)
                          {t.benefits.total ? ` · Benefícios rateados ${brl(t.benefits.total)}` : ""}
                        </p>
                      </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          className={btnGhost}
                          onClick={() => {
                            setEditId(editId === t.id ? null : t.id);
                            setEditForm(toForm(t.terms));
                          }}
                        >
                          {editId === t.id ? "Fechar" : "Salário e benefícios"}
                        </button>
                        <button className={btnDanger} onClick={() => remove(t.id, t.name)}>
                          Remover
                        </button>
                      </div>
                    </div>
                    <IssuesList issues={t.issues} />
                    {editId === t.id && editForm && (
                      <div className="mt-2 rounded-xl border border-border bg-muted/40 p-3">
                        <TermsFields f={editForm} set={setEditForm} work={work} />
                        <div className="mt-3 flex gap-2">
                          <button className={btnPrimary} disabled={m.updateTerms.isPending} onClick={() => saveTerms(t.id)}>
                            Salvar
                          </button>
                          <button className={btnGhost} onClick={() => setEditId(null)}>
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
