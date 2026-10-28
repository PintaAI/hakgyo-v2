"use client";

import { useState } from "react";
import { epsTypeByTag } from "@hakgyo/shared/eps-taxonomy";
import { ImageIcon, LoaderCircleIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import {
  bankMediaState,
  contentHasImage,
  type BankMetaView,
} from "~/lib/bank-status";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

/**
 * Picture and audio actions of one bank question, shared by the bank list rows and the bank
 * question editor. Both pass the same shape: list rows come with it from the server, the editor
 * builds it from the question with `bankMediaOf`.
 */
export type BankMediaQuestion = {
  id: string;
  mediaBrief: string | null;
  hasScript: boolean;
  /** Illustrated types can have their pictures drawn by AI. */
  illustrated: boolean;
  media: { promptHasImage: boolean; hasAudio: boolean };
  optionsAreImages: boolean;
  optionImages: boolean[];
  audioJob: {
    status: string;
    provider?: string | null;
    error?: string | null;
  } | null;
};

/** The media shape of a full bank question (the editor's `question` query). */
export function bankMediaOf(question: {
  id: string;
  tags: readonly string[];
  prompt: unknown;
  meta: unknown;
  options: ReadonlyArray<{ content: unknown }>;
  audioJob: BankMediaQuestion["audioJob"];
}): BankMediaQuestion {
  const meta = (question.meta ?? {}) as BankMetaView;
  const type = question.tags.map(epsTypeByTag).find(Boolean);
  return {
    id: question.id,
    mediaBrief: meta.mediaBrief ?? null,
    hasScript: Boolean(meta.script?.length),
    illustrated: type?.lane === "illustrated",
    media: bankMediaState({
      type,
      prompt: question.prompt,
      options: question.options,
    }),
    optionsAreImages: type?.optionsAreImages ?? false,
    optionImages: question.options.map((option) =>
      contentHasImage(option.content),
    ),
    audioJob: question.audioJob,
  };
}

/** Draws a question's missing pictures one at a time (each call is one image). */
export function BankImageActions({
  question,
  onBeforeRun,
  onDone,
  className,
}: {
  question: BankMediaQuestion;
  /** Runs before drawing, for example to save the editor first. */
  onBeforeRun?: () => Promise<void>;
  onDone: () => Promise<void>;
  className?: string;
}) {
  const generate = api.superadmin.bank.generateImage.useMutation();
  const [working, setWorking] = useState(false);
  const missingOptions = question.optionsAreImages
    ? question.optionImages.flatMap((hasImage, index) =>
        hasImage ? [] : [index],
      )
    : [];
  const needsPrompt =
    Boolean(question.mediaBrief) && !question.media.promptHasImage;
  if (!question.illustrated || (!needsPrompt && !missingOptions.length)) {
    return null;
  }

  async function draw(targets: Array<number | undefined>) {
    setWorking(true);
    try {
      await onBeforeRun?.();
      for (const optionIndex of targets) {
        await generate.mutateAsync({ questionId: question.id, optionIndex });
      }
      toast.success(
        "Gambar dibuat. Periksa gambarnya sebelum menyetujui soal.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gambar gagal dibuat.",
      );
    } finally {
      setWorking(false);
      await onDone();
    }
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {needsPrompt ? (
        <Button
          disabled={working}
          onClick={() => void draw([undefined])}
          size="xs"
          type="button"
          variant="outline"
        >
          {working ? (
            <LoaderCircleIcon
              className="animate-spin"
              data-icon="inline-start"
            />
          ) : (
            <ImageIcon data-icon="inline-start" />
          )}
          Gambar soal (AI)
        </Button>
      ) : null}
      {missingOptions.length ? (
        <Button
          disabled={working}
          onClick={() => void draw(missingOptions)}
          size="xs"
          type="button"
          variant="outline"
        >
          {working ? (
            <LoaderCircleIcon
              className="animate-spin"
              data-icon="inline-start"
            />
          ) : (
            <ImageIcon data-icon="inline-start" />
          )}
          Gambar {missingOptions.length} pilihan (AI)
        </Button>
      ) : null}
    </div>
  );
}

const audioJobLabels: Record<string, string> = {
  PENDING: "Audio menunggu PC",
  RUNNING: "Audio sedang dibuat",
  DONE: "Audio sudah dibuat",
  FAILED: "Audio gagal",
};

/**
 * Audio for a listening question: queue it for the PC (VoxCPM2), or make it with OpenAI now. Jobs
 * that wait more than two hours go to OpenAI by themselves.
 */
export function BankAudioActions({
  question,
  onBeforeRun,
  onDone,
  className,
}: {
  question: BankMediaQuestion;
  onBeforeRun?: () => Promise<void>;
  onDone: () => Promise<void>;
  className?: string;
}) {
  const request = api.superadmin.bank.requestAudio.useMutation();
  const now = api.superadmin.bank.generateAudioNow.useMutation();
  if (!question.hasScript) return null;
  const job = question.audioJob;
  const waiting = job?.status === "PENDING" || job?.status === "RUNNING";
  const done = question.media.hasAudio;
  const busy = request.isPending || now.isPending;

  async function run(action: "queue" | "now") {
    try {
      await onBeforeRun?.();
      if (action === "queue") {
        await request.mutateAsync({ questionId: question.id });
        toast.success("Audio masuk antrean PC.");
      } else {
        await now.mutateAsync({ questionId: question.id });
        toast.success(
          "Audio dibuat dengan suara AI cloud. Dengarkan sebelum menyetujui soal.",
        );
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Audio gagal dibuat.",
      );
    } finally {
      await onDone();
    }
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2 text-xs", className)}>
      {job ? (
        <span
          className={
            job.status === "FAILED"
              ? "text-destructive"
              : "text-muted-foreground"
          }
        >
          {audioJobLabels[job.status] ?? job.status}
          {job.provider
            ? ` (${job.provider === "VOXCPM" ? "PC" : "cloud"})`
            : ""}
          {job.status === "FAILED" && job.error ? `: ${job.error}` : ""}
        </span>
      ) : null}
      {!done && !waiting ? (
        <Button
          disabled={busy}
          onClick={() => void run("queue")}
          size="xs"
          type="button"
          variant="outline"
        >
          Buat audio (PC)
        </Button>
      ) : null}
      {!done && job?.status !== "RUNNING" ? (
        <Button
          disabled={busy}
          onClick={() => void run("now")}
          size="xs"
          type="button"
          variant="ghost"
        >
          {now.isPending ? (
            <LoaderCircleIcon
              className="animate-spin"
              data-icon="inline-start"
            />
          ) : null}
          Buat dengan cloud sekarang
        </Button>
      ) : null}
    </div>
  );
}
