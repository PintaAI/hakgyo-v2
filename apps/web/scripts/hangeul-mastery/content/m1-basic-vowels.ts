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

// Chapter 1: what Hangeul Mastery covers, then the vertical vowels. Syllable
// blocks are only introduced here (ㅇ in front is silent); chapter 4 teaches
// them. The module key predates the vowels-first order and stays for progress.
export const m1BasicVowels: ModuleContent = {
  key: "m1-basic-vowels",
  title: "Vokal tegak",
  description:
    "Kenalan dengan Hangeul Mastery, lalu vokal yang garisnya tegak: ㅏ ㅓ ㅣ ㅑ ㅕ.",
  items: [
    // Was the only lesson of the module "Mulai di sini" (m0-welcome); its key
    // stays so learners keep their progress on it.
    {
      type: "material",
      key: "m0-why-hangeul",
      title: "Kenalan dengan Hangeul Mastery",
      description:
        "Apa yang kamu pelajari dari awal sampai akhir, dan apa yang kamu dapat setelah selesai.",
      minutes: 3,
      blocks: [
        lessonPage({
          theme: "rose",
          imageKey: "chapter-1",
          imageAlt: "Murid berlatih bentuk mulut di depan cermin kecil",
          chapter: 1,
          title: "한글",
          subtitle: "Dari nol sampai bisa membaca Hangeul",
          question: "",
          answer: "",
          cards: [
            {
              label: "Yang dipelajari",
              title: "Vokal → blok → konsonan",
              description: "Lalu batchim dan ujian akhir",
            },
            {
              label: "Setelah selesai",
              title: "Baca dan tulis sendiri",
              description: "Tanpa bantuan huruf Latin",
            },
            {
              label: "Hadiahnya",
              title: "Lencana + kelas lanjutan",
              description: "Lanjut ke kelas Pola Bahasa",
            },
          ],
          goals: [
            "Membaca kata Korea apa saja, langsung dari Hangeul.",
            "Menulis dan mengetik Hangeul sendiri.",
          ],
        }),
        callout(
          "info",
          b("Hangeul adalah huruf Korea."),
          " Di kursus ini kamu belajar membaca dan menulisnya dari nol, lewat 10 bab dengan materi singkat 3–8 menit.",
        ),
        rules({
          title: "Perjalananmu",
          columns: ["Bab", "Kamu belajar", "Hasilnya"],
          rows: [
            {
              when: "Bab 1–3",
              result: "21 vokal",
              example: "kamu bisa membaca semua vokal",
            },
            {
              when: "Bab 4",
              result: "Blok suku kata",
              example: "kamu tahu cara huruf disusun",
            },
            {
              when: "Bab 5–7",
              result: "19 konsonan",
              example: "kamu bisa membaca kata nyata dan mengetik",
            },
            {
              when: "Bab 8–9",
              result: "Batchim",
              example: "kamu bisa membaca kata apa saja",
            },
            {
              when: "Bab 10",
              result: "Ujian akhir",
              example: "kamu dapat lencana Hangeul Mastery",
            },
          ],
        }),
        rules({
          title: "Setelah selesai",
          intro:
            "Tujuannya bukan menghafal teori, tapi bisa membaca dan menulis sendiri.",
          theme: "green",
          columns: ["Kamu bisa", "Artinya", "Contohnya"],
          rows: [
            {
              when: "Membaca",
              result: "kata Korea apa saja",
              example: "menu, papan nama, lirik lagu, nama idol",
            },
            {
              when: "Menulis",
              result: "tulis tangan dan ketik",
              example: "keyboard Korea di ponsel",
            },
            {
              when: "Lanjut belajar",
              result: "kelas Pola Bahasa",
              example: "terbuka otomatis setelah lulus",
            },
          ],
          tip: {
            title: "Cara belajarnya",
            text: "Setiap bab: materi, lalu kosakata, lalu tugas. Bab berikutnya terbuka setelah tugasnya lulus.",
          },
        }),
      ],
    },
    {
      type: "material",
      key: "m1-vowel-eo-lab",
      title: "Vokal tegak: ㅏ ㅓ ㅣ ㅑ ㅕ",
      description:
        "Lima vokal yang garisnya tegak, cara membacanya, dan cara menulisnya dengan ㅇ.",
      minutes: 7,
      blocks: [
        callout(
          "info",
          "Vokal Korea tidak ditulis sendirian. Di depannya ada ",
          b("ㅇ yang tidak dibaca"),
          ': ㅇ + ㅏ = 아, dibaca "a". Cara kerjanya kamu pelajari lengkap di bab 4.',
        ),
        letters(
          "Vokal tegak",
          [
            {
              character: "ㅏ",
              cue: 'Seperti "a" di "apa".',
              romanization: "a",
              say: "아",
              example: { word: "아이", meaning: "anak", romanization: "ai" },
            },
            {
              character: "ㅓ",
              cue: 'Buka mulut seperti "o", tapi bibir tidak bulat.',
              romanization: "eo",
              say: "어",
              note: "Tidak ada di bahasa Indonesia.",
            },
            {
              character: "ㅣ",
              cue: 'Seperti "i" di "ini".',
              romanization: "i",
              say: "이",
              example: { word: "이", meaning: "dua", romanization: "i" },
            },
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
        rules({
          title: "Tambah satu garis = tambah y",
          intro: 'Garis pendek yang dobel memberi bunyi "y" di depan vokal.',
          columns: ["Vokal", "Tambah garis", "Dibaca"],
          rows: [
            { when: "ㅏ", result: "ㅑ", example: '아 → 야 "ya"' },
            { when: "ㅓ", result: "ㅕ", example: '어 → 여 "y" + ㅓ' },
          ],
        }),
        contrast(
          "ㅏ atau ㅓ?",
          "Putar tiap pasangan, lalu tirukan.",
          [
            {
              items: [
                { text: "아", romanization: "a" },
                { text: "어", romanization: "eo" },
              ],
              note: "ㅏ mulut terbuka lebar. ㅓ bibir santai, tidak bulat.",
            },
            {
              items: [
                { text: "야", romanization: "ya" },
                { text: "여", romanization: "yeo" },
              ],
              note: "Sama, dengan bunyi y di depannya.",
            },
          ],
          { showRomanization: true },
        ),
        syllableGrid("Lima vokal tegak dengan ㅇ", ["ㅇ"], VERTICAL, {
          showRomanization: true,
        }),
        game(
          "stroke-master",
          "vertical-vowels",
          "Kenali vokal tegak",
          "Cocokkan bentuk vokal dengan bunyinya.",
        ),
        game(
          "syllable-forge",
          "vertical-vowels",
          "Coba susun 한글",
          "Ketik ㅇ lalu vokalnya, dan lihat blok terbentuk. Lengkapnya di bab 4.",
        ),
      ],
    },
    {
      type: "vocabulary",
      key: "m1-vocab-a",
      title: "Kosakata A: kata pertama",
      description:
        "Kata yang bisa kamu baca hanya dengan vokal tegak. Jumlahnya sedikit, nanti bertambah di setiap bab.",
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
      description: "10 soal tentang vokal ㅏ ㅓ ㅣ ㅑ ㅕ dan kata pertamamu.",
      instructions:
        "Untuk soal mendengar, putar audionya sebanyak yang kamu perlukan. Nilai lulus 80%.",
      passingScore: 80,
      shuffleOptions: true,
      questions: [
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
          "hear-ya",
          hear("야", "Dengarkan, lalu pilih suku kata yang kamu dengar."),
          ["여", "이", "아", "야"],
          3,
          'Yang kamu dengar adalah 야: seperti "ya" di "saya".',
        ),
        single(
          "new-sound",
          "Vokal mana yang bunyinya tidak ada di bahasa Indonesia?",
          ["ㅏ", "ㅣ", "ㅑ", "ㅓ"],
          3,
          'ㅏ seperti "a", ㅣ seperti "i", dan ㅑ seperti "ya". ㅓ seperti "o", tapi bibir tidak bulat.',
        ),
        single(
          "y-of-a",
          "Huruf mana yang dibuat dari ㅏ dengan satu garis pendek tambahan?",
          ["ㅕ", "ㅑ", "ㅓ", "ㅣ"],
          1,
          'ㅏ + satu garis = ㅑ, dibaca "ya". ㅓ + satu garis = ㅕ.',
        ),
        single(
          "silent-ieung",
          "Bagaimana ㅇ di depan vokal dibaca, misalnya di 아?",
          ['Dibaca "ng"', "Tidak dibaca", 'Dibaca "o"', 'Dibaca "a"'],
          1,
          'ㅇ di depan vokal tidak dibaca, jadi 아 dibaca "a".',
        ),
        single(
          "build-eo",
          "Yang mana ㅇ + ㅓ?",
          ["아", "여", "어", "야"],
          2,
          "ㅓ garis pendeknya ke kiri, jadi ㅇ + ㅓ = 어. Di 아, garis pendeknya ke kanan.",
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
          "Yang kamu dengar adalah 아이 (anak): 아 lalu 이.",
        ),
      ],
    },
  ],
};
