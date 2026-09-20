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
