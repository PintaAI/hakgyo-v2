"use client";

import { DownloadIcon } from "lucide-react";
import {
  formatScore,
  itemFlagLabels,
  MIN_FLAG_RESPONSES,
  sortTags,
  tagLabel,
} from "@hakgyo/shared";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import { Skeleton } from "~/components/ui/skeleton";
import { getAssessmentOptionLabel } from "~/lib/assessment-options";
import { downloadCsv, toCsv } from "~/lib/csv";
import { cn } from "~/lib/utils";
import { api, type RouterOutputs } from "~/trpc/react";

type Analysis = RouterOutputs["assessmentEvent"]["itemAnalysis"];

function percent(rate: number | null) {
  return rate === null ? "—" : `${Math.round(rate * 100)}%`;
}

function resultsCsv(analysis: Analysis) {
  const tags = sortTags([
    ...new Set(
      analysis.learners.flatMap((learner) => Object.keys(learner.tags)),
    ),
  ]);
  return toCsv([
    [
      "Nama",
      "Kelas",
      "Nilai",
      "Nilai maksimal",
      "Persen",
      ...tags.map(tagLabel),
    ],
    ...analysis.learners.map((learner) => [
      learner.name,
      learner.cohortName ?? "",
      formatScore(learner.score),
      formatScore(learner.maxScore),
      formatScore(learner.percent),
      ...tags.map((tag) => {
        const result = learner.tags[tag];
        return result ? `${result.correct}/${result.total}` : "";
      }),
    ]),
  ]);
}

/**
 * Staff report of an event: class accuracy per tag and an analysis row per question (percent
 * correct, discrimination, option spread, flags), plus a CSV of results. Loaded on demand.
 */
export function EventItemAnalysis({
  eventId,
  eventTitle,
}: {
  eventId: string;
  eventTitle: string;
}) {
  const analysis = api.assessmentEvent.itemAnalysis.useQuery({ eventId });
  if (analysis.isPending) return <Skeleton className="h-80 w-full" />;
  if (analysis.error) {
    return <p className="text-destructive text-sm">{analysis.error.message}</p>;
  }
  const data = analysis.data;
  if (!data.attemptCount) {
    return (
      <p className="text-muted-foreground rounded-md border border-dashed p-6 text-center text-sm">
        Analisis soal muncul setelah ada pengerjaan yang dinilai.
      </p>
    );
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          Dari {data.attemptCount} hasil terbaik peserta.
          {data.attemptCount < MIN_FLAG_RESPONSES
            ? ` Tanda kualitas soal muncul mulai ${MIN_FLAG_RESPONSES} peserta.`
            : ""}
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            downloadCsv(
              `hasil-${eventTitle.slice(0, 60)}.csv`,
              resultsCsv(data),
            )
          }
        >
          <DownloadIcon />
          Unduh CSV
        </Button>
      </div>

      {data.tags.length ? (
        <section className="space-y-4">
          <h3 className="font-heading text-sm font-semibold">
            Ketepatan per label
          </h3>
          {data.tags.map((group) => (
            <div key={group.group} className="space-y-3">
              <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                {group.label}
              </p>
              <ul className="grid gap-3 sm:grid-cols-2">
                {group.rows.map((row) => (
                  <li key={row.tag} className="grid gap-1.5">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="min-w-0 font-medium">{row.label}</span>
                      <span
                        className={cn(
                          "shrink-0 tabular-nums",
                          row.rate < 0.5
                            ? "text-destructive"
                            : "text-muted-foreground",
                        )}
                      >
                        {percent(row.rate)}
                      </span>
                    </div>
                    <Progress
                      aria-label={`${row.label}: ${percent(row.rate)} benar`}
                      value={row.rate * 100}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ) : null}

      <section className="space-y-3">
        <h3 className="font-heading text-sm font-semibold">
          Analisis per soal
        </h3>
        <ul className="divide-y border-y sm:rounded-md sm:border">
          {data.questions.map((question) => (
            <li key={question.id} className="grid gap-2 py-3 sm:px-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-muted flex size-6 shrink-0 items-center justify-center rounded text-xs font-semibold tabular-nums">
                  {question.number}
                </span>
                {question.tags.map((tag) => (
                  <Badge key={tag} variant="outline" title={tag}>
                    {tagLabel(tag)}
                  </Badge>
                ))}
                {question.flags.map((flag) => (
                  <Badge key={flag} variant="destructive">
                    {itemFlagLabels[flag]}
                  </Badge>
                ))}
              </div>
              <p className="line-clamp-2 text-sm">
                {question.prompt || "(soal tanpa teks)"}
              </p>
              <dl className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs tabular-nums">
                <div className="flex gap-1">
                  <dt>Benar</dt>
                  <dd className="text-foreground font-medium">
                    {percent(question.correctRate)}
                  </dd>
                </div>
                <div className="flex gap-1">
                  <dt>Daya beda</dt>
                  <dd className="text-foreground font-medium">
                    {question.discrimination === null
                      ? "—"
                      : formatScore(question.discrimination)}
                  </dd>
                </div>
                <div className="flex gap-1">
                  <dt>Tidak dijawab</dt>
                  <dd className="text-foreground font-medium">
                    {percent(question.unansweredRate)}
                  </dd>
                </div>
                {question.averageTimeMs !== null ? (
                  <div className="flex gap-1">
                    <dt>Rata-rata waktu</dt>
                    <dd className="text-foreground font-medium">
                      {Math.round(question.averageTimeMs / 1000)} detik
                    </dd>
                  </div>
                ) : null}
                <div className="flex gap-1">
                  <dt>Poin</dt>
                  <dd className="text-foreground font-medium">
                    {formatScore(question.points)}
                  </dd>
                </div>
              </dl>
              {question.options.length ? (
                <ul className="grid gap-1 text-xs">
                  {question.options.map((option, index) => (
                    <li
                      key={option.id}
                      className="grid grid-cols-[1.5rem_1fr_3rem] items-center gap-2"
                    >
                      <span
                        className={cn(
                          "font-semibold",
                          option.isCorrect && "text-primary",
                        )}
                        title={option.isCorrect ? "Kunci jawaban" : undefined}
                      >
                        {getAssessmentOptionLabel(index)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate">
                          {option.text || "(gambar atau audio)"}
                          {option.isCorrect ? " · kunci" : ""}
                          {option.weak ? " · jarang dipilih" : ""}
                        </span>
                        <Progress
                          aria-label={`${getAssessmentOptionLabel(index)} dipilih ${percent(option.rate)}`}
                          className="mt-1"
                          value={option.rate * 100}
                        />
                      </span>
                      <span className="text-right tabular-nums">
                        {percent(option.rate)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground text-xs">
          Daya beda membandingkan 27% peserta dengan nilai tertinggi dan 27%
          terendah; di bawah 0,2 berarti soal kurang membedakan murid yang
          paham.
        </p>
      </section>
    </div>
  );
}
