import { StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

export default function HelpScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Help</ThemedText>
      <ThemedText type="subtitle">Quick instructions + safety notes.</ThemedText>

      <ThemedView style={styles.card}>
        <ThemedText type="defaultSemiBold">How to use</ThemedText>
        <ThemedText style={styles.item}>• Tap Start Scanning.</ThemedText>
        <ThemedText style={styles.item}>• Point camera forward while walking.</ThemedText>
        <ThemedText style={styles.item}>• Listen for sign + approximate distance.</ThemedText>
        <ThemedText style={styles.item}>• Use Repeat if you missed it.</ThemedText>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="defaultSemiBold">Safety</ThemedText>
        <ThemedText style={styles.muted}>
          SightLine may miss signs or estimate distance incorrectly. Use caution near traffic and in
          unfamiliar environments.
        </ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 16 },
  card: {
    padding: 16,
    borderRadius: 18,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  item: { lineHeight: 22 },
  muted: { opacity: 0.75, lineHeight: 20 },
});
