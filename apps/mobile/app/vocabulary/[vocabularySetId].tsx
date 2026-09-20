import { Stack, useLocalSearchParams } from "expo-router";
import { View } from "react-native";

import { Empty, QueryState } from "../../src/components/learning-ui";
import { VocabularySetDetail } from "../../src/components/learn/vocabulary-set-detail";
import { authClient } from "../../src/lib/auth-client";
import { api } from "../../src/lib/trpc";
import { useAppTheme } from "../../src/providers/AppThemeProvider";
import { dashboardVocabularyPractice } from "../../src/sync/dashboard-cache";

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
  const { activeOrganizationId } = useAppTheme();
  const dashboard = api.mobileSync.getDashboard.useQuery(
    activeOrganizationId ? { organizationId: activeOrganizationId } : undefined,
    { enabled: Boolean(session && vocabularySetId), retry: false },
  );
  const dashboardPractice = dashboard.data
    ? dashboardVocabularyPractice(dashboard.data, {
        vocabularySetId,
        sourceCourseItemId,
      })
    : undefined;
  const query = api.learning.getVocabularyPractice.useQuery(
    { vocabularySetId, sourceCourseItemId },
    {
      enabled: Boolean(
        vocabularySetId &&
        sourceCourseItemId &&
        session &&
        !dashboard.isPending &&
        !dashboardPractice,
      ),
      initialData: dashboardPractice,
      retry: false,
    },
  );
  const vocabulary = dashboardPractice ?? query.data;

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
              imageAsset: entry.imageAssetId
                ? { id: entry.imageAssetId }
                : null,
            })),
          }}
        />
      ) : (
        <View className="flex-1 gap-4 bg-background px-5 pt-4">
          <QueryState
            error={dashboard.error ?? query.error}
            pending={
              (dashboard.isPending || query.isPending) &&
              Boolean(vocabularySetId && sourceCourseItemId)
            }
            retry={() => void dashboard.refetch()}
          />
          {!vocabularySetId || !sourceCourseItemId ? (
            <Empty>Open a vocabulary set from a course or lesson.</Empty>
          ) : null}
        </View>
      )}
    </>
  );
}
