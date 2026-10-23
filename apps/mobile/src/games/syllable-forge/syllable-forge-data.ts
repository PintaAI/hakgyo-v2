import type { HangeulGameStageId } from "@hakgyo/shared/hangeul";

export type SyllableChallenge = {
  target: string;
  cue: string;
  family: string;
  instruction: string;
};

// Local practice fixtures; independent of course data and server progress.
export const SYLLABLE_CHALLENGES: readonly SyllableChallenge[] = [
  {
    target: "가",
    cue: "ga",
    family: "Vokal tegak",
    instruction: "Mulai dengan ㄱ, lalu ㅏ. Vokal tegak menempati sisi kanan.",
  },
  {
    target: "너",
    cue: "neo",
    family: "Vokal tegak",
    instruction: "Susun ㄴ dan ㅓ. Perhatikan arah garis vokalnya.",
  },
  {
    target: "무",
    cue: "mu",
    family: "Vokal mendatar",
    instruction: "Ketik ㅁ lalu ㅜ. Vokal mendatar berada di bawah konsonan.",
  },
  {
    target: "소",
    cue: "so",
    family: "Vokal mendatar",
    instruction: "Gabungkan ㅅ dan ㅗ menjadi satu blok.",
  },
  {
    target: "한",
    cue: "han",
    family: "Dengan batchim",
    instruction: "Susun ㅎ, ㅏ, lalu ㄴ. Konsonan penutup disebut batchim.",
  },
  {
    target: "글",
    cue: "geul",
    family: "Dengan batchim",
    instruction: "Letakkan ㅡ di bawah ㄱ, kemudian tutup dengan ㄹ.",
  },
  {
    target: "강",
    cue: "gang",
    family: "Dengan batchim",
    instruction: "Di akhir blok, ㅇ berbunyi ng.",
  },
  {
    target: "과",
    cue: "gwa",
    family: "Vokal gabungan",
    instruction: "Ketik ㄱ, ㅗ, lalu ㅏ. Dua vokal bergabung menjadi ㅘ.",
  },
  {
    target: "귀",
    cue: "gwi",
    family: "Vokal gabungan",
    instruction: "ㅜ dan ㅣ bergabung menjadi ㅟ. Awali dengan ㄱ.",
  },
  {
    target: "꿔",
    cue: "kkwo",
    family: "Konsonan rangkap",
    instruction: "Aktifkan Shift untuk ㄲ. Lanjutkan dengan ㅜ dan ㅓ.",
  },
  {
    target: "까",
    cue: "kka",
    family: "Konsonan rangkap",
    instruction: "Pakai Shift untuk ㄲ, lalu tambahkan ㅏ.",
  },
  {
    target: "읽",
    cue: "ik",
    family: "Batchim gabungan",
    instruction:
      "Ketik ㅇ, ㅣ, ㄹ, ㄱ. ㄹ dan ㄱ bergabung menjadi batchim ㄺ.",
  },
];

const challenge = (
  target: string,
  cue: string,
  family: string,
  instruction: string,
): SyllableChallenge => ({ target, cue, family, instruction });

// Per-stage sets for lessons (`?stage=`). Each only uses the stage's letters
// and, before `batchim`, has no final consonant (see syllable-forge-data.test.ts).
export const SYLLABLE_CHALLENGES_BY_STAGE = {
  "basic-vowels": [
    challenge(
      "아",
      "a",
      "Vokal tegak",
      "Ketik ㅇ lalu ㅏ. ㅇ di awal tidak berbunyi, jadi blok ini dibaca a.",
    ),
    challenge(
      "이",
      "i",
      "Vokal tegak",
      "Ketik ㅇ lalu ㅣ. Vokal tegak menempati sisi kanan ㅇ.",
    ),
    challenge(
      "오",
      "o",
      "Vokal mendatar",
      "Ketik ㅇ lalu ㅗ. Vokal mendatar berada di bawah ㅇ. Bibir bulat.",
    ),
    challenge(
      "우",
      "u",
      "Vokal mendatar",
      "Ketik ㅇ lalu ㅜ. Garis pendeknya menghadap ke bawah.",
    ),
    challenge(
      "어",
      "eo",
      "Vokal tegak",
      "Ketik ㅇ lalu ㅓ. Garis pendeknya menghadap ke kiri; bibir tidak bulat.",
    ),
    challenge(
      "으",
      "eu",
      "Vokal mendatar",
      "Ketik ㅇ lalu ㅡ. Satu garis datar, bibir juga datar.",
    ),
  ],
  "core-consonants": [
    challenge("나", "na", "ㄴ dan ㅁ", "Ketik ㄴ lalu ㅏ. 나 berarti aku."),
    challenge("너", "neo", "ㄴ dan ㅁ", "Ketik ㄴ lalu ㅓ. 너 berarti kamu."),
    challenge(
      "머",
      "meo",
      "ㄴ dan ㅁ",
      "Ketik ㅁ lalu ㅓ. Blok ini membuka kata 머리 (kepala).",
    ),
    challenge("소", "so", "ㅅ dan ㅂ", "Ketik ㅅ lalu ㅗ. 소 berarti sapi."),
    challenge("비", "bi", "ㅅ dan ㅂ", "Ketik ㅂ lalu ㅣ. 비 berarti hujan."),
    challenge(
      "그",
      "geu",
      "ㄱ ㄷ ㅈ",
      "Ketik ㄱ lalu ㅡ. Vokal mendatar berada di bawah ㄱ.",
    ),
    challenge("두", "du", "ㄱ ㄷ ㅈ", "Ketik ㄷ lalu ㅜ. 두 berarti dua."),
    challenge(
      "저",
      "jeo",
      "ㄱ ㄷ ㅈ",
      "Ketik ㅈ lalu ㅓ. 저 berarti saya (sopan).",
    ),
    challenge(
      "하",
      "ha",
      "ㅎ dan ㄹ",
      "Ketik ㅎ lalu ㅏ. Blok ini membuka kata 하나 (satu).",
    ),
    challenge(
      "라",
      "ra",
      "ㅎ dan ㄹ",
      "Ketik ㄹ lalu ㅏ. ㄹ diucapkan r ringan tanpa getar, seperti di 라디오.",
    ),
  ],
  "y-vowels": [
    challenge(
      "야",
      "ya",
      "Vokal Y",
      "Ketik ㅇ lalu ㅑ. Dua garis pendek menambah bunyi y.",
    ),
    challenge(
      "여",
      "yeo",
      "Vokal Y",
      "Ketik ㅇ lalu ㅕ. Ini ㅓ dengan awalan y, seperti di 여기.",
    ),
    challenge("요", "yo", "Vokal Y", "Ketik ㅇ lalu ㅛ. Blok ini ada di 요리."),
    challenge(
      "유",
      "yu",
      "Vokal Y",
      "Ketik ㅇ lalu ㅠ. Blok ini menutup kata 우유 (susu).",
    ),
    challenge(
      "교",
      "gyo",
      "Vokal Y",
      "Ketik ㄱ lalu ㅛ. Blok ini membuka kata 교사 (guru).",
    ),
    challenge(
      "개",
      "gae",
      "ㅐ dan ㅔ",
      "Ketik ㄱ lalu ㅐ. 개 berarti anjing; ㅐ dibaca e seperti enak.",
    ),
    challenge(
      "게",
      "ge",
      "ㅐ dan ㅔ",
      "Ketik ㄱ lalu ㅔ. 게 berarti kepiting. Bunyinya sama dengan 개, ejaannya beda.",
    ),
    challenge("새", "sae", "ㅐ dan ㅔ", "Ketik ㅅ lalu ㅐ. 새 berarti burung."),
    challenge("네", "ne", "ㅐ dan ㅔ", "Ketik ㄴ lalu ㅔ. 네 berarti ya."),
    challenge(
      "래",
      "rae",
      "ㅐ dan ㅔ",
      "Ketik ㄹ lalu ㅐ. Blok ini menutup kata 노래 (lagu).",
    ),
    challenge(
      "예",
      "ye",
      "ㅒ dan ㅖ",
      "Pakai Shift untuk ㅖ setelah ㅇ. 예 juga berarti ya, lebih sopan.",
    ),
    challenge(
      "얘",
      "yae",
      "ㅒ dan ㅖ",
      "Pakai Shift untuk ㅒ setelah ㅇ. 얘 berarti anak ini.",
    ),
  ],
  "aspirated-tense": [
    challenge(
      "코",
      "ko",
      "Konsonan berhembus",
      "Ketik ㅋ lalu ㅗ. 코 berarti hidung; k dengan hembusan udara.",
    ),
    challenge(
      "커",
      "keo",
      "Konsonan berhembus",
      "Ketik ㅋ lalu ㅓ. Blok ini membuka kata 커피 (kopi).",
    ),
    challenge(
      "토",
      "to",
      "Konsonan berhembus",
      "Ketik ㅌ lalu ㅗ. Blok ini ada dua kali di 토마토.",
    ),
    challenge(
      "피",
      "pi",
      "Konsonan berhembus",
      "Ketik ㅍ lalu ㅣ. 피 berarti darah; bandingkan dengan 비 (hujan).",
    ),
    challenge(
      "포",
      "po",
      "Konsonan berhembus",
      "Ketik ㅍ lalu ㅗ. Blok ini membuka kata 포도 (anggur).",
    ),
    challenge(
      "차",
      "cha",
      "Konsonan berhembus",
      "Ketik ㅊ lalu ㅏ. 차 berarti teh atau mobil; c dengan hembusan udara.",
    ),
    challenge(
      "치",
      "chi",
      "Konsonan berhembus",
      "Ketik ㅊ lalu ㅣ. Blok ini membuka kata 치마 (rok).",
    ),
    challenge(
      "끼",
      "kki",
      "Konsonan tegang",
      "Pakai Shift untuk ㄲ, lalu ㅣ. Blok ini menutup kata 토끼 (kelinci).",
    ),
    challenge(
      "또",
      "tto",
      "Konsonan tegang",
      "Pakai Shift untuk ㄸ, lalu ㅗ. 또 berarti lagi.",
    ),
    challenge(
      "빠",
      "ppa",
      "Konsonan tegang",
      "Pakai Shift untuk ㅃ, lalu ㅏ. Blok ini menutup kata 아빠 (ayah).",
    ),
    challenge(
      "싸",
      "ssa",
      "Konsonan tegang",
      "Pakai Shift untuk ㅆ, lalu ㅏ. 싸다 berarti murah, 사다 berarti membeli.",
    ),
    challenge(
      "짜",
      "jja",
      "Konsonan tegang",
      "Pakai Shift untuk ㅉ, lalu ㅏ. 짜다 berarti asin.",
    ),
  ],
  "w-vowels": [
    challenge(
      "와",
      "wa",
      "ㅗ + vokal",
      "Ketik ㅇ, ㅗ, lalu ㅏ. Dua vokal bergabung menjadi ㅘ. 와 berarti wah!",
    ),
    challenge(
      "과",
      "gwa",
      "ㅗ + vokal",
      "Ketik ㄱ, ㅗ, lalu ㅏ. Blok ini menutup kata 사과 (apel).",
    ),
    challenge(
      "왜",
      "wae",
      "ㅗ + vokal",
      "Ketik ㅇ, ㅗ, lalu ㅐ. 왜 berarti kenapa.",
    ),
    challenge(
      "돼",
      "dwae",
      "ㅗ + vokal",
      "Ketik ㄷ, ㅗ, lalu ㅐ. Blok ini membuka kata 돼지 (babi).",
    ),
    challenge(
      "회",
      "hoe",
      "ㅗ + vokal",
      "Ketik ㅎ, ㅗ, lalu ㅣ. ㅚ dibaca we; blok ini membuka kata 회사.",
    ),
    challenge(
      "최",
      "choe",
      "ㅗ + vokal",
      "Ketik ㅊ, ㅗ, lalu ㅣ. Blok ini membuka kata 최고 (terbaik).",
    ),
    challenge(
      "뭐",
      "mwo",
      "ㅜ + vokal",
      "Ketik ㅁ, ㅜ, lalu ㅓ. 뭐 berarti apa (akrab).",
    ),
    challenge(
      "워",
      "wo",
      "ㅜ + vokal",
      "Ketik ㅇ, ㅜ, lalu ㅓ. Blok ini menutup kata 샤워.",
    ),
    challenge(
      "웨",
      "we",
      "ㅜ + vokal",
      "Ketik ㅇ, ㅜ, lalu ㅔ. Blok ini membuka kata 웨이터 (pelayan).",
    ),
    challenge(
      "위",
      "wi",
      "ㅜ + vokal",
      "Ketik ㅇ, ㅜ, lalu ㅣ. 위 berarti atas.",
    ),
    challenge(
      "귀",
      "gwi",
      "ㅜ + vokal",
      "Ketik ㄱ, ㅜ, lalu ㅣ. 귀 berarti telinga.",
    ),
    challenge(
      "의",
      "ui",
      "ㅡ + ㅣ",
      "Ketik ㅇ, ㅡ, lalu ㅣ. Blok ini membuka kata 의사 (dokter).",
    ),
  ],
  batchim: [
    challenge(
      "한",
      "han",
      "Batchim ㄴ ㅁ ㅇ",
      "Ketik ㅎ, ㅏ, lalu ㄴ. Konsonan penutup di bawah disebut batchim.",
    ),
    challenge(
      "밤",
      "bam",
      "Batchim ㄴ ㅁ ㅇ",
      "Ketik ㅂ, ㅏ, lalu ㅁ. 밤 berarti malam.",
    ),
    challenge(
      "방",
      "bang",
      "Batchim ㄴ ㅁ ㅇ",
      "Ketik ㅂ, ㅏ, lalu ㅇ. Di akhir, ㅇ berbunyi ng seperti uang. 방 berarti kamar.",
    ),
    challenge(
      "말",
      "mal",
      "Batchim ㄹ",
      "Ketik ㅁ, ㅏ, lalu ㄹ. Di akhir, ㄹ berbunyi l seperti mobil.",
    ),
    challenge(
      "물",
      "mul",
      "Batchim ㄹ",
      "Ketik ㅁ, ㅜ, lalu ㄹ. 물 berarti air.",
    ),
    challenge(
      "책",
      "chaek",
      "Batchim ㄱ ㅂ ㄷ",
      "Ketik ㅊ, ㅐ, lalu ㄱ. 책 berarti buku; k di akhir tidak diletupkan.",
    ),
    challenge(
      "밥",
      "bap",
      "Batchim ㄱ ㅂ ㄷ",
      "Ketik ㅂ, ㅏ, lalu ㅂ. 밥 berarti nasi; p di akhir seperti siap.",
    ),
    challenge(
      "집",
      "jip",
      "Batchim ㄱ ㅂ ㄷ",
      "Ketik ㅈ, ㅣ, lalu ㅂ. 집 berarti rumah.",
    ),
    challenge(
      "옷",
      "ot",
      "Banyak huruf, satu bunyi",
      "Ketik ㅇ, ㅗ, lalu ㅅ. ㅅ di akhir dibaca t. 옷 berarti baju.",
    ),
    challenge(
      "꽃",
      "kkot",
      "Banyak huruf, satu bunyi",
      "Shift untuk ㄲ, lalu ㅗ dan ㅊ. ㅊ di akhir juga dibaca t. 꽃 berarti bunga.",
    ),
    challenge(
      "닭",
      "dak",
      "Batchim ganda",
      "Ketik ㄷ, ㅏ, ㄹ, ㄱ. ㄹ dan ㄱ menjadi ㄺ; bacanya k. 닭 berarti ayam.",
    ),
    challenge(
      "값",
      "gap",
      "Batchim ganda",
      "Ketik ㄱ, ㅏ, ㅂ, ㅅ. ㅂ dan ㅅ menjadi ㅄ; bacanya p. 값 berarti harga.",
    ),
  ],
} as const satisfies Record<HangeulGameStageId, readonly SyllableChallenge[]>;

/** The challenge set for a stage, or the general set without one. */
export function getSyllableChallenges(
  stageId?: string,
): readonly SyllableChallenge[] {
  return stageId && stageId in SYLLABLE_CHALLENGES_BY_STAGE
    ? SYLLABLE_CHALLENGES_BY_STAGE[stageId as HangeulGameStageId]
    : SYLLABLE_CHALLENGES;
}
