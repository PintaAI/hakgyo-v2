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

const hear = (text: string, question: string) => [p(question), audioClip(text)];

const VOWELS = ["ㅏ", "ㅓ", "ㅗ", "ㅜ", "ㅡ", "ㅣ"];

export const m1BasicVowels: ModuleContent = {
  key: "m1-basic-vowels",
  title: "Vokal dasar dan blok suku kata",
  description:
    "Cara huruf disusun menjadi blok, huruf ㅇ yang diam, dan enam vokal dasar ㅏ ㅣ ㅗ ㅜ ㅡ ㅓ, termasuk cara membedakan ㅓ/ㅗ dan ㅡ/ㅜ.",
  items: [
    {
      type: "material",
      key: "m1-blocks-a-i",
      title: "Blok suku kata, ㅇ, ㅏ, dan ㅣ",
      description:
        "Cara huruf disusun menjadi blok, huruf ㅇ yang diam di awal blok, serta vokal ㅏ dan ㅣ.",
      minutes: 14,
      blocks: [
        heading("Hangeul ditulis dalam blok"),
        p(
          "Di modul 0 kamu sudah tahu bahwa huruf Hangeul disusun menjadi blok. ",
          b("Satu blok = satu suku kata."),
          " Di dalam blok, huruf ditulis dari kiri ke kanan dan dari atas ke bawah, lalu dibaca dengan urutan yang sama.",
        ),
        p(
          "Aturan terpenting: ",
          b("setiap blok selalu diawali konsonan"),
          '. Lalu bagaimana menulis suku kata yang diawali bunyi vokal, seperti "a" atau "i"? Jawabannya huruf ㅇ.',
        ),
        heading("ㅇ: penjaga tempat yang diam", 3),
        p(
          "Di awal blok, ㅇ ",
          b("tidak dibaca"),
          '. Ia hanya mengisi tempat konsonan supaya blok tidak kosong. Jadi ㅇ + ㅏ dibaca "a" saja, bukan "nga".',
        ),
        callout(
          "warning",
          'Jangan membaca ㅇ di awal blok sebagai "ng". Bunyi "ng" hanya muncul kalau ㅇ ada di bagian bawah blok, seperti bunyi akhir kata "uang". Itu akan kamu pelajari di modul batchim.',
        ),
        letters(
          "Huruf baru",
          [
            {
              character: "ㅇ",
              name: "이응",
              cue: "Diam di awal blok. Hanya penjaga tempat.",
              romanization: "-",
              note: "Cara menulis: satu goresan melingkar, mulai dari atas lalu berputar berlawanan arah jarum jam.",
              example: {
                word: "아",
                meaning: "ah! (seruan)",
                romanization: "a",
              },
            },
            {
              character: "ㅏ",
              cue: 'Seperti "a" di "apa". Mulut terbuka lebar.',
              romanization: "a",
              say: "아",
              note: "Cara menulis: garis tegak dari atas ke bawah, lalu garis pendek dari kiri ke kanan di tengahnya. Garis pendeknya menunjuk ke kanan.",
              example: { word: "아이", meaning: "anak", romanization: "ai" },
            },
            {
              character: "ㅣ",
              cue: 'Seperti "i" di "ini". Bibir datar, seperti tersenyum tipis.',
              romanization: "i",
              say: "이",
              note: "Cara menulis: satu garis tegak dari atas ke bawah.",
              example: {
                word: "이",
                meaning: "dua; gigi; ini",
                romanization: "i",
              },
            },
          ],
          { showRomanization: true },
        ),
        heading("Menyusun blok pertamamu", 3),
        table([
          ["Susunan", "Blok", "Dibaca"],
          ["ㅇ + ㅏ", "아", "a"],
          ["ㅇ + ㅣ", "이", "i"],
          ["아 + 이", "아이", "a-i"],
        ]),
        p(
          "Perhatikan: ㅏ dan ㅣ adalah vokal ",
          b("tegak"),
          ". Vokal tegak selalu ditulis ",
          b("di kanan"),
          " konsonan. Di pelajaran berikutnya kamu akan bertemu vokal datar yang ditulis di bawah konsonan.",
        ),
        syllableGrid("Yang sudah bisa kamu baca", ["ㅇ"], ["ㅏ", "ㅣ"], {
          showRomanization: true,
        }),
        heading("Cara menulis yang rapi", 3),
        bullet(
          "Urutan goresan Hangeul selalu mengikuti dua aturan: dari atas ke bawah, dan dari kiri ke kanan.",
        ),
        bullet(
          "Bayangkan blok sebagai kotak. ㅇ dan vokalnya berbagi kotak itu, jadi di 아 dan 이 huruf ㅇ ditulis lebih kecil di bagian kiri.",
        ),
        bullet(
          "Tulis 아 dan 이 masing-masing lima kali. Ucapkan bunyinya setiap kali menulis.",
        ),
        heading("Latihan baca", 3),
        p("Baca dengan suara keras, lalu putar audionya untuk mengecek."),
        audioClip("아이", "아이"),
        table([
          ["Hangeul", "Dibaca", "Arti"],
          ["아", "a", "ah! (seruan)"],
          ["이", "i", "dua; gigi; ini"],
          ["아이", "a-i", "anak"],
        ]),
        p(
          'Kata 아이 dibaca sebagai dua suku kata yang jelas terpisah: "a" lalu "i". Jangan dilebur menjadi "ai" seperti di akhir kata "pantai".',
        ),
        callout(
          "tip",
          "Satu blok selalu satu suku kata. Kalau kamu melihat dua blok, ucapkan dua suku kata.",
        ),
        game(
          "syllable-forge",
          "basic-vowels",
          "Susun blok pertamamu",
          "Latih menyusun ㅇ dengan vokal menjadi blok. Permainan ini memakai keenam vokal modul 1, jadi tidak apa-apa kalau ada yang belum kamu kenal. Main lagi setelah pelajaran 3.",
        ),
        callout(
          "success",
          "Ringkasan: setiap blok diawali konsonan. ㅇ di awal blok tidak dibaca. ㅏ (a) dan ㅣ (i) adalah vokal tegak yang ditulis di kanan konsonan: 아, 이, 아이.",
        ),
      ],
    },
    {
      type: "material",
      key: "m1-vowels-o-u-eu",
      title: "Vokal datar: ㅗ, ㅜ, dan ㅡ",
      description:
        "Tiga vokal yang ditulis di bawah konsonan, dan cara membedakan ㅜ yang bulat dari ㅡ yang datar.",
      minutes: 15,
      blocks: [
        heading("Vokal datar ditulis di bawah"),
        p(
          "Vokal tegak (ㅏ, ㅣ) ditulis di kanan konsonan. Vokal ",
          b("datar"),
          ", yang garis utamanya mendatar, ditulis ",
          b("di bawah"),
          " konsonan. Hari ini kamu belajar tiga vokal datar: ㅗ, ㅜ, dan ㅡ.",
        ),
        table([
          ["Susunan", "Blok", "Posisi vokal"],
          ["ㅇ + ㅗ", "오", "di bawah ㅇ"],
          ["ㅇ + ㅜ", "우", "di bawah ㅇ"],
          ["ㅇ + ㅡ", "으", "di bawah ㅇ"],
          ["ㅇ + ㅏ", "아", "di kanan ㅇ"],
        ]),
        letters(
          "Huruf baru",
          [
            {
              character: "ㅗ",
              cue: 'Seperti "o" di "toko" atau "soto". Bibir bulat dan sedikit maju.',
              romanization: "o",
              say: "오",
              note: 'Bukan "o" terbuka seperti di "bom". Cara menulis: garis pendek dari atas ke bawah, lalu garis datar panjang dari kiri ke kanan.',
              example: { word: "오이", meaning: "timun", romanization: "oi" },
            },
            {
              character: "ㅜ",
              cue: 'Seperti "u" di "buku". Bibir bulat dan maju ke depan, seperti meniup lilin.',
              romanization: "u",
              say: "우",
              note: "Cara menulis: garis datar dari kiri ke kanan, lalu garis pendek dari atas ke bawah di tengahnya.",
              example: {
                word: "아우",
                meaning: "adik (kata lama)",
                romanization: "au",
              },
            },
            {
              character: "ㅡ",
              cue: 'Tidak ada di bahasa Indonesia. Ucapkan "u", tetapi bibir datar dan tidak dimajukan.',
              romanization: "eu",
              say: "으",
              note: 'Romanisasinya "eu", tetapi ini satu vokal, bukan "e" lalu "u". Cara menulis: satu garis datar dari kiri ke kanan.',
            },
          ],
          { showRomanization: true },
        ),
        heading("Rahasia ㅡ: bibir datar", 3),
        p(
          "ㅡ adalah salah satu dari dua vokal Korea yang tidak ada di bahasa Indonesia. Coba langkah ini di depan cermin:",
        ),
        numbered(
          "Ucapkan ",
          b("ㅣ"),
          " (이). Bibirmu datar, seperti tersenyum tipis.",
        ),
        numbered(
          'Tanpa mengubah bentuk bibir, tarik lidahmu ke belakang seperti mau mengucapkan "u".',
        ),
        numbered(
          "Bunyi yang keluar adalah ",
          b("ㅡ"),
          " (으). Bibir tetap datar, gigi hampir rapat.",
        ),
        p(
          'Kalau masih sulit, e pepet seperti di "emas" masih bisa dimengerti, tetapi usahakan mulut lebih tertutup dan bibir tetap datar.',
        ),
        contrast(
          "Bulat atau datar?",
          "Putar setiap pasangan. Perhatikan bentuk bibir: bulat untuk ㅗ dan ㅜ, datar untuk ㅡ dan ㅣ.",
          [
            {
              items: [
                { text: "오", romanization: "o" },
                { text: "우", romanization: "u" },
              ],
              note: "ㅗ: bibir bulat, mulut sedikit terbuka. ㅜ: bibir lebih maju, mulut lebih tertutup.",
            },
            {
              items: [
                { text: "우", romanization: "u" },
                { text: "으", romanization: "eu" },
              ],
              note: "Posisi lidahnya mirip. Bedanya di bibir: ㅜ bulat dan maju, ㅡ datar.",
            },
            {
              items: [
                { text: "이", romanization: "i" },
                { text: "으", romanization: "eu" },
              ],
              note: "Bibir sama-sama datar. Untuk ㅡ, lidah ditarik ke belakang.",
            },
          ],
          { showRomanization: true },
        ),
        syllableGrid(
          "Yang sudah bisa kamu baca",
          ["ㅇ"],
          ["ㅏ", "ㅣ", "ㅗ", "ㅜ", "ㅡ"],
          { showRomanization: true },
        ),
        heading("Cara menulis", 3),
        bullet(
          "ㅗ: garis pendek tegak dulu (atas ke bawah), lalu garis datar panjang (kiri ke kanan). Di blok 오, ㅇ ada di atas dan ㅗ di bawahnya.",
        ),
        bullet(
          "ㅜ: garis datar dulu (kiri ke kanan), lalu garis pendek tegak di bawahnya (atas ke bawah).",
        ),
        bullet("ㅡ: satu garis datar dari kiri ke kanan."),
        p(
          "Trik mengingat: garis pendek ㅗ menunjuk ke ",
          b("atas"),
          ", garis pendek ㅜ menunjuk ke ",
          b("bawah"),
          ".",
        ),
        heading("Latihan baca", 3),
        p("Tebak dulu cara bacanya, lalu cek di tabel dan putar audionya."),
        audioClip("오이", "오이"),
        audioClip("아우", "아우"),
        table([
          ["Hangeul", "Dibaca", "Arti"],
          ["오", "o", "lima; oh!"],
          ["오이", "o-i", "timun"],
          ["아우", "a-u", "adik (kata lama)"],
          ["우아", "u-a", "anggun"],
          ["이", "i", "dua; gigi; ini"],
          ["아이", "a-i", "anak"],
        ]),
        p(
          "Bacalah juga deretan suku kata ini dari kiri ke kanan: 오 우 으 · 우 으 오 · 으 이 우 · 아 오 이 우 으.",
        ),
        game(
          "stroke-master",
          "basic-vowels",
          "Kenali vokal dasar",
          "Main Hangeul untuk mengenali ㅏ, ㅣ, ㅗ, ㅜ, dan ㅡ dari bentuk dan bunyinya. ㅓ juga muncul di permainan ini; kamu akan mempelajarinya di pelajaran berikutnya.",
        ),
        callout(
          "success",
          'Ringkasan: vokal datar ㅗ (o di "toko"), ㅜ (u di "buku"), dan ㅡ (u dengan bibir datar) ditulis di bawah konsonan: 오, 우, 으. Bedakan ㅜ dan ㅡ dari bibirnya: bulat atau datar.',
        ),
      ],
    },
    {
      type: "material",
      key: "m1-vowel-eo-lab",
      title: "ㅓ dan lab vokal",
      description:
        "Vokal ㅓ yang tidak ada di bahasa Indonesia, latihan membedakan ㅓ/ㅗ dan ㅡ/ㅜ, aturan posisi vokal, dan kosakata pertamamu.",
      minutes: 18,
      blocks: [
        heading("ㅓ: vokal yang paling sering tertukar"),
        p(
          "ㅓ adalah vokal kedua yang tidak ada di bahasa Indonesia. Salah satu kesalahan yang paling sering dibuat pelajar Indonesia adalah menukar ㅓ dengan ㅗ, padahal artinya bisa berubah. Karena itu pelajaran ini fokus pada satu huruf dan banyak latihan dengar.",
        ),
        letters(
          "Huruf baru",
          [
            {
              character: "ㅓ",
              cue: 'Tidak ada di bahasa Indonesia. Buka rahang seperti mengucapkan "o" di "bom", tetapi bibir TIDAK dibulatkan, tetap santai.',
              romanization: "eo",
              say: "어",
              note: 'Romanisasinya "eo", tetapi ini satu vokal, bukan "e" lalu "o". Cara menulis: garis pendek dari kiri ke kanan dulu, lalu garis tegak dari atas ke bawah. Garis pendeknya menunjuk ke kiri.',
            },
          ],
          { showRomanization: true },
        ),
        heading("Cara membuat bunyi ㅓ", 3),
        numbered("Ucapkan ", b("ㅏ"), " (아) dengan mulut terbuka."),
        numbered(
          "Tarik lidahmu sedikit ke belakang dan kurangi sedikit bukaan rahang, tetapi ",
          b("jangan membulatkan bibir"),
          ".",
        ),
        numbered(
          "Bunyi yang keluar adalah ",
          b("ㅓ"),
          " (어). Kalau bibirmu mulai membulat, bunyinya berubah menjadi ㅗ (오).",
        ),
        p(
          "Cek di cermin: saat mengucapkan ㅓ, bibirmu harus terlihat santai dan agak terbuka, tidak membentuk lingkaran seperti saat mengucapkan ㅗ.",
        ),
        table([
          ["Vokal", "Bibir", "Mulut", "Pembanding Indonesia"],
          ["ㅏ", "terbuka, tidak bulat", "terbuka lebar", 'a di "apa"'],
          ["ㅓ", "santai, tidak bulat", "terbuka", "tidak ada"],
          ["ㅗ", "bulat", "setengah terbuka", 'o di "toko"'],
          ["ㅜ", "bulat dan maju", "hampir tertutup", 'u di "buku"'],
          ["ㅡ", "datar", "hampir tertutup", "tidak ada"],
          ["ㅣ", "datar, tersenyum", "hampir tertutup", 'i di "ini"'],
        ]),
        heading("Lab vokal: dengar dan bandingkan", 3),
        contrast(
          "ㅓ atau ㅗ? ㅡ atau ㅜ?",
          "Putar setiap baris beberapa kali. Ucapkan ulang sambil melihat bibirmu di cermin.",
          [
            {
              items: [
                { text: "어", romanization: "eo" },
                { text: "오", romanization: "o" },
              ],
              note: "ㅓ: bibir santai, tidak bulat. ㅗ: bibir bulat.",
            },
            {
              items: [
                { text: "어", romanization: "eo" },
                { text: "아", romanization: "a" },
              ],
              note: "Keduanya tidak bulat. ㅏ mulut lebih terbuka, ㅓ lidah lebih ke belakang.",
            },
            {
              items: [
                { text: "오", romanization: "o" },
                { text: "어", romanization: "eo" },
                { text: "우", romanization: "u" },
              ],
              note: "Dari bulat ke santai lalu bulat maju. Perhatikan bibir di tengah yang tidak bulat.",
            },
            {
              items: [
                { text: "우", romanization: "u" },
                { text: "으", romanization: "eu" },
              ],
              note: "ㅜ: bibir bulat dan maju. ㅡ: bibir datar.",
            },
            {
              items: [
                { text: "오이", meaning: "timun", romanization: "oi" },
                {
                  text: "어이",
                  meaning: "hei! (memanggil, kurang sopan)",
                  romanization: "eoi",
                },
              ],
              note: "Salah vokal, berubah artinya.",
            },
          ],
          { showRomanization: true },
        ),
        heading("Aturan posisi vokal", 3),
        table([
          ["Jenis vokal", "Vokal", "Posisi", "Contoh"],
          ["Tegak", "ㅏ ㅓ ㅣ", "di kanan konsonan", "아 어 이"],
          ["Datar", "ㅗ ㅜ ㅡ", "di bawah konsonan", "오 우 으"],
        ]),
        p(
          "Trik mengingat arah garis pendek: ㅏ ke kanan, ㅓ ke kiri, ㅗ ke atas, ㅜ ke bawah. Pasangan ㅏ/ㅓ dan ㅗ/ㅜ adalah bayangan cermin satu sama lain.",
        ),
        syllableGrid("Semua vokal dasar", ["ㅇ"], VOWELS, {
          showRomanization: true,
        }),
        heading("Latihan dengar", 3),
        p(
          "Putar setiap audio, tebak suku katanya, lalu cek jawabannya di tabel di bawah.",
        ),
        audioClip("어", "Nomor 1"),
        audioClip("우", "Nomor 2"),
        audioClip("오", "Nomor 3"),
        audioClip("으", "Nomor 4"),
        audioClip("오이", "Nomor 5"),
        table([
          ["Nomor", "Jawaban"],
          ["1", "어"],
          ["2", "우"],
          ["3", "오"],
          ["4", "으"],
          ["5", "오이 (timun)"],
        ]),
        heading("Kosakata pertamamu", 3),
        p(
          "Dengan enam vokal dan ㅇ, kamu sudah bisa membaca beberapa kata. Latih kata-kata ini sampai semuanya selesai.",
        ),
        vocabularyRef("m1-vocab-a"),
        game(
          "syllable-forge",
          "basic-vowels",
          "Susun blok vokal",
          "Susun ㅇ dengan keenam vokal dasar. Ingat: vokal tegak di kanan, vokal datar di bawah.",
        ),
        heading("Kuis modul 1", 3),
        p(
          "Kuis ini berisi soal membaca, mendengar, dan menyusun blok. Nilai lulusnya 80%, dan kamu boleh mengulang.",
        ),
        assessmentRef("m1-quiz"),
        callout(
          "success",
          "Ringkasan: ㅓ diucapkan dengan rahang terbuka dan bibir santai, tidak bulat. Bedakan ㅓ dari ㅗ, dan ㅡ dari ㅜ, lewat bibirmu. Vokal tegak (ㅏ ㅓ ㅣ) di kanan konsonan, vokal datar (ㅗ ㅜ ㅡ) di bawahnya.",
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
