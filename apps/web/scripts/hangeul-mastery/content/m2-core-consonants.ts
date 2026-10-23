import {
  assessmentRef,
  audioClip,
  b,
  bullet,
  callout,
  contrast,
  game,
  heading,
  letters,
  numbered,
  p,
  syllableGrid,
  table,
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
  description:
    "Sepuluh konsonan inti: ㄴ ㅁ, ㅅ ㅂ, ㄱ ㄷ ㅈ, dan ㅎ ㄹ. Setelah modul ini kamu bisa membaca puluhan kata nyata.",
  items: [
    {
      type: "material",
      key: "m2-n-m",
      title: "ㄴ dan ㅁ",
      description:
        "Dua konsonan pertama yang bunyinya sama dengan bahasa Indonesia, dan kata-kata seperti 나, 너, 나무, dan 어머니.",
      minutes: 15,
      blocks: [
        heading("Saatnya konsonan"),
        p(
          "Sekarang kamu mengganti ㅇ yang diam dengan konsonan yang berbunyi. Caranya sama seperti di modul 1: konsonan di kiri vokal tegak, atau di atas vokal datar. ㄴ + ㅏ = 나, ㅁ + ㅗ = 모.",
        ),
        p(
          "Dua konsonan pertama ini mudah, karena bunyinya sama dengan bahasa Indonesia. Tantangannya ada di vokal, jadi tetap perhatikan ㅓ/ㅗ dan ㅡ/ㅜ.",
        ),
        letters(
          "Huruf baru",
          [
            {
              character: "ㄴ",
              name: "니은",
              cue: 'Seperti "n" di "nasi".',
              romanization: "n",
              say: "나",
              note: "Bentuknya meniru ujung lidah yang menyentuh gusi atas. Cara menulis: satu goresan, turun dari atas ke bawah lalu belok ke kanan.",
              example: {
                word: "나무",
                meaning: "pohon; kayu",
                romanization: "namu",
              },
            },
            {
              character: "ㅁ",
              name: "미음",
              cue: 'Seperti "m" di "mata".',
              romanization: "m",
              say: "마",
              note: "Bentuknya meniru mulut. Cara menulis: tiga goresan. (1) garis tegak kiri dari atas ke bawah, (2) garis atas dari kiri ke kanan lalu turun di sisi kanan, (3) garis bawah dari kiri ke kanan.",
              example: {
                word: "어머니",
                meaning: "ibu",
                romanization: "eomeoni",
              },
            },
          ],
          { showRomanization: true },
        ),
        p(
          "Kartu huruf konsonan juga menampilkan nama hurufnya, yang dipakai untuk mengeja. Kamu tidak perlu menghafalnya sekarang; nama huruf dibahas di modul 6.",
        ),
        heading("Posisi di dalam blok", 3),
        table([
          ["Konsonan + vokal", "Blok", "Dibaca"],
          ["ㄴ + ㅏ", "나", "na"],
          ["ㄴ + ㅓ", "너", "neo"],
          ["ㅁ + ㅗ", "모", "mo"],
          ["ㅁ + ㅜ", "무", "mu"],
          ["ㄴ + ㅡ", "느", "neu"],
          ["ㅁ + ㅣ", "미", "mi"],
        ]),
        syllableGrid("Tabel suku kata ㄴ dan ㅁ", ["ㄴ", "ㅁ"], VOWELS, {
          showRomanization: true,
        }),
        contrast(
          "Ingat vokalnya",
          "Konsonannya mudah, jadi fokuslah pada vokal. Putar setiap pasangan.",
          [
            {
              items: [
                { text: "나", meaning: "aku", romanization: "na" },
                { text: "너", meaning: "kamu", romanization: "neo" },
              ],
              note: "ㅏ terbuka, ㅓ lidah lebih ke belakang. Salah vokal, berubah artinya.",
            },
            {
              items: [
                { text: "너", romanization: "neo" },
                { text: "노", romanization: "no" },
              ],
              note: "ㅓ bibir santai, ㅗ bibir bulat.",
            },
            {
              items: [
                { text: "누", romanization: "nu" },
                { text: "느", romanization: "neu" },
              ],
              note: "ㅜ bibir bulat, ㅡ bibir datar.",
            },
            {
              items: [
                { text: "나무", meaning: "pohon", romanization: "namu" },
                { text: "너무", meaning: "terlalu", romanization: "neomu" },
              ],
              note: "Bedanya hanya ㅏ dan ㅓ di suku kata pertama.",
            },
          ],
          { showRomanization: true },
        ),
        heading("Cara menulis", 3),
        bullet(
          "ㄴ ditulis dalam satu tarikan. Di samping vokal tegak (나) kakinya pendek; di atas vokal datar (노) bentuknya lebih lebar dan pipih.",
        ),
        bullet(
          "ㅁ ditulis dalam tiga goresan: kiri, atas-kanan, lalu bawah. Pastikan sudut-sudutnya tertutup.",
        ),
        bullet(
          "Tulis 나, 너, 모, dan 무 masing-masing tiga kali sambil mengucapkannya.",
        ),
        heading("Latihan baca", 3),
        p(
          "Baca setiap kata dengan suara keras, lalu cek cara baca dan artinya.",
        ),
        audioClip("어머니", "어머니"),
        table([
          ["Hangeul", "Dibaca", "Arti"],
          ["나", "na", "aku (santai)"],
          ["너", "neo", "kamu (santai)"],
          ["나이", "na-i", "umur"],
          ["누나", "nu-na", "kakak perempuan (dipakai adik laki-laki)"],
          ["이모", "i-mo", "tante (saudari ibu)"],
          ["나무", "na-mu", "pohon; kayu"],
          ["너무", "neo-mu", "terlalu; sangat"],
          ["어머니", "eo-meo-ni", "ibu"],
          ["아니", "a-ni", "bukan; tidak (santai)"],
          ["이마", "i-ma", "dahi"],
        ]),
        p(
          "Baca deretan ini dari kiri ke kanan, lalu dari kanan ke kiri: 나 너 노 누 느 니 · 마 머 모 무 므 미.",
        ),
        game(
          "stroke-master",
          "core-consonants",
          "Kenali konsonan inti",
          "Main Hangeul dengan konsonan inti. Mulailah dari ㄴ dan ㅁ; huruf lain di permainan ini akan kamu pelajari di pelajaran berikutnya.",
        ),
        callout(
          "success",
          "Ringkasan: ㄴ = n dan ㅁ = m, sama seperti bahasa Indonesia. Konsonan ditulis di kiri vokal tegak atau di atas vokal datar: 나, 너, 노, 무. Hati-hati dengan vokal: 나무 (pohon) dan 너무 (terlalu) berbeda arti.",
        ),
      ],
    },
    {
      type: "material",
      key: "m2-s-b",
      title: "ㅅ dan ㅂ",
      description:
        "Konsonan ㅅ dan ㅂ, bunyi 시, kata serapan seperti 바나나 dan 버스, serta kosakata B dan C.",
      minutes: 16,
      blocks: [
        heading("Dua konsonan baru"),
        p(
          'ㅅ hampir sama dengan "s" Indonesia. ㅂ sedikit berbeda dari "b" Indonesia, dan perbedaan kecil itu akan penting di modul 4.',
        ),
        letters(
          "Huruf baru",
          [
            {
              character: "ㅅ",
              name: "시옷",
              cue: 'Seperti "s" di "sapi". Sebelum ㅣ, bunyinya mirip "sy": 시 terdengar seperti "syi".',
              romanization: "s",
              say: "사",
              note: "Bentuknya meniru gigi. Cara menulis: (1) garis miring dari atas ke kiri bawah, (2) garis miring dari tengah garis pertama ke kanan bawah.",
              example: { word: "버스", meaning: "bus", romanization: "beoseu" },
            },
            {
              character: "ㅂ",
              name: "비읍",
              cue: 'Mirip "b" di "bola", tetapi lebih lembut. Di awal kata kadang terdengar seperti "p" yang ringan; di antara vokal terdengar jelas "b".',
              romanization: "b",
              say: "바",
              note: "Cara menulis: empat goresan. (1) garis tegak kiri, (2) garis tegak kanan, keduanya dari atas ke bawah, (3) garis datar di tengah dari kiri ke kanan, (4) garis datar di bawah dari kiri ke kanan.",
              example: {
                word: "바나나",
                meaning: "pisang",
                romanization: "banana",
              },
            },
          ],
          { showRomanization: true },
        ),
        heading('Kenapa ㅂ kadang terdengar seperti "p"?', 3),
        p(
          'Bahasa Indonesia membedakan "b" dan "p" dari getaran pita suara. Bahasa Korea tidak memakai perbedaan itu. Di awal kata, ㅂ diucapkan tanpa getaran kuat, sehingga telinga Indonesia kadang mendengarnya seperti "p" yang lembut. Di antara dua vokal, misalnya ㅂ kedua di 바보, bunyinya seperti "b" biasa.',
        ),
        p(
          'Untuk sekarang, ucapkan saja seperti "b" Indonesia yang lembut. Di modul 4 kamu akan bertemu dua saudaranya, ㅍ dan ㅃ, yang bunyinya jelas berbeda.',
        ),
        heading("ㅅ dan 시", 3),
        p(
          'Di depan ㅣ, lidah sedikit naik sehingga 시 terdengar seperti "syi". Karena itu orang asing sering menulisnya "shi". Romanisasi resminya tetap "si".',
        ),
        syllableGrid("Tabel suku kata ㅅ dan ㅂ", ["ㅅ", "ㅂ"], VOWELS, {
          showRomanization: true,
        }),
        contrast(
          "Bandingkan",
          "Putar setiap baris. Perhatikan vokalnya dan bunyi 시.",
          [
            {
              items: [
                { text: "사", romanization: "sa" },
                { text: "서", romanization: "seo" },
                { text: "소", meaning: "sapi", romanization: "so" },
              ],
              note: "ㅏ, ㅓ, dan ㅗ setelah ㅅ.",
            },
            {
              items: [
                { text: "수", romanization: "su" },
                { text: "스", romanization: "seu" },
              ],
              note: "ㅜ bulat, ㅡ datar. 스 sering muncul di kata serapan seperti 버스.",
            },
            {
              items: [
                { text: "사", romanization: "sa" },
                { text: "시", romanization: "si" },
              ],
              note: 'Sebelum ㅣ, ㅅ terdengar seperti "sy".',
            },
            {
              items: [
                { text: "보", romanization: "bo" },
                { text: "버", romanization: "beo" },
              ],
              note: "ㅗ bibir bulat, ㅓ bibir santai.",
            },
          ],
          { showRomanization: true },
        ),
        heading("Cara menulis", 3),
        bullet(
          "ㅅ: dua garis miring yang bertemu di atas, kiri dulu. Di atas vokal datar (소), kedua kakinya lebih lebar.",
        ),
        bullet(
          'ㅂ: dua tiang dulu, baru dua garis datar. Jangan menulisnya seperti huruf Latin "H" yang diberi tutup.',
        ),
        heading("Tebak kata serapan", 3),
        p(
          'Bahasa Korea meminjam banyak kata asing. Konsonan di akhir kata asing sering diberi ㅡ, sehingga "bus" menjadi 버스. Tebak artinya sebelum melihat tabel.',
        ),
        table([
          ["Hangeul", "Dibaca", "Arti"],
          ["바나나", "ba-na-na", "pisang"],
          ["버스", "beo-seu", "bus"],
          ["아이스", "a-i-seu", "es (pada nama minuman dingin)"],
          ["스시", "seu-si", "sushi"],
        ]),
        heading("Latihan baca", 3),
        audioClip("나비", "나비"),
        table([
          ["Hangeul", "Dibaca", "Arti"],
          ["소", "so", "sapi"],
          ["비", "bi", "hujan"],
          ["나비", "na-bi", "kupu-kupu"],
          ["비누", "bi-nu", "sabun"],
          ["부모", "bu-mo", "orang tua"],
          ["미소", "mi-so", "senyum"],
          ["사이", "sa-i", "hubungan; jarak; di antara"],
          ["바보", "ba-bo", "bodoh (santai, bisa terdengar kasar)"],
          ["이사", "i-sa", "pindah rumah"],
          ["사", "sa", "empat (angka)"],
        ]),
        p(
          "Baca deretan ini: 사 서 소 수 스 시 · 바 버 보 부 브 비 · 나비 비누 부모 미소.",
        ),
        heading("Kosakata B dan C", 3),
        p(
          "Kata-kata dengan ㄴ, ㅁ, ㅅ, dan ㅂ. Latih semuanya sampai selesai.",
        ),
        vocabularyRef("m2-vocab-nm-sb"),
        game(
          "syllable-forge",
          "core-consonants",
          "Susun suku kata",
          "Susun konsonan dan vokal menjadi blok. Fokus dulu pada ㄴ, ㅁ, ㅅ, dan ㅂ.",
        ),
        callout(
          "success",
          'Ringkasan: ㅅ = s (sebelum ㅣ seperti "sy"), ㅂ = b yang lembut (di awal kata kadang terdengar seperti "p" ringan). Kata serapan sering mendapat ㅡ di akhir: 버스 = bus.',
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
          examples: [
            "Adik perempuan memakai kata lain, yang akan kamu pelajari nanti.",
          ],
        },
        {
          term: "이모",
          definition: "tante (saudari ibu)",
          romanization: "imo",
          examples: [
            "Juga dipakai untuk memanggil ibu-ibu pemilik warung makan dengan akrab.",
          ],
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
          examples: [
            "Sering terdengar di drama, biasanya di antara teman akrab.",
          ],
        },
        { term: "이사", definition: "pindah rumah", romanization: "isa" },
      ],
    },
    {
      type: "material",
      key: "m2-g-d-j",
      title: "ㄱ, ㄷ, dan ㅈ",
      description:
        "Tiga konsonan polos yang lembut, pasangan 고기/거기, dan kata kerja bentuk kamus seperti 가다 dan 보다.",
      minutes: 18,
      blocks: [
        heading("Tiga konsonan polos"),
        p(
          'ㄱ, ㄷ, dan ㅈ bekerja seperti ㅂ: diucapkan lembut, tanpa getaran kuat. Di awal kata, telinga Indonesia kadang mendengarnya sebagai "k", "t", dan "c" yang ringan. Di antara vokal, bunyinya jelas "g", "d", dan "j".',
        ),
        p(
          "Huruf-huruf ini disebut konsonan ",
          b("polos"),
          ". Di modul 4 kamu akan bertemu saudara-saudaranya yang berhembus dan yang tegang.",
        ),
        letters(
          "Huruf baru",
          [
            {
              character: "ㄱ",
              name: "기역",
              cue: 'Mirip "g" di "gula", tetapi lembut. Di awal kata kadang terdengar seperti "k" yang ringan.',
              romanization: "g",
              say: "가",
              note: "Bentuknya meniru pangkal lidah yang naik. Cara menulis: satu goresan, dari kiri ke kanan lalu turun. Di samping vokal tegak (가) kakinya agak miring ke kiri; di atas vokal datar (고) kakinya lebih lurus.",
              example: {
                word: "고기",
                meaning: "daging",
                romanization: "gogi",
              },
            },
            {
              character: "ㄷ",
              name: "디귿",
              cue: 'Mirip "d" di "dua", tetapi lembut. Di awal kata kadang terdengar seperti "t" yang ringan.',
              romanization: "d",
              say: "다",
              note: "Cara menulis: dua goresan. (1) garis atas dari kiri ke kanan, (2) turun di sisi kiri lalu belok ke kanan.",
              example: { word: "두부", meaning: "tahu", romanization: "dubu" },
            },
            {
              character: "ㅈ",
              name: "지읒",
              cue: 'Mirip "j" di "jalan", tetapi lebih ringan. Di awal kata kadang terdengar seperti "c" di "cari" yang lembut.',
              romanization: "j",
              say: "자",
              note: "Cara menulis: garis datar di atas dari kiri ke kanan, lalu bentuk seperti ㅅ di bawahnya (miring ke kiri bawah, lalu miring ke kanan bawah). Banyak orang menyambung garis atas dan garis miring kiri dalam satu tarikan.",
              example: {
                word: "아버지",
                meaning: "ayah",
                romanization: "abeoji",
              },
            },
          ],
          { showRomanization: true },
        ),
        callout(
          "info",
          'Karena ㄱ di awal kata terdengar di antara "g" dan "k", kamu akan menemukan dua tulisan Latin untuk frasa yang sama, misalnya "kamsahamnida" dan "gamsahamnida". Hangeulnya tetap satu. Inilah salah satu alasan untuk tidak bergantung pada romanisasi.',
        ),
        syllableGrid(
          "Tabel suku kata ㄱ, ㄷ, dan ㅈ",
          ["ㄱ", "ㄷ", "ㅈ"],
          VOWELS,
          {
            showRomanization: true,
          },
        ),
        contrast(
          "ㅓ atau ㅗ, ㅡ atau ㅜ?",
          "Pasangan pertama adalah kata nyata yang sering tertukar. Putar setiap baris.",
          [
            {
              items: [
                { text: "고기", meaning: "daging", romanization: "gogi" },
                { text: "거기", meaning: "di sana", romanization: "geogi" },
              ],
              note: 'Kalau ㅗ dibaca seperti ㅓ, "daging" berubah menjadi "di sana".',
            },
            {
              items: [
                { text: "구", romanization: "gu" },
                { text: "그", romanization: "geu" },
              ],
              note: "ㅜ bibir bulat, ㅡ bibir datar.",
            },
            {
              items: [
                { text: "두", romanization: "du" },
                { text: "드", romanization: "deu" },
              ],
              note: "드 sering muncul di kata serapan, misalnya 드라마 (drama) di pelajaran berikutnya.",
            },
            {
              items: [
                { text: "조", romanization: "jo" },
                { text: "저", meaning: "saya (sopan)", romanization: "jeo" },
              ],
              note: "ㅗ bulat, ㅓ santai. 저 akan kamu pakai di modul 3.",
            },
          ],
          { showRomanization: true },
        ),
        heading("Cara menulis", 3),
        bullet(
          "ㄱ dan ㄷ: garis datar selalu dari kiri ke kanan, garis tegak dari atas ke bawah.",
        ),
        bullet(
          "ㅈ: garis atas dulu, lalu kaki kiri, lalu kaki kanan. Jangan tertukar dengan ㅅ yang tidak punya garis atas.",
        ),
        heading("Kata kerja bentuk kamus", 3),
        p(
          "Di kamus, kata kerja Korea selalu berakhir dengan 다. Kamu sudah bisa membaca beberapa:",
        ),
        table([
          ["Hangeul", "Dibaca", "Arti"],
          ["가다", "ga-da", "pergi"],
          ["오다", "o-da", "datang"],
          ["사다", "sa-da", "membeli"],
          ["보다", "bo-da", "melihat; menonton"],
          ["자다", "ja-da", "tidur"],
        ]),
        p(
          "Bentuk kamus ini jarang dipakai apa adanya dalam percakapan, tetapi akan sering kamu lihat di daftar kosakata.",
        ),
        heading("Latihan baca", 3),
        audioClip("고기", "고기"),
        audioClip("거기", "거기"),
        table([
          ["Hangeul", "Dibaca", "Arti"],
          ["고기", "go-gi", "daging"],
          ["거기", "geo-gi", "di sana"],
          ["도시", "do-si", "kota"],
          ["두부", "du-bu", "tahu"],
          ["가수", "ga-su", "penyanyi"],
          ["주스", "ju-seu", "jus"],
          ["아기", "a-gi", "bayi"],
          ["비자", "bi-ja", "visa"],
          ["아버지", "a-beo-ji", "ayah"],
          ["어디", "eo-di", "di mana; ke mana"],
          ["누구", "nu-gu", "siapa"],
          ["바다", "ba-da", "laut"],
          ["바지", "ba-ji", "celana panjang"],
          ["고구마", "go-gu-ma", "ubi jalar"],
          ["모자", "mo-ja", "topi"],
        ]),
        heading("Frasa pendek", 3),
        p(
          "Sekarang kamu bisa membaca frasa santai yang sering terdengar di drama.",
        ),
        table([
          ["Frasa", "Arti"],
          ["어디 가?", "Mau ke mana? (santai)"],
          ["나도 가.", "Aku juga ikut. (santai)"],
          ["누구 모자?", "Topi siapa?"],
        ]),
        game(
          "word-builder",
          "core-consonants",
          "Susun kata",
          "Susun kata seperti 고기, 바다, dan 아버지 dari suku katanya.",
        ),
        callout(
          "success",
          "Ringkasan: ㄱ, ㄷ, ㅈ adalah g, d, j yang lembut (di awal kata kadang terdengar seperti k, t, c ringan). Kata kerja bentuk kamus berakhir dengan 다. Hati-hati dengan 고기 (daging) dan 거기 (di sana).",
        ),
      ],
    },
    {
      type: "material",
      key: "m2-h-r",
      title: "ㅎ dan ㄹ",
      description:
        "Konsonan ㅎ dan ㄹ (r yang ringan), tabel lengkap sepuluh konsonan inti, frasa pendek, dan kosakata D dan E.",
      minutes: 18,
      blocks: [
        heading("Dua konsonan terakhir di modul ini"),
        letters(
          "Huruf baru",
          [
            {
              character: "ㅎ",
              name: "히읗",
              cue: 'Seperti "h" di "hari". Di antara dua vokal sering melemah dan hampir tidak terdengar.',
              romanization: "h",
              say: "하",
              note: "Cara menulis: tiga goresan. (1) garis pendek di paling atas, (2) garis datar dari kiri ke kanan, (3) ㅇ di bawahnya.",
              example: { word: "하나", meaning: "satu", romanization: "hana" },
            },
            {
              character: "ㄹ",
              name: "리을",
              cue: 'Di awal kata dan di antara vokal: "r" yang sangat ringan, lidah menepuk sekali di belakang gigi atas. Jangan digetarkan seperti "r" di "rumah".',
              romanization: "r / l",
              say: "라",
              note: 'Di bagian bawah blok (batchim) ㄹ dibaca "l" seperti di "mobil"; itu di modul 7. Cara menulis: tiga goresan. (1) garis atas ke kanan lalu turun, (2) garis tengah dari kiri ke kanan, (3) turun di sisi kiri lalu belok ke kanan.',
              example: {
                word: "나라",
                meaning: "negara",
                romanization: "nara",
              },
            },
          ],
          { showRomanization: true },
        ),
        heading("Lab ㄹ: tepuk sekali, jangan getar", 3),
        p(
          'Di bahasa Indonesia, "r" sering digetarkan, misalnya di "rumah" atau "pergi". ㄹ Korea di antara vokal hanya satu tepukan cepat. Bagi sebagian orang Indonesia, bunyinya bahkan terdengar di antara "r" dan "l".',
        ),
        numbered(
          'Ucapkan "ada" dengan cepat. Rasakan ujung lidah menyentuh belakang gigi atas sebentar.',
        ),
        numbered(
          "Lakukan sentuhan yang sama, tetapi lebih ringan dan lebih cepat. Itulah ㄹ di 아라.",
        ),
        numbered(
          "Latih: 나라, 머리, 우리, 소리. Satu tepukan saja di setiap ㄹ.",
        ),
        contrast(
          "Satu vokal, arti berbeda",
          "Pasangan kata nyata dengan ㄹ. Bedanya hanya satu vokal.",
          [
            {
              items: [
                { text: "오리", meaning: "bebek", romanization: "ori" },
                { text: "우리", meaning: "kami; kita", romanization: "uri" },
              ],
              note: "ㅗ dan ㅜ sama-sama bulat; ㅜ lebih maju dan lebih tertutup.",
            },
            {
              items: [
                { text: "소리", meaning: "bunyi; suara", romanization: "sori" },
                { text: "서리", meaning: "embun beku", romanization: "seori" },
              ],
              note: "ㅗ bulat, ㅓ santai.",
            },
            {
              items: [
                {
                  text: "고리",
                  meaning: "lingkaran pengait; mata rantai",
                  romanization: "gori",
                },
                {
                  text: "거리",
                  meaning: "jalan; jarak",
                  romanization: "geori",
                },
              ],
              note: "Lagi-lagi ㅗ dan ㅓ.",
            },
            {
              items: [
                { text: "하", romanization: "ha" },
                { text: "허", romanization: "heo" },
                { text: "호", romanization: "ho" },
              ],
              note: "ㅎ dengan ㅏ, ㅓ, dan ㅗ.",
            },
          ],
          { showRomanization: true },
        ),
        syllableGrid("Tabel suku kata ㅎ dan ㄹ", ["ㅎ", "ㄹ"], VOWELS, {
          showRomanization: true,
        }),
        heading("Sepuluh konsonan inti", 3),
        p(
          "Inilah semua yang sudah bisa kamu baca. Coba baca satu baris per hari tanpa melihat romanisasinya.",
        ),
        syllableGrid("Semua konsonan inti dan vokal dasar", CORE, VOWELS, {
          showRomanization: true,
        }),
        table([
          ["Huruf", "Bunyi", "Contoh"],
          ["ㅇ", "diam di awal blok", "아이"],
          ["ㄴ", "n", "나무"],
          ["ㅁ", "m", "어머니"],
          ["ㅅ", 's (sebelum ㅣ mirip "sy")', "소"],
          ["ㅂ", "b yang lembut", "바나나"],
          ["ㄱ", "g yang lembut", "고기"],
          ["ㄷ", "d yang lembut", "두부"],
          ["ㅈ", "j yang lembut", "아버지"],
          ["ㅎ", "h", "하나"],
          ["ㄹ", "r ringan satu tepukan", "나라"],
        ]),
        heading("Latihan baca", 3),
        audioClip("드라마", "드라마"),
        audioClip("라디오", "라디오"),
        table([
          ["Hangeul", "Dibaca", "Arti"],
          ["하나", "ha-na", "satu"],
          ["우리", "u-ri", "kami; kita"],
          ["나라", "na-ra", "negara"],
          ["머리", "meo-ri", "kepala; rambut"],
          ["다리", "da-ri", "kaki; jembatan"],
          ["허리", "heo-ri", "pinggang"],
          ["오리", "o-ri", "bebek"],
          ["소리", "so-ri", "bunyi; suara"],
          ["하루", "ha-ru", "sehari"],
          ["오후", "o-hu", "siang; sore (setelah pukul 12)"],
          ["그리고", "geu-ri-go", "dan; lalu"],
          ["라디오", "ra-di-o", "radio"],
          ["드라마", "deu-ra-ma", "drama"],
          ["호수", "ho-su", "danau"],
        ]),
        heading("Frasa pendek", 3),
        p("Baca dulu, lalu putar audionya."),
        audioClip("우리나라", "우리나라: negara kita"),
        audioClip("아기 오리", "아기 오리: anak bebek"),
        table([
          ["Frasa", "Arti"],
          ["우리나라", "negara kita (cara orang Korea menyebut Korea)"],
          ["아기 오리", "anak bebek"],
          ["라디오 소리", "suara radio"],
          ["어머니 아버지", "ibu dan ayah"],
          ["드라마 보러 가?", "Mau pergi nonton drama? (santai)"],
        ]),
        heading("Kosakata D dan E", 3),
        p(
          "Kata-kata dengan ㄱ, ㄷ, ㅈ, ㅎ, dan ㄹ, termasuk kata kerja bentuk kamus.",
        ),
        vocabularyRef("m2-vocab-gdj-hr"),
        game(
          "stroke-master",
          "core-consonants",
          "Ulangi semua konsonan inti",
          "Main Hangeul dengan sepuluh konsonan inti dan enam vokal dasar. Ulangi sampai kamu bisa menjawab tanpa ragu.",
        ),
        heading("Kuis modul 2", 3),
        p(
          "Kuis ini menguji konsonan baru dan mengulang vokal dari modul 1. Nilai lulusnya 80%.",
        ),
        assessmentRef("m2-quiz"),
        callout(
          "success",
          "Ringkasan: ㅎ = h (melemah di antara vokal), ㄹ = r ringan satu tepukan, tanpa getaran. Kamu sekarang mengenal sepuluh konsonan inti dan bisa membaca kata seperti 나라, 우리, 드라마, dan 라디오.",
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
          examples: ["Bandingkan dengan 고기 (daging)."],
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
        "16 soal tentang sepuluh konsonan inti, kata-kata baru, dan ulangan vokal dari modul 1.",
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
          "review-position",
          "Di blok 부, di mana vokal ㅜ ditulis?",
          ["Di bawah ㅂ", "Di kanan ㅂ", "Di kiri ㅂ", "Di atas ㅂ"],
          0,
          "Ulangan modul 1: vokal datar (ㅗ ㅜ ㅡ) ditulis di bawah konsonan.",
        ),
        single(
          "review-sejong",
          "Ulangan modul 0: raja siapa yang mengumumkan Hangeul pada akhir 1443?",
          ["Raja Taejo", "Raja Jeongjo", "Raja Sejong", "Raja Gojong"],
          2,
          "Raja Sejong mengumumkan 28 huruf baru pada akhir 1443 dan menerbitkannya dalam Hunminjeongeum pada 1446.",
        ),
      ],
    },
  ],
};
