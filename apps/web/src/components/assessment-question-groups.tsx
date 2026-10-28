"use client";

import { useEffect, useRef, useState } from "react";
import {
  CheckIcon,
  GroupIcon,
  LoaderCircleIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import {
  DynamicBlockNoteEditor,
  type BlockNoteDocument,
  type EditorAssetStorageOptions,
} from "~/components/editor";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useDialogs } from "~/components/ui/use-dialogs";
import {
  getBlockNotePlainText,
  toBlockNoteDocument,
} from "~/lib/blocknote/document";
import { api, type RouterOutputs } from "~/trpc/react";

// Same cap as the server (`MAX_GROUP_QUESTIONS` in `server/assessment/groups.ts`).
const MAX_GROUP_QUESTIONS = 10;

/**
 * Question groups in the assessment editor (docs/eps-topik-simulation.md section 4.5): consecutive
 * questions of one section that share instructions ("[1~4] 다음 그림을 보고…") and a stimulus (a
 * passage, picture or audio) shown above each of them.
 */

type Assessment = RouterOutputs["assessment"]["get"];
type Group = Assessment["questionGroups"][number];

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Perubahan belum tersimpan.";
}

/** Question ids from `first` to `last` (display indexes), or why they can't form a group. */
function groupRun(
  assessment: Assessment,
  first: number,
  last: number,
  groupId: string | null,
) {
  if (last < first)
    return { error: "Soal terakhir harus setelah soal pertama." };
  if (last - first + 1 > MAX_GROUP_QUESTIONS) {
    return {
      error: `Satu kelompok paling banyak ${MAX_GROUP_QUESTIONS} soal.`,
    };
  }
  const run = assessment.questions.slice(first, last + 1);
  if (new Set(run.map(({ sectionId }) => sectionId)).size > 1) {
    return { error: "Soal dalam satu kelompok harus di bagian yang sama." };
  }
  if (
    run.some((question) => question.groupId && question.groupId !== groupId)
  ) {
    return { error: "Ada soal yang sudah masuk kelompok lain." };
  }
  return { questionIds: run.map(({ id }) => id) };
}

function QuestionSelect({
  assessment,
  id,
  value,
  onChange,
  disabled,
}: {
  assessment: Assessment;
  id: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <Select
      disabled={disabled}
      value={String(value)}
      onValueChange={(next) => {
        if (next !== null) onChange(Number(next));
      }}
    >
      <SelectTrigger className="w-full" id={id}>
        <SelectValue>Soal {value + 1}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {assessment.questions.map((question, index) => (
          <SelectItem key={question.id} value={String(index)}>
            {index + 1}.{" "}
            {getBlockNotePlainText(question.prompt).slice(0, 40) ||
              "(soal tanpa teks)"}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function useRefreshAssessment(assessmentId: string) {
  const utils = api.useUtils();
  return () => utils.assessment.get.invalidate({ assessmentId });
}

/** "Kelompok soal": groups a run of consecutive questions. */
export function QuestionGroupButton({
  assessment,
  readOnly,
}: {
  assessment: Assessment;
  readOnly: boolean;
}) {
  const refresh = useRefreshAssessment(assessment.id);
  const create = api.assessment.createQuestionGroup.useMutation();
  const [open, setOpen] = useState(false);
  const firstFree = Math.max(
    0,
    assessment.questions.findIndex((question) => !question.groupId),
  );
  const [first, setFirst] = useState(firstFree);
  const [last, setLast] = useState(firstFree);
  const run = groupRun(assessment, first, last, null);

  async function save() {
    if (!run.questionIds) return;
    try {
      await create.mutateAsync({
        assessmentId: assessment.id,
        questionIds: run.questionIds,
      });
      await refresh();
      setOpen(false);
      toast.success(
        "Kelompok dibuat. Isi petunjuk dan bahan bersamanya di atas soal pertamanya.",
      );
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setFirst(firstFree);
          setLast(firstFree);
        }
      }}
    >
      <DialogTrigger
        disabled={readOnly || !assessment.questions.length}
        render={<Button size="sm" type="button" variant="outline" />}
      >
        <GroupIcon data-icon="inline-start" />
        Kelompok soal
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Buat kelompok soal</DialogTitle>
          <DialogDescription>
            Soal yang berurutan bisa memakai petunjuk dan bahan yang sama,
            misalnya satu gambar, bacaan atau audio untuk soal 1–4.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="group-first">Dari soal</Label>
            <QuestionSelect
              assessment={assessment}
              id="group-first"
              onChange={(value) => {
                setFirst(value);
                if (last < value) setLast(value);
              }}
              value={first}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="group-last">Sampai soal</Label>
            <QuestionSelect
              assessment={assessment}
              id="group-last"
              onChange={setLast}
              value={last}
            />
          </div>
        </div>
        {run.error ? (
          <p className="text-destructive text-sm">{run.error}</p>
        ) : null}
        <DialogFooter>
          <Button
            disabled={!run.questionIds || create.isPending}
            onClick={() => void save()}
            type="button"
          >
            {create.isPending ? (
              <LoaderCircleIcon
                className="animate-spin"
                data-icon="inline-start"
              />
            ) : null}
            Buat kelompok
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const SAVE_DELAY_MS = 1000;

/**
 * A group's shared part above its first question: which questions it covers, its instructions and
 * stimulus (saved a moment after typing stops), and removing the group.
 */
export function QuestionGroupCard({
  assessment,
  group,
  first,
  last,
  readOnly,
  theme,
  assetStorage,
}: {
  assessment: Assessment;
  group: Group;
  /** Display indexes of its first and last question. */
  first: number;
  last: number;
  readOnly: boolean;
  theme: "light" | "dark";
  assetStorage?: EditorAssetStorageOptions;
}) {
  const refresh = useRefreshAssessment(assessment.id);
  const update = api.assessment.updateQuestionGroup.useMutation();
  const remove = api.assessment.deleteQuestionGroup.useMutation();
  const { confirm, dialogs } = useDialogs();
  const [saved, setSaved] = useState(true);
  const timer = useRef<number | null>(null);
  // Edits not yet sent; the editors keep their own content after mounting.
  const pending = useRef<{
    instructions?: BlockNoteDocument;
    stimulus?: BlockNoteDocument;
  }>({});

  const flush = async () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    const changes = pending.current;
    if (!Object.keys(changes).length) return;
    pending.current = {};
    try {
      await update.mutateAsync({ groupId: group.id, ...changes });
      setSaved(Object.keys(pending.current).length === 0);
    } catch (error) {
      pending.current = { ...changes, ...pending.current };
      toast.error(errorMessage(error));
    }
  };

  const change = (
    field: "instructions" | "stimulus",
    value: BlockNoteDocument,
  ) => {
    pending.current = { ...pending.current, [field]: value };
    setSaved(false);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void flush(), SAVE_DELAY_MS);
  };

  // Leaving the editor saves what is still waiting.
  const flushOnLeave = useRef(flush);
  useEffect(() => {
    flushOnLeave.current = flush;
  });
  useEffect(() => () => void flushOnLeave.current(), []);

  async function setRange(nextFirst: number, nextLast: number) {
    const run = groupRun(assessment, nextFirst, nextLast, group.id);
    if (!run.questionIds) {
      toast.error(run.error);
      return;
    }
    // The card moves with the group's first question and remounts from the refetched group, so
    // typed changes are saved first.
    await flush();
    try {
      await update.mutateAsync({
        groupId: group.id,
        questionIds: run.questionIds,
      });
      await refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function removeGroup() {
    const confirmed = await confirm({
      title: "Hapus kelompok ini?",
      description:
        "Petunjuk dan bahan bersama kelompok ini dihapus. Soalnya tetap ada.",
      confirmLabel: "Hapus kelompok",
      destructive: true,
    });
    if (!confirmed) return;
    // Edits still waiting would be saved to a group that no longer exists.
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    pending.current = {};
    try {
      await remove.mutateAsync({ groupId: group.id });
      await refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <section
      aria-label={`Kelompok soal ${first + 1}–${last + 1}`}
      className="bg-muted/20 border-primary/30 mt-3 mb-2 grid gap-3 rounded-xl border border-dashed p-3 sm:p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-primary flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
          <GroupIcon className="size-3.5" />
          Kelompok · Soal {first + 1}–{last + 1}
        </p>
        <span
          className="text-muted-foreground ml-auto flex items-center gap-1 text-xs"
          role="status"
        >
          {readOnly ? null : saved ? (
            <>
              <CheckIcon className="size-3" /> Tersimpan
            </>
          ) : (
            "Menyimpan…"
          )}
        </span>
        {readOnly ? null : (
          <Button
            aria-label="Hapus kelompok"
            disabled={remove.isPending}
            onClick={() => void removeGroup()}
            size="icon-xs"
            type="button"
            variant="ghost"
          >
            <Trash2Icon />
          </Button>
        )}
      </div>
      {readOnly ? null : (
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor={`group-${group.id}-first`}>Dari soal</Label>
            <QuestionSelect
              assessment={assessment}
              disabled={update.isPending}
              id={`group-${group.id}-first`}
              onChange={(value) => void setRange(value, Math.max(value, last))}
              value={first}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`group-${group.id}-last`}>Sampai soal</Label>
            <QuestionSelect
              assessment={assessment}
              disabled={update.isPending}
              id={`group-${group.id}-last`}
              onChange={(value) => void setRange(first, value)}
              value={last}
            />
          </div>
        </div>
      )}
      <div className="grid gap-1.5">
        <Label className="text-muted-foreground text-[11px] tracking-wide uppercase">
          Petunjuk kelompok
        </Label>
        <div className="bg-background overflow-hidden rounded-lg border">
          <DynamicBlockNoteEditor
            editable={!readOnly}
            initialContent={toBlockNoteDocument(group.instructions)}
            key={`group-instructions:${group.id}:${readOnly ? "ro" : "rw"}`}
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
            editable={!readOnly}
            initialContent={toBlockNoteDocument(group.stimulus)}
            key={`group-stimulus:${group.id}:${readOnly ? "ro" : "rw"}`}
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
      {dialogs}
    </section>
  );
}
