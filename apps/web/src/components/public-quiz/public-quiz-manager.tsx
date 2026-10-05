"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  BarChart3Icon,
  CopyIcon,
  DownloadIcon,
  ExternalLinkIcon,
  EyeIcon,
  EyeOffIcon,
  LoaderCircleIcon,
  MoreHorizontalIcon,
  PlayIcon,
  QrCodeIcon,
  RotateCcwIcon,
  Settings2Icon,
  SquareIcon,
  Trash2Icon,
  UsersIcon,
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
} from "~/components/ui/alert-dialog";
import { Badge } from "~/components/ui/badge";
import { Button, buttonVariants } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { DateTimePicker } from "~/components/ui/datetime-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Textarea } from "~/components/ui/textarea";
import { downloadCsv, toCsv } from "~/lib/csv";
import { cn } from "~/lib/utils";
import { api, type RouterOutputs } from "~/trpc/react";

type Overview = RouterOutputs["publicQuiz"]["getForAssessment"];
type ManagedQuiz = NonNullable<Overview["quiz"]>;
type ResultRow = RouterOutputs["publicQuiz"]["listResults"][number];

function toLocalDateTimeInput(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes ? `${minutes} mnt ${rest} dtk` : `${rest} dtk`;
}

const dateFormat = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
});

type QuizState = "draft" | "open" | "closed";

function stateOf(quiz: ManagedQuiz): QuizState {
  if (quiz.status === "DRAFT") return "draft";
  if (quiz.status === "CLOSED") return "closed";
  if (quiz.closesAt && quiz.closesAt <= new Date()) return "closed";
  return "open";
}

/** Refreshes everything that depends on a quiz's state, including the Tugas live lock. */
function useRefreshQuiz() {
  const utils = api.useUtils();
  return () =>
    Promise.all([
      utils.publicQuiz.getForAssessment.invalidate(),
      utils.publicQuiz.listResults.invalidate(),
      utils.publicQuiz.stats.invalidate(),
      utils.assessment.get.invalidate(),
      utils.assessment.getLiveStatus.invalidate(),
    ]);
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
  const refresh = useRefreshQuiz();
  const overview = api.publicQuiz.getForAssessment.useQuery({ assessmentId });
  const create = api.publicQuiz.create.useMutation({
    onSuccess: refresh,
    onError: (error) => toast.error(error.message),
  });
  const data = overview.data;
  const quiz = data?.quiz;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          href={`/workspace/${organizationSlug}/library/assessments/${assessmentId}`}
          className={buttonVariants({
            variant: "ghost",
            size: "sm",
            className: "-ml-2 self-start",
          })}
        >
          <ArrowLeftIcon data-icon="inline-start" />
          Kembali ke tugas
        </Link>
        <div className="flex flex-col gap-1">
          <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Quiz publik
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            {quiz?.title ?? data?.assessmentTitle ?? "Quiz publik"}
          </h1>
          {quiz && data ? (
            <p className="text-muted-foreground text-sm">
              Dari tugas {data.assessmentTitle} · {data.questionCount} soal
            </p>
          ) : null}
        </div>
      </div>

      {!data ? (
        overview.isError ? (
          <p className="text-destructive text-sm">{overview.error.message}</p>
        ) : (
          <LoaderCircleIcon className="text-muted-foreground size-5 animate-spin" />
        )
      ) : quiz ? (
        <QuizDashboard
          key={quiz.id}
          overview={data}
          quiz={quiz}
          shareUrl={`${appUrl}/${data.organization.slug}/quiz/${quiz.slug}`}
        />
      ) : (
        <Card>
          <CardContent className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <p className="text-lg font-semibold">
                Jadikan tugas ini quiz online
              </p>
              <p className="text-muted-foreground text-sm leading-6">
                Siapa pun bisa mengerjakannya lewat link, tanpa membuat akun.
              </p>
            </div>
            <ul className="flex flex-col gap-2 text-sm">
              {[
                "Dinilai otomatis, peserta langsung lihat skor dan pembahasan",
                "Leaderboard publik yang bisa dibagikan ke media sosial",
                "Kumpulkan kontak peserta yang mau dihubungi",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="bg-primary mt-2 size-1.5 shrink-0 rounded-full" />
                  {item}
                </li>
              ))}
            </ul>
            {data.issues.length ? <Issues issues={data.issues} /> : null}
            <Button
              className="self-start"
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
    </div>
  );
}

function Issues({ issues }: { issues: string[] }) {
  return (
    <div className="flex gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
      <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
      <div className="grid gap-1">
        <p className="font-semibold">Belum bisa dibuka</p>
        {issues.map((issue) => (
          <p key={issue}>{issue}</p>
        ))}
      </div>
    </div>
  );
}

function QuizDashboard({
  overview,
  quiz,
  shareUrl,
}: {
  overview: Overview;
  quiz: ManagedQuiz;
  shareUrl: string;
}) {
  const results = api.publicQuiz.listResults.useQuery(
    { quizId: quiz.id },
    { refetchInterval: 30_000 },
  );
  const currentCount =
    results.data?.filter((row) => row.round === quiz.round).length ?? 0;

  return (
    <>
      <StatusPanel overview={overview} quiz={quiz} shareUrl={shareUrl} />
      <Kpis quizId={quiz.id} />
      <Tabs defaultValue="participants" className="gap-5">
        <div className="max-w-full overflow-x-auto border-b [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabsList
            variant="line"
            aria-label="Kelola quiz publik"
            className="h-11 min-w-max justify-start rounded-none p-0"
          >
            {[
              {
                value: "participants",
                label: "Peserta",
                icon: UsersIcon,
                count: currentCount,
              },
              {
                value: "questions",
                label: "Soal",
                icon: BarChart3Icon,
              },
              { value: "settings", label: "Pengaturan", icon: Settings2Icon },
            ].map(({ value, label, icon: Icon, count }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="h-11 flex-none rounded-none px-3 py-0 group-data-horizontal/tabs:after:inset-x-3 group-data-horizontal/tabs:after:bottom-0"
              >
                <Icon className="size-4" />
                {label}
                {count ? (
                  <span className="text-muted-foreground text-xs tabular-nums">
                    ({count})
                  </span>
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value="participants">
          <Participants quiz={quiz} rows={results.data} />
        </TabsContent>
        <TabsContent value="questions">
          <QuestionAnalysis quizId={quiz.id} />
        </TabsContent>
        <TabsContent value="settings">
          <Settings overview={overview} quiz={quiz} />
        </TabsContent>
      </Tabs>
    </>
  );
}

const stateCopy: Record<
  QuizState,
  { label: string; detail: string; dot: string; badge: string }
> = {
  draft: {
    label: "Draf",
    detail:
      "Link belum bisa dibuka peserta. Buka quiz untuk mulai membagikannya.",
    dot: "bg-amber-500",
    badge:
      "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200",
  },
  open: {
    label: "Dibuka",
    detail: "Siapa pun yang punya link bisa ikut dan masuk leaderboard.",
    dot: "bg-emerald-500",
    badge:
      "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200",
  },
  closed: {
    label: "Ditutup",
    detail: "Peserta baru tidak bisa ikut. Leaderboard tetap bisa dilihat.",
    dot: "bg-muted-foreground",
    badge: "bg-muted text-muted-foreground",
  },
};

function StatusPanel({
  overview,
  quiz,
  shareUrl,
}: {
  overview: Overview;
  quiz: ManagedQuiz;
  shareUrl: string;
}) {
  const refresh = useRefreshQuiz();
  const [qrOpen, setQrOpen] = useState(false);
  const setStatus = api.publicQuiz.setStatus.useMutation({
    onSuccess: async (_data, input) => {
      await refresh();
      toast.success(
        input.status === "OPEN"
          ? "Quiz dibuka. Link siap dibagikan."
          : "Quiz ditutup.",
      );
    },
    onError: (error) => toast.error(error.message),
  });
  const state = stateOf(quiz);
  const copy = stateCopy[state];
  const canOpen = !overview.issues.length;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link quiz disalin.");
    } catch {
      toast.error("Link tidak dapat disalin.");
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-col gap-1.5">
            <span
              className={cn(
                "flex items-center gap-1.5 self-start rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                copy.badge,
              )}
            >
              <span className={cn("size-1.5 rounded-full", copy.dot)} />
              {copy.label}
            </span>
            <p className="text-muted-foreground text-sm leading-6">
              {copy.detail}
              {state === "open" && quiz.closesAt
                ? ` Tutup otomatis ${dateFormat.format(quiz.closesAt)}.`
                : ""}
            </p>
          </div>
          {state === "open" ? (
            <Button
              variant="outline"
              className="shrink-0"
              disabled={setStatus.isPending}
              onClick={() =>
                setStatus.mutate({ quizId: quiz.id, status: "CLOSED" })
              }
            >
              <SquareIcon data-icon="inline-start" />
              Tutup quiz
            </Button>
          ) : (
            <Button
              size="lg"
              className="shrink-0"
              disabled={!canOpen || setStatus.isPending}
              onClick={() =>
                setStatus.mutate({ quizId: quiz.id, status: "OPEN" })
              }
            >
              {setStatus.isPending ? (
                <LoaderCircleIcon
                  data-icon="inline-start"
                  className="animate-spin"
                />
              ) : (
                <PlayIcon data-icon="inline-start" />
              )}
              {state === "draft" ? "Buka quiz" : "Buka lagi"}
            </Button>
          )}
        </div>

        {overview.issues.length ? <Issues issues={overview.issues} /> : null}

        {state !== "draft" ? (
          <div className="bg-muted/60 flex items-center gap-1 rounded-xl p-1 pl-3">
            <p
              className="min-w-0 flex-1 truncate font-mono text-xs"
              title={shareUrl}
            >
              {shareUrl.replace(/^https?:\/\//, "")}
            </p>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Salin link quiz"
              onClick={() => void copyLink()}
            >
              <CopyIcon />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Tampilkan kode QR"
              onClick={() => setQrOpen(true)}
            >
              <QrCodeIcon />
            </Button>
            <a
              href={shareUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Buka halaman quiz"
              className={buttonVariants({ variant: "ghost", size: "icon" })}
            >
              <ExternalLinkIcon />
            </a>
          </div>
        ) : null}

        {!overview.organization.landingPublished && state !== "draft" ? (
          <p className="text-muted-foreground text-xs leading-5">
            Ajakan &ldquo;Kunjungi {overview.organization.name}&rdquo; di akhir
            quiz muncul setelah landing page dipublikasikan.
          </p>
        ) : null}
      </CardContent>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Kode QR quiz</DialogTitle>
            <DialogDescription>
              Tampilkan di kelas atau poster. Peserta cukup memindainya.
            </DialogDescription>
          </DialogHeader>
          <QrCode
            value={shareUrl}
            label={`Kode QR quiz ${quiz.title}`}
            className="mx-auto w-full max-w-64 rounded-xl bg-white p-4"
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Kpis({ quizId }: { quizId: string }) {
  const stats = api.publicQuiz.stats.useQuery(
    { quizId },
    { refetchInterval: 30_000 },
  );
  const data = stats.data;
  const percent = (part: number, whole: number) =>
    whole ? `${Math.round((part / whole) * 100)}%` : "–";
  const tiles = data
    ? [
        { label: "Dilihat", value: data.views, detail: "kunjungan" },
        {
          label: "Mulai",
          value: data.starts,
          detail: `${percent(data.starts, data.views)} pengunjung`,
        },
        {
          label: "Selesai",
          value: data.submissions,
          detail: `${percent(data.submissions, data.starts)} yang mulai`,
        },
        { label: "Kontak", value: data.leads, detail: "mau dihubungi" },
        {
          label: "Klik ajakan",
          value: data.ctaClicks,
          detail: `${percent(data.ctaClicks, data.submissions)} yang selesai`,
        },
      ]
    : null;

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {(tiles ?? Array.from({ length: 5 }, () => null)).map((tile, index) => (
        <div
          key={tile?.label ?? index}
          className={cn(
            "bg-card ring-foreground/10 flex flex-col gap-0.5 rounded-2xl p-4 ring-1",
            index === 4 && "col-span-2 sm:col-span-1",
          )}
        >
          <dt className="text-muted-foreground text-xs font-medium">
            {tile?.label ?? " "}
          </dt>
          <dd className="text-2xl font-semibold tabular-nums">
            {tile ? tile.value : "–"}
          </dd>
          <dd className="text-muted-foreground truncate text-xs">
            {tile?.detail ?? " "}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Participants({
  quiz,
  rows,
}: {
  quiz: ManagedQuiz;
  rows: ResultRow[] | undefined;
}) {
  const refresh = useRefreshQuiz();
  const [resetOpen, setResetOpen] = useState(false);
  const setHidden = api.publicQuiz.setAttemptHidden.useMutation({
    onSuccess: refresh,
    onError: (error) => toast.error(error.message),
  });
  const reset = api.publicQuiz.resetLeaderboard.useMutation({
    onSuccess: async () => {
      await refresh();
      toast.success("Leaderboard direset. Semua orang bisa ikut lagi.");
    },
    onError: (error) => toast.error(error.message),
  });

  if (!rows) {
    return (
      <LoaderCircleIcon className="text-muted-foreground size-5 animate-spin" />
    );
  }
  const allRows = rows;
  const current = allRows.filter((row) => row.round === quiz.round);
  const earlier = allRows.filter((row) => row.round !== quiz.round);

  function exportCsv() {
    downloadCsv(
      `quiz-${quiz.slug}-peserta.csv`,
      toCsv([
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
        ...allRows.map((row) => [
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
      ]),
    );
  }

  const toggleHidden = (row: ResultRow) =>
    setHidden.mutate({ attemptId: row.id, hidden: !row.hiddenAt });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          {quiz.round > 1 ? `Putaran ${quiz.round} · ` : ""}
          {current.length} peserta
          {current.some((row) => row.contact)
            ? ` · ${current.filter((row) => row.contact).length} kontak`
            : ""}
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="sm" aria-label="Opsi peserta" />
            }
          >
            <MoreHorizontalIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem disabled={!rows.length} onClick={exportCsv}>
              <DownloadIcon />
              Ekspor CSV
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={!current.length}
              onClick={() => setResetOpen(true)}
            >
              <RotateCcwIcon />
              Reset leaderboard
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {current.length ? (
        <ResultList
          rows={current}
          busy={setHidden.isPending}
          onToggle={toggleHidden}
        />
      ) : (
        <div className="text-muted-foreground rounded-2xl border border-dashed p-8 text-center text-sm">
          Belum ada peserta{quiz.round > 1 ? " di putaran ini" : ""}. Bagikan
          link quiz untuk mulai.
        </div>
      )}

      {earlier.length ? (
        <details className="group flex flex-col gap-3">
          <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-sm font-medium">
            Putaran sebelumnya ({earlier.length} peserta)
          </summary>
          <div className="mt-3">
            <ResultList
              rows={earlier}
              busy={setHidden.isPending}
              onToggle={toggleHidden}
            />
          </div>
        </details>
      ) : null}

      <p className="text-muted-foreground text-xs leading-5">
        Nama kasar yang umum otomatis menjadi Anonim. Sembunyikan peserta lain
        lewat ikon mata. Kontak hanya tampil bila peserta setuju dihubungi.
      </p>

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset leaderboard?</AlertDialogTitle>
            <AlertDialogDescription>
              Putaran baru dimulai: leaderboard publik kosong dan semua orang
              bisa ikut lagi. Hasil dan kontak putaran ini tetap tersimpan dan
              ikut di ekspor CSV.
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
  );
}

function HideButton({
  row,
  busy,
  onToggle,
}: {
  row: ResultRow;
  busy: boolean;
  onToggle: (row: ResultRow) => void;
}) {
  const label = row.hiddenAt
    ? "Tampilkan lagi di leaderboard"
    : "Sembunyikan dari leaderboard";
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={busy}
      aria-label={label}
      title={label}
      onClick={() => onToggle(row)}
    >
      {row.hiddenAt ? <EyeIcon /> : <EyeOffIcon />}
    </Button>
  );
}

/** Cards on phones, a table from `md` up. */
function ResultList({
  rows,
  busy,
  onToggle,
}: {
  rows: ResultRow[];
  busy: boolean;
  onToggle: (row: ResultRow) => void;
}) {
  return (
    <>
      <ul className="divide-border flex flex-col divide-y rounded-2xl border md:hidden">
        {rows.map((row) => (
          <li
            key={row.id}
            className={cn(
              "flex items-center gap-3 p-3",
              row.hiddenAt && "opacity-50",
            )}
          >
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums",
                row.rank && row.rank <= 3
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted",
              )}
            >
              {row.rank ?? "–"}
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="truncate text-sm font-semibold">
                {row.displayName ?? "Anonim"}
                {row.hiddenAt ? (
                  <span className="text-muted-foreground font-normal">
                    {" "}
                    · disembunyikan
                  </span>
                ) : null}
              </p>
              <p className="text-muted-foreground truncate text-xs">
                {row.contact ?? "Tanpa kontak"}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end">
              <span className="text-sm font-semibold tabular-nums">
                {row.score}/{row.maxScore}
              </span>
              <span className="text-muted-foreground text-xs tabular-nums">
                {formatDuration(row.durationSeconds ?? 0)}
              </span>
            </div>
            <HideButton row={row} busy={busy} onToggle={onToggle} />
          </li>
        ))}
      </ul>

      <div className="hidden rounded-2xl border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 pl-4">#</TableHead>
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
            {rows.map((row) => (
              <TableRow
                key={row.id}
                className={row.hiddenAt ? "opacity-50" : undefined}
              >
                <TableCell className="pl-4 tabular-nums">
                  {row.rank ?? "–"}
                </TableCell>
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
                  <HideButton row={row} busy={busy} onToggle={onToggle} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

function QuestionAnalysis({ quizId }: { quizId: string }) {
  const stats = api.publicQuiz.stats.useQuery({ quizId });
  const data = stats.data;
  if (!data) {
    return (
      <LoaderCircleIcon className="text-muted-foreground size-5 animate-spin" />
    );
  }
  if (!data.submissions) {
    return (
      <div className="text-muted-foreground rounded-2xl border border-dashed p-8 text-center text-sm">
        Analisis muncul setelah ada peserta yang menyelesaikan quiz.
      </div>
    );
  }
  // Naming a "hardest" question only means something when there is more than one.
  const hardest =
    data.questions.length < 2
      ? undefined
      : [...data.questions]
          .filter((question) => question.correctRate !== null)
          .sort((a, b) => (a.correctRate ?? 0) - (b.correctRate ?? 0))[0];

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm leading-6">
        Persentase peserta yang menjawab benar dari {data.submissions} yang
        selesai.
        {hardest
          ? ` Soal tersulit: soal ${hardest.number} (${Math.round((hardest.correctRate ?? 0) * 100)}% benar), cocok jadi bahan konten atau kelas berikutnya.`
          : ""}
      </p>
      <ul className="flex flex-col gap-2.5">
        {data.questions.map((question) => {
          const rate = Math.round((question.correctRate ?? 0) * 100);
          return (
            <li key={question.id} className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground w-16 shrink-0">
                Soal {question.number}
              </span>
              <span className="bg-muted h-2.5 flex-1 overflow-hidden rounded-full">
                <span
                  className={cn(
                    "block h-full rounded-full",
                    rate < 50 ? "bg-amber-500" : "bg-primary",
                  )}
                  style={{ width: `${rate}%` }}
                />
              </span>
              <span className="w-10 shrink-0 text-right font-medium tabular-nums">
                {rate}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Settings({
  overview,
  quiz,
}: {
  overview: Overview;
  quiz: ManagedQuiz;
}) {
  const refresh = useRefreshQuiz();
  const [title, setTitle] = useState(quiz.title);
  const [description, setDescription] = useState(quiz.description ?? "");
  const [closesAt, setClosesAt] = useState(
    quiz.closesAt ? toLocalDateTimeInput(quiz.closesAt) : "",
  );
  const [deleteOpen, setDeleteOpen] = useState(false);
  const update = api.publicQuiz.update.useMutation({
    onSuccess: async () => {
      await refresh();
      toast.success("Pengaturan quiz disimpan.");
    },
    onError: (error) => toast.error(error.message),
  });
  const remove = api.publicQuiz.delete.useMutation({
    onSuccess: refresh,
    onError: (error) => toast.error(error.message),
  });
  const dirty =
    title.trim() !== quiz.title ||
    description.trim() !== (quiz.description ?? "") ||
    closesAt !== (quiz.closesAt ? toLocalDateTimeInput(quiz.closesAt) : "");

  return (
    <div className="flex flex-col gap-6">
      <form
        className="flex max-w-2xl flex-col gap-4"
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
          <p className="text-muted-foreground text-xs">
            Tampil di halaman quiz dan saat link dibagikan.
          </p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="public-quiz-closes">Tutup otomatis</Label>
          <div className="flex gap-2">
            <DateTimePicker
              id="public-quiz-closes"
              className="flex-1"
              min={toLocalDateTimeInput(new Date())}
              value={closesAt}
              placeholder="Tidak ditutup otomatis"
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
        <Button
          type="submit"
          className="self-start"
          disabled={!dirty || update.isPending}
        >
          {update.isPending ? (
            <LoaderCircleIcon
              data-icon="inline-start"
              className="animate-spin"
            />
          ) : null}
          Simpan perubahan
        </Button>
      </form>

      {stateOf(quiz) === "open" ? (
        <p className="text-muted-foreground max-w-2xl text-xs leading-5">
          Selama quiz dibuka, soal di tugas {overview.assessmentTitle} dikunci
          agar semua peserta mendapat soal yang sama. Tutup quiz untuk mengubah
          soal.
        </p>
      ) : null}

      <div className="border-destructive/30 flex max-w-2xl flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold">Hapus quiz publik</p>
          <p className="text-muted-foreground text-xs leading-5">
            Link berhenti bekerja dan semua hasil serta kontak peserta ikut
            terhapus. Tugasnya tetap ada.
          </p>
        </div>
        <Button
          variant="destructive"
          className="shrink-0"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2Icon data-icon="inline-start" />
          Hapus
        </Button>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus quiz publik?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini permanen. Ekspor CSV dulu bila kontak peserta masih
              dibutuhkan.
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
  );
}
