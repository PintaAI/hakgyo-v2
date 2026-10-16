import type { Metadata } from "next";

import { TodayAssessmentPractice } from "~/components/learner/today-assessment-practice";
import { TodayVocabularyPractice } from "~/components/learner/today-vocabulary-practice";
import { WeeklyStreak } from "~/components/learner/weekly-streak";
import {
  randomSeed,
  TODAY_ASSESSMENT_QUESTION_COUNT,
  TODAY_VOCABULARY_ROUND_SIZE,
} from "~/lib/learner/practice";
import { requireSession } from "~/server/auth/dal";
import { api, HydrateClient } from "~/trpc/server";

export const metadata: Metadata = { title: "Hari ini" };

export default async function LearnTodayPage() {
  const session = await requireSession();
  const displayName = session.user.name.trim() || "Pelajar Hakgyo";
  // Seeds are picked here so the first rounds render with the page instead of
  // arriving in a request after hydration.
  const vocabularySeed = randomSeed();
  const assessmentSeed = randomSeed();
  // Awaited so the server HTML already shows the data the browser hydrates
  // with; a pending query would render skeletons and then mismatch.
  await Promise.all([
    api.gamification.getMySummary.prefetch(),
    api.practice.getVocabularyPool.prefetch({
      seed: vocabularySeed,
      limit: TODAY_VOCABULARY_ROUND_SIZE,
    }),
    api.practice.getAssessmentSample.prefetch({
      seed: assessmentSeed,
      limit: TODAY_ASSESSMENT_QUESTION_COUNT,
    }),
  ]);

  return (
    <HydrateClient>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <h1 className="flex flex-wrap items-baseline gap-x-2 text-[26px] leading-8 font-black tracking-tight">
          <span>안녕하세요 ·</span>
          <span className="text-muted-foreground text-xl font-normal">
            {displayName}
          </span>
        </h1>
        <WeeklyStreak />
        <TodayVocabularyPractice initialSeed={vocabularySeed} />
        <TodayAssessmentPractice initialSeed={assessmentSeed} />
      </div>
    </HydrateClient>
  );
}
