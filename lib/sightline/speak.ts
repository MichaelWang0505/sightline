import * as Speech from "expo-speech";
import { Detection, Verbosity } from "./types";

export function speakDetection(detection: Detection, verbosity: Verbosity) {
  let message = `${detection.label} ahead`;

  if (detection.distance !== "unknown") {
    message += `, ${detection.distance} away`;
  }

  if (verbosity !== "low" && detection.meaning) {
    message += `. ${detection.meaning}`;
  }

  Speech.stop();
  Speech.speak(message, {
    rate: 1.0,
    onError: (error) => {
      console.warn("Speech output failed", error);
    },
  });
}
