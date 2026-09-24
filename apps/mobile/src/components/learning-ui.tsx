import {
  useCallback,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  ActivityIndicator,
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
import { useAppTheme } from "../providers/AppThemeProvider";

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
}) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const viewportRef = useRef<View>(null);
  const [keyboardVerticalOffset, setKeyboardVerticalOffset] = useState(0);
  const behavior = bleedTop ? "never" : contentInsetAdjustmentBehavior;
  const measureViewportOffset = useCallback(() => {
    viewportRef.current?.measureInWindow((_x, y) => {
      setKeyboardVerticalOffset((current) =>
        Math.abs(current - y) < 1 ? current : y,
      );
    });
  }, []);
  const content = (
    <View
      className={`${fillViewport ? "flex-1" : ""} ${bleedTop ? "gap-6 px-5 pb-12 pt-0" : "gap-6 px-5 pb-12 pt-4"}`}
      style={
        bleedTop ? { paddingBottom: Math.max(insets.bottom, 48) } : undefined
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

export function Action({
  children,
  onPress,
  disabled = false,
  secondary = false,
}: {
  children: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={`min-h-12 items-center justify-center rounded-2xl border px-5 py-3 ${secondary ? "border-border bg-card" : "border-primary bg-primary"}`}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <Text
        className={`text-base font-semibold ${secondary ? "text-foreground" : "text-primary-foreground"}`}
      >
        {children}
      </Text>
    </Pressable>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return (
    <View className="gap-3 overflow-hidden rounded-2xl border border-border bg-card p-4">
      {children}
    </View>
  );
}

export function Eyebrow({
  children,
  tone = "muted",
}: {
  children: string;
  tone?: "muted" | "primary";
}) {
  return (
    <Text
      className={`text-[11px] font-bold uppercase tracking-[1.5px] ${tone === "primary" ? "text-primary" : "text-muted-foreground"}`}
    >
      {children}
    </Text>
  );
}

export function PrimaryAction({
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
      className="flex-row items-center gap-3 rounded-2xl bg-primary px-5 py-4 active:opacity-80"
      onPress={onPress}
    >
      <View className="min-w-0 flex-1 gap-1">
        <Text className="text-[11px] font-bold uppercase tracking-[1.5px] text-primary-foreground/70">
          {eyebrow}
        </Text>
        <Text
          className="text-lg font-black leading-6 text-primary-foreground"
          numberOfLines={2}
        >
          {title}
        </Text>
        {detail ? (
          <Text
            className="text-xs font-semibold text-primary-foreground/70"
            numberOfLines={2}
          >
            {detail}
          </Text>
        ) : null}
      </View>
      <Text className="text-2xl text-primary-foreground">›</Text>
    </Pressable>
  );
}

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
        <Text className="text-[11px] font-bold uppercase tracking-[1.5px] text-primary">
          {eyebrow}
        </Text>
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

export function Section({
  title,
  children,
  isFirst = false,
  titleAlign = "left",
}: {
  title: string;
  children: ReactNode;
  isFirst?: boolean;
  titleAlign?: "left" | "center";
}) {
  const insets = useSafeAreaInsets();
  const centered = titleAlign === "center";
  return (
    <View
      className="gap-3"
      style={
        isFirst
          ? { paddingTop: insets.top + (centered ? 24 : 12) }
          : centered
            ? { paddingTop: 12 }
            : undefined
      }
    >
      <Text
        className={`text-xl font-bold text-foreground ${centered ? "text-center" : "text-left"}`}
      >
        {title}
      </Text>
      {children}
    </View>
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
        <Text className="text-lg text-muted-foreground">
          {disabled ? "Locked" : "›"}
        </Text>
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
          {error.message}
        </Text>
        <Action secondary onPress={retry}>
          Try again
        </Action>
      </View>
    );
  return pending ? (
    <ActivityIndicator accessibilityLabel="Loading" className="py-8" />
  ) : null;
}

export function Empty({ children }: { children: string }) {
  return (
    <Text className="py-3 text-base leading-6 text-muted-foreground">
      {children}
    </Text>
  );
}
