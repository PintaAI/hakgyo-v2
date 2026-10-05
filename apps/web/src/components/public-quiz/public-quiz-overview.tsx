"use client";

import Link from "next/link";
import { ChevronRightIcon, LoaderCircleIcon, PlusIcon } from "lucide-react";

import { buttonVariants } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { CopyButton } from "~/components/ui/copy-button";
import { PageHeader } from "~/components/ui/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { cn } from "~/lib/utils";
import { api, type RouterOutputs } from "~/trpc/react";

type Quiz = RouterOutputs["publicQuiz"]["listForOrganization"][number];

const states = {
  draft: { label: "Draf", dot: "bg-amber-500" },
  open: { label: "Dibuka", dot: "bg-emerald-500" },
  closed: { label: "Ditutup", dot: "bg-muted-foreground" },
} as const;

function stateOf(quiz: Quiz) {
  if (quiz.status === "DRAFT") return states.draft;
  if (quiz.status === "CLOSED") return states.closed;
  if (quiz.closesAt && quiz.closesAt <= new Date()) return states.closed;
  return states.open;
}

function Status({ quiz }: { quiz: Quiz }) {
  const state = stateOf(quiz);
  return (
    <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
      <span className={cn("size-1.5 rounded-full", state.dot)} />
      {state.label}
    </span>
  );
}

/** Every public quiz of the organization with its reach, for the workspace sidebar entry. */
export function PublicQuizOverview({
  organizationId,
  organizationSlug,
  appUrl,
}: {
  organizationId: string;
  organizationSlug: string;
  appUrl: string;
}) {
  const quizzes = api.publicQuiz.listForOrganization.useQuery({
    organizationId,
  });
  const data = quizzes.data;
  const manageHref = (quiz: Quiz) =>
    `/workspace/${organizationSlug}/library/assessments/${quiz.assessmentId}/quiz-publik`;
  const totals = data
    ? [
        {
          label: "Quiz dibuka",
          value: data.filter((quiz) => stateOf(quiz) === states.open).length,
        },
        {
          label: "Peserta",
          value: data.reduce((sum, quiz) => sum + quiz._count.attempts, 0),
        },
        {
          label: "Kontak",
          value: data.reduce((sum, quiz) => sum + quiz.leads, 0),
        },
        {
          label: "Dilihat",
          value: data.reduce((sum, quiz) => sum + quiz.viewCount, 0),
        },
      ]
    : null;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <PageHeader
        eyebrow="Promosi"
        title="Quiz publik"
        description="Quiz online tanpa daftar akun, lengkap dengan leaderboard. Bagikan ke media sosial untuk menjangkau calon peserta dan kumpulkan kontak mereka."
        actions={
          <Link
            href={`/workspace/${organizationSlug}/library/assessments`}
            className={buttonVariants()}
          >
            <PlusIcon data-icon="inline-start" />
            Buat dari tugas
          </Link>
        }
      />

      {!data ? (
        <LoaderCircleIcon className="text-muted-foreground size-5 animate-spin" />
      ) : data.length ? (
        <>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {totals?.map((total) => (
              <div
                key={total.label}
                className="bg-card ring-foreground/10 flex flex-col gap-0.5 rounded-2xl p-4 ring-1"
              >
                <dt className="text-muted-foreground text-xs font-medium">
                  {total.label}
                </dt>
                <dd className="text-2xl font-semibold tabular-nums">
                  {total.value}
                </dd>
              </div>
            ))}
          </dl>

          <ul className="divide-border flex flex-col divide-y rounded-2xl border md:hidden">
            {data.map((quiz) => (
              <li key={quiz.id}>
                <Link
                  href={manageHref(quiz)}
                  className="hover:bg-muted/50 flex items-center gap-3 p-4 transition-colors"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p className="truncate font-semibold">{quiz.title}</p>
                    <div className="flex items-center gap-3">
                      <Status quiz={quiz} />
                      <span className="text-muted-foreground text-xs tabular-nums">
                        {quiz._count.attempts} peserta · {quiz.leads} kontak
                      </span>
                    </div>
                  </div>
                  <ChevronRightIcon className="text-muted-foreground size-4 shrink-0" />
                </Link>
              </li>
            ))}
          </ul>

          <Card className="hidden md:flex">
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quiz</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Dilihat</TableHead>
                    <TableHead className="text-right">Peserta</TableHead>
                    <TableHead className="text-right">Kontak</TableHead>
                    <TableHead className="text-right">Klik ajakan</TableHead>
                    <TableHead>
                      <span className="sr-only">Link</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((quiz) => (
                    <TableRow key={quiz.id}>
                      <TableCell>
                        <Link
                          href={manageHref(quiz)}
                          className="font-medium underline-offset-4 hover:underline"
                        >
                          {quiz.title}
                        </Link>
                        <p className="text-muted-foreground text-xs">
                          Tugas: {quiz.assessment.title}
                          {quiz.round > 1 ? ` · putaran ${quiz.round}` : ""}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Status quiz={quiz} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {quiz.viewCount}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {quiz._count.attempts}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {quiz.leads}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {quiz.ctaClickCount}
                      </TableCell>
                      <TableCell className="text-right">
                        {quiz.status !== "DRAFT" ? (
                          <CopyButton
                            value={`${appUrl}/${organizationSlug}/quiz/${quiz.slug}`}
                            label={`Salin link ${quiz.title}`}
                          />
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <p className="text-lg font-semibold">Belum ada quiz publik</p>
              <p className="text-muted-foreground text-sm leading-6">
                Quiz publik dibuat dari tugas berisi soal pilihan ganda.
              </p>
            </div>
            <ol className="flex flex-col gap-2.5 text-sm">
              {[
                "Buka Bahan ajar › Tugas, lalu pilih atau buat tugas",
                "Klik Quiz publik di bagian atas editor",
                "Buka quiz, lalu bagikan link atau kode QR-nya",
              ].map((step, index) => (
                <li key={step} className="flex items-center gap-3">
                  <span className="bg-primary text-primary-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
