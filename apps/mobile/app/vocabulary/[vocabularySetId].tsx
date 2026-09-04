import { router, Stack, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { api } from "../../src/lib/trpc";

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default function VocabularyPracticeScreen() {
  const params = useLocalSearchParams<{
    vocabularySetId: string | string[];
    sourceCourseItemId: string | string[];
  }>();
  const vocabularySetId = firstParam(params.vocabularySetId);
  const sourceCourseItemId = firstParam(params.sourceCourseItemId);
  const vocabulary = api.learning.getVocabularyPractice.useQuery(
    { vocabularySetId, sourceCourseItemId },
    { enabled: Boolean(vocabularySetId && sourceCourseItemId), retry: false },
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: "Hafalkan kosakata" }} />
      {vocabulary.isPending ? (
        <View className="flex-1 items-center justify-center gap-3 bg-background">
          <ActivityIndicator />
          <Text className="text-sm text-muted-foreground">
            Loading vocabulary…
          </Text>
        </View>
      ) : vocabulary.isError || !vocabulary.data ? (
        <View className="flex-1 items-center justify-center gap-4 bg-background px-6">
          <Text className="text-xl font-black text-foreground">
            Vocabulary unavailable
          </Text>
          <Pressable
            className="rounded-full border border-border px-5 py-3"
            onPress={() => router.back()}
          >
            <Text className="font-bold text-foreground">Go back</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          className="flex-1 bg-background"
          contentContainerClassName="px-5 py-10"
          contentInsetAdjustmentBehavior="automatic"
        >
          <View className="items-center gap-4 rounded-xl border border-border bg-card p-7">
            <View className="size-14 items-center justify-center rounded-xl bg-primary/10">
              <Text className="text-2xl font-black text-primary">V</Text>
            </View>
            <Text className="text-xs font-black uppercase tracking-[2px] text-primary">
              Hafalkan kosakata
            </Text>
            <Text className="text-center text-3xl font-black text-foreground">
              {vocabulary.data.title}
            </Text>
            {vocabulary.data.description ? (
              <Text className="text-center text-sm leading-6 text-muted-foreground">
                {vocabulary.data.description}
              </Text>
            ) : null}
            <View className="mt-2 w-full rounded-xl border border-dashed border-border bg-muted/30 p-6">
              <Text className="text-center font-bold text-foreground">
                Memorization mode is coming soon
              </Text>
              <Text className="mt-2 text-center text-sm text-muted-foreground">
                {vocabulary.data._count.entries} words are ready for the future
                practice experience.
              </Text>
            </View>
            <Pressable
              className="mt-2 rounded-full border border-border px-5 py-3"
              onPress={() => router.back()}
            >
              <Text className="font-bold text-foreground">Back to material</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}
    </>
  );
}
