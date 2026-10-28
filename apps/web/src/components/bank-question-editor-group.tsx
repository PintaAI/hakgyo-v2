"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  CheckIcon,
  GroupIcon,
  LoaderCircleIcon,
  LogOutIcon,
  PlusIcon,
} from "lucide-react";
import { toast } from "sonner";

import type { BankQuestion } from "~/components/bank-question-editor";
import {
  DynamicBlockNoteEditor,
  type BlockNoteDocument,
  type EditorAssetStorageOptions,
} from "~/components/editor";
import Link from "~/components/link";
import { bankQuestionHref } from "~/components/superadmin-bank-status";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { useDialogs } from "~/components/ui/use-dialogs";
import { useDebouncedAutosave } from "~/hooks/use-debounced-autosave";
import type { AutosaveRegistry } from "~/lib/autosave-registry";
import { bankStatusLabels } from "~/lib/bank-status";
import {
  hasBlockNoteContent,
  toBlockNoteDocument,
} from "~/lib/blocknote/document";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

/**
 * The group part of the bank question editor, laid out like the assessment editor's
 * `QuestionGroupCard`: questions that share instructions ("[1~4] 다음 그림을 보고…") and a stimulus
 * (a passage, picture or audio). A generated set soal keeps a group's questions together.
 */

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Perubahan belum tersimpan.";
}

type Json = BankQuestion["prompt"];

type GroupDraft = {
  instructions: BlockNoteDocument | null;
  stimulus: BlockNoteDocument | null;
};

export function BankQuestionGroupCard({
  question,
  autosaveRegistry,
  saveAll,
  onReload,
  theme,
  assetStorage,
}: {
  question: BankQuestion;
  autosaveRegistry: AutosaveRegistry;
  /** Saves every pending edit of the page; false when that failed. */
  saveAll: () => Promise<boolean>;
  /** Refetches the question and mounts the editors again from it. */
  onReload: () => Promise<void>;
  theme: "light" | "dark";
  assetStorage?: EditorAssetStorageOptions;
}) {
  const createGroup = api.superadmin.bank.createGroup.useMutation();
  const group = question.group;

  if (!group) {
    return (
      <section className="flex flex-col gap-3 border-y py-4 sm:flex-row sm:items-center sm:justify-between sm:rounded-xl sm:border sm:border-dashed sm:px-4">
        <div className="grid gap-0.5">
          <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
            <GroupIcon className="size-3.5" />
            Kelompok soal
          </p>
          <p className="text-muted-foreground text-xs">
            Soal ini berdiri sendiri. Buat kelompok kalau beberapa soal memakai
            petunjuk dan bahan yang sama, misalnya satu gambar, bacaan atau
            audio untuk soal 1–4.
          </p>
        </div>
        <Button
          className="shrink-0"
          disabled={createGroup.isPending}
          onClick={async () => {
            if (!(await saveAll())) return;
            try {
              await createGroup.mutateAsync({ questionId: question.id });
              await onReload();
              toast.success(
                "Kelompok dibuat. Isi petunjuk dan bahan bersamanya, lalu tambahkan soal lain.",
              );
            } catch (error) {
              toast.error(errorMessage(error));
            }
          }}
          size="sm"
          type="button"
          variant="outline"
        >
          {createGroup.isPending ? (
            <LoaderCircleIcon
              className="animate-spin"
              data-icon="inline-start"
            />
          ) : (
            <GroupIcon data-icon="inline-start" />
          )}
          Buat kelompok dari soal ini
        </Button>
      </section>
    );
  }

  return (
    <BankGroupFields
      assetStorage={assetStorage}
      autosaveRegistry={autosaveRegistry}
      group={group}
      onReload={onReload}
      questionId={question.id}
      saveAll={saveAll}
      theme={theme}
    />
  );
}

function BankGroupFields({
  group,
  questionId,
  autosaveRegistry,
  saveAll,
  onReload,
  theme,
  assetStorage,
}: {
  group: NonNullable<BankQuestion["group"]>;
  questionId: string;
  autosaveRegistry: AutosaveRegistry;
  saveAll: () => Promise<boolean>;
  onReload: () => Promise<void>;
  theme: "light" | "dark";
  assetStorage?: EditorAssetStorageOptions;
}) {
  const router = useRouter();
  const utils = api.useUtils();
  const updateGroup = api.superadmin.bank.updateGroup.useMutation();
  const leaveGroup = api.superadmin.bank.leaveGroup.useMutation();
  const createQuestion = api.superadmin.bank.createQuestion.useMutation();
  const { confirm, dialogs } = useDialogs();
  const questions = [...group.questions].sort(
    (left, right) => left.position - right.position,
  );
  const hasLive = questions.some(({ status }) => status === "LIVE");
  // The editors keep their own content after mounting; this holds both fields as typed, so
  // each save sends the whole shared part.
  const draft = useRef<GroupDraft>({
    instructions: group.instructions as BlockNoteDocument | null,
    stimulus: group.stimulus as BlockNoteDocument | null,
  });

  const {
    cancel: cancelGroupSave,
    flush: flushGroupSave,
    schedule: scheduleGroupSave,
    status: groupSaveStatus,
  } = useDebouncedAutosave<GroupDraft>(async (value) => {
    const changes = {
      instructions:
        value.instructions && hasBlockNoteContent(value.instructions)
          ? value.instructions
          : null,
      stimulus:
        value.stimulus && hasBlockNoteContent(value.stimulus)
          ? value.stimulus
          : null,
    };
    try {
      await updateGroup.mutateAsync({ id: group.id, ...changes });
      utils.superadmin.bank.question.setData({ id: questionId }, (current) =>
        current?.group
          ? {
              ...current,
              group: {
                ...current.group,
                instructions: changes.instructions as unknown as Json,
                stimulus: changes.stimulus as unknown as Json,
              },
            }
          : current,
      );
      if (hasLive) {
        // LIVE questions of the group went back to review.
        await utils.superadmin.bank.question.invalidate({ id: questionId });
        void utils.superadmin.bank.overview.invalidate();
        void utils.superadmin.bank.questions.invalidate();
      }
    } catch (error) {
      toast.error(errorMessage(error));
      throw error;
    }
  });

  useEffect(
    () => autosaveRegistry.register(`group:${group.id}`, flushGroupSave),
    [autosaveRegistry, flushGroupSave, group.id],
  );

  useEffect(() => {
    autosaveRegistry.setStatus(`group:${group.id}`, groupSaveStatus);
  }, [autosaveRegistry, group.id, groupSaveStatus]);

  function change(field: keyof GroupDraft, value: BlockNoteDocument) {
    draft.current = { ...draft.current, [field]: value };
    scheduleGroupSave(draft.current);
  }

  async function addQuestion() {
    if (!(await saveAll())) return;
    try {
      const created = await createQuestion.mutateAsync({ groupId: group.id });
      void utils.superadmin.bank.overview.invalidate();
      void utils.superadmin.bank.questions.invalidate();
      router.push(bankQuestionHref(created.id));
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function leave() {
    const confirmed = await confirm({
      title: "Keluarkan soal ini dari kelompok?",
      description:
        questions.length > 1
          ? "Soal ini tidak lagi memakai petunjuk dan bahan bersama kelompok. Soal lain di kelompok tetap."
          : "Soal ini satu-satunya di kelompok, jadi petunjuk dan bahan bersamanya ikut dihapus.",
      confirmLabel: "Keluarkan",
      destructive: true,
    });
    if (!confirmed) return;
    if (!(await saveAll())) return;
    cancelGroupSave();
    try {
      await leaveGroup.mutateAsync({ questionId });
      await onReload();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <section
      aria-label="Kelompok soal"
      className="bg-muted/20 border-primary/30 grid gap-3 border-y border-dashed px-4 py-4 max-sm:-mx-4 sm:rounded-xl sm:border sm:p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-primary flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
          <GroupIcon className="size-3.5" />
          Kelompok · {questions.length} soal
        </p>
        <span
          className="text-muted-foreground ml-auto flex items-center gap-1 text-xs"
          role="status"
        >
          {groupSaveStatus === "pending" || groupSaveStatus === "saving" ? (
            "Menyimpan…"
          ) : groupSaveStatus === "error" ? (
            <span className="text-destructive">Gagal menyimpan</span>
          ) : (
            <>
              <CheckIcon className="size-3" /> Tersimpan
            </>
          )}
        </span>
      </div>
      {hasLive ? (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Mengubah petunjuk atau bahan bersama mengembalikan soal kelompok yang
          siap dipakai ke Perlu review.
        </p>
      ) : null}
      <div className="grid gap-1.5">
        <Label className="text-muted-foreground text-[11px] tracking-wide uppercase">
          Petunjuk kelompok
        </Label>
        <div className="bg-background overflow-hidden rounded-lg border">
          <DynamicBlockNoteEditor
            initialContent={toBlockNoteDocument(group.instructions)}
            key={`group-instructions:${group.id}`}
            onChange={(value) => change("instructions", value)}
            placeholder="Contoh: [1~4] 다음 그림을 보고 맞는 단어를 고르십시오."
            trailingBlock={false}
            theme={theme}
            assetStorage={assetStorage}
          />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label className="text-muted-foreground text-[11px] tracking-wide uppercase">
          Bahan bersama
        </Label>
        <div className="bg-background overflow-hidden rounded-lg border">
          <DynamicBlockNoteEditor
            initialContent={toBlockNoteDocument(group.stimulus)}
            key={`group-stimulus:${group.id}`}
            onChange={(value) => change("stimulus", value)}
            placeholder="Bacaan, gambar atau audio yang dipakai semua soal kelompok ini. Ketik / untuk menambah gambar atau audio."
            trailingBlock={false}
            theme={theme}
            assetStorage={assetStorage}
          />
        </div>
        <p className="text-muted-foreground text-xs">
          Tampil di atas setiap soal kelompok ini. Audio di sini diputar bersama
          soal pertama kelompok, jadi hanya dihitung sekali.
        </p>
      </div>
      <div className="grid gap-1.5">
        <Label className="text-muted-foreground text-[11px] tracking-wide uppercase">
          Soal di kelompok ini
        </Label>
        <ol className="bg-background divide-y rounded-lg border text-sm">
          {questions.map((entry, index) => {
            const current = entry.id === questionId;
            return (
              <li key={entry.id}>
                <Link
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "hover:bg-muted/40 flex items-center gap-2 px-3 py-2 transition-colors",
                    current && "bg-primary/[0.06]",
                  )}
                  href={bankQuestionHref(entry.id)}
                  onClick={() =>
                    void autosaveRegistry.flushAll().catch(() => undefined)
                  }
                >
                  <span className="bg-muted text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium">
                    {index + 1}
                  </span>
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate",
                      entry.preview ? "" : "text-muted-foreground",
                    )}
                  >
                    {entry.preview || "(soal tanpa teks)"}
                  </span>
                  {current ? (
                    <span className="text-muted-foreground shrink-0 text-xs">
                      soal ini
                    </span>
                  ) : null}
                  <Badge className="shrink-0" variant="outline">
                    {bankStatusLabels[entry.status]}
                  </Badge>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={createQuestion.isPending}
          onClick={() => void addQuestion()}
          size="sm"
          type="button"
          variant="outline"
        >
          {createQuestion.isPending ? (
            <LoaderCircleIcon
              className="animate-spin"
              data-icon="inline-start"
            />
          ) : (
            <PlusIcon data-icon="inline-start" />
          )}
          Tambah soal ke kelompok
        </Button>
        <Button
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled={leaveGroup.isPending}
          onClick={() => void leave()}
          size="sm"
          type="button"
          variant="ghost"
        >
          <LogOutIcon data-icon="inline-start" />
          Keluarkan dari kelompok
        </Button>
      </div>
      {dialogs}
    </section>
  );
}
