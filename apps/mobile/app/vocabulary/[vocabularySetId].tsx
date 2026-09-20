import { Stack, useLocalSearchParams } from "expo-router";
import { View } from "react-native";

import { Empty, QueryState } from "../../src/components/learning-ui";
import { VocabularySetDetail } from "../../src/components/learn/vocabulary-set-detail";
import { authClient } from "../../src/lib/auth-client";
import { api } from "../../src/lib/trpc";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default function VocabularySetScreen() {
  const params = useLocalSearchParams<{
    vocabularySetId?: string | string[];
    sourceCourseItemId?: string | string[];
  }>();
  const vocabularySetId = first(params.vocabularySetId);
  const sourceCourseItemId = first(params.sourceCourseItemId);
  const { data: session } = authClient.useSession();
  const query = api.learning.getVocabularyPractice.useQuery(
    { vocabularySetId, sourceCourseItemId },
    { enabled: Boolean(vocabularySetId && sourceCourseItemId && session) },
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerBackButtonDisplayMode: "minimal",
          headerShown: true,
          title: query.data?.title ?? "Vocabulary",
        }}
      />
      {query.data ? (
        <VocabularySetDetail
          courseId={query.data.courseId}
          courseItemId={query.data.practiceCourseItemId}
          vocabulary={{
            id: query.data.id,
            title: query.data.title,
            description: query.data.description,
            entries: query.data.entries.map((entry) => ({
              id: entry.id,
              term: entry.term,
              definition: entry.definition,
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
            pending={
              query.isPending && Boolean(vocabularySetId && sourceCourseItemId)
            }
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
