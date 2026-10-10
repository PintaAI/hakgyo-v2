"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BanIcon,
  CalendarClockIcon,
  CheckCircle2Icon,
  ClipboardCheckIcon,
  Clock3Icon,
  LoaderCircleIcon,
  PlayIcon,
  PlusIcon,
  SquareIcon,
  Trash2Icon,
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
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "~/components/ui/select";
import { Skeleton } from "~/components/ui/skeleton";
import { useDialogs } from "~/components/ui/use-dialogs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { api, type RouterOutputs } from "~/trpc/react";
import { AssessmentReviewDetail } from "~/components/review-queue";
import {
  CreateAssessmentEventSheet,
  eventTypeLabel,
} from "~/components/assessment-event-create";

type EventSummary =
  RouterOutputs["assessmentEvent"]["listManageable"]["items"][number];

const statusLabel = {
  DRAFT: "Draft",
  SCHEDULED: "Terjadwal",
  OPEN: "Dibuka",
  CLOSED: "Selesai",
  CANCELLED: "Dibatalkan",
} as const;

const statusVariant = {
  DRAFT: "secondary",
  SCHEDULED: "secondary",
  OPEN: "default",
  CLOSED: "outline",
  CANCELLED: "destructive",
} as const;

/** "Semua kelas", or the first classes by name. */
function targetSummary(event: {
  allCohorts: boolean;
  targets: Array<{ name: string }>;
}) {
  if (event.allCohorts) {
    return event.targets.length
      ? `Semua kelas (${event.targets.length})`
      : "Semua kelas";
  }
  const names = event.targets.map((target) => target.name);
  return names.length > 2
    ? `${names.slice(0, 2).join(", ")} +${names.length - 2} kelas`
    : names.join(", ") || "Belum ada kelas";
}

const participantStatusLabels = {
  ALL: "Semua status",
  NOT_STARTED: "Belum mulai",
  IN_PROGRESS: "Mengerjakan",
  IN_REVIEW: "Perlu review",
  GRADED: "Selesai",
} as const;

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

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
}: {
  courseId: string;
  cohortId?: string;
}) {
  const utils = api.useUtils();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>();
  const [eventPage, setEventPage] = useState(1);
  const [participantPage, setParticipantPage] = useState(1);
  const [participantSearch, setParticipantSearch] = useState("");
  const [participantStatus, setParticipantStatus] = useState<
    "IN_PROGRESS" | "IN_REVIEW" | "GRADED" | "NOT_STARTED" | undefined
  >();
  const [participantCohortId, setParticipantCohortId] = useState<string>();
  const [addCohortsEvent, setAddCohortsEvent] = useState<EventSummary>();
  const input = { courseId, cohortId, page: eventPage };
  // The event list sits behind the results dialog, so only one of the two polls at a time.
  const events = api.assessmentEvent.listManageable.useQuery(input, {
    refetchInterval: selectedEventId ? false : 30_000,
  });
  // Query the participant search after typing pauses instead of on every keystroke.
  const [appliedParticipantSearch, setAppliedParticipantSearch] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(
      () => setAppliedParticipantSearch(participantSearch.trim()),
      300,
    );
    return () => window.clearTimeout(timer);
  }, [participantSearch]);
  const detail = api.assessmentEvent.getManageable.useQuery(
    {
      eventId: selectedEventId ?? "",
      page: participantPage,
      search: appliedParticipantSearch || undefined,
      status: participantStatus,
      cohortId: participantCohortId,
    },
    {
      enabled: Boolean(selectedEventId),
      refetchInterval: 30_000,
      // Keep showing the same event while a new page/filter loads (keeps the search input mounted).
      placeholderData: (previous) =>
        previous?.id === selectedEventId ? previous : undefined,
    },
  );
  const open = api.assessmentEvent.open.useMutation();
  const close = api.assessmentEvent.close.useMutation();
  const cancel = api.assessmentEvent.cancel.useMutation();
  const deleteEvent = api.assessmentEvent.delete.useMutation();
  const invalidate = api.assessmentEvent.invalidateAttempt.useMutation();
  const adjust = api.assessmentEvent.adjustResult.useMutation();
  const { confirm, prompt, dialogs } = useDialogs();
  const pending =
    open.isPending ||
    close.isPending ||
    cancel.isPending ||
    deleteEvent.isPending ||
    invalidate.isPending ||
    adjust.isPending;

  async function refresh(eventId?: string) {
    await Promise.all([
      events.refetch(),
      eventId
        ? utils.assessmentEvent.getManageable.invalidate({ eventId })
        : null,
    ]);
  }

  async function openEvent(eventId: string) {
    const confirmed = await confirm({
      title: "Buka sekarang?",
      description:
        "Learner di kelas yang dipilih bisa langsung mengerjakan dan mendapat notifikasi.",
      confirmLabel: "Buka sekarang",
    });
    if (!confirmed) return;
    try {
      const result = await open.mutateAsync({ eventId });
      toast.success(`Event dibuka untuk ${result.participantCount} learner.`);
      await refresh(eventId);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function closeEvent(eventId: string) {
    const confirmed = await confirm({
      title: "Tutup event?",
      description:
        "Peserta tidak dapat mengerjakan lagi dan leaderboard akan ditampilkan kepada mereka.",
      confirmLabel: "Tutup event",
    });
    if (!confirmed) return;
    try {
      await close.mutateAsync({ eventId });
      toast.success("Event ditutup. Leaderboard sekarang tersedia.");
      await refresh(eventId);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function cancelEvent(eventId: string) {
    const values = await prompt({
      title: "Batalkan event?",
      description: "Alasan pembatalan akan dicatat dan ditampilkan ke peserta.",
      confirmLabel: "Batalkan event",
      destructive: true,
      fields: [
        { name: "reason", label: "Alasan pembatalan", type: "textarea" },
        {
          name: "notify",
          label: "Beri tahu peserta lewat notifikasi",
          type: "checkbox",
        },
      ],
    });
    if (!values?.reason) return;
    try {
      await cancel.mutateAsync({
        eventId,
        reason: values.reason,
        notify: values.notify === "true",
      });
      toast.success("Event dibatalkan.");
      await refresh(eventId);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function removeEvent(eventId: string) {
    const confirmed = await confirm({
      title: "Hapus event ini?",
      description:
        "Tindakan ini permanen. Semua attempt, jawaban, hasil, dan riwayat peserta event ini akan ikut dihapus.",
      confirmLabel: "Hapus event",
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await deleteEvent.mutateAsync({ eventId });
      toast.success("Event dihapus.");
      await refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function invalidateAttempt(eventId: string, attemptId: string) {
    const values = await prompt({
      title: "Invalidasi attempt?",
      description: "Attempt akan dikeluarkan dari leaderboard.",
      confirmLabel: "Invalidasi",
      destructive: true,
      fields: [
        { name: "reason", label: "Alasan invalidasi", type: "textarea" },
      ],
    });
    if (!values?.reason) return;
    try {
      await invalidate.mutateAsync({
        eventId,
        attemptId,
        reason: values.reason,
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
    const values = await prompt({
      title: "Ubah nilai",
      description: "Perubahan nilai dicatat di audit log.",
      fields: [
        {
          name: "score",
          label: `Nilai baru (0–${maxScore})`,
          type: "number",
          min: 0,
          max: maxScore,
          defaultValue: currentScore.toString(),
        },
        { name: "reason", label: "Alasan perubahan", type: "textarea" },
      ],
    });
    if (!values?.reason) return;
    const score = Number(values.score);
    if (!Number.isInteger(score) || score < 0 || score > maxScore) {
      toast.error("Nilai baru tidak valid.");
      return;
    }
    try {
      await adjust.mutateAsync({
        eventId,
        attemptId,
        score,
        reason: values.reason,
      });
      toast.success("Nilai diperbarui dan dicatat di audit log.");
      await refresh(eventId);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <div className="space-y-6">
      {dialogs}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-medium tracking-tight">
            Latihan & tryout
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {cohortId
              ? "Latihan dan tryout untuk kelas ini, termasuk yang dibuat dari course."
              : "Jalankan latihan atau tryout untuk satu, beberapa, atau semua kelas."}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <PlusIcon data-icon="inline-start" />
          Buat latihan / tryout
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
      ) : events.data.items.length ? (
        <div className="grid gap-4 max-sm:gap-0 max-sm:border-t lg:grid-cols-2">
          {events.data.items.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              fromCourse={Boolean(cohortId) && !event.canManage}
              pending={pending}
              onAddCohorts={
                cohortId ? undefined : () => setAddCohortsEvent(event)
              }
              onOpen={() => openEvent(event.id)}
              onClose={() => closeEvent(event.id)}
              onCancel={() => cancelEvent(event.id)}
              onDelete={() => removeEvent(event.id)}
              onSelect={() => {
                setSelectedEventId(event.id);
                setParticipantPage(1);
                setParticipantSearch("");
                setAppliedParticipantSearch("");
                setParticipantStatus(undefined);
                setParticipantCohortId(undefined);
              }}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed px-5 py-14 text-center">
          <TrophyIcon className="text-muted-foreground mx-auto size-7" />
          <h3 className="mt-3 font-medium">Belum ada latihan atau tryout</h3>
          <p className="text-muted-foreground mx-auto mt-1 max-w-md text-sm">
            Buat dari tugas yang sudah tampil di kurikulum, lalu pilih kelasnya.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          {events.data?.total ?? 0} asesmen · Halaman {eventPage}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={eventPage <= 1}
            onClick={() => setEventPage((p) => p - 1)}
          >
            Sebelumnya
          </Button>
          <Button
            variant="outline"
            disabled={!events.data || eventPage >= events.data.pageCount}
            onClick={() => setEventPage((p) => p + 1)}
          >
            Berikutnya
          </Button>
        </div>
      </div>
      <CreateAssessmentEventSheet
        courseId={courseId}
        cohortId={cohortId}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => refresh()}
      />
      {addCohortsEvent ? (
        <AddCohortsDialog
          event={addCohortsEvent}
          courseId={courseId}
          onClose={() => setAddCohortsEvent(undefined)}
          onAdded={() => refresh(addCohortsEvent.id)}
        />
      ) : null}

      <Dialog
        open={Boolean(selectedEventId)}
        onOpenChange={(next) => !next && setSelectedEventId(undefined)}
      >
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{detail.data?.title ?? "Hasil event"}</DialogTitle>
            <DialogDescription>
              {detail.data
                ? `${eventTypeLabel[detail.data.type]} · ${targetSummary(detail.data)}. `
                : ""}
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
              page={participantPage}
              onPage={setParticipantPage}
              search={participantSearch}
              onSearch={(value) => {
                setParticipantSearch(value);
                setParticipantPage(1);
              }}
              status={participantStatus}
              onStatus={(value) => {
                setParticipantStatus(value);
                setParticipantPage(1);
              }}
              cohortFilter={participantCohortId}
              onCohortFilter={(value) => {
                setParticipantCohortId(value);
                setParticipantPage(1);
              }}
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
  fromCourse,
  pending,
  onAddCohorts,
  onOpen,
  onClose,
  onCancel,
  onDelete,
  onSelect,
}: {
  event: EventSummary;
  /** Shown on a class page for an event its staff do not manage. */
  fromCourse: boolean;
  pending: boolean;
  onAddCohorts?: () => void;
  onOpen: () => void;
  onClose: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onSelect: () => void;
}) {
  const manage = event.canManage;
  const active =
    event.status === "DRAFT" ||
    event.status === "SCHEDULED" ||
    event.status === "OPEN";
  return (
    <Card className="max-sm:rounded-none max-sm:border-x-0 max-sm:border-t-0 max-sm:bg-transparent max-sm:shadow-none">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap gap-2">
              <Badge variant={statusVariant[event.status]}>
                {statusLabel[event.status]}
              </Badge>
              <Badge variant="outline">{eventTypeLabel[event.type]}</Badge>
              {fromCourse ? <Badge variant="outline">Dari course</Badge> : null}
            </div>
            <CardTitle>{event.title}</CardTitle>
            <CardDescription className="mt-1">
              {event.courseItem.assessment?.title}
            </CardDescription>
          </div>
          <TrophyIcon className="text-muted-foreground size-5 shrink-0" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="flex items-center gap-1.5 text-sm">
          <UsersIcon className="text-muted-foreground size-3.5 shrink-0" />
          <span className="truncate">{targetSummary(event)}</span>
        </p>
        <div className="text-muted-foreground mt-2 grid grid-cols-3 gap-3 text-xs">
          <span className="flex items-center gap-1.5">
            <Clock3Icon className="size-3.5" /> {event.durationMinutes} menit
          </span>
          <span>{event._count.participants} peserta</span>
          <span className="flex items-center gap-1.5">
            <ClipboardCheckIcon className="size-3.5" /> {event._count.attempts}{" "}
            attempt
          </span>
        </div>
        <p className="text-muted-foreground mt-3 flex flex-wrap gap-x-3 text-xs">
          {event.status === "SCHEDULED" && event.opensAt ? (
            <span className="flex items-center gap-1">
              <CalendarClockIcon className="size-3.5" />
              Dibuka {dateTimeFormatter.format(event.opensAt)}
            </span>
          ) : null}
          <span>
            Ditutup{" "}
            {event.closesAt ? dateTimeFormatter.format(event.closesAt) : "—"}
          </span>
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {event.canReview ? (
            <Button size="sm" variant="outline" onClick={onSelect}>
              Lihat peserta & hasil
            </Button>
          ) : (
            <p className="text-muted-foreground text-xs">
              Draf untuk semua kelas, menunggu dibuka oleh pengelola course.
            </p>
          )}
          {manage &&
          (event.status === "DRAFT" || event.status === "SCHEDULED") ? (
            <Button size="sm" onClick={onOpen} disabled={pending}>
              <PlayIcon /> Buka sekarang
            </Button>
          ) : null}
          {manage && event.status === "OPEN" ? (
            <Button size="sm" onClick={onClose} disabled={pending}>
              <SquareIcon /> Tutup
            </Button>
          ) : null}
          {manage && active && onAddCohorts ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={onAddCohorts}
              disabled={pending}
            >
              <PlusIcon /> Tambah kelas
            </Button>
          ) : null}
          {manage && active ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={onCancel}
              disabled={pending}
            >
              <BanIcon /> Batalkan
            </Button>
          ) : null}
          {manage ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={onDelete}
              disabled={pending}
            >
              <Trash2Icon /> Hapus
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

/** Adds classes to an event that has not closed; classes cannot be removed again. */
function AddCohortsDialog({
  event,
  courseId,
  onClose,
  onAdded,
}: {
  event: EventSummary;
  courseId: string;
  onClose: () => void;
  onAdded: () => Promise<void>;
}) {
  const targets = api.assessmentEvent.listTargetCohorts.useQuery({ courseId });
  const addCohorts = api.assessmentEvent.addCohorts.useMutation();
  const [picked, setPicked] = useState<string[]>([]);
  const [notify, setNotify] = useState(true);
  const existing = new Set(event.targets.map((target) => target.id));
  const available =
    targets.data?.cohorts.filter(
      (cohort) => !existing.has(cohort.id) && cohort.canTarget,
    ) ?? [];

  async function submit() {
    try {
      const result = await addCohorts.mutateAsync({
        eventId: event.id,
        cohortIds: picked,
        notify,
      });
      toast.success(
        event.status === "OPEN"
          ? `${result.added} kelas ditambahkan, ${result.participantCount} learner bisa mulai.`
          : `${result.added} kelas ditambahkan.`,
      );
      onClose();
      await onAdded();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah kelas</DialogTitle>
          <DialogDescription>
            Kelas yang sudah ditambahkan tidak bisa dikeluarkan lagi.
          </DialogDescription>
        </DialogHeader>
        {targets.isPending ? (
          <Skeleton className="h-24 w-full" />
        ) : available.length ? (
          <ul className="max-h-72 divide-y overflow-y-auto rounded-lg border">
            {available.map((cohort) => (
              <li key={cohort.id}>
                <label className="hover:bg-muted/50 flex cursor-pointer items-center gap-3 px-3 py-2.5">
                  <Checkbox
                    checked={picked.includes(cohort.id)}
                    onCheckedChange={(checked) =>
                      setPicked((current) =>
                        checked
                          ? [...current, cohort.id]
                          : current.filter((id) => id !== cohort.id),
                      )
                    }
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {cohort.name}
                    </span>
                    <span className="text-muted-foreground block text-xs">
                      {cohort.learnerCount} learner
                      {cohort.averageProgress !== null
                        ? ` · progres rata-rata ${cohort.averageProgress}%`
                        : ""}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">
            Semua kelas yang bisa kamu pilih sudah ikut.
          </p>
        )}
        {event.status === "OPEN" ? (
          <label className="flex items-center gap-2">
            <Checkbox checked={notify} onCheckedChange={setNotify} />
            <span>Beri tahu learner kelas baru</span>
          </label>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button
            disabled={!picked.length || addCohorts.isPending}
            onClick={() => void submit()}
          >
            {addCohorts.isPending ? (
              <LoaderCircleIcon className="animate-spin" />
            ) : null}
            Tambah {picked.length || ""} kelas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EventResults({
  event,
  page,
  onPage,
  search,
  onSearch,
  status,
  onStatus,
  cohortFilter,
  onCohortFilter,
  pending,
  onInvalidate,
  onAdjust,
}: {
  event: RouterOutputs["assessmentEvent"]["getManageable"];
  page: number;
  onPage: (page: number) => void;
  search: string;
  onSearch: (value: string) => void;
  status?: "IN_PROGRESS" | "IN_REVIEW" | "GRADED" | "NOT_STARTED";
  onStatus: (
    value: "IN_PROGRESS" | "IN_REVIEW" | "GRADED" | "NOT_STARTED" | undefined,
  ) => void;
  cohortFilter?: string;
  onCohortFilter: (value: string | undefined) => void;
  pending: boolean;
  onInvalidate: (eventId: string, attemptId: string) => Promise<void>;
  onAdjust: (
    eventId: string,
    attemptId: string,
    score: number,
    maxScore: number,
  ) => Promise<void>;
}) {
  const [reviewId, setReviewId] = useState<string>();
  // Reviewers who do not manage the event only see their own classes.
  const filterableCohorts = event.targets.filter(
    (target) =>
      event.reviewCohortIds === null ||
      event.reviewCohortIds.includes(target.id),
  );
  const ranks = useMemo(
    () => new Map(event.leaderboard.map((entry) => [entry.userId, entry.rank])),
    [event.leaderboard],
  );
  if (reviewId)
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => setReviewId(undefined)}>
          Kembali ke peserta
        </Button>
        <AssessmentReviewDetail
          attemptId={reviewId}
          onDone={() => setReviewId(undefined)}
        />
      </div>
    );
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">Belum mulai: {event.counts.notStarted}</Badge>
        <Badge variant="outline">Mengerjakan: {event.counts.inProgress}</Badge>
        <Badge variant="outline">Perlu review: {event.counts.inReview}</Badge>
        <Badge variant="outline">Selesai: {event.counts.graded}</Badge>
      </div>
      <div className="flex flex-wrap gap-3">
        <Input
          aria-label="Cari peserta"
          placeholder="Nama atau email siswa"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
        <Select
          value={status ?? "ALL"}
          onValueChange={(value) => {
            if (!value) return;
            onStatus(
              value === "ALL"
                ? undefined
                : (value as Exclude<typeof status, undefined>),
            );
          }}
        >
          <SelectTrigger aria-label="Status peserta">
            <span className="flex flex-1 text-left">
              {participantStatusLabels[status ?? "ALL"]}
            </span>
          </SelectTrigger>
          <SelectContent align="end">
            {(
              Object.keys(participantStatusLabels) as Array<
                keyof typeof participantStatusLabels
              >
            ).map((value) => (
              <SelectItem key={value} value={value}>
                {participantStatusLabels[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filterableCohorts.length > 1 ? (
          <Select
            value={cohortFilter ?? "ALL"}
            onValueChange={(value) => {
              if (!value) return;
              onCohortFilter(value === "ALL" ? undefined : value);
            }}
          >
            <SelectTrigger aria-label="Kelas">
              <span className="flex flex-1 truncate text-left">
                {filterableCohorts.find((target) => target.id === cohortFilter)
                  ?.name ??
                  (event.reviewCohortIds === null ? "Semua kelas" : "Kelasku")}
              </span>
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="ALL">
                {event.reviewCohortIds === null ? "Semua kelas" : "Kelasku"}
              </SelectItem>
              {filterableCohorts.map((target) => (
                <SelectItem key={target.id} value={target.id}>
                  {target.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>
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
              <TableHead className="w-10 sm:w-16">Rank</TableHead>
              <TableHead>Peserta</TableHead>
              <TableHead className="max-sm:hidden">Status</TableHead>
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
                      {participant.cohort && event.targets.length > 1
                        ? ` · ${participant.cohort.name}`
                        : ""}
                    </p>
                    <Badge
                      variant={invalidated ? "destructive" : "outline"}
                      className="mt-1 sm:hidden"
                    >
                      {resultStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-sm:hidden">
                    <Badge variant={invalidated ? "destructive" : "outline"}>
                      {resultStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {attempt?.status === "GRADED" &&
                    !invalidated &&
                    attempt.score !== null &&
                    attempt.maxScore
                      ? `${attempt.score}/${attempt.maxScore}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {attempt ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setReviewId(attempt.id)}
                      >
                        {attempt.status === "IN_REVIEW" && !invalidated
                          ? "Review"
                          : "Detail"}
                      </Button>
                    ) : null}
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
      <div className="flex items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          {event.participantTotal} peserta · Halaman {page} /{" "}
          {Math.max(1, event.pageCount)}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
          >
            Sebelumnya
          </Button>
          <Button
            variant="outline"
            disabled={page >= event.pageCount}
            onClick={() => onPage(page + 1)}
          >
            Berikutnya
          </Button>
        </div>
      </div>
    </div>
  );
}
