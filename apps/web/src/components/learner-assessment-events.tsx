"use client";

import Link from "next/link";
import {
  ArrowRightIcon,
  Clock3Icon,
  TrophyIcon,
  UsersIcon,
} from "lucide-react";

import { EmptyState } from "~/components/ui/empty-state";
import { Badge } from "~/components/ui/badge";
import { buttonVariants } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import type { RouterOutputs } from "~/trpc/react";

type LearnerEvent = RouterOutputs["assessmentEvent"]["listForLearner"][number];

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const typeLabel = { QUICK_ASSESSMENT: "Latihan", TRYOUT: "Tryout" } as const;

function eventState(event: LearnerEvent) {
  const attempt = event.attempts[0];
  if (event.participants[0]?.invalidatedAt) return "Attempt invalid";
  if (event.status === "SCHEDULED" && !event.entry.canStart) {
    return "Belum dibuka";
  }
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
            Asesmen kelas
          </p>
          <h1 className="font-heading mt-2 text-3xl font-medium tracking-tight sm:text-4xl">
            Latihan & tryout
          </h1>
        </header>
        <EmptyState
          icon={TrophyIcon}
          title="Belum ada latihan atau tryout"
          description="Latihan dan tryout tampil di sini setelah pengajar menjadwalkan atau membukanya untuk kelas kamu."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <header>
        <p className="text-muted-foreground text-xs font-semibold tracking-[0.18em] uppercase">
          Asesmen kelas
        </p>
        <h1 className="font-heading mt-2 text-3xl font-medium tracking-tight sm:text-4xl">
          Latihan & tryout
        </h1>
        <p className="text-muted-foreground mt-3 max-w-2xl text-sm">
          Kerjakan yang sedang dibuka, lihat jadwal berikutnya, dan cek
          leaderboard setelah ditutup.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {events.map((event) => {
          const attempt = event.attempts[0];
          const href =
            event.entry.destination === "ATTEMPT" && attempt
              ? `/learn/${event.course.id}/items/${event.courseItem.id}/attempts/${attempt.id}`
              : `/learn/assessments/${event.id}`;
          const score =
            attempt?.score !== null && attempt?.maxScore
              ? `${attempt.score}/${attempt.maxScore}`
              : null;
          return (
            <Card key={event.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="mb-2 flex flex-wrap gap-2">
                      <Badge
                        variant={
                          event.status === "OPEN" ? "default" : "outline"
                        }
                      >
                        {event.status === "OPEN"
                          ? "Dibuka"
                          : event.status === "SCHEDULED"
                            ? "Terjadwal"
                            : "Selesai"}
                      </Badge>
                      <Badge variant="secondary">{typeLabel[event.type]}</Badge>
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
                        (event.status === "SCHEDULED" && event.opensAt
                          ? `Dibuka ${dateTimeFormatter.format(event.opensAt)}`
                          : event.closesAt
                            ? `Tutup ${dateTimeFormatter.format(event.closesAt)}`
                            : "")}
                    </p>
                  </div>
                  <Link href={href} className={buttonVariants({ size: "sm" })}>
                    {event.entry.destination === "ATTEMPT"
                      ? "Lanjutkan"
                      : "Buka"}{" "}
                    <ArrowRightIcon />
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
