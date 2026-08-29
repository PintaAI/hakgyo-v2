"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  CheckCircle2Icon,
  ClipboardCheckIcon,
  FileQuestionIcon,
  LoaderCircleIcon,
  PlusIcon,
  SaveIcon,
  Settings2Icon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import {
  DynamicBlockNoteEditor,
  type BlockNoteDocument,
} from "~/components/editor";
import type { UploadEditorAsset } from "~/components/editor/asset-upload-context";
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
import {
  hasBlockNoteContent,
  toBlockNoteDocument,
} from "~/lib/blocknote/document";
import { api, type RouterOutputs } from "~/trpc/react";

type Assessment = RouterOutputs["assessment"]["get"];
type Question = Assessment["questions"][number];
type QuestionType = Question["type"];
type Status = Assessment["status"];

function getPublishValidationError(questions: Question[]) {
  if (questions.length === 0) {
    return "Tambahkan setidaknya satu soal sebelum memublikasikan assessment.";
  }

  for (const [index, question] of questions.entries()) {
    if (!hasBlockNoteContent(question.prompt)) {
      return `Soal ${index + 1} belum memiliki pertanyaan.`;
    }
    if (question.type === "WRITTEN") continue;
    if (question.options.length < 2) {
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
}: {
  organizationId: string;
  organizationSlug: string;
  assessmentId?: string;
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
  const createUpload = api.storage.createUploadUrl.useMutation();
  const confirmUpload = api.storage.confirmUpload.useMutation();
  const discardUpload = api.storage.deleteDocument.useMutation();
  const attachAsset = api.assessment.attachAsset.useMutation();
  const canDelete = Boolean(organization.data);

  async function refresh() {
    await Promise.all([
      utils.assessment.list.invalidate({ organizationId }),
      assessmentId
        ? utils.assessment.get.invalidate({ assessmentId })
        : Promise.resolve(),
    ]);
  }

  const uploadAsset: UploadEditorAsset | undefined = assessmentId
    ? async (file, kind) => {
        const expectedPrefix = kind === "audio" ? "audio/" : "image/";
        const maximumSize =
          kind === "audio" ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
        if (!file.type.startsWith(expectedPrefix)) {
          throw new Error(
            kind === "audio"
              ? "Pilih file audio yang valid."
              : "Pilih file gambar yang valid.",
          );
        }
        if (file.size > maximumSize) {
          throw new Error(
            kind === "audio"
              ? "Ukuran audio maksimal 50 MB."
              : "Ukuran gambar maksimal 10 MB.",
          );
        }

        const upload = await createUpload.mutateAsync({
          organizationId,
          fileName: file.name,
          contentType: file.type,
          fileSize: file.size,
        });
        let attached = false;
        try {
          const response = await fetch(upload.uploadUrl, {
            method: "PUT",
            body: file,
            headers: upload.headers,
          });
          if (!response.ok)
            throw new Error(`Upload media gagal (${response.status}).`);
          const asset = await confirmUpload.mutateAsync({ key: upload.key });
          await attachAsset.mutateAsync({
            assessmentId,
            assetId: asset.assetId,
          });
          attached = true;
          return {
            assetId: asset.assetId,
            fileName: file.name,
            contentType: asset.contentType,
          };
        } catch (error) {
          if (!attached) {
            await discardUpload
              .mutateAsync({ key: upload.key })
              .catch(() => undefined);
          }
          throw error;
        }
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
      isSaving={createAssessment.isPending || updateAssessment.isPending}
      onBack={() => router.back()}
      uploadAsset={uploadAsset}
      questionBusy={
        createQuestion.isPending ||
        updateQuestion.isPending ||
        deleteQuestion.isPending ||
        createOption.isPending ||
        updateOption.isPending ||
        deleteOption.isPending
      }
      onAddOption={async (questionId) => {
        try {
          await createOption.mutateAsync({
            questionId,
            content: [{ type: "paragraph", content: "Pilihan baru" }],
            isCorrect: false,
          });
          await refresh();
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
          await refresh();
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
          await refresh();
          toast.success("Opsi dihapus.");
        } catch (error) {
          toast.error(errorMessage(error));
        }
      }}
      onDeleteQuestion={async (questionId) => {
        try {
          await deleteQuestion.mutateAsync({ questionId });
          await refresh();
          toast.success("Soal dihapus.");
        } catch (error) {
          toast.error(errorMessage(error));
        }
      }}
      onSave={async (value) => {
        try {
          if (assessmentId) {
            await updateAssessment.mutateAsync({
              assessmentId,
              ...value,
              editorSchemaVersion: 1,
            });
            await refresh();
            toast.success("Pengaturan assessment disimpan.");
            return;
          }

          const created = await createAssessment.mutateAsync({
            organizationId,
            ...value,
            editorSchemaVersion: 1,
          });
          await utils.assessment.list.invalidate({ organizationId });
          toast.success("Assessment dibuat. Tambahkan soal pertama Anda.");
          router.replace(
            `/workspace/${organizationSlug}/library/assessments/${created.id}`,
          );
        } catch (error) {
          toast.error(errorMessage(error));
        }
      }}
      onSaveOption={async (optionId, content) => {
        try {
          await updateOption.mutateAsync({ optionId, content });
          await refresh();
          toast.success("Opsi disimpan.");
          return true;
        } catch (error) {
          toast.error(errorMessage(error));
          return false;
        }
      }}
      onSaveQuestion={async (questionId, value) => {
        try {
          await updateQuestion.mutateAsync({ questionId, ...value });
          await refresh();
          toast.success("Soal disimpan.");
          return true;
        } catch (error) {
          toast.error(errorMessage(error));
          return false;
        }
      }}
      onToggleCorrect={async (question, optionId, checked) => {
        try {
          if (checked && question.type === "SINGLE_CHOICE") {
            await Promise.all(
              question.options
                .filter((option) => option.id !== optionId && option.isCorrect)
                .map((option) =>
                  updateOption.mutateAsync({
                    optionId: option.id,
                    isCorrect: false,
                  }),
                ),
            );
          }
          await updateOption.mutateAsync({ optionId, isCorrect: checked });
          await refresh();
        } catch (error) {
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

function AssessmentEditorForm({
  assessment,
  canDelete,
  isDeleting,
  isSaving,
  onBack,
  uploadAsset,
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
  isSaving: boolean;
  onBack: () => void;
  uploadAsset?: UploadEditorAsset;
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
    value: {
      type: QuestionType;
      prompt: BlockNoteDocument;
      explanation: BlockNoteDocument | null;
      points: number;
    },
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

  async function saveSettings() {
    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      toast.error("Judul assessment wajib diisi.");
      return;
    }
    const parsedPassingScore = optionalInteger(passingScore, 0, 100);
    const parsedMaxAttempts = optionalInteger(maxAttempts, 1);
    const parsedTimeLimit = optionalInteger(timeLimitMinutes, 1);
    if (
      parsedPassingScore === undefined ||
      parsedMaxAttempts === undefined ||
      parsedTimeLimit === undefined
    ) {
      toast.error("Nilai pengaturan angka belum valid.");
      return;
    }
    if (status === "PUBLISHED") {
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
      description: description.trim() || null,
      status,
      instructions: hasBlockNoteContent(instructions) ? instructions : null,
      passingScore: parsedPassingScore,
      maxAttempts: parsedMaxAttempts,
      timeLimitMinutes: parsedTimeLimit,
      shuffleQuestions,
      shuffleOptions,
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              type="button"
              aria-label="Kembali ke assessment"
              variant="outline"
              size="icon"
              onClick={onBack}
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
                      onClick={onDelete}
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
            <Button
              disabled={isSaving || isDeleting}
              onClick={() => void saveSettings()}
              type="button"
            >
              {isSaving ? (
                <LoaderCircleIcon
                  className="animate-spin"
                  data-icon="inline-start"
                />
              ) : (
                <SaveIcon data-icon="inline-start" />
              )}
              {assessment ? "Simpan perubahan" : "Buat assessment"}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start">
          <section className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings2Icon className="size-4" />
                  Pengaturan assessment
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-5">
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
                  <div className="min-h-36 overflow-hidden rounded-lg border py-3">
                    <DynamicBlockNoteEditor
                      initialContent={toBlockNoteDocument(
                        assessment?.instructions,
                      )}
                      onChange={setInstructions}
                      theme={editorTheme}
                      uploadAsset={uploadAsset}
                    />
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Gunakan menu / untuk menambahkan gambar atau audio.
                  </p>
                </div>
              </CardContent>
            </Card>

            {assessment ? (
              <section className="grid gap-4">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <h2 className="font-heading text-xl font-semibold">Soal</h2>
                    <p className="text-muted-foreground text-sm">
                      Soal baru ditambahkan di bagian paling bawah. Router saat
                      ini belum menyediakan pengurutan manual.
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {assessment.questions.length} soal
                  </Badge>
                </div>

                {assessment.questions.length ? (
                  <div className="grid gap-4">
                    {assessment.questions.map((question, index) => (
                      <QuestionCard
                        busy={questionBusy}
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
                        uploadAsset={uploadAsset}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-muted-foreground bg-muted/20 rounded-xl border border-dashed px-6 py-10 text-center text-sm">
                    Tambahkan soal pertama untuk mulai membangun assessment.
                  </div>
                )}

                <Button
                  className="w-full sm:w-fit"
                  disabled={questionBusy}
                  onClick={onAddQuestion}
                  type="button"
                  variant="outline"
                >
                  <PlusIcon data-icon="inline-start" />
                  Tambah soal
                </Button>
              </section>
            ) : (
              <div className="bg-muted/20 text-muted-foreground rounded-xl border border-dashed px-6 py-10 text-center text-sm">
                Simpan detail assessment terlebih dahulu, lalu tambahkan soal
                dan opsi jawaban.
              </div>
            )}
          </section>

          <aside className="bg-card grid gap-5 rounded-xl border p-5 shadow-xs lg:sticky lg:top-6">
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
                  <SelectValue />
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

function QuestionCard({
  busy,
  index,
  onAddOption,
  onDeleteOption,
  onDeleteQuestion,
  onSave,
  onSaveOption,
  onToggleCorrect,
  question,
  theme,
  uploadAsset,
}: {
  busy: boolean;
  index: number;
  onAddOption: (questionId: string) => Promise<void>;
  onDeleteOption: (optionId: string) => Promise<void>;
  onDeleteQuestion: (questionId: string) => Promise<void>;
  onSave: (
    questionId: string,
    value: {
      type: QuestionType;
      prompt: BlockNoteDocument;
      explanation: BlockNoteDocument | null;
      points: number;
    },
  ) => Promise<boolean>;
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
  uploadAsset?: UploadEditorAsset;
}) {
  const [type, setType] = useState<QuestionType>(question.type);
  const [prompt, setPrompt] = useState<BlockNoteDocument>(
    toBlockNoteDocument(question.prompt) as BlockNoteDocument,
  );
  const [explanation, setExplanation] = useState<BlockNoteDocument>(
    toBlockNoteDocument(question.explanation) as BlockNoteDocument,
  );
  const [points, setPoints] = useState(String(question.points));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedPoints = Number(points);
    if (!hasBlockNoteContent(prompt)) {
      toast.error("Pertanyaan wajib diisi.");
      return;
    }
    if (!Number.isInteger(parsedPoints) || parsedPoints < 1) {
      toast.error("Poin soal harus berupa bilangan bulat positif.");
      return;
    }
    await onSave(question.id, {
      type,
      prompt,
      explanation: hasBlockNoteContent(explanation) ? explanation : null,
      points: parsedPoints,
    });
  }

  return (
    <Card>
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
                  onClick={() => onDeleteQuestion(question.id)}
                  variant="destructive"
                >
                  Hapus
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardHeader>
      <CardContent className="grid gap-5 pt-5">
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label>Pertanyaan</Label>
            <div className="min-h-40 overflow-hidden rounded-lg border py-3">
              <DynamicBlockNoteEditor
                initialContent={toBlockNoteDocument(question.prompt)}
                onChange={setPrompt}
                theme={theme}
                uploadAsset={uploadAsset}
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
                  <SelectValue />
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
            <div className="min-h-28 overflow-hidden rounded-lg border py-3">
              <DynamicBlockNoteEditor
                initialContent={toBlockNoteDocument(question.explanation)}
                onChange={setExplanation}
                theme={theme}
                uploadAsset={uploadAsset}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button disabled={busy} type="submit">
              {busy ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : (
                <SaveIcon />
              )}
              Simpan soal
            </Button>
          </div>
        </form>

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
          <div className="grid gap-3 border-t pt-5">
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
                  disabled={busy}
                  onClick={() => onAddOption(question.id)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <PlusIcon data-icon="inline-start" />
                  Tambah opsi
                </Button>
              ) : null}
            </div>
            {question.options.length ? (
              <div className="grid gap-2">
                {question.options.map((option, optionIndex) => (
                  <OptionRow
                    busy={busy}
                    index={optionIndex}
                    key={option.id}
                    onDelete={() => onDeleteOption(option.id)}
                    onToggleCorrect={(checked) =>
                      onToggleCorrect(question, option.id, checked)
                    }
                    onSave={(content) => onSaveOption(option.id, content)}
                    option={option}
                    theme={theme}
                    uploadAsset={uploadAsset}
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
}

function OptionRow({
  busy,
  index,
  onDelete,
  onSave,
  onToggleCorrect,
  option,
  theme,
  uploadAsset,
}: {
  busy: boolean;
  index: number;
  onDelete: () => Promise<void>;
  onSave: (content: BlockNoteDocument) => Promise<boolean>;
  onToggleCorrect: (checked: boolean) => Promise<void>;
  option: Question["options"][number];
  theme: "light" | "dark";
  uploadAsset?: UploadEditorAsset;
}) {
  const [content, setContent] = useState<BlockNoteDocument>(
    toBlockNoteDocument(option.content) as BlockNoteDocument,
  );
  const [editing, setEditing] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasBlockNoteContent(content)) {
      toast.error("Isi opsi wajib diisi.");
      return;
    }
    const saved = await onSave(content);
    if (saved) setEditing(false);
  }

  if (editing) {
    return (
      <form
        className="grid gap-3 rounded-lg border p-3"
        onSubmit={handleSubmit}
      >
        <div className="min-h-28 overflow-hidden rounded-lg border py-3">
          <DynamicBlockNoteEditor
            initialContent={toBlockNoteDocument(option.content)}
            onChange={setContent}
            theme={theme}
            uploadAsset={uploadAsset}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button
            disabled={busy}
            onClick={() => {
              setContent(
                toBlockNoteDocument(option.content) as BlockNoteDocument,
              );
              setEditing(false);
            }}
            type="button"
            variant="ghost"
          >
            <XIcon /> Batal
          </Button>
          <Button disabled={busy} type="submit">
            {busy ? (
              <LoaderCircleIcon className="animate-spin" />
            ) : (
              <SaveIcon />
            )}
            Simpan opsi
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="bg-muted/20 flex items-center gap-2 rounded-lg border px-3 py-2">
      <Checkbox
        aria-label={`Tandai opsi ${index + 1} sebagai jawaban benar`}
        checked={option.isCorrect}
        disabled={busy}
        onCheckedChange={(checked) => void onToggleCorrect(checked === true)}
      />
      <span className="text-muted-foreground w-5 text-center text-xs font-medium">
        {String.fromCharCode(65 + index)}
      </span>
      <div className="min-w-0 flex-1 overflow-hidden">
        <DynamicBlockNoteEditor
          editable={false}
          initialContent={toBlockNoteDocument(option.content)}
          theme={theme}
        />
      </div>
      {option.isCorrect ? (
        <Badge variant="secondary">
          <CheckCircle2Icon data-icon="inline-start" />
          Benar
        </Badge>
      ) : null}
      <Button
        aria-label={`Edit opsi ${index + 1}`}
        disabled={busy}
        onClick={() => setEditing(true)}
        size="icon-sm"
        type="button"
        variant="ghost"
      >
        <span className="text-xs">Edit</span>
      </Button>
      <AlertDialog>
        <AlertDialogTrigger
          render={
            <Button
              aria-label={`Hapus opsi ${index + 1}`}
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
            <AlertDialogTitle>Hapus opsi ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Opsi jawaban ini akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} variant="destructive">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
