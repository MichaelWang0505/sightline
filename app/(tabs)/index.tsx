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

const palette = {
  bgCard: "#050816",
  bgCardSoft: "#0B1220",
  accent: "#4C8DFF",
  accentSoft: "rgba(76, 141, 255, 0.12)",
  danger: "#F97066",
  border: "rgba(255,255,255,0.10)",
  borderSoft: "rgba(255,255,255,0.06)",
};

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
    ? "Keep your phone facing forward. SightLine will announce important signs ahead."
    : "Tap Start to begin listening for nearby signs.";

  return (
    <ThemedView style={styles.screen}>
      {/* Top app header */}
      <View style={styles.header}>
        <View style={styles.badge}>
          <ThemedText style={styles.badgeText}>SightLine</ThemedText>
        </View>
        <ThemedText style={styles.headerTitle} accessibilityRole="header">
          Sign Awareness
        </ThemedText>
        <ThemedText style={styles.headerSubtitle}>
          Real-time sign detection and distance for blind and low-vision users.
        </ThemedText>
      </View>

      {/* Status card */}
      <ThemedView style={styles.statusCard}>
        <ThemedText style={styles.statusLabel}>Status</ThemedText>
        <ThemedText style={styles.statusText}>{statusText}</ThemedText>
        <ThemedText style={styles.statusSub}>{statusSub}</ThemedText>

        <View style={styles.statusRow}>
          <Pill
            label={scanning ? "Active" : "Idle"}
            tone={scanning ? "success" : "neutral"}
          />
          <Pill label={`Verbosity: ${verbosity.toUpperCase()}`} tone="info" />
        </View>
      </ThemedView>

      {/* Primary action */}
      <View style={styles.actionsRow}>
        <PrimaryButton
          label={scanning ? "Stop scanning" : "Start scanning"}
          variant={scanning ? "danger" : "primary"}
          onPress={scanning ? stop : start}
          accessibilityLabel={
            scanning ? "Stop scanning for signs" : "Start scanning for signs"
          }
          accessibilityHint="SightLine will speak detected signs and their approximate distance."
        />
      </View>

      {/* Secondary action */}
      <PrimaryButton
        label="Repeat last announcement"
        variant="secondary"
        onPress={repeatLast}
        accessibilityLabel="Repeat the last spoken sign"
        accessibilityHint="Use if you missed the last announcement."
      />

      {/* Latest detection */}
      <ThemedView style={styles.card}>
        <ThemedText style={styles.cardTitle}>Latest detection</ThemedText>

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

      {/* Safety note */}
      <ThemedText style={styles.safety}>
        SightLine is an assistive tool and may miss signs or estimate distance
        imperfectly. Always rely on your cane, guide dog, or orientation skills
        for final safety decisions.
      </ThemedText>
    </ThemedView>
  );
}

/* ---------- Reusable bits ---------- */

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

/* ---------- Styles ---------- */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 16,
  },

  header: {
    gap: 8,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: palette.accentSoft,
    borderWidth: 1,
    borderColor: "rgba(76,141,255,0.6)",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
  },
  headerSubtitle: {
    fontSize: 14,
    opacity: 0.8,
    lineHeight: 20,
  },

  statusCard: {
    borderRadius: 22,
    padding: 18,
    gap: 8,
    backgroundColor: palette.bgCard,
    borderWidth: 1,
    borderColor: palette.border,
  },
  statusLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    opacity: 0.75,
    letterSpacing: 0.7,
  },
  statusText: {
    fontSize: 20,
    fontWeight: "700",
  },
  statusSub: {
    opacity: 0.8,
    lineHeight: 20,
  },
  statusRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    flexWrap: "wrap",
  },

  actionsRow: {
    flexDirection: "row",
  },

  card: {
    borderRadius: 22,
    padding: 18,
    gap: 8,
    backgroundColor: palette.bgCardSoft,
    borderWidth: 1,
    borderColor: palette.borderSoft,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    opacity: 0.9,
  },
  latestRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
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
    opacity: 0.65,
    fontSize: 12,
    marginTop: 4,
  },

  muted: {
    opacity: 0.75,
    lineHeight: 20,
  },
  safety: {
    opacity: 0.7,
    fontSize: 11,
    lineHeight: 17,
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
    backgroundColor: palette.accent,
  },
  button_secondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: palette.border,
  },
  button_danger: {
    backgroundColor: palette.danger,
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
    borderColor: "rgba(52,199,89,0.85)",
    backgroundColor: "rgba(52,199,89,0.08)",
  },
  pill_neutral: {
    borderColor: palette.borderSoft,
    backgroundColor: "transparent",
  },
  pill_info: {
    borderColor: "rgba(76,141,255,0.85)",
    backgroundColor: palette.accentSoft,
  },
  pillText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
