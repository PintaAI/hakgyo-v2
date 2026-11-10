import { assessmentRef, audioClip, b, callout, lessonPage, p } from "../blocks";
import type {
  BlockNoteBlock,
  ModuleContent,
  QuestionContent,
} from "../content-types";

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
  audioClip(text),
];

// Part 1: letter recognition (5).
const letterQuestions: QuestionContent[] = [
  choice(
    "m9-exam-letter-kieuk",
    "Bunyi mana yang cocok untuk ㅋ?",
    "k dengan hembusan napas yang kuat",
    [
      "k atau g yang lembut, tanpa hembusan kuat",
      "k yang tegang, tanpa hembusan",
      "ng seperti di akhir 'uang'",
    ],
    "ㅋ = k Indonesia ditambah hembusan napas. ㄱ lembut tanpa hembusan kuat, ㄲ tegang tanpa hembusan.",
  ),
  choice(
    "m9-exam-letter-aspirated-d",
    "Huruf mana yang seperti ㄷ, tetapi pakai hembusan napas?",
    "ㅌ",
    ["ㄸ", "ㄴ", "ㄹ"],
    "Keluarga ㄷ: ㄷ polos, ㅌ berhembus (satu garis tambahan, tambah napas), ㄸ tegang (huruf dobel).",
  ),
  choice(
    "m9-exam-letter-tense-b",
    "Huruf mana yang merupakan versi tegang dari ㅂ?",
    "ㅃ",
    ["ㅍ", "ㅁ", "ㄸ"],
    "Huruf tegang ditulis dobel: ㅂ menjadi ㅃ. ㅍ adalah versi berhembusnya, ㄸ adalah versi tegang dari ㄷ.",
  ),
  choice(
    "m9-exam-letter-ieung-top",
    "Bagaimana ㅇ dibaca kalau ada di bagian ATAS blok, seperti di 아?",
    "tidak berbunyi",
    ["ng seperti di 'uang'", "n seperti di 'makan'", "h seperti di 'hari'"],
    "ㅇ di awal blok hanya penanda tempat kosong dan tidak berbunyi. Di bagian bawah blok, ㅇ dibaca ng.",
  ),
  choice(
    "m9-exam-letter-o-plus-i",
    "Vokal mana yang dibentuk dari ㅗ + ㅣ?",
    "ㅚ",
    ["ㅟ", "ㅙ", "ㅢ"],
    "ㅗ + ㅣ = ㅚ (dibaca we). ㅟ = ㅜ + ㅣ, ㅙ = ㅗ + ㅐ, ㅢ = ㅡ + ㅣ.",
  ),
];

// Part 2: listening discrimination (8): four three-way, two ㅓ/ㅗ, a
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

// Part 3: read a word, pick the meaning (6).
const readingQuestions: QuestionContent[] = [
  choice(
    "m9-exam-read-bissada",
    "Apa arti 비싸다?",
    "mahal",
    ["murah", "sibuk", "sakit"],
    "비싸다 = mahal. Murah = 싸다, sibuk = 바쁘다, sakit = 아프다.",
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

// Part 4: syllable building (4).
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
    "m9-exam-build-mul",
    "Blok mana yang tersusun dari ㅁ + ㅜ + ㄹ?",
    "물",
    ["문", "뭄", "묵"],
    "ㅁ di atas, ㅜ di bawahnya, ㄹ sebagai batchim: 물 (air).",
  ),
];

// Part 5: batchim and sound changes (7).
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
      description: "Apa yang diuji dan berapa nilai lulusnya.",
      minutes: 2,
      blocks: [
        lessonPage({
          theme: "rose",
          imageKey: "chapter-9",
          imageAlt: "Murid menyelesaikan ujian dengan senang",
          chapter: 9,
          title: "한글 마스터",
          subtitle: "Ujian Hangeul Mastery",
          question: "준비됐어요?",
          answer: "네, 화이팅!",
          cards: [
            {
              label: "Huruf",
              title: "Semua huruf",
              description: "Vokal, konsonan, dan batchim",
            },
            {
              label: "Membaca",
              title: "Kata dan dengar",
              description: "Soal dari semua bab",
            },
            {
              label: "Lencana",
              title: "Hangeul Mastery",
              description: "Lulus dengan nilai 80",
            },
          ],
          goals: [
            "Membaca dan mendengar Hangeul dengan yakin.",
            "Mendapat lencana Hangeul Mastery.",
          ],
        }),
        callout(
          "info",
          b("30 soal"),
          " tentang huruf, dengar dan bedakan, baca kata, susun blok, dan batchim. Lulus dengan ",
          b("nilai 80"),
          " (24 benar). Tidak ada batas waktu, dan kalau belum lulus kamu bisa mencoba lagi.",
        ),
        assessmentRef("m9-mastery-exam"),
        callout(
          "success",
          b("Kamu pasti bisa. "),
          "Lulus, dan kamu dapat lencana ",
          b("Hangeul Mastery"),
          ". Kursus ini lalu disembunyikan, dan bisa kamu tampilkan lagi di Pengaturan lewat ",
          b("Tampilkan Hangeul Mastery"),
          ". 화이팅!",
        ),
      ],
    },
    {
      type: "assessment",
      key: "m9-mastery-exam",
      title: "Ujian akhir Hangeul Mastery",
      description:
        "30 soal: pengenalan huruf, dengar dan bedakan, baca kata, susun blok, serta batchim dan perubahan bunyi. Lulus dengan nilai 80.",
      instructions:
        "Pilih satu jawaban untuk setiap soal. Putar audio sesering yang kamu perlukan. Pilihan dalam tanda kurung siku menunjukkan cara membaca, bukan ejaan. Kamu lulus dengan nilai 80 (24 dari 30 benar).",
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
