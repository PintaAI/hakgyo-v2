"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, LoaderCircleIcon } from "lucide-react";
import { toast } from "sonner";

import { Button, buttonVariants } from "~/components/ui/button";
import { assessmentAttemptPresentation } from "~/lib/learner/assessment-state";
import { dateLabel } from "~/lib/learner/study";
import { cn } from "~/lib/utils";
import { api, type RouterOutputs } from "~/trpc/react";
import { StudyCard } from "./assessment-ui";

function formatDuration(milliseconds: number) {
  const totalSeconds = Math.round(milliseconds / 1000);
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

/** An assessment event (tryout or on-demand tugas): details, start / retake, and the leaderboard. */
export function AssessmentEvent({
  event,
}: {
  event: RouterOutputs["assessmentEvent"]["getForLearner"];
}) {
  const router = useRouter();
  const utils = api.useUtils();
  const start = api.assessmentEvent.startAttempt.useMutation();
  const attempt = event.attempts[0];
  const attemptState = assessmentAttemptPresentation(attempt);
  const invalidated = Boolean(event.participants[0]?.invalidatedAt);
  const assessment = event.courseItem.assessment;
  const attemptHref = (attemptId: string) =>
    `/learn/${event.course.id}/items/${event.courseItem.id}/attempts/${attemptId}`;

  async function begin() {
    if (invalidated) return;
    try {
      const created = await start.mutateAsync({ eventId: event.id });
      void utils.assessmentEvent.invalidate();
      router.replace(attemptHref(created.id));
    } catch {
      toast.error("Event belum dapat dimulai.");
    }
  }

  const primaryAction = event.entry.canStart
    ? "Mulai tugas berwaktu"
    : event.entry.canReattempt
      ? "Kerjakan ulang tugas"
      : null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Link
        href="/learn/assessments"
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "text-muted-foreground -mb-2 -ml-2 self-start",
        )}
      >
        <ArrowLeftIcon /> Latihan
      </Link>

      <StudyCard>
        <p className="text-primary text-xs font-black tracking-[1.5px] uppercase">
          {event.type === "TRYOUT" ? "Tryout" : "Tugas cepat"} ·{" "}
          {event.cohort?.name ?? event.course.title}
        </p>
        <h1 className="text-2xl leading-8 font-black">
          {assessment?.title ?? event.title}
        </h1>
        {assessment?.description ? (
          <p className="text-muted-foreground text-sm leading-6">
            {assessment.description}
          </p>
        ) : null}

        <p className="text-muted-foreground text-sm leading-6">
          {assessment?._count.questions ?? 0} soal · {event.durationMinutes}{" "}
          menit
          {assessment?.passingScore != null
            ? ` · lulus ${assessment.passingScore}%`
            : ""}
          {event.closesAt ? (
            <>
              <br />
              Ditutup {dateLabel(event.closesAt)}
            </>
          ) : null}
          <br />
          {assessment?.maxAttempts != null
            ? `${event.attemptCount} dari ${assessment.maxAttempts} percobaan terpakai`
            : `${event.attemptCount} percobaan terpakai · tanpa batas`}
        </p>

        {invalidated ? (
          <p className="text-destructive text-sm">
            {event.participants[0]?.invalidationReason ??
              "Partisipasi tidak tersedia. Hubungi tim kursus kamu."}
          </p>
        ) : null}

        {attempt ? (
          <p className="text-base font-bold">{attemptState.detail}</p>
        ) : null}

        {primaryAction ? (
          <Button
            size="lg"
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
          </Button>
        ) : null}

        {attempt && attempt.status !== "IN_PROGRESS" ? (
          <Link
            href={attemptHref(attempt.id)}
            className={buttonVariants({
              size: "lg",
              variant: primaryAction ? "secondary" : "default",
            })}
          >
            {attempt.status === "GRADED" ? "Lihat hasil" : "Lihat jawaban"}
          </Link>
        ) : null}

        {!primaryAction && !attempt && !invalidated ? (
          <p className="text-muted-foreground text-sm font-semibold">
            {event.status === "CANCELLED"
              ? "Event ini dibatalkan."
              : event.status === "CLOSED"
                ? "Event telah ditutup. Tidak ada attempt yang tercatat."
                : "Event ini belum dibuka untuk dikerjakan."}
          </p>
        ) : null}
      </StudyCard>

      {event.leaderboard ? (
        <StudyCard>
          <h2 className="text-xl font-black">Leaderboard</h2>
          <p className="text-muted-foreground text-sm">
            Percobaan terbaik yang sudah direview yang dihitung. Nilai seri
            ditentukan oleh waktu penyelesaian.
          </p>
          {event.leaderboard.length ? (
            <ol>
              {event.leaderboard.map((entry) => (
                <li
                  key={entry.userId}
                  className={cn(
                    "border-border/60 flex items-center gap-3 border-b py-3 last:border-b-0",
                    entry.attemptId === attempt?.id &&
                      "bg-primary/10 -mx-2 rounded-lg px-2",
                  )}
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-sm font-semibold">
                      {entry.rank}. {entry.name}
                    </span>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {entry.score} / {entry.maxScore} · {entry.percentage}% ·{" "}
                      {formatDuration(entry.completionTimeMs)}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-muted-foreground text-sm">
              Belum ada hasil yang sudah direview.
            </p>
          )}
        </StudyCard>
      ) : attempt ? (
        <StudyCard>
          <h2 className="text-lg font-black">Leaderboard belum tersedia</h2>
          <p className="text-muted-foreground text-sm">
            Peringkat muncul setelah hasil direview.
          </p>
        </StudyCard>
      ) : null}
    </div>
  );
}
