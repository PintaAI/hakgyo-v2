// The mobile Hangeul games a lesson can open, and the stages that narrow a
// game to the letters a module has taught. Stage ids are stored in course
// content (hangeulGame blocks), so never rename or remove one.

export const HANGEUL_GAME_KEYS = [
  "stroke-master",
  "syllable-forge",
  "word-builder",
] as const;
export type HangeulGameKey = (typeof HANGEUL_GAME_KEYS)[number];

export const HANGEUL_GAME_TITLES: Record<HangeulGameKey, string> = {
  "stroke-master": "Hangeul",
  "syllable-forge": "Susun 한글",
  "word-builder": "Susun kata",
};

export type HangeulGameStage = {
  id: string;
  title: string;
  /** The letters this stage practises (compatibility jamo), earlier ones included. */
  letters: readonly string[];
  /** The letters new in this stage; the rest of `letters` is review. */
  teaches: readonly string[];
  /** Whether the stage includes syllables with batchim. */
  batchim: boolean;
};

const verticalVowels = [..."ㅏㅓㅣㅑㅕ"];
const horizontalVowels = [..."ㅗㅜㅡㅛㅠ"];
const compoundVowels = [..."ㅐㅔㅒㅖㅘㅝㅙㅞㅚㅟㅢ"];
const allVowels = [...verticalVowels, ...horizontalVowels, ...compoundVowels];
const basicVowels = [..."ㅏㅓㅗㅜㅡㅣ"];
const coreConsonants = [..."ㄴㅁㅅㅂㄱㄷㅈㅎㄹ"];
const yVowels = [..."ㅑㅕㅛㅠㅐㅔㅒㅖ"];
const aspiratedTense = [..."ㅋㅌㅍㅊㄲㄸㅃㅆㅉ"];
const wVowels = [..."ㅘㅝㅙㅞㅚㅟㅢ"];
const everyLetter = ["ㅇ", ...allVowels, ...coreConsonants, ...aspiratedTense];

/**
 * In course order: the vowels first (vertical, horizontal, compound), then
 * the consonants. The last three stages are the order the course had before
 * (vowels and consonants alternating); they stay for content that uses them.
 */
export const HANGEUL_GAME_STAGES = [
  {
    id: "vertical-vowels",
    title: "Vokal tegak",
    letters: ["ㅇ", ...verticalVowels],
    teaches: ["ㅇ", ...verticalVowels],
    batchim: false,
  },
  {
    id: "horizontal-vowels",
    title: "Vokal mendatar",
    letters: ["ㅇ", ...verticalVowels, ...horizontalVowels],
    teaches: horizontalVowels,
    batchim: false,
  },
  {
    id: "compound-vowels",
    title: "Vokal rangkap",
    letters: ["ㅇ", ...allVowels],
    teaches: compoundVowels,
    batchim: false,
  },
  {
    id: "core-consonants",
    title: "Konsonan inti",
    letters: ["ㅇ", ...allVowels, ...coreConsonants],
    teaches: coreConsonants,
    batchim: false,
  },
  {
    id: "aspirated-tense",
    title: "Konsonan berhembus dan tegang",
    letters: everyLetter,
    teaches: aspiratedTense,
    batchim: false,
  },
  {
    id: "batchim",
    title: "Batchim",
    letters: everyLetter,
    teaches: [],
    batchim: true,
  },
  {
    id: "basic-vowels",
    title: "Vokal dasar (urutan lama)",
    letters: ["ㅇ", ...basicVowels],
    teaches: ["ㅇ", ...basicVowels],
    batchim: false,
  },
  {
    id: "y-vowels",
    title: "Vokal Y dan ㅐ ㅔ (urutan lama)",
    letters: ["ㅇ", ...basicVowels, ...coreConsonants, ...yVowels],
    teaches: yVowels,
    batchim: false,
  },
  {
    id: "w-vowels",
    title: "Vokal W (urutan lama)",
    letters: [
      "ㅇ",
      ...basicVowels,
      ...coreConsonants,
      ...yVowels,
      ...aspiratedTense,
      ...wVowels,
    ],
    teaches: wVowels,
    batchim: false,
  },
] as const satisfies readonly HangeulGameStage[];

export type HangeulGameStageId = (typeof HANGEUL_GAME_STAGES)[number]["id"];
export const HANGEUL_GAME_STAGE_IDS = HANGEUL_GAME_STAGES.map(
  (stage) => stage.id,
) as HangeulGameStageId[];

export function isHangeulGameKey(value: unknown): value is HangeulGameKey {
  return (
    typeof value === "string" &&
    (HANGEUL_GAME_KEYS as readonly string[]).includes(value)
  );
}

export function getHangeulGameStage(
  value: unknown,
): HangeulGameStage | undefined {
  return HANGEUL_GAME_STAGES.find((stage) => stage.id === value);
}

/**
 * The in-app path of a game, optionally narrowed to a stage. `courseItemId`
 * marks a launch from a lesson, so leaving the game returns to it.
 */
export function hangeulGamePath(input: {
  gameKey: HangeulGameKey;
  stage?: string;
  courseItemId?: string;
}) {
  const params = new URLSearchParams();
  if (input.stage && getHangeulGameStage(input.stage)) {
    params.set("stage", input.stage);
  }
  if (input.courseItemId) params.set("sourceCourseItemId", input.courseItemId);
  const query = params.toString();
  return `/games/${input.gameKey}${query ? `?${query}` : ""}`;
}

/** The `hakgyo://` deep link that opens the game in the mobile app. */
export function hangeulGameDeepLink(input: {
  gameKey: HangeulGameKey;
  stage?: string;
}) {
  return `hakgyo:/${hangeulGamePath(input)}`;
}
