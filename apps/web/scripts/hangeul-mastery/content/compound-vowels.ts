import {
  audioClip,
  b,
  callout,
  contrast,
  game,
  lessonPage,
  letters,
  p,
  rules,
  syllableGrid,
} from "../blocks";
import type { ModuleContent, QuestionContent } from "../content-types";

/** A single-choice question with four options; `correct` is the index of the right one. */
const single = (
  key: string,
  prompt: QuestionContent["prompt"],
  options: [string, string, string, string],
  correct: 0 | 1 | 2 | 3,
  explanation: string,
): QuestionContent => ({
  key,
  type: "SINGLE_CHOICE",
  prompt,
  explanation,
  options: options.map((content, index) => ({
    content,
    correct: index === correct,
  })),
});

const hear = (
  text: string,
  question = "Dengarkan, lalu pilih kata yang kamu dengar.",
) => [p(question), audioClip(text)];

const ROMANIZATION = { showRomanization: true };
const COMPOUND = [
  "ㅐ",
  "ㅔ",
  "ㅒ",
  "ㅖ",
  "ㅘ",
  "ㅝ",
  "ㅙ",
  "ㅞ",
  "ㅚ",
  "ㅟ",
  "ㅢ",
];

// Chapter 3: every compound vowel, then the Indonesian vowels against the Korean ones. The
// module key predates the vowels-first order (it was chapter 5, the W vowels)
// and stays for progress.
export const compoundVowels: ModuleContent = {
  key: "m5-w-vowels",
  title: "Vokal rangkap",
  description:
    "Sebelas vokal rangkap, lalu perbandingan vokal Indonesia dan vokal Korea. Setelah bab ini kamu kenal semua vokal Hangeul.",
  items: [
    {
      type: "material",
      key: "m3-ae-e",
      title: "Vokal rangkap",
      description:
        "Sebelas vokal yang dibuat dari dua vokal: ㅐ ㅔ ㅒ ㅖ, ㅘ ㅝ ㅙ ㅞ, dan ㅚ ㅟ ㅢ.",
      minutes: 8,
      blocks: [
        lessonPage({
          theme: "rose",
          imageKey: "chapter-5",
          imageAlt: "Teman kagum melihat apel di pasar buah",
          chapter: 3,
          title: "ㅐ ㅔ ㅘ ㅝ ㅚ ㅟ ㅢ",
          subtitle: "Vokal rangkap",
          question: "와!",
          answer: "우와!",
          cards: [
            {
              label: "Huruf baru",
              title: "11 vokal rangkap",
              description: "Dua vokal jadi satu",
            },
            {
              label: "Tips",
              title: "a i u e o",
              description: "Vokal Indonesia di Hangeul",
            },
            {
              label: "Kosakata",
              title: "왜 · 예의 · 위",
              description: "Kata dari semua vokal",
            },
          ],
          goals: [
            "Membaca semua vokal Hangeul.",
            "Tahu vokal mana yang bunyinya sama dengan vokal Indonesia.",
          ],
        }),
        rules({
          title: "Tiga cara merangkap vokal",
          intro:
            "Semua vokal rangkap dibuat dari vokal yang sudah kamu pelajari.",
          columns: ["Cara", "Jadi", "Dibaca"],
          rows: [
            {
              when: "Vokal tegak + ㅣ",
              result: "ㅐ ㅔ ㅒ ㅖ",
              example: "e, e, ye, ye",
            },
            {
              when: "ㅗ atau ㅜ + vokal",
              result: "ㅘ ㅝ ㅙ ㅞ",
              example: "wa, wo, we, we",
            },
            {
              when: "Vokal mendatar + ㅣ",
              result: "ㅚ ㅟ ㅢ",
              example: "we, wi, ui",
            },
          ],
          tip: {
            title: "Banyak yang bunyinya sama",
            text: "ㅐ = ㅔ, ㅒ = ㅖ, dan ㅙ = ㅚ = ㅞ. Hafalkan ejaannya per kata.",
          },
        }),
        letters(
          "Vokal + ㅣ: bunyi e",
          [
            {
              character: "ㅐ",
              cue: 'Seperti "e" di "bebek". Bentuknya ㅏ + ㅣ.',
              romanization: "ae",
              say: "애",
              example: {
                word: "애",
                meaning: "anak (santai)",
                romanization: "ae",
              },
            },
            {
              character: "ㅔ",
              cue: "Sama dengan ㅐ. Bentuknya ㅓ + ㅣ.",
              romanization: "e",
              say: "에",
            },
            {
              character: "ㅒ",
              cue: '"y" lalu e. Jarang dipakai.',
              romanization: "yae",
              say: "얘",
            },
            {
              character: "ㅖ",
              cue: '"y" lalu e.',
              romanization: "ye",
              say: "예",
              example: {
                word: "예",
                meaning: "ya (sopan)",
                romanization: "ye",
              },
            },
          ],
          ROMANIZATION,
        ),
        letters(
          "ㅗ atau ㅜ + vokal: bunyi w",
          [
            {
              character: "ㅘ",
              cue: 'ㅗ + ㅏ. Seperti "wa" di "wajah".',
              romanization: "wa",
              say: "와",
              example: { word: "우와", meaning: "wah!", romanization: "uwa" },
            },
            {
              character: "ㅝ",
              cue: "ㅜ + ㅓ. Bibir bulat dulu, lalu buka ke ㅓ yang santai.",
              romanization: "wo",
              say: "워",
            },
            {
              character: "ㅙ",
              cue: 'ㅗ + ㅐ. "w" lalu e di "bebek".',
              romanization: "wae",
              say: "왜",
              example: { word: "왜", meaning: "kenapa", romanization: "wae" },
            },
            {
              character: "ㅞ",
              cue: "ㅜ + ㅔ. Bunyinya sama dengan ㅙ.",
              romanization: "we",
              say: "웨",
            },
          ],
          ROMANIZATION,
        ),
        letters(
          "Vokal mendatar + ㅣ",
          [
            {
              character: "ㅚ",
              cue: 'ㅗ + ㅣ, tapi dibaca "we", sama dengan ㅙ.',
              romanization: "oe",
              say: "외",
              example: {
                word: "외워요",
                meaning: "menghafal",
                romanization: "oewoyo",
              },
            },
            {
              character: "ㅟ",
              cue: 'ㅜ + ㅣ. Seperti "wi" di "wisata".',
              romanization: "wi",
              say: "위",
              example: { word: "위", meaning: "atas", romanization: "wi" },
            },
            {
              character: "ㅢ",
              cue: "ㅡ + ㅣ. ㅡ dengan bibir datar, cepat meluncur ke ㅣ.",
              romanization: "ui",
              say: "의",
              example: {
                word: "의외",
                meaning: "di luar dugaan",
                romanization: "uioe",
              },
            },
          ],
          ROMANIZATION,
        ),
        contrast(
          "Bunyi sama, ejaan beda",
          "Putar tiap baris. Yang satu baris terdengar sama.",
          [
            {
              items: [
                { text: "애", romanization: "ae" },
                { text: "에", romanization: "e" },
              ],
            },
            {
              items: [
                { text: "왜", romanization: "wae" },
                { text: "외", romanization: "oe" },
                { text: "웨", romanization: "we" },
              ],
            },
          ],
          ROMANIZATION,
        ),
        syllableGrid(
          "Sebelas vokal rangkap dengan ㅇ",
          ["ㅇ"],
          COMPOUND,
          ROMANIZATION,
        ),
        game(
          "stroke-master",
          "compound-vowels",
          "Kenali vokal rangkap",
          "Cocokkan bentuk vokal rangkap dengan bunyinya.",
        ),
      ],
    },
    {
      type: "material",
      key: "m5-sound-map",
      title: "Vokal Indonesia dan vokal Korea",
      description:
        "Bunyi a i u e o di Hangeul, contoh pelafalannya, dan dua bunyi yang tidak ada di bahasa Indonesia.",
      minutes: 6,
      blocks: [
        callout(
          "info",
          'Bahasa Indonesia punya 5 huruf vokal: a, i, u, e, o. Huruf e dibaca dua cara, seperti di "bebek" dan di "emas". Bahasa Korea punya ',
          b("21 vokal"),
          ", tapi banyak bunyinya sama dengan vokal Indonesia.",
        ),
        letters(
          "Dari a i u e o ke Hangeul",
          [
            {
              character: "ㅏ",
              cue: 'a di "apa": sama.',
              romanization: "a",
              say: "아",
              example: { word: "아이", meaning: "anak", romanization: "ai" },
            },
            {
              character: "ㅣ",
              cue: 'i di "ini": sama.',
              romanization: "i",
              say: "이",
              example: { word: "이유", meaning: "alasan", romanization: "iyu" },
            },
            {
              character: "ㅜ",
              cue: 'u di "batu": sama, bibir bulat dan maju.',
              romanization: "u",
              say: "우",
              example: { word: "우유", meaning: "susu", romanization: "uyu" },
            },
            {
              character: "ㅗ",
              cue: 'o di "obat": sama, bibir bulat.',
              romanization: "o",
              say: "오",
              example: { word: "오이", meaning: "timun", romanization: "oi" },
            },
            {
              character: "ㅔ",
              cue: 'e di "bebek": sama. ㅐ juga dibaca begini.',
              romanization: "e",
              say: "에",
              example: {
                word: "애",
                meaning: "anak (santai)",
                romanization: "ae",
              },
            },
            {
              character: "ㅡ",
              cue: 'e di "emas": mirip, tapi bibir datar dan lidah ke belakang.',
              romanization: "eu",
              say: "으",
            },
            {
              character: "ㅓ",
              cue: 'Tidak ada di bahasa Indonesia: "o" dengan bibir santai.',
              romanization: "eo",
              say: "어",
              example: {
                word: "어이",
                meaning: "hei! (kurang sopan)",
                romanization: "eoi",
              },
            },
          ],
          ROMANIZATION,
        ),
        contrast(
          "Tiga pasangan yang paling sering tertukar",
          "Putar tiap pasangan sampai kamu bisa mendengar bedanya.",
          [
            {
              items: [
                { text: "오", romanization: "o" },
                { text: "어", romanization: "eo" },
              ],
              note: 'ㅗ "o" di "obat", bibir bulat. ㅓ bibir santai.',
            },
            {
              items: [
                { text: "우", romanization: "u" },
                { text: "으", romanization: "eu" },
              ],
              note: 'ㅜ "u" di "batu", bibir bulat. ㅡ mirip "e" di "emas", bibir datar.',
            },
            {
              items: [
                { text: "오이", meaning: "timun", romanization: "oi" },
                {
                  text: "어이",
                  meaning: "hei! (kurang sopan)",
                  romanization: "eoi",
                },
              ],
              note: "Salah vokal, beda arti.",
            },
          ],
          ROMANIZATION,
        ),
        callout(
          "success",
          b("Ingat: "),
          "yang tidak ada di bahasa Indonesia cuma ㅓ dan ㅡ. Vokal lainnya bunyi a, i, u, e, o, ditambah y atau w.",
        ),
      ],
    },
    {
      type: "vocabulary",
      key: "m5-vocab-combined",
      title: "Kosakata C: kata dari semua vokal",
      description:
        "Kata yang bisa kamu baca dengan ㅇ dan semua vokal, sebelum belajar konsonan.",
      entries: [
        { term: "애", definition: "anak (santai)", romanization: "ae" },
        { term: "예", definition: "ya (sopan)", romanization: "ye" },
        {
          term: "왜",
          definition: "kenapa",
          romanization: "wae",
          examples: ["왜 와요? = Kenapa datang?"],
        },
        { term: "우와", definition: "wah!", romanization: "uwa" },
        { term: "위", definition: "atas", romanization: "wi" },
        { term: "예의", definition: "sopan santun", romanization: "yeui" },
        { term: "의외", definition: "di luar dugaan", romanization: "uioe" },
        {
          term: "와요",
          definition: "datang (sopan)",
          romanization: "wayo",
          examples: ["예, 와요. = Ya, saya datang."],
        },
        {
          term: "외워요",
          definition: "menghafal (sopan)",
          romanization: "oewoyo",
        },
      ],
    },
    {
      type: "assessment",
      key: "m5-quiz",
      title: "Kuis bab 3: vokal rangkap",
      description:
        "12 soal tentang vokal rangkap dan perbedaan vokal Indonesia dan vokal Korea.",
      instructions:
        "Untuk soal mendengar, putar audionya sebanyak yang kamu perlukan. Nilai lulus 80%.",
      passingScore: 80,
      shuffleOptions: true,
      questions: [
        single(
          "ae-e",
          "Apa yang benar tentang ㅐ dan ㅔ?",
          [
            'ㅐ dibaca "a" lalu "i"',
            'ㅔ dibaca seperti e di "emas"',
            'Keduanya dibaca seperti e di "bebek"; bedanya di ejaan',
            "ㅐ selalu dibaca lebih panjang dari ㅔ",
          ],
          2,
          'ㅐ dan ㅔ sekarang dibaca sama, seperti "e" di "bebek". Karena itu kamu menghafal ejaan setiap kata.',
        ),
        single(
          "o-plus-a",
          "Vokal mana yang merupakan gabungan ㅗ + ㅏ?",
          ["ㅝ", "ㅘ", "ㅚ", "ㅙ"],
          1,
          "ㅗ + ㅏ = ㅘ (wa). ㅝ adalah ㅜ + ㅓ, ㅚ adalah ㅗ + ㅣ, dan ㅙ adalah ㅗ + ㅐ.",
        ),
        single(
          "u-plus-eo",
          "Vokal mana yang merupakan gabungan ㅜ + ㅓ?",
          ["ㅘ", "ㅟ", "ㅞ", "ㅝ"],
          3,
          "ㅜ + ㅓ = ㅝ. ㅜ berpasangan dengan ㅓ dan ㅔ, ㅗ berpasangan dengan ㅏ dan ㅐ.",
        ),
        single(
          "hear-wa",
          hear("와", "Dengarkan, lalu pilih suku kata yang kamu dengar."),
          ["워", "와", "왜", "위"],
          1,
          "Yang kamu dengar adalah 와: bibir bulat sebentar, lalu terbuka ke ㅏ.",
        ),
        single(
          "hear-wae",
          hear("왜"),
          ["왜", "와", "위", "의"],
          0,
          "Yang kamu dengar adalah 왜 (kenapa): w lalu e di bebek.",
        ),
        single(
          "odd-one-out",
          "Tiga dari empat vokal ini dibaca sama. Mana yang BERBEDA bunyinya?",
          ["ㅙ", "ㅞ", "ㅟ", "ㅚ"],
          2,
          'ㅙ, ㅞ, dan ㅚ sama-sama dibaca "we". ㅟ dibaca "wi".',
        ),
        single(
          "read-wi",
          "Apa arti kata 위?",
          ["Kenapa", "Atas", "Ya", "Anak"],
          1,
          "위 berarti atas. Kenapa adalah 왜, ya (sopan) 예, dan anak (santai) 애.",
        ),
        single(
          "read-yeui",
          "Apa arti kata 예의?",
          ["Di luar dugaan", "Menghafal", "Sopan santun", "Datang"],
          2,
          "예의 berarti sopan santun. Di luar dugaan adalah 의외, menghafal 외워요, dan datang 와요.",
        ),
        single(
          "hear-uioe",
          hear("의외"),
          ["의외", "이외", "의이", "외의"],
          0,
          "Yang kamu dengar adalah 의외 (di luar dugaan): ㅢ dulu, lalu ㅚ yang dibaca we.",
        ),
        single(
          "map-bebek",
          'Vokal mana yang dibaca seperti "e" di "bebek"?',
          ["ㅡ", "ㅓ", "ㅔ", "ㅗ"],
          2,
          'ㅔ (juga ㅐ) dibaca seperti "e" di "bebek". ㅡ lebih mirip "e" di "emas".',
        ),
        single(
          "map-new",
          "Dua vokal mana yang bunyinya benar-benar baru untuk orang Indonesia?",
          ["ㅏ dan ㅣ", "ㅓ dan ㅡ", "ㅗ dan ㅜ", "ㅐ dan ㅔ"],
          1,
          'ㅓ ("o" dengan bibir santai) dan ㅡ (bibir datar, mirip "e" di "emas"). Yang lain sama dengan a, i, o, u, dan e di bebek.',
        ),
        single(
          "review-hear-eo",
          hear(
            "어",
            "Ulangan bab 1. Dengarkan, lalu pilih suku kata yang kamu dengar.",
          ),
          ["오", "우", "어", "으"],
          2,
          'Yang kamu dengar adalah 어: seperti "o", tapi bibir santai. 오 bibirnya bulat.',
        ),
      ],
    },
  ],
};
