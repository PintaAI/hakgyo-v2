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
  /** The letters this stage practises (compatibility jamo). */
  letters: readonly string[];
  /** Whether the stage includes syllables with batchim. */
  batchim: boolean;
};

const basicVowels = [..."ㅏㅓㅗㅜㅡㅣ"];
const coreConsonants = [..."ㅇㄴㅁㅅㅂㄱㄷㅈㅎㄹ"];
const yVowels = [..."ㅑㅕㅛㅠㅐㅔㅒㅖ"];
const aspiratedTense = [..."ㅋㅌㅍㅊㄲㄸㅃㅆㅉ"];
const wVowels = [..."ㅘㅝㅙㅞㅚㅟㅢ"];

export const HANGEUL_GAME_STAGES = [
  {
    id: "basic-vowels",
    title: "Vokal dasar",
    letters: ["ㅇ", ...basicVowels],
    batchim: false,
  },
  {
    id: "core-consonants",
    title: "Konsonan inti",
    letters: [...basicVowels, ...coreConsonants],
    batchim: false,
  },
  {
    id: "y-vowels",
    title: "Vokal Y dan ㅐ ㅔ",
    letters: [...basicVowels, ...coreConsonants, ...yVowels],
    batchim: false,
  },
  {
    id: "aspirated-tense",
    title: "Konsonan aspirasi dan tegang",
    letters: [...basicVowels, ...coreConsonants, ...yVowels, ...aspiratedTense],
    batchim: false,
  },
  {
    id: "w-vowels",
    title: "Vokal W",
    letters: [
      ...basicVowels,
      ...coreConsonants,
      ...yVowels,
      ...aspiratedTense,
      ...wVowels,
    ],
    batchim: false,
  },
  {
    id: "batchim",
    title: "Batchim",
    letters: [
      ...basicVowels,
      ...coreConsonants,
      ...yVowels,
      ...aspiratedTense,
      ...wVowels,
    ],
    batchim: true,
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
