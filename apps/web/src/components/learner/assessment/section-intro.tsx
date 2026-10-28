"use client";

import { LoaderCircleIcon } from "lucide-react";
import { formatScore } from "@hakgyo/shared";

import { StudyCard } from "~/components/learner/assessment/assessment-ui";
import { RichContent } from "~/components/learner/practice/rich-content";
import { Button } from "~/components/ui/button";
import { formatRemaining } from "~/lib/learner/question-progress";

/**
 * The screen before a section starts: its name, instructions, question count and time, with a
 * start button. The section starts by itself when `secondsToAutoStart` reaches zero, so its clock
 * never waits long (docs/eps-topik-simulation.md section 4.2). Mirrors the mobile intro.
 */
export function SectionIntro({
  title,
  instructions,
  position,
  sectionCount,
  questionCount,
  timeLimitSeconds,
  secondsToAutoStart,
  busy,
  onStart,
}: {
  title: string;
  instructions: unknown;
  position: number;
  sectionCount: number;
  questionCount: number;
  timeLimitSeconds: number | null;
  secondsToAutoStart: number;
  busy: boolean;
  onStart: () => void;
}) {
  return (
    <StudyCard>
      <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        Bagian {position} dari {sectionCount}
      </p>
      <h2 className="text-2xl font-black">{title}</h2>
      <p className="text-muted-foreground text-sm">
        {questionCount} soal
        {timeLimitSeconds
          ? ` · ${formatScore(timeLimitSeconds / 60)} menit`
          : " · tanpa batas waktu"}
      </p>
      {instructions ? <RichContent content={instructions} /> : null}
      <p className="text-muted-foreground text-sm">
        Waktu bagian ini berjalan setelah kamu menekan Mulai. Bagian yang sudah
        selesai tidak bisa dibuka lagi.
      </p>
      <Button size="lg" disabled={busy} onClick={onStart}>
        {busy ? (
          <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />
        ) : null}
        Mulai bagian
      </Button>
      <p
        aria-live="polite"
        className="text-muted-foreground text-center text-xs"
      >
        Dimulai otomatis dalam {formatRemaining(secondsToAutoStart)}
      </p>
    </StudyCard>
  );
}
