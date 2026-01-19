import * as Speech from "expo-speech";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

// Color palette for the app
const palette = {
  bg: "#0F1220",
  card: "#191C2B",
  primary: "#3A7CFF",
  secondary: "#2D2F3E",
  textLight: "#FFFFFF",
  textSub: "#C7CBDA",
  border: "rgba(255,255,255,0.12)",
};

export default function NavigateScreen() {
  const [destination, setDestination] = useState("");

  // Function to speak text using the device's TTS
  const speak = (text: string) => {
    Speech.speak(text, {
      language: "en-US",
      pitch: 1,
      rate: 1,
    });
  };

  // Handle the start of navigation
  const handleStart = () => {
    const trimmed = destination.trim();
    if (!trimmed) {
      speak("Please enter where you want to go.");
      return;
    }
    speak(`Starting guidance to ${trimmed}. Navigation will update as you move.`);
  };

  return (
    <ThemedView style={styles.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <ThemedText type="title" style={styles.headerTitle}>
            Navigation
          </ThemedText>
          <ThemedText style={styles.headerSub}>
            Tell SightLine where you want to go. We’ll use this in combination with detected signs and landmarks.
          </ThemedText>
        </View>

        {/* Input Card */}
        <ThemedView style={styles.card}>
          <ThemedText style={styles.label}>Destination</ThemedText>
          <TextInput
            value={destination}
            onChangeText={setDestination}
            placeholder="Example: main entrance, room 204, cafeteria"
            placeholderTextColor="rgba(199,203,218,0.7)"
            style={styles.input}
            returnKeyType="done"
            onSubmitEditing={handleStart}
            accessibilityLabel="Destination"
            accessibilityHint="Type where you want to go, then press the Start navigation button."
          />
          <ThemedText style={styles.helper}>
            Use short, simple phrases like “front desk”, “bus stop”, or “elevator lobby”. A screen reader will announce the field and the button below.
          </ThemedText>
        </ThemedView>

        {/* Start Navigation Button */}
        <Pressable
          style={styles.button}
          onPress={handleStart}
          accessibilityRole="button"
          accessibilityLabel="Start navigation"
          accessibilityHint="SightLine will confirm your destination and begin guidance."
        >
          <ThemedText style={styles.buttonText}>Start Navigation</ThemedText>
        </Pressable>

        {/* Safety Note */}
        <ThemedText style={styles.safety}>
          Navigation is an assistive aid and may be imperfect. Always confirm your surroundings with your cane, guide dog, or orientation skills.
        </ThemedText>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 22,
    gap: 16,
  },
  header: {
    gap: 6,
    marginBottom: 8,
  },
  headerTitle: {
    color: palette.textLight,
  },
  headerSub: {
    color: palette.textSub,
    lineHeight: 20,
  },
  card: {
    backgroundColor: palette.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 10,
  },
  label: {
    color: palette.textLight,
    fontWeight: "600",
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: palette.secondary,
    color: palette.textLight,
    fontSize: 16,
  },
  helper: {
    color: palette.textSub,
    fontSize: 12,
    lineHeight: 18,
  },
  button: {
    marginTop: 18,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    backgroundColor: palette.primary,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  safety: {
    marginTop: 12,
    color: palette.textSub,
    fontSize: 11,
    lineHeight: 17,
  },
});