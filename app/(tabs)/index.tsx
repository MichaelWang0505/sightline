import * as Location from "expo-location";
import * as Speech from "expo-speech";
import { useEffect, useRef, useState } from "react";
import {
    Image,
    Pressable,
    StyleSheet,
    View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

import { useRouteSession } from "@/lib/route-session";
import { detectAllFromBackend } from "@/lib/sightline/backendDetector";
import { speakDetection } from "@/lib/sightline/speak";
import type { Detection, Verbosity } from "@/lib/sightline/types";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";

const palette = {
  bg: "#0F1220",
  card: "#0d2340",
  primary: "#3A7CFF",
  danger: "#D64545",
  secondary: "#2D2F3E",
  textLight: "#FFFFFF",
  textSub: "#C7CBDA",
  textDark: "#0d2340",
  accent: "#4ADE80",
};

export default function ScanScreen() {
  const router = useRouter();
  const { activeRoute, endRoute } = useRouteSession();

  const [scanning, setScanning] = useState(false);
  const [verbosity] = useState<Verbosity>("medium");
  const [last, setLast] = useState<Detection | null>(null);
  const [currentDetections, setCurrentDetections] = useState<Detection[]>([]);

  // Refs hold values that survive re-renders without triggering them
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const routeWatcherRef = useRef<Location.LocationSubscription | null>(null);
  const nextStepIndexRef = useRef(0);
  const lastInstructionAtRef = useRef(0);
  const activeRouteRef = useRef(activeRoute);
  const latestLocationRef = useRef<Location.LocationObject | null>(null);

  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    if (permission && !permission.granted) {
      requestPermission();
    }
  }, [permission]);

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

  function isTurnInstruction(instruction: string): boolean {
    const normalized = instruction.toLowerCase();
    return /(turn|left|right|slight|bear|u-turn|roundabout)/.test(normalized);
  }

  function isCrosswalkSignalDetection(detection: Detection): boolean {
    return detection.signType === "WALK" || detection.label === "Don't walk signal";
  }

  function shouldAnnounceCrosswalkAtTurn(): boolean {
    const route = activeRouteRef.current;
    if (!route) return false;

    const step = route.steps[nextStepIndexRef.current];
    if (!step) return false;
    if (!isTurnInstruction(step.instruction)) return false;

    if (!step.waypoint) return true;
    const latest = latestLocationRef.current;
    if (!latest) return false;

    const distToTurn = haversineMeters(
      latest.coords.latitude,
      latest.coords.longitude,
      step.waypoint.lat,
      step.waypoint.lon
    );

    // Only announce crosswalk signals when within 35m of the upcoming turn
    return distToTurn <= 35;
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
      const speaking = await Speech.isSpeakingAsync();
      if (speaking) return;
      const now = Date.now();
      // Don't repeat the same instruction within 3 seconds
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
        // Wait until within 25m of the waypoint before speaking the instruction
        if (dist > 25) return;
      }
      Speech.speak(step.instruction);
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
        { accuracy: Location.Accuracy.High, distanceInterval: 4, timeInterval: 2000 },
        (location) => {
          speakNextStep(location);
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
        try {
          const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
          const detections = await detectAllFromBackend(photo.uri);
          setCurrentDetections(detections);
          const detection = detections[0] ?? null;
          if (!detection) return;

          // Only announce crosswalk signals near upcoming turns when navigating
          if (activeRouteRef.current) {
            if (!shouldAnnounceCrosswalkAtTurn()) return;
            const crosswalkSignal = detections.find(isCrosswalkSignalDetection);
            if (!crosswalkSignal) return;
            setLast(crosswalkSignal);
            speakDetection(crosswalkSignal, verbosity);
            return;
          }

          setLast(detection);
          speakDetection(detection, verbosity);
        } catch (error) {
          console.warn("Sign detection request failed", error);
        }
      }
    }, 3000);
  }

  function stop() {
    setScanning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setLast(null);
    setCurrentDetections([]);
  }

  function repeatLast() {
    if (!last) return;

    speakDetection(last, verbosity);
  }

  if (!permission) {
    return <ThemedView style={styles.container}><ThemedText>Loading...</ThemedText></ThemedView>;
  }

  if (!permission.granted) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: "#ffffff" }]}>
        <View style={styles.header}>
          <ThemedText type="title" style={{ color: palette.textDark }}>
            Please Grant Camera Permission
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: "#ffffff" }]}>
      <View style={styles.header}>
        <Image
          source={require("@/assets/images/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Image
          source={require("@/assets/images/sightline-title.png")}
          style={styles.titleImage}
          resizeMode="contain"
        />
      </View>

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

      <ThemedView style={styles.card}>
        <ThemedText type="defaultSemiBold" style={{ color: palette.textLight }}>
          Scanner Status
        </ThemedText>
        <ThemedText style={{ color: palette.textLight }}>
          {currentDetections.length > 0
            ? currentDetections.map((d) => `${d.label} — ${d.distance}`).join(" | ")
            : "No detections yet."}
        </ThemedText>
      </ThemedView>

      <View style={styles.row}>
        <Pressable
          style={styles.actionCard}
          onPress={repeatLast}
          accessibilityRole="button"
          accessibilityLabel="Repeat last announcement"
        >
          <ThemedText style={styles.actionCardText}>
            Repeat Last Announcement
          </ThemedText>
        </Pressable>

        <Pressable
          style={styles.actionCard}
          onPress={activeRoute ? endRoute : () => router.push("/navigate")}
          accessibilityRole="button"
          accessibilityLabel={activeRoute ? "End route" : "Start Navigation"}
        >
          <ThemedText style={styles.actionCardText}>
            {activeRoute ? "End Route" : "Start Navigation"}
          </ThemedText>
        </Pressable>
      </View>

      {/* Camera is hidden off-screen so it can capture frames without showing a preview */}
      <View style={{ height: 0, width: 0, overflow: "hidden" }}>
        <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 22,
    gap: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 40,
    paddingBottom: 10,
    gap: -100,
  },
  logo: {
    width: 80,
    height: 80,
    marginTop: -15,
    borderRadius: 8,
  },
  card: {
    padding: 24,
    borderRadius: 18,
    backgroundColor: palette.card,
    gap: 8,
  },
  button: {
    paddingVertical: 70,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: palette.primary,
  },
  danger: {
    backgroundColor: palette.danger,
  },
  buttonText: {
    color: "white",
    fontSize: 20,
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    gap: 14,
    flex: 1,
  },
  actionCard: {
    flex: 1,
    backgroundColor: palette.secondary,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  actionCardText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  titleImage: {
    height: 80,
    width: 100,
    marginLeft: -90,
    flex: 1,
  },
});

