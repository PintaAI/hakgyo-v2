import { Stack, useLocalSearchParams } from "expo-router";
import { View } from "react-native";

import { Empty, QueryState } from "../../src/components/learning-ui";
import { VocabularySetDetail } from "../../src/components/learn/vocabulary-set-detail";
import { authClient } from "../../src/lib/auth-client";
import { useVocabularyPractice } from "../../src/sync/hooks";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default function VocabularySetScreen() {
  const params = useLocalSearchParams<{
    vocabularySetId?: string | string[];
    sourceCourseItemId?: string | string[];
    courseId?: string | string[];
  }>();
  const vocabularySetId = first(params.vocabularySetId);
  const sourceCourseItemId = first(params.sourceCourseItemId);
  const courseId = first(params.courseId);
  const { data: session } = authClient.useSession();
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
          title: vocabulary?.title ?? "Vocabulary",
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
              definition: entry.definition,
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
            <Empty>Open a vocabulary set from a course or lesson.</Empty>
          ) : null}
        </View>
      )}
    </>
  );
}
