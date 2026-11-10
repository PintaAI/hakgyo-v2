// Builders for the BlockNote JSON used in ./content. They keep the content
// files readable and produce exactly the props the block catalog validates.
import {
  composeHangeulSyllable,
  HANGEUL_CONTRAST_BLOCK_TYPE,
  HANGEUL_GAME_BLOCK_TYPE,
  HANGEUL_LETTERS_BLOCK_TYPE,
  HANGEUL_SYLLABLE_GRID_BLOCK_TYPE,
  type HangeulGameKey,
  type HangeulGameStageId,
} from "@hakgyo/shared/hangeul";

import {
  conversationBlockDefaults,
  type lessonPageDefaults,
} from "../../src/lib/blocknote/block-catalog";
import type { BlockNoteBlock } from "./content-types";

/** Prefix of an audio placeholder; the importer swaps it for an asset id. */
export const AUDIO_PLACEHOLDER_PREFIX = "hangeul-audio:";
/** Prefix of a picture placeholder (a key of `content/images.ts`); the importer swaps it for an asset id. */
export const IMAGE_PLACEHOLDER_PREFIX = "hangeul-image:";
/** Prefix of a reference to another item of the same module, by key. */
export const ITEM_REFERENCE_PREFIX = "hangeul-item:";

/**
 * An audio clip of `text` spoken by the course voice. Use the Korean to say,
 * for example `audio("아")` for the vowel ㅏ or `audio("사다")` for a word.
 */
export function audio(text: string) {
  return `${AUDIO_PLACEHOLDER_PREFIX}${text}`;
}

type InlineText = string | { text: string; bold?: boolean; italic?: boolean };

function inline(parts: InlineText[]) {
  return parts.map((part) =>
    typeof part === "string"
      ? { type: "text", text: part, styles: {} }
      : {
          type: "text",
          text: part.text,
          styles: {
            ...(part.bold ? { bold: true } : {}),
            ...(part.italic ? { italic: true } : {}),
          },
        },
  );
}

/** `b("ㅏ")` inside a paragraph renders bold. */
export const b = (text: string) => ({ text, bold: true });
export const i = (text: string) => ({ text, italic: true });

export const heading = (
  text: string,
  level: 1 | 2 | 3 = 2,
): BlockNoteBlock => ({
  type: "heading",
  props: { level },
  content: inline([text]),
});

export const p = (...parts: InlineText[]): BlockNoteBlock => ({
  type: "paragraph",
  content: inline(parts),
});

export const bullet = (...parts: InlineText[]): BlockNoteBlock => ({
  type: "bulletListItem",
  content: inline(parts),
});

export const numbered = (...parts: InlineText[]): BlockNoteBlock => ({
  type: "numberedListItem",
  content: inline(parts),
});

export const quote = (...parts: InlineText[]): BlockNoteBlock => ({
  type: "quote",
  content: inline(parts),
});

export const divider = (): BlockNoteBlock => ({ type: "divider" });

export const callout = (
  tone: "info" | "tip" | "warning" | "success",
  ...parts: InlineText[]
): BlockNoteBlock => ({
  type: "callout",
  props: { tone },
  content: inline(parts),
});

/** A simple table; the first row is the header. */
export function table(rows: string[][]): BlockNoteBlock {
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

/**
 * A standalone audio player with a caption. Players show `label` as the
 * clip's title, so it never repeats the spoken text: listening questions
 * would give their answer away.
 */
export const audioClip = (
  text: string,
  caption = "",
  label = "Dengarkan",
): BlockNoteBlock => ({
  type: "assetAudio",
  props: {
    assetId: audio(text),
    fileName: label,
    contentType: "audio/mpeg",
    caption,
  },
});

export type LetterCardInput = {
  character: string;
  /** Letter name, for example "기역" (optional, mostly for consonants). */
  name?: string;
  /** Indonesian sound aid, for example "seperti o di 'toko', bibir bulat". */
  cue: string;
  romanization?: string;
  note?: string;
  /** Korean to speak for the letter, usually the letter in a syllable (아). */
  say?: string;
  example?: { word: string; meaning: string; romanization?: string };
};

/** Letter cards with audio, a sound cue and an example word. */
export function letters(
  title: string,
  cards: LetterCardInput[],
  options: { showRomanization?: boolean } = {},
): BlockNoteBlock {
  return {
    type: HANGEUL_LETTERS_BLOCK_TYPE,
    props: {
      title,
      showRomanization: options.showRomanization ?? true,
      letters: JSON.stringify(
        cards.map((card, index) => ({
          id: `${index}-${card.character}`,
          character: card.character,
          name: card.name ?? "",
          cue: card.cue,
          romanization: card.romanization ?? "",
          note: card.note ?? "",
          assetId: card.say ? audio(card.say) : "",
          example: card.example
            ? {
                word: card.example.word,
                meaning: card.example.meaning,
                romanization: card.example.romanization ?? "",
                assetId: audio(card.example.word),
              }
            : null,
        })),
      ),
    },
  };
}

export type ContrastItemInput = {
  text: string;
  meaning?: string;
  romanization?: string;
};

/** Rows of two or three items that sound alike (minimal pairs), with audio. */
export function contrast(
  title: string,
  instructions: string,
  rows: { items: ContrastItemInput[]; note?: string }[],
  options: { showRomanization?: boolean } = {},
): BlockNoteBlock {
  return {
    type: HANGEUL_CONTRAST_BLOCK_TYPE,
    props: {
      title,
      instructions,
      showRomanization: options.showRomanization ?? true,
      rows: JSON.stringify(
        rows.map((row, index) => ({
          id: `row-${index}`,
          note: row.note ?? "",
          items: row.items.map((item) => ({
            text: item.text,
            meaning: item.meaning ?? "",
            romanization: item.romanization ?? "",
            assetId: audio(item.text),
          })),
        })),
      ),
    },
  };
}

/**
 * A consonant × vowel table of composed syllables, each playable. `final`
 * adds the same batchim to every syllable.
 */
export function syllableGrid(
  title: string,
  consonants: string[],
  vowels: string[],
  options: {
    final?: string;
    showRomanization?: boolean;
    /** The composed syllables to give audio; defaults to all of them. */
    syllables?: string[];
  } = {},
): BlockNoteBlock {
  const syllables =
    options.syllables ??
    consonants.flatMap((consonant) =>
      vowels.flatMap((vowel) => {
        const syllable = composeHangeulSyllable(
          consonant,
          vowel,
          options.final ?? "",
        );
        return syllable ? [syllable] : [];
      }),
    );
  return {
    type: HANGEUL_SYLLABLE_GRID_BLOCK_TYPE,
    props: {
      title,
      consonants: JSON.stringify(consonants),
      vowels: JSON.stringify(vowels),
      final: options.final ?? "",
      showRomanization: options.showRomanization ?? false,
      audio: JSON.stringify(
        syllables.map((syllable) => ({
          syllable,
          assetId: audio(syllable),
        })),
      ),
    },
  };
}

export type RuleRowInput = {
  /** When the rule applies, for example "ㅇ di awal blok". */
  when: string;
  /** What happens, short: "diam", "→ ㅁ". */
  result: string;
  /** One example, for example "아 = a". */
  example?: string;
};

export type RuleExampleInput = {
  before?: string;
  /** The part shown in the accent colour. */
  emphasis: string;
  after?: string;
};

/**
 * A rule card (the `grammar` block) for the few rules Hangeul needs: a title,
 * one or two sentences, a rule table and optional highlighted examples and
 * tip. Every prop is set, because BlockNote fills omitted props with the
 * block's Korean grammar sample. The Korean fields stay empty: learners
 * cannot read Korean prose yet, and empty fields are hidden.
 */
export function rules(input: {
  title: string;
  intro?: string;
  eyebrow?: string;
  theme?: "amber" | "blue" | "green" | "rose";
  columns?: [string, string, string];
  rows?: RuleRowInput[];
  examplesLabel?: string;
  examples?: RuleExampleInput[];
  tip?: { title?: string; text: string };
}): BlockNoteBlock {
  const [ruleColumnOne, ruleColumnTwo, ruleColumnThree] = input.columns ?? [
    "Kapan",
    "Hasilnya",
    "Contoh",
  ];
  return {
    type: "grammar",
    props: {
      theme: input.theme ?? "blue",
      showTip: Boolean(input.tip),
      number: "",
      eyebrow: input.eyebrow ?? "Aturan",
      title: input.title,
      descriptionKo: "",
      descriptionTranslation: input.intro ?? "",
      ruleColumnOne,
      ruleColumnTwo,
      ruleColumnThree,
      ruleRows: JSON.stringify(
        (input.rows ?? []).map((row) => ({
          condition: row.when,
          form: row.result,
          example: row.example ?? "",
        })),
      ),
      examplesLabel: input.examples?.length
        ? (input.examplesLabel ?? "Contoh")
        : "",
      examples: JSON.stringify(
        (input.examples ?? []).map((example) => ({
          before: example.before ?? "",
          emphasis: example.emphasis,
          after: example.after ?? "",
        })),
      ),
      tipTitle: input.tip ? (input.tip.title ?? "Tips") : "",
      tipKo: "",
      tipTranslation: input.tip?.text ?? "",
    },
  };
}

/** Opens a mobile Hangeul game at a stage; web shows an app handoff card. */
export function game(
  gameKey: HangeulGameKey,
  stage: HangeulGameStageId,
  title: string,
  description: string,
): BlockNoteBlock {
  return {
    type: HANGEUL_GAME_BLOCK_TYPE,
    props: { gameKey, stage, title, description },
  };
}

/** Embeds a vocabulary set of the same module, by its key. */
export const vocabularyRef = (key: string): BlockNoteBlock => ({
  type: "vocabularyReference",
  props: { vocabularySetId: `${ITEM_REFERENCE_PREFIX}${key}` },
});

/** Embeds an assessment of the same module, by its key. */
export const assessmentRef = (key: string): BlockNoteBlock => ({
  type: "assessmentReference",
  props: { assessmentId: `${ITEM_REFERENCE_PREFIX}${key}` },
});

/** A picture made by `hangeul:images` from its spec in `content/images.ts`, by key. */
export const image = (key: string) => `${IMAGE_PLACEHOLDER_PREFIX}${key}`;

/**
 * A chapter opener (the `lessonPage` block): the picture, the chapter's letters as the title with
 * an Indonesian subtitle, a two-line exchange the chapter teaches to read, three focus cards and
 * two goals. Every prop is set, because BlockNote fills omitted ones with the block's EPS sample.
 * Learners cannot read Korean prose yet, so labels and goals are Indonesian only.
 */
export function lessonPage(input: {
  theme: "rose" | "ocean" | "forest" | "sunset";
  imageKey: string;
  imageAlt: string;
  chapter: number;
  title: string;
  subtitle: string;
  question: string;
  answer: string;
  cards: [
    { label: string; title: string; description: string },
    { label: string; title: string; description: string },
    { label: string; title: string; description: string },
  ];
  goals: [string, string];
}): BlockNoteBlock {
  const [first, second, third] = input.cards;
  const props: Record<keyof typeof lessonPageDefaults, string> = {
    eyebrow: "Hangeul Mastery",
    chapterNumber: String(input.chapter).padStart(2, "0"),
    title: input.title,
    subtitle: input.subtitle,
    question: input.question,
    answer: input.answer,
    grammarLabel: first.label,
    grammarTitle: first.title,
    grammarDescription: first.description,
    vocabularyLabel: second.label,
    vocabularyTitle: second.title,
    vocabularyDescription: second.description,
    cultureLabel: third.label,
    cultureTitle: third.title,
    cultureDescription: third.description,
    objectivesLabel: "Tujuan belajar",
    objectiveOne: input.goals[0],
    objectiveTwo: input.goals[1],
  };
  return {
    type: "lessonPage",
    props: {
      theme: input.theme,
      assetId: image(input.imageKey),
      fileName: input.imageAlt,
      contentType: "image/webp",
      ...props,
    },
  };
}

/** JSON-array props of the conversation block; every other text prop is a plain string. */
const CONVERSATION_LIST_PROPS = new Set([
  "lines",
  "questions",
  "practiceExpressions",
  "practiceDialogue",
  "usefulExpressionDialogue",
  "pronunciationExamples",
]);

/**
 * A short dialogue (the `conversation` block): a picture, the speakers' lines with their Indonesian
 * translation and up to two comprehension questions. The block has no player, so put the lines'
 * `audioClip`s after it. Every other part (tip, speaking practice, useful expression,
 * pronunciation) is left empty, which hides it for learners.
 */
export function conversation(input: {
  imageKey: string;
  imageAlt: string;
  eyebrow: string;
  number: string;
  lines: Array<{ speaker: string; korean: string; translation: string }>;
  questions?: Array<{ korean: string; translation: string }>;
}): BlockNoteBlock {
  const blank = Object.fromEntries(
    Object.entries(conversationBlockDefaults).map(([name, value]) => [
      name,
      typeof value === "boolean"
        ? false
        : CONVERSATION_LIST_PROPS.has(name)
          ? "[]"
          : "",
    ]),
  );
  const questions = input.questions ?? [];
  return {
    type: "conversation",
    props: {
      ...blank,
      theme: "violet",
      sectionVariant: "pronunciation",
      assetId: image(input.imageKey),
      fileName: input.imageAlt,
      contentType: "image/webp",
      eyebrow: input.eyebrow,
      number: input.number,
      lines: JSON.stringify(input.lines),
      questionsLabel: questions.length ? "Jawablah" : "",
      questions: JSON.stringify(questions),
    },
  };
}
