import * as Speech from "expo-speech";
import { Detection } from "./types";

export function speakDetection(detection: Detection) {
  let message = `${detection.label} ahead`;

  if (!detection.omitDistance && detection.distance !== "unknown") {
    message += `, ${detection.distance} away`;
  }

  if (detection.direction) {
    message += `, on your ${detection.direction}`;
  }

  if (detection.includeMeaning && detection.meaning) {
    message += `. ${detection.meaning}`;
  }

  Speech.stop();
  Speech.speak(message, {
    rate: 1.0,
    volume: 1.0,
    onError: (error) => {
      console.warn("Speech output failed", error);
    },
  });
}
