import {
  audioClip,
  b,
  bullet,
  callout,
  contrast,
  divider,
  game,
  heading,
  i,
  letters,
  numbered,
  p,
  quote,
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

export const m6ReadingWriting: ModuleContent = {
  key: "m6-reading-writing",
  title: "Membaca dan menulis",
  description:
    "Membaca teks nyata per blok, menulis dengan urutan goresan yang benar, mengetik Hangeul di ponsel, membaca romanisasi, nama huruf, dan menulis namamu dalam Hangeul.",
  items: [
    {
      type: "material",
      key: "m6-reading-blocks",
      title: "Membaca per blok: menu, papan, kartu nama",
      description:
        "Strategi membaca blok demi blok, lalu praktik dengan menu kafe, papan petunjuk, dan kartu nama.",
      minutes: 15,
      blocks: [
        heading("Cara membaca blok dengan cepat"),
        p(
          "Kamu sudah mengenal semua huruf yang dibutuhkan untuk membaca blok tanpa huruf di bagian bawah. Sekarang kita latih ",
          b("kecepatan"),
          ". Pakai langkah ini setiap kali kamu melihat kata baru:",
        ),
        numbered(
          b("Lihat vokalnya dulu. "),
          "Garis panjang tegak (ㅏ ㅓ ㅣ ㅐ ㅔ ...) berarti konsonan ada di kiri. Garis panjang datar (ㅗ ㅜ ㅡ ㅛ ㅠ) berarti konsonan ada di atas.",
        ),
        numbered(
          b("Baca konsonan dan vokal sebagai satu ketukan. "),
          "바 dibaca 'ba', bukan 'b... a'.",
        ),
        numbered(
          b("Satu blok = satu suku kata = satu ketukan. "),
          "아메리카노 punya 5 blok, jadi 5 ketukan: 아-메-리-카-노.",
        ),
        numbered(
          b("Spasi memisahkan kata, bukan suku kata. "),
          "아이스 아메리카노 adalah dua kata: 아이스 (es) dan 아메리카노 (americano).",
        ),
        numbered(
          b("Baca pelan per blok, lalu ulangi cepat sebagai satu kata. "),
          "Telingamu akan mengenali kata serapan begitu kamu mengucapkannya cepat.",
        ),
        callout(
          "info",
          "Kadang kamu melihat huruf di bagian bawah blok, misalnya 방 atau 실. Itu batchim (konsonan akhir). Kamu akan mempelajarinya di Modul 7. Di pelajaran ini, kata dengan batchim selalu ditandai ",
          b("Intip batchim"),
          ".",
        ),
        heading("Pemanasan: tebak kata serapan", 3),
        p(
          "Baca setiap kata per blok, ucapkan cepat, lalu tebak artinya sebelum melihat kolom kanan.",
        ),
        table([
          ["Hangeul", "Arti"],
          ["카메라", "kamera"],
          ["피아노", "piano"],
          ["비디오", "video"],
          ["소파", "sofa"],
          ["스키", "ski"],
          ["오토바이", "sepeda motor"],
          ["티셔츠", "kaus (T-shirt)"],
          ["메뉴", "menu"],
        ]),
        heading("Teks nyata 1: menu kafe", 3),
        p("Bayangkan kamu masuk ke kafe di Korea dan melihat papan menu ini:"),
        quote(
          "메뉴 · 아메리카노 · 카페라테 · 모카 · 아이스티 · 레모네이드 · 주스 · 우유 · 치즈 케이크 · 쿠키 · 토스트",
        ),
        table([
          ["Hangeul", "Arti"],
          ["아메리카노", "americano (kopi hitam)"],
          ["카페라테", "kafe latte (di banyak kafe ditulis 카페라떼)"],
          ["모카", "kopi moka"],
          ["아이스티", "es teh"],
          ["레모네이드", "limun"],
          ["주스", "jus"],
          ["우유", "susu"],
          ["치즈 케이크", "kue keju"],
          ["쿠키", "kue kering (cookie)"],
          ["토스트", "roti panggang"],
        ]),
        p(
          "Perhatikan bahwa 아이스 아메리카노 ditulis sebagai dua kata, tetapi 아이스티 ditulis menyambung. Penulisan kata serapan di menu memang tidak selalu seragam.",
        ),
        heading("Teks nyata 2: memesan", 3),
        p("Dengarkan percakapan pendek ini. Semua katanya bisa kamu baca."),
        table([
          ["Siapa", "Hangeul", "Arti"],
          ["Pelayan", "어서 오세요!", "Selamat datang!"],
          [
            "Kamu",
            "아이스 아메리카노 하나 주세요.",
            "Tolong satu es americano.",
          ],
          ["Kamu", "치즈 케이크도 주세요.", "Kue kejunya juga, ya."],
          ["Pelayan", "네, 여기요.", "Baik, ini dia."],
          ["Kamu", "고마워요!", "Terima kasih!"],
        ]),
        listen("어서 오세요!", "어서 오세요!"),
        listen(
          "아이스 아메리카노 하나 주세요.",
          "아이스 아메리카노 하나 주세요.",
        ),
        listen("치즈 케이크도 주세요.", "치즈 케이크도 주세요."),
        p(
          b("하나"),
          " berarti 'satu' (angka asli Korea), dipakai saat memesan. ",
          b("도"),
          " berarti 'juga' dan menempel pada kata sebelumnya.",
        ),
        heading("Teks nyata 3: papan petunjuk", 3),
        table([
          ["Hangeul", "Arti", "Catatan"],
          ["버스", "bus", ""],
          ["주차", "parkir", ""],
          ["마트", "swalayan, minimarket", ""],
          ["카페", "kafe", ""],
          ["아파트", "apartemen", ""],
          ["화장실", "toilet", "Intip batchim: 실 punya ㄹ di bawah"],
          ["출구", "pintu keluar", "Intip batchim: 출 punya ㄹ di bawah"],
          ["노래방", "karaoke", "Intip batchim: 방 punya ㅇ di bawah"],
        ]),
        p(
          "Kamu sudah bisa membaca bagian atas setiap blok. Di 화장실, bagian atasnya adalah 화, 자, dan 시; di 노래방, bagian atasnya adalah 노, 래, dan 바. Huruf di bawahnya akan lengkap di Modul 7.",
        ),
        heading("Teks nyata 4: kartu nama", 3),
        p(
          "Kartu nama Korea biasanya berisi nama perusahaan, jabatan, dan nama orangnya.",
        ),
        quote("하나 커피 · 매니저 · 이수지 · 010-2345-6789"),
        bullet(
          b("하나 커피"),
          ": nama kafe, 'Kopi Hana' (하나 juga berarti satu).",
        ),
        bullet(b("매니저"), ": manajer."),
        bullet(
          b("이수지"),
          ": nama orangnya. Nama Korea menaruh ",
          b("nama keluarga di depan"),
          ": 이 adalah nama keluarga, 수지 nama dirinya.",
        ),
        bullet("010 adalah awalan nomor ponsel di Korea."),
        quote("코리아 투어 · 가이드 · 최유리"),
        p(
          "Kartu kedua: 코리아 투어 (Korea Tour, agen wisata), 가이드 (pemandu), dan nama 최유리: nama keluarga 최, nama diri 유리.",
        ),
        game(
          "word-builder",
          "w-vowels",
          "Latihan membaca cepat",
          "Susun kata dari huruf-hurufnya. Semakin cepat kamu mengenali blok, semakin lancar kamu membaca.",
        ),
        callout(
          "success",
          "Ringkasnya: lihat vokal untuk menemukan posisi konsonan, baca satu blok satu ketukan, ingat bahwa spasi memisahkan kata, lalu ulangi cepat sebagai satu kata. Kamu sudah bisa membaca menu, papan, dan kartu nama tanpa batchim.",
        ),
      ],
    },
    {
      type: "material",
      key: "m6-handwriting",
      title: "Menulis tangan dan urutan goresan",
      description:
        "Aturan atas ke bawah dan kiri ke kanan, urutan goresan setiap huruf, dan proporsi blok yang rapi.",
      minutes: 16,
      blocks: [
        heading("Dua aturan utama"),
        p(
          "Urutan goresan Hangeul mengikuti dua aturan sederhana. Kalau kamu ragu dengan huruf apa pun, kembalilah ke dua aturan ini.",
        ),
        numbered(
          b("Dari atas ke bawah. "),
          "Garis tegak ditarik dari atas ke bawah, dan bagian atas huruf ditulis lebih dulu.",
        ),
        numbered(
          b("Dari kiri ke kanan. "),
          "Garis datar ditarik dari kiri ke kanan, dan bagian kiri ditulis lebih dulu.",
        ),
        p(
          "Dalam satu blok, urutannya sama dengan urutan membaca: ",
          b("konsonan awal, lalu vokal, lalu batchim"),
          " kalau ada. Huruf ㅇ sedikit berbeda dari dua aturan tadi: tulis sebagai satu lingkaran, mulai dari atas lalu berputar berlawanan arah jarum jam.",
        ),
        heading("Urutan goresan konsonan", 3),
        letters(
          "Konsonan dasar dan jumlah goresannya",
          [
            {
              character: "ㄱ",
              cue: "1 goresan: ke kanan, lalu turun",
              say: "가",
            },
            {
              character: "ㄴ",
              cue: "1 goresan: turun, lalu ke kanan",
              say: "나",
            },
            {
              character: "ㄷ",
              cue: "2 goresan: garis atas, lalu bentuk ㄴ",
              say: "다",
            },
            {
              character: "ㄹ",
              cue: "3 goresan: bentuk ㄱ, garis tengah, lalu bentuk ㄴ",
              say: "라",
            },
            {
              character: "ㅁ",
              cue: "3 goresan: garis kiri, bentuk ㄱ (atas dan kanan), garis bawah",
              say: "마",
            },
            {
              character: "ㅂ",
              cue: "4 goresan: tegak kiri, tegak kanan, garis tengah, garis bawah",
              say: "바",
            },
            {
              character: "ㅅ",
              cue: "2 goresan: miring ke kiri bawah, lalu dari tengahnya ke kanan bawah",
              say: "사",
            },
            {
              character: "ㅇ",
              cue: "1 goresan: lingkaran dari atas, berlawanan arah jarum jam",
              say: "아",
            },
            {
              character: "ㅈ",
              cue: "2 goresan: garis atas yang turun miring ke kiri, lalu kaki kanan",
              say: "자",
              note: "Di sebagian huruf cetak, ㅈ terlihat seperti garis datar + ㅅ (3 goresan). Dua-duanya huruf yang sama.",
            },
            {
              character: "ㅊ",
              cue: "3 goresan: goresan pendek di atas, lalu ㅈ",
              say: "차",
            },
            {
              character: "ㅋ",
              cue: "2 goresan: bentuk ㄱ, lalu garis tengah",
              say: "카",
            },
            {
              character: "ㅌ",
              cue: "3 goresan: garis atas, garis tengah, lalu bentuk ㄴ",
              say: "타",
            },
            {
              character: "ㅍ",
              cue: "4 goresan: garis atas, dua garis tegak pendek (kiri lalu kanan), garis bawah",
              say: "파",
            },
            {
              character: "ㅎ",
              cue: "3 goresan: goresan pendek di atas, garis datar, lalu ㅇ",
              say: "하",
            },
          ],
          { showRomanization: false },
        ),
        p(
          "Konsonan tegang ditulis dengan menulis huruf dasarnya dua kali, yang kiri dulu: ㄲ ㄸ ㅃ ㅆ ㅉ. Buat keduanya lebih ramping supaya muat di tempat satu huruf.",
        ),
        heading("Urutan goresan vokal", 3),
        letters(
          "Vokal dasar",
          [
            {
              character: "ㅏ",
              cue: "garis tegak dulu, lalu garis pendek ke kanan",
              say: "아",
            },
            {
              character: "ㅓ",
              cue: "garis pendek dulu (kiri ke kanan), lalu garis tegak",
              say: "어",
            },
            {
              character: "ㅗ",
              cue: "garis pendek tegak dulu, lalu garis datar panjang",
              say: "오",
            },
            {
              character: "ㅜ",
              cue: "garis datar panjang dulu, lalu garis pendek ke bawah",
              say: "우",
            },
            { character: "ㅡ", cue: "1 goresan: kiri ke kanan", say: "으" },
            { character: "ㅣ", cue: "1 goresan: atas ke bawah", say: "이" },
          ],
          { showRomanization: false },
        ),
        p(
          "Lihat polanya: ㅓ dan ㅗ dimulai dengan garis pendek karena garis pendek itu ada di kiri atau di atas. ㅏ dan ㅜ dimulai dengan garis panjang karena garis pendeknya ada di kanan atau di bawah. Vokal lain hanyalah gabungan: ㅐ = ㅏ lalu ㅣ, ㅘ = ㅗ lalu ㅏ, ㅢ = ㅡ lalu ㅣ.",
        ),
        heading("Proporsi blok", 3),
        bullet(
          b("Setiap blok mengisi kotak yang sama besar. "),
          "이 dan 빠 sama lebarnya, walaupun 빠 punya lebih banyak goresan. Jadi huruf di blok yang ramai harus lebih kecil.",
        ),
        bullet(
          b("Vokal tegak: "),
          "konsonan sempit di kiri, vokal tinggi di kanan. Di 가, kaki ㄱ condong miring ke kiri.",
        ),
        bullet(
          b("Vokal datar: "),
          "konsonan melebar dan pendek di atas, vokal di bawah. Di 고, kaki ㄱ turun lurus.",
        ),
        bullet(
          b("Vokal gabungan: "),
          "di 과, ㄱ di pojok kiri atas, ㅗ di bawahnya, dan ㅏ di kanan setinggi blok.",
        ),
        bullet(
          b("Blok dengan batchim "),
          "(seperti 한) menekan semua huruf di atas ke setengah atas kotak. Kamu akan menulisnya di Modul 7.",
        ),
        callout(
          "tip",
          "Pakai buku kotak-kotak (buku matematika). Satu kotak untuk satu blok. Tulis 아이, 오이, 바나나, 커피, 과자, 의자, dan 고마워요, masing-masing tiga kali.",
        ),
        heading("Huruf cetak bisa terlihat berbeda", 3),
        p(
          "Seperti huruf Latin 'a' yang punya dua bentuk, beberapa huruf Hangeul terlihat berbeda di font tertentu. Jangan bingung saat membaca papan atau buku:",
        ),
        bullet(
          "ㅈ bisa terlihat seperti angka 7 dengan kaki, atau seperti garis datar di atas ㅅ.",
        ),
        bullet(
          "Goresan kecil di atas ㅊ dan ㅎ bisa tegak, miring, atau datar.",
        ),
        bullet(
          "Di font bergaya kuas, ㅇ kadang punya 'tanduk' kecil di atasnya. Saat menulis tangan cukup lingkaran saja.",
        ),
        game(
          "stroke-master",
          "w-vowels",
          "Latih urutan goresan",
          "Telusuri setiap huruf dengan urutan goresan yang benar.",
        ),
        callout(
          "success",
          "Ringkasnya: atas ke bawah, kiri ke kanan; dalam blok tulis konsonan, vokal, lalu batchim; setiap blok mengisi kotak yang sama besar. ㅇ ditulis sebagai satu lingkaran dari atas.",
        ),
      ],
    },
    {
      type: "material",
      key: "m6-typing",
      title: "Mengetik Hangeul di ponsel",
      description:
        "Menambahkan keyboard Korea di Android dan iPhone, memahami tata letak 2-beolsik, dan mengetik kata pertamamu.",
      minutes: 12,
      blocks: [
        heading("Tata letak 2-beolsik"),
        p(
          "Keyboard Korea yang paling umum disebut ",
          b("2-beolsik"),
          " (ditulis 두벌식; Intip batchim), artinya 'dua set': konsonan di setengah kiri, vokal di setengah kanan. Tata letaknya sama di laptop dan di keyboard QWERTY ponsel.",
        ),
        table([
          ["Baris", "Kiri: konsonan", "Kanan: vokal"],
          ["Atas (Q sampai P)", "ㅂ ㅈ ㄷ ㄱ ㅅ", "ㅛ ㅕ ㅑ ㅐ ㅔ"],
          ["Tengah (A sampai L)", "ㅁ ㄴ ㅇ ㄹ ㅎ", "ㅗ ㅓ ㅏ ㅣ"],
          ["Bawah (Z sampai M)", "ㅋ ㅌ ㅊ ㅍ", "ㅠ ㅜ ㅡ"],
          ["Atas + Shift", "ㅃ ㅉ ㄸ ㄲ ㅆ", "ㅒ ㅖ (di tombol O dan P)"],
        ]),
        p(
          "Kamu cukup mengetik huruf sesuai ",
          b("urutan membaca"),
          ". Keyboard menyusun bloknya sendiri.",
        ),
        bullet(
          b("Konsonan tegang: "),
          "tekan Shift (panah ke atas), lalu ㄱ ㄷ ㅂ ㅅ ㅈ untuk mendapat ㄲ ㄸ ㅃ ㅆ ㅉ.",
        ),
        bullet(
          b("Vokal gabungan: "),
          "ketik dua vokalnya berturut-turut. ㅗ lalu ㅏ menjadi ㅘ, ㅜ lalu ㅓ menjadi ㅝ, ㅡ lalu ㅣ menjadi ㅢ.",
        ),
        bullet(
          b("ㅇ diam tetap diketik. "),
          "Untuk 아이, ketik ㅇ ㅏ ㅇ ㅣ. Tanpa ㅇ, vokal tidak punya blok.",
        ),
        table([
          ["Kata", "Yang kamu ketik"],
          ["아이", "ㅇ ㅏ ㅇ ㅣ"],
          ["과자", "ㄱ ㅗ ㅏ ㅈ ㅏ"],
          ["의사", "ㅇ ㅡ ㅣ ㅅ ㅏ"],
          ["오빠", "ㅇ ㅗ Shift+ㅂ ㅏ"],
          ["고마워요", "ㄱ ㅗ ㅁ ㅏ ㅇ ㅜ ㅓ ㅇ ㅛ"],
        ]),
        callout(
          "info",
          "Jangan kaget: saat kamu mengetik 나 lalu ㄴ, layar sempat menampilkan 난 (ㄴ masuk ke bawah sebagai batchim). Begitu kamu mengetik vokal berikutnya, ㄴ pindah ke blok baru dan menjadi 나나. Keyboard selalu menebak, lalu membetulkan sendiri.",
        ),
        heading("Menambahkan keyboard Korea", 3),
        p(
          b("Android (Gboard). "),
          "Buka aplikasi yang bisa mengetik, ketuk ikon roda gigi di keyboard (atau buka Setelan, lalu Sistem, Bahasa & masukan, Keyboard layar, Gboard). Pilih ",
          i("Bahasa"),
          ", lalu ",
          i("Tambahkan keyboard"),
          ", cari ",
          i("Korea (한국어)"),
          ", dan pilih tata letak yang mirip QWERTY (biasanya bernama 2-Bulsik atau 2벌식). Ketuk ",
          i("Selesai"),
          ".",
        ),
        p(
          b("Android (Keyboard Samsung). "),
          "Buka Setelan, lalu Manajemen umum, Setelan Keyboard Samsung, Bahasa dan jenis, Kelola bahasa input. Aktifkan 한국어, lalu ketuk 한국어 dan pilih jenis ",
          i("Qwerty"),
          " (bukan 천지인).",
        ),
        p(
          b("iPhone. "),
          "Buka Pengaturan, lalu Umum, Papan Ketik, Papan Ketik, Tambah Papan Ketik Baru. Pilih ",
          i("Korea"),
          ", lalu pilih tata letak ",
          i("Standar"),
          " (bukan 10 tombol), dan ketuk ",
          i("Selesai"),
          ".",
        ),
        p(
          "Untuk berpindah antara huruf Latin dan Hangeul, ketuk ikon bola dunia di keyboard, atau geser tombol spasi di sebagian keyboard Android. Nama menu bisa sedikit berbeda menurut merek dan versi ponselmu.",
        ),
        callout(
          "tip",
          "Di laptop Windows, tambahkan bahasa Korea di Pengaturan, bagian Waktu & bahasa. Setelah itu tekan tombol Alt kanan (tombol 한/영) untuk berpindah antara huruf Latin dan Hangeul.",
        ),
        callout(
          "info",
          "Sebagian ponsel Samsung juga menawarkan tata letak 천지인 dengan tiga tombol vokal ㆍ ㅡ ㅣ. Banyak orang Korea memakainya, tetapi untuk belajar, 2-beolsik lebih mudah karena setiap huruf punya tombolnya sendiri.",
        ),
        heading("Latihan mengetik", 3),
        numbered("Ketik 아이, 바나나, 과자, dan 의사."),
        numbered(
          "Ketik 고마워요! lalu kirim ke temanmu yang juga belajar bahasa Korea.",
        ),
        numbered(
          "Ketik 아이스 아메리카노 하나 주세요. Jangan lupa spasi di antara kata.",
        ),
        numbered(
          "Di pelajaran terakhir modul ini, kamu akan mengetik namamu sendiri.",
        ),
        game(
          "word-builder",
          "w-vowels",
          "Susun kata",
          "Susun kata dari huruf-hurufnya, sama seperti saat mengetik.",
        ),
        callout(
          "success",
          "Ringkasnya: 2-beolsik menaruh konsonan di kiri dan vokal di kanan. Ketik huruf sesuai urutan membaca, termasuk ㅇ diam; Shift memberi konsonan tegang; vokal gabungan diketik sebagai dua vokal.",
        ),
      ],
    },
    {
      type: "material",
      key: "m6-romanization",
      title: "Membaca romanisasi di dunia nyata",
      description:
        "Romanisasi Revisi (RR) untuk membaca papan, peta, dan nama, beserta jebakannya bagi orang Indonesia.",
      minutes: 12,
      blocks: [
        heading("Untuk apa romanisasi?"),
        p(
          "Sejak Modul 3 kamu membaca Hangeul tanpa huruf Latin. Itu cara belajar yang benar. Tetapi di dunia nyata kamu akan melihat huruf Latin di papan jalan, nama stasiun, peta, dan nama orang. Sistem resmi Korea Selatan sejak tahun 2000 adalah ",
          b("Romanisasi Revisi (RR)"),
          ". Pelajaran ini mengajarkan cara membacanya, supaya kamu bisa mencocokkan papan berhuruf Latin dengan Hangeul.",
        ),
        heading("Vokal dalam RR", 3),
        table([
          ["Hangeul", "RR", "Hangeul", "RR"],
          ["ㅏ", "a", "ㅑ", "ya"],
          ["ㅓ", "eo", "ㅕ", "yeo"],
          ["ㅗ", "o", "ㅛ", "yo"],
          ["ㅜ", "u", "ㅠ", "yu"],
          ["ㅡ", "eu", "ㅣ", "i"],
          ["ㅐ", "ae", "ㅒ", "yae"],
          ["ㅔ", "e", "ㅖ", "ye"],
          ["ㅘ", "wa", "ㅙ", "wae"],
          ["ㅝ", "wo", "ㅞ", "we"],
          ["ㅚ", "oe", "ㅟ", "wi"],
          ["ㅢ", "ui", "", ""],
        ]),
        heading("Konsonan dalam RR", 3),
        table([
          ["Polos", "Aspirasi", "Tegang", "Lainnya"],
          ["ㄱ g (k di akhir)", "ㅋ k", "ㄲ kk", "ㄴ n, ㅁ m"],
          ["ㄷ d (t di akhir)", "ㅌ t", "ㄸ tt", "ㅅ s, ㅆ ss"],
          ["ㅂ b (p di akhir)", "ㅍ p", "ㅃ pp", "ㅎ h"],
          ["ㅈ j", "ㅊ ch", "ㅉ jj", "ㄹ r sebelum vokal, l di akhir"],
          ["", "", "", "ㅇ tidak ditulis di awal, ng di akhir"],
        ]),
        heading("Jebakan untuk orang Indonesia", 3),
        numbered(
          b("eo"),
          " adalah satu vokal, ㅓ. Bukan 'e' lalu 'o'. Seoul (서울, Intip batchim) dibaca dua suku kata, bukan tiga.",
        ),
        numbered(
          b("eu"),
          " adalah satu vokal, ㅡ (u dengan bibir datar). Bukan 'e-u'.",
        ),
        numbered(
          b("e"),
          " adalah e taling seperti di 'sate', bukan e pepet seperti di 'emas'. Jeju (제주) dibaca 'jé-ju'.",
        ),
        numbered(
          b("ae"),
          " juga e taling (ㅐ), bukan 'a-e' atau 'ai'. Daegu (대구) dibaca 'dé-gu'.",
        ),
        numbered(
          b("oe, ui, wi, yeo"),
          " masing-masing satu vokal. Jangan dieja per huruf.",
        ),
        numbered(
          b("ch"),
          " adalah ㅊ, seperti c di 'cari' dengan hembusan. Bukan 'kh' seperti di 'khusus'.",
        ),
        numbered(
          b("kk, tt, pp, ss, jj"),
          " adalah konsonan tegang, bukan huruf dobel biasa. Oppa (오빠) punya ㅃ yang tegang.",
        ),
        numbered(
          b("k, t, p"),
          " di awal adalah huruf aspirasi (ㅋ ㅌ ㅍ). Huruf polos ㄱ ㄷ ㅂ ditulis g, d, b.",
        ),
        numbered(
          b("r dan l"),
          " sama-sama ㄹ. Ditulis r sebelum vokal dan l di tempat lain. Ingat, ㄹ tidak digetarkan.",
        ),
        numbered(
          b("si"),
          " (시) terdengar agak seperti 'syi', walaupun ditulis si.",
        ),
        contrast(
          "Romanisasi yang sering menipu",
          "Romanisasi ditampilkan di sini dengan sengaja. Putar audionya dan bandingkan dengan cara kamu membaca huruf Latinnya.",
          [
            {
              items: [
                { text: "거기", meaning: "di sana", romanization: "geogi" },
                { text: "고기", meaning: "daging", romanization: "gogi" },
              ],
              note: "eo dan o adalah dua vokal yang berbeda: ㅓ tidak bulat, ㅗ bulat.",
            },
            {
              items: [
                { text: "그", meaning: "itu; dia", romanization: "geu" },
                { text: "구", meaning: "sembilan", romanization: "gu" },
              ],
              note: "eu adalah ㅡ dengan bibir datar, u adalah ㅜ dengan bibir bulat.",
            },
            {
              items: [
                { text: "개", meaning: "anjing", romanization: "gae" },
                { text: "게", meaning: "kepiting", romanization: "ge" },
              ],
              note: "ae dan e ditulis berbeda, tetapi bunyinya sama: e taling.",
            },
            {
              items: [
                { text: "자다", meaning: "tidur", romanization: "jada" },
                { text: "차다", meaning: "menendang", romanization: "chada" },
                { text: "짜다", meaning: "asin", romanization: "jjada" },
              ],
              note: "j, ch, jj: polos, aspirasi, tegang.",
            },
            {
              items: [
                {
                  text: "대구",
                  meaning: "Daegu (kota)",
                  romanization: "Daegu",
                },
                { text: "제주", meaning: "Jeju (pulau)", romanization: "Jeju" },
                {
                  text: "여의도",
                  meaning: "Yeouido (kawasan di Seoul)",
                  romanization: "Yeouido",
                },
              ],
              note: "Nama tempat di papan jalan memakai RR.",
            },
          ],
          { showRomanization: true },
        ),
        heading("Nama tempat dan nama orang", 3),
        table([
          ["Di papan", "Hangeul", "Catatan"],
          ["Daegu", "대구", "ae = ㅐ"],
          ["Jeju", "제주", "e = ㅔ, e taling"],
          ["Yeouido", "여의도", "yeo = ㅕ, ui = ㅢ"],
          ["Mapo", "마포", "p = ㅍ"],
          ["Seoul", "서울", "Intip batchim: eo = ㅓ, l = ㄹ di bawah"],
          ["Busan", "부산", "Intip batchim: n = ㄴ di bawah"],
        ]),
        p(
          "Nama keluarga Korea sering memakai ejaan lama, bukan RR (Intip batchim: 김 dan 박 punya huruf di bawah). 김 ditulis Kim (RR: Gim), 이 ditulis Lee atau Yi (RR: I), 박 ditulis Park (RR: Bak), 최 ditulis Choi (RR: Choe). Jadi jangan heran kalau nama artis tidak cocok dengan tabel di atas.",
        ),
        callout(
          "warning",
          "Romanisasi di lirik dan subtitle K-pop sering tidak resmi (misalnya 'saranghae', 'gomawo', 'aigoo'). RR juga mengikuti bunyi, bukan ejaan, sehingga kadang tidak cocok huruf demi huruf dengan Hangeul; alasannya akan kamu pahami di Modul 8. Pakai romanisasi hanya untuk mencocokkan papan dan nama. Untuk pengucapan, percayai Hangeul dan audio.",
        ),
        callout(
          "success",
          "Ringkasnya: RR adalah alat untuk membaca papan dan nama, bukan cara belajar. Ingat jebakannya: eo = ㅓ, eu = ㅡ, e dan ae = e taling, ch = ㅊ, kk/tt/pp = tegang, r dan l = ㄹ.",
        ),
      ],
    },
    {
      type: "material",
      key: "m6-letter-names-and-your-name",
      title: "Nama huruf dan namamu dalam Hangeul",
      description:
        "Nama setiap konsonan untuk mengeja, lalu cara menulis nama Indonesia dalam Hangeul.",
      minutes: 15,
      blocks: [
        heading("Setiap huruf punya nama"),
        p(
          "Kita menyebut huruf Latin 'a, be, ce, de'. Orang Korea juga punya nama untuk setiap huruf, dipakai saat mengeja, misalnya di telepon atau di kelas. Vokal dinamai sesuai bunyinya dengan ㅇ di depan: ㅏ disebut 아, ㅓ disebut 어, ㅢ disebut 의. Konsonan dasar punya nama dua suku kata.",
        ),
        callout(
          "info",
          b("Intip batchim. "),
          "Nama konsonan memakai huruf di bagian bawah blok. Untuk sekarang, putar audionya dan tiru saja. Setelah Modul 7 kamu bisa membacanya sendiri.",
        ),
        letters(
          "Nama konsonan",
          [
            {
              character: "ㄱ",
              name: "기역",
              cue: "nama tidak beraturan",
              say: "기역",
            },
            { character: "ㄴ", name: "니은", cue: "니 + 은", say: "니은" },
            {
              character: "ㄷ",
              name: "디귿",
              cue: "nama tidak beraturan",
              say: "디귿",
            },
            { character: "ㄹ", name: "리을", cue: "리 + 을", say: "리을" },
            { character: "ㅁ", name: "미음", cue: "미 + 음", say: "미음" },
            { character: "ㅂ", name: "비읍", cue: "비 + 읍", say: "비읍" },
            {
              character: "ㅅ",
              name: "시옷",
              cue: "nama tidak beraturan",
              say: "시옷",
            },
            { character: "ㅇ", name: "이응", cue: "이 + 응", say: "이응" },
            { character: "ㅈ", name: "지읒", cue: "지 + 읒", say: "지읒" },
            { character: "ㅊ", name: "치읓", cue: "치 + 읓", say: "치읓" },
            { character: "ㅋ", name: "키읔", cue: "키 + 읔", say: "키읔" },
            { character: "ㅌ", name: "티읕", cue: "티 + 읕", say: "티읕" },
            { character: "ㅍ", name: "피읖", cue: "피 + 읖", say: "피읖" },
            { character: "ㅎ", name: "히읗", cue: "히 + 읗", say: "히읗" },
            {
              character: "ㄲ",
              name: "쌍기역",
              cue: "쌍 (kembar) + 기역",
              say: "쌍기역",
            },
            {
              character: "ㄸ",
              name: "쌍디귿",
              cue: "쌍 + 디귿",
              say: "쌍디귿",
            },
            {
              character: "ㅃ",
              name: "쌍비읍",
              cue: "쌍 + 비읍",
              say: "쌍비읍",
            },
            {
              character: "ㅆ",
              name: "쌍시옷",
              cue: "쌍 + 시옷",
              say: "쌍시옷",
            },
            {
              character: "ㅉ",
              name: "쌍지읒",
              cue: "쌍 + 지읒",
              say: "쌍지읒",
            },
          ],
          { showRomanization: false },
        ),
        heading("Polanya", 3),
        p(
          "Hampir semua nama mengikuti pola yang sama: huruf itu + ㅣ, lalu ㅇ + ㅡ dengan huruf itu ",
          b("di bawah"),
          ". 니은 memperlihatkan ㄴ di awal (니) dan di akhir (은). Jadi nama huruf sekaligus menunjukkan bunyi huruf itu di awal dan di akhir suku kata.",
        ),
        bullet(
          "Tiga nama tidak beraturan: 기역 (ㄱ), 디귿 (ㄷ), 시옷 (ㅅ). Hafalkan saja ketiganya.",
        ),
        bullet(
          "Konsonan tegang memakai awalan 쌍, artinya 'kembar': ㄲ = 쌍기역.",
        ),
        p(
          "Contoh mengeja 나비 (kupu-kupu): 니은, 아, 비읍, 이. Mengeja 의자 (kursi): 이응, 의, 지읒, 아.",
        ),
        divider(),
        heading("Menulis nama Indonesia dalam Hangeul"),
        p(
          "Orang Korea yang bertemu kamu akan menulis namamu dalam Hangeul. Tidak ada satu ejaan yang wajib, tetapi ada kebiasaan yang umum. Ikuti langkah ini:",
        ),
        numbered(
          b("Pecah namamu menjadi suku kata. "),
          "Budi = Bu-di. Satu suku kata menjadi satu blok.",
        ),
        numbered(
          b("Pilih huruf Korea yang paling dekat. "),
          "Bu = 부, di = 디. Jadi Budi = 부디.",
        ),
        numbered(b("Untuk e, pakai ㅔ. "), "Dewi = 데위, Eko = 에코."),
        numbered(
          b("p, t, k Indonesia ditulis ㅍ ㅌ ㅋ, dan c ditulis ㅊ. "),
          "Secara bunyi, p t k Indonesia sebenarnya lebih dekat ke ㅃ ㄸ ㄲ (tanpa hembusan), tetapi aturan penulisan kata asing di Korea memakai ㅍ ㅌ ㅋ. Karena itu Putri = 푸트리 dan Joko = 조코.",
        ),
        numbered(
          b("f ditulis ㅍ, v ditulis ㅂ, z ditulis ㅈ. "),
          "Fitri = 피트리, Rizki = 리즈키.",
        ),
        numbered(
          b("Konsonan tanpa vokal mendapat ㅡ. "),
          "Kalau dua konsonan berdempetan atau satu konsonan ada di akhir, orang Korea sering menambahkan ㅡ: Putri = 푸-트-리, Agus = 아-구-스, Nur = 누-르. Bunyi n, m, ng di akhir biasanya ditulis sebagai batchim (Modul 7).",
        ),
        table([
          ["Nama", "Hangeul", "Catatan"],
          ["Budi", "부디", ""],
          ["Siti", "시티", "시 terdengar agak seperti 'syi'; itu wajar"],
          ["Rina", "리나", "r dan l sama-sama ㄹ"],
          ["Dewi", "데위", "e = ㅔ, wi = ㅟ"],
          ["Ayu", "아유", ""],
          ["Sari", "사리", ""],
          ["Eko", "에코", "k = ㅋ"],
          ["Joko", "조코", "j = ㅈ"],
          ["Putri", "푸트리", "tr menjadi 트리"],
          ["Fitri", "피트리", "f = ㅍ"],
          ["Rizki", "리즈키", "z = ㅈ, zk menjadi 즈키"],
          ["Agus", "아구스", "s di akhir menjadi 스"],
          ["Nur", "누르", "r di akhir menjadi 르"],
        ]),
        p(
          "Kota juga begitu: Surabaya = 수라바야, Jakarta = 자카르타. Dengan batchim (Intip batchim): Bali = 발리, Bandung = 반둥, Indonesia = 인도네시아.",
        ),
        callout(
          "tip",
          "Tulis namamu dalam Hangeul di buku kotak-kotak, lalu ketik dengan keyboard Korea yang sudah kamu pasang. Kalau namamu punya bunyi akhir seperti n, m, atau ng (Andi, Imam, Bambang), simpan dulu; kamu akan bisa menulisnya setelah Modul 7.",
        ),
        callout(
          "info",
          "Dokumen resmi seperti paspor dan kontrak EPS memakai namamu dalam huruf Latin. Ejaan Hangeul namamu hanya untuk memudahkan orang Korea membacanya. Pilih satu ejaan dan pakai terus supaya konsisten.",
        ),
        callout(
          "success",
          "Ringkasnya: setiap konsonan punya nama (기역, 니은, 디귿, ...), dan tiga di antaranya tidak beraturan. Untuk menulis nama Indonesia: pecah per suku kata, pakai ㅔ untuk e, ㅍ ㅌ ㅋ ㅊ untuk p t k c, dan tambahkan ㅡ pada konsonan tanpa vokal.",
        ),
      ],
    },
    {
      type: "assessment",
      key: "m6-quiz",
      title: "Kuis Modul 6: membaca dan menulis",
      description:
        "16 soal tentang membaca per blok, urutan goresan, mengetik, romanisasi, nama huruf, dan nama dalam Hangeul.",
      instructions:
        "Pilih satu jawaban untuk setiap soal. Untuk soal dengar, putar audionya sebanyak yang kamu perlukan. Nilai lulus 80%.",
      passingScore: 80,
      shuffleOptions: true,
      questions: [
        choice(
          "m6-quiz-vowel-position",
          "Kamu melihat blok dengan vokal ㅗ. Di mana konsonan awalnya?",
          "di atas vokal",
          ["di kanan vokal", "di bawah vokal", "di kiri vokal"],
          "ㅗ adalah vokal datar (garis panjangnya mendatar), jadi konsonan ditulis di atasnya, seperti 고. Vokal tegak seperti ㅏ menaruh konsonan di kiri.",
        ),
        choice(
          "m6-quiz-read-americano",
          "Kamu membaca menu: 아메리카노. Apa yang kamu pesan?",
          "kopi americano",
          ["teh es", "jus jeruk", "kue keju"],
          "아-메-리-카-노 = americano. Teh es = 아이스티, jus = 주스, kue keju = 치즈 케이크.",
        ),
        choice(
          "m6-quiz-read-order",
          "Apa arti 아이스 아메리카노 하나 주세요?",
          "Tolong satu es americano.",
          [
            "Selamat datang di kafe.",
            "Ini dua americano panas.",
            "Terima kasih atas kopinya.",
          ],
          "아이스 = es, 아메리카노 = americano, 하나 = satu, 주세요 = tolong beri.",
        ),
        choice(
          "m6-quiz-stroke-a",
          "Bagaimana urutan goresan ㅏ?",
          "garis tegak dulu, lalu garis pendek ke kanan",
          [
            "garis pendek dulu, lalu garis tegak",
            "garis tegak dari bawah ke atas, lalu garis pendek",
            "satu goresan tanpa mengangkat pena",
          ],
          "Aturan kiri ke kanan: garis tegak ada di kiri, jadi ditulis dulu (dari atas ke bawah), lalu garis pendek di kanan.",
        ),
        choice(
          "m6-quiz-type-gwa",
          "Tombol apa saja yang kamu ketik untuk menulis 과?",
          "ㄱ ㅗ ㅏ",
          ["ㄱ ㅏ ㅗ", "ㄱ ㅜ ㅏ", "ㄱ ㅓ ㅗ"],
          "ㅘ adalah ㅗ + ㅏ, jadi ketik ㄱ, lalu ㅗ, lalu ㅏ. Keyboard menggabungkannya menjadi 과.",
        ),
        choice(
          "m6-quiz-type-tense",
          "Bagaimana mengetik ㄲ di keyboard 2-beolsik?",
          "Shift + ㄱ",
          ["ㄱ dua kali dengan cepat", "Shift + ㅋ", "ㄱ lalu ㅎ"],
          "Konsonan tegang diketik dengan Shift ditambah huruf polosnya: Shift + ㄱ = ㄲ.",
        ),
        choice(
          "m6-quiz-rr-daegu",
          "Papan jalan bertuliskan Daegu. Bagaimana ditulis dalam Hangeul?",
          "대구",
          ["다에구", "데구", "대고"],
          "Dalam RR, ae adalah satu vokal ㅐ (e taling), bukan 'a-e'. Jadi Daegu = 대구.",
        ),
        choice(
          "m6-quiz-rr-geogi",
          "Romanisasi geogi menunjukkan kata yang mana?",
          "거기",
          ["고기", "그기", "게기"],
          "eo adalah satu vokal, ㅓ. Jadi geogi = 거기 (di sana). 고기 (daging) ditulis gogi.",
        ),
        choice(
          "m6-quiz-rr-ch",
          "Dalam romanisasi, ch (misalnya chima, rok) menunjukkan huruf apa?",
          "ㅊ",
          ["ㅋ", "ㅎ", "ㅉ"],
          "ch = ㅊ, seperti c di 'cari' dengan hembusan. Bukan 'kh'. 치마 = rok.",
        ),
        choice(
          "m6-quiz-letter-name-siot",
          "Huruf mana yang namanya 시옷? (Nama huruf memakai batchim; kamu cukup mengenalinya.)",
          "ㅅ",
          ["ㅈ", "ㅊ", "ㅎ"],
          "시옷 adalah nama ㅅ, salah satu dari tiga nama yang tidak beraturan (bersama 기역 dan 디귿). ㅈ = 지읒, ㅊ = 치읓, ㅎ = 히읗.",
        ),
        choice(
          "m6-quiz-name-agus",
          "Bagaimana nama Agus biasanya ditulis dalam Hangeul?",
          "아구스",
          ["아거스", "아고스", "아구"],
          "Pecah per suku kata: A-gu-s. s di akhir tidak punya vokal, jadi ditambah ㅡ menjadi 스: 아구스.",
        ),
        choice(
          "m6-review-hear-tokki",
          [
            p("Ulasan Modul 4. Dengarkan, lalu pilih kata yang kamu dengar."),
            listen("토끼"),
          ],
          "토끼",
          ["도끼", "토기", "또끼"],
          "토끼 (kelinci) diawali ㅌ yang berhembus dan diakhiri ㄲ yang tegang. 도끼 (kapak) diawali ㄷ polos.",
        ),
        choice(
          "m6-review-hear-geogi",
          [
            p("Ulasan Modul 2. Dengarkan, lalu pilih kata yang kamu dengar."),
            listen("거기"),
          ],
          "거기",
          ["고기", "구기", "가기"],
          "거기 (di sana) memakai ㅓ dengan bibir tidak bulat. 고기 (daging) memakai ㅗ yang bulat.",
        ),
        choice(
          "m6-review-hear-jjada",
          [
            p("Ulasan Modul 4. Dengarkan, lalu pilih kata yang kamu dengar."),
            listen("짜다"),
          ],
          "짜다",
          ["자다", "차다", "싸다"],
          "짜다 (asin) diawali ㅉ yang tegang tanpa hembusan. 자다 (tidur) memakai ㅈ polos, 차다 memakai ㅊ yang berhembus.",
        ),
        choice(
          "m6-review-read-gage",
          "Ulasan Modul 3. Apa arti 가게?",
          "toko",
          ["kemarin", "jam", "lagu"],
          "가게 = toko. Kemarin = 어제, jam = 시계, lagu = 노래.",
        ),
        choice(
          "m6-review-read-hoesa",
          "Ulasan Modul 5. Apa arti 회사?",
          "perusahaan",
          ["dokter", "kursi", "gereja"],
          "회사 = perusahaan. Dokter = 의사, kursi = 의자, gereja = 교회.",
        ),
      ],
    },
  ],
};
