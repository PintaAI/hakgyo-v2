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

const BASIC = ["ㅏ", "ㅓ", "ㅗ", "ㅜ", "ㅡ", "ㅣ", "ㅑ", "ㅕ", "ㅛ", "ㅠ"];

// Chapter 2: the horizontal vowels, written below ㅇ.
export const horizontalVowels: ModuleContent = {
  key: "horizontal-vowels",
  title: "Vokal mendatar",
  description:
    "Vokal yang ditulis di bawah: ㅗ ㅜ yang sudah kamu kenal, ㅡ yang baru, dan ㅛ ㅠ.",
  items: [
    // Taught ㅗ ㅜ ㅡ when chapter 1 held every basic vowel; the key stays.
    {
      type: "material",
      key: "m1-vowels-o-u-eu",
      title: "ㅗ ㅜ: o dan u, ditulis di bawah",
      description:
        "Dua vokal yang bunyinya sudah kamu kenal, dan kenapa ditulis di bawah ㅇ.",
      minutes: 5,
      blocks: [
        lessonPage({
          theme: "sunset",
          imageKey: "chapter-3",
          imageAlt: "Pembeli memesan di konter kafe",
          chapter: 2,
          title: "ㅗ ㅜ ㅡ ㅛ ㅠ",
          subtitle: "Vokal mendatar",
          question: "우유?",
          answer: "오, 우유!",
          cards: [
            {
              label: "Sudah kamu kenal",
              title: "ㅗ ㅜ",
              description: "o di obat, u di batu",
            },
            {
              label: "Bunyi baru",
              title: "ㅡ",
              description: "Mirip e di emas",
            },
            {
              label: "Tambah garis",
              title: "ㅛ ㅠ",
              description: "Bunyi y di depan vokal",
            },
          ],
          goals: [
            "Menulis vokal mendatar di bawah ㅇ.",
            "Membedakan ㅗ dari ㅓ, dan ㅡ dari ㅜ.",
          ],
        }),
        rules({
          title: "Tegak di kanan, mendatar di bawah",
          intro: "Garis panjang vokal menentukan tempatnya di dalam blok.",
          columns: ["Vokal", "Ditulis", "Contoh"],
          rows: [
            {
              when: "Tegak: ㅏ ㅓ ㅣ",
              result: "di kanan ㅇ",
              example: "아 어 이",
            },
            {
              when: "Mendatar: ㅗ ㅜ",
              result: "di bawah ㅇ",
              example: "오 우",
            },
          ],
        }),
        letters(
          "Huruf baru",
          [
            {
              character: "ㅗ",
              cue: 'Sama dengan "o" di "obat". Bibir bulat.',
              romanization: "o",
              say: "오",
              note: "Garis pendeknya ke atas.",
              example: { word: "오이", meaning: "timun", romanization: "oi" },
            },
            {
              character: "ㅜ",
              cue: 'Sama dengan "u" di "batu". Bibir bulat dan maju.',
              romanization: "u",
              say: "우",
              note: "Garis pendeknya ke bawah.",
            },
          ],
          { showRomanization: true },
        ),
        contrast(
          "ㅗ atau ㅓ?",
          "Pasangan yang paling sering tertukar. Putar, lalu tirukan sambil lihat bibirmu.",
          [
            {
              items: [
                { text: "오", romanization: "o" },
                { text: "어", romanization: "eo" },
              ],
              note: "ㅗ bibir bulat. ㅓ bibir santai.",
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
          { showRomanization: true },
        ),
      ],
    },
    {
      type: "material",
      key: "horizontal-eu",
      title: "ㅡ: bunyi baru kedua",
      description: 'Mirip "e" di "emas", dengan bibir datar.',
      minutes: 4,
      blocks: [
        letters(
          "Huruf baru",
          [
            {
              character: "ㅡ",
              cue: 'Mirip "e" di "emas". Bibir datar, seperti senyum tipis.',
              romanization: "eu",
              say: "으",
              note: "Satu garis datar, ditulis di bawah ㅇ.",
            },
          ],
          { showRomanization: true },
        ),
        contrast(
          "ㅡ atau ㅜ?",
          "Putar tiap pasangan. Lihat bibirmu di cermin saat menirukan.",
          [
            {
              items: [
                { text: "으", romanization: "eu" },
                { text: "우", romanization: "u" },
              ],
              note: "ㅡ bibir datar. ㅜ bibir bulat.",
            },
            {
              items: [
                { text: "으", romanization: "eu" },
                { text: "어", romanization: "eo" },
              ],
              note: "ㅡ mulut hampir tertutup. ㅓ lebih terbuka.",
            },
          ],
          { showRomanization: true },
        ),
        callout("success", b("Ingat: "), "ㅜ bibir bulat, ㅡ bibir datar."),
      ],
    },
    {
      type: "material",
      key: "horizontal-yo-yu",
      title: "ㅛ ㅠ: tambah garis lagi",
      description:
        "Pola yang sama dengan ㅑ ㅕ, lalu semua sepuluh vokal dasar.",
      minutes: 6,
      blocks: [
        rules({
          title: "Tambah satu garis = tambah y",
          intro: "Sama seperti ㅏ → ㅑ dan ㅓ → ㅕ di bab 1.",
          columns: ["Vokal", "Tambah garis", "Dibaca"],
          rows: [
            { when: "ㅗ", result: "ㅛ", example: '오 → 요 "yo"' },
            { when: "ㅜ", result: "ㅠ", example: '우 → 유 "yu"' },
          ],
        }),
        letters(
          "Huruf baru",
          [
            {
              character: "ㅛ",
              cue: 'Seperti "yo" di "yoyo". Bibir bulat.',
              romanization: "yo",
              say: "요",
              example: { word: "요요", meaning: "yoyo", romanization: "yoyo" },
            },
            {
              character: "ㅠ",
              cue: 'Seperti "yu" di "ayu". Bibir bulat dan maju.',
              romanization: "yu",
              say: "유",
              example: { word: "우유", meaning: "susu", romanization: "uyu" },
            },
          ],
          { showRomanization: true },
        ),
        syllableGrid("Sepuluh vokal dasar", ["ㅇ"], BASIC, {
          showRomanization: true,
        }),
        game(
          "syllable-forge",
          "horizontal-vowels",
          "Susun vokal mendatar",
          "Susun ㅇ dengan vokal baru. Tegak di kanan, mendatar di bawah.",
        ),
        game(
          "word-builder",
          "horizontal-vowels",
          "Susun kata pertamamu",
          "Susun 우유, 여우, dan 이유 dari suku katanya.",
        ),
      ],
    },
    {
      type: "vocabulary",
      key: "horizontal-vocab-b",
      title: "Kosakata B: kata dari vokal dasar",
      description:
        "Kata yang bisa kamu baca dengan ㅇ dan sepuluh vokal dasar.",
      entries: [
        { term: "오", definition: "lima", romanization: "o" },
        { term: "오이", definition: "timun", romanization: "oi" },
        { term: "우유", definition: "susu", romanization: "uyu" },
        { term: "여우", definition: "rubah", romanization: "yeou" },
        { term: "이유", definition: "alasan", romanization: "iyu" },
        { term: "여유", definition: "waktu luang", romanization: "yeoyu" },
        { term: "유아", definition: "balita", romanization: "yua" },
        { term: "요요", definition: "yoyo", romanization: "yoyo" },
      ],
    },
    {
      type: "assessment",
      key: "horizontal-quiz",
      title: "Kuis bab 2: vokal mendatar",
      description:
        "10 soal tentang ㅗ ㅜ ㅡ ㅛ ㅠ, posisi vokal di dalam blok, dan kata-kata baru.",
      instructions:
        "Untuk soal mendengar, putar audionya sebanyak yang kamu perlukan. Nilai lulus 80%.",
      passingScore: 80,
      shuffleOptions: true,
      questions: [
        single(
          "hear-o",
          hear("오", "Dengarkan, lalu pilih suku kata yang kamu dengar."),
          ["어", "우", "오", "으"],
          2,
          'Yang kamu dengar adalah 오: bibir bulat, seperti "o" di "obat".',
        ),
        single(
          "hear-eu",
          hear("으", "Dengarkan, lalu pilih suku kata yang kamu dengar."),
          ["우", "오", "이", "으"],
          3,
          'Yang kamu dengar adalah 으: mirip "e" di "emas", bibir datar.',
        ),
        single(
          "hear-u",
          hear("우", "Dengarkan, lalu pilih suku kata yang kamu dengar."),
          ["으", "우", "유", "어"],
          1,
          'Yang kamu dengar adalah 우: bibir bulat dan maju, seperti "u" di "batu".',
        ),
        single(
          "hear-yo",
          hear("요", "Dengarkan, lalu pilih suku kata yang kamu dengar."),
          ["여", "유", "오", "요"],
          3,
          "Yang kamu dengar adalah 요: y lalu ㅗ dengan bibir bulat. 여 bibirnya santai.",
        ),
        single(
          "below",
          "Vokal mana yang ditulis di bawah ㅇ?",
          ["ㅏ", "ㅓ", "ㅜ", "ㅕ"],
          2,
          "ㅜ garisnya mendatar, jadi ditulis di bawah ㅇ: 우. ㅏ, ㅓ, dan ㅕ garisnya tegak, jadi ditulis di kanan.",
        ),
        single(
          "flat-lips",
          'Vokal mana yang mirip "e" di "emas", dengan bibir datar?',
          ["ㅜ", "ㅗ", "ㅡ", "ㅓ"],
          2,
          "ㅡ: bibir datar seperti senyum tipis. ㅜ dan ㅗ diucapkan dengan bibir bulat.",
        ),
        single(
          "read-uyu",
          "Apa arti kata 우유?",
          ["Rubah", "Susu", "Timun", "Alasan"],
          1,
          "우유 berarti susu. Rubah adalah 여우, timun 오이, dan alasan 이유.",
        ),
        single(
          "hear-yeou",
          hear("여우"),
          ["여우", "요우", "여유", "어우"],
          0,
          "Yang kamu dengar adalah 여우 (rubah). 여유 berarti waktu luang: bedanya di suku kata kedua.",
        ),
        single(
          "hear-iyu",
          hear("이유"),
          ["이요", "이유", "아유", "이우"],
          1,
          "Yang kamu dengar adalah 이유 (alasan). Suku kata keduanya 유: y lalu ㅜ dengan bibir bulat.",
        ),
        single(
          "review-eo",
          'Ulangan bab 1. Vokal mana yang dibaca seperti "o", tapi dengan bibir santai?',
          ["ㅗ", "ㅓ", "ㅜ", "ㅏ"],
          1,
          'ㅓ: mulut terbuka seperti "o", bibir tidak bulat. ㅗ adalah "o" dengan bibir bulat.',
        ),
      ],
    },
  ],
};
