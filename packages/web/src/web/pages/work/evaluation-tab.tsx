import { useState } from "react";
import { Badge, Card, Empty, ErrorBox } from "../../components/ui-kit";
import { useWorkItemMutations } from "../../queries/work-items";
import { btnPrimary, inputCls } from "../../lib/cls";
import type { WorkData } from "./index";

export function EvaluationTab({ data }: { data: WorkData }) {
  if (data.team.length === 0) return <Card><Empty>Escale funcionários na aba Equipe para avaliá-los.</Empty></Card>;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Avalie cada funcionário ao fim da obra, de 0 a 10: produtividade, assiduidade e relacionamento. A nota final é a média das três.
      </p>
      {data.team.map((emp) => (
        <EvaluationCard key={emp.id} data={data} employee={emp} />
      ))}
    </div>
  );
}

function EvaluationCard({ data, employee }: { data: WorkData; employee: WorkData["team"][number] }) {
  const m = useWorkItemMutations();
  const ev = data.evaluations.find((e) => e.employeeId === employee.id);
  const [scores, setScores] = useState({
    productivity: String(ev?.productivity ?? ""),
    assiduity: String(ev?.assiduity ?? ""),
    relationship: String(ev?.relationship ?? ""),
  });
  const [comment, setComment] = useState(ev?.comment ?? "");
  const [error, setError] = useState<unknown>(null);

  const vals = [scores.productivity, scores.assiduity, scores.relationship].map(Number);
  const complete = Object.values(scores).every((v) => v !== "");
  const preview = complete ? Math.round((vals.reduce((a, b) => a + b, 0) / 3) * 10) / 10 : null;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await m.saveEvaluation.mutateAsync({
        workId: data.work.id,
        employeeId: employee.id,
        productivity: Number(scores.productivity),
        assiduity: Number(scores.assiduity),
        relationship: Number(scores.relationship),
        comment: comment.trim() || null,
      });
    } catch (err) {
      setError(err);
    }
  };

  const fields: { key: keyof typeof scores; label: string }[] = [
    { key: "productivity", label: "Produtividade" },
    { key: "assiduity", label: "Assiduidade" },
    { key: "relationship", label: "Relacionamento" },
  ];

  return (
    <Card>
      <form onSubmit={save} className="grid gap-4 lg:grid-cols-[220px_1fr_auto] lg:items-start">
        <div>
          <p className="font-semibold">{employee.name}</p>
          <p className="text-xs text-muted-foreground">{employee.role}</p>
          <div className="mt-2">
            {ev ? <Badge>Média {Number(ev.average).toLocaleString("pt-BR")}</Badge> : <Badge tone="amber">Pendente</Badge>}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {fields.map((fd) => (
            <label key={fd.key} className="flex flex-col gap-1 text-sm">
              <span className="font-medium">{fd.label} (0 a 10)</span>
              <input aria-label={fd.label}
                type="number"
                min={0}
                max={10}
                step={1}
                required
                className={inputCls}
                value={scores[fd.key]}
                onChange={(e) => setScores({ ...scores, [fd.key]: e.target.value })}
              />
            </label>
          ))}
          <label className="flex flex-col gap-1 text-sm sm:col-span-3">
            <span className="font-medium">Comentário</span>
            <input aria-label="Comentário" className={inputCls} value={comment} onChange={(e) => setComment(e.target.value)} />
          </label>
          <div className="text-sm text-muted-foreground sm:col-span-3">
            Nota final: <span className="font-semibold text-foreground">{preview ?? "-"}</span>
          </div>
          <div className="sm:col-span-3"><ErrorBox error={error} /></div>
        </div>
        <button className={btnPrimary} disabled={m.saveEvaluation.isPending}>Salvar avaliação</button>
      </form>
    </Card>
  );
}
