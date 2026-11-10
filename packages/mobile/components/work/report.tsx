import { Text, View } from "react-native";
import { useColors } from "../../hooks/use-colors";
import { useWorkReport } from "../../queries/works";
import { Card, Empty, Stat, Subtitle } from "../ui";
import { brl } from "../../lib/format";
import { CATEGORY_LABEL } from "../../lib/labels";

export function ReportSection({ workId }: { workId: number }) {
  const c = useColors();
  const { data, isLoading, error } = useWorkReport(workId);

  if (isLoading) return <Subtitle>Calculando...</Subtitle>;
  if (error || !data) return <Empty>Não foi possível gerar o relatório.</Empty>;

  const profit = data.result >= 0;
  const cats = Object.entries(data.byCategory);

  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        <Stat label="Valor da obra" value={brl(data.revenue)} />
        <Stat label="Custo total" value={brl(data.totalCost)} />
        <Stat label={profit ? "Lucro" : "Prejuízo"} value={brl(data.result)} />
        <Stat label="Margem" value={data.margin === null ? "-" : `${data.margin.toFixed(1)}%`} />
      </View>

      <Card>
        <Text style={{ color: c.foreground, fontWeight: "700", fontSize: 16 }}>Resultado</Text>
        <Text style={{ color: profit ? c.success : c.destructive, fontWeight: "800", fontSize: 20 }}>
          {profit ? "Lucro" : "Prejuízo"} de {brl(Math.abs(data.result))}
        </Text>
        <Subtitle>Horas trabalhadas: {data.hoursWorked.toLocaleString("pt-BR")} h</Subtitle>
      </Card>

      <Card>
        <Text style={{ color: c.foreground, fontWeight: "700", fontSize: 16 }}>Custos por categoria</Text>
        {cats.length === 0 && <Empty>Nenhum custo lançado.</Empty>}
        {cats.map(([k, v]) => (
          <View key={k} style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: c.foreground }}>{CATEGORY_LABEL[k] ?? k}</Text>
            <Text style={{ color: c.foreground, fontWeight: "600" }}>{brl(v.total)}</Text>
          </View>
        ))}
      </Card>

      <Card>
        <Text style={{ color: c.foreground, fontWeight: "700", fontSize: 16 }}>Equipe</Text>
        {data.team.length === 0 && <Empty>Sem equipe escalada.</Empty>}
        {data.team.map((t) => (
          <View key={t.id} style={{ gap: 2 }}>
            <Text style={{ color: c.foreground, fontWeight: "600" }}>
              {t.name} {t.isLocal ? "· local" : ""}
            </Text>
            <Subtitle>
              Presente {t.presentDays} · Falta {t.absentDays} · Atraso {t.lateDays}
              {t.evaluation ? ` · Nota ${t.evaluation.average.toFixed(1)}` : " · sem avaliação"}
            </Subtitle>
          </View>
        ))}
        {data.teamAverage !== null && <Subtitle>Média da equipe: {data.teamAverage.toFixed(1)}</Subtitle>}
        {data.pendingEvaluations.length > 0 && (
          <Subtitle>Faltam avaliar: {data.pendingEvaluations.join(", ")}</Subtitle>
        )}
      </Card>
    </View>
  );
}
