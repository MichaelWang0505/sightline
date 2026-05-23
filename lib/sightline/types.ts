// low = name + distance only, medium/high = also reads the meaning
export type Verbosity = "low" | "medium" | "high";

export type SignType =
  | "PEDESTRIAN_CROSSING"
  | "SCHOOL_CROSSING"
  | "EXIT"
  | "EXIT_RIGHT"
  | "EXIT_LEFT"
  | "EXIT_BOTH"
  | "WALK_ON"
  | "WALK_OFF";

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
  omitDistance?: boolean;
  includeMeaning?: boolean;
  direction?: string;
  confidence: number;
  createdAt: number;
};
