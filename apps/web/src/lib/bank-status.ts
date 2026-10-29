/**
 * Bank question statuses (docs/eps-question-generator.md section 6), shared by the superadmin bank
 * page and the server: DRAFT → REVIEW → LIVE, and RETIRED instead of deleted. The generator picks
 * only LIVE questions.
 */

/**
 * What `BankQuestion.meta` may hold, as read back by the bank page, the editor and the media
 * services (AI drafts write the full shape, see `server/bank/ai-drafts.ts`).
 */
export type BankMetaView = {
  flags?: Array<{ code: string; message: string }>;
  mediaBrief?: string | null;
  optionBriefs?: string[] | null;
  script?: Array<{ speaker: string; text: string }>;
};

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

/**
 * Why a question can't go to review or live yet, in Indonesian (null when it can). Media come
 * first: the founder reviews pictures and audio together with the Korean.
 */
export function bankReadinessProblem(question: {
  type: string;
  tags: readonly string[];
  optionCount: number;
  correctCount: number;
  /** The prompt has no text or media yet (the editor saves drafts as they are). */
  promptEmpty?: boolean;
  /** Options with no text or media yet. */
  emptyOptions?: number;
  /** What its EPS type needs, and what it has (see `bankMediaState`). */
  media?: {
    needsPromptImage: boolean;
    promptHasImage: boolean;
    needsOptionImages: boolean;
    optionImagesMissing: number;
    needsAudio: boolean;
    hasAudio: boolean;
  };
}) {
  if (question.type !== "SINGLE_CHOICE") return "harus pilihan tunggal";
  if (question.promptEmpty) return "pertanyaan belum diisi";
  if (question.optionCount !== 4) return "harus punya 4 pilihan";
  if (question.emptyOptions) {
    return `${question.emptyOptions} pilihan masih kosong`;
  }
  if (question.correctCount !== 1) return "harus punya tepat 1 jawaban benar";
  if (!question.tags.some((tag) => tag.startsWith("eps:"))) {
    return "tipe soal belum dipilih";
  }
  if (!question.tags.some((tag) => tag.startsWith("level:"))) {
    return "tingkat belum dipilih";
  }
  const media = question.media;
  if (media?.needsPromptImage && !media.promptHasImage) {
    return "gambar soal belum ada";
  }
  if (media?.needsOptionImages && media.optionImagesMissing) {
    return `${media.optionImagesMissing} gambar pilihan belum ada`;
  }
  if (media?.needsAudio && !media.hasAudio) return "audio belum ada";
  return null;
}

const blockTypes = (content: unknown) =>
  Array.isArray(content)
    ? content.flatMap((block: unknown) =>
        typeof block === "object" && block !== null && "type" in block
          ? [String(block.type)]
          : [],
      )
    : [];

/** Whether rich content shows a picture. */
export const contentHasImage = (content: unknown) =>
  blockTypes(content).some((type) => type === "assetImage" || type === "image");
const hasAudio = (content: unknown) =>
  blockTypes(content).some((type) => type === "assetAudio" || type === "audio");

/** The media a bank question's type needs and what its content has. */
export function bankMediaState(input: {
  type?: {
    promptMedia: string;
    optionsAreImages: boolean;
    audio: string;
  };
  prompt: unknown;
  options: ReadonlyArray<{ content: unknown }>;
}) {
  return {
    needsPromptImage: Boolean(input.type && input.type.promptMedia !== "none"),
    promptHasImage: contentHasImage(input.prompt),
    needsOptionImages: Boolean(input.type?.optionsAreImages),
    optionImagesMissing: input.options.filter(
      (option) => !contentHasImage(option.content),
    ).length,
    needsAudio: Boolean(input.type && input.type.audio !== "none"),
    hasAudio:
      hasAudio(input.prompt) ||
      input.options.some((option) => hasAudio(option.content)),
  };
}
