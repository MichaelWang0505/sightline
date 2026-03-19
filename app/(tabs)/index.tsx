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
import { mockDetect } from "@/lib/sightline/mockDetector";
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
      const speaking = await Speech.isSpeakingAsync();
      if (speaking) return;
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
    setScanning(true);
    timerRef.current = setInterval(async () => {
      if (cameraRef.current) {
        await cameraRef.current.takePictureAsync({ base64: true, quality: 0.7 });
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

      {/* Header with logo */}
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

      {/* Two side-by-side action cards — flex:1 fills all remaining space */}
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