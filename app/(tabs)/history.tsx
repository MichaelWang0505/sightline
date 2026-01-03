import { StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

export default function HistoryScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">History</ThemedText>
      <ThemedText type="subtitle">Recent announcements will appear here.</ThemedText>

      <ThemedView style={styles.card}>
        <ThemedText type="defaultSemiBold">Nothing yet</ThemedText>
        <ThemedText style={styles.muted}>
          Once scanning runs, we’ll store detections and let users replay them.
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
  muted: { opacity: 0.75, lineHeight: 20 },
});
