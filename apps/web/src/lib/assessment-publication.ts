import { MIN_ASSESSMENT_OPTIONS } from "~/lib/assessment-options";
import { hasBlockNoteContent } from "~/lib/blocknote/document";

type PublishableQuestion = {
  type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "WRITTEN";
  prompt: unknown;
  options: Array<{ content: unknown; isCorrect: boolean }>;
};

export function getAssessmentPublishValidationError(
  questions: PublishableQuestion[],
) {
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
