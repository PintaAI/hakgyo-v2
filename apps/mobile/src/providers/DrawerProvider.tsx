import { router } from "expo-router";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { View } from "react-native";
import { Drawer } from "react-native-drawer-layout";

import { Sidebar } from "../components/sidebar/Sidebar";
import { useAppTheme } from "./AppThemeProvider";
import { useTransitionOverride } from "../navigation/screen-transition";

type DrawerContextValue = {
  open: () => void;
  close: () => void;
  /**
   * Navigate in the same tick as the tap while the drawer shuts. The drawer
   * panel is hidden in that same frame, so the close spring runs invisibly
   * against the app background instead of flashing the old sidebar behind
   * the incoming screen — no dead beat, no overlapping-motion glitch.
   */
  navigate: (action: () => void) => void;
};

const DrawerContext = createContext<DrawerContextValue | null>(null);
const SCREEN_CORNER_RADIUS = 58;

export function useDrawer() {
  const context = useContext(DrawerContext);
  if (!context) {
    throw new Error("useDrawer must be used within DrawerProvider");
  }
  return context;
}

export function DrawerProvider({
  children,
  enabled = true,
}: {
  children: ReactNode;
  enabled?: boolean;
}) {
  const { colorScheme, colors } = useAppTheme();
  const { fadeNextTransition } = useTransitionOverride();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerOpenRef = useRef(drawerOpen);
  drawerOpenRef.current = drawerOpen;
  // While true the drawer panel renders fully transparent. Set for exactly
  // one close cycle by `navigate` (see below), cleared on the next open.
  const panelHiddenRef = useRef(false);
  const [isDrawerPanelHidden, setDrawerPanelHidden] = useState(false);

  const open = useCallback(() => {
    panelHiddenRef.current = false;
    setDrawerPanelHidden(false);
    if (enabled) setDrawerOpen(true);
  }, [enabled]);
  const close = useCallback(() => setDrawerOpen(false), []);

  const navigate = useCallback((action: () => void) => {
    if (!drawerOpenRef.current) {
      action();
      return;
    }
    // Drop stray taps while a drawer navigation is already in flight
    // (double taps, taps landing on the invisible panel mid-close).
    if (panelHiddenRef.current) return;
    panelHiddenRef.current = true;
    setDrawerPanelHidden(true);
    setDrawerOpen(false);
    // Fade the incoming screen: with no directional motion, the drawer
    // container settling underneath is imperceptible.
    fadeNextTransition();
    action();
  }, [fadeNextTransition]);

  const openProfile = useCallback(() => {
    navigate(() => router.replace("/(home)/(tabs)/profile"));
  }, [navigate]);

  useEffect(() => {
    if (!enabled) close();
  }, [close, enabled]);

  const contextValue = useMemo(
    () => ({ open, close, navigate }),
    [close, navigate, open],
  );
  const drawerStyle = useMemo(
    () => ({
      width: 300,
      backgroundColor: colors.background,
      // Hidden for one close cycle when navigating: the close spring then
      // runs invisibly while the new screen pushes in the same frame.
      opacity: isDrawerPanelHidden ? 0 : 1,
    }),
    [colors.background, isDrawerPanelHidden],
  );
  const screenStyle = useMemo(
    () => ({
      backgroundColor: colors.background,
      borderBottomLeftRadius: SCREEN_CORNER_RADIUS,
      borderTopLeftRadius: SCREEN_CORNER_RADIUS,
      elevation: 18,
      flex: 1,
      shadowColor: "#000000",
      shadowOffset: { width: -5, height: 0 },
      shadowOpacity: colorScheme === "dark" ? 0.35 : 0.18,
      shadowRadius: 22,
    }),
    [colorScheme, colors.background],
  );
  const clippedScreenStyle = useMemo(
    () => ({
      backgroundColor: colors.background,
      borderBottomLeftRadius: SCREEN_CORNER_RADIUS,
      borderTopLeftRadius: SCREEN_CORNER_RADIUS,
      flex: 1,
      overflow: "hidden" as const,
    }),
    [colors.background],
  );
  const renderDrawerContent = useCallback(
    () => (
      <Sidebar
        onClose={close}
        onNavigate={navigate}
        onOpenProfile={openProfile}
      />
    ),
    [close, navigate, openProfile],
  );

  return (
    <DrawerContext.Provider value={contextValue}>
      <Drawer
        drawerStyle={drawerStyle}
        drawerType="back"
        onClose={close}
        onOpen={open}
        open={enabled && drawerOpen}
        overlayStyle={{ backgroundColor: "transparent" }}
        renderDrawerContent={renderDrawerContent}
        style={{ backgroundColor: colors.background }}
        swipeEnabled={enabled}
      >
        <View style={screenStyle}>
          <View
            renderToHardwareTextureAndroid={drawerOpen}
            style={clippedScreenStyle}
          >
            {children}
          </View>
        </View>
      </Drawer>
    </DrawerContext.Provider>
  );
}
