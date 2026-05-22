import React from "react";
import { render } from "@testing-library/react-native";

import NavigateScreen from "@/app/navigate";

const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack
  })
}));

jest.mock("expo-av", () => ({
  Audio: {}
}));

jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn()
}));

jest.mock("expo-speech", () => ({
  speak: jest.fn(),
  stop: jest.fn()
}));

jest.mock("@/components/themed-text", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    ThemedText: ({ children, ...props }: any) => <Text {...props}>{children}</Text>
  };
});

jest.mock("@/components/themed-view", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    ThemedView: ({ children, ...props }: any) => <View {...props}>{children}</View>
  };
});

jest.mock("@/constants/api", () => ({
  API_ENDPOINTS: {}
}));

jest.mock("@/constants/theme", () => ({
  AppPalette: {
    light: {
      background: "#fff",
      text: "#000",
      primary: "#007AFF",
      secondary: "#666",
      border: "#ddd",
      card: "#f7f7f7"
    }
  }
}));

jest.mock("@/lib/network", () => ({
  fetchWithTimeout: jest.fn()
}));

const mockUseRouteSession = jest.fn();

jest.mock("@/lib/route-session", () => ({
  useRouteSession: () => mockUseRouteSession()
}));

describe("NavigateScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders without crashing when no route is active", () => {
    mockUseRouteSession.mockReturnValue({
      activeRoute: null,
      startRoute: jest.fn(),
      endRoute: jest.fn(),
      updateStepStatus: jest.fn()
    });

    const { toJSON } = render(<NavigateScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it("shows Start Navigation when there is no active route", () => {
    mockUseRouteSession.mockReturnValue({
      activeRoute: null,
      startRoute: jest.fn(),
      endRoute: jest.fn(),
      updateStepStatus: jest.fn()
    });

    const { getByText } = render(<NavigateScreen />);
    expect(getByText("Start Navigation")).toBeTruthy();
  });

  it("shows End Route when there is an active route", () => {
    mockUseRouteSession.mockReturnValue({
      activeRoute: {
        steps: [],
        destination: {
          name: "Library"
        }
      },
      startRoute: jest.fn(),
      endRoute: jest.fn(),
      updateStepStatus: jest.fn()
    });

    const { getByText } = render(<NavigateScreen />);
    expect(getByText("End Route")).toBeTruthy();
  });
});
