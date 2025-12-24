export type Verbosity = "low" | "medium" | "high";

export type SignType =
  | "STOP"
  | "PEDESTRIAN_CROSSING"
  | "YIELD"
  | "DO_NOT_ENTER"
  | "EXIT"
  | "ROOM_NUMBER"
  | "DIRECTION_ARROW"
  | "ACCESSIBILITY";

export type DistancePhrase =
  | "very close"
  | "about 5 feet"
  | "about 8 feet"
  | "about 10 feet"
  | "about 15 feet"
  | "unknown";

export type Detection = {
  id: string;
  signType: SignType;
  label: string;
  meaning?: string;
  distance: DistancePhrase;
  confidence: number;
  createdAt: number;
};
