import {
  audioClip,
  b,
  bullet,
  callout,
  contrast,
  game,
  heading,
  letters,
  p,
  syllableGrid,
  table,
  vocabularyRef,
} from "../blocks";
import type {
  BlockNoteBlock,
  ModuleContent,
  QuestionContent,
} from "../content-types";

// An audio clip whose player label does not reveal the Korean text (the
// builder's default file name is the text itself, which would give away
// listening answers).
const listen = (
  text: string,
  label = "Dengarkan",
  caption = "",
): BlockNoteBlock => {
  const block = audioClip(text, caption);
  return { ...block, props: { ...block.props, fileName: label } };
};

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

const hear = (
  text: string,
  intro = "Dengarkan, lalu pilih kata yang kamu dengar.",
) => [p(intro), listen(text)];

export const m7BatchimBasics: ModuleContent = {
  key: "m7-batchim-basics",
  title: "Batchim",
  description:
    "Konsonan di bagian bawah blok. Tujuh bunyi akhir yang semuanya sudah ada dalam bahasa Indonesia: ㄴ ㅁ ㅇ, ㄹ, dan ㄱ ㅂ ㄷ, lalu banyak huruf yang dibaca dengan satu bunyi.",
  items: [
    {
      type: "material",
      key: "m7-batchim-nasals",
      title: "Apa itu batchim? Mulai dari ㄴ ㅁ ㅇ",
      description:
        "Lantai bawah blok, tujuh bunyi akhir, dan tiga batchim sengau yang paling mudah.",
      minutes: 16,
      blocks: [
        heading("Lantai bawah blok"),
        p(
          "Sampai sekarang setiap blok berakhir dengan vokal: 가, 고, 과. Sekarang kita isi ",
          b("lantai bawahnya"),
          ". Konsonan yang ditulis di bagian bawah blok disebut ",
          b("받침 (batchim)"),
          ", artinya 'penopang' atau 'alas'. Batchim dibaca di akhir suku kata.",
        ),
        table([
          ["Bentuk blok", "Contoh", "Urutan baca"],
          ["konsonan + vokal tegak + batchim", "산", "ㅅ → ㅏ → ㄴ"],
          ["konsonan + vokal datar + batchim", "곰", "ㄱ → ㅗ → ㅁ"],
          ["konsonan + vokal gabungan + batchim", "관", "ㄱ → ㅘ → ㄴ"],
        ]),
        p(
          "Urutan membaca tetap sama seperti biasa: dari atas ke bawah, dari kiri ke kanan. Batchim selalu dibaca paling akhir.",
        ),
        heading("Kabar baik: tujuh bunyi saja", 3),
        p(
          "Banyak huruf bisa ditulis sebagai batchim, tetapi di akhir suku kata hanya ada ",
          b("tujuh bunyi"),
          ". Dan semuanya sudah kamu ucapkan setiap hari dalam bahasa Indonesia:",
        ),
        table([
          ["Batchim", "Seperti akhir kata Indonesia", "Contoh Korea"],
          ["ㄱ", "musik, plastik", "책 (buku)"],
          ["ㄴ", "makan", "산 (gunung)"],
          ["ㄷ", "surat, sehat", "곧 (segera)"],
          ["ㄹ", "mobil, hotel", "물 (air)"],
          ["ㅁ", "malam", "밤 (malam)"],
          ["ㅂ", "siap, atap", "밥 (nasi)"],
          ["ㅇ", "uang, bang", "방 (kamar)"],
        ]),
        p(
          "Kita belajar dengan urutan dari yang termudah: ㄴ ㅁ ㅇ di pelajaran ini, lalu ㄹ, lalu ㄱ ㅂ ㄷ, dan terakhir huruf-huruf lain yang dibaca dengan salah satu dari tujuh bunyi ini.",
        ),
        heading("ㄴ ㅁ ㅇ: bunyi sengau", 3),
        letters(
          "Tiga batchim sengau",
          [
            {
              character: "ㄴ",
              name: "니은",
              cue: "-n seperti di akhir 'makan'",
              say: "안",
              note: "Ujung lidah menempel di belakang gigi atas.",
              example: { word: "산", meaning: "gunung", romanization: "san" },
            },
            {
              character: "ㅁ",
              name: "미음",
              cue: "-m seperti di akhir 'malam'",
              say: "암",
              note: "Bibir menutup rapat.",
              example: { word: "밤", meaning: "malam", romanization: "bam" },
            },
            {
              character: "ㅇ",
              name: "이응",
              cue: "-ng seperti di akhir 'uang'",
              say: "앙",
              note: "Di atas, ㅇ diam. Di bawah, ㅇ dibaca ng.",
              example: { word: "방", meaning: "kamar", romanization: "bang" },
            },
          ],
          { showRomanization: false },
        ),
        callout(
          "tip",
          "ㅇ punya dua tugas. Di blok 앙, ㅇ di atas diam dan ㅇ di bawah dibaca ng. Jadi 앙 dibaca 'ang'.",
        ),
        callout(
          "warning",
          "Jangan tambahkan vokal setelah batchim. 산 adalah satu ketukan, 'san', bukan 'sa-ne'. Begitu sampai di batchim, berhentilah.",
        ),
        contrast(
          "n, m, atau ng?",
          "Putar setiap baris. Hanya bunyi akhirnya yang berbeda.",
          [
            {
              items: [
                { text: "반", meaning: "kelas; setengah", romanization: "ban" },
                { text: "밤", meaning: "malam", romanization: "bam" },
                { text: "방", meaning: "kamar", romanization: "bang" },
              ],
              note: "Lidah di depan (ㄴ), bibir menutup (ㅁ), pangkal lidah naik (ㅇ).",
            },
            {
              items: [
                { text: "산", meaning: "gunung", romanization: "san" },
                { text: "삼", meaning: "tiga", romanization: "sam" },
                {
                  text: "상",
                  meaning: "meja makan; hadiah",
                  romanization: "sang",
                },
              ],
            },
            {
              items: [
                { text: "간", meaning: "hati (organ)", romanization: "gan" },
                { text: "감", meaning: "kesemek", romanization: "gam" },
                { text: "강", meaning: "sungai", romanization: "gang" },
              ],
            },
          ],
          { showRomanization: false },
        ),
        syllableGrid(
          "Batchim ㄴ",
          ["ㅇ", "ㄱ", "ㄴ", "ㅅ", "ㅎ"],
          ["ㅏ", "ㅓ", "ㅗ", "ㅜ"],
          {
            final: "ㄴ",
          },
        ),
        syllableGrid(
          "Batchim ㅁ",
          ["ㅇ", "ㄱ", "ㄴ", "ㅅ", "ㅎ"],
          ["ㅏ", "ㅓ", "ㅗ", "ㅜ"],
          {
            final: "ㅁ",
          },
        ),
        syllableGrid(
          "Batchim ㅇ",
          ["ㅇ", "ㄱ", "ㄴ", "ㅅ", "ㅎ"],
          ["ㅏ", "ㅓ", "ㅗ", "ㅜ"],
          {
            final: "ㅇ",
          },
        ),
        heading("Kata yang sekarang bisa kamu baca", 3),
        table([
          ["Hangeul", "Arti"],
          ["엄마", "ibu (akrab)"],
          ["이름", "nama"],
          ["사람", "orang"],
          ["친구", "teman"],
          ["시간", "waktu"],
          ["사랑", "cinta"],
          ["영화", "film"],
          ["빵", "roti"],
          ["선생님", "guru (sapaan hormat)"],
          ["한강", "Sungai Han di Seoul"],
        ]),
        heading("Momen pertama: 안녕하세요", 3),
        p(
          "Masih ingat frasa yang kamu dengar di Modul 0? Waktu itu kamu hanya bisa mendengarnya. Sekarang coba baca sendiri, blok demi blok:",
        ),
        table([
          ["Blok", "Huruf"],
          ["안", "ㅇ (diam) + ㅏ + ㄴ"],
          ["녕", "ㄴ + ㅕ + ㅇ (ng)"],
          ["하", "ㅎ + ㅏ"],
          ["세", "ㅅ + ㅔ"],
          ["요", "ㅇ (diam) + ㅛ"],
        ]),
        listen(
          "안녕하세요",
          "안녕하세요",
          "안녕하세요 = Halo, apa kabar? (sopan)",
        ),
        p(
          "Kamu baru saja membaca 안녕하세요 tanpa bantuan! Dengan cara yang sama, kamu juga bisa membaca ",
          b("사랑해요"),
          " (aku sayang kamu): 사 + 랑 (ㄹ + ㅏ + ㅇ) + 해 + 요.",
        ),
        listen("사랑해요", "사랑해요", "사랑해요 = Aku sayang kamu."),
        p(
          "Frasa ketiga dari Modul 0, 감사합니다, punya satu rahasia bunyi. Kamu akan membukanya di Modul 8.",
        ),
        callout(
          "info",
          "Mengetik batchim itu mudah: ketik saja konsonannya setelah vokal. 산 = ㅅ ㅏ ㄴ. Keyboard menaruhnya di bawah secara otomatis.",
        ),
        game(
          "syllable-forge",
          "batchim",
          "Susun blok dengan batchim",
          "Susun blok tiga lantai: konsonan, vokal, lalu batchim.",
        ),
        callout(
          "success",
          "Ringkasnya: batchim adalah konsonan di bawah blok dan dibaca paling akhir. Hanya ada tujuh bunyi akhir. ㄴ = n (makan), ㅁ = m (malam), ㅇ = ng (uang). Kamu sudah bisa membaca 안녕하세요 dan 사랑해요!",
        ),
      ],
    },
    {
      type: "material",
      key: "m7-batchim-rieul",
      title: "Batchim ㄹ: l seperti di 'mobil'",
      description:
        "ㄹ di akhir suku kata dibaca l, bukan r. Ditambah ㄹㄹ yang dibaca l panjang.",
      minutes: 13,
      blocks: [
        heading("ㄹ punya dua wajah"),
        p(
          "Di Modul 2 kamu belajar bahwa ㄹ di awal suku kata dibaca seperti r yang diketuk sekali dengan ringan. Di posisi batchim, ㄹ berubah menjadi ",
          b("l"),
          ", seperti di akhir kata 'mobil' atau 'hotel'. Ujung lidah menempel di gusi belakang gigi atas, lalu diam di situ.",
        ),
        letters(
          "Dua bunyi ㄹ",
          [
            {
              character: "ㄹ",
              name: "리을",
              cue: "di awal: r ringan, satu ketukan, tidak digetarkan",
              say: "라",
              example: {
                word: "나라",
                meaning: "negara",
                romanization: "nara",
              },
            },
            {
              character: "ㄹ",
              name: "리을",
              cue: "di bawah: l seperti di akhir 'mobil'",
              say: "알",
              note: "Jangan menggetarkan lidah dan jangan menambah vokal.",
              example: { word: "물", meaning: "air", romanization: "mul" },
            },
          ],
          { showRomanization: false },
        ),
        syllableGrid(
          "Batchim ㄹ",
          ["ㅇ", "ㄱ", "ㄷ", "ㅁ", "ㅂ", "ㅅ"],
          ["ㅏ", "ㅓ", "ㅗ", "ㅜ", "ㅣ"],
          { final: "ㄹ" },
        ),
        table([
          ["Hangeul", "Arti"],
          ["물", "air"],
          ["말", "kata, bahasa; kuda"],
          ["일", "pekerjaan; satu"],
          ["길", "jalan"],
          ["발", "kaki (telapak)"],
          ["달", "bulan"],
          ["별", "bintang"],
          ["딸", "anak perempuan"],
          ["서울", "Seoul"],
          ["오늘", "hari ini"],
          ["얼굴", "wajah"],
          ["겨울", "musim dingin"],
          ["아이돌", "idola K-pop"],
          ["할머니", "nenek"],
        ]),
        heading("ㄹ + ㄹ = l panjang", 3),
        p(
          "Kalau batchim ㄹ bertemu ㄹ di awal suku kata berikutnya, lidah tetap menempel dan bunyinya menjadi ",
          b("l panjang"),
          ". 빨리 (cepat) dibaca 'ppal-li', bukan 'ppa-ri'.",
        ),
        bullet(b("빨리"), ": cepat"),
        bullet(b("몰라요"), ": saya tidak tahu"),
        bullet(b("달러"), ": dolar"),
        bullet(
          b("발리"),
          ": Bali. Ingat di Modul 6? Sekarang kamu bisa membacanya.",
        ),
        contrast(
          "Di akhir l, di tengah r",
          "Putar setiap baris. Dengarkan bedanya ㄹ di bawah dan ㄹ di awal suku kata.",
          [
            {
              items: [
                { text: "달", meaning: "bulan" },
                { text: "다리", meaning: "kaki; jembatan" },
              ],
              note: "달: lidah menempel (l). 다리: lidah mengetuk sekali (r ringan).",
            },
            {
              items: [
                { text: "일", meaning: "pekerjaan; satu" },
                { text: "이리", meaning: "ke sini" },
              ],
            },
            {
              items: [
                { text: "불", meaning: "api" },
                { text: "풀", meaning: "rumput; lem" },
                { text: "뿔", meaning: "tanduk" },
              ],
              note: "Ulasan tiga serangkai: polos, aspirasi, tegang, sekarang dengan batchim.",
            },
            {
              items: [
                { text: "달", meaning: "bulan" },
                { text: "탈", meaning: "topeng" },
                { text: "딸", meaning: "anak perempuan" },
              ],
            },
          ],
          { showRomanization: false },
        ),
        heading("Kalimat pertama dengan batchim", 3),
        table([
          ["Hangeul", "Arti"],
          ["물 주세요.", "Tolong beri air."],
          ["오늘 추워요.", "Hari ini dingin."],
          ["빨리 와요!", "Cepat datang!"],
        ]),
        listen("물 주세요.", "물 주세요.", "물 주세요. = Tolong beri air."),
        game(
          "word-builder",
          "batchim",
          "Susun kata dengan batchim",
          "Susun 서울, 오늘, 얼굴, dan kata lain dari huruf-hurufnya.",
        ),
        callout(
          "success",
          "Ringkasnya: ㄹ di awal suku kata = r ringan yang diketuk sekali; ㄹ di bawah = l seperti di 'mobil'. ㄹ bertemu ㄹ = l panjang (빨리, 발리).",
        ),
      ],
    },
    {
      type: "material",
      key: "m7-batchim-stops",
      title: "ㄱ ㅂ ㄷ: tutup, jangan meledak",
      description:
        "Tiga batchim letup yang ditahan tanpa hembusan, seperti akhir 'musik', 'siap', dan 'surat'.",
      minutes: 15,
      blocks: [
        heading("Tutup mulut, lalu diam"),
        p(
          "ㄱ, ㅂ, dan ㄷ di posisi batchim tidak 'meledak'. Mulutmu menutup jalan udara, lalu ",
          b("diam di situ"),
          ": tidak ada hembusan, tidak ada vokal tambahan. Kabar baiknya, orang Indonesia sudah melakukan ini. Coba ucapkan 'siap' pelan-pelan: bibirmu menutup di akhir dan tidak dibuka lagi. Itulah batchim ㅂ.",
        ),
        letters(
          "Tiga batchim letup",
          [
            {
              character: "ㄱ",
              name: "기역",
              cue: "-k seperti di akhir 'musik': pangkal lidah menutup, lalu diam",
              say: "악",
              example: { word: "책", meaning: "buku", romanization: "chaek" },
            },
            {
              character: "ㅂ",
              name: "비읍",
              cue: "-p seperti di akhir 'siap': bibir menutup, lalu diam",
              say: "압",
              example: {
                word: "밥",
                meaning: "nasi; makanan",
                romanization: "bap",
              },
            },
            {
              character: "ㄷ",
              name: "디귿",
              cue: "-t seperti di akhir 'surat': ujung lidah menempel, lalu diam",
              say: "곧",
              note: "Jarang ditulis ㄷ. Bunyi ini lebih sering datang dari ㅅ, ㅈ, dan teman-temannya (pelajaran berikutnya).",
              example: {
                word: "받침",
                meaning: "batchim",
                romanization: "batchim",
              },
            },
          ],
          { showRomanization: false },
        ),
        callout(
          "tip",
          "Banyak orang Indonesia mengucapkan k di akhir 'tidak' atau 'bapak' sebagai hentian di tenggorokan. Untuk batchim ㄱ, pastikan pangkal lidah benar-benar naik dan menutup, seperti di akhir 'musik' atau 'plastik'.",
        ),
        callout(
          "warning",
          "Jangan meledak! 책 bukan 'chae-keu', 밥 bukan 'ba-beu'. Kata serapan seperti 케이크 menulis ㅡ secara jelas (크); batchim asli tidak pernah punya vokal tambahan.",
        ),
        syllableGrid(
          "Batchim ㄱ",
          ["ㄱ", "ㄴ", "ㅂ", "ㅅ", "ㅈ"],
          ["ㅏ", "ㅓ", "ㅗ", "ㅜ", "ㅣ"],
          { final: "ㄱ" },
        ),
        syllableGrid(
          "Batchim ㅂ",
          ["ㄱ", "ㄴ", "ㅂ", "ㅅ", "ㅈ"],
          ["ㅏ", "ㅓ", "ㅗ", "ㅜ", "ㅣ"],
          { final: "ㅂ" },
        ),
        contrast(
          "Tujuh akhir, satu per satu",
          "Putar setiap baris. Bedanya hanya di akhir suku kata.",
          [
            {
              items: [
                { text: "밥", meaning: "nasi" },
                { text: "밤", meaning: "malam" },
                { text: "방", meaning: "kamar" },
              ],
              note: "ㅂ dan ㅁ sama-sama menutup bibir; ㅁ mengalirkan udara lewat hidung.",
            },
            {
              items: [
                { text: "약", meaning: "obat" },
                { text: "양", meaning: "domba" },
              ],
              note: "ㄱ dan ㅇ sama-sama di pangkal lidah; ㅇ mengalirkan udara lewat hidung.",
            },
            {
              items: [
                { text: "집", meaning: "rumah" },
                { text: "짐", meaning: "barang bawaan" },
              ],
            },
            {
              items: [
                { text: "입", meaning: "mulut" },
                { text: "일", meaning: "pekerjaan; satu" },
                { text: "이", meaning: "gigi; dua" },
              ],
            },
          ],
          { showRomanization: false },
        ),
        heading("Kata dengan ㄱ ㅂ ㄷ", 3),
        table([
          ["Hangeul", "Arti"],
          ["책", "buku"],
          ["약", "obat"],
          ["국", "sup"],
          ["떡", "kue beras"],
          ["수박", "semangka"],
          ["한국", "Korea"],
          ["대박", "mantap! luar biasa!"],
          ["밥", "nasi; makanan"],
          ["집", "rumah"],
          ["입", "mulut"],
          ["십", "sepuluh"],
          ["수업", "pelajaran, kelas"],
          ["곧", "segera"],
        ]),
        callout(
          "info",
          "Kamu mungkin menemukan kata seperti 학교 (sekolah) dan 학생 (siswa). Bacalah per blok dulu. Saat diucapkan cepat, konsonan setelah ㄱ ㅂ ㄷ terdengar lebih tegang: 학교 terdengar [학꾜]. Penjelasannya ada di Modul 8.",
        ),
        game(
          "syllable-forge",
          "batchim",
          "Susun blok dengan ㄱ ㅂ ㄷ",
          "Latih blok yang ditutup tanpa meledak.",
        ),
        callout(
          "success",
          "Ringkasnya: batchim ㄱ ㅂ ㄷ ditutup lalu diam, tanpa hembusan dan tanpa vokal tambahan, seperti akhir 'musik', 'siap', dan 'surat'.",
        ),
      ],
    },
    {
      type: "material",
      key: "m7-many-letters-one-sound",
      title: "Banyak huruf, satu bunyi",
      description:
        "ㅋ ㄲ dibaca [ㄱ], ㅍ dibaca [ㅂ], dan ㅅ ㅆ ㅈ ㅊ ㅌ ㅎ dibaca [ㄷ] di posisi batchim. Ditutup dengan kosakata batchim.",
      minutes: 15,
      blocks: [
        heading("Tujuh bunyi, banyak ejaan"),
        p(
          "Hampir semua konsonan boleh ditulis sebagai batchim. Tetapi karena hanya ada tujuh bunyi akhir, huruf-huruf lain ",
          b("dibaca seperti salah satu dari tujuh bunyi itu"),
          ". Kuncinya, kelompokkan menurut tempat mulut menutup:",
        ),
        table([
          ["Dibaca", "Ditulis dengan", "Contoh"],
          ["[ㄱ]", "ㄱ ㅋ ㄲ", "부엌 (dapur) [부억], 밖 (luar) [박]"],
          [
            "[ㄷ]",
            "ㄷ ㅅ ㅆ ㅈ ㅊ ㅌ ㅎ",
            "옷 (baju) [옫], 낮 (siang) [낟], 꽃 (bunga) [꼳], 밭 (ladang) [받]",
          ],
          ["[ㅂ]", "ㅂ ㅍ", "앞 (depan) [압], 옆 (samping) [엽]"],
          ["[ㄴ] [ㄹ] [ㅁ] [ㅇ]", "huruf itu sendiri", "산, 물, 밤, 방"],
        ]),
        callout(
          "tip",
          "Cara mengingat: semua huruf yang dibuat di ujung lidah atau gigi (ㅅ ㅆ ㅈ ㅊ ㅌ, ditambah ㅎ) berakhir dengan ujung lidah menempel, jadi dibaca [ㄷ]. Keluarga ㄱ menjadi [ㄱ], keluarga ㅂ menjadi [ㅂ].",
        ),
        contrast(
          "Ejaan berbeda, bunyi sama",
          "Putar setiap baris. Kata dalam satu baris terdengar sama ketika berdiri sendiri.",
          [
            {
              items: [
                { text: "낫", meaning: "sabit · dibaca [낟]" },
                { text: "낮", meaning: "siang · dibaca [낟]" },
                { text: "낯", meaning: "muka, raut · dibaca [낟]" },
              ],
              note: "ㅅ, ㅈ, ㅊ di bawah semuanya dibaca [ㄷ].",
            },
            {
              items: [
                { text: "입", meaning: "mulut · dibaca [입]" },
                { text: "잎", meaning: "daun · dibaca [입]" },
              ],
              note: "ㅍ di bawah dibaca [ㅂ].",
            },
            {
              items: [
                { text: "박", meaning: "labu · dibaca [박]" },
                { text: "밖", meaning: "luar · dibaca [박]" },
              ],
              note: "ㄲ di bawah dibaca [ㄱ].",
            },
            {
              items: [
                { text: "곧", meaning: "segera · dibaca [곧]" },
                { text: "곳", meaning: "tempat · dibaca [곧]" },
              ],
            },
          ],
          { showRomanization: false },
        ),
        heading("Latihan membaca", 3),
        table([
          ["Ditulis", "Dibaca", "Arti"],
          ["부엌", "[부억]", "dapur"],
          ["밖", "[박]", "luar"],
          ["앞", "[압]", "depan"],
          ["옆", "[엽]", "samping"],
          ["숲", "[숩]", "hutan"],
          ["옷", "[옫]", "baju, pakaian"],
          ["꽃", "[꼳]", "bunga"],
          ["밭", "[받]", "ladang"],
          ["낮", "[낟]", "siang"],
        ]),
        heading("Lalu kenapa ejaannya dibedakan?", 3),
        p(
          "Karena huruf aslinya ",
          b("muncul kembali"),
          " ketika setelahnya ada vokal. Ingat, ㅇ di awal blok itu kosong, jadi batchim boleh 'pindah' ke situ:",
        ),
        bullet(b("옷"), " [옫] → 옷이 [오시]: ㅅ yang asli terdengar lagi."),
        bullet(b("꽃"), " [꼳] → 꽃이 [꼬치]: ㅊ yang asli terdengar lagi."),
        bullet(b("앞"), " [압] → 앞에 [아페]: ㅍ yang asli terdengar lagi."),
        p(
          "Perpindahan ini disebut 연음 dan menjadi pelajaran pertama di Modul 8. Untuk sekarang, cukup ingat: ",
          b("ejaan menyimpan huruf aslinya"),
          ".",
        ),
        callout(
          "info",
          "Batchim ㅎ jarang berdiri sendiri di akhir kata. Ia biasanya muncul di kata kerja seperti 좋다 (baik) dan langsung memengaruhi huruf berikutnya. Itu juga bagian dari Modul 8.",
        ),
        heading("Kosakata batchim", 3),
        p(
          "Set ini berisi kata penting untuk bekerja di Korea dan kata favorit penggemar K-pop. Semuanya memakai batchim yang baru kamu pelajari. Latih sampai semua kartu selesai.",
        ),
        vocabularyRef("m7-vocab-batchim"),
        game(
          "word-builder",
          "batchim",
          "Susun kata batchim",
          "Susun 한국, 사랑, 선생님, dan kata lain dari huruf-hurufnya.",
        ),
        callout(
          "success",
          "Ringkasnya: di posisi batchim hanya ada tujuh bunyi. ㅋ ㄲ → [ㄱ]; ㅍ → [ㅂ]; ㅅ ㅆ ㅈ ㅊ ㅌ ㅎ → [ㄷ]; ㄴ ㄹ ㅁ ㅇ tetap. Ejaan menyimpan huruf aslinya, yang terdengar lagi saat diikuti vokal.",
        ),
      ],
    },
    {
      type: "vocabulary",
      key: "m7-vocab-batchim",
      title: "Kosakata batchim: kerja dan K-pop",
      description:
        "30 kata dengan batchim: kata dasar EPS-TOPIK, kata sehari-hari, dan kata favorit penggemar K-pop.",
      entries: [
        { term: "한국", definition: "Korea", romanization: "hanguk" },
        {
          term: "한국어",
          definition: "bahasa Korea",
          romanization: "hangugeo",
          examples: [
            "Dibaca [한구거]: ㄱ pindah ke blok berikutnya (Modul 8).",
          ],
        },
        {
          term: "안녕하세요",
          definition: "halo, apa kabar (sopan)",
          romanization: "annyeonghaseyo",
        },
        { term: "사랑", definition: "cinta", romanization: "sarang" },
        {
          term: "사랑해요",
          definition: "aku sayang kamu",
          romanization: "saranghaeyo",
        },
        { term: "이름", definition: "nama", romanization: "ireum" },
        { term: "사람", definition: "orang", romanization: "saram" },
        { term: "친구", definition: "teman", romanization: "chingu" },
        {
          term: "선생님",
          definition: "guru (sapaan hormat)",
          romanization: "seonsaengnim",
        },
        {
          term: "학생",
          definition: "siswa, pelajar",
          romanization: "haksaeng",
          examples: ["Dibaca [학쌩]."],
        },
        {
          term: "학교",
          definition: "sekolah",
          romanization: "hakgyo",
          examples: ["Dibaca [학꾜]."],
        },
        { term: "책", definition: "buku", romanization: "chaek" },
        { term: "집", definition: "rumah", romanization: "jip" },
        { term: "밥", definition: "nasi; makanan", romanization: "bap" },
        {
          term: "물",
          definition: "air",
          romanization: "mul",
          examples: ["물 주세요. = Tolong beri air."],
        },
        { term: "빵", definition: "roti", romanization: "ppang" },
        { term: "음식", definition: "makanan", romanization: "eumsik" },
        { term: "시간", definition: "waktu", romanization: "sigan" },
        { term: "일", definition: "pekerjaan; satu", romanization: "il" },
        { term: "공장", definition: "pabrik", romanization: "gongjang" },
        { term: "월급", definition: "gaji bulanan", romanization: "wolgeup" },
        {
          term: "사장님",
          definition: "bos, pemilik usaha (sapaan hormat)",
          romanization: "sajangnim",
        },
        { term: "병원", definition: "rumah sakit", romanization: "byeongwon" },
        {
          term: "옷",
          definition: "baju, pakaian",
          romanization: "ot",
          examples: ["Dibaca [옫]."],
        },
        {
          term: "꽃",
          definition: "bunga",
          romanization: "kkot",
          examples: ["Dibaca [꼳]."],
        },
        {
          term: "앞",
          definition: "depan",
          romanization: "ap",
          examples: ["Dibaca [압]."],
        },
        {
          term: "대박",
          definition: "mantap! luar biasa!",
          romanization: "daebak",
        },
        { term: "팬", definition: "penggemar (fan)", romanization: "paen" },
        { term: "아이돌", definition: "idola K-pop", romanization: "aidol" },
        {
          term: "화이팅",
          definition: "semangat! (seruan penyemangat)",
          romanization: "hwaiting",
          examples: [
            "Ejaan bakunya 파이팅, tetapi 화이팅 sangat umum dipakai.",
          ],
        },
      ],
    },
    {
      type: "assessment",
      key: "m7-quiz",
      title: "Kuis Modul 7: batchim",
      description:
        "16 soal tentang tujuh bunyi batchim, ditambah ulasan modul sebelumnya.",
      instructions:
        "Pilih satu jawaban untuk setiap soal. Untuk soal dengar, putar audionya sebanyak yang kamu perlukan. Nilai lulus 80%.",
      passingScore: 80,
      shuffleOptions: true,
      questions: [
        choice(
          "m7-quiz-which-has-batchim",
          "Blok mana yang punya batchim?",
          "강",
          ["가", "고", "과"],
          "강 punya ㅇ di bagian bawah, jadi dibaca 'gang'. 가, 고, dan 과 berakhir dengan vokal.",
        ),
        choice(
          "m7-quiz-hear-ban",
          hear("반"),
          "반",
          ["밤", "방", "밥"],
          "반 (kelas; setengah) berakhir dengan ㄴ: ujung lidah menempel di belakang gigi atas.",
        ),
        choice(
          "m7-quiz-hear-sang",
          hear("상"),
          "상",
          ["산", "삼", "삽"],
          "상 berakhir dengan ㅇ, bunyi ng seperti di 'uang'. 산 berakhir n, 삼 berakhir m.",
        ),
        choice(
          "m7-quiz-rieul-final",
          "Bagaimana ㄹ dibaca di posisi batchim, misalnya di 물?",
          "seperti l di akhir 'mobil'",
          [
            "seperti r yang digetarkan di 'roda'",
            "tidak dibaca sama sekali",
            "seperti n di akhir 'makan'",
          ],
          "ㄹ di bawah dibaca l: ujung lidah menempel dan diam. Di awal suku kata, ㄹ adalah r ringan yang diketuk sekali, tidak digetarkan.",
        ),
        choice(
          "m7-quiz-stops-no-release",
          "Apa yang benar tentang batchim ㄱ, ㅂ, ㄷ?",
          "mulut menutup lalu diam, tanpa hembusan dan tanpa vokal tambahan",
          [
            "diucapkan dengan hembusan kuat seperti ㅋ ㅍ ㅌ",
            "selalu ditambah bunyi ㅡ di belakangnya",
            "tidak dibaca kalau ada di akhir kata",
          ],
          "Batchim letup ditahan, seperti akhir 'musik', 'siap', dan 'surat'. 책 bukan 'chae-keu'.",
        ),
        choice(
          "m7-quiz-read-chaek",
          "Apa arti 책?",
          "buku",
          ["rumah", "nasi", "air"],
          "책 = buku. Rumah = 집, nasi = 밥, air = 물.",
        ),
        choice(
          "m7-quiz-read-seonsaengnim",
          "Apa arti 선생님?",
          "guru",
          ["siswa", "bos", "dokter"],
          "선생님 = guru (sapaan hormat). Siswa = 학생, bos = 사장님, dokter = 의사.",
        ),
        choice(
          "m7-quiz-ot-sound",
          "Bagaimana 옷 (baju) dibaca kalau berdiri sendiri?",
          "[옫]",
          ["[오스]", "[옷으]", "[오]"],
          "ㅅ di posisi batchim dibaca [ㄷ], jadi 옷 dibaca [옫]. Tidak ada vokal tambahan.",
        ),
        choice(
          "m7-quiz-k-sound",
          "Kata mana yang batchimnya dibaca [ㄱ]?",
          "밖",
          ["밥", "밭", "반"],
          "ㄲ di bawah dibaca [ㄱ], jadi 밖 (luar) dibaca [박]. 밥 berakhir [ㅂ], 밭 berakhir [ㄷ], 반 berakhir [ㄴ].",
        ),
        choice(
          "m7-review-type-ui",
          "Ulasan Modul 6. Bagaimana mengetik ㅢ di keyboard 2-beolsik?",
          "ㅡ lalu ㅣ",
          ["ㅜ lalu ㅣ", "ㅣ lalu ㅡ", "Shift + ㅡ"],
          "Vokal gabungan diketik sebagai dua vokal sesuai urutan: ㅢ = ㅡ + ㅣ. ㅜ lalu ㅣ menghasilkan ㅟ.",
        ),
        choice(
          "m7-quiz-nat-homophones",
          "낫 (sabit), 낮 (siang), dan 낯 (muka) terdengar sama ketika berdiri sendiri. Kenapa?",
          "ㅅ, ㅈ, dan ㅊ di posisi batchim semuanya dibaca [ㄷ]",
          [
            "ketiganya sebenarnya ditulis dengan huruf yang sama",
            "batchim tidak pernah dibaca",
            "ketiganya dibaca dengan bunyi n",
          ],
          "Di akhir suku kata hanya ada tujuh bunyi. ㅅ ㅆ ㅈ ㅊ ㅌ ㅎ semuanya dibaca [ㄷ], jadi ketiganya dibaca [낟].",
        ),
        choice(
          "m7-quiz-build-han",
          "Blok mana yang tersusun dari ㅎ + ㅏ + ㄴ?",
          "한",
          ["항", "함", "학"],
          "ㅎ di kiri atas, ㅏ di kanan, ㄴ di bawah: 한, seperti di 한국 (Korea).",
        ),
        choice(
          "m7-review-hear-gwaja",
          hear(
            "과자",
            "Ulasan Modul 5. Dengarkan, lalu pilih kata yang kamu dengar.",
          ),
          "과자",
          ["가자", "거자", "구자"],
          "과자 (camilan) memakai ㅘ: bibir membulat sebentar, lalu terbuka ke ㅏ.",
        ),
        choice(
          "m7-review-hear-jjada",
          hear(
            "짜다",
            "Ulasan Modul 4. Dengarkan, lalu pilih kata yang kamu dengar.",
          ),
          "짜다",
          ["자다", "차다", "싸다"],
          "짜다 (asin) diawali ㅉ yang tegang tanpa hembusan. 차다 diawali ㅊ dengan hembusan, 자다 dengan ㅈ polos.",
        ),
        choice(
          "m7-review-read-gomawoyo",
          "Ulasan Modul 5. Apa arti 고마워요?",
          "terima kasih",
          ["maaf", "selamat datang", "sampai jumpa"],
          "고마워요 = terima kasih (sopan, akrab).",
        ),
        choice(
          "m7-review-jeohui",
          "Ulasan Modul 5. Bagaimana 저희 (kami) dibaca?",
          "[저히]",
          ["[저후이]", "[저흐]", "[저헤]"],
          "ㅢ setelah konsonan dibaca ㅣ saja, jadi 저희 dibaca [저히].",
        ),
      ],
    },
  ],
};
