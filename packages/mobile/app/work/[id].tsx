import { useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useColors } from "../../hooks/use-colors";
import { useWork, useWorkMutations } from "../../queries/works";
import { Screen } from "../../components/screen";
import { Card, Chips, ErrorBox, Subtitle, Title } from "../../components/ui";
import { TeamSection } from "../../components/work/team";
import { AttendanceSection } from "../../components/work/attendance";
import { ToolsSection } from "../../components/work/tools";
import { ChecklistSection } from "../../components/work/checklist";
import { CostsSection } from "../../components/work/costs";
import { EvaluationSection } from "../../components/work/evaluation";
import { ReportSection } from "../../components/work/report";
import { fmtDate } from "../../lib/format";
import { STATUS_LABEL } from "../../lib/labels";

const TABS = [
  { value: "equipe", label: "Equipe" },
  { value: "presenca", label: "Presença" },
  { value: "ferramentas", label: "Ferramentas" },
  { value: "checklist", label: "Checklist" },
  { value: "diario", label: "Diário" },
  { value: "avaliacao", label: "Avaliação" },
  { value: "relatorio", label: "Relatório" },
] as const;
type TabValue = (typeof TABS)[number]["value"];

const STATUS_OPTIONS = Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }));

export default function WorkDetailScreen() {
  const c = useColors();
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const id = Number(idParam);
  const { data, isLoading, error } = useWork(id);
  const { update } = useWorkMutations();
  const [tab, setTab] = useState<TabValue>("equipe");
  const [statusError, setStatusError] = useState<unknown>(null);

  if (isLoading) return <Screen><ActivityIndicator color={c.primary} /></Screen>;
  if (error || !data) return <Screen><ErrorBox error={error ?? new Error("Obra não encontrada")} /></Screen>;

  const { work } = data;

  const changeStatus = async (status: string) => {
    setStatusError(null);
    try {
      await update.mutateAsync({
        id: work.id,
        name: work.name,
        city: work.city,
        client: work.client,
        responsible: work.responsible,
        startDate: work.startDate,
        endDate: work.endDate,
        contractValue: work.contractValue,
        status,
      });
    } catch (e) {
      setStatusError(e);
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: "Obra" }} />
      <View style={{ gap: 6 }}>
        <Title>{work.name}</Title>
        <Subtitle>
          {work.city} · {fmtDate(work.startDate)} a {fmtDate(work.endDate)}
        </Subtitle>
      </View>

      <Card>
        <Text style={{ color: c.foreground, fontWeight: "700" }}>Status</Text>
        <Chips options={STATUS_OPTIONS} value={work.status} onChange={changeStatus} />
        <ErrorBox error={statusError} />
      </Card>

      <Chips options={[...TABS]} value={tab} onChange={setTab} />

      {tab === "equipe" && <TeamSection data={data} />}
      {tab === "presenca" && <AttendanceSection data={data} />}
      {tab === "ferramentas" && <ToolsSection data={data} />}
      {tab === "checklist" && <ChecklistSection data={data} />}
      {tab === "diario" && <CostsSection data={data} />}
      {tab === "avaliacao" && <EvaluationSection data={data} />}
      {tab === "relatorio" && <ReportSection workId={work.id} />}
    </Screen>
  );
}
