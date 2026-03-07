import { Audio } from "expo-av";
import * as Location from "expo-location";
import * as Speech from "expo-speech";
import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

const ORS_API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImYzZTRlOGE3YmM0YTQ1MTZhYmY5YWQzZDU0YTAyZWE1IiwiaCI6Im11cm11cjY0In0=";

export default function NavigateScreen() {
  const [routeSteps, setRouteSteps] = useState<any[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [listening, setListening] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);

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


  async function selectLocation(item: any) {
    if (!userLocation) return;

    const startLat = userLocation.coords.latitude;
    const startLon = userLocation.coords.longitude;

    const endLat = parseFloat(item.lat);
    const endLon = parseFloat(item.lon);

    try {
      const res = await fetch(
        "https://api.openrouteservice.org/v2/directions/foot-walking",
        {
          method: "POST",
          headers: {
            "Authorization": ORS_API_KEY,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            coordinates: [
              [startLon, startLat],
              [endLon, endLat]
            ],
            instructions: true
          })
        }
      );

      const data = await res.json();
      console.log("ORS response:", data);

      if (!data.routes || data.routes.length === 0) {
        console.error("No route returned:", data);
        Speech.speak("Sorry, I could not find a route.");
        return;
      }

      const steps = data.routes[0].segments[0].steps;

      setRouteSteps(steps);
      setCurrentStep(0);

      Speech.speak("Starting navigation");

      if (steps.length > 0) {
        Speech.speak(steps[0].instruction);
      }

      startNavigation();
      //router.back();

    } catch (err) {
      console.error("Routing error:", err);
    }
  }

  const [watcher, setWatcher] = useState<Location.LocationSubscription | null>(null);

  async function startNavigation() {
    const sub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        distanceInterval: 5,
      },
      (location) => {
        checkNextStep(location);
      }
    );

    setWatcher(sub);
  }

  async function checkNextStep(location: any) {
    if (routeSteps.length === 0) return;

    const step = routeSteps[currentStep];
    if (!step) return;

    const instruction = step.instruction;

    const speaking = await Speech.isSpeakingAsync();

    if (!speaking) {
      Speech.speak(instruction);
      setCurrentStep((prev) => prev + 1);
    }
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
