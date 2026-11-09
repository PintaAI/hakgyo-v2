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

const hear = (text: string, question: string) => [p(question), audioClip(text)];

const VOWELS = ["ㅏ", "ㅓ", "ㅗ", "ㅜ", "ㅡ", "ㅣ"];

export const m1BasicVowels: ModuleContent = {
  key: "m1-basic-vowels",
  title: "Perkenalan dan vokal dasar",
  description:
    "Cara kerja Hangeul dan 24 hurufnya, lalu blok suku kata, ㅇ yang diam, dan enam vokal dasar: ㅏ ㅣ ㅗ ㅜ ㅡ ㅓ.",
  items: [
    // Was the only lesson of the module "Mulai di sini" (m0-welcome); its key
    // stays so learners keep their progress on it.
    {
      type: "material",
      key: "m0-why-hangeul",
      title: "Perkenalan",
      description:
        "Cara kerja Hangeul, 24 hurufnya, dan cara kursus ini berjalan.",
      minutes: 3,
      blocks: [
        callout(
          "info",
          b("Hangeul hanya punya 24 huruf dasar."),
          " Banyak orang sudah bisa membacanya dalam beberapa hari.",
        ),
        rules({
          title: "Cara kerja Hangeul",
          intro:
            "Huruf tidak ditulis berjajar, tapi disusun jadi blok. Satu blok = satu suku kata.",
          columns: ["Aturan", "Jadi", "Contoh"],
          rows: [
            {
              when: "Huruf disusun jadi",
              result: "1 blok",
              example: "ㅇ + ㅏ = 아",
            },
            { when: "1 blok", result: "1 suku kata", example: '아 = "a"' },
            {
              when: "Di dalam blok",
              result: "kiri → kanan, atas → bawah",
              example: "오 = ㅇ di atas, ㅗ di bawah",
            },
            {
              when: "Blok demi blok",
              result: "kiri → kanan",
              example: '아이 = 아 + 이 = "a-i"',
            },
          ],
          tip: {
            title: "ㅇ di depan itu diam",
            text: 'Itu sebabnya 아 dibaca "a". Kamu belajar ini di pelajaran berikutnya.',
          },
        }),
        p(
          "Ini ke-24 huruf itu. ",
          b("Belum perlu dihafal"),
          ": kartunya muncul di kosakata harian, dan setiap huruf kamu pelajari satu per satu di bab-bab berikutnya.",
        ),
        vocabularyRef("m1-vocab-letters"),
        p(
          "Setiap pelajaran isinya sama: ",
          b("dengar, lihat, main, lalu kuis"),
          ". Dengarkan tiga frasa ini dulu, nanti kamu bisa membacanya sendiri.",
        ),
        audioClip("안녕하세요", "Halo (sopan)"),
        audioClip("감사합니다", "Terima kasih"),
        audioClip("사랑해요", "Aku sayang kamu"),
        callout(
          "success",
          b("Ingat: "),
          "satu blok = satu suku kata, dibaca kiri ke kanan, atas ke bawah.",
        ),
      ],
    },
    {
      type: "material",
      key: "m1-blocks-a-i",
      title: "Blok suku kata: ㅇ, ㅏ, ㅣ",
      description: "Satu blok = satu suku kata. ㅇ di depan itu diam.",
      minutes: 6,
      blocks: [
        callout(
          "info",
          b("Hangeul ditulis per blok."),
          " Satu blok = satu suku kata, dan setiap blok selalu dimulai dengan konsonan.",
        ),
        rules({
          title: "ㅇ di depan itu diam",
          intro:
            "Kalau suku katanya dimulai bunyi vokal, taruh ㅇ di depannya sebagai pengisi tempat. ㅇ di posisi ini tidak dibaca.",
          columns: ["Susun", "Jadi", "Dibaca"],
          rows: [
            { when: "ㅇ + ㅏ", result: "아", example: '"a"' },
            { when: "ㅇ + ㅣ", result: "이", example: '"i"' },
            { when: "아 + 이", result: "아이", example: '"a-i" = anak' },
          ],
          tip: {
            title: "Bukan ng",
            text: 'ㅇ baru berbunyi "ng" kalau ada di bawah blok. Itu nanti di modul batchim.',
          },
        }),
        letters(
          "Huruf baru",
          [
            {
              character: "ㅇ",
              cue: "Diam di depan blok. Hanya pengisi tempat.",
              romanization: "-",
              example: {
                word: "아",
                meaning: "ah! (seruan)",
                romanization: "a",
              },
            },
            {
              character: "ㅏ",
              cue: 'Seperti "a" di "apa".',
              romanization: "a",
              say: "아",
              note: "Garis pendek menunjuk ke kanan.",
              example: { word: "아이", meaning: "anak", romanization: "ai" },
            },
            {
              character: "ㅣ",
              cue: 'Seperti "i" di "ini".',
              romanization: "i",
              say: "이",
              note: "Satu garis tegak.",
              example: {
                word: "이",
                meaning: "dua; gigi; ini",
                romanization: "i",
              },
            },
          ],
          { showRomanization: true },
        ),
        syllableGrid("Sekarang kamu bisa baca", ["ㅇ"], ["ㅏ", "ㅣ"], {
          showRomanization: true,
        }),
        game(
          "syllable-forge",
          "basic-vowels",
          "Susun blok pertamamu",
          "Gabungkan ㅇ dengan vokal jadi blok. Ada vokal yang belum kamu kenal, tidak apa-apa.",
        ),
        callout(
          "success",
          b("Ingat: "),
          '아이 dibaca dua suku kata, "a-i" (anak). Bukan "ai" seperti di "pantai".',
        ),
      ],
    },
    {
      type: "material",
      key: "m1-vowels-o-u-eu",
      title: "Vokal datar: ㅗ, ㅜ, ㅡ",
      description:
        "Vokal yang ditulis di bawah, dan beda ㅜ bulat dengan ㅡ datar.",
      minutes: 7,
      blocks: [
        callout(
          "info",
          "Vokal yang garisnya tegak ditulis di kanan. Vokal yang garisnya mendatar ditulis ",
          b("di bawah"),
          ".",
        ),
        rules({
          title: "Tegak di kanan, datar di bawah",
          columns: ["Vokal", "Posisi", "Contoh"],
          rows: [
            { when: "Tegak: ㅏ ㅣ", result: "di kanan", example: "아 이" },
            {
              when: "Datar: ㅗ ㅜ ㅡ",
              result: "di bawah",
              example: "오 우 으",
            },
          ],
        }),
        letters(
          "Huruf baru",
          [
            {
              character: "ㅗ",
              cue: 'Seperti "o" di "toko". Bibir bulat.',
              romanization: "o",
              say: "오",
              note: "Garis pendek menunjuk ke atas.",
              example: { word: "오이", meaning: "timun", romanization: "oi" },
            },
            {
              character: "ㅜ",
              cue: 'Seperti "u" di "buku". Bibir bulat dan maju.',
              romanization: "u",
              say: "우",
              note: "Garis pendek menunjuk ke bawah.",
              example: {
                word: "우아",
                meaning: "anggun",
                romanization: "ua",
              },
            },
            {
              character: "ㅡ",
              cue: 'Ucapkan "u", tapi bibir datar seperti senyum tipis.',
              romanization: "eu",
              say: "으",
              note: 'Tidak ada di bahasa Indonesia. "eu" itu satu bunyi.',
            },
          ],
          { showRomanization: true },
        ),
        contrast(
          "Bulat atau datar?",
          "Putar tiap pasangan, lalu tirukan sambil lihat bibirmu di cermin.",
          [
            {
              items: [
                { text: "우", romanization: "u" },
                { text: "으", romanization: "eu" },
              ],
              note: "ㅜ bibir bulat. ㅡ bibir datar.",
            },
            {
              items: [
                { text: "오", romanization: "o" },
                { text: "우", romanization: "u" },
              ],
              note: "ㅜ lebih maju dan lebih tertutup dari ㅗ.",
            },
            {
              items: [
                { text: "이", romanization: "i" },
                { text: "으", romanization: "eu" },
              ],
              note: "Sama-sama datar. Untuk ㅡ, lidah ditarik ke belakang.",
            },
          ],
          { showRomanization: true },
        ),
        syllableGrid(
          "Sekarang kamu bisa baca",
          ["ㅇ"],
          ["ㅏ", "ㅣ", "ㅗ", "ㅜ", "ㅡ"],
          { showRomanization: true },
        ),
        game(
          "stroke-master",
          "basic-vowels",
          "Kenali vokal dasar",
          "Cocokkan bentuk dan bunyi vokal. ㅓ juga muncul, kamu belajar di pelajaran berikutnya.",
        ),
        callout(
          "success",
          b("Ingat: "),
          "ㅜ bibir bulat, ㅡ bibir datar. Garis pendek ㅗ ke atas, ㅜ ke bawah.",
        ),
      ],
    },
    {
      type: "material",
      key: "m1-vowel-eo-lab",
      title: "ㅓ dan lab vokal",
      description: "Vokal ㅓ, beda ㅓ dengan ㅗ, dan kata pertamamu.",
      minutes: 8,
      blocks: [
        callout(
          "info",
          "ㅓ tidak ada di bahasa Indonesia dan paling sering tertukar dengan ㅗ. Kuncinya di ",
          b("bibir"),
          ".",
        ),
        letters(
          "Huruf baru",
          [
            {
              character: "ㅓ",
              cue: 'Buka mulut seperti "o", tapi bibir TIDAK bulat, santai saja.',
              romanization: "eo",
              say: "어",
              note: "Kalau bibirmu membulat, bunyinya jadi ㅗ. Garis pendek menunjuk ke kiri.",
              example: { word: "어", meaning: "eh?; oh!", romanization: "eo" },
            },
          ],
          { showRomanization: true },
        ),
        contrast(
          "Lab vokal: dengar dan bandingkan",
          "Putar tiap baris beberapa kali, lalu tirukan.",
          [
            {
              items: [
                { text: "어", romanization: "eo" },
                { text: "오", romanization: "o" },
              ],
              note: "ㅓ bibir santai. ㅗ bibir bulat.",
            },
            {
              items: [
                { text: "아", romanization: "a" },
                { text: "어", romanization: "eo" },
              ],
              note: "Sama-sama tidak bulat. ㅏ mulut lebih terbuka.",
            },
            {
              items: [
                { text: "우", romanization: "u" },
                { text: "으", romanization: "eu" },
              ],
              note: "ㅜ bulat. ㅡ datar.",
            },
            {
              items: [
                { text: "오이", meaning: "timun", romanization: "oi" },
                {
                  text: "어이",
                  meaning: "hei! (kurang sopan)",
                  romanization: "eoi",
                },
              ],
              note: "Salah vokal, beda arti.",
            },
          ],
          { showRomanization: true },
        ),
        rules({
          title: "Enam vokal dasar",
          intro: "Semua vokal yang sudah kamu kenal, dibedakan dari bibirnya.",
          theme: "green",
          columns: ["Bibir", "Vokal", "Mirip"],
          rows: [
            { when: "terbuka lebar", result: "ㅏ", example: '"a" di "apa"' },
            {
              when: "terbuka, tidak bulat",
              result: "ㅓ",
              example: "tidak ada",
            },
            { when: "bulat", result: "ㅗ", example: '"o" di "toko"' },
            { when: "bulat dan maju", result: "ㅜ", example: '"u" di "buku"' },
            { when: "datar", result: "ㅡ", example: "tidak ada" },
            { when: "datar, senyum", result: "ㅣ", example: '"i" di "ini"' },
          ],
        }),
        syllableGrid("Semua vokal dasar", ["ㅇ"], VOWELS, {
          showRomanization: true,
        }),
        vocabularyRef("m1-vocab-a"),
        game(
          "syllable-forge",
          "basic-vowels",
          "Susun blok vokal",
          "Susun ㅇ dengan keenam vokal. Tegak di kanan, datar di bawah.",
        ),
        assessmentRef("m1-quiz"),
        callout(
          "success",
          b("Ingat: "),
          "ㅓ dan ㅗ bedanya di bibir. Santai = ㅓ, bulat = ㅗ.",
        ),
      ],
    },
    {
      type: "vocabulary",
      key: "m1-vocab-a",
      title: "Kosakata A: kata dari vokal",
      description:
        "Kata-kata pertama yang hanya memakai ㅇ dan vokal dasar. Jumlahnya sedikit karena kamu belum belajar konsonan.",
      entries: [
        {
          term: "아이",
          definition: "anak; anak kecil",
          romanization: "ai",
          examples: ["Dua blok: 아 + 이."],
        },
        { term: "오이", definition: "timun", romanization: "oi" },
        {
          term: "이",
          definition: "dua (angka); gigi; ini",
          romanization: "i",
          examples: [
            "Satu kata bisa punya beberapa arti. Konteks yang menentukan.",
          ],
        },
        { term: "오", definition: "lima (angka); oh!", romanization: "o" },
        {
          term: "아우",
          definition: "adik (kata lama, antarsaudara laki-laki)",
          romanization: "au",
        },
        { term: "우아", definition: "anggun; keanggunan", romanization: "ua" },
        {
          term: "아",
          definition: "ah! (seruan saat sadar atau terkejut)",
          romanization: "a",
        },
        {
          term: "어",
          definition: "eh?; oh! (seruan); iya (santai)",
          romanization: "eo",
          examples: ["Bandingkan dengan 오: ㅓ bibir santai, ㅗ bibir bulat."],
        },
      ],
    },
    {
      type: "vocabulary",
      key: "m1-vocab-letters",
      title: "24 huruf Hangeul",
      description:
        "14 konsonan dan 10 vokal dasar, dengan bunyinya. Huruf h di ch, kh, th, ph artinya ada hembusan napas.",
      entries: [
        {
          term: "ㄱ",
          definition: "g",
          romanization: "g",
          say: "가",
          examples: ["가 (ga), 고기 (daging)"],
        },
        {
          term: "ㄴ",
          definition: "n",
          romanization: "n",
          say: "나",
          examples: ["나 (na), 나무 (pohon)"],
        },
        {
          term: "ㄷ",
          definition: "d",
          romanization: "d",
          say: "다",
          examples: ["다 (da), 두부 (tahu)"],
        },
        {
          term: "ㄹ",
          definition: "r / l",
          romanization: "r/l",
          say: "라",
          examples: ["Di depan r ringan: 나라 (negara). Di bawah l: 물 (air)."],
        },
        {
          term: "ㅁ",
          definition: "m",
          romanization: "m",
          say: "마",
          examples: ["마 (ma), 어머니 (ibu)"],
        },
        {
          term: "ㅂ",
          definition: "b",
          romanization: "b",
          say: "바",
          examples: ["바 (ba), 바나나 (pisang)"],
        },
        {
          term: "ㅅ",
          definition: "s",
          romanization: "s",
          say: "사",
          examples: ["사 (sa), 버스 (bus)"],
        },
        {
          term: "ㅇ",
          definition: "ng",
          romanization: "ng",
          say: "앙",
          examples: [
            "Di depan blok diam: 아 (a). Di bawah blok ng: 방 (kamar).",
          ],
        },
        {
          term: "ㅈ",
          definition: "j",
          romanization: "j",
          say: "자",
          examples: ["자 (ja), 아버지 (ayah)"],
        },
        {
          term: "ㅊ",
          definition: "ch",
          romanization: "ch",
          say: "차",
          examples: ["ㅈ dengan hembusan napas: 차 (cha), 치마 (rok)"],
        },
        {
          term: "ㅋ",
          definition: "kh",
          romanization: "kh",
          say: "카",
          examples: [
            'k dengan hembusan napas, bukan "kh" di "khusus": 카 (kha), 커피 (kopi)',
          ],
        },
        {
          term: "ㅌ",
          definition: "th",
          romanization: "th",
          say: "타",
          examples: ["t dengan hembusan napas: 타 (tha), 토마토 (tomat)"],
        },
        {
          term: "ㅍ",
          definition: "ph",
          romanization: "ph",
          say: "파",
          examples: ["p dengan hembusan napas: 파 (pha), 포도 (anggur)"],
        },
        {
          term: "ㅎ",
          definition: "h",
          romanization: "h",
          say: "하",
          examples: ["하 (ha), 하나 (satu)"],
        },
        {
          term: "ㅏ",
          definition: "a",
          romanization: "a",
          say: "아",
          examples: ['Seperti "a" di "apa": 아이 (anak)'],
        },
        {
          term: "ㅑ",
          definition: "ya",
          romanization: "ya",
          say: "야",
          examples: ["야구 (bisbol)"],
        },
        {
          term: "ㅓ",
          definition: "eo",
          romanization: "eo",
          say: "어",
          examples: ['Seperti "o", tapi bibir tidak bulat: 어머니 (ibu)'],
        },
        {
          term: "ㅕ",
          definition: "yeo",
          romanization: "yeo",
          say: "여",
          examples: ["y + ㅓ: 여기 (di sini)"],
        },
        {
          term: "ㅗ",
          definition: "o",
          romanization: "o",
          say: "오",
          examples: ['Seperti "o" di "toko": 오이 (timun)'],
        },
        {
          term: "ㅛ",
          definition: "yo",
          romanization: "yo",
          say: "요",
          examples: ["요리 (masakan)"],
        },
        {
          term: "ㅜ",
          definition: "u",
          romanization: "u",
          say: "우",
          examples: ['Seperti "u" di "buku": 우유 (susu)'],
        },
        {
          term: "ㅠ",
          definition: "yu",
          romanization: "yu",
          say: "유",
          examples: ["우유 (susu): 유 = yu"],
        },
        {
          term: "ㅡ",
          definition: "eu",
          romanization: "eu",
          say: "으",
          examples: ['Seperti "u", tapi bibir datar: 버스 (bus)'],
        },
        {
          term: "ㅣ",
          definition: "i",
          romanization: "i",
          say: "이",
          examples: ['Seperti "i" di "ini": 이 (dua)'],
        },
      ],
    },
    {
      type: "assessment",
      key: "m1-quiz",
      title: "Kuis modul 1: vokal dasar",
      description:
        "14 soal tentang ㅇ yang diam, enam vokal dasar, posisi vokal di dalam blok, dan kata-kata pertamamu.",
      instructions:
        "Untuk soal mendengar, putar audionya sebanyak yang kamu perlukan. Nilai lulus 80%.",
      passingScore: 80,
      shuffleOptions: true,
      questions: [
        single(
          "silent-ieung",
          "Bagaimana huruf ㅇ dibaca di awal blok, misalnya di 아?",
          ['Dibaca "ng"', "Tidak dibaca (diam)", 'Dibaca "o"', 'Dibaca "a"'],
          1,
          'Di awal blok, ㅇ hanya penjaga tempat dan tidak dibaca. 아 dibaca "a". Bunyi "ng" baru muncul kalau ㅇ ada di bagian bawah blok.',
        ),
        single(
          "hear-o",
          hear("오", "Dengarkan, lalu pilih vokal yang kamu dengar."),
          ["ㅓ", "ㅜ", "ㅗ", "ㅡ"],
          2,
          'Yang kamu dengar adalah 오: bibir bulat, seperti "o" di "toko".',
        ),
        single(
          "hear-eo",
          hear("어", "Dengarkan, lalu pilih vokal yang kamu dengar."),
          ["ㅓ", "ㅗ", "ㅏ", "ㅜ"],
          0,
          "Yang kamu dengar adalah 어: rahang terbuka, bibir santai dan tidak bulat. Kalau bibirnya bulat, bunyinya menjadi 오.",
        ),
        single(
          "hear-eu",
          hear("으", "Dengarkan, lalu pilih suku kata yang kamu dengar."),
          ["우", "오", "이", "으"],
          3,
          'Yang kamu dengar adalah 으: seperti "u", tetapi bibir datar.',
        ),
        single(
          "hear-u",
          hear("우", "Dengarkan, lalu pilih suku kata yang kamu dengar."),
          ["으", "우", "오", "어"],
          1,
          'Yang kamu dengar adalah 우: bibir bulat dan maju, seperti "u" di "buku".',
        ),
        single(
          "build-o",
          "Blok mana yang tersusun dari ㅇ + ㅗ?",
          ["어", "우", "아", "오"],
          3,
          "ㅗ adalah vokal datar, jadi ditulis di bawah ㅇ: 오.",
        ),
        single(
          "build-eo",
          "Blok mana yang tersusun dari ㅇ + ㅓ?",
          ["어", "오", "아", "으"],
          0,
          "ㅓ adalah vokal tegak, jadi ditulis di kanan ㅇ, dengan garis pendek menunjuk ke kiri: 어.",
        ),
        single(
          "below",
          "Vokal mana yang ditulis di bawah konsonan?",
          ["ㅏ", "ㅓ", "ㅜ", "ㅣ"],
          2,
          "ㅜ adalah vokal datar, jadi ditulis di bawah konsonan (우). ㅏ, ㅓ, dan ㅣ adalah vokal tegak yang ditulis di kanan.",
        ),
        single(
          "position-a",
          "Di blok 아, di mana vokal ㅏ ditulis?",
          ["Di bawah ㅇ", "Di kanan ㅇ", "Di atas ㅇ", "Di kiri ㅇ"],
          1,
          "Vokal tegak (ㅏ ㅓ ㅣ) selalu ditulis di kanan konsonan.",
        ),
        single(
          "read-oi",
          "Apa arti kata 오이?",
          ["Anak", "Lima", "Timun", "Dua"],
          2,
          "오이 berarti timun. 아이 berarti anak, 오 berarti lima, dan 이 berarti dua.",
        ),
        single(
          "read-ai",
          "Apa arti kata 아이?",
          ["Anak", "Timun", "Gigi", "Anggun"],
          0,
          "아이 berarti anak. Ucapkan dua suku kata yang jelas: 아 lalu 이.",
        ),
        single(
          "flat-u",
          'Vokal mana yang diucapkan seperti "u", tetapi dengan bibir datar?',
          ["ㅜ", "ㅗ", "ㅣ", "ㅡ"],
          3,
          'ㅡ tidak ada di bahasa Indonesia: lidah seperti "u", bibir datar. ㅜ adalah "u" dengan bibir bulat.',
        ),
        single(
          "cue-o",
          'Vokal mana yang mirip "o" di "toko", dengan bibir bulat?',
          ["ㅓ", "ㅗ", "ㅜ", "ㅏ"],
          1,
          'ㅗ mirip "o" di "toko" dengan bibir bulat. ㅓ diucapkan dengan rahang terbuka dan bibir tidak bulat.',
        ),
        single(
          "hear-oi",
          hear("오이", "Dengarkan, lalu pilih kata yang kamu dengar."),
          ["어이", "우이", "아이", "오이"],
          3,
          "Yang kamu dengar adalah 오이 (timun). Suku kata pertamanya ㅗ dengan bibir bulat.",
        ),
      ],
    },
  ],
};
