"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  CheckCircle2Icon,
  ClipboardCheckIcon,
  FileQuestionIcon,
  LoaderCircleIcon,
  PlusIcon,
  Settings2Icon,
  Trash2Icon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import {
  DynamicBlockNoteEditor,
  type BlockNoteDocument,
  type EditorAssetStorageOptions,
} from "~/components/editor";
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
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";
import { useDebouncedAutosave } from "~/hooks/use-debounced-autosave";
import {
  getBlockNotePlainText,
  hasBlockNoteContent,
  toBlockNoteDocument,
} from "~/lib/blocknote/document";
import {
  getAssessmentOptionLabel,
  MAX_ASSESSMENT_OPTIONS,
  MIN_ASSESSMENT_OPTIONS,
} from "~/lib/assessment-options";
import { api, type RouterOutputs } from "~/trpc/react";
import {
  completeResourcePicker,
  resourcePickerQuery,
} from "~/lib/resource-picker-callback";

type Assessment = RouterOutputs["assessment"]["get"];
type Question = Assessment["questions"][number];
type QuestionType = Question["type"];
type Status = Assessment["status"];
type UpdatedOption = RouterOutputs["assessment"]["updateOption"];
type UpdatedQuestion = RouterOutputs["assessment"]["updateQuestion"];
type QuestionFields = {
  type: QuestionType;
  prompt: BlockNoteDocument;
  explanation: BlockNoteDocument | null;
  points: number;
};

const assessmentStatusLabels: Record<Status, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

const questionTypeLabels: Record<QuestionType, string> = {
  SINGLE_CHOICE: "Pilihan tunggal",
  MULTIPLE_CHOICE: "Pilihan ganda",
  WRITTEN: "Jawaban tertulis",
};

function updateCorrectOption(
  assessment: Assessment | undefined,
  questionId: string,
  optionId: string,
  checked: boolean,
) {
  if (!assessment) return assessment;

  return {
    ...assessment,
    questions: assessment.questions.map((question) =>
      question.id === questionId
        ? {
            ...question,
            options: question.options.map((option) => {
              const isCorrect =
                option.id === optionId
                  ? checked
                  : checked && question.type === "SINGLE_CHOICE"
                    ? false
                    : option.isCorrect;
              return isCorrect === option.isCorrect
                ? option
                : { ...option, isCorrect };
            }),
          }
        : question,
    ),
  };
}

function replaceQuestion(
  assessment: Assessment | undefined,
  replacement: Question | undefined,
) {
  if (!assessment || !replacement) return assessment;
  return {
    ...assessment,
    questions: assessment.questions.map((question) =>
      question.id === replacement.id ? replacement : question,
    ),
  };
}

function updateQuestionFields(
  assessment: Assessment | undefined,
  updated: UpdatedQuestion,
) {
  if (!assessment) return assessment;
  return {
    ...assessment,
    questions: assessment.questions.map((question) =>
      question.id === updated.id ? { ...question, ...updated } : question,
    ),
  };
}

function updateOptionContent(
  assessment: Assessment | undefined,
  updated: UpdatedOption,
) {
  if (!assessment) return assessment;
  return {
    ...assessment,
    questions: assessment.questions.map((question) => {
      if (!question.options.some((option) => option.id === updated.id)) {
        return question;
      }
      return {
        ...question,
        options: question.options.map((option) =>
          option.id === updated.id ? { ...option, ...updated } : option,
        ),
      };
    }),
  };
}

function appendOption(
  assessment: Assessment | undefined,
  questionId: string,
  option: Question["options"][number],
) {
  if (!assessment) return assessment;
  return {
    ...assessment,
    questions: assessment.questions.map((question) =>
      question.id === questionId
        ? { ...question, options: [...question.options, option] }
        : question,
    ),
  };
}

function removeOption(assessment: Assessment | undefined, optionId: string) {
  if (!assessment) return assessment;
  return {
    ...assessment,
    questions: assessment.questions.map((question) => {
      if (!question.options.some((option) => option.id === optionId)) {
        return question;
      }
      return {
        ...question,
        options: question.options.filter((option) => option.id !== optionId),
      };
    }),
  };
}

function getPublishValidationError(questions: Question[]) {
  if (questions.length === 0) {
    return "Tambahkan setidaknya satu soal sebelum memublikasikan assessment.";
  }

  for (const [index, question] of questions.entries()) {
    if (!hasBlockNoteContent(question.prompt)) {
      return `Soal ${index + 1} belum memiliki pertanyaan.`;
    }
    if (question.type === "WRITTEN") continue;
    if (question.options.length < MIN_ASSESSMENT_OPTIONS) {
      return `Soal ${index + 1} harus memiliki setidaknya dua opsi.`;
    }
    if (
      question.options.some((option) => !hasBlockNoteContent(option.content))
    ) {
      return `Semua opsi pada soal ${index + 1} wajib memiliki isi.`;
    }

    const correctOptions = question.options.filter(
      (option) => option.isCorrect,
    ).length;
    if (question.type === "SINGLE_CHOICE" && correctOptions !== 1) {
      return `Soal ${index + 1} harus memiliki tepat satu jawaban benar.`;
    }
    if (question.type === "MULTIPLE_CHOICE" && correctOptions < 1) {
      return `Soal ${index + 1} harus memiliki setidaknya satu jawaban benar.`;
    }
  }

  return null;
}

function errorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return "Terjadi kesalahan. Silakan coba lagi.";
}

function optionalInteger(value: string, minimum: number, maximum?: number) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum) return undefined;
  if (maximum !== undefined && parsed > maximum) return undefined;
  return parsed;
}

export function AssessmentEditor({
  organizationId,
  organizationSlug,
  assessmentId,
  pickerToken,
  returnTo,
}: {
  organizationId: string;
  organizationSlug: string;
  assessmentId?: string;
  pickerToken?: string;
  returnTo?: string;
}) {
  const router = useRouter();
  const utils = api.useUtils();
  const assessment = api.assessment.get.useQuery(
    { assessmentId: assessmentId ?? "" },
    { enabled: Boolean(assessmentId) },
  );
  const organization = api.organization.get.useQuery({ organizationId });
  const createAssessment = api.assessment.create.useMutation();
  const updateAssessment = api.assessment.update.useMutation();
  const deleteAssessment = api.assessment.delete.useMutation();
  const createQuestion = api.assessment.createQuestion.useMutation();
  const updateQuestion = api.assessment.updateQuestion.useMutation();
  const deleteQuestion = api.assessment.deleteQuestion.useMutation();
  const createOption = api.assessment.createOption.useMutation();
  const updateOption = api.assessment.updateOption.useMutation();
  const deleteOption = api.assessment.deleteOption.useMutation();
  const attachAsset = api.assessment.attachAsset.useMutation();
  const detachAsset = api.assessment.detachAsset.useMutation();
  const createdAssessmentIdRef = useRef<string | null>(null);
  const canDelete = Boolean(organization.data);

  async function refreshQuestions() {
    await Promise.all([
      utils.assessment.list.invalidate({ organizationId }),
      assessmentId
        ? utils.assessment.get.invalidate({ assessmentId })
        : Promise.resolve(),
    ]);
  }

  const assetStorage: EditorAssetStorageOptions | undefined = assessmentId
    ? {
        organizationId,
        onAttach: async (assetId) => {
          await attachAsset.mutateAsync({ assessmentId, assetId });
        },
        onDetach: async (assetId) => {
          await detachAsset.mutateAsync({ assessmentId, assetId });
        },
      }
    : undefined;

  if (assessmentId && assessment.isPending) {
    return (
      <div className="text-muted-foreground flex min-h-96 items-center justify-center text-sm">
        <LoaderCircleIcon className="mr-2 size-4 animate-spin" />
        Memuat assessment
      </div>
    );
  }

  if (assessmentId && (assessment.error || !assessment.data)) {
    return (
      <div className="flex min-h-96 flex-col items-center justify-center gap-3 text-center">
        <p className="text-destructive text-sm">
          {assessment.error?.message ?? "Assessment gagal dimuat."}
        </p>
        <Button variant="outline" onClick={() => assessment.refetch()}>
          Coba lagi
        </Button>
      </div>
    );
  }

  return (
    <AssessmentEditorForm
      key={assessment.data?.id ?? "new-assessment"}
      assessment={assessment.data}
      canDelete={canDelete}
      isDeleting={deleteAssessment.isPending}
      onBack={() => {
        if (
          assessment.data?.id &&
          completeResourcePicker({
            resourceId: assessment.data.id,
            resourceType: "assessment",
            returnTo,
            token: pickerToken,
          })
        ) {
          return;
        }
        router.back();
      }}
      assetStorage={assetStorage}
      questionBusy={
        createQuestion.isPending ||
        deleteQuestion.isPending ||
        createOption.isPending ||
        deleteOption.isPending
      }
      onAddOption={async (questionId) => {
        try {
          const created = await createOption.mutateAsync({
            questionId,
            content: [{ type: "paragraph", content: "Pilihan baru" }],
            isCorrect: false,
          });
          if (assessmentId) {
            utils.assessment.get.setData({ assessmentId }, (current) =>
              appendOption(current, questionId, created),
            );
          }
          toast.success("Opsi ditambahkan.");
        } catch (error) {
          toast.error(errorMessage(error));
        }
      }}
      onAddQuestion={async () => {
        if (!assessmentId) return;
        try {
          await createQuestion.mutateAsync({
            assessmentId,
            type: "SINGLE_CHOICE",
            prompt: [{ type: "paragraph", content: "Pertanyaan baru" }],
            explanation: null,
            points: 1,
          });
          await refreshQuestions();
          toast.success("Soal ditambahkan.");
        } catch (error) {
          toast.error(errorMessage(error));
        }
      }}
      onDelete={async () => {
        if (!assessmentId) return;
        try {
          await deleteAssessment.mutateAsync({ assessmentId });
          await utils.assessment.list.invalidate({ organizationId });
          toast.success("Assessment dihapus.");
          router.replace(`/workspace/${organizationSlug}/library/assessments`);
        } catch (error) {
          toast.error(errorMessage(error));
        }
      }}
      onDeleteOption={async (optionId) => {
        try {
          await deleteOption.mutateAsync({ optionId });
          if (assessmentId) {
            utils.assessment.get.setData({ assessmentId }, (current) =>
              removeOption(current, optionId),
            );
          }
          toast.success("Opsi dihapus.");
        } catch (error) {
          toast.error(errorMessage(error));
        }
      }}
      onDeleteQuestion={async (questionId) => {
        try {
          await deleteQuestion.mutateAsync({ questionId });
          await refreshQuestions();
          toast.success("Soal dihapus.");
        } catch (error) {
          toast.error(errorMessage(error));
        }
      }}
      onSave={async (value) => {
        const targetAssessmentId =
          assessmentId ?? createdAssessmentIdRef.current;
        try {
          if (targetAssessmentId) {
            const updated = await updateAssessment.mutateAsync({
              assessmentId: targetAssessmentId,
              ...value,
              editorSchemaVersion: 1,
            });
            utils.assessment.get.setData(
              { assessmentId: targetAssessmentId },
              (current) => (current ? { ...current, ...updated } : current),
            );
            utils.assessment.list.setData({ organizationId }, (current) =>
              current?.map((item) =>
                item.id === targetAssessmentId ? { ...item, ...updated } : item,
              ),
            );
            return;
          }

          const created = await createAssessment.mutateAsync({
            organizationId,
            ...value,
            editorSchemaVersion: 1,
          });
          createdAssessmentIdRef.current = created.id;
          await utils.assessment.list.invalidate({ organizationId });
          toast.success("Assessment dibuat. Tambahkan soal pertama Anda.");
          router.replace(
            `/workspace/${organizationSlug}/library/assessments/${created.id}${resourcePickerQuery(pickerToken, returnTo)}`,
          );
        } catch (error) {
          toast.error(errorMessage(error));
          throw error;
        }
      }}
      onSaveOption={async (optionId, content) => {
        try {
          const updated = await updateOption.mutateAsync({
            optionId,
            content,
          });
          if (assessmentId) {
            utils.assessment.get.setData({ assessmentId }, (current) =>
              updateOptionContent(current, updated),
            );
          }
          return true;
        } catch (error) {
          toast.error(errorMessage(error));
          return false;
        }
      }}
      onSaveQuestion={async (questionId, value) => {
        try {
          const updated = await updateQuestion.mutateAsync({
            questionId,
            ...value,
          });
          if (assessmentId) {
            utils.assessment.get.setData({ assessmentId }, (current) =>
              updateQuestionFields(current, updated),
            );
          }
          return true;
        } catch (error) {
          toast.error(errorMessage(error));
          return false;
        }
      }}
      onToggleCorrect={async (question, optionId, checked) => {
        if (!assessmentId) return;
        const queryInput = { assessmentId };
        await utils.assessment.get.cancel(queryInput);
        const previous = utils.assessment.get.getData(queryInput);
        const previousQuestion = previous?.questions.find(
          (current) => current.id === question.id,
        );
        utils.assessment.get.setData(queryInput, (current) =>
          updateCorrectOption(current, question.id, optionId, checked),
        );

        try {
          await updateOption.mutateAsync({ optionId, isCorrect: checked });
        } catch (error) {
          utils.assessment.get.setData(queryInput, (current) =>
            replaceQuestion(current, previousQuestion),
          );
          toast.error(errorMessage(error));
        }
      }}
    />
  );
}

type AssessmentFields = {
  title: string;
  description: string | null;
  status: Status;
  instructions: BlockNoteDocument | null;
  passingScore: number | null;
  maxAttempts: number | null;
  timeLimitMinutes: number | null;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
};

type AssessmentDraft = Omit<
  AssessmentFields,
  | "description"
  | "instructions"
  | "maxAttempts"
  | "passingScore"
  | "timeLimitMinutes"
> & {
  description: string;
  instructions: BlockNoteDocument;
  maxAttempts: string;
  passingScore: string;
  timeLimitMinutes: string;
};

function AssessmentEditorForm({
  assessment,
  canDelete,
  isDeleting,
  onBack,
  assetStorage,
  questionBusy,
  onAddOption,
  onAddQuestion,
  onDelete,
  onDeleteOption,
  onDeleteQuestion,
  onSave,
  onSaveOption,
  onSaveQuestion,
  onToggleCorrect,
}: {
  assessment?: Assessment;
  canDelete: boolean;
  isDeleting: boolean;
  onBack: () => void;
  assetStorage?: EditorAssetStorageOptions;
  questionBusy: boolean;
  onAddOption: (questionId: string) => Promise<void>;
  onAddQuestion: () => Promise<void>;
  onDelete: () => Promise<void>;
  onDeleteOption: (optionId: string) => Promise<void>;
  onDeleteQuestion: (questionId: string) => Promise<void>;
  onSave: (value: AssessmentFields) => Promise<void>;
  onSaveOption: (
    optionId: string,
    content: BlockNoteDocument,
  ) => Promise<boolean>;
  onSaveQuestion: (
    questionId: string,
    value: QuestionFields,
  ) => Promise<boolean>;
  onToggleCorrect: (
    question: Question,
    optionId: string,
    checked: boolean,
  ) => Promise<void>;
}) {
  const [title, setTitle] = useState(assessment?.title ?? "");
  const [description, setDescription] = useState(assessment?.description ?? "");
  const [status, setStatus] = useState<Status>(assessment?.status ?? "DRAFT");
  const { resolvedTheme } = useTheme();
  const editorTheme = resolvedTheme === "dark" ? "dark" : "light";
  const [instructions, setInstructions] = useState<BlockNoteDocument>(
    () => toBlockNoteDocument(assessment?.instructions) as BlockNoteDocument,
  );
  const [passingScore, setPassingScore] = useState(
    assessment?.passingScore?.toString() ?? "",
  );
  const [maxAttempts, setMaxAttempts] = useState(
    assessment?.maxAttempts?.toString() ?? "",
  );
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(
    assessment?.timeLimitMinutes?.toString() ?? "",
  );
  const [shuffleQuestions, setShuffleQuestions] = useState(
    assessment?.shuffleQuestions ?? false,
  );
  const [shuffleOptions, setShuffleOptions] = useState(
    assessment?.shuffleOptions ?? false,
  );
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const scrollAnimationFrameRef = useRef<number | null>(null);
  const questionMapItems = useMemo(
    () =>
      assessment?.questions.map((question, index) => ({
        id: question.id,
        index,
        label: getBlockNotePlainText(question.prompt) || `Soal ${index + 1}`,
        points: question.points,
      })) ?? [],
    [assessment?.questions],
  );
  const questionIdKey = useMemo(
    () => questionMapItems.map((item) => item.id).join("\u0000"),
    [questionMapItems],
  );

  useEffect(
    () => () => {
      if (scrollAnimationFrameRef.current !== null) {
        cancelAnimationFrame(scrollAnimationFrameRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!questionIdKey) return;

    const visibleHeights = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const questionId = (entry.target as HTMLElement).dataset.questionId;
          if (!questionId) continue;
          visibleHeights.set(
            questionId,
            entry.isIntersecting ? entry.intersectionRect.height : 0,
          );
        }

        let nextQuestionId: string | null = null;
        let largestVisibleHeight = 0;
        for (const [questionId, visibleHeight] of visibleHeights) {
          if (visibleHeight > largestVisibleHeight) {
            nextQuestionId = questionId;
            largestVisibleHeight = visibleHeight;
          }
        }
        setActiveQuestionId(nextQuestionId);
      },
      {
        rootMargin: "-80px 0px -20% 0px",
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
      },
    );

    for (const questionId of questionIdKey.split("\u0000")) {
      const element = document.getElementById(
        `assessment-question-${questionId}`,
      );
      if (element) observer.observe(element);
    }

    return () => observer.disconnect();
  }, [questionIdKey]);

  const navigateToQuestion = (questionId: string) => {
    const questionElement = document.getElementById(
      `assessment-question-${questionId}`,
    );
    if (!questionElement) return;

    if (scrollAnimationFrameRef.current !== null) {
      cancelAnimationFrame(scrollAnimationFrameRef.current);
    }
    const startY = window.scrollY;
    const questionRect = questionElement.getBoundingClientRect();
    const targetY = Math.max(
      0,
      startY +
        questionRect.top -
        Math.max(24, (window.innerHeight - questionRect.height) / 2),
    );
    const distance = targetY - startY;
    let startedAt: number | null = null;

    const animateScroll = (now: number) => {
      startedAt ??= now;
      const progress = Math.min((now - startedAt) / 500, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      window.scrollTo(0, startY + distance * easedProgress);
      if (progress < 1) {
        scrollAnimationFrameRef.current = requestAnimationFrame(animateScroll);
      } else {
        scrollAnimationFrameRef.current = null;
      }
    };
    scrollAnimationFrameRef.current = requestAnimationFrame(animateScroll);
    setActiveQuestionId(questionId);
  };

  const {
    cancel: cancelSettingsSave,
    flush: flushSettingsSave,
    schedule: scheduleSettingsSave,
  } = useDebouncedAutosave<AssessmentDraft>(async (draft) => {
    const normalizedTitle = draft.title.trim();
    if (!normalizedTitle) {
      toast.error("Judul assessment wajib diisi.");
      return;
    }
    const parsedPassingScore = optionalInteger(draft.passingScore, 0, 100);
    const parsedMaxAttempts = optionalInteger(draft.maxAttempts, 1);
    const parsedTimeLimit = optionalInteger(draft.timeLimitMinutes, 1);
    if (
      parsedPassingScore === undefined ||
      parsedMaxAttempts === undefined ||
      parsedTimeLimit === undefined
    ) {
      toast.error("Nilai pengaturan angka belum valid.");
      return;
    }
    if (draft.status === "PUBLISHED") {
      if (!assessment) {
        toast.error(
          "Buat assessment sebagai draft terlebih dahulu, lalu tambahkan soal sebelum publish.",
        );
        return;
      }
      const validationError = getPublishValidationError(assessment.questions);
      if (validationError) {
        toast.error(validationError);
        return;
      }
    }
    await onSave({
      title: normalizedTitle,
      description: draft.description.trim() || null,
      status: draft.status,
      instructions: hasBlockNoteContent(draft.instructions)
        ? draft.instructions
        : null,
      passingScore: parsedPassingScore,
      maxAttempts: parsedMaxAttempts,
      timeLimitMinutes: parsedTimeLimit,
      shuffleQuestions: draft.shuffleQuestions,
      shuffleOptions: draft.shuffleOptions,
    });
  });

  const skipInitialSettingsSave = useRef(true);

  useEffect(() => {
    if (skipInitialSettingsSave.current) {
      skipInitialSettingsSave.current = false;
      return;
    }

    scheduleSettingsSave({
      description,
      instructions,
      maxAttempts,
      passingScore,
      shuffleOptions,
      shuffleQuestions,
      status,
      timeLimitMinutes,
      title,
    });
  }, [
    description,
    instructions,
    maxAttempts,
    passingScore,
    shuffleOptions,
    shuffleQuestions,
    status,
    scheduleSettingsSave,
    timeLimitMinutes,
    title,
  ]);

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              aria-label="Kembali ke assessment"
              onClick={() => {
                void flushSettingsSave()
                  .then(onBack)
                  .catch(() => undefined);
              }}
              size="icon"
              type="button"
              variant="outline"
            >
              <ArrowLeftIcon />
            </Button>
            <div className="min-w-0">
              <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                <ClipboardCheckIcon className="size-3.5" />
                {assessment ? "Edit assessment" : "Assessment baru"}
              </div>
              <h1 className="font-heading truncate text-2xl font-semibold tracking-tight">
                {title.trim() || "Assessment tanpa judul"}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {assessment && canDelete ? (
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button type="button" variant="destructive" size="icon" />
                  }
                >
                  <Trash2Icon />
                  <span className="sr-only">Hapus assessment</span>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Hapus assessment ini?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Semua soal dan opsi di dalamnya akan ikut dihapus. Jika
                      assessment sedang dipakai course, penghapusan dapat gagal.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={isDeleting}
                      onClick={() => {
                        cancelSettingsSave();
                        void flushSettingsSave()
                          .then(onDelete)
                          .catch(() => undefined);
                      }}
                      variant="destructive"
                    >
                      {isDeleting && (
                        <LoaderCircleIcon className="animate-spin" />
                      )}
                      Hapus
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start">
          <section className="grid min-w-0 gap-6">
            <Card className="gap-0 py-0 shadow-sm">
              <CardHeader className="relative overflow-hidden rounded-none bg-foreground px-5 py-6 text-background sm:px-6">
                <div className="pointer-events-none absolute top-0 right-0 size-44 translate-x-14 -translate-y-20 rounded-full border border-current opacity-10" />
                <div className="pointer-events-none absolute top-0 right-0 size-28 translate-x-8 -translate-y-12 rounded-full border border-current opacity-10" />
                <div className="relative flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-background/10">
                    <Settings2Icon className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                      Setup assessment
                    </p>
                    <CardTitle className="mt-1 text-xl font-semibold text-background">
                      Pengaturan assessment
                    </CardTitle>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      Atur identitas dan petunjuk sebelum menyusun soal.
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-5 p-5 sm:p-6">
                <div className="grid gap-2">
                  <Label htmlFor="assessment-title">Judul</Label>
                  <Input
                    autoFocus={!assessment}
                    id="assessment-title"
                    maxLength={200}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Mis. Evaluasi Bab 1"
                    value={title}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="assessment-description">Deskripsi</Label>
                  <Textarea
                    id="assessment-description"
                    maxLength={10000}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Jelaskan tujuan assessment ini kepada siswa."
                    rows={3}
                    value={description}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Petunjuk pengerjaan</Label>
                  <div className="overflow-hidden rounded-lg border">
                    <DynamicBlockNoteEditor
                      initialContent={toBlockNoteDocument(
                        assessment?.instructions,
                      )}
                      onChange={setInstructions}
                      trailingBlock={false}
                      theme={editorTheme}
                      assetStorage={assetStorage}
                    />
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Gunakan menu / untuk menambahkan gambar atau audio.
                  </p>
                </div>
              </CardContent>
            </Card>

            {assessment ? (
              <section className="grid gap-4 border-t pt-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="font-heading text-xl font-semibold">Soal</h2>
                    <p className="text-muted-foreground text-sm">
                      Soal baru ditambahkan di bagian paling bawah. Router saat
                      ini belum menyediakan pengurutan manual.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {assessment.questions.length} soal
                    </Badge>
                    <Button
                      disabled={questionBusy}
                      onClick={onAddQuestion}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <PlusIcon data-icon="inline-start" />
                      Tambah soal
                    </Button>
                  </div>
                </div>

                {assessment.questions.length ? (
                  <div className="grid gap-4">
                    {assessment.questions.map((question, index) => (
                      <QuestionCard
                        busy={questionBusy}
                        highlighted={activeQuestionId === question.id}
                        index={index}
                        key={question.id}
                        onAddOption={onAddOption}
                        onDeleteOption={onDeleteOption}
                        onDeleteQuestion={onDeleteQuestion}
                        onSave={onSaveQuestion}
                        onSaveOption={onSaveOption}
                        onToggleCorrect={onToggleCorrect}
                        question={question}
                        theme={editorTheme}
                        assetStorage={assetStorage}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-muted-foreground bg-muted/20 rounded-xl border border-dashed px-6 py-10 text-center text-sm">
                    Tambahkan soal pertama untuk mulai membangun assessment.
                  </div>
                )}
              </section>
            ) : (
              <div className="bg-muted/20 text-muted-foreground rounded-xl border border-dashed px-6 py-10 text-center text-sm">
                Isi detail assessment terlebih dahulu, lalu tambahkan soal dan
                opsi jawaban. Perubahan disimpan otomatis.
              </div>
            )}
          </section>

          <aside className="grid min-w-0 gap-4 lg:sticky lg:top-6">
            <div className="bg-card grid gap-5 rounded-xl border p-5 shadow-xs">
              <div className="grid gap-2">
                <Label htmlFor="assessment-status">Status</Label>
                <Select
                  disabled={!assessment}
                  value={status}
                  onValueChange={(value) => {
                    if (
                      value === "DRAFT" ||
                      value === "PUBLISHED" ||
                      value === "ARCHIVED"
                    ) {
                      setStatus(value);
                    }
                  }}
                >
                  <SelectTrigger className="w-full" id="assessment-status">
                    <SelectValue>{assessmentStatusLabels[status]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="PUBLISHED">Published</SelectItem>
                    <SelectItem value="ARCHIVED">Archived</SelectItem>
                  </SelectContent>
                </Select>
                {!assessment ? (
                  <p className="text-muted-foreground text-xs">
                    Assessment baru disimpan sebagai draft. Tambahkan soal lalu
                    publish dari halaman edit.
                  </p>
                ) : status === "PUBLISHED" && !assessment.questions.length ? (
                  <p className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                    <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" />
                    Tambahkan soal sebelum memasang assessment ke course.
                  </p>
                ) : null}
              </div>

              <div className="grid gap-4 border-t pt-5">
                <NumberField
                  id="assessment-passing-score"
                  label="Nilai lulus (%)"
                  max={100}
                  min={0}
                  onChange={setPassingScore}
                  placeholder="Kosongkan jika tidak ada"
                  value={passingScore}
                />
                <NumberField
                  id="assessment-max-attempts"
                  label="Maksimal percobaan"
                  min={1}
                  onChange={setMaxAttempts}
                  placeholder="Kosongkan jika tidak dibatasi"
                  value={maxAttempts}
                />
                <NumberField
                  id="assessment-time-limit"
                  label="Batas waktu (menit)"
                  min={1}
                  onChange={setTimeLimitMinutes}
                  placeholder="Kosongkan jika tanpa batas"
                  value={timeLimitMinutes}
                />
              </div>

              <div className="grid gap-4 border-t pt-5">
                <ToggleField
                  checked={shuffleQuestions}
                  description="Acak urutan soal untuk setiap attempt."
                  label="Acak soal"
                  onCheckedChange={setShuffleQuestions}
                />
                <ToggleField
                  checked={shuffleOptions}
                  description="Acak urutan opsi untuk setiap attempt."
                  label="Acak opsi"
                  onCheckedChange={setShuffleOptions}
                />
              </div>
            </div>

            <div className="bg-card grid gap-3 rounded-xl border p-4 shadow-xs">
              <div>
                <h2 className="font-heading text-sm font-semibold">
                  Peta soal
                </h2>
                <p className="text-muted-foreground text-xs">
                  Lompat langsung ke soal yang ingin diedit.
                </p>
              </div>
              {assessment?.questions.length ? (
                <nav aria-label="Navigasi soal" className="grid min-w-0 gap-1">
                  {questionMapItems.map((item) => (
                    <Button
                      aria-current={
                        activeQuestionId === item.id ? "location" : undefined
                      }
                      className="h-auto w-full min-w-0 justify-start gap-2 px-2 py-2"
                      key={item.id}
                      onClick={() => navigateToQuestion(item.id)}
                      type="button"
                      variant={
                        activeQuestionId === item.id ? "secondary" : "ghost"
                      }
                    >
                      <span className="bg-muted text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded text-xs font-medium">
                        {item.index + 1}
                      </span>
                      <span className="min-w-0 truncate">{item.label}</span>
                      <span className="text-muted-foreground ml-auto text-xs">
                        {item.points} poin
                      </span>
                    </Button>
                  ))}
                </nav>
              ) : (
                <p className="text-muted-foreground rounded-md border border-dashed px-3 py-4 text-center text-xs">
                  Belum ada soal.
                </p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function NumberField({
  id,
  label,
  max,
  min,
  onChange,
  placeholder,
  value,
}: {
  id: string;
  label: string;
  max?: number;
  min: number;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        inputMode="numeric"
        max={max}
        min={min}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type="number"
        value={value}
      />
    </div>
  );
}

function ToggleField({
  checked,
  description,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  description: string;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="grid gap-0.5">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-muted-foreground text-xs">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

type QuestionDraft = {
  explanation: BlockNoteDocument;
  points: string;
  prompt: BlockNoteDocument;
  type: QuestionType;
};

type QuestionCardProps = {
  busy: boolean;
  highlighted: boolean;
  index: number;
  onAddOption: (questionId: string) => Promise<void>;
  onDeleteOption: (optionId: string) => Promise<void>;
  onDeleteQuestion: (questionId: string) => Promise<void>;
  onSave: (questionId: string, value: QuestionFields) => Promise<boolean>;
  onSaveOption: (
    optionId: string,
    content: BlockNoteDocument,
  ) => Promise<boolean>;
  onToggleCorrect: (
    question: Question,
    optionId: string,
    checked: boolean,
  ) => Promise<void>;
  question: Question;
  theme: "light" | "dark";
  assetStorage?: EditorAssetStorageOptions;
};

const QuestionCard = memo(function QuestionCard({
  busy,
  highlighted,
  index,
  onAddOption,
  onDeleteOption,
  onDeleteQuestion,
  onSave,
  onSaveOption,
  onToggleCorrect,
  question,
  theme,
  assetStorage,
}: QuestionCardProps) {
  const [type, setType] = useState<QuestionType>(question.type);
  const [prompt, setPrompt] = useState<BlockNoteDocument>(
    toBlockNoteDocument(question.prompt) as BlockNoteDocument,
  );
  const [explanation, setExplanation] = useState<BlockNoteDocument>(
    toBlockNoteDocument(question.explanation) as BlockNoteDocument,
  );
  const [points, setPoints] = useState(String(question.points));
  const [correctAnswerBusy, setCorrectAnswerBusy] = useState(false);

  const { cancel: cancelQuestionSave, schedule: scheduleQuestionSave } =
    useDebouncedAutosave<QuestionDraft>(async (draft) => {
      const parsedPoints = Number(draft.points);
      if (!hasBlockNoteContent(draft.prompt)) {
        toast.error("Pertanyaan wajib diisi.");
        return;
      }
      if (!Number.isInteger(parsedPoints) || parsedPoints < 1) {
        toast.error("Poin soal harus berupa bilangan bulat positif.");
        return;
      }

      const saved = await onSave(question.id, {
        type: draft.type,
        prompt: draft.prompt,
        explanation: hasBlockNoteContent(draft.explanation)
          ? draft.explanation
          : null,
        points: parsedPoints,
      });
      if (!saved) throw new Error("Question autosave failed");
    });
  const skipInitialQuestionSave = useRef(true);

  useEffect(() => {
    if (skipInitialQuestionSave.current) {
      skipInitialQuestionSave.current = false;
      return;
    }

    scheduleQuestionSave({ explanation, points, prompt, type });
  }, [explanation, points, prompt, scheduleQuestionSave, type]);

  return (
    <Card
      className={
        highlighted
          ? "bg-muted/20 scroll-mt-24 transition-colors duration-300"
          : "scroll-mt-24 transition-colors duration-300"
      }
      data-question-id={question.id}
      id={`assessment-question-${question.id}`}
    >
      <CardHeader className="border-b">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <span className="bg-muted text-muted-foreground flex size-7 items-center justify-center rounded-md text-xs">
              {index + 1}
            </span>
            Soal {index + 1}
          </CardTitle>
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  aria-label={`Hapus soal ${index + 1}`}
                  disabled={busy}
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
                <AlertDialogTitle>Hapus soal ini?</AlertDialogTitle>
                <AlertDialogDescription>
                  Soal dan semua opsi jawabannya akan dihapus permanen.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction
                  disabled={busy}
                  onClick={() => {
                    cancelQuestionSave();
                    void onDeleteQuestion(question.id);
                  }}
                  variant="destructive"
                >
                  Hapus
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Pertanyaan</Label>
            <div className="overflow-hidden rounded-lg border">
              <DynamicBlockNoteEditor
                initialContent={toBlockNoteDocument(question.prompt)}
                onChange={setPrompt}
                trailingBlock={false}
                theme={theme}
                assetStorage={assetStorage}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem]">
            <div className="grid gap-2">
              <Label htmlFor={`question-type-${question.id}`}>Tipe soal</Label>
              <Select
                value={type}
                onValueChange={(value) => {
                  if (
                    value === "SINGLE_CHOICE" ||
                    value === "MULTIPLE_CHOICE" ||
                    value === "WRITTEN"
                  ) {
                    setType(value);
                  }
                }}
              >
                <SelectTrigger
                  className="w-full"
                  id={`question-type-${question.id}`}
                >
                  <SelectValue>{questionTypeLabels[type]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SINGLE_CHOICE">Pilihan tunggal</SelectItem>
                  <SelectItem value="MULTIPLE_CHOICE">Pilihan ganda</SelectItem>
                  <SelectItem value="WRITTEN">Jawaban tertulis</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`question-points-${question.id}`}>Poin</Label>
              <Input
                id={`question-points-${question.id}`}
                min={1}
                onChange={(event) => setPoints(event.target.value)}
                type="number"
                value={points}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Penjelasan jawaban (opsional)</Label>
            <div className="overflow-hidden rounded-lg border">
              <DynamicBlockNoteEditor
                initialContent={toBlockNoteDocument(question.explanation)}
                onChange={setExplanation}
                trailingBlock={false}
                theme={theme}
                assetStorage={assetStorage}
              />
            </div>
          </div>
        </div>

        {type === "WRITTEN" && question.options.length ? (
          <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
            <p>
              Opsi lama dipertahankan dan bisa dihapus satu per satu, tetapi
              akan diabaikan oleh sistem untuk soal tertulis. Jika tipe
              dikembalikan, opsi tersebut akan muncul lagi.
            </p>
          </div>
        ) : null}

        {type !== "WRITTEN" || question.options.length ? (
          <div className="grid gap-3 border-t pt-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-heading font-semibold">Opsi jawaban</h3>
                <p className="text-muted-foreground text-xs">
                  {type === "MULTIPLE_CHOICE"
                    ? "Tandai semua opsi yang benar."
                    : type === "SINGLE_CHOICE"
                      ? "Tandai satu opsi yang benar."
                      : "Opsi tersimpan hanya untuk menjaga data saat tipe berubah."}
                </p>
              </div>
              {type !== "WRITTEN" ? (
                <Button
                  disabled={
                    busy || question.options.length >= MAX_ASSESSMENT_OPTIONS
                  }
                  onClick={() => onAddOption(question.id)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <PlusIcon data-icon="inline-start" />
                  {question.options.length >= MAX_ASSESSMENT_OPTIONS
                    ? "Maksimal 4 opsi"
                    : "Tambah opsi"}
                </Button>
              ) : null}
            </div>
            {question.options.length ? (
              <div className="grid gap-2">
                {question.options.map((option, optionIndex) => (
                  <OptionRow
                    busy={busy}
                    canDelete={
                      type === "WRITTEN" ||
                      question.options.length > MIN_ASSESSMENT_OPTIONS
                    }
                    correctAnswerBusy={correctAnswerBusy}
                    index={optionIndex}
                    key={option.id}
                    onDelete={() => onDeleteOption(option.id)}
                    onToggleCorrect={async (checked) => {
                      setCorrectAnswerBusy(true);
                      try {
                        await onToggleCorrect(question, option.id, checked);
                      } finally {
                        setCorrectAnswerBusy(false);
                      }
                    }}
                    onSave={(content) => onSaveOption(option.id, content)}
                    option={option}
                    theme={theme}
                    assetStorage={assetStorage}
                  />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-4 text-center text-xs">
                Belum ada opsi. Tambahkan setidaknya dua opsi untuk soal
                pilihan.
              </p>
            )}
          </div>
        ) : (
          <div className="bg-muted/30 text-muted-foreground flex items-start gap-2 rounded-lg border p-3 text-xs">
            <FileQuestionIcon className="mt-0.5 size-4 shrink-0" />
            Soal tertulis akan diperiksa manual setelah siswa mengirim jawaban.
          </div>
        )}
      </CardContent>
    </Card>
  );
}, areQuestionCardPropsEqual);

function areQuestionCardPropsEqual(
  previous: QuestionCardProps,
  next: QuestionCardProps,
) {
  return (
    previous.busy === next.busy &&
    previous.highlighted === next.highlighted &&
    previous.index === next.index &&
    previous.question === next.question &&
    previous.theme === next.theme
  );
}

type OptionRowProps = {
  busy: boolean;
  canDelete: boolean;
  correctAnswerBusy: boolean;
  index: number;
  onDelete: () => Promise<void>;
  onSave: (content: BlockNoteDocument) => Promise<boolean>;
  onToggleCorrect: (checked: boolean) => Promise<void>;
  option: Question["options"][number];
  theme: "light" | "dark";
  assetStorage?: EditorAssetStorageOptions;
};

const OptionRow = memo(function OptionRow({
  busy,
  canDelete,
  correctAnswerBusy,
  index,
  onDelete,
  onSave,
  onToggleCorrect,
  option,
  theme,
  assetStorage,
}: OptionRowProps) {
  const [content, setContent] = useState<BlockNoteDocument>(
    toBlockNoteDocument(option.content) as BlockNoteDocument,
  );
  const [editing, setEditing] = useState(false);
  const editorAreaRef = useRef<HTMLDivElement>(null);

  const {
    cancel: cancelOptionSave,
    flush: flushOptionSave,
    schedule: scheduleOptionSave,
  } = useDebouncedAutosave<BlockNoteDocument>(async (nextContent) => {
    if (!hasBlockNoteContent(nextContent)) {
      toast.error("Isi opsi wajib diisi.");
      return;
    }

    const saved = await onSave(nextContent);
    if (!saved) throw new Error("Option autosave failed");
  });
  const skipInitialOptionSave = useRef(true);

  useEffect(() => {
    if (!editing) return;
    if (skipInitialOptionSave.current) {
      skipInitialOptionSave.current = false;
      return;
    }

    scheduleOptionSave(content);
  }, [content, editing, scheduleOptionSave]);

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
    skipInitialOptionSave.current = true;
    setEditing(true);
  };

  return (
    <div className="bg-muted/20 flex items-center gap-2 rounded-lg border px-3 py-2">
      <Checkbox
        aria-label={`Tandai opsi ${index + 1} sebagai jawaban benar`}
        checked={option.isCorrect}
        disabled={busy || correctAnswerBusy}
        onCheckedChange={(checked) => void onToggleCorrect(checked === true)}
      />
      <span className="text-foreground w-8 shrink-0 text-center text-2xl leading-none font-semibold">
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
            onChange={setContent}
            trailingBlock={false}
            theme={theme}
            assetStorage={assetStorage}
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
                void flushOptionSave()
                  .then(onDelete)
                  .catch(() => undefined);
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
}, areOptionRowPropsEqual);

function areOptionRowPropsEqual(
  previous: OptionRowProps,
  next: OptionRowProps,
) {
  return (
    previous.busy === next.busy &&
    previous.canDelete === next.canDelete &&
    previous.correctAnswerBusy === next.correctAnswerBusy &&
    previous.index === next.index &&
    previous.option === next.option &&
    previous.theme === next.theme
  );
}
