import { router } from "expo-router";
import { ScrollView } from "react-native";

import { AttemptResultDetails } from "./attempt-result-details";
import { HakgyoHero } from "./learn/hakgyo-hero";
import { HeroTitle } from "./learn/hero-parts";

/**
 * A finished attempt in full, as a form sheet over its tugas, latihan or
 * tryout screen: the score bands, the score per section and question type,
 * and the answer review. The screen under it keeps only the summary.
 */
export function AttemptResultSheet({
  attemptId,
  courseItemId,
  initialQuestion,
}: {
  attemptId: string;
  /** Null for attempts of library events. */
  courseItemId: string | null;
  /** The review opens at this question (from the preview on the screen). */
  initialQuestion?: number;
}) {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="bg-background"
      contentContainerClassName="gap-4 px-5 pb-10"
    >
      {/* A slim hero: the score already sits in the tugas page's own hero
          under this sheet, so here only the title. */}
      <HakgyoHero
        inSheet
        className="pb-4"
        onClose={() => router.back()}
        closeLabel="Tutup hasil lengkap"
      >
        <HeroTitle
          eyebrow="Pembahasan"
          title="Hasil lengkap"
          description="Nilai per bagian dan jenis soal, lalu jawabanmu satu per satu."
        />
      </HakgyoHero>
      {attemptId ? (
        <AttemptResultDetails
          key={attemptId}
          attemptId={attemptId}
          courseItemId={courseItemId}
          initialQuestion={initialQuestion}
        />
      ) : null}
    </ScrollView>
  );
}

/** A question index from a route parameter, if it is one. */
export function questionParam(value: string | undefined) {
  if (!value) return undefined;
  const question = Number(value);
  return Number.isInteger(question) && question >= 0 ? question : undefined;
}
