import {
  b,
  bullet,
  callout,
  chat,
  culture,
  defineMaterial,
  ex,
  grammar,
  h3,
  i,
  opener,
  p,
  quizRef,
  ref,
  table,
} from "../blocks";

export default defineMaterial({
  key: "ki-waktu-sebab",
  title: "Penyambung 2: waktu, sebab, dan makin-makin",
  description:
    "Sebelum, sesudah, pas, begitu, gara-gara, sekalian, boro-boro, makin-makin, asal. Pola penyambung yang bikin ceritamu nyambung dan nggak patah-patah.",
  intro: [
    opener({
      eyebrow: "PAHAM POLA · BAB 3",
      chapterNumber: "03",
      titleKo: "시간과 이유",
      subtitle:
        "Sebelum, sesudah, pas, begitu, gara-gara, sekalian: biar ceritamu ngalir kayak orang Korea beneran.",
      question: "어제 왜 전화 안 받았어요?",
      answer: "죄송해요. 일하느라고 못 받았어요. 퇴근하자마자 잤어요.",
      focus: [
        {
          label: "문법 · Pola",
          title: "Urutan waktu",
          description:
            "-기 전에, -(으)ㄴ 후에, -(으)ㄹ 때, -다가, -자마자: sebelum, sesudah, pas, lagi … eh, begitu … langsung.",
        },
        {
          label: "표현 · Kata kunci",
          title: "Tiga rasa “gara-gara”",
          description:
            "-느라고 (sibuk sendiri), -기 때문에 (alasan resmi), -는 바람에 (kejadian mendadak).",
        },
        {
          label: "함정 · Jebakan",
          title: "Lampau di tempat yang salah",
          description:
            "✗ 왔기 전에, ✗ 잤는 바람에, ✗ 도착했자마자. Tanda lampau cukup di kata kerja terakhir.",
        },
      ],
      objectives: [
        {
          ko: "시간 순서대로 자연스럽게 이야기할 수 있어요.",
          id: "Bisa cerita urut waktu tanpa patah-patah.",
        },
        {
          ko: "상황에 맞는 이유 표현을 골라 쓸 수 있어요.",
          id: "Bisa milih “gara-gara” yang pas buat tiap situasi.",
        },
      ],
    }),
    p(
      "Coba inget cara kamu cerita ke temen: ",
      i(
        "“Pas lagi jalan ke kampus, eh ketemu mantan. Gara-gara kaget, HP-ku jatuh. Boro-boro nyapa, aku malah kabur.”",
      ),
      " Satu cerita, isinya penuh kata sambung: ",
      i("pas, lagi … eh, gara-gara, boro-boro, malah"),
      ".",
    ),
    p(
      "Bahasa Korea juga gitu. Bedanya, kata sambungnya nempel di ujung kata kerja. Kalau kamu cuma hafal -고 dan -아서, ceritamu bakal kedengeran kayak robot: ",
      i("“Aku jalan. Terus aku ketemu. Terus aku kaget.”"),
    ),
    p(
      "Selain urutan waktu dan sebab, kamu juga bakal kenalan sama pola ",
      b("nuansa"),
      ": walaupun (-아도), sekalian (-는 김에), boro-boro (-기는커녕), makin … makin (-(으)ㄹ수록), dan asal (-기만 하면).",
    ),
    callout(
      "info",
      "Materi ini lanjutan dari ",
      ref("Penyambung 1", "ki-alasan-urutan"),
      " (-고, -아서, -(으)니까, -는데, -(으)면). Kalau belum kenal pola-pola itu, mampir ke sana dulu, ya.",
    ),
  ],
  sections: [
    // ─────────────────────────────────────────────── -기 전에
    {
      key: "gi-jeone",
      title: "-기 전에: sebelum",
      blocks: [
        grammar({
          number: "01",
          title: "-기 전에",
          theme: "blue",
          descriptionKo: "어떤 일을 하기 앞서 다른 일을 할 때 써요.",
          descriptionTranslation:
            "Artinya “sebelum”. Tempel -기 전에 ke kata kerja, terus lanjut ke hal yang kamu lakuin duluan. Gampang banget: semua kata kerja pakai bentuk yang sama, nggak peduli vokal atau konsonan.",
          rules: [
            {
              condition: "Kata kerja (vokal)",
              form: "-기 전에",
              example: "가다 → 가기 전에",
            },
            {
              condition: "Kata kerja (konsonan)",
              form: "-기 전에",
              example: "먹다 → 먹기 전에",
            },
            {
              condition: "하다",
              form: "-하기 전에",
              example: "출발하다 → 출발하기 전에",
            },
            {
              condition: "Kata benda",
              form: "N 전에",
              example: "식사 → 식사 전에",
            },
            {
              condition: "Jangka waktu",
              form: "N 전에 (= … yang lalu)",
              example: "10분 → 10분 전에",
            },
            {
              condition: "Kejadian lampau",
              form: "Tetap -기 전에, lampaunya di akhir",
              example: "자기 전에 샤워했어요",
            },
          ],
          examples: [
            { before: "자", emphasis: "기 전에", after: " 샤워해요." },
            {
              before: "일하",
              emphasis: "기 전에",
              after: " 장갑을 꼭 끼세요.",
            },
            {
              before: "한국에 오",
              emphasis: "기 전에",
              after: " 한국어를 배웠어요.",
            },
            { before: "출근 ", emphasis: "전에", after: " 커피 한 잔 마셔요." },
          ],
          tipKo: "-기 전에 앞에는 -았/었-을 쓰지 않아요.",
          tipTranslation:
            "Jangan pernah tulis 먹었기 전에. Tanda lampau cukup di kata kerja terakhir: 먹기 전에 손을 씻었어요.",
        }),
        p(
          b("Artinya apa sih?"),
          " Sama persis kayak ",
          i("“sebelum”"),
          ". Bedanya cuma urutan: di bahasa Indonesia kita bisa bilang ",
          i("“Aku mandi sebelum tidur”"),
          ". Di bahasa Korea, bagian ",
          i("sebelum tidur"),
          " wajib di depan: ",
          b("자기 전에 샤워해요"),
          ".",
        ),
        h3("Contoh"),
        ex(
          "일하기 전에 장갑을 꼭 끼세요.",
          "Sebelum kerja, sarung tangan wajib dipakai ya.",
          "반장님 ke pekerja baru",
        ),
        ex(
          "퇴근하기 전에 기계를 꺼 주세요.",
          "Sebelum pulang, tolong matiin mesinnya.",
        ),
        ex(
          "한국에 오기 전에 LPK에서 한국어를 배웠어요.",
          "Sebelum ke Korea, aku belajar bahasa Korea di LPK.",
        ),
        ex(
          "밥 먹기 전에 손 씻어.",
          "Cuci tangan dulu sebelum makan.",
          "반말, kayak ibu ke anak",
        ),
        ex("10분 전에 도착했어요.", "Aku udah nyampe 10 menit yang lalu."),
        ex(
          "전에 이 드라마 본 적 있어요.",
          "Aku pernah nonton drakor ini sebelumnya.",
        ),
        callout(
          "warning",
          "Jebakan: orang Indonesia sering nulis ",
          b("왔기 전에"),
          " karena mikir ",
          i("“sebelum aku (udah) dateng”"),
          ". Salah. Kata kerja sebelum -기 전에 selalu polos: ",
          b("오기 전에"),
          ". Satu lagi: ",
          b("10분 전에"),
          " bukan ",
          i("“10 menit sebelum”"),
          " sesuatu, tapi ",
          i("“10 menit yang lalu”"),
          ".",
        ),
        h3("Bandingin sama pola mirip"),
        p(
          "Kebalikannya adalah ",
          ref("-(으)ㄴ 후에", "ki-waktu-sebab", "eun-hue"),
          " (sesudah). Inget: -기 전에 nggak peduli vokal/konsonan, sedangkan -(으)ㄴ 후에 peduli.",
        ),
        table([
          ["Sebelum", "Sesudah"],
          ["먹기 전에", "먹은 후에"],
          ["가기 전에", "간 후에"],
          ["일하기 전에", "일한 후에"],
        ]),
        callout(
          "tip",
          "Mau bilang ",
          i("“berangkat sekarang biar nggak keburu macet”"),
          "? Itu pakai -기 전에 juga: 길이 막히기 전에 지금 출발하자. Praktiknya ada di ",
          ref("keburu", "ik-waktu", "keburu"),
          ".",
        ),
        h3("Coba bikin sendiri"),
        p(
          "Bilang dalam bahasa Korea: ",
          i("“Aku selalu telepon ibu sebelum tidur.”"),
          " (selalu = 항상, telepon = 전화하다)",
        ),
        callout(
          "success",
          "Jawaban: ",
          b("저는 자기 전에 항상 엄마한테 전화해요."),
          " Bagian “sebelum tidur” pindah ke depan, ya.",
        ),
      ],
    },

    // ─────────────────────────────────────────────── -(으)ㄴ 후에
    {
      key: "eun-hue",
      title: "-(으)ㄴ 후에 / 다음에: sesudah",
      blocks: [
        grammar({
          number: "02",
          title: "-(으)ㄴ 후에 / -(으)ㄴ 다음에",
          theme: "blue",
          descriptionKo: "어떤 일이 끝나고 그 뒤에 다른 일을 할 때 써요.",
          descriptionTranslation:
            "Artinya “sesudah” atau “abis …”. 후에 agak rapi, 다음에 lebih santai buat ngobrol, artinya sama. Huruf ㄴ di sini udah nandain “selesai”, jadi nggak perlu -았/었- lagi.",
          rules: [
            {
              condition: "Akhiran vokal",
              form: "-ㄴ 후에",
              example: "가다 → 간 후에",
            },
            {
              condition: "Akhiran konsonan",
              form: "-은 후에",
              example: "먹다 → 먹은 후에",
            },
            {
              condition: "Akhiran ㄹ",
              form: "ㄹ hilang + -ㄴ 후에",
              example: "만들다 → 만든 후에",
            },
            {
              condition: "하다",
              form: "-한 후에",
              example: "퇴근하다 → 퇴근한 후에",
            },
            {
              condition: "ㄷ tak beraturan",
              form: "ㄷ → ㄹ + -은",
              example: "듣다 → 들은 후에",
            },
            {
              condition: "Kata benda",
              form: "N 후에",
              example: "수업 → 수업 후에",
            },
            {
              condition: "Jangka waktu",
              form: "N 후에 (= … lagi)",
              example: "3일 → 3일 후에",
            },
            {
              condition: "Versi ngobrol",
              form: "-고 나서",
              example: "먹고 나서",
            },
          ],
          examples: [
            { before: "밥을 먹", emphasis: "은 후에", after: " 약을 드세요." },
            {
              before: "일이 끝",
              emphasis: "난 다음에",
              after: " 같이 저녁 먹어요.",
            },
            { before: "퇴근 ", emphasis: "후에", after: " 마트에 갔어요." },
            { before: "샤워하", emphasis: "고 나서", after: " 잘게." },
          ],
          tipKo: "시간 + 후에는 ‘… 뒤에’라는 뜻이에요.",
          tipTranslation:
            "3일 후에 = 3 hari lagi. Bandingin: 3일 전에 = 3 hari yang lalu.",
        }),
        p(
          b("Artinya apa sih?"),
          " Kayak ",
          i("“abis makan, minum obat”"),
          " atau ",
          i("“setelah kerja selesai, kita makan”"),
          ". Kalau di obrolan santai, orang Korea lebih sering pakai ",
          b("-고 나서"),
          ": ",
          i("“abis … baru …”"),
          ".",
        ),
        h3("Contoh"),
        ex(
          "밥을 먹은 후에 약을 드세요.",
          "Obatnya diminum abis makan ya.",
          "apoteker",
        ),
        ex(
          "일이 끝난 다음에 같이 저녁 먹어요.",
          "Abis kerja kelar, makan malam bareng yuk.",
        ),
        ex("퇴근 후에 마트에 갔어요.", "Pulang kerja aku mampir ke mart."),
        ex(
          "수업 끝나고 나서 도서관 갈 거예요.",
          "Abis kelas aku mau ke perpus.",
        ),
        ex(
          "이 영상을 본 다음에 댓글 남겨 주세요.",
          "Abis nonton video ini, tinggalin komen ya.",
        ),
        ex("3일 후에 다시 오세요.", "Tiga hari lagi dateng lagi ya."),
        callout(
          "warning",
          "Jebakan: jangan dobel tanda lampau. ",
          b("먹었은 후에"),
          " itu salah. ㄴ di 먹은 udah artinya ",
          i("“udah”"),
          ". Jebakan kedua: akhiran ㄹ. 만들다 jadi ",
          b("만든 후에"),
          ", bukan 만들은 후에.",
        ),
        h3("Bandingin sama pola mirip"),
        bullet(
          ref("-고", "ki-alasan-urutan", "go"),
          ": cuma nyusun urutan (",
          i("“terus”"),
          "). -(으)ㄴ 후에 lebih nekenin ",
          i("“baru setelah selesai”"),
          ".",
        ),
        bullet(
          ref("-아서/어서 (lalu)", "ki-alasan-urutan", "aseo-lalu"),
          ": kegiatan kedua nyambung di tempat/benda yang sama (시장에 가서 샀어요 = belinya di pasar itu).",
        ),
        bullet(
          ref("-자마자", "ki-waktu-sebab", "jamaja"),
          ": sesudah, tapi ",
          i("langsung"),
          " tanpa jeda.",
        ),
        callout(
          "tip",
          "Pengen bilang ",
          i("“baru aja”"),
          " atau ",
          i("“baru sekarang”"),
          "? Itu beda lagi, cek ",
          ref("baru", "ik-waktu", "baru"),
          ".",
        ),
      ],
    },

    // ─────────────────────────────────────────────── -(으)ㄹ 때
    {
      key: "eul-ttae",
      title: "-(으)ㄹ 때: pas, waktu, ketika",
      blocks: [
        grammar({
          number: "03",
          title: "-(으)ㄹ 때",
          theme: "blue",
          descriptionKo: "어떤 일이 일어나는 시간이나 상황을 말할 때 써요.",
          descriptionTranslation:
            "Artinya “pas”, “waktu”, “ketika”. Bisa nempel ke kata kerja dan kata sifat. Kalau kejadiannya udah selesai duluan, pakai -았/었을 때.",
          rules: [
            {
              condition: "Akhiran vokal",
              form: "-ㄹ 때",
              example: "가다 → 갈 때",
            },
            {
              condition: "Akhiran konsonan",
              form: "-을 때",
              example: "먹다 → 먹을 때",
            },
            {
              condition: "Akhiran ㄹ",
              form: "langsung + 때",
              example: "살다 → 살 때",
            },
            { condition: "하다", form: "-할 때", example: "일하다 → 일할 때" },
            {
              condition: "Kata sifat",
              form: "sama",
              example: "바쁘다 → 바쁠 때",
            },
            {
              condition: "ㅂ tak beraturan",
              form: "ㅂ → 우 + -ㄹ 때",
              example: "춥다 → 추울 때",
            },
            {
              condition: "ㄷ tak beraturan",
              form: "ㄷ → ㄹ + -을 때",
              example: "듣다 → 들을 때",
            },
            {
              condition: "Udah selesai duluan",
              form: "-았/었을 때",
              example: "오다 → 왔을 때",
            },
            {
              condition: "Kata benda",
              form: "N 때",
              example: "점심 → 점심 때",
            },
          ],
          examples: [
            {
              before: "모",
              emphasis: "를 때",
              after: "는 반장님한테 물어보세요.",
            },
            {
              before: "한국에 처음 왔",
              emphasis: "을 때",
              after: " 너무 추웠어요.",
            },
            { before: "힘들", emphasis: " 때", after: " 이 노래를 들어요." },
            { before: "시간 있", emphasis: "을 때", after: " 연락해." },
          ],
          tipKo: "갈 때와 갔을 때는 뜻이 달라요.",
          tipTranslation:
            "한국에 갈 때 = waktu (lagi) berangkat ke Korea, di jalan. 한국에 갔을 때 = waktu (udah) di Korea.",
        }),
        p(
          b("Artinya apa sih?"),
          " Bayangin kata ",
          i("“pas”"),
          ": ",
          i("“pas makan jangan main HP”"),
          ", ",
          i("“pas capek aku dengerin lagu ini”"),
          ". Itu semua -(으)ㄹ 때. Ditambah 는 jadi ",
          b("-(으)ㄹ 때는"),
          " kalau mau nekenin ",
          i("“kalau pas …, ya …”"),
          ".",
        ),
        h3("Contoh"),
        ex(
          "모를 때는 반장님한테 물어보세요.",
          "Kalau pas nggak tahu, tanya aja ke 반장님.",
        ),
        ex(
          "한국에 처음 왔을 때 너무 추웠어요.",
          "Waktu pertama dateng ke Korea, dingin banget.",
        ),
        ex("밥 먹을 때 휴대폰 보지 마.", "Jangan main HP pas makan.", "반말"),
        ex(
          "힘들 때 이 노래를 들어요.",
          "Pas lagi capek, aku dengerin lagu ini.",
        ),
        ex(
          "어렸을 때 드라마를 많이 봤어요.",
          "Waktu kecil aku sering banget nonton drama.",
        ),
        ex("시간 있을 때 연락해.", "Kabarin aja kalau lagi ada waktu.", "반말"),
        callout(
          "warning",
          "Jebakan: ",
          b("한국에 갈 때 비행기에서 잤어요"),
          " (waktu berangkat ke Korea, aku tidur di pesawat) beda sama ",
          b("한국에 갔을 때 친구를 만났어요"),
          " (waktu udah di Korea, aku ketemu temen). Orang Indonesia sering cuma pakai 갈 때 buat dua-duanya karena ",
          i("“waktu ke Korea”"),
          " nggak ada tanda waktunya. Satu lagi: ",
          i("“waktu”"),
          " di sini bukan ",
          b("시간"),
          ". 시간 itu “waktu” dalam arti jam atau durasi (시간 있어요? = ada waktu?), bukan “pas”.",
        ),
        h3("Bandingin sama pola mirip"),
        bullet(
          ref("-(으)면", "ki-alasan-urutan", "myeon"),
          ": ",
          i("“kalau”"),
          " (syarat). 비가 오면 안 가요 = kalau hujan aku nggak berangkat. 비가 올 때 = pas hujan (keadaannya).",
        ),
        bullet(
          ref("-는 김에", "ki-waktu-sebab", "neun-gime"),
          ": ",
          i("“sekalian”"),
          ". Kalau ",
          i("“mumpung”"),
          " soal kesempatan (selagi masih di Korea), pakai -(으)ㄹ 때. Kalau ",
          i("“mumpung udah keluar”"),
          ", pakai -는 김에.",
        ),
        callout(
          "tip",
          "Mau bilang ",
          i("“mumpung masih di Korea, jalan-jalan yang banyak”"),
          "? → 한국에 있을 때 많이 놀러 다녀야지. Lengkapnya di ",
          ref("mumpung", "ik-alasan", "mumpung"),
          ".",
        ),
        h3("Coba bikin sendiri"),
        p(
          "Bilang: ",
          i("“Pas aku sakit, temenku masakin bubur.”"),
          " (bubur = 죽, masakin = 끓여 주다)",
        ),
        callout(
          "success",
          "Jawaban: ",
          b("제가 아팠을 때 친구가 죽을 끓여 줬어요."),
          " Sakitnya udah lewat, jadi 아팠을 때.",
        ),
      ],
    },

    // ─────────────────────────────────────────────── -아도/어도
    {
      key: "ado",
      title: "-아도/어도: walaupun, biarpun",
      blocks: [
        grammar({
          number: "04",
          title: "-아도/어도",
          theme: "blue",
          descriptionKo: "앞의 내용과 상관없이 뒤의 일이 일어날 때 써요.",
          descriptionTranslation:
            "Artinya “walaupun”, “biarpun”, “… pun tetep”. Cara nempelnya sama kayak -아요/어요: ganti 요 jadi 도. Ditambah 아무리 di depan jadi “se-… apa pun”.",
          rules: [
            {
              condition: "Vokal ㅏ/ㅗ",
              form: "-아도",
              example: "비싸다 → 비싸도",
            },
            {
              condition: "Vokal lain",
              form: "-어도",
              example: "먹다 → 먹어도",
            },
            { condition: "하다", form: "해도", example: "공부하다 → 공부해도" },
            {
              condition: "ㅂ tak beraturan",
              form: "-워도",
              example: "춥다 → 추워도",
            },
            {
              condition: "ㄷ tak beraturan",
              form: "-어도",
              example: "듣다 → 들어도",
            },
            {
              condition: "르 tak beraturan",
              form: "르 → ㄹ라/ㄹ러 + 도",
              example: "모르다 → 몰라도",
            },
            {
              condition: "Kata benda",
              form: "-이어도/여도 · (이)라도",
              example: "학생 → 학생이어도",
            },
            {
              condition: "Lampau",
              form: "-았/었어도",
              example: "했다 → 했어도",
            },
          ],
          examples: [
            { before: "비싸", emphasis: "도", after: " 이건 사고 싶어요." },
            {
              before: "아무리 피곤해",
              emphasis: "도",
              after: " 안전모는 꼭 써야 해요.",
            },
            { before: "비가 와", emphasis: "도", after: " 출근해야 돼요." },
            { before: "바빠", emphasis: "도", after: " 밥은 꼭 챙겨 먹어." },
          ],
          tipKo: "아무리 -아도/어도 = 아무리 그래도",
          tipTranslation:
            "아무리 바빠도 = sesibuk apa pun. Ini kombinasi yang sering banget keluar di drakor dan soal ujian.",
        }),
        p(
          b("Artinya apa sih?"),
          " Kayak ",
          i("“hujan pun tetep berangkat”"),
          ". Bagian depan bisa beneran terjadi (",
          i("udah mahal"),
          "), bisa juga cuma andai-andai (",
          i("seandainya hujan pun"),
          "). Itu bedanya sama ",
          i("“padahal”"),
          " yang selalu fakta.",
        ),
        h3("Contoh"),
        ex(
          "비싸도 이건 사고 싶어요.",
          "Biarpun mahal, yang ini tetep pengen aku beli.",
        ),
        ex(
          "아무리 피곤해도 안전모는 꼭 써야 해요.",
          "Secapek apa pun, helm wajib dipakai.",
          "aturan di pabrik",
        ),
        ex("비가 와도 출근해야 돼요.", "Hujan pun tetep harus masuk kerja."),
        ex(
          "여러 번 들어도 잘 모르겠어요.",
          "Udah didengerin berkali-kali, tetep nggak nangkep.",
        ),
        ex(
          "바빠도 밥은 꼭 챙겨 먹어.",
          "Sesibuk apa pun, makan jangan sampai lupa.",
          "반말, chat dari ibu",
        ),
        callout(
          "warning",
          "Jebakan: ",
          b("먹어도"),
          " sendirian artinya ",
          i("“walaupun makan”"),
          ". Tapi ",
          b("먹어도 돼요"),
          " artinya ",
          i("“boleh makan”"),
          ". Bentuknya sama, bedanya cuma 되다 di belakang. Jadi kalau kamu lihat -아도 되다, itu bukan ",
          i("“walaupun”"),
          ", tapi ",
          ref("-아도 되다 (boleh)", "ki-bisa-harus", "ado-doeda"),
          ".",
        ),
        h3("Bandingin sama pola mirip"),
        table([
          ["Pola", "Nuansa", "Contoh"],
          [
            ref("-지만", "ki-alasan-urutan", "jiman"),
            "tapi (netral)",
            "비싸지만 맛있어요",
          ],
          [
            ref("-는데도", "ki-alasan-urutan", "neundedo"),
            "padahal udah … (fakta)",
            "약을 먹었는데도 아파요",
          ],
          [
            "-아도/어도",
            "walaupun (fakta atau andai)",
            "약을 먹어도 안 나아요",
          ],
        ]),
        callout(
          "tip",
          "Kalau maksudmu ",
          i("“padahal udah makan, masih laper”"),
          ", -는데도 lebih pas. Cek cara ngomongnya di ",
          ref("padahal: hasil nggak sesuai harapan", "ik-padahal", "hasil"),
          ".",
        ),
      ],
    },

    // ─────────────────────────────────────────────── -다가
    {
      key: "daga",
      title: "-다가: lagi …, eh terus",
      blocks: [
        grammar({
          number: "05",
          title: "-다가",
          theme: "blue",
          descriptionKo:
            "어떤 일을 하는 도중에 다른 일이 생기거나 바뀔 때 써요.",
          descriptionTranslation:
            "Artinya “lagi … eh, terus …”. Kegiatan pertama kepotong di tengah jalan, lalu ada hal lain yang terjadi atau kamu ganti kegiatan. Bentuknya cuma satu buat semua kata kerja. Di obrolan sering disingkat -다.",
          rules: [
            {
              condition: "Semua kata kerja",
              form: "-다가",
              example: "가다 → 가다가",
            },
            {
              condition: "Akhiran konsonan",
              form: "-다가",
              example: "먹다 → 먹다가",
            },
            {
              condition: "하다",
              form: "-하다가",
              example: "일하다 → 일하다가",
            },
            {
              condition: "Versi singkat",
              form: "-다",
              example: "자다 → 자다 깼어요",
            },
            {
              condition: "Udah selesai, terus …",
              form: "-았/었다가",
              example: "갔다 → 갔다가",
            },
          ],
          examples: [
            {
              before: "학교에 가",
              emphasis: "다가",
              after: " 친구를 만났어요.",
            },
            { before: "일하", emphasis: "다가", after: " 손을 다쳤어요." },
            { before: "드라마를 보", emphasis: "다가", after: " 잠들었어요." },
            {
              before: "편의점에 들렀",
              emphasis: "다가",
              after: " 집에 갔어요.",
            },
          ],
          tipKo: "-다가는 앞뒤 주어가 같아야 해요.",
          tipTranslation:
            "Yang “lagi ngapain” dan yang “eh terus” harus orang yang sama.",
        }),
        p(
          b("Artinya apa sih?"),
          " Ini pola favorit buat cerita. ",
          i("“Lagi nonton drakor, eh ketiduran.”"),
          " ",
          i("“Lagi jalan, eh ketemu mantan.”"),
          " Kata ",
          i("“lagi”"),
          " plus ",
          i("“eh”"),
          " itu jiwanya -다가.",
        ),
        h3("Contoh"),
        ex(
          "학교에 가다가 친구를 만났어요.",
          "Lagi jalan ke kampus, eh ketemu temen.",
        ),
        ex(
          "일하다가 손을 다쳤어요.",
          "Lagi kerja, tanganku luka.",
          "laporan ke 반장님",
        ),
        ex("드라마를 보다가 잠들었어요.", "Lagi nonton drakor, eh ketiduran."),
        ex(
          "공부하다가 배고파서 라면을 끓여 먹었어요.",
          "Lagi belajar, eh laper, jadi masak ramyeon.",
        ),
        ex(
          "쭉 가다가 사거리에서 왼쪽으로 가세요.",
          "Lurus terus, nanti di perempatan belok kiri.",
          "nunjukin jalan",
        ),
        ex(
          "편의점에 들렀다가 집에 갔어요.",
          "Mampir ke minimarket dulu, abis itu pulang.",
        ),
        ...chat(
          [
            {
              who: "반장님",
              ko: "디마스 씨, 손이 왜 그래요?",
              id: "Dimas, tangannya kenapa?",
            },
            {
              who: "Dimas",
              ko: "아까 박스를 옮기다가 다쳤어요.",
              id: "Tadi lagi ngangkat kardus, eh kena luka.",
            },
            {
              who: "반장님",
              ko: "많이 아파요? 일하기 전에 장갑 안 꼈어요?",
              id: "Sakit banget? Sebelum kerja nggak pakai sarung tangan?",
            },
            {
              who: "Dimas",
              ko: "깜빡했어요. 죄송합니다.",
              id: "Lupa, Pak. Maaf.",
            },
            {
              who: "반장님",
              ko: "다음부터는 꼭 끼세요. 지금은 좀 쉬어요.",
              id: "Lain kali wajib dipakai ya. Sekarang istirahat dulu.",
            },
          ],
          {
            theme: "blue",
            questions: [
              {
                ko: "디마스 씨는 뭐 하다가 다쳤어요?",
                id: "Dimas lagi ngapain waktu luka?",
              },
              {
                ko: "디마스 씨는 일하기 전에 뭘 깜빡했어요?",
                id: "Sebelum kerja, Dimas lupa apa?",
              },
            ],
            tip: {
              title: "꿀팁 · Lapor luka",
              ko: "작게 다쳐도 바로 반장님한테 말하세요. ‘-다가 다쳤어요’ 하나면 충분해요.",
              id: "Luka kecil pun langsung lapor ke 반장님. Cukup satu kalimat: “… -다가 다쳤어요”.",
            },
          },
        ),
        callout(
          "warning",
          "Jebakan: subjeknya harus sama. ✗ 엄마가 요리하다가 제가 먹었어요 salah, soalnya yang masak ibu, yang makan aku. Pakai ",
          ref("-는데", "ki-alasan-urutan", "neunde"),
          ": 엄마가 요리하는데 제가 먹었어요. Jebakan kedua: ",
          b("창문을 열다가"),
          " (lagi buka jendela, belum selesai) beda sama ",
          b("창문을 열었다가 닫았어요"),
          " (udah dibuka, terus ditutup lagi).",
        ),
        h3("Bandingin sama pola mirip"),
        bullet(
          ref("-고", "ki-alasan-urutan", "go"),
          ": A selesai, terus B. Nggak ada unsur kepotong atau kejutan.",
        ),
        bullet(
          ref("-(으)면서", "ki-alasan-urutan", "myeonseo"),
          ": A dan B jalan barengan (sambil). -다가: A kepotong, ganti ke B.",
        ),
        callout(
          "tip",
          "“Lagi nonton, eh ketiduran” itu contoh klasik imbuhan ke-an. Cara bilang ",
          i("ketiduran"),
          " yang lain ada di ",
          ref("ketiduran", "ik-nggak-sengaja", "ketiduran"),
          ".",
        ),
        h3("Coba bikin sendiri"),
        p(
          "Bilang: ",
          i("“Lagi naik sepeda, eh jatuh.”"),
          " (naik sepeda = 자전거를 타다, jatuh = 넘어지다)",
        ),
        callout("success", "Jawaban: ", b("자전거를 타다가 넘어졌어요.")),
      ],
    },

    // ─────────────────────────────────────────────── -자마자
    {
      key: "jamaja",
      title: "-자마자: begitu …, langsung",
      blocks: [
        grammar({
          number: "06",
          title: "-자마자",
          theme: "blue",
          descriptionKo: "앞의 일이 끝나고 바로 뒤의 일이 일어날 때 써요.",
          descriptionTranslation:
            "Artinya “begitu …, langsung …”. Jarak antara dua kejadian hampir nol. Bentuknya cuma satu, dan cuma buat kata kerja. Sering ditemenin 바로 (langsung).",
          rules: [
            {
              condition: "Akhiran vokal",
              form: "-자마자",
              example: "끝나다 → 끝나자마자",
            },
            {
              condition: "Akhiran konsonan",
              form: "-자마자",
              example: "받다 → 받자마자",
            },
            {
              condition: "하다",
              form: "-하자마자",
              example: "도착하다 → 도착하자마자",
            },
            {
              condition: "Lampau",
              form: "di kata kerja akhir aja",
              example: "보자마자 울었어요",
            },
            {
              condition: "Kata sifat",
              form: "nggak bisa",
              example: "✗ 바쁘자마자",
            },
          ],
          examples: [
            { before: "집에 도착하", emphasis: "자마자", after: " 잤어요." },
            {
              before: "월급을 받",
              emphasis: "자마자",
              after: " 집에 돈을 보냈어요.",
            },
            { before: "눈 뜨", emphasis: "자마자", after: " 휴대폰부터 봐요." },
            {
              before: "그 노래를 듣",
              emphasis: "자마자",
              after: " 팬이 됐어요.",
            },
          ],
        }),
        p(
          b("Artinya apa sih?"),
          " ",
          i("“Begitu gajian, langsung transfer ke rumah.”"),
          " ",
          i("“Baru melek, langsung liat HP.”"),
          " Kalau di kalimat Indonesiamu ada ",
          i("“begitu”"),
          " atau ",
          i("“baru … langsung”"),
          ", biasanya itu -자마자.",
        ),
        h3("Contoh"),
        ex("집에 도착하자마자 잤어요.", "Begitu nyampe rumah, langsung tidur."),
        ex(
          "월급을 받자마자 집에 돈을 보냈어요.",
          "Begitu gajian, langsung kirim uang ke rumah.",
        ),
        ex(
          "눈 뜨자마자 휴대폰부터 봐요.",
          "Baru melek, yang dicek pertama HP.",
        ),
        ex(
          "수업이 끝나자마자 알바하러 가야 돼요.",
          "Begitu kelas kelar, aku harus langsung cabut kerja part-time.",
        ),
        ex(
          "그 노래를 듣자마자 팬이 됐어요.",
          "Begitu denger lagunya, auto jadi fans.",
        ),
        ex(
          "버스에 타자마자 잠들었어.",
          "Baru naik bus, langsung tidur.",
          "반말",
        ),
        callout(
          "warning",
          "Jebakan: jangan tulis ✗ 도착했자마자. Tanda lampau cuma di kata kerja terakhir: ",
          b("도착하자마자 잤어요"),
          ". Dan -자마자 nggak bisa nempel ke kata sifat: ",
          i("“begitu capek”"),
          " nggak bisa jadi ✗ 피곤하자마자.",
        ),
        h3("Bandingin sama pola mirip"),
        p(
          ref("-(으)ㄴ 후에", "ki-waktu-sebab", "eun-hue"),
          " cuma bilang ",
          i("“sesudah”"),
          ", jedanya bisa lama. -자마자 bilang ",
          i("“detik itu juga”"),
          ". Kalau maksudnya ",
          i("“baru aja”"),
          " (barusan), pakai kata keterangan ",
          ref("방금", "ki-kata-kecil", "bangeum"),
          ".",
        ),
        callout(
          "tip",
          "Kata ",
          i("“baru”"),
          " di bahasa Indonesia punya banyak arti. Bedah lengkapnya di ",
          ref("baru", "ik-waktu", "baru"),
          ".",
        ),
      ],
    },

    // ─────────────────────────────────────────────── -느라고
    {
      key: "neurago",
      title: "-느라고: gara-gara sibuk …, jadi nggak sempat",
      blocks: [
        grammar({
          number: "07",
          title: "-느라고 / -느라",
          theme: "blue",
          descriptionKo:
            "어떤 일을 하느라 다른 일을 못 했거나 힘들었을 때 써요.",
          descriptionTranslation:
            "Artinya “gara-gara lagi sibuk …, jadi nggak sempat …”. Ini pola buat ngeles dengan sopan: kamu lagi ngerjain A, makanya B gagal. Hasilnya hampir selalu negatif: 못, 늦다, 바쁘다, 힘들다.",
          rules: [
            {
              condition: "Akhiran vokal",
              form: "-느라고",
              example: "보다 → 보느라고",
            },
            {
              condition: "Akhiran konsonan",
              form: "-느라고",
              example: "먹다 → 먹느라고",
            },
            {
              condition: "Akhiran ㄹ",
              form: "ㄹ hilang + -느라고",
              example: "놀다 → 노느라고",
            },
            {
              condition: "하다",
              form: "-하느라고",
              example: "일하다 → 일하느라고",
            },
            {
              condition: "Versi singkat",
              form: "-느라",
              example: "일하느라 바빴어요",
            },
            {
              condition: "Lampau",
              form: "di kata kerja akhir aja",
              example: "✗ 일했느라고",
            },
            {
              condition: "Kata sifat",
              form: "nggak bisa",
              example: "✗ 아프느라고",
            },
          ],
          examples: [
            {
              before: "일하",
              emphasis: "느라고",
              after: " 전화를 못 받았어요.",
            },
            {
              before: "드라마 보",
              emphasis: "느라고",
              after: " 밤을 새웠어요.",
            },
            {
              before: "친구랑 노",
              emphasis: "느라고",
              after: " 숙제를 못 했어요.",
            },
            { before: "알바하", emphasis: "느라", after: " 답장을 못 했어." },
          ],
          tipKo: "-느라고 뒤에는 명령이나 청유가 올 수 없어요.",
          tipTranslation:
            "Nggak bisa disambung “ayo …” atau “tolong …”. Ini murni buat jelasin alasan.",
        }),
        p(
          b("Artinya apa sih?"),
          " Inget chat ",
          i("“Sorry baru bales, tadi lagi kerja”"),
          "? Itu -느라고 banget. Kata Indonesianya biasanya ",
          i("“nggak sempet”"),
          ", ",
          i("“gara-gara keasyikan”"),
          ", atau ",
          i("“lagi sibuk …”"),
          ".",
        ),
        h3("Contoh"),
        ex(
          "일하느라고 전화를 못 받았어요. 죄송해요.",
          "Maaf, tadi lagi kerja jadi nggak sempet angkat telepon.",
          "ke 사장님",
        ),
        ex(
          "드라마 보느라고 밤을 새웠어요.",
          "Gara-gara nonton drakor, aku begadang.",
        ),
        ex(
          "시험 공부하느라고 요즘 정신이 없어요.",
          "Lagi sibuk belajar buat ujian, jadi lagi riweh banget.",
        ),
        ex(
          "친구랑 노느라고 숙제를 못 했어요.",
          "Keasyikan main sama temen, PR-nya nggak kelar.",
        ),
        ex(
          "이사하느라고 돈을 많이 썼어요.",
          "Gara-gara pindahan, duitku banyak kepake.",
        ),
        ex(
          "알바하느라 답장을 못 했어. 미안!",
          "Sorry nggak sempet bales, tadi lagi part-time!",
          "반말",
        ),
        ...chat(
          [
            {
              who: "민지",
              ko: "어제 왜 답장 안 했어? 걱정했잖아.",
              id: "Kemarin kok nggak bales? Aku khawatir tau.",
            },
            {
              who: "Rina",
              ko: "미안! 알바하느라 휴대폰 볼 시간이 없었어.",
              id: "Sorry! Lagi part-time, jadi nggak sempet liat HP.",
            },
            {
              who: "민지",
              ko: "요즘 많이 바쁘구나.",
              id: "Lagi sibuk banget ya akhir-akhir ini.",
            },
            {
              who: "Rina",
              ko: "응, 알바하고 시험 공부하느라 정신이 없어.",
              id: "Iya, sibuk part-time sama belajar buat ujian, riweh banget.",
            },
          ],
          {
            theme: "green",
            questions: [
              {
                ko: "리나는 왜 답장을 못 했어요?",
                id: "Kenapa Rina nggak sempet bales?",
              },
              {
                ko: "리나는 요즘 왜 정신이 없어요?",
                id: "Kenapa Rina lagi riweh akhir-akhir ini?",
              },
            ],
            tip: {
              title: "꿀팁 · -느라 + 못",
              ko: "‘-느라’ 뒤에는 ‘못 하다’, ‘시간이 없다’, ‘늦다’가 자주 와요.",
              id: "Abis -느라 biasanya muncul 못 하다, 시간이 없다, atau 늦다: intinya “nggak sempet”.",
            },
          },
        ),
        callout(
          "warning",
          "Jebakan: -느라고 cuma buat kegiatan yang kamu ",
          i("sengaja"),
          " lakuin. Hujan, sakit, macet itu bukan kegiatan, jadi ✗ 비가 오느라고 dan ✗ 아프느라고 salah. Pakai ",
          ref("-아서", "ki-alasan-urutan", "aseo-karena"),
          " atau ",
          ref("-는 바람에", "ki-waktu-sebab", "neun-barame"),
          ". Orangnya juga harus sama: yang kerja dan yang nggak sempet angkat telepon itu kamu.",
        ),
        h3("Bandingin sama pola mirip"),
        table([
          ["Pola", "Kapan", "Contoh"],
          [
            "-느라고",
            "Sibuk ngapain, jadi nggak sempat",
            "일하느라고 못 갔어요",
          ],
          [
            ref("-아서", "ki-alasan-urutan", "aseo-karena"),
            "Alasan umum",
            "아파서 못 갔어요",
          ],
          [
            ref("-는 바람에", "ki-waktu-sebab", "neun-barame"),
            "Kejadian mendadak",
            "차가 고장 나는 바람에 못 갔어요",
          ],
        ]),
        callout(
          "tip",
          "Kata ",
          i("“nggak sempat”"),
          " ada dua rasa: nggak ada waktu, atau minta maaf karena sibuk. Bedahnya di ",
          ref("sempat", "ik-waktu", "sempat"),
          ".",
        ),
        h3("Coba bikin sendiri"),
        p(
          "Bales chat bestie Korea: ",
          i("“Sorry telat, tadi lagi siap-siap.”"),
          " (siap-siap = 준비하다, telat = 늦다)",
        ),
        callout(
          "success",
          "Jawaban: ",
          b("준비하느라 늦었어. 미안!"),
          " Versi sopannya: 준비하느라고 늦었어요. 죄송해요.",
        ),
      ],
    },

    // ─────────────────────────────────────────────── -기 때문에
    {
      key: "gi-ttaemune",
      title: "-기 때문에 / N 때문에: karena, gara-gara",
      blocks: [
        grammar({
          number: "08",
          title: "-기 때문에 / N 때문에",
          theme: "blue",
          descriptionKo: "이유를 분명하게 말할 때 써요.",
          descriptionTranslation:
            "Artinya “karena” versi tegas dan agak resmi. Sering banget muncul di tulisan, berita, presentasi, dan soal EPS-TOPIK. Beda sama -아서, di sini kamu boleh pakai tanda lampau sebelum 기.",
          rules: [
            {
              condition: "Kata kerja/sifat",
              form: "-기 때문에",
              example: "바쁘다 → 바쁘기 때문에",
            },
            {
              condition: "Akhiran konsonan",
              form: "-기 때문에",
              example: "있다 → 있기 때문에",
            },
            {
              condition: "Lampau",
              form: "-았/었기 때문에",
              example: "막혔다 → 막혔기 때문에",
            },
            {
              condition: "Kata benda + 이다",
              form: "-이기 때문에",
              example: "학생 → 학생이기 때문에",
            },
            {
              condition: "Kata benda saja",
              form: "N 때문에",
              example: "비 → 비 때문에",
            },
            {
              condition: "Di akhir kalimat",
              form: "-기 때문이에요",
              example: "늦었기 때문이에요",
            },
          ],
          examples: [
            { before: "길이 막혔", emphasis: "기 때문에", after: " 늦었어요." },
            {
              before: "비 ",
              emphasis: "때문에",
              after: " 오늘 작업이 취소됐어요.",
            },
            {
              before: "저는 무슬림이",
              emphasis: "기 때문에",
              after: " 돼지고기를 안 먹어요.",
            },
            { before: "버스를 놓쳤", emphasis: "기 때문이에요", after: "." },
          ],
          tipKo: "좋은 이유에는 ‘덕분에’를 써요.",
          tipTranslation:
            "N 때문에 = gara-gara. N 덕분에 = berkat. 선배 덕분에 일을 빨리 배웠어요 = berkat senior, aku cepet belajar kerjaannya.",
        }),
        p(
          b("Artinya apa sih?"),
          " Ini ",
          i("“karena”"),
          " yang kamu pakai pas mau kedengeran jelas dan serius. ",
          b("N 때문에"),
          " paling mirip ",
          i("“gara-gara …”"),
          ": 너 때문에 = gara-gara kamu. Sedangkan buat hal baik, orang Korea pakai ",
          b("덕분에"),
          " (berkat).",
        ),
        h3("Contoh"),
        ex("길이 막혔기 때문에 늦었어요.", "Aku telat karena macet."),
        ex(
          "비 때문에 오늘 작업이 취소됐어요.",
          "Gara-gara hujan, kerjaan hari ini dibatalin.",
          "kerja di kebun/proyek",
        ),
        ex(
          "저는 무슬림이기 때문에 돼지고기를 안 먹어요.",
          "Aku muslim, jadi nggak makan babi.",
        ),
        ex(
          "내일 시험이 있기 때문에 오늘은 못 놀아요.",
          "Besok ada ujian, jadi hari ini nggak bisa main.",
        ),
        ex(
          "늦은 이유는 버스를 놓쳤기 때문이에요.",
          "Aku telat soalnya ketinggalan bus.",
        ),
        ex(
          "너 때문에 웃었어.",
          "Aku ketawa gara-gara kamu.",
          "반말, bisa manis bisa nyindir",
        ),
        h3("Di meja 회식"),
        ...chat(
          [
            {
              who: "반장님",
              ko: "고기 다 익었어요. 이것 좀 먹어 봐요.",
              id: "Dagingnya udah mateng. Cobain yang ini.",
            },
            {
              who: "Ani",
              ko: "감사합니다. 그런데 저는 무슬림이기 때문에 돼지고기를 안 먹어요.",
              id: "Makasih, Pak. Tapi aku muslim, jadi nggak makan babi.",
            },
            {
              who: "반장님",
              ko: "아, 그래요? 몰랐어요. 그럼 뭐 시킬까요?",
              id: "Oh, gitu? Aku nggak tahu. Terus mau pesen apa?",
            },
            {
              who: "Ani",
              ko: "생선이나 계란 요리는 괜찮아요. 신경 써 주셔서 감사합니다.",
              id: "Ikan atau masakan telur aman, Pak. Makasih udah perhatian.",
            },
          ],
          {
            theme: "rose",
            questions: [
              {
                ko: "아니 씨는 왜 돼지고기를 안 먹어요?",
                id: "Kenapa Ani nggak makan babi?",
              },
              {
                ko: "아니 씨는 무엇을 먹을 수 있어요?",
                id: "Ani bisa makan apa?",
              },
            ],
          },
        ),
        culture({
          titleKo: "할랄과 기도, 이렇게 말해요",
          titleId: "Halal dan salat: cara ngomongnya",
          theme: "rose",
          paragraphs: [
            {
              ko: "회식이나 식사 자리에서 못 먹는 음식이 있으면 처음에 분명하게 말하는 게 좋아요. ‘저는 무슬림이기 때문에 돼지고기를 안 먹어요’처럼 이유를 짧고 정중하게 말하면 돼요.",
              id: "Kalau ada makanan yang nggak bisa kamu makan di 회식 atau acara makan, mending bilang jelas dari awal. Cukup kasih alasan singkat dan sopan, kayak “저는 무슬림이기 때문에 돼지고기를 안 먹어요”.",
            },
            {
              ko: "한국 사람들은 대부분 잘 몰라서 음식을 권하는 거예요. 거절할 때는 먼저 ‘감사합니다’라고 말하고, 먹을 수 있는 음식을 알려 주면 분위기가 좋아요.",
              id: "Kebanyakan orang Korea nawarin karena emang nggak tahu, bukan niat jahat. Pas nolak, bilang 감사합니다 dulu, terus kasih tahu makanan yang aman buat kamu. Vibes-nya tetep enak.",
            },
            {
              ko: "기도 시간이 필요할 때도 미리 말해요. ‘쉬는 시간에 잠깐 기도해도 될까요?’라고 물어보면 돼요. 그리고 도와준 사람에게는 ‘덕분에’로 고마움을 표현해요.",
              id: "Butuh waktu buat salat? Bilang dari awal juga. Tanya aja “쉬는 시간에 잠깐 기도해도 될까요?”. Buat orang yang udah bantu, bilang makasih pakai 덕분에, bukan 때문에.",
            },
          ],
          checklist: [
            {
              ko: "이유를 짧고 정중하게 말해요.",
              id: "Aku bisa kasih alasan singkat dan sopan.",
            },
            {
              ko: "거절하기 전에 먼저 감사하다고 말해요.",
              id: "Aku bilang makasih dulu sebelum nolak.",
            },
            {
              ko: "도와준 사람에게 ‘덕분에’라고 말해요.",
              id: "Aku pakai 덕분에 buat orang yang udah bantu.",
            },
          ],
        }),
        callout(
          "warning",
          "Jebakan: -기 때문에 nggak bisa disambung ajakan atau perintah. ✗ 비가 오기 때문에 우산을 가져가세요 terdengar janggal. Buat ",
          i("“karena hujan, bawa payung ya”"),
          ", pakai ",
          ref("-(으)니까", "ki-alasan-urutan", "nikka"),
          ": 비가 오니까 우산 가져가세요. Satu lagi: ",
          b("사장님 때문에"),
          " kedengeran nyalahin bos. Mau berterima kasih? ",
          b("사장님 덕분에"),
          ".",
        ),
        h3("Bandingin sama pola mirip"),
        table([
          [
            "Pola",
            "Rasa",
            "Boleh + ajakan/perintah?",
            "Boleh lampau di depan?",
          ],
          [
            ref("-아서/어서", "ki-alasan-urutan", "aseo-karena"),
            "karena (ngobrol)",
            "Nggak",
            "Nggak",
          ],
          [
            ref("-(으)니까", "ki-alasan-urutan", "nikka"),
            "soalnya, kan",
            "Boleh",
            "Boleh",
          ],
          ["-기 때문에", "karena (tegas, resmi)", "Nggak", "Boleh"],
        ]),
        callout(
          "tip",
          "Kapan pakai 때문에, kapan -아서, kapan -는 바람에? Cek dari sisi Indonesia di ",
          ref("gara-gara", "ik-alasan", "gara-gara"),
          " dan ",
          ref("soalnya", "ik-alasan", "soalnya"),
          ".",
        ),
      ],
    },

    // ─────────────────────────────────────────────── -는 바람에
    {
      key: "neun-barame",
      title: "-는 바람에: gara-gara (kejadian mendadak)",
      blocks: [
        grammar({
          number: "09",
          title: "-는 바람에",
          theme: "blue",
          descriptionKo: "갑자기 생긴 일 때문에 안 좋은 결과가 생겼을 때 써요.",
          descriptionTranslation:
            "Artinya “gara-gara (tiba-tiba) …, jadinya …”. Ada kejadian yang nggak kamu duga, lalu hasilnya jelek. Uniknya, bentuknya selalu -는, walaupun kejadiannya udah lewat.",
          rules: [
            {
              condition: "Akhiran vokal",
              form: "-는 바람에",
              example: "자다 → 자는 바람에",
            },
            {
              condition: "Akhiran konsonan",
              form: "-는 바람에",
              example: "놓치다 → 놓치는 바람에",
            },
            {
              condition: "Akhiran ㄹ",
              form: "ㄹ hilang + -는 바람에",
              example: "울다 → 우는 바람에",
            },
            {
              condition: "하다",
              form: "-하는 바람에",
              example: "고장 나다 → 고장 나는 바람에",
            },
            {
              condition: "Lampau",
              form: "tetap -는, lampau di akhir",
              example: "자는 바람에 늦었어요",
            },
            {
              condition: "Kata sifat",
              form: "nggak bisa",
              example: "✗ 바쁜 바람에",
            },
          ],
          examples: [
            {
              before: "늦잠을 자",
              emphasis: "는 바람에",
              after: " 지각했어요.",
            },
            {
              before: "기계가 갑자기 고장 나",
              emphasis: "는 바람에",
              after: " 야근했어요.",
            },
            {
              before: "배터리가 나가",
              emphasis: "는 바람에",
              after: " 연락을 못 했어요.",
            },
            {
              before: "지하철을 잘못 타",
              emphasis: "는 바람에",
              after: " 30분이나 늦었어요.",
            },
          ],
          tipKo: "뒤 문장은 이미 일어난 일이라서 과거형으로 끝나요.",
          tipTranslation:
            "Kalimat belakangnya hampir selalu lampau (-았/었어요), karena kamu lagi cerita hal yang udah kejadian.",
        }),
        p(
          b("Artinya apa sih?"),
          " Pas kamu ngeluh: ",
          i("“Gara-gara HP mati, aku nggak bisa ngabarin.”"),
          " ",
          i("“Gara-gara mesinnya mendadak rusak, jadinya lembur.”"),
          " Ada rasa ",
          i("“duh, sial”"),
          " di situ. Itulah -는 바람에.",
        ),
        h3("Contoh"),
        ex(
          "늦잠을 자는 바람에 지각했어요.",
          "Gara-gara kesiangan, aku telat masuk.",
        ),
        ex(
          "기계가 갑자기 고장 나는 바람에 야근했어요.",
          "Mesinnya mendadak rusak, jadinya lembur.",
          "cerita di pabrik",
        ),
        ex(
          "휴대폰 배터리가 나가는 바람에 연락을 못 했어요.",
          "HP-ku lowbat sampai mati, jadi nggak bisa ngabarin.",
        ),
        ex(
          "지하철을 잘못 타는 바람에 30분이나 늦었어요.",
          "Salah naik subway, jadinya telat sampai 30 menit.",
        ),
        ex(
          "친구가 갑자기 놀러 오는 바람에 공부를 하나도 못 했어.",
          "Temen tiba-tiba main ke kos, jadinya nggak belajar sama sekali.",
          "반말",
        ),
        h3("Telepon pagi ke 반장님"),
        ...chat(
          [
            {
              who: "Rina",
              ko: "반장님, 안녕하세요. 리나예요. 정말 죄송한데 오늘 조금 늦을 것 같아요.",
              id: "Pagi, Pak. Ini Rina. Maaf banget, hari ini kayaknya saya agak telat.",
            },
            {
              who: "반장님",
              ko: "무슨 일 있어요?",
              id: "Ada apa?",
            },
            {
              who: "Rina",
              ko: "버스를 놓치는 바람에 다음 버스를 탔어요. 30분쯤 늦을 것 같아요.",
              id: "Saya ketinggalan bus, jadi naik bus berikutnya. Kira-kira telat 30 menit.",
            },
            {
              who: "반장님",
              ko: "알겠어요. 조심해서 와요.",
              id: "Oke. Hati-hati di jalan.",
            },
            {
              who: "Rina",
              ko: "네, 도착하자마자 바로 일 시작할게요. 죄송합니다.",
              id: "Iya, begitu nyampe saya langsung mulai kerja. Maaf, Pak.",
            },
          ],
          {
            theme: "blue",
            questions: [
              {
                ko: "리나 씨는 왜 늦어요?",
                id: "Kenapa Rina telat?",
              },
              {
                ko: "리나 씨는 얼마나 늦을 것 같아요?",
                id: "Kira-kira Rina telat berapa lama?",
              },
              {
                ko: "리나 씨는 도착하면 뭘 할 거예요?",
                id: "Begitu nyampe, Rina mau ngapain?",
              },
            ],
          },
        ),
        culture({
          titleKo: "늦을 때는 미리 연락해요",
          titleId: "Mau telat? Kabarin duluan",
          theme: "ocean",
          paragraphs: [
            {
              ko: "한국 회사에서는 늦을 것 같으면 출근 시간 전에 꼭 연락해요. 말없이 늦게 오면 책임감이 없다고 생각할 수 있어요.",
              id: "Di tempat kerja Korea, kalau kayaknya bakal telat, wajib kabarin sebelum jam masuk. Dateng telat tanpa kabar bisa bikin kamu dianggap nggak bertanggung jawab. Red flag banget.",
            },
            {
              ko: "연락할 때는 먼저 사과하고, 이유는 짧게 말해요. ‘-는 바람에’나 ‘-아서’ 한 문장이면 충분해요. 그리고 몇 시쯤 도착할지 알려 줘요.",
              id: "Pas ngabarin, minta maaf dulu, alasannya singkat aja. Satu kalimat -는 바람에 atau -아서 udah cukup, nggak usah cerita panjang. Terus kasih tahu kira-kira jam berapa nyampe.",
            },
            {
              ko: "도착하면 다시 한번 ‘늦어서 죄송합니다’라고 인사해요. 그리고 같은 일이 자주 생기지 않게 조심해요.",
              id: "Begitu nyampe, bilang lagi “늦어서 죄송합니다”. Dan yang paling penting, jangan sampai kejadian berulang.",
            },
          ],
          checklist: [
            {
              ko: "출근 시간 전에 연락해요.",
              id: "Aku ngabarin sebelum jam masuk.",
            },
            {
              ko: "먼저 사과하고 이유는 짧게 말해요.",
              id: "Aku minta maaf dulu, alasannya singkat.",
            },
            {
              ko: "도착 시간을 알려 줘요.",
              id: "Aku kasih tahu perkiraan jam nyampe.",
            },
          ],
        }),
        callout(
          "warning",
          "Jebakan: orang Indonesia sering nulis ✗ 잤는 바람에 atau ✗ 잔 바람에 karena kejadiannya udah lewat. Yang benar tetap ",
          b("자는 바람에"),
          ". Dan jangan dipakai buat rencana atau ajakan: ✗ 비가 오는 바람에 집에 있자 salah.",
        ),
        h3("Bandingin sama pola mirip"),
        bullet(
          ref("-느라고", "ki-waktu-sebab", "neurago"),
          ": kamu sendiri lagi sibuk ngapain (sengaja). -는 바람에: ada kejadian mendadak (nggak sengaja).",
        ),
        bullet(
          ref("-기 때문에", "ki-waktu-sebab", "gi-ttaemune"),
          ": alasan netral dan resmi, hasilnya bisa baik atau buruk.",
        ),
        bullet(
          ref("-아서/어서", "ki-alasan-urutan", "aseo-karena"),
          ": alasan sehari-hari yang paling umum. Kalau bingung, -아서 hampir selalu aman.",
        ),
        callout(
          "tip",
          "Praktik milih antara -아서, 때문에, dan -는 바람에 dari kata ",
          i("“gara-gara”"),
          " ada di ",
          ref("gara-gara", "ik-alasan", "gara-gara"),
          ".",
        ),
        h3("Coba bikin sendiri"),
        p(
          "Bilang ke 반장님: ",
          i("“Busnya tiba-tiba nggak dateng, jadi saya telat.”"),
          " (nggak dateng = 안 오다)",
        ),
        callout(
          "success",
          "Jawaban: ",
          b("버스가 갑자기 안 오는 바람에 늦었어요. 죄송합니다."),
        ),
      ],
    },

    // ─────────────────────────────────────────────── -는 김에
    {
      key: "neun-gime",
      title: "-는 김에: sekalian, mumpung",
      blocks: [
        grammar({
          number: "10",
          title: "-는 김에 / -(으)ㄴ 김에",
          theme: "blue",
          descriptionKo: "어떤 일을 하는 기회에 다른 일도 같이 할 때 써요.",
          descriptionTranslation:
            "Artinya “sekalian” atau “mumpung lagi …”. Kamu udah (atau lagi) ngelakuin A, jadi sekalian aja B. Pakai -는 kalau A lagi/mau dilakuin, -(으)ㄴ kalau A udah terjadi.",
          rules: [
            {
              condition: "Lagi/mau dilakuin",
              form: "-는 김에",
              example: "가다 → 가는 김에",
            },
            {
              condition: "Akhiran konsonan",
              form: "-는 김에",
              example: "씻다 → 씻는 김에",
            },
            {
              condition: "Akhiran ㄹ",
              form: "ㄹ hilang + -는 김에",
              example: "만들다 → 만드는 김에",
            },
            {
              condition: "Udah terjadi (vokal)",
              form: "-ㄴ 김에",
              example: "오다 → 온 김에",
            },
            {
              condition: "Udah terjadi (konsonan)",
              form: "-은 김에",
              example: "먹다 → 먹은 김에",
            },
            {
              condition: "Ungkapan tetap",
              form: "말이 나온 김에",
              example: "mumpung lagi dibahas",
            },
          ],
          examples: [
            {
              before: "나가",
              emphasis: "는 김에",
              after: " 쓰레기 좀 버려 줄래요?",
            },
            {
              before: "편의점 가",
              emphasis: "는 김에",
              after: " 물 좀 사다 줘.",
            },
            {
              before: "서울에 온",
              emphasis: " 김에",
              after: " 친구도 만났어요.",
            },
            {
              before: "말이 나온",
              emphasis: " 김에",
              after: " 하나 물어볼게요.",
            },
          ],
        }),
        p(
          b("Artinya apa sih?"),
          " Kata ",
          i("“sekalian”"),
          " yang paling sering kamu pakai buat nitip: ",
          i("“Sekalian ke minimarket, beliin air ya.”"),
          " Atau ",
          i("“Mumpung udah di Seoul, sekalian ketemu temen.”"),
        ),
        h3("Contoh"),
        ex(
          "나가는 김에 쓰레기 좀 버려 줄래요?",
          "Sekalian keluar, buangin sampah dong.",
        ),
        ex(
          "편의점 가는 김에 물 좀 사다 줘.",
          "Sekalian ke minimarket, beliin air ya.",
          "반말, ke roommate",
        ),
        ex(
          "서울에 온 김에 친구도 만났어요.",
          "Mumpung udah di Seoul, sekalian ketemu temen.",
        ),
        ex(
          "말이 나온 김에 하나 물어볼게요.",
          "Mumpung lagi bahas ini, aku mau nanya satu hal deh.",
        ),
        ex(
          "청소하는 김에 냉장고도 정리했어요.",
          "Sekalian bersih-bersih, kulkas juga aku rapiin.",
        ),
        ex(
          "머리 자르는 김에 염색도 했어요.",
          "Sekalian potong rambut, sekalian cat juga.",
        ),
        ...chat(
          [
            {
              who: "Rina",
              ko: "나 편의점 갔다 올게.",
              id: "Aku ke minimarket bentar ya.",
            },
            {
              who: "Siti",
              ko: "오, 가는 김에 물 좀 사다 줄래?",
              id: "Eh, sekalian beliin air dong?",
            },
            {
              who: "Rina",
              ko: "알았어. 또 필요한 거 있어?",
              id: "Oke. Ada lagi yang mau dititip?",
            },
            {
              who: "Siti",
              ko: "음… 그럼 컵라면도 하나만. 할랄 마크 있는 걸로!",
              id: "Hmm… ya udah, cup ramyeon satu aja. Yang ada logo halalnya!",
            },
            {
              who: "Rina",
              ko: "오케이. 나가는 김에 택배도 찾아올게.",
              id: "Oke. Sekalian keluar, aku ambil paket juga deh.",
            },
          ],
          {
            theme: "green",
            questions: [
              {
                ko: "시티는 리나한테 뭘 사다 달라고 했어요?",
                id: "Siti nitip beliin apa ke Rina?",
              },
              {
                ko: "리나는 나가는 김에 또 뭘 할 거예요?",
                id: "Sekalian keluar, Rina mau ngapain lagi?",
              },
            ],
            tip: {
              title: "꿀팁 · 사다 주다",
              ko: "‘사다 주다’는 ‘사서 갖다주다’라는 뜻이에요. ‘-는 김에’와 같이 자주 써요.",
              id: "사다 주다 = beliin terus bawain. Pasangan favoritnya -는 김에 buat nitip.",
            },
          },
        ),
        callout(
          "warning",
          "Jebakan: kata ",
          i("“sekalian”"),
          " di bahasa Indonesia punya arti lain. ",
          i("“Bayar sekalian semuanya”"),
          " (sekaligus) itu bukan 김에, tapi ",
          b("한꺼번에"),
          ": 한꺼번에 계산해 주세요. Begitu juga ",
          i("“mumpung masih muda”"),
          " (kesempatan yang lagi ada). Itu nggak pakai 김에, tapi ",
          ref("-(으)ㄹ 때", "ki-waktu-sebab", "eul-ttae"),
          ": 젊을 때 많이 여행해야지.",
        ),
        callout(
          "tip",
          "Bedah ",
          i("sekalian"),
          " dan ",
          i("mumpung"),
          " dari sisi Indonesia ada di ",
          ref("sekalian", "ik-alasan", "sekalian"),
          " dan ",
          ref("mumpung", "ik-alasan", "mumpung"),
          ".",
        ),
      ],
    },

    // ─────────────────────────────────────────────── -기는커녕
    {
      key: "gineunkeonyeong",
      title: "-기는커녕: boro-boro, bukannya … malah",
      blocks: [
        grammar({
          number: "11",
          title: "-기는커녕 / N은/는커녕",
          theme: "blue",
          descriptionKo:
            "기대한 일은 물론이고 더 쉬운 일도 안 될 때, 또는 반대 결과가 나올 때 써요.",
          descriptionTranslation:
            "Artinya “boro-boro …” atau “bukannya … malah …”. Yang diharapkan nggak kejadian, bahkan hal yang lebih gampang pun nggak, atau yang terjadi malah kebalikannya. Rasanya kesel atau nyindir.",
          rules: [
            {
              condition: "Kata kerja/sifat",
              form: "-기는커녕",
              example: "쉬다 → 쉬기는커녕",
            },
            {
              condition: "하다",
              form: "-하기는커녕",
              example: "사과하다 → 사과하기는커녕",
            },
            {
              condition: "Kata benda (vokal)",
              form: "N는커녕",
              example: "커피 → 커피는커녕",
            },
            {
              condition: "Kata benda (konsonan)",
              form: "N은커녕",
              example: "밥 → 밥은커녕",
            },
            {
              condition: "Pasangan umum",
              form: "… 도/조차 못 · 오히려 · -만",
              example: "밥은커녕 물도 못 마셨어요",
            },
          ],
          examples: [
            {
              before: "사과하",
              emphasis: "기는커녕",
              after: " 오히려 화를 냈어요.",
            },
            {
              before: "주말에 쉬",
              emphasis: "기는커녕",
              after: " 더 바빴어요.",
            },
            { before: "밥", emphasis: "은커녕", after: " 물도 못 마셨어요." },
            {
              before: "한국어",
              emphasis: "는커녕",
              after: " 한글도 아직 못 읽어요.",
            },
          ],
          tipKo: "뒤에는 보통 ‘도’, ‘조차’, ‘오히려’, ‘-만’이 같이 와요.",
          tipTranslation:
            "Pola ini jarang jalan sendirian. Biasanya ditemenin 도/조차 (… aja nggak), 오히려 (malah), atau -만 (cuma … doang).",
        }),
        p(
          b("Artinya apa sih?"),
          " Dua rasa: ",
          i("“Boro-boro makan, minum aja nggak sempet”"),
          " (yang lebih gampang pun gagal), dan ",
          i("“Bukannya minta maaf, malah marah”"),
          " (hasilnya kebalikan). Dua-duanya ada nada ",
          i("“ya ampun”"),
          ".",
        ),
        h3("Contoh"),
        ex(
          "사과하기는커녕 오히려 화를 냈어요.",
          "Bukannya minta maaf, dia malah marah.",
        ),
        ex(
          "주말에 쉬기는커녕 더 바빴어요.",
          "Boro-boro istirahat, weekend malah makin sibuk.",
        ),
        ex(
          "밥은커녕 물도 못 마셨어요.",
          "Boro-boro makan, minum air aja nggak sempet.",
          "shift sibuk di pabrik",
        ),
        ex(
          "돈을 모으기는커녕 빚만 늘었어요.",
          "Bukannya nabung, malah utang yang nambah.",
        ),
        ex(
          "한국어는커녕 한글도 아직 못 읽어요.",
          "Jangankan bahasa Korea, Hangeul aja belum bisa baca.",
        ),
        ex(
          "칭찬은커녕 잔소리만 들었어.",
          "Boro-boro dipuji, yang ada malah diomelin.",
          "반말",
        ),
        callout(
          "warning",
          "Jebakan: ",
          i("“bukannya … tapi …”"),
          " yang netral itu bukan 커녕. ",
          i("“Aku minumnya bukan kopi, tapi teh”"),
          " → ",
          b("커피 말고 차를 마셨어요"),
          ". Kalau kamu pakai ✗ 커피는커녕 차를 마셨어요, kesannya aneh, kayak teh itu hal yang lebih buruk.",
        ),
        h3("Bandingin sama pola mirip"),
        bullet(
          ref("오히려", "ki-kata-kecil", "ohiryeo"),
          ": kata keterangan ",
          i("“malah”"),
          ". Sering dipasang bareng -기는커녕.",
        ),
        bullet(
          ref("심지어 / -조차", "ki-kata-kecil", "simjieo"),
          ": ",
          i("“bahkan”"),
          ". Muncul di bagian belakang: 물조차 못 마셨어요.",
        ),
        callout(
          "tip",
          "Latihan ngomong ",
          i("“malah”"),
          " dan ",
          i("“bahkan”"),
          " ada di ",
          ref("malah", "ik-alasan", "malah"),
          " dan ",
          ref("bahkan", "ik-alasan", "bahkan"),
          ".",
        ),
        h3("Coba bikin sendiri"),
        p(
          "Bilang: ",
          i("“Boro-boro pacar, temen aja nggak punya.”"),
          " (pacar = 애인, punya = 있다)",
        ),
        callout(
          "success",
          "Jawaban: ",
          b("애인은커녕 친구도 없어요."),
          " Versi 반말: 애인은커녕 친구도 없어. Literally curhat jomblo.",
        ),
      ],
    },

    // ─────────────────────────────────────────────── -(으)ㄹ수록
    {
      key: "eulsurok",
      title: "-(으)면 -(으)ㄹ수록: makin … makin",
      blocks: [
        grammar({
          number: "12",
          title: "-(으)면 -(으)ㄹ수록",
          theme: "blue",
          descriptionKo: "앞의 정도가 커지면 뒤의 정도도 같이 커질 때 써요.",
          descriptionTranslation:
            "Artinya “makin … makin …”. Bagian -(으)면 di depan boleh dibuang: 들을수록 좋아요 juga udah bener. Nempel ke kata kerja dan kata sifat.",
          rules: [
            {
              condition: "Akhiran vokal",
              form: "-면 -ㄹ수록",
              example: "보다 → 보면 볼수록",
            },
            {
              condition: "Akhiran konsonan",
              form: "-으면 -을수록",
              example: "먹다 → 먹으면 먹을수록",
            },
            {
              condition: "Akhiran ㄹ",
              form: "-면 -수록",
              example: "알다 → 알면 알수록",
            },
            {
              condition: "하다",
              form: "-하면 -할수록",
              example: "공부하다 → 공부하면 할수록",
            },
            {
              condition: "Kata sifat",
              form: "-(으)ㄹ수록",
              example: "빠르다 → 빠를수록",
            },
            {
              condition: "ㅂ tak beraturan",
              form: "-울수록",
              example: "어렵다 → 어려울수록",
            },
            {
              condition: "ㄷ tak beraturan",
              form: "-을수록",
              example: "듣다 → 들을수록",
            },
            {
              condition: "Ungkapan tetap",
              form: "갈수록",
              example: "= makin lama makin",
            },
          ],
          examples: [
            { before: "들으면 들", emphasis: "을수록", after: " 좋아요." },
            {
              before: "한국어는 공부하면 ",
              emphasis: "할수록",
              after: " 재미있어요.",
            },
            { before: "빠를", emphasis: "수록", after: " 좋아요." },
            { before: "날씨가 ", emphasis: "갈수록", after: " 추워지네요." },
          ],
          tipKo: "‘-(으)ㄹ수록’은 붙여 써요.",
          tipTranslation:
            "Tulis nempel: 갈수록, bukan 갈 수록. Jangan ketuker sama -(으)ㄹ 수 있다 (갈 수 있다) yang dipisah.",
        }),
        p(
          b("Artinya apa sih?"),
          " Persis kayak ",
          i("“makin didengerin makin enak”"),
          " atau ",
          i("“makin cepet makin bagus”"),
          ". Kata kerjanya diulang dua kali, sama kayak kita ngulang ",
          i("“makin”"),
          ".",
        ),
        h3("Contoh"),
        ex(
          "들으면 들을수록 좋아요.",
          "Makin didengerin, makin enak.",
          "lagu K-pop baru",
        ),
        ex(
          "한국어는 공부하면 할수록 재미있어요.",
          "Bahasa Korea tuh makin dipelajari makin seru.",
        ),
        ex(
          "일에 익숙해질수록 속도도 빨라져요.",
          "Makin terbiasa sama kerjaannya, makin cepet juga.",
        ),
        ex(
          "빠를수록 좋아요.",
          "Makin cepet makin bagus.",
          "kalimat favorit 사장님",
        ),
        ex("날씨가 갈수록 추워지네요.", "Cuacanya makin lama makin dingin ya."),
        ex(
          "그 사람은 알면 알수록 멋있어.",
          "Orang itu makin dikenal makin keren.",
          "반말",
        ),
        callout(
          "warning",
          "Jebakan: kata ",
          i("“makin”"),
          " yang berdiri sendiri (",
          i("“makin dingin”"),
          ", ",
          i("“makin gemuk”"),
          ") itu bukan -(으)ㄹ수록, tapi ",
          ref("-아/어지다", "ki-keadaan", "ajida"),
          ": 추워졌어요, 살쪘어요. -(으)ㄹ수록 cuma dipakai kalau ada dua hal yang naik bareng.",
        ),
        callout(
          "tip",
          "Praktik bilang ",
          i("“makin … makin”"),
          " dari sisi Indonesia ada di ",
          ref("makin", "ik-dugaan", "makin"),
          ".",
        ),
      ],
    },

    // ─────────────────────────────────────────────── -기만 하면
    {
      key: "giman-hamyeon",
      title: "-기만 하면: asal, yang penting, tiap kali",
      blocks: [
        grammar({
          number: "13",
          title: "-기만 하면",
          theme: "blue",
          descriptionKo:
            "그 일 하나만 하면 된다고 말하거나, 그 일을 할 때마다 같은 결과가 생길 때 써요.",
          descriptionTranslation:
            "Punya dua arti. (1) Ditambah 돼요: “asal …, udah cukup” atau “tinggal … aja”. (2) Ditambah hasil lain: “tiap kali …, pasti …”. Bentuknya cuma satu buat semua kata kerja dan kata sifat.",
          rules: [
            {
              condition: "Kata kerja",
              form: "-기만 하면",
              example: "오다 → 오기만 하면",
            },
            {
              condition: "Akhiran konsonan",
              form: "-기만 하면",
              example: "먹다 → 먹기만 하면",
            },
            {
              condition: "Kata sifat",
              form: "-기만 하면",
              example: "건강하다 → 건강하기만 하면",
            },
            {
              condition: "Arti “asal”",
              form: "-기만 하면 돼요",
              example: "하기만 하면 돼요",
            },
            {
              condition: "Arti “tiap kali”",
              form: "-기만 하면 + hasil",
              example: "보기만 하면 울어요",
            },
            {
              condition: "Kata benda",
              form: "N만 있으면 / N만 -(으)면",
              example: "돈만 있으면",
            },
          ],
          examples: [
            { before: "열심히 하", emphasis: "기만 하면", after: " 돼요." },
            { before: "건강하", emphasis: "기만 하면", after: " 돼." },
            { before: "서류에 사인하", emphasis: "기만 하면", after: " 돼요." },
            {
              before: "동생은 드라마를 보",
              emphasis: "기만 하면",
              after: " 울어요.",
            },
          ],
        }),
        p(
          b("Artinya apa sih?"),
          " Arti pertama: ",
          i("“Yang penting sehat”"),
          ", ",
          i("“Tinggal tanda tangan aja”"),
          ". Arti kedua: ",
          i("“Adikku tiap nonton drakor pasti nangis.”"),
          " Bedainnya gampang: kalau ujungnya 돼요/괜찮아요, artinya ",
          i("asal"),
          ". Kalau ujungnya kejadian lain, artinya ",
          i("tiap kali"),
          ".",
        ),
        h3("Contoh"),
        ex(
          "열심히 하기만 하면 돼요.",
          "Yang penting kamu rajin, itu udah cukup.",
        ),
        ex(
          "건강하기만 하면 돼.",
          "Yang penting sehat.",
          "반말, ibu di telepon",
        ),
        ex(
          "서류에 사인하기만 하면 돼요.",
          "Tinggal tanda tangan dokumennya aja.",
        ),
        ex("시간 맞춰 오기만 하면 괜찮아요.", "Asal dateng tepat waktu, aman."),
        ex(
          "우리 동생은 드라마를 보기만 하면 울어요.",
          "Adikku tiap nonton drakor pasti nangis.",
        ),
        ex(
          "반장님은 저를 보기만 하면 일을 시키세요.",
          "반장님 tiap liat aku pasti langsung nyuruh kerja.",
        ),
        callout(
          "warning",
          "Jebakan: kata ",
          i("“asal”"),
          " di bahasa Indonesia juga berarti ",
          i("“asal-asalan”"),
          " (sembarangan). Itu bukan -기만 하면, tapi ",
          b("대충"),
          ": 대충 하지 마세요 = jangan asal-asalan. Dan ",
          i("“asal dari mana?”"),
          " itu ",
          b("어디 출신이에요?"),
          ".",
        ),
        h3("Bandingin sama pola mirip"),
        p(
          ref("-(으)면", "ki-alasan-urutan", "myeon"),
          " cuma ",
          i("“kalau”"),
          ". -기만 하면 nambahin ",
          i("“cuma itu doang yang dibutuhin”"),
          ". Bandingin: 오면 돼요 (kalau dateng, oke) dan 오기만 하면 돼요 (asal dateng aja, beres).",
        ),
        callout(
          "tip",
          "Praktik bilang ",
          i("“asal”"),
          " dan ",
          i("“yang penting”"),
          " ada di ",
          ref("asal", "ik-alasan", "asal"),
          ".",
        ),
        h3("Coba bikin sendiri"),
        p(
          "Bilang: ",
          i("“Asal ada nasi, aku bisa makan apa aja.”"),
          " (nasi = 밥, apa aja = 뭐든지)",
        ),
        callout(
          "success",
          "Jawaban: ",
          b("밥만 있으면 뭐든지 먹을 수 있어요."),
          " Karena “nasi” kata benda, pakai N만 있으면.",
        ),
      ],
    },
  ],
  outro: [
    h3("Rangkuman kilat"),
    table([
      ["Pola", "Rasa Indonesia", "Contoh"],
      [ref("-기 전에", "ki-waktu-sebab", "gi-jeone"), "sebelum", "자기 전에"],
      [
        ref("-(으)ㄴ 후에", "ki-waktu-sebab", "eun-hue"),
        "sesudah, abis",
        "먹은 후에",
      ],
      [
        ref("-(으)ㄹ 때", "ki-waktu-sebab", "eul-ttae"),
        "pas, waktu",
        "갈 때 / 갔을 때",
      ],
      [ref("-아도/어도", "ki-waktu-sebab", "ado"), "walaupun", "비싸도"],
      [ref("-다가", "ki-waktu-sebab", "daga"), "lagi … eh", "보다가 잤어요"],
      [
        ref("-자마자", "ki-waktu-sebab", "jamaja"),
        "begitu … langsung",
        "받자마자",
      ],
      [
        ref("-느라고", "ki-waktu-sebab", "neurago"),
        "sibuk …, jadi nggak sempat",
        "일하느라고",
      ],
      [
        ref("-기 때문에", "ki-waktu-sebab", "gi-ttaemune"),
        "karena (resmi)",
        "막혔기 때문에",
      ],
      [
        ref("-는 바람에", "ki-waktu-sebab", "neun-barame"),
        "gara-gara (mendadak)",
        "자는 바람에",
      ],
      [ref("-는 김에", "ki-waktu-sebab", "neun-gime"), "sekalian", "가는 김에"],
      [
        ref("-기는커녕", "ki-waktu-sebab", "gineunkeonyeong"),
        "boro-boro, bukannya … malah",
        "쉬기는커녕",
      ],
      [
        ref("-(으)ㄹ수록", "ki-waktu-sebab", "eulsurok"),
        "makin … makin",
        "볼수록",
      ],
      [
        ref("-기만 하면", "ki-waktu-sebab", "giman-hamyeon"),
        "asal, tiap kali",
        "하기만 하면 돼요",
      ],
    ]),
    h3("Mini latihan: sambungin ceritanya"),
    p("Isi titik-titiknya dengan pola yang paling pas."),
    bullet(
      "1. 일 …… 전화를 못 받았어요. (lagi sibuk kerja, jadi nggak sempat)",
    ),
    bullet("2. 집에 도착 …… 잤어요. (begitu nyampe, langsung)"),
    bullet("3. 늦잠을 자 …… 지각했어요. (gara-gara, mendadak)"),
    bullet("4. 편의점 가 …… 우유 좀 사다 줘. (sekalian)"),
    bullet("5. 한국어는 공부하면 …… 재미있어요. (makin … makin)"),
    callout(
      "success",
      "Jawaban: 1. 일하느라고 · 2. 도착하자마자 · 3. 자는 바람에 · 4. 가는 김에 · 5. 할수록. Kalau 4 dari 5 bener, kamu udah siap cerita panjang tanpa patah-patah.",
    ),
    ...chat(
      [
        {
          who: "민지",
          ko: "어제 왜 연락 안 했어?",
          id: "Kemarin kok nggak ngabarin?",
        },
        {
          who: "Rina",
          ko: "미안! 일하다가 휴대폰이 꺼지는 바람에 연락을 못 했어.",
          id: "Sorry! Lagi kerja, eh HP-ku mati, jadi nggak bisa ngabarin.",
        },
        {
          who: "민지",
          ko: "그럼 퇴근한 후에는?",
          id: "Terus abis pulang kerja?",
        },
        {
          who: "Rina",
          ko: "집에 오자마자 잤어. 너무 피곤했거든.",
          id: "Begitu nyampe rumah langsung tidur. Capek banget soalnya.",
        },
      ],
      {
        questions: [
          {
            ko: "리나는 왜 어제 연락을 못 했어요?",
            id: "Kenapa kemarin Rina nggak bisa ngabarin?",
          },
          {
            ko: "리나는 집에 와서 바로 뭐 했어요?",
            id: "Begitu nyampe rumah, Rina langsung ngapain?",
          },
        ],
        tip: {
          title: "꿀팁 · Cerita nyambung",
          ko: "-다가, -는 바람에, -자마자를 섞으면 이야기가 훨씬 자연스러워요.",
          id: "Campur -다가, -는 바람에, dan -자마자 dalam satu cerita, auto kedengeran kayak orang Korea.",
        },
      },
    ),
    p(
      "Udah ngerasa siap? Tes dirimu di kuis ini. Santuy, salah juga ada penjelasannya kok.",
    ),
    quizRef(),
  ],
  quiz: {
    title: "Kuis: waktu, sebab, dan makin-makin",
    description:
      "Pilih pola yang paling pas buat tiap situasi: sebelum, pas, lagi … eh, begitu … langsung, gara-gara, sekalian, boro-boro, sampai asal. Lulus kalau dapet 70.",
    passingScore: 70,
    questions: [
      {
        key: "gi-jeone-1",
        prompt:
          "Mana yang benar buat “Sebelum dateng ke Korea, aku belajar bahasa Korea di LPK”?",
        options: [
          {
            text: "한국에 오기 전에 LPK에서 한국어를 배웠어요.",
            correct: true,
          },
          { text: "한국에 왔기 전에 LPK에서 한국어를 배웠어요." },
          { text: "한국에 온 전에 LPK에서 한국어를 배웠어요." },
          { text: "한국에 오기 후에 LPK에서 한국어를 배웠어요." },
        ],
        explanation:
          "Kata kerja sebelum -기 전에 selalu polos: 오기 전에. Tanda lampaunya cukup di akhir (배웠어요). 왔기 전에 itu jebakan klasik orang Indonesia.",
      },
      {
        key: "eul-ttae-1",
        prompt:
          "“Waktu pertama (udah) nyampe di Korea, dingin banget.” Pilih yang paling pas.",
        options: [
          { text: "한국에 처음 갈 때 너무 추웠어요." },
          { text: "한국에 처음 왔을 때 너무 추웠어요.", correct: true },
          { text: "한국에 처음 오면 너무 추웠어요." },
          { text: "한국에 처음 온 김에 너무 추웠어요." },
        ],
        explanation:
          "Kamu udah nyampe di Korea, jadi pakai -았/었을 때: 왔을 때. 갈 때 artinya pas lagi berangkat, masih di jalan.",
      },
      {
        key: "ado-vs-ado-doeda-1",
        prompt: "Temen Korea nanya: “이거 먹어도 돼요?” Maksudnya apa?",
        options: [
          { text: "Walaupun makan ini, oke?" },
          { text: "Boleh aku makan ini?", correct: true },
          { text: "Aku harus makan ini?" },
          { text: "Sekalian makan ini, ya?" },
        ],
        explanation:
          "-아도/어도 + 되다 = boleh. Bentuk 먹어도 sendirian memang “walaupun makan”, tapi begitu ada 돼요 di belakang, artinya jadi minta izin.",
      },
      {
        key: "daga-1",
        prompt:
          "“Lagi nonton drakor, eh ketiduran.” Pilih yang paling natural.",
        options: [
          { text: "드라마를 보다가 잠들었어요.", correct: true },
          { text: "드라마를 보자마자 잠들었어요." },
          { text: "드라마를 보기 전에 잠들었어요." },
          { text: "드라마를 보는 김에 잠들었어요." },
        ],
        explanation:
          "“Lagi … eh …” itu jiwanya -다가: kegiatan pertama kepotong sama hal lain. 보자마자 artinya baru mulai nonton langsung tidur, beda cerita.",
      },
      {
        key: "jamaja-1",
        prompt:
          "“Begitu gajian, langsung kirim uang ke rumah.” Mana yang benar?",
        options: [
          { text: "월급을 받았자마자 집에 돈을 보냈어요." },
          { text: "월급을 받자마자 집에 돈을 보냈어요.", correct: true },
          { text: "월급을 받다가 집에 돈을 보냈어요." },
          { text: "월급을 받기 전에 집에 돈을 보냈어요." },
        ],
        explanation:
          "Begitu … langsung = -자마자, dan kata kerjanya polos: 받자마자. Tanda lampau cuma di akhir (보냈어요). 받았자마자 itu salah.",
      },
      {
        key: "neurago-1",
        prompt: "Kalimat mana yang SALAH?",
        options: [
          { text: "일하느라고 전화를 못 받았어요." },
          { text: "드라마 보느라고 밤을 새웠어요." },
          { text: "비가 오느라고 못 갔어요.", correct: true },
          { text: "비가 와서 못 갔어요." },
        ],
        explanation:
          "-느라고 cuma buat kegiatan yang kamu sengaja lakuin. Hujan bukan kegiatanmu, jadi 비가 오느라고 salah. Pakai 비가 와서 atau 비가 오는 바람에.",
      },
      {
        key: "ttaemune-vs-nikka-1",
        prompt: "“Karena hujan, bawa payung ya.” Pilih yang paling natural.",
        options: [
          { text: "비가 오기 때문에 우산 가져가세요." },
          { text: "비가 오니까 우산 가져가세요.", correct: true },
          { text: "비가 와서 우산 가져가세요." },
          { text: "비가 오는 바람에 우산 가져가세요." },
        ],
        explanation:
          "Ada suruhan (가져가세요) di belakang, jadi pakai -(으)니까. -아서, -기 때문에, dan -는 바람에 nggak cocok disambung perintah atau ajakan.",
      },
      {
        key: "barame-1",
        prompt: "“Gara-gara kesiangan, aku telat masuk.” Mana yang benar?",
        options: [
          { text: "늦잠을 잤는 바람에 지각했어요." },
          { text: "늦잠을 잔 바람에 지각했어요." },
          { text: "늦잠을 자는 바람에 지각했어요.", correct: true },
          { text: "늦잠을 자기 전에 지각했어요." },
        ],
        explanation:
          "-는 바람에 bentuknya selalu -는, walaupun kejadiannya udah lewat: 자는 바람에. Lampaunya cukup di akhir (지각했어요).",
      },
      {
        key: "gime-1",
        prompt:
          "Roommate mau ke minimarket. Kamu mau nitip air: “Sekalian ke minimarket, beliin air ya.”",
        options: [
          { text: "편의점 가는 김에 물 좀 사다 줘.", correct: true },
          { text: "편의점 가기는커녕 물 좀 사다 줘." },
          { text: "편의점 갈수록 물 좀 사다 줘." },
          { text: "편의점 가느라고 물 좀 사다 줘." },
        ],
        explanation:
          "“Sekalian” buat nitip itu -는 김에. Temennya lagi mau pergi, jadi pakai 가는 김에. Plus 사다 주다 = beliin terus bawain.",
      },
      {
        key: "keonyeong-1",
        prompt:
          "“Boro-boro makan, minum air aja nggak sempet.” Pilih yang paling pas.",
        options: [
          { text: "밥 말고 물을 마셨어요." },
          { text: "밥은커녕 물도 못 마셨어요.", correct: true },
          { text: "밥 때문에 물도 못 마셨어요." },
          { text: "밥만 있으면 물도 못 마셨어요." },
        ],
        explanation:
          "Boro-boro = N은/는커녕, biasanya ditemenin 도 + 못 di belakang. 밥 말고 물을 마셨어요 artinya “bukan nasi, tapi air”, netral dan nggak ada rasa “ya ampun”-nya.",
      },
      {
        key: "surok-vs-ajida-1",
        prompt:
          "“Cuacanya makin dingin ya.” (cuma satu hal yang berubah) Mana yang pas?",
        options: [
          { text: "날씨가 점점 추워지네요.", correct: true },
          { text: "날씨가 추울수록이네요." },
          { text: "날씨가 춥기만 하면 돼요." },
          { text: "날씨가 추워도 돼요." },
        ],
        explanation:
          "“Makin” yang berdiri sendiri itu -아/어지다 (jadi makin …): 추워지네요. -(으)ㄹ수록 baru dipakai kalau ada dua hal yang naik bareng, kayak 들으면 들을수록 좋아요.",
      },
      {
        key: "giman-1",
        prompt:
          "Staf kantor bilang: “Tinggal tanda tangan dokumennya aja.” Mana yang dia ucapin?",
        options: [
          { text: "서류에 사인해도 돼요." },
          { text: "서류에 사인하기만 하면 돼요.", correct: true },
          { text: "서류에 사인하자마자 돼요." },
          { text: "서류에 사인하기 때문에 돼요." },
        ],
        explanation:
          "“Tinggal … aja” atau “asal …” = -기만 하면 돼요. 사인해도 돼요 artinya “boleh tanda tangan”, bukan “cukup tanda tangan”.",
      },
    ],
  },
});
