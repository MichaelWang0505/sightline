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
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

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
  const response = await fetch("http://10.0.0.174:3000/api/voice-query", {
    method: "POST",
    headers: {
      "Content-Type": "multipart/form-data",
    },
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
