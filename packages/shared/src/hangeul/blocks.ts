// Hangeul learning blocks: the BlockNote block types used by the Hangeul
// Mastery course and the parsers both clients use to read their JSON props.
// BlockNote props can only be strings, numbers or booleans, so list props are
// JSON strings (like the conversation and culture blocks). Every audio clip is
// an `assetId` key so `collectContentAssetIds` finds it without special cases.

export const HANGEUL_LETTERS_BLOCK_TYPE = "hangeulLetters";
export const HANGEUL_CONTRAST_BLOCK_TYPE = "hangeulContrast";
export const HANGEUL_SYLLABLE_GRID_BLOCK_TYPE = "hangeulSyllableGrid";
export const HANGEUL_GAME_BLOCK_TYPE = "hangeulGame";

export const HANGEUL_BLOCK_TYPES = [
  HANGEUL_LETTERS_BLOCK_TYPE,
  HANGEUL_CONTRAST_BLOCK_TYPE,
  HANGEUL_SYLLABLE_GRID_BLOCK_TYPE,
  HANGEUL_GAME_BLOCK_TYPE,
] as const;

export const MAX_HANGEUL_LETTER_CARDS = 30;
export const MAX_HANGEUL_CONTRAST_ROWS = 12;
export const MAX_HANGEUL_CONTRAST_ITEMS = 3;
export const MAX_HANGEUL_GRID_AXIS = 14;

/** An example word on a letter card, with its own optional audio. */
export type HangeulExampleWord = {
  word: string;
  meaning: string;
  romanization: string;
  assetId: string;
};

/**
 * One letter (or syllable) card. `cue` is the Indonesian sound aid, for example
 * "seperti 'o' di toko, bibir bulat". `assetId` is the clip of the letter's
 * sound (usually the letter in a syllable, like 아 for ㅏ).
 */
export type HangeulLetterCard = {
  id: string;
  character: string;
  name: string;
  cue: string;
  romanization: string;
  note: string;
  assetId: string;
  example: HangeulExampleWord | null;
};

export type HangeulContrastItem = {
  text: string;
  romanization: string;
  meaning: string;
  assetId: string;
};

/** A row of two or three items that sound alike, such as 사다 / 싸다. */
export type HangeulContrastRow = {
  id: string;
  note: string;
  items: HangeulContrastItem[];
};

export type HangeulSyllableAudio = { syllable: string; assetId: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function parseJsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseExample(value: unknown): HangeulExampleWord | null {
  if (!isRecord(value)) return null;
  const word = text(value.word).trim();
  if (!word) return null;
  return {
    word,
    meaning: text(value.meaning),
    romanization: text(value.romanization),
    assetId: text(value.assetId),
  };
}

/** Reads the `letters` prop of a hangeulLetters block, skipping malformed cards. */
export function parseHangeulLetterCards(value: unknown): HangeulLetterCard[] {
  return parseJsonArray(value)
    .filter(isRecord)
    .map((card, index) => ({
      id: text(card.id) || `letter-${index}`,
      character: text(card.character).trim(),
      name: text(card.name),
      cue: text(card.cue),
      romanization: text(card.romanization),
      note: text(card.note),
      assetId: text(card.assetId),
      example: parseExample(card.example),
    }))
    .filter((card) => card.character)
    .slice(0, MAX_HANGEUL_LETTER_CARDS);
}

/** Reads the `rows` prop of a hangeulContrast block. Rows need two items or more. */
export function parseHangeulContrastRows(value: unknown): HangeulContrastRow[] {
  return parseJsonArray(value)
    .filter(isRecord)
    .map((row, index) => ({
      id: text(row.id) || `row-${index}`,
      note: text(row.note),
      items: parseJsonArray(row.items)
        .filter(isRecord)
        .map((item) => ({
          text: text(item.text).trim(),
          romanization: text(item.romanization),
          meaning: text(item.meaning),
          assetId: text(item.assetId),
        }))
        .filter((item) => item.text)
        .slice(0, MAX_HANGEUL_CONTRAST_ITEMS),
    }))
    .filter((row) => row.items.length >= 2)
    .slice(0, MAX_HANGEUL_CONTRAST_ROWS);
}

/** Reads a JSON list of jamo (the grid's `consonants` or `vowels`). */
export function parseJamoList(value: unknown): string[] {
  return parseJsonArray(value)
    .map((item) => text(item).trim())
    .filter(Boolean)
    .slice(0, MAX_HANGEUL_GRID_AXIS);
}

/** Reads the grid's `audio` prop into a syllable → assetId map. */
export function parseHangeulSyllableAudio(value: unknown) {
  const audio = new Map<string, string>();
  for (const entry of parseJsonArray(value)) {
    if (!isRecord(entry)) continue;
    const syllable = text(entry.syllable).trim();
    const assetId = text(entry.assetId);
    if (syllable && assetId) audio.set(syllable, assetId);
  }
  return audio;
}
