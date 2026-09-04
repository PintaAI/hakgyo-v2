"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  Clock3Icon,
  LoaderCircleIcon,
  TrophyIcon,
  UsersIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "~/components/ui/badge";
import { Button, buttonVariants } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
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

type LearnerEvent = RouterOutputs["assessmentEvent"]["listForLearner"][number];

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatDuration(milliseconds: number) {
  const totalSeconds = Math.round(milliseconds / 1000);
  return `${Math.floor(totalSeconds / 60)}:${(totalSeconds % 60)
    .toString()
    .padStart(2, "0")}`;
}

function eventState(event: LearnerEvent) {
  const attempt = event.attempts[0];
  if (event.participants[0]?.invalidatedAt) return "Attempt invalid";
  if (attempt?.status === "GRADED") return "Sudah dinilai";
  if (attempt?.status === "IN_REVIEW") return "Sedang direview";
  if (attempt?.status === "IN_PROGRESS")
    return event.status === "OPEN" ? "Lanjutkan" : "Tidak selesai";
  if (event.status === "CLOSED") return "Tidak mengerjakan";
  return "Belum dimulai";
}

export function LearnerAssessmentEvents({
  events,
}: {
  events: LearnerEvent[];
}) {
  if (!events.length) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <header>
          <p className="text-muted-foreground text-xs font-semibold tracking-[0.18em] uppercase">
            Assessment events
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-hanken-grotesk)] text-3xl font-medium tracking-tight sm:text-4xl">
            Quick assessment & tryout
          </h1>
        </header>
        <div className="rounded-lg border border-dashed px-5 py-16 text-center">
          <TrophyIcon className="text-muted-foreground mx-auto size-7" />
          <h2 className="mt-3 font-medium">Belum ada event untuk kamu</h2>
          <p className="text-muted-foreground mx-auto mt-1 max-w-md text-sm">
            Event akan tampil setelah pengajar membukanya untuk cohort atau
            course kamu.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <header>
        <p className="text-muted-foreground text-xs font-semibold tracking-[0.18em] uppercase">
          Assessment events
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-hanken-grotesk)] text-3xl font-medium tracking-tight sm:text-4xl">
          Quick assessment & tryout
        </h1>
        <p className="text-muted-foreground mt-3 max-w-2xl text-sm">
          Kerjakan event aktif dan lihat leaderboard setelah event ditutup.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {events.map((event) => {
          const attempt = event.attempts[0];
          const score =
            attempt?.score !== null && attempt?.maxScore
              ? `${attempt.score}/${attempt.maxScore}`
              : null;
          return (
            <Card key={event.id} className="rounded-lg">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="mb-2 flex flex-wrap gap-2">
                      <Badge
                        variant={
                          event.status === "OPEN" ? "default" : "outline"
                        }
                      >
                        {event.status === "OPEN" ? "Dibuka" : "Selesai"}
                      </Badge>
                      <Badge variant="secondary">
                        {event.type === "TRYOUT"
                          ? "Tryout"
                          : "Quick assessment"}
                      </Badge>
                    </div>
                    <CardTitle>{event.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {event.course.title}
                      {event.cohort ? ` · ${event.cohort.name}` : ""}
                    </CardDescription>
                  </div>
                  <TrophyIcon className="text-muted-foreground size-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-2 text-xs">
                  <span className="flex items-center gap-1.5">
                    <Clock3Icon className="size-3.5" /> {event.durationMinutes}{" "}
                    menit
                  </span>
                  <span className="flex items-center gap-1.5">
                    <UsersIcon className="size-3.5" />{" "}
                    {event._count.participants} peserta
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between gap-4 border-t pt-4">
                  <div>
                    <p className="text-sm font-medium">{eventState(event)}</p>
                    <p className="text-muted-foreground text-xs">
                      {score ??
                        (event.closesAt
                          ? `Tutup ${dateTimeFormatter.format(event.closesAt)}`
                          : "")}
                    </p>
                  </div>
                  <Link
                    href={`/learn/assessments/${event.id}`}
                    className={buttonVariants({ size: "sm" })}
                  >
                    Buka <ArrowRightIcon />
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export function LearnerAssessmentEvent({
  event,
}: {
  event: RouterOutputs["assessmentEvent"]["getForLearner"];
}) {
  const router = useRouter();
  const start = api.assessmentEvent.startAttempt.useMutation();
  const attempt = event.attempts[0];
  const participant = event.participants[0];
  const expired = event.closesAt ? event.closesAt <= new Date() : false;

  async function startOrResume() {
    if (attempt) {
      router.push(
        `/learn/${event.course.id}/items/${event.courseItem.id}/attempts/${attempt.id}`,
      );
      return;
    }
    try {
      const created = await start.mutateAsync({ eventId: event.id });
      router.push(
        `/learn/${created.courseId}/items/${created.courseItemId}/attempts/${created.id}`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Event belum dapat dimulai.",
      );
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <Link
        href="/learn/assessments"
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "text-muted-foreground -ml-2",
        )}
      >
        <ArrowLeftIcon /> Semua event
      </Link>
      <section className="relative overflow-hidden rounded-lg bg-[#171915] px-6 py-8 text-[#f5f3e9] sm:px-9 sm:py-11">
        <div className="pointer-events-none absolute top-0 right-0 size-56 translate-x-16 -translate-y-20 rounded-full border border-white/15" />
        <div className="relative">
          <div className="flex flex-wrap gap-2">
            <Badge className="border-white/20 bg-white/10 text-white">
              {event.type === "TRYOUT" ? "Tryout" : "Quick assessment"}
            </Badge>
            <Badge className="border-white/20 bg-white/10 text-white">
              {event.scope === "COHORT"
                ? event.cohort?.name
                : event.course.title}
            </Badge>
          </div>
          <h1 className="mt-4 max-w-3xl font-[family-name:var(--font-hanken-grotesk)] text-3xl font-medium tracking-tight sm:text-5xl">
            {event.title}
          </h1>
          <p className="mt-3 text-sm text-white/65">
            {event.courseItem.assessment?.title} · {event.durationMinutes} menit
          </p>
          {event.closesAt ? (
            <p className="mt-1 text-sm text-white/65">
              Ditutup {dateTimeFormatter.format(event.closesAt)}
            </p>
          ) : null}
          {participant?.invalidatedAt ? (
            <div className="mt-7 rounded-md border border-red-300/30 bg-red-400/10 p-4 text-sm">
              Attempt kamu dinyatakan tidak valid.{" "}
              {participant.invalidationReason}
            </div>
          ) : event.status === "OPEN" && !expired ? (
            <Button
              className="mt-7 bg-[#f5f3e9] text-[#171915] hover:bg-white"
              size="lg"
              disabled={start.isPending}
              onClick={startOrResume}
            >
              {start.isPending ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : null}
              {attempt?.status === "IN_PROGRESS"
                ? "Lanjutkan attempt"
                : attempt
                  ? "Lihat hasil"
                  : "Mulai sekarang"}
              <ArrowRightIcon />
            </Button>
          ) : attempt ? (
            <Button
              className="mt-7 bg-[#f5f3e9] text-[#171915] hover:bg-white"
              size="lg"
              onClick={startOrResume}
            >
              Lihat hasil <ArrowRightIcon />
            </Button>
          ) : (
            <p className="mt-7 text-sm text-white/70">
              Event telah ditutup. Tidak ada attempt yang tercatat.
            </p>
          )}
        </div>
      </section>

      {event.status === "CLOSED" ? (
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrophyIcon className="size-5" /> Leaderboard
            </CardTitle>
            <CardDescription>
              Diurutkan berdasarkan nilai, waktu pengerjaan, lalu waktu submit.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {event.leaderboard?.length ? (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Rank</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Nilai</TableHead>
                      <TableHead>Waktu</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {event.leaderboard.map((entry) => (
                      <TableRow
                        key={entry.userId}
                        className={
                          entry.attemptId === attempt?.id
                            ? "bg-muted/40"
                            : undefined
                        }
                      >
                        <TableCell className="font-semibold tabular-nums">
                          #{entry.rank}
                        </TableCell>
                        <TableCell className="font-medium">
                          {entry.name}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {entry.score}/{entry.maxScore} ({entry.percentage}%)
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {formatDuration(entry.completionTimeMs)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-muted-foreground py-8 text-center text-sm">
                Belum ada hasil valid untuk ditampilkan.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-lg">
          <CardContent className="py-8 text-center">
            <TrophyIcon className="text-muted-foreground mx-auto size-6" />
            <p className="mt-2 font-medium">Leaderboard belum tersedia</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Nama dan hasil peserta akan tampil setelah event ditutup.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
