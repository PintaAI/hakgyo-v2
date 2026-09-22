import { router, Stack } from "expo-router";
import { Text, View } from "react-native";

import { Action, Empty } from "../../components/learning-ui";
import { GameStartModal } from "../game-modals";
import { GameBackToolbar, GamePage } from "../game-screens";

export function SyllableForgeScreen() {
  const leave = () => router.dismissTo("/(home)/(tabs)/assessments");

  return (
    <View className="flex-1 bg-background">
      <GameBackToolbar onPress={leave} />
      <Stack.Screen
        options={{
          headerBackButtonDisplayMode: "minimal",
          headerBackVisible: false,
          headerShown: true,
          title: "Syllable Forge",
        }}
      />
      <GamePage>
        <Text className="text-4xl font-black text-primary">한</Text>
        <Text className="text-2xl font-bold text-foreground">
          Syllable Forge
        </Text>
        <Text className="text-base text-muted-foreground">
          Build Hangeul syllable blocks from their initial, vowel, and batchim.
        </Text>
        <Empty>Gameplay is coming soon.</Empty>
        <Action onPress={leave}>Back to practice</Action>
      </GamePage>
      <GameStartModal
        detail="The Hangeul keyboard and syllable-building interaction will be added here."
        gameKey="syllable-forge"
        onPrimary={() => undefined}
        onSecondary={leave}
        primaryDisabled
        primaryLabel="Coming soon"
        title="Syllable Forge"
        visible
      />
    </View>
  );
}
