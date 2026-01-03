import { useRef, useState } from "react";
import { Pressable, StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

import { mockDetect } from "@/lib/sightline/mockDetector";
import { speakDetection } from "@/lib/sightline/speak";
import type { Detection, Verbosity } from "@/lib/sightline/types";
import { useRouter } from "expo-router";

export default function ScanScreen() {
  const [scanning, setScanning] = useState(false);
  const [verbosity] = useState<Verbosity>("medium");
  const [last, setLast] = useState<Detection | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function start() {
    setScanning(true);

    timerRef.current = setInterval(() => {
      const d = mockDetect();
      if (d.confidence < 0.65) return;

      setLast(d);
      speakDetection(d, verbosity);
    }, 3000);
  }

  function stop() {
    setScanning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }

  function repeatLast() {
    if (!last) return;
    speakDetection(last, verbosity);
  }

  const router = useRouter();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">My Eye</ThemedText>
      <ThemedText type="subtitle">
        Navigate with sign detection
      </ThemedText>

      <ThemedView style={styles.card}>
        <ThemedText type="defaultSemiBold">
          Status: {scanning ? "Scanning…" : "Paused"}
        </ThemedText>
      </ThemedView>

      <Pressable
        style={[styles.button, scanning && styles.danger]}
        onPress={scanning ? stop : start}
        accessibilityRole="button"
        accessibilityLabel={scanning ? "Stop scanning" : "Start scanning"}
      >
        <ThemedText style={styles.buttonText}>
          {scanning ? "Stop Scanning" : "Start Scanning"}
        </ThemedText>
      </Pressable>

      <Pressable
        style={[styles.button, styles.secondary]}
        onPress={repeatLast}
        accessibilityRole="button"
        accessibilityLabel="Repeat last announcement"
      >
        <ThemedText style={styles.buttonText}>Repeat Last Announcement</ThemedText>
      </Pressable>

      <Pressable
        style={[styles.button, styles.secondary]}
        accessibilityRole = "button"
        accessibilityLabel = "Navigate"
        onPress={() => router.push("/modal/_Navigate")}
      >
        <ThemedText style={styles.buttonText}>Navigate</ThemedText>
      </Pressable>

      <ThemedView style={styles.card}>
        <ThemedText type="defaultSemiBold">Latest Detection</ThemedText>
        <ThemedText>
          {last ? `${last.label} — ${last.distance}` : "No detections yet."}
        </ThemedText>
        {last?.meaning ? <ThemedText style={styles.sub}>{last.meaning}</ThemedText> : null}
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 70 },
  card: { padding: 16, borderRadius: 16, marginVertical: 8 },
  button: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: "#2E6BFF",
    marginVertical: 8
  },
  secondary: { backgroundColor: "#2A2A38" },
  danger: { backgroundColor: "#C83B3B" },
  buttonText: { color: "white", fontSize: 18, fontWeight: "700" },
  sub: { opacity: 0.8, marginTop: 8 },
});
