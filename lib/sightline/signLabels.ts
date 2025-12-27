import { SignType } from "./types";

export const SIGN_LABELS: Record<SignType, { label: string; meaning: string }> = {
  STOP: { label: "STOP sign", meaning: "Intersection ahead. Come to a full stop." },
  PEDESTRIAN_CROSSING: { label: "Pedestrian crossing sign", meaning: "Crosswalk ahead." },
  YIELD: { label: "YIELD sign", meaning: "Slow down and yield to traffic." },
  DO_NOT_ENTER: { label: "DO NOT ENTER sign", meaning: "Wrong way. Do not proceed." },
  EXIT: { label: "EXIT sign", meaning: "Exit or doorway ahead." },
  ROOM_NUMBER: { label: "Room sign", meaning: "Room identification ahead." },
  DIRECTION_ARROW: { label: "Directional arrow sign", meaning: "Direction guidance ahead." },
  ACCESSIBILITY: { label: "Accessibility sign", meaning: "Accessible route or facility nearby." },
};
