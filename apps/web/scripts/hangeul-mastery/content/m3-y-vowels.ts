import {
  audioClip,
  b,
  callout,
  contrast,
  conversation,
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

const CORE = ["ㅇ", "ㄴ", "ㅁ", "ㅅ", "ㅂ", "ㄱ", "ㄷ", "ㅈ", "ㅎ", "ㄹ"];
const NO_ROMANIZATION = { showRomanization: false };

export const m3YVowels: ModuleContent = {
  key: "m3-y-vowels",
  title: "Vokal Y dan ㅐ ㅔ",
  description:
    "Vokal ㅑ ㅕ ㅛ ㅠ, ㅐ dan ㅔ yang bunyinya sama, dan sapaan sopan pertamamu. Mulai modul ini tanpa romanisasi.",
  items: [
    {
      type: "material",
      key: "m3-ya-yeo-yo-yu",
      title: "ㅑ ㅕ ㅛ ㅠ: tambah garis, tambah y",
      description: "Satu garis tambahan memberi vokal bunyi y di depannya.",
      minutes: 6,
      blocks: [
        lessonPage({
          theme: "sunset",
          imageKey: "chapter-3",
          imageAlt: "Pembeli memesan di konter kafe",
          chapter: 3,
          title: "ㅑ ㅕ ㅛ ㅠ ㅐ ㅔ",
          subtitle: "Vokal Y dan ㅐ ㅔ",
          question: "우유 주세요.",
          answer: "네, 여기요.",
          cards: [
            {
              label: "Huruf baru",
              title: "Vokal Y, ㅐ, ㅔ",
              description: "Tambah satu garis, tambah y",
            },
            {
              label: "Ungkapan",
              title: "주세요 · 여기요",
              description: "Kalimat sopan pertamamu",
            },
            {
              label: "Latihan",
              title: "Dialog di kafe",
              description: "Permainan dan kuis bab",
            },
          ],
          goals: [
            "Membaca vokal Y dan membedakan ㅕ dari ㅛ.",
            "Memesan dengan sopan di kafe.",
          ],
        }),
        callout(
          "info",
          "Empat vokal baru ini dibuat dari vokal dasar yang sudah kamu kenal. Mulai modul ini ",
          b("tanpa romanisasi"),
          ": baca Hangeulnya, lalu cek dengan audio.",
        ),
        rules({
          title: "Tambah satu garis = tambah y",
          intro:
            'Kalau garis pendek vokal dasar ditulis dobel, vokal itu dapat bunyi "y" di depannya.',
          columns: ["Vokal dasar", "Jadi", "Dibaca"],
          rows: [
            { when: "ㅏ + satu garis", result: "ㅑ", example: "아 → 야" },
            { when: "ㅓ + satu garis", result: "ㅕ", example: "어 → 여" },
            { when: "ㅗ + satu garis", result: "ㅛ", example: "오 → 요" },
            { when: "ㅜ + satu garis", result: "ㅠ", example: "우 → 유" },
          ],
          tip: {
            title: "Posisinya tetap",
            text: "ㅑ ㅕ ditulis di kanan konsonan, ㅛ ㅠ di bawah, sama seperti vokal dasarnya.",
          },
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
                word: "야구",
                meaning: "bisbol",
                romanization: "yagu",
              },
            },
            {
              character: "ㅕ",
              cue: '"y" lalu ㅓ, bibir tetap santai.',
              romanization: "yeo",
              say: "여",
              note: "Kalau bibirmu membulat, bunyinya jadi ㅛ.",
              example: {
                word: "여기",
                meaning: "di sini",
                romanization: "yeogi",
              },
            },
            {
              character: "ㅛ",
              cue: 'Seperti "yo" di "yoyo". Bibir bulat.',
              romanization: "yo",
              say: "요",
              example: {
                word: "요리",
                meaning: "masakan; memasak",
                romanization: "yori",
              },
            },
            {
              character: "ㅠ",
              cue: 'Seperti "yu" di "ayu". Bibir bulat dan maju.',
              romanization: "yu",
              say: "유",
              example: { word: "우유", meaning: "susu", romanization: "uyu" },
            },
          ],
          NO_ROMANIZATION,
        ),
        contrast(
          "ㅕ atau ㅛ?",
          "Putar tiap baris. ㅕ bibir santai, ㅛ bibir bulat.",
          [
            {
              items: [{ text: "어" }, { text: "여" }],
              note: 'Tambah "y" di depan ㅓ.',
            },
            {
              items: [{ text: "여" }, { text: "요" }],
              note: "ㅕ santai, ㅛ bulat.",
            },
            {
              items: [{ text: "겨" }, { text: "교" }],
              note: "Sama, dengan ㄱ di depannya.",
            },
            {
              items: [{ text: "유" }, { text: "요" }],
              note: "ㅠ lebih maju dan tertutup dari ㅛ.",
            },
          ],
          NO_ROMANIZATION,
        ),
        syllableGrid(
          "Sekarang kamu bisa baca",
          CORE,
          ["ㅑ", "ㅕ", "ㅛ", "ㅠ"],
          NO_ROMANIZATION,
        ),
        game(
          "stroke-master",
          "y-vowels",
          "Kenali vokal Y",
          "Cocokkan bentuk dan bunyi vokal baru. ㅐ ㅔ ㅒ ㅖ juga muncul, kamu belajar di pelajaran berikutnya.",
        ),
        callout(
          "success",
          b("Ingat: "),
          "ㅕ itu y + ㅓ dengan bibir santai. Kalau bibirmu bulat, 여 jadi 요.",
        ),
      ],
    },
    {
      type: "material",
      key: "m3-ae-e",
      title: "ㅐ ㅔ ㅒ ㅖ: dua ejaan, satu bunyi",
      description: "ㅐ dan ㅔ bunyinya sama, jadi kamu hafalkan ejaannya.",
      minutes: 6,
      blocks: [
        letters(
          "Huruf baru",
          [
            {
              character: "ㅐ",
              cue: 'Seperti "e" di "sate" atau "bebek".',
              romanization: "ae",
              say: "애",
              note: "Bentuknya ㅏ + ㅣ.",
              example: { word: "개", meaning: "anjing", romanization: "gae" },
            },
            {
              character: "ㅔ",
              cue: 'Sama dengan ㅐ: "e" di "sate".',
              romanization: "e",
              say: "에",
              note: "Bentuknya ㅓ + ㅣ.",
              example: { word: "게", meaning: "kepiting", romanization: "ge" },
            },
            {
              character: "ㅒ",
              cue: '"y" lalu ㅐ.',
              romanization: "yae",
              say: "얘",
              note: "Jarang dipakai.",
              example: {
                word: "얘기",
                meaning: "cerita; obrolan",
                romanization: "yaegi",
              },
            },
            {
              character: "ㅖ",
              cue: '"y" lalu ㅔ.',
              romanization: "ye",
              say: "예",
              note: "Setelah konsonan biasanya dibaca ㅔ saja: 시계 terdengar 시게.",
              example: { word: "시계", meaning: "jam", romanization: "sigye" },
            },
          ],
          NO_ROMANIZATION,
        ),
        rules({
          title: "Dua ejaan, satu bunyi",
          intro:
            "Bunyinya sama, jadi hafalkan ejaannya per kata, bukan bunyinya.",
          columns: ["Ejaan", "Bunyi", "Contoh"],
          rows: [
            {
              when: "ㅐ (ㅏ + ㅣ)",
              result: "e",
              example: "개 anjing, 노래 lagu",
            },
            {
              when: "ㅔ (ㅓ + ㅣ)",
              result: "e",
              example: "게 kepiting, 가게 toko",
            },
            { when: "ㅒ dan ㅖ", result: "ye", example: "얘기 cerita, 예 ya" },
          ],
          tip: {
            title: "Konteks yang menentukan",
            text: "개 menggonggong, 게 punya capit. Saat bicara, orang tahu maksudmu dari kalimatnya.",
          },
        }),
        contrast(
          "Bunyi sama, ejaan beda",
          "Putar tiap pasangan. Keduanya terdengar sama, yang beda ejaan dan artinya.",
          [
            {
              items: [
                { text: "개", meaning: "anjing" },
                { text: "게", meaning: "kepiting" },
              ],
            },
            {
              items: [
                { text: "내", meaning: "milikku" },
                { text: "네", meaning: "ya" },
              ],
            },
            {
              items: [
                { text: "새", meaning: "burung; baru" },
                { text: "세", meaning: "tiga" },
              ],
            },
          ],
          NO_ROMANIZATION,
        ),
        syllableGrid(
          "Sekarang kamu bisa baca",
          CORE,
          ["ㅐ", "ㅔ"],
          NO_ROMANIZATION,
        ),
        game(
          "syllable-forge",
          "y-vowels",
          "Susun suku kata dengan vokal baru",
          "Susun suku kata dengan ㅑ ㅕ ㅛ ㅠ dan ㅐ ㅔ ㅒ ㅖ. Perhatikan: di kanan atau di bawah?",
        ),
        callout(
          "success",
          b("Ingat: "),
          "ㅐ dan ㅔ bunyinya sama, jadi hafalkan ejaannya per kata.",
        ),
      ],
    },
    {
      type: "material",
      key: "m3-reading-phrases",
      title: "Sapaan dan kalimat pertamamu",
      description: "Ungkapan sopan untuk di toko, di kafe, dan di telepon.",
      minutes: 7,
      blocks: [
        callout(
          "info",
          "Tidak ada huruf baru. Kamu pakai semua huruf yang sudah kamu kenal untuk membaca ungkapan sopan.",
        ),
        rules({
          title: "Ungkapan sopan berakhiran 요",
          intro:
            "Banyak ungkapan sopan diakhiri 요 atau 세요. Pakai ke orang yang baru kamu kenal, atasan, dan pelanggan.",
          columns: ["Saat", "Ucapkan", "Artinya"],
          rows: [
            { when: "Menjawab ya", result: "네", example: "ya" },
            { when: "Menjawab tidak", result: "아니요", example: "tidak" },
            {
              when: "Minta barang",
              result: "주세요",
              example: "우유 주세요 = minta susu",
            },
            {
              when: "Memanggil pelayan",
              result: "여기요",
              example: "permisi!",
            },
            { when: "Angkat telepon", result: "여보세요", example: "halo" },
            {
              when: "Penjual menyambut",
              result: "어서 오세요",
              example: "selamat datang",
            },
          ],
          tip: {
            title: "아니요 atau 아니에요?",
            text: '아니요 = "tidak". 아니에요 = "bukan", juga dipakai untuk membalas terima kasih.',
          },
        }),
        conversation({
          imageKey: "dialogue-cafe",
          imageAlt: "Pelayan kafe menyapa pembeli yang menunjuk kue",
          eyebrow: "Dialog · di kafe",
          number: "03",
          lines: [
            {
              speaker: "Pelayan",
              korean: "어서 오세요!",
              translation: "Selamat datang!",
            },
            {
              speaker: "Rina",
              korean: "여기요, 메뉴 주세요.",
              translation: "Permisi, minta menunya.",
            },
            {
              speaker: "Pelayan",
              korean: "네, 여기요.",
              translation: "Ya, ini.",
            },
            {
              speaker: "Rina",
              korean: "이거 주세요.",
              translation: "Minta yang ini.",
            },
          ],
        }),
        p("Baca dialognya dulu, lalu putar tiap kalimat untuk cek."),
        audioClip("어서 오세요", "Pelayan: 어서 오세요. = Selamat datang."),
        audioClip(
          "여기요, 메뉴 주세요",
          "Kamu: 여기요, 메뉴 주세요. = Permisi, minta menunya.",
        ),
        audioClip("이거 주세요", "Kamu: 이거 주세요. = Minta yang ini."),
        game(
          "word-builder",
          "y-vowels",
          "Susun kata",
          "Susun kata seperti 우유, 노래, dan 가게 dari suku katanya.",
        ),
        callout(
          "success",
          b("Ingat: "),
          "belum tahu nama barangnya? Tunjuk saja, lalu ucapkan 이거 주세요.",
        ),
      ],
    },
    {
      type: "vocabulary",
      key: "m3-vocab-f",
      title: "Kosakata F: vokal Y, ㅐ, dan ㅔ",
      description:
        "Kata sehari-hari dan ungkapan sopan yang memakai ㅑ ㅕ ㅛ ㅠ ㅐ ㅔ ㅖ.",
      entries: [
        { term: "야구", definition: "bisbol", romanization: "yagu" },
        {
          term: "여기",
          definition: "di sini; tempat ini",
          romanization: "yeogi",
        },
        { term: "요리", definition: "masakan; memasak", romanization: "yori" },
        { term: "우유", definition: "susu", romanization: "uyu" },
        { term: "여자", definition: "perempuan", romanization: "yeoja" },
        { term: "교사", definition: "guru", romanization: "gyosa" },
        { term: "휴지", definition: "tisu", romanization: "hyuji" },
        {
          term: "휴가",
          definition: "cuti; liburan",
          romanization: "hyuga",
          examples: ["휴가 가요. = Saya pergi cuti."],
        },
        { term: "무료", definition: "gratis", romanization: "muryo" },
        { term: "개", definition: "anjing", romanization: "gae" },
        { term: "새", definition: "burung; baru", romanization: "sae" },
        { term: "가게", definition: "toko", romanization: "gage" },
        { term: "노래", definition: "lagu", romanization: "norae" },
        { term: "배우", definition: "aktor; aktris", romanization: "baeu" },
        { term: "어제", definition: "kemarin", romanization: "eoje" },
        { term: "메뉴", definition: "menu", romanization: "menyu" },
        {
          term: "시계",
          definition: "jam (arloji atau jam dinding)",
          romanization: "sigye",
          examples: ["시계 주세요. = Minta jamnya."],
        },
        { term: "세계", definition: "dunia", romanization: "segye" },
        { term: "네", definition: "ya", romanization: "ne" },
        { term: "아니요", definition: "tidak", romanization: "aniyo" },
        { term: "저", definition: "saya (sopan)", romanization: "jeo" },
        {
          term: "주세요",
          definition: "tolong berikan; minta",
          romanization: "juseyo",
          examples: ["우유 주세요. = Minta susu."],
        },
        {
          term: "여보세요",
          definition: "halo (di telepon)",
          romanization: "yeoboseyo",
        },
        {
          term: "어서 오세요",
          definition: "selamat datang (di toko atau restoran)",
          romanization: "eoseo oseyo",
        },
      ],
    },
    {
      type: "assessment",
      key: "m3-quiz",
      title: "Kuis modul 3: vokal Y dan ㅐ ㅔ",
      description:
        "16 soal tentang ㅑ ㅕ ㅛ ㅠ, ejaan ㅐ dan ㅔ, ungkapan sopan, dan ulangan modul 1 dan 2. Tanpa romanisasi.",
      instructions:
        "Untuk soal mendengar, putar audionya sebanyak yang kamu perlukan. Nilai lulus 80%.",
      passingScore: 80,
      shuffleOptions: true,
      questions: [
        single(
          "hear-ya",
          hear("야", "Dengarkan, lalu pilih vokal yang kamu dengar."),
          ["ㅕ", "ㅑ", "ㅛ", "ㅠ"],
          1,
          'Yang kamu dengar adalah 야: ㅏ dengan bunyi y di depannya, seperti "ya" di "saya".',
        ),
        single(
          "hear-yeogi",
          hear("여기"),
          ["요기", "야기", "여기", "유기"],
          2,
          "Yang kamu dengar adalah 여기 (di sini). ㅕ diucapkan dengan bibir santai, bukan bulat seperti ㅛ.",
        ),
        single(
          "y-of-o",
          "Huruf mana yang dibuat dari ㅗ dengan satu garis tambahan?",
          ["ㅛ", "ㅠ", "ㅕ", "ㅑ"],
          0,
          "ㅗ + satu garis = ㅛ (yo). ㅜ menjadi ㅠ, ㅓ menjadi ㅕ, dan ㅏ menjadi ㅑ.",
        ),
        single(
          "build-hyu",
          "Blok mana yang tersusun dari ㅎ + ㅠ?",
          ["후", "혀", "효", "휴"],
          3,
          "ㅎ + ㅠ = 휴, seperti di 휴지 (tisu) dan 휴가 (cuti). ㅠ adalah vokal datar, jadi ditulis di bawah.",
        ),
        single(
          "read-uyu",
          "Apa arti kata 우유?",
          ["Jus", "Susu", "Air", "Kopi"],
          1,
          "우유 berarti susu. Jus adalah 주스.",
        ),
        single(
          "read-gage",
          "Apa arti kata 가게?",
          ["Toko", "Anjing", "Kepiting", "Lagu"],
          0,
          "가게 berarti toko. Anjing adalah 개, kepiting 게, dan lagu 노래.",
        ),
        single(
          "read-norae",
          "Apa arti kata 노래?",
          ["Aktor", "Kemarin", "Jam", "Lagu"],
          3,
          "노래 berarti lagu. Aktor adalah 배우, kemarin 어제, dan jam 시계.",
        ),
        single(
          "ae-e",
          "Apa yang benar tentang ㅐ dan ㅔ dalam bahasa Korea sekarang?",
          [
            'ㅐ diucapkan "a" lalu "i"',
            'ㅔ diucapkan seperti e pepet di "emas"',
            "Kebanyakan penutur Seoul mengucapkannya sama; bedanya di ejaan",
            "ㅐ selalu diucapkan lebih panjang dari ㅔ",
          ],
          2,
          'Bagi kebanyakan penutur Seoul, ㅐ dan ㅔ terdengar sama, seperti "e" di "sate". Karena itu kamu menghafal ejaan setiap kata.',
        ),
        single(
          "spell-dog",
          'Kata mana yang berarti "anjing"?',
          ["게", "개", "거", "계"],
          1,
          "Anjing ditulis 개 (dengan ㅐ). 게 (dengan ㅔ) berarti kepiting. Bunyinya sama, ejaannya berbeda.",
        ),
        single(
          "juseyo",
          "Ungkapan mana yang dipakai untuk meminta barang, misalnya di toko?",
          ["어서 오세요", "여보세요", "아니요", "주세요"],
          3,
          '주세요 berarti "tolong berikan" atau "minta": 우유 주세요, 이거 주세요.',
        ),
        single(
          "yeoboseyo",
          "Kamu mengangkat telepon. Apa yang kamu ucapkan?",
          ["여보세요", "어서 오세요", "주세요", "저도요"],
          0,
          '여보세요 adalah "halo" khusus untuk telepon. 어서 오세요 diucapkan penjual untuk menyambut pembeli.',
        ),
        single(
          "review-hear-gogi",
          hear("고기"),
          ["거기", "고기", "구기", "그기"],
          1,
          "Ulangan modul 2: yang kamu dengar adalah 고기 (daging), dengan ㅗ yang bulat. 거기 berarti di sana.",
        ),
        single(
          "review-read-nara",
          "Apa arti kata 나라?",
          ["Bebek", "Kepala", "Negara", "Laut"],
          2,
          "Ulangan modul 2: 나라 berarti negara. Bebek adalah 오리, kepala 머리, dan laut 바다.",
        ),
        single(
          "review-hear-uri",
          hear("우리"),
          ["오리", "으리", "어리", "우리"],
          3,
          "Ulangan modul 2: yang kamu dengar adalah 우리 (kami; kita), dengan ㅜ yang bulat dan maju.",
        ),
        single(
          "review-rieul",
          "Bagaimana ㄹ di 노래 diucapkan?",
          [
            "Satu tepukan lidah yang ringan, tanpa getaran",
            '"r" yang digetarkan panjang seperti di "rumah"',
            "Tidak dibaca",
            "Seperti ㄴ",
          ],
          0,
          "Ulangan modul 2: di antara vokal, ㄹ hanya satu tepukan ringan.",
        ),
        single(
          "review-flat-u",
          'Vokal mana yang diucapkan seperti "u" tetapi dengan bibir datar?',
          ["ㅜ", "ㅠ", "ㅡ", "ㅗ"],
          2,
          'Ulangan modul 1: ㅡ adalah "u" dengan bibir datar. ㅜ dan ㅠ diucapkan dengan bibir bulat.',
        ),
      ],
    },
  ],
};
