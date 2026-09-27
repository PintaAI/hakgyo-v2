export const gameCatalog = {
  cards: {
    title: "Kartu",
    icon: "Aa",
    description: "Balik kartu dan ingat setiap kata.",
  },
  "word-fall": {
    title: "Hujan Kata",
    icon: "↓",
    description: "Ketik setiap kata sebelum mengenai kapalmu.",
  },
  sentences: {
    title: "Kalimat",
    icon: "↔",
    description: "Bangun makna, satu kalimat demi satu kalimat.",
  },
  match: {
    title: "Cocokkan Kata",
    icon: "⌁",
    description: "Hubungkan setiap kata dengan artinya.",
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
    description: "Susun kata Korea dari blok suku kata Hangeul.",
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
