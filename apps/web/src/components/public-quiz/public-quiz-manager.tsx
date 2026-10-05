"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  DownloadIcon,
  ExternalLinkIcon,
  EyeIcon,
  EyeOffIcon,
  LoaderCircleIcon,
  RotateCcwIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { QrCode } from "~/components/qr-code";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Badge } from "~/components/ui/badge";
import { Button, buttonVariants } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { CopyButton } from "~/components/ui/copy-button";
import { DateTimePicker } from "~/components/ui/datetime-picker";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { PageHeader } from "~/components/ui/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Textarea } from "~/components/ui/textarea";
import { downloadCsv, toCsv } from "~/lib/csv";
import { api, type RouterOutputs } from "~/trpc/react";

type ManagedQuiz = NonNullable<
  RouterOutputs["publicQuiz"]["getForAssessment"]["quiz"]
>;

function toLocalDateTimeInput(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes ? `${minutes}m ${rest}d` : `${rest}d`;
}

const dateFormat = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
});

function statusOf(quiz: ManagedQuiz) {
  if (quiz.status === "DRAFT") return { label: "Draf", live: false };
  if (quiz.status === "CLOSED") return { label: "Ditutup", live: false };
  if (quiz.closesAt && quiz.closesAt <= new Date())
    return { label: "Lewat waktu tutup", live: false };
  return { label: "Dibuka", live: true };
}

export function PublicQuizManager({
  assessmentId,
  organizationSlug,
  appUrl,
}: {
  assessmentId: string;
  organizationSlug: string;
  appUrl: string;
}) {
  const utils = api.useUtils();
  const overview = api.publicQuiz.getForAssessment.useQuery({ assessmentId });
  const create = api.publicQuiz.create.useMutation({
    onSuccess: () => utils.publicQuiz.getForAssessment.invalidate(),
    onError: (error) => toast.error(error.message),
  });
  const editorHref = `/workspace/${organizationSlug}/library/assessments/${assessmentId}`;

  const header = (
    <div className="flex flex-col gap-4">
      <Link
        href={editorHref}
        className={buttonVariants({
          variant: "ghost",
          size: "sm",
          className: "self-start",
        })}
      >
        <ArrowLeftIcon data-icon="inline-start" />
        Kembali ke tugas
      </Link>
      <PageHeader
        eyebrow="Quiz publik"
        title={overview.data?.assessmentTitle ?? "Quiz publik"}
        description="Bagikan tugas ini sebagai quiz online. Siapa pun bisa mengerjakannya tanpa membuat akun, lalu masuk leaderboard publik."
      />
    </div>
  );

  if (!overview.data) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        {header}
        {overview.isError ? (
          <p className="text-destructive text-sm">{overview.error.message}</p>
        ) : (
          <LoaderCircleIcon className="text-muted-foreground size-5 animate-spin" />
        )}
      </div>
    );
  }
  const { quiz, issues, organization } = overview.data;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      {header}
      {issues.length ? (
        <div className="flex gap-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
          <div className="grid gap-1">
            <p className="font-semibold">Tugas ini belum bisa dibuka</p>
            {issues.map((issue) => (
              <p key={issue}>{issue}</p>
            ))}
          </div>
        </div>
      ) : null}
      {!organization.landingPublished ? (
        <p className="text-muted-foreground text-sm">
          Landing page {organization.name} belum dipublikasikan, jadi ajakan
          &ldquo;Kunjungi {organization.name}&rdquo; di akhir quiz belum
          ditampilkan.
        </p>
      ) : null}
      {quiz ? (
        <QuizSettings
          key={quiz.id}
          quiz={quiz}
          canOpen={!issues.length}
          shareUrl={`${appUrl}/${organization.slug}/quiz/${quiz.slug}`}
        />
      ) : (
        <Card>
          <CardContent className="flex flex-col items-start gap-3">
            <p className="text-muted-foreground text-sm leading-6">
              Quiz memakai soal pilihan ganda dari tugas ini, dinilai otomatis,
              dan menampilkan skor, leaderboard, serta pembahasan setelah
              peserta mengirim jawaban. Selama quiz dibuka, tugas dikunci agar
              soal tidak berubah.
            </p>
            <Button
              disabled={create.isPending}
              onClick={() => create.mutate({ assessmentId })}
            >
              {create.isPending ? (
                <LoaderCircleIcon
                  data-icon="inline-start"
                  className="animate-spin"
                />
              ) : null}
              Buat quiz publik
            </Button>
          </CardContent>
        </Card>
      )}
      {quiz ? <QuizStats quizId={quiz.id} /> : null}
      {quiz ? <QuizResults quiz={quiz} /> : null}
    </div>
  );
}

function QuizSettings({
  quiz,
  canOpen,
  shareUrl,
}: {
  quiz: ManagedQuiz;
  canOpen: boolean;
  shareUrl: string;
}) {
  const utils = api.useUtils();
  const [title, setTitle] = useState(quiz.title);
  const [description, setDescription] = useState(quiz.description ?? "");
  const [closesAt, setClosesAt] = useState(
    quiz.closesAt ? toLocalDateTimeInput(quiz.closesAt) : "",
  );
  const refresh = async () => {
    await Promise.all([
      utils.publicQuiz.getForAssessment.invalidate(),
      utils.assessment.get.invalidate(),
      utils.assessment.getLiveStatus.invalidate(),
    ]);
  };
  const update = api.publicQuiz.update.useMutation({
    onSuccess: async () => {
      await refresh();
      toast.success("Pengaturan quiz disimpan.");
    },
    onError: (error) => toast.error(error.message),
  });
  const setStatus = api.publicQuiz.setStatus.useMutation({
    onSuccess: refresh,
    onError: (error) => toast.error(error.message),
  });
  const remove = api.publicQuiz.delete.useMutation({
    onSuccess: refresh,
    onError: (error) => toast.error(error.message),
  });
  const status = statusOf(quiz);
  const dirty =
    title.trim() !== quiz.title ||
    description.trim() !== (quiz.description ?? "") ||
    closesAt !== (quiz.closesAt ? toLocalDateTimeInput(quiz.closesAt) : "");

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Pengaturan</CardTitle>
          <Badge variant={status.live ? "default" : "outline"}>
            {status.label}
          </Badge>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              update.mutate({
                quizId: quiz.id,
                title: title.trim(),
                description: description.trim() || null,
                closesAt: closesAt ? new Date(closesAt) : null,
              });
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="public-quiz-title">Judul</Label>
              <Input
                id="public-quiz-title"
                required
                maxLength={200}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="public-quiz-description">Deskripsi</Label>
              <Textarea
                id="public-quiz-description"
                maxLength={500}
                value={description}
                placeholder="Contoh: Uji kosakata TOPIK 1 kamu dalam 5 menit!"
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="public-quiz-closes">
                Ditutup otomatis pada (opsional)
              </Label>
              <div className="flex gap-2">
                <DateTimePicker
                  id="public-quiz-closes"
                  className="flex-1"
                  min={toLocalDateTimeInput(new Date())}
                  value={closesAt}
                  onChange={setClosesAt}
                />
                {closesAt ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setClosesAt("")}
                  >
                    Hapus
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={!dirty || update.isPending}>
                {update.isPending ? (
                  <LoaderCircleIcon
                    data-icon="inline-start"
                    className="animate-spin"
                  />
                ) : null}
                Simpan
              </Button>
              {status.live ? (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={setStatus.isPending}
                  onClick={() =>
                    setStatus.mutate({ quizId: quiz.id, status: "CLOSED" })
                  }
                >
                  Tutup quiz
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!canOpen || dirty || setStatus.isPending}
                  onClick={() =>
                    setStatus.mutate({ quizId: quiz.id, status: "OPEN" })
                  }
                >
                  {quiz.status === "DRAFT" ? "Buka quiz" : "Buka lagi"}
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-destructive ml-auto"
                    />
                  }
                >
                  <Trash2Icon data-icon="inline-start" />
                  Hapus quiz
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Hapus quiz publik?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Link quiz berhenti bekerja dan semua hasil peserta serta
                      kontak yang mereka tinggalkan ikut dihapus. Tugasnya tetap
                      ada.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      onClick={() => remove.mutate({ quizId: quiz.id })}
                    >
                      Hapus
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            {status.live ? (
              <p className="text-muted-foreground text-xs">
                Selama quiz dibuka, soal di tugas ini dikunci. Tutup quiz untuk
                mengubah soal.
              </p>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bagikan</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {quiz.status === "DRAFT" ? (
            <p className="text-muted-foreground text-sm">
              Buka quiz agar link bisa diakses peserta.
            </p>
          ) : null}
          <p className="bg-muted rounded-lg px-3 py-2 font-mono text-xs break-all">
            {shareUrl}
          </p>
          <div className="flex gap-2">
            <CopyButton value={shareUrl} label="Salin link quiz" />
            {quiz.status !== "DRAFT" ? (
              <a
                href={shareUrl}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <ExternalLinkIcon data-icon="inline-start" />
                Buka
              </a>
            ) : null}
          </div>
          <QrCode
            value={shareUrl}
            label={`Kode QR quiz ${quiz.title}`}
            className="mt-2 w-full max-w-48 self-center rounded-lg bg-white p-3"
          />
        </CardContent>
      </Card>
    </div>
  );
}

function QuizStats({ quizId }: { quizId: string }) {
  const stats = api.publicQuiz.stats.useQuery(
    { quizId },
    { refetchInterval: 30_000 },
  );
  const data = stats.data;
  if (!data) return null;
  const percent = (part: number, whole: number) =>
    whole ? `${Math.round((part / whole) * 100)}%` : "–";
  const funnel = [
    { label: "Dilihat", value: data.views, detail: "halaman quiz dibuka" },
    {
      label: "Mulai",
      value: data.starts,
      detail: `${percent(data.starts, data.views)} dari yang melihat`,
    },
    {
      label: "Selesai",
      value: data.submissions,
      detail: `${percent(data.submissions, data.starts)} dari yang mulai`,
    },
    {
      label: "Klik ajakan",
      value: data.ctaClicks,
      detail: `${percent(data.ctaClicks, data.submissions)} dari yang selesai`,
    },
    {
      label: "Kontak",
      value: data.leads,
      detail: "setuju untuk dihubungi",
    },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Statistik</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {funnel.map((item) => (
            <div key={item.label} className="flex flex-col gap-1">
              <dt className="text-muted-foreground text-xs">{item.label}</dt>
              <dd className="text-2xl font-semibold tabular-nums">
                {item.value}
              </dd>
              <dd className="text-muted-foreground text-xs">{item.detail}</dd>
            </div>
          ))}
        </dl>
        {data.submissions ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Jawaban benar per soal</p>
            <ul className="flex flex-col gap-1.5">
              {data.questions.map((question) => {
                const rate = Math.round((question.correctRate ?? 0) * 100);
                return (
                  <li
                    key={question.id}
                    className="flex items-center gap-3 text-sm"
                  >
                    <span className="text-muted-foreground w-14 shrink-0">
                      Soal {question.number}
                    </span>
                    <span className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                      <span
                        className="bg-primary block h-full rounded-full"
                        style={{ width: `${rate}%` }}
                      />
                    </span>
                    <span className="w-10 shrink-0 text-right tabular-nums">
                      {rate}%
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="text-muted-foreground text-xs">
              Soal dengan persentase rendah bisa jadi bahan konten atau kelas
              berikutnya.
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function QuizResults({ quiz }: { quiz: ManagedQuiz }) {
  const utils = api.useUtils();
  const results = api.publicQuiz.listResults.useQuery(
    { quizId: quiz.id },
    { refetchInterval: 30_000 },
  );
  const setHidden = api.publicQuiz.setAttemptHidden.useMutation({
    onSuccess: () => utils.publicQuiz.listResults.invalidate(),
    onError: (error) => toast.error(error.message),
  });
  const reset = api.publicQuiz.resetLeaderboard.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.publicQuiz.getForAssessment.invalidate(),
        utils.publicQuiz.listResults.invalidate(),
      ]);
      toast.success("Leaderboard direset. Semua orang bisa ikut lagi.");
    },
    onError: (error) => toast.error(error.message),
  });
  const rows = results.data ?? [];
  const current = rows.filter((row) => row.round === quiz.round);
  const earlier = rows.filter((row) => row.round !== quiz.round);

  function exportCsv() {
    const csv = toCsv([
      [
        "Putaran",
        "Peringkat",
        "Nama",
        "Kontak",
        "Skor",
        "Skor maksimal",
        "Durasi (detik)",
        "Dikirim",
        "Disembunyikan",
      ],
      ...rows.map((row) => [
        row.round,
        row.rank ?? "",
        row.displayName ?? "Anonim",
        row.contact ?? "",
        row.score,
        row.maxScore,
        row.durationSeconds,
        row.submittedAt?.toISOString() ?? "",
        row.hiddenAt ? "ya" : "",
      ]),
    ]);
    downloadCsv(`quiz-${quiz.slug}-hasil.csv`, csv);
  }

  const table = (list: typeof rows) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">#</TableHead>
          <TableHead>Nama</TableHead>
          <TableHead>Kontak</TableHead>
          <TableHead className="text-right">Skor</TableHead>
          <TableHead className="text-right">Waktu</TableHead>
          <TableHead className="text-right">Dikirim</TableHead>
          <TableHead className="w-12">
            <span className="sr-only">Leaderboard</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {list.map((row) => (
          <TableRow
            key={row.id}
            className={row.hiddenAt ? "opacity-50" : undefined}
          >
            <TableCell className="tabular-nums">{row.rank ?? "–"}</TableCell>
            <TableCell className="font-medium">
              {row.displayName ?? (
                <span className="text-muted-foreground">Anonim</span>
              )}
              {row.hiddenAt ? (
                <Badge variant="outline" className="ml-2">
                  Disembunyikan
                </Badge>
              ) : null}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {row.contact ?? "—"}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {row.score}/{row.maxScore}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatDuration(row.durationSeconds ?? 0)}
            </TableCell>
            <TableCell className="text-muted-foreground text-right">
              {row.submittedAt ? dateFormat.format(row.submittedAt) : ""}
            </TableCell>
            <TableCell>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={setHidden.isPending}
                aria-label={
                  row.hiddenAt
                    ? "Tampilkan lagi di leaderboard"
                    : "Sembunyikan dari leaderboard"
                }
                title={
                  row.hiddenAt
                    ? "Tampilkan lagi di leaderboard"
                    : "Sembunyikan dari leaderboard"
                }
                onClick={() =>
                  setHidden.mutate({
                    attemptId: row.id,
                    hidden: !row.hiddenAt,
                  })
                }
              >
                {row.hiddenAt ? <EyeIcon /> : <EyeOffIcon />}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle>
          Leaderboard{quiz.round > 1 ? ` · putaran ${quiz.round}` : ""}
          {results.data ? ` (${current.length})` : ""}
        </CardTitle>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!rows.length}
            onClick={exportCsv}
          >
            <DownloadIcon data-icon="inline-start" />
            Ekspor CSV
          </Button>
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!current.length || reset.isPending}
                />
              }
            >
              <RotateCcwIcon data-icon="inline-start" />
              Reset leaderboard
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset leaderboard?</AlertDialogTitle>
                <AlertDialogDescription>
                  Leaderboard publik dikosongkan dan putaran baru dimulai. Semua
                  orang, termasuk peserta sebelumnya, bisa mengerjakan quiz
                  lagi. Hasil dan kontak putaran sebelumnya tetap tersimpan di
                  sini dan ikut di ekspor CSV.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => reset.mutate({ quizId: quiz.id })}
                >
                  Reset
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {!results.data ? (
          <LoaderCircleIcon className="text-muted-foreground size-5 animate-spin" />
        ) : current.length ? (
          <>
            <p className="text-muted-foreground text-xs">
              Sembunyikan peserta dengan nama yang tidak pantas lewat tombol
              mata. Nama kasar yang umum sudah otomatis diganti menjadi Anonim.
              Kontak hanya tampil bila peserta setuju dihubungi.
            </p>
            {table(current)}
          </>
        ) : (
          <p className="text-muted-foreground text-sm">
            Belum ada peserta yang mengirim jawaban
            {quiz.round > 1 ? " di putaran ini" : ""}.
          </p>
        )}
        {earlier.length ? (
          <details className="flex flex-col gap-3">
            <summary className="cursor-pointer text-sm font-medium">
              Putaran sebelumnya ({earlier.length} peserta)
            </summary>
            {table(earlier)}
          </details>
        ) : null}
      </CardContent>
    </Card>
  );
}
