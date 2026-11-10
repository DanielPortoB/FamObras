import { useState } from "react";
import { Alert, StyleSheet, Switch, Text, View } from "react-native";
import { useColors } from "../../hooks/use-colors";
import { useEmployees, useEmployeeMutations } from "../../queries/employees";
import { Button, Card, Empty, ErrorBox, Input, Label, Row, Subtitle, Title } from "../../components/ui";
import { Screen } from "../../components/screen";
import { maskCPF, maskPhone, unmaskCPF } from "../../lib/format";

const EMPTY = { name: "", role: "", cpf: "", phone: "", city: "" };

export default function FuncionariosScreen() {
  const c = useColors();
  const { data, isLoading } = useEmployees();
  const m = useEmployeeMutations();
  const [form, setForm] = useState(EMPTY);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const save = async () => {
    setError(null);
    try {
      await m.create.mutateAsync({
        name: form.name.trim(),
        role: form.role.trim(),
        cpf: unmaskCPF(form.cpf),
        phone: form.phone.trim() || null,
        city: form.city.trim(),
      });
      setForm(EMPTY);
      setOpen(false);
    } catch (e) {
      setError(e);
    }
  };

  const toggleActive = async (emp: NonNullable<typeof data>[number]) => {
    setError(null);
    try {
      await m.update.mutateAsync({
        id: emp.id,
        name: emp.name,
        role: emp.role,
        cpf: emp.cpf,
        phone: emp.phone,
        city: emp.city,
        active: !emp.active,
      });
    } catch (e) {
      setError(e);
    }
  };

  const remove = (id: number, name: string) => {
    Alert.alert("Excluir funcionário", `Excluir ${name}?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          try {
            await m.remove.mutateAsync({ id });
          } catch (e) {
            setError(e);
          }
        },
      },
    ]);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Title>Funcionários</Title>
          <Subtitle>Banco de funcionários para escalar nas obras.</Subtitle>
        </View>
        <Button label={open ? "Fechar" : "Novo"} variant={open ? "ghost" : "primary"} onPress={() => setOpen(!open)} />
      </View>

      {open && (
        <Card>
          <Label>Nome</Label>
          <Input value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} placeholder="Nome completo" />
          <Label>Função</Label>
          <Input value={form.role} onChangeText={(v) => setForm({ ...form, role: v })} placeholder="Ex.: Soldador" />
          <Label>CPF</Label>
          <Input
            value={form.cpf}
            onChangeText={(v) => setForm({ ...form, cpf: maskCPF(v) })}
            keyboardType="number-pad"
            placeholder="000.000.000-00"
          />
          <Label>Cidade onde mora</Label>
          <Input value={form.city} onChangeText={(v) => setForm({ ...form, city: v })} placeholder="Ex.: Ponta Grossa" />
          <Label>Telefone</Label>
          <Input
            value={form.phone}
            onChangeText={(v) => setForm({ ...form, phone: maskPhone(v) })}
            keyboardType="phone-pad"
            placeholder="(00) 00000-0000"
          />
          <ErrorBox error={error} />
          <Button label="Salvar funcionário" onPress={save} loading={m.create.isPending} />
        </Card>
      )}

      {!open && <ErrorBox error={error} />}
      {isLoading && <Subtitle>Carregando...</Subtitle>}
      {data && data.length === 0 && <Empty>Nenhum funcionário cadastrado.</Empty>}

      {data?.map((emp) => (
        <Card key={emp.id}>
          <Row>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.foreground, fontSize: 16, fontWeight: "700" }}>{emp.name}</Text>
              <Subtitle>
                {emp.role} · {emp.city}
              </Subtitle>
              <Subtitle>CPF {maskCPF(emp.cpf)}{emp.phone ? ` · ${emp.phone}` : ""}</Subtitle>
            </View>
          </Row>
          <Row>
            <View style={styles.activeRow}>
              <Switch value={emp.active} onValueChange={() => toggleActive(emp)} trackColor={{ true: c.primary }} />
              <Text style={{ color: c.mutedForeground }}>{emp.active ? "Ativo" : "Inativo"}</Text>
            </View>
            <Button label="Excluir" variant="ghost" onPress={() => remove(emp.id, emp.name)} />
          </Row>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  activeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
});
