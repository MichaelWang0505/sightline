import polyline from "@mapbox/polyline";
import { Audio } from "expo-av";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import * as Speech from "expo-speech";
import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { API_ENDPOINTS } from "@/constants/api";
import { AppPalette } from "@/constants/theme";
import { fetchWithTimeout } from "@/lib/network";
import { type RouteStep, useRouteSession } from "@/lib/route-session";

const palette = AppPalette.light;

type NominatimResult = {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
};

type RouteBackendStep = {
  instruction?: string;
  distance?: number;
  way_points?: number[];
};

type RouteGeometry = {
  coordinates?: [number, number][];
};

type PrimaryRoute = {
  geometry?: RouteGeometry;
  segments?: { steps?: RouteBackendStep[] }[];
};

function isNominatimResult(value: unknown): value is NominatimResult {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.place_id === "number" &&
    typeof row.lat === "string" &&
    typeof row.lon === "string" &&
    typeof row.display_name === "string"
  );
}

function isPrimaryRoute(value: unknown): value is PrimaryRoute {
  if (typeof value !== "object" || value === null) return false;
  const route = value as Record<string, unknown>;
  if (!route.geometry || typeof route.geometry !== "object") return false;
  if (!Array.isArray(route.segments)) return true;
  return true;
}

export default function NavigateScreen() {
  const router = useRouter();
  const { startRoute } = useRouteSession();

  const [listening, setListening] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loadingRoute, setLoadingRoute] = useState(false);
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
      } catch (error) {
        console.warn("Failed to stop previous recording", error);
      }
      setRecording(null);
    }

    setResults([]);

    const { status } = await Audio.requestPermissionsAsync();
    if (status !== "granted") {
      console.warn("Mic permission denied");
      setListening(false);
      return;
    }

    setListening(true);

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

    try {
      const spokenText = await sendAudioToBackend(recordingUri);
      setQuery(spokenText);
      await searchPlaces(spokenText);
    } catch (error) {
      console.error("Voice input error:", error);
      Speech.speak("Sorry, I couldn't understand that. Please try again.");
    }
  }

  async function sendAudioToBackend(uri: string) {
    const formData = new FormData();
    formData.append("audio", {
      uri,
      name: "audio.m4a",
      type: "audio/m4a",
    } as unknown as Blob);

    const response = await fetchWithTimeout(API_ENDPOINTS.voiceInput, {
      method: "POST",
      body: formData,
      timeoutMs: 30000,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Voice input failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    if (typeof data?.text !== "string") {
      throw new Error("Voice input response missing text");
    }

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
      const response = await fetchWithTimeout(url, {
        headers: {
          "User-Agent": "SightlineApp/1.0 (TSA Software Development)",
        },
        timeoutMs: 10000,
      });

      if (!response.ok) {
        console.error(`Nominatim failed (${response.status})`);
        setResults([]);
        return;
      }

      const data: unknown = await response.json();
      if (!Array.isArray(data)) {
        setResults([]);
        return;
      }

      setResults(data.filter(isNominatimResult));
    } catch (error) {
      console.error("Nominatim error:", error);
      setResults([]);
    }
  }

  function getPrimaryRoute(data: unknown): PrimaryRoute | null {
    if (typeof data !== "object" || data === null) return null;

    const root = data as Record<string, unknown>;
    const routes = root.routes;
    if (Array.isArray(routes) && routes.length > 0) {
      const firstRoute = routes[0] as Record<string, unknown>;

      // Decode polyline string into coordinate array if needed
      let geometry = firstRoute.geometry;
      if (typeof geometry === "string") {
        const decoded = polyline.decode(geometry);
        geometry = { coordinates: decoded.map(([lat, lng]) => [lng, lat] as [number, number]) };
      }

      const route = {
        geometry,
        segments: firstRoute.segments,
      };
      return isPrimaryRoute(route) ? route : null;
    }

    // Falling back to GeoJSON feature collection format
    const features = root.features;
    if (Array.isArray(features) && features.length > 0) {
      const firstFeature = features[0] as Record<string, unknown>;
      const firstFeatureProps =
        typeof firstFeature.properties === "object" && firstFeature.properties !== null
          ? (firstFeature.properties as Record<string, unknown>)
          : undefined;

      const route = {
        geometry: firstFeature.geometry,
        segments: firstFeatureProps?.segments,
      };
      return isPrimaryRoute(route) ? route : null;
    }

    return null;
  }

  async function selectLocation(item: NominatimResult) {
    if (!userLocation) return;

    const startLat = userLocation.coords.latitude;
    const startLon = userLocation.coords.longitude;

    const endLat = parseFloat(item.lat);
    const endLon = parseFloat(item.lon);
    if (!Number.isFinite(endLat) || !Number.isFinite(endLon)) {
      console.error("Invalid destination coordinates", { lat: item.lat, lon: item.lon });
      return;
    }

    try {
      setLoadingRoute(true);
      const response = await fetchWithTimeout(API_ENDPOINTS.route, {
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
        timeoutMs: 10000,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Route backend error:", errorText);
        return;
      }

      const data: unknown = await response.json();
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
        .map((step: RouteBackendStep) => {
          const wpIndex: number = step.way_points?.[0] ?? -1;
          const coord = wpIndex >= 0 ? coords[wpIndex] : undefined;
          return {
            instruction: typeof step.instruction === "string" ? step.instruction : "",
            distance: typeof step.distance === "number" ? step.distance : undefined,
            waypoint: coord ? { lat: coord[1], lon: coord[0] } : undefined,
          };
        })
        .filter((step: RouteStep) => step.instruction.length > 0);

      Speech.speak("Starting navigation");
      startRoute(item.display_name, steps);
      router.back();

    } catch (error) {
      console.error("Routing error:", error);
    } finally {
      setLoadingRoute(false);
    }
  }

  return (
    <ThemedView style={styles.container} pointerEvents="auto">
      <Pressable
        style={[styles.mic, listening && styles.active]}
        onPressIn={startListening}
        onPressOut={stopListening}
        accessibilityRole="button"
        accessibilityLabel={listening ? "Recording destination" : "Hold to record destination"}
        accessibilityHint="Hold to speak your destination, then release to search places"
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
            disabled={loadingRoute}
            accessibilityRole="button"
            accessibilityLabel={`Navigate to ${item.display_name}`}
            accessibilityHint="Starts walking navigation to this destination"
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
    backgroundColor: palette.navMicIdle,
    alignItems: "center",
  },
  active: { backgroundColor: palette.navMicActive },
  item: {
    padding: 15,
    borderBottomWidth: 1,
    borderColor: palette.navDivider,
  },
});