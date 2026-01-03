import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import type { Verbosity } from "@/lib/sightline/types";

export default function SettingsScreen() {
  const [verbosity, setVerbosity] = useState<Verbosity>("medium");

  const options: { key: Verbosity; label: string; desc: string }[] = [
    { key: "low", label: "Low", desc: "Only the sign + distance." },
    { key: "medium", label: "Medium", desc: "Adds brief meaning." },
    { key: "high", label: "High", desc: "Adds confidence and extra detail." },
  ];

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Settings</ThemedText>
      <ThemedText type="subtitle">Tune what SightLine says out loud.</ThemedText>

      <ThemedView style={styles.card}>
        <ThemedText type="defaultSemiBold">Verbosity</ThemedText>
        <ThemedText style={styles.muted}>
          Choose how much information is spoken per sign.
        </ThemedText>

        <View style={{ height: 8 }} />

        {options.map((o) => {
          const selected = o.key === verbosity;
          return (
            <Pressable
              key={o.key}
              onPress={() => setVerbosity(o.key)}
              accessibilityRole="button"
              accessibilityLabel={`Set verbosity to ${o.label}`}
              style={[styles.row, selected && styles.rowSelected]}
            >
              <View style={{ flex: 1, gap: 4 }}>
                <ThemedText type="defaultSemiBold">{o.label}</ThemedText>
                <ThemedText style={styles.muted}>{o.desc}</ThemedText>
              </View>
              <ThemedView style={[styles.pill, selected && styles.pillSelected]}>
                <ThemedText style={styles.pillText}>{selected ? "On" : "Off"}</ThemedText>
              </ThemedView>
            </Pressable>
          );
        })}
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 16 },
  card: {
    padding: 16,
    borderRadius: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  muted: { opacity: 0.75, lineHeight: 20 },
  row: {
    padding: 14,
    borderRadius: 16,
    gap: 10,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  rowSelected: {
    borderColor: "rgba(46,107,255,0.55)",
  },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  pillSelected: {
    borderColor: "rgba(46,107,255,0.70)",
  },
  pillText: { fontWeight: "700" },
});
