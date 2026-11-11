import { Stack } from "expo-router";
import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";

import { Action, Empty, FullScreenState } from "../components/learning-ui";
import { toolbarIcons } from "../theme/toolbar-icons";

export function GameBackToolbar({
  accessibilityLabel = "Kembali ke Latihan",
  disabled = false,
  onPress,
}: {
  accessibilityLabel?: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Stack.Toolbar placement="left">
      <Stack.Toolbar.Button
        accessibilityLabel={accessibilityLabel}
        disabled={disabled}
        icon={toolbarIcons.back}
        onPress={onPress}
      />
    </Stack.Toolbar>
  );
}

export function GamePage({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: 20, gap: 24, paddingBottom: 40 }}
    >
      {children}
    </ScrollView>
  );
}

type HeaderProps = { title: string; onBack: () => void; backLabel?: string };

/** The header of a game page that is not a round: the title and a way back. */
function GameHeader({ title, onBack, backLabel }: HeaderProps) {
  return (
    <>
      <GameBackToolbar accessibilityLabel={backLabel} onPress={onBack} />
      <Stack.Screen
        options={{
          headerBackButtonDisplayMode: "minimal",
          headerBackVisible: false,
          headerShadowVisible: false,
          headerShown: true,
          title,
        }}
      />
    </>
  );
}

/** A game still loading what it plays on. */
export function GameLoading(props: HeaderProps) {
  return (
    <>
      <GameHeader {...props} />
      <FullScreenState kind="loading" />
    </>
  );
}

/** A game that cannot be played, with the reason and the way back. */
export function GameUnavailable({
  children,
  backAction = "Kembali",
  ...header
}: HeaderProps & { children: string; backAction?: string }) {
  return (
    <View className="flex-1 bg-background">
      <GameHeader {...header} />
      <GamePage>
        <Empty>{children}</Empty>
        <Action onPress={header.onBack}>{backAction}</Action>
      </GamePage>
    </View>
  );
}
