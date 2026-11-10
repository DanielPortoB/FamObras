import { useState } from "react";
import { Text, View } from "react-native";
import { useColors } from "../../hooks/use-colors";
import { useWorkItemMutations } from "../../queries/work-items";
import { Button, Card, Empty, ErrorBox, Input, Label, Subtitle } from "../ui";
import type { WorkData } from "./types";

type Draft = { productivity: string; assiduity: string; relationship: string; comment: string };

const clamp = (v: string) => String(Math.min(10, Math.max(0, Math.round(Number(v) || 0))));

export function EvaluationSection({ data }: { data: WorkData }) {
  const c = useColors();
  const m = useWorkItemMutations();
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const [error, setError] = useState<unknown>(null);

  const draftOf = (employeeId: number): Draft => {
    if (drafts[employeeId]) return drafts[employeeId];
    const ev = data.evaluations.find((e) => e.employeeId === employeeId);
    return {
      productivity: ev ? String(ev.productivity) : "",
      assiduity: ev ? String(ev.assiduity) : "",
      relationship: ev ? String(ev.relationship) : "",
      comment: ev?.comment ?? "",
    };
  };

  const setDraft = (employeeId: number, patch: Partial<Draft>) =>
    setDrafts((d) => ({ ...d, [employeeId]: { ...draftOf(employeeId), ...patch } }));

  const save = async (employeeId: number) => {
    setError(null);
    const d = draftOf(employeeId);
    try {
      await m.saveEvaluation.mutateAsync({
        workId: data.work.id,
        employeeId,
        productivity: Number(clamp(d.productivity)),
        assiduity: Number(clamp(d.assiduity)),
        relationship: Number(clamp(d.relationship)),
        comment: d.comment.trim() || null,
      });
      setDrafts((all) => {
        const copy = { ...all };
        delete copy[employeeId];
        return copy;
      });
    } catch (e) {
      setError(e);
    }
  };

  if (data.team.length === 0) return <Empty>Escale a equipe antes de avaliar.</Empty>;

  return (
    <View style={{ gap: 16 }}>
      <Subtitle>Notas de 0 a 10. A nota final é a média das três.</Subtitle>
      <ErrorBox error={error} />
      {data.team.map((t) => {
        const d = draftOf(t.id);
        const saved = data.evaluations.find((e) => e.employeeId === t.id);
        return (
          <Card key={t.id}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: c.foreground, fontWeight: "700", fontSize: 16 }}>{t.name}</Text>
              {saved && <Text style={{ color: c.primary, fontWeight: "700" }}>Nota {saved.average.toFixed(1)}</Text>}
            </View>
            <Label>Produtividade (0 a 10)</Label>
            <Input value={d.productivity} onChangeText={(v) => setDraft(t.id, { productivity: v })} keyboardType="number-pad" />
            <Label>Assiduidade (0 a 10)</Label>
            <Input value={d.assiduity} onChangeText={(v) => setDraft(t.id, { assiduity: v })} keyboardType="number-pad" />
            <Label>Relacionamento (0 a 10)</Label>
            <Input value={d.relationship} onChangeText={(v) => setDraft(t.id, { relationship: v })} keyboardType="number-pad" />
            <Label>Comentário</Label>
            <Input value={d.comment} onChangeText={(v) => setDraft(t.id, { comment: v })} multiline />
            <Button
              label={saved ? "Atualizar avaliação" : "Salvar avaliação"}
              disabled={!d.productivity || !d.assiduity || !d.relationship}
              loading={m.saveEvaluation.isPending}
              onPress={() => save(t.id)}
            />
          </Card>
        );
      })}
    </View>
  );
}
