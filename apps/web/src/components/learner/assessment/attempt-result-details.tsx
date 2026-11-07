"use client";

import { useState } from "react";
import { ListChecksIcon, LoaderCircleIcon } from "lucide-react";
import { formatScoreOutOf } from "@hakgyo/shared";

import { Button } from "~/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { useIsMobile } from "~/hooks/use-mobile";
import { api } from "~/trpc/react";
import { Eyebrow } from "../eyebrow";
import { AssessmentResultReview } from "./assessment-result-review";
import { ScoreBandResults } from "./score-band-results";
import { TagResults } from "./tag-results";

/**
 * The details of a graded attempt, under the "Hasil terakhir" card of the
 * tugas or event screen (which already shows the score and whether it
 * passed), like the app's `AttemptResultDetails`: the score bands, the score
 * per section, the score per question type, and the answer review with
 * explanations when they are open. These screens are where a learner lands
 * after finishing, so the attempt has no result screen of its own. Nothing
 * shows until the attempt is graded.
 */
export function AttemptResultDetails({
  attemptId,
  courseItemId,
}: {
  attemptId: string;
  courseItemId: string;
}) {
  // Prefetched with the event page; loaded when the tugas screen's sheet opens.
  const assessment = api.assessment.getForCourseItem.useQuery({
    courseItemId,
    attemptId,
  });
  const attempt = api.assessment.getMyAttempt.useQuery({ attemptId });
  if (assessment.isPending || attempt.isPending) {
    return (
      <p className="text-muted-foreground flex items-center justify-center gap-2 py-4 text-sm">
        <LoaderCircleIcon className="size-4 animate-spin" />
        Memuat rincian hasil…
      </p>
    );
  }
  const detail = assessment.data;
  const graded = attempt.data;
  // Scores are withheld (null) for invalidated or cancelled participations.
  if (
    !detail ||
    graded?.status !== "GRADED" ||
    graded.score === null ||
    graded.maxScore === null
  ) {
    return null;
  }
  const sections = detail.sections.flatMap((section) => {
    const result = detail.sectionResults.find(
      (entry) => entry.sectionId === section.id,
    );
    return result ? [{ title: section.title, ...result }] : [];
  });

  return (
    <>
      {detail.scoreBands.length || sections.length ? (
        <section className="bg-card flex flex-col gap-3 rounded-2xl border p-4">
          <Eyebrow size="xs">Rincian nilai</Eyebrow>
          <ScoreBandResults
            bands={detail.scoreBands}
            maxScore={graded.maxScore}
            score={graded.score}
          />
          {sections.map((section) => (
            <p
              key={section.sectionId}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span>{section.title}</span>
              <span className="tabular-nums">
                {formatScoreOutOf(section.score, section.maxScore)}
              </span>
            </p>
          ))}
        </section>
      ) : null}
      <TagResults answers={graded.answers} questions={detail.questions} />
      <AssessmentResultReview assessment={detail} attempt={graded} />
    </>
  );
}

/**
 * "Review jawaban kamu" on a course tugas: the finished attempt in full in a
 * sheet over the tugas screen, from the bottom on phones and the side on
 * wider screens, like the app's result sheet. The tugas screen keeps only the
 * "Hasil terakhir" summary.
 */
export function AttemptResultSheet({
  attemptId,
  courseItemId,
}: {
  attemptId: string;
  courseItemId: string;
}) {
  const [open, setOpen] = useState(false);
  // Loaded on the first open, then kept so closing does not blank the sheet.
  const [opened, setOpened] = useState(false);
  const isMobile = useIsMobile();
  return (
    <>
      <Button
        size="lg"
        variant="outline"
        onClick={() => {
          setOpened(true);
          setOpen(true);
        }}
      >
        <ListChecksIcon data-icon="inline-start" />
        Review jawaban kamu
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className="bg-background max-h-[92svh] gap-0 overflow-y-auto rounded-t-[20px] data-[side=right]:w-full data-[side=right]:rounded-none data-[side=right]:sm:max-w-xl"
        >
          <SheetHeader className="px-4 pt-6 sm:px-6">
            <SheetTitle className="text-xl font-black">
              Hasil lengkap
            </SheetTitle>
            <SheetDescription className="sr-only">
              Rincian nilai dan review jawaban percobaan terakhir kamu.
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-4 px-4 pb-10 sm:px-6">
            {opened ? (
              <AttemptResultDetails
                key={attemptId}
                attemptId={attemptId}
                courseItemId={courseItemId}
              />
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
