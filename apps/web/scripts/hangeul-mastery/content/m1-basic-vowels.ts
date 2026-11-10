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

const hear = (text: string, question: string) => [p(question), audioClip(text)];

const VERTICAL = ["ㅏ", "ㅓ", "ㅣ", "ㅑ", "ㅕ"];

// Chapter 1 of the vowels-first order: the vertical vowels, written to the
// right of ㅇ. The module key predates that order and stays for progress.
export const m1BasicVowels: ModuleContent = {
  key: "m1-basic-vowels",
  title: "Vokal tegak",
  description:
    "Cara kerja Hangeul, lalu vokal yang ditulis di kanan: ㅏ ㅣ yang sudah kamu kenal, ㅓ yang baru, dan ㅑ ㅕ.",
  items: [
    // Was the only lesson of the module "Mulai di sini" (m0-welcome); its key
    // stays so learners keep their progress on it.
    {
      type: "material",
      key: "m0-why-hangeul",
      title: "Perkenalan: ㅇ, ㅏ, ㅣ",
      description:
        "Cara huruf disusun jadi blok, dan dua vokal yang bunyinya sudah kamu kenal.",
      minutes: 5,
      blocks: [
        lessonPage({
          theme: "rose",
          imageKey: "chapter-1",
          imageAlt: "Murid berlatih bentuk mulut di depan cermin kecil",
          chapter: 1,
          title: "ㅏ ㅓ ㅣ ㅑ ㅕ",
          subtitle: "Vokal tegak",
          question: "",
          answer: "",
          cards: [
            {
              label: "Sudah kamu kenal",
              title: "ㅏ ㅣ",
              description: "Sama dengan a dan i",
            },
            {
              label: "Bunyi baru",
              title: "ㅓ",
              description: "Tidak ada di bahasa Indonesia",
            },
            {
              label: "Tambah garis",
              title: "ㅑ ㅕ",
              description: "Bunyi y di depan vokal",
            },
          ],
          goals: [
            "Membaca blok yang dimulai dengan ㅇ.",
            "Membedakan ㅓ dari ㅏ.",
          ],
        }),
        callout(
          "info",
          "Bahasa Indonesia punya 5 huruf vokal: a, i, u, e, o. Bahasa Korea punya 21, tapi ",
          b("banyak bunyinya sudah kamu kenal"),
          ", dan sisanya dibuat dari garis yang sama. Kita mulai dari vokal tegak.",
        ),
        rules({
          title: "Satu blok = satu suku kata",
          intro:
            "Huruf Korea disusun jadi blok. Suku kata yang mulai dengan vokal diberi ㅇ di depan, dan ㅇ di situ tidak dibaca.",
          columns: ["Susun", "Jadi", "Dibaca"],
          rows: [
            { when: "ㅇ + ㅏ", result: "아", example: '"a"' },
            { when: "ㅇ + ㅣ", result: "이", example: '"i"' },
            { when: "아 + 이", result: "아이", example: '"a-i" = anak' },
          ],
          tip: {
            title: "Vokal tegak di kanan",
            text: "Garis ㅏ dan ㅣ berdiri tegak, jadi keduanya ditulis di kanan ㅇ.",
          },
        }),
        letters(
          "Huruf baru",
          [
            {
              character: "ㅇ",
              cue: "Di depan blok tidak dibaca. Hanya pengisi tempat.",
              romanization: "-",
            },
            {
              character: "ㅏ",
              cue: 'Sama dengan "a" di "apa".',
              romanization: "a",
              say: "아",
              example: { word: "아이", meaning: "anak", romanization: "ai" },
            },
            {
              character: "ㅣ",
              cue: 'Sama dengan "i" di "ini".',
              romanization: "i",
              say: "이",
              example: { word: "이", meaning: "dua", romanization: "i" },
            },
          ],
          { showRomanization: true },
        ),
      ],
    },
    {
      type: "material",
      key: "m1-vowel-eo-lab",
      title: "ㅓ: bunyi baru pertama",
      description:
        'Vokal yang tidak ada di bahasa Indonesia: seperti "o", tapi bibir santai.',
      minutes: 5,
      blocks: [
        letters(
          "Huruf baru",
          [
            {
              character: "ㅓ",
              cue: 'Buka mulut seperti "o", tapi bibir tidak bulat.',
              romanization: "eo",
              say: "어",
              note: "Garis pendeknya ke kiri. Di ㅏ, garis pendeknya ke kanan.",
            },
          ],
          { showRomanization: true },
        ),
        contrast(
          "ㅏ atau ㅓ?",
          "Putar tiap pasangan, lalu tirukan.",
          [
            {
              items: [
                { text: "아", romanization: "a" },
                { text: "어", romanization: "eo" },
              ],
              note: "ㅏ mulut terbuka lebar. ㅓ sedikit lebih tertutup, bibir santai.",
            },
            {
              items: [
                { text: "아이", meaning: "anak", romanization: "ai" },
                {
                  text: "어이",
                  meaning: "hei! (kurang sopan)",
                  romanization: "eoi",
                },
              ],
              note: "Salah vokal, beda arti.",
            },
          ],
          { showRomanization: true },
        ),
        callout(
          "success",
          b("Ingat: "),
          'ㅓ itu "o" dengan bibir santai. Kalau bibirmu membulat, jadinya vokal lain yang kamu pelajari di bab 2.',
        ),
      ],
    },
    {
      type: "material",
      key: "m1-ya-yeo",
      title: "ㅑ ㅕ: tambah garis, tambah y",
      description:
        "Satu garis pendek lagi memberi bunyi y di depan vokal, lalu semua vokal tegak.",
      minutes: 5,
      blocks: [
        rules({
          title: "Tambah satu garis = tambah y",
          intro:
            'Kalau garis pendeknya dobel, vokal itu dapat bunyi "y" di depannya.',
          columns: ["Vokal", "Tambah garis", "Dibaca"],
          rows: [
            { when: "ㅏ", result: "ㅑ", example: '아 → 야 "ya"' },
            { when: "ㅓ", result: "ㅕ", example: '어 → 여 "y" + ㅓ' },
          ],
        }),
        letters(
          "Huruf baru",
          [
            {
              character: "ㅑ",
              cue: 'Seperti "ya" di "saya".',
              romanization: "ya",
              say: "야",
              example: {
                word: "야",
                meaning: "hei! (santai)",
                romanization: "ya",
              },
            },
            {
              character: "ㅕ",
              cue: '"y" lalu ㅓ, bibir tetap santai.',
              romanization: "yeo",
              say: "여",
            },
          ],
          { showRomanization: true },
        ),
        syllableGrid("Semua vokal tegak", ["ㅇ"], VERTICAL, {
          showRomanization: true,
        }),
        game(
          "syllable-forge",
          "vertical-vowels",
          "Susun vokal tegak",
          "Susun ㅇ dengan kelima vokal tegak. Semuanya ditulis di kanan ㅇ.",
        ),
      ],
    },
    {
      type: "vocabulary",
      key: "m1-vocab-a",
      title: "Kosakata A: kata pertama",
      description:
        "Kata yang bisa kamu baca hanya dengan ㅇ dan vokal tegak. Jumlahnya sedikit, nanti bertambah di setiap bab.",
      entries: [
        { term: "아이", definition: "anak", romanization: "ai" },
        { term: "이", definition: "dua", romanization: "i" },
        { term: "아야", definition: "aduh!", romanization: "aya" },
        { term: "야", definition: "hei! (santai)", romanization: "ya" },
      ],
    },
    {
      type: "assessment",
      key: "m1-quiz",
      title: "Kuis bab 1: vokal tegak",
      description:
        "10 soal tentang ㅇ yang diam, vokal ㅏ ㅓ ㅣ ㅑ ㅕ, dan kata pertamamu.",
      instructions:
        "Untuk soal mendengar, putar audionya sebanyak yang kamu perlukan. Nilai lulus 80%.",
      passingScore: 80,
      shuffleOptions: true,
      questions: [
        single(
          "silent-ieung",
          "Bagaimana huruf ㅇ dibaca di depan blok?",
          ['Dibaca "ng"', "Tidak dibaca", 'Dibaca "o"', 'Dibaca "a"'],
          1,
          'Di depan blok, ㅇ hanya pengisi tempat dan tidak dibaca. 아 dibaca "a".',
        ),
        single(
          "hear-a",
          hear("아", "Dengarkan, lalu pilih suku kata yang kamu dengar."),
          ["어", "아", "여", "야"],
          1,
          'Yang kamu dengar adalah 아: mulut terbuka lebar, seperti "a" di "apa".',
        ),
        single(
          "hear-eo",
          hear("어", "Dengarkan, lalu pilih suku kata yang kamu dengar."),
          ["아", "야", "어", "이"],
          2,
          'Yang kamu dengar adalah 어: seperti "o", tapi bibir santai dan tidak bulat.',
        ),
        single(
          "hear-yeo",
          hear("여", "Dengarkan, lalu pilih suku kata yang kamu dengar."),
          ["여", "야", "어", "아"],
          0,
          'Yang kamu dengar adalah 여: "y" lalu ㅓ dengan bibir santai.',
        ),
        single(
          "new-sound",
          "Vokal mana yang bunyinya tidak ada di bahasa Indonesia?",
          ["ㅏ", "ㅣ", "ㅑ", "ㅓ"],
          3,
          'ㅏ sama dengan "a", ㅣ sama dengan "i", dan ㅑ sama dengan "ya". ㅓ bunyi baru: seperti "o", tapi bibir tidak bulat.',
        ),
        single(
          "y-of-a",
          "Huruf mana yang dibuat dari ㅏ dengan satu garis pendek tambahan?",
          ["ㅕ", "ㅑ", "ㅓ", "ㅣ"],
          1,
          'ㅏ + satu garis = ㅑ, dibaca "ya". ㅓ + satu garis = ㅕ.',
        ),
        single(
          "build-eo",
          "Blok mana yang tersusun dari ㅇ + ㅓ?",
          ["아", "여", "어", "야"],
          2,
          "ㅓ garis pendeknya ke kiri, jadi ㅇ + ㅓ = 어. 아 garis pendeknya ke kanan.",
        ),
        single(
          "syllable-count",
          "Kata 아이 dibaca dengan berapa suku kata?",
          ["Satu", "Dua", "Tiga", "Empat"],
          1,
          'Satu blok = satu suku kata. 아이 punya dua blok, 아 dan 이, jadi dibaca "a-i", bukan "ai" seperti di "pantai".',
        ),
        single(
          "read-ai",
          "Apa arti kata 아이?",
          ["Dua", "Aduh!", "Anak", "Hei!"],
          2,
          "아이 berarti anak. 이 berarti dua, 아야 berarti aduh, dan 야 berarti hei.",
        ),
        single(
          "hear-ai",
          hear("아이", "Dengarkan, lalu pilih kata yang kamu dengar."),
          ["어이", "아이", "아야", "여이"],
          1,
          "Yang kamu dengar adalah 아이 (anak), dua suku kata yang jelas: 아 lalu 이.",
        ),
      ],
    },
  ],
};
