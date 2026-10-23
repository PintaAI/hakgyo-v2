import {
  assessmentRef,
  audioClip,
  b,
  bullet,
  callout,
  heading,
  i,
  numbered,
  p,
  quote,
  table,
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

export const m0Welcome: ModuleContent = {
  key: "m0-welcome",
  title: "Selamat datang di Hangeul",
  description:
    "Kenapa belajar Hangeul, kisah Raja Sejong dan Hunminjeongeum, rahasia bentuk hurufnya, dan tiga frasa pertama untuk didengarkan.",
  items: [
    {
      type: "material",
      key: "m0-why-hangeul",
      title: "Kenapa belajar Hangeul?",
      description:
        "Untuk apa kamu belajar Hangeul, cara kursus ini berjalan, dan tiga frasa pertama yang cukup didengarkan dulu.",
      minutes: 12,
      blocks: [
        heading("Selamat datang di Hangeul Mastery"),
        p(
          "Hangeul (한글) adalah aksara bahasa Korea. Di kursus ini kamu belajar membaca dan menulisnya dari nol, sampai kamu bisa membaca kata, papan nama, dan kalimat pendek sendiri.",
        ),
        p(
          "Kabar baiknya, Hangeul termasuk aksara yang paling mudah dipelajari. Hurufnya sedikit, bentuknya logis, dan setiap huruf mewakili satu bunyi. Banyak pelajar sudah bisa membaca kata-kata sederhana setelah beberapa hari berlatih.",
        ),
        heading("Untuk apa kamu belajar?", 3),
        bullet(
          b("Bekerja di Korea (EPS-TOPIK). "),
          "Soal ujian EPS-TOPIK ditulis dalam Hangeul, tanpa huruf Latin. Membaca dengan lancar adalah langkah pertama sebelum kamu menghafal kosakata ujian.",
        ),
        bullet(
          b("K-pop dan drama. "),
          "Kamu bisa membaca nama idol, judul lagu, lirik, dan tulisan di layar drama tanpa menunggu terjemahan.",
        ),
        bullet(
          b("Kuliah, beasiswa, dan wisata. "),
          "Menu restoran, papan jalan, peta kereta, dan formulir di Korea hampir semuanya memakai Hangeul.",
        ),
        callout(
          "tip",
          "Romanisasi (tulisan Latin seperti ",
          i("annyeonghaseyo"),
          ") memang membantu di awal, tetapi sering menipu, dan orang Korea tidak menulis dengan huruf Latin. Karena itu di kursus ini romanisasi hanya menjadi pegangan di modul-modul awal, lalu perlahan dilepas.",
        ),
        heading("Cara kursus ini berjalan", 3),
        numbered(
          b("Modul berurutan. "),
          "Ada 10 modul, dari sejarah sampai batchim (huruf di bagian bawah blok). Modul berikutnya terbuka setelah semua bagian modul sebelumnya selesai.",
        ),
        numbered(
          b("Materi. "),
          "Setiap pelajaran memperkenalkan beberapa huruf baru. Ketuk kartu huruf untuk mendengar bunyinya, lalu baca tabel suku kata dan kata-kata nyata.",
        ),
        numbered(
          b("Permainan di aplikasi Hakgyo. "),
          "Ada tiga permainan: ",
          b("Hangeul"),
          " untuk mengenal huruf, ",
          b("Susun 한글"),
          " untuk menyusun suku kata, dan ",
          b("Susun kata"),
          " untuk menyusun kata. Setiap permainan hanya memakai huruf yang sudah kamu pelajari.",
        ),
        numbered(
          b("Kosakata. "),
          "Setiap modul punya kata-kata yang hanya memakai huruf yang sudah kamu kenal. Kata-kata itu juga masuk ke latihan harianmu.",
        ),
        numbered(
          b("Kuis. "),
          "Di akhir setiap modul ada kuis pilihan ganda. Nilai lulusnya 80%, kecuali kuis modul 4 (konsonan aspirasi dan tegang) yang 75%. Kalau belum lulus, kamu boleh mengulang.",
        ),
        numbered(
          b("Lencana. "),
          "Setelah semua bagian selesai, kamu mendapat lencana Hangeul Mastery.",
        ),
        table([
          ["Modul", "Yang kamu pelajari"],
          ["0", "Sejarah dan cara kerja Hangeul"],
          ["1", "Vokal dasar dan blok suku kata"],
          ["2", "Sepuluh konsonan inti"],
          ["3", "Vokal Y, serta ㅐ dan ㅔ"],
          ["4", "Konsonan aspirasi dan tegang"],
          ["5", "Vokal W"],
          ["6", "Membaca dan menulis"],
          ["7", "Batchim (konsonan akhir)"],
          ["8", "Batchim ganda dan perubahan bunyi"],
          ["9", "Ujian Hangeul Mastery"],
        ]),
        heading("Dengarkan dulu: tiga frasa pertama", 3),
        p(
          "Sebelum belajar huruf, dengarkan tiga frasa yang paling sering kamu temui. ",
          b("Dengarkan saja dulu, nanti kamu bisa membacanya."),
          " Frasa ini memakai huruf di bagian bawah blok (batchim) yang baru dipelajari di modul 7, jadi sekarang cukup kenali bunyinya.",
        ),
        audioClip("안녕하세요", "Halo / apa kabar (sopan)"),
        audioClip("감사합니다", "Terima kasih (formal)"),
        audioClip("사랑해요", "Aku sayang kamu"),
        table([
          ["Frasa", "Arti", "Kapan dipakai"],
          [
            "안녕하세요",
            "Halo, apa kabar",
            "Menyapa siapa saja dengan sopan, pagi, siang, atau malam",
          ],
          [
            "감사합니다",
            "Terima kasih",
            "Formal: di tempat kerja, di toko, kepada orang yang lebih tua",
          ],
          [
            "사랑해요",
            "Aku sayang kamu; aku cinta kamu",
            "Kepada keluarga, pasangan, atau idolamu",
          ],
        ]),
        callout(
          "info",
          "Ucapkan ulang setiap frasa dengan suara keras tiga kali. Tidak perlu sempurna. Telinga dan mulutmu sedang berkenalan dengan bunyi baru.",
        ),
        heading("Tips belajar", 3),
        bullet(
          "Belajar 15 menit setiap hari lebih efektif daripada 2 jam seminggu sekali.",
        ),
        bullet("Selalu putar audionya dan tirukan dengan suara keras."),
        bullet(
          "Tulis setiap huruf baru dengan tangan beberapa kali. Menulis membantu kamu mengingat bentuknya.",
        ),
        bullet(
          "Mainkan permainan di aplikasi saat ada waktu luang, misalnya di perjalanan.",
        ),
        callout(
          "success",
          "Ringkasan: Hangeul adalah aksara Korea yang dirancang supaya mudah dipelajari. Kamu akan belajar sedikit demi sedikit lewat materi, permainan, kosakata, dan kuis. Tiga frasa tadi cukup didengarkan dulu.",
        ),
      ],
    },
    {
      type: "material",
      key: "m0-king-sejong",
      title: "Raja Sejong dan Hunminjeongeum",
      description:
        "Mengapa Korea butuh aksara baru, siapa Raja Sejong, dan kapan Hangeul diumumkan serta diterbitkan.",
      minutes: 12,
      blocks: [
        heading("Sebelum ada Hangeul"),
        p(
          "Selama berabad-abad orang Korea menulis dengan aksara Cina (한자, ",
          i("hanja"),
          "). Masalahnya, bahasa Korea dan bahasa Tionghoa sangat berbeda, baik bunyi maupun tata bahasanya. Aksara Cina juga terdiri dari ribuan karakter, sehingga hanya kalangan bangsawan dan terpelajar yang punya waktu untuk menguasainya.",
        ),
        p(
          "Memang ada cara meminjam karakter Cina untuk mencatat bunyi bahasa Korea, tetapi cara itu rumit. Akibatnya, kebanyakan rakyat biasa tidak bisa membaca dan menulis bahasanya sendiri.",
        ),
        heading("Raja Sejong"),
        p(
          "Sejong (세종) adalah raja keempat Dinasti Joseon. Ia memerintah dari tahun 1418 sampai 1450 dan dikenal sebagai Sejong yang Agung (세종대왕). Pada masa pemerintahannya berkembang banyak penelitian, misalnya alat pengukur curah hujan, jam matahari, dan jam air.",
        ),
        p(
          "Sejong ingin rakyatnya punya aksara yang cocok untuk bahasa Korea dan mudah dipelajari siapa saja. Hasilnya adalah 28 huruf baru: 17 konsonan dan 11 vokal.",
        ),
        heading("Linimasa", 3),
        table([
          ["Waktu", "Peristiwa"],
          ["1418", "Sejong naik takhta sebagai raja keempat Joseon."],
          [
            "Akhir 1443",
            "Pada bulan ke-12 kalender lunar, Sejong mengumumkan 28 huruf baru.",
          ],
          [
            "1446",
            "Pada bulan ke-9 kalender lunar, huruf baru diterbitkan resmi dalam buku 훈민정음 (Hunminjeongeum).",
          ],
          [
            "1926",
            "Hari peringatan aksara Korea dirayakan untuk pertama kalinya.",
          ],
          [
            "1940",
            "Salinan buku penjelasnya, Hunminjeongeum Haerye, ditemukan di Andong.",
          ],
          [
            "1962",
            "Buku Haerye ditetapkan sebagai Harta Nasional Korea Selatan.",
          ],
          [
            "1997",
            "UNESCO memasukkan naskah Hunminjeongeum ke daftar Memory of the World (Ingatan Dunia).",
          ],
        ]),
        heading("Apa arti 훈민정음?", 3),
        p(
          "훈민정음 (",
          i("Hunminjeongeum"),
          ") berarti ",
          b('"bunyi yang benar untuk mengajar rakyat"'),
          ". Nama ini dipakai untuk huruf-hurufnya sekaligus untuk buku yang memperkenalkannya.",
        ),
        p(
          "Di kata pengantarnya, Sejong menjelaskan alasannya. Terjemahan bebasnya kira-kira begini:",
        ),
        quote(
          "Bahasa negeri kami berbeda dengan bahasa Tiongkok dan tidak cocok dengan aksaranya. Karena itu banyak rakyat biasa yang ingin menyampaikan sesuatu, tetapi akhirnya tidak bisa mengungkapkan maksudnya. Aku merasa iba, lalu membuat 28 huruf baru, supaya setiap orang mudah mempelajarinya dan nyaman memakainya sehari-hari.",
        ),
        p(
          "Tidak semua orang setuju. Sebagian pejabat istana menentang aksara baru ini karena khawatir orang akan meninggalkan tulisan Cina. Meski begitu, Sejong tetap menerbitkannya.",
        ),
        heading("Siapa yang membuatnya?", 3),
        p(
          "Hangeul dikaitkan dengan Raja Sejong sendiri. Penjelasan lengkapnya ditulis oleh para cendekiawan istana dari Jiphyeonjeon (집현전), lembaga riset kerajaan, dalam buku ",
          i("Hunminjeongeum Haerye"),
          " (penjelasan dan contoh). Para sejarawan masih membahas seberapa besar peran para cendekiawan itu dalam merancang hurufnya. Yang jelas, Sejong yang memprakarsai dan mengumumkannya.",
        ),
        heading("Dari 28 menjadi 24 huruf", 3),
        p(
          "Dari 28 huruf awal, empat sudah tidak dipakai lagi. Sekarang Hangeul memiliki 24 huruf dasar: 14 konsonan dan 10 vokal. Ditambah huruf gabungannya, yaitu konsonan dobel seperti ㄲ dan vokal gabungan seperti ㅘ, jumlahnya 40 huruf.",
        ),
        heading('Nama "Hangeul" dan Hari Hangeul', 3),
        p(
          "Dulu aksara ini punya beberapa sebutan. Nama 한글 (",
          i("Hangeul"),
          ') baru dipakai pada awal abad ke-20. Artinya kira-kira "tulisan agung" atau "tulisan Korea".',
        ),
        p(
          "Korea Selatan merayakan Hari Hangeul (한글날) setiap ",
          b("9 Oktober"),
          ", dan sejak 2013 hari itu kembali menjadi hari libur nasional. Tanggal ini adalah ",
          b("perkiraan"),
          ". Buku Haerye hanya mencatat bahwa buku itu selesai pada sepuluh hari pertama bulan ke-9 tahun 1446 menurut kalender lunar. Tanggal 10 bulan itu kemudian dihitung ke kalender Masehi, dan hasilnya 9 Oktober. Korea Utara memperingati hari aksaranya pada tanggal lain, yaitu 15 Januari.",
        ),
        callout(
          "warning",
          'Kamu mungkin menemukan tulisan "Hangeul diciptakan pada 9 Oktober 1446". Itu keliru. Hangeul diumumkan pada akhir 1443, diterbitkan resmi pada bulan ke-9 kalender lunar tahun 1446, dan 9 Oktober adalah tanggal peringatan yang ditetapkan berdasarkan perkiraan.',
        ),
        p("Tahun 2026 adalah peringatan ke-580 terbitnya Hunminjeongeum."),
        callout(
          "success",
          "Ringkasan: Raja Sejong mengumumkan 28 huruf baru pada akhir 1443 dan menerbitkannya dalam Hunminjeongeum pada 1446, supaya rakyat biasa bisa menulis bahasanya sendiri. Sekarang Hangeul memakai 24 huruf dasar, dan 9 Oktober diperingati sebagai Hari Hangeul.",
        ),
      ],
    },
    {
      type: "material",
      key: "m0-scientific",
      title: "Kenapa Hangeul disebut ilmiah",
      description:
        "Konsonan yang meniru alat ucap, garis tambahan untuk bunyi yang lebih kuat, vokal dari langit, bumi, dan manusia, serta kisah buku Haerye.",
      minutes: 12,
      blocks: [
        heading("Huruf yang meniru alat ucap"),
        p(
          "Bentuk huruf Hangeul tidak dipilih secara acak. Menurut buku Haerye, lima konsonan dasar dibuat dengan meniru bentuk alat ucap saat bunyinya dikeluarkan.",
        ),
        table([
          ["Huruf", "Meniru", "Bunyi kira-kira"],
          [
            "ㄱ",
            "Pangkal lidah yang naik menutup bagian belakang mulut",
            "g atau k",
          ],
          ["ㄴ", "Ujung lidah yang menyentuh gusi di belakang gigi atas", "n"],
          ["ㅁ", "Bentuk mulut", "m"],
          ["ㅅ", "Gigi", "s"],
          ["ㅇ", "Tenggorokan (bulat)", "diam di awal suku kata, ng di akhir"],
        ]),
        p(
          'Coba ucapkan "ga" pelan-pelan dan rasakan pangkal lidahmu naik. Lalu ucapkan "na": ujung lidah menempel di belakang gigi atas, mirip bentuk ㄴ kalau mulut dilihat dari samping.',
        ),
        heading("Tambah garis, tambah tenaga"),
        p(
          "Konsonan lain dibuat dengan menambah garis pada bentuk dasar. Garis tambahan menandakan bunyi yang lebih kuat, biasanya dengan hembusan napas lebih banyak.",
        ),
        table([
          ["Dasar", "Tambah garis", "Tambah lagi"],
          ["ㄱ", "ㅋ", ""],
          ["ㄴ", "ㄷ", "ㅌ"],
          ["ㅁ", "ㅂ", "ㅍ"],
          ["ㅅ", "ㅈ", "ㅊ"],
          ["ㅇ", "ㅎ", ""],
        ]),
        p(
          "Huruf dasar yang ditulis dobel (ㄲ ㄸ ㅃ ㅆ ㅉ) adalah konsonan tegang. Kamu akan mempelajarinya di modul 4.",
        ),
        heading("Langit, bumi, dan manusia"),
        p("Vokal dibangun dari tiga lambang:"),
        bullet(b("ㆍ (titik)"), " melambangkan langit yang bulat."),
        bullet(b("ㅡ (garis datar)"), " melambangkan bumi yang datar."),
        bullet(b("ㅣ (garis tegak)"), " melambangkan manusia yang berdiri."),
        p(
          'Vokal lain adalah gabungan ketiganya. Sekarang titik itu ditulis sebagai garis pendek. Dua titik menambahkan bunyi "y", misalnya ㅏ menjadi ㅑ.',
        ),
        table([
          ["Gabungan", "Hasil"],
          ["ㅣ dengan titik di kanan", "ㅏ"],
          ["ㅣ dengan titik di kiri", "ㅓ"],
          ["ㅡ dengan titik di atas", "ㅗ"],
          ["ㅡ dengan titik di bawah", "ㅜ"],
        ]),
        heading("Satu huruf, satu bunyi, disusun dalam blok"),
        p(
          "Seperti abjad Latin, setiap huruf Hangeul mewakili satu bunyi. Bedanya, huruf-huruf itu tidak ditulis berjajar begitu saja, tetapi disusun menjadi blok suku kata. Contohnya ㅎ + ㅏ + ㄴ menjadi 한, dan ㄱ + ㅡ + ㄹ menjadi 글. Jadi kata 한글 terdiri dari dua blok.",
        ),
        p(
          "Bagi orang Indonesia ini terasa akrab, karena kita juga terbiasa membaca per suku kata: ba-ca, bu-ku.",
        ),
        heading("Buku yang hilang dan ditemukan kembali"),
        p(
          "Selama ratusan tahun, salinan ",
          i("Hunminjeongeum Haerye"),
          " dianggap hilang. Pada tahun 1940 sebuah salinan ditemukan di Andong, lalu dibeli oleh kolektor Jeon Hyeong-pil, yang dikenal dengan nama Gansong dan berjasa menyelamatkan banyak warisan budaya Korea. Berkat buku inilah kita tahu prinsip-prinsip yang dijelaskan para pembuatnya.",
        ),
        p(
          "Buku itu ditetapkan sebagai Harta Nasional Korea Selatan pada 1962, dan pada 1997 UNESCO memasukkannya ke daftar Memory of the World.",
        ),
        callout(
          "info",
          "Penjelasan bentuk huruf ini adalah alat bantu ingatan yang sangat berguna. Namun para peneliti Korea sendiri mengakui bahwa prinsip penciptaan Hangeul belum terungkap sepenuhnya, dan beberapa huruf, misalnya ㅁ, ㅂ, dan ㅍ, tidak sepenuhnya cocok dengan aturan tambah garis. Pakailah sebagai cara mengingat, bukan sebagai rumus mutlak.",
        ),
        heading("Kuis sejarah", 3),
        p(
          "Sudah siap? Kerjakan kuis singkat berikut tentang dua pelajaran terakhir. Kamu perlu nilai 80% untuk lulus, dan boleh mengulang kalau belum berhasil.",
        ),
        assessmentRef("m0-quiz"),
        callout(
          "success",
          "Ringkasan: konsonan dasar meniru alat ucap, garis tambahan berarti bunyi yang lebih kuat, dan vokal berasal dari langit, bumi, dan manusia. Huruf-huruf disusun dalam blok suku kata. Ingat ini sebagai alat bantu, lalu mulailah membaca di modul 1.",
        ),
      ],
    },
    {
      type: "assessment",
      key: "m0-quiz",
      title: "Kuis sejarah Hangeul",
      description:
        "14 soal tentang Raja Sejong, Hunminjeongeum, Hari Hangeul, dan logika bentuk hurufnya.",
      instructions:
        "Pilih satu jawaban yang paling tepat untuk setiap soal. Nilai lulus 80%. Kamu boleh mengulang kuis ini.",
      passingScore: 80,
      shuffleOptions: true,
      questions: [
        single(
          "king",
          "Raja siapa yang memprakarsai dan mengumumkan Hangeul?",
          ["Raja Taejo", "Raja Sejong", "Raja Jeongjo", "Raja Gwanggaeto"],
          1,
          "Raja Sejong, raja keempat Dinasti Joseon, mengumumkan 28 huruf baru pada akhir 1443.",
        ),
        single(
          "announced",
          "Kapan Hangeul pertama kali diumumkan?",
          ["9 Oktober 1446", "Tahun 1392", "Akhir tahun 1443", "Tahun 1940"],
          2,
          "Hangeul diumumkan pada bulan ke-12 kalender lunar tahun 1443, lalu diterbitkan resmi pada 1446.",
        ),
        single(
          "promulgated",
          "Pada tahun berapa Hunminjeongeum diterbitkan secara resmi?",
          ["1446", "1443", "1910", "1962"],
          0,
          "Hunminjeongeum diterbitkan pada bulan ke-9 kalender lunar tahun 1446. Tahun 1443 adalah tahun pengumumannya.",
        ),
        single(
          "meaning",
          "Apa arti nama 훈민정음 (Hunminjeongeum)?",
          [
            "Huruf agung bangsa Korea",
            "Kitab para raja Joseon",
            "Tulisan untuk kaum bangsawan",
            "Bunyi yang benar untuk mengajar rakyat",
          ],
          3,
          '훈민정음 berarti "bunyi yang benar untuk mengajar rakyat". Tujuannya memang agar rakyat biasa bisa membaca dan menulis.',
        ),
        single(
          "purpose",
          "Menurut kata pengantar Hunminjeongeum, mengapa Sejong membuat aksara baru?",
          [
            "Rakyat biasa sulit menulis bahasanya sendiri dengan aksara Cina",
            "Untuk menggantikan bahasa Mandarin di istana",
            "Supaya bahasa Korea bisa ditulis dengan huruf Latin",
            "Untuk menulis bahasa Jepang",
          ],
          0,
          "Bahasa Korea berbeda dari bahasa Tiongkok dan tidak cocok dengan aksaranya, sehingga banyak rakyat biasa tidak bisa menuliskan maksudnya.",
        ),
        single(
          "original-count",
          "Berapa jumlah huruf yang diumumkan Sejong?",
          ["24", "14", "28", "40"],
          2,
          "Awalnya ada 28 huruf: 17 konsonan dan 11 vokal. Empat di antaranya sudah tidak dipakai lagi.",
        ),
        single(
          "modern-count",
          "Berapa jumlah huruf dasar Hangeul yang dipakai sekarang?",
          ["24", "28", "26", "17"],
          0,
          "Sekarang ada 24 huruf dasar: 14 konsonan dan 10 vokal. Dengan huruf gabungannya, jumlahnya 40.",
        ),
        single(
          "hangeul-day",
          "Apa yang benar tentang tanggal 9 Oktober?",
          [
            "Tanggal pasti Hangeul diciptakan",
            "Hari ulang tahun Raja Sejong",
            "Hari ditemukannya buku Haerye",
            "Hari Hangeul di Korea Selatan, tanggal yang ditetapkan berdasarkan perkiraan",
          ],
          3,
          'Buku Haerye hanya mencatat "sepuluh hari pertama bulan ke-9" tahun 1446. Tanggal 9 Oktober adalah hasil perkiraan, bukan tanggal pasti penciptaan.',
        ),
        single(
          "haerye-found",
          "Di mana dan kapan salinan Hunminjeongeum Haerye ditemukan?",
          [
            "Di Seoul, tahun 1446",
            "Di Andong, tahun 1940",
            "Di Busan, tahun 1997",
            "Di Gyeongju, tahun 1962",
          ],
          1,
          "Salinan Haerye ditemukan di Andong pada 1940, lalu dibeli dan dirawat oleh kolektor Jeon Hyeong-pil (Gansong).",
        ),
        single(
          "unesco",
          "Pada tahun berapa UNESCO memasukkan Hunminjeongeum ke daftar Memory of the World?",
          ["1962", "1446", "2013", "1997"],
          3,
          "UNESCO memasukkannya pada 1997. Tahun 1962 adalah penetapannya sebagai Harta Nasional Korea Selatan.",
        ),
        single(
          "shape-m",
          "Menurut buku Haerye, bentuk huruf ㅁ meniru apa?",
          ["Gigi", "Tenggorokan", "Bentuk mulut", "Ujung lidah"],
          2,
          "ㅁ meniru bentuk mulut. ㅅ meniru gigi, ㅇ tenggorokan, dan ㄴ ujung lidah yang menyentuh gusi atas.",
        ),
        single(
          "vowel-symbols",
          "Vokal Hangeul dibangun dari tiga lambang. Apa saja?",
          [
            "Langit, bumi, dan manusia",
            "Matahari, bulan, dan bintang",
            "Air, api, dan tanah",
            "Gunung, sungai, dan laut",
          ],
          0,
          "Titik ㆍ melambangkan langit, garis datar ㅡ bumi, dan garis tegak ㅣ manusia.",
        ),
        single(
          "extra-stroke",
          "ㅋ dibuat dari ㄱ dengan tambahan satu garis. Apa arti garis tambahan itu?",
          [
            "Bunyinya menjadi lebih pelan",
            "Bunyinya lebih kuat, dengan hembusan napas lebih banyak",
            "Hurufnya berubah menjadi vokal",
            "Hurufnya tidak dibaca",
          ],
          1,
          'Garis tambahan menandakan bunyi yang lebih kuat. ㅋ adalah "k" dengan hembusan napas. Ingat bahwa ini alat bantu ingatan; tidak semua huruf cocok sempurna dengan aturan ini.',
        ),
        single(
          "blocks",
          "Bagaimana huruf Hangeul ditulis?",
          [
            "Satu karakter untuk setiap kata, seperti aksara Cina",
            "Huruf berjajar satu per satu tanpa disusun",
            "Huruf disusun menjadi blok, satu blok untuk satu suku kata",
            "Huruf disambung seperti tulisan Arab",
          ],
          2,
          "Setiap huruf mewakili satu bunyi, lalu huruf-huruf itu disusun menjadi blok suku kata. Contohnya 한글 terdiri dari dua blok: 한 dan 글.",
        ),
      ],
    },
  ],
};
