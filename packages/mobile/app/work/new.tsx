import { useState } from "react";
import { router, Stack } from "expo-router";
import { Screen } from "../../components/screen";
import { Button, Card, ErrorBox, Input, Label } from "../../components/ui";
import { useWorkMutations } from "../../queries/works";
import { parseNum, todayISO } from "../../lib/format";

const EMPTY = {
  name: "",
  city: "",
  client: "",
  responsible: "",
  startDate: todayISO(),
  endDate: todayISO(),
  contractValue: "",
};

export default function NovaObraScreen() {
  const { create } = useWorkMutations();
  const [f, setF] = useState(EMPTY);
  const [error, setError] = useState<unknown>(null);

  const save = async () => {
    setError(null);
    try {
      const work = await create.mutateAsync({
        name: f.name.trim(),
        city: f.city.trim(),
        client: f.client.trim() || null,
        responsible: f.responsible.trim() || null,
        startDate: f.startDate,
        endDate: f.endDate,
        contractValue: parseNum(f.contractValue),
      });
      router.replace(`/work/${work.id}`);
    } catch (e) {
      setError(e);
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: "Nova obra" }} />
      <Card>
        <Label>Nome da obra</Label>
        <Input value={f.name} onChangeText={(v) => setF({ ...f, name: v })} placeholder="Ex.: Galpão Usina Norte" />
        <Label>Cidade da obra</Label>
        <Input value={f.city} onChangeText={(v) => setF({ ...f, city: v })} placeholder="Ex.: Ponta Grossa" />
        <Label>Cliente</Label>
        <Input value={f.client} onChangeText={(v) => setF({ ...f, client: v })} />
        <Label>Responsável</Label>
        <Input value={f.responsible} onChangeText={(v) => setF({ ...f, responsible: v })} />
        <Label>Início (AAAA-MM-DD)</Label>
        <Input value={f.startDate} onChangeText={(v) => setF({ ...f, startDate: v })} placeholder="2026-10-01" />
        <Label>Fim (AAAA-MM-DD)</Label>
        <Input value={f.endDate} onChangeText={(v) => setF({ ...f, endDate: v })} placeholder="2026-10-15" />
        <Label>Valor do contrato (R$)</Label>
        <Input value={f.contractValue} onChangeText={(v) => setF({ ...f, contractValue: v })} keyboardType="decimal-pad" />
        <ErrorBox error={error} />
        <Button label="Criar obra" onPress={save} loading={create.isPending} />
      </Card>
    </Screen>
  );
}
