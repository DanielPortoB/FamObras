import { useState } from "react";
import { ErrorBox, Field } from "./ui-kit";
import { btnGhost, btnPrimary, inputCls } from "../lib/cls";
import { todayISO } from "../lib/format";
import { resizeImage } from "../lib/download";
import { ADICIONAL_LABEL } from "../lib/labels";

type Adicional = "nenhum" | "periculosidade" | "insalubridade";
export type CrewPlanRow = { role: string; qty: number; salary?: number; adicional?: Adicional };
type RowForm = { role: string; qty: string; salary: string; adicional: Adicional };

export type WorkFormValues = {
  name: string;
  city: string;
  client: string | null;
  responsible: string | null;
  startDate: string;
  endDate: string;
  contractValue: number;
  pricingModel: "pacote" | "hh";
  hasSedeFabrication: boolean;
  crewPlan: CrewPlanRow[];
  coverImage: string | null;
};

export const EMPTY_WORK: WorkFormValues = {
  name: "",
  city: "",
  client: null,
  responsible: null,
  startDate: todayISO(),
  endDate: todayISO(),
  contractValue: 0,
  pricingModel: "pacote",
  hasSedeFabrication: false,
  crewPlan: [],
  coverImage: null,
};

/** Formulário da obra (criar e editar): dados, modelo de preço, fabricação na sede e quantidade por função */
export function WorkForm({
  initial,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: {
  initial: WorkFormValues;
  submitLabel: string;
  pending?: boolean;
  onSubmit: (v: WorkFormValues) => Promise<void>;
  onCancel?: () => void;
}) {
  const [f, setF] = useState({
    ...initial,
    client: initial.client ?? "",
    responsible: initial.responsible ?? "",
    contractValue: initial.contractValue ? String(initial.contractValue) : "",
    crewPlan: initial.crewPlan.map((p): RowForm => ({ role: p.role, qty: String(p.qty), salary: p.salary ? String(p.salary) : "", adicional: p.adicional ?? "nenhum" })),
  });
  const [error, setError] = useState<unknown>(null);
  const [coverBusy, setCoverBusy] = useState(false);
  const total = f.crewPlan.reduce((s, p) => s + (Number(p.qty) || 0), 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await onSubmit({
        name: f.name.trim(),
        city: f.city.trim(),
        client: f.client.trim() || null,
        responsible: f.responsible.trim() || null,
        startDate: f.startDate,
        endDate: f.endDate,
        contractValue: Number(f.contractValue.replace(/\./g, "").replace(",", ".")) || 0,
        pricingModel: f.pricingModel,
        hasSedeFabrication: f.hasSedeFabrication,
        coverImage: f.coverImage,
        crewPlan: f.crewPlan.filter((p) => p.role.trim() && Number(p.qty) > 0).map((p) => ({
            role: p.role.trim(),
            qty: Math.round(Number(p.qty)),
            salary: Number(p.salary.replace(/\./g, "").replace(",", ".")) || 0,
            adicional: p.adicional,
          })),
      });
    } catch (err) {
      setError(err);
    }
  };

  const setRow = (i: number, patch: Partial<RowForm>) =>
    setF({ ...f, crewPlan: f.crewPlan.map((p, k) => (k === i ? { ...p, ...patch } : p)) });

  const pickCover = async (file: File | undefined) => {
    if (!file) return;
    setCoverBusy(true);
    setError(null);
    try {
      setF((cur) => ({ ...cur, coverImage: "" }));
      const dataUrl = await resizeImage(file, 1400, 0.72);
      setF((cur) => ({ ...cur, coverImage: dataUrl }));
    } catch (err) {
      setError(err);
      setF((cur) => ({ ...cur, coverImage: initial.coverImage }));
    } finally {
      setCoverBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <p className="mb-1.5 text-sm font-medium">Imagem de capa</p>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-28 w-48 items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-muted/40">
            {f.coverImage ? (
              <img src={f.coverImage} alt="Capa da obra" className="h-full w-full object-cover" />
            ) : (
              <span className="px-3 text-center text-xs text-muted-foreground">{coverBusy ? "Processando..." : "Sem capa"}</span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label className={btnGhost + " cursor-pointer"}>
              {f.coverImage ? "Trocar imagem" : "Escolher imagem"}
              <input aria-label="Imagem de capa" type="file" accept="image/*" className="hidden" onChange={(e) => { pickCover(e.target.files?.[0]); e.target.value = ""; }} />
            </label>
            {f.coverImage && (
              <button type="button" className="text-left text-xs font-medium text-destructive hover:underline" onClick={() => setF({ ...f, coverImage: null })}>
                Remover capa
              </button>
            )}
          </div>
        </div>
      </div>
      <Field label="Nome da obra">
        <input aria-label="Nome da obra" className={inputCls} required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      </Field>
      <Field label="Cidade da obra">
        <input aria-label="Cidade da obra" className={inputCls} required value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} />
      </Field>
      <Field label="Cliente / unidade">
        <input aria-label="Cliente" className={inputCls} placeholder="Usado para conferir a integração" value={f.client} onChange={(e) => setF({ ...f, client: e.target.value })} />
      </Field>
      <Field label="Responsável">
        <input aria-label="Responsável" className={inputCls} value={f.responsible} onChange={(e) => setF({ ...f, responsible: e.target.value })} />
      </Field>
      <Field label="Data de início">
        <input aria-label="Data de início" type="date" className={inputCls} required value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} />
      </Field>
      <Field label="Data de fim">
        <input aria-label="Data de fim" type="date" className={inputCls} required value={f.endDate} onChange={(e) => setF({ ...f, endDate: e.target.value })} />
      </Field>
      <Field label="Modelo de preço">
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["pacote", "Pacote fechado"],
              ["hh", "HH (homem-hora)"],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => setF({ ...f, pricingModel: v })}
              className={f.pricingModel === v ? btnPrimary : btnGhost}
            >
              {label}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Valor do contrato (R$)">
        <input
          aria-label="Valor do contrato (R$)"
          className={inputCls}
          inputMode="decimal"
          placeholder="Usado no cálculo de lucro ou prejuízo"
          value={f.contractValue}
          onChange={(e) => setF({ ...f, contractValue: e.target.value })}
        />
      </Field>
      <label className="flex items-center gap-2 text-sm md:col-span-2">
        <input
          aria-label="Terá fabricação na sede"
          type="checkbox"
          className="h-4 w-4 accent-[#125f3d]"
          checked={f.hasSedeFabrication}
          onChange={(e) => setF({ ...f, hasSedeFabrication: e.target.checked })}
        />
        Terá fabricação na sede nesta obra
      </label>

      <div className="rounded-xl border border-border bg-muted/40 p-3 md:col-span-2">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-bold">
            Funções pedidas pela obra{" "}
            <span className="font-normal text-muted-foreground">
              ({f.crewPlan.length} função(ões), {total} pessoa(s) titulares)
            </span>
          </p>
          <button type="button" className={btnGhost + " px-2 py-1 text-xs"} onClick={() => setF({ ...f, crewPlan: [...f.crewPlan, { role: "", qty: "1", salary: "", adicional: "nenhum" }] })}>
            + Função
          </button>
        </div>
        {f.crewPlan.length === 0 ? (
          <p className="text-xs text-muted-foreground">Ex: Soldador 2, Montador 3. Quem passar disso na escala fica como reserva.</p>
        ) : (
          <p className="mb-2 text-xs text-muted-foreground">Salário e adicional da função são puxados automaticamente ao escalar o funcionário (dá para ajustar na equipe).</p>
        )}
        <div className="flex flex-col gap-2">
          {f.crewPlan.map((p, i) => (
            <div key={i} className="grid gap-2 rounded-lg border border-border/70 bg-card p-2">
              <div className="grid grid-cols-[1fr_70px_auto] items-center gap-2">
                <input aria-label="Função" className={inputCls} placeholder="Função (ex: Soldador)" value={p.role} onChange={(e) => setRow(i, { role: e.target.value })} />
                <input aria-label="Quantidade" title="Quantidade" className={inputCls} type="number" min={1} value={p.qty} onChange={(e) => setRow(i, { qty: e.target.value })} />
                <button type="button" aria-label="Remover função" className="px-1 text-lg leading-none text-destructive" onClick={() => setF({ ...f, crewPlan: f.crewPlan.filter((_, k) => k !== i) })}>
                  ×
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                  Salário mensal (R$)
                  <input aria-label="Salário mensal da função" className={inputCls} inputMode="decimal" placeholder="Ex: 3500" value={p.salary} onChange={(e) => setRow(i, { salary: e.target.value })} />
                </label>
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                  Adicional
                  <select aria-label="Adicional da função" className={inputCls} value={p.adicional} onChange={(e) => setRow(i, { adicional: e.target.value as Adicional })}>
                    {Object.entries(ADICIONAL_LABEL).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="md:col-span-2">
        <ErrorBox error={error} />
      </div>
      <div className="flex gap-2 md:col-span-2">
        <button className={btnPrimary} disabled={pending || coverBusy}>
          {pending ? "Salvando..." : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className={btnGhost} onClick={onCancel}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
