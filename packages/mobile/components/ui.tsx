import { createElement, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useColors } from "../hooks/use-colors";
import { fmtDate } from "../lib/format";

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const c = useColors();
  return <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }, style]}>{children}</View>;
}

export function Title({ children }: { children: ReactNode }) {
  const c = useColors();
  return <Text style={[styles.title, { color: c.foreground }]}>{children}</Text>;
}

export function H2({ children, right }: { children: ReactNode; right?: ReactNode }) {
  const c = useColors();
  return (
    <View style={styles.row}>
      <Text style={{ color: c.foreground, fontSize: 17, fontWeight: "700", flexShrink: 1 }}>{children}</Text>
      {right}
    </View>
  );
}

export function Subtitle({ children }: { children: ReactNode }) {
  const c = useColors();
  return <Text style={{ color: c.mutedForeground, fontSize: 14, lineHeight: 20 }}>{children}</Text>;
}

export function Muted({ children, style }: { children: ReactNode; style?: object }) {
  const c = useColors();
  return <Text style={[{ color: c.mutedForeground, fontSize: 12, lineHeight: 17 }, style]}>{children}</Text>;
}

export function Label({ children }: { children: ReactNode }) {
  const c = useColors();
  return <Text style={[styles.label, { color: c.mutedForeground }]}>{children}</Text>;
}

/** Rótulo + campo */
export function Field({ label, children, style }: { label: string; children: ReactNode; style?: ViewStyle }) {
  return (
    <View style={[{ gap: 6 }, style]}>
      <Label>{label}</Label>
      {children}
    </View>
  );
}

export function Input(props: TextInputProps) {
  const c = useColors();
  return (
    <TextInput
      placeholderTextColor={c.mutedForeground}
      {...props}
      style={[
        styles.input,
        { backgroundColor: props.editable === false ? c.muted : c.card, borderColor: c.border, color: c.foreground },
        props.multiline && { minHeight: 88, textAlignVertical: "top" },
        props.style,
      ]}
    />
  );
}

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
  size = "md",
  icon,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "ghost" | "danger" | "outlineDanger";
  disabled?: boolean;
  loading?: boolean;
  size?: "sm" | "md";
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
}) {
  const c = useColors();
  const bg = variant === "primary" ? c.primary : variant === "danger" ? c.destructive : c.card;
  const fg =
    variant === "primary" ? c.primaryForeground : variant === "danger" ? "#FFFFFF" : variant === "outlineDanger" ? c.destructive : c.primary;
  const border = variant === "ghost" ? c.border : variant === "outlineDanger" ? c.destructive + "55" : bg;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        size === "sm" && styles.buttonSm,
        { backgroundColor: bg, borderColor: border, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {icon && <Ionicons name={icon} size={size === "sm" ? 14 : 17} color={fg} />}
          <Text style={[styles.buttonText, { color: fg, fontSize: size === "sm" ? 13 : 15 }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

/** Seleção por chips (ex.: presença, status, categoria) */
export function Chips<T extends string>({
  options,
  value,
  onChange,
  scroll,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  scroll?: boolean;
}) {
  const c = useColors();
  const items = options.map((o) => {
    const active = o.value === value;
    return (
      <Pressable
        key={o.value}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        onPress={() => onChange(o.value)}
        style={[styles.chip, { borderColor: active ? c.primary : c.border, backgroundColor: active ? c.primary : c.card }]}
      >
        <Text style={{ color: active ? c.primaryForeground : c.foreground, fontSize: 13, fontWeight: "600" }}>{o.label}</Text>
      </Pressable>
    );
  });
  if (scroll)
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
        {items}
      </ScrollView>
    );
  return <View style={styles.chips}>{items}</View>;
}

const TONES = {
  green: { bg: "#ECFDF5", fg: "#125f3d", border: "#A7F3D0" },
  gray: { bg: "#F4F4F5", fg: "#52525B", border: "#E4E4E7" },
  red: { bg: "#FEF2F2", fg: "#DC2626", border: "#FECACA" },
  amber: { bg: "#FFFBEB", fg: "#B45309", border: "#FDE68A" },
};
export type Tone = keyof typeof TONES;

export function Badge({ children, tone = "green" }: { children: ReactNode; tone?: Tone }) {
  const t = TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg, borderColor: t.border }]}>
      <Text style={{ color: t.fg, fontSize: 12, fontWeight: "600" }}>{children}</Text>
    </View>
  );
}

export function Badges({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>{children}</View>;
}

export function ErrorBox({ error }: { error: unknown }) {
  const c = useColors();
  if (!error) return null;
  const msg = error instanceof Error ? error.message : "Algo deu errado. Tente de novo.";
  return (
    <View style={[styles.error, { borderColor: "#FECACA", backgroundColor: "#FEF2F2" }]}>
      <Text style={{ color: c.destructive, fontSize: 14 }}>{msg}</Text>
    </View>
  );
}

export function Notice({ children, tone = "green" }: { children: ReactNode; tone?: Tone }) {
  const t = TONES[tone];
  return (
    <View style={{ borderWidth: 1, borderColor: t.border, backgroundColor: t.bg, borderRadius: 12, padding: 12 }}>
      <Text style={{ color: tone === "green" ? "#1B2A22" : t.fg, fontSize: 13, lineHeight: 19 }}>{children}</Text>
    </View>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  const c = useColors();
  return (
    <View style={{ borderWidth: 1, borderStyle: "dashed", borderColor: c.border, borderRadius: 14, padding: 20 }}>
      <Text style={{ color: c.mutedForeground, textAlign: "center", fontSize: 14 }}>{children}</Text>
    </View>
  );
}

export function Stat({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "good" | "bad" }) {
  const c = useColors();
  const bar = tone === "bad" ? c.destructive : tone === "good" ? c.secondary : c.primary;
  const fg = tone === "bad" ? c.destructive : tone === "good" ? c.primary : c.foreground;
  return (
    <View style={[styles.stat, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, backgroundColor: bar }} />
      <Text style={{ color: c.mutedForeground, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</Text>
      <Text style={{ color: fg, fontSize: 19, fontWeight: "800" }}>{value}</Text>
    </View>
  );
}

export function Stats({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>{children}</View>;
}

export function Row({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

/** Linha "rótulo .... valor" */
export function KV({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  const c = useColors();
  return (
    <View style={[styles.kv, { borderBottomColor: c.border }]}>
      <Text style={{ color: c.foreground, fontSize: 14, flex: 1, fontWeight: bold ? "800" : "400" }}>{k}</Text>
      <Text style={{ color: c.foreground, fontSize: 14, fontWeight: bold ? "800" : "600" }}>{v}</Text>
    </View>
  );
}

export function Divider() {
  const c = useColors();
  return <View style={{ height: 1, backgroundColor: c.border }} />;
}

export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={() => onChange(!checked)}
      hitSlop={8}
      style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          borderWidth: 2,
          borderColor: checked ? c.primary : c.border,
          backgroundColor: checked ? c.primary : c.card,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {checked && <Ionicons name="checkmark" size={15} color={c.primaryForeground} />}
      </View>
      {label ? <Text style={{ color: c.foreground, fontSize: 14, flexShrink: 1 }}>{label}</Text> : null}
    </Pressable>
  );
}

/** Lista de opções em modal (substitui o <select> da web) */
export function Select<T extends string>({
  value,
  options,
  onChange,
  placeholder = "Selecione",
  label,
}: {
  value: T | "";
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  placeholder?: string;
  label?: string;
}) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label ?? placeholder}
        onPress={() => setOpen(true)}
        style={[styles.input, styles.selectBox, { backgroundColor: c.card, borderColor: c.border }]}
      >
        <Text numberOfLines={1} style={{ color: current ? c.foreground : c.mutedForeground, fontSize: 16, flex: 1 }}>
          {current?.label ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={c.mutedForeground} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: c.card }]} onPress={() => {}}>
            <Text style={{ color: c.foreground, fontWeight: "700", fontSize: 16, marginBottom: 8 }}>{label ?? placeholder}</Text>
            <ScrollView style={{ maxHeight: 420 }}>
              {options.map((o) => {
                const active = o.value === value;
                return (
                  <Pressable
                    key={o.value}
                    accessibilityRole="button"
                    onPress={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    style={[styles.option, { borderBottomColor: c.border, backgroundColor: active ? c.accent : "transparent" }]}
                  >
                    <Text style={{ color: active ? c.primary : c.foreground, fontSize: 15, fontWeight: active ? "700" : "400", flex: 1 }}>
                      {o.label}
                    </Text>
                    {active && <Ionicons name="checkmark" size={18} color={c.primary} />}
                  </Pressable>
                );
              })}
              {options.length === 0 && <Text style={{ color: c.mutedForeground, paddingVertical: 12 }}>Nenhuma opção.</Text>}
            </ScrollView>
            <Button label="Fechar" variant="ghost" onPress={() => setOpen(false)} style={{ marginTop: 10 }} />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const pad = (n: number) => String(n).padStart(2, "0");
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromISO = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return y ? new Date(y, m - 1, d) : new Date();
};

/**
 * Campo de data (YYYY-MM-DD) ou hora (HH:mm).
 * Celular: seletor nativo. Preview web: input nativo do navegador.
 */
export function DateField({
  value,
  onChange,
  mode = "date",
  placeholder,
  clearable,
  disabled,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  mode?: "date" | "time";
  placeholder?: string;
  clearable?: boolean;
  disabled?: boolean;
  label?: string;
}) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  const [temp, setTemp] = useState<Date | null>(null);

  const asDate = () => {
    if (mode === "time") {
      const [h, m] = (value || "07:00").split(":").map(Number);
      const d = new Date();
      d.setHours(h || 0, m || 0, 0, 0);
      return d;
    }
    return value ? fromISO(value) : new Date();
  };
  const fmt = (d: Date) => (mode === "time" ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : toISO(d));

  if (Platform.OS === "web") {
    return createElement("input", {
      type: mode,
      value,
      disabled,
      "aria-label": label ?? (mode === "time" ? "Hora" : "Data"),
      onChange: (e: { target: { value: string } }) => onChange(e.target.value),
      style: {
        border: `1px solid ${c.border}`,
        borderRadius: 12,
        padding: "10px 12px",
        fontSize: 16,
        color: c.foreground,
        background: disabled ? c.muted : c.card,
        fontFamily: "inherit",
        minHeight: 44,
        boxSizing: "border-box",
        width: "100%",
      },
    });
  }

  const shown = value ? (mode === "time" ? value : fmtDate(value)) : placeholder ?? (mode === "time" ? "--:--" : "Sem data");
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label ?? shown}
        disabled={disabled}
        onPress={() => {
          setTemp(asDate());
          setOpen(true);
        }}
        style={[styles.input, styles.selectBox, { backgroundColor: disabled ? c.muted : c.card, borderColor: c.border }]}
      >
        <Text style={{ color: value ? c.foreground : c.mutedForeground, fontSize: 16, flex: 1 }}>{shown}</Text>
        {clearable && value ? (
          <Pressable hitSlop={10} accessibilityLabel="Limpar" onPress={() => onChange("")}>
            <Ionicons name="close-circle" size={18} color={c.mutedForeground} />
          </Pressable>
        ) : (
          <Ionicons name={mode === "time" ? "time-outline" : "calendar-outline"} size={18} color={c.mutedForeground} />
        )}
      </Pressable>
      {open && Platform.OS === "android" && (
        <DateTimePicker
          value={temp ?? asDate()}
          mode={mode}
          is24Hour
          onChange={(e, d) => {
            setOpen(false);
            if (e.type === "set" && d) onChange(fmt(d));
          }}
        />
      )}
      {Platform.OS === "ios" && (
        <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
          <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
            <Pressable style={[styles.sheet, { backgroundColor: c.card }]} onPress={() => {}}>
              <DateTimePicker
                value={temp ?? asDate()}
                mode={mode}
                display="spinner"
                locale="pt-BR"
                is24Hour
                onChange={(_, d) => d && setTemp(d)}
              />
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Button label="Cancelar" variant="ghost" onPress={() => setOpen(false)} style={{ flex: 1 }} />
                <Button
                  label="OK"
                  onPress={() => {
                    if (temp) onChange(fmt(temp));
                    setOpen(false);
                  }}
                  style={{ flex: 1 }}
                />
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </>
  );
}

/** Dia com setas (anterior / próximo) */
export function DayPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const c = useColors();
  const shift = (n: number) => {
    const d = fromISO(value);
    d.setDate(d.getDate() + n);
    onChange(toISO(d));
  };
  const arrow = (n: number, icon: "chevron-back" | "chevron-forward") => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={n < 0 ? "Dia anterior" : "Próximo dia"}
      onPress={() => shift(n)}
      style={[styles.arrow, { borderColor: c.border, backgroundColor: c.card }]}
    >
      <Ionicons name={icon} size={18} color={c.primary} />
    </Pressable>
  );
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      {arrow(-1, "chevron-back")}
      <View style={{ flex: 1 }}>
        <DateField value={value} onChange={(v) => v && onChange(v)} label="Dia" />
      </View>
      {arrow(1, "chevron-forward")}
    </View>
  );
}

/** Grade de 2 colunas para campos curtos */
export function Grid2({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>{children}</View>;
}
export function Col({ children }: { children: ReactNode }) {
  return <View style={{ flexGrow: 1, flexBasis: "45%", minWidth: 140, gap: 6 }}>{children}</View>;
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 12 },
  title: { fontSize: 24, fontWeight: "800", letterSpacing: -0.3 },
  label: { fontSize: 13, fontWeight: "600" },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, minHeight: 44 },
  selectBox: { flexDirection: "row", alignItems: "center", gap: 8 },
  button: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  buttonSm: { paddingVertical: 7, paddingHorizontal: 12, minHeight: 34, borderRadius: 10 },
  buttonText: { fontWeight: "700" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3, alignSelf: "flex-start" },
  error: { borderWidth: 1, borderRadius: 12, padding: 12 },
  stat: { flexGrow: 1, flexBasis: "45%", borderWidth: 1, borderRadius: 14, padding: 12, paddingTop: 14, gap: 4, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  kv: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, paddingBottom: 34, gap: 8 },
  option: { flexDirection: "row", alignItems: "center", paddingVertical: 13, paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderRadius: 8 },
  arrow: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
});
