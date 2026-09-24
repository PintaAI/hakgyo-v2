export type WordChallenge = {
  word: string;
  meaning: string;
  pronunciation: string;
  family: string;
  syllables: readonly string[];
  tiles: readonly string[];
};

// A local Hangeul practice path, independent of course vocabulary and progress.
export const WORD_CHALLENGES: readonly WordChallenge[] = [
  {
    word: "나무",
    meaning: "pohon",
    pronunciation: "namu",
    family: "Dua suku kata",
    syllables: ["나", "무"],
    tiles: ["무", "누", "나", "마"],
  },
  {
    word: "바다",
    meaning: "laut",
    pronunciation: "bada",
    family: "Dua suku kata",
    syllables: ["바", "다"],
    tiles: ["다", "파", "바", "도"],
  },
  {
    word: "우유",
    meaning: "susu",
    pronunciation: "uyu",
    family: "Dua suku kata",
    syllables: ["우", "유"],
    tiles: ["유", "오", "요", "우"],
  },
  {
    word: "학교",
    meaning: "sekolah",
    pronunciation: "hakgyo",
    family: "Dengan batchim",
    syllables: ["학", "교"],
    tiles: ["고", "교", "학", "하"],
  },
  {
    word: "사과",
    meaning: "apel",
    pronunciation: "sagwa",
    family: "Vokal gabungan",
    syllables: ["사", "과"],
    tiles: ["과", "가", "사", "소"],
  },
  {
    word: "친구",
    meaning: "teman",
    pronunciation: "chingu",
    family: "Dengan batchim",
    syllables: ["친", "구"],
    tiles: ["구", "진", "고", "친"],
  },
  {
    word: "고양이",
    meaning: "kucing",
    pronunciation: "goyangi",
    family: "Tiga suku kata",
    syllables: ["고", "양", "이"],
    tiles: ["양", "이", "요", "고", "아"],
  },
  {
    word: "바나나",
    meaning: "pisang",
    pronunciation: "banana",
    family: "Suku kata berulang",
    syllables: ["바", "나", "나"],
    tiles: ["나", "다", "바", "나", "마"],
  },
];
