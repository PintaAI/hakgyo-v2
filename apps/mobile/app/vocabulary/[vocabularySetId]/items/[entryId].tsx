import { entryMeanings } from "@hakgyo/shared";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

import {
  Empty,
  Eyebrow,
  QueryState,
} from "../../../../src/components/learning-ui";
import { HakgyoHero } from "../../../../src/components/learn/hakgyo-hero";
import { EntryImage } from "../../../../src/components/learn/vocabulary-set-detail";
import { VocabularyAudioButton } from "../../../../src/components/vocabulary-audio-button";
import { authClient } from "../../../../src/lib/auth-client";
import { highlightTerm } from "../../../../src/lib/highlight-term";
import { useAppTheme } from "../../../../src/providers/AppThemeProvider";
import { withOpacity } from "../../../../src/theme/colors";
import { useVocabularyPractice } from "../../../../src/sync/hooks";
import { firstParam } from "../../../../src/lib/route-params";
import {
  exampleLines,
  splitExample,
} from "../../../../src/lib/vocabulary-examples";

/**
 * Large for a short word, smaller for a phrase, so the word always fills
 * the spotlight without wrapping awkwardly.
 */
function termStyle(term: string) {
  const length = [...term.trim()].length;
  const fontSize = length <= 3 ? 64 : length <= 6 ? 52 : length <= 12 ? 40 : 30;
  return { fontSize, lineHeight: Math.round(fontSize * 1.2) };
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
  const { colors } = useAppTheme();
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

  const meanings = entryMeanings(entry);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-8 px-5 pb-10"
      contentInsetAdjustmentBehavior="automatic"
    >
      {/* The word in the spotlight on the Hakgyo hero: large and centred,
          its meanings and audio right under it. The sheet sizes to its
          content and closes with a swipe down, so it needs no back button. */}
      <HakgyoHero inSheet>
        <View className="items-center gap-5">
          <Text
            accessibilityRole="header"
            adjustsFontSizeToFit
            className="text-center font-black tracking-tight text-foreground"
            minimumFontScale={0.5}
            numberOfLines={2}
            style={termStyle(entry.term)}
          >
            {entry.term}
          </Text>
          <View className="flex-row flex-wrap justify-center gap-2">
            {meanings.map((meaning, meaningIndex) => (
              <View
                className="rounded-full bg-muted px-4 py-2"
                key={`${meaningIndex}:${meaning}`}
              >
                <Text className="text-base font-semibold text-foreground">
                  {meaning}
                </Text>
              </View>
            ))}
          </View>
          {entry.audioAssetId ? (
            <VocabularyAudioButton
              assetId={entry.audioAssetId}
              entryId={entry.id}
              onSpeak={setSpeakingId}
              size="large"
              speakingId={speakingId}
            />
          ) : null}
        </View>
      </HakgyoHero>

      {entry.imageAssetId ? (
        <EntryImage assetId={entry.imageAssetId} variant="detail" />
      ) : null}

      {examples.length > 0 ? (
        <View className="gap-4">
          <Eyebrow>Contoh</Eyebrow>
          {examples.map((example, exampleIndex) => {
            const { sentence, translation } = splitExample(example);
            return (
              // A quotation with an accent rule, rather than another card.
              <View
                accessible
                className="gap-1 pl-4"
                key={`${exampleIndex}:${example}`}
                style={{
                  borderLeftWidth: 3,
                  borderLeftColor: withOpacity(colors.primary, 0.35),
                }}
              >
                <Text className="text-lg font-medium leading-7 text-foreground">
                  {highlightTerm(sentence, entry.term).map((part, partIndex) =>
                    part.hit ? (
                      <Text
                        key={partIndex}
                        className="font-black"
                        style={{
                          color: colors.primary,
                          textDecorationLine: "underline",
                          textDecorationColor: colors.primary,
                        }}
                      >
                        {part.text}
                      </Text>
                    ) : (
                      part.text
                    ),
                  )}
                </Text>
                {translation ? (
                  <Text className="text-sm leading-5 text-muted-foreground">
                    {translation}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}
    </ScrollView>
  );
}
