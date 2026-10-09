"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  BookOpenCheckIcon,
  LoaderCircleIcon,
  TrophyIcon,
  UsersIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { DateTimePicker } from "~/components/ui/datetime-picker";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { Skeleton } from "~/components/ui/skeleton";
import {
  ResourcePicker,
  type ResourcePickerOption,
} from "~/components/resource-picker";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

type EventType = "QUICK_ASSESSMENT" | "TRYOUT";
type StartMode = "now" | "schedule" | "draft";

const HOUR = 60 * 60_000;
const DAY = 24 * HOUR;

export const eventTypeLabel: Record<EventType, string> = {
  QUICK_ASSESSMENT: "Latihan",
  TRYOUT: "Tryout",
};

const typeOptions: Array<{
  value: EventType;
  icon: typeof TrophyIcon;
  description: string;
}> = [
  {
    value: "QUICK_ASSESSMENT",
    icon: BookOpenCheckIcon,
    description: "Learner melihat pembahasan jawaban setelah ditutup.",
  },
  {
    value: "TRYOUT",
    icon: TrophyIcon,
    description: "Skor dan peringkat saja, tanpa pembahasan jawaban.",
  },
];

const durationPresets = [30, 60, 90, 120];
const closePresets = [
  { label: "+1 hari", offset: DAY },
  { label: "+3 hari", offset: 3 * DAY },
  { label: "+1 minggu", offset: 7 * DAY },
];

export function toLocalDateTimeInput(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

/** The next full hour, at least 30 minutes away. */
function nextHour() {
  const date = new Date(Date.now() + 30 * 60_000);
  date.setMinutes(0, 0, 0);
  return new Date(date.getTime() + HOUR);
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Event belum berhasil disimpan.";
}

function Section({
  step,
  title,
  children,
}: {
  step: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 border-b px-4 py-5 last:border-b-0">
      <h3 className="flex items-center gap-2 text-sm font-medium">
        <span className="bg-muted text-muted-foreground flex size-5 items-center justify-center rounded-full text-xs tabular-nums">
          {step}
        </span>
        {title}
      </h3>
      {children}
    </section>
  );
}

function ChoiceRow({
  selected,
  disabled,
  onSelect,
  children,
}: {
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors",
        selected
          ? "border-primary bg-primary/5 ring-primary/20 ring-2"
          : "hover:bg-muted/50",
        disabled && "cursor-not-allowed opacity-60 hover:bg-transparent",
      )}
    >
      {children}
    </button>
  );
}

/**
 * Creates a Latihan or Tryout for one or more classes. Opened from a class, the class is fixed;
 * opened from the course, the author picks every class, several or one.
 */
export function CreateAssessmentEventSheet({
  courseId,
  cohortId,
  open,
  onOpenChange,
  onCreated,
}: {
  courseId: string;
  /** Opened from a class: the event targets this class. */
  cohortId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void | Promise<void>;
}) {
  const [type, setType] = useState<EventType>(
    cohortId ? "QUICK_ASSESSMENT" : "TRYOUT",
  );
  const [courseItemId, setCourseItemId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [allCohorts, setAllCohorts] = useState(!cohortId);
  const [pickedCohortIds, setPickedCohortIds] = useState<string[]>(
    cohortId ? [cohortId] : [],
  );
  const [startMode, setStartMode] = useState<StartMode>("now");
  const [opensAt, setOpensAt] = useState(() =>
    toLocalDateTimeInput(nextHour()),
  );
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [closesAt, setClosesAt] = useState(() =>
    toLocalDateTimeInput(new Date(Date.now() + DAY)),
  );
  const [notify, setNotify] = useState(true);

  const assessmentItems = api.assessmentEvent.listAssessmentItems.useQuery(
    { courseId, cohortId },
    { enabled: open },
  );
  const targets = api.assessmentEvent.listTargetCohorts.useQuery(
    { courseId },
    { enabled: open },
  );
  const create = api.assessmentEvent.create.useMutation();

  const assessmentOptions = useMemo<ResourcePickerOption[]>(
    () =>
      assessmentItems.data?.map((item) => ({
        id: item.id,
        title: item.assessment?.title ?? "Tugas",
        description: item.assessment?.description,
        count: item.assessment?._count.questions,
        timeLimitMinutes: item.assessment?.timeLimitMinutes,
        updatedAt: item.assessment?.updatedAt,
        group: item.module.title,
      })) ?? [],
    [assessmentItems.data],
  );
  const selectedItem = assessmentItems.data?.find(
    (item) => item.id === courseItemId,
  );
  const cohorts = useMemo(() => targets.data?.cohorts ?? [], [targets.data]);
  const canTargetAll = Boolean(targets.data?.canTargetAll) && !cohortId;
  const targetAll = allCohorts && canTargetAll;
  const chosen = targetAll
    ? cohorts
    : cohorts.filter((cohort) => pickedCohortIds.includes(cohort.id));
  const learnerCount = chosen.reduce(
    (total, cohort) => total + cohort.learnerCount,
    0,
  );
  const fixedCohort = cohortId
    ? cohorts.find((cohort) => cohort.id === cohortId)
    : undefined;

  const openDate = startMode === "schedule" ? new Date(opensAt) : new Date();
  const closeDate = new Date(closesAt);
  const timeError =
    Number.isNaN(closeDate.getTime()) || closeDate <= openDate
      ? startMode === "schedule"
        ? "Waktu tutup harus setelah waktu buka."
        : "Waktu tutup harus di masa depan."
      : startMode === "schedule" && openDate <= new Date()
        ? "Waktu buka harus di masa depan."
        : null;
  const duration = Number(durationMinutes);
  const ready =
    Boolean(courseItemId) &&
    (targetAll || pickedCohortIds.length > 0) &&
    Number.isInteger(duration) &&
    duration >= 1 &&
    duration <= 480 &&
    !timeError;

  function reset() {
    setCourseItemId(null);
    setTitle("");
    setStartMode("now");
    setPickedCohortIds(cohortId ? [cohortId] : []);
    setAllCohorts(!cohortId);
  }

  function toggleCohort(id: string, checked: boolean) {
    setPickedCohortIds((current) =>
      checked
        ? [...new Set([...current, id])]
        : current.filter((value) => value !== id),
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!ready || !courseItemId) return;
    const eventTitle =
      title.trim() ||
      `${eventTypeLabel[type]} ${selectedItem?.assessment?.title ?? ""}`.trim();
    try {
      const created = await create.mutateAsync({
        courseId,
        courseItemId,
        type,
        target: {
          allCohorts: targetAll,
          cohortIds: targetAll ? [] : pickedCohortIds,
        },
        title: eventTitle,
        durationMinutes: duration,
        closesAt: closeDate,
        start:
          startMode === "now"
            ? { mode: "now", notify }
            : startMode === "schedule"
              ? { mode: "schedule", opensAt: openDate, notify }
              : { mode: "draft" },
      });
      toast.success(
        startMode === "now"
          ? `${eventTypeLabel[type]} dibuka untuk ${created.participantCount ?? 0} learner.`
          : startMode === "schedule"
            ? `${eventTypeLabel[type]} dijadwalkan.`
            : "Draft disimpan.",
      );
      reset();
      onOpenChange(false);
      await onCreated();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  const submitLabel =
    startMode === "now"
      ? "Buka sekarang"
      : startMode === "schedule"
        ? "Jadwalkan"
        : "Simpan draft";
  const summary = !courseItemId
    ? "Pilih tugas untuk melanjutkan."
    : targets.isPending
      ? "Menghitung peserta…"
      : `${eventTypeLabel[type]} untuk ${learnerCount} learner di ${
          targetAll ? "semua kelas" : `${chosen.length} kelas`
        }${
          startMode === "schedule" && !Number.isNaN(openDate.getTime())
            ? `, dibuka ${openDate.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}`
            : ""
        }.`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl"
      >
        <form onSubmit={submit} className="flex h-full min-h-0 flex-col">
          <SheetHeader className="border-b">
            <SheetTitle>Buat latihan atau tryout</SheetTitle>
            <SheetDescription>
              {fixedCohort
                ? `Untuk kelas ${fixedCohort.name}.`
                : "Untuk satu, beberapa, atau semua kelas di course ini."}
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <Section step={1} title="Jenis">
              <div role="radiogroup" className="grid gap-2 sm:grid-cols-2">
                {typeOptions.map((option) => (
                  <ChoiceRow
                    key={option.value}
                    selected={type === option.value}
                    onSelect={() => setType(option.value)}
                  >
                    <option.icon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                    <span>
                      <span className="block font-medium">
                        {eventTypeLabel[option.value]}
                      </span>
                      <span className="text-muted-foreground block text-xs">
                        {option.description}
                      </span>
                    </span>
                  </ChoiceRow>
                ))}
              </div>
            </Section>

            <Section step={2} title="Tugas">
              <ResourcePicker
                kind="ASSESSMENT"
                id="event-assessment"
                options={assessmentOptions}
                value={courseItemId}
                onValueChange={setCourseItemId}
                loading={assessmentItems.isPending}
                emptyLabel="Belum ada tugas yang siap di kurikulum ini"
                description="Hanya tugas yang tampil di kurikulum dan sudah memiliki soal."
                defaultSortLabel="Urutan kurikulum"
              />
              <div className="space-y-2">
                <Label htmlFor="event-title">
                  Judul{" "}
                  <span className="text-muted-foreground font-normal">
                    (opsional)
                  </span>
                </Label>
                <Input
                  id="event-title"
                  value={title}
                  maxLength={200}
                  placeholder={
                    selectedItem?.assessment
                      ? `${eventTypeLabel[type]} ${selectedItem.assessment.title}`
                      : type === "TRYOUT"
                        ? "Pemantapan akhir kurikulum"
                        : "Latihan pekan 1"
                  }
                  onChange={(event) => setTitle(event.target.value)}
                />
              </div>
            </Section>

            <Section step={3} title="Peserta">
              {targets.isPending ? (
                <Skeleton className="h-24 w-full" />
              ) : targets.error ? (
                <p className="text-destructive text-sm">
                  {targets.error.message}
                </p>
              ) : cohortId ? (
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <UsersIcon className="text-muted-foreground size-4" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {fixedCohort?.name ?? "Kelas ini"}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {fixedCohort?.learnerCount ?? 0} learner aktif
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div role="radiogroup" className="grid gap-2 sm:grid-cols-2">
                    <ChoiceRow
                      selected={targetAll}
                      disabled={!canTargetAll}
                      onSelect={() => setAllCohorts(true)}
                    >
                      <span>
                        <span className="block font-medium">Semua kelas</span>
                        <span className="text-muted-foreground block text-xs">
                          {canTargetAll
                            ? `${cohorts.length} kelas yang aktif saat dibuka`
                            : "Khusus pengelola course"}
                        </span>
                      </span>
                    </ChoiceRow>
                    <ChoiceRow
                      selected={!targetAll}
                      onSelect={() => setAllCohorts(false)}
                    >
                      <span>
                        <span className="block font-medium">Pilih kelas</span>
                        <span className="text-muted-foreground block text-xs">
                          Satu atau beberapa kelas
                        </span>
                      </span>
                    </ChoiceRow>
                  </div>
                  {targetAll ? null : cohorts.length ? (
                    <ul className="divide-y rounded-lg border">
                      {cohorts.map((cohort) => {
                        const checked = pickedCohortIds.includes(cohort.id);
                        return (
                          <li key={cohort.id}>
                            <label
                              className={cn(
                                "flex items-center gap-3 px-3 py-2.5",
                                cohort.canTarget
                                  ? "hover:bg-muted/50 cursor-pointer"
                                  : "cursor-not-allowed opacity-60",
                              )}
                            >
                              <Checkbox
                                checked={checked}
                                disabled={!cohort.canTarget}
                                onCheckedChange={(value) =>
                                  toggleCohort(cohort.id, value)
                                }
                              />
                              <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-2">
                                  <span className="truncate font-medium">
                                    {cohort.name}
                                  </span>
                                  {cohort.status === "COMPLETED" ? (
                                    <Badge variant="outline">Selesai</Badge>
                                  ) : null}
                                </span>
                                <span className="text-muted-foreground block text-xs">
                                  {cohort.learnerCount} learner
                                  {cohort.averageProgress !== null
                                    ? ` · progres rata-rata ${cohort.averageProgress}%`
                                    : ""}
                                  {cohort.canTarget ? "" : " · bukan kelasmu"}
                                </span>
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      Belum ada kelas aktif di course ini.
                    </p>
                  )}
                </div>
              )}
            </Section>

            <Section step={4} title="Waktu">
              <div role="radiogroup" className="grid grid-cols-3 gap-2">
                {(
                  [
                    ["now", "Buka sekarang"],
                    ["schedule", "Jadwalkan"],
                    ["draft", "Draft"],
                  ] as const
                ).map(([value, label]) => (
                  <Button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={startMode === value}
                    variant={startMode === value ? "default" : "outline"}
                    onClick={() => setStartMode(value)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              {startMode === "schedule" ? (
                <div className="space-y-2">
                  <Label htmlFor="event-opens">Dibuka pada</Label>
                  <DateTimePicker
                    id="event-opens"
                    min={toLocalDateTimeInput(new Date())}
                    required
                    value={opensAt}
                    onChange={setOpensAt}
                  />
                  <p className="text-muted-foreground text-xs">
                    Dibuka otomatis; learner sudah melihat jadwalnya.
                  </p>
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="event-duration">
                  Durasi pengerjaan (menit)
                </Label>
                <div className="flex flex-wrap gap-2">
                  <Input
                    id="event-duration"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={480}
                    required
                    className="w-24"
                    value={durationMinutes}
                    onChange={(event) => setDurationMinutes(event.target.value)}
                  />
                  {durationPresets.map((minutes) => (
                    <Button
                      key={minutes}
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-9"
                      onClick={() => setDurationMinutes(String(minutes))}
                    >
                      {minutes}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-closes">Ditutup pada</Label>
                <DateTimePicker
                  id="event-closes"
                  min={toLocalDateTimeInput(new Date())}
                  required
                  value={closesAt}
                  onChange={setClosesAt}
                />
                <div className="flex flex-wrap gap-2">
                  {closePresets.map((preset) => (
                    <Button
                      key={preset.label}
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const base =
                          startMode === "schedule" &&
                          !Number.isNaN(openDate.getTime())
                            ? openDate
                            : new Date();
                        setClosesAt(
                          toLocalDateTimeInput(
                            new Date(base.getTime() + preset.offset),
                          ),
                        );
                      }}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
                {timeError ? (
                  <p className="text-destructive text-xs">{timeError}</p>
                ) : null}
              </div>
              {startMode !== "draft" ? (
                <label className="flex items-center gap-2">
                  <Checkbox checked={notify} onCheckedChange={setNotify} />
                  <span>
                    Beri tahu learner{" "}
                    {startMode === "schedule" ? "saat dibuka" : ""}
                  </span>
                </label>
              ) : null}
            </Section>
          </div>
          <SheetFooter className="bg-popover sticky bottom-0 border-t">
            <p className="text-muted-foreground text-xs" aria-live="polite">
              {summary}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 sm:flex-none"
                onClick={() => onOpenChange(false)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={!ready || create.isPending}
              >
                {create.isPending ? (
                  <LoaderCircleIcon className="animate-spin" />
                ) : null}
                {submitLabel}
              </Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
