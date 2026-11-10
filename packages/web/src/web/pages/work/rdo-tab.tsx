import { useState } from "react";
import { Badge, Card, Empty, ErrorBox, Field } from "../../components/ui-kit";
import { useRdoPhotos, useWorkItemMutations } from "../../queries/work-items";
import { btnDanger, btnGhost, btnPrimary, inputCls } from "../../lib/cls";
import { fmtDate, fmtHours, todayISO } from "../../lib/format";
import { resizeImage } from "../../lib/download";
import type { WorkData } from "./index";

const WEATHER = ["Ensolarado", "Parcialmente nublado", "Nublado", "Chuva fraca", "Chuva forte (parou a obra)", "Vento forte"];

type Rdo = WorkData["rdos"][number];

const REASONS = [
  "Chuva",
  "Aguardando liberação / PT",
  "Falta de material",
  "Falta de equipamento",
  "Aguardando cliente",
  "Retrabalho",
  "Deslocamento",
  "Integração / treinamento",
  "Quebra de equipamento",
];

type CrewForm = { employeeId: number | null; name: string; role: string; productive: string; unproductive: string; reason: string };
const hnum = (v: string) => Math.max(0, Number(v.replace(",", ".")) || 0);
const r1 = (n: number) => Math.round(n * 100) / 100;

/** Efetivo do dia: o que já foi salvo no RDO ou, se novo, a equipe da obra com as horas do ponto */
function initialCrew(data: WorkData, date: string, rdo?: Rdo): CrewForm[] {
  if (rdo && rdo.crew.length) {
    return rdo.crew.map((c) => ({
      employeeId: c.employeeId,
      name: c.name,
      role: c.role,
      productive: String(c.productiveHours),
      unproductive: c.unproductiveHours ? String(c.unproductiveHours) : "",
      reason: c.reason ?? "",
    }));
  }
  const rows: CrewForm[] = [];
  for (const t of data.team) {
    const att = data.attendance.find((a) => a.employeeId === t.id && a.date === date);
    if (att?.presence === "falta") continue;
    if (!att && t.terms.crewType === "reserva") continue;
    const hours = att ? (att.hoursWorked > 0 ? att.hoursWorked : 8) : 8;
    rows.push({ employeeId: t.id, name: t.name, role: t.role, productive: String(hours), unproductive: "", reason: "" });
  }
  return rows;
}

export function RdoTab({ data }: { data: WorkData }) {
  const m = useWorkItemMutations();
  const [date, setDate] = useState(todayISO());
  const current = data.rdos.find((r) => r.date === date);
  const [openId, setOpenId] = useState<number | null>(null);

  const onDelete = async (r: Rdo) => {
    if (!confirm(`Excluir o RDO de ${fmtDate(r.date)} e as fotos dele?`)) return;
    await m.removeRdo.mutateAsync({ id: r.id });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <Card>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">RDO · Relatório diário de obra</h2>
            <p className="text-sm text-muted-foreground">Atividades, clima, efetivo com horas produtivas e improdutivas, ocorrências e fotos do dia. Tudo entra no relatório final.</p>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Dia</span>
            <input aria-label="Dia do RDO" type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
        </div>
        <RdoForm key={`${date}-${current?.id ?? "novo"}`} data={data} date={date} rdo={current} />
      </Card>

      <Card className="h-fit">
        <h3 className="mb-3 text-lg font-bold">RDOs lançados ({data.rdos.length})</h3>
        {data.rdos.length === 0 ? (
          <Empty>Nenhum RDO ainda.</Empty>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {data.rdos.map((r) => (
              <li key={r.id} className="py-3">
                <div className="flex items-start justify-between gap-2">
                  <button className="text-left" onClick={() => setDate(r.date)}>
                    <p className="font-semibold">{fmtDate(r.date)}</p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{r.activities}</p>
                  </button>
                  <div className="flex shrink-0 gap-1">
                    <button className={btnGhost + " px-2 py-1 text-xs"} onClick={() => setOpenId(openId === r.id ? null : r.id)}>
                      Fotos
                    </button>
                    <button className={btnDanger + " px-2 py-1 text-xs"} onClick={() => onDelete(r)}>
                      Excluir
                    </button>
                  </div>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {r.weather && <Badge tone="gray">{r.weather}</Badge>}
                  {r.incidents && <Badge tone="amber">Com ocorrência</Badge>}
                  {r.crew.length > 0 && (
                    <Badge tone="green">
                      {r.crew.length} pess. · {fmtHours(r.crew.reduce((s, c) => s + c.productiveHours, 0))} prod.
                      {r.crew.some((c) => c.unproductiveHours) ? ` · ${fmtHours(r.crew.reduce((s, c) => s + c.unproductiveHours, 0))} improd.` : ""}
                    </Badge>
                  )}
                </div>
                {openId === r.id && <PhotoGrid rdoId={r.id} readOnly />}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function RdoForm({ data, date, rdo }: { data: WorkData; date: string; rdo?: Rdo }) {
  const m = useWorkItemMutations();
  const [weather, setWeather] = useState(rdo?.weather ?? "");
  const [activities, setActivities] = useState(rdo?.activities ?? "");
  const [incidents, setIncidents] = useState(rdo?.incidents ?? "");
  const [notes, setNotes] = useState(rdo?.notes ?? "");
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);
  const [crew, setCrew] = useState<CrewForm[]>(() => initialCrew(data, date, rdo));
  const [addId, setAddId] = useState("");
  const missing = data.team.filter((t) => !crew.some((c) => c.employeeId === t.id));
  const prodTotal = crew.reduce((s, c) => s + hnum(c.productive), 0);
  const unprodTotal = crew.reduce((s, c) => s + hnum(c.unproductive), 0);
  const rate = prodTotal + unprodTotal ? Math.round((prodTotal / (prodTotal + unprodTotal)) * 100) : 0;
  const setRow = (i: number, patch: Partial<CrewForm>) => setCrew(crew.map((c, k) => (k === i ? { ...c, ...patch } : c)));
  const addFromTeam = (id: string) => {
    const t = data.team.find((x) => String(x.id) === id);
    if (!t) return;
    const att = data.attendance.find((a) => a.employeeId === t.id && a.date === date);
    setCrew([...crew, { employeeId: t.id, name: t.name, role: t.role, productive: String(att?.hoursWorked || 8), unproductive: "", reason: "" }]);
    setAddId("");
  };

  const day = data.attendance.filter((a) => a.date === date);
  const present = day.filter((a) => a.presence !== "falta").length;
  const hours = day.reduce((s, a) => s + a.hoursWorked, 0);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    try {
      await m.saveRdo.mutateAsync({
        workId: data.work.id,
        date,
        weather: weather || null,
        activities: activities.trim(),
        incidents: incidents.trim() || null,
        notes: notes.trim() || null,
        crew: crew
          .filter((c) => c.name.trim() && c.role.trim())
          .map((c) => ({
            employeeId: c.employeeId,
            name: c.name.trim(),
            role: c.role.trim(),
            productiveHours: r1(hnum(c.productive)),
            unproductiveHours: r1(hnum(c.unproductive)),
            reason: c.reason.trim() || null,
          })),
      });
      setSaved(true);
    } catch (err) {
      setError(err);
    }
  };

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-4 rounded-xl bg-muted/50 px-4 py-3 text-sm">
        <span>
          Efetivo no ponto: <b>{present}</b> de {data.team.length}
        </span>
        <span>
          Horas no dia: <b>{fmtHours(hours)}</b>
        </span>
      </div>
      <Field label="Clima">
        <div className="flex flex-wrap gap-2">
          {WEATHER.map((w) => (
            <button key={w} type="button" className={weather === w ? btnPrimary : btnGhost} onClick={() => setWeather(weather === w ? "" : w)}>
              {w}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Atividades executadas">
        <textarea
          aria-label="Atividades executadas"
          className={inputCls + " min-h-28"}
          required
          minLength={3}
          placeholder="Ex: montagem das terças do eixo A, solda das bases, içamento de 3 vigas"
          value={activities}
          onChange={(e) => setActivities(e.target.value)}
        />
      </Field>
      <div className="rounded-xl border border-border p-3">
        <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-sm font-bold">Efetivo e horas do dia</p>
            <p className="text-xs text-muted-foreground">Equipe da obra já carregada com as horas do ponto. Separe as horas improdutivas e o motivo.</p>
          </div>
          <div className="flex flex-wrap gap-1.5 text-xs">
            <Badge tone="green">Produtivas {fmtHours(prodTotal)}</Badge>
            <Badge tone={unprodTotal ? "amber" : "gray"}>Improdutivas {fmtHours(unprodTotal)}</Badge>
            <Badge tone="gray">{rate}% produtivo</Badge>
          </div>
        </div>
        <datalist id="rdo-reasons">
          {REASONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </datalist>
        {crew.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">Ninguém no efetivo. Escale a equipe na aba Equipe ou adicione abaixo.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-2 pr-2">Funcionário</th>
                  <th className="py-2 pr-2">Função</th>
                  <th className="w-24 py-2 pr-2">Produtivas (h)</th>
                  <th className="w-24 py-2 pr-2">Improdutivas (h)</th>
                  <th className="py-2 pr-2">Motivo improdutivo</th>
                  <th className="w-8 py-2"><span className="sr-only">Remover</span></th>
                </tr>
              </thead>
              <tbody>
                {crew.map((c, i) => (
                  <tr key={i} className="border-b border-border/60 last:border-0">
                    <td className="py-1.5 pr-2">
                      {c.employeeId ? (
                        <span className="font-medium">{c.name}</span>
                      ) : (
                        <input aria-label="Nome" className={inputCls + " py-1.5"} placeholder="Nome" value={c.name} onChange={(e) => setRow(i, { name: e.target.value })} />
                      )}
                    </td>
                    <td className="py-1.5 pr-2">
                      <input aria-label={`Função de ${c.name || "pessoa"}`} className={inputCls + " py-1.5"} value={c.role} onChange={(e) => setRow(i, { role: e.target.value })} />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input aria-label={`Horas produtivas de ${c.name || "pessoa"}`} className={inputCls + " py-1.5"} inputMode="decimal" value={c.productive} onChange={(e) => setRow(i, { productive: e.target.value })} />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input aria-label={`Horas improdutivas de ${c.name || "pessoa"}`} className={inputCls + " py-1.5"} inputMode="decimal" placeholder="0" value={c.unproductive} onChange={(e) => setRow(i, { unproductive: e.target.value })} />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        aria-label={`Motivo improdutivo de ${c.name || "pessoa"}`}
                        list="rdo-reasons"
                        className={inputCls + " py-1.5"}
                        placeholder={hnum(c.unproductive) ? "Escolha ou digite" : "-"}
                        disabled={!hnum(c.unproductive)}
                        value={c.reason}
                        onChange={(e) => setRow(i, { reason: e.target.value })}
                      />
                    </td>
                    <td className="py-1.5 text-right">
                      <button type="button" aria-label={`Tirar ${c.name || "pessoa"} do RDO`} className="px-1 text-lg leading-none text-destructive" onClick={() => setCrew(crew.filter((_, k) => k !== i))}>
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-2 flex flex-wrap gap-2">
          {missing.length > 0 && (
            <select aria-label="Adicionar da equipe" className={inputCls + " w-auto py-1.5 text-xs"} value={addId} onChange={(e) => addFromTeam(e.target.value)}>
              <option value="">+ Adicionar da equipe</option>
              {missing.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} · {t.role}
                </option>
              ))}
            </select>
          )}
          <button type="button" className={btnGhost + " px-2 py-1 text-xs"} onClick={() => setCrew([...crew, { employeeId: null, name: "", role: "", productive: "8", unproductive: "", reason: "" }])}>
            + Pessoa de fora da equipe
          </button>
        </div>
      </div>
      <Field label="Ocorrências / problemas">
        <textarea
          aria-label="Ocorrências"
          className={inputCls + " min-h-20"}
          placeholder="Ex: chuva parou 2 h, falta de material, acidente, liberação atrasada"
          value={incidents}
          onChange={(e) => setIncidents(e.target.value)}
        />
      </Field>
      <Field label="Observações">
        <textarea aria-label="Observações" className={inputCls + " min-h-16"} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <ErrorBox error={error} />
      <div className="flex items-center gap-3">
        <button className={btnPrimary} disabled={m.saveRdo.isPending}>
          {rdo ? "Atualizar RDO" : "Salvar RDO"}
        </button>
        {saved && <span className="text-sm font-medium text-primary">RDO salvo.</span>}
      </div>

      <div className="border-t border-border pt-4">
        <p className="mb-2 text-sm font-bold">Fotos do dia</p>
        {rdo ? <PhotoGrid rdoId={rdo.id} /> : <p className="text-sm text-muted-foreground">Salve o RDO do dia para adicionar fotos.</p>}
      </div>
    </form>
  );
}

function PhotoGrid({ rdoId, readOnly }: { rdoId: number; readOnly?: boolean }) {
  const { data: photos = [], isLoading } = useRdoPhotos(rdoId);
  const m = useWorkItemMutations();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const upload = async (list: FileList | null) => {
    if (!list?.length) return;
    setError(null);
    setBusy(true);
    try {
      for (const file of Array.from(list)) {
        const dataUrl = await resizeImage(file);
        await m.addRdoPhoto.mutateAsync({ rdoId, dataUrl, caption: null });
      }
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-2 flex flex-col gap-2">
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Carregando fotos...</p>
      ) : photos.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sem fotos.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p) => (
            <div key={p.id} className="group relative overflow-hidden rounded-lg border border-border">
              <a href={p.dataUrl} target="_blank" rel="noreferrer">
                <img src={p.dataUrl} alt="Foto do RDO" className="aspect-square w-full object-cover" />
              </a>
              {!readOnly && (
                <button
                  type="button"
                  className="absolute right-1 top-1 rounded bg-white/90 px-1.5 text-xs font-bold text-destructive"
                  onClick={() => confirm("Excluir esta foto?") && m.removeRdoPhoto.mutate({ id: p.id })}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {!readOnly && (
        <label className={btnGhost + " w-fit cursor-pointer"}>
          {busy ? "Enviando..." : "Adicionar fotos"}
          <input aria-label="Adicionar fotos" type="file" accept="image/*" multiple className="hidden" disabled={busy} onChange={(e) => upload(e.target.files)} />
        </label>
      )}
      <ErrorBox error={error} />
    </div>
  );
}
