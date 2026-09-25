import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { Empty, QueryState } from "../../../../src/components/learning-ui";
import { EntryImage } from "../../../../src/components/learn/vocabulary-set-detail";
import { StudyAction } from "../../../../src/components/study-glass";
import { VocabularyAudioButton } from "../../../../src/components/vocabulary-audio-button";
import { authClient } from "../../../../src/lib/auth-client";
import { api } from "../../../../src/lib/trpc";
import { useAppTheme } from "../../../../src/providers/AppThemeProvider";
import { dashboardVocabularyPractice } from "../../../../src/sync/dashboard-cache";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function exampleLines(value: unknown) {
  if (Array.isArray(value))
    return value.filter(
      (example): example is string =>
        typeof example === "string" && Boolean(example.trim()),
    );
  return typeof value === "string"
    ? value.split("\n").filter((example) => Boolean(example.trim()))
    : [];
}

export default function VocabularyItemSheet() {
  const params = useLocalSearchParams<{
    vocabularySetId?: string | string[];
    entryId?: string | string[];
    sourceCourseItemId?: string | string[];
  }>();
  const vocabularySetId = first(params.vocabularySetId);
  const entryId = first(params.entryId);
  const sourceCourseItemId = first(params.sourceCourseItemId);
  const { data: session } = authClient.useSession();
  const { activeOrganizationId } = useAppTheme();
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const dashboard = api.mobileSync.getDashboard.useQuery(
    activeOrganizationId ? { organizationId: activeOrganizationId } : undefined,
    { enabled: Boolean(session && activeOrganizationId), retry: false },
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
        session &&
        vocabularySetId &&
        sourceCourseItemId &&
        !dashboard.isPending &&
        !dashboardPractice,
      ),
      initialData: dashboardPractice,
      retry: false,
    },
  );
  const vocabulary = dashboardPractice ?? query.data;
  const index =
    vocabulary?.entries.findIndex((entry) => entry.id === entryId) ?? -1;
  const entry = index >= 0 ? vocabulary?.entries[index] : undefined;
  const examples = exampleLines(entry?.examples);

  if (!entry || !vocabulary) {
    return (
      <View className="gap-4 px-5 pb-6 pt-6">
        <QueryState
          error={dashboard.error ?? query.error}
          pending={
            (dashboard.isPending || query.isPending) &&
            Boolean(vocabularySetId && sourceCourseItemId)
          }
          retry={() => {
            void dashboard.refetch();
            void query.refetch();
          }}
        />
        {vocabulary && !entry ? <Empty>Word unavailable.</Empty> : null}
        {!vocabularySetId || !sourceCourseItemId ? (
          <Empty>Open a word from its vocabulary set.</Empty>
        ) : null}
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="gap-6 px-5 pb-6 pt-6"
      contentInsetAdjustmentBehavior="automatic"
    >
      <View className="gap-3">
        <View className="gap-1.5">
          <Text className="text-center text-[11px] font-bold uppercase tracking-[1.5px] text-primary">
            Word {index + 1} of {vocabulary.entries.length}
          </Text>
          <View className="flex-row items-center gap-3">
            <Text
              accessibilityRole="header"
              className="min-w-0 flex-1 text-[28px] font-black leading-8 tracking-tight text-foreground"
            >
              {entry.term}
            </Text>
            {entry.audioAssetId ? (
              <VocabularyAudioButton
                assetId={entry.audioAssetId}
                entryId={entry.id}
                onSpeak={setSpeakingId}
                speakingId={speakingId}
              />
            ) : null}
          </View>
          <Text className="text-sm leading-5 text-muted-foreground">
            {vocabulary.title}
          </Text>
        </View>
        <View
          accessibilityRole="progressbar"
          accessibilityValue={{
            min: 0,
            max: vocabulary.entries.length,
            now: index + 1,
          }}
          className="h-1 overflow-hidden rounded-full bg-muted"
        >
          <View
            className="h-full rounded-full bg-primary"
            style={{
              width: `${((index + 1) / vocabulary.entries.length) * 100}%`,
            }}
          />
        </View>
      </View>

      {entry.imageAssetId ? (
        <EntryImage assetId={entry.imageAssetId} variant="detail" />
      ) : null}

      <View className="gap-1.5 border-t border-border pt-5">
        <Text className="text-[11px] font-bold uppercase tracking-[1.5px] text-primary">
          Meaning
        </Text>
        <Text className="text-base font-bold leading-6 text-foreground">
          {entry.definition}
        </Text>
      </View>

      {examples.length > 0 ? (
        <View className="gap-2 border-t border-border pt-5">
          <Text className="text-[11px] font-bold uppercase tracking-[1.5px] text-primary">
            {examples.length === 1 ? "Example" : "Examples"}
          </Text>
          {examples.map((example, exampleIndex) => (
            <Text
              className="text-sm leading-5 text-muted-foreground"
              key={`${exampleIndex}:${example}`}
            >
              “{example}”
            </Text>
          ))}
        </View>
      ) : null}

      <StudyAction onPress={() => router.back()} secondary>
        Back to words
      </StudyAction>
    </ScrollView>
  );
}
