import { Audio } from "expo-av";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import * as Speech from "expo-speech";
import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { type RouteStep, useRouteSession } from "@/lib/route-session";

export default function NavigateScreen() {
  const router = useRouter();
  const { startRoute } = useRouteSession();

  const [listening, setListening] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);


  // Ask for mic + location permission
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

  //listens to user audio input
  async function startListening() {
  // Prevent double recordings
  if (recording) {
    try {
      await recording.stopAndUnloadAsync();
    } catch {}
    setRecording(null);
  }

  setListening(true);
  setResults([]);

  const { status } = await Audio.requestPermissionsAsync();
  if (status !== "granted") {
    console.warn("Mic permission denied");
    return;
  }

  //required for iOS
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });

  const rec = new Audio.Recording();
  await rec.prepareToRecordAsync({
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

  await rec.startAsync();
  setRecording(rec);
}



async function stopListening() {
  setListening(false);

  if (!recording) return;

  await recording.stopAndUnloadAsync();
  const uri = recording.getURI();
  console.log("Recording URI:", uri);

  setRecording(null);

  //send audio to backend
  const text = await sendAudioToBackend(uri!);
  setQuery(text);

  //searches places with inputted text
  await searchPlaces(text);
}

async function sendAudioToBackend(uri: string) {
  const formData = new FormData();
  formData.append("audio", {
    uri,
    name: "audio.m4a",
    type: "audio/m4a",
  } as any);
  console.log("Sending audio to backend:", uri);
  const response = await fetch("https://python-backend-i8iy.onrender.com/voice_input", {
    method: "POST",
    body: formData,
  });

  const data = await response.json();
  console.log("Backend response:", data);
  return data.text;
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
      const res = await fetch("https://python-backend-i8iy.onrender.com/api/route", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
            startLon,
            startLat,
            endLon,
            endLat,
            geometry_format: "geojson",
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Route Backend Error: ", errorText);
        return;
      }

      const data = await res.json();
      console.log("ORS response:", data);

      if (!data.routes || data.routes.length === 0) {
        console.error("No route returned:", data);
        Speech.speak("Sorry, I could not find a route.");
        return;
      }

      const geometry = data.routes?.[0]?.geometry;
      const coords: [number, number][] = Array.isArray(geometry?.coordinates)
        ? geometry.coordinates
        : [];

      const steps: RouteStep[] = (data.routes?.[0]?.segments?.[0]?.steps ?? [])
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

    } catch (err) {
      console.error("Routing error:", err);
    }
  }

  return (
    <ThemedView style={styles.container} pointerEvents="auto">


      <Pressable
        style={[styles.mic, listening && styles.active]}
        onPressIn={() => {
          console.log("PRESS IN");
          startListening();
        }}
        onPressOut={() => {
        console.log("PRESS OUT");
        stopListening();
        }}
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
