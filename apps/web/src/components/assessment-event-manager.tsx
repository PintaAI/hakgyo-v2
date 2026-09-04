"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  BanIcon,
  CheckCircle2Icon,
  ClipboardCheckIcon,
  Clock3Icon,
  LoaderCircleIcon,
  PlayIcon,
  PlusIcon,
  SquareIcon,
  TrophyIcon,
  UsersIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { api, type RouterOutputs } from "~/trpc/react";

type EventSummary = RouterOutputs["assessmentEvent"]["listManageable"][number];

const statusLabel = {
  DRAFT: "Draf",
  OPEN: "Dibuka",
  CLOSED: "Selesai",
  CANCELLED: "Dibatalkan",
} as const;

const statusVariant = {
  DRAFT: "secondary",
  OPEN: "default",
  CLOSED: "outline",
  CANCELLED: "destructive",
} as const;

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function toLocalDateTimeInput(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function formatDuration(milliseconds: number) {
  const seconds = Math.round(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Perubahan event belum berhasil disimpan.";
}

export function AssessmentEventManager({
  courseId,
  cohortId,
  cohortName,
}: {
  courseId: string;
  cohortId?: string;
  cohortName?: string;
}) {
  const utils = api.useUtils();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>();
  const [title, setTitle] = useState("");
  const [courseItemId, setCourseItemId] = useState<string>();
  const [type, setType] = useState<"QUICK_ASSESSMENT" | "TRYOUT">(
    cohortId ? "QUICK_ASSESSMENT" : "TRYOUT",
  );
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [closesAt, setClosesAt] = useState(() =>
    toLocalDateTimeInput(new Date(Date.now() + 24 * 60 * 60_000)),
  );
  const input = { courseId, cohortId };
  const events = api.assessmentEvent.listManageable.useQuery(input);
  const assessmentItems = api.assessmentEvent.listAssessmentItems.useQuery({
    courseId,
    cohortId,
  });
  const detail = api.assessmentEvent.getManageable.useQuery(
    { eventId: selectedEventId ?? "" },
    { enabled: Boolean(selectedEventId) },
  );
  const create = api.assessmentEvent.create.useMutation();
  const open = api.assessmentEvent.open.useMutation();
  const close = api.assessmentEvent.close.useMutation();
  const cancel = api.assessmentEvent.cancel.useMutation();
  const invalidate = api.assessmentEvent.invalidateAttempt.useMutation();
  const adjust = api.assessmentEvent.adjustResult.useMutation();
  const pending =
    create.isPending ||
    open.isPending ||
    close.isPending ||
    cancel.isPending ||
    invalidate.isPending ||
    adjust.isPending;

  const selectedItem = assessmentItems.data?.find(
    (item) => item.id === courseItemId,
  );

  async function refresh(eventId?: string) {
    await events.refetch();
    if (eventId) {
      await utils.assessmentEvent.getManageable.invalidate({ eventId });
    }
  }

  async function createEvent(event: FormEvent) {
    event.preventDefault();
    const duration = Number(durationMinutes);
    const closeDate = new Date(closesAt);
    if (!courseItemId || !Number.isInteger(duration) || duration < 1) return;
    if (Number.isNaN(closeDate.getTime())) return;
    try {
      const created = await create.mutateAsync({
        courseId,
        cohortId,
        courseItemId,
        type: cohortId ? type : "TRYOUT",
        scope: cohortId ? "COHORT" : "COURSE",
        title: title.trim(),
        durationMinutes: duration,
        closesAt: closeDate,
      });
      const opened = await open.mutateAsync({ eventId: created.id });
      toast.success(`Event dibuka untuk ${opened.participantCount} peserta.`);
      setCreateOpen(false);
      setTitle("");
      setCourseItemId(undefined);
      await refresh();
    } catch (error) {
      toast.error(errorMessage(error));
      await refresh();
    }
  }

  async function openEvent(eventId: string) {
    try {
      const result = await open.mutateAsync({ eventId });
      toast.success(`Event dibuka untuk ${result.participantCount} peserta.`);
      await refresh(eventId);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function closeEvent(eventId: string) {
    if (
      !window.confirm("Tutup event dan tampilkan leaderboard kepada peserta?")
    )
      return;
    try {
      await close.mutateAsync({ eventId });
      toast.success("Event ditutup. Leaderboard sekarang tersedia.");
      await refresh(eventId);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function cancelEvent(eventId: string) {
    const cancellationReason = window.prompt("Alasan pembatalan event:");
    if (!cancellationReason?.trim()) return;
    try {
      await cancel.mutateAsync({
        eventId,
        reason: cancellationReason.trim(),
      });
      toast.success("Event dibatalkan.");
      await refresh(eventId);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function invalidateAttempt(eventId: string, attemptId: string) {
    const invalidationReason = window.prompt("Alasan invalidasi attempt:");
    if (!invalidationReason?.trim()) return;
    try {
      await invalidate.mutateAsync({
        eventId,
        attemptId,
        reason: invalidationReason.trim(),
      });
      toast.success("Attempt dikeluarkan dari leaderboard.");
      await refresh(eventId);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function adjustResult(
    eventId: string,
    attemptId: string,
    currentScore: number,
    maxScore: number,
  ) {
    const value = window.prompt(
      `Nilai baru (0-${maxScore}):`,
      currentScore.toString(),
    );
    if (value === null) return;
    const score = Number(value);
    if (!Number.isInteger(score) || score < 0 || score > maxScore) {
      toast.error("Nilai baru tidak valid.");
      return;
    }
    const adjustmentReason = window.prompt("Alasan perubahan nilai:");
    if (!adjustmentReason?.trim()) return;
    try {
      await adjust.mutateAsync({
        eventId,
        attemptId,
        score,
        reason: adjustmentReason.trim(),
      });
      toast.success("Nilai diperbarui dan dicatat di audit log.");
      await refresh(eventId);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-xs font-semibold tracking-[0.14em] uppercase">
            Assessment events
          </p>
          <h2 className="mt-1 font-[family-name:var(--font-hanken-grotesk)] text-2xl font-medium tracking-tight">
            {cohortId ? `Event ${cohortName ?? "cohort"}` : "Tryout course"}
          </h2>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
            {cohortId
              ? "Jalankan quick assessment atau tryout untuk snapshot peserta cohort saat ini."
              : "Jalankan tryout untuk semua peserta aktif course dan bandingkan hasilnya."}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <PlusIcon /> Buat event
        </Button>
      </div>

      {events.isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : events.error ? (
        <div className="text-destructive bg-destructive/10 rounded-md p-5 text-sm">
          {events.error.message}
        </div>
      ) : events.data.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {events.data.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              pending={pending}
              onOpen={() => openEvent(event.id)}
              onClose={() => closeEvent(event.id)}
              onCancel={() => cancelEvent(event.id)}
              onSelect={() => setSelectedEventId(event.id)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed px-5 py-14 text-center">
          <TrophyIcon className="text-muted-foreground mx-auto size-7" />
          <h3 className="mt-3 font-medium">Belum ada assessment event</h3>
          <p className="text-muted-foreground mx-auto mt-1 max-w-md text-sm">
            Buat event pertama dari assessment yang sudah dipublish di course.
          </p>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <form onSubmit={createEvent}>
            <DialogHeader>
              <DialogTitle>Buat assessment event</DialogTitle>
              <DialogDescription>
                Event langsung dibuka dan peserta di-snapshot setelah dibuat.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-5 py-5">
              {cohortId ? (
                <div className="space-y-2">
                  <Label htmlFor="event-type">Jenis event</Label>
                  <Select
                    value={type}
                    onValueChange={(value) => {
                      if (
                        value === "QUICK_ASSESSMENT" ||
                        value === "TRYOUT"
                      ) {
                        setType(value);
                      }
                    }}
                  >
                    <SelectTrigger id="event-type" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="QUICK_ASSESSMENT">
                        Quick assessment
                      </SelectItem>
                      <SelectItem value="TRYOUT">Tryout cohort</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="event-title">Judul</Label>
                <Input
                  id="event-title"
                  value={title}
                  maxLength={200}
                  required
                  placeholder={
                    cohortId
                      ? "Quick assessment pekan 1"
                      : "Tryout akhir course"
                  }
                  onChange={(event) => setTitle(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-assessment">Assessment</Label>
                <Select
                  value={courseItemId}
                  onValueChange={(value) => setCourseItemId(value ?? undefined)}
                >
                  <SelectTrigger id="event-assessment" className="w-full">
                    <SelectValue placeholder="Pilih assessment" />
                  </SelectTrigger>
                  <SelectContent>
                    {assessmentItems.data?.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.module.title} · {item.assessment?.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedItem ? (
                  <p className="text-muted-foreground text-xs">
                    {selectedItem.assessment?._count.questions} soal
                  </p>
                ) : null}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="event-duration">Durasi (menit)</Label>
                  <Input
                    id="event-duration"
                    type="number"
                    min={1}
                    max={480}
                    required
                    value={durationMinutes}
                    onChange={(event) => setDurationMinutes(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event-closes">Ditutup pada</Label>
                  <Input
                    id="event-closes"
                    type="datetime-local"
                    min={toLocalDateTimeInput(new Date())}
                    required
                    value={closesAt}
                    onChange={(event) => setClosesAt(event.target.value)}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={pending || !courseItemId}>
                {pending ? <LoaderCircleIcon className="animate-spin" /> : null}
                Buat dan buka
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(selectedEventId)}
        onOpenChange={(next) => !next && setSelectedEventId(undefined)}
      >
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{detail.data?.title ?? "Hasil event"}</DialogTitle>
            <DialogDescription>
              Peserta yang belum mengirim tidak masuk leaderboard.
            </DialogDescription>
          </DialogHeader>
          {detail.isPending ? (
            <Skeleton className="h-80 w-full" />
          ) : detail.error ? (
            <p className="text-destructive text-sm">{detail.error.message}</p>
          ) : detail.data ? (
            <EventResults
              event={detail.data}
              pending={pending}
              onInvalidate={invalidateAttempt}
              onAdjust={adjustResult}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EventCard({
  event,
  pending,
  onOpen,
  onClose,
  onCancel,
  onSelect,
}: {
  event: EventSummary;
  pending: boolean;
  onOpen: () => void;
  onClose: () => void;
  onCancel: () => void;
  onSelect: () => void;
}) {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex flex-wrap gap-2">
              <Badge variant={statusVariant[event.status]}>
                {statusLabel[event.status]}
              </Badge>
              <Badge variant="outline">
                {event.type === "TRYOUT" ? "Tryout" : "Quick assessment"}
              </Badge>
            </div>
            <CardTitle>{event.title}</CardTitle>
            <CardDescription className="mt-1">
              {event.courseItem.assessment?.title}
            </CardDescription>
          </div>
          <TrophyIcon className="text-muted-foreground size-5" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-muted-foreground grid grid-cols-3 gap-3 text-xs">
          <span className="flex items-center gap-1.5">
            <Clock3Icon className="size-3.5" /> {event.durationMinutes} menit
          </span>
          <span className="flex items-center gap-1.5">
            <UsersIcon className="size-3.5" /> {event._count.participants}{" "}
            peserta
          </span>
          <span className="flex items-center gap-1.5">
            <ClipboardCheckIcon className="size-3.5" /> {event._count.attempts}{" "}
            attempt
          </span>
        </div>
        <p className="text-muted-foreground mt-3 text-xs">
          Ditutup{" "}
          {event.closesAt ? dateTimeFormatter.format(event.closesAt) : "—"}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={onSelect}>
            Lihat peserta & hasil
          </Button>
          {event.status === "DRAFT" ? (
            <Button size="sm" onClick={onOpen} disabled={pending}>
              <PlayIcon /> Buka
            </Button>
          ) : null}
          {event.status === "OPEN" ? (
            <Button size="sm" onClick={onClose} disabled={pending}>
              <SquareIcon /> Tutup
            </Button>
          ) : null}
          {event.status === "DRAFT" || event.status === "OPEN" ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={onCancel}
              disabled={pending}
            >
              <BanIcon /> Batalkan
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function EventResults({
  event,
  pending,
  onInvalidate,
  onAdjust,
}: {
  event: RouterOutputs["assessmentEvent"]["getManageable"];
  pending: boolean;
  onInvalidate: (eventId: string, attemptId: string) => Promise<void>;
  onAdjust: (
    eventId: string,
    attemptId: string,
    score: number,
    maxScore: number,
  ) => Promise<void>;
}) {
  const ranks = useMemo(
    () => new Map(event.leaderboard.map((entry) => [entry.userId, entry.rank])),
    [event.leaderboard],
  );
  return (
    <div className="space-y-6">
      {event.status === "CLOSED" && event.leaderboard.length ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {event.leaderboard.slice(0, 3).map((entry) => (
            <div
              key={entry.userId}
              className="bg-muted/30 rounded-md border p-4"
            >
              <p className="text-muted-foreground text-xs">
                Peringkat {entry.rank}
              </p>
              <p className="mt-1 truncate font-semibold">{entry.name}</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {entry.score}/{entry.maxScore}
              </p>
              <p className="text-muted-foreground text-xs">
                {entry.percentage}% · {formatDuration(entry.completionTimeMs)}
              </p>
            </div>
          ))}
        </div>
      ) : null}
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Rank</TableHead>
              <TableHead>Peserta</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Nilai</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {event.participantResults.map((participant) => {
              const attempt = participant.attempt;
              const rank = ranks.get(participant.userId);
              const invalidated = Boolean(participant.invalidatedAt);
              const resultStatus = invalidated
                ? "Invalid"
                : !attempt
                  ? event.status === "CLOSED"
                    ? "Tidak mengerjakan"
                    : "Belum mulai"
                  : attempt.status === "IN_PROGRESS"
                    ? event.status === "CLOSED"
                      ? "Tidak selesai"
                      : "Mengerjakan"
                    : attempt.status === "IN_REVIEW"
                      ? "Perlu review"
                      : "Selesai";
              return (
                <TableRow key={participant.userId}>
                  <TableCell className="font-medium tabular-nums">
                    {rank ?? "—"}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{participant.user.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {participant.user.email}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={invalidated ? "destructive" : "outline"}>
                      {resultStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {attempt?.score !== null && attempt?.maxScore
                      ? `${attempt.score}/${attempt.maxScore}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {attempt?.status === "GRADED" &&
                    attempt.score !== null &&
                    attempt.maxScore !== null &&
                    !invalidated ? (
                      <span className="inline-flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={pending}
                          onClick={() =>
                            onAdjust(
                              event.id,
                              attempt.id,
                              attempt.score!,
                              attempt.maxScore!,
                            )
                          }
                        >
                          Koreksi
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={pending}
                          onClick={() => onInvalidate(event.id, attempt.id)}
                        >
                          Invalidasi
                        </Button>
                      </span>
                    ) : invalidated ? (
                      <CheckCircle2Icon className="text-muted-foreground ml-auto size-4" />
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
