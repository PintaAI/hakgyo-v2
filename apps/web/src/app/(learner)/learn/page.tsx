import type { Metadata } from "next";

import { TodayAssessmentPractice } from "~/components/learner/today-assessment-practice";
import { TodayVocabularyPractice } from "~/components/learner/today-vocabulary-practice";
import { WeeklyStreak } from "~/components/learner/weekly-streak";
import { requireSession } from "~/server/auth/dal";

export const metadata: Metadata = { title: "Hari ini" };

export default async function LearnTodayPage() {
  const session = await requireSession();
  const displayName = session.user.name.trim() || "Pelajar Hakgyo";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <h1 className="flex flex-wrap items-baseline gap-x-2 text-[26px] leading-8 font-black tracking-tight">
        <span>안녕하세요 ·</span>
        <span className="text-muted-foreground text-xl font-normal">
          {displayName}
        </span>
      </h1>
      <WeeklyStreak />
      <TodayVocabularyPractice />
      <TodayAssessmentPractice />
    </div>
  );
}
