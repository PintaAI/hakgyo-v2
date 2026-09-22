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
import { UpdatesDrawerContent } from "../components/updates/UpdatesDrawerContent";
import { useAppTheme } from "./AppThemeProvider";
import { useTransitionOverride } from "../navigation/screen-transition";

type DrawerContextValue = {
  open: () => void;
  close: () => void;
  openUpdates: () => void;
  closeUpdates: () => void;
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
  const [updatesOpen, setUpdatesOpen] = useState(false);
  const drawerOpenRef = useRef(drawerOpen);
  const updatesOpenRef = useRef(updatesOpen);
  drawerOpenRef.current = drawerOpen;
  updatesOpenRef.current = updatesOpen;
  // While true the drawer panel renders fully transparent. Set for exactly
  // one close cycle by `navigate` (see below), cleared on the next open.
  const panelHiddenRef = useRef(false);
  const [isDrawerPanelHidden, setDrawerPanelHidden] = useState(false);
  const updatesPanelHiddenRef = useRef(false);
  const [isUpdatesPanelHidden, setUpdatesPanelHidden] = useState(false);

  const open = useCallback(() => {
    panelHiddenRef.current = false;
    setDrawerPanelHidden(false);
    if (enabled) setDrawerOpen(true);
  }, [enabled]);
  const close = useCallback(() => setDrawerOpen(false), []);
  const openUpdates = useCallback(() => {
    setDrawerOpen(false);
    updatesPanelHiddenRef.current = false;
    setUpdatesPanelHidden(false);
    if (enabled) setUpdatesOpen(true);
  }, [enabled]);
  const closeUpdates = useCallback(() => setUpdatesOpen(false), []);

  const navigate = useCallback(
    (action: () => void) => {
      if (!drawerOpenRef.current && !updatesOpenRef.current) {
        action();
        return;
      }
      if (updatesOpenRef.current) {
        updatesPanelHiddenRef.current = true;
        setUpdatesPanelHidden(true);
        setUpdatesOpen(false);
        fadeNextTransition();
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
    },
    [fadeNextTransition],
  );

  const openProfile = useCallback(() => {
    navigate(() => router.replace("/(home)/(tabs)/profile"));
  }, [navigate]);

  useEffect(() => {
    if (!enabled) {
      close();
      closeUpdates();
    }
  }, [close, closeUpdates, enabled]);

  const contextValue = useMemo(
    () => ({ open, close, openUpdates, closeUpdates, navigate }),
    [close, closeUpdates, navigate, open, openUpdates],
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
  const updatesDrawerStyle = useMemo(
    () => ({
      width: 340,
      backgroundColor: colors.background,
      opacity: isUpdatesPanelHidden ? 0 : 1,
    }),
    [colors.background, isUpdatesPanelHidden],
  );
  const updatesScreenStyle = useMemo(
    () => ({
      backgroundColor: colors.background,
      borderBottomRightRadius: SCREEN_CORNER_RADIUS,
      borderTopRightRadius: SCREEN_CORNER_RADIUS,
      elevation: 18,
      flex: 1,
      shadowColor: "#000000",
      shadowOffset: { width: 5, height: 0 },
      shadowOpacity: colorScheme === "dark" ? 0.35 : 0.18,
      shadowRadius: 22,
    }),
    [colorScheme, colors.background],
  );
  const updatesClippedScreenStyle = useMemo(
    () => ({
      backgroundColor: colors.background,
      borderBottomRightRadius: SCREEN_CORNER_RADIUS,
      borderTopRightRadius: SCREEN_CORNER_RADIUS,
      flex: 1,
      overflow: "hidden" as const,
    }),
    [colors.background],
  );
  const renderUpdatesContent = useCallback(
    () => <UpdatesDrawerContent onClose={closeUpdates} onNavigate={navigate} />,
    [closeUpdates, navigate],
  );

  return (
    <DrawerContext.Provider value={contextValue}>
      <Drawer
        drawerPosition="right"
        drawerStyle={updatesDrawerStyle}
        drawerType="back"
        onClose={closeUpdates}
        onOpen={openUpdates}
        open={enabled && updatesOpen}
        overlayStyle={{ backgroundColor: "transparent" }}
        renderDrawerContent={renderUpdatesContent}
        style={{ backgroundColor: colors.background }}
        swipeEnabled={false}
      >
        <View style={updatesScreenStyle}>
          <View
            renderToHardwareTextureAndroid={updatesOpen}
            style={updatesClippedScreenStyle}
          >
            <Drawer
              drawerStyle={drawerStyle}
              drawerType="back"
              onClose={close}
              onOpen={open}
              open={enabled && drawerOpen}
              overlayStyle={{ backgroundColor: "transparent" }}
              renderDrawerContent={renderDrawerContent}
              style={{ backgroundColor: colors.background }}
              swipeEnabled={enabled && !updatesOpen}
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
          </View>
        </View>
      </Drawer>
    </DrawerContext.Provider>
  );
}
