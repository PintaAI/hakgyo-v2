export const gameCatalog = {
  cards: {
    title: "Cards",
    icon: "Aa",
    description: "Flip through the set and recall each word.",
  },
  "word-fall": {
    title: "Word Fall",
    icon: "↓",
    description: "Type each word before it reaches your ship.",
  },
  sentences: {
    title: "Sentences",
    icon: "↔",
    description: "Build meaning, one sentence at a time.",
  },
  match: {
    title: "Vocabulary Match",
    icon: "⌁",
    description: "Connect each word to its meaning.",
  },
  "syllable-forge": {
    title: "Susun 한글",
    icon: "글",
    description: "Ketik huruf dan susun menjadi blok suku kata Hangeul.",
  },
  "stroke-master": {
    title: "Hangeul",
    icon: "한",
    description: "Kenali 10 vokal dan 14 konsonan dasar Hangeul.",
  },
  "word-builder": {
    title: "Susun kata",
    icon: "가나",
    description: "Build Korean words from syllable blocks.",
  },
} satisfies Record<string, GameDefinition>;

export type GameDefinition = {
  title: string;
  icon: string;
  description: string;
};
export type GameKey = keyof typeof gameCatalog;
export function isGameKey(value: string): value is GameKey {
  return Object.prototype.hasOwnProperty.call(gameCatalog, value);
}
