import * as Speech from "expo-speech";
import { Detection, Verbosity } from "./types";

export function speakDetection(d: Detection, verbosity: Verbosity) {
  let message = `${d.label} ahead`;

  if (d.distance !== "unknown") {
    message += `, ${d.distance} away`;
  }

  if (verbosity !== "low" && d.meaning) {
    message += `. ${d.meaning}`;
  }

  Speech.stop();
  Speech.speak(message, { rate: 1.0 });
}
