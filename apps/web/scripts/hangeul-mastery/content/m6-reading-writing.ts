import {
  audioClip,
  b,
  callout,
  contrast,
  game,
  lessonPage,
  p,
  rules,
} from "../blocks";
import type {
  BlockNoteBlock,
  ModuleContent,
  QuestionContent,
} from "../content-types";

// An audio clip whose player label does not reveal the Korean text, for
// listening questions.
const listen = (text: string): BlockNoteBlock => audioClip(text);

const choice = (
  key: string,
  prompt: string | BlockNoteBlock[],
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

export const m6ReadingWriting: ModuleContent = {
  key: "m6-reading-writing",
  title: "Membaca dan menulis",
  description:
    "Membaca kata nyata blok demi blok, lalu menulis dan mengetik Hangeul di ponsel.",
  items: [
    {
      type: "material",
      key: "m6-reading-blocks",
      title: "Baca kata nyata",
      description:
        "Tiga langkah membaca, lalu kata serapan dan kalimat di kafe.",
      minutes: 7,
      blocks: [
        lessonPage({
          theme: "ocean",
          imageKey: "chapter-6",
          imageAlt: "Menulis di buku dan mengetik di ponsel",
          chapter: 7,
          title: "읽기 · 쓰기",
          subtitle: "Membaca dan menulis",
          question: "아이스 아메리카노 하나 주세요.",
          answer: "네, 여기요.",
          cards: [
            {
              label: "Membaca",
              title: "Blok demi blok",
              description: "Kiri ke kanan, atas ke bawah",
            },
            {
              label: "Menulis",
              title: "Urutan goresan",
              description: "Dan keyboard Korea di ponsel",
            },
            {
              label: "Latihan",
              title: "Kata serapan",
              description: "커피 · 버스 · 피자",
            },
          ],
          goals: [
            "Membaca kata nyata dengan lancar.",
            "Menulis dan mengetik Hangeul di ponsel.",
          ],
        }),
        callout(
          "info",
          "Kamu sudah kenal semua huruf untuk blok tanpa huruf di bawah. Sekarang kita baca ",
          b("kata nyata"),
          ".",
        ),
        rules({
          title: "Tiga langkah membaca",
          intro: "Pakai langkah ini setiap kali kamu melihat kata baru.",
          columns: ["Langkah", "Caranya", "Contoh"],
          rows: [
            {
              when: "1. Blok demi blok",
              result: "1 blok = 1 ketukan",
              example: "바나나 = 바-나-나",
            },
            {
              when: "2. Kiri → kanan",
              result: "konsonan, lalu vokal",
              example: "바 = ㅂ + ㅏ",
            },
            {
              when: "3. Atas → bawah",
              result: "konsonan, lalu vokal",
              example: "스 = ㅅ + ㅡ",
            },
          ],
          tip: {
            text: "Baca pelan per blok, lalu ulangi cepat sebagai satu kata. Spasi memisahkan kata, bukan blok.",
          },
        }),
        contrast(
          "Tebak kata serapan",
          "Baca per blok dan tebak artinya, lalu putar audionya untuk mengecek.",
          [
            {
              items: [
                { text: "커피", meaning: "kopi" },
                { text: "바나나", meaning: "pisang" },
                { text: "버스", meaning: "bus" },
              ],
            },
            {
              items: [
                { text: "카메라", meaning: "kamera" },
                { text: "피아노", meaning: "piano" },
                { text: "메뉴", meaning: "menu" },
              ],
            },
            {
              items: [
                { text: "주스", meaning: "jus" },
                { text: "우유", meaning: "susu" },
                { text: "피자", meaning: "pizza" },
              ],
            },
            {
              items: [
                { text: "아파트", meaning: "apartemen" },
                { text: "오토바이", meaning: "sepeda motor" },
                { text: "티셔츠", meaning: "kaus (T-shirt)" },
              ],
            },
          ],
          { showRomanization: false },
        ),
        p(
          "Sekarang di kafe. Baca kalimatnya dulu, lalu putar audionya. ",
          b("하나"),
          " = satu, ",
          b("주세요"),
          " = tolong beri.",
        ),
        audioClip("어서 오세요!", "Selamat datang!", "어서 오세요!"),
        audioClip(
          "아이스 아메리카노 하나 주세요.",
          "Tolong satu es americano.",
          "아이스 아메리카노 하나 주세요.",
        ),
        game(
          "word-builder",
          "w-vowels",
          "Latihan membaca cepat",
          "Susun kata dari huruf-hurufnya. Makin cepat kamu mengenali blok, makin lancar kamu membaca.",
        ),
        callout(
          "success",
          b("Ingat: "),
          "baca blok demi blok, lalu ulangi cepat sebagai satu kata.",
        ),
      ],
    },
    {
      type: "material",
      key: "m6-typing",
      title: "Menulis dan mengetik",
      description:
        "Dua aturan urutan goresan, lalu keyboard Korea di ponselmu.",
      minutes: 7,
      blocks: [
        callout(
          "info",
          "Menulis dan mengetik Hangeul sama-sama mengikuti ",
          b("urutan membaca"),
          ".",
        ),
        rules({
          title: "Dua aturan urutan goresan",
          columns: ["Aturan", "Caranya", "Contoh"],
          rows: [
            {
              when: "Atas → bawah",
              result: "garis tegak ditarik turun",
              example: "ㅣ, lalu ㅏ",
            },
            {
              when: "Kiri → kanan",
              result: "garis datar ditarik ke kanan",
              example: "ㅡ, lalu ㅓ",
            },
          ],
          tip: {
            text: "Dalam satu blok, tulis konsonan dulu, lalu vokal. ㅇ cukup satu lingkaran dari atas.",
          },
        }),
        game(
          "stroke-master",
          "w-vowels",
          "Latih urutan goresan",
          "Telusuri setiap huruf dengan urutan goresan yang benar.",
        ),
        callout(
          "tip",
          b("Pasang keyboard Korea. "),
          "Android (Gboard): setelan keyboard → Bahasa → Tambahkan keyboard → Korea, pilih QWERTY (2-Bulsik). iPhone: Pengaturan → Umum → Papan Ketik → Tambah Papan Ketik Baru → Korea, pilih Standar.",
        ),
        rules({
          title: "Keyboard 2-beolsik",
          intro:
            "Konsonan di kiri, vokal di kanan. Ketik huruf sesuai urutan membaca, keyboard menyusun bloknya sendiri.",
          theme: "green",
          columns: ["Ketik", "Hasilnya", "Contoh"],
          rows: [
            {
              when: "ㅇ ㅏ ㅇ ㅣ",
              result: "아이",
              example: "ㅇ diam tetap diketik",
            },
            {
              when: "Shift + ㄱ",
              result: "ㄲ",
              example: "Shift + ㅂ = ㅃ, untuk 오빠",
            },
            {
              when: "ㄱ ㅗ ㅏ",
              result: "과",
              example: "dua vokal jadi satu: ㅗ + ㅏ = ㅘ",
            },
          ],
        }),
        game(
          "word-builder",
          "w-vowels",
          "Susun kata",
          "Susun kata dari huruf-hurufnya, sama seperti saat mengetik.",
        ),
        callout(
          "success",
          b("Ingat: "),
          "tulis atas ke bawah, kiri ke kanan, dan ketik huruf sesuai urutan membaca.",
        ),
      ],
    },
    {
      type: "assessment",
      key: "m6-quiz",
      title: "Kuis bab 7: membaca dan menulis",
      description:
        "11 soal tentang membaca per blok, urutan goresan, dan mengetik, ditambah ulasan bab sebelumnya.",
      instructions:
        "Pilih satu jawaban untuk setiap soal. Untuk soal dengar, putar audionya sebanyak yang kamu perlukan. Nilai lulus 80%.",
      passingScore: 80,
      shuffleOptions: true,
      questions: [
        choice(
          "m6-quiz-vowel-position",
          "Kamu melihat blok dengan vokal ㅗ. Di mana konsonan awalnya?",
          "di atas vokal",
          ["di kanan vokal", "di bawah vokal", "di kiri vokal"],
          "ㅗ adalah vokal datar (garis panjangnya mendatar), jadi konsonan ditulis di atasnya, seperti 고. Vokal tegak seperti ㅏ menaruh konsonan di kiri.",
        ),
        choice(
          "m6-quiz-read-americano",
          "Kamu membaca menu: 아메리카노. Apa yang kamu pesan?",
          "kopi americano",
          ["teh es", "jus jeruk", "kue keju"],
          "아-메-리-카-노 = americano. Teh es = 아이스티, jus = 주스, kue keju = 치즈 케이크.",
        ),
        choice(
          "m6-quiz-read-order",
          "Apa arti 아이스 아메리카노 하나 주세요?",
          "Tolong satu es americano.",
          [
            "Selamat datang di kafe.",
            "Ini dua americano panas.",
            "Terima kasih atas kopinya.",
          ],
          "아이스 = es, 아메리카노 = americano, 하나 = satu, 주세요 = tolong beri.",
        ),
        choice(
          "m6-quiz-stroke-a",
          "Bagaimana urutan goresan ㅏ?",
          "garis tegak dulu, lalu garis pendek ke kanan",
          [
            "garis pendek dulu, lalu garis tegak",
            "garis tegak dari bawah ke atas, lalu garis pendek",
            "satu goresan tanpa mengangkat pena",
          ],
          "Aturan kiri ke kanan: garis tegak ada di kiri, jadi ditulis dulu (dari atas ke bawah), lalu garis pendek di kanan.",
        ),
        choice(
          "m6-quiz-type-gwa",
          "Tombol apa saja yang kamu ketik untuk menulis 과?",
          "ㄱ ㅗ ㅏ",
          ["ㄱ ㅏ ㅗ", "ㄱ ㅜ ㅏ", "ㄱ ㅓ ㅗ"],
          "ㅘ adalah ㅗ + ㅏ, jadi ketik ㄱ, lalu ㅗ, lalu ㅏ. Keyboard menggabungkannya menjadi 과.",
        ),
        choice(
          "m6-quiz-type-tense",
          "Bagaimana mengetik ㄲ di keyboard 2-beolsik?",
          "Shift + ㄱ",
          ["ㄱ dua kali dengan cepat", "Shift + ㅋ", "ㄱ lalu ㅎ"],
          "Konsonan tegang diketik dengan Shift ditambah huruf polosnya: Shift + ㄱ = ㄲ.",
        ),
        choice(
          "m6-review-hear-tokki",
          [
            p("Ulasan. Dengarkan, lalu pilih kata yang kamu dengar."),
            listen("토끼"),
          ],
          "토끼",
          ["도끼", "토기", "또끼"],
          "토끼 (kelinci) diawali ㅌ yang berhembus dan diakhiri ㄲ yang tegang. 도끼 (kapak) diawali ㄷ polos.",
        ),
        choice(
          "m6-review-hear-geogi",
          [
            p("Ulasan. Dengarkan, lalu pilih kata yang kamu dengar."),
            listen("거기"),
          ],
          "거기",
          ["고기", "구기", "가기"],
          "거기 (di sana) memakai ㅓ dengan bibir tidak bulat. 고기 (daging) memakai ㅗ yang bulat.",
        ),
        choice(
          "m6-review-hear-jjada",
          [
            p("Ulasan. Dengarkan, lalu pilih kata yang kamu dengar."),
            listen("짜다"),
          ],
          "짜다",
          ["자다", "차다", "싸다"],
          "짜다 (asin) diawali ㅉ yang tegang tanpa hembusan. 자다 (tidur) memakai ㅈ polos, 차다 memakai ㅊ yang berhembus.",
        ),
        choice(
          "m6-review-read-gage",
          "Ulasan. Apa arti 가게?",
          "toko",
          ["kemarin", "jam", "lagu"],
          "가게 = toko. Kemarin = 어제, jam = 시계, lagu = 노래.",
        ),
        choice(
          "m6-review-read-hoesa",
          "Ulasan. Apa arti 회사?",
          "perusahaan",
          ["dokter", "kursi", "gereja"],
          "회사 = perusahaan. Dokter = 의사, kursi = 의자, gereja = 교회.",
        ),
      ],
    },
  ],
};
