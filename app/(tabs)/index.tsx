import * as Location from "expo-location";
import * as Speech from "expo-speech";
import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  View
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

import { useRouteSession } from "@/lib/route-session";
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
  const { activeRoute, endRoute } = useRouteSession();

  const [scanning, setScanning] = useState(false);
  const [verbosity] = useState<Verbosity>("medium");
  const [last, setLast] = useState<Detection | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const routeWatcherRef = useRef<Location.LocationSubscription | null>(null);
  const nextStepIndexRef = useRef(0);
  const lastInstructionAtRef = useRef(0);

  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
  if (permission && !permission.granted) {
    requestPermission();
  }
}, [permission]);

  useEffect(() => {
    if (!activeRoute) {
      routeWatcherRef.current?.remove();
      routeWatcherRef.current = null;
      nextStepIndexRef.current = 0;
      lastInstructionAtRef.current = 0;
      Speech.stop();
      return;
    }

    const steps = activeRoute.steps;
    nextStepIndexRef.current = 0;
    lastInstructionAtRef.current = 0;

    const speakNextStep = async () => {
      if (!activeRoute) return;

      const speaking = await Speech.isSpeakingAsync();
      if (speaking) return;

      const now = Date.now();
      if (now - lastInstructionAtRef.current < 12000) return;

      const stepIndex = nextStepIndexRef.current;
      if (stepIndex >= steps.length) {
        Speech.speak(`You have arrived at ${activeRoute.destinationName}.`);
        endRoute();
        return;
      }

      Speech.speak(steps[stepIndex].instruction);
      nextStepIndexRef.current = stepIndex + 1;
      lastInstructionAtRef.current = now;
    };

    if (steps.length === 0) {
      Speech.speak(`Navigation started to ${activeRoute.destinationName}.`);
    } else {
      Speech.speak(`Navigation started to ${activeRoute.destinationName}. ${steps[0].instruction}`);
      nextStepIndexRef.current = 1;
      lastInstructionAtRef.current = Date.now();
    }

    (async () => {
      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 8,
          timeInterval: 5000,
        },
        () => {
          speakNextStep();
        }
      );

      routeWatcherRef.current = sub;
    })();

    return () => {
      routeWatcherRef.current?.remove();
      routeWatcherRef.current = null;
    };
  }, [activeRoute, endRoute]);

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
        accessibilityLabel={activeRoute ? "End route" : "Navigate"}
        onPress={activeRoute ? endRoute : () => router.push("/modal")}
      >
        <ThemedText style={styles.buttonText}>
          {activeRoute ? "End Route" : "Navigate"}
        </ThemedText>
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
