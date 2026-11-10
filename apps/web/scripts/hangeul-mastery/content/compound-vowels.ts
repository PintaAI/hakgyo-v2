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

// Chapter 3: every compound vowel, then the map from Indonesian vowels. The
// module key predates the vowels-first order (it was chapter 5, the W vowels)
// and stays for progress.
export const compoundVowels: ModuleContent = {
  key: "m5-w-vowels",
  title: "Vokal gabungan",
  description:
    "ㅐ ㅔ (e di bebek), vokal W, dan ㅚ ㅟ ㅢ. Setelah bab ini kamu kenal semua vokal Hangeul.",
  items: [
    {
      type: "material",
      key: "m3-ae-e",
      title: "ㅐ ㅔ ㅒ ㅖ: e di bebek",
      description:
        'Dua ejaan untuk satu bunyi yang sudah kamu kenal: "e" di "bebek".',
      minutes: 5,
      blocks: [
        lessonPage({
          theme: "rose",
          imageKey: "chapter-5",
          imageAlt: "Teman kagum melihat apel di pasar buah",
          chapter: 3,
          title: "ㅐ ㅔ ㅘ ㅝ ㅚ ㅟ ㅢ",
          subtitle: "Vokal gabungan",
          question: "와!",
          answer: "우와!",
          cards: [
            {
              label: "Sudah kamu kenal",
              title: "ㅐ ㅔ",
              description: "e di bebek, dua ejaan",
            },
            {
              label: "Bunyi w",
              title: "ㅘ ㅝ ㅙ ㅞ",
              description: "ㅗ atau ㅜ + vokal lain",
            },
            {
              label: "Tambah ㅣ",
              title: "ㅚ ㅟ ㅢ",
              description: "Tiga vokal terakhir",
            },
          ],
          goals: [
            "Membaca semua vokal Hangeul.",
            "Tahu vokal mana yang bunyinya sama.",
          ],
        }),
        rules({
          title: "Vokal tegak + ㅣ",
          intro: "Tambahkan ㅣ di kanan vokal tegak, jadilah bunyi e.",
          columns: ["Gabungan", "Jadi", "Dibaca"],
          rows: [
            { when: "ㅏ + ㅣ", result: "ㅐ", example: '애 "e"' },
            { when: "ㅓ + ㅣ", result: "ㅔ", example: '에 "e"' },
            { when: "ㅑ + ㅣ", result: "ㅒ", example: '얘 "ye"' },
            { when: "ㅕ + ㅣ", result: "ㅖ", example: '예 "ye"' },
          ],
          tip: {
            title: "Dua ejaan, satu bunyi",
            text: "ㅐ dan ㅔ sekarang dibaca sama. Hafalkan ejaannya per kata.",
          },
        }),
        letters(
          "Huruf baru",
          [
            {
              character: "ㅐ",
              cue: 'Sama dengan "e" di "bebek".',
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
              cue: 'Sama dengan ㅐ: "e" di "bebek".',
              romanization: "e",
              say: "에",
            },
            {
              character: "ㅒ",
              cue: '"y" lalu e.',
              romanization: "yae",
              say: "얘",
              note: "Jarang dipakai.",
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
        contrast(
          "Bunyi sama, ejaan beda",
          "Putar tiap pasangan. Keduanya terdengar sama.",
          [
            {
              items: [
                { text: "애", romanization: "ae" },
                { text: "에", romanization: "e" },
              ],
            },
            {
              items: [
                { text: "얘", romanization: "yae" },
                { text: "예", romanization: "ye" },
              ],
            },
          ],
          ROMANIZATION,
        ),
      ],
    },
    {
      type: "material",
      key: "m5-wa-wo-wae-we",
      title: "ㅘ ㅝ ㅙ ㅞ: bunyi w",
      description: "ㅗ atau ㅜ yang disambung vokal lain jadi bunyi w.",
      minutes: 5,
      blocks: [
        rules({
          title: "Dua vokal jadi satu",
          intro:
            'Ucapkan ㅗ atau ㅜ dengan cepat, lalu langsung ke vokal berikutnya. Bibir yang bulat membuka, jadi terdengar "w".',
          columns: ["Gabungan", "Jadi", "Dibaca"],
          rows: [
            { when: "ㅗ + ㅏ", result: "ㅘ", example: '와 "wa"' },
            { when: "ㅜ + ㅓ", result: "ㅝ", example: "워 w + ㅓ" },
            { when: "ㅗ + ㅐ", result: "ㅙ", example: '왜 "we"' },
            { when: "ㅜ + ㅔ", result: "ㅞ", example: '웨 "we"' },
          ],
          tip: {
            title: "Pasangannya tetap",
            text: "ㅗ hanya bergabung dengan ㅏ dan ㅐ. ㅜ hanya dengan ㅓ dan ㅔ.",
          },
        }),
        letters(
          "Huruf baru",
          [
            {
              character: "ㅘ",
              cue: 'Seperti "wa" di "wajah".',
              romanization: "wa",
              say: "와",
              example: { word: "우와", meaning: "wah!", romanization: "uwa" },
            },
            {
              character: "ㅝ",
              cue: "Bibir bulat dulu, lalu buka ke ㅓ yang santai.",
              romanization: "wo",
              say: "워",
              note: 'Bukan "wo" dengan o bulat: ujungnya ㅓ.',
            },
            {
              character: "ㅙ",
              cue: '"w" lalu "e" di "bebek".',
              romanization: "wae",
              say: "왜",
              example: { word: "왜", meaning: "kenapa", romanization: "wae" },
            },
            {
              character: "ㅞ",
              cue: "Bunyinya sama dengan ㅙ.",
              romanization: "we",
              say: "웨",
              note: "Jarang, banyak muncul di kata serapan.",
            },
          ],
          ROMANIZATION,
        ),
        contrast(
          "ㅘ atau ㅝ?",
          "Putar, lalu dengarkan ujungnya.",
          [
            {
              items: [
                { text: "와", romanization: "wa" },
                { text: "워", romanization: "wo" },
              ],
              note: "ㅘ berakhir ㅏ yang terbuka lebar, ㅝ berakhir ㅓ.",
            },
          ],
          ROMANIZATION,
        ),
      ],
    },
    {
      type: "material",
      key: "m5-oe-wi-ui",
      title: "ㅚ ㅟ ㅢ: tambah ㅣ",
      description: "Tiga vokal terakhir, lalu semua vokal gabungan.",
      minutes: 6,
      blocks: [
        rules({
          title: "Vokal mendatar + ㅣ",
          columns: ["Gabungan", "Jadi", "Dibaca"],
          rows: [
            { when: "ㅗ + ㅣ", result: "ㅚ", example: '외 "we"' },
            { when: "ㅜ + ㅣ", result: "ㅟ", example: '위 "wi"' },
            { when: "ㅡ + ㅣ", result: "ㅢ", example: "의 ㅡ cepat ke ㅣ" },
          ],
        }),
        letters(
          "Huruf baru",
          [
            {
              character: "ㅚ",
              cue: '"we", sama dengan ㅙ.',
              romanization: "oe",
              say: "외",
              note: "Bentuknya ㅗ + ㅣ, tapi dibaca we.",
              example: {
                word: "외워요",
                meaning: "menghafal",
                romanization: "oewoyo",
              },
            },
            {
              character: "ㅟ",
              cue: 'Seperti "wi" di "wisata".',
              romanization: "wi",
              say: "위",
              example: { word: "위", meaning: "atas", romanization: "wi" },
            },
            {
              character: "ㅢ",
              cue: "ㅡ dengan bibir datar, cepat meluncur ke ㅣ.",
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
          "ㅙ ㅚ ㅞ: bunyinya sama",
          "Putar ketiganya. Ketiganya dibaca we, jadi hafalkan ejaan katanya.",
          [
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
        syllableGrid("Semua vokal gabungan", ["ㅇ"], COMPOUND, ROMANIZATION),
        game(
          "syllable-forge",
          "compound-vowels",
          "Susun vokal gabungan",
          "Ketik dua vokal berurutan, nanti keduanya bergabung jadi satu.",
        ),
      ],
    },
    {
      type: "material",
      key: "m5-sound-map",
      title: "Peta vokal: dari a i u e o ke Hangeul",
      description:
        "Vokal Indonesia yang sudah kamu punya, dan dua bunyi Korea yang benar-benar baru.",
      minutes: 5,
      blocks: [
        callout(
          "info",
          'Bahasa Indonesia punya 5 huruf vokal, tapi huruf e dibaca dua cara: e di "bebek" dan e di "emas". Sekarang kamu kenal ',
          b("21 vokal Korea"),
          ". Ini cara menghubungkannya.",
        ),
        rules({
          title: "Vokal Indonesia di Hangeul",
          columns: ["Bahasa Indonesia", "Hangeul", "Contoh"],
          theme: "green",
          rows: [
            { when: 'a di "apa"', result: "ㅏ", example: "아이 anak" },
            { when: 'i di "ini"', result: "ㅣ", example: "이 dua" },
            { when: 'u di "batu"', result: "ㅜ", example: "우유 susu" },
            { when: 'o di "obat"', result: "ㅗ", example: "오이 timun" },
            { when: 'e di "bebek"', result: "ㅐ / ㅔ", example: "애, 에" },
            {
              when: 'e di "emas"',
              result: "mirip ㅡ",
              example: "으, bibir datar",
            },
            {
              when: "tidak ada",
              result: "ㅓ",
              example: "어, o tanpa bibir bulat",
            },
          ],
          tip: {
            title: "Yang baru cuma dua",
            text: "ㅓ dan ㅡ. Vokal lainnya bunyi yang sudah kamu kenal, ditambah y (ㅑ ㅕ ㅛ ㅠ ㅒ ㅖ) atau w (ㅘ ㅝ ㅙ ㅞ ㅚ ㅟ).",
          },
        }),
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
                { text: "애", romanization: "ae" },
                { text: "에", romanization: "e" },
              ],
              note: 'Sama-sama "e" di "bebek". Bedanya cuma ejaan.',
            },
          ],
          ROMANIZATION,
        ),
        game(
          "stroke-master",
          "compound-vowels",
          "Kenali semua vokal",
          "Cocokkan bentuk dan bunyi vokal gabungan, dengan beberapa vokal dasar sebagai ulangan.",
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
      title: "Kuis bab 3: vokal gabungan",
      description:
        "12 soal tentang ㅐ ㅔ, vokal W, ㅚ ㅟ ㅢ, dan peta vokal Indonesia ke Hangeul.",
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
