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
    title: "Syllable Forge",
    icon: "한",
    description: "Build Hangeul syllable blocks.",
  },
  "stroke-master": {
    title: "Stroke Master",
    icon: "✎",
    description: "Trace Hangeul characters in the correct stroke order.",
  },
  "word-builder": {
    title: "Word Builder",
    icon: "가나",
    description: "Connect syllable blocks to build Korean words.",
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
