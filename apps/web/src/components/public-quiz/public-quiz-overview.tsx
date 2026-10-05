"use client";

import Link from "next/link";
import { LoaderCircleIcon } from "lucide-react";

import { Badge } from "~/components/ui/badge";
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
import { api, type RouterOutputs } from "~/trpc/react";

type Quiz = RouterOutputs["publicQuiz"]["listForOrganization"][number];

function statusLabel(quiz: Quiz) {
  if (quiz.status === "DRAFT") return "Draf";
  if (quiz.status === "CLOSED") return "Ditutup";
  if (quiz.closesAt && quiz.closesAt <= new Date()) return "Lewat waktu tutup";
  return "Dibuka";
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
            Buat dari tugas
          </Link>
        }
      />
      {!quizzes.data ? (
        <LoaderCircleIcon className="text-muted-foreground size-5 animate-spin" />
      ) : quizzes.data.length ? (
        <Card>
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
                {quizzes.data.map((quiz) => {
                  const status = statusLabel(quiz);
                  return (
                    <TableRow key={quiz.id}>
                      <TableCell>
                        <Link
                          href={`/workspace/${organizationSlug}/library/assessments/${quiz.assessmentId}/quiz-publik`}
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
                        <Badge
                          variant={status === "Dibuka" ? "default" : "outline"}
                        >
                          {status}
                        </Badge>
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
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col gap-2">
            <p className="font-medium">Belum ada quiz publik</p>
            <p className="text-muted-foreground text-sm leading-6">
              Buka sebuah tugas berisi soal pilihan ganda, lalu klik{" "}
              <span className="font-medium">Quiz publik</span> di bagian atas
              editor untuk membagikannya sebagai quiz online.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
