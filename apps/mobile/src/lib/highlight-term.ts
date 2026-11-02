/**
 * Finds a vocabulary term inside an example sentence, as Korean writes it.
 * A dictionary form rarely appears letter for letter: grammar endings are
 * written "-(으)ㄹ게" or "-는데?" but appear as "할게요" or "먹었는데", and a
 * verb ("먹다") appears conjugated ("먹어요").
 */

const SYLLABLE_FIRST = 0xac00;
const SYLLABLE_LAST = 0xd7a3;
const FINALS_PER_SYLLABLE = 28;

/** Compatibility jamo that can close a syllable, by their final index. */
const FINAL_INDEX: Record<string, number> = {
  ㄱ: 1,
  ㄲ: 2,
  ㄴ: 4,
  ㄷ: 7,
  ㄹ: 8,
  ㅁ: 16,
  ㅂ: 17,
  ㅅ: 19,
  ㅆ: 20,
  ㅇ: 21,
  ㅈ: 22,
  ㅊ: 23,
  ㅋ: 24,
  ㅌ: 25,
  ㅍ: 26,
  ㅎ: 27,
};

function isSyllable(char: string | undefined) {
  if (!char) return false;
  const code = char.charCodeAt(0);
  return code >= SYLLABLE_FIRST && code <= SYLLABLE_LAST;
}

function finalOf(char: string) {
  return (char.charCodeAt(0) - SYLLABLE_FIRST) % FINALS_PER_SYLLABLE;
}

/** "으" followed by "ㄹ" becomes "을": a closing jamo joins an open syllable. */
function compose(text: string) {
  let out = "";
  for (const char of text) {
    const previous = out.at(-1);
    const final = FINAL_INDEX[char];
    if (final && isSyllable(previous) && finalOf(previous!) === 0) {
      out =
        out.slice(0, -1) + String.fromCharCode(previous!.charCodeAt(0) + final);
    } else {
      out += char;
    }
  }
  return out;
}

/** Every reading of optional "(…)" parts: with and without each one. */
function expandOptional(text: string): string[] {
  const match = /\(([^()]*)\)/.exec(text);
  if (!match) return [text];
  const before = text.slice(0, match.index);
  const after = text.slice(match.index + match[0].length);
  return [
    ...expandOptional(before + match[1] + after),
    ...expandOptional(before + after),
  ];
}

/** The forms of a term to look for, most specific (longest) first. */
export function termPatterns(term: string) {
  const core = term
    .trim()
    .replace(/^[-~·…\s]+/, "")
    .replace(/[-~·…?!.,\s]+$/, "");
  const forms = new Set<string>();
  for (const form of expandOptional(core)) {
    const composed = compose(form.trim());
    if (!composed) continue;
    forms.add(composed);
    // A verb or adjective appears conjugated: try its stem.
    if (composed.length > 1 && composed.endsWith("다")) {
      forms.add(composed.slice(0, -1));
    }
  }
  return [...forms].sort((a, b) => b.length - a.length);
}

/** Start and end of each place `pattern` appears in `sentence`. */
function findSpans(sentence: string, pattern: string): [number, number][] {
  const spans: [number, number][] = [];
  const final = FINAL_INDEX[pattern[0]!];
  // Starts with a closing jamo ("ㄹ게"): it is the final consonant of the
  // syllable before ("할게"), which is marked whole.
  const rest = final ? pattern.slice(1) : pattern;
  let from = 0;
  while (from <= sentence.length) {
    const at = rest ? sentence.indexOf(rest, from) : from;
    if (at < 0) break;
    if (final) {
      const previous = sentence[at - 1];
      if (isSyllable(previous) && finalOf(previous!) === final) {
        spans.push([at - 1, at + rest.length]);
      }
      from = at + Math.max(rest.length, 1);
    } else {
      spans.push([at, at + rest.length]);
      from = at + rest.length;
    }
  }
  return spans;
}

/**
 * The sentence in parts, with the term's appearances marked (`hit`). A
 * sentence without the term comes back whole and unmarked.
 */
export function highlightTerm(sentence: string, term: string) {
  for (const pattern of termPatterns(term)) {
    const spans = findSpans(sentence, pattern);
    if (!spans.length) continue;
    const parts: { text: string; hit: boolean }[] = [];
    let cursor = 0;
    for (const [start, end] of spans) {
      if (start > cursor) {
        parts.push({ text: sentence.slice(cursor, start), hit: false });
      }
      parts.push({ text: sentence.slice(start, end), hit: true });
      cursor = end;
    }
    if (cursor < sentence.length) {
      parts.push({ text: sentence.slice(cursor), hit: false });
    }
    return parts;
  }
  return [{ text: sentence, hit: false }];
}
