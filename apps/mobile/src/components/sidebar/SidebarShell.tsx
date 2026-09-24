import type { ReactNode } from "react";
import { useState } from "react";
import { Image } from "expo-image";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useDrawerProgress } from "react-native-drawer-layout";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { authClient } from "../../lib/auth-client";
import { useAppTheme } from "../../providers/AppThemeProvider";
import { withOpacity } from "../../theme/colors";
import { GlassBox } from "../GlassBox";

type SidebarShellProps = {
  title: string;
  subtitle: string;
  thumbnailUrl?: string | null;
  thumbnailFallbackLabel?: string;
  onOpenProfile: () => void;
  children: ReactNode;
};

export function SidebarShell({
  title,
  subtitle,
  thumbnailUrl,
  thumbnailFallbackLabel,
  onOpenProfile,
  children,
}: SidebarShellProps) {
  const { data: session, isPending } = authClient.useSession();
  const { colorScheme, colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const progress = useDrawerProgress();
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
  const topPadding = Math.max(insets.top + 16, 54);
  const hasHero = Boolean(thumbnailUrl);
  const footerBottom = Math.max(insets.bottom, 16);
  const [footerHeight, setFooterHeight] = useState(88);

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          backgroundColor: colors.background,
          flex: 1,
          paddingHorizontal: 16,
          paddingBottom: 0,
          paddingTop: hasHero ? 0 : topPadding,
        },
      ]}
    >
      {hasHero ? (
        <View
          className="overflow-hidden"
          style={{
            marginHorizontal: -16,
            marginTop: 0,
            minHeight: 84 + topPadding,
            borderBottomLeftRadius: 24,
            borderBottomRightRadius: 0,
          }}
        >
          <Image
            accessibilityIgnoresInvertColors
            cachePolicy="memory-disk"
            contentFit="cover"
            source={{ uri: thumbnailUrl ?? undefined }}
            style={StyleSheet.absoluteFill}
            transition={0}
          />
          <View
            className="absolute inset-0"
            style={{
              backgroundColor: withOpacity(colors.background, 0.62),
            }}
          />
          <View
            className="relative justify-end gap-1 px-4 pb-4"
            style={{ minHeight: 84 + topPadding, paddingTop: topPadding + 12 }}
          >
            <Text
              className="text-xl font-black tracking-tight"
              numberOfLines={2}
              style={{ color: colors.foreground }}
            >
              {title}
            </Text>
            <Text
              className="text-xs font-semibold uppercase tracking-[2px]"
              numberOfLines={1}
              style={{ color: colors.mutedForeground }}
            >
              {subtitle}
            </Text>
          </View>
        </View>
      ) : (
        <View className="mb-5 flex-row items-center gap-3 px-1">
          {thumbnailFallbackLabel ? (
            <View
              className="size-11 items-center justify-center rounded-2xl"
              style={{ backgroundColor: colors.primary }}
            >
              <Text
                className="text-base font-black"
                style={{ color: colors.primaryForeground }}
              >
                {thumbnailFallbackLabel}
              </Text>
            </View>
          ) : null}
          <View className="min-w-0 flex-1">
            <Text
              className="text-xl font-black tracking-tight"
              numberOfLines={1}
              style={{ color: colors.foreground }}
            >
              {title}
            </Text>
            <Text
              className="text-xs font-semibold uppercase tracking-[2px]"
              numberOfLines={1}
              style={{ color: colors.mutedForeground }}
            >
              {subtitle}
            </Text>
          </View>
        </View>
      )}

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingBottom: footerHeight + footerBottom + 12,
        }}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>

      <GlassBox
        colorScheme={colorScheme}
        glassEffectStyle="clear"
        isInteractive
        tintColor={withOpacity(colors.primary, 0.2)}
        onLayout={(event) => setFooterHeight(event.nativeEvent.layout.height)}
        style={{
          position: "absolute",
          left: 16,
          right: 16,
          bottom: footerBottom,
          borderColor: colors.border,
          borderRadius: 24,
          borderWidth: 1,
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.12,
          shadowRadius: 12,
          elevation: 6,
        }}
      >
        <Pressable
          accessibilityLabel="Open profile"
          accessibilityRole="button"
          onPress={onOpenProfile}
          style={{ padding: 12, borderRadius: 24 }}
        >
          <View className="flex-row items-center gap-3">
            <View
              className="size-12 items-center justify-center overflow-hidden rounded-full"
              style={{ backgroundColor: colors.primary }}
            >
              {session?.user.image ? (
                <Image
                  cachePolicy="memory-disk"
                  className="size-full"
                  contentFit="cover"
                  source={{ uri: session.user.image }}
                  style={{ width: "100%", height: "100%" }}
                  transition={0}
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
        </Pressable>
      </GlassBox>
    </Animated.View>
  );
}
