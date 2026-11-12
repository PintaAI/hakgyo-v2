import { Stack } from "expo-router";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "../providers/AppThemeProvider";
import { GameBackToolbar } from "./game-screens";

export type GameStat = {
  value: string;
  /** Muted for counts, foreground for the score, primary for a streak. */
  tone?: "muted" | "foreground" | "primary";
};

/**
 * The native header of a game round, as in Kartu, Hujan Kata and Cocokkan:
 * the back button on the left, the round's numbers on the right (where an
 * in-content progress bar used to be), and any extra header buttons, such as
 * a hint, after them. No title unless the round is part of a lesson.
 */
export function GameRoundHeader({
  title = "",
  onBack,
  backDisabled = false,
  stats,
  statsLabel,
  children,
}: {
  title?: string;
  onBack: () => void;
  backDisabled?: boolean;
  stats: readonly GameStat[];
  /** What VoiceOver reads for the numbers, in a sentence. */
  statsLabel: string;
  /** More `Stack.Toolbar.Button`s for the right side (one toolbar per side). */
  children?: ReactNode;
}) {
  const { colors } = useAppTheme();
  const toneColor = {
    muted: colors.mutedForeground,
    foreground: colors.foreground,
    primary: colors.primary,
  };
  return (
    <>
      <GameBackToolbar disabled={backDisabled} onPress={onBack} />
      <Stack.Screen
        options={{
          gestureEnabled: false,
          headerBackButtonDisplayMode: "minimal",
          headerBackVisible: false,
          headerShadowVisible: false,
          headerShown: true,
          title,
        }}
      />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.View hidesSharedBackground>
          <View accessibilityLabel={statsLabel} style={styles.stats}>
            {stats.map((stat, index) => (
              <Text
                key={index}
                style={[
                  styles.metric,
                  { color: toneColor[stat.tone ?? "muted"] },
                ]}
              >
                {stat.value}
              </Text>
            ))}
          </View>
        </Stack.Toolbar.View>
        {children}
      </Stack.Toolbar>
    </>
  );
}

export type GameBarAction = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** The one action that moves the round on. */
  prominent?: boolean;
  accessibilityLabel?: string;
};

/**
 * The round's actions in the native bottom toolbar, where Kartu keeps its
 * submit and next buttons: secondary actions on the left, the prominent one
 * on the right. Renders nothing without actions.
 */
export function GameActionBar({
  actions,
}: {
  actions: readonly GameBarAction[];
}) {
  const { colors } = useAppTheme();
  if (actions.length === 0) return null;
  const secondary = actions.filter((action) => !action.prominent);
  const prominent = actions.find((action) => action.prominent);
  return (
    <Stack.Toolbar
      placement="bottom"
      backgroundColor={colors.background}
      tintColor={colors.primary}
    >
      {secondary.map((action) => (
        <Stack.Toolbar.Button
          key={action.label}
          accessibilityLabel={action.accessibilityLabel ?? action.label}
          disabled={action.disabled}
          onPress={action.onPress}
        >
          {action.label}
        </Stack.Toolbar.Button>
      ))}
      <Stack.Toolbar.Spacer />
      {prominent ? (
        <Stack.Toolbar.Button
          accessibilityLabel={prominent.accessibilityLabel ?? prominent.label}
          disabled={prominent.disabled}
          onPress={prominent.onPress}
          variant="prominent"
        >
          {prominent.label}
        </Stack.Toolbar.Button>
      ) : null}
    </Stack.Toolbar>
  );
}

const styles = StyleSheet.create({
  stats: { alignItems: "center", flexDirection: "row", gap: 12 },
  metric: {
    fontSize: 13,
    fontVariant: ["tabular-nums"],
    fontWeight: "800",
  },
});
