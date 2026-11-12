// Hangeul reading questions for the first two stages of the onboarding
// placement test (`../placement`): stage 1 draws from the course's first five
// steps, stage 2 from the last five, up to batchim.

import { composeHangeulSyllable } from "./compose";
import { romanizeHangeulSyllable } from "./romanize";

export type HangeulPlacementQuestion = {
  /** `read`: a syllable, pick its romanization. `write`: the reverse. */
  kind: "read" | "write";
  /** The syllable for `read`, the romanization for `write`. */
  prompt: string;
  /** Four choices, the answer among them. */
  choices: string[];
  answer: string;
};

type Pool = {
  initials: readonly string[];
  vowels: readonly string[];
  finals: readonly string[];
};

// Each question draws from one step of the course, easiest first, so the test
// covers every chapter up to batchim.
const basicVowels = [..."ㅏㅓㅗㅜㅡㅣ"];
const coreConsonants = [..."ㄴㅁㅅㅂㄱㄷㅈㅎㄹ"];
const steps: Pool[] = [
  { initials: ["ㅇ"], vowels: basicVowels, finals: [""] },
  { initials: coreConsonants, vowels: basicVowels, finals: [""] },
  { initials: coreConsonants, vowels: basicVowels, finals: [""] },
  { initials: coreConsonants, vowels: [..."ㅑㅕㅛㅠ"], finals: [""] },
  { initials: coreConsonants, vowels: [..."ㅐㅔ"], finals: [""] },
  { initials: [..."ㅋㅌㅍㅊ"], vowels: basicVowels, finals: [""] },
  { initials: [..."ㄲㄸㅃㅆㅉ"], vowels: basicVowels, finals: [""] },
  {
    initials: ["ㅇ", ...coreConsonants],
    vowels: [..."ㅘㅝㅚㅟ"],
    finals: [""],
  },
  {
    initials: coreConsonants,
    vowels: basicVowels,
    finals: [..."ㄴㅁㅇㄹ"],
  },
  {
    initials: coreConsonants,
    vowels: basicVowels,
    finals: [..."ㄱㅂㅅ"],
  },
];

// Letters learners mix up. Wrong choices swap one letter for a look-alike or
// sound-alike, so a guess is unlikely to pass.
const confusableGroups = [
  [..."ㄱㅋㄲ"],
  [..."ㄷㅌㄸ"],
  [..."ㅂㅍㅃ"],
  [..."ㅈㅊㅉ"],
  [..."ㅅㅆ"],
  [..."ㄴㅁㄹㅇㅎ"],
  [..."ㅏㅓㅗㅜㅡㅣ"],
  [..."ㅑㅕㅛㅠ"],
  [..."ㅐㅔㅒㅖ"],
  [..."ㅘㅝㅚㅟㅙㅞㅢ"],
  [..."ㄱㅂㅅㄴㅁㅇㄹ"],
];

function lookAlikes(letter: string) {
  return confusableGroups
    .filter((group) => group.includes(letter))
    .flatMap((group) => group.filter((other) => other !== letter));
}

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)]!;
}

function shuffle<T>(items: T[], random: () => number) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other]!, result[index]!];
  }
  return result;
}

function question(
  pool: Pool,
  kind: HangeulPlacementQuestion["kind"],
  random: () => number,
): HangeulPlacementQuestion {
  const initial = pick(pool.initials, random);
  const vowel = pick(pool.vowels, random);
  const final = pick(pool.finals, random);
  const syllable = composeHangeulSyllable(initial, vowel, final)!;
  const reading = romanizeHangeulSyllable(syllable);

  // Every syllable one look-alike letter away, then random ones from the
  // same step if those run out. Readings must differ so one choice is right.
  const nearby = shuffle(
    [
      ...lookAlikes(initial).map((other) => [other, vowel, final]),
      ...lookAlikes(vowel).map((other) => [initial, other, final]),
      ...(final
        ? lookAlikes(final).map((other) => [initial, vowel, other])
        : []),
    ],
    random,
  );
  const wrong = new Map<string, string>();
  const consider = (parts: string[]) => {
    const candidate = composeHangeulSyllable(parts[0]!, parts[1]!, parts[2]);
    if (!candidate) return;
    const candidateReading = romanizeHangeulSyllable(candidate);
    if (candidateReading === reading || wrong.has(candidateReading)) return;
    wrong.set(candidateReading, candidate);
  };
  for (const parts of nearby) {
    if (wrong.size === 3) break;
    consider(parts);
  }
  for (let attempt = 0; wrong.size < 3 && attempt < 100; attempt += 1) {
    consider([
      pick(pool.initials, random),
      pick(pool.vowels, random),
      pick(pool.finals, random),
    ]);
  }

  const options =
    kind === "read"
      ? [reading, ...wrong.keys()]
      : [syllable, ...wrong.values()];
  return {
    kind,
    prompt: kind === "read" ? syllable : reading,
    choices: shuffle(options, random),
    answer: kind === "read" ? reading : syllable,
  };
}

/** The course steps each placement stage draws from. */
const STAGE_STEPS = { 1: steps.slice(0, 5), 2: steps.slice(5) } as const;

/**
 * One reading or writing question from a random step of placement `stage`
 * (1: vowels and core consonants, 2: aspirated and tense consonants,
 * compound vowels and batchim).
 */
export function createHangeulStageQuestion(
  stage: 1 | 2,
  random: () => number = Math.random,
): HangeulPlacementQuestion {
  return question(
    pick(STAGE_STEPS[stage], random),
    random() < 0.5 ? "read" : "write",
    random,
  );
}
