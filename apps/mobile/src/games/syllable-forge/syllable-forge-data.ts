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
