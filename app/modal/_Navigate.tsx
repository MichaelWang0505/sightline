import { Audio } from "expo-av";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

export default function NavigateScreen() {
  const [listening, setListening] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);

  // Ask for mic permission
  useEffect(() => {
    Audio.requestPermissionsAsync();
  }, []);

  // Press-and-hold simulation
  function startListening() {
    setListening(true);
    setResults([]); // clear previous results
  }

  async function stopListening() {
    setListening(false);

    // 🔴 TEMP: simulate speech (replace with real speech later)
    const spokenText = "library";
    setQuery(spokenText);

    await searchPlaces(spokenText);
  }

  async function searchPlaces(text: string) {
    const url =
      `https://nominatim.openstreetmap.org/search` +
      `?q=${encodeURIComponent(text)}` +
      `&format=json&addressdetails=1&limit=5`;

    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Expo-App",
        },
      });

      const data = await res.json();
      if (Array.isArray(data)) {
        setResults(data);
      } else {
        console.warn("Unexpected response format:", data);
        setResults([]);
      }
    } catch (err) {
      console.error("Failed to fetch locations:", err);
      setResults([]);
    }
  }

  function selectLocation(item: any) {
    console.log("Selected location:", item.display_name);
    router.back(); // close window
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Navigate</ThemedText>

      <Pressable
        style={[styles.mic, listening && styles.active]}
        onPressIn={startListening}
        onPressOut={stopListening}
      >
        <ThemedText>
          {listening ? "Listening..." : "Hold to Speak"}
        </ThemedText>
      </Pressable>

      {query !== "" && (
        <ThemedText>Searching for: "{query}"</ThemedText>
      )}

      <FlatList
        data={results}
        keyExtractor={(item) => item.place_id.toString()}
        renderItem={({ item }) => (
          <Pressable
            style={styles.item}
            onPress={() => selectLocation(item)}
          >
            <ThemedText>{item.display_name}</ThemedText>
          </Pressable>
        )}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  mic: {
    marginVertical: 20,
    padding: 20,
    borderRadius: 12,
    backgroundColor: "#ddd",
    alignItems: "center",
  },
  active: { backgroundColor: "#ffcccc" },
  item: {
    padding: 15,
    borderBottomWidth: 1,
    borderColor: "#ccc",
  },
});
