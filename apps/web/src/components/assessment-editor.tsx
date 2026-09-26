"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactElement,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ClipboardCheckIcon,
  FileQuestionIcon,
  ListIcon,
  LoaderCircleIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import {
  DynamicBlockNoteEditor,
  type BlockNoteDocument,
  type EditorAssetStorageOptions,
} from "~/components/editor";
import { EditorSidebar } from "~/components/editor-sidebar";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet";
import { Switch } from "~/components/ui/switch";
import { useDebouncedAutosave } from "~/hooks/use-debounced-autosave";
import { cn } from "~/lib/utils";
import {
  createAutosaveRegistry,
  type AutosaveRegistry,
  type AutosaveStatus,
} from "~/lib/autosave-registry";
import {
  createDraftKey,
  getContentLocalStore,
  type AssessmentDraftPayload,
  type ContentDbScope,
} from "~/lib/content-db";
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
import { getAssessmentPublishValidationError } from "~/lib/assessment-publication";
import { api, type RouterOutputs } from "~/trpc/react";
import { authClient } from "~/server/better-auth/client";
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

const autosaveStatusLabels: Record<AutosaveStatus, string> = {
  idle: "Semua perubahan tersimpan",
  pending: "Menunggu untuk disimpan…",
  saving: "Menyimpan…",
  saved: "Semua perubahan tersimpan",
  error: "Perubahan belum tersimpan",
};

function toAssessmentDraftPayload(
  assessment: Assessment,
): AssessmentDraftPayload {
  return {
    title: assessment.title,
    description: assessment.description,
    status: assessment.status,
    editorSchemaVersion: assessment.editorSchemaVersion,
    instructions: assessment.instructions ?? undefined,
    passingScore: assessment.passingScore,
    maxAttempts: assessment.maxAttempts,
    timeLimitMinutes: assessment.timeLimitMinutes,
    shuffleQuestions: assessment.shuffleQuestions,
    shuffleOptions: assessment.shuffleOptions,
    questions: assessment.questions.map((question) => ({
      clientId: question.id,
      serverId: question.id,
      type: question.type,
      prompt: question.prompt,
      explanation: question.explanation ?? undefined,
      points: question.points,
      options: question.options.map((option) => ({
        clientId: option.id,
        serverId: option.id,
        content: option.content,
        isCorrect: option.isCorrect,
      })),
    })),
  };
}

function contentLocalStoreOrNull() {
  try {
    return getContentLocalStore();
  } catch {
    return null;
  }
}

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

function getQuestionIssue(question: Question) {
  if (!hasBlockNoteContent(question.prompt)) {
    return "Pertanyaan belum diisi";
  }
  if (question.type === "WRITTEN") return null;
  if (question.options.length < MIN_ASSESSMENT_OPTIONS) {
    return "Kurang dari dua opsi";
  }
  if (question.options.some((option) => !hasBlockNoteContent(option.content))) {
    return "Ada opsi yang kosong";
  }
  const correctOptions = question.options.filter(
    (option) => option.isCorrect,
  ).length;
  if (question.type === "SINGLE_CHOICE" && correctOptions !== 1) {
    return "Harus tepat satu jawaban benar";
  }
  if (question.type === "MULTIPLE_CHOICE" && correctOptions < 1) {
    return "Belum ada jawaban benar";
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
  attachTo,
}: {
  organizationId: string;
  organizationSlug: string;
  assessmentId?: string;
  pickerToken?: string;
  returnTo?: string;
  attachTo?: {
    moduleId: string;
    moduleTitle: string;
    curriculumHref: string;
    editorBaseHref: string;
  };
}) {
  const router = useRouter();
  const utils = api.useUtils();
  const { data: session } = authClient.useSession();
  const assessment = api.assessment.get.useQuery(
    { assessmentId: assessmentId ?? "" },
    { enabled: Boolean(assessmentId) },
  );
  const createAssessment = api.assessment.create.useMutation();
  const createAssessmentItem = api.content.createAssessmentItem.useMutation();
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
  // Every page rendering the editor already verified organization membership on the server
  // (the delete procedure re-checks authorship), so no client-side organization fetch is needed.
  const canDelete = !attachTo;
  const sessionUserId = session?.user.id;
  const draftScope = useMemo(
    () =>
      sessionUserId ? { organizationId, userId: sessionUserId } : undefined,
    [organizationId, sessionUserId],
  );

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
      draftScope={draftScope}
      contextLabel={
        attachTo ? `Assessment untuk ${attachTo.moduleTitle}` : undefined
      }
      canDelete={canDelete}
      isDeleting={deleteAssessment.isPending}
      onBack={() => {
        if (attachTo) {
          router.replace(attachTo.curriculumHref);
          return;
        }
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
            content: [{ type: "paragraph", content: "" }],
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
          const created = await createQuestion.mutateAsync({
            assessmentId,
            type: "SINGLE_CHOICE",
            prompt: [{ type: "paragraph", content: "" }],
            explanation: null,
            points: 1,
          });
          await refreshQuestions();
          toast.success("Soal ditambahkan.");
          return created.id;
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

          const createdId = attachTo
            ? (
                await createAssessmentItem.mutateAsync({
                  moduleId: attachTo.moduleId,
                  title: value.title,
                  description: value.description,
                  editorSchemaVersion: 1,
                  instructions: value.instructions ?? undefined,
                  passingScore: value.passingScore,
                  maxAttempts: value.maxAttempts,
                  timeLimitMinutes: value.timeLimitMinutes,
                  shuffleQuestions: value.shuffleQuestions,
                  shuffleOptions: value.shuffleOptions,
                })
              ).assessment.id
            : (
                await createAssessment.mutateAsync({
                  organizationId,
                  ...value,
                  editorSchemaVersion: 1,
                })
              ).id;
          createdAssessmentIdRef.current = createdId;
          await utils.assessment.list.invalidate({ organizationId });
          toast.success(
            attachTo
              ? `Assessment ditambahkan ke ${attachTo.moduleTitle}. Tambahkan soal pertama Anda.`
              : "Assessment dibuat. Tambahkan soal pertama Anda.",
          );
          router.replace(
            attachTo
              ? `${attachTo.editorBaseHref}/${createdId}`
              : `/workspace/${organizationSlug}/library/assessments/${createdId}${resourcePickerQuery(pickerToken, returnTo)}`,
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
  draftScope,
  canDelete,
  contextLabel,
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
  draftScope?: ContentDbScope;
  canDelete: boolean;
  contextLabel?: string;
  isDeleting: boolean;
  onBack: () => void;
  assetStorage?: EditorAssetStorageOptions;
  questionBusy: boolean;
  onAddOption: (questionId: string) => Promise<void>;
  onAddQuestion: () => Promise<string | undefined>;
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
  const assessmentDraftId = assessment?.id;
  const draftOrganizationId = draftScope?.organizationId;
  const draftUserId = draftScope?.userId;
  const [recoveredDraft, setRecoveredDraft] = useState<{
    payload: AssessmentDraftPayload;
    updatedAt: number;
  } | null>(null);
  const latestDraftRef = useRef<AssessmentDraftPayload | null>(
    assessment ? toAssessmentDraftPayload(assessment) : null,
  );
  const draftWriteRef = useRef<Promise<unknown>>(Promise.resolve());
  const hasLocalChangesRef = useRef(false);
  const sawUnsavedAutosaveRef = useRef(false);
  const [autosaveRegistry] = useState(createAutosaveRegistry);
  const autosaveStatus = useSyncExternalStore<AutosaveStatus>(
    autosaveRegistry.subscribe,
    autosaveRegistry.getStatus,
    () => "idle",
  );
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [newQuestionId, setNewQuestionId] = useState<string | null>(null);
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(
    null,
  );
  // Keeps a collapsing row's editor mounted until its close animation
  // finishes, then drops it. Driven from the toggle handler (not an
  // effect) so it never trips set-state-in-effect.
  const [closingQuestionId, setClosingQuestionId] = useState<string | null>(
    null,
  );
  const [pendingQuestionNavigationId, setPendingQuestionNavigationId] =
    useState<string | null>(null);
  const [questionNavigatorOpen, setQuestionNavigatorOpen] = useState(false);
  const [questionNavigatorTargetId, setQuestionNavigatorTargetId] = useState<
    string | null
  >(null);
  // While a row is expanding/collapsing, rows glide under a stationary
  // cursor and would each briefly match :hover. Freeze the hover-revealed
  // row actions for the duration of the animation so they can't flash.
  const [hoverActionsFrozen, setHoverActionsFrozen] = useState(false);
  const hoverFreezeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const skipInitialHoverFreeze = useRef(true);

  function toggleQuestion(questionId: string) {
    if (expandedQuestionId === questionId) {
      setExpandedQuestionId(null);
      setClosingQuestionId(questionId);
      setTimeout(() => {
        setClosingQuestionId((current) =>
          current === questionId ? null : current,
        );
      }, 300);
    } else {
      setClosingQuestionId(null);
      setExpandedQuestionId(questionId);
    }
  }

  const openQuestion = useCallback((questionId: string) => {
    setClosingQuestionId(null);
    setExpandedQuestionId(questionId);
    requestAnimationFrame(() => {
      document
        .getElementById(`assessment-question-${questionId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);
  const displayQuestions = useMemo(() => {
    if (!assessment) return [];
    if (!recoveredDraft) return assessment.questions;

    return assessment.questions.map((question) => {
      const recoveredQuestion = recoveredDraft.payload.questions.find(
        (candidate) => candidate.serverId === question.id,
      );
      if (!recoveredQuestion) return question;
      return {
        ...question,
        type: recoveredQuestion.type,
        prompt: recoveredQuestion.prompt as Question["prompt"],
        explanation: recoveredQuestion.explanation ?? null,
        points: recoveredQuestion.points,
        options: question.options.map((option) => {
          const recoveredOption = recoveredQuestion.options.find(
            (candidate) => candidate.serverId === option.id,
          );
          return recoveredOption
            ? {
                ...option,
                content:
                  recoveredOption.content as Question["options"][number]["content"],
                isCorrect: recoveredOption.isCorrect,
              }
            : option;
        }),
      };
    });
  }, [assessment, recoveredDraft]);
  const questionMapItems = useMemo(
    () =>
      displayQuestions.map((question, index) => ({
        id: question.id,
        index,
        label: getBlockNotePlainText(question.prompt) || `Soal ${index + 1}`,
        points: question.points,
      })),
    [displayQuestions],
  );
  const totalPoints = useMemo(
    () => displayQuestions.reduce((sum, question) => sum + question.points, 0),
    [displayQuestions],
  );
  const questionIdKey = useMemo(
    () => questionMapItems.map((item) => item.id).join("\u0000"),
    [questionMapItems],
  );

  const queueDraftUpdate = useCallback(
    (update: (current: AssessmentDraftPayload) => AssessmentDraftPayload) => {
      if (!assessmentDraftId || !draftOrganizationId || !draftUserId) return;
      const current = latestDraftRef.current;
      if (!current) return;
      const next = update(current);
      latestDraftRef.current = next;
      hasLocalChangesRef.current = true;
      const store = contentLocalStoreOrNull();
      if (!store) {
        toast.error(
          "Cadangan lokal tidak tersedia. Jangan tutup halaman sebelum perubahan tersimpan.",
        );
        return;
      }
      draftWriteRef.current = draftWriteRef.current
        .catch(() => undefined)
        .then(() =>
          store.saveDraft({
            organizationId: draftOrganizationId,
            userId: draftUserId,
            entityType: "assessment",
            entityId: assessmentDraftId,
            editorSchemaVersion: 1,
            payload: next,
          }),
        )
        .catch(() => {
          toast.error(
            "Cadangan lokal tidak dapat disimpan. Jangan tutup halaman ini.",
          );
        });
    },
    [assessmentDraftId, draftOrganizationId, draftUserId],
  );

  const saveQuestionDraft = useCallback(
    (questionId: string, value: QuestionFields) => {
      queueDraftUpdate((current) => ({
        ...current,
        questions: current.questions.map((question) =>
          question.serverId === questionId
            ? {
                ...question,
                type: value.type,
                prompt: value.prompt,
                explanation: value.explanation ?? undefined,
                points: value.points,
              }
            : question,
        ),
      }));
    },
    [queueDraftUpdate],
  );

  const saveOptionDraft = useCallback(
    (questionId: string, optionId: string, content: BlockNoteDocument) => {
      queueDraftUpdate((current) => ({
        ...current,
        questions: current.questions.map((question) =>
          question.serverId === questionId
            ? {
                ...question,
                options: question.options.map((option) =>
                  option.serverId === optionId
                    ? { ...option, content }
                    : option,
                ),
              }
            : question,
        ),
      }));
    },
    [queueDraftUpdate],
  );

  useEffect(() => {
    if (skipInitialHoverFreeze.current) {
      skipInitialHoverFreeze.current = false;
      return;
    }
    setHoverActionsFrozen(true);
    if (hoverFreezeTimeoutRef.current !== null) {
      clearTimeout(hoverFreezeTimeoutRef.current);
    }
    hoverFreezeTimeoutRef.current = setTimeout(() => {
      setHoverActionsFrozen(false);
      hoverFreezeTimeoutRef.current = null;
    }, 350);
    return () => {
      if (hoverFreezeTimeoutRef.current !== null) {
        clearTimeout(hoverFreezeTimeoutRef.current);
        hoverFreezeTimeoutRef.current = null;
      }
    };
  }, [expandedQuestionId]);

  useEffect(() => {
    if (!newQuestionId) return;
    const timeout = setTimeout(() => setNewQuestionId(null), 1600);
    return () => clearTimeout(timeout);
  }, [newQuestionId]);

  useEffect(() => {
    if (assessment && !hasLocalChangesRef.current && !recoveredDraft) {
      latestDraftRef.current = toAssessmentDraftPayload(assessment);
    }
  }, [assessment, recoveredDraft]);

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

  useEffect(() => {
    if (
      !pendingQuestionNavigationId ||
      !questionMapItems.some(({ id }) => id === pendingQuestionNavigationId)
    ) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      document
        .getElementById(`assessment-question-${pendingQuestionNavigationId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      setPendingQuestionNavigationId(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [pendingQuestionNavigationId, questionMapItems]);

  useEffect(() => {
    if (questionNavigatorOpen || !questionNavigatorTargetId) return;

    const timeout = window.setTimeout(() => {
      openQuestion(questionNavigatorTargetId);
      setQuestionNavigatorTargetId(null);
    }, 200);
    return () => window.clearTimeout(timeout);
  }, [openQuestion, questionNavigatorOpen, questionNavigatorTargetId]);

  const addQuestion = () => {
    void autosaveRegistry
      .flushAll()
      .then(async () => {
        const createdQuestionId = await onAddQuestion();
        if (createdQuestionId) {
          setClosingQuestionId(null);
          setExpandedQuestionId(createdQuestionId);
          setNewQuestionId(createdQuestionId);
          setPendingQuestionNavigationId(createdQuestionId);
        }
      })
      .catch(() =>
        toast.error(
          "Simpan perubahan yang gagal sebelum menambahkan soal baru.",
        ),
      );
  };

  const {
    cancel: cancelSettingsSave,
    flush: flushSettingsSave,
    schedule: scheduleSettingsSave,
    status: settingsSaveStatus,
  } = useDebouncedAutosave<AssessmentDraft>(async (draft) => {
    const normalizedTitle = draft.title.trim();
    if (!normalizedTitle) {
      toast.error("Judul assessment wajib diisi.");
      throw new Error("Assessment title is required");
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
      throw new Error("Assessment numeric settings are invalid");
    }
    if (draft.status === "PUBLISHED") {
      if (!assessment) {
        toast.error(
          "Buat assessment sebagai draft terlebih dahulu, lalu tambahkan soal sebelum publish.",
        );
        throw new Error("Assessment must be created before publishing");
      }
      const validationError =
        getAssessmentPublishValidationError(displayQuestions);
      if (validationError) {
        toast.error(validationError);
        throw new Error(validationError);
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

  useEffect(
    () => autosaveRegistry.register("settings", flushSettingsSave),
    [autosaveRegistry, flushSettingsSave],
  );

  useEffect(() => {
    autosaveRegistry.setStatus("settings", settingsSaveStatus);
  }, [autosaveRegistry, settingsSaveStatus]);

  useEffect(() => {
    if (
      autosaveStatus === "pending" ||
      autosaveStatus === "saving" ||
      autosaveStatus === "error"
    ) {
      sawUnsavedAutosaveRef.current = true;
    }
    if (
      autosaveStatus !== "pending" &&
      autosaveStatus !== "saving" &&
      autosaveStatus !== "error"
    ) {
      return;
    }

    const warnAboutUnsavedChanges = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnAboutUnsavedChanges);
    return () =>
      window.removeEventListener("beforeunload", warnAboutUnsavedChanges);
  }, [autosaveStatus]);

  useEffect(() => {
    if (
      autosaveStatus !== "saved" ||
      !assessment ||
      !draftScope ||
      !hasLocalChangesRef.current ||
      !sawUnsavedAutosaveRef.current
    ) {
      return;
    }

    const draftKey = createDraftKey(draftScope, "assessment", assessment.id);
    const store = contentLocalStoreOrNull();
    if (!store) return;
    hasLocalChangesRef.current = false;
    sawUnsavedAutosaveRef.current = false;
    draftWriteRef.current = draftWriteRef.current
      .catch(() => undefined)
      .then(() => store.deleteDraft(draftKey))
      .then(() => setRecoveredDraft(null))
      .catch(() => {
        hasLocalChangesRef.current = true;
      });
  }, [assessment, autosaveStatus, draftScope]);

  const skipInitialSettingsSave = useRef(true);
  // Settings only autosave after the user (or draft recovery) actually
  // changes them. A boolean "skip first run" ref is not enough under
  // StrictMode's double-invoked mount effects — the discarded first pass
  // would flip it and make the second pass look like a real edit.
  const settingsTouchedRef = useRef(false);
  const loadedDraftKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!assessment || !draftScope) return;
    const draftKey = createDraftKey(draftScope, "assessment", assessment.id);
    if (loadedDraftKeyRef.current === draftKey) return;
    loadedDraftKeyRef.current = draftKey;

    let cancelled = false;
    const store = contentLocalStoreOrNull();
    if (!store) return;
    void store
      .getDraft(draftScope, "assessment", assessment.id)
      .then((draft) => {
        if (cancelled) return;
        if (!draft || draft.syncStatus === "clean") {
          latestDraftRef.current = toAssessmentDraftPayload(assessment);
          return;
        }

        latestDraftRef.current = draft.payload;
        hasLocalChangesRef.current = true;
        skipInitialSettingsSave.current = false;
        settingsTouchedRef.current = true;
        setTitle(draft.payload.title);
        setDescription(draft.payload.description ?? "");
        setStatus(draft.payload.status);
        setInstructions(
          toBlockNoteDocument(draft.payload.instructions) as BlockNoteDocument,
        );
        setPassingScore(draft.payload.passingScore?.toString() ?? "");
        setMaxAttempts(draft.payload.maxAttempts?.toString() ?? "");
        setTimeLimitMinutes(draft.payload.timeLimitMinutes?.toString() ?? "");
        setShuffleQuestions(draft.payload.shuffleQuestions);
        setShuffleOptions(draft.payload.shuffleOptions);
        setRecoveredDraft({
          payload: draft.payload,
          updatedAt: draft.updatedAt,
        });
        toast.success("Perubahan yang belum tersimpan berhasil dipulihkan.");
      })
      .catch(() => {
        if (!cancelled) {
          toast.error("Cadangan lokal assessment tidak dapat dibuka.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [assessment, draftScope]);

  useEffect(() => {
    if (skipInitialSettingsSave.current) {
      skipInitialSettingsSave.current = false;
      return;
    }
    if (!settingsTouchedRef.current) return;

    queueDraftUpdate((current) => ({
      ...current,
      title,
      description: description.trim() || null,
      status,
      instructions: hasBlockNoteContent(instructions)
        ? instructions
        : undefined,
      passingScore:
        optionalInteger(passingScore, 0, 100) ?? current.passingScore,
      maxAttempts: optionalInteger(maxAttempts, 1) ?? current.maxAttempts,
      timeLimitMinutes:
        optionalInteger(timeLimitMinutes, 1) ?? current.timeLimitMinutes,
      shuffleQuestions,
      shuffleOptions,
    }));
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
    queueDraftUpdate,
    shuffleOptions,
    shuffleQuestions,
    status,
    scheduleSettingsSave,
    timeLimitMinutes,
    title,
  ]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            aria-label="Kembali"
            onClick={() => {
              void autosaveRegistry
                .flushAll()
                .then(onBack)
                .catch(() =>
                  toast.error(
                    "Perubahan belum berhasil disimpan. Coba lagi sebelum meninggalkan halaman.",
                  ),
                );
            }}
            size="icon"
            type="button"
            variant="outline"
          >
            <ArrowLeftIcon />
          </Button>
          <div className="min-w-0">
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
              <ClipboardCheckIcon className="size-3.5 shrink-0" />
              <span className="truncate">
                {contextLabel ??
                  (assessment ? "Assessment" : "Assessment baru")}
              </span>
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
              {autosaveStatus === "error" ? (
                <button
                  className="underline underline-offset-2"
                  onClick={() => {
                    void autosaveRegistry.flushAll().catch(() => undefined);
                  }}
                  type="button"
                >
                  Coba lagi
                </button>
              ) : null}
            </p>
          </div>
        </div>
        {assessment && canDelete ? (
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  type="button"
                  aria-label="Hapus assessment"
                  variant="destructive"
                  size="icon"
                />
              }
            >
              <Trash2Icon />
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Hapus assessment ini?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tindakan ini permanen. Semua soal, penempatan di course,
                  event, jawaban, hasil, dan progres siswa akan ikut dihapus.
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
                  {isDeleting && <LoaderCircleIcon className="animate-spin" />}
                  Hapus
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
      </header>

      <div className="grid gap-1">
        <input
          aria-label="Judul assessment"
          autoFocus={!assessment}
          className="font-heading placeholder:text-muted-foreground/40 hover:bg-muted/40 focus-visible:bg-muted/40 -mx-2 w-full min-w-0 rounded-md bg-transparent px-2 py-1 text-3xl font-semibold tracking-tight transition-colors outline-none"
          maxLength={200}
          onChange={(event) => {
            settingsTouchedRef.current = true;
            setTitle(event.target.value);
          }}
          placeholder="Assessment tanpa judul"
          value={title}
        />
        <textarea
          aria-label="Deskripsi assessment"
          className="text-muted-foreground placeholder:text-muted-foreground/40 hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:text-foreground -mx-2 field-sizing-content max-h-48 w-full resize-none rounded-md bg-transparent px-2 py-1 text-sm transition-colors outline-none"
          maxLength={10000}
          onChange={(event) => {
            settingsTouchedRef.current = true;
            setDescription(event.target.value);
          }}
          placeholder="Jelaskan tujuan assessment ini kepada siswa (opsional)…"
          rows={1}
          value={description}
        />
      </div>

      <div className="grid gap-2">
        <Label className="text-muted-foreground text-[11px] tracking-wide uppercase">
          Petunjuk pengerjaan
        </Label>
        <div className="bg-muted/20 overflow-hidden rounded-lg border">
          <DynamicBlockNoteEditor
            initialContent={instructions}
            key={`assessment-instructions:${recoveredDraft?.updatedAt ?? "server"}`}
            onChange={(value) => {
              settingsTouchedRef.current = true;
              setInstructions(value);
            }}
            placeholder="Tulis petunjuk pengerjaan..."
            trailingBlock={false}
            theme={editorTheme}
            assetStorage={assetStorage}
          />
        </div>
        <p className="text-muted-foreground text-xs">
          Gunakan menu / untuk menambahkan gambar atau audio.
        </p>
      </div>

      {assessment ? (
        <>
          <section className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-20 -mx-1 grid gap-2 px-1 pt-1 pb-3 backdrop-blur">
            <div className="flex items-center gap-2">
              <Button
                disabled={questionBusy}
                onClick={addQuestion}
                type="button"
              >
                {questionBusy ? (
                  <LoaderCircleIcon
                    className="animate-spin"
                    data-icon="inline-start"
                  />
                ) : (
                  <PlusIcon data-icon="inline-start" />
                )}
                Tambah soal
              </Button>
              <div className="ml-auto flex items-center gap-2">
                <p
                  className="text-muted-foreground hidden text-xs sm:block"
                  role="status"
                >
                  {displayQuestions.length} soal · {totalPoints} poin
                </p>
                {questionMapItems.length ? (
                  <Sheet
                    onOpenChange={setQuestionNavigatorOpen}
                    open={questionNavigatorOpen}
                  >
                    <SheetTrigger
                      render={
                        <Button
                          className="lg:hidden"
                          size="sm"
                          type="button"
                          variant="outline"
                        />
                      }
                    >
                      <ListIcon data-icon="inline-start" />
                      Navigasi
                    </SheetTrigger>
                    <SheetContent
                      className="max-h-[80svh] rounded-t-2xl"
                      side="bottom"
                    >
                      <SheetHeader className="border-b pr-12">
                        <SheetTitle>Daftar soal</SheetTitle>
                        <SheetDescription>
                          Pilih soal untuk langsung menuju bagian yang ingin
                          diedit.
                        </SheetDescription>
                      </SheetHeader>
                      <div className="min-h-0 overflow-y-auto px-4 pb-5">
                        <QuestionNavigator
                          activeQuestionId={activeQuestionId}
                          items={questionMapItems}
                          onSelect={(questionId) => {
                            setQuestionNavigatorTargetId(questionId);
                            setQuestionNavigatorOpen(false);
                          }}
                        />
                      </div>
                    </SheetContent>
                  </Sheet>
                ) : null}
              </div>
            </div>
          </section>

          {displayQuestions.length ? (
            <>
              <ol className="grid gap-2">
                {displayQuestions.map((question, index) => (
                  <li
                    key={`${question.id}:${recoveredDraft?.updatedAt ?? "server"}`}
                  >
                    <QuestionRow
                      active={activeQuestionId === question.id}
                      autosaveRegistry={autosaveRegistry}
                      autoFocusPrompt={newQuestionId === question.id}
                      busy={questionBusy}
                      expanded={expandedQuestionId === question.id}
                      highlighted={newQuestionId === question.id}
                      hoverActionsFrozen={hoverActionsFrozen}
                      index={index}
                      onAddOption={onAddOption}
                      onDeleteOption={onDeleteOption}
                      onDeleteQuestion={onDeleteQuestion}
                      onDraftChange={saveQuestionDraft}
                      onDraftOptionChange={saveOptionDraft}
                      onSave={onSaveQuestion}
                      onSaveOption={onSaveOption}
                      onToggle={() => toggleQuestion(question.id)}
                      onToggleCorrect={onToggleCorrect}
                      question={question}
                      recoverOnMount={Boolean(recoveredDraft)}
                      renderForm={
                        expandedQuestionId === question.id ||
                        closingQuestionId === question.id
                      }
                      theme={editorTheme}
                      assetStorage={assetStorage}
                    />
                  </li>
                ))}
              </ol>
              <button
                className="text-muted-foreground hover:border-foreground/30 hover:text-foreground flex items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-3 text-sm transition-colors disabled:pointer-events-none disabled:opacity-50"
                disabled={questionBusy}
                onClick={addQuestion}
                type="button"
              >
                {questionBusy ? (
                  <LoaderCircleIcon className="size-4 animate-spin" />
                ) : (
                  <PlusIcon className="size-4" />
                )}
                Tambah soal berikutnya
              </button>
            </>
          ) : (
            <div className="bg-muted/20 rounded-xl border border-dashed px-6 py-12 text-center">
              <FileQuestionIcon className="text-muted-foreground/60 mx-auto mb-3 size-7" />
              <p className="text-sm font-medium">Belum ada soal</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Tekan tombol Tambah soal di atas untuk membuat soal pertama.
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="bg-muted/20 rounded-xl border border-dashed px-6 py-14 text-center">
          <ClipboardCheckIcon className="text-muted-foreground/60 mx-auto mb-3 size-7" />
          <p className="text-sm font-medium">Mulai dengan judul</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Isi judul di atas — assessment dibuat otomatis, lalu Anda bisa
            langsung menambahkan soal.
          </p>
        </div>
      )}

      <EditorSidebar
        title="Pengaturan assessment"
        description="Aturan dan navigasi soal"
      >
        <div className="grid gap-5 p-4">
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
                  settingsTouchedRef.current = true;
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
            ) : status === "PUBLISHED" && !displayQuestions.length ? (
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
              onChange={(value) => {
                settingsTouchedRef.current = true;
                setPassingScore(value);
              }}
              placeholder="Kosongkan jika tidak ada"
              value={passingScore}
            />
            <NumberField
              id="assessment-max-attempts"
              label="Maksimal percobaan"
              min={1}
              onChange={(value) => {
                settingsTouchedRef.current = true;
                setMaxAttempts(value);
              }}
              placeholder="Kosongkan jika tidak dibatasi"
              value={maxAttempts}
            />
            <NumberField
              id="assessment-time-limit"
              label="Batas waktu (menit)"
              min={1}
              onChange={(value) => {
                settingsTouchedRef.current = true;
                setTimeLimitMinutes(value);
              }}
              placeholder="Kosongkan jika tanpa batas"
              value={timeLimitMinutes}
            />
          </div>

          <div className="grid gap-4 border-t pt-5">
            <ToggleField
              checked={shuffleQuestions}
              description="Acak urutan soal untuk setiap attempt."
              label="Acak soal"
              onCheckedChange={(checked) => {
                settingsTouchedRef.current = true;
                setShuffleQuestions(checked);
              }}
            />
            <ToggleField
              checked={shuffleOptions}
              description="Acak urutan opsi untuk setiap attempt."
              label="Acak opsi"
              onCheckedChange={(checked) => {
                settingsTouchedRef.current = true;
                setShuffleOptions(checked);
              }}
            />
          </div>
        </div>

        <div className="border-sidebar-border grid gap-3 border-t p-4">
          <div>
            <h2 className="font-heading text-sm font-semibold">Peta soal</h2>
            <p className="text-muted-foreground text-xs">
              Lompat langsung ke soal yang ingin diedit.
            </p>
          </div>
          {assessment?.questions.length ? (
            <QuestionNavigator
              activeQuestionId={activeQuestionId}
              items={questionMapItems}
              onSelect={openQuestion}
            />
          ) : (
            <p className="text-muted-foreground rounded-md border border-dashed px-3 py-4 text-center text-xs">
              Belum ada soal.
            </p>
          )}
        </div>
      </EditorSidebar>
    </div>
  );
}

type QuestionNavigatorItem = {
  id: string;
  index: number;
  label: string;
  points: number;
};

function QuestionNavigator({
  activeQuestionId,
  items,
  onSelect,
}: {
  activeQuestionId: string | null;
  items: QuestionNavigatorItem[];
  onSelect: (questionId: string) => void;
}) {
  return (
    <nav aria-label="Navigasi soal" className="grid min-w-0 gap-1">
      {items.map((item) => (
        <Button
          aria-current={activeQuestionId === item.id ? "location" : undefined}
          className="h-auto min-h-10 w-full min-w-0 justify-start gap-2 px-2 py-2"
          key={item.id}
          onClick={() => onSelect(item.id)}
          type="button"
          variant={activeQuestionId === item.id ? "secondary" : "ghost"}
        >
          <span className="bg-muted text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded text-xs font-medium">
            {item.index + 1}
          </span>
          <span className="min-w-0 truncate">{item.label}</span>
          <span className="text-muted-foreground ml-auto shrink-0 text-xs">
            {item.points} poin
          </span>
        </Button>
      ))}
    </nav>
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

type QuestionRowProps = {
  active: boolean;
  autosaveRegistry: AutosaveRegistry;
  autoFocusPrompt: boolean;
  busy: boolean;
  expanded: boolean;
  highlighted: boolean;
  hoverActionsFrozen: boolean;
  index: number;
  onAddOption: (questionId: string) => Promise<void>;
  onDeleteOption: (optionId: string) => Promise<void>;
  onDeleteQuestion: (questionId: string) => Promise<void>;
  onDraftChange: (questionId: string, value: QuestionFields) => void;
  onDraftOptionChange: (
    questionId: string,
    optionId: string,
    content: BlockNoteDocument,
  ) => void;
  onSave: (questionId: string, value: QuestionFields) => Promise<boolean>;
  onSaveOption: (
    optionId: string,
    content: BlockNoteDocument,
  ) => Promise<boolean>;
  onToggle: () => void;
  onToggleCorrect: (
    question: Question,
    optionId: string,
    checked: boolean,
  ) => Promise<void>;
  question: Question;
  recoverOnMount: boolean;
  renderForm: boolean;
  theme: "light" | "dark";
  assetStorage?: EditorAssetStorageOptions;
};

const QuestionRow = memo(function QuestionRow({
  active,
  autosaveRegistry,
  autoFocusPrompt,
  busy,
  expanded,
  highlighted,
  hoverActionsFrozen,
  index,
  onAddOption,
  onDeleteOption,
  onDeleteQuestion,
  onDraftChange,
  onDraftOptionChange,
  onSave,
  onSaveOption,
  onToggle,
  onToggleCorrect,
  question,
  recoverOnMount,
  renderForm,
  theme,
  assetStorage,
}: QuestionRowProps) {
  const issue = getQuestionIssue(question);
  const preview = getBlockNotePlainText(question.prompt);

  return (
    <article
      className={cn(
        "group bg-card scroll-mt-24 rounded-xl border transition-[background-color,border-color,box-shadow] duration-300",
        expanded ? "border-primary/40 shadow-sm" : "hover:border-foreground/20",
        highlighted && "border-primary/50 bg-primary/[0.06]",
        !expanded && !highlighted && active && "bg-muted/30",
      )}
      data-question-id={question.id}
      id={`assessment-question-${question.id}`}
    >
      <div className="flex items-start gap-1 py-2.5 pr-1.5 pl-3">
        <button
          aria-expanded={expanded}
          className="focus-visible:ring-ring/50 flex min-w-0 flex-1 flex-col gap-1.5 rounded-lg text-left outline-none focus-visible:ring-3"
          onClick={onToggle}
          type="button"
        >
          <span className="flex w-full min-w-0 items-center gap-2">
            <span className="bg-muted text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium">
              {index + 1}
            </span>
            {issue ? (
              <span title={issue}>
                <AlertTriangleIcon
                  aria-label={issue}
                  className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400"
                />
              </span>
            ) : null}
            <span className="ml-auto flex shrink-0 items-center gap-1.5">
              <Badge variant="secondary">
                {questionTypeLabels[question.type]}
              </Badge>
              <span className="text-muted-foreground text-xs">
                {question.points} poin
              </span>
            </span>
            <ChevronDownIcon
              className={cn(
                "text-muted-foreground size-4 shrink-0 transition-transform duration-200",
                expanded && "rotate-180",
              )}
            />
          </span>
          {!expanded ? (
            <span
              className={cn(
                "line-clamp-2 w-full min-w-0 text-sm",
                preview ? "text-muted-foreground" : "text-muted-foreground/60",
              )}
            >
              {preview || "Belum ada pertanyaan"}
            </span>
          ) : null}
        </button>
        <DeleteQuestionAlert
          busy={busy}
          onDelete={() => onDeleteQuestion(question.id)}
          trigger={
            <Button
              aria-label={`Hapus soal ${index + 1}`}
              className={cn(
                "mt-0.5 shrink-0 transition-opacity duration-200 sm:opacity-0 sm:focus-visible:opacity-100",
                !hoverActionsFrozen &&
                  "sm:group-hover:opacity-100 sm:group-hover:delay-200",
              )}
              disabled={busy}
              size="icon-xs"
              type="button"
              variant="ghost"
            />
          }
        />
      </div>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-in-out motion-reduce:transition-none",
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div
          className={cn(
            "min-h-0 overflow-hidden transition-opacity duration-300 motion-reduce:transition-none",
            expanded ? "opacity-100" : "opacity-0",
          )}
        >
          {renderForm ? (
            <QuestionEditor
              autosaveRegistry={autosaveRegistry}
              autoFocusPrompt={autoFocusPrompt}
              busy={busy}
              onAddOption={onAddOption}
              onDeleteOption={onDeleteOption}
              onDeleteQuestion={onDeleteQuestion}
              onDraftChange={onDraftChange}
              onDraftOptionChange={onDraftOptionChange}
              onSave={onSave}
              onSaveOption={onSaveOption}
              onToggleCorrect={onToggleCorrect}
              question={question}
              recoverOnMount={recoverOnMount}
              theme={theme}
              assetStorage={assetStorage}
            />
          ) : null}
        </div>
      </div>
    </article>
  );
}, areQuestionRowPropsEqual);

function areQuestionRowPropsEqual(
  previous: QuestionRowProps,
  next: QuestionRowProps,
) {
  return (
    previous.active === next.active &&
    previous.autosaveRegistry === next.autosaveRegistry &&
    previous.autoFocusPrompt === next.autoFocusPrompt &&
    previous.busy === next.busy &&
    previous.expanded === next.expanded &&
    previous.highlighted === next.highlighted &&
    previous.hoverActionsFrozen === next.hoverActionsFrozen &&
    previous.index === next.index &&
    previous.onDraftChange === next.onDraftChange &&
    previous.onDraftOptionChange === next.onDraftOptionChange &&
    previous.question === next.question &&
    previous.recoverOnMount === next.recoverOnMount &&
    previous.renderForm === next.renderForm &&
    previous.theme === next.theme
  );
}

function DeleteQuestionAlert({
  busy,
  children,
  onDelete,
  trigger,
}: {
  busy: boolean;
  children?: ReactNode;
  onDelete: () => Promise<void>;
  trigger: ReactElement;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={trigger}>
        {children ?? <Trash2Icon />}
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
            onClick={onDelete}
            variant="destructive"
          >
            Hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

type QuestionEditorProps = {
  autosaveRegistry: AutosaveRegistry;
  autoFocusPrompt: boolean;
  busy: boolean;
  onAddOption: (questionId: string) => Promise<void>;
  onDeleteOption: (optionId: string) => Promise<void>;
  onDeleteQuestion: (questionId: string) => Promise<void>;
  onDraftChange: (questionId: string, value: QuestionFields) => void;
  onDraftOptionChange: (
    questionId: string,
    optionId: string,
    content: BlockNoteDocument,
  ) => void;
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
  recoverOnMount: boolean;
  theme: "light" | "dark";
  assetStorage?: EditorAssetStorageOptions;
};

function QuestionEditor({
  autosaveRegistry,
  autoFocusPrompt,
  busy,
  onAddOption,
  onDeleteOption,
  onDeleteQuestion,
  onDraftChange,
  onDraftOptionChange,
  onSave,
  onSaveOption,
  onToggleCorrect,
  question,
  recoverOnMount,
  theme,
  assetStorage,
}: QuestionEditorProps) {
  const [type, setType] = useState<QuestionType>(question.type);
  const [prompt, setPrompt] = useState<BlockNoteDocument>(
    toBlockNoteDocument(question.prompt) as BlockNoteDocument,
  );
  const [explanation, setExplanation] = useState<BlockNoteDocument>(
    toBlockNoteDocument(question.explanation) as BlockNoteDocument,
  );
  const [points, setPoints] = useState(String(question.points));
  const [correctAnswerBusy, setCorrectAnswerBusy] = useState(false);
  // Only autosave after the user actually edits — or when a recovered draft
  // is being synced back to the server. StrictMode double-invokes mount
  // effects, which would otherwise make merely expanding a row look like a
  // real change and fire a phantom save.
  const questionTouchedRef = useRef(recoverOnMount);

  const {
    cancel: cancelQuestionSave,
    flush: flushQuestionSave,
    schedule: scheduleQuestionSave,
    status: questionSaveStatus,
  } = useDebouncedAutosave<QuestionDraft>(async (draft) => {
    const parsedPoints = Number(draft.points);
    if (!hasBlockNoteContent(draft.prompt)) {
      toast.error("Pertanyaan wajib diisi.");
      throw new Error("Question prompt is required");
    }
    if (!Number.isInteger(parsedPoints) || parsedPoints < 1) {
      toast.error("Poin soal harus berupa bilangan bulat positif.");
      throw new Error("Question points are invalid");
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
  const skipInitialQuestionSave = useRef(!recoverOnMount);

  useEffect(
    () =>
      autosaveRegistry.register(`question:${question.id}`, flushQuestionSave),
    [autosaveRegistry, flushQuestionSave, question.id],
  );

  useEffect(() => {
    autosaveRegistry.setStatus(`question:${question.id}`, questionSaveStatus);
  }, [autosaveRegistry, question.id, questionSaveStatus]);

  useEffect(() => {
    if (skipInitialQuestionSave.current) {
      skipInitialQuestionSave.current = false;
      return;
    }
    if (!questionTouchedRef.current) return;

    const parsedPoints = Number(points);
    onDraftChange(question.id, {
      explanation: hasBlockNoteContent(explanation) ? explanation : null,
      points:
        Number.isInteger(parsedPoints) && parsedPoints > 0
          ? parsedPoints
          : question.points,
      prompt,
      type,
    });
    scheduleQuestionSave({ explanation, points, prompt, type });
  }, [
    explanation,
    onDraftChange,
    points,
    prompt,
    question.id,
    question.points,
    scheduleQuestionSave,
    type,
  ]);

  return (
    <div className="grid gap-4 border-t p-3 sm:p-4">
      <div className="grid gap-1.5">
        <Label className="text-muted-foreground text-[11px] tracking-wide uppercase">
          Pertanyaan
        </Label>
        <div className="bg-muted/20 overflow-hidden rounded-lg border">
          <DynamicBlockNoteEditor
            autoFocus={autoFocusPrompt}
            initialContent={toBlockNoteDocument(question.prompt)}
            onChange={(value) => {
              questionTouchedRef.current = true;
              setPrompt(value);
            }}
            placeholder="Tulis pertanyaan..."
            trailingBlock={false}
            theme={theme}
            assetStorage={assetStorage}
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
        <div className="grid gap-1.5">
          <Label
            className="text-muted-foreground text-[11px] tracking-wide uppercase"
            htmlFor={`question-type-${question.id}`}
          >
            Tipe soal
          </Label>
          <Select
            value={type}
            onValueChange={(value) => {
              if (
                value === "SINGLE_CHOICE" ||
                value === "MULTIPLE_CHOICE" ||
                value === "WRITTEN"
              ) {
                questionTouchedRef.current = true;
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
        <div className="grid gap-1.5">
          <Label
            className="text-muted-foreground text-[11px] tracking-wide uppercase"
            htmlFor={`question-points-${question.id}`}
          >
            Poin
          </Label>
          <Input
            id={`question-points-${question.id}`}
            min={1}
            onChange={(event) => {
              questionTouchedRef.current = true;
              setPoints(event.target.value);
            }}
            type="number"
            value={points}
          />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label className="text-muted-foreground text-[11px] tracking-wide uppercase">
          Penjelasan jawaban (opsional)
        </Label>
        <div className="bg-muted/20 overflow-hidden rounded-lg border">
          <DynamicBlockNoteEditor
            initialContent={toBlockNoteDocument(question.explanation)}
            onChange={(value) => {
              questionTouchedRef.current = true;
              setExplanation(value);
            }}
            placeholder="Tulis penjelasan jawaban..."
            trailingBlock={false}
            theme={theme}
            assetStorage={assetStorage}
          />
        </div>
      </div>

      {type === "WRITTEN" && question.options.length ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
          <p>
            Opsi lama dipertahankan dan bisa dihapus satu per satu, tetapi akan
            diabaikan oleh sistem untuk soal tertulis. Jika tipe dikembalikan,
            opsi tersebut akan muncul lagi.
          </p>
        </div>
      ) : null}

      {type !== "WRITTEN" || question.options.length ? (
        <div className="grid gap-3 border-t pt-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-heading text-sm font-semibold">
                Opsi jawaban
              </h3>
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
                  autosaveRegistry={autosaveRegistry}
                  busy={busy}
                  canDelete={
                    type === "WRITTEN" ||
                    question.options.length > MIN_ASSESSMENT_OPTIONS
                  }
                  correctAnswerBusy={correctAnswerBusy}
                  index={optionIndex}
                  key={option.id}
                  onDelete={() => onDeleteOption(option.id)}
                  onDraftChange={onDraftOptionChange}
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
                  questionId={question.id}
                  recoverOnMount={recoverOnMount}
                  theme={theme}
                  assetStorage={assetStorage}
                />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-4 text-center text-xs">
              Belum ada opsi. Tambahkan setidaknya dua opsi untuk soal pilihan.
            </p>
          )}
        </div>
      ) : (
        <div className="bg-muted/30 text-muted-foreground flex items-start gap-2 rounded-lg border p-3 text-xs">
          <FileQuestionIcon className="mt-0.5 size-4 shrink-0" />
          Soal tertulis akan diperiksa manual setelah siswa mengirim jawaban.
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
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
              <span className="text-muted-foreground">Belum ada perubahan</span>
            </>
          )}
        </p>
        <DeleteQuestionAlert
          busy={busy}
          onDelete={async () => {
            cancelQuestionSave();
            await onDeleteQuestion(question.id);
          }}
          trigger={
            <Button
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={busy}
              size="sm"
              type="button"
              variant="ghost"
            />
          }
        >
          <Trash2Icon data-icon="inline-start" />
          Hapus soal
        </DeleteQuestionAlert>
      </div>
    </div>
  );
}

type OptionRowProps = {
  autosaveRegistry: AutosaveRegistry;
  busy: boolean;
  canDelete: boolean;
  correctAnswerBusy: boolean;
  index: number;
  onDelete: () => Promise<void>;
  onDraftChange: (
    questionId: string,
    optionId: string,
    content: BlockNoteDocument,
  ) => void;
  onSave: (content: BlockNoteDocument) => Promise<boolean>;
  onToggleCorrect: (checked: boolean) => Promise<void>;
  option: Question["options"][number];
  questionId: string;
  recoverOnMount: boolean;
  theme: "light" | "dark";
  assetStorage?: EditorAssetStorageOptions;
};

const OptionRow = memo(function OptionRow({
  autosaveRegistry,
  busy,
  canDelete,
  correctAnswerBusy,
  index,
  onDelete,
  onDraftChange,
  onSave,
  onToggleCorrect,
  option,
  questionId,
  recoverOnMount,
  theme,
  assetStorage,
}: OptionRowProps) {
  const [content, setContent] = useState<BlockNoteDocument>(
    toBlockNoteDocument(option.content) as BlockNoteDocument,
  );
  const [editing, setEditing] = useState(false);
  const editorAreaRef = useRef<HTMLDivElement>(null);
  // Same StrictMode guard as the question editor: only autosave after the
  // user actually edits (or a recovered draft is being synced back).
  const contentTouchedRef = useRef(recoverOnMount);

  const {
    cancel: cancelOptionSave,
    flush: flushOptionSave,
    schedule: scheduleOptionSave,
    status: optionSaveStatus,
  } = useDebouncedAutosave<BlockNoteDocument>(async (nextContent) => {
    if (!hasBlockNoteContent(nextContent)) {
      toast.error("Isi opsi wajib diisi.");
      throw new Error("Option content is required");
    }

    const saved = await onSave(nextContent);
    if (!saved) throw new Error("Option autosave failed");
  });
  const skipInitialOptionSave = useRef(!recoverOnMount);

  useEffect(
    () => autosaveRegistry.register(`option:${option.id}`, flushOptionSave),
    [autosaveRegistry, flushOptionSave, option.id],
  );

  useEffect(() => {
    autosaveRegistry.setStatus(`option:${option.id}`, optionSaveStatus);
  }, [autosaveRegistry, option.id, optionSaveStatus]);

  useEffect(() => {
    if (!editing && !recoverOnMount) return;
    if (skipInitialOptionSave.current) {
      skipInitialOptionSave.current = false;
      return;
    }
    if (!contentTouchedRef.current) return;

    onDraftChange(questionId, option.id, content);
    scheduleOptionSave(content);
  }, [
    content,
    editing,
    onDraftChange,
    option.id,
    questionId,
    recoverOnMount,
    scheduleOptionSave,
  ]);

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
              contentTouchedRef.current = true;
              setContent(value);
            }}
            placeholder="Tulis opsi jawaban..."
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
    previous.autosaveRegistry === next.autosaveRegistry &&
    previous.busy === next.busy &&
    previous.canDelete === next.canDelete &&
    previous.correctAnswerBusy === next.correctAnswerBusy &&
    previous.index === next.index &&
    previous.onDraftChange === next.onDraftChange &&
    previous.option === next.option &&
    previous.questionId === next.questionId &&
    previous.recoverOnMount === next.recoverOnMount &&
    previous.theme === next.theme
  );
}
