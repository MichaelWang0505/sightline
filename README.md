## Sightline

AI-powered navigation for the visually impaired users

Sightline is a React Native (Expo) mobile app that helps people with vision disabilities navigate both indoor and outdoor environments. It combines real-time sign detection using YOLO object detection models with voice-controlled location routing to give users an end-to-end, audio-first navigation experience.

## Features

## Sign Detection
- Detects walk/don't-walk signals, crosswalk signs, and exit signs in real time via the device camera
- Uses bounding box size relative to the full image to estimate the user's distance from a detected sign
- Announces the sign type, estimated distance, and direction (left or right) via text-to-speech

## Voice-Controlled Navigation
- Users speak a destination (e.g. "library") and the app surfaces nearby matching locations using the device's GPS
- Users select a location and receive turn-by-turn walking directions ("turn left", "turn right", "keep walking straight") read aloud
- Simultaneous sign detection: the app announces signs at the same time as GPS instructions, allowing for optimal navigation for blind users (eg. alerts the user to wait when a don't-walk signal is detected and confirms when it's safe to cross)

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native + Expo SDK 54 |
| Language | TypeScript |
| Routing | Expo Router (file-based) |
| Navigation UI | React Navigation (Bottom Tabs) |
| Camera | expo-camera |
| Text-to-Speech | expo-speech |
| Location | expo-location |
| Maps / Directions | Mapbox Polyline + Google Maps Directions API |
| Audio / AV | expo-av |
| Animations | react-native-reanimated |

---

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/) (`npm install -g expo-cli`)
- [Expo Go](https://expo.dev/go) app on your iOS or Android device (for quick testing), **or** a configured Android emulator / iOS simulator
- A Google Maps Directions API key (for routing)
- A backend endpoint serving the YOLO sign detection model (see [Backend Setup](#backend-setup))

---

## Getting Started

```bash
# 1. Clone the repo
git clone https://github.com/MichaelWang0505/sightline_hackamerica.git
cd sightline_hackamerica

# 2. Install dependencies
npm install

# 3. Configure environment variables (see below)

# 4. Start the dev server
npx expo start
```

Then scan the QR code with Expo Go, or press `a` for Android emulator / `i` for iOS simulator.

---

## Environment Variables

Create a `.env` file in the project root:

```env
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
YOLO_API_URL=https://your-backend-url/detect
```

> **Note:** Never commit your `.env` file. It is already listed in `.gitignore`.

---

## Backend Setup

Sightline sends camera frames to a remote YOLO inference endpoint. You will need to host a model server that:

1. Accepts a `POST` request with an image (base64 or multipart)
2. Returns bounding box predictions in the format `{ label, confidence, bbox: [x, y, w, h] }`

You can use [Ultralytics YOLO](https://github.com/ultralytics/ultralytics) with FastAPI or Flask to stand up a local or cloud-hosted server. Set the server URL as `YOLO_API_URL` in your `.env`.

---

## Project Structure

```
sightline_hackamerica/
├── app/                  # Expo Router screens (file-based routing)
├── assets/
│   └── images/           # App icons, splash screens, static images
├── components/           # Reusable UI components
├── constants/            # Theme colors, spacing, shared constants
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions (API calls, audio helpers, etc.)
├── app.json              # Expo app configuration
├── babel.config.js
├── eslint.config.js
├── jest.config.js
├── tsconfig.json
└── package.json
```

---

## Running on Device vs. Emulator

| Platform | Command |
|---|---|
| iOS Simulator | `npx expo start --ios` |
| Android Emulator | `npx expo start --android` |
| Physical device (Expo Go) | `npx expo start` → scan QR |
| Web (limited) | `npx expo start --web` |

> Camera and location features require a real device or a simulator with camera permissions granted.

---

## Scripts

| Script | Description |
|---|---|
| `npm start` | Start Expo dev server |
| `npm run android` | Open on Android |
| `npm run ios` | Open on iOS |
| `npm run web` | Open in browser |
| `npm run lint` | Run ESLint |

---

## Troubleshooting

**Metro bundler cache issues**
```bash
npx expo start --clear
```

**Location or camera permissions denied**
Make sure to grant Camera and Location permissions when prompted. On iOS, you may need to enable them in Settings → Privacy.

**YOLO endpoint not responding**
Confirm your `YOLO_API_URL` in `.env` is correct and the server is running. For local development you can use `ngrok` (already included as `@expo/ngrok`) to tunnel your localhost.

**`expo-speech` not working on Android emulator**
Text-to-speech may be unavailable on some Android emulators. Test on a physical device for best results.

---

## Accessibility

Sightline is built with blind and low-vision users as the primary audience. All interactive elements include accessible labels, and the app is designed to be fully operable without looking at the screen. Audio output is the primary feedback channel.
