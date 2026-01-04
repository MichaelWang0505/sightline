import { useRef, useState } from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

import { mockDetect } from "@/lib/sightline/mockDetector";
import { speakDetection } from "@/lib/sightline/speak";
import type { Detection, Verbosity } from "@/lib/sightline/types";

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

  const statusText = scanning ? "Scanning for signs…" : "Scanner paused";
  const statusSub = scanning
    ? "Keep your phone pointed forward. SightLine will announce signs ahead."
    : "Tap Start to begin listening for nearby signs.";

  return (
    <ThemedView style={styles.screen}>
      {/* Hero / Header */}
      <View style={styles.hero}>
        <ThemedText type="title">SightLine</ThemedText>
        <ThemedText type="subtitle" style={styles.heroSubtitle}>
          Real-time sign awareness for blind and low-vision users.
        </ThemedText>
      </View>

      {/* Status card */}
      <ThemedView style={styles.statusCard}>
        <ThemedText type="defaultSemiBold" style={styles.statusLabel}>
          Status
        </ThemedText>
        <ThemedText style={styles.statusText}>{statusText}</ThemedText>
        <ThemedText style={styles.statusSub}>{statusSub}</ThemedText>

        <View style={styles.statusRow}>
          <Pill
            label={scanning ? "Active" : "Idle"}
            tone={scanning ? "success" : "neutral"}
          />
          <Pill
            label={`Verbosity: ${verbosity.toUpperCase()}`}
            tone="neutral"
          />
        </View>
      </ThemedView>

      {/* Primary actions */}
      <View style={styles.actionsRow}>
        <PrimaryButton
          label={scanning ? "Stop scanning" : "Start scanning"}
          variant={scanning ? "danger" : "primary"}
          onPress={scanning ? stop : start}
          accessibilityLabel={
            scanning
              ? "Stop scanning for signs"
              : "Start scanning for nearby signs"
          }
          accessibilityHint="SightLine will announce important signs and approximate distance."
        />
      </View>

      <PrimaryButton
        label="Repeat last announcement"
        variant="secondary"
        onPress={repeatLast}
        accessibilityLabel="Repeat the last sign announcement"
        accessibilityHint="Use if you missed or didn’t hear the last announcement clearly."
      />

      {/* Latest detection card */}
      <ThemedView style={styles.card}>
        <ThemedText type="defaultSemiBold">Latest detection</ThemedText>

        {last ? (
          <>
            <View style={styles.latestRow}>
              <ThemedText style={styles.latestLabel}>
                {last.label}
              </ThemedText>
              <Pill label={last.distance} tone="info" />
            </View>

            {last.meaning ? (
              <ThemedText style={styles.latestMeaning}>
                {last.meaning}
              </ThemedText>
            ) : null}

            <ThemedText style={styles.latestMeta}>
              Confidence {Math.round(last.confidence * 100)}% •{" "}
              {new Date(last.createdAt).toLocaleTimeString()}
            </ThemedText>
          </>
        ) : (
          <ThemedText style={styles.muted}>
            No detections yet. When a supported sign is found, its type and
            distance will appear here.
          </ThemedText>
        )}
      </ThemedView>

      {/* Safety / accessibility note */}
      <ThemedText style={styles.safety}>
        SightLine is an assistive tool and may miss signs or estimate distance
        imperfectly. Always prioritize your cane, guide dog, or orientation
        skills for safety.
      </ThemedText>
    </ThemedView>
  );
}

/* --- Reusable Components --- */

type PillProps = {
  label: string;
  tone?: "success" | "neutral" | "info";
  style?: StyleProp<ViewStyle>;
};

function Pill({ label, tone = "neutral", style }: PillProps) {
  return (
    <View style={[styles.pill, styles[`pill_${tone}` as const], style]}>
      <ThemedText style={styles.pillText}>{label}</ThemedText>
    </View>
  );
}

type PrimaryButtonProps = {
  label: string;
  variant?: "primary" | "secondary" | "danger";
  onPress: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

function PrimaryButton({
  label,
  variant = "primary",
  onPress,
  accessibilityLabel,
  accessibilityHint,
}: PrimaryButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.buttonBase,
        styles[`button_${variant}` as const],
        pressed && styles.buttonPressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
    >
      <ThemedText style={styles.buttonText}>{label}</ThemedText>
    </Pressable>
  );
}

/* --- Styles --- */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
    gap: 16,
  },
  hero: {
    gap: 4,
  },
  heroSubtitle: {
    opacity: 0.8,
    lineHeight: 20,
  },

  statusCard: {
    borderRadius: 20,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  statusLabel: {
    opacity: 0.85,
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  statusText: {
    fontSize: 20,
    fontWeight: "700",
  },
  statusSub: {
    opacity: 0.75,
    lineHeight: 20,
  },
  statusRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    flexWrap: "wrap",
  },

  actionsRow: {
    flexDirection: "row",
  },

  card: {
    borderRadius: 20,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  latestRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  latestLabel: {
    fontSize: 18,
    fontWeight: "700",
    flexShrink: 1,
  },
  latestMeaning: {
    opacity: 0.9,
    lineHeight: 20,
  },
  latestMeta: {
    opacity: 0.7,
    fontSize: 13,
    marginTop: 4,
  },

  muted: {
    opacity: 0.7,
    lineHeight: 20,
  },
  safety: {
    opacity: 0.7,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },

  /* Buttons */
  buttonBase: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  button_primary: {
    backgroundColor: "#2E6BFF",
  },
  button_secondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
  },
  button_danger: {
    backgroundColor: "#C83B3B",
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "700",
  },

  /* Pills */
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  pill_success: {
    borderColor: "rgba(52,199,89,0.8)",
  },
  pill_neutral: {
    borderColor: "rgba(255,255,255,0.30)",
  },
  pill_info: {
    borderColor: "rgba(88,172,255,0.9)",
  },
  pillText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
