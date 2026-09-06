import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Stack } from "expo-router";
import { useAppTheme } from "../providers/AppThemeProvider";

export function StudyScreen({
  title,
  children,
  refreshing = false,
  onRefresh,
}: {
  title: string;
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <>
      <Stack.Screen options={{ title, headerShown: true }} />
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="gap-6 px-5 pt-4 pb-12"
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
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
        {children}
      </ScrollView>
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

export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View className="gap-3">
      <Text className="text-xl font-bold text-foreground">{title}</Text>
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
