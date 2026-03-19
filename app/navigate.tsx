import { Audio } from "expo-av";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import * as Speech from "expo-speech";
import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { type RouteStep, useRouteSession } from "@/lib/route-session";

const VOICE_INPUT_URL = "https://python-backend-i8iy.onrender.com/voice_input";
const ROUTE_URL = "https://python-backend-i8iy.onrender.com/api/route";

export default function NavigateScreen() {
  const router = useRouter();
  const { startRoute } = useRouteSession();

  const [listening, setListening] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

  useEffect(() => {
    Speech.speak("Hold the button and say where you want to go.");

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

  async function startListening() {
    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
      } catch {
      }
      setRecording(null);
    }

    setListening(true);
    setResults([]);

    const { status } = await Audio.requestPermissionsAsync();
    if (status !== "granted") {
      console.warn("Mic permission denied");
      return;
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const newRecording = new Audio.Recording();
    await newRecording.prepareToRecordAsync({
      android: {
        extension: ".m4a",
        outputFormat: Audio.AndroidOutputFormat.MPEG_4,
        audioEncoder: Audio.AndroidAudioEncoder.AAC,
        sampleRate: 44100,
        numberOfChannels: 2,
        bitRate: 128000,
      },
      ios: {
        extension: ".m4a",
        audioQuality: Audio.IOSAudioQuality.HIGH,
        sampleRate: 44100,
        numberOfChannels: 1,
        bitRate: 128000,
        outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
      },
      web: {
        mimeType: "audio/webm",
        bitsPerSecond: 128000,
      },
    });

    await newRecording.startAsync();
    setRecording(newRecording);
  }

  async function stopListening() {
    setListening(false);

    if (!recording) return;

    await recording.stopAndUnloadAsync();
    const recordingUri = recording.getURI();
    setRecording(null);

    if (!recordingUri) return;

    const spokenText = await sendAudioToBackend(recordingUri);
    setQuery(spokenText);
    await searchPlaces(spokenText);
  }

  async function sendAudioToBackend(uri: string) {
    const formData = new FormData();
    formData.append("audio", {
      uri,
      name: "audio.m4a",
      type: "audio/m4a",
    } as any);

    const response = await fetch(VOICE_INPUT_URL, {
      method: "POST",
      body: formData,
    });
    const data = await response.json();

    return data.text;
  }

  async function searchPlaces(text: string) {
    if (!userLocation) return;

    const { latitude, longitude } = userLocation.coords;
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
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Expo-App",
        },
      });

      const raw = await response.text();
      const data = JSON.parse(raw);
      setResults(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Nominatim error:", error);
      setResults([]);
    }
  }

  function getPrimaryRoute(data: any) {
    if (Array.isArray(data?.routes) && data.routes.length > 0) {
      return {
        geometry: data.routes[0].geometry,
        segments: data.routes[0].segments,
      };
    }

    if (Array.isArray(data?.features) && data.features.length > 0) {
      const firstFeature = data.features[0];
      return {
        geometry: firstFeature?.geometry,
        segments: firstFeature?.properties?.segments,
      };
    }

    return null;
  }

  async function selectLocation(item: any) {
    if (!userLocation) return;

    const startLat = userLocation.coords.latitude;
    const startLon = userLocation.coords.longitude;

    const endLat = parseFloat(item.lat);
    const endLon = parseFloat(item.lon);

    try {
      const response = await fetch(ROUTE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startLon,
          startLat,
          endLon,
          endLat,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Route backend error:", errorText);
        return;
      }

      const data = await response.json();
      const route = getPrimaryRoute(data);
      if (!route) {
        console.error("No route returned:", data);
        Speech.speak("Sorry, I could not find a route.");
        return;
      }

      const coords: [number, number][] = Array.isArray(route.geometry?.coordinates)
        ? route.geometry.coordinates
        : [];

      const steps: RouteStep[] = (route.segments?.[0]?.steps ?? [])
        .map((step: any) => {
          const wpIndex: number = step?.way_points?.[0] ?? -1;
          const coord = wpIndex >= 0 ? coords[wpIndex] : undefined;
          return {
            instruction: String(step?.instruction ?? ""),
            distance: typeof step?.distance === "number" ? step.distance : undefined,
            waypoint: coord ? { lat: coord[1], lon: coord[0] } : undefined,
          };
        })
        .filter((step: RouteStep) => step.instruction.length > 0);

      Speech.speak("Starting navigation");
      startRoute(item.display_name, steps);
      router.back();

    } catch (error) {
      console.error("Routing error:", error);
    }
  }

  return (
    <ThemedView style={styles.container} pointerEvents="auto">
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
          <Pressable style={styles.item} onPress={() => selectLocation(item)}>
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
