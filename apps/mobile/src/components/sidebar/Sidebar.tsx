import { router, usePathname } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useDrawerProgress } from "react-native-drawer-layout";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { authClient } from "../../lib/auth-client";
import { useAppTheme } from "../../providers/AppThemeProvider";
import { GlassBox } from "../GlassBox";
import { buildSidebarSections } from "./config";
import { getCurrentAppArea, isSidebarItemActive } from "./routing";
import type { AppArea, SidebarItem } from "./types";

type SidebarProps = {
  onClose: () => void;
  onOpenProfile: () => void;
};

function hasActiveChild(
  pathname: string,
  children: SidebarItem[],
  sectionArea: AppArea,
  currentArea: AppArea,
) {
  return children.some((child) =>
    isSidebarItemActive(pathname, child, sectionArea, currentArea),
  );
}

function SidebarNavRow({
  item,
  isActive,
  isSubItem = false,
  onPress,
}: {
  item: SidebarItem;
  isActive: boolean;
  isSubItem?: boolean;
  onPress: () => void;
}) {
  const { colorScheme, colors } = useAppTheme();
  const iconSize = isSubItem ? 14 : 16;
  const surface =
    colorScheme === "dark" ? "rgba(255,255,255,0.035)" : "rgba(15,23,42,0.028)";
  const separatorLine =
    colorScheme === "dark" ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.1)";

  return (
    <Pressable
      accessibilityRole="button"
      className="overflow-hidden rounded-xl px-2.5 py-2"
      onPress={onPress}
      style={[
        {
          backgroundColor: isActive ? surface : "transparent",
          borderColor: separatorLine,
          borderWidth: isActive ? 1 : 0,
        },
        isSubItem && { marginLeft: 28, paddingLeft: 8 },
      ]}
    >
      <View className="flex-row items-center gap-2.5">
        <View
          className="size-7 items-center justify-center rounded-full"
          style={{ backgroundColor: isActive ? "transparent" : surface }}
        >
          <SymbolView
            fallback={
              <Text style={{ color: colors.primary, fontSize: iconSize }}>
                •
              </Text>
            }
            name={item.icon}
            size={iconSize}
            tintColor={colors.primary}
          />
        </View>
        <Text
          className={isActive ? "font-bold" : "font-semibold"}
          numberOfLines={1}
          style={{
            color: colors.foreground,
            fontSize: isSubItem ? 12 : 13,
          }}
        >
          {item.label}
        </Text>
      </View>
    </Pressable>
  );
}

export function Sidebar({ onClose, onOpenProfile }: SidebarProps) {
  const { data: session, isPending } = authClient.useSession();
  const { colorScheme, colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const currentArea = getCurrentAppArea();
  const progress = useDrawerProgress();
  const sections = buildSidebarSections();
  const displayName = session?.user.name || "Hakgyo learner";
  const email =
    session?.user.email || (isPending ? "Loading…" : "Not signed in");
  const initials = displayName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.85, 1]),
    transform: [
      { translateX: interpolate(progress.value, [0, 1], [-20, 0]) },
      { scale: interpolate(progress.value, [0, 1], [0.95, 1]) },
    ],
  }));

  const handlePress = (item: SidebarItem) => {
    onClose();
    if (item.replace) {
      router.replace(item.route);
      return;
    }
    router.push(item.route);
  };

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          backgroundColor: colors.background,
          flex: 1,
          padding: 16,
          paddingBottom: Math.max(insets.bottom, 16),
          paddingTop: Math.max(insets.top + 16, 54),
        },
      ]}
    >
      <View className="mb-5 flex-row items-center justify-between px-1">
        <Text
          className="text-xl font-black tracking-tight"
          style={{ color: colors.foreground }}
        >
          Menu
        </Text>
        <Text
          className="text-xs font-semibold uppercase tracking-[2px]"
          style={{ color: colors.mutedForeground }}
        >
          Hakgyo
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {sections.map((section) => (
          <View
            className="rounded-2xl px-1 py-2"
            key={section.label}
            style={{ marginBottom: 10 }}
          >
            <View className="mb-1.5 flex-row items-center justify-between px-2">
              <Text
                className="text-xs font-semibold uppercase tracking-[1.6px]"
                style={{ color: colors.mutedForeground }}
              >
                {section.label}
              </Text>
              <Text
                className="text-xs font-bold"
                style={{ color: colors.mutedForeground }}
              >
                {section.items.length}
              </Text>
            </View>

            <View style={{ gap: 1 }}>
              {section.items.map((item) => {
                const active = isSidebarItemActive(
                  pathname,
                  item,
                  section.area,
                  currentArea,
                );
                const childActive = item.children
                  ? hasActiveChild(
                      pathname,
                      item.children,
                      section.area,
                      currentArea,
                    )
                  : false;

                return (
                  <View key={item.id}>
                    <SidebarNavRow
                      isActive={active && !childActive}
                      item={item}
                      onPress={() => handlePress(item)}
                    />
                    {item.children ? (
                      <View>
                        <View
                          style={{
                            backgroundColor: colors.primary,
                            borderRadius: 1,
                            bottom: 0,
                            left: 20,
                            opacity: 0.25,
                            position: "absolute",
                            top: 0,
                            width: 2,
                          }}
                        />
                        {item.children.map((child) => (
                          <SidebarNavRow
                            isActive={isSidebarItemActive(
                              pathname,
                              child,
                              section.area,
                              currentArea,
                            )}
                            isSubItem
                            item={child}
                            key={child.id}
                            onPress={() => handlePress(child)}
                          />
                        ))}
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      <Pressable
        accessibilityLabel="Open profile"
        accessibilityRole="button"
        className="overflow-hidden rounded-3xl"
        onPress={onOpenProfile}
      >
        <GlassBox
          colorScheme={colorScheme}
          glassEffectStyle="regular"
          isInteractive
          style={{
            backgroundColor:
              colorScheme === "dark"
                ? "rgba(255,255,255,0.08)"
                : "rgba(255,255,255,0.62)",
            borderColor: colors.border,
            borderRadius: 24,
            borderWidth: 1,
            padding: 12,
          }}
        >
          <View className="flex-row items-center gap-3">
            <View
              className="size-12 items-center justify-center overflow-hidden rounded-full"
              style={{ backgroundColor: colors.primary }}
            >
              {session?.user.image ? (
                <Image
                  className="size-full"
                  resizeMode="cover"
                  source={{ uri: session.user.image }}
                />
              ) : (
                <Text
                  className="font-extrabold"
                  style={{ color: colors.primaryForeground }}
                >
                  {initials || "H"}
                </Text>
              )}
            </View>

            <View className="min-w-0 flex-1">
              <Text
                className="font-bold"
                numberOfLines={1}
                style={{ color: colors.foreground }}
              >
                {displayName}
              </Text>
              <Text
                className="text-xs"
                numberOfLines={1}
                style={{ color: colors.mutedForeground }}
              >
                {email}
              </Text>
            </View>

            <Text
              className="text-2xl"
              style={{ color: colors.mutedForeground }}
            >
              ›
            </Text>
          </View>
        </GlassBox>
      </Pressable>
    </Animated.View>
  );
}
