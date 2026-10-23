// The shape of the Hangeul Mastery course as authored in ./content. The
// importer (./import.ts) turns it into Prisma rows with stable ids derived from
// each `key`, so a key must never change once the course is in production
// (learner progress hangs on the ids). Titles and text can change freely.
//
// Cross references (vocabularyReference / assessmentReference blocks and
// material requirements) use the `key` of an item in the same module.
// Audio is referenced by the Korean text to speak (see `audio()` in
// ./blocks.ts); the importer generates and uploads each clip once and swaps
// the placeholder for the uploaded asset id.

export type BlockNoteBlock = {
  type: string;
  props?: Record<string, unknown>;
  content?: unknown;
  children?: BlockNoteBlock[];
};

export type RequirementContent =
  | { type: "assessment"; key: string; minimumScore?: number }
  | { type: "vocabulary"; key: string };

export type MaterialContent = {
  type: "material";
  key: string;
  title: string;
  description: string;
  /** Estimated minutes, shown in the description by the author if wanted. */
  minutes?: number;
  blocks: BlockNoteBlock[];
  requirements?: RequirementContent[];
};

export type VocabularyEntryContent = {
  /** Korean, Hangeul only. Changing it resets learners' progress on the entry. */
  term: string;
  /** Indonesian meaning. Changing it resets learners' progress on the entry. */
  definition: string;
  romanization: string;
  /** Short example sentences or notes in Indonesian/Korean. */
  examples?: string[];
};

export type VocabularySetContent = {
  type: "vocabulary";
  key: string;
  title: string;
  description: string;
  entries: VocabularyEntryContent[];
};

export type QuestionOptionContent = {
  /** Plain text, or blocks (for example an audio clip as the option). */
  content: string | BlockNoteBlock[];
  correct?: boolean;
};

export type QuestionContent = {
  key: string;
  type?: "SINGLE_CHOICE" | "MULTIPLE_CHOICE";
  /** Plain text, or blocks (text plus an audio clip for listening items). */
  prompt: string | BlockNoteBlock[];
  explanation?: string | BlockNoteBlock[];
  points?: number;
  options: QuestionOptionContent[];
};

export type AssessmentContent = {
  type: "assessment";
  key: string;
  title: string;
  description: string;
  instructions?: string | BlockNoteBlock[];
  /** Percent needed to pass; the item completes only on a pass. */
  passingScore: number;
  timeLimitMinutes?: number;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  questions: QuestionContent[];
};

export type ItemContent =
  MaterialContent | VocabularySetContent | AssessmentContent;

export type ModuleContent = {
  key: string;
  title: string;
  description: string;
  items: ItemContent[];
};

export type CourseContent = {
  title: string;
  description: string;
  modules: ModuleContent[];
};
