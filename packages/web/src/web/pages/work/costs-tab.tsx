import { useState } from "react";
import { Card, Empty, ErrorBox, Field, Stat } from "../../components/ui-kit";
import { useWorkItemMutations } from "../../queries/work-items";
import { btnDanger, btnGhost, btnPrimary, inputCls } from "../../lib/cls";
import { brl, fmtDate, todayISO } from "../../lib/format";
import { CATEGORIES, CATEGORY_LABEL } from "../../lib/labels";
import { isLocal } from "../../lib/local";
import type { WorkData } from "./index";

const EMPTY = { category: "viagem_carro", description: "", employeeId: "", quantity: "1", unitCost: "" };

export function CostsTab({ data }: { data: WorkData }) {
  const m = useWorkItemMutations();
  const [date, setDate] = useState(todayISO());
  const [f, setF] = useState(EMPTY);
  const [error, setError] = useState<unknown>(null);
  const workId = data.work.id;
  const meta = CATEGORIES.find((c) => c.value === f.category)!;
  const isFuel = f.category === "combustivel";
  const localTeam = data.team.filter((t) => isLocal(t.city, data.work.city));

  const dayExpenses = data.expenses.filter((e) => e.date === date);
  const dayTotal = dayExpenses.reduce((s, e) => s + e.total, 0);
  const totalCost = data.expenses.reduce((s, e) => s + e.total, 0);
  const hours = data.expenses.filter((e) => e.category === "hora_trabalhada").reduce((s, e) => s + e.quantity, 0);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await m.addExpense.mutateAsync({
        workId,
        date,
        category: f.category as (typeof CATEGORIES)[number]["value"],
        description: f.description.trim() || null,
        employeeId: isFuel && f.employeeId ? Number(f.employeeId) : null,
        quantity: Number(f.quantity.replace(",", ".")) || 0,
        unitCost: Number(f.unitCost.replace(",", ".")) || 0,
      });
      setF({ ...EMPTY, category: f.category });
    } catch (err) {
      setError(err);
    }
  };

  const remove = async (id: number) => {
    setError(null);
    try {
      await m.removeExpense.mutateAsync({ id });
    } catch (err) {
      setError(err);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label={`Custos do dia ${fmtDate(date)}`} value={brl(dayTotal)} />
        <Stat label="Custo acumulado da obra" value={brl(totalCost)} />
        <Stat label="Horas avulsas lançadas" value={`${hours.toLocaleString("pt-BR")} h`} />
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Custos do dia (despesas)</h2>
            <p className="text-sm text-muted-foreground">Lance viagens, diárias de equipamento, hospedagem, combustível e transporte de peças. A mão de obra CLT vem do registro de ponto.</p>
          </div>
          <div className="no-print flex gap-2">
            <Field label="Dia">
              <input aria-label="Dia" type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <button className={btnGhost} onClick={() => window.print()}>Imprimir</button>
          </div>
        </div>

        <form onSubmit={add} className="no-print grid gap-3 rounded-xl bg-muted/60 p-4 md:grid-cols-2 lg:grid-cols-4">
          <Field label="Categoria" className="lg:col-span-2">
            <select className={inputCls} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value, employeeId: "" })}>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Descrição" className="lg:col-span-2">
            <input aria-label="Descrição" className={inputCls} placeholder="Ex.: Caminhão ida e volta, Munck" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          </Field>
          {isFuel && (
            <Field label="Funcionário local" className="lg:col-span-2">
              <select className={inputCls} required value={f.employeeId} onChange={(e) => setF({ ...f, employeeId: e.target.value })}>
                <option value="">Selecione</option>
                {localTeam.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.city})</option>
                ))}
              </select>
              {localTeam.length === 0 && (
                <span className="text-xs text-muted-foreground">Nenhum funcionário da equipe mora em {data.work.city}.</span>
              )}
            </Field>
          )}
          <Field label={meta.qty}>
            <input aria-label={meta.qty} className={inputCls} required inputMode="decimal" value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} />
          </Field>
          <Field label={meta.cost}>
            <input aria-label={meta.cost} className={inputCls} required inputMode="decimal" value={f.unitCost} onChange={(e) => setF({ ...f, unitCost: e.target.value })} />
          </Field>
          <div className="flex items-end">
            <button className={btnPrimary + " w-full"} disabled={m.addExpense.isPending}>Lançar custo</button>
          </div>
        </form>
        <div className="mt-3"><ErrorBox error={error} /></div>

        <h3 className="mb-2 mt-6 text-sm font-semibold text-muted-foreground">Lançamentos de {fmtDate(date)}</h3>
        {dayExpenses.length === 0 ? (
          <Empty>Nenhum custo lançado neste dia.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-2 pr-3">Categoria</th>
                  <th className="py-2 pr-3">Descrição</th>
                  <th className="py-2 pr-3 text-right">Qtd.</th>
                  <th className="py-2 pr-3 text-right">Unitário</th>
                  <th className="py-2 pr-3 text-right">Total</th>
                  <th className="py-2 text-right no-print"><span className="sr-only">Ações</span></th>
                </tr>
              </thead>
              <tbody>
                {dayExpenses.map((e) => (
                  <tr key={e.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2 pr-3">{CATEGORY_LABEL[e.category]}</td>
                    <td className="py-2 pr-3">
                      {e.description || "-"}
                      {e.employeeId && <span className="text-muted-foreground"> · {data.team.find((t) => t.id === e.employeeId)?.name ?? "(removido)"}</span>}
                    </td>
                    <td className="py-2 pr-3 text-right">{e.quantity}</td>
                    <td className="py-2 pr-3 text-right">{brl(e.unitCost)}</td>
                    <td className="py-2 pr-3 text-right font-semibold">{brl(e.total)}</td>
                    <td className="py-2 text-right no-print"><button className={btnDanger} onClick={() => remove(e.id)}>Remover</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
