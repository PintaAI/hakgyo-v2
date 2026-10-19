// Text helpers for the on-device search: normalization, Hangul matching and
// plain-text extraction from stored rich content.

const SYLLABLE_FIRST = 0xac00;
const SYLLABLE_LAST = 0xd7a3;
const SYLLABLES_PER_INITIAL = 588;
const FINALS_PER_VOWEL = 28;

/** Compatibility jamo of the 19 initial consonants, in Unicode order. */
const INITIALS = [..."ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ"];
/** Compatibility jamo of the 27 final consonants (index 0 is "no final"). */
const FINALS = [
  "",
  ..."ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ",
];

function isSyllable(code: number) {
  return code >= SYLLABLE_FIRST && code <= SYLLABLE_LAST;
}

function isInitialJamo(character: string) {
  return INITIALS.includes(character);
}

const wordCharacter = /[\p{L}\p{N}]/u;
const combiningMark = /\p{M}/gu;

function foldCharacter(character: string) {
  const code = character.charCodeAt(0);
  // Fast paths: ASCII and Hangul syllables need no Unicode folding.
  if (code < 0x80) {
    if (code >= 0x41 && code <= 0x5a) return String.fromCharCode(code + 32);
    return (code >= 0x30 && code <= 0x39) || (code >= 0x61 && code <= 0x7a)
      ? character
      : " ";
  }
  // Compatibility jamo (typed while composing) would become conjoining jamo
  // under NFKD and stop matching the initial-consonant tables.
  if (isSyllable(code) || (code >= 0x3131 && code <= 0x318e)) {
    return character;
  }
  // NFD splits Hangul syllables into conjoining jamo, which are letters, so
  // removing combining marks and recomposing keeps Korean text intact.
  const folded = character
    .normalize("NFKD")
    .replace(combiningMark, "")
    .normalize("NFC")
    .toLowerCase();
  if (!folded) return "";
  return wordCharacter.test(folded) ? folded : " ";
}

/**
 * Lowercases, strips accents and turns punctuation into single spaces, so
 * "Café-Bab 1!" and "cafe bab 1" compare equal.
 */
export function normalizeSearchText(value: string) {
  let result = "";
  let space = true;
  for (const character of value) {
    const folded = foldCharacter(character);
    if (folded === " ") {
      if (!space) result += " ";
      space = true;
    } else if (folded) {
      result += folded;
      space = false;
    }
  }
  return space ? result.slice(0, -1) : result;
}

/** The initial consonants of the Hangul syllables in `value` ("학교" → "ㅎㄱ"). */
export function choseong(value: string) {
  let result = "";
  for (const character of value) {
    const code = character.charCodeAt(0);
    if (isSyllable(code)) {
      result +=
        INITIALS[Math.floor((code - SYLLABLE_FIRST) / SYLLABLES_PER_INITIAL)];
    } else if (character === " ") {
      result += " ";
    } else if (isInitialJamo(character)) {
      result += character;
    }
  }
  return result.trim();
}

/** True when the query is made of initial consonants only ("ㅎㄱ"). */
export function isChoseongQuery(query: string) {
  let consonants = 0;
  for (const character of query) {
    if (character === " ") continue;
    if (!isInitialJamo(character)) return false;
    consonants += 1;
  }
  return consonants >= 2;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function syllableRange(initial: number, vowel: number) {
  const first =
    SYLLABLE_FIRST + initial * SYLLABLES_PER_INITIAL + vowel * FINALS_PER_VOWEL;
  return `[${String.fromCharCode(first)}-${String.fromCharCode(first + FINALS_PER_VOWEL - 1)}]`;
}

function initialRange(initial: number) {
  const first = SYLLABLE_FIRST + initial * SYLLABLES_PER_INITIAL;
  return `[${String.fromCharCode(first)}-${String.fromCharCode(first + SYLLABLES_PER_INITIAL - 1)}]`;
}

/**
 * Pattern for the Hangul character still being composed at the end of a
 * query. While typing 학교 the field shows "ㅎ", "하", "학" and "학ㄱ" before the
 * word is complete, so each state must match the finished text:
 * - a lone consonant matches any syllable starting with it (ㅎ → 하, 학…);
 * - an open syllable matches any final (하 → 학, 함…);
 * - a closed syllable also matches its final carried into the next syllable
 *   (학 → 하교).
 */
function composingPattern(character: string) {
  const initial = INITIALS.indexOf(character);
  if (initial >= 0) return `(?:${character}|${initialRange(initial)})`;

  const code = character.charCodeAt(0);
  if (!isSyllable(code)) return escapeRegExp(character);
  const offset = code - SYLLABLE_FIRST;
  const initialIndex = Math.floor(offset / SYLLABLES_PER_INITIAL);
  const vowelIndex = Math.floor(
    (offset % SYLLABLES_PER_INITIAL) / FINALS_PER_VOWEL,
  );
  const finalIndex = offset % FINALS_PER_VOWEL;
  if (finalIndex === 0) return syllableRange(initialIndex, vowelIndex);

  const carried = INITIALS.indexOf(FINALS[finalIndex]!);
  if (carried < 0) return character;
  const open = String.fromCharCode(code - finalIndex);
  return `(?:${character}|${open}${initialRange(carried)})`;
}

/**
 * Matcher for one normalized query token. Korean tokens treat their last
 * character as still being composed (see `composingPattern`); other tokens
 * are plain substrings.
 */
export type TokenMatcher = {
  token: string;
  /** Finds the token in normalized text; returns the match index or -1. */
  find: (text: string) => number;
};

export function tokenMatcher(token: string): TokenMatcher {
  const last = token.slice(-1);
  const code = last.charCodeAt(0);
  if (!isSyllable(code) && !isInitialJamo(last)) {
    return { token, find: (text) => text.indexOf(token) };
  }
  const pattern = new RegExp(
    escapeRegExp(token.slice(0, -1)) + composingPattern(last),
  );
  return {
    token,
    find: (text) => {
      const exact = text.indexOf(token);
      if (exact >= 0) return exact;
      const match = pattern.exec(text);
      return match ? match.index : -1;
    },
  };
}

/** Edit distance with an early exit once it exceeds `limit`. */
export function boundedEditDistance(a: string, b: string, limit: number) {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    let rowMinimum = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const value = Math.min(
        previous[j]! + 1,
        current[j - 1]! + 1,
        previous[j - 1]! + cost,
      );
      current.push(value);
      if (value < rowMinimum) rowMinimum = value;
    }
    if (rowMinimum > limit) return limit + 1;
    previous = current;
  }
  return previous[b.length]!;
}

// ---------------------------------------------------------------------------
// Plain text from stored content
// ---------------------------------------------------------------------------

/** Props that hold ids, URLs or presentation settings rather than text. */
const NON_TEXT_PROP =
  /(^id$|Id$|Ids$|^type$|url|Url|href|src|asset|Asset|theme|tone|color|Color|align|Align|spacing|surface|variant|Variant|width|Width|height|Height|level|language|mime|fileName|^style|Style$|^icon|Icon$|layout|Layout|size|Size)/;

function looksLikeText(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/^https?:\/\//.test(trimmed)) return false;
  if (/^(true|false|null|\d+(\.\d+)?)$/.test(trimmed)) return false;
  return true;
}

function parseJsonString(value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed.startsWith("[") && !trimmed.startsWith("{")) return undefined;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return undefined;
  }
}

function collectText(value: unknown, segments: string[], depth: number) {
  if (depth > 24 || value === null || value === undefined) return;
  if (typeof value === "string") {
    const parsed = parseJsonString(value);
    if (parsed !== undefined) collectText(parsed, segments, depth + 1);
    else if (looksLikeText(value)) segments.push(value.trim());
    return;
  }
  if (Array.isArray(value)) {
    // A run of inline text nodes is one paragraph, not one segment per style.
    if (
      value.length > 0 &&
      value.every(
        (node) =>
          typeof node === "object" &&
          node !== null &&
          "type" in node &&
          (node.type === "text" || node.type === "link"),
      )
    ) {
      const paragraph = inlineText(value).trim();
      if (paragraph) segments.push(paragraph);
      return;
    }
    for (const item of value) collectText(item, segments, depth + 1);
    return;
  }
  if (typeof value !== "object") return;

  const record = value as Record<string, unknown>;
  if (record.type === "text" && typeof record.text === "string") {
    if (looksLikeText(record.text)) segments.push(record.text.trim());
    return;
  }
  for (const [key, child] of Object.entries(record)) {
    if (key === "styles" || NON_TEXT_PROP.test(key)) continue;
    collectText(child, segments, depth + 1);
  }
}

function inlineText(nodes: unknown[]): string {
  return nodes
    .map((node) => {
      const record = node as Record<string, unknown>;
      if (record.type === "text") {
        return typeof record.text === "string" ? record.text : "";
      }
      return Array.isArray(record.content) ? inlineText(record.content) : "";
    })
    .join("");
}

/**
 * The readable text of stored rich content (BlockNote documents, custom block
 * props, JSON-encoded block data or plain strings), one segment per paragraph
 * or text prop.
 */
export function extractTextSegments(value: unknown): string[] {
  const segments: string[] = [];
  collectText(value, segments, 0);
  return segments;
}

/** Vocabulary examples are stored as a string array or newline-separated text. */
export function vocabularyExamples(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter(
      (example): example is string =>
        typeof example === "string" && example.trim().length > 0,
    );
  }
  if (typeof value === "string") {
    return value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }
  return [];
}
