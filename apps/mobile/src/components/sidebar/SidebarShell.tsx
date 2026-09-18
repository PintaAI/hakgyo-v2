import type { ReactNode } from "react";
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
      <View className="mb-5 flex-row items-center gap-3 px-1">
        {thumbnailUrl ? (
          <Image
            className="size-11 rounded-2xl"
            resizeMode="cover"
            source={{ uri: thumbnailUrl }}
          />
        ) : thumbnailFallbackLabel ? (
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

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>

      <Pressable
        accessibilityLabel="Open profile"
        accessibilityRole="button"
        className="overflow-hidden rounded-3xl"
        onPress={onOpenProfile}
      >
        <GlassBox
          colorScheme={colorScheme}
          glassEffectStyle="clear"
          isInteractive
          style={{
            backgroundColor: colors.card,
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
