"use client";

import { formatScoreOutOf } from "@hakgyo/shared";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, ArrowRightIcon, LoaderCircleIcon } from "lucide-react";

import Link from "~/components/link";
import { LocalDateTime } from "~/components/local-date-time";
import { Button, buttonVariants } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { api, type RouterOutputs } from "~/trpc/react";
import { Eyebrow } from "../eyebrow";
import { CardFan, HakgyoHero, heroTitleClass } from "../learn/hakgyo-hero";
import {
  AssessmentMediaStatus,
  useAssessmentMediaPreload,
} from "./assessment-media";
import { QuestionCountFace } from "./assessment-introduction";
import {
  AssessmentFacts,
  AssessmentOverview,
  QuestionPreview,
} from "./assessment-overview";
import { AttemptResultDetails } from "./attempt-result-details";

const openingDate = new Intl.DateTimeFormat("id-ID", {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/**
 * An assessment event (tryout or latihan), like the app's event screen: the
 * same hero as a course tugas with the opening and closing time, the first
 * question as a sample, the latest result, the leaderboard, and the finished
 * attempt in full (where the learner lands after finishing).
 */
export function AssessmentEvent({
  event,
}: {
  event: RouterOutputs["assessmentEvent"]["getForLearner"];
}) {
  const router = useRouter();
  const utils = api.useUtils();
  const start = api.assessmentEvent.startAttempt.useMutation();
  const attempt = event.attempts[0];
  const participant = event.participants[0];
  const invalidated = Boolean(participant?.invalidatedAt);
  const assessment = event.courseItem.assessment;
  const questionCount = assessment?._count.questions ?? 0;
  const attemptHref = (attemptId: string) =>
    `/learn/${event.course.id}/items/${event.courseItem.id}/attempts/${attemptId}`;
  const opensAt = event.status === "SCHEDULED" ? event.opensAt : null;
  // Download the question media ahead once the event is open, while the connection is good.
  const media = useAssessmentMediaPreload(
    event.media.map((asset) => asset.assetId),
  );
  const mediaSizes = useMemo(
    () => new Map(event.media.map((asset) => [asset.assetId, asset.size])),
    [event.media],
  );

  // A scheduled event becomes startable at its opening time.
  useEffect(() => {
    if (!opensAt) return;
    const wait = opensAt.getTime() - Date.now();
    if (wait <= 0 || wait > 24 * 60 * 60_000) return;
    const timer = window.setTimeout(() => router.refresh(), wait + 1000);
    return () => window.clearTimeout(timer);
  }, [opensAt, router]);

  async function begin() {
    if (invalidated) return;
    try {
      const created = await start.mutateAsync({ eventId: event.id });
      void utils.assessmentEvent.invalidate();
      router.replace(attemptHref(created.id));
    } catch {
      // The mutation error is shown under the action.
    }
  }

  const primaryAction = event.entry.canStart
    ? "Mulai tugas berwaktu"
    : event.entry.canReattempt
      ? "Kerjakan ulang tugas"
      : null;
  const statusNote = invalidated ? (
    (participant?.invalidationReason ??
    "Partisipasi tidak tersedia. Hubungi tim kurikulum kamu.")
  ) : !primaryAction && !attempt ? (
    event.status === "CANCELLED" ? (
      "Event ini dibatalkan."
    ) : event.status === "CLOSED" ? (
      "Event telah ditutup. Tidak ada attempt yang tercatat."
    ) : opensAt ? (
      <>
        Dibuka <LocalDateTime value={opensAt} format={openingDate} />. Kamu bisa
        mulai mengerjakan saat itu.
      </>
    ) : (
      "Event ini belum dibuka untuk dikerjakan."
    )
  ) : null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <HakgyoHero
        back={
          <Link
            href="/learn/assessments"
            aria-label="Kembali ke Latihan"
            className={buttonVariants({ variant: "ghost", size: "icon" })}
          >
            <ArrowLeftIcon />
          </Link>
        }
      >
        <CardFan
          faces={[
            <QuestionCountFace key="count" count={questionCount} />,
            <div key="second" />,
            <div key="third" />,
          ]}
        />
        <div className="flex flex-col items-center gap-2">
          <Eyebrow size="md" tone="primary" className="text-center">
            {event.type === "TRYOUT" ? "Tryout" : "Latihan"} ·{" "}
            {event.cohort?.name ?? event.course.title}
          </Eyebrow>
          <h1 className={heroTitleClass}>{assessment?.title ?? event.title}</h1>
          {assessment?.description ? (
            <p className="text-muted-foreground text-center text-sm leading-6">
              {assessment.description}
            </p>
          ) : null}
        </div>
        <AssessmentFacts
          timeLimitMinutes={event.durationMinutes}
          passingScore={assessment?.passingScore ?? null}
          maxAttempts={assessment?.maxAttempts ?? null}
          attemptsUsed={event.attemptCount}
          opensAt={opensAt}
          closesAt={event.closesAt}
        />
        <AssessmentMediaStatus
          progress={media.progress}
          sizes={mediaSizes}
          onRetry={media.retry}
        />
        {primaryAction ? (
          <Button
            size="lg"
            // Like a course tugas: retrying after a result is optional.
            variant={attempt ? "secondary" : "default"}
            disabled={start.isPending}
            onClick={() => void begin()}
          >
            {start.isPending ? (
              <LoaderCircleIcon
                data-icon="inline-start"
                className="animate-spin"
              />
            ) : null}
            {start.isPending ? "Memulai…" : primaryAction}
            {start.isPending ? null : <ArrowRightIcon data-icon="inline-end" />}
          </Button>
        ) : null}
        {statusNote ? (
          <p
            className={cn(
              "text-center text-sm",
              invalidated ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {statusNote}
          </p>
        ) : null}
        {start.isError ? (
          <p role="alert" className="text-destructive text-center text-sm">
            {start.error.message || "Tryout tidak dapat dimulai."}
          </p>
        ) : null}
      </HakgyoHero>

      {!attempt && primaryAction && event.previewQuestion ? (
        <QuestionPreview
          question={event.previewQuestion}
          total={questionCount}
        />
      ) : null}

      <AssessmentOverview
        passingScore={assessment?.passingScore ?? null}
        latestAttempt={attempt}
        canReattempt={event.entry.canReattempt}
        gatesProgress={false}
      />

      {event.leaderboard ? (
        <section className="bg-card flex flex-col gap-3 rounded-2xl border p-4">
          <Eyebrow size="xs">Leaderboard</Eyebrow>
          <p className="text-muted-foreground text-sm leading-5">
            Percobaan terbaik yang sudah direview yang dihitung. Nilai seri
            ditentukan oleh waktu penyelesaian.
          </p>
          {event.leaderboard.length ? (
            <ol className="flex flex-col">
              {event.leaderboard.map((entry) => (
                <li
                  key={entry.userId}
                  className={cn(
                    "border-border/60 flex flex-col gap-0.5 border-b py-3 last:border-b-0",
                    entry.attemptId === attempt?.id &&
                      "bg-primary/10 -mx-2 rounded-lg px-2",
                  )}
                >
                  <span className="truncate text-sm font-semibold">
                    {entry.rank}. {entry.name}
                  </span>
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {formatScoreOutOf(entry.score, entry.maxScore, " / ")} ·{" "}
                    {entry.percentage}%
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-muted-foreground text-sm">
              Belum ada hasil yang sudah direview.
            </p>
          )}
        </section>
      ) : attempt ? (
        <section className="bg-card flex flex-col gap-1 rounded-2xl border p-4">
          <Eyebrow size="xs">Leaderboard</Eyebrow>
          <p className="text-base font-bold">Belum tersedia</p>
          <p className="text-muted-foreground text-sm leading-5">
            Peringkat muncul setelah hasil direview.
          </p>
        </section>
      ) : null}

      {/* The finished attempt in full: where the learner lands after
          finishing, so the attempt has no result screen of its own. */}
      {/* Only once graded: scores are withheld (null) for invalidated or
          cancelled participations, and the page ships this detail. */}
      {attempt?.status === "GRADED" && attempt.score !== null ? (
        <AttemptResultDetails
          key={attempt.id}
          attemptId={attempt.id}
          courseItemId={event.courseItem.id}
        />
      ) : null}
    </div>
  );
}
