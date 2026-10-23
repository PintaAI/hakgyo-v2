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
    note: "rahang turun seperti o, tetapi bibir tidak bulat",
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
    note: "o tertutup seperti pada toko, bibir bulat",
    example: "toko",
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
    note: "seperti u pada buku, bibir bulat dan maju",
    example: "buku",
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
    note: "ucapkan u dengan bibir datar, tidak bulat",
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
    note: "ditulis ㅏ + ㅣ; e taling seperti sate, sama dengan ㅔ",
    example: "sate",
    kind: "vowel",
  },
  {
    id: "yae",
    character: "ㅒ",
    cue: "yae",
    note: "ditulis ㅑ + ㅣ; ye dengan e taling, sama dengan ㅖ",
    kind: "vowel",
  },
  {
    id: "e",
    character: "ㅔ",
    cue: "e",
    note: "ditulis ㅓ + ㅣ; e taling seperti pada enak",
    example: "enak",
    kind: "vowel",
  },
  {
    id: "ye",
    character: "ㅖ",
    cue: "ye",
    note: "ditulis ㅕ + ㅣ; ㅔ dengan awalan y",
    kind: "vowel",
  },
  {
    id: "wa",
    character: "ㅘ",
    cue: "wa",
    note: "ㅗ + ㅏ; seperti wa pada wajah",
    example: "wajah",
    kind: "vowel",
  },
  {
    id: "wae",
    character: "ㅙ",
    cue: "wae",
    note: "ㅗ + ㅐ; we dengan e taling",
    kind: "vowel",
  },
  {
    id: "oe",
    character: "ㅚ",
    cue: "oe",
    note: "ㅗ + ㅣ; kini dibaca we dengan e taling",
    kind: "vowel",
  },
  {
    id: "wo",
    character: "ㅝ",
    cue: "wo",
    note: "ㅜ + ㅓ; w lalu ㅓ, bibir tidak bulat di akhir",
    kind: "vowel",
  },
  {
    id: "we",
    character: "ㅞ",
    cue: "we",
    note: "ㅜ + ㅔ; we dengan e taling",
    kind: "vowel",
  },
  {
    id: "wi",
    character: "ㅟ",
    cue: "wi",
    note: "ㅜ + ㅣ; seperti wi pada wisata",
    example: "wisata",
    kind: "vowel",
  },
  {
    id: "ui",
    character: "ㅢ",
    cue: "ui",
    note: "ㅡ + ㅣ; bacaannya berubah menurut posisi",
    kind: "vowel",
  },
  {
    id: "gk",
    character: "ㄱ",
    cue: "g / k",
    note: "di antara g dan k, tanpa hembusan",
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
    note: "di antara d dan t, tanpa hembusan",
    kind: "consonant",
  },
  {
    id: "rl",
    character: "ㄹ",
    cue: "r / l",
    note: "r ringan tanpa getar; di akhir l seperti mobil",
    example: "mobil",
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
    note: "di antara b dan p, tanpa hembusan",
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
    cue: "c berhembus",
    note: "c seperti pada cari, ditambah hembusan udara",
    example: "cari",
    kind: "consonant",
  },
  {
    id: "kh",
    character: "ㅋ",
    cue: "k berhembus",
    note: "k seperti pada kita, ditambah hembusan udara",
    example: "kita",
    kind: "consonant",
  },
  {
    id: "th",
    character: "ㅌ",
    cue: "t berhembus",
    note: "t seperti pada tahu, ditambah hembusan udara",
    example: "tahu",
    kind: "consonant",
  },
  {
    id: "ph",
    character: "ㅍ",
    cue: "p berhembus",
    note: "p seperti pada pagi, ditambah hembusan udara",
    example: "pagi",
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
    cue: "k tegang",
    note: "k Indonesia dengan otot tegang, tanpa hembusan",
    kind: "consonant",
  },
  {
    id: "tt",
    character: "ㄸ",
    cue: "t tegang",
    note: "t Indonesia dengan otot tegang, tanpa hembusan",
    kind: "consonant",
  },
  {
    id: "pp",
    character: "ㅃ",
    cue: "p tegang",
    note: "p Indonesia dengan otot tegang, tanpa hembusan",
    kind: "consonant",
  },
  {
    id: "ss",
    character: "ㅆ",
    cue: "s tegang",
    note: "s yang lebih tegang dan tajam daripada ㅅ",
    kind: "consonant",
  },
  {
    id: "jj",
    character: "ㅉ",
    cue: "c tegang",
    note: "c Indonesia dengan otot tegang, tanpa hembusan",
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
    detail: "Garis tambahan menandai hembusan udara.",
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

/**
 * Four answer cues for a letter: its own and three distractors of the same
 * kind. Distractors come from `pool` (the letters a stage has taught) and
 * only fall back to other letters of the same kind when the pool is too small.
 */
export function getQuizOptions(
  letter: HangeulLetter,
  round: number,
  pool: readonly HangeulLetter[] = HANGEUL_LETTERS,
) {
  const sameKind = (candidate: HangeulLetter) =>
    candidate.kind === letter.kind && candidate.cue !== letter.cue;
  const poolPeers = pool.filter(sameKind);
  const options = [letter.cue];

  if (poolPeers.length >= 3) {
    const distractors = Array.from({ length: 3 }, (_, offset) => {
      const index = (round * 3 + offset * 5) % poolPeers.length;
      return poolPeers[index]!.cue;
    });
    for (const cue of distractors) {
      if (!options.includes(cue)) options.push(cue);
    }
  }

  const fallback = HANGEUL_LETTERS.filter(
    (candidate) => sameKind(candidate) && !poolPeers.includes(candidate),
  );
  const rotate = <T>(items: readonly T[]) => {
    const start = items.length ? (round * 3) % items.length : 0;
    return [...items.slice(start), ...items.slice(0, start)];
  };
  for (const peer of [...rotate(poolPeers), ...rotate(fallback)]) {
    if (options.length === 4) break;
    if (!options.includes(peer.cue)) options.push(peer.cue);
  }

  const shift = round % options.length;
  return [...options.slice(shift), ...options.slice(0, shift)];
}
