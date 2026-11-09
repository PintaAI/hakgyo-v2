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

const hear = (
  text: string,
  intro = "Dengarkan, lalu pilih kata yang kamu dengar.",
) => [p(intro), listen(text)];

export const m7BatchimBasics: ModuleContent = {
  key: "m7-batchim-basics",
  title: "Batchim",
  description:
    "Huruf di lantai bawah blok. Hanya ada tujuh bunyi akhir, dan semuanya sudah ada di bahasa Indonesia.",
  items: [
    {
      type: "material",
      key: "m7-batchim-nasals",
      title: "Batchim: mulai dari ㄴ ㅁ ㅇ",
      description:
        "Lantai bawah blok, tujuh bunyi akhir, dan batchim ㄴ ㅁ ㅇ.",
      minutes: 7,
      blocks: [
        callout(
          "info",
          b("Batchim = huruf di lantai bawah blok."),
          " Dibaca paling akhir: 산 = ㅅ, ㅏ, lalu ㄴ.",
        ),
        rules({
          title: "Tujuh bunyi akhir",
          intro:
            "Di bawah blok hanya ada tujuh bunyi. Semuanya sudah kamu ucapkan di akhir kata Indonesia.",
          columns: ["Mirip akhir", "Batchim", "Contoh"],
          rows: [
            { when: "musik", result: "ㄱ", example: "책 (buku)" },
            { when: "makan", result: "ㄴ", example: "산 (gunung)" },
            { when: "surat", result: "ㄷ", example: "곧 (segera)" },
            { when: "mobil", result: "ㄹ", example: "물 (air)" },
            { when: "malam", result: "ㅁ", example: "밤 (malam)" },
            { when: "siap", result: "ㅂ", example: "밥 (nasi)" },
            { when: "uang", result: "ㅇ", example: "방 (kamar)" },
          ],
          tip: {
            title: "Berhenti di batchim",
            text: 'Jangan tambah vokal. 산 dibaca "san", bukan "sa-ne".',
          },
        }),
        letters(
          "Batchim ㄴ ㅁ ㅇ",
          [
            {
              character: "ㄴ",
              cue: 'Seperti "n" di akhir "makan".',
              say: "안",
              note: "Ujung lidah menempel di belakang gigi atas.",
              example: { word: "산", meaning: "gunung" },
            },
            {
              character: "ㅁ",
              cue: 'Seperti "m" di akhir "malam".',
              say: "암",
              note: "Bibir menutup rapat.",
              example: { word: "밤", meaning: "malam" },
            },
            {
              character: "ㅇ",
              cue: 'Seperti "ng" di akhir "uang".',
              say: "앙",
              note: 'Di atas ㅇ diam, di bawah ㅇ dibaca ng: 앙 = "ang".',
              example: { word: "방", meaning: "kamar" },
            },
          ],
          { showRomanization: false },
        ),
        contrast(
          "n, m, atau ng?",
          "Putar setiap baris. Hanya bunyi akhirnya yang berbeda.",
          [
            {
              items: [
                { text: "반", meaning: "kelas; setengah" },
                { text: "밤", meaning: "malam" },
                { text: "방", meaning: "kamar" },
              ],
              note: "Lidah di depan (ㄴ), bibir menutup (ㅁ), pangkal lidah naik (ㅇ).",
            },
            {
              items: [
                { text: "산", meaning: "gunung" },
                { text: "삼", meaning: "tiga" },
                { text: "상", meaning: "meja makan; hadiah" },
              ],
            },
            {
              items: [
                { text: "간", meaning: "hati (organ)" },
                { text: "감", meaning: "kesemek" },
                { text: "강", meaning: "sungai" },
              ],
            },
          ],
          { showRomanization: false },
        ),
        syllableGrid(
          "Sekarang kamu bisa baca",
          ["ㅇ", "ㄱ", "ㄴ", "ㅅ", "ㅎ"],
          ["ㅏ", "ㅓ", "ㅗ", "ㅜ"],
          { final: "ㄴ" },
        ),
        p(
          "Ingat 안녕하세요 dari Modul 0? Sekarang kamu bisa membacanya sendiri: 안-녕-하-세-요.",
        ),
        audioClip("안녕하세요", "Halo, apa kabar? (sopan)", "안녕하세요"),
        audioClip("사랑해요", "Aku sayang kamu.", "사랑해요"),
        game(
          "syllable-forge",
          "batchim",
          "Susun blok dengan batchim",
          "Susun blok tiga lantai: konsonan, vokal, lalu batchim.",
        ),
        callout(
          "success",
          b("Ingat: "),
          "batchim dibaca paling akhir, lalu berhenti. ㄴ = n, ㅁ = m, ㅇ = ng.",
        ),
      ],
    },
    {
      type: "material",
      key: "m7-batchim-rieul",
      title: 'Batchim ㄹ: l seperti di "mobil"',
      description: "ㄹ di bawah blok dibaca l, bukan r.",
      minutes: 6,
      blocks: [
        callout(
          "info",
          "ㄹ di awal blok dibaca r ringan. Di bawah blok, ㄹ dibaca ",
          b("l"),
          ".",
        ),
        rules({
          title: "Tiga bunyi ㄹ",
          columns: ["Posisi", "Dibaca", "Contoh"],
          rows: [
            {
              when: "di awal blok",
              result: "r ringan",
              example: "나라 (negara)",
            },
            { when: "di bawah blok", result: "l", example: "물 (air)" },
            {
              when: "ㄹ bertemu ㄹ",
              result: "l panjang",
              example: '빨리 (cepat) = "ppal-li"',
            },
          ],
        }),
        letters(
          "Batchim ㄹ",
          [
            {
              character: "ㄹ",
              cue: 'Seperti "l" di akhir "mobil".',
              say: "알",
              note: "Lidah menempel lalu diam, jangan digetarkan.",
              example: { word: "물", meaning: "air" },
            },
          ],
          { showRomanization: false },
        ),
        contrast(
          "Di bawah l, di awal r",
          "Putar setiap baris. Dengarkan beda ㄹ di bawah dan ㄹ di awal blok.",
          [
            {
              items: [
                { text: "달", meaning: "bulan" },
                { text: "다리", meaning: "kaki; jembatan" },
              ],
              note: "달: lidah menempel (l). 다리: lidah mengetuk sekali (r).",
            },
            {
              items: [
                { text: "일", meaning: "pekerjaan; satu" },
                { text: "이리", meaning: "ke sini" },
              ],
            },
            {
              items: [
                { text: "달", meaning: "bulan" },
                { text: "탈", meaning: "topeng" },
                { text: "딸", meaning: "anak perempuan" },
              ],
              note: "Ulasan: polos, pakai hembusan napas, tegang.",
            },
          ],
          { showRomanization: false },
        ),
        syllableGrid(
          "Sekarang kamu bisa baca",
          ["ㅇ", "ㄱ", "ㄷ", "ㅁ", "ㅂ", "ㅅ"],
          ["ㅏ", "ㅓ", "ㅗ", "ㅜ", "ㅣ"],
          { final: "ㄹ" },
        ),
        audioClip("물 주세요.", "Tolong beri air.", "물 주세요."),
        game(
          "word-builder",
          "batchim",
          "Susun kata dengan batchim",
          "Susun 서울, 오늘, 얼굴, dan kata lain dari huruf-hurufnya.",
        ),
        callout(
          "success",
          b("Ingat: "),
          'ㄹ di bawah = l seperti di "mobil", ㄹ di awal = r ringan.',
        ),
      ],
    },
    {
      type: "material",
      key: "m7-batchim-stops",
      title: "ㄱ ㅂ ㄷ: tutup, lalu diam",
      description:
        "Batchim yang ditahan tanpa hembusan, dan banyak huruf yang dibaca dengan tujuh bunyi.",
      minutes: 8,
      blocks: [
        callout(
          "info",
          "ㄱ ㅂ ㄷ di bawah blok ditutup lalu ",
          b("diam"),
          ': tanpa hembusan, tanpa vokal tambahan. Seperti akhir "siap".',
        ),
        letters(
          "Batchim ㄱ ㅂ ㄷ",
          [
            {
              character: "ㄱ",
              cue: 'Seperti "k" di akhir "musik".',
              say: "악",
              note: 'Pangkal lidah menutup rapat, beda dengan "k" di "tidak" yang hanya tertahan di tenggorokan.',
              example: { word: "책", meaning: "buku" },
            },
            {
              character: "ㅂ",
              cue: 'Seperti "p" di akhir "siap".',
              say: "압",
              note: "Bibir menutup dan tidak dibuka lagi.",
              example: { word: "밥", meaning: "nasi; makanan" },
            },
            {
              character: "ㄷ",
              cue: 'Seperti "t" di akhir "surat".',
              say: "곧",
              note: "Bunyi ini lebih sering ditulis dengan huruf lain, lihat aturan di bawah.",
              example: { word: "받침", meaning: "batchim" },
            },
          ],
          { showRomanization: false },
        ),
        contrast(
          "Tutup atau sengau?",
          "Putar setiap baris. Bedanya hanya di akhir blok.",
          [
            {
              items: [
                { text: "밥", meaning: "nasi" },
                { text: "밤", meaning: "malam" },
                { text: "방", meaning: "kamar" },
              ],
              note: "ㅂ dan ㅁ sama-sama menutup bibir. ㅁ berbunyi sengau lewat hidung.",
            },
            {
              items: [
                { text: "약", meaning: "obat" },
                { text: "양", meaning: "domba" },
              ],
              note: "ㄱ dan ㅇ sama-sama di pangkal lidah. ㅇ berbunyi sengau lewat hidung.",
            },
          ],
          { showRomanization: false },
        ),
        rules({
          title: "Banyak huruf, tujuh bunyi",
          intro:
            "Hampir semua konsonan boleh jadi batchim, tapi dibaca dengan salah satu dari tujuh bunyi.",
          theme: "green",
          columns: ["Ditulis", "Dibaca", "Contoh"],
          rows: [
            { when: "ㄱ ㅋ ㄲ", result: "[ㄱ]", example: "밖 (luar) = [박]" },
            {
              when: "ㄷ ㅅ ㅆ ㅈ ㅊ ㅌ ㅎ",
              result: "[ㄷ]",
              example: "옷 (baju) = [옫]",
            },
            { when: "ㅂ ㅍ", result: "[ㅂ]", example: "앞 (depan) = [압]" },
            {
              when: "ㄴ ㄹ ㅁ ㅇ",
              result: "tetap",
              example: "산, 물, 밤, 방",
            },
          ],
          tip: {
            title: "Kenapa ejaannya beda?",
            text: "Huruf aslinya terdengar lagi kalau setelahnya ada vokal: 옷이 dibaca [오시]. Itu di Modul 8.",
          },
        }),
        contrast(
          "Ejaan beda, bunyi sama",
          "Putar setiap baris. Kata dalam satu baris terdengar sama kalau berdiri sendiri.",
          [
            {
              items: [
                { text: "낫", meaning: "sabit" },
                { text: "낮", meaning: "siang" },
                { text: "낯", meaning: "muka, raut" },
              ],
              note: "ㅅ, ㅈ, ㅊ di bawah semuanya dibaca [ㄷ]: [낟].",
            },
            {
              items: [
                { text: "입", meaning: "mulut" },
                { text: "잎", meaning: "daun" },
              ],
              note: "ㅍ di bawah dibaca [ㅂ]: [입].",
            },
            {
              items: [
                { text: "박", meaning: "labu" },
                { text: "밖", meaning: "luar" },
              ],
              note: "ㄲ di bawah dibaca [ㄱ]: [박].",
            },
          ],
          { showRomanization: false },
        ),
        syllableGrid(
          "Sekarang kamu bisa baca",
          ["ㄱ", "ㄴ", "ㅂ", "ㅅ", "ㅈ"],
          ["ㅏ", "ㅓ", "ㅗ", "ㅜ", "ㅣ"],
          { final: "ㄱ" },
        ),
        vocabularyRef("m7-vocab-batchim"),
        game(
          "syllable-forge",
          "batchim",
          "Susun blok dengan ㄱ ㅂ ㄷ",
          "Latih blok yang ditutup tanpa meledak.",
        ),
        game(
          "word-builder",
          "batchim",
          "Susun kata batchim",
          "Susun 한국, 사랑, 선생님, dan kata lain dari huruf-hurufnya.",
        ),
        assessmentRef("m7-quiz"),
        callout(
          "success",
          b("Ingat: "),
          "di bawah blok hanya ada tujuh bunyi, dan ㄱ ㅂ ㄷ ditutup lalu diam.",
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
          definition: "halo; apa kabar (sopan)",
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
          definition: "siswa; pelajar",
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
          definition: "bos; pemilik usaha (sapaan hormat)",
          romanization: "sajangnim",
        },
        { term: "병원", definition: "rumah sakit", romanization: "byeongwon" },
        {
          term: "옷",
          definition: "baju; pakaian",
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
          definition: "mantap; luar biasa",
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
