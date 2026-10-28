"use client";

import { useState } from "react";
import { tagLabel } from "@hakgyo/shared";
import {
  DicesIcon,
  LoaderCircleIcon,
  SparklesIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { cn } from "~/lib/utils";
import { api, type RouterOutputs } from "~/trpc/react";

type Preview = RouterOutputs["assessmentGenerator"]["preview"];

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

/**
 * "Buat set EPS-TOPIK" for owners and admins: draws 40 numbers from the Hakgyo bank in the exam's
 * order, shows them, and saves the set as an ordinary assessment, then opens it in the editor.
 * The same seed draws the same set, so the saved one matches the preview.
 */
export function EpsSetGenerator({
  organizationId,
  organizationSlug,
}: {
  organizationId: string;
  organizationSlug: string;
}) {
  const router = useRouter();
  const utils = api.useUtils();
  const preview = api.assessmentGenerator.preview.useMutation();
  const create = api.assessmentGenerator.create.useMutation();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [result, setResult] = useState<Preview | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  async function draw() {
    setFailure(null);
    try {
      setResult(await preview.mutateAsync({ organizationId }));
    } catch (error) {
      const message = errorMessage(error, "Pratinjau gagal dibuat.");
      if (result) toast.error(message);
      else setFailure(message);
    }
  }

  async function save() {
    if (!result) return;
    try {
      const saved = await create.mutateAsync({
        organizationId,
        seed: result.seed,
        drawnAt: result.drawnAt,
        questionIds: result.slots.flatMap((slot) => slot.questionIds),
        title: title.trim() || undefined,
      });
      toast.success(`${saved.title} tersimpan di Tugas.`);
      await utils.assessment.list.invalidate({ organizationId });
      router.push(
        `/workspace/${organizationSlug}/library/assessments/${saved.assessmentId}`,
      );
    } catch (error) {
      toast.error(errorMessage(error, "Set soal gagal disimpan."));
    }
  }

  function openSheet() {
    setOpen(true);
    if (!result && !preview.isPending) void draw();
  }

  const filled = result?.slots.reduce((sum, slot) => sum + slot.count, 0) ?? 0;
  const total = filled + (result?.missing.length ?? 0);
  const busy = preview.isPending || create.isPending;

  return (
    <>
      <Button variant="outline" onClick={openSheet}>
        <SparklesIcon data-icon="inline-start" />
        Buat set EPS-TOPIK
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl"
        >
          <div className="flex h-full min-h-0 flex-col">
            <SheetHeader className="border-b pr-12">
              <SheetTitle>Buat set EPS-TOPIK</SheetTitle>
              <SheetDescription>
                40 soal sesuai format ujian asli dari bank soal Hakgyo. Soal
                yang belum pernah dipakai lembaga ini didahulukan. Hasilnya
                tugas biasa yang bisa diubah staf.
              </SheetDescription>
            </SheetHeader>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {result ? (
                <PreviewBody result={result} filled={filled} total={total} />
              ) : failure ? (
                <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-4 text-center">
                  <p className="text-destructive text-sm">{failure}</p>
                  <Button variant="outline" onClick={() => void draw()}>
                    Coba lagi
                  </Button>
                </div>
              ) : (
                <div className="text-muted-foreground flex min-h-64 items-center justify-center text-sm">
                  <LoaderCircleIcon className="mr-2 size-4 animate-spin" />
                  Memilih soal dari bank
                </div>
              )}
            </div>

            <SheetFooter className="bg-popover sticky bottom-0 border-t">
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium">Nama set (opsional)</span>
                <Input
                  maxLength={200}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Kosongkan untuk nama otomatis, misalnya Set EPS-TOPIK 1"
                  value={title}
                />
              </label>
              <div className="flex gap-2">
                <Button
                  className="flex-1 sm:flex-none"
                  disabled={busy}
                  onClick={() => void draw()}
                  variant="outline"
                >
                  {preview.isPending ? (
                    <LoaderCircleIcon
                      className="animate-spin"
                      data-icon="inline-start"
                    />
                  ) : (
                    <DicesIcon data-icon="inline-start" />
                  )}
                  Acak lagi
                </Button>
                <Button
                  className="flex-1"
                  disabled={busy || !result || result.missing.length > 0}
                  onClick={() => void save()}
                >
                  {create.isPending ? (
                    <LoaderCircleIcon
                      className="animate-spin"
                      data-icon="inline-start"
                    />
                  ) : null}
                  Simpan set
                </Button>
              </div>
            </SheetFooter>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function PreviewBody({
  result,
  filled,
  total,
}: {
  result: Preview;
  filled: number;
  total: number;
}) {
  return (
    <div className="space-y-4 py-4">
      <p className="px-4 text-sm" aria-live="polite">
        {filled} dari {total} nomor terisi, dari {result.bankSize} soal siap
        pakai di bank.
      </p>

      {result.missing.length ? (
        <div className="bg-destructive/10 text-destructive mx-4 space-y-1 rounded-lg p-3 text-sm">
          <p className="font-medium">
            Bank soal belum cukup, jadi set ini belum bisa disimpan.
          </p>
          <ul className="space-y-0.5">
            {result.missing.map((slot) => (
              <li key={slot.number}>
                No. {slot.number} ({slot.typeName}): baru ada {slot.available}{" "}
                soal di bank.
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {result.warnings.length ? (
        <div className="mx-4 space-y-1 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
          <p className="flex items-center gap-1.5 font-medium">
            <TriangleAlertIcon className="size-4" />
            Catatan susunan soal
          </p>
          <ul className="space-y-0.5">
            {result.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
          <p className="text-xs">
            Set tetap bisa disimpan. Klik Acak lagi untuk susunan lain.
          </p>
        </div>
      ) : null}

      <ol className="divide-y border-y">
        {result.slots.map((slot) => (
          <li key={slot.number} className="space-y-1.5 px-4 py-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm font-medium tabular-nums">
                No. {slot.number}
                {slot.count > 1 ? `–${slot.number + slot.count - 1}` : ""}
              </span>
              <Badge variant="secondary">{slot.typeName}</Badge>
              {slot.level ? (
                <Badge
                  variant="outline"
                  className={cn(
                    slot.level !== slot.target &&
                      "border-amber-500/30 text-amber-800 dark:text-amber-300",
                  )}
                >
                  {tagLabel(`level:${slot.level}`)}
                </Badge>
              ) : null}
              {slot.topic ? (
                <Badge variant="outline">{tagLabel(slot.topic)}</Badge>
              ) : null}
              {slot.organizationUses ? (
                <Badge variant="outline" className="text-muted-foreground">
                  Sudah dipakai {slot.organizationUses}×
                </Badge>
              ) : null}
            </div>
            <p className="text-muted-foreground line-clamp-2 text-sm">
              {slot.preview || "(soal tanpa teks, misalnya gambar atau audio)"}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
