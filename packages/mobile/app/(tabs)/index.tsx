import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useColors } from "../../hooks/use-colors";
import { useWorks } from "../../queries/works";
import { Screen } from "../../components/screen";
import { Button, Card, Empty, Subtitle, Title } from "../../components/ui";
import { fmtDate } from "../../lib/format";
import { STATUS_LABEL } from "../../lib/labels";

export default function ObrasScreen() {
  const c = useColors();
  const { data, isLoading, error } = useWorks();

  return (
    <Screen edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Title>Obras</Title>
          <Subtitle>Programe equipe, presença e custos de cada obra.</Subtitle>
        </View>
        <Button label="Nova obra" onPress={() => router.push("/work/new")} />
      </View>

      {isLoading && <ActivityIndicator color={c.primary} />}
      {error && <Text style={{ color: c.destructive }}>Não foi possível carregar as obras.</Text>}
      {data && data.length === 0 && <Empty>Nenhuma obra cadastrada.</Empty>}

      {data?.map((w) => (
        <Pressable
          key={w.id}
          accessibilityRole="button"
          onPress={() => router.push(`/work/${w.id}`)}
          style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
        >
          <Card>
            <View style={styles.rowBetween}>
              <Text style={{ color: c.foreground, fontSize: 17, fontWeight: "700", flex: 1 }}>{w.name}</Text>
              <View style={[styles.badge, { backgroundColor: c.accent }]}>
                <Text style={{ color: c.accentForeground, fontSize: 12, fontWeight: "700" }}>
                  {STATUS_LABEL[w.status] ?? w.status}
                </Text>
              </View>
            </View>
            <Subtitle>
              {w.city}
              {w.client ? ` · ${w.client}` : ""}
            </Subtitle>
            <Subtitle>
              {fmtDate(w.startDate)} a {fmtDate(w.endDate)}
            </Subtitle>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowBetween: { flexDirection: "row", alignItems: "center", gap: 8 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
});
