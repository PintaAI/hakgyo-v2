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

const VOWELS = ["ㅏ", "ㅓ", "ㅗ", "ㅜ", "ㅡ", "ㅣ", "ㅐ", "ㅔ"];
const NO_ROMANIZATION = { showRomanization: false };

export const m4AspiratedTense: ModuleContent = {
  key: "m4-aspirated-tense",
  title: "Konsonan berhembus dan tegang",
  description:
    "Konsonan berhembus ㅋ ㅌ ㅍ ㅊ, konsonan tegang ㄲ ㄸ ㅃ ㅆ ㅉ, dan lab untuk membedakan 자다, 차다, dan 짜다.",
  items: [
    {
      type: "material",
      key: "m4-aspirated",
      title: "Hembusan napas: ㅋ ㅌ ㅍ ㅊ",
      description: "Empat konsonan yang diucapkan dengan hembusan napas kuat.",
      minutes: 7,
      blocks: [
        callout(
          "info",
          '"k", "t", "p", dan "c" Indonesia diucapkan tanpa hembusan napas. Bahasa Korea juga punya versi yang ',
          b("berhembus kuat"),
          ".",
        ),
        rules({
          title: "Tambah garis = tambah hembusan napas",
          intro:
            "Konsonan berhembus dibuat dari konsonan polos yang sudah kamu kenal, ditambah satu garis.",
          columns: ["Polos", "Berhembus", "Dibaca"],
          rows: [
            { when: "ㄱ + satu garis", result: "ㅋ", example: "가 → 카" },
            { when: "ㄷ + satu garis", result: "ㅌ", example: "다 → 타" },
            { when: "ㅂ (bentuk baru)", result: "ㅍ", example: "바 → 파" },
            { when: "ㅈ + satu garis", result: "ㅊ", example: "자 → 차" },
          ],
          tip: {
            title: "Tes kertas tisu",
            text: "Pegang tisu di depan mulut. Ucapkan 카: tisunya harus bergerak. Ucapkan 가: tisunya hampir diam.",
          },
        }),
        letters(
          "Huruf baru",
          [
            {
              character: "ㅋ",
              cue: '"k" dengan hembusan napas kuat.',
              romanization: "k",
              say: "카",
              note: "ㄱ dengan satu garis di tengah.",
              example: { word: "커피", meaning: "kopi", romanization: "keopi" },
            },
            {
              character: "ㅌ",
              cue: '"t" dengan hembusan napas.',
              romanization: "t",
              say: "타",
              note: "ㄷ dengan satu garis di tengah.",
              example: {
                word: "토마토",
                meaning: "tomat",
                romanization: "tomato",
              },
            },
            {
              character: "ㅍ",
              cue: '"p" dengan hembusan napas.',
              romanization: "p",
              say: "파",
              example: {
                word: "포도",
                meaning: "anggur",
                romanization: "podo",
              },
            },
            {
              character: "ㅊ",
              cue: 'Seperti "c" di "cari", dengan hembusan napas.',
              romanization: "ch",
              say: "차",
              note: "ㅈ dengan satu garis kecil di atas.",
              example: { word: "치마", meaning: "rok", romanization: "chima" },
            },
          ],
          NO_ROMANIZATION,
        ),
        contrast(
          "Polos atau berhembus?",
          "Putar tiap pasangan. Yang kedua lebih berhembus dan nadanya lebih tinggi.",
          [
            { items: [{ text: "가" }, { text: "카" }] },
            { items: [{ text: "자" }, { text: "차" }] },
            {
              items: [
                { text: "비", meaning: "hujan" },
                { text: "피", meaning: "darah" },
              ],
              note: 'Tanpa hembusan, "darah" terdengar seperti "hujan".',
            },
            {
              items: [
                { text: "기자", meaning: "wartawan" },
                { text: "기차", meaning: "kereta" },
              ],
            },
          ],
          NO_ROMANIZATION,
        ),
        syllableGrid(
          "Sekarang kamu bisa baca",
          ["ㅋ", "ㅌ", "ㅍ", "ㅊ"],
          VOWELS,
          NO_ROMANIZATION,
        ),
        p(
          "Huruf ini banyak dipakai di kata serapan. Baca dulu, tebak artinya, lalu putar.",
        ),
        audioClip("카메라", "카메라 = kamera"),
        audioClip("아파트", "아파트 = apartemen"),
        vocabularyRef("m4-vocab-g"),
        game(
          "stroke-master",
          "aspirated-tense",
          "Kenali konsonan berhembus",
          "Cocokkan bentuk dan bunyi konsonan baru. Konsonan tegang juga muncul, kamu belajar di pelajaran berikutnya.",
        ),
        callout(
          "success",
          b("Ingat: "),
          "ㅋ ㅌ ㅍ ㅊ adalah k, t, p, c dengan hembusan napas. Tisunya harus bergerak.",
        ),
      ],
    },
    {
      type: "vocabulary",
      key: "m4-vocab-g",
      title: "Kosakata G: ㅋ ㅌ ㅍ ㅊ",
      description:
        "Kata sehari-hari dan kata serapan yang memakai konsonan berhembus.",
      entries: [
        {
          term: "커피",
          definition: "kopi",
          romanization: "keopi",
          examples: ["커피 주세요. = Minta kopi."],
        },
        { term: "코", definition: "hidung", romanization: "ko" },
        { term: "카메라", definition: "kamera", romanization: "kamera" },
        { term: "치마", definition: "rok", romanization: "chima" },
        { term: "치즈", definition: "keju", romanization: "chijeu" },
        { term: "토마토", definition: "tomat", romanization: "tomato" },
        { term: "피자", definition: "pizza", romanization: "pija" },
        { term: "포도", definition: "anggur (buah)", romanization: "podo" },
        { term: "파티", definition: "pesta", romanization: "pati" },
        { term: "아파트", definition: "apartemen", romanization: "apateu" },
        {
          term: "티셔츠",
          definition: "kaus oblong",
          romanization: "tisyeocheu",
        },
        { term: "케이크", definition: "kue tar", romanization: "keikeu" },
        { term: "기차", definition: "kereta", romanization: "gicha" },
        {
          term: "차",
          definition: "teh; mobil",
          romanization: "cha",
          examples: [
            "Dua kata berbeda yang ditulis sama. Konteks yang menentukan.",
          ],
        },
        { term: "고추", definition: "cabai", romanization: "gochu" },
        { term: "키", definition: "tinggi badan; kunci", romanization: "ki" },
        { term: "크다", definition: "besar", romanization: "keuda" },
        {
          term: "아프다",
          definition: "sakit",
          romanization: "apeuda",
          examples: ["머리 아파요. = Kepala saya sakit."],
        },
        { term: "피아노", definition: "piano", romanization: "piano" },
        {
          term: "표",
          definition: "tiket; karcis",
          romanization: "pyo",
          examples: ["기차 표 = tiket kereta"],
        },
        { term: "카드", definition: "kartu", romanization: "kadeu" },
        {
          term: "오토바이",
          definition: "sepeda motor",
          romanization: "otobai",
        },
      ],
    },
    {
      type: "material",
      key: "m4-tense",
      title: "Konsonan tegang: ㄲ ㄸ ㅃ ㅆ ㅉ",
      description: "Lima huruf dobel yang diucapkan tegang, tanpa hembusan.",
      minutes: 7,
      blocks: [
        callout(
          "info",
          "Lima konsonan bisa ditulis dobel. Kabar baik: k, t, p, c Indonesia sudah tanpa hembusan, jadi tinggal dibuat ",
          b("tegang"),
          ".",
        ),
        rules({
          title: "Huruf dobel = tegang, tanpa napas",
          intro:
            "Kencangkan otot mulut dan tenggorokan, tahan napas sebentar, lalu lepas tanpa hembusan.",
          columns: ["Polos", "Tegang", "Dibaca"],
          rows: [
            { when: "ㄱ dobel", result: "ㄲ", example: "가 → 까" },
            { when: "ㄷ dobel", result: "ㄸ", example: "다 → 따" },
            { when: "ㅂ dobel", result: "ㅃ", example: "바 → 빠" },
            { when: "ㅅ dobel", result: "ㅆ", example: "사 → 싸" },
            { when: "ㅈ dobel", result: "ㅉ", example: "자 → 짜" },
          ],
          tip: {
            title: 'Seperti "Mekkah"',
            text: 'Ucapkan "Mekkah": "k" dobelnya terdengar tertahan. Rasa tertahan itu yang kamu cari, seperti di 아까 (tadi).',
          },
        }),
        letters(
          "Huruf baru",
          [
            {
              character: "ㄲ",
              cue: '"k" Indonesia yang tegang dan tertahan.',
              romanization: "kk",
              say: "까",
              example: {
                word: "토끼",
                meaning: "kelinci",
                romanization: "tokki",
              },
            },
            {
              character: "ㄸ",
              cue: '"t" Indonesia yang tegang.',
              romanization: "tt",
              say: "따",
              example: {
                word: "이따가",
                meaning: "nanti",
                romanization: "ittaga",
              },
            },
            {
              character: "ㅃ",
              cue: '"p" Indonesia yang tegang.',
              romanization: "pp",
              say: "빠",
              example: {
                word: "오빠",
                meaning: "kakak laki-laki (dipakai adik perempuan)",
                romanization: "oppa",
              },
            },
            {
              character: "ㅆ",
              cue: '"s" yang tajam dan tegang.',
              romanization: "ss",
              say: "싸",
              note: "Sedikit lebih panjang dari ㅅ.",
              example: {
                word: "비싸다",
                meaning: "mahal",
                romanization: "bissada",
              },
            },
            {
              character: "ㅉ",
              cue: 'Seperti "c" di "cari", tapi tegang.',
              romanization: "jj",
              say: "짜",
              example: { word: "짜다", meaning: "asin", romanization: "jjada" },
            },
          ],
          NO_ROMANIZATION,
        ),
        contrast(
          "Polos atau tegang?",
          "Putar tiap pasangan. Yang kedua lebih tegang dan nadanya lebih tinggi, tapi tanpa hembusan.",
          [
            { items: [{ text: "가" }, { text: "까" }] },
            { items: [{ text: "자" }, { text: "짜" }] },
            {
              items: [
                { text: "개", meaning: "anjing" },
                { text: "깨", meaning: "wijen" },
              ],
            },
            {
              items: [
                { text: "사다", meaning: "membeli" },
                { text: "싸다", meaning: "murah" },
              ],
              note: "Salah bunyi di toko: membeli atau murah?",
            },
          ],
          NO_ROMANIZATION,
        ),
        syllableGrid(
          "Sekarang kamu bisa baca",
          ["ㄲ", "ㄸ", "ㅃ", "ㅆ", "ㅉ"],
          VOWELS,
          NO_ROMANIZATION,
        ),
        p("Untuk belanja: baca dulu, lalu putar."),
        audioClip("너무 비싸요", "너무 비싸요! = Mahal sekali!"),
        audioClip("싸게 해 주세요", "싸게 해 주세요. = Tolong kasih murah."),
        vocabularyRef("m4-vocab-h"),
        game(
          "syllable-forge",
          "aspirated-tense",
          "Susun suku kata",
          "Susun suku kata dengan konsonan berhembus dan tegang. Ucapkan tiap suku kata dengan keras.",
        ),
        callout(
          "success",
          b("Ingat: "),
          "huruf dobel diucapkan tegang dan tertahan, tanpa hembusan: 아까, 오빠, 비싸다.",
        ),
      ],
    },
    {
      type: "vocabulary",
      key: "m4-vocab-h",
      title: "Kosakata H: ㄲ ㄸ ㅃ ㅆ ㅉ",
      description:
        "Kata sapaan, kata sifat, dan kata sehari-hari yang memakai konsonan tegang.",
      entries: [
        {
          term: "아빠",
          definition: "ayah (sapaan akrab)",
          romanization: "appa",
        },
        {
          term: "오빠",
          definition: "kakak laki-laki (dipakai adik perempuan)",
          romanization: "oppa",
          examples: [
            "Di drama juga dipakai perempuan untuk memanggil pacar atau pria yang lebih tua.",
          ],
        },
        { term: "토끼", definition: "kelinci", romanization: "tokki" },
        {
          term: "아저씨",
          definition: "bapak; om (sapaan untuk pria dewasa)",
          romanization: "ajeossi",
        },
        { term: "아까", definition: "tadi", romanization: "akka" },
        { term: "이따가", definition: "nanti", romanization: "ittaga" },
        { term: "가짜", definition: "palsu", romanization: "gajja" },
        { term: "꼬리", definition: "ekor", romanization: "kkori" },
        { term: "쓰레기", definition: "sampah", romanization: "sseuregi" },
        {
          term: "뽀뽀",
          definition: "kecupan; cium (bahasa sayang)",
          romanization: "ppoppo",
        },
        {
          term: "싸다",
          definition: "murah",
          romanization: "ssada",
          examples: ["Bandingkan dengan 사다 (membeli)."],
        },
        {
          term: "비싸다",
          definition: "mahal",
          romanization: "bissada",
          examples: ["너무 비싸요! = Mahal sekali!"],
        },
        { term: "짜다", definition: "asin", romanization: "jjada" },
        { term: "바쁘다", definition: "sibuk", romanization: "bappeuda" },
        { term: "예쁘다", definition: "cantik", romanization: "yeppeuda" },
        {
          term: "기쁘다",
          definition: "senang; gembira",
          romanization: "gippeuda",
        },
        { term: "어때요", definition: "bagaimana?", romanization: "eottaeyo" },
      ],
    },
    {
      type: "material",
      key: "m4-three-way-lab",
      title: "Lab tiga serangkai",
      description:
        "Latih telinga dan mulut untuk membedakan polos, berhembus, dan tegang.",
      minutes: 8,
      blocks: [
        callout(
          "info",
          "Banyak konsonan punya tiga versi: polos, berhembus, dan tegang. Pelajaran ini melatih telinga dan mulutmu untuk membedakannya.",
        ),
        rules({
          title: "Tiga versi, tiga cara",
          intro:
            "Berhembus dan tegang sama-sama bernada tinggi. Bedanya di napas: berhembus keluar, tegang tertahan.",
          columns: ["Versi", "Rasanya", "Contoh"],
          rows: [
            {
              when: "Polos ㄱ ㄷ ㅂ ㅈ ㅅ",
              result: "santai",
              example: "가 다 바 자 사",
            },
            {
              when: "Berhembus ㅋ ㅌ ㅍ ㅊ",
              result: "napas keluar",
              example: "카 타 파 차",
            },
            {
              when: "Tegang ㄲ ㄸ ㅃ ㅉ ㅆ",
              result: "tertahan",
              example: "까 따 빠 짜 싸",
            },
          ],
          tip: {
            title: "Tes kertas tisu",
            text: "Pegang tisu di depan mulut. Berhembus: tisunya bergerak. Tegang: tisunya diam.",
          },
        }),
        contrast(
          "Lab suku kata",
          "Polos, berhembus, tegang. Ucapkan ketiganya berurutan, lalu acak urutannya.",
          [
            { items: [{ text: "가" }, { text: "카" }, { text: "까" }] },
            { items: [{ text: "다" }, { text: "타" }, { text: "따" }] },
            { items: [{ text: "바" }, { text: "파" }, { text: "빠" }] },
            { items: [{ text: "자" }, { text: "차" }, { text: "짜" }] },
          ],
          NO_ROMANIZATION,
        ),
        contrast(
          "Lab kata nyata",
          "Putar tiap baris berkali-kali, ucapkan ulang, lalu cek dengan tes tisu.",
          [
            {
              items: [
                { text: "사다", meaning: "membeli" },
                { text: "싸다", meaning: "murah" },
              ],
            },
            {
              items: [
                { text: "자다", meaning: "tidur" },
                { text: "차다", meaning: "menendang; dingin" },
                { text: "짜다", meaning: "asin" },
              ],
            },
            {
              items: [
                { text: "비", meaning: "hujan" },
                { text: "피", meaning: "darah" },
                { text: "삐", meaning: 'bunyi "bip"' },
              ],
            },
            {
              items: [
                { text: "부리", meaning: "paruh" },
                { text: "뿌리", meaning: "akar" },
              ],
            },
            {
              items: [
                { text: "도끼", meaning: "kapak" },
                { text: "토끼", meaning: "kelinci" },
              ],
            },
          ],
          NO_ROMANIZATION,
        ),
        callout(
          "tip",
          "Rekam suaramu saat mengucapkan 자다, 차다, 짜다, lalu bandingkan dengan audio. Masih sulit itu wajar, karena itu nilai lulus kuisnya 75%.",
        ),
        game(
          "word-builder",
          "aspirated-tense",
          "Susun kata",
          "Susun kata seperti 커피, 토끼, dan 비싸다 dari suku katanya.",
        ),
        assessmentRef("m4-quiz"),
        callout(
          "success",
          b("Ingat: "),
          "polos itu santai, berhembus mengeluarkan napas, tegang menahan napas.",
        ),
      ],
    },
    {
      type: "assessment",
      key: "m4-quiz",
      title: "Kuis modul 4: lab tiga serangkai",
      description:
        "16 soal, sebagian besar soal mendengar, tentang konsonan polos, berhembus, dan tegang, ditambah ulangan modul 2 dan 3.",
      instructions:
        "Pakai earphone kalau bisa, dan putar audionya sebanyak yang kamu perlukan. Nilai lulus 75%.",
      passingScore: 75,
      shuffleOptions: true,
      questions: [
        single(
          "hear-ssada",
          hear("싸다"),
          ["사다", "싸다", "자다", "차다"],
          1,
          "Yang kamu dengar adalah 싸다 (murah): ㅆ tegang dan tajam. 사다 (membeli) memakai ㅅ yang lebih lembut.",
        ),
        single(
          "hear-chada",
          hear("차다"),
          ["자다", "짜다", "차다", "사다"],
          2,
          "Yang kamu dengar adalah 차다 (menendang; dingin): ㅊ dengan semburan napas.",
        ),
        single(
          "hear-jjada",
          hear("짜다"),
          ["짜다", "자다", "차다", "싸다"],
          0,
          "Yang kamu dengar adalah 짜다 (asin): ㅉ tegang, tanpa hembusan, nadanya tinggi.",
        ),
        single(
          "hear-pi",
          hear("피"),
          ["비", "삐", "미", "피"],
          3,
          "Yang kamu dengar adalah 피 (darah): ㅍ dengan semburan napas. 비 (hujan) polos, 삐 tegang.",
        ),
        single(
          "hear-tokki",
          hear("토끼"),
          ["도끼", "토끼", "토기", "도기"],
          1,
          "Yang kamu dengar adalah 토끼 (kelinci): suku kata pertama berhembus (ㅌ), suku kata kedua tegang (ㄲ).",
        ),
        single(
          "hear-ppuri",
          hear("뿌리"),
          ["부리", "푸리", "뿌리", "무리"],
          2,
          "Yang kamu dengar adalah 뿌리 (akar): ㅃ tegang tanpa hembusan. 부리 (paruh) memakai ㅂ polos.",
        ),
        single(
          "hear-gicha",
          hear("기차"),
          ["기차", "기자", "기짜", "키차"],
          0,
          "Yang kamu dengar adalah 기차 (kereta): suku kata kedua memakai ㅊ yang berhembus. 기자 berarti wartawan.",
        ),
        single(
          "read-keopi",
          "Apa arti kata 커피?",
          ["Kue tar", "Keju", "Kamera", "Kopi"],
          3,
          "커피 berarti kopi. Kue tar adalah 케이크, keju 치즈, dan kamera 카메라.",
        ),
        single(
          "read-bissada",
          "Apa arti kata 비싸다?",
          ["Murah", "Mahal", "Sibuk", "Cantik"],
          1,
          "비싸다 berarti mahal. Murah adalah 싸다, sibuk 바쁘다, dan cantik 예쁘다.",
        ),
        single(
          "aspirated-of-d",
          "Huruf mana yang dibuat dari ㄷ dengan satu garis tambahan, dan diucapkan berhembus?",
          ["ㄸ", "ㄹ", "ㅌ", "ㅍ"],
          2,
          'ㄷ + satu garis = ㅌ, "t" dengan semburan napas. ㄸ adalah ㄷ dobel, yang diucapkan tegang tanpa hembusan.',
        ),
        single(
          "tense-feature",
          "Apa ciri konsonan tegang seperti ㄲ, ㄸ, dan ㅃ?",
          [
            "Diucapkan dengan semburan napas yang kuat",
            'Diucapkan dengan getaran seperti "r"',
            "Diucapkan lewat hidung",
            "Tanpa hembusan, dengan otot mulut dan tenggorokan yang tegang",
          ],
          3,
          "Konsonan tegang diucapkan tertahan, tanpa hembusan. Yang berhembus adalah ㅋ ㅌ ㅍ ㅊ.",
        ),
        single(
          "review-hear-geogi",
          hear("거기"),
          ["거기", "고기", "구기", "그기"],
          0,
          "Ulangan modul 2: yang kamu dengar adalah 거기 (di sana), dengan ㅓ yang santai. 고기 berarti daging.",
        ),
        single(
          "review-read-sigye",
          "Apa arti kata 시계?",
          ["Dunia", "Toko", "Jam", "Lagu"],
          2,
          "Ulangan modul 3: 시계 berarti jam. Dunia adalah 세계, toko 가게, dan lagu 노래.",
        ),
        single(
          "review-spell-crab",
          'Kata mana yang berarti "kepiting"?',
          ["개", "게", "깨", "거"],
          1,
          "Ulangan modul 3: kepiting ditulis 게 (dengan ㅔ). 개 berarti anjing dan 깨 berarti wijen.",
        ),
        single(
          "review-hear-yeogi",
          hear("여기"),
          ["요기", "야기", "이기", "여기"],
          3,
          "Ulangan modul 3: yang kamu dengar adalah 여기 (di sini), dengan ㅕ yang bibirnya santai.",
        ),
        single(
          "review-read-uri",
          "Apa arti kata 우리?",
          ["Kami; kita", "Bebek", "Kepala", "Negara"],
          0,
          "Ulangan modul 2: 우리 berarti kami atau kita. Bebek adalah 오리.",
        ),
      ],
    },
  ],
};
