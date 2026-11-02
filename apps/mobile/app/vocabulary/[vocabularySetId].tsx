import { entryMeanings } from "@hakgyo/shared";
import { Stack, useLocalSearchParams } from "expo-router";
import { Platform, View } from "react-native";

import { Empty, QueryState } from "../../src/components/learning-ui";
import { VocabularySetDetail } from "../../src/components/learn/vocabulary-set-detail";
import { authClient } from "../../src/lib/auth-client";
import { useAppTheme } from "../../src/providers/AppThemeProvider";
import { useVocabularyPractice } from "../../src/sync/hooks";
import { firstParam } from "../../src/lib/route-params";

export default function VocabularySetScreen() {
  const params = useLocalSearchParams<{
    vocabularySetId?: string | string[];
    sourceCourseItemId?: string | string[];
    courseId?: string | string[];
  }>();
  const vocabularySetId = firstParam(params.vocabularySetId);
  const sourceCourseItemId = firstParam(params.sourceCourseItemId);
  const courseId = firstParam(params.courseId);
  const { data: session } = authClient.useSession();
  const { colors } = useAppTheme();
  // Composed from the local course bundle; online only when it is missing.
  const query = useVocabularyPractice(vocabularySetId, sourceCourseItemId, {
    courseId: courseId || undefined,
    enabled: Boolean(session),
  });
  const vocabulary = query.data;

  return (
    <>
      <Stack.Screen
        options={{
          headerBackButtonDisplayMode: "minimal",
          headerShown: true,
          // The title is in the hero; the header carries only the back button
          // over the content, as the material screen does.
          title: "",
          headerShadowVisible: false,
          headerTransparent: Platform.OS === "ios",
          headerStyle: {
            backgroundColor:
              Platform.OS === "ios" ? "transparent" : colors.background,
          },
          scrollEdgeEffects: { top: "soft" },
        }}
      />
      {vocabulary ? (
        <VocabularySetDetail
          courseId={vocabulary.courseId}
          courseItemId={vocabulary.practiceCourseItemId}
          vocabulary={{
            id: vocabulary.id,
            title: vocabulary.title,
            description: vocabulary.description,
            entries: vocabulary.entries.map((entry) => ({
              id: entry.id,
              term: entry.term,
              meanings: entryMeanings(entry),
              examples: entry.examples,
              audioAsset: entry.audioAssetId
                ? { id: entry.audioAssetId }
                : null,
              imageAsset: entry.imageAssetId
                ? { id: entry.imageAssetId }
                : null,
            })),
          }}
        />
      ) : (
        <View className="flex-1 gap-4 bg-background px-5 pt-4">
          <QueryState
            error={query.error}
            pending={query.isPending}
            retry={() => void query.refetch()}
          />
          {!vocabularySetId || !sourceCourseItemId ? (
            <Empty>Buka set kosakata dari kurikulum atau materi.</Empty>
          ) : null}
        </View>
      )}
    </>
  );
}
