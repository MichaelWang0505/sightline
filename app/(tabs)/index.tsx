import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  View
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

import { mockDetect } from "@/lib/sightline/mockDetector";
import { speakDetection } from "@/lib/sightline/speak";
import type { Detection, Verbosity } from "@/lib/sightline/types";
import { CameraView, useCameraPermissions } from "expo-camera";

import { useRouter } from "expo-router";

const palette = {
  bg: "#0F1220",
  card: "#191C2B",
  primary: "#3A7CFF",
  danger: "#D64545",
  secondary: "#2D2F3E",
  textLight: "#FFFFFF",
  textSub: "#C7CBDA",
  accent: "#4ADE80",
};

export default function ScanScreen() {
  const router = useRouter();

  const [scanning, setScanning] = useState(false);
  const [verbosity] = useState<Verbosity>("medium");
  const [last, setLast] = useState<Detection | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
  if (permission && !permission.granted) {
    requestPermission();
  }
}, [permission]);

  async function start() {
    setScanning(true);

    timerRef.current = setInterval(async () => {
      if (cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.7 });
      }
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
    setLast(null);
  }

  function repeatLast() {
    if (!last) return;
    speakDetection(last, verbosity);
  }

  const statusText = scanning ? "Scanning for signs…" : "Scanner paused";
  const statusSub = scanning
    ? "Keep your phone pointed forward. SightLine will announce signs ahead."
    : "Tap Start to begin listening for nearby signs.";

  if (!permission) {
    return <ThemedView style = {styles.container}><ThemedText>Loading...</ThemedText></ThemedView>;
  }

  if (!permission.granted) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: palette.textLight }]}>
        <View style={styles.header}>
          <ThemedText type="title" style={{ color: palette.bg }}>
            Please Grant Camera Permission
          </ThemedText>
        </View>
      </ThemedView>
    )
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: palette.textLight }]}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText type="title" style={{ color: palette.bg }}>
          SightLine
        </ThemedText>
      </View>

      {/* Start/Stop Button */}
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

      {/* Scanner Status */}
      <ThemedView style={styles.card}>
        <ThemedText type="defaultSemiBold" style={{ color: palette.textLight }}>
          Scanner Status
        </ThemedText>

        <ThemedText style={{ color: palette.textLight }}>
          {last ? `${last.label} — ${last.distance}` : "No detections yet."}
        </ThemedText>
      </ThemedView>

      {/* Status Card */}
      <ThemedView style={styles.card}>
        <ThemedText type="defaultSemiBold" style={{ color: palette.textLight }}>
          {statusText}
        </ThemedText>
        <ThemedText style={{ color: palette.textSub }}>{statusSub}</ThemedText>
      </ThemedView>

      {/* Repeat Button */}
      <Pressable
        style={[styles.button, styles.secondary]}
        onPress={repeatLast}
        accessibilityRole="button"
        accessibilityLabel="Repeat last announcement"
      >
        <ThemedText style={styles.buttonText}>Repeat Last Announcement</ThemedText>
      </Pressable>

      {/* Navigate Button */}
      <Pressable
        style={[styles.button, styles.secondary]}
        accessibilityRole="button"
        accessibilityLabel="Navigate"
        onPress={() => router.push("/modal")}
      >
        <ThemedText style={styles.buttonText}>Navigate</ThemedText>
      </Pressable>

      <View style={{ height: 0, width: 0, overflow: "hidden" }}>
        <CameraView ref={cameraRef} style={{ flex: 1}} facing="back" />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 22,
    gap: 18,
  },
  header: {
    gap: 4,
    paddingTop: 40,
  },
  card: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: palette.card,
    gap: 8,
  },
  button: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: palette.primary,
  },
  secondary: {
    backgroundColor: palette.secondary,
  },
  danger: {
    backgroundColor: palette.danger,
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },
  sub: {
    opacity: 0.85,
    marginTop: 4,
  },
});
