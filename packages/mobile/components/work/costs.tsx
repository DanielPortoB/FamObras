import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useColors } from "../../hooks/use-colors";
import { useWorkItemMutations } from "../../queries/work-items";
import { Button, Card, Chips, Empty, ErrorBox, Input, Label, Row, Stat, Subtitle } from "../ui";
import { brl, fmtDate, parseNum, todayISO } from "../../lib/format";
import { CATEGORIES, CATEGORY_LABEL, type Category } from "../../lib/labels";
import { isLocal } from "../../lib/local";
import type { WorkData } from "./types";

const CAT_OPTIONS = CATEGORIES.map((c) => ({ value: c.value as Category, label: c.label }));

export function CostsSection({ data }: { data: WorkData }) {
  const c = useColors();
  const m = useWorkItemMutations();
  const [date, setDate] = useState(todayISO());
  const [category, setCategory] = useState<Category>("viagem_carro");
  const [description, setDescription] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState("");
  const [error, setError] = useState<unknown>(null);
  const workId = data.work.id;
  const meta = CATEGORIES.find((x) => x.value === category)!;

  // Combustível: só funcionário local (mesma cidade da obra). Hospedagem: qualquer da equipe.
  const eligible =
    category === "combustivel"
      ? data.team.filter((t) => isLocal(t.city, data.work.city))
      : category === "hospedagem"
        ? data.team
        : [];

  const dayExpenses = data.expenses.filter((e) => e.date === date);
  const dayTotal = dayExpenses.reduce((s, e) => s + e.total, 0);
  const totalCost = data.expenses.reduce((s, e) => s + e.total, 0);
  const hours = data.expenses.filter((e) => e.category === "hora_trabalhada").reduce((s, e) => s + e.quantity, 0);

  const add = async () => {
    setError(null);
    try {
      await m.addExpense.mutateAsync({
        workId,
        date,
        category,
        description: description.trim() || null,
        employeeId: eligible.length && employeeId ? Number(employeeId) : null,
        quantity: parseNum(quantity),
        unitCost: parseNum(unitCost),
      });
      setDescription("");
      setUnitCost("");
      setQuantity("1");
    } catch (e) {
      setError(e);
    }
  };

  const remove = async (id: number) => {
    setError(null);
    try {
      await m.removeExpense.mutateAsync({ id });
    } catch (e) {
      setError(e);
    }
  };

  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        <Stat label={`Custos de ${fmtDate(date)}`} value={brl(dayTotal)} />
        <Stat label="Custo acumulado" value={brl(totalCost)} />
        <Stat label="Horas trabalhadas" value={`${hours.toLocaleString("pt-BR")} h`} />
      </View>

      <Card>
        <Text style={{ color: c.foreground, fontWeight: "700", fontSize: 16 }}>Lançar custo do dia</Text>
        <Label>Dia (AAAA-MM-DD)</Label>
        <Input value={date} onChangeText={setDate} />
        <Label>Categoria</Label>
        <Chips options={CAT_OPTIONS} value={category} onChange={(v) => { setCategory(v); setEmployeeId(""); }} />
        {(category === "combustivel" || category === "hospedagem") && (
          <>
            <Label>{category === "combustivel" ? "Funcionário local" : "Funcionário hospedado"}</Label>
            {eligible.length === 0 ? (
              <Subtitle>
                {category === "combustivel"
                  ? "Nenhum funcionário da equipe é da mesma cidade da obra. Combustível só para local."
                  : "Escale funcionários na aba Equipe."}
              </Subtitle>
            ) : (
              <Chips options={eligible.map((e) => ({ value: String(e.id), label: e.name }))} value={employeeId} onChange={setEmployeeId} />
            )}
          </>
        )}
        <Label>{meta.qty}</Label>
        <Input value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" />
        <Label>{meta.cost}</Label>
        <Input value={unitCost} onChangeText={setUnitCost} keyboardType="decimal-pad" />
        <Label>Descrição</Label>
        <Input value={description} onChangeText={setDescription} placeholder="Ex.: Caminhão até a obra" />
        <ErrorBox error={error} />
        <Button label="Lançar" loading={m.addExpense.isPending} onPress={add} />
      </Card>

      <Card>
        <Text style={{ color: c.foreground, fontWeight: "700", fontSize: 16 }}>Lançamentos de {fmtDate(date)}</Text>
        {dayExpenses.length === 0 && <Empty>Nada lançado neste dia.</Empty>}
        {dayExpenses.map((e) => (
          <Row key={e.id}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.foreground, fontWeight: "600" }}>{CATEGORY_LABEL[e.category] ?? e.category}</Text>
              <Subtitle>
                {e.quantity} × {brl(e.unitCost)} = {brl(e.total)}
                {e.description ? ` · ${e.description}` : ""}
              </Subtitle>
            </View>
            <Pressable accessibilityRole="button" onPress={() => remove(e.id)}>
              <Text style={{ color: c.destructive, fontWeight: "600" }}>Remover</Text>
            </Pressable>
          </Row>
        ))}
      </Card>
    </View>
  );
}
