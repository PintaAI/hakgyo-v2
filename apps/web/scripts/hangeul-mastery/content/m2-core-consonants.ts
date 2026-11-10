import {
  assessmentRef,
  audioClip,
  b,
  callout,
  contrast,
  game,
  letters,
  p,
  rules,
  syllableGrid,
  vocabularyRef,
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

const VOWELS = ["ㅏ", "ㅓ", "ㅗ", "ㅜ", "ㅡ", "ㅣ"];
const CORE = ["ㅇ", "ㄴ", "ㅁ", "ㅅ", "ㅂ", "ㄱ", "ㄷ", "ㅈ", "ㅎ", "ㄹ"];

export const m2CoreConsonants: ModuleContent = {
  key: "m2-core-consonants",
  title: "Konsonan inti",
  description: "Sepuluh konsonan inti: ㄴ ㅁ, ㅅ ㅂ, ㄱ ㄷ ㅈ, dan ㅎ ㄹ.",
  items: [
    {
      type: "material",
      key: "m2-n-m",
      title: "ㄴ dan ㅁ",
      description:
        "Dua konsonan pertama, bunyinya sama seperti bahasa Indonesia.",
      minutes: 6,
      blocks: [
        callout(
          "info",
          "Sekarang ㅇ yang diam diganti konsonan yang berbunyi. ㄴ dan ㅁ ",
          b("bunyinya sama seperti bahasa Indonesia"),
          ".",
        ),
        letters(
          "Huruf baru",
          [
            {
              character: "ㄴ",
              cue: 'Seperti "n" di "nasi".',
              romanization: "n",
              say: "나",
              note: "Bentuknya seperti lidah yang menyentuh gusi atas.",
              example: {
                word: "나무",
                meaning: "pohon; kayu",
                romanization: "namu",
              },
            },
            {
              character: "ㅁ",
              cue: 'Seperti "m" di "mata".',
              romanization: "m",
              say: "마",
              note: "Bentuknya kotak, seperti mulut.",
              example: {
                word: "어머니",
                meaning: "ibu",
                romanization: "eomeoni",
              },
            },
          ],
          { showRomanization: true },
        ),
        rules({
          title: "Konsonan di kiri atau di atas",
          intro: "Konsonan menggantikan ㅇ. Posisi vokalnya tetap sama.",
          columns: ["Vokal", "Konsonan", "Contoh"],
          rows: [
            { when: "Tegak: ㅏ ㅓ ㅣ", result: "di kiri", example: "나 너 니" },
            { when: "Datar: ㅗ ㅜ ㅡ", result: "di atas", example: "노 누 느" },
          ],
        }),
        contrast(
          "Konsonannya mudah, awasi vokalnya",
          "Putar tiap pasangan, lalu tirukan.",
          [
            {
              items: [
                { text: "나", meaning: "aku", romanization: "na" },
                { text: "너", meaning: "kamu", romanization: "neo" },
              ],
              note: "ㅏ mulut terbuka lebar. ㅓ terbuka, bibir santai.",
            },
            {
              items: [
                { text: "너", romanization: "neo" },
                { text: "노", romanization: "no" },
              ],
              note: "ㅓ bibir santai. ㅗ bibir bulat.",
            },
            {
              items: [
                { text: "누", romanization: "nu" },
                { text: "느", romanization: "neu" },
              ],
              note: "ㅜ bibir bulat. ㅡ bibir datar.",
            },
            {
              items: [
                { text: "나무", meaning: "pohon", romanization: "namu" },
                { text: "너무", meaning: "terlalu", romanization: "neomu" },
              ],
              note: "Salah vokal, beda arti.",
            },
          ],
          { showRomanization: true },
        ),
        syllableGrid("Sekarang kamu bisa baca", ["ㄴ", "ㅁ"], VOWELS, {
          showRomanization: true,
        }),
        game(
          "stroke-master",
          "core-consonants",
          "Kenali konsonan inti",
          "Mulai dari ㄴ dan ㅁ. Huruf lain di permainan ini menyusul di pelajaran berikutnya.",
        ),
        callout(
          "success",
          b("Ingat: "),
          "나무 (pohon) dan 너무 (terlalu) hanya beda satu vokal.",
        ),
      ],
    },
    {
      type: "material",
      key: "m2-s-b",
      title: "ㅅ dan ㅂ",
      description:
        "Konsonan ㅅ dan ㅂ, dan kata serapan seperti 바나나 dan 버스.",
      minutes: 6,
      blocks: [
        callout(
          "info",
          'ㅅ hampir sama dengan "s". ㅂ itu ',
          b('"b" yang lembut'),
          ".",
        ),
        letters(
          "Huruf baru",
          [
            {
              character: "ㅅ",
              cue: 'Seperti "s" di "sapi".',
              romanization: "s",
              say: "사",
              note: 'Sebelum ㅣ bunyinya mirip "sy": 시 terdengar "syi".',
              example: { word: "버스", meaning: "bus", romanization: "beoseu" },
            },
            {
              character: "ㅂ",
              cue: 'Seperti "b" di "bola", tapi lebih lembut.',
              romanization: "b",
              say: "바",
              note: 'Di awal kata kadang terdengar seperti "p" yang ringan.',
              example: {
                word: "바나나",
                meaning: "pisang",
                romanization: "banana",
              },
            },
          ],
          { showRomanization: true },
        ),
        rules({
          title: "Kata asing dapat ㅡ di akhir",
          intro:
            'Bahasa Korea tidak menutup suku kata dengan bunyi "s". Jadi kata asing mendapat ㅡ supaya "s"-nya tetap terdengar.',
          columns: ["Kata asing", "Hangeul", "Dibaca"],
          rows: [
            { when: "bus", result: "버스", example: '"beo-seu"' },
            { when: "es (minuman)", result: "아이스", example: '"a-i-seu"' },
          ],
        }),
        contrast(
          "Bandingkan",
          "Putar tiap pasangan, lalu tirukan.",
          [
            {
              items: [
                { text: "사", romanization: "sa" },
                { text: "시", romanization: "si" },
              ],
              note: 'Sebelum ㅣ, ㅅ terdengar seperti "sy".',
            },
            {
              items: [
                { text: "수", romanization: "su" },
                { text: "스", romanization: "seu" },
              ],
              note: "ㅜ bibir bulat. ㅡ bibir datar, seperti di 버스.",
            },
            {
              items: [
                { text: "보", romanization: "bo" },
                { text: "버", romanization: "beo" },
              ],
              note: "ㅗ bibir bulat. ㅓ bibir santai.",
            },
          ],
          { showRomanization: true },
        ),
        syllableGrid(
          "Sekarang kamu bisa baca",
          ["ㄴ", "ㅁ", "ㅅ", "ㅂ"],
          VOWELS,
          { showRomanization: true },
        ),
        vocabularyRef("m2-vocab-nm-sb"),
        game(
          "syllable-forge",
          "core-consonants",
          "Susun suku kata",
          "Susun konsonan dan vokal jadi blok. Fokus dulu pada ㄴ, ㅁ, ㅅ, dan ㅂ.",
        ),
        callout(
          "success",
          b("Ingat: "),
          'ㅂ itu "b" yang lembut, dan 시 dibaca "syi".',
        ),
      ],
    },
    {
      type: "vocabulary",
      key: "m2-vocab-nm-sb",
      title: "Kosakata B dan C: ㄴ ㅁ ㅅ ㅂ",
      description:
        "Kata sehari-hari yang hanya memakai vokal dasar dan konsonan ㄴ, ㅁ, ㅅ, ㅂ.",
      entries: [
        { term: "나", definition: "aku (santai)", romanization: "na" },
        { term: "너", definition: "kamu (santai)", romanization: "neo" },
        { term: "나이", definition: "umur", romanization: "nai" },
        {
          term: "누나",
          definition: "kakak perempuan (dipakai adik laki-laki)",
          romanization: "nuna",
        },
        {
          term: "이모",
          definition: "tante (saudari ibu)",
          romanization: "imo",
        },
        { term: "어머니", definition: "ibu", romanization: "eomeoni" },
        { term: "너무", definition: "terlalu; sangat", romanization: "neomu" },
        { term: "나무", definition: "pohon; kayu", romanization: "namu" },
        {
          term: "아니",
          definition: "bukan; tidak (santai)",
          romanization: "ani",
        },
        {
          term: "아마",
          definition: "mungkin; barangkali",
          romanization: "ama",
        },
        { term: "이마", definition: "dahi", romanization: "ima" },
        { term: "무", definition: "lobak putih", romanization: "mu" },
        { term: "소", definition: "sapi", romanization: "so" },
        { term: "비", definition: "hujan", romanization: "bi" },
        { term: "바나나", definition: "pisang", romanization: "banana" },
        { term: "나비", definition: "kupu-kupu", romanization: "nabi" },
        { term: "비누", definition: "sabun", romanization: "binu" },
        { term: "버스", definition: "bus", romanization: "beoseu" },
        {
          term: "사이",
          definition: "hubungan; jarak; di antara",
          romanization: "sai",
        },
        {
          term: "부모",
          definition: "orang tua (ayah dan ibu)",
          romanization: "bumo",
        },
        { term: "미소", definition: "senyum", romanization: "miso" },
        {
          term: "바보",
          definition: "orang bodoh; dungu (santai, bisa terdengar kasar)",
          romanization: "babo",
        },
        { term: "이사", definition: "pindah rumah", romanization: "isa" },
      ],
    },
    {
      type: "material",
      key: "m2-g-d-j",
      title: "ㄱ, ㄷ, dan ㅈ",
      description: "Tiga konsonan lembut, dan beda 고기 dengan 거기.",
      minutes: 7,
      blocks: [
        callout(
          "info",
          "ㄱ, ㄷ, dan ㅈ bekerja seperti ㅂ: diucapkan ",
          b("lembut"),
          ", tanpa tekanan.",
        ),
        letters(
          "Huruf baru",
          [
            {
              character: "ㄱ",
              cue: 'Seperti "g" di "gula", tapi lembut.',
              romanization: "g",
              say: "가",
              note: "Bentuknya seperti pangkal lidah yang naik.",
              example: {
                word: "고기",
                meaning: "daging",
                romanization: "gogi",
              },
            },
            {
              character: "ㄷ",
              cue: 'Seperti "d" di "dua", tapi lembut.',
              romanization: "d",
              say: "다",
              note: "Seperti ㄴ dengan tutup di atasnya.",
              example: { word: "두부", meaning: "tahu", romanization: "dubu" },
            },
            {
              character: "ㅈ",
              cue: 'Seperti "j" di "jalan", tapi lebih ringan.',
              romanization: "j",
              say: "자",
              note: "Seperti ㅅ dengan garis di atasnya.",
              example: {
                word: "아버지",
                meaning: "ayah",
                romanization: "abeoji",
              },
            },
          ],
          { showRomanization: true },
        ),
        rules({
          title: "Lembut di awal, jelas di tengah",
          intro: "Berlaku untuk ㅂ, ㄱ, ㄷ, dan ㅈ.",
          columns: ["Posisi", "Terdengar", "Contoh"],
          rows: [
            {
              when: "Di awal kata",
              result: "p k t c ringan",
              example: "가다 (pergi)",
            },
            {
              when: "Di antara vokal",
              result: "b g d j",
              example: "아기 (bayi), 바다 (laut)",
            },
          ],
          tip: {
            title: "Kata kerja",
            text: "Di kamus, kata kerja selalu berakhir dengan 다: 가다 (pergi), 보다 (melihat), 자다 (tidur).",
          },
        }),
        contrast(
          "ㅓ atau ㅗ, ㅡ atau ㅜ?",
          "Putar tiap pasangan, lalu tirukan.",
          [
            {
              items: [
                { text: "고기", meaning: "daging", romanization: "gogi" },
                { text: "거기", meaning: "di sana", romanization: "geogi" },
              ],
              note: 'Salah vokal, "daging" jadi "di sana".',
            },
            {
              items: [
                { text: "구", romanization: "gu" },
                { text: "그", romanization: "geu" },
              ],
              note: "ㅜ bibir bulat. ㅡ bibir datar.",
            },
            {
              items: [
                { text: "조", romanization: "jo" },
                { text: "저", romanization: "jeo" },
              ],
              note: "ㅗ bibir bulat. ㅓ bibir santai.",
            },
          ],
          { showRomanization: true },
        ),
        syllableGrid("Sekarang kamu bisa baca", ["ㄱ", "ㄷ", "ㅈ"], VOWELS, {
          showRomanization: true,
        }),
        game(
          "word-builder",
          "core-consonants",
          "Susun kata",
          "Susun kata seperti 고기, 바다, dan 아버지 dari suku katanya.",
        ),
        callout(
          "success",
          b("Ingat: "),
          "고기 (ㅗ, bibir bulat) itu daging, 거기 (ㅓ, bibir santai) itu di sana.",
        ),
      ],
    },
    {
      type: "material",
      key: "m2-h-r",
      title: "ㅎ dan ㄹ",
      description: "Konsonan ㅎ dan ㄹ, lalu semua sepuluh konsonan inti.",
      minutes: 8,
      blocks: [
        callout(
          "info",
          "Dua konsonan terakhir di modul ini. Setelah ini kamu kenal ",
          b("sepuluh konsonan inti"),
          ".",
        ),
        letters(
          "Huruf baru",
          [
            {
              character: "ㅎ",
              cue: 'Seperti "h" di "hari".',
              romanization: "h",
              say: "하",
              note: "Seperti ㅇ bertopi, tapi ㅎ berbunyi.",
              example: { word: "하나", meaning: "satu", romanization: "hana" },
            },
            {
              character: "ㄹ",
              cue: 'Seperti "r" yang sangat ringan: lidah menepuk sekali di belakang gigi atas.',
              romanization: "r",
              say: "라",
              note: 'Tepuk ringan, jangan digetarkan seperti "r" di "rumah".',
              example: {
                word: "나라",
                meaning: "negara",
                romanization: "nara",
              },
            },
          ],
          { showRomanization: true },
        ),
        contrast(
          "Satu vokal, arti berbeda",
          "Satu tepukan saja di setiap ㄹ. Putar tiap pasangan, lalu tirukan.",
          [
            {
              items: [
                { text: "오리", meaning: "bebek", romanization: "ori" },
                { text: "우리", meaning: "kami; kita", romanization: "uri" },
              ],
              note: "ㅜ lebih maju dan lebih tertutup dari ㅗ.",
            },
            {
              items: [
                { text: "소리", meaning: "bunyi; suara", romanization: "sori" },
                { text: "서리", meaning: "embun beku", romanization: "seori" },
              ],
              note: "ㅗ bibir bulat. ㅓ bibir santai.",
            },
            {
              items: [
                {
                  text: "고리",
                  meaning: "cincin pengait",
                  romanization: "gori",
                },
                { text: "거리", meaning: "jalan", romanization: "geori" },
              ],
              note: "Lagi-lagi ㅗ dan ㅓ.",
            },
          ],
          { showRomanization: true },
        ),
        rules({
          title: "Sepuluh konsonan inti",
          intro: "Semua konsonan yang sudah kamu kenal, dalam empat kelompok.",
          theme: "green",
          columns: ["Huruf", "Bunyi", "Catatan"],
          rows: [
            {
              when: "ㄴ ㅁ ㅅ ㅎ",
              result: "n m s h",
              example: "sama seperti bahasa Indonesia",
            },
            {
              when: "ㅂ ㄱ ㄷ ㅈ",
              result: "b g d j lembut",
              example: "di awal kata mirip p k t c ringan",
            },
            {
              when: "ㄹ",
              result: "r ringan",
              example: "satu tepukan, tidak digetarkan",
            },
            { when: "ㅇ", result: "diam", example: "di depan blok" },
          ],
        }),
        syllableGrid("Sekarang kamu bisa baca", CORE, VOWELS, {
          showRomanization: true,
        }),
        audioClip(
          "우리나라",
          "우리나라: negara kita, sebutan orang Korea untuk Korea",
        ),
        vocabularyRef("m2-vocab-gdj-hr"),
        game(
          "stroke-master",
          "core-consonants",
          "Ulangi semua konsonan inti",
          "Sepuluh konsonan inti dan enam vokal dasar. Ulangi sampai kamu bisa menjawab tanpa ragu.",
        ),
        assessmentRef("m2-quiz"),
        callout(
          "success",
          b("Ingat: "),
          'ㄹ di antara vokal itu satu tepukan ringan, bukan "r" yang digetarkan.',
        ),
      ],
    },
    {
      type: "vocabulary",
      key: "m2-vocab-gdj-hr",
      title: "Kosakata D dan E: ㄱ ㄷ ㅈ ㅎ ㄹ",
      description:
        "Kata sehari-hari, kata K-pop dan drama, dan kata dasar EPS-TOPIK yang memakai semua konsonan inti.",
      entries: [
        { term: "고기", definition: "daging", romanization: "gogi" },
        {
          term: "거기",
          definition: "di sana; tempat itu",
          romanization: "geogi",
          examples: ["거기 누구? = Siapa di sana? (santai)"],
        },
        { term: "도시", definition: "kota", romanization: "dosi" },
        { term: "두부", definition: "tahu", romanization: "dubu" },
        { term: "가수", definition: "penyanyi", romanization: "gasu" },
        { term: "주스", definition: "jus", romanization: "juseu" },
        { term: "아기", definition: "bayi", romanization: "agi" },
        { term: "비자", definition: "visa", romanization: "bija" },
        { term: "아버지", definition: "ayah", romanization: "abeoji" },
        {
          term: "어디",
          definition: "di mana; ke mana",
          romanization: "eodi",
          examples: ["어디 가? = Mau ke mana? (santai)"],
        },
        { term: "누구", definition: "siapa", romanization: "nugu" },
        { term: "바다", definition: "laut", romanization: "bada" },
        { term: "가다", definition: "pergi", romanization: "gada" },
        { term: "오다", definition: "datang", romanization: "oda" },
        { term: "사다", definition: "membeli", romanization: "sada" },
        { term: "보다", definition: "melihat; menonton", romanization: "boda" },
        { term: "하나", definition: "satu", romanization: "hana" },
        { term: "우리", definition: "kami; kita", romanization: "uri" },
        { term: "나라", definition: "negara", romanization: "nara" },
        { term: "머리", definition: "kepala; rambut", romanization: "meori" },
        { term: "소리", definition: "bunyi; suara", romanization: "sori" },
        { term: "드라마", definition: "drama", romanization: "deurama" },
        { term: "라디오", definition: "radio", romanization: "radio" },
        { term: "그리고", definition: "dan; lalu", romanization: "geurigo" },
      ],
    },
    {
      type: "assessment",
      key: "m2-quiz",
      title: "Kuis modul 2: konsonan inti",
      description:
        "15 soal tentang sepuluh konsonan inti, kata-kata baru, dan ulangan vokal dari modul 1.",
      instructions:
        "Untuk soal mendengar, putar audionya sebanyak yang kamu perlukan. Nilai lulus 80%.",
      passingScore: 80,
      shuffleOptions: true,
      questions: [
        single(
          "hear-na",
          hear("나", "Dengarkan, lalu pilih suku kata yang kamu dengar."),
          ["너", "나", "노", "누"],
          1,
          "Yang kamu dengar adalah 나 (aku): ㄴ dengan ㅏ yang terbuka.",
        ),
        single(
          "build-na",
          "Blok mana yang tersusun dari ㄴ + ㅏ?",
          ["나", "너", "노", "니"],
          0,
          "ㄴ + ㅏ = 나. ㅏ adalah vokal tegak, jadi ditulis di kanan ㄴ.",
        ),
        single(
          "build-bu",
          "Blok mana yang tersusun dari ㅂ + ㅜ?",
          ["보", "브", "비", "부"],
          3,
          "ㅂ + ㅜ = 부. ㅜ adalah vokal datar, jadi ditulis di bawah ㅂ.",
        ),
        single(
          "read-banana",
          "Apa arti kata 바나나?",
          ["Kupu-kupu", "Sabun", "Pisang", "Bus"],
          2,
          "바나나 adalah kata serapan untuk pisang. Kupu-kupu adalah 나비, sabun 비누, dan bus 버스.",
        ),
        single(
          "read-bus",
          "Apa arti kata 버스?",
          ["Bus", "Sapi", "Hujan", "Orang tua"],
          0,
          '버스 adalah "bus". ㅡ di akhir ditambahkan supaya bunyi "s" tetap terdengar: bahasa Korea tidak mengakhiri suku kata dengan bunyi "s".',
        ),
        single(
          "read-gogi",
          "Apa arti kata 고기?",
          ["Di sana", "Daging", "Kota", "Tahu"],
          1,
          "고기 (ㅗ) berarti daging. 거기 (ㅓ) berarti di sana. Bedanya hanya satu vokal.",
        ),
        single(
          "hear-geogi",
          hear("거기"),
          ["고기", "구기", "거기", "그기"],
          2,
          "Yang kamu dengar adalah 거기 (di sana): suku kata pertama memakai ㅓ dengan bibir santai.",
        ),
        single(
          "hear-sori",
          hear("소리"),
          ["소리", "서리", "수리", "스리"],
          0,
          "Yang kamu dengar adalah 소리 (bunyi; suara): ㅗ dengan bibir bulat.",
        ),
        single(
          "rieul",
          "Bagaimana ㄹ diucapkan di antara dua vokal, misalnya di 나라?",
          [
            '"r" yang digetarkan seperti di "rumah"',
            'Selalu "l" seperti di "lima"',
            "Tidak dibaca",
            '"r" ringan dengan satu tepukan lidah',
          ],
          3,
          'Di antara vokal, ㄹ adalah satu tepukan ringan, tanpa getaran. Bunyi "l" muncul saat ㄹ ada di bagian bawah blok.',
        ),
        single(
          "si",
          "Bagaimana 시 biasanya terdengar?",
          [
            'Mirip "ci" di "cinta"',
            'Mirip "syi"',
            'Mirip "hi"',
            'Mirip "ji" di "jika"',
          ],
          1,
          'Sebelum ㅣ, lidah sedikit naik sehingga ㅅ terdengar seperti "sy". Itu sebabnya 시 sering ditulis "shi".',
        ),
        single(
          "read-uri",
          "Apa arti kata 우리?",
          ["Bebek", "Kepala", "Kami; kita", "Negara"],
          2,
          "우리 berarti kami atau kita. Bebek adalah 오리, kepala 머리, dan negara 나라.",
        ),
        single(
          "letter-h",
          'Huruf mana yang dibaca seperti "h" di "hari"?',
          ["ㅎ", "ㅇ", "ㅅ", "ㄹ"],
          0,
          'ㅎ dibaca "h". Bentuknya mirip ㅇ dengan topi, jadi jangan tertukar dengan ㅇ yang diam.',
        ),
        single(
          "review-hear-eomeoni",
          hear("어머니"),
          ["오모니", "어머니", "어모니", "오머니"],
          1,
          "Ulangan modul 1: 어머니 (ibu) memakai ㅓ di dua suku kata pertama, dengan bibir santai.",
        ),
        single(
          "review-hear-deurama",
          hear("드라마"),
          ["두라마", "도라마", "더라마", "드라마"],
          3,
          "Ulangan modul 1: 드라마 memakai ㅡ (bibir datar), bukan ㅜ (bibir bulat).",
        ),
        single(
          "review-right-vowel",
          "Vokal mana yang ditulis di kanan konsonan?",
          ["ㅗ", "ㅡ", "ㅓ", "ㅜ"],
          2,
          "Ulangan modul 1: vokal tegak (ㅏ ㅓ ㅣ) ditulis di kanan konsonan, seperti 너. Vokal datar (ㅗ ㅜ ㅡ) ditulis di bawahnya, seperti 노.",
        ),
      ],
    },
  ],
};
