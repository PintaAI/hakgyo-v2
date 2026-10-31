// Builders for the curriculum content in ./content. They keep content files
// readable and produce the BlockNote JSON the block catalog validates. Links
// to other materials are written with `ref()` by material and section key;
// the importer turns them into `hakgyo-material:<id>#<blockId>` hrefs and
// fails when a key does not exist in ./manifest.ts.
import {
  conversationBlockDefaults,
  cultureBlockDefaults,
  lessonPageDefaults,
} from "~/lib/blocknote/block-catalog";

import type { PolaMaterialKey, PolaSectionKey } from "./manifest";

export type BlockNoteBlock = {
  id?: string;
  type: string;
  props?: Record<string, unknown>;
  content?: unknown;
  children?: BlockNoteBlock[];
};

/** Href placeholder of a link to another curriculum material. */
export const REF_PREFIX = "pola-ref:";

type Styled = { text: string; bold?: boolean; italic?: boolean };
type RefPart = { text: string; ref: string; bold?: boolean };
export type Inline = string | Styled | RefPart;

const styles = (part: { bold?: boolean; italic?: boolean }) => ({
  ...(part.bold ? { bold: true } : {}),
  ...(part.italic ? { italic: true } : {}),
});

export function inline(parts: Inline[]) {
  return parts.map((part) => {
    if (typeof part === "string") {
      return { type: "text", text: part, styles: {} };
    }
    if ("ref" in part) {
      return {
        type: "link",
        href: part.ref,
        content: [{ type: "text", text: part.text, styles: styles(part) }],
      };
    }
    return { type: "text", text: part.text, styles: styles(part) };
  });
}

/** Bold text, used for Korean forms and key words. */
export const b = (text: string): Styled => ({ text, bold: true });
/** Italic text, used for Indonesian glosses. */
export const i = (text: string): Styled => ({ text, italic: true });

/**
 * A link to another material, optionally to one of its sections:
 * `ref("-는데", "ki-alasan-urutan", "neunde")`.
 */
export function ref<M extends PolaMaterialKey>(
  text: string,
  material: M,
  section?: PolaSectionKey<M>,
): RefPart {
  return {
    text,
    bold: true,
    ref: `${REF_PREFIX}${material}${section ? `#${section}` : ""}`,
  };
}

export const p = (...parts: Inline[]): BlockNoteBlock => ({
  type: "paragraph",
  content: inline(parts),
});

/** A sub-heading inside a section (sections get their level-2 heading automatically). */
export const h3 = (...parts: Inline[]): BlockNoteBlock => ({
  type: "heading",
  props: { level: 3 },
  content: inline(parts),
});

export const bullet = (...parts: Inline[]): BlockNoteBlock => ({
  type: "bulletListItem",
  content: inline(parts),
});

export const numbered = (...parts: Inline[]): BlockNoteBlock => ({
  type: "numberedListItem",
  content: inline(parts),
});

export const quote = (...parts: Inline[]): BlockNoteBlock => ({
  type: "quote",
  content: inline(parts),
});

export const divider = (): BlockNoteBlock => ({ type: "divider" });

/**
 * A highlighted note. Tones: "info" (penjelasan), "tip" (trik),
 * "warning" (jebakan), "success" (rangkuman / kamu udah bisa).
 */
export const callout = (
  tone: "info" | "tip" | "warning" | "success",
  ...parts: Inline[]
): BlockNoteBlock => ({
  type: "callout",
  props: { tone },
  content: inline(parts),
});

/** One example sentence: Korean in bold, then the Indonesian meaning. */
export const ex = (
  korean: string,
  indonesian: string,
  note?: string,
): BlockNoteBlock =>
  bullet(b(korean), " → ", i(indonesian), ...(note ? [` (${note})`] : []));

export type ChatLine = { who: string; ko: string; id: string };

export type ChatOptions = {
  /** Comprehension questions under the dialogue (up to 8). */
  questions?: { ko: string; id: string }[];
  /** A short tip panel under the dialogue. */
  tip?: { title: string; ko: string; id: string };
  theme?: "violet" | "blue" | "green" | "rose";
};

/** Blanks every text prop of a block's defaults, so no sample content leaks in. */
function blankStrings<T extends Record<string, unknown>>(defaults: T) {
  return Object.fromEntries(
    Object.entries(defaults).map(([key, value]) => [
      key,
      typeof value === "string" ? "" : value,
    ]),
  );
}

/**
 * A dialogue as the conversation block (speaker, Korean and Indonesian per
 * line, up to 16 lines). Spread it: `...chat([...])`.
 */
export const chat = (
  lines: ChatLine[],
  options: ChatOptions = {},
): BlockNoteBlock[] => [
  {
    type: "conversation",
    props: {
      ...blankStrings(conversationBlockDefaults),
      theme: options.theme ?? "violet",
      sectionVariant: conversationBlockDefaults.sectionVariant,
      showUsefulExpressionNote: false,
      showTip: !!options.tip,
      eyebrow: "대화 · obrolan",
      lines: JSON.stringify(
        lines.map((line) => ({
          speaker: line.who,
          korean: line.ko,
          translation: line.id,
        })),
      ),
      questionsLabel: options.questions?.length
        ? "대답해 봐요! · jawab yuk!"
        : "",
      questions: JSON.stringify(
        (options.questions ?? []).map((question) => ({
          korean: question.ko,
          translation: question.id,
        })),
      ),
      tipTitle: options.tip?.title ?? "",
      tipBody: options.tip?.ko ?? "",
      tipTranslation: options.tip?.id ?? "",
      practiceExpressions: "[]",
      practiceDialogue: "[]",
      usefulExpressionDialogue: "[]",
      pronunciationExamples: "[]",
    },
  },
];

export type OpenerInput = {
  /** Small label above the title, for example "PAHAM POLA · BAB 2". */
  eyebrow: string;
  /** Two-digit material number, for example "02". */
  chapterNumber: string;
  /** Title in Korean, for example "이유와 순서". */
  titleKo: string;
  /** Indonesian subtitle (Gen Z casual). */
  subtitle: string;
  /** A two-line hook dialogue: a Korean question and its answer. */
  question: string;
  answer: string;
  /** Three focus cards: label, title, short description. */
  focus: [OpenerFocus, OpenerFocus, OpenerFocus];
  /** Two learning objectives, Korean and Indonesian. */
  objectives: [{ ko: string; id: string }, { ko: string; id: string }];
  theme?: "rose" | "ocean" | "forest" | "sunset";
};

type OpenerFocus = { label: string; title: string; description: string };

/** The lesson opener (lessonPage block); put it first in `intro`. */
export function opener(input: OpenerInput): BlockNoteBlock {
  const [grammarFocus, vocabularyFocus, cultureFocus] = input.focus;
  return {
    type: "lessonPage",
    props: {
      ...blankStrings(lessonPageDefaults),
      theme: input.theme ?? "ocean",
      assetId: "",
      fileName: "",
      contentType: "",
      eyebrow: input.eyebrow,
      chapterNumber: input.chapterNumber,
      title: input.titleKo,
      subtitle: input.subtitle,
      question: input.question,
      answer: input.answer,
      grammarLabel: grammarFocus.label,
      grammarTitle: grammarFocus.title,
      grammarDescription: grammarFocus.description,
      vocabularyLabel: vocabularyFocus.label,
      vocabularyTitle: vocabularyFocus.title,
      vocabularyDescription: vocabularyFocus.description,
      cultureLabel: cultureFocus.label,
      cultureTitle: cultureFocus.title,
      cultureDescription: cultureFocus.description,
      objectivesLabel: "학습 목표 · TUJUAN BELAJAR",
      objectiveOne: `${input.objectives[0].ko}\n${input.objectives[0].id}`,
      objectiveTwo: `${input.objectives[1].ko}\n${input.objectives[1].id}`,
    },
  };
}

export type CultureInput = {
  titleKo: string;
  /** Indonesian title. */
  titleId: string;
  /** Paragraphs, Korean then Indonesian. */
  paragraphs: { ko: string; id: string }[];
  /** Optional self-check list ("Aku udah bisa..."). */
  checklist?: { ko: string; id: string }[];
  theme?: "teal" | "rose" | "ocean" | "amber";
};

/** A bilingual culture / etiquette article (culture block, text only). */
export function culture(input: CultureInput): BlockNoteBlock {
  return {
    type: "culture",
    props: {
      ...blankStrings(cultureBlockDefaults),
      theme: input.theme ?? "teal",
      headerAlignment: cultureBlockDefaults.headerAlignment,
      showBanner: false,
      spacing: cultureBlockDefaults.spacing,
      surface: cultureBlockDefaults.surface,
      eyebrow: "문화와 정보 · BUDAYA & INFO",
      titleKo: input.titleKo,
      titleEn: input.titleId,
      sections: JSON.stringify(
        input.paragraphs.map((paragraph, index) => ({
          id: `text-${index}`,
          type: "text",
          ko: paragraph.ko,
          en: paragraph.id,
        })),
      ),
      showChecklist: !!input.checklist?.length,
      checklistTitleKo: input.checklist?.length ? "확인해요" : "",
      checklistTitleEn: input.checklist?.length ? "cek dirimu" : "",
      checklistItems: JSON.stringify(
        (input.checklist ?? []).map((item) => ({ ko: item.ko, en: item.id })),
      ),
    },
  };
}

/** Placeholder the importer swaps for this material's quiz id. */
export const QUIZ_REFERENCE = "pola-quiz:self";

/** Embeds this material's quiz (see `quiz` on the material); put it in `outro`. */
export const quizRef = (): BlockNoteBlock => ({
  type: "assessmentReference",
  props: { assessmentId: QUIZ_REFERENCE },
});

/** A table; the first row is the header. Cells may contain links. */
export function table(rows: Inline[][]): BlockNoteBlock {
  return {
    type: "table",
    content: {
      type: "tableContent",
      headerRows: 1,
      rows: rows.map((cells) => ({
        cells: cells.map((cell) => ({
          type: "tableCell",
          content: inline([cell]),
        })),
      })),
    },
  };
}

export type GrammarInput = {
  /** Shown as the card number, for example "07". */
  number: string;
  /** The pattern, for example "-는데 / -(으)ㄴ데". */
  title: string;
  /** One-sentence explanation in Korean (simple). */
  descriptionKo: string;
  /** The main explanation in Indonesian (Gen Z casual, clear). */
  descriptionTranslation: string;
  /** How the form attaches: up to 12 rows. */
  rules?: { condition: string; form: string; example: string }[];
  /** Korean example sentences; `emphasis` is the pattern part. Up to 12. */
  examples?: { before: string; emphasis: string; after: string }[];
  tipKo?: string;
  tipTranslation?: string;
  theme?: "amber" | "blue" | "green" | "rose";
};

/** The grammar card block (one per pattern section, usually first). */
export function grammar(input: GrammarInput): BlockNoteBlock {
  const tip = Boolean(input.tipKo) || Boolean(input.tipTranslation);
  return {
    type: "grammar",
    props: {
      theme: input.theme ?? "amber",
      showTip: tip,
      number: input.number,
      eyebrow: "문법 · Tata bahasa",
      title: input.title,
      descriptionKo: input.descriptionKo,
      descriptionTranslation: input.descriptionTranslation,
      ruleColumnOne: "Kalau",
      ruleColumnTwo: "Pakai",
      ruleColumnThree: "Contoh",
      ruleRows: JSON.stringify(input.rules ?? []),
      examplesLabel: "예문 · contoh",
      examples: JSON.stringify(input.examples ?? []),
      tipTitle: "꿀팁 · TIP",
      tipKo: input.tipKo ?? "",
      tipTranslation: input.tipTranslation ?? "",
    },
  };
}

export type SectionContent<M extends PolaMaterialKey> = {
  key: PolaSectionKey<M>;
  /** Heading of the section; links to this section open here. */
  title: string;
  blocks: BlockNoteBlock[];
};

export type MaterialContent<M extends PolaMaterialKey = PolaMaterialKey> = {
  key: M;
  title: string;
  /** One or two sentences shown in course lists and link previews. */
  description: string;
  /** Blocks before the first section (hook + what you'll learn). */
  intro: BlockNoteBlock[];
  /** Exactly the sections listed for this material in ./manifest.ts, in order. */
  sections: SectionContent<M>[];
  /** Blocks after the last section (rangkuman, then `quizRef()`). */
  outro?: BlockNoteBlock[];
  /** The material's quiz, imported as an assessment item right after it. */
  quiz?: QuizContent;
};

export type QuizQuestion = {
  /** Stable key within the quiz (learner answers hang on it). */
  key: string;
  /** The question in Indonesian, may contain Korean. */
  prompt: string;
  /** 3–4 options; exactly one correct for SINGLE_CHOICE. */
  options: { text: string; correct?: boolean }[];
  /** Why the answer is right (Gen Z casual), shown after answering. */
  explanation: string;
  type?: "SINGLE_CHOICE" | "MULTIPLE_CHOICE";
};

export type QuizContent = {
  title: string;
  description: string;
  /** Percent needed to pass; defaults to 70. */
  passingScore?: number;
  questions: QuizQuestion[];
};

/** Declares one material; keeps section keys type-checked against the manifest. */
export function defineMaterial<M extends PolaMaterialKey>(
  material: MaterialContent<M>,
): MaterialContent<M> {
  return material;
}
