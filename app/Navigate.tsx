import { Audio } from "expo-av";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

export default function NavigateScreen() {
  const [listening, setListening] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [userLocation, setUserLocation] =
    useState<Location.LocationObject | null>(null);

  // Ask for mic + location permission
  useEffect(() => {
    (async () => {
      await Audio.requestPermissionsAsync();

      const { status } =
        await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.warn("Location permission denied");
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setUserLocation(loc);
    })();
  }, []);

  function startListening() {
    setListening(true);
    setResults([]);
  }

  async function stopListening() {
    setListening(false);

    // TEMP simulated speech
    const spokenText = "library";
    setQuery(spokenText);

    await searchPlaces(spokenText);
  }

  async function searchPlaces(text: string) {
  if (!userLocation) return;

  const { latitude, longitude } = userLocation.coords;

  // ~10km box around user
  const left = longitude - 0.1;
  const right = longitude + 0.1;
  const top = latitude + 0.1;
  const bottom = latitude - 0.1;

  const url =
    `https://nominatim.openstreetmap.org/search` +
    `?q=${encodeURIComponent(text)}` +
    `&format=json&addressdetails=1&limit=5` +
    `&viewbox=${left},${top},${right},${bottom}` +
    `&bounded=1`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Expo-App",
      },
    });

    const raw = await res.text();
    const data = JSON.parse(raw);

    setResults(Array.isArray(data) ? data : []);
  } catch (err) {
    console.error("Nominatim error:", err);
    setResults([]);
  }
}


  function selectLocation(item: any) {
    console.log("Selected:", item.display_name);
    router.back();
  }

  return (
    <ThemedView style={styles.container}>

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
