import { useState } from "react";
import { Alert, Text, View } from "react-native";
import { useColors } from "../../hooks/use-colors";
import { useEmployees } from "../../queries/employees";
import { useWorkItemMutations } from "../../queries/work-items";
import { Button, Card, Chips, Empty, ErrorBox, Row, Subtitle } from "../ui";
import { isLocal } from "../../lib/local";
import type { WorkData } from "./types";

export function TeamSection({ data }: { data: WorkData }) {
  const c = useColors();
  const m = useWorkItemMutations();
  const { data: employees } = useEmployees();
  const [error, setError] = useState<unknown>(null);
  const workId = data.work.id;
  const inTeam = new Set(data.team.map((t) => t.id));
  const available = (employees ?? []).filter((e) => e.active && !inTeam.has(e.id));
  const [pick, setPick] = useState<string>("");

  const add = async (employeeId: number) => {
    setError(null);
    try {
      await m.addEmployee.mutateAsync({ workId, employeeId });
      setPick("");
    } catch (e) {
      setError(e);
    }
  };

  const remove = (employeeId: number, name: string) => {
    Alert.alert("Remover da obra", `Remover ${name} da escala?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: async () => {
          try {
            await m.removeEmployee.mutateAsync({ workId, employeeId });
          } catch (e) {
            setError(e);
          }
        },
      },
    ]);
  };

  return (
    <View style={{ gap: 16 }}>
      <Card>
        <Text style={{ color: c.foreground, fontWeight: "700", fontSize: 16 }}>Equipe escalada ({data.team.length})</Text>
        <ErrorBox error={error} />
        {data.team.length === 0 && <Empty>Ninguém escalado ainda.</Empty>}
        {data.team.map((t) => (
          <Row key={t.id}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.foreground, fontWeight: "600" }}>{t.name}</Text>
              <Subtitle>
                {t.role} · {t.city} {isLocal(t.city, data.work.city) ? "· local" : ""}
              </Subtitle>
            </View>
            <Button label="Remover" variant="ghost" onPress={() => remove(t.id, t.name)} />
          </Row>
        ))}
      </Card>

      <Card>
        <Text style={{ color: c.foreground, fontWeight: "700", fontSize: 16 }}>Adicionar à escala</Text>
        {available.length === 0 && <Subtitle>Não há funcionários ativos disponíveis. Cadastre na aba Funcionários.</Subtitle>}
        <Chips
          options={available.map((e) => ({ value: String(e.id), label: e.name }))}
          value={pick}
          onChange={(v) => setPick(v)}
        />
        <Button label="Adicionar" disabled={!pick} loading={m.addEmployee.isPending} onPress={() => add(Number(pick))} />
      </Card>
    </View>
  );
}
