import { useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import { useColors } from "../../hooks/use-colors";
import { useWorkItemMutations } from "../../queries/work-items";
import { Button, Card, Empty, ErrorBox, Input, Label, Row, Subtitle } from "../ui";
import type { WorkData } from "./types";

const EMPTY = { name: "", unit: "UNIDADE", quantity: "1" };

export function ToolsSection({ data }: { data: WorkData }) {
  const c = useColors();
  const m = useWorkItemMutations();
  const [f, setF] = useState(EMPTY);
  const [error, setError] = useState<unknown>(null);
  const workId = data.work.id;

  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e);
    }
  };

  const add = () =>
    run(async () => {
      await m.addTool.mutateAsync({ workId, name: f.name.trim(), unit: f.unit.trim() || "UNIDADE", quantity: Number(f.quantity) || 0 });
      setF(EMPTY);
    });

  return (
    <View style={{ gap: 16 }}>
      <Card>
        <Text style={{ color: c.foreground, fontWeight: "700", fontSize: 16 }}>Lista de ferramentas</Text>
        <Subtitle>Marque "atendido" quando a ferramenta estiver separada.</Subtitle>
        <ErrorBox error={error} />
        {data.tools.length === 0 && <Empty>Nenhuma ferramenta na lista.</Empty>}
        {data.tools.map((t) => (
          <View key={t.id} style={{ gap: 8, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 10 }}>
            <Text style={{ color: c.foreground, fontWeight: "600" }}>{t.name}</Text>
            <Subtitle>
              {t.unit} · qtd {t.quantity}
            </Subtitle>
            <Row>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Switch
                  value={t.attended}
                  trackColor={{ true: c.primary }}
                  onValueChange={(v) =>
                    run(() => m.updateTool.mutateAsync({ id: t.id, name: t.name, unit: t.unit, quantity: t.quantity, attended: v }))
                  }
                />
                <Text style={{ color: c.mutedForeground }}>{t.attended ? "Atendido" : "Pendente"}</Text>
              </View>
              <Pressable accessibilityRole="button" onPress={() => run(() => m.removeTool.mutateAsync({ id: t.id }))}>
                <Text style={{ color: c.destructive, fontWeight: "600" }}>Remover</Text>
              </Pressable>
            </Row>
          </View>
        ))}
      </Card>

      <Card>
        <Text style={{ color: c.foreground, fontWeight: "700" }}>Adicionar ferramenta</Text>
        <Label>Nome</Label>
        <Input value={f.name} onChangeText={(v) => setF({ ...f, name: v })} placeholder="Ex.: Esmerilhadeira" />
        <Label>Unidade</Label>
        <Input value={f.unit} onChangeText={(v) => setF({ ...f, unit: v })} />
        <Label>Quantidade</Label>
        <Input value={f.quantity} onChangeText={(v) => setF({ ...f, quantity: v })} keyboardType="number-pad" />
        <Button label="Adicionar" disabled={f.name.trim().length < 2} loading={m.addTool.isPending} onPress={add} />
      </Card>
    </View>
  );
}
