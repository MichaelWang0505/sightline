import * as Location from "expo-location";
import * as Speech from "expo-speech";
import { useEffect, useRef, useState } from "react";
import {
  ImageBackground,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { USE_MOCK_DETECTOR } from "@/constants/api";
import { AppPalette } from "@/constants/theme";

import { useRouteSession } from "@/lib/route-session";
import { detectAllFromBackend } from "@/lib/sightline/backendDetector";
import { mockDetect } from "@/lib/sightline/mockDetector";
import { speakDetection } from "@/lib/sightline/speak";
import type { Detection } from "@/lib/sightline/types";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";

const palette = AppPalette.light;

function describeDetectionBackendError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown backend error";
  const normalized = message.toLowerCase();

  if (normalized.includes("timed out") || normalized.includes("aborted")) {
    return "Detection request timed out. Backend may be unreachable or blocked on this network.";
  }

  if (normalized.includes("network request failed") || normalized.includes("failed to fetch")) {
    return "Could not reach detection backend. Check EXPO_PUBLIC_API_BASE_URL and network access.";
  }

  if (normalized.includes("sign detection failed")) {
    return message;
  }

  return `Detection failed: ${message}`;
}

export default function ScanScreen() {
  const router = useRouter();
  const { activeRoute, endRoute } = useRouteSession();

  const [scanning, setScanning] = useState(false);
  const [last, setLast] = useState<Detection | null>(null);
  const [currentDetections, setCurrentDetections] = useState<Detection[]>([]);
  const [lastBackendError, setLastBackendError] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const routeWatcherRef = useRef<Location.LocationSubscription | null>(null);
  const nextStepIndexRef = useRef(0);
  const lastInstructionAtRef = useRef(0);
  const activeRouteRef = useRef(activeRoute);
  const latestLocationRef = useRef<Location.LocationObject | null>(null);
  const processingRef = useRef(false);
  const consecutiveFailuresRef = useRef(0);
  const backendCooldownUntilRef = useRef(0);
  const lastLoggedErrorRef = useRef<string | null>(null);

  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const usingMockDetector = USE_MOCK_DETECTOR;

  useEffect(() => {
    if (permission && !permission.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      routeWatcherRef.current?.remove();
      routeWatcherRef.current = null;
    };
  }, []);

  function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const toRad = (x: number) => (x * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  useEffect(() => {
    activeRouteRef.current = activeRoute;
  }, [activeRoute]);

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

    const speakNextStep = async (location: Location.LocationObject) => {
      if (!activeRoute) return;
      latestLocationRef.current = location;
      const now = Date.now();
      if (now - lastInstructionAtRef.current < 3000) return;
      const stepIndex = nextStepIndexRef.current;
      if (stepIndex >= steps.length) {
        Speech.speak(`You have arrived at ${activeRoute.destinationName}.`);
        endRoute();
        return;
      }
      const step = steps[stepIndex];
      if (step.waypoint) {
        const dist = haversineMeters(
          location.coords.latitude,
          location.coords.longitude,
          step.waypoint.lat,
          step.waypoint.lon
        );
        if (dist > 25) return;
      }
      Speech.speak(step.instruction);
      nextStepIndexRef.current = stepIndex + 1;
      lastInstructionAtRef.current = now;
    };

    if (steps.length > 0) {
      nextStepIndexRef.current = 1;
      lastInstructionAtRef.current = Date.now();
      setTimeout(() => {
        Speech.speak(`Starting navigation to ${activeRoute.destinationName.split(",")[0]}. ${steps[0].instruction}`);
      }, 500);
    }

    (async () => {
      const sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 2, timeInterval: 1000 },
        (location) => { speakNextStep(location); }
      );
      routeWatcherRef.current = sub;
    })();

    return () => {
      routeWatcherRef.current?.remove();
      routeWatcherRef.current = null;
    };
  }, [activeRoute, endRoute]);

  async function start() {
    if (timerRef.current) return;
    setScanning(true);

    timerRef.current = setInterval(async () => {
      if (processingRef.current) return;
      const now = Date.now();
      if (now < backendCooldownUntilRef.current && !usingMockDetector) return;
      processingRef.current = true;

      if (cameraRef.current) {
        try {
          const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
          const detections = usingMockDetector
            ? [mockDetect()]
            : await detectAllFromBackend(photo.uri);
          setCurrentDetections(detections);
          setLastBackendError(null);
          consecutiveFailuresRef.current = 0;
          backendCooldownUntilRef.current = 0;
          lastLoggedErrorRef.current = null;
          const detection = detections[0] ?? null;
          if (!detection) return;
          setLast(detection);
          const isNavigating = activeRouteRef.current !== null;
          const isSpeakingNow = await Speech.isSpeakingAsync();
          if (isNavigating && isSpeakingNow) return;
          speakDetection(detection);
        } catch (error) {
          const uiMessage = describeDetectionBackendError(error);
          setLastBackendError(uiMessage);
          if (lastLoggedErrorRef.current !== uiMessage) {
            console.warn("Sign detection request failed", error);
            lastLoggedErrorRef.current = uiMessage;
          }
          consecutiveFailuresRef.current += 1;
          if (!USE_MOCK_DETECTOR && consecutiveFailuresRef.current >= 3) {
            backendCooldownUntilRef.current = Date.now() + 30000;
            setLastBackendError("Detection backend is failing repeatedly. Pausing requests for 30 seconds for diagnostics.");
            consecutiveFailuresRef.current = 0;
          }
        } finally {
          processingRef.current = false;
        }
      } else {
        processingRef.current = false;
      }
    }, 3000);
  }

  function stop() {
    setScanning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    processingRef.current = false;
    consecutiveFailuresRef.current = 0;
    backendCooldownUntilRef.current = 0;
    lastLoggedErrorRef.current = null;
    setLast(null);
    setCurrentDetections([]);
    setLastBackendError(null);
  }

  function repeatLast() {
    if (!last) return;
    speakDetection(last);
  }

  if (!permission) {
    return <ThemedView style={styles.container}><ThemedText>Loading...</ThemedText></ThemedView>;
  }

  if (!permission.granted) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: "#0d2140" }]}>
        <View style={styles.header}>
          <ThemedText type="title" style={{ color: "#ffffff" }}>
            Please Grant Camera Permission
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ImageBackground
      source={require("@/assets/images/background.png")}
      style={styles.container}
      resizeMode="cover"
    >
      <View style={styles.overlay}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <ThemedText style={styles.appName}>Sightline</ThemedText>
            <ThemedText style={styles.appSubtitle}>AUDIO NAVIGATION</ThemedText>
          </View>
        </View>

        {/* Scan button */}
        <Pressable
          style={[styles.button, scanning && styles.danger]}
          onPress={scanning ? stop : start}
          accessibilityRole="button"
          accessibilityLabel={scanning ? "Stop scanning" : "Start scanning"}
        >
          <ThemedText style={styles.buttonText}>
            {scanning ? "Stop Scanning" : "Start Scanning"}
          </ThemedText>
          <ThemedText style={styles.buttonSubtext}>
            {scanning ? "Tap to stop" : "Tap to detect signs"}
          </ThemedText>
        </Pressable>

        {/* Action cards */}
        <View style={styles.row}>
          <Pressable
            style={styles.actionCard}
            onPress={repeatLast}
            accessibilityRole="button"
            accessibilityLabel="Repeat last announcement"
          >
            <ThemedText style={styles.actionCardText}>Repeat Last</ThemedText>
          </Pressable>

          <Pressable
            style={[styles.actionCard, activeRoute ? styles.actionCardDanger : styles.actionCardAccent]}
            onPress={activeRoute ? endRoute : () => router.push("/navigate")}
            accessibilityRole="button"
            accessibilityLabel={activeRoute ? "End route" : "Start Navigation"}
          >
            <ThemedText style={styles.actionCardText}>
              {activeRoute ? "End Route" : "Navigate"}
            </ThemedText>
          </Pressable>
        </View>

        <View style={{ height: 0, width: 0, overflow: "hidden" }}>
          <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" zoom={0.5}/>
        </View>

      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    padding: 22,
    paddingTop:60,
    gap: 16,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  header: {
    alignItems: "center",
    paddingBottom: 10,
  },
  appName: {
    fontSize: 42,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: 6,
    paddingTop: 20
  },
  appSubtitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#90c0ff",
    letterSpacing: 3,
  },
  button: {
    paddingVertical: 130,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3a7cff",
    gap: 4,
    marginTop: -10
  },
  danger: {
    backgroundColor: palette.danger,
  },
  buttonText: {
    color: "white",
    fontSize: 22,
    fontWeight: "700",
  },
  buttonSubtext: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
  },
  row: {
    flexDirection: "row",
    gap: 14,
    flex: 1,
  },
  actionCard: {
    flex: 1,
    backgroundColor: "rgba(107,114,128,0.8)",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
  },
  actionCardAccent: {
    backgroundColor: "rgba(91,141,238,0.8)",
  },
  actionCardDanger: {
    backgroundColor: "rgba(248,113,113,0.8)",
  },
  actionCardText: {
    color: "white",
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },
});