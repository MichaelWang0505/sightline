import polyline from "@mapbox/polyline";
import { Audio } from "expo-av";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import * as Speech from "expo-speech";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

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
  const [currentAnnouncedIndex, setCurrentAnnouncedIndex] = useState<number>(-1);
  const [isAnnouncing, setIsAnnouncing] = useState(false);

  const announceCycleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentIndexRef = useRef<number>(-1);
  const resultsRef = useRef<NominatimResult[]>([]);
  const isAnnouncingRef = useRef(false);

  useEffect(() => {
    Speech.speak("Hold the button and say where you want to go.");

    (async () => {
      await Audio.requestPermissionsAsync();

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.warn("Location permission denied");
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setUserLocation(loc);
    })();

    return () => {
      stopAnnouncementCycle();
    };
  }, []);

  function stopAnnouncementCycle() {
    if (announceCycleRef.current) {
      clearTimeout(announceCycleRef.current);
      announceCycleRef.current = null;
    }
    isAnnouncingRef.current = false;
    setIsAnnouncing(false);
    Speech.stop();
  }

  function announceNext(items: NominatimResult[], index: number) {
    if (!isAnnouncingRef.current || items.length === 0) return;

    const wrappedIndex = index % items.length;
    currentIndexRef.current = wrappedIndex;
    setCurrentAnnouncedIndex(wrappedIndex);

    const parts = items[wrappedIndex].display_name.split(",");
    const name = parts[0];
    const street = parts[2]?.trim() ?? "";
    const neighborhood = parts[3]?.trim() ?? "";
    const city = parts[4]?.trim() ?? "";
    const locationDetail = [street, neighborhood, city].filter(Boolean).join(", ");
    Speech.stop();
    Speech.speak(`Option ${wrappedIndex + 1}: ${name}${locationDetail ? `, ${locationDetail}` : ""}.`, {
      onDone: () => {
        if (!isAnnouncingRef.current) return;
        announceCycleRef.current = setTimeout(() => {
          announceNext(items, wrappedIndex + 1);
        }, 3000);
      },
    });
  }

  function startAnnouncementCycle(items: NominatimResult[]) {
    stopAnnouncementCycle();
    if (items.length === 0) {
      Speech.speak("No locations found. Please try again.");
      return;
    }
    isAnnouncingRef.current = true;
    setIsAnnouncing(true);
    resultsRef.current = items;
    announceNext(items, 0);
  }

  async function startListening() {
    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
      } catch (error) {
        console.warn("Failed to stop previous recording", error);
      }
      setRecording(null);
    }

    stopAnnouncementCycle();
    setResults([]);
    setQuery("");
    setCurrentAnnouncedIndex(-1);

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
      await handleSearch(spokenText);
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

  async function handleSearch(overrideQuery?: string) {
    const activeQuery = overrideQuery ?? query;
    if (!activeQuery || !userLocation) return;

    const { latitude, longitude } = userLocation.coords;
    const left = longitude - 0.1;
    const right = longitude + 0.1;
    const top = latitude + 0.1;
    const bottom = latitude - 0.1;

    const url =
      `https://nominatim.openstreetmap.org/search` +
      `?q=${encodeURIComponent(activeQuery)}` +
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
        Speech.speak("Search failed. Please try again.");
        return;
      }

      const data: unknown = await response.json();
      if (!Array.isArray(data)) {
        Speech.speak("No results found. Please try again.");
        return;
      }

      const filtered = data.filter(isNominatimResult);
      const sorted = filtered.sort((a, b) => {
        const distA = Math.sqrt(
          Math.pow(parseFloat(a.lat) - latitude, 2) +
          Math.pow(parseFloat(a.lon) - longitude, 2)
        );
        const distB = Math.sqrt(
          Math.pow(parseFloat(b.lat) - latitude, 2) +
          Math.pow(parseFloat(b.lon) - longitude, 2)
        );
        return distA - distB;
      });
      setResults(sorted);
      Speech.speak(`Searching for ${activeQuery}`, {
        onDone: () => startAnnouncementCycle(sorted),
      });
    } catch (error) {
      console.error("Search error:", error);
      Speech.speak("Search failed. Please try again.");
    }
  }

  function handleScreenTap() {
    if (!isAnnouncing || currentIndexRef.current < 0) return;
    const selected = resultsRef.current[currentIndexRef.current];
    if (selected) {
      stopAnnouncementCycle();
      selectLocation(selected);
    }
  }

  function getPrimaryRoute(data: unknown): PrimaryRoute | null {
    if (typeof data !== "object" || data === null) return null;

    const root = data as Record<string, unknown>;
    const routes = root.routes;
    if (Array.isArray(routes) && routes.length > 0) {
      const firstRoute = routes[0] as Record<string, unknown>;

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startLon, startLat, endLon, endLat }),
        timeoutMs: 10000,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Route backend error:", errorText);
        Speech.speak("Sorry, I could not find a route.");
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

      startRoute(item.display_name, steps);
      router.back();

    } catch (error) {
      console.error("Routing error:", error);
      Speech.speak("Sorry, something went wrong. Please try again.");
    } finally {
      setLoadingRoute(false);
    }
  }

  return (
    <ThemedView style={styles.container} pointerEvents="auto">
      <View style={styles.splitContainer}>

        {/* Hold to speak button */}
        <Pressable
          style={[styles.mic, listening && styles.micActive]}
          onPressIn={startListening}
          onPressOut={stopListening}
          accessibilityRole="button"
          accessibilityLabel={listening ? "Recording destination" : "Hold to record destination"}
          accessibilityHint="Hold to speak your destination, then release to search places"
        >
          <View style={[styles.micIcon, listening && styles.micIconActive]}>
            <ThemedText style={styles.micIconText}>🎙</ThemedText>
          </View>
          <ThemedText style={styles.micText}>
            {listening ? "Listening..." : "Hold to Speak"}
          </ThemedText>
          <ThemedText style={styles.micSubtext}>
            {listening ? "Release when done" : "Say your destination"}
          </ThemedText>
        </Pressable>

        {/* Options area */}
        {(isAnnouncing || loadingRoute) ? (
          <Pressable
            style={styles.tapArea}
            onPress={handleScreenTap}
            accessibilityRole="button"
            accessibilityLabel="Tap to select current location"
          >
            {loadingRoute ? (
              <ThemedText style={styles.tapAreaTitle}>Loading route...</ThemedText>
            ) : (
              <>
                <ThemedText style={styles.tapAreaTitle}>
                  {currentAnnouncedIndex >= 0 && results[currentAnnouncedIndex]
                    ? results[currentAnnouncedIndex].display_name.split(",")[0]
                    : "Listening..."}
                </ThemedText>
                <ThemedText style={styles.tapAreaHint}>
                  {currentAnnouncedIndex >= 0 && results[currentAnnouncedIndex]
                    ? [
                        results[currentAnnouncedIndex].display_name.split(",")[2]?.trim(),
                        results[currentAnnouncedIndex].display_name.split(",")[3]?.trim(),
                        results[currentAnnouncedIndex].display_name.split(",")[4]?.trim(),
                      ].filter(Boolean).join(", ")
                    : ""}
                </ThemedText>
                <View style={styles.tapPill}>
                  <ThemedText style={styles.tapPillText}>Tap to select</ThemedText>
                </View>
              </>
            )}
          </Pressable>
        ) : (
          <View style={styles.tapAreaPlaceholder} />
        )}

      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingBottom: 0,
    backgroundColor: "#ffffff",
  },
  splitContainer: {
    flex: 1,
    gap: 16,
    paddingBottom: 24,
  },
  mic: {
    borderRadius: 16,
    backgroundColor: "#f0f4ff",
    alignItems: "center",
    justifyContent: "center",
    height: "47%",
    gap: 10,
    borderWidth: 2,
    borderColor: "#c8d8f8",
  },
  micActive: {
    backgroundColor: "#ffe8e8",
    borderColor: "#ffb3b3",
  },
  micIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "#3a7cff",
    alignItems: "center",
    justifyContent: "center",
  },
  micIconActive: {
    borderColor: "#ff4444",
  },
  micIconText: {
    fontSize: 24,
  },
  micText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0d2140",
  },
  micSubtext: {
    fontSize: 13,
    color: "#3a7cff",
  },
  tapArea: {
    borderRadius: 16,
    backgroundColor: "#2d2f3e",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 10,
    height: "47%",
  },
  tapAreaTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#ffffff",
    textAlign: "center",
  },
  tapAreaHint: {
    fontSize: 14,
    color: "#a0c4ff",
    textAlign: "center",
  },
  tapPill: {
    marginTop: 6,
    backgroundColor: "#3a7cff",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 20,
  },
  tapPillText: {
    fontSize: 13,
    color: "#ffffff",
    fontWeight: "600",
  },
  tapAreaPlaceholder: {
    height: "47%",
  },
});