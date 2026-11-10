import {
  assessmentRef,
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
  vocabularyRef,
} from "../blocks";
import type { ModuleContent, QuestionContent } from "../content-types";

const choice = (
  key: string,
  prompt: QuestionContent["prompt"],
  correct: string,
  wrong: [string, string, string],
  explanation: string,
): QuestionContent => ({
  key,
  type: "SINGLE_CHOICE",
  prompt,
  explanation,
  options: [
    { content: correct, correct: true },
    ...wrong.map((content) => ({ content })),
  ],
});

const hear = (
  text: string,
  question = "Dengarkan, lalu pilih kata yang kamu dengar.",
) => [p(question), audioClip(text)];

const NO_ROMANIZATION = { showRomanization: false };

export const m5WVowels: ModuleContent = {
  key: "m5-w-vowels",
  title: "Vokal W",
  description:
    "Vokal gabungan ㅘ ㅝ ㅙ ㅞ ㅚ ㅟ ㅢ. Setelah modul ini kamu kenal semua vokal Hangeul.",
  items: [
    {
      type: "material",
      key: "m5-wa-wo-wae-we",
      title: "ㅘ ㅝ ㅙ ㅞ: dua vokal jadi satu",
      description: "ㅗ atau ㅜ yang disambung vokal lain jadi bunyi w.",
      minutes: 6,
      blocks: [
        lessonPage({
          theme: "rose",
          imageKey: "chapter-5",
          imageAlt: "Teman kagum melihat apel di pasar buah",
          chapter: 5,
          title: "ㅘ ㅝ ㅙ ㅞ ㅚ ㅟ ㅢ",
          subtitle: "Vokal W",
          question: "사과 주세요.",
          answer: "최고예요!",
          cards: [
            {
              label: "Huruf baru",
              title: "7 vokal gabungan",
              description: "Dua vokal dibaca jadi satu",
            },
            {
              label: "Kosakata",
              title: "사과 · 회사 · 의사",
              description: "Kata dengan vokal W",
            },
            {
              label: "Latihan",
              title: "Susun blok",
              description: "Permainan dan kuis bab",
            },
          ],
          goals: [
            "Membaca semua vokal Hangeul.",
            "Membaca ㅢ sesuai posisinya.",
          ],
        }),
        callout(
          "info",
          "Vokal W adalah ",
          b("gabungan dua vokal"),
          " yang sudah kamu kenal, dibaca cepat jadi satu bunyi. Tidak ada bentuk baru yang perlu dihafal.",
        ),
        rules({
          title: "Gabungan dua vokal",
          intro:
            'Ucapkan ㅗ atau ㅜ dengan cepat, lalu langsung ke vokal berikutnya. Bibir yang bulat membuka, jadi terdengar "w".',
          columns: ["Gabungan", "Jadi", "Dibaca"],
          rows: [
            { when: "ㅗ + ㅏ", result: "ㅘ", example: '와 = "wa"' },
            { when: "ㅜ + ㅓ", result: "ㅝ", example: "워 = w + ㅓ" },
            { when: "ㅗ + ㅐ", result: "ㅙ", example: '왜 = "we"' },
            { when: "ㅜ + ㅔ", result: "ㅞ", example: '웨 = "we"' },
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
              example: { word: "사과", meaning: "apel", romanization: "sagwa" },
            },
            {
              character: "ㅝ",
              cue: "Bibir bulat dulu, lalu buka ke ㅓ yang tidak bulat.",
              romanization: "wo",
              say: "워",
              note: 'Bukan "wo" dengan o bulat: ujungnya ㅓ.',
              example: {
                word: "뭐",
                meaning: "apa (santai)",
                romanization: "mwo",
              },
            },
            {
              character: "ㅙ",
              cue: '"w" lalu "e" seperti di "sate": "we".',
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
              example: {
                word: "스웨터",
                meaning: "sweter",
                romanization: "seuweteo",
              },
            },
          ],
          NO_ROMANIZATION,
        ),
        contrast(
          "Ada W atau tidak?",
          "Putar tiap baris. Dengarkan bibir yang membulat sebentar sebelum vokal kedua.",
          [
            {
              items: [
                { text: "사과", meaning: "apel" },
                { text: "사고", meaning: "kecelakaan" },
              ],
              note: "Satu ㅏ kecil mengubah apel jadi kecelakaan.",
            },
            {
              items: [
                { text: "와", meaning: "wah!" },
                { text: "워", meaning: "w + ㅓ" },
              ],
              note: "ㅘ berakhir ㅏ yang terbuka lebar, ㅝ berakhir ㅓ.",
            },
            {
              items: [
                { text: "뭐", meaning: "apa" },
                { text: "모" },
                { text: "머" },
              ],
              note: "뭐 mulai bulat seperti 모, lalu berakhir seperti 머.",
            },
          ],
          NO_ROMANIZATION,
        ),
        syllableGrid(
          "Sekarang kamu bisa baca",
          ["ㅇ", "ㄱ", "ㄷ", "ㅁ", "ㅅ", "ㅎ"],
          ["ㅘ", "ㅝ", "ㅙ", "ㅞ"],
          NO_ROMANIZATION,
        ),
        game(
          "syllable-forge",
          "w-vowels",
          "Susun blok dengan vokal W",
          "Gabungkan konsonan dengan ㅘ ㅝ ㅙ ㅞ sampai kamu hafal letaknya.",
        ),
        callout(
          "success",
          b("Ingat: "),
          "ㅝ berakhir dengan ㅓ yang santai, bukan o bulat.",
        ),
      ],
    },
    {
      type: "material",
      key: "m5-oe-wi-ui",
      title: "ㅚ ㅟ ㅢ: tambah ㅣ",
      description: "Tiga vokal terakhir, dan cara baca ㅢ.",
      minutes: 7,
      blocks: [
        callout(
          "info",
          "Tiga vokal terakhir dibuat dengan menambahkan ㅣ di kanan ㅗ, ㅜ, dan ㅡ. Setelah ini kamu kenal ",
          b("semua vokal Hangeul"),
          ".",
        ),
        rules({
          title: "Tambah ㅣ",
          columns: ["Gabungan", "Jadi", "Dibaca"],
          rows: [
            { when: "ㅗ + ㅣ", result: "ㅚ", example: '외 = "we"' },
            { when: "ㅜ + ㅣ", result: "ㅟ", example: '위 = "wi"' },
            { when: "ㅡ + ㅣ", result: "ㅢ", example: "의 = ㅡ cepat ke ㅣ" },
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
                word: "회사",
                meaning: "perusahaan",
                romanization: "hoesa",
              },
            },
            {
              character: "ㅟ",
              cue: 'Seperti "wi" di "wisata".',
              romanization: "wi",
              say: "위",
              example: {
                word: "가위",
                meaning: "gunting",
                romanization: "gawi",
              },
            },
            {
              character: "ㅢ",
              cue: "ㅡ dengan bibir datar, cepat meluncur ke ㅣ.",
              romanization: "ui",
              say: "의",
              note: "Bacanya berubah sesuai posisi, lihat aturan di bawah.",
              example: {
                word: "의사",
                meaning: "dokter",
                romanization: "uisa",
              },
            },
          ],
          NO_ROMANIZATION,
        ),
        contrast(
          "ㅙ ㅚ ㅞ: bunyinya hampir sama",
          "Putar ketiganya. Sekarang ketiganya terdengar hampir sama, jadi hafalkan ejaan katanya seperti ㅐ dan ㅔ.",
          [
            {
              items: [
                { text: "왜", meaning: "kenapa (ㅙ)" },
                { text: "외모", meaning: "penampilan (ㅚ)" },
                { text: "웨이터", meaning: "pelayan (ㅞ)" },
              ],
              note: "Suku kata pertamanya sama-sama dibaca we.",
            },
            {
              items: [
                { text: "위", meaning: "atas" },
                { text: "이", meaning: "gigi; dua" },
              ],
              note: "ㅟ mulai dengan bibir bulat, ㅣ tidak.",
            },
          ],
          NO_ROMANIZATION,
        ),
        rules({
          title: "Cara baca ㅢ",
          intro: "ㅢ satu-satunya vokal yang bacaannya berubah menurut posisi.",
          theme: "green",
          columns: ["Posisi", "Dibaca", "Contoh"],
          rows: [
            { when: "Di awal kata", result: "의", example: "의사, 의자" },
            { when: "Setelah konsonan", result: "ㅣ", example: "저희 → 저히" },
          ],
          tip: {
            title: "의 yang berarti punya",
            text: 'Kalau 의 berarti "punya", biasanya dibaca 에: 나의 → 나에.',
          },
        }),
        syllableGrid(
          "Sekarang kamu bisa baca",
          ["ㅇ", "ㄱ", "ㄷ", "ㅅ", "ㅈ", "ㅊ", "ㅎ"],
          ["ㅚ", "ㅟ"],
          NO_ROMANIZATION,
        ),
        audioClip("최고예요!", "최고예요! = Yang terbaik!"),
        vocabularyRef("m5-vocab-i"),
        game(
          "word-builder",
          "w-vowels",
          "Susun kata dengan vokal W",
          "Susun 회사, 가위, 과자, dan kata lain dari huruf-hurufnya.",
        ),
        assessmentRef("m5-quiz"),
        callout(
          "success",
          b("Ingat: "),
          "ㅢ di awal kata dibaca 의, setelah konsonan dibaca ㅣ saja.",
        ),
      ],
    },
    {
      type: "vocabulary",
      key: "m5-vocab-i",
      title: "Kosakata I: vokal W",
      description:
        "Kata sehari-hari dan kata dunia kerja dengan ㅘ ㅝ ㅙ ㅞ ㅚ ㅟ ㅢ, semuanya tanpa batchim.",
      entries: [
        {
          term: "과자",
          definition: "camilan; kue kering",
          romanization: "gwaja",
        },
        {
          term: "사과",
          definition: "apel",
          romanization: "sagwa",
          examples: ["사과 주세요. = Minta apel."],
        },
        { term: "뭐", definition: "apa (santai)", romanization: "mwo" },
        { term: "왜", definition: "kenapa", romanization: "wae" },
        { term: "돼지", definition: "babi", romanization: "dwaeji" },
        {
          term: "고마워요",
          definition: "terima kasih (sopan, akrab)",
          romanization: "gomawoyo",
        },
        {
          term: "추워요",
          definition: "dingin (cuaca)",
          romanization: "chuwoyo",
        },
        {
          term: "더워요",
          definition: "panas (cuaca)",
          romanization: "deowoyo",
        },
        { term: "샤워", definition: "mandi (pancuran)", romanization: "syawo" },
        { term: "스웨터", definition: "sweter", romanization: "seuweteo" },
        {
          term: "회사",
          definition: "perusahaan; kantor",
          romanization: "hoesa",
        },
        {
          term: "회의",
          definition: "rapat",
          romanization: "hoeui",
          examples: ["회의 어디서 해요? = Rapatnya di mana?"],
        },
        {
          term: "최고",
          definition: "terbaik; nomor satu",
          romanization: "choego",
        },
        { term: "교회", definition: "gereja", romanization: "gyohoe" },
        { term: "가위", definition: "gunting", romanization: "gawi" },
        { term: "귀", definition: "telinga", romanization: "gwi" },
        { term: "위", definition: "atas", romanization: "wi" },
        { term: "뒤", definition: "belakang", romanization: "dwi" },
        { term: "의사", definition: "dokter", romanization: "uisa" },
        { term: "의자", definition: "kursi", romanization: "uija" },
        {
          term: "저희",
          definition: "kami (sopan, merendah)",
          romanization: "jeohui",
          examples: ["저희 회사 = perusahaan kami"],
        },
      ],
    },
    {
      type: "assessment",
      key: "m5-quiz",
      title: "Kuis Modul 5: vokal W",
      description: "15 soal tentang vokal W, ditambah ulasan modul sebelumnya.",
      instructions:
        "Pilih satu jawaban untuk setiap soal. Untuk soal dengar, putar audionya sebanyak yang kamu perlukan. Nilai lulus 80%.",
      passingScore: 80,
      shuffleOptions: true,
      questions: [
        choice(
          "m5-quiz-o-plus-a",
          "Vokal mana yang merupakan gabungan ㅗ + ㅏ?",
          "ㅘ",
          ["ㅝ", "ㅚ", "ㅙ"],
          "ㅗ + ㅏ = ㅘ (wa). ㅝ adalah ㅜ + ㅓ, ㅚ adalah ㅗ + ㅣ, dan ㅙ adalah ㅗ + ㅐ.",
        ),
        choice(
          "m5-quiz-u-plus-eo",
          "Vokal mana yang merupakan gabungan ㅜ + ㅓ?",
          "ㅝ",
          ["ㅘ", "ㅟ", "ㅞ"],
          "ㅜ + ㅓ = ㅝ. Ingat polanya: ㅜ berpasangan dengan ㅓ dan ㅔ, ㅗ berpasangan dengan ㅏ dan ㅐ.",
        ),
        choice(
          "m5-quiz-hear-gwaja",
          hear("과자"),
          "과자",
          ["가자", "거자", "구자"],
          "Kamu mendengar 과자 (camilan). Bibir membulat sebentar sebelum ㅏ: itulah ㅘ.",
        ),
        choice(
          "m5-quiz-hear-mwo",
          hear("뭐"),
          "뭐",
          ["모", "머", "무"],
          "뭐 (apa) dimulai bulat seperti ㅜ, lalu terbuka ke ㅓ. 모 tetap bulat sampai akhir.",
        ),
        choice(
          "m5-quiz-hear-sagwa",
          hear("사과"),
          "사과",
          ["사고", "서과", "사구"],
          "Kamu mendengar 사과 (apel). 사고 (kecelakaan) tidak punya bunyi w dan diakhiri o bulat.",
        ),
        choice(
          "m5-quiz-hear-gawi",
          hear("가위"),
          "가위",
          ["거위", "가이", "기위"],
          "가위 berarti gunting. Suku kata kedua 위 dimulai bibir bulat. 거위 (angsa) diawali ㅓ, bukan ㅏ.",
        ),
        choice(
          "m5-quiz-odd-one-out",
          "Tiga dari empat vokal ini dibaca sama dalam bahasa Korea sehari-hari. Mana yang BERBEDA bunyinya?",
          "ㅟ",
          ["ㅙ", "ㅞ", "ㅚ"],
          "ㅙ, ㅞ, dan ㅚ sama-sama dibaca 'we'. ㅟ dibaca 'wi'.",
        ),
        choice(
          "m5-quiz-read-hoesa",
          "Apa arti 회사?",
          "perusahaan",
          ["dokter", "kursi", "gunting"],
          "회사 = perusahaan, kantor. Dokter = 의사, kursi = 의자, gunting = 가위.",
        ),
        choice(
          "m5-quiz-read-uija",
          "Apa arti 의자?",
          "kursi",
          ["dokter", "rapat", "telinga"],
          "의자 = kursi. Jangan tertukar dengan 의사 (dokter): bedanya hanya ㅈ dan ㅅ.",
        ),
        choice(
          "m5-quiz-jeohui",
          "Bagaimana 저희 (kami) dibaca?",
          "[저히]",
          ["[저후이]", "[저흐]", "[저헤]"],
          "ㅢ setelah konsonan (di sini ㅎ) dibaca ㅣ saja, jadi 저희 dibaca [저히].",
        ),
        choice(
          "m5-quiz-build-dwae",
          "Blok mana yang tersusun dari ㄷ + ㅙ?",
          "돼",
          ["되", "대", "뒈"],
          "ㄷ + ㅙ = 돼 (seperti di 돼지, babi). 되 memakai ㅚ, 대 memakai ㅐ, 뒈 memakai ㅞ.",
        ),
        choice(
          "m5-review-hear-keopi",
          [
            p("Ulasan Modul 4. Dengarkan, lalu pilih kata yang kamu dengar."),
            audioClip("커피"),
          ],
          "커피",
          ["거피", "꺼피", "코피"],
          "커피 (kopi) diawali ㅋ yang berhembus dan vokal ㅓ. 코피 memakai ㅗ yang bulat.",
        ),
        choice(
          "m5-review-hear-ssada",
          [
            p("Ulasan Modul 4. Dengarkan, lalu pilih kata yang kamu dengar."),
            audioClip("싸다"),
          ],
          "싸다",
          ["사다", "짜다", "차다"],
          "싸다 (murah) diawali ㅆ yang tegang dan lebih panjang. 사다 (membeli) memakai ㅅ biasa.",
        ),
        choice(
          "m5-review-read-norae",
          "Ulasan Modul 3. Apa arti 노래?",
          "lagu",
          ["pohon", "kepala", "negara"],
          "노래 = lagu. Pohon = 나무, kepala = 머리, negara = 나라.",
        ),
        choice(
          "m5-review-read-eomeoni",
          "Ulasan Modul 2. Apa arti 어머니?",
          "ibu",
          ["ayah", "kakak perempuan", "tante"],
          "어머니 = ibu. Ayah = 아버지, kakak perempuan (dari adik laki-laki) = 누나, tante = 이모.",
        ),
      ],
    },
  ],
};
