"use client";

import { PlusIcon, XIcon } from "lucide-react";

import {
  AiImageImportDialog,
  useAiImageImport,
  type PreparedImportImage,
} from "~/components/ai-image-import";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Skeleton } from "~/components/ui/skeleton";
import { Textarea } from "~/components/ui/textarea";
import {
  getAssessmentOptionLabel,
  MAX_ASSESSMENT_OPTIONS,
  MIN_ASSESSMENT_OPTIONS,
} from "~/lib/assessment-options";
import { cn } from "~/lib/utils";

type QuestionType = "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "WRITTEN";

export type ExtractedAssessmentQuestion = {
  type: QuestionType;
  prompt: string;
  options: { text: string; isCorrect: boolean }[];
  answerSource: "image" | "ai" | "none";
  explanation: string;
};

export type ImportedAssessmentQuestion = {
  type: QuestionType;
  prompt: string;
  explanation: string;
  points: number;
  options: { text: string; isCorrect: boolean }[];
};

type ReviewOption = { key: number; text: string; isCorrect: boolean };

type ReviewRow = {
  key: number;
  selected: boolean;
  type: QuestionType;
  prompt: string;
  explanation: string;
  points: string;
  options: ReviewOption[];
  answerSource: ExtractedAssessmentQuestion["answerSource"];
};

const questionTypeLabels: Record<QuestionType, string> = {
  SINGLE_CHOICE: "Pilihan tunggal",
  MULTIPLE_CHOICE: "Pilihan ganda",
  WRITTEN: "Jawaban tertulis",
};

const answerSourceLabels: Record<ReviewRow["answerSource"], string> = {
  image: "Kunci dari gambar",
  ai: "Kunci dari AI — periksa",
  none: "Belum ada kunci",
};

let optionKey = 0;

function rowIssue(row: ReviewRow) {
  if (!row.prompt.trim()) return "Pertanyaan belum diisi";
  const points = Number(row.points);
  if (!Number.isInteger(points) || points < 1) return "Poin minimal 1";
  if (row.type === "WRITTEN") return null;
  if (row.options.length < MIN_ASSESSMENT_OPTIONS) return "Minimal dua opsi";
  if (row.options.some((option) => !option.text.trim())) {
    return "Ada opsi yang kosong";
  }
  return null;
}

/** Question screenshot → AI scan → adjust questions → append them. */
export function useAssessmentImageImport({
  onExtract,
  onSave,
}: {
  onExtract: (
    image: PreparedImportImage,
  ) => Promise<ExtractedAssessmentQuestion[]>;
  onSave: (questions: ImportedAssessmentQuestion[]) => Promise<boolean>;
}) {
  const importer = useAiImageImport<ReviewRow>({
    emptyMessage: "Tidak ada soal yang terbaca dari gambar ini.",
    extract: async (image) =>
      (await onExtract(image)).map((question, key) => ({
        key,
        selected: true,
        type: question.type,
        prompt: question.prompt,
        explanation: question.explanation,
        points: "1",
        options: question.options.map((option) => ({
          key: optionKey++,
          ...option,
        })),
        answerSource: question.answerSource,
      })),
  });
  const { rows } = importer;

  function updateRow(key: number, update: (row: ReviewRow) => ReviewRow) {
    importer.updateRows((current) =>
      current.map((row) => (row.key === key ? update(row) : row)),
    );
  }

  function setType(row: ReviewRow, type: QuestionType): ReviewRow {
    if (type === "SINGLE_CHOICE") {
      // Keep only the first correct option when narrowing to one answer.
      let seen = false;
      return {
        ...row,
        type,
        options: row.options.map((option) => {
          const isCorrect = option.isCorrect && !seen;
          if (isCorrect) seen = true;
          return { ...option, isCorrect };
        }),
      };
    }
    if (type !== "WRITTEN" && row.options.length < MIN_ASSESSMENT_OPTIONS) {
      return {
        ...row,
        type,
        options: [
          ...row.options,
          ...Array.from(
            { length: MIN_ASSESSMENT_OPTIONS - row.options.length },
            () => ({ key: optionKey++, text: "", isCorrect: false }),
          ),
        ],
      };
    }
    return { ...row, type };
  }

  const selectedRows = rows.filter((row) => row.selected);
  const allSelected = rows.length > 0 && selectedRows.length === rows.length;
  const invalidCount = selectedRows.filter(rowIssue).length;

  const dialog = (
    <AiImageImportDialog
      importer={importer}
      onSave={() =>
        void importer.save(() =>
          onSave(
            selectedRows.map((row) => ({
              type: row.type,
              prompt: row.prompt.trim(),
              explanation: row.explanation.trim(),
              points: Number(row.points),
              options:
                row.type === "WRITTEN"
                  ? []
                  : row.options.map((option) => ({
                      text: option.text.trim(),
                      isCorrect: option.isCorrect,
                    })),
            })),
          ),
        )
      }
      reviewDescription="Periksa soal, opsi, dan kunci jawaban hasil bacaan AI, lalu tambahkan ke assessment."
      saveDisabled={!selectedRows.length || invalidCount > 0}
      saveLabel={`Tambah ${selectedRows.length} soal`}
      scanningDescription="AI sedang memindai gambar dan menyusun soal."
      scanningLabel="Membaca pertanyaan, opsi, dan kunci jawaban…"
      skeleton={Array.from({ length: 3 }, (_, index) => (
        <div className="grid gap-2 rounded-lg border p-3" key={index}>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-14" />
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
          </div>
        </div>
      ))}
      title="Impor soal dengan AI"
    >
      <div className="flex items-center justify-between gap-2 text-xs">
        <label className="flex items-center gap-2 font-medium">
          <Checkbox
            checked={allSelected}
            indeterminate={!allSelected && selectedRows.length > 0}
            onCheckedChange={(checked) =>
              importer.updateRows((current) =>
                current.map((row) => ({ ...row, selected: checked })),
              )
            }
          />
          {rows.length} soal terbaca
        </label>
        <span
          className={cn(
            "text-muted-foreground",
            invalidCount && "text-destructive",
          )}
        >
          {invalidCount
            ? `${invalidCount} soal perlu diperbaiki`
            : "Pembahasan dalam Bahasa Indonesia"}
        </span>
      </div>
      <ol className="-mr-2 grid min-h-0 flex-1 content-start gap-2 overflow-y-auto pr-2">
        {rows.map((row, index) => {
          const issue = row.selected ? rowIssue(row) : null;
          return (
            <li
              className={cn(
                "grid gap-2 rounded-lg border p-3 transition-opacity",
                !row.selected && "opacity-55",
                issue && "border-destructive/50",
              )}
              key={row.key}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Checkbox
                  aria-label={`Tambahkan soal ${index + 1}`}
                  checked={row.selected}
                  onCheckedChange={(checked) =>
                    updateRow(row.key, (current) => ({
                      ...current,
                      selected: checked,
                    }))
                  }
                />
                <span className="text-sm font-medium">Soal {index + 1}</span>
                <Select
                  onValueChange={(value) => {
                    if (
                      value === "SINGLE_CHOICE" ||
                      value === "MULTIPLE_CHOICE" ||
                      value === "WRITTEN"
                    ) {
                      updateRow(row.key, (current) => setType(current, value));
                    }
                  }}
                  value={row.type}
                >
                  <SelectTrigger
                    aria-label="Jenis soal"
                    className="h-7 w-40"
                    size="sm"
                  >
                    <SelectValue>{questionTypeLabels[row.type]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SINGLE_CHOICE">
                      Pilihan tunggal
                    </SelectItem>
                    <SelectItem value="MULTIPLE_CHOICE">
                      Pilihan ganda
                    </SelectItem>
                    <SelectItem value="WRITTEN">Jawaban tertulis</SelectItem>
                  </SelectContent>
                </Select>
                <label className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  Poin
                  <Input
                    aria-invalid={Boolean(issue?.startsWith("Poin"))}
                    className="h-7 w-14"
                    inputMode="numeric"
                    onChange={(event) =>
                      updateRow(row.key, (current) => ({
                        ...current,
                        points: event.target.value,
                      }))
                    }
                    value={row.points}
                  />
                </label>
                {row.type !== "WRITTEN" ? (
                  <Badge
                    className="ml-auto"
                    variant={
                      row.answerSource === "ai" ? "secondary" : "outline"
                    }
                  >
                    {answerSourceLabels[row.answerSource]}
                  </Badge>
                ) : null}
              </div>

              <Textarea
                aria-invalid={row.selected && !row.prompt.trim()}
                aria-label="Pertanyaan"
                className="field-sizing-content max-h-48 min-h-14 resize-none text-sm"
                onChange={(event) =>
                  updateRow(row.key, (current) => ({
                    ...current,
                    prompt: event.target.value,
                  }))
                }
                placeholder="Pertanyaan"
                value={row.prompt}
              />

              {row.type !== "WRITTEN" ? (
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {row.options.map((option, optionIndex) => (
                    <div
                      className={cn(
                        "flex items-center gap-1.5 rounded-md border px-1.5 py-1",
                        option.isCorrect && "border-primary/60 bg-primary/5",
                      )}
                      key={option.key}
                    >
                      <Checkbox
                        aria-label={`Tandai ${getAssessmentOptionLabel(optionIndex)} sebagai jawaban benar`}
                        checked={option.isCorrect}
                        onCheckedChange={(checked) =>
                          updateRow(row.key, (current) => ({
                            ...current,
                            answerSource: "image",
                            options: current.options.map((candidate) =>
                              candidate.key === option.key
                                ? { ...candidate, isCorrect: checked }
                                : checked && current.type === "SINGLE_CHOICE"
                                  ? { ...candidate, isCorrect: false }
                                  : candidate,
                            ),
                          }))
                        }
                      />
                      <span className="text-muted-foreground text-sm">
                        {getAssessmentOptionLabel(optionIndex)}
                      </span>
                      <Input
                        aria-invalid={row.selected && !option.text.trim()}
                        aria-label={`Opsi ${optionIndex + 1}`}
                        className="h-7 min-w-0 flex-1 border-0 px-1 shadow-none focus-visible:ring-1"
                        onChange={(event) =>
                          updateRow(row.key, (current) => ({
                            ...current,
                            options: current.options.map((candidate) =>
                              candidate.key === option.key
                                ? { ...candidate, text: event.target.value }
                                : candidate,
                            ),
                          }))
                        }
                        value={option.text}
                      />
                      {row.options.length > MIN_ASSESSMENT_OPTIONS ? (
                        <Button
                          aria-label={`Hapus opsi ${optionIndex + 1}`}
                          onClick={() =>
                            updateRow(row.key, (current) => ({
                              ...current,
                              options: current.options.filter(
                                (candidate) => candidate.key !== option.key,
                              ),
                            }))
                          }
                          size="icon-xs"
                          type="button"
                          variant="ghost"
                        >
                          <XIcon />
                        </Button>
                      ) : null}
                    </div>
                  ))}
                  {row.options.length < MAX_ASSESSMENT_OPTIONS ? (
                    <Button
                      className="justify-start"
                      onClick={() =>
                        updateRow(row.key, (current) => ({
                          ...current,
                          options: [
                            ...current.options,
                            { key: optionKey++, text: "", isCorrect: false },
                          ],
                        }))
                      }
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      <PlusIcon data-icon="inline-start" />
                      Opsi
                    </Button>
                  ) : null}
                </div>
              ) : null}

              <Textarea
                aria-label="Pembahasan"
                className="field-sizing-content max-h-32 min-h-8 resize-none py-1.5 text-xs"
                onChange={(event) =>
                  updateRow(row.key, (current) => ({
                    ...current,
                    explanation: event.target.value,
                  }))
                }
                placeholder="Pembahasan (opsional)"
                rows={1}
                value={row.explanation}
              />
              {issue ? (
                <p className="text-destructive text-xs">{issue}</p>
              ) : null}
            </li>
          );
        })}
      </ol>
    </AiImageImportDialog>
  );

  return { busy: importer.busy, dialog, start: importer.start };
}
