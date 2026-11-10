import { audioClip, b, callout, game, lessonPage, p, rules } from "../blocks";
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

// Chapter 4: syllable blocks, taught with ㅇ and the vowels only. Chapters 1-3
// introduce ㅇ in front of a vowel; the consonant chapters recall this one by
// putting a consonant where ㅇ was.
export const syllableBlocks: ModuleContent = {
  key: "syllable-blocks",
  title: "Blok suku kata",
  description:
    "Cara huruf disusun jadi blok: satu blok satu suku kata, tempat vokal di dalam blok, dan cara membacanya.",
  items: [
    {
      type: "material",
      key: "blocks-concept",
      title: "Satu blok, satu suku kata",
      description:
        "Kenapa vokal selalu ditulis dengan ㅇ, di mana vokal ditulis, dan cara membaca kata blok demi blok.",
      minutes: 7,
      blocks: [
        lessonPage({
          theme: "ocean",
          imageKey: "chapter-2",
          imageAlt: "Dua teman menyusun balok kayu bersama",
          chapter: 4,
          title: "아 · 오 · 와",
          subtitle: "Blok suku kata",
          question: "",
          answer: "",
          cards: [
            {
              label: "Konsep",
              title: "1 blok = 1 suku kata",
              description: "Dibaca blok demi blok",
            },
            {
              label: "Posisi",
              title: "Kanan atau bawah",
              description: "Ikuti arah garis vokal",
            },
            {
              label: "Kosakata",
              title: "아이유 · 왜요",
              description: "Kata dari blok vokal",
            },
          ],
          goals: [
            "Membaca kata blok demi blok.",
            "Menyusun blok dari ㅇ dan vokal apa saja.",
          ],
        }),
        callout(
          "info",
          "Sejak bab 1 kamu melihat vokal selalu ditulis dengan ㅇ di depannya, seperti 아. Sekarang kita bahas cara kerjanya, karena ",
          b("semua tulisan Korea disusun dengan cara ini"),
          ".",
        ),
        rules({
          title: "Satu blok = satu suku kata",
          intro:
            "Huruf Korea tidak ditulis berjajar, tapi disusun jadi blok. Setiap blok dibaca sebagai satu suku kata.",
          columns: ["Kata", "Bloknya", "Dibaca"],
          rows: [
            { when: "아이", result: "아 + 이", example: '"a-i", 2 suku kata' },
            {
              when: "아이유",
              result: "아 + 이 + 유",
              example: '"a-i-yu", 3 suku kata',
            },
            {
              when: "외워요",
              result: "외 + 워 + 요",
              example: '"we-wo-yo", 3 suku kata',
            },
          ],
          tip: {
            title: "Baca tiap blok sendiri",
            text: '아이 dibaca "a-i", bukan "ai" seperti di "pantai".',
          },
        }),
        rules({
          title: "Di mana vokalnya?",
          intro:
            "ㅇ selalu di kiri atau di atas. Vokal mengikuti arah garis panjangnya.",
          columns: ["Vokal", "Ditulis", "Contoh"],
          rows: [
            {
              when: "Tegak: ㅏ ㅓ ㅣ ㅑ ㅕ ㅐ ㅔ",
              result: "di kanan ㅇ",
              example: "아 어 이 애",
            },
            {
              when: "Mendatar: ㅗ ㅜ ㅡ ㅛ ㅠ",
              result: "di bawah ㅇ",
              example: "오 우 으 요",
            },
            {
              when: "Rangkap: ㅘ ㅝ ㅚ ㅟ ㅢ",
              result: "di bawah, lalu di kanan",
              example: "와 워 외 위 의",
            },
          ],
          tip: {
            title: "Urutan membaca",
            text: "Di dalam blok: kiri ke kanan, lalu atas ke bawah. Antarblok: kiri ke kanan.",
          },
        }),
        rules({
          title: "ㅇ di depan dan di bawah",
          columns: ["Posisi ㅇ", "Dibaca", "Contoh"],
          theme: "green",
          rows: [
            {
              when: "Di depan vokal",
              result: "tidak dibaca",
              example: '아 = "a"',
            },
            {
              when: "Di bawah blok",
              result: '"ng"',
              example: '앙 = "ang", di bab batchim',
            },
          ],
        }),
        game(
          "syllable-forge",
          "compound-vowels",
          "Susun blok",
          "Susun ㅇ dengan semua vokal: tegak di kanan, mendatar di bawah, rangkap di keduanya.",
        ),
        game(
          "word-builder",
          "compound-vowels",
          "Susun kata dari blok",
          "Susun 우유, 우와, dan 외워요 blok demi blok.",
        ),
        callout(
          "success",
          b("Untuk bab berikutnya: "),
          "ㅇ di depan tinggal diganti konsonan, misalnya 아 jadi 나 atau 마. Tempat vokalnya tetap sama.",
        ),
      ],
    },
    {
      type: "vocabulary",
      key: "blocks-vocab-d",
      title: "Kosakata D: baca blok demi blok",
      description: "Kata dari blok vokal, dua sampai tiga suku kata.",
      entries: [
        {
          term: "아이유",
          definition: "IU (penyanyi K-pop)",
          romanization: "aiyu",
        },
        { term: "왜요", definition: "kenapa? (sopan)", romanization: "waeyo" },
        { term: "오예", definition: "asyik! (santai)", romanization: "oye" },
        { term: "우아", definition: "anggun", romanization: "ua" },
        { term: "에이", definition: "huruf A", romanization: "ei" },
        { term: "와이", definition: "huruf Y", romanization: "wai" },
      ],
    },
    {
      type: "assessment",
      key: "blocks-quiz",
      title: "Kuis bab 4: blok suku kata",
      description:
        "10 soal tentang jumlah suku kata, tempat vokal di dalam blok, urutan membaca, dan ㅇ.",
      instructions:
        "Untuk soal mendengar, putar audionya sebanyak yang kamu perlukan. Nilai lulus 80%.",
      passingScore: 80,
      shuffleOptions: true,
      questions: [
        single(
          "count-ai",
          "Kata 아이 dibaca dengan berapa suku kata?",
          ["Satu", "Dua", "Tiga", "Empat"],
          1,
          'Satu blok = satu suku kata. 아이 punya dua blok, 아 dan 이, jadi dibaca "a-i".',
        ),
        single(
          "count-aiyu",
          "Kata 아이유 dibaca dengan berapa suku kata?",
          ["Dua", "Empat", "Tiga", "Satu"],
          2,
          'Ada tiga blok: 아, 이, dan 유. Jadi 아이유 dibaca tiga suku kata, "a-i-yu".',
        ),
        single(
          "count-oewoyo",
          "Kata 외워요 punya berapa blok?",
          ["Tiga", "Dua", "Lima", "Enam"],
          0,
          "외, 워, dan 요: tiga blok. Vokal rangkap seperti ㅚ dan ㅝ tetap satu blok.",
        ),
        single(
          "where-o",
          "Di blok 오, di mana ㅗ ditulis?",
          ["Di kanan ㅇ", "Di bawah ㅇ", "Di atas ㅇ", "Di kiri ㅇ"],
          1,
          "ㅗ garisnya mendatar, jadi ditulis di bawah ㅇ.",
        ),
        single(
          "right-vowel",
          "Di blok mana vokalnya ditulis di kanan ㅇ?",
          ["오", "우", "어", "으"],
          2,
          "ㅓ garisnya tegak, jadi ditulis di kanan ㅇ: 어. ㅗ, ㅜ, dan ㅡ garisnya mendatar, jadi ditulis di bawah.",
        ),
        single(
          "build-wa",
          "Yang mana ㅇ + ㅘ?",
          ["워", "외", "왜", "와"],
          3,
          "ㅘ adalah ㅗ + ㅏ. ㅗ ditulis di bawah ㅇ, lalu ㅏ di kanan: 와.",
        ),
        single(
          "reading-order",
          "Bagaimana huruf di dalam satu blok dibaca?",
          [
            "Kiri ke kanan, lalu atas ke bawah",
            "Kanan ke kiri",
            "Bawah ke atas",
            "Bebas, urutannya tidak penting",
          ],
          0,
          "Di dalam blok: kiri ke kanan, lalu atas ke bawah. Kata dibaca blok demi blok dari kiri.",
        ),
        single(
          "ieung-below",
          "ㅇ di bagian bawah blok, seperti di 앙, dibaca apa?",
          ['"ng"', "Tidak dibaca", '"o"', '"a"'],
          0,
          'ㅇ di bawah blok dibaca "ng", jadi 앙 dibaca "ang". Ini kamu pelajari lengkap di bab batchim.',
        ),
        single(
          "hear-aiyu",
          hear("아이유"),
          ["아이요", "아이유", "어이유", "아야유"],
          1,
          "Yang kamu dengar adalah 아이유 (IU): 아, 이, lalu 유.",
        ),
        single(
          "read-waeyo",
          "Apa arti 왜요?",
          ["Asyik!", "Kenapa? (sopan)", "Huruf Y", "Datang"],
          1,
          "왜요 berarti kenapa (sopan). 오예 berarti asyik, 와이 adalah huruf Y, dan 와요 berarti datang.",
        ),
      ],
    },
  ],
};
