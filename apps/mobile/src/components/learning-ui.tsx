import {
  useCallback,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  GestureDetector,
  type NativeGesture,
} from "react-native-gesture-handler";
import { userErrorMessage } from "../lib/error-message";
import { useAppTheme } from "../providers/AppThemeProvider";
import { Chevron } from "./ui/chevron";
import { Eyebrow } from "./ui/eyebrow";
import { Action } from "./ui/action";
import { Spinner } from "./ui/spinner";

// The shared UI primitives live in ./ui; they are re-exported here so screens
// can keep importing from one place.
export { Action, type ActionVariant } from "./ui/action";
export { Avatar } from "./ui/avatar";
export { Badge } from "./ui/badge";
export { Callout } from "./ui/callout";
export { Card } from "./ui/card";
export { Chevron } from "./ui/chevron";
export { Chip } from "./ui/chip";
export { EmptyState } from "./ui/empty-state";
export { Eyebrow } from "./ui/eyebrow";
export { FullScreenState } from "./ui/full-screen-state";
export { GlassInput } from "./ui/glass-input";
export { HeroHeader } from "./ui/hero-header";
export { IconCircle } from "./ui/icon-circle";
export { PageTitle } from "./ui/page-title";
export { ProgressBar } from "./ui/progress-bar";
export { SectionHeader } from "./ui/section-header";
export { Spinner } from "./ui/spinner";
export { TextField } from "./ui/text-field";

/** The horizontal padding of a screen's content, in points (`px-5`). */
const SCREEN_GUTTER = 20;

/**
 * Lets content run edge to edge inside a `StudyScreen`, past its horizontal
 * padding.
 */
export function FullBleed({ children }: { children: ReactNode }) {
  return <View style={{ marginHorizontal: -SCREEN_GUTTER }}>{children}</View>;
}

export function StudyScreen({
  title,
  children,
  refreshing = false,
  onRefresh,
  contentInsetAdjustmentBehavior = "automatic",
  automaticallyAdjustKeyboardInsets = false,
  headerShown = true,
  bleedTop = false,
  fillViewport = false,
  keyboardAvoiding = false,
  scrollable = true,
  scrollGesture,
  scrollViewRef,
  gameHeader = false,
  contentClassName = "gap-6",
}: {
  title: string;
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentInsetAdjustmentBehavior?:
    "automatic" | "never" | "always" | "scrollableAxes";
  automaticallyAdjustKeyboardInsets?: boolean;
  headerShown?: boolean;
  bleedTop?: boolean;
  fillViewport?: boolean;
  keyboardAvoiding?: boolean;
  scrollable?: boolean;
  scrollGesture?: NativeGesture;
  scrollViewRef?: RefObject<ScrollView | null>;
  gameHeader?: boolean;
  /** Replaces the default `gap-6` between sections; the gutter stays `px-5`. */
  contentClassName?: string;
}) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const viewportRef = useRef<View>(null);
  const [keyboardVerticalOffset, setKeyboardVerticalOffset] = useState(0);
  const behavior = bleedTop ? "never" : contentInsetAdjustmentBehavior;
  // ~44pt native navigation bar on iOS; Android tab roots have no header.
  const refreshOffset = insets.top + (Platform.OS === "ios" ? 44 : 0);
  const measureViewportOffset = useCallback(() => {
    viewportRef.current?.measureInWindow((_x, y) => {
      setKeyboardVerticalOffset((current) =>
        Math.abs(current - y) < 1 ? current : y,
      );
    });
  }, []);
  const content = (
    <View
      className={`${fillViewport ? "flex-1" : ""} px-5 pb-12 ${bleedTop ? "pt-0" : "pt-4"} ${contentClassName}`}
      style={
        bleedTop
          ? { paddingBottom: Math.max(insets.bottom, 48) }
          : Platform.OS !== "ios" && !headerShown
            ? // Without a header nothing else clears the status bar here:
              // contentInsetAdjustmentBehavior is iOS-only.
              { paddingTop: insets.top + 16 }
            : undefined
      }
    >
      {children}
    </View>
  );
  const viewport = (
    <ScrollView
      ref={scrollViewRef}
      className="flex-1"
      contentInsetAdjustmentBehavior={behavior}
      automaticallyAdjustContentInsets={!bleedTop && behavior !== "never"}
      automaticallyAdjustKeyboardInsets={automaticallyAdjustKeyboardInsets}
      keyboardShouldPersistTaps="handled"
      scrollEnabled={scrollable}
      removeClippedSubviews={scrollGesture ? false : undefined}
      contentContainerStyle={fillViewport ? { flexGrow: 1 } : undefined}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            // Bleeding content starts under the status bar and transparent
            // header, which would hide the spinner. Move it below them and
            // above the full-bleed content.
            progressViewOffset={bleedTop ? refreshOffset : undefined}
            style={bleedTop ? { zIndex: 1 } : undefined}
          />
        ) : undefined
      }
    >
      {content}
    </ScrollView>
  );
  const gestureViewport = scrollGesture ? (
    <GestureDetector gesture={scrollGesture}>{viewport}</GestureDetector>
  ) : (
    viewport
  );
  return (
    <>
      <Stack.Screen
        options={
          gameHeader
            ? {
                gestureEnabled: false,
                headerBackButtonDisplayMode: "minimal",
                headerShadowVisible: false,
                headerShown: true,
                title: "",
              }
            : { title, headerShown }
        }
      />
      {keyboardAvoiding ? (
        <View
          ref={viewportRef}
          collapsable={false}
          className="flex-1"
          onLayout={measureViewportOffset}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={keyboardVerticalOffset}
            style={{ flex: 1 }}
          >
            {gestureViewport}
          </KeyboardAvoidingView>
        </View>
      ) : (
        gestureViewport
      )}
    </>
  );
}

/** A tinted call-to-action card with a label, title and optional detail. */
export function TintedAction({
  eyebrow,
  title,
  detail,
  onPress,
  accessibilityHint,
}: {
  eyebrow: string;
  title: string;
  detail?: string;
  onPress: () => void;
  accessibilityHint?: string;
}) {
  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
      className="flex-row items-center gap-3 rounded-2xl border border-primary/40 bg-primary/10 px-5 py-4 active:opacity-80"
      onPress={onPress}
    >
      <View className="min-w-0 flex-1 gap-1">
        <Eyebrow tone="primary">{eyebrow}</Eyebrow>
        <Text
          className="text-lg font-black leading-6 text-foreground"
          numberOfLines={2}
        >
          {title}
        </Text>
        {detail ? (
          <Text
            className="text-xs font-semibold text-muted-foreground"
            numberOfLines={1}
          >
            {detail}
          </Text>
        ) : null}
      </View>
      <Text className="text-2xl text-primary">›</Text>
    </Pressable>
  );
}

export function Row({
  title,
  detail,
  onPress,
  disabled = false,
}: {
  title: string;
  detail?: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      disabled={!onPress || disabled}
      accessibilityState={{ disabled }}
      onPress={onPress}
      className="min-h-16 flex-row items-center gap-3 border-b border-border py-4"
      style={{ opacity: disabled ? 0.55 : 1 }}
    >
      <View className="flex-1 gap-1">
        <Text className="text-base font-semibold text-foreground">{title}</Text>
        {detail ? (
          <Text className="text-sm leading-5 text-muted-foreground">
            {detail}
          </Text>
        ) : null}
      </View>
      {onPress ? (
        disabled ? (
          <Text className="text-lg text-muted-foreground">Terkunci</Text>
        ) : (
          <Chevron />
        )
      ) : null}
    </Pressable>
  );
}

export function QueryState({
  pending,
  error,
  retry,
}: {
  pending: boolean;
  error?: { message: string } | null;
  retry: () => void;
}) {
  if (error)
    return (
      <View className="gap-3 py-4">
        <Text accessibilityRole="alert" className="text-sm text-destructive">
          {userErrorMessage(error, "Data tidak dapat dimuat.")}
        </Text>
        <Action variant="secondary" onPress={retry}>
          Coba lagi
        </Action>
      </View>
    );
  return pending ? (
    <View className="py-8">
      <Spinner />
    </View>
  ) : null;
}

export function Empty({ children }: { children: string }) {
  return (
    <Text className="py-3 text-base leading-6 text-muted-foreground">
      {children}
    </Text>
  );
}
