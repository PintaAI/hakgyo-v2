import {
  assessmentRef,
  audioClip,
  b,
  bullet,
  callout,
  heading,
  numbered,
  p,
  table,
} from "../blocks";
import type {
  BlockNoteBlock,
  ModuleContent,
  QuestionContent,
} from "../content-types";

// An audio clip whose player label does not reveal the Korean text (the
// builder's default file name is the text itself, which would give away
// listening answers).
const listen = (text: string): BlockNoteBlock => {
  const block = audioClip(text);
  return { ...block, props: { ...block.props, fileName: "Dengarkan" } };
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

// Part 1: letter recognition (10).
const letterQuestions: QuestionContent[] = [
  choice(
    "m9-exam-letter-eo",
    "Bagaimana mulutmu bergerak saat mengucapkan ㅓ?",
    "rahang turun seperti mengucap o, tetapi bibir tidak dibulatkan",
    [
      "bibir bulat seperti o di 'toko'",
      "seperti u, tetapi bibir datar",
      "bibir bulat dan maju seperti u di 'buku'",
    ],
    "ㅓ tidak punya padanan dalam bahasa Indonesia: rahang turun, bibir tidak bulat. Bibir bulat seperti 'toko' adalah ㅗ, u dengan bibir datar adalah ㅡ, u bulat adalah ㅜ.",
  ),
  choice(
    "m9-exam-letter-eu",
    "Bagaimana mulutmu bergerak saat mengucapkan ㅡ?",
    "seperti u, tetapi bibir datar dan tidak bulat",
    [
      "bibir bulat dan maju seperti u di 'buku'",
      "seperti i di 'ini'",
      "rahang turun lebar seperti a di 'apa'",
    ],
    "ㅡ diucapkan seperti u dengan bibir datar. Kalau bibir dibulatkan, bunyinya menjadi ㅜ.",
  ),
  choice(
    "m9-exam-letter-kieuk",
    "Bunyi mana yang cocok untuk ㅋ?",
    "k dengan hembusan napas yang kuat",
    [
      "k atau g yang lembut, tanpa hembusan kuat",
      "k yang tegang, tanpa hembusan",
      "ng seperti di akhir 'uang'",
    ],
    "ㅋ adalah huruf aspirasi: k Indonesia ditambah hembusan napas. ㄱ lembut tanpa hembusan kuat, ㄲ tegang tanpa hembusan.",
  ),
  choice(
    "m9-exam-letter-jj",
    "Bunyi mana yang cocok untuk ㅉ?",
    "c seperti di 'cari', tegang dan tanpa hembusan",
    [
      "c seperti di 'cari' dengan hembusan napas",
      "j yang lembut",
      "s yang tegang dan panjang",
    ],
    "ㅉ adalah huruf tegang: c Indonesia dengan otot tegang dan tanpa hembusan. Dengan hembusan adalah ㅊ, j lembut adalah ㅈ, s tegang adalah ㅆ.",
  ),
  choice(
    "m9-exam-letter-aspirated-d",
    "Huruf mana yang merupakan pasangan aspirasi (berhembus) dari ㄷ?",
    "ㅌ",
    ["ㄸ", "ㄴ", "ㄹ"],
    "Keluarga ㄷ: ㄷ polos, ㅌ aspirasi (satu garis tambahan, tambah napas), ㄸ tegang (huruf dobel).",
  ),
  choice(
    "m9-exam-letter-tense-b",
    "Huruf mana yang merupakan versi tegang dari ㅂ?",
    "ㅃ",
    ["ㅍ", "ㅁ", "ㄸ"],
    "Huruf tegang ditulis dobel: ㅂ menjadi ㅃ. ㅍ adalah versi aspirasinya, ㄸ adalah versi tegang dari ㄷ.",
  ),
  choice(
    "m9-exam-letter-ieung-top",
    "Bagaimana ㅇ dibaca kalau ada di bagian ATAS blok, seperti di 아?",
    "tidak berbunyi",
    ["ng seperti di 'uang'", "n seperti di 'makan'", "h seperti di 'hari'"],
    "ㅇ di awal blok hanya penanda tempat kosong dan tidak berbunyi. Di bagian bawah blok, ㅇ dibaca ng.",
  ),
  choice(
    "m9-exam-letter-rieul-between",
    "Bagaimana ㄹ dibaca di antara dua vokal, seperti di 나라?",
    "r ringan yang diketuk sekali, tidak digetarkan",
    ["r yang digetarkan panjang", "l seperti di akhir 'mobil'", "tidak dibaca"],
    "ㄹ di awal suku kata adalah r ringan dengan satu ketukan, lebih lembut dari r Indonesia. Di posisi batchim, ㄹ dibaca l.",
  ),
  choice(
    "m9-exam-letter-o-plus-i",
    "Vokal mana yang dibentuk dari ㅗ + ㅣ?",
    "ㅚ",
    ["ㅟ", "ㅙ", "ㅢ"],
    "ㅗ + ㅣ = ㅚ (dibaca we). ㅟ = ㅜ + ㅣ, ㅙ = ㅗ + ㅐ, ㅢ = ㅡ + ㅣ.",
  ),
  choice(
    "m9-exam-letter-ae-e",
    "Pasangan vokal mana yang ditulis berbeda tetapi dibaca sama oleh kebanyakan orang Korea sekarang?",
    "ㅐ dan ㅔ",
    ["ㅓ dan ㅗ", "ㅡ dan ㅜ", "ㅏ dan ㅑ"],
    "ㅐ dan ㅔ sama-sama dibaca e taling seperti di 'sate'. Bedanya hanya ejaan, misalnya 개 (anjing) dan 게 (kepiting). ㅓ/ㅗ dan ㅡ/ㅜ justru pasangan yang harus dibedakan.",
  ),
];

// Part 2: listening discrimination (8): four three-way, two ㅓ/ㅗ, a nasal
// batchim and a W vowel.
const listeningQuestions: QuestionContent[] = [
  choice(
    "m9-exam-hear-pi",
    hear("피"),
    "피",
    ["비", "삐", "미"],
    "피 (darah) diawali ㅍ dengan hembusan napas. 비 (hujan) memakai ㅂ polos, 삐 memakai ㅃ yang tegang.",
  ),
  choice(
    "m9-exam-hear-jjada",
    hear("짜다"),
    "짜다",
    ["자다", "차다", "사다"],
    "짜다 (asin) diawali ㅉ yang tegang tanpa hembusan. 자다 (tidur) memakai ㅈ polos, 차다 memakai ㅊ yang berhembus.",
  ),
  choice(
    "m9-exam-hear-tal",
    hear("탈"),
    "탈",
    ["달", "딸", "날"],
    "탈 (topeng) diawali ㅌ yang berhembus. 달 (bulan) memakai ㄷ polos, 딸 (anak perempuan) memakai ㄸ yang tegang.",
  ),
  choice(
    "m9-exam-hear-dokki",
    hear("도끼"),
    "도끼",
    ["토끼", "또끼", "도기"],
    "도끼 (kapak) diawali ㄷ polos dan diakhiri ㄲ yang tegang. 토끼 (kelinci) diawali ㅌ yang berhembus.",
  ),
  choice(
    "m9-exam-hear-geogi",
    hear("거기"),
    "거기",
    ["고기", "구기", "그기"],
    "거기 (di sana) memakai ㅓ dengan bibir tidak bulat. 고기 (daging) memakai ㅗ yang bulat.",
  ),
  choice(
    "m9-exam-hear-seori",
    hear("서리"),
    "서리",
    ["소리", "수리", "스리"],
    "서리 (embun beku) memakai ㅓ. 소리 (bunyi) memakai ㅗ yang bulat.",
  ),
  choice(
    "m9-exam-hear-bang",
    hear("방"),
    "방",
    ["반", "밤", "밥"],
    "방 (kamar) berakhir dengan ng (ㅇ). 반 berakhir n, 밤 berakhir m, 밥 berakhir p yang ditahan.",
  ),
  choice(
    "m9-exam-hear-sagwa",
    hear("사과"),
    "사과",
    ["사고", "서과", "사구"],
    "사과 (apel) memakai ㅘ: bibir membulat sebentar lalu terbuka ke ㅏ. 사고 (kecelakaan) berakhir dengan o bulat.",
  ),
];

// Part 3: read a word, pick the meaning (8).
const readingQuestions: QuestionContent[] = [
  choice(
    "m9-exam-read-keopi",
    "Apa arti 커피?",
    "kopi",
    ["keju", "kue", "hidung"],
    "커피 = kopi. Keju = 치즈, kue = 케이크, hidung = 코.",
  ),
  choice(
    "m9-exam-read-bissada",
    "Apa arti 비싸다?",
    "mahal",
    ["murah", "sibuk", "sakit"],
    "비싸다 = mahal. Murah = 싸다, sibuk = 바쁘다, sakit = 아프다.",
  ),
  choice(
    "m9-exam-read-apeuda",
    "Apa arti 아프다?",
    "sakit",
    ["senang", "cantik", "sibuk"],
    "아프다 = sakit. Senang = 기쁘다, cantik = 예쁘다, sibuk = 바쁘다.",
  ),
  choice(
    "m9-exam-read-hoesa",
    "Apa arti 회사?",
    "perusahaan",
    ["rumah sakit", "sekolah", "dokter"],
    "회사 = perusahaan. Rumah sakit = 병원, sekolah = 학교, dokter = 의사.",
  ),
  choice(
    "m9-exam-read-uija",
    "Apa arti 의자?",
    "kursi",
    ["dokter", "gunting", "telinga"],
    "의자 = kursi. Dokter = 의사, gunting = 가위, telinga = 귀.",
  ),
  choice(
    "m9-exam-read-byeongwon",
    "Apa arti 병원?",
    "rumah sakit",
    ["pabrik", "sekolah", "rumah"],
    "병원 = rumah sakit. Pabrik = 공장, sekolah = 학교, rumah = 집.",
  ),
  choice(
    "m9-exam-read-wolgeup",
    "Apa arti 월급?",
    "gaji bulanan",
    ["waktu", "pekerjaan", "harga"],
    "월급 = gaji bulanan. Waktu = 시간, pekerjaan = 일, harga = 값.",
  ),
  choice(
    "m9-exam-read-sajangnim",
    "Apa arti 사장님?",
    "bos, pemilik usaha",
    ["guru", "teman", "siswa"],
    "사장님 = bos atau pemilik usaha, dengan sapaan hormat 님. Guru = 선생님, teman = 친구, siswa = 학생.",
  ),
];

// Part 4: syllable building (6).
const buildingQuestions: QuestionContent[] = [
  choice(
    "m9-exam-build-gwa",
    "Blok mana yang tersusun dari ㄱ + ㅘ?",
    "과",
    ["궈", "고", "가"],
    "ㄱ di pojok kiri atas, ㅗ di bawahnya, ㅏ di kanan: 과. 궈 memakai ㅝ.",
  ),
  choice(
    "m9-exam-build-seong",
    "Blok mana yang tersusun dari ㅅ + ㅓ + ㅇ?",
    "성",
    ["송", "선", "상"],
    "ㅅ di kiri, ㅓ di kanan, ㅇ di bawah: 성. 송 memakai ㅗ, 선 berakhir ㄴ, 상 memakai ㅏ.",
  ),
  choice(
    "m9-exam-build-kkot",
    "Blok 꽃 tersusun dari huruf apa saja?",
    "ㄲ + ㅗ + ㅊ",
    ["ㄱ + ㅗ + ㅊ", "ㄲ + ㅓ + ㅊ", "ㄲ + ㅗ + ㅈ"],
    "꽃 (bunga): ㄲ di atas, ㅗ di bawahnya, ㅊ sebagai batchim. Saat berdiri sendiri dibaca [꼳].",
  ),
  choice(
    "m9-exam-build-position",
    "Dalam blok dengan vokal ㅜ, di mana konsonan awal ditulis?",
    "di atas vokal",
    ["di kiri vokal", "di kanan vokal", "di bawah vokal"],
    "ㅜ adalah vokal datar, jadi konsonan ditulis di atasnya, seperti 구. Vokal tegak seperti ㅏ menaruh konsonan di kiri.",
  ),
  choice(
    "m9-exam-build-jwi",
    "Blok mana yang tersusun dari ㅈ + ㅟ?",
    "쥐",
    ["지", "죄", "줘"],
    "ㅈ + ㅟ = 쥐 (tikus). 죄 memakai ㅚ, 줘 memakai ㅝ.",
  ),
  choice(
    "m9-exam-build-mul",
    "Blok mana yang tersusun dari ㅁ + ㅜ + ㄹ?",
    "물",
    ["문", "뭄", "묵"],
    "ㅁ di atas, ㅜ di bawahnya, ㄹ sebagai batchim: 물 (air).",
  ),
];

// Part 5: batchim and sound changes (8).
const batchimQuestions: QuestionContent[] = [
  choice(
    "m9-exam-batchim-t-sound",
    "Kata mana yang batchimnya dibaca [ㄷ]?",
    "옷",
    ["앞", "밖", "방"],
    "ㅅ di posisi batchim dibaca [ㄷ], jadi 옷 dibaca [옫]. 앞 berakhir [ㅂ], 밖 berakhir [ㄱ], 방 berakhir [ㅇ].",
  ),
  choice(
    "m9-exam-batchim-ap",
    "Bagaimana 앞 (depan) dibaca kalau berdiri sendiri?",
    "[압]",
    ["[아프]", "[앋]", "[악]"],
    "ㅍ di posisi batchim dibaca [ㅂ]: [압].",
  ),
  choice(
    "m9-exam-batchim-eumak",
    "Bagaimana 음악 (musik) dibaca?",
    "[으막]",
    ["[음악]", "[음막]", "[으나]"],
    "연음: batchim ㅁ pindah ke blok berikutnya yang diawali ㅇ diam: [으막].",
  ),
  choice(
    "m9-exam-batchim-bareum",
    "Bagaimana 발음 (pelafalan) dibaca?",
    "[바름]",
    ["[발음]", "[바음]", "[발름]"],
    "ㄹ pindah ke blok berikutnya dan menjadi r ringan: [바름].",
  ),
  choice(
    "m9-exam-batchim-gamsahamnida",
    "Bagaimana 감사합니다 (terima kasih) dibaca?",
    "[감사함니다]",
    ["[감사한니다]", "[감사항니다]", "[감사하니다]"],
    "Batchim ㅂ di 합 bertemu ㄴ, jadi berubah menjadi ㅁ: [감사함니다].",
  ),
  choice(
    "m9-exam-batchim-hangungmal",
    "Bagaimana 한국말 (bahasa Korea) dibaca?",
    "[한궁말]",
    ["[한국말]", "[한구말]", "[항국말]"],
    "Batchim ㄱ bertemu ㅁ, jadi berubah menjadi ㅇ: [한궁말].",
  ),
  choice(
    "m9-exam-batchim-gwaenchanayo",
    "Bagaimana 괜찮아요 (tidak apa-apa) dibaca?",
    "[괜차나요]",
    ["[괜찬아요]", "[괜차하요]", "[괜찬하요]"],
    "Batchim ㅎ di gugus ㄶ hilang sebelum vokal, dan ㄴ pindah ke blok berikutnya: [괜차나요].",
  ),
  choice(
    "m9-exam-batchim-dak",
    "Bagaimana 닭 (ayam) dibaca kalau berdiri sendiri?",
    "[닥]",
    ["[달]", "[다]", "[달기]"],
    "ㄺ termasuk tiga gugus yang membaca huruf kanan (ㄺ ㄻ ㄿ), jadi 닭 dibaca [닥]. [달기] adalah bacaan 닭이.",
  ),
];

export const m9FinalExam: ModuleContent = {
  key: "m9-final-exam",
  title: "Ujian Hangeul Mastery",
  description:
    "Ujian akhir yang mencakup semua huruf, batchim, dan perubahan bunyi. Lulus untuk mendapatkan lencana Hangeul Mastery.",
  items: [
    {
      type: "material",
      key: "m9-exam-intro",
      title: "Sebelum ujian akhir",
      description:
        "Apa yang diuji, cara kerja ujian, tips, dan apa yang terjadi setelah kamu lulus.",
      minutes: 5,
      blocks: [
        heading("Kamu sudah sampai di sini"),
        p(
          "Dari sejarah Raja Sejong sampai 감사합니다 [감사함니다], kamu sudah mempelajari semua huruf Hangeul, batchim, dan perubahan bunyi yang paling penting. Ujian akhir ini memastikan semuanya sudah melekat.",
        ),
        heading("Apa yang diuji", 3),
        table([
          ["Bagian", "Soal", "Isi"],
          [
            "Pengenalan huruf",
            "10",
            "bunyi dan bentuk huruf, keluarga polos, aspirasi, dan tegang, vokal gabungan",
          ],
          [
            "Dengar dan bedakan",
            "8",
            "tiga serangkai, ㅓ dan ㅗ, batchim sengau, vokal W",
          ],
          ["Baca kata", "8", "arti kata dari kosakata kursus"],
          ["Susun blok", "6", "huruf mana yang membentuk sebuah blok"],
          [
            "Batchim dan perubahan bunyi",
            "8",
            "tujuh bunyi akhir, 연음, batchim ganda, 합니다, 한국말, ㅎ",
          ],
        ]),
        heading("Cara kerja ujian", 3),
        bullet(
          b("40 soal pilihan ganda"),
          ", masing-masing dengan satu jawaban benar.",
        ),
        bullet("Urutan soal dan pilihan jawaban diacak."),
        bullet(
          b("Lulus dengan nilai 80"),
          ", artinya minimal 32 jawaban benar.",
        ),
        bullet(
          "Tidak ada batas waktu. Perkirakan sekitar 30 menit, tetapi kerjakan dengan tenang dan putar audionya sesering yang kamu perlukan.",
        ),
        bullet(
          "Tidak ada romanisasi. Pilihan dalam tanda kurung siku, misalnya [으막], menunjukkan cara membaca.",
        ),
        bullet("Kalau belum lulus, kamu bisa mencoba lagi."),
        heading("Tips", 3),
        numbered(
          "Pakai earphone dan cari tempat yang tenang untuk soal dengar.",
        ),
        numbered(
          "Baca setiap kata per blok: lihat vokal dulu, lalu konsonan, lalu batchim.",
        ),
        numbered(
          "Untuk soal batchim, tanyakan dua hal: apakah blok berikutnya diawali ㅇ? Apakah batchim bertemu ㄴ atau ㅁ?",
        ),
        numbered(
          "Kalau belum lulus, baca pembahasan setiap soal yang salah, ulangi modul yang terkait, lalu coba lagi.",
        ),
        callout(
          "info",
          "Begitu kamu lulus, semua item kursus selesai dan kamu mendapatkan lencana ",
          b("Hangeul Mastery"),
          ". Kursus ini dan bagian permainan Hangeul akan disembunyikan supaya tampilanmu rapi. Kosakatanya tetap muncul di latihan harian. Kamu bisa menampilkannya lagi kapan saja di Pengaturan dengan sakelar ",
          b("Tampilkan Hangeul Mastery"),
          ".",
        ),
        assessmentRef("m9-mastery-exam"),
        callout(
          "success",
          "Kamu sudah membaca menu, papan, kartu nama, dan frasa pertamamu dalam bahasa Korea. Kamu pasti bisa. 화이팅!",
        ),
      ],
    },
    {
      type: "assessment",
      key: "m9-mastery-exam",
      title: "Ujian akhir Hangeul Mastery",
      description:
        "40 soal: pengenalan huruf, dengar dan bedakan, baca kata, susun blok, serta batchim dan perubahan bunyi. Lulus dengan nilai 80.",
      instructions:
        "Pilih satu jawaban untuk setiap soal. Putar audio sesering yang kamu perlukan. Pilihan dalam tanda kurung siku menunjukkan cara membaca, bukan ejaan. Kamu lulus dengan nilai 80 (32 dari 40 benar).",
      passingScore: 80,
      shuffleQuestions: true,
      shuffleOptions: true,
      questions: [
        ...letterQuestions,
        ...listeningQuestions,
        ...readingQuestions,
        ...buildingQuestions,
        ...batchimQuestions,
      ],
    },
  ],
};
