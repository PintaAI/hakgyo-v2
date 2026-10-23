import type { HangeulGameStageId } from "@hakgyo/shared/hangeul";

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

const word = (
  text: string,
  meaning: string,
  pronunciation: string,
  family: string,
  tiles: readonly string[],
): WordChallenge => ({
  word: text,
  meaning,
  pronunciation,
  family,
  syllables: [...text],
  tiles,
});

// Per-stage sets for lessons (`?stage=`), from the course vocabulary list.
// Words and distractor tiles only use the stage's letters and, before
// `batchim`, have no final consonant (see word-builder-data.test.ts).
// Distractors are the blocks learners confuse (ㅓ/ㅗ, ㅡ/ㅜ, ㄱ/ㅋ/ㄲ, ㅐ/ㅔ).
export const WORD_CHALLENGES_BY_STAGE = {
  "basic-vowels": [
    word("아이", "anak", "ai", "Dua suku kata", ["이", "어", "아", "으"]),
    word("오이", "timun", "oi", "Dua suku kata", ["어", "이", "오", "우"]),
    word("우아", "anggun", "ua", "Dua suku kata", ["아", "으", "우", "어"]),
    word("아우", "adik", "au", "Dua suku kata", ["우", "오", "아", "으"]),
  ],
  "core-consonants": [
    word("나비", "kupu-kupu", "nabi", "Dua suku kata", [
      "비",
      "너",
      "나",
      "미",
    ]),
    word("버스", "bus", "beoseu", "Kata serapan", ["스", "보", "버", "수"]),
    word("두부", "tahu", "dubu", "Dua suku kata", ["부", "도", "두", "보"]),
    word("가수", "penyanyi", "gasu", "Dua suku kata", ["수", "거", "가", "소"]),
    word("고기", "daging", "gogi", "Dua suku kata", ["기", "거", "고", "구"]),
    word("지도", "peta", "jido", "Dua suku kata", ["도", "지", "두", "저"]),
    word("라디오", "radio", "radio", "Kata serapan", [
      "디",
      "오",
      "러",
      "라",
      "도",
    ]),
    word("어머니", "ibu", "eomeoni", "Tiga suku kata", [
      "머",
      "니",
      "오",
      "어",
      "모",
    ]),
  ],
  "y-vowels": [
    word("여기", "di sini", "yeogi", "Vokal Y", ["기", "요", "여", "고"]),
    word("요리", "masakan", "yori", "Vokal Y", ["리", "요", "여", "로"]),
    word("우유", "susu", "uyu", "Vokal Y", ["유", "우", "요", "으"]),
    word("가게", "toko", "gage", "ㅐ dan ㅔ", ["게", "개", "가", "거"]),
    word("노래", "lagu", "norae", "ㅐ dan ㅔ", ["래", "레", "노", "너"]),
    word("배우", "aktor", "baeu", "ㅐ dan ㅔ", ["우", "베", "배", "유"]),
    word("시계", "jam", "sigye", "ㅒ dan ㅖ", ["계", "게", "시", "서"]),
    word("아니요", "tidak", "aniyo", "Tiga suku kata", [
      "니",
      "요",
      "아",
      "여",
      "너",
    ]),
  ],
  "aspirated-tense": [
    word("커피", "kopi", "keopi", "Konsonan berhembus", [
      "피",
      "거",
      "커",
      "비",
    ]),
    word("포도", "anggur", "podo", "Konsonan berhembus", [
      "도",
      "보",
      "포",
      "토",
    ]),
    word("치마", "rok", "chima", "Konsonan berhembus", [
      "마",
      "지",
      "치",
      "찌",
    ]),
    word("토마토", "tomat", "tomato", "Konsonan berhembus", [
      "마",
      "토",
      "도",
      "토",
      "모",
    ]),
    word("아빠", "ayah", "appa", "Konsonan tegang", ["빠", "바", "아", "파"]),
    word("토끼", "kelinci", "tokki", "Konsonan tegang", [
      "끼",
      "도",
      "토",
      "기",
    ]),
    word("아저씨", "paman", "ajeossi", "Konsonan tegang", [
      "저",
      "씨",
      "아",
      "시",
      "쩌",
    ]),
    word("비싸다", "mahal", "bissada", "Konsonan tegang", [
      "싸",
      "다",
      "비",
      "사",
      "따",
    ]),
  ],
  "w-vowels": [
    word("과자", "camilan", "gwaja", "Vokal W", ["자", "가", "과", "고"]),
    word("사과", "apel", "sagwa", "Vokal W", ["과", "서", "사", "고"]),
    word("의사", "dokter", "uisa", "Vokal W", ["사", "이", "의", "서"]),
    word("의자", "kursi", "uija", "Vokal W", ["자", "의", "우", "저"]),
    word("가위", "gunting", "gawi", "Vokal W", ["위", "거", "가", "우"]),
    word("회사", "perusahaan", "hoesa", "Vokal W", ["사", "해", "회", "후"]),
    word("최고", "terbaik", "choego", "Vokal W", ["고", "체", "최", "거"]),
    word("추워요", "dingin", "chuwoyo", "Tiga suku kata", [
      "워",
      "요",
      "추",
      "와",
      "여",
    ]),
  ],
  batchim: [
    word("한국", "Korea", "hanguk", "Dengan batchim", ["국", "한", "항", "군"]),
    word("사랑", "cinta", "sarang", "Dengan batchim", ["랑", "사", "상", "라"]),
    word("학교", "sekolah", "hakgyo", "Dengan batchim", [
      "교",
      "학",
      "하",
      "고",
    ]),
    word("친구", "teman", "chingu", "Dengan batchim", ["구", "친", "진", "군"]),
    word("음식", "makanan", "eumsik", "Dengan batchim", [
      "식",
      "음",
      "은",
      "시",
    ]),
    word("시간", "waktu", "sigan", "Dengan batchim", ["간", "시", "신", "감"]),
    word("병원", "rumah sakit", "byeongwon", "Dengan batchim", [
      "원",
      "병",
      "번",
      "온",
    ]),
    word("선생님", "guru", "seonsaengnim", "Tiga suku kata", [
      "생",
      "님",
      "선",
      "성",
      "니",
    ]),
  ],
} as const satisfies Record<HangeulGameStageId, readonly WordChallenge[]>;

/** The word set for a stage, or the general set without one. */
export function getWordChallenges(stageId?: string): readonly WordChallenge[] {
  return stageId && stageId in WORD_CHALLENGES_BY_STAGE
    ? WORD_CHALLENGES_BY_STAGE[stageId as HangeulGameStageId]
    : WORD_CHALLENGES;
}
