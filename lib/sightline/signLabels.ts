import { SignType } from "./types";

export const SIGN_LABELS: Record<SignType, { label: string; meaning: string }> = {
  PEDESTRIAN_CROSSING: { label: "Pedestrian crossing sign", meaning: "Crosswalk ahead." },
  EXIT: { label: "EXIT sign", meaning: "Exit or doorway ahead." },
  EXIT_RIGHT: { label: "Exit Sign Right", meaning: "Exit on the right."},
  EXIT_LEFT: { label: "Exit Sign Left", meaning: "Exit on the left."},  EXIT_BOTH: { label: "Exit Sign Both", meaning: "Exit both ways."},
  WALK: { label: "Walk sign", meaning: "Safe to walk." },
  STOP: { label: "Stop sign", meaning: "Stop before proceeding." },
  TRAFFIC_LIGHT: { label: "Traffic light", meaning: "Traffic signal ahead." }
};
