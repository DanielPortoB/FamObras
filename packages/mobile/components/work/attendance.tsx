import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { useColors } from "../../hooks/use-colors";
import { useWorkItemMutations } from "../../queries/work-items";
import { Button, Card, Chips, Empty, ErrorBox, Input, Label, Subtitle } from "../ui";
import { fmtDate, todayISO } from "../../lib/format";
import { PRESENCE_LABEL } from "../../lib/labels";
import type { WorkData } from "./types";

type Presence = "presente" | "falta" | "atraso";
const PRESENCE_OPTIONS = (Object.keys(PRESENCE_LABEL) as Presence[]).map((v) => ({ value: v, label: PRESENCE_LABEL[v] }));

export function AttendanceSection({ data }: { data: WorkData }) {
  const c = useColors();
  const m = useWorkItemMutations();
  const [date, setDate] = useState(todayISO());
  const [error, setError] = useState<unknown>(null);
  const [drafts, setDrafts] = useState<Record<number, { presence: Presence; entryTime: string }>>({});

  const dayRecords = useMemo(
    () => new Map(data.attendance.filter((a) => a.date === date).map((a) => [a.employeeId, a])),
    [data.attendance, date],
  );

  const draftOf = (employeeId: number) => {
    const saved = dayRecords.get(employeeId);
    return drafts[employeeId] ?? { presence: (saved?.presence as Presence) ?? "presente", entryTime: saved?.entryTime ?? "" };
  };

  const setDraft = (employeeId: number, patch: Partial<{ presence: Presence; entryTime: string }>) =>
    setDrafts((d) => ({ ...d, [employeeId]: { ...draftOf(employeeId), ...patch } }));

  const save = async (employeeId: number) => {
    setError(null);
    const d = draftOf(employeeId);
    try {
      await m.setAttendance.mutateAsync({
        workId: data.work.id,
        employeeId,
        date,
        presence: d.presence,
        entryTime: d.entryTime.trim() || null,
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

  return (
    <View style={{ gap: 16 }}>
      <Card>
        <Text style={{ color: c.foreground, fontWeight: "700", fontSize: 16 }}>Entradas e presença</Text>
        <Label>Dia (AAAA-MM-DD)</Label>
        <Input value={date} onChangeText={setDate} />
        <Subtitle>Registrando {fmtDate(date)}</Subtitle>
        <ErrorBox error={error} />
      </Card>

      {data.team.length === 0 && <Empty>Escale funcionários na aba Equipe primeiro.</Empty>}

      {data.team.map((t) => {
        const d = draftOf(t.id);
        const saved = dayRecords.get(t.id);
        return (
          <Card key={t.id}>
            <Text style={{ color: c.foreground, fontWeight: "700" }}>{t.name}</Text>
            <Chips options={PRESENCE_OPTIONS} value={d.presence} onChange={(v) => setDraft(t.id, { presence: v })} />
            <Label>Horário de entrada (HH:mm)</Label>
            <Input
              value={d.entryTime}
              onChangeText={(v) => setDraft(t.id, { entryTime: v })}
              placeholder="07:00"
              keyboardType="numbers-and-punctuation"
            />
            <Button label={saved ? "Atualizar" : "Salvar"} loading={m.setAttendance.isPending} onPress={() => save(t.id)} />
          </Card>
        );
      })}
    </View>
  );
}
