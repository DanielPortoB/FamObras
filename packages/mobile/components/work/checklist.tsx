import { useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import { useColors } from "../../hooks/use-colors";
import { useWorkItemMutations } from "../../queries/work-items";
import { Button, Card, Chips, Empty, ErrorBox, Input, Label, Row } from "../ui";
import { CHECKLIST_CATEGORIES } from "../../lib/labels";
import type { WorkData } from "./types";

const CATS = Object.entries(CHECKLIST_CATEGORIES).map(([value, label]) => ({ value, label }));

export function ChecklistSection({ data }: { data: WorkData }) {
  const c = useColors();
  const m = useWorkItemMutations();
  const [category, setCategory] = useState("hospedagem");
  const [description, setDescription] = useState("");
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
      await m.addChecklistItem.mutateAsync({ workId, category, description: description.trim() });
      setDescription("");
    });

  return (
    <View style={{ gap: 16 }}>
      {CATS.map((cat) => {
        const items = data.checklist.filter((i) => i.category === cat.value);
        return (
          <Card key={cat.value}>
            <Text style={{ color: c.foreground, fontWeight: "700", fontSize: 16 }}>{cat.label}</Text>
            {items.length === 0 && <Text style={{ color: c.mutedForeground }}>Nenhum item.</Text>}
            {items.map((i) => (
              <Row key={i.id}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                  <Switch
                    value={i.done}
                    trackColor={{ true: c.primary }}
                    onValueChange={(v) => run(() => m.toggleChecklistItem.mutateAsync({ id: i.id, done: v }))}
                  />
                  <Text style={{ color: i.done ? c.mutedForeground : c.foreground, flex: 1, textDecorationLine: i.done ? "line-through" : "none" }}>
                    {i.description}
                  </Text>
                </View>
                <Pressable accessibilityRole="button" onPress={() => run(() => m.removeChecklistItem.mutateAsync({ id: i.id }))}>
                  <Text style={{ color: c.destructive, fontWeight: "600" }}>Remover</Text>
                </Pressable>
              </Row>
            ))}
          </Card>
        );
      })}

      <Card>
        <Text style={{ color: c.foreground, fontWeight: "700" }}>Novo item</Text>
        <Chips options={CATS} value={category} onChange={setCategory} />
        <Label>Descrição</Label>
        <Input value={description} onChangeText={setDescription} placeholder="Ex.: Reservar 4 quartos" />
        <ErrorBox error={error} />
        <Button label="Adicionar item" disabled={description.trim().length < 2} loading={m.addChecklistItem.isPending} onPress={add} />
      </Card>
      {data.checklist.length === 0 && <Empty>Checklist vazio.</Empty>}
    </View>
  );
}
