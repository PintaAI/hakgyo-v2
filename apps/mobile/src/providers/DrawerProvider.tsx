import { router } from "expo-router";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { View } from "react-native";
import { Drawer } from "react-native-drawer-layout";

import { Sidebar } from "../components/sidebar/Sidebar";
import { useAppTheme } from "./AppThemeProvider";

type DrawerContextValue = {
  open: () => void;
  close: () => void;
};

const DrawerContext = createContext<DrawerContextValue | null>(null);

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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const screenCornerRadius = 58;
  const open = useCallback(() => {
    if (enabled) setDrawerOpen(true);
  }, [enabled]);
  const close = useCallback(() => setDrawerOpen(false), []);
  const openProfile = useCallback(() => {
    setDrawerOpen(false);
    router.replace("/(home)/(tabs)/profile");
  }, []);

  useEffect(() => {
    if (!enabled) close();
  }, [close, enabled]);

  return (
    <DrawerContext.Provider value={{ open, close }}>
      <Drawer
        drawerStyle={{ width: 300, backgroundColor: colors.background }}
        drawerType="back"
        onClose={close}
        onOpen={open}
        open={enabled && drawerOpen}
        overlayStyle={{ backgroundColor: "rgba(255,255,255,0)" }}
        renderDrawerContent={() => (
          <Sidebar onClose={close} onOpenProfile={openProfile} />
        )}
        style={{ backgroundColor: colors.background }}
        swipeEnabled={enabled}
      >
        <View
          style={{
            backgroundColor: colors.background,
            borderBottomLeftRadius: screenCornerRadius,
            borderTopLeftRadius: screenCornerRadius,
            elevation: 18,
            flex: 1,
            shadowColor: "#000",
            shadowOffset: { width: -5, height: 0 },
            shadowOpacity: colorScheme === "dark" ? 0.35 : 0.18,
            shadowRadius: 22,
          }}
        >
          <View
            renderToHardwareTextureAndroid={drawerOpen}
            style={{
              backgroundColor: colors.background,
              borderBottomLeftRadius: screenCornerRadius,
              borderTopLeftRadius: screenCornerRadius,
              flex: 1,
              overflow: "hidden",
            }}
          >
            {children}
          </View>
        </View>
      </Drawer>
    </DrawerContext.Provider>
  );
}
