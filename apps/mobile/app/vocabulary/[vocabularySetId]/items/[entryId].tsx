import { entryMeanings } from "@hakgyo/shared";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

import {
  Empty,
  Eyebrow,
  ProgressBar,
  QueryState,
} from "../../../../src/components/learning-ui";
import { EntryImage } from "../../../../src/components/learn/vocabulary-set-detail";
import { StudyAction } from "../../../../src/components/study-glass";
import { VocabularyAudioButton } from "../../../../src/components/vocabulary-audio-button";
import { VocabularyMeanings } from "../../../../src/components/vocabulary-meanings";
import { authClient } from "../../../../src/lib/auth-client";
import { useVocabularyPractice } from "../../../../src/sync/hooks";
import { firstParam } from "../../../../src/lib/route-params";

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
    courseId?: string | string[];
  }>();
  const vocabularySetId = firstParam(params.vocabularySetId);
  const entryId = firstParam(params.entryId);
  const sourceCourseItemId = firstParam(params.sourceCourseItemId);
  const courseId = firstParam(params.courseId);
  const { data: session } = authClient.useSession();
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const query = useVocabularyPractice(vocabularySetId, sourceCourseItemId, {
    courseId: courseId || undefined,
    enabled: Boolean(session),
  });
  const vocabulary = query.data;
  const index =
    vocabulary?.entries.findIndex((entry) => entry.id === entryId) ?? -1;
  const entry = index >= 0 ? vocabulary?.entries[index] : undefined;
  const examples = exampleLines(entry?.examples);

  if (!entry || !vocabulary) {
    return (
      <View className="gap-4 px-5 pb-6 pt-6">
        <QueryState
          error={query.error}
          pending={query.isPending}
          retry={() => void query.refetch()}
        />
        {vocabulary && !entry ? <Empty>Kata tidak tersedia.</Empty> : null}
        {!vocabularySetId || !sourceCourseItemId ? (
          <Empty>Buka kata dari set kosakatanya.</Empty>
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
          <Eyebrow tone="primary" className="text-center">
            Word {index + 1} of {vocabulary.entries.length}
          </Eyebrow>
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
        <ProgressBar
          max={vocabulary.entries.length}
          size="sm"
          value={index + 1}
        />
      </View>

      {entry.imageAssetId ? (
        <EntryImage assetId={entry.imageAssetId} variant="detail" />
      ) : null}

      <View className="gap-1.5 border-t border-border pt-5">
        <Eyebrow tone="primary">Arti</Eyebrow>
        <VocabularyMeanings
          className="text-base font-bold leading-6 text-foreground"
          meanings={entryMeanings(entry)}
        />
      </View>

      {examples.length > 0 ? (
        <View className="gap-2 border-t border-border pt-5">
          <Eyebrow tone="primary">Contoh</Eyebrow>
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
        Kembali ke daftar kata
      </StudyAction>
    </ScrollView>
  );
}
