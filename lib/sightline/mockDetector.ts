import { SIGN_LABELS } from "./signLabels";
import { Detection, SignType } from "./types";

const SIGNS: SignType[] = [
  "STOP",
  "EXIT",
  "YIELD",
  "PEDESTRIAN_CROSSING",
  "DO_NOT_ENTER",
  "ACCESSIBILITY",
  "DIRECTION_ARROW",
  "ROOM_NUMBER",
];

const DISTANCES = [
  "very close",
  "about 5 feet",
  "about 8 feet",
  "about 10 feet",
  "about 15 feet",
  "unknown",
] as const;

export function mockDetect(): Detection {
  const signType = SIGNS[Math.floor(Math.random() * SIGNS.length)];
  const meta = SIGN_LABELS[signType];

  return {
    id: `${Date.now()}`,
    signType,
    label: meta.label,
    meaning: meta.meaning,
    distance: DISTANCES[Math.floor(Math.random() * DISTANCES.length)],
    confidence: Math.random() * 0.4 + 0.6,
    createdAt: Date.now(),
  };
}
