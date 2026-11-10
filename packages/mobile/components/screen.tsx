import type { ReactNode } from "react";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColors } from "../hooks/use-colors";

const LOGO = require("../assets/images/fam-logo.jpeg");

/** Tela padrão: SafeArea + logo FAM + conteúdo rolável */
export function Screen({ children, edges = ["top", "left", "right"] }: { children: ReactNode; edges?: ("top" | "left" | "right" | "bottom")[] }) {
  const c = useColors();
  return (
    <SafeAreaView edges={edges} style={[styles.root, { backgroundColor: c.background }]}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <View style={styles.logoRow}>
          <Image source={LOGO} style={styles.logo} resizeMode="contain" accessibilityLabel="FAM Metal" />
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 48 },
  logoRow: { alignItems: "flex-start" },
  logo: { width: 120, height: 44 },
});
