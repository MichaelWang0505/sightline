import React from "react";
import { Text } from "react-native";
import { render } from "@testing-library/react-native";

import {
  RouteSessionProvider,
  useRouteSession
} from "@/lib/route-session";

function TestConsumer() {
  const session = useRouteSession();

  return (
    <>
      <Text testID="session-exists">{String(!!session)}</Text>
      <Text testID="startRoute-type">{typeof session.startRoute}</Text>
      <Text testID="endRoute-type">{typeof session.endRoute}</Text>
    </>
  );
}

describe("route-session", () => {
  it("throws when useRouteSession is used outside RouteSessionProvider", () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<TestConsumer />)).toThrow(
      "useRouteSession must be used within a RouteSessionProvider"
    );

    consoleSpy.mockRestore();
  });

  it("provides route session context inside RouteSessionProvider", () => {
    const { getByTestId } = render(
      <RouteSessionProvider>
        <TestConsumer />
      </RouteSessionProvider>
    );

    expect(getByTestId("session-exists")).toHaveTextContent("true");
    expect(getByTestId("startRoute-type")).toHaveTextContent("function");
    expect(getByTestId("endRoute-type")).toHaveTextContent("function");
  });
});
