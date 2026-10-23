import {
  audioClip,
  b,
  callout,
  contrast,
  game,
  heading,
  i,
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

const hear = (text: string) => [
  p("Dengarkan, lalu pilih kata yang kamu dengar."),
  listen(text),
];

export const m5WVowels: ModuleContent = {
  key: "m5-w-vowels",
  title: "Vokal W",
  description:
    "Vokal gabungan ㅘ ㅝ ㅙ ㅞ ㅚ ㅟ ㅢ: dua vokal yang dibaca cepat menjadi satu bunyi. Setelah modul ini kamu sudah mengenal semua vokal Hangeul.",
  items: [
    {
      type: "material",
      key: "m5-wa-wo-wae-we",
      title: "ㅘ ㅝ ㅙ ㅞ: dua vokal jadi satu",
      description:
        "Gabungan ㅗ dan ㅜ dengan vokal lain menghasilkan bunyi wa, w + ㅓ, dan we.",
      minutes: 15,
      blocks: [
        heading("Vokal yang dibangun dari dua vokal"),
        p(
          "Kamu sudah kenal ㅗ dan ㅜ. Kalau ㅗ atau ㅜ diucapkan cepat lalu langsung disambung vokal lain, bibir yang tadinya bulat membuka dan terdengar bunyi ",
          b("w"),
          ". Itulah vokal W. Bentuknya pun gabungan dua huruf yang sudah kamu kenal, jadi tidak ada bentuk baru yang perlu dihafal.",
        ),
        table([
          ["Gabungan", "Hasil", "Bunyi"],
          ["ㅗ + ㅏ", "ㅘ", "wa"],
          ["ㅗ + ㅐ", "ㅙ", "we (e taling)"],
          ["ㅜ + ㅓ", "ㅝ", "w + ㅓ"],
          ["ㅜ + ㅔ", "ㅞ", "we (e taling)"],
        ]),
        callout(
          "tip",
          "Pola pasangannya: ",
          b("ㅗ"),
          " berpasangan dengan ㅏ dan ㅐ (garis pendeknya sama-sama ke atas atau ke kanan), ",
          b("ㅜ"),
          " berpasangan dengan ㅓ dan ㅔ (garis pendeknya ke bawah atau ke kiri). Karena itu tidak ada gabungan ㅗ + ㅓ atau ㅜ + ㅏ.",
        ),
        heading("Kenali bunyinya", 3),
        letters(
          "Vokal W bagian 1",
          [
            {
              character: "ㅘ",
              cue: "wa, seperti di 'wajah'",
              romanization: "wa",
              say: "와",
              note: "Bibir mulai bulat (ㅗ), lalu cepat terbuka ke ㅏ.",
              example: { word: "사과", meaning: "apel", romanization: "sagwa" },
            },
            {
              character: "ㅝ",
              cue: "w lalu ㅓ: bibir bulat dulu, lalu buka ke ㅓ yang tidak bulat",
              romanization: "wo",
              say: "워",
              note: "Bukan 'wo' dengan o bulat. Akhirnya adalah ㅓ, rahang turun dan bibir tidak bulat.",
              example: {
                word: "뭐",
                meaning: "apa (santai)",
                romanization: "mwo",
              },
            },
            {
              character: "ㅙ",
              cue: "we, e taling seperti di 'sate'",
              romanization: "wae",
              say: "왜",
              note: "Bunyinya sama dengan ㅞ dan ㅚ. Bedanya hanya ejaan.",
              example: { word: "왜", meaning: "kenapa", romanization: "wae" },
            },
            {
              character: "ㅞ",
              cue: "we, sama dengan ㅙ",
              romanization: "we",
              say: "웨",
              note: "Paling jarang dipakai. Banyak muncul di kata serapan.",
              example: {
                word: "스웨터",
                meaning: "sweter",
                romanization: "seuweteo",
              },
            },
          ],
          { showRomanization: false },
        ),
        heading("Bentuk bloknya", 3),
        p(
          "Vokal W memakai dua tempat sekaligus: bagian ㅗ atau ㅜ ditulis di bawah konsonan, bagian ㅏ ㅓ ㅐ ㅔ di sebelah kanannya. Konsonan tetap di pojok kiri atas. Lihat 과: ㄱ di kiri atas, ㅗ di bawahnya, ㅏ di kanan.",
        ),
        syllableGrid(
          "Baca baris demi baris",
          ["ㅇ", "ㄱ", "ㄷ", "ㅁ", "ㅅ", "ㅎ"],
          ["ㅘ", "ㅝ", "ㅙ", "ㅞ"],
        ),
        heading("Kata yang sudah bisa kamu baca", 3),
        table([
          ["Hangeul", "Arti"],
          ["사과", "apel"],
          ["과자", "camilan, kue kering"],
          ["뭐", "apa (santai)"],
          ["왜", "kenapa"],
          ["와", "wah!"],
          ["돼지", "babi"],
          ["샤워", "mandi (pancuran)"],
          ["스웨터", "sweter"],
          ["고마워요", "terima kasih (sopan, akrab)"],
          ["추워요", "dingin (cuaca)"],
          ["더워요", "panas (cuaca)"],
        ]),
        p(
          "Perhatikan 고마워요, 추워요, dan 더워요. Ketiganya berakhir dengan ",
          b("워요"),
          ": banyak kata sifat Korea berbentuk seperti ini saat diucapkan dengan sopan.",
        ),
        contrast(
          "Ada W atau tidak?",
          "Putar setiap kata. Dengarkan bibir yang membulat sebentar sebelum vokal kedua.",
          [
            {
              items: [
                { text: "사과", meaning: "apel", romanization: "sagwa" },
                { text: "사고", meaning: "kecelakaan", romanization: "sago" },
              ],
              note: "Satu huruf ㅏ kecil di kanan mengubah 'apel' menjadi 'kecelakaan'.",
            },
            {
              items: [
                { text: "와", meaning: "wah!", romanization: "wa" },
                { text: "워", meaning: "(w + ㅓ)", romanization: "wo" },
              ],
              note: "ㅘ berakhir dengan ㅏ yang terbuka lebar, ㅝ berakhir dengan ㅓ.",
            },
            {
              items: [
                { text: "뭐", meaning: "apa", romanization: "mwo" },
                { text: "모", meaning: "(suku kata mo)", romanization: "mo" },
                {
                  text: "머",
                  meaning: "(suku kata ㅁ + ㅓ)",
                  romanization: "meo",
                },
              ],
              note: "뭐 dimulai bulat seperti 모, tetapi berakhir terbuka seperti 머.",
            },
          ],
          { showRomanization: false },
        ),
        callout(
          "warning",
          "Romanisasi ㅝ ditulis ",
          i("wo"),
          ", dan orang Indonesia cenderung membacanya 'wo' dengan o bulat. Ingat: ujungnya ㅓ, bukan ㅗ. Percayai audio, bukan huruf Latinnya.",
        ),
        game(
          "syllable-forge",
          "w-vowels",
          "Susun blok dengan vokal W",
          "Gabungkan konsonan dengan ㅘ ㅝ ㅙ ㅞ sampai tanganmu hafal letaknya.",
        ),
        callout(
          "success",
          "Ringkasnya: ㅗ + ㅏ = ㅘ (wa), ㅜ + ㅓ = ㅝ (w + ㅓ), ㅗ + ㅐ = ㅙ dan ㅜ + ㅔ = ㅞ (keduanya we). ㅗ berpasangan dengan ㅏ ㅐ, ㅜ dengan ㅓ ㅔ.",
        ),
      ],
    },
    {
      type: "material",
      key: "m5-oe-wi-ui",
      title: "ㅚ ㅟ ㅢ: tambah ㅣ",
      description:
        "ㅚ dibaca we, ㅟ dibaca wi, dan ㅢ punya tiga cara baca sesuai posisinya.",
      minutes: 16,
      blocks: [
        heading("Tiga vokal yang diakhiri ㅣ"),
        p(
          "Tiga vokal terakhir dibuat dengan menambahkan ",
          b("ㅣ"),
          " di kanan ㅗ, ㅜ, dan ㅡ.",
        ),
        table([
          ["Gabungan", "Hasil", "Bunyi"],
          ["ㅗ + ㅣ", "ㅚ", "we (sama dengan ㅙ ㅞ)"],
          ["ㅜ + ㅣ", "ㅟ", "wi, seperti di 'wisata'"],
          ["ㅡ + ㅣ", "ㅢ", "ㅡ cepat ke ㅣ, atau ㅣ saja (lihat di bawah)"],
        ]),
        letters(
          "Vokal W bagian 2",
          [
            {
              character: "ㅚ",
              cue: "we, e taling seperti di 'sate'",
              romanization: "oe",
              say: "외",
              note: "Bentuknya ㅗ + ㅣ, tetapi hampir semua orang Korea sekarang membacanya 'we'.",
              example: {
                word: "회사",
                meaning: "perusahaan",
                romanization: "hoesa",
              },
            },
            {
              character: "ㅟ",
              cue: "wi, seperti di 'wisata'",
              romanization: "wi",
              say: "위",
              note: "Bibir bulat sebentar, lalu ke ㅣ.",
              example: {
                word: "가위",
                meaning: "gunting",
                romanization: "gawi",
              },
            },
            {
              character: "ㅢ",
              cue: "ㅡ (bibir datar) yang cepat meluncur ke ㅣ",
              romanization: "ui",
              say: "의",
              note: "Cara bacanya berubah sesuai posisi. Lihat aturan di bawah.",
              example: {
                word: "의사",
                meaning: "dokter",
                romanization: "uisa",
              },
            },
          ],
          { showRomanization: false },
        ),
        heading("Tiga ejaan, satu bunyi we", 3),
        p(
          "ㅙ, ㅞ, dan ㅚ ditulis berbeda, tetapi dalam bahasa Korea sehari-hari ketiganya terdengar sama: ",
          b("we"),
          ". Sama seperti ㅐ dan ㅔ di Modul 3, kamu cukup menghafal ejaan tiap kata. Orang Korea sendiri pun kadang salah tulis antara 돼 dan 되.",
        ),
        contrast(
          "Dengarkan: bunyinya sama",
          "Putar ketiganya. Telingamu tidak perlu membedakannya; matamu yang membedakan ejaan.",
          [
            {
              items: [
                { text: "왜", meaning: "kenapa (ㅙ)" },
                { text: "웨이터", meaning: "pelayan (ㅞ)" },
                { text: "외모", meaning: "penampilan (ㅚ)" },
              ],
              note: "Suku kata pertama ketiga kata ini sama-sama dibaca 'we'.",
            },
            {
              items: [
                { text: "위", meaning: "atas" },
                { text: "이", meaning: "gigi; dua" },
              ],
              note: "ㅟ diawali bibir bulat, ㅣ tidak.",
            },
            {
              items: [
                { text: "의자", meaning: "kursi" },
                { text: "이자", meaning: "bunga (uang)" },
              ],
              note: "Di awal kata, ㅢ dimulai dengan ㅡ yang singkat.",
            },
          ],
          { showRomanization: false },
        ),
        heading("ㅢ dibaca tiga cara", 3),
        p(
          "ㅢ adalah satu-satunya vokal yang bacaannya berubah menurut posisi. Hafalkan tiga aturan pendek ini:",
        ),
        table([
          ["Posisi", "Dibaca", "Contoh"],
          [
            "Di awal kata, tanpa konsonan",
            "의 (ㅡ cepat ke ㅣ)",
            "의사 [의사], 의자 [의자]",
          ],
          ["Setelah konsonan", "ㅣ saja", "저희 [저히], 무늬 [무니]"],
          [
            "Sebagai partikel 'punya' (의)",
            "biasanya [에]",
            "나의 [나에], 아이의 [아이에]",
          ],
        ]),
        p(
          "Ada satu kelonggaran lagi: kalau ㅢ tanpa konsonan ada di suku kata selain yang pertama, boleh dibaca [이]. Contohnya 회의 (rapat) boleh dibaca [회의] atau [회이].",
        ),
        callout(
          "info",
          "Tidak perlu menghafal semua kasus sekarang. Pegang saja ini: di awal kata baca 의, setelah konsonan baca 이. Partikel 'punya' akan kamu temui lagi saat belajar tata bahasa.",
        ),
        heading("Latihan membaca", 3),
        syllableGrid(
          "ㅚ dan ㅟ dengan konsonan yang sudah kamu kenal",
          ["ㅇ", "ㄱ", "ㄷ", "ㅅ", "ㅈ", "ㅊ", "ㅎ"],
          ["ㅚ", "ㅟ"],
        ),
        table([
          ["Hangeul", "Arti"],
          ["회사", "perusahaan, kantor"],
          ["회의", "rapat"],
          ["최고", "terbaik, nomor satu"],
          ["교회", "gereja"],
          ["가위", "gunting"],
          ["귀", "telinga"],
          ["위", "atas"],
          ["의사", "dokter"],
          ["의자", "kursi"],
          ["저희", "kami (sopan, merendah)"],
        ]),
        p(
          "Kalau kamu ingin bekerja di Korea lewat EPS, 회사 (perusahaan), 회의 (rapat), dan 의사 (dokter) akan sering kamu dengar.",
        ),
        listen("최고예요!", "최고예요!", "최고예요! = Yang terbaik!"),
        heading("Semua vokal sudah lengkap", 3),
        p(
          "Selamat! Dengan ㅚ ㅟ ㅢ, kamu sudah mengenal ",
          b("21 vokal"),
          " Hangeul (10 vokal dasar dan 11 vokal gabungan) dan ",
          b("19 konsonan awal"),
          ". Sekarang kamu bisa membaca setiap blok yang tidak punya huruf di bagian bawah.",
        ),
        vocabularyRef("m5-vocab-i"),
        game(
          "word-builder",
          "w-vowels",
          "Susun kata dengan vokal W",
          "Susun 회사, 가위, 과자, dan kata lain dari huruf-hurufnya.",
        ),
        callout(
          "success",
          "Ringkasnya: ㅚ = we (sama dengan ㅙ ㅞ), ㅟ = wi, ㅢ = 의 di awal kata dan 이 setelah konsonan. Kamu sudah mengenal semua 21 vokal Hangeul.",
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
          definition: "camilan, kue kering",
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
          definition: "perusahaan, kantor",
          romanization: "hoesa",
        },
        {
          term: "회의",
          definition: "rapat",
          romanization: "hoeui",
          examples: ["Boleh dibaca [회의] atau [회이]."],
        },
        {
          term: "최고",
          definition: "terbaik, nomor satu",
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
          examples: ["Dibaca [저히]: ㅢ setelah konsonan dibaca ㅣ."],
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
            listen("커피"),
          ],
          "커피",
          ["거피", "꺼피", "코피"],
          "커피 (kopi) diawali ㅋ yang berhembus dan vokal ㅓ. 코피 memakai ㅗ yang bulat.",
        ),
        choice(
          "m5-review-hear-ssada",
          [
            p("Ulasan Modul 4. Dengarkan, lalu pilih kata yang kamu dengar."),
            listen("싸다"),
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
