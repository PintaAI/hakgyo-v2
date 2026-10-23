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

const CORE = ["ㅇ", "ㄴ", "ㅁ", "ㅅ", "ㅂ", "ㄱ", "ㄷ", "ㅈ", "ㅎ", "ㄹ"];
const NO_ROMANIZATION = { showRomanization: false };

export const m3YVowels: ModuleContent = {
  key: "m3-y-vowels",
  title: "Vokal Y dan ㅐ ㅔ",
  description:
    "Vokal ㅑ ㅕ ㅛ ㅠ yang mendapat bunyi y, ㅐ ㅔ ㅒ ㅖ yang kini dibedakan lewat ejaan, dan sapaan sopan pertamamu. Mulai modul ini romanisasi disembunyikan.",
  items: [
    {
      type: "material",
      key: "m3-ya-yeo-yo-yu",
      title: "ㅑ ㅕ ㅛ ㅠ: tambah garis, tambah y",
      description:
        "Empat vokal baru yang dibuat dari vokal dasar dengan satu garis tambahan, dan jebakan ㅕ/ㅛ.",
      minutes: 15,
      blocks: [
        heading("Satu garis lagi = bunyi y"),
        p(
          'Ingat titik langit ㆍ di modul 0? Kalau garis pendek pada vokal dasar ditulis dobel, vokal itu mendapat bunyi "y" di depannya. Jadi kamu tidak perlu menghafal huruf baru dari nol: cukup tambahkan satu garis.',
        ),
        table([
          ["Vokal dasar", "Tambah garis", "Bunyi kira-kira"],
          ["ㅏ", "ㅑ", '"ya" di "saya"'],
          ["ㅓ", "ㅕ", '"y" lalu ㅓ'],
          ["ㅗ", "ㅛ", '"yo" di "yoyo"'],
          ["ㅜ", "ㅠ", '"yu" di "ayu"'],
        ]),
        p(
          "Posisinya sama seperti vokal dasarnya: ㅑ dan ㅕ tegak, jadi ditulis di kanan konsonan; ㅛ dan ㅠ datar, jadi ditulis di bawah.",
        ),
        callout(
          "info",
          "Mulai modul ini romanisasi disembunyikan. Bacalah langsung dari Hangeulnya dan cek dengan audio. Kamu sudah bisa!",
        ),
        letters(
          "Huruf baru",
          [
            {
              character: "ㅑ",
              cue: 'Seperti "ya" di "saya".',
              romanization: "ya",
              say: "야",
              note: "Cara menulis: garis tegak dari atas ke bawah, lalu dua garis pendek dari kiri ke kanan, yang atas dulu.",
              example: {
                word: "야구",
                meaning: "bisbol",
                romanization: "yagu",
              },
            },
            {
              character: "ㅕ",
              cue: '"y" lalu ㅓ. Bibir tetap santai; jangan dibulatkan menjadi "yo".',
              romanization: "yeo",
              say: "여",
              note: "Cara menulis: dua garis pendek dari kiri ke kanan, yang atas dulu, lalu garis tegak dari atas ke bawah.",
              example: {
                word: "여기",
                meaning: "di sini",
                romanization: "yeogi",
              },
            },
            {
              character: "ㅛ",
              cue: 'Seperti "yo" di "yoyo". Bibir bulat.',
              romanization: "yo",
              say: "요",
              note: "Cara menulis: dua garis pendek tegak dari atas ke bawah, kiri dulu lalu kanan, kemudian garis datar dari kiri ke kanan.",
              example: {
                word: "요리",
                meaning: "masakan; memasak",
                romanization: "yori",
              },
            },
            {
              character: "ㅠ",
              cue: 'Seperti "yu" di "ayu". Bibir bulat dan maju.',
              romanization: "yu",
              say: "유",
              note: "Cara menulis: garis datar dari kiri ke kanan, lalu dua garis pendek tegak di bawahnya, kiri dulu lalu kanan.",
              example: { word: "우유", meaning: "susu", romanization: "uyu" },
            },
          ],
          NO_ROMANIZATION,
        ),
        callout(
          "warning",
          "ㅕ adalah jebakan terbesar di pelajaran ini. Kalau bibirmu membulat, 여 berubah menjadi 요. Ingat: ㅕ = y + ㅓ, bibir santai.",
        ),
        contrast(
          "ㅕ atau ㅛ?",
          "Dengarkan setiap baris. Mulailah dengan bibir santai untuk ㅕ, lalu bulatkan bibir untuk ㅛ.",
          [
            {
              items: [{ text: "어" }, { text: "여" }],
              note: 'Tambahkan "y" di depan ㅓ.',
            },
            {
              items: [{ text: "여" }, { text: "요" }],
              note: "ㅕ santai, ㅛ bulat.",
            },
            {
              items: [{ text: "겨" }, { text: "교" }],
              note: "Sama, dengan ㄱ di depannya.",
            },
            {
              items: [{ text: "유" }, { text: "요" }],
              note: "ㅠ lebih maju dan tertutup, ㅛ lebih terbuka.",
            },
            {
              items: [{ text: "아" }, { text: "야" }],
              note: 'Tambahkan "y" di depan ㅏ.',
            },
          ],
          NO_ROMANIZATION,
        ),
        syllableGrid(
          "Tabel suku kata vokal Y",
          CORE,
          ["ㅑ", "ㅕ", "ㅛ", "ㅠ"],
          NO_ROMANIZATION,
        ),
        p(
          "Catatan kecil: setelah ㅈ, ㅕ diucapkan seperti ㅓ, jadi 져 terdengar sama dengan 저. Kamu akan bertemu ini nanti di bentuk kata kerja.",
        ),
        heading("Cara menulis", 3),
        bullet(
          "Dua garis pendek ditulis berurutan: yang atas atau yang kiri dulu.",
        ),
        bullet(
          "Jaga jarak kedua garis pendek supaya jelas terlihat dobel. ㅑ yang garisnya terlalu rapat mudah terbaca sebagai ㅏ.",
        ),
        heading("Latihan baca", 3),
        p("Baca dari Hangeulnya, lalu putar audio untuk mengecek."),
        audioClip("여기", "여기"),
        audioClip("우유", "우유"),
        table([
          ["Hangeul", "Arti"],
          ["야구", "bisbol"],
          ["여기", "di sini"],
          ["요리", "masakan; memasak"],
          ["우유", "susu"],
          ["여자", "perempuan"],
          ["요가", "yoga"],
          ["교사", "guru"],
          ["휴지", "tisu"],
          ["휴가", "cuti; liburan"],
          ["무료", "gratis"],
          ["여보", "sayang (panggilan suami-istri)"],
          ["유리", "kaca"],
        ]),
        heading("Frasa pendek", 3),
        table([
          ["Frasa", "Arti"],
          ["여기 어디야?", "Ini di mana? (santai)"],
          ["우유 하나", "satu susu"],
          ["야구 보러 가?", "Mau pergi nonton bisbol? (santai)"],
        ]),
        game(
          "stroke-master",
          "y-vowels",
          "Kenali vokal Y",
          "Main Hangeul dengan vokal baru. Permainan ini juga memuat ㅐ ㅔ ㅒ ㅖ dari pelajaran berikutnya.",
        ),
        callout(
          "success",
          "Ringkasan: garis pendek yang dobel menambahkan bunyi y: ㅑ (ya), ㅕ (y + ㅓ, bibir santai), ㅛ (yo), ㅠ (yu). Posisinya mengikuti vokal dasarnya. Hati-hati agar ㅕ tidak berubah menjadi ㅛ.",
        ),
      ],
    },
    {
      type: "material",
      key: "m3-ae-e",
      title: "ㅐ ㅔ ㅒ ㅖ: dua ejaan, satu bunyi",
      description:
        'Empat vokal yang bunyinya kini hampir sama, jadi kamu belajar membedakannya lewat ejaan, serta jebakan romanisasi "e" dan "ae".',
      minutes: 15,
      blocks: [
        heading("Dua huruf, satu bunyi"),
        p(
          "Dulu ㅐ dan ㅔ berbeda bunyi: ㅐ diucapkan dengan mulut sedikit lebih terbuka. Sekarang ",
          b("kebanyakan penutur Seoul mengucapkan keduanya sama"),
          ', seperti e taling di "enak" atau "sate". Bedanya tinggal di ejaan.',
        ),
        p(
          "Jadi tugasmu bukan membedakan bunyinya, tetapi menghafal ejaan setiap kata. 개 (anjing) ditulis dengan ㅐ, sedangkan 게 (kepiting) dengan ㅔ.",
        ),
        letters(
          "Huruf baru",
          [
            {
              character: "ㅐ",
              cue: 'E taling seperti di "enak" atau "sate", bukan e pepet di "emas".',
              romanization: "ae",
              say: "애",
              note: "Bentuknya ㅏ + ㅣ. Cara menulis: garis tegak kiri dari atas ke bawah, garis pendek ke kanan, lalu garis tegak kanan.",
              example: { word: "개", meaning: "anjing", romanization: "gae" },
            },
            {
              character: "ㅔ",
              cue: 'Bunyinya sama dengan ㅐ: e taling seperti di "enak".',
              romanization: "e",
              say: "에",
              note: "Bentuknya ㅓ + ㅣ. Cara menulis: garis pendek dari kiri ke kanan, garis tegak kiri, lalu garis tegak kanan.",
              example: { word: "게", meaning: "kepiting", romanization: "ge" },
            },
            {
              character: "ㅒ",
              cue: '"y" lalu e taling.',
              romanization: "yae",
              say: "얘",
              note: "Jarang dipakai. Cara menulis: garis tegak kiri, dua garis pendek ke kanan, lalu garis tegak kanan.",
              example: {
                word: "얘기",
                meaning: "cerita; obrolan",
                romanization: "yaegi",
              },
            },
            {
              character: "ㅖ",
              cue: '"y" lalu e taling. Setelah konsonan selain ㄹ, biasanya diucapkan seperti ㅔ saja.',
              romanization: "ye",
              say: "예",
              note: "Contohnya 시계 biasa terdengar seperti 시게. Cara menulis: dua garis pendek dari kiri ke kanan, garis tegak kiri, lalu garis tegak kanan.",
              example: { word: "시계", meaning: "jam", romanization: "sigye" },
            },
          ],
          NO_ROMANIZATION,
        ),
        callout(
          "warning",
          'Hati-hati dengan romanisasi. "e" di romanisasi Korea adalah e taling seperti di "enak", bukan e pepet. "ae" juga bukan "a" lalu "e", melainkan satu bunyi e taling. Jadi "saranghae" diucapkan dengan akhir "he", bukan "ha-e".',
        ),
        contrast(
          "Bunyi sama, ejaan beda",
          "Putar setiap pasangan. Bagi kebanyakan penutur Seoul, keduanya terdengar sama. Perhatikan ejaan dan artinya.",
          [
            {
              items: [
                { text: "개", meaning: "anjing" },
                { text: "게", meaning: "kepiting" },
              ],
              note: "Konteks yang menentukan: 개 menggonggong, 게 punya capit.",
            },
            {
              items: [
                { text: "내", meaning: "milikku" },
                { text: "네", meaning: "ya; milikmu" },
              ],
              note: 'Karena bunyinya sama, dalam percakapan 네 yang berarti "milikmu" sering diucapkan 니.',
            },
            {
              items: [
                { text: "새", meaning: "burung; baru" },
                { text: "세", meaning: "tiga (sebelum kata satuan)" },
              ],
            },
            { items: [{ text: "애" }, { text: "에" }] },
            { items: [{ text: "얘" }, { text: "예" }] },
          ],
          NO_ROMANIZATION,
        ),
        heading("Trik mengingat ejaan", 3),
        bullet(
          "ㅐ = ㅏ + ㅣ, jadi garis pendeknya ada di antara dua batang. ㅔ = ㅓ + ㅣ, jadi garis pendeknya ada di sebelah kiri.",
        ),
        bullet(
          "Hafalkan kata, bukan bunyinya. Dengan ㅐ: 개, 새, 배, 노래, 배우. Dengan ㅔ: 게, 네, 가게, 어제, 메뉴, 세계.",
        ),
        bullet(
          "Kesalahan ejaan ㅐ/ㅔ tidak mengubah bunyimu. Orang tetap mengerti, tetapi saat menulis, usahakan ejaannya benar.",
        ),
        syllableGrid(
          "Tabel suku kata ㅐ dan ㅔ",
          CORE,
          ["ㅐ", "ㅔ"],
          NO_ROMANIZATION,
        ),
        heading("Latihan baca", 3),
        audioClip("노래", "노래"),
        audioClip("가게", "가게"),
        table([
          ["Hangeul", "Arti"],
          ["개", "anjing"],
          ["게", "kepiting"],
          ["새", "burung; baru"],
          ["배", "perut; perahu; buah pir"],
          ["노래", "lagu"],
          ["배우", "aktor; aktris"],
          ["가게", "toko"],
          ["어제", "kemarin"],
          ["메뉴", "menu"],
          ["세계", "dunia"],
          ["시계", "jam"],
          ["네", "ya"],
          ["예", "ya (lebih formal)"],
          ["얘기", "cerita; obrolan"],
        ]),
        game(
          "syllable-forge",
          "y-vowels",
          "Susun suku kata dengan vokal baru",
          "Susun suku kata dengan ㅑ ㅕ ㅛ ㅠ dan ㅐ ㅔ ㅒ ㅖ. Perhatikan apakah vokalnya ditulis di kanan atau di bawah.",
        ),
        callout(
          "success",
          'Ringkasan: ㅐ dan ㅔ kini diucapkan sama, seperti e taling di "enak"; bedanya hanya di ejaan, jadi hafalkan ejaan setiap kata. ㅒ dan ㅖ menambahkan bunyi y, dan ㅖ setelah konsonan biasanya terdengar seperti ㅔ.',
        ),
      ],
    },
    {
      type: "material",
      key: "m3-reading-phrases",
      title: "Sapaan dan kalimat pertamamu",
      description:
        "Ungkapan sopan yang sering dipakai di toko, di telepon, dan di tempat kerja, semuanya bisa kamu baca dengan huruf yang sudah kamu kenal.",
      minutes: 15,
      blocks: [
        heading("Kamu sudah bisa membaca kalimat"),
        p(
          "Pelajaran ini tidak memperkenalkan huruf baru. Kamu memakai semua huruf yang sudah kamu kenal untuk membaca ungkapan yang sangat sering dipakai di Korea, termasuk di toko dan di tempat kerja.",
        ),
        heading("Akhiran sopan 요", 3),
        p(
          "Banyak kalimat sopan diakhiri 요. Bandingkan 어디? (di mana?, santai) dengan 어디예요? (di mana?, sopan). Kepada orang yang baru kamu kenal, atasan, dan pelanggan, pakailah bentuk yang memakai 요.",
        ),
        table([
          ["Ungkapan", "Arti", "Kapan dipakai"],
          ["네", "ya", "Menjawab dengan sopan"],
          ["예", "ya", "Lebih formal, misalnya kepada atasan"],
          ["아니요", "tidak", "Menolak atau menyangkal dengan sopan"],
          [
            "아니에요",
            "bukan; tidak apa-apa",
            "Menyangkal, atau membalas ucapan terima kasih",
          ],
          [
            "주세요",
            "tolong berikan; minta",
            "Setelah nama barang: 우유 주세요",
          ],
          [
            "여기요",
            "permisi!; ini dia",
            "Memanggil pelayan, atau saat menyerahkan sesuatu",
          ],
          ["여보세요", "halo", "Hanya di telepon"],
          [
            "어서 오세요",
            "selamat datang",
            "Diucapkan penjual saat pembeli masuk",
          ],
          [
            "누구세요?",
            "siapa, ya?",
            "Saat ada yang mengetuk pintu atau menelepon",
          ],
          ["저도요", "saya juga", "Menyetujui dengan sopan"],
        ]),
        audioClip("주세요", "주세요: tolong berikan; minta"),
        audioClip("여보세요", "여보세요: halo (di telepon)"),
        audioClip("어서 오세요", "어서 오세요: selamat datang"),
        callout(
          "tip",
          '아니요 adalah jawaban "tidak". 아니에요 berarti "bukan", dan sering dipakai untuk membalas terima kasih, mirip "sama-sama" atau "tidak apa-apa".',
        ),
        heading("Di kafe", 3),
        p("Baca dialog ini, lalu putar setiap baris."),
        table([
          ["Siapa", "Hangeul", "Arti"],
          ["Pelayan", "어서 오세요.", "Selamat datang."],
          ["Kamu", "여기요, 메뉴 주세요.", "Permisi, minta menunya."],
          ["Pelayan", "네, 여기요.", "Ya, ini dia."],
          [
            "Kamu",
            "이거 주세요. 그리고 우유도 주세요.",
            "Minta yang ini. Lalu susu juga.",
          ],
          ["Pelayan", "네.", "Baik."],
        ]),
        audioClip("여기요, 메뉴 주세요", "여기요, 메뉴 주세요."),
        audioClip("이거 주세요", "이거 주세요."),
        p(
          '이거 berarti "ini" (benda). Tunjuk barangnya, lalu ucapkan 이거 주세요. Kalimat ini sangat berguna saat kamu belum tahu nama barangnya.',
        ),
        heading("Di telepon", 3),
        table([
          ["Siapa", "Hangeul", "Arti"],
          ["A", "여보세요?", "Halo?"],
          ["B", "네, 누구세요?", "Ya, siapa ini?"],
          ["A", "저 미나예요.", "Saya Mina."],
          ["B", "아, 네! 어디예요?", "Oh, ya! Kamu di mana?"],
          ["A", "가게예요.", "Saya di toko."],
        ]),
        audioClip("네, 누구세요?", "네, 누구세요?"),
        audioClip("저 미나예요", "저 미나예요."),
        p(
          '예요 ditempel setelah kata benda yang berakhir vokal untuk berkata "adalah" dengan sopan: 미나예요 (saya Mina), 가게예요 (ini toko; saya di toko).',
        ),
        heading("Kosakata F", 3),
        p(
          "Kata dan ungkapan dengan vokal Y serta ㅐ dan ㅔ. Latih semuanya sampai selesai.",
        ),
        vocabularyRef("m3-vocab-f"),
        game(
          "word-builder",
          "y-vowels",
          "Susun kata",
          "Susun kata seperti 우유, 노래, dan 가게 dari suku katanya.",
        ),
        heading("Kuis modul 3", 3),
        p(
          "Kuis ini tidak memakai romanisasi. Pilihan jawabannya berupa Hangeul atau arti dalam bahasa Indonesia. Sebagian soal mengulang modul 1 dan 2. Nilai lulusnya 80%.",
        ),
        assessmentRef("m3-quiz"),
        callout(
          "success",
          "Ringkasan: kalimat sopan sering diakhiri 요. Kamu kini bisa membaca 네, 아니요, 주세요, 여보세요, 어서 오세요, dan 이거 주세요, cukup untuk memesan di kafe dan menjawab telepon.",
        ),
      ],
    },
    {
      type: "vocabulary",
      key: "m3-vocab-f",
      title: "Kosakata F: vokal Y, ㅐ, dan ㅔ",
      description:
        "Kata sehari-hari dan ungkapan sopan yang memakai ㅑ ㅕ ㅛ ㅠ ㅐ ㅔ ㅖ.",
      entries: [
        { term: "야구", definition: "bisbol", romanization: "yagu" },
        {
          term: "여기",
          definition: "di sini; tempat ini",
          romanization: "yeogi",
        },
        { term: "요리", definition: "masakan; memasak", romanization: "yori" },
        { term: "우유", definition: "susu", romanization: "uyu" },
        { term: "여자", definition: "perempuan", romanization: "yeoja" },
        { term: "교사", definition: "guru", romanization: "gyosa" },
        { term: "휴지", definition: "tisu", romanization: "hyuji" },
        {
          term: "휴가",
          definition: "cuti; liburan",
          romanization: "hyuga",
          examples: ["Kata penting di tempat kerja."],
        },
        { term: "무료", definition: "gratis", romanization: "muryo" },
        { term: "개", definition: "anjing", romanization: "gae" },
        { term: "새", definition: "burung; baru", romanization: "sae" },
        { term: "가게", definition: "toko", romanization: "gage" },
        { term: "노래", definition: "lagu", romanization: "norae" },
        { term: "배우", definition: "aktor; aktris", romanization: "baeu" },
        { term: "어제", definition: "kemarin", romanization: "eoje" },
        { term: "메뉴", definition: "menu", romanization: "menyu" },
        {
          term: "시계",
          definition: "jam (arloji atau jam dinding)",
          romanization: "sigye",
          examples: ["Biasa terdengar seperti 시게."],
        },
        { term: "세계", definition: "dunia", romanization: "segye" },
        { term: "네", definition: "ya", romanization: "ne" },
        { term: "아니요", definition: "tidak", romanization: "aniyo" },
        { term: "저", definition: "saya (sopan)", romanization: "jeo" },
        {
          term: "주세요",
          definition: "tolong berikan; minta",
          romanization: "juseyo",
          examples: ["우유 주세요. = Minta susu."],
        },
        {
          term: "여보세요",
          definition: "halo (di telepon)",
          romanization: "yeoboseyo",
        },
        {
          term: "어서 오세요",
          definition: "selamat datang (di toko atau restoran)",
          romanization: "eoseo oseyo",
        },
      ],
    },
    {
      type: "assessment",
      key: "m3-quiz",
      title: "Kuis modul 3: vokal Y dan ㅐ ㅔ",
      description:
        "16 soal tentang ㅑ ㅕ ㅛ ㅠ, ejaan ㅐ dan ㅔ, ungkapan sopan, dan ulangan modul 1 dan 2. Tanpa romanisasi.",
      instructions:
        "Untuk soal mendengar, putar audionya sebanyak yang kamu perlukan. Nilai lulus 80%.",
      passingScore: 80,
      shuffleOptions: true,
      questions: [
        single(
          "hear-ya",
          hear("야", "Dengarkan, lalu pilih vokal yang kamu dengar."),
          ["ㅕ", "ㅑ", "ㅛ", "ㅠ"],
          1,
          'Yang kamu dengar adalah 야: ㅏ dengan bunyi y di depannya, seperti "ya" di "saya".',
        ),
        single(
          "hear-yeogi",
          hear("여기"),
          ["요기", "야기", "여기", "유기"],
          2,
          "Yang kamu dengar adalah 여기 (di sini). ㅕ diucapkan dengan bibir santai, bukan bulat seperti ㅛ.",
        ),
        single(
          "y-of-o",
          "Huruf mana yang dibuat dari ㅗ dengan satu garis tambahan?",
          ["ㅛ", "ㅠ", "ㅕ", "ㅑ"],
          0,
          "ㅗ + satu garis = ㅛ (yo). ㅜ menjadi ㅠ, ㅓ menjadi ㅕ, dan ㅏ menjadi ㅑ.",
        ),
        single(
          "build-hyu",
          "Blok mana yang tersusun dari ㅎ + ㅠ?",
          ["후", "혀", "효", "휴"],
          3,
          "ㅎ + ㅠ = 휴, seperti di 휴지 (tisu) dan 휴가 (cuti). ㅠ adalah vokal datar, jadi ditulis di bawah.",
        ),
        single(
          "read-uyu",
          "Apa arti kata 우유?",
          ["Jus", "Susu", "Air", "Kopi"],
          1,
          "우유 berarti susu. Jus adalah 주스.",
        ),
        single(
          "read-gage",
          "Apa arti kata 가게?",
          ["Toko", "Anjing", "Kepiting", "Lagu"],
          0,
          "가게 berarti toko. Anjing adalah 개, kepiting 게, dan lagu 노래.",
        ),
        single(
          "read-norae",
          "Apa arti kata 노래?",
          ["Aktor", "Kemarin", "Jam", "Lagu"],
          3,
          "노래 berarti lagu. Aktor adalah 배우, kemarin 어제, dan jam 시계.",
        ),
        single(
          "ae-e",
          "Apa yang benar tentang ㅐ dan ㅔ dalam bahasa Korea sekarang?",
          [
            'ㅐ diucapkan "a" lalu "i"',
            'ㅔ diucapkan seperti e pepet di "emas"',
            "Kebanyakan penutur Seoul mengucapkannya sama; bedanya di ejaan",
            "ㅐ selalu diucapkan lebih panjang dari ㅔ",
          ],
          2,
          'Bagi kebanyakan penutur Seoul, ㅐ dan ㅔ terdengar sama, seperti e taling di "enak". Karena itu kamu menghafal ejaan setiap kata.',
        ),
        single(
          "spell-dog",
          'Kata mana yang berarti "anjing"?',
          ["게", "개", "거", "계"],
          1,
          "Anjing ditulis 개 (dengan ㅐ). 게 (dengan ㅔ) berarti kepiting. Bunyinya sama, ejaannya berbeda.",
        ),
        single(
          "juseyo",
          "Ungkapan mana yang dipakai untuk meminta barang, misalnya di toko?",
          ["어서 오세요", "여보세요", "아니요", "주세요"],
          3,
          '주세요 berarti "tolong berikan" atau "minta": 우유 주세요, 이거 주세요.',
        ),
        single(
          "yeoboseyo",
          "Kamu mengangkat telepon. Apa yang kamu ucapkan?",
          ["여보세요", "어서 오세요", "주세요", "저도요"],
          0,
          '여보세요 adalah "halo" khusus untuk telepon. 어서 오세요 diucapkan penjual untuk menyambut pembeli.',
        ),
        single(
          "review-hear-gogi",
          hear("고기"),
          ["거기", "고기", "구기", "그기"],
          1,
          "Ulangan modul 2: yang kamu dengar adalah 고기 (daging), dengan ㅗ yang bulat. 거기 berarti di sana.",
        ),
        single(
          "review-read-nara",
          "Apa arti kata 나라?",
          ["Bebek", "Kepala", "Negara", "Laut"],
          2,
          "Ulangan modul 2: 나라 berarti negara. Bebek adalah 오리, kepala 머리, dan laut 바다.",
        ),
        single(
          "review-hear-uri",
          hear("우리"),
          ["오리", "으리", "어리", "우리"],
          3,
          "Ulangan modul 2: yang kamu dengar adalah 우리 (kami; kita), dengan ㅜ yang bulat dan maju.",
        ),
        single(
          "review-rieul",
          "Bagaimana ㄹ di 노래 diucapkan?",
          [
            "Satu tepukan lidah yang ringan, tanpa getaran",
            '"r" yang digetarkan panjang seperti di "rumah"',
            "Tidak dibaca",
            "Seperti ㄴ",
          ],
          0,
          "Ulangan modul 2: di antara vokal, ㄹ hanya satu tepukan ringan.",
        ),
        single(
          "review-flat-u",
          'Vokal mana yang diucapkan seperti "u" tetapi dengan bibir datar?',
          ["ㅜ", "ㅠ", "ㅡ", "ㅗ"],
          2,
          'Ulangan modul 1: ㅡ adalah "u" dengan bibir datar. ㅜ dan ㅠ diucapkan dengan bibir bulat.',
        ),
      ],
    },
  ],
};
