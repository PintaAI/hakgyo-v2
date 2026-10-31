"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import {
  CalendarDaysIcon,
  CheckIcon,
  Clock3Icon,
  LoaderCircleIcon,
  PlusIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { DatePicker } from "~/components/ui/date-picker";
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
import { Textarea } from "~/components/ui/textarea";
import { getErrorMessage } from "~/lib/error-message";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

export type ClassKind = "SCHEDULED" | "SELF_PACED";

const KELAS_MANDIRI_NAME = "Kelas Mandiri";

function KindOption({
  selected,
  disabled,
  icon,
  title,
  description,
  onSelect,
}: {
  selected: boolean;
  disabled?: boolean;
  icon: ReactNode;
  title: string;
  description: string;
  onSelect: () => void;
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
      <span className="bg-muted text-foreground grid size-8 shrink-0 place-items-center rounded-md">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2 text-sm font-medium">
          {title}
          {selected ? <CheckIcon className="text-primary size-4" /> : null}
        </span>
        <span className="text-muted-foreground mt-0.5 block text-xs leading-relaxed">
          {description}
        </span>
      </span>
    </button>
  );
}

/**
 * Creates a class of a curriculum: a scheduled class (Berjadwal) or the
 * curriculum's Kelas Mandiri, which it can have only one of. Used by the
 * Kelas tab and right after a curriculum is created ("Buat kelas pertama").
 */
export function CreateClassDialog({
  courseId,
  open,
  onOpenChange,
  hasKelasMandiri,
  title = "Buat kelas",
  description = "Murid bergabung ke kurikulum lewat kelas.",
  cancelLabel = "Batal",
  onCreated,
}: {
  courseId: string;
  open: boolean;
  /** Closing without creating: Batal, or Lewati after a new curriculum. */
  onOpenChange: (open: boolean) => void;
  /** The curriculum already has its Kelas Mandiri. */
  hasKelasMandiri: boolean;
  title?: string;
  description?: string;
  cancelLabel?: string;
  onCreated: (cohort: { id: string }) => Promise<void> | void;
}) {
  const utils = api.useUtils();
  const createCohort = api.cohort.create.useMutation();
  const [kind, setKind] = useState<ClassKind>("SCHEDULED");
  const [name, setName] = useState("");
  const [classDescription, setClassDescription] = useState("");
  const [capacity, setCapacity] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const selfPaced = kind === "SELF_PACED";
  const canSubmit = selfPaced || name.trim().length > 0;

  function reset() {
    setKind("SCHEDULED");
    setName("");
    setClassDescription("");
    setCapacity("");
    setStartsAt("");
    setEndsAt("");
  }

  function chooseKind(next: ClassKind) {
    setKind(next);
    // Suggest the usual name, without overwriting one the teacher typed.
    if (next === "SELF_PACED" && !name.trim()) setName(KELAS_MANDIRI_NAME);
    if (next === "SCHEDULED" && name === KELAS_MANDIRI_NAME) setName("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    try {
      const created = await createCohort.mutateAsync({
        courseId,
        kind,
        name: name.trim() || undefined,
        description: classDescription.trim() || null,
        capacity: capacity ? Number(capacity) : null,
        ...(selfPaced
          ? {}
          : {
              startsAt: startsAt ? new Date(`${startsAt}T00:00:00`) : null,
              endsAt: endsAt ? new Date(`${endsAt}T23:59:59`) : null,
            }),
      });
      await utils.cohort.list.invalidate({ courseId });
      toast.success(
        selfPaced ? "Kelas Mandiri berhasil dibuat." : "Kelas berhasil dibuat.",
      );
      reset();
      await onCreated(created);
    } catch (cause) {
      toast.error(getErrorMessage(cause));
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (createCohort.isPending) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="mt-5 space-y-4">
            <div className="space-y-2">
              <Label id="class-kind">Jenis kelas</Label>
              <div
                role="radiogroup"
                aria-labelledby="class-kind"
                className="grid gap-2 sm:grid-cols-2"
              >
                <KindOption
                  selected={kind === "SCHEDULED"}
                  icon={<CalendarDaysIcon className="size-4" />}
                  title="Berjadwal"
                  description="Punya tanggal mulai dan selesai."
                  onSelect={() => chooseKind("SCHEDULED")}
                />
                <KindOption
                  selected={selfPaced}
                  disabled={hasKelasMandiri}
                  icon={<Clock3Icon className="size-4" />}
                  title="Mandiri"
                  description={
                    hasKelasMandiri
                      ? "Kurikulum ini sudah punya Kelas Mandiri."
                      : "Murid belajar kapan saja, tanpa jadwal. Satu per kurikulum."
                  }
                  onSelect={() => chooseKind("SELF_PACED")}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="class-name">Nama kelas</Label>
              <Input
                id="class-name"
                autoFocus
                maxLength={200}
                placeholder={
                  selfPaced
                    ? KELAS_MANDIRI_NAME
                    : "Contoh: Kelas September 2026"
                }
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="class-description">Deskripsi</Label>
              <Textarea
                id="class-description"
                maxLength={10000}
                placeholder="Fokus dan konteks kelas ini"
                value={classDescription}
                onChange={(event) => setClassDescription(event.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="class-capacity">Kapasitas</Label>
                <Input
                  id="class-capacity"
                  min={1}
                  type="number"
                  value={capacity}
                  onChange={(event) => setCapacity(event.target.value)}
                />
              </div>
              {/* A Kelas Mandiri has no dates. */}
              {selfPaced ? null : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="class-start">Mulai</Label>
                    <DatePicker
                      id="class-start"
                      value={startsAt}
                      onChange={setStartsAt}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="class-end">Selesai</Label>
                    <DatePicker
                      id="class-end"
                      min={startsAt || undefined}
                      value={endsAt}
                      onChange={setEndsAt}
                    />
                  </div>
                </>
              )}
            </div>
            {selfPaced ? (
              <p className="text-muted-foreground text-xs leading-relaxed">
                Kelas Mandiri langsung dibuka dan tidak punya tanggal mulai atau
                selesai: murid belajar kapan saja.
              </p>
            ) : null}
          </div>
          <DialogFooter className="mt-5">
            <Button
              type="button"
              variant="outline"
              disabled={createCohort.isPending}
              onClick={() => onOpenChange(false)}
            >
              {cancelLabel}
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit || createCohort.isPending}
            >
              {createCohort.isPending ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : (
                <PlusIcon />
              )}
              {selfPaced ? "Buat Kelas Mandiri" : "Buat kelas"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
