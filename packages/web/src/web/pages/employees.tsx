import { useMemo, useState } from "react";
import { Layout } from "../components/layout";
import { Badge, Card, Empty, ErrorBox, Field, PageHeader } from "../components/ui-kit";
import { useEmployeeMutations, useEmployees } from "../queries/employees";
import { btnDanger, btnGhost, btnPrimary, inputCls } from "../lib/cls";
import { maskCPF, maskPhone, unmaskCPF } from "../lib/format";
import { ValidityBadge } from "../components/validity-badge";
import { CONTRACT_LABEL, NR_SUGGESTIONS } from "../lib/labels";
import { resizeImage } from "../lib/download";
import { Avatar } from "../components/avatar";

type Integration = { client: string; unit: string; integrationDate: string; validUntil: string };
type Nr = { name: string; validUntil: string };
type Form = {
  id?: number;
  name: string;
  role: string;
  cpf: string;
  phone: string;
  city: string;
  active: boolean;
  asoValidUntil: string;
  contractType: "" | "obra_certa" | "experiencia";
  photo: string | null;
  integrations: Integration[];
  nrs: Nr[];
};
const EMPTY: Form = { name: "", role: "", cpf: "", phone: "", city: "", active: true, asoValidUntil: "", contractType: "", photo: null, integrations: [], nrs: [] };
const EMPTY_INT: Integration = { client: "", unit: "", integrationDate: "", validUntil: "" };

export default function EmployeesPage() {
  const { data: employees = [], isLoading } = useEmployees();
  const { create, update, remove } = useEmployeeMutations();
  const [form, setForm] = useState<Form>(EMPTY);
  const [search, setSearch] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const editing = form.id !== undefined;

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    setPhotoBusy(true);
    setFormError(null);
    try {
      const dataUrl = await resizeImage(file, 400, 0.8);
      setForm((f) => ({ ...f, photo: dataUrl }));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Imagem inválida");
    } finally {
      setPhotoBusy(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.role.toLowerCase().includes(q) ||
        (unmaskCPF(q) && e.cpf.includes(unmaskCPF(q))) ||
        e.city.toLowerCase().includes(q) ||
        e.integrations.some((i) => i.client.toLowerCase().includes(q)),
    );
  }, [employees, search]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const integrations = form.integrations.filter((i) => i.client.trim());
    for (const i of integrations) {
      if (!i.unit.trim() || !i.integrationDate || !i.validUntil)
        return setFormError(`Integração ${i.client}: preencha unidade, data e validade.`);
      if (i.validUntil < i.integrationDate) return setFormError(`Integração ${i.client}: validade antes da data de integração.`);
    }
    const payload = {
      name: form.name.trim(),
      role: form.role.trim(),
      cpf: unmaskCPF(form.cpf),
      phone: form.phone.trim() || null,
      city: form.city.trim(),
      active: form.active,
      asoValidUntil: form.asoValidUntil || null,
      contractType: form.contractType || null,
      photo: form.photo,
      integrations: integrations.map((i) => ({ ...i, client: i.client.trim(), unit: i.unit.trim() })),
      nrs: form.nrs.filter((n) => n.name.trim()).map((n) => ({ name: n.name.trim(), validUntil: n.validUntil || null })),
    };
    if (payload.cpf.length !== 11) return setFormError("CPF deve ter 11 números.");
    try {
      if (editing) await update.mutateAsync({ id: form.id!, ...payload });
      else await create.mutateAsync(payload);
      setForm(EMPTY);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao salvar");
    }
  };

  const startEdit = (e: (typeof employees)[number]) => {
    setForm({
      id: e.id,
      name: e.name,
      role: e.role,
      cpf: maskCPF(e.cpf),
      phone: e.phone ?? "",
      city: e.city,
      active: e.active,
      asoValidUntil: e.asoValidUntil ?? "",
      contractType: e.contractType === "obra_certa" || e.contractType === "experiencia" ? e.contractType : "",
      photo: e.photo ?? null,
      integrations: e.integrations.map((i) => ({ client: i.client, unit: i.unit, integrationDate: i.integrationDate, validUntil: i.validUntil })),
      nrs: e.nrs.map((n) => ({ name: n.name, validUntil: n.validUntil ?? "" })),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onRemove = async (id: number, name: string) => {
    if (!confirm(`Excluir ${name} do cadastro?`)) return;
    await remove.mutateAsync({ id });
    if (form.id === id) setForm(EMPTY);
  };

  const setInt = (idx: number, patch: Partial<Integration>) =>
    setForm({ ...form, integrations: form.integrations.map((i, k) => (k === idx ? { ...i, ...patch } : i)) });
  const setNr = (idx: number, patch: Partial<Nr>) => setForm({ ...form, nrs: form.nrs.map((n, k) => (k === idx ? { ...n, ...patch } : n)) });

  return (
    <Layout>
      <PageHeader title="Funcionários" subtitle="Banco de dados da equipe: contato, ASO, integrações e NRs. Salário e benefícios ficam na equipe de cada obra." />

      <div className="grid gap-6 lg:grid-cols-[440px_1fr]">
        <Card className="h-fit">
          <h2 className="mb-4 text-lg font-bold">{editing ? "Editar funcionário" : "Novo funcionário"}</h2>
          <form onSubmit={save} className="flex flex-col gap-3">
            <div className="flex items-center gap-4">
              <Avatar name={form.name || "?"} photo={form.photo} size={72} />
              <div className="flex flex-col gap-1.5">
                <label className={btnGhost + " cursor-pointer px-3 py-1.5 text-xs"}>
                  {photoBusy ? "Processando..." : form.photo ? "Trocar foto" : "Adicionar foto"}
                  <input aria-label="Foto do funcionário" type="file" accept="image/*" className="hidden" onChange={(e) => { pickPhoto(e.target.files?.[0]); e.target.value = ""; }} />
                </label>
                {form.photo && (
                  <button type="button" className="text-left text-xs font-medium text-destructive hover:underline" onClick={() => setForm({ ...form, photo: null })}>
                    Remover foto
                  </button>
                )}
              </div>
            </div>
            <Field label="Nome completo">
              <input aria-label="Nome completo" className={inputCls} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Função">
              <input aria-label="Função" className={inputCls} required placeholder="Ex: Soldador, Montador, Encarregado" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="CPF">
                <input
                  aria-label="CPF"
                  className={inputCls}
                  required
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  value={form.cpf}
                  onChange={(e) => setForm({ ...form, cpf: maskCPF(e.target.value) })}
                />
              </Field>
              <Field label="Telefone">
                <input
                  aria-label="Telefone"
                  className={inputCls}
                  inputMode="tel"
                  placeholder="(00) 00000-0000"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: maskPhone(e.target.value) })}
                />
              </Field>
            </div>
            <Field label="Cidade onde mora">
              <input aria-label="Cidade onde mora" className={inputCls} required placeholder="Define se é funcionário local da obra" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tipo de contrato">
                <select aria-label="Tipo de contrato" className={inputCls} value={form.contractType} onChange={(e) => setForm({ ...form, contractType: e.target.value as Form["contractType"] })}>
                  <option value="">Não informado</option>
                  {Object.entries(CONTRACT_LABEL).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </Field>
              <Field label="ASO válido até">
                <input aria-label="ASO válido até" type="date" className={inputCls} value={form.asoValidUntil} onChange={(e) => setForm({ ...form, asoValidUntil: e.target.value })} />
              </Field>
            </div>

            {/* Integrações */}
            <div className="mt-2 rounded-xl border border-border bg-muted/40 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-bold">Integrações (cliente / unidade)</p>
                <button type="button" className={btnGhost + " px-2 py-1 text-xs"} onClick={() => setForm({ ...form, integrations: [...form.integrations, { ...EMPTY_INT }] })}>
                  + Integração
                </button>
              </div>
              {form.integrations.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma integração. Ex: Yara / Rio Grande.</p>}
              <div className="flex flex-col gap-3">
                {form.integrations.map((i, idx) => (
                  <div key={idx} className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-white p-2">
                    <input aria-label="Cliente" className={inputCls} placeholder="Cliente (ex: Yara)" value={i.client} onChange={(e) => setInt(idx, { client: e.target.value })} />
                    <input aria-label="Unidade" className={inputCls} placeholder="Unidade / cidade" value={i.unit} onChange={(e) => setInt(idx, { unit: e.target.value })} />
                    <label className="text-xs text-muted-foreground">
                      Data da integração
                      <input aria-label="Data da integração" type="date" className={inputCls} value={i.integrationDate} onChange={(e) => setInt(idx, { integrationDate: e.target.value })} />
                    </label>
                    <label className="text-xs text-muted-foreground">
                      Válida até
                      <input aria-label="Integração válida até" type="date" className={inputCls} value={i.validUntil} onChange={(e) => setInt(idx, { validUntil: e.target.value })} />
                    </label>
                    <button
                      type="button"
                      className="col-span-2 text-left text-xs font-medium text-destructive hover:underline"
                      onClick={() => setForm({ ...form, integrations: form.integrations.filter((_, k) => k !== idx) })}
                    >
                      Remover integração
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* NRs */}
            <div className="rounded-xl border border-border bg-muted/40 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-bold">NRs e habilitações</p>
                <button type="button" className={btnGhost + " px-2 py-1 text-xs"} onClick={() => setForm({ ...form, nrs: [...form.nrs, { name: "", validUntil: "" }] })}>
                  + NR
                </button>
              </div>
              {form.nrs.length === 0 && <p className="text-xs text-muted-foreground">Ex: NR-35, PTA, Sinaleiro, NR-10.</p>}
              <datalist id="nr-suggestions">
                {NR_SUGGESTIONS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </datalist>
              <div className="flex flex-col gap-2">
                {form.nrs.map((n, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_140px_auto] items-center gap-2">
                    <input aria-label="NR ou habilitação" list="nr-suggestions" className={inputCls} placeholder="NR-35" value={n.name} onChange={(e) => setNr(idx, { name: e.target.value })} />
                    <input aria-label="NR válida até" type="date" className={inputCls} value={n.validUntil} onChange={(e) => setNr(idx, { validUntil: e.target.value })} />
                    <button type="button" aria-label="Remover NR" className="px-1 text-lg leading-none text-destructive" onClick={() => setForm({ ...form, nrs: form.nrs.filter((_, k) => k !== idx) })}>
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input aria-label="Funcionário ativo" type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="accent-[#125f3d]" />
              Ativo
            </label>
            <ErrorBox error={formError ? new Error(formError) : null} />
            <div className="mt-2 flex gap-2">
              <button className={btnPrimary} disabled={create.isPending || update.isPending || photoBusy}>
                {editing ? "Salvar alterações" : "Cadastrar"}
              </button>
              {editing && (
                <button type="button" className={btnGhost} onClick={() => setForm(EMPTY)}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </Card>

        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Cadastrados ({employees.length})</h2>
            <input
              aria-label="Buscar"
              className={inputCls + " max-w-xs"}
              placeholder="Buscar por nome, função, CPF, cidade ou cliente"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : filtered.length === 0 ? (
            <Empty>{employees.length === 0 ? "Nenhum funcionário cadastrado ainda." : "Nenhum resultado para a busca."}</Empty>
          ) : (
            <ul className="flex flex-col divide-y divide-border/70">
              {filtered.map((e) => (
                <li key={e.id} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                    <Avatar name={e.name} photo={e.photo} size={44} />
                    <div>
                      <p className="font-semibold">
                        {e.name} {e.contractType && <Badge tone="amber">{CONTRACT_LABEL[e.contractType] ?? e.contractType}</Badge>} {!e.active && <Badge tone="gray">Inativo</Badge>}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {e.role} · {e.city} · CPF {maskCPF(e.cpf)}
                        {e.phone ? ` · ${e.phone}` : ""}
                      </p>
                    </div>
                    </div>
                    <div className="flex gap-2">
                      <button aria-label={`Editar ${e.name}`} className={btnGhost} onClick={() => startEdit(e)}>
                        Editar
                      </button>
                      <button aria-label={`Excluir ${e.name}`} className={btnDanger} onClick={() => onRemove(e.id, e.name)}>
                        Excluir
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <ValidityBadge label="ASO" date={e.asoValidUntil} />
                    {e.integrations.map((i) => (
                      <ValidityBadge key={i.id} label={`Integração ${i.client}/${i.unit}`} date={i.validUntil} />
                    ))}
                    {e.nrs.map((n) => (
                      <ValidityBadge key={n.id} label={n.name} date={n.validUntil} />
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </Layout>
  );
}
