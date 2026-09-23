export type HangeulLetter = {
  id: string;
  character: string;
  cue: string;
  note: string;
  example?: string;
  kind: "consonant" | "vowel";
};

export const HANGEUL_LETTERS: HangeulLetter[] = [
  {
    id: "a",
    character: "ㅏ",
    cue: "a",
    note: "seperti a pada apa",
    example: "apa",
    kind: "vowel",
  },
  {
    id: "ya",
    character: "ㅑ",
    cue: "ya",
    note: "seperti ya pada yakin",
    example: "yakin",
    kind: "vowel",
  },
  {
    id: "eo",
    character: "ㅓ",
    cue: "eo",
    note: "bunyi khas Korea; dengarkan contoh",
    kind: "vowel",
  },
  {
    id: "yeo",
    character: "ㅕ",
    cue: "yeo",
    note: "ㅓ dengan awalan y",
    kind: "vowel",
  },
  {
    id: "o",
    character: "ㅗ",
    cue: "o",
    note: "seperti o pada obat",
    example: "obat",
    kind: "vowel",
  },
  {
    id: "yo",
    character: "ㅛ",
    cue: "yo",
    note: "seperti yo pada yoga",
    example: "yoga",
    kind: "vowel",
  },
  {
    id: "u",
    character: "ㅜ",
    cue: "u",
    note: "seperti u pada umur",
    example: "umur",
    kind: "vowel",
  },
  {
    id: "yu",
    character: "ㅠ",
    cue: "yu",
    note: "ㅜ dengan awalan y",
    kind: "vowel",
  },
  {
    id: "eu",
    character: "ㅡ",
    cue: "eu",
    note: "bunyi khas Korea; bibir rileks",
    kind: "vowel",
  },
  {
    id: "i",
    character: "ㅣ",
    cue: "i",
    note: "seperti i pada ini",
    example: "ini",
    kind: "vowel",
  },
  {
    id: "ae",
    character: "ㅐ",
    cue: "ae",
    note: "vokal ganda ㅏ + ㅣ; kini terdengar mirip e",
    kind: "vowel",
  },
  {
    id: "yae",
    character: "ㅒ",
    cue: "yae",
    note: "vokal ganda ㅑ + ㅣ; kini terdengar mirip ye",
    kind: "vowel",
  },
  {
    id: "e",
    character: "ㅔ",
    cue: "e",
    note: "vokal ganda ㅓ + ㅣ; seperti e pada enak",
    example: "enak",
    kind: "vowel",
  },
  {
    id: "ye",
    character: "ㅖ",
    cue: "ye",
    note: "vokal ganda ㅕ + ㅣ; ㅔ dengan awalan y",
    kind: "vowel",
  },
  {
    id: "wa",
    character: "ㅘ",
    cue: "wa",
    note: "gabungan ㅗ + ㅏ",
    kind: "vowel",
  },
  {
    id: "wae",
    character: "ㅙ",
    cue: "wae",
    note: "gabungan ㅗ + ㅐ",
    kind: "vowel",
  },
  {
    id: "oe",
    character: "ㅚ",
    cue: "oe",
    note: "gabungan ㅗ + ㅣ; sering terdengar seperti we",
    kind: "vowel",
  },
  {
    id: "wo",
    character: "ㅝ",
    cue: "wo",
    note: "gabungan ㅜ + ㅓ",
    kind: "vowel",
  },
  {
    id: "we",
    character: "ㅞ",
    cue: "we",
    note: "gabungan ㅜ + ㅔ",
    kind: "vowel",
  },
  {
    id: "wi",
    character: "ㅟ",
    cue: "wi",
    note: "gabungan ㅜ + ㅣ",
    kind: "vowel",
  },
  {
    id: "ui",
    character: "ㅢ",
    cue: "ui",
    note: "gabungan ㅡ + ㅣ; pengucapannya berubah menurut posisi",
    kind: "vowel",
  },
  {
    id: "gk",
    character: "ㄱ",
    cue: "g / k",
    note: "di antara g dan k",
    kind: "consonant",
  },
  {
    id: "n",
    character: "ㄴ",
    cue: "n",
    note: "seperti n pada nasi",
    example: "nasi",
    kind: "consonant",
  },
  {
    id: "dt",
    character: "ㄷ",
    cue: "d / t",
    note: "di antara d dan t",
    kind: "consonant",
  },
  {
    id: "rl",
    character: "ㄹ",
    cue: "r / l",
    note: "berubah menurut posisinya",
    kind: "consonant",
  },
  {
    id: "m",
    character: "ㅁ",
    cue: "m",
    note: "seperti m pada makan",
    example: "makan",
    kind: "consonant",
  },
  {
    id: "bp",
    character: "ㅂ",
    cue: "b / p",
    note: "di antara b dan p",
    kind: "consonant",
  },
  {
    id: "s",
    character: "ㅅ",
    cue: "s",
    note: "seperti s pada saya",
    example: "saya",
    kind: "consonant",
  },
  {
    id: "silent-ng",
    character: "ㅇ",
    cue: "diam / ng",
    note: "diam di awal, ng di akhir",
    kind: "consonant",
  },
  {
    id: "j",
    character: "ㅈ",
    cue: "j",
    note: "mendekati j pada jalan",
    example: "jalan",
    kind: "consonant",
  },
  {
    id: "ch",
    character: "ㅊ",
    cue: "ch",
    note: "c dengan hembusan udara",
    kind: "consonant",
  },
  {
    id: "kh",
    character: "ㅋ",
    cue: "kh",
    note: "k dengan hembusan udara",
    kind: "consonant",
  },
  {
    id: "th",
    character: "ㅌ",
    cue: "th",
    note: "t dengan hembusan udara",
    kind: "consonant",
  },
  {
    id: "ph",
    character: "ㅍ",
    cue: "ph",
    note: "p dengan hembusan udara",
    kind: "consonant",
  },
  {
    id: "h",
    character: "ㅎ",
    cue: "h",
    note: "seperti h pada hari",
    example: "hari",
    kind: "consonant",
  },
  {
    id: "kk",
    character: "ㄲ",
    cue: "kk",
    note: "ㄱ ganda; bunyi k tegang tanpa hembusan kuat",
    kind: "consonant",
  },
  {
    id: "tt",
    character: "ㄸ",
    cue: "tt",
    note: "ㄷ ganda; bunyi t tegang tanpa hembusan kuat",
    kind: "consonant",
  },
  {
    id: "pp",
    character: "ㅃ",
    cue: "pp",
    note: "ㅂ ganda; bunyi p tegang tanpa hembusan kuat",
    kind: "consonant",
  },
  {
    id: "ss",
    character: "ㅆ",
    cue: "ss",
    note: "ㅅ ganda; bunyi s lebih tegang",
    kind: "consonant",
  },
  {
    id: "jj",
    character: "ㅉ",
    cue: "jj",
    note: "ㅈ ganda; bunyi j tegang tanpa hembusan kuat",
    kind: "consonant",
  },
];

export type HangeulFamily = {
  id: string;
  title: string;
  detail: string;
  letterIds: string[];
};

export const HANGEUL_FAMILIES: HangeulFamily[] = [
  {
    id: "vertical-vowels",
    title: "Vokal tegak",
    detail: "Vokal ini diletakkan di sebelah kanan konsonan.",
    letterIds: ["a", "ya", "eo", "yeo", "i"],
  },
  {
    id: "horizontal-vowels",
    title: "Vokal mendatar",
    detail: "Vokal ini diletakkan di bawah konsonan.",
    letterIds: ["o", "yo", "u", "yu", "eu"],
  },
  {
    id: "double-vowels",
    title: "Vokal ganda",
    detail: "Dua bentuk vokal bergabung menjadi satu bunyi baru.",
    letterIds: [
      "ae",
      "yae",
      "e",
      "ye",
      "wa",
      "wae",
      "oe",
      "wo",
      "we",
      "wi",
      "ui",
    ],
  },
  {
    id: "giyeok-family",
    title: "Keluarga ㄱ",
    detail: "Tambahan garis membuat bunyinya lebih kuat.",
    letterIds: ["gk", "kh"],
  },
  {
    id: "nieun-family",
    title: "Keluarga ㄴ",
    detail: "Perhatikan bentuk siku dan perubahan garisnya.",
    letterIds: ["n", "dt", "th", "rl"],
  },
  {
    id: "mieum-family",
    title: "Keluarga ㅁ",
    detail: "Bentuk dasarnya terinspirasi dari posisi bibir.",
    letterIds: ["m", "bp", "ph"],
  },
  {
    id: "siot-family",
    title: "Keluarga ㅅ",
    detail: "Bentuk dasarnya terinspirasi dari posisi gigi.",
    letterIds: ["s", "j", "ch"],
  },
  {
    id: "ieung-family",
    title: "Keluarga ㅇ",
    detail: "ㅇ punya dua peran; ㅎ menambahkan hembusan.",
    letterIds: ["silent-ng", "h"],
  },
  {
    id: "double-consonants",
    title: "Konsonan ganda",
    detail: "Ditulis rangkap dan diucapkan lebih tegang, bukan berhembus.",
    letterIds: ["kk", "tt", "pp", "ss", "jj"],
  },
];

export function getHangeulLetter(id: string) {
  return HANGEUL_LETTERS.find((letter) => letter.id === id);
}

export function getQuizOptions(letter: HangeulLetter, round: number) {
  const peers = HANGEUL_LETTERS.filter(
    (candidate) => candidate.kind === letter.kind && candidate.id !== letter.id,
  );
  const distractors = Array.from({ length: 3 }, (_, offset) => {
    const index = (round * 3 + offset * 5) % peers.length;
    return peers[index]!.cue;
  });
  const options = [...new Set([letter.cue, ...distractors])];

  for (const peer of peers) {
    if (options.length === 4) break;
    if (!options.includes(peer.cue)) options.push(peer.cue);
  }

  const shift = round % options.length;
  return [...options.slice(shift), ...options.slice(0, shift)];
}
