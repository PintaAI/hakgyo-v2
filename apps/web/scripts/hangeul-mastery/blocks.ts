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

import type { BlockNoteBlock } from "./content-types";

/** Prefix of an audio placeholder; the importer swaps it for an asset id. */
export const AUDIO_PLACEHOLDER_PREFIX = "hangeul-audio:";
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
