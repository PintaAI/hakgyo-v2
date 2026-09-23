// Modern Hangul composition, Unicode §3.12:
// https://www.unicode.org/versions/Unicode16.0.0/core-spec/chapter-3/#G24646
export const INITIALS = [..."ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ"];
export const VOWELS = [..."ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ"];
export const FINALS = [
  "",
  ..."ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ",
];

const vowelPairs: Record<string, string> = {
  ㅗㅏ: "ㅘ",
  ㅗㅐ: "ㅙ",
  ㅗㅣ: "ㅚ",
  ㅜㅓ: "ㅝ",
  ㅜㅔ: "ㅞ",
  ㅜㅣ: "ㅟ",
  ㅡㅣ: "ㅢ",
};
const finalPairs: Record<string, string> = {
  ㄱㄱ: "ㄲ",
  ㄱㅅ: "ㄳ",
  ㄴㅈ: "ㄵ",
  ㄴㅎ: "ㄶ",
  ㄹㄱ: "ㄺ",
  ㄹㅁ: "ㄻ",
  ㄹㅂ: "ㄼ",
  ㄹㅅ: "ㄽ",
  ㄹㅌ: "ㄾ",
  ㄹㅍ: "ㄿ",
  ㄹㅎ: "ㅀ",
  ㅂㅅ: "ㅄ",
  ㅅㅅ: "ㅆ",
};

export type HangulBlock = {
  initial: string;
  vowel: string;
  final: string;
  literal?: string;
};

export function blockText(block: HangulBlock): string {
  if (block.literal !== undefined) return block.literal;
  if (!block.initial || !block.vowel) return block.initial || block.vowel;
  return String.fromCharCode(
    0xac00 +
      (INITIALS.indexOf(block.initial) * 21 + VOWELS.indexOf(block.vowel)) *
        28 +
      FINALS.indexOf(block.final),
  );
}

export function decomposeSyllable(character: string): HangulBlock | undefined {
  const code = character.codePointAt(0);
  if (
    character.length !== 1 ||
    code === undefined ||
    code < 0xac00 ||
    code > 0xd7a3
  )
    return undefined;
  const index = code - 0xac00;
  return {
    initial: INITIALS[Math.floor(index / 588)]!,
    vowel: VOWELS[Math.floor(index / 28) % 21]!,
    final: FINALS[index % 28]!,
  };
}

// Replay keystrokes so backspace undoes exactly one input, including compounds
// and a final that moved to the next syllable. No automatic silent ㅇ insertion.
export function composeHangul(keys: readonly string[]): HangulBlock[] {
  const blocks: HangulBlock[] = [];
  for (const key of keys) {
    const current = blocks.at(-1);
    const vowel = VOWELS.includes(key);
    const consonant = INITIALS.includes(key);
    if (!vowel && !consonant) {
      if (key === " ")
        blocks.push({ initial: "", vowel: "", final: "", literal: " " });
      continue;
    }
    if (!current || current.literal !== undefined) {
      blocks.push({
        initial: consonant ? key : "",
        vowel: vowel ? key : "",
        final: "",
      });
      continue;
    }
    if (vowel) {
      if (current.initial && !current.vowel) {
        current.vowel = key;
      } else if (!current.final && vowelPairs[current.vowel + key]) {
        current.vowel = vowelPairs[current.vowel + key]!;
      } else if (current.initial && current.vowel && current.final) {
        // A doubled final moves as one consonant. A cluster splits in two.
        const pair =
          current.final === "ㄲ" || current.final === "ㅆ"
            ? undefined
            : Object.entries(finalPairs).find(
                ([, value]) => value === current.final,
              )?.[0];
        const nextInitial = pair ? pair[1]! : current.final;
        current.final = pair ? pair[0]! : "";
        blocks.push({ initial: nextInitial, vowel: key, final: "" });
      } else {
        blocks.push({ initial: "", vowel: key, final: "" });
      }
    } else if (
      current.initial &&
      current.vowel &&
      !current.final &&
      FINALS.includes(key)
    ) {
      current.final = key;
    } else if (current.final && finalPairs[current.final + key]) {
      current.final = finalPairs[current.final + key]!;
    } else {
      blocks.push({ initial: key, vowel: "", final: "" });
    }
  }
  return blocks;
}

export function composedText(keys: readonly string[]): string {
  return composeHangul(keys).map(blockText).join("");
}

export function syllableKeys(text: string): string[] {
  return [...text].flatMap((character) => {
    const block = decomposeSyllable(character);
    if (!block) return [character];
    const vowel =
      Object.entries(vowelPairs).find(
        ([, value]) => value === block.vowel,
      )?.[0] ?? block.vowel;
    const final =
      block.final === "ㄲ" || block.final === "ㅆ"
        ? block.final
        : (Object.entries(finalPairs).find(
            ([, value]) => value === block.final,
          )?.[0] ?? block.final);
    return [block.initial, ...vowel, ...final];
  });
}

export function vowelLayout(
  vowel: string,
): "vertical" | "horizontal" | "mixed" {
  if ([..."ㅗㅛㅜㅠㅡ"].includes(vowel)) return "horizontal";
  if ([..."ㅘㅙㅚㅝㅞㅟㅢ"].includes(vowel)) return "mixed";
  return "vertical";
}
