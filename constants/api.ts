const DEFAULT_API_BASE_URL = "https://python-backend-i8iy.onrender.com";

function resolveApiBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  const base = configured && configured.length > 0 ? configured : DEFAULT_API_BASE_URL;
  return base.replace(/\/+$/, "");
}

export const API_BASE_URL = resolveApiBaseUrl();
export const USE_MOCK_DETECTOR = process.env.EXPO_PUBLIC_USE_MOCK_DETECTOR === "true";

export const API_ENDPOINTS = {
  signs: `${API_BASE_URL}/signs`,
  voiceInput: `${API_BASE_URL}/voice_input`,
  route: `${API_BASE_URL}/api/route`,
} as const;
