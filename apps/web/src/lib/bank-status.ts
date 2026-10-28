/**
 * Bank question statuses (docs/eps-question-generator.md section 6), shared by the superadmin bank
 * page and the server: DRAFT → REVIEW → LIVE, and RETIRED instead of deleted. The generator picks
 * only LIVE questions.
 */

export const bankStatuses = ["DRAFT", "REVIEW", "LIVE", "RETIRED"] as const;
export type BankStatus = (typeof bankStatuses)[number];

export const bankStatusLabels: Record<BankStatus, string> = {
  DRAFT: "Draf",
  REVIEW: "Perlu review",
  LIVE: "Siap dipakai",
  RETIRED: "Pensiun",
};

/** Allowed moves: forward through review, back to draft from review, retire or revive. */
export const bankTransitions: Record<BankStatus, readonly BankStatus[]> = {
  DRAFT: ["REVIEW", "RETIRED"],
  REVIEW: ["LIVE", "DRAFT", "RETIRED"],
  LIVE: ["RETIRED", "REVIEW"],
  RETIRED: ["REVIEW"],
};

/** The most questions one status change moves; also how many the page lists. */
export const MAX_BANK_BATCH = 500;

/** Why a question can't go to review or live yet, in Indonesian (null when it can). */
export function bankReadinessProblem(question: {
  type: string;
  tags: readonly string[];
  optionCount: number;
  correctCount: number;
}) {
  if (question.type !== "SINGLE_CHOICE") return "harus pilihan tunggal";
  if (question.optionCount !== 4) return "harus punya 4 pilihan";
  if (question.correctCount !== 1) return "harus punya tepat 1 jawaban benar";
  if (!question.tags.some((tag) => tag.startsWith("eps:"))) {
    return "belum diberi label tipe (eps:…)";
  }
  if (!question.tags.some((tag) => tag.startsWith("level:"))) {
    return "belum diberi label tingkat (level:…)";
  }
  return null;
}
