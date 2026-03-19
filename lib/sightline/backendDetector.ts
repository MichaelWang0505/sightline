import { API_ENDPOINTS } from "@/constants/api";
import { fetchWithTimeout } from "@/lib/network";
import { SIGN_LABELS } from "./signLabels";
import type { Detection, SignType } from "./types";

type BackendSign = {
  detected: boolean;
  direction: string;
  distance: number;
};

type BackendSignsResponse = Record<string, BackendSign>;

type Mapping = {
  signType: SignType;
  label: string;
  meaning?: string;
};

type RankedDetection = Detection & {
  sortDistance: number;
};

// Maps backend sign key strings to Detection fields
const SIGN_MAP: Record<string, Mapping> = {
  exit_sign: {
    signType: "EXIT",
    label: SIGN_LABELS.EXIT.label,
    meaning: SIGN_LABELS.EXIT.meaning,
  },
  exit_right: {
    signType: "EXIT_RIGHT",
    label: SIGN_LABELS.EXIT_RIGHT.label,
    meaning: SIGN_LABELS.EXIT_RIGHT.meaning,
  },
  exit_left: {
    signType: "EXIT_LEFT",
    label: SIGN_LABELS.EXIT_LEFT.label,
    meaning: SIGN_LABELS.EXIT_LEFT.meaning,
  },
  exit_both_ways: {
    signType: "EXIT_BOTH",
    label: SIGN_LABELS.EXIT_BOTH.label,
    meaning: SIGN_LABELS.EXIT_BOTH.meaning,
  },
  crosswalk: {
    signType: "PEDESTRIAN_CROSSING",
    label: "Crosswalk",
    meaning: "Crosswalk ahead.",
  },
  school_crosswalk: {
    signType: "PEDESTRIAN_CROSSING",
    label: "School crosswalk",
    meaning: "School crosswalk area ahead.",
  },
  walk_on: {
    signType: "WALK",
    label: "Walk signal",
    meaning: "Walk signal is on.",
  },
  walk_off: {
    signType: "STOP",
    label: "Don't walk signal",
    meaning: "Wait. Do not cross now.",
  },
};

function distanceToPhrase(distance: number): Detection["distance"] {
  if (!Number.isFinite(distance)) return "unknown";
  const feet = distance * 3.28084;

  if (feet <= 3) return "very close";
  if (feet <= 6.5) return "about 5 feet";
  if (feet <= 9) return "about 8 feet";
  if (feet <= 12.5) return "about 10 feet";
  return "about 15 feet";
}

function isRankedDetection(value: RankedDetection | null): value is RankedDetection {
  return value !== null;
}

function mapEntryToRankedDetection(
  signKey: string,
  signData: BackendSign,
  index: number,
  now: number
): RankedDetection | null {
  const mapped = SIGN_MAP[signKey];
  if (!mapped) return null;

  const base: Detection = {
    id: `${now}-${index}`,
    signType: mapped.signType,
    label: mapped.label,
    distance: distanceToPhrase(signData.distance),
    confidence: 1,
    createdAt: now,
  };

  if (mapped.meaning) {
    base.meaning = mapped.meaning;
  }

  return {
    ...base,
    sortDistance: signData.distance,
  };
}

function parseDetections(payload: BackendSignsResponse): Detection[] {
  const now = Date.now();

  return Object.entries(payload)
    .filter(([, signData]) => signData?.detected && typeof signData.distance === "number")
    .map(([signKey, signData], index) => mapEntryToRankedDetection(signKey, signData, index, now))
    .filter(isRankedDetection)
    .sort((a, b) => a.sortDistance - b.sortDistance)
    // Stripping the sortDistance field before returning final Detection objects
    .map(({ sortDistance, ...detection }) => detection);
}

function guessMimeType(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".heic")) return "image/heic";
  return "image/jpeg";
}

function isBackendSign(value: unknown): value is BackendSign {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.detected === "boolean" &&
    typeof item.direction === "string" &&
    typeof item.distance === "number"
  );
}

function isBackendSignsResponse(value: unknown): value is BackendSignsResponse {
  if (typeof value !== "object" || value === null) return false;
  return Object.values(value).every(isBackendSign);
}

async function buildImageFormData(imageUri: string): Promise<FormData> {
  const formData = new FormData();
  const fileName = imageUri.split("/").pop() || "frame.jpg";

  try {
    // Fetching the image as a Blob for web compatibility
    const imageResponse = await fetch(imageUri);
    const imageBlob = await imageResponse.blob();
    formData.append("image", imageBlob, fileName);
    return formData;
  } catch {
    // Falling back to the React Native file URI object if Blob fetch fails
  }

  formData.append(
    "image",
    {
      uri: imageUri,
      name: fileName,
      type: guessMimeType(fileName),
    } as unknown as Blob
  );

  return formData;
}

async function requestSignsPayload(imageUri: string): Promise<BackendSignsResponse> {
  const formData = await buildImageFormData(imageUri);

  const response = await fetchWithTimeout(API_ENDPOINTS.signs, {
    method: "POST",
    body: formData,
    timeoutMs: 10000,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Sign detection failed (${response.status}): ${errorText}`);
  }

  const payload: unknown = await response.json();
  if (!isBackendSignsResponse(payload)) {
    throw new Error("Sign detection response shape was invalid");
  }

  return payload;
}

export async function detectFromBackend(imageUri: string): Promise<Detection | null> {
  const payload = await requestSignsPayload(imageUri);
  const detections = parseDetections(payload);

  return detections[0] ?? null;
}

export async function detectAllFromBackend(imageUri: string): Promise<Detection[]> {
  const payload = await requestSignsPayload(imageUri);

  return parseDetections(payload);
}
