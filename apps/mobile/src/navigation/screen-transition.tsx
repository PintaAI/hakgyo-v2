import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ScreenTransition = "default" | "fade";

type TransitionOverrideValue = {
  transition: ScreenTransition;
  /**
   * Make the next pushed screen fade in instead of sliding. Resets to the
   * platform default shortly after so later in-screen pushes are unaffected.
   * Used for drawer-originated navigations: a fade has no directional motion,
   * so the drawer container settling underneath is imperceptible.
   */
  fadeNextTransition: () => void;
};

const TransitionOverrideContext =
  createContext<TransitionOverrideValue | null>(null);

export function TransitionOverrideProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [transition, setTransition] =
    useState<ScreenTransition>("default");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fadeNextTransition = useCallback(() => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    setTransition("fade");
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setTransition("default");
    }, 600);
  }, []);

  const value = useMemo(
    () => ({ transition, fadeNextTransition }),
    [transition, fadeNextTransition],
  );
  return (
    <TransitionOverrideContext.Provider value={value}>
      {children}
    </TransitionOverrideContext.Provider>
  );
}

export function useTransitionOverride() {
  const context = useContext(TransitionOverrideContext);
  if (!context) {
    throw new Error(
      "useTransitionOverride must be used within TransitionOverrideProvider",
    );
  }
  return context;
}
