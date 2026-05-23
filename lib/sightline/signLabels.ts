import { SignType } from "./types";

export const SIGN_LABELS: Record<SignType, { label: string; meaning: string; omitDistance?: boolean; includeDirection?: boolean; includeMeaning?: boolean }> = {
  PEDESTRIAN_CROSSING: { label: "Crosswalk", meaning: "Crosswalk ahead." },
  SCHOOL_CROSSING: { label: "School crosswalk", meaning: "School crosswalk area ahead." },
  EXIT: { label: "EXIT sign", meaning: "Exit or doorway ahead.", includeDirection: true },
  EXIT_RIGHT: { label: "Exit sign on the right", meaning: "Exit on the right.", includeDirection: true },
  EXIT_LEFT: { label: "Exit sign on the left", meaning: "Exit on the left.", includeDirection: true },
  EXIT_BOTH: { label: "Exit sign both ways", meaning: "Exit both ways.", includeDirection: true },
  WALK_ON: { label: "Walk signal", meaning: "Cross now.", omitDistance: true, includeMeaning: true },
  WALK_OFF: { label: "Don't walk signal", meaning: "Do not cross.", omitDistance: true, includeMeaning: true },
};
