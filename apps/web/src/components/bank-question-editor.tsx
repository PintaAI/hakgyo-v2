"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  blueprintTypes,
  epsTagVocabulary,
  epsTopikBlueprint,
  tagLabel,
} from "@hakgyo/shared";
import { epsTypeByTag } from "@hakgyo/shared/eps-taxonomy";
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  CheckCircle2Icon,
  LibraryIcon,
  LoaderCircleIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { BankQuestionGroupCard } from "~/components/bank-question-editor-group";
import {
  DynamicBlockNoteEditor,
  type BlockNoteDocument,
  type EditorAssetStorageOptions,
} from "~/components/editor";
import Link from "~/components/link";
import { SaveNowButton } from "~/components/save-now-button";
import {
  BankAudioActions,
  BankImageActions,
  bankMediaOf,
} from "~/components/superadmin-bank-media";
import {
  bankMoveLabel,
  useMoveBankQuestions,
} from "~/components/superadmin-bank-status";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Badge } from "~/components/ui/badge";
import { Button, buttonVariants } from "~/components/ui/button";
import { cardSurface } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import { useDebouncedAutosave } from "~/hooks/use-debounced-autosave";
import {
  getAssessmentOptionLabel,
  MAX_ASSESSMENT_OPTIONS,
  MIN_ASSESSMENT_OPTIONS,
} from "~/lib/assessment-options";
import {
  createAutosaveRegistry,
  type AutosaveRegistry,
  type AutosaveStatus,
} from "~/lib/autosave-registry";
import {
  bankMediaState,
  bankReadinessProblem,
  bankStatusLabels,
  bankTransitions,
  type BankStatus,
  type BankMetaView,
} from "~/lib/bank-status";
import {
  hasBlockNoteContent,
  toBlockNoteDocument,
} from "~/lib/blocknote/document";
import { cn } from "~/lib/utils";
import { HAKGYO_SYSTEM_ORGANIZATION_ID } from "~/server/foundation/constants";
import { api, type RouterOutputs } from "~/trpc/react";

/**
 * The editor of one bank question (/superadmin/bank/questions/[questionId]). It mirrors the
 * question card of the assessment editor (prompt, label soal, explanation, options, autosave) and
 * adds what the bank needs: status moves, the AI notes, pictures and audio, and the question's
 * group. Media uploaded here belong to the Hakgyo system organization, so generated set soal can
 * link them instead of copying.
 */

export type BankQuestion = RouterOutputs["superadmin"]["bank"]["question"];
type BankOption = BankQuestion["options"][number];
/** Editor documents as the question query stores them (Prisma JSON). */
const asJson = (document: BlockNoteDocument) =>
  document as unknown as BankQuestion["prompt"];

/** Bank media are files of the hidden Hakgyo system organization (no attach/detach records). */
export const bankAssetStorage: EditorAssetStorageOptions = {
  organizationId: HAKGYO_SYSTEM_ORGANIZATION_ID,
};

const BANK_HREF = "/superadmin/bank";

const autosaveStatusLabels: Record<AutosaveStatus, string> = {
  idle: "Semua perubahan tersimpan",
  pending: "Menunggu untuk disimpan…",
  saving: "Menyimpan…",
  saved: "Semua perubahan tersimpan",
  error: "Perubahan belum tersimpan",
};

const statusBadgeClasses: Record<BankStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  REVIEW:
    "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200",
  LIVE: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200",
  RETIRED: "bg-muted text-muted-foreground line-through",
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Perubahan belum tersimpan.";
}

export function BankQuestionEditor({ questionId }: { questionId: string }) {
  const question = api.superadmin.bank.question.useQuery({ id: questionId });
  // Bumped after the server changes the content (pictures, audio, groups): the editors keep
  // their own content after mounting, so they mount again from the refetched question.
  const [formVersion, setFormVersion] = useState(0);

  if (question.isPending) {
    return (
      <div className="text-muted-foreground flex min-h-96 items-center justify-center text-sm">
        <LoaderCircleIcon className="mr-2 size-4 animate-spin" />
        Memuat soal
      </div>
    );
  }

  if (question.error || !question.data) {
    return (
      <div className="flex min-h-96 flex-col items-center justify-center gap-3 text-center">
        <p className="text-destructive text-sm">
          {question.error?.message ?? "Soal gagal dimuat."}
        </p>
        <div className="flex gap-2">
          <Link
            href={BANK_HREF}
            className={buttonVariants({ variant: "ghost" })}
          >
            Kembali ke bank soal
          </Link>
          <Button variant="outline" onClick={() => void question.refetch()}>
            Coba lagi
          </Button>
        </div>
      </div>
    );
  }

  return (
    <BankQuestionForm
      key={`${question.data.id}:${formVersion}`}
      onReload={async () => {
        await question.refetch();
        setFormVersion((value) => value + 1);
      }}
      question={question.data}
    />
  );
}

type QuestionDraft = {
  prompt: BlockNoteDocument;
  explanation: BlockNoteDocument;
  tags: string[];
};

function BankQuestionForm({
  question,
  onReload,
}: {
  question: BankQuestion;
  onReload: () => Promise<void>;
}) {
  const router = useRouter();
  const utils = api.useUtils();
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "dark" ? "dark" : "light";
  const [autosaveRegistry] = useState(createAutosaveRegistry);
  const autosaveStatus = useSyncExternalStore<AutosaveStatus>(
    autosaveRegistry.subscribe,
    autosaveRegistry.getStatus,
    () => "idle",
  );
  const queryInput = { id: question.id };
  const updateQuestion = api.superadmin.bank.updateQuestion.useMutation();
  const createOption = api.superadmin.bank.createOption.useMutation();
  const updateOption = api.superadmin.bank.updateOption.useMutation();
  const deleteOption = api.superadmin.bank.deleteOption.useMutation();
  const deleteQuestion = api.superadmin.bank.deleteQuestion.useMutation();
  const { move, isPending: moving } = useMoveBankQuestions();
  const [tags, setTags] = useState<string[]>(question.tags);
  const [promptDoc, setPromptDoc] = useState<BlockNoteDocument>(
    () => toBlockNoteDocument(question.prompt) as BlockNoteDocument,
  );
  const [explanationDoc, setExplanationDoc] = useState<BlockNoteDocument>(
    () => toBlockNoteDocument(question.explanation) as BlockNoteDocument,
  );
  const [correctAnswerBusy, setCorrectAnswerBusy] = useState(false);

  const status = question.status;
  const meta = (question.meta ?? {}) as BankMetaView;
  const epsType = tags.find((tag) => tag.startsWith("eps:"));
  const busy =
    createOption.isPending ||
    deleteOption.isPending ||
    deleteQuestion.isPending;
  const epsTag = (memberTags: readonly string[]) =>
    memberTags.find((tag) => tag.startsWith("eps:")) ?? null;
  // This question's own tags may have changed since the group was loaded.
  const groupTypes =
    question.group?.questions.map((member) =>
      epsTag(member.id === question.id ? tags : member.tags),
    ) ?? null;
  const readiness = bankReadinessProblem({
    type: question.type,
    tags,
    groupTypes,
    optionCount: question.options.length,
    correctCount: question.options.filter((option) => option.isCorrect).length,
    promptEmpty: !hasBlockNoteContent(promptDoc),
    emptyOptions: question.options.filter(
      (option) => !hasBlockNoteContent(option.content),
    ).length,
    media: bankMediaState({
      type: tags.map(epsTypeByTag).find(Boolean),
      prompt: question.prompt,
      options: question.options,
    }),
  });
  const media = bankMediaOf(question);

  /**
   * After a save: a LIVE question goes back to review on the server. The question query has the
   * new status after this, and the bank lists are refreshed when they are opened again.
   */
  async function afterContentSave(nextStatus?: BankStatus) {
    if (status !== "LIVE") return;
    if (nextStatus) {
      utils.superadmin.bank.question.setData(queryInput, (current) =>
        current ? { ...current, status: nextStatus } : current,
      );
    } else {
      await utils.superadmin.bank.question.invalidate(queryInput);
    }
    if (nextStatus === undefined || nextStatus !== "LIVE") {
      toast.info("Soal diubah, jadi kembali ke Perlu review.");
      void utils.superadmin.bank.overview.invalidate();
      void utils.superadmin.bank.questions.invalidate();
    }
  }

  const {
    cancel: cancelQuestionSave,
    flush: flushQuestionSave,
    schedule: scheduleQuestionSave,
    status: questionSaveStatus,
  } = useDebouncedAutosave<QuestionDraft>(async (draft) => {
    // Saved as it is, an empty prompt included: the readiness check keeps an incomplete
    // question out of review, so labels or the explanation can be filled in first.
    try {
      const saved = await updateQuestion.mutateAsync({
        id: question.id,
        prompt: draft.prompt,
        explanation: hasBlockNoteContent(draft.explanation)
          ? draft.explanation
          : null,
        tags: draft.tags,
      });
      utils.superadmin.bank.question.setData(queryInput, (current) =>
        current
          ? {
              ...current,
              prompt: asJson(draft.prompt),
              explanation: hasBlockNoteContent(draft.explanation)
                ? asJson(draft.explanation)
                : null,
              tags: draft.tags,
            }
          : current,
      );
      await afterContentSave(saved.status);
    } catch (error) {
      toast.error(errorMessage(error));
      throw error;
    }
  });

  useEffect(
    () =>
      autosaveRegistry.register(`question:${question.id}`, flushQuestionSave),
    [autosaveRegistry, flushQuestionSave, question.id],
  );

  useEffect(() => {
    autosaveRegistry.setStatus(`question:${question.id}`, questionSaveStatus);
  }, [autosaveRegistry, question.id, questionSaveStatus]);

  function editQuestion(changes: Partial<QuestionDraft>) {
    const next = {
      prompt: changes.prompt ?? promptDoc,
      explanation: changes.explanation ?? explanationDoc,
      tags: changes.tags ?? tags,
    };
    if (changes.prompt) setPromptDoc(changes.prompt);
    if (changes.explanation) setExplanationDoc(changes.explanation);
    if (changes.tags) setTags(changes.tags);
    scheduleQuestionSave(next);
  }

  async function saveAll() {
    try {
      await autosaveRegistry.flushAll();
      return true;
    } catch {
      toast.error(
        "Perubahan belum berhasil disimpan. Coba lagi sebelum melanjutkan.",
      );
      return false;
    }
  }

  async function moveTo(to: BankStatus) {
    if (!(await saveAll())) return;
    const result = await move([question.id], to, () => "soal ini");
    if (result?.moved) {
      utils.superadmin.bank.question.setData(queryInput, (current) =>
        current ? { ...current, status: to } : current,
      );
    }
  }

  async function addOption() {
    try {
      const created = await createOption.mutateAsync({
        questionId: question.id,
      });
      utils.superadmin.bank.question.setData(queryInput, (current) =>
        current
          ? { ...current, options: [...current.options, created] }
          : current,
      );
      toast.success("Opsi ditambahkan.");
      await afterContentSave();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function removeOption(optionId: string) {
    try {
      await deleteOption.mutateAsync({ id: optionId });
      utils.superadmin.bank.question.setData(queryInput, (current) =>
        current
          ? {
              ...current,
              options: current.options.filter(({ id }) => id !== optionId),
            }
          : current,
      );
      toast.success("Opsi dihapus.");
      await afterContentSave();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function saveOption(optionId: string, content: BlockNoteDocument) {
    try {
      await updateOption.mutateAsync({ id: optionId, content });
      utils.superadmin.bank.question.setData(queryInput, (current) =>
        current
          ? {
              ...current,
              options: current.options.map((option) =>
                option.id === optionId
                  ? { ...option, content: asJson(content) }
                  : option,
              ),
            }
          : current,
      );
      await afterContentSave();
      return true;
    } catch (error) {
      toast.error(errorMessage(error));
      return false;
    }
  }

  /** Bank questions are single choice: marking one option correct clears the others. */
  async function toggleCorrect(optionId: string, checked: boolean) {
    await utils.superadmin.bank.question.cancel(queryInput);
    const previous = utils.superadmin.bank.question.getData(queryInput);
    utils.superadmin.bank.question.setData(queryInput, (current) =>
      current
        ? {
            ...current,
            options: current.options.map((option) => ({
              ...option,
              isCorrect:
                option.id === optionId
                  ? checked
                  : checked
                    ? false
                    : option.isCorrect,
            })),
          }
        : current,
    );
    setCorrectAnswerBusy(true);
    try {
      await updateOption.mutateAsync({ id: optionId, isCorrect: checked });
      await afterContentSave();
    } catch (error) {
      utils.superadmin.bank.question.setData(queryInput, previous);
      toast.error(errorMessage(error));
    } finally {
      setCorrectAnswerBusy(false);
    }
  }

  async function removeQuestion() {
    cancelQuestionSave();
    // Pending option edits would otherwise save on unmount, after the question is gone.
    await autosaveRegistry.flushAll().catch(() => undefined);
    try {
      await deleteQuestion.mutateAsync({ id: question.id });
      await Promise.all([
        utils.superadmin.bank.overview.invalidate(),
        utils.superadmin.bank.questions.invalidate(),
      ]);
      toast.success("Soal dihapus.");
      router.replace(BANK_HREF);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 pb-32 sm:px-6 sm:py-10 sm:pb-10">
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            aria-label="Kembali ke bank soal"
            className={buttonVariants({ variant: "outline", size: "icon" })}
            href={BANK_HREF}
            onClick={() =>
              void autosaveRegistry.flushAll().catch(() => undefined)
            }
          >
            <ArrowLeftIcon />
          </Link>
          <div className="min-w-0">
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
              <LibraryIcon className="size-3.5 shrink-0" />
              <span className="truncate">Bank soal</span>
            </p>
            <p
              className={
                autosaveStatus === "error"
                  ? "text-destructive mt-0.5 flex items-center gap-1.5 text-xs"
                  : "text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs"
              }
              role="status"
            >
              {autosaveStatus === "pending" || autosaveStatus === "saving" ? (
                <LoaderCircleIcon className="size-3.5 animate-spin" />
              ) : autosaveStatus === "error" ? (
                <AlertTriangleIcon className="size-3.5" />
              ) : (
                <CheckCircle2Icon className="size-3.5" />
              )}
              <span>{autosaveStatusLabels[autosaveStatus]}</span>
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <SaveNowButton
            size="default"
            status={autosaveStatus}
            onSave={autosaveRegistry.flushAll}
          />
          {status === "DRAFT" || status === "RETIRED" ? (
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button
                    aria-label="Hapus soal"
                    disabled={busy}
                    size="icon"
                    type="button"
                    variant="destructive"
                  />
                }
              >
                <Trash2Icon />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Hapus soal ini?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {status === "DRAFT"
                      ? "Draf ini dihapus permanen dari bank soal."
                      : "Soal pensiun ini dihapus permanen dari bank soal. Set soal yang sudah dibuat LPK tidak berubah."}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={deleteQuestion.isPending}
                    onClick={() => void removeQuestion()}
                    variant="destructive"
                  >
                    {deleteQuestion.isPending ? (
                      <LoaderCircleIcon className="animate-spin" />
                    ) : null}
                    Hapus
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
        </div>
      </header>

      <section className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={statusBadgeClasses[status]}>
            {bankStatusLabels[status]}
          </Badge>
          <span className="text-muted-foreground text-xs">
            {epsType ? tagLabel(epsType) : "Tanpa label tipe"}
          </span>
          {readiness && status !== "RETIRED" ? (
            <Badge variant="destructive">{readiness}</Badge>
          ) : null}
        </div>
        {status === "LIVE" ? (
          <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
            <p>
              Soal ini sudah siap dipakai. Kalau isinya diubah (pertanyaan,
              penjelasan, opsi, label atau kelompoknya), soal kembali ke Perlu
              review dan tidak diambil untuk set soal baru sampai disetujui
              lagi. Set soal yang sudah dibuat LPK tidak ikut berubah.
            </p>
          </div>
        ) : status === "RETIRED" ? (
          <p className="text-muted-foreground bg-muted/30 rounded-lg border p-3 text-xs">
            Soal ini pensiun: tidak diambil untuk set soal baru. Set soal yang
            sudah memakainya tetap berjalan.
          </p>
        ) : null}
        <div className="bg-background/95 fixed inset-x-0 bottom-0 z-20 border-t px-4 py-3 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2">
            <span className="text-muted-foreground text-xs sm:hidden">
              {bankStatusLabels[status]}
            </span>
            {bankTransitions[status].map((to) => (
              <Button
                key={to}
                className="max-sm:flex-1"
                disabled={moving}
                onClick={() => void moveTo(to)}
                size="sm"
                type="button"
                variant={
                  to === "RETIRED" || to === "DRAFT" ? "outline" : "default"
                }
              >
                {bankMoveLabel(status, to)}
              </Button>
            ))}
          </div>
        </div>
      </section>

      <BankAiNotes meta={meta} />

      <BankQuestionGroupCard
        assetStorage={bankAssetStorage}
        autosaveRegistry={autosaveRegistry}
        canGroup={tags.map(epsTypeByTag).find(Boolean)?.startsGroup ?? false}
        groupTypes={groupTypes}
        onReload={onReload}
        question={question}
        saveAll={saveAll}
        theme={theme}
      />

      <article
        className={cn(
          cardSurface,
          "max-sm:-mx-4 max-sm:rounded-none max-sm:border-x-0 max-sm:bg-transparent max-sm:shadow-none",
        )}
      >
        <div className="grid gap-4 p-4">
          <div className="grid gap-1.5">
            <Label className="text-muted-foreground text-[11px] tracking-wide uppercase">
              Pertanyaan
            </Label>
            <div className="bg-muted/20 overflow-hidden rounded-lg border">
              <DynamicBlockNoteEditor
                autoFocus={!hasBlockNoteContent(question.prompt)}
                initialContent={toBlockNoteDocument(question.prompt)}
                onChange={(value) => editQuestion({ prompt: value })}
                placeholder="Tulis pertanyaan..."
                trailingBlock={false}
                theme={theme}
                assetStorage={bankAssetStorage}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <BankTagFields
              onChange={(next) => editQuestion({ tags: next })}
              questionId={question.id}
              tags={tags}
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-muted-foreground text-[11px] tracking-wide uppercase">
              Penjelasan jawaban (opsional)
            </Label>
            <div className="bg-muted/20 overflow-hidden rounded-lg border">
              <DynamicBlockNoteEditor
                initialContent={toBlockNoteDocument(question.explanation)}
                onChange={(value) => editQuestion({ explanation: value })}
                placeholder="Tulis penjelasan jawaban..."
                trailingBlock={false}
                theme={theme}
                assetStorage={bankAssetStorage}
              />
            </div>
          </div>

          <div className="grid gap-3 border-t pt-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-heading text-sm font-semibold">
                  Opsi jawaban
                </h3>
                <p className="text-muted-foreground text-xs">
                  Tandai satu opsi yang benar.
                </p>
              </div>
              <Button
                disabled={
                  busy || question.options.length >= MAX_ASSESSMENT_OPTIONS
                }
                onClick={() => void addOption()}
                size="sm"
                type="button"
                variant="outline"
              >
                <PlusIcon data-icon="inline-start" />
                {question.options.length >= MAX_ASSESSMENT_OPTIONS
                  ? `Maksimal ${MAX_ASSESSMENT_OPTIONS} opsi`
                  : "Tambah opsi"}
              </Button>
            </div>
            {question.options.length ? (
              <div className="grid gap-2">
                {question.options.map((option, optionIndex) => (
                  <BankOptionRow
                    autosaveRegistry={autosaveRegistry}
                    busy={busy}
                    canDelete={question.options.length > MIN_ASSESSMENT_OPTIONS}
                    correctAnswerBusy={correctAnswerBusy}
                    index={optionIndex}
                    key={option.id}
                    onDelete={removeOption}
                    onSave={saveOption}
                    onToggleCorrect={toggleCorrect}
                    option={option}
                    theme={theme}
                  />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-4 text-center text-xs">
                Belum ada opsi. Soal bank butuh 4 opsi.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t pt-3">
            <p className="flex items-center gap-1.5 text-xs" role="status">
              {questionSaveStatus === "pending" ||
              questionSaveStatus === "saving" ? (
                <>
                  <LoaderCircleIcon className="text-muted-foreground size-3.5 animate-spin" />
                  <span className="text-muted-foreground">Menyimpan…</span>
                </>
              ) : questionSaveStatus === "error" ? (
                <>
                  <AlertTriangleIcon className="text-destructive size-3.5" />
                  <span className="text-destructive">Gagal menyimpan</span>
                </>
              ) : questionSaveStatus === "saved" ? (
                <>
                  <CheckCircle2Icon className="text-muted-foreground size-3.5" />
                  <span className="text-muted-foreground">Tersimpan</span>
                </>
              ) : (
                <>
                  <CheckCircle2Icon className="text-muted-foreground size-3.5" />
                  <span className="text-muted-foreground">
                    Belum ada perubahan
                  </span>
                </>
              )}
            </p>
            <SaveNowButton
              size="xs"
              status={questionSaveStatus}
              onSave={flushQuestionSave}
            />
          </div>
        </div>
      </article>

      {status !== "RETIRED" && (media.illustrated || media.hasScript) ? (
        <section className="grid gap-2 border-y py-4 sm:rounded-lg sm:border sm:px-4">
          <h2 className="text-sm font-semibold">Gambar dan audio</h2>
          <p className="text-muted-foreground text-xs">
            {media.illustrated
              ? media.media.promptHasImage
                ? "Gambar soal sudah ada. "
                : "Gambar soal belum ada. "
              : ""}
            {media.hasScript
              ? media.media.hasAudio
                ? "Audio sudah ada."
                : "Audio belum ada."
              : ""}{" "}
            Perubahan yang belum tersimpan disimpan dulu sebelum gambar atau
            audio dibuat.
          </p>
          <BankImageActions
            onBeforeRun={async () => {
              await autosaveRegistry.flushAll();
            }}
            onDone={onReload}
            question={media}
          />
          <BankAudioActions
            onBeforeRun={async () => {
              await autosaveRegistry.flushAll();
            }}
            onDone={onReload}
            question={media}
          />
        </section>
      ) : null}
    </main>
  );
}

/** What the AI drafting left for the reviewer: check flags, picture briefs and the audio script. */
function BankAiNotes({ meta }: { meta: BankMetaView }) {
  const flags = meta.flags ?? [];
  const optionBriefs = (meta.optionBriefs ?? []).filter(Boolean);
  const script = meta.script ?? [];
  if (
    !flags.length &&
    !meta.mediaBrief &&
    !optionBriefs.length &&
    !script.length
  ) {
    return null;
  }
  return (
    <section className="grid gap-2 border-y py-4 text-sm sm:rounded-lg sm:border sm:px-4">
      <h2 className="text-sm font-semibold">Catatan AI</h2>
      {flags.length ? (
        <ul className="space-y-1 text-xs text-amber-700 dark:text-amber-400">
          {flags.map((flag) => (
            <li key={`${flag.code}:${flag.message}`}>{flag.message}</li>
          ))}
        </ul>
      ) : null}
      {meta.mediaBrief ? (
        <p className="text-muted-foreground text-xs">
          <span className="text-foreground font-medium">Gambar soal:</span>{" "}
          {meta.mediaBrief}
        </p>
      ) : null}
      {optionBriefs.length ? (
        <ol className="text-muted-foreground space-y-0.5 text-xs">
          {optionBriefs.map((brief, index) => (
            <li key={index}>
              <span className="text-foreground font-medium">
                Gambar {getAssessmentOptionLabel(index)}:
              </span>{" "}
              {brief}
            </li>
          ))}
        </ol>
      ) : null}
      {script.length ? (
        <div className="grid gap-1">
          <p className="text-xs font-medium">Naskah audio</p>
          <ul className="text-muted-foreground space-y-0.5 text-xs">
            {script.map((line, index) => (
              <li key={index}>
                <span className="text-foreground font-medium">
                  {line.speaker}:
                </span>{" "}
                {line.text}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

type BankOptionRowProps = {
  autosaveRegistry: AutosaveRegistry;
  busy: boolean;
  canDelete: boolean;
  correctAnswerBusy: boolean;
  index: number;
  onDelete: (optionId: string) => Promise<void>;
  onSave: (optionId: string, content: BlockNoteDocument) => Promise<boolean>;
  onToggleCorrect: (optionId: string, checked: boolean) => Promise<void>;
  option: BankOption;
  theme: "light" | "dark";
};

/**
 * One answer option, the same row as the assessment editor's `OptionRow`: the editor turns
 * editable on click and saves a moment after typing stops or when focus leaves it.
 */
function BankOptionRow({
  autosaveRegistry,
  busy,
  canDelete,
  correctAnswerBusy,
  index,
  onDelete,
  onSave,
  onToggleCorrect,
  option,
  theme,
}: BankOptionRowProps) {
  const [editing, setEditing] = useState(false);
  const editorAreaRef = useRef<HTMLDivElement>(null);

  const {
    cancel: cancelOptionSave,
    flush: flushOptionSave,
    schedule: scheduleOptionSave,
    status: optionSaveStatus,
  } = useDebouncedAutosave<BlockNoteDocument>(async (nextContent) => {
    // An empty option saves too; the readiness check names it before review.
    const saved = await onSave(option.id, nextContent);
    if (!saved) throw new Error("Option autosave failed");
  });

  useEffect(
    () => autosaveRegistry.register(`option:${option.id}`, flushOptionSave),
    [autosaveRegistry, flushOptionSave, option.id],
  );

  useEffect(() => {
    autosaveRegistry.setStatus(`option:${option.id}`, optionSaveStatus);
  }, [autosaveRegistry, option.id, optionSaveStatus]);

  useEffect(() => {
    if (!editing) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        editorAreaRef.current?.contains(event.target)
      ) {
        return;
      }

      setEditing(false);
      void flushOptionSave().catch(() => undefined);
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    return () =>
      document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [editing, flushOptionSave]);

  const beginEditing = () => {
    if (busy) return;
    setEditing(true);
  };

  return (
    <div className="bg-muted/20 flex items-center gap-2 rounded-lg border px-3 py-2">
      <Checkbox
        aria-label={`Tandai opsi ${index + 1} sebagai jawaban benar`}
        checked={option.isCorrect}
        disabled={busy || correctAnswerBusy}
        onCheckedChange={(checked) =>
          void onToggleCorrect(option.id, checked === true)
        }
      />
      <span className="text-foreground w-6 shrink-0 text-center text-lg leading-none font-semibold">
        {getAssessmentOptionLabel(index)}
      </span>
      <div
        className="min-w-0 flex-1 overflow-hidden rounded-md"
        ref={editorAreaRef}
      >
        <div
          aria-disabled={!editing && busy ? true : undefined}
          aria-label={!editing ? `Edit opsi ${index + 1}` : undefined}
          aria-readonly={!editing ? "true" : undefined}
          className={
            editing
              ? undefined
              : "focus-visible:ring-ring cursor-text focus-visible:ring-2 focus-visible:outline-hidden"
          }
          onClick={
            editing
              ? undefined
              : (event) => {
                  event.preventDefault();
                  beginEditing();
                }
          }
          onKeyDown={
            editing
              ? undefined
              : (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    beginEditing();
                  }
                }
          }
          role={!editing ? "textbox" : undefined}
          tabIndex={!editing && !busy ? 0 : undefined}
        >
          <DynamicBlockNoteEditor
            autoFocus={editing}
            editable={editing}
            initialContent={toBlockNoteDocument(option.content)}
            onChange={(value) => {
              if (editing) scheduleOptionSave(value);
            }}
            placeholder="Tulis opsi jawaban..."
            trailingBlock={false}
            theme={theme}
            assetStorage={bankAssetStorage}
          />
        </div>
      </div>
      {option.isCorrect ? (
        <Badge variant="secondary">
          <CheckCircle2Icon data-icon="inline-start" />
          Benar
        </Badge>
      ) : null}
      <AlertDialog>
        <AlertDialogTrigger
          render={
            <Button
              aria-label={`Hapus opsi ${index + 1}`}
              disabled={busy || !canDelete}
              size="icon-sm"
              type="button"
              variant="ghost"
            />
          }
        >
          <Trash2Icon />
        </AlertDialogTrigger>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus opsi ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Opsi jawaban ini akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                cancelOptionSave();
                void onDelete(option.id);
              }}
              variant="destructive"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const tagGroups = [
  { prefix: "eps:", group: "eps", label: "Tipe soal", empty: "Pilih tipe" },
  {
    prefix: "level:",
    group: "level",
    label: "Tingkat",
    empty: "Pilih tingkat",
  },
  { prefix: "topik:", group: "topik", label: "Topik", empty: "Tanpa topik" },
] as const;

/** Types no slot of the blueprint takes yet are not offered, so no question is written for nothing. */
const usableTypes = blueprintTypes(epsTopikBlueprint);

const tagSelectClassName =
  "border-input bg-background h-9 w-full rounded-md border px-2 text-sm";

/**
 * Type, level and topic come from fixed lists, so they are picked rather than typed: a typo would
 * keep a question out of every generated set without anyone noticing. Other labels a question
 * already has (such as `bab:3`) are kept as they are.
 */
function BankTagFields({
  questionId,
  tags,
  onChange,
}: {
  questionId: string;
  tags: readonly string[];
  onChange: (tags: string[]) => void;
}) {
  const choose = (prefix: string, value: string) => {
    const rest = tags.filter((tag) => !tag.startsWith(prefix));
    // Type, level and topic first, in that order, then any other labels.
    const picked = tagGroups.flatMap((entry) => {
      if (entry.prefix === prefix) return value ? [value] : [];
      return tags.filter((tag) => tag.startsWith(entry.prefix)).slice(0, 1);
    });
    const others = rest.filter(
      (tag) => !tagGroups.some((entry) => tag.startsWith(entry.prefix)),
    );
    onChange([...picked, ...others]);
  };

  return (
    <div className="grid gap-1.5">
      <div className="grid gap-3 sm:grid-cols-3">
        {tagGroups.map((entry) => {
          const options = epsTagVocabulary.filter(
            (option) =>
              option.group === entry.group &&
              (option.group !== "eps" ||
                usableTypes.has(option.tag) ||
                tags.includes(option.tag)),
          );
          const current =
            tags.find(
              (tag) =>
                tag.startsWith(entry.prefix) &&
                options.some((option) => option.tag === tag),
            ) ?? "";
          const id = `question-${entry.group}-${questionId}`;
          return (
            <div key={entry.group} className="grid gap-1.5">
              <Label
                className="text-muted-foreground text-[11px] tracking-wide uppercase"
                htmlFor={id}
              >
                {entry.label}
              </Label>
              <select
                className={tagSelectClassName}
                id={id}
                onChange={(event) => choose(entry.prefix, event.target.value)}
                value={current}
              >
                <option value="">{entry.empty}</option>
                {options.map((option) => (
                  <option key={option.tag} value={option.tag}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
      <p className="text-muted-foreground text-xs">
        Tipe dan tingkat wajib diisi sebelum soal dikirim ke review. Topik
        membantu set soal memakai topik yang beragam.
      </p>
    </div>
  );
}
