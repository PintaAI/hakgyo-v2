"use client";

import { LoaderCircleIcon } from "lucide-react";
import { formatScore } from "@hakgyo/shared";

import { StudyCard } from "~/components/learner/assessment/assessment-ui";
import { Eyebrow } from "../eyebrow";
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
  rules = [],
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
  /** The section's rules (`sectionRules`), listed before it starts. */
  rules?: readonly string[];
  onStart: () => void;
}) {
  return (
    <StudyCard className="rounded-2xl">
      <Eyebrow>
        Bagian {position} dari {sectionCount}
      </Eyebrow>
      <h2 className="text-2xl font-black">{title}</h2>
      <p className="text-muted-foreground text-sm">
        {questionCount} soal
        {timeLimitSeconds
          ? ` · ${formatScore(timeLimitSeconds / 60)} menit`
          : " · tanpa batas waktu"}
      </p>
      {instructions ? <RichContent content={instructions} /> : null}
      {rules.length ? (
        <ul className="flex flex-col gap-1.5">
          {rules.map((rule) => (
            <li key={rule} className="text-sm font-semibold">
              • {rule}
            </li>
          ))}
        </ul>
      ) : null}
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
