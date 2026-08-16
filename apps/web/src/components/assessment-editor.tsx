"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  ClipboardCheckIcon,
  LoaderCircleIcon,
  PencilIcon,
  PlusIcon,
  SaveIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

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
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Radio, RadioGroup } from "~/components/ui/radio";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";
import { api, type RouterOutputs } from "~/trpc/react";

type Assessment = RouterOutputs["assessment"]["get"];
type Question = Assessment["questions"][number];
type Option = Question["options"][number];
type AssessmentStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
type QuestionType = "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "WRITTEN";

const STATUS_LABEL: Record<AssessmentStatus, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  SINGLE_CHOICE: "Single choice",
  MULTIPLE_CHOICE: "Multiple choice",
  WRITTEN: "Written",
};

function errorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

function jsonValueToString(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function toStringJson(value: string): unknown {
  return value;
}

function parsePoints(value: string) {
  if (!value.trim()) return 1;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > 10000) return null;
  return number;
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
  const createAssessment = api.assessment.create.useMutation();
  const updateAssessment = api.assessment.update.useMutation();
  const deleteAssessment = api.assessment.delete.useMutation();

  if (assessmentId && assessment.isPending) {
    return (
      <div className="text-muted-foreground flex min-h-96 items-center justify-center text-sm">
        <LoaderCircleIcon className="mr-2 size-4 animate-spin" />
        Loading assessment
      </div>
    );
  }

  if (assessmentId && (assessment.error || !assessment.data)) {
    return (
      <div className="flex min-h-96 flex-col items-center justify-center gap-3 text-center">
        <p className="text-destructive text-sm">
          {assessment.error?.message ?? "Assessment could not be loaded."}
        </p>
        <Button variant="outline" onClick={() => assessment.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const current = assessment.data;

  return (
    <AssessmentForm
      key={current?.id ?? "new-assessment"}
      assessmentId={assessmentId}
      initialDescription={current?.description ?? ""}
      initialInstructions={jsonValueToString(current?.instructions)}
      initialMaxAttempts={current?.maxAttempts?.toString() ?? ""}
      initialPassingScore={current?.passingScore?.toString() ?? ""}
      initialShuffleOptions={current?.shuffleOptions ?? false}
      initialShuffleQuestions={current?.shuffleQuestions ?? false}
      initialStatus={current?.status ?? "DRAFT"}
      initialTimeLimitMinutes={current?.timeLimitMinutes?.toString() ?? ""}
      initialTitle={current?.title ?? ""}
      isDeleting={deleteAssessment.isPending}
      isSaving={createAssessment.isPending || updateAssessment.isPending}
      organizationSlug={organizationSlug}
      onDelete={async () => {
        if (!assessmentId) return;
        try {
          await deleteAssessment.mutateAsync({ assessmentId });
          await utils.assessment.list.invalidate({ organizationId });
          toast.success("Assessment deleted.");
          router.replace(`/workspace/${organizationSlug}/library/assessments`);
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
            });
            await utils.assessment.get.invalidate({ assessmentId });
            await utils.assessment.list.invalidate({ organizationId });
            toast.success("Assessment saved.");
            return;
          }

          const created = await createAssessment.mutateAsync({
            organizationId,
            ...value,
            editorSchemaVersion: 1,
          });
          await utils.assessment.list.invalidate({ organizationId });
          toast.success("Assessment created.");
          router.replace(
            `/workspace/${organizationSlug}/library/assessments/${created.id}`,
          );
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
  status?: AssessmentStatus;
  instructions?: unknown;
  passingScore?: number | null;
  maxAttempts?: number | null;
  timeLimitMinutes?: number | null;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
};

function AssessmentForm({
  assessmentId,
  initialDescription,
  initialInstructions,
  initialMaxAttempts,
  initialPassingScore,
  initialShuffleOptions,
  initialShuffleQuestions,
  initialStatus,
  initialTimeLimitMinutes,
  initialTitle,
  isDeleting,
  isSaving,
  organizationSlug,
  onDelete,
  onSave,
}: {
  assessmentId?: string;
  initialDescription: string;
  initialInstructions: string;
  initialMaxAttempts: string;
  initialPassingScore: string;
  initialShuffleOptions: boolean;
  initialShuffleQuestions: boolean;
  initialStatus: AssessmentStatus;
  initialTimeLimitMinutes: string;
  initialTitle: string;
  isDeleting: boolean;
  isSaving: boolean;
  organizationSlug: string;
  onDelete: () => Promise<void>;
  onSave: (value: AssessmentFields) => Promise<void>;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [instructions, setInstructions] = useState(initialInstructions);
  const [status, setStatus] = useState<AssessmentStatus>(initialStatus);
  const [passingScore, setPassingScore] = useState(initialPassingScore);
  const [maxAttempts, setMaxAttempts] = useState(initialMaxAttempts);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(
    initialTimeLimitMinutes,
  );
  const [shuffleQuestions, setShuffleQuestions] = useState(
    initialShuffleQuestions,
  );
  const [shuffleOptions, setShuffleOptions] = useState(initialShuffleOptions);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      toast.error("Assessment title is required.");
      return;
    }

    const passingScoreValue = parseLimitedNumber(passingScore, 0, 100);
    if (passingScoreValue === "invalid") {
      toast.error("Passing score must be between 0 and 100.");
      return;
    }
    const maxAttemptsValue = parsePositiveNumber(maxAttempts);
    if (maxAttemptsValue === "invalid") {
      toast.error("Max attempts must be a positive number.");
      return;
    }
    const timeLimitValue = parsePositiveNumber(timeLimitMinutes);
    if (timeLimitValue === "invalid") {
      toast.error("Time limit must be a positive number.");
      return;
    }

    await onSave({
      title: normalizedTitle,
      description: description.trim() || null,
      status,
      instructions: instructions.trim()
        ? toStringJson(instructions)
        : undefined,
      passingScore: passingScoreValue,
      maxAttempts: maxAttemptsValue,
      timeLimitMinutes: timeLimitValue,
      shuffleQuestions,
      shuffleOptions,
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              aria-label="Back to assessments"
              href={`/workspace/${organizationSlug}/library/assessments`}
              className={buttonVariants({ variant: "outline", size: "icon" })}
            >
              <ArrowLeftIcon />
            </Link>
            <div className="min-w-0">
              <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                <ClipboardCheckIcon className="size-3.5" />
                {assessmentId ? "Edit assessment" : "New assessment"}
              </div>
              <h1 className="font-heading truncate text-2xl font-semibold tracking-tight">
                {title.trim() || "Untitled assessment"}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {assessmentId && (
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button type="button" variant="destructive" size="icon" />
                  }
                >
                  <Trash2Icon />
                  <span className="sr-only">Delete assessment</span>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this assessment?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This deletes all questions and options and cannot be
                      undone. Deletion can fail while the assessment is used by
                      a course.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={isDeleting}
                      onClick={onDelete}
                      variant="destructive"
                    >
                      {isDeleting && (
                        <LoaderCircleIcon className="animate-spin" />
                      )}
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button disabled={isSaving || isDeleting} type="submit">
              {isSaving ? (
                <LoaderCircleIcon
                  className="animate-spin"
                  data-icon="inline-start"
                />
              ) : (
                <SaveIcon data-icon="inline-start" />
              )}
              {assessmentId ? "Save details" : "Create assessment"}
            </Button>
          </div>
        </div>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <Card className="min-w-0">
            <CardContent className="grid gap-5 md:grid-cols-2">
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="assessment-title">Title</Label>
                <Input
                  autoFocus={!assessmentId}
                  id="assessment-title"
                  maxLength={200}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Unit 1 checkpoint"
                  value={title}
                />
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="assessment-description">Description</Label>
                <Textarea
                  id="assessment-description"
                  maxLength={10000}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="What does this assessment cover?"
                  rows={3}
                  value={description}
                />
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="assessment-instructions">Instructions</Label>
                <Textarea
                  id="assessment-instructions"
                  onChange={(event) => setInstructions(event.target.value)}
                  placeholder="Shown to learners before they start."
                  rows={3}
                  value={instructions}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="assessment-status">Status</Label>
                <Select
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
                    {(Object.keys(STATUS_LABEL) as AssessmentStatus[]).map(
                      (key) => (
                        <SelectItem key={key} value={key}>
                          {STATUS_LABEL[key]}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="assessment-passing-score">
                  Passing score ({String.fromCharCode(37)})
                </Label>
                <Input
                  id="assessment-passing-score"
                  inputMode="numeric"
                  max={100}
                  min={0}
                  onChange={(event) => setPassingScore(event.target.value)}
                  placeholder="0–100"
                  type="number"
                  value={passingScore}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="assessment-max-attempts">Max attempts</Label>
                <Input
                  id="assessment-max-attempts"
                  inputMode="numeric"
                  min={1}
                  onChange={(event) => setMaxAttempts(event.target.value)}
                  placeholder="Unlimited"
                  type="number"
                  value={maxAttempts}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="assessment-time-limit">
                  Time limit (minutes)
                </Label>
                <Input
                  id="assessment-time-limit"
                  inputMode="numeric"
                  min={1}
                  onChange={(event) => setTimeLimitMinutes(event.target.value)}
                  placeholder="No limit"
                  type="number"
                  value={timeLimitMinutes}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="lg:w-72">
            <CardContent className="flex flex-col gap-4">
              <div>
                <Label htmlFor="shuffle-questions">Shuffle questions</Label>
                <p className="text-muted-foreground mt-1 flex items-center justify-between gap-3 text-xs">
                  Vary the order of questions per attempt.
                  <Switch
                    id="shuffle-questions"
                    checked={shuffleQuestions}
                    onCheckedChange={setShuffleQuestions}
                    aria-label="Shuffle questions"
                  />
                </p>
              </div>
              <Separator />
              <div>
                <Label htmlFor="shuffle-options">Shuffle options</Label>
                <p className="text-muted-foreground mt-1 flex items-center justify-between gap-3 text-xs">
                  Vary the order of options per attempt.
                  <Switch
                    id="shuffle-options"
                    checked={shuffleOptions}
                    onCheckedChange={setShuffleOptions}
                    aria-label="Shuffle options"
                  />
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      </form>

      {assessmentId ? (
        <QuestionsSection assessmentId={assessmentId} />
      ) : (
        <div className="text-muted-foreground bg-muted/20 rounded-xl border border-dashed px-6 py-10 text-center text-sm">
          Create the assessment before adding questions.
        </div>
      )}
    </div>
  );
}

function parsePositiveNumber(value: string): number | null | "invalid" {
  if (!value.trim()) return null;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) return "invalid";
  return number;
}

function parseLimitedNumber(
  value: string,
  min: number,
  max: number,
): number | null | "invalid" {
  if (!value.trim()) return null;
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    return "invalid";
  }
  return number;
}

function QuestionsSection({ assessmentId }: { assessmentId: string }) {
  const utils = api.useUtils();
  const assessment = api.assessment.get.useQuery({ assessmentId });
  const createQuestion = api.assessment.createQuestion.useMutation();
  const updateQuestion = api.assessment.updateQuestion.useMutation();
  const deleteQuestion = api.assessment.deleteQuestion.useMutation();
  const createOption = api.assessment.createOption.useMutation();
  const updateOption = api.assessment.updateOption.useMutation();
  const deleteOption = api.assessment.deleteOption.useMutation();

  const busy =
    createQuestion.isPending ||
    updateQuestion.isPending ||
    deleteQuestion.isPending ||
    createOption.isPending ||
    updateOption.isPending ||
    deleteOption.isPending;

  async function refresh() {
    await utils.assessment.get.invalidate({ assessmentId });
  }

  if (assessment.isPending) {
    return (
      <div className="text-muted-foreground flex min-h-40 items-center justify-center text-sm">
        <LoaderCircleIcon className="mr-2 size-4 animate-spin" />
        Loading questions
      </div>
    );
  }

  if (assessment.error || !assessment.data) {
    return (
      <p className="text-destructive text-sm">
        {assessment.error?.message ?? "Questions could not be loaded."}
      </p>
    );
  }

  return (
    <section className="grid gap-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl font-semibold">Questions</h2>
          <p className="text-muted-foreground text-sm">
            Add choice or written questions that learners will answer.
          </p>
        </div>
        <Badge variant="secondary">
          {assessment.data.questions.length} questions
        </Badge>
      </div>

      <NewQuestionForm
        busy={busy}
        onCreate={async (fields) => {
          try {
            await createQuestion.mutateAsync({ assessmentId, ...fields });
            await refresh();
            toast.success("Question added.");
            return true;
          } catch (error) {
            toast.error(errorMessage(error));
            return false;
          }
        }}
      />

      {assessment.data.questions.length ? (
        <div className="grid gap-3">
          {assessment.data.questions.map((question, index) => (
            <QuestionCard
              busy={busy}
              index={index}
              key={question.id}
              question={question}
              onDelete={async () => {
                try {
                  await deleteQuestion.mutateAsync({ questionId: question.id });
                  await refresh();
                  toast.success("Question deleted.");
                } catch (error) {
                  toast.error(errorMessage(error));
                }
              }}
              onCreateOption={async (content, isCorrect) => {
                try {
                  await createOption.mutateAsync({
                    questionId: question.id,
                    content: toStringJson(content),
                    isCorrect,
                  });
                  await refresh();
                  toast.success("Option added.");
                  return true;
                } catch (error) {
                  toast.error(errorMessage(error));
                  return false;
                }
              }}
              onDeleteOption={async (optionId) => {
                try {
                  await deleteOption.mutateAsync({ optionId });
                  await refresh();
                  toast.success("Option deleted.");
                } catch (error) {
                  toast.error(errorMessage(error));
                }
              }}
              onUpdate={async (fields) => {
                try {
                  await updateQuestion.mutateAsync({
                    questionId: question.id,
                    ...fields,
                  });
                  await refresh();
                  toast.success("Question saved.");
                  return true;
                } catch (error) {
                  toast.error(errorMessage(error));
                  return false;
                }
              }}
              onUpdateOption={async (optionId, content, isCorrect) => {
                try {
                  await updateOption.mutateAsync({
                    optionId,
                    content: toStringJson(content),
                    isCorrect,
                  });
                  await refresh();
                  toast.success("Option saved.");
                  return true;
                } catch (error) {
                  toast.error(errorMessage(error));
                  return false;
                }
              }}
            />
          ))}
        </div>
      ) : (
        <div className="text-muted-foreground bg-muted/20 rounded-xl border border-dashed px-6 py-12 text-center text-sm">
          Add the first question to start building this assessment.
        </div>
      )}
    </section>
  );
}

function NewQuestionForm({
  busy,
  onCreate,
}: {
  busy: boolean;
  onCreate: (fields: {
    type: QuestionType;
    prompt: string;
    explanation: string;
    points: number;
  }) => Promise<boolean>;
}) {
  const [type, setType] = useState<QuestionType>("SINGLE_CHOICE");
  const [prompt, setPrompt] = useState("");
  const [explanation, setExplanation] = useState("");
  const [points, setPoints] = useState("1");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!prompt.trim()) {
      toast.error("Question prompt is required.");
      return;
    }
    const parsedPoints = parsePoints(points);
    if (parsedPoints === null) {
      toast.error("Points must be between 1 and 10,000.");
      return;
    }
    const created = await onCreate({
      type,
      prompt: prompt.trim(),
      explanation: explanation.trim(),
      points: parsedPoints,
    });
    if (created) {
      setPrompt("");
      setExplanation("");
      setPoints("1");
    }
  }

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <PlusIcon className="size-4" />
          Add question
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
            <div className="grid gap-2">
              <Label>Type</Label>
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
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(QUESTION_TYPE_LABEL) as QuestionType[]).map(
                    (key) => (
                      <SelectItem key={key} value={key}>
                        {QUESTION_TYPE_LABEL[key]}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-question-points">Points</Label>
              <Input
                id="new-question-points"
                inputMode="numeric"
                max={10000}
                min={1}
                onChange={(event) => setPoints(event.target.value)}
                type="number"
                value={points}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new-question-prompt">Prompt</Label>
            <Textarea
              id="new-question-prompt"
              maxLength={10000}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Ask the learner something…"
              rows={2}
              value={prompt}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new-question-explanation">
              Explanation{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Textarea
              id="new-question-explanation"
              maxLength={10000}
              onChange={(event) => setExplanation(event.target.value)}
              placeholder="Visible to learners after they answer."
              rows={2}
              value={explanation}
            />
          </div>
          <div className="flex justify-end">
            <Button disabled={busy} type="submit">
              {busy ? (
                <LoaderCircleIcon
                  className="animate-spin"
                  data-icon="inline-start"
                />
              ) : (
                <PlusIcon data-icon="inline-start" />
              )}
              Add question
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function QuestionCard({
  busy,
  index,
  question,
  onDelete,
  onCreateOption,
  onDeleteOption,
  onUpdate,
  onUpdateOption,
}: {
  busy: boolean;
  index: number;
  question: Question;
  onDelete: () => Promise<void>;
  onCreateOption: (content: string, isCorrect: boolean) => Promise<boolean>;
  onDeleteOption: (optionId: string) => Promise<void>;
  onUpdate: (fields: {
    type: QuestionType;
    prompt: string;
    explanation: string;
    points: number;
  }) => Promise<boolean>;
  onUpdateOption: (
    optionId: string,
    content: string,
    isCorrect: boolean,
  ) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [type, setType] = useState<QuestionType>(question.type);
  const [prompt, setPrompt] = useState(jsonValueToString(question.prompt));
  const [explanation, setExplanation] = useState(
    jsonValueToString(question.explanation),
  );
  const [points, setPoints] = useState(String(question.points));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!prompt.trim()) {
      toast.error("Question prompt is required.");
      return;
    }
    const parsedPoints = parsePoints(points);
    if (parsedPoints === null) {
      toast.error("Points must be between 1 and 10,000.");
      return;
    }
    const saved = await onUpdate({
      type,
      prompt: prompt.trim(),
      explanation: explanation.trim(),
      points: parsedPoints,
    });
    if (saved) setEditing(false);
  }

  function cancelEditing() {
    setType(question.type);
    setPrompt(jsonValueToString(question.prompt));
    setExplanation(jsonValueToString(question.explanation));
    setPoints(String(question.points));
    setEditing(false);
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <div className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-lg border text-xs font-semibold">
            {index + 1}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                {QUESTION_TYPE_LABEL[question.type] ?? question.type}
              </Badge>
              <span className="text-muted-foreground text-xs">
                {question.points} {question.points === 1 ? "point" : "points"}
              </span>
            </div>
            <p className="mt-2 text-sm whitespace-pre-wrap">
              {jsonValueToString(question.prompt) || (
                <span className="text-muted-foreground">
                  (no prompt provided)
                </span>
              )}
            </p>
            {question.explanation !== null &&
              jsonValueToString(question.explanation) !== "" && (
                <p className="text-muted-foreground mt-2 text-xs">
                  <span className="font-medium">Explanation:</span>{" "}
                  {jsonValueToString(question.explanation)}
                </p>
              )}
          </div>
          <div className="flex shrink-0 gap-1">
            <Button
              aria-label="Edit question"
              disabled={busy}
              onClick={() => setEditing(true)}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <PencilIcon />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button
                    aria-label="Delete question"
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
                  <AlertDialogTitle>Delete this question?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This question and all its options will be permanently
                    removed.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete} variant="destructive">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {editing && (
          <form
            className="bg-muted/30 grid gap-4 rounded-lg border p-4"
            onSubmit={handleSubmit}
          >
            <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
              <div className="grid gap-2">
                <Label htmlFor={`question-type-${question.id}`}>Type</Label>
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
                    {(Object.keys(QUESTION_TYPE_LABEL) as QuestionType[]).map(
                      (key) => (
                        <SelectItem key={key} value={key}>
                          {QUESTION_TYPE_LABEL[key]}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`question-points-${question.id}`}>Points</Label>
                <Input
                  id={`question-points-${question.id}`}
                  inputMode="numeric"
                  max={10000}
                  min={1}
                  onChange={(event) => setPoints(event.target.value)}
                  type="number"
                  value={points}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`question-prompt-${question.id}`}>Prompt</Label>
              <Textarea
                id={`question-prompt-${question.id}`}
                maxLength={10000}
                onChange={(event) => setPrompt(event.target.value)}
                rows={2}
                value={prompt}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`question-explanation-${question.id}`}>
                Explanation
              </Label>
              <Textarea
                id={`question-explanation-${question.id}`}
                maxLength={10000}
                onChange={(event) => setExplanation(event.target.value)}
                rows={2}
                value={explanation}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={cancelEditing}>
                <XIcon data-icon="inline-start" />
                Cancel
              </Button>
              <Button disabled={busy} type="submit">
                {busy && <LoaderCircleIcon className="animate-spin" />}
                Save question
              </Button>
            </div>
          </form>
        )}

        {question.type !== "WRITTEN" && (
          <OptionsSection
            busy={busy}
            onCreateOption={onCreateOption}
            onDeleteOption={onDeleteOption}
            onUpdateOption={onUpdateOption}
            options={question.options}
            type={question.type}
          />
        )}
      </CardContent>
    </Card>
  );
}

function OptionsSection({
  busy,
  options,
  onCreateOption,
  onDeleteOption,
  onUpdateOption,
  type,
}: {
  busy: boolean;
  options: Option[];
  type: QuestionType;
  onCreateOption: (content: string, isCorrect: boolean) => Promise<boolean>;
  onDeleteOption: (optionId: string) => Promise<void>;
  onUpdateOption: (
    optionId: string,
    content: string,
    isCorrect: boolean,
  ) => Promise<boolean>;
}) {
  const [content, setContent] = useState("");
  const [isCorrect, setIsCorrect] = useState(false);
  const multipleChoice = type === "MULTIPLE_CHOICE";
  const correctOptionId = options.find((option) => option.isCorrect)?.id ?? "";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!content.trim()) {
      toast.error("Option content is required.");
      return;
    }
    const created = await onCreateOption(content.trim(), isCorrect);
    if (created) {
      setContent("");
      setIsCorrect(false);
    }
  }

  return (
    <div className="ml-12 grid gap-4">
      <Separator />
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium">Options</h3>
        {multipleChoice ? (
          <div className="flex items-center gap-1.5">
            <Checkbox
              aria-label="Mark new option correct"
              checked={isCorrect}
              onCheckedChange={(checked) => setIsCorrect(Boolean(checked))}
            />
            <Label className="text-muted-foreground text-xs">Correct</Label>
          </div>
        ) : (
          <RadioGroup
            aria-label="New option correctness"
            value={isCorrect ? "correct" : "not-correct"}
            onValueChange={(value) => setIsCorrect(value === "correct")}
            className="flex items-center gap-3"
          >
            <Label className="text-muted-foreground gap-1.5 text-xs">
              <Radio value="correct" aria-label="Mark new option correct" />
              Correct
            </Label>
            <Label className="text-muted-foreground gap-1.5 text-xs">
              <Radio
                value="not-correct"
                aria-label="Leave new option incorrect"
              />
              Not correct
            </Label>
          </RadioGroup>
        )}
      </div>
      <form
        className="flex flex-col gap-2 sm:flex-row sm:items-center"
        onSubmit={handleSubmit}
      >
        <Input
          aria-label="New option content"
          className="flex-1"
          onChange={(event) => setContent(event.target.value)}
          placeholder="Add an option…"
          value={content}
        />
        <Button disabled={busy} size="sm" type="submit" variant="outline">
          {busy && <LoaderCircleIcon className="animate-spin" />}
          Add option
        </Button>
      </form>

      {options.length ? (
        multipleChoice ? (
          <div className="grid gap-2">
            {options.map((option) => (
              <div
                className="bg-muted/30 flex items-center gap-2 rounded-lg border px-3 py-2"
                key={option.id}
              >
                <Checkbox
                  aria-label="Mark option correct"
                  checked={option.isCorrect}
                  onCheckedChange={(checked) =>
                    onUpdateOption(
                      option.id,
                      jsonValueToString(option.content),
                      Boolean(checked),
                    )
                  }
                />
                <span className="min-w-0 flex-1 truncate text-sm">
                  {jsonValueToString(option.content)}
                </span>
                <Button
                  aria-label="Delete option"
                  disabled={busy}
                  onClick={() => onDeleteOption(option.id)}
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                >
                  <Trash2Icon />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <RadioGroup
            aria-label="Correct option"
            value={correctOptionId}
            onValueChange={(value) => {
              const selected = options.find((option) => option.id === value);
              if (selected) {
                void onUpdateOption(
                  selected.id,
                  jsonValueToString(selected.content),
                  true,
                );
              }
            }}
          >
            <div className="grid gap-2">
              {options.map((option, optionIndex) => (
                <div
                  className="bg-muted/30 flex items-center gap-2 rounded-lg border px-3 py-2"
                  key={option.id}
                >
                  <Label className="min-w-0 flex-1 items-center gap-2">
                    <Radio
                      aria-label={`Mark option ${optionIndex + 1} correct`}
                      value={option.id}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {jsonValueToString(option.content)}
                    </span>
                  </Label>
                  <Button
                    aria-label="Delete option"
                    disabled={busy}
                    onClick={() => onDeleteOption(option.id)}
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              ))}
            </div>
          </RadioGroup>
        )
      ) : (
        <p className="text-muted-foreground text-xs">
          No options yet. Add at least two for a valid choice question.
        </p>
      )}
    </div>
  );
}
