import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type RouteStep = {
  instruction: string;
  distance?: number;
};

type RouteSession = {
  destinationName: string;
  steps: RouteStep[];
};

type RouteSessionContextValue = {
  activeRoute: RouteSession | null;
  startRoute: (destinationName: string, steps: RouteStep[]) => void;
  endRoute: () => void;
};

const RouteSessionContext = createContext<RouteSessionContextValue | undefined>(
  undefined
);

export function RouteSessionProvider({ children }: { children: ReactNode }) {
  const [activeRoute, setActiveRoute] = useState<RouteSession | null>(null);

  const value = useMemo<RouteSessionContextValue>(
    () => ({
      activeRoute,
      startRoute: (destinationName: string, steps: RouteStep[]) => {
        setActiveRoute({ destinationName, steps });
      },
      endRoute: () => {
        setActiveRoute(null);
      },
    }),
    [activeRoute]
  );

  return (
    <RouteSessionContext.Provider value={value}>
      {children}
    </RouteSessionContext.Provider>
  );
}

export function useRouteSession() {
  const context = useContext(RouteSessionContext);
  if (!context) {
    throw new Error("useRouteSession must be used within a RouteSessionProvider");
  }

  return context;
}
