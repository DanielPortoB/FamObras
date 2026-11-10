import { useState } from "react";
import { Badge, Card, Empty, ErrorBox } from "../../components/ui-kit";
import { useWorkItemMutations } from "../../queries/work-items";
import { btnDanger, btnGhost, btnPrimary, inputCls } from "../../lib/cls";
import { brl, fmtDate, fmtHours, todayISO } from "../../lib/format";
import { PRESENCE_LABEL } from "../../lib/labels";
import type { WorkData } from "./index";

type Presence = "presente" | "falta" | "atraso";
type Record_ = WorkData["attendance"][number];

/** Mesma conta do servidor: saída - entrada - intervalo */
function calcHours(entry: string, exit: string, brk: number) {
  if (!entry || !exit) return 0;
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  let diff = toMin(exit) - toMin(entry);
  if (diff < 0) diff += 24 * 60;
  return Math.max(0, Math.round((diff / 60 - brk) * 100) / 100);
}

const presenceTone = (p: string) => (p === "presente" ? "green" : p === "falta" ? "red" : "amber");

export function AttendanceTab({ data }: { data: WorkData }) {
  const [date, setDate] = useState(todayISO());
  const [editing, setEditing] = useState<Record_ | null>(null);
  const m = useWorkItemMutations();
  const dayRecords = data.attendance.filter((a) => a.date === date);
  const dayCost = dayRecords.reduce((s, a) => s + (a.cost?.total ?? 0), 0);
  const dayHours = dayRecords.reduce((s, a) => s + a.hoursWorked, 0);
  const totalCost = data.attendance.reduce((s, a) => s + (a.cost?.total ?? 0), 0);
  const totalHours = data.attendance.reduce((s, a) => s + a.hoursWorked, 0);
  const isSunday = new Date(`${date}T12:00:00`).getDay() === 0;

  const onDelete = async (a: Record_) => {
    const emp = data.team.find((t) => t.id === a.employeeId);
    if (!confirm(`Excluir o registro de ${emp?.name ?? "funcionário"} em ${fmtDate(a.date)}?`)) return;
    await m.removeAttendance.mutateAsync({ id: a.id });
    if (editing?.id === a.id) setEditing(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">Registro de ponto</h2>
            <p className="text-sm text-muted-foreground">
              Entrada, saída e intervalo. As horas e o custo CLT do dia vão direto para o financeiro da obra.
            </p>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Dia</span>
            <input aria-label="Dia" type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
        </div>
        {isSunday && <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">Domingo: todas as horas são pagas a 100%.</p>}

        {data.team.length === 0 ? (
          <Empty>Escale funcionários na aba Equipe primeiro.</Empty>
        ) : (
          <>
            <div className="hidden grid-cols-[1.2fr_120px_118px_118px_90px_70px_auto] gap-3 border-b border-border pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:grid">
              <span>Funcionário</span>
              <span>Presença</span>
              <span>Entrada</span>
              <span>Saída</span>
              <span>Intervalo (h)</span>
              <span>Horas</span>
              <span />
            </div>
            <div className="flex flex-col divide-y divide-border">
              {data.team.map((emp) => (
                <PunchRow
                  key={`${emp.id}-${date}-${dayRecords.find((r) => r.employeeId === emp.id)?.id ?? "novo"}`}
                  workId={data.work.id}
                  employee={emp}
                  date={date}
                  record={dayRecords.find((r) => r.employeeId === emp.id)}
                />
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-6 rounded-xl bg-muted/50 px-4 py-3 text-sm">
              <span>
                Horas do dia: <b>{fmtHours(dayHours)}</b>
              </span>
              <span>
                Custo CLT do dia: <b>{brl(dayCost)}</b>
              </span>
            </div>
          </>
        )}
      </Card>

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-bold">Histórico de ponto</h3>
          <p className="text-sm text-muted-foreground">
            Total: <b className="text-foreground">{fmtHours(totalHours)}</b> · <b className="text-foreground">{brl(totalCost)}</b>
          </p>
        </div>
        {editing && (
          <div className="mb-4 rounded-xl border border-primary/30 bg-emerald-50/50 p-3">
            <p className="mb-2 text-sm font-semibold">
              Editando {data.team.find((t) => t.id === editing.employeeId)?.name} · {fmtDate(editing.date)}
            </p>
            <PunchRow
              key={`edit-${editing.id}-${editing.hoursWorked}-${editing.presence}`}
              workId={data.work.id}
              employee={data.team.find((t) => t.id === editing.employeeId)!}
              date={editing.date}
              record={editing}
              onDone={() => setEditing(null)}
            />
          </div>
        )}
        {data.attendance.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum registro ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-2 pr-3">Data</th>
                  <th className="py-2 pr-3">Funcionário</th>
                  <th className="py-2 pr-3">Presença</th>
                  <th className="py-2 pr-3">Entrada</th>
                  <th className="py-2 pr-3">Saída</th>
                  <th className="py-2 pr-3">Intervalo</th>
                  <th className="py-2 pr-3">Horas</th>
                  <th className="py-2 pr-3">Custo</th>
                  <th className="py-2 pr-3">Obs.</th>
                  <th className="py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {data.attendance.map((a) => {
                  const emp = data.team.find((t) => t.id === a.employeeId);
                  return (
                    <tr key={a.id} className="border-b border-border/60 last:border-0">
                      <td className="py-2 pr-3 whitespace-nowrap">{fmtDate(a.date)}</td>
                      <td className="py-2 pr-3">{emp?.name ?? "(removido)"}</td>
                      <td className="py-2 pr-3">
                        <Badge tone={presenceTone(a.presence)}>{PRESENCE_LABEL[a.presence]}</Badge>
                      </td>
                      <td className="py-2 pr-3">{a.entryTime || "-"}</td>
                      <td className="py-2 pr-3">{a.exitTime || "-"}</td>
                      <td className="py-2 pr-3">{a.breakHours ? fmtHours(a.breakHours) : "-"}</td>
                      <td className="py-2 pr-3 font-medium">{fmtHours(a.hoursWorked)}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">{a.cost ? brl(a.cost.total) : "-"}</td>
                      <td className="py-2 pr-3">{a.note || "-"}</td>
                      <td className="py-2 text-right" aria-label="Ações">
                        <div className="flex justify-end gap-2">
                          <button aria-label="Editar registro" className={btnGhost + " px-2 py-1 text-xs"} disabled={!emp} onClick={() => setEditing(a)}>
                            Editar
                          </button>
                          <button className={btnDanger + " px-2 py-1 text-xs"} onClick={() => onDelete(a)}>
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-4 text-xs text-muted-foreground">
          Custo do dia = horas × (salário ÷ 220) com adicional, hora extra 50% acima de 8 h, domingo 100%, + encargos (INSS 20%, FGTS 8%, 13º e férias 19,44%) . Dia sem horário conta 8 h. Ajuda de custo, combustível e VT são mensais e entram no financeiro rateados pelos dias corridos na obra.
        </p>
      </Card>
    </div>
  );
}

function PunchRow({
  workId,
  employee,
  date,
  record,
  onDone,
}: {
  workId: number;
  employee: WorkData["team"][number];
  date: string;
  record?: Record_;
  onDone?: () => void;
}) {
  const m = useWorkItemMutations();
  const [presence, setPresence] = useState<Presence>((record?.presence as Presence) ?? "presente");
  const [entry, setEntry] = useState(record?.entryTime ?? "07:00");
  const [exit, setExit] = useState(record?.exitTime ?? "17:00");
  const [brk, setBrk] = useState(record ? String(record.breakHours) : "1");
  const [note, setNote] = useState(record?.note ?? "");
  const [error, setError] = useState<unknown>(null);
  const brkNum = Number(brk.replace(",", ".")) || 0;
  const hours = presence === "falta" ? 0 : calcHours(entry, exit, brkNum);

  const save = async () => {
    setError(null);
    try {
      await m.setAttendance.mutateAsync({
        workId,
        employeeId: employee.id,
        date,
        presence,
        entryTime: presence === "falta" ? null : entry || null,
        exitTime: presence === "falta" ? null : exit || null,
        breakHours: presence === "falta" ? 0 : brkNum,
        note: note || null,
      });
      onDone?.();
    } catch (e) {
      setError(e);
    }
  };

  return (
    <div className="grid items-center gap-2 py-3 md:grid-cols-[1.2fr_120px_118px_118px_90px_70px_auto] md:gap-3">
      <div>
        <p className="font-medium">
          {employee.name} {employee.terms.crewType === "reserva" && <Badge tone="gray">Reserva</Badge>}
        </p>
        <p className="text-xs text-muted-foreground">{employee.role}</p>
      </div>
      <select aria-label="Presença" className={inputCls} value={presence} onChange={(e) => setPresence(e.target.value as Presence)}>
        <option value="presente">Presente</option>
        <option value="atraso">Atraso</option>
        <option value="falta">Falta</option>
      </select>
      <input aria-label="Entrada" type="time" className={inputCls} disabled={presence === "falta"} value={entry} onChange={(e) => setEntry(e.target.value)} />
      <input aria-label="Saída" type="time" className={inputCls} disabled={presence === "falta"} value={exit} onChange={(e) => setExit(e.target.value)} />
      <input aria-label="Intervalo em horas" className={inputCls} inputMode="decimal" disabled={presence === "falta"} value={brk} onChange={(e) => setBrk(e.target.value)} />
      <span className="text-sm font-semibold tabular-nums">{fmtHours(hours)}</span>
      <div className="flex gap-2">
        <button className={record ? btnGhost : btnPrimary} onClick={save} disabled={m.setAttendance.isPending}>
          {record ? "Atualizar" : "Salvar"}
        </button>
        {onDone && (
          <button className={btnGhost} onClick={onDone}>
            Cancelar
          </button>
        )}
      </div>
      <input aria-label="Observação" className={inputCls + " md:col-span-7"} placeholder="Observação (opcional)" value={note} onChange={(e) => setNote(e.target.value)} />
      {record && <p className="text-xs text-muted-foreground md:col-span-7">Lançado: {fmtHours(record.hoursWorked)}{record.cost ? ` · custo ${brl(record.cost.total)}` : ""}</p>}
      <div className="md:col-span-7">
        <ErrorBox error={error} />
      </div>
    </div>
  );
}
