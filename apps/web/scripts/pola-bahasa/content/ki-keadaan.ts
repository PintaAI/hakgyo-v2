import {
  b,
  bullet,
  callout,
  chat,
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
  key: "ki-keadaan",
  title: "Pengalaman dan keadaan",
  description:
    "Coba, pernah, lagi, dalam keadaan, terlanjur, jadi, hampir, dan pura-pura. Pola yang bikin kamu bisa cerita pengalaman dan keadaan dengan pas.",
  intro: [
    opener({
      eyebrow: "PAHAM POLA · BAB 7",
      chapterNumber: "07",
      titleKo: "경험과 상태",
      subtitle:
        "Coba, pernah, lagi, ter-, keburu, hampir, pura-pura: cerita pengalaman dan keadaan tanpa salah pola.",
      question: "지금 뭐 하고 있어요?",
      answer: "버스에 앉아 있어요. 거의 다 왔어요!",
      focus: [
        {
          label: "문법 · Pola",
          title: "-고 있다 vs -아/어 있다",
          description:
            "Lagi makan (aksi) vs lagi duduk (keadaan). Video vs foto.",
        },
        {
          label: "표현 · Kata kunci",
          title: "-아/어 보다 · -(으)ㄴ 적이 있다",
          description: "Coba dan pernah: bekal buat cerita pengalaman.",
        },
        {
          label: "함정 · Jebakan",
          title: "거의 ≠ -(으)ㄹ 뻔했다",
          description:
            "‘Hampir jatuh’ yang nggak jadi jatuh pakai -(으)ㄹ 뻔했다, bukan 거의.",
        },
      ],
      objectives: [
        {
          ko: "경험과 지금 상태를 알맞은 표현으로 말할 수 있어요.",
          id: "Bisa cerita pengalaman dan keadaan sekarang pakai pola yang pas.",
        },
        {
          ko: "‘-고 있다’와 ‘-아/어 있다’를 구별해서 쓸 수 있어요.",
          id: "Bisa bedain -고 있다 dan -아/어 있다 tanpa ragu.",
        },
      ],
    }),
    p(
      "‘Lagi duduk’ dan ‘lagi makan’ sama-sama ",
      i("lagi"),
      " di bahasa Indonesia, tapi di bahasa Korea beda pola. Kalau salah pilih, orang Korea tetap ngerti, tapi langsung ketauan kamu masih belajar.",
    ),
    p(
      "Materi ini ngumpulin pola buat cerita pengalaman (",
      i("coba, pernah"),
      "), keadaan (",
      i("lagi, dalam keadaan, jadi"),
      "), dan kejadian yang lepas kendali (",
      i("terlanjur, hampir, pura-pura"),
      "). Banyak di antaranya punya jembatan enak dari imbuhan Indonesia: ",
      b("ter-"),
      ", ",
      b("ke-an"),
      ", dan ",
      b("jadi"),
      ".",
    ),
    table([
      ["Pola", "Rasanya"],
      [ref("-아/어 보다", "ki-keadaan", "a-boda"), "coba ..."],
      [ref("-(으)ㄴ 적이 있다", "ki-keadaan", "eun-jeok"), "pernah"],
      [ref("-고 있다", "ki-keadaan", "go-itda"), "lagi (ngelakuin)"],
      [ref("-아/어 있다", "ki-keadaan", "a-itda"), "dalam keadaan, ter-"],
      [
        ref("-아/어 버리다", "ki-keadaan", "a-beorida"),
        "terlanjur, keburu, abis deh",
      ],
      [ref("-게 되다", "ki-keadaan", "ge-doeda"), "jadi, akhirnya"],
      [ref("-아/어지다", "ki-keadaan", "ajida"), "jadi (berubah), makin"],
      [
        ref("-(으)ㄹ 뻔했다", "ki-keadaan", "eul-ppeonhada"),
        "hampir (tapi nggak jadi)",
      ],
      [ref("-(으)ㄴ/는 척하다", "ki-keadaan", "cheok"), "pura-pura, sok"],
    ]),
  ],
  sections: [
    // ───────────────────────────── -아/어 보다
    {
      key: "a-boda",
      title: "-아/어 보다: coba ...",
      blocks: [
        grammar({
          number: "01",
          title: "-아/어 보다",
          descriptionKo:
            "어떤 일을 시험 삼아 해 볼 때 써요. 과거형은 경험을 나타내요.",
          descriptionTranslation:
            "Artinya ‘coba ...’. Dipakai buat nyaranin (‘coba deh’), nawarin diri (‘aku coba ya’), atau minta izin nyoba (‘boleh dicoba?’). Kalau bentuknya lampau, artinya jadi ‘pernah’: 가 봤어요 = ‘aku pernah ke sana’.",
          rules: [
            {
              condition: "Vokal terakhir ㅏ / ㅗ",
              form: "-아 보다",
              example: "가다 → 가 보다, 오다 → 와 보다",
            },
            {
              condition: "Vokal lain",
              form: "-어 보다",
              example: "먹다 → 먹어 보다, 입다 → 입어 보다",
            },
            { condition: "하다", form: "해 보다", example: "운동해 보다" },
            {
              condition: "Nyaranin",
              form: "-아/어 보세요",
              example: "먹어 보세요",
            },
            {
              condition: "Nawarin diri",
              form: "-아/어 볼게요",
              example: "제가 물어볼게요",
            },
            {
              condition: "Minta izin",
              form: "-아/어 봐도 돼요?",
              example: "입어 봐도 돼요?",
            },
            {
              condition: "Pengalaman (lampau)",
              form: "-아/어 봤어요",
              example: "제주도에 가 봤어요",
            },
            { condition: "반말", form: "-아/어 봐", example: "먹어 봐" },
          ],
          examples: [
            { before: "이 김치 한번 ", emphasis: "먹어 보세요", after: "." },
            { before: "이 신발 ", emphasis: "신어 봐도 돼요", after: "?" },
            { before: "저는 제주도에 ", emphasis: "가 봤어요", after: "." },
          ],
          tipKo: "‘한번’을 같이 쓰면 더 자연스러워요.",
          tipTranslation:
            "Tambahin 한번 (sekali) di depannya biar makin natural: 한번 먹어 보세요 = ‘cobain deh’.",
          theme: "blue",
        }),
        h3("Artinya apa sih?"),
        p(
          "Gampang: ",
          b("-아/어 보다 = coba"),
          ". Yang perlu kamu inget cuma satu hal tambahan: kalau lampau, artinya bukan ‘udah nyoba’ tapi ",
          i("pernah"),
          ". 한국 음식 먹어 봤어요? = ",
          i("Pernah makan makanan Korea?"),
        ),
        h3("Contoh"),
        ex(
          "이 김치 한번 먹어 보세요. 안 매워요.",
          "Cobain deh kimchi ini. Nggak pedes kok.",
        ),
        ex("이 신발 신어 봐도 돼요?", "Sepatu ini boleh dicoba?", "di toko"),
        ex("제가 사장님한테 한번 물어볼게요.", "Aku coba tanyain ke bos ya."),
        ex("한복 입어 봤어요?", "Pernah pakai hanbok?"),
        ex(
          "너도 이 노래 들어 봐. 진짜 좋아.",
          "Kamu dengerin deh lagu ini. Bagus banget.",
          "반말",
        ),
        callout(
          "warning",
          "Jebakan: ‘coba’ di bahasa Indonesia punya arti lain. ‘Coba kemarin kamu dateng’ itu berandai-andai, bukan nyoba. Itu pakai ",
          ref("-았/었으면 좋았을 텐데", "ki-andai", "asseumyeon-teonde"),
          ". Dan ‘coba liat’ buat 보다 sendiri cukup 한번 보세요, bukan 봐 보세요 (yang ini kedengeran muter-muter).",
        ),
        p(
          "Bandingin sama ",
          ref("-(으)ㄴ 적이 있다", "ki-keadaan", "eun-jeok"),
          ": 가 봤어요 dan 간 적이 있어요 sama-sama ‘pernah ke sana’. Yang pertama lebih santai dan sering di obrolan. Gabungan keduanya juga sering banget: 가 본 적 있어요.",
        ),
        callout(
          "tip",
          "Latihan dari arah Indonesia: ",
          ref("deh", "ik-partikel", "deh"),
          ". ‘Coba deh’ = 한번 -아/어 봐.",
        ),
      ],
    },
    // ───────────────────────────── -(으)ㄴ 적이 있다
    {
      key: "eun-jeok",
      title: "-(으)ㄴ 적이 있다/없다: pernah, nggak pernah",
      blocks: [
        grammar({
          number: "02",
          title: "-(으)ㄴ 적이 있다 / 없다",
          descriptionKo: "과거의 경험이 있는지 없는지 말할 때 써요.",
          descriptionTranslation:
            "Artinya ‘pernah’ (있다) dan ‘nggak pernah’ (없다). Biasanya dipakai buat pengalaman yang jarang atau spesial, bukan rutinitas. Sering digabung sama -아/어 보다 jadi -아/어 본 적이 있다.",
          rules: [
            {
              condition: "Akhiran vokal",
              form: "-ㄴ 적이 있다",
              example: "가다 → 간 적이 있다",
            },
            {
              condition: "Akhiran konsonan",
              form: "-은 적이 있다",
              example: "먹다 → 먹은 적이 있다",
            },
            {
              condition: "Batang berakhiran ㄹ (ㄹ hilang)",
              form: "-ㄴ 적이 있다",
              example: "만들다 → 만든 적, 살다 → 산 적",
            },
            {
              condition: "하다",
              form: "한 적이 있다",
              example: "지각한 적이 있다",
            },
            {
              condition: "Gabung -아/어 보다",
              form: "-아/어 본 적이 있다",
              example: "가 본 적이 있다",
            },
            {
              condition: "Nggak pernah",
              form: "-(으)ㄴ 적이 없다",
              example: "본 적이 없다",
            },
            {
              condition: "Sekali pun nggak pernah",
              form: "한 번도 -(으)ㄴ 적이 없다",
              example: "한 번도 지각한 적이 없다",
            },
            {
              condition: "Obrolan (이 dibuang)",
              form: "-(으)ㄴ 적 있어요",
              example: "먹어 본 적 있어요?",
            },
          ],
          examples: [
            { before: "한국 음식 ", emphasis: "먹어 본 적 있어요", after: "?" },
            { before: "저는 눈을 ", emphasis: "본 적이 없어요", after: "." },
            { before: "한 번도 ", emphasis: "지각한 적이 없어요", after: "." },
          ],
          tipKo: "매일 하는 일에는 잘 안 써요.",
          tipTranslation:
            "Jangan pakai buat rutinitas. ‘Pernah sarapan?’ kedengeran aneh di dua bahasa.",
          theme: "blue",
        }),
        h3("Artinya apa sih?"),
        p(
          "Ini salah satu pola paling gampang buat orang Indonesia, karena ",
          i("pernah"),
          " dan ",
          i("nggak pernah"),
          " nyambung satu-satu. ",
          b("적"),
          " artinya kira-kira ‘waktu, momen’. Jadi 간 적이 있어요 secara harfiah: ‘ada momen aku pergi’.",
        ),
        h3("Contoh"),
        ex("한국 음식 먹어 본 적 있어요?", "Pernah makan makanan Korea?"),
        ex(
          "저는 눈을 본 적이 없어요. 인도네시아에는 눈이 안 오거든요.",
          "Aku belum pernah liat salju. Soalnya di Indonesia nggak ada salju.",
        ),
        ex(
          "지하철에서 지갑을 잃어버린 적이 있어요.",
          "Aku pernah kehilangan dompet di subway.",
        ),
        ex(
          "저는 한 번도 지각한 적이 없어요.",
          "Aku sekali pun belum pernah telat.",
          "ngomong ke 반장님 waktu evaluasi",
        ),
        ex(
          "드라마 촬영하는 거 본 적 있어?",
          "Pernah liat syuting drakor?",
          "반말",
        ),
        h3("Di obrolan"),
        ...chat(
          [
            {
              who: "민수",
              ko: "리나 씨, 눈 본 적 있어요?",
              id: "Rina, pernah liat salju?",
            },
            {
              who: "리나",
              ko: "아니요, 아직 없어요. 인도네시아에는 눈이 안 오거든요.",
              id: "Belum, belum pernah. Soalnya di Indonesia nggak ada salju.",
            },
            {
              who: "민수",
              ko: "그럼 이번 겨울에 스키장에 한번 가 봐요!",
              id: "Kalau gitu, musim dingin ini cobain ke tempat ski!",
            },
            {
              who: "리나",
              ko: "좋아요! 스키는 한 번도 타 본 적이 없어요.",
              id: "Boleh! Aku sekali pun belum pernah main ski.",
            },
          ],
          {
            questions: [
              {
                ko: "리나는 눈을 본 적이 있어요?",
                id: "Rina pernah liat salju?",
              },
              {
                ko: "민수는 리나에게 뭘 해 보라고 했어요?",
                id: "Minsu nyaranin Rina nyobain apa?",
              },
            ],
            theme: "blue",
          },
        ),
        callout(
          "warning",
          "Jebakan: ‘belum pernah’ tetap pakai 적이 없다, bukan pola baru. Kalau mau negesin ‘belum’, tambahin 아직: 아직 한국에 가 본 적이 없어요. Dan jawab pertanyaan ‘pernah?’ cukup 네, 있어요 atau 아니요, 없어요. Nggak perlu ulang kalimatnya.",
        ),
        p(
          "Kalau kamu cuma mau bilang ‘udah pernah coba’ dengan santai, ",
          ref("-아/어 봤어요", "ki-keadaan", "a-boda"),
          " udah cukup.",
        ),
      ],
    },
    // ───────────────────────────── -고 있다
    {
      key: "go-itda",
      title: "-고 있다: lagi (ngelakuin)",
      blocks: [
        grammar({
          number: "03",
          title: "-고 있다",
          descriptionKo: "어떤 행동이 지금 진행되고 있을 때 써요.",
          descriptionTranslation:
            "Artinya ‘lagi / sedang’ ngelakuin sesuatu. Bisa buat detik ini (‘lagi makan’) atau buat periode yang lagi jalan (‘lagi belajar bahasa Korea akhir-akhir ini’). Juga dipakai buat ‘lagi pakai’ baju, topi, kacamata.",
          rules: [
            {
              condition: "Semua kata kerja",
              form: "-고 있다",
              example: "먹다 → 먹고 있다",
            },
            {
              condition: "Lampau (waktu itu lagi ...)",
              form: "-고 있었다",
              example: "자고 있었어요",
            },
            {
              condition: "Hormat",
              form: "-고 계시다",
              example: "회의하고 계세요",
            },
            {
              condition: "Pakaian (lagi pakai)",
              form: "입고 / 신고 / 쓰고 / 끼고 있다",
              example: "모자를 쓰고 있다",
            },
            { condition: "반말", form: "-고 있어", example: "가고 있어" },
          ],
          examples: [
            { before: "지금 밥 ", emphasis: "먹고 있어요", after: "." },
            { before: "요즘 한국어를 ", emphasis: "배우고 있어요", after: "." },
            {
              before: "사장님은 지금 회의",
              emphasis: "하고 계세요",
              after: ".",
            },
          ],
          tipKo:
            "간단히 ‘먹어요’라고 해도 ‘지금 먹고 있다’는 뜻이 될 수 있어요.",
          tipTranslation:
            "Bentuk biasa (먹어요) udah bisa berarti ‘lagi makan’. -고 있다 dipakai kalau kamu mau negesin ‘lagi berlangsung’.",
          theme: "blue",
        }),
        h3("Artinya apa sih?"),
        p(
          "Jembatannya simpel: ",
          b("-고 있다 = lagi / sedang"),
          " + kata kerja yang ada aksinya. Kalau kamu bisa bayangin orangnya lagi gerak (makan, kerja, jalan, nonton), pakai -고 있다.",
        ),
        h3("Contoh"),
        ex(
          "지금 밥 먹고 있어요. 이따 전화할게요.",
          "Lagi makan nih. Nanti aku telepon ya.",
        ),
        ex(
          "요즘 한국어를 배우고 있어요.",
          "Akhir-akhir ini aku lagi belajar bahasa Korea.",
        ),
        ex(
          "사장님은 지금 회의하고 계세요.",
          "Bos lagi rapat sekarang.",
          "hormat: 계세요",
        ),
        ex(
          "저기 빨간 모자 쓰고 있는 사람이 반장님이에요.",
          "Orang yang pakai topi merah di sana itu 반장님.",
        ),
        ex("지금 가고 있어! 5분만!", "Lagi otw nih! Lima menit lagi!", "반말"),
        ex("전화했을 때 자고 있었어요.", "Pas kamu nelpon, aku lagi tidur."),
        callout(
          "warning",
          "Jebakan: ‘lagi duduk’, ‘lagi berdiri’, ‘lagi tiduran’ itu keadaan, bukan aksi. Pakai -아/어 있다: 앉아 있어요, bukan 앉고 있어요 (artinya malah ‘lagi proses duduk’). Lengkapnya di bagian ",
          ref("-아/어 있다", "ki-keadaan", "a-itda"),
          ".",
        ),
        callout(
          "info",
          "알고 있어요 juga sering kamu denger. Artinya ‘aku tau (dan inget)’, bukan ‘lagi tau’. Rasanya lebih halus dan sadar daripada 알아요.",
        ),
      ],
    },
    // ───────────────────────────── -아/어 있다
    {
      key: "a-itda",
      title: "-아/어 있다: dalam keadaan, ter-",
      blocks: [
        grammar({
          number: "04",
          title: "-아/어 있다",
          descriptionKo: "어떤 행동이 끝난 뒤 그 상태가 계속될 때 써요.",
          descriptionTranslation:
            "Dipakai buat keadaan yang tersisa setelah sesuatu terjadi: pintunya terbuka, lampunya nyala, dia lagi duduk. Jembatan terbaiknya imbuhan ter-: terbuka, tertutup, tertempel, tersisa. Cuma bisa dipakai sama kata kerja yang nggak punya objek.",
          rules: [
            {
              condition: "Vokal terakhir ㅏ / ㅗ",
              form: "-아 있다",
              example: "앉다 → 앉아 있다, 남다 → 남아 있다",
            },
            {
              condition: "Vokal lain",
              form: "-어 있다",
              example: "서다 → 서 있다, 붙다 → 붙어 있다",
            },
            {
              condition: "Kata kerja pasif (-이/히/리/기-)",
              form: "-아/어 있다",
              example: "열리다 → 열려 있다, 닫히다 → 닫혀 있다",
            },
            {
              condition: "-아/어지다",
              form: "-아/어져 있다",
              example: "켜지다 → 켜져 있다",
            },
            {
              condition: "눕다 (ㅂ berubah)",
              form: "누워 있다",
              example: "침대에 누워 있어요",
            },
            {
              condition: "Hormat",
              form: "-아/어 계시다",
              example: "앉아 계세요",
            },
          ],
          examples: [
            { before: "문이 ", emphasis: "열려 있어요", after: "." },
            { before: "의자에 ", emphasis: "앉아 있어요", after: "." },
            {
              before: "벽에 안전 수칙이 ",
              emphasis: "붙어 있어요",
              after: ".",
            },
          ],
          tipKo: "‘입다, 신다, 쓰다’는 ‘-고 있다’로 상태를 나타내요.",
          tipTranslation:
            "Pengecualian penting: pakaian. ‘Lagi pakai jaket’ = 입고 있어요, bukan 입어 있어요.",
          theme: "blue",
        }),
        h3("Artinya apa sih?"),
        p(
          "Bayangin foto, bukan video. ",
          ref("-고 있다", "ki-keadaan", "go-itda"),
          " itu video: ada gerakan yang lagi jalan. -아/어 있다 itu foto: aksinya udah selesai, yang kamu liat tinggal keadaannya.",
        ),
        p(
          "Imbuhan ",
          b("ter-"),
          " ngebantu banget di sini. Pintu ",
          i("dibuka"),
          " (문을 열다) → pintu ",
          i("terbuka"),
          " (문이 열리다) → pintu ",
          i("dalam keadaan terbuka"),
          " (문이 열려 있다).",
        ),
        table([
          ["Aksi (punya objek)", "Kejadian (ter-)", "Keadaan (-아/어 있다)"],
          [
            "문을 열다 (buka pintu)",
            "문이 열리다 (terbuka)",
            "문이 열려 있다 (lagi kebuka)",
          ],
          [
            "불을 켜다 (nyalain lampu)",
            "불이 켜지다 (menyala)",
            "불이 켜져 있다 (lagi nyala)",
          ],
          [
            "종이를 붙이다 (nempel kertas)",
            "종이가 붙다 (tertempel)",
            "종이가 붙어 있다 (tertempel)",
          ],
        ]),
        h3("Contoh"),
        ex(
          "문이 열려 있어요. 닫아 주세요.",
          "Pintunya kebuka. Tolong ditutup.",
        ),
        ex("민수 씨는 저기 앉아 있어요.", "Minsu lagi duduk di sana."),
        ex(
          "퇴근했는데 사무실 불이 아직 켜져 있어요.",
          "Udah jam pulang, tapi lampu kantor masih nyala.",
        ),
        ex(
          "벽에 안전 수칙이 붙어 있어요. 꼭 읽어 보세요.",
          "Di dinding ada aturan keselamatan tertempel. Wajib dibaca ya.",
          "pabrik",
        ),
        ex(
          "냉장고에 김밥 하나 남아 있어.",
          "Di kulkas masih ada sisa satu kimbap.",
          "반말",
        ),
        h3("-고 있다 vs -아/어 있다"),
        table([
          ["Indonesia", "Benar", "Salah", "Kenapa"],
          ["Lagi duduk", "앉아 있어요", "앉고 있어요", "Duduk itu keadaan"],
          ["Lagi berdiri", "서 있어요", "서고 있어요", "Keadaan"],
          ["Lagi makan", "먹고 있어요", "먹어 있어요", "Makan itu aksi"],
          [
            "Lagi pakai masker",
            "마스크를 쓰고 있어요",
            "써 있어요",
            "Pakaian pakai -고 있다",
          ],
        ]),
        h3("Di obrolan"),
        ...chat(
          [
            {
              who: "지은",
              ko: "어디야? 다들 기다리고 있어.",
              id: "Di mana? Semua lagi nungguin.",
            },
            {
              who: "리나",
              ko: "미안! 지금 가고 있어. 버스 타고 있어.",
              id: "Sori! Lagi otw. Lagi di bus.",
            },
            { who: "지은", ko: "자리는 있어?", id: "Dapet tempat duduk?" },
            {
              who: "리나",
              ko: "응, 앉아 있어. 거의 다 왔어!",
              id: "Iya, lagi duduk. Udah hampir nyampe!",
            },
            {
              who: "지은",
              ko: "알았어. 나 입구에 서 있어. 빨간 모자 쓰고 있어!",
              id: "Oke. Aku lagi berdiri di pintu masuk. Pakai topi merah!",
            },
          ],
          {
            questions: [
              {
                ko: "리나는 지금 뭐 하고 있어요?",
                id: "Rina lagi ngapain sekarang?",
              },
              {
                ko: "왜 ‘앉고 있어’가 아니라 ‘앉아 있어’라고 했어요?",
                id: "Kenapa Rina bilang 앉아 있어, bukan 앉고 있어?",
              },
              {
                ko: "지은은 어디에 있어요? 뭘 쓰고 있어요?",
                id: "지은 lagi di mana? Pakai apa di kepalanya?",
              },
            ],
            tip: {
              title: "꿀팁 · TIP",
              ko: "옷이나 모자는 ‘-고 있다’로 말해요: 모자를 쓰고 있어요.",
              id: "Pakaian itu pengecualian: lagi pakai topi = 모자를 쓰고 있어요, bukan 써 있어요.",
            },
            theme: "blue",
          },
        ),
        callout(
          "warning",
          "Jebakan nomor satu orang Indonesia: ‘sedang’ di bahasa kita dipakai buat aksi dan keadaan sekaligus. Bahasa Korea misahin. Cek dulu: ada objeknya? lagi gerak? → -고 있다. Udah selesai dan tinggal keadaannya? → -아/어 있다. Satu lagi: kata kerja yang punya objek (먹다, 보다, 열다) nggak bisa pakai -아/어 있다.",
        ),
        callout(
          "info",
          "Kamu mungkin pernah liat 쓰여 있어요 (di obrolan sering jadi 써 있어요) di papan atau label. Itu dari 쓰다 = menulis, artinya ‘tertulis’: 여기 ‘금연’이라고 쓰여 있어요 (di sini tertulis ‘dilarang merokok’). Bukan ‘lagi pakai’.",
        ),
      ],
    },
    // ───────────────────────────── -아/어 버리다
    {
      key: "a-beorida",
      title: "-아/어 버리다: terlanjur, keburu, abis deh",
      blocks: [
        grammar({
          number: "05",
          title: "-아/어 버리다",
          descriptionKo:
            "어떤 일이 완전히 끝나서 되돌릴 수 없을 때 써요. 아쉬움이나 시원함이 같이 느껴져요.",
          descriptionTranslation:
            "Nambahin rasa ‘tuntas, nggak bisa dibalikin’. Bisa nyesel (‘yah, keburu abis’), bisa juga lega (‘udah, beresin aja sekalian’). Ini kunci buat bikin rasa ke-an dan ter- Indonesia: kelupaan, keceplosan, ketiduran.",
          rules: [
            {
              condition: "Vokal terakhir ㅏ / ㅗ",
              form: "-아 버리다",
              example: "가다 → 가 버리다",
            },
            {
              condition: "Vokal lain",
              form: "-어 버리다",
              example: "먹다 → 먹어 버리다",
            },
            {
              condition: "하다",
              form: "해 버리다",
              example: "말하다 → 말해 버리다",
            },
            {
              condition: "Lampau (paling sering)",
              form: "-아/어 버렸어요",
              example: "다 먹어 버렸어요",
            },
            {
              condition: "Ajakan lega",
              form: "-아/어 버리자",
              example: "빨리 해 버리자",
            },
            {
              condition: "반말",
              form: "-아/어 버렸어",
              example: "말해 버렸어",
            },
          ],
          examples: [
            {
              before: "동생이 제 케이크를 다 ",
              emphasis: "먹어 버렸어요",
              after: ".",
            },
            { before: "버스가 벌써 ", emphasis: "떠나 버렸어요", after: "." },
            {
              before: "비밀인데 친구한테 ",
              emphasis: "말해 버렸어요",
              after: ".",
            },
          ],
          tipKo: "‘잊어버리다’, ‘잃어버리다’는 아예 한 단어가 됐어요.",
          tipTranslation:
            "잊어버리다 (lupa) dan 잃어버리다 (hilang) udah jadi satu kata. Itu kenapa ‘lupa’ dan ‘kehilangan’ di Korea hampir selalu ada 버리다-nya.",
          theme: "blue",
        }),
        h3("Artinya apa sih?"),
        p(
          "버리다 sendiri artinya ‘buang’. Kalau ditempel di kata kerja lain, artinya jadi ‘sampai kebuang, tuntas, abis’. Di bahasa Indonesia kita punya banyak cara buat rasa ini:",
        ),
        bullet(i("Kuenya keburu dihabisin adikku."), " → 먹어 버렸어요"),
        bullet(i("Busnya udah keburu jalan."), " → 떠나 버렸어요"),
        bullet(i("Aku keceplosan ngomong."), " → 말해 버렸어요"),
        bullet(i("Beresin aja sekalian, biar lega."), " → 해 버리자"),
        h3("Contoh"),
        ex(
          "동생이 제 케이크를 다 먹어 버렸어요.",
          "Kueku keburu diabisin adikku.",
        ),
        ex(
          "뛰어갔는데 버스가 벌써 떠나 버렸어요.",
          "Udah lari-lari, busnya keburu jalan.",
        ),
        ex(
          "비밀인데 친구한테 말해 버렸어요.",
          "Padahal rahasia, aku keceplosan ngomong ke temen.",
        ),
        ex(
          "너무 피곤해서 소파에서 잠들어 버렸어요.",
          "Saking capeknya, aku ketiduran di sofa.",
        ),
        ex(
          "숙제 그냥 오늘 다 해 버리자!",
          "Udah, PR-nya kita beresin hari ini aja!",
          "반말, rasa lega",
        ),
        h3("Di obrolan"),
        ...chat(
          [
            {
              who: "지은",
              ko: "내가 사 온 떡 어디 있어?",
              id: "Tteok yang aku beli mana?",
            },
            {
              who: "리나",
              ko: "아... 미안. 배고파서 다 먹어 버렸어.",
              id: "Eh... sori. Laper, jadi keburu aku abisin.",
            },
            {
              who: "지은",
              ko: "뭐? 그거 엄마 드리려고 산 건데!",
              id: "Hah? Itu kan aku beli buat mama!",
            },
            {
              who: "리나",
              ko: "진짜 미안해. 내일 내가 다시 사 올게.",
              id: "Maaf banget. Besok aku beliin lagi deh.",
            },
          ],
          {
            questions: [
              { ko: "떡은 어떻게 됐어요?", id: "Tteok-nya ke mana?" },
              {
                ko: "리나는 왜 ‘먹었어’가 아니라 ‘먹어 버렸어’라고 했어요?",
                id: "Kenapa Rina bilang 먹어 버렸어, bukan cuma 먹었어?",
              },
            ],
            theme: "rose",
          },
        ),
        callout(
          "warning",
          "Jebakan: jangan tempel 버리다 ke semua kalimat lampau. 밥 먹었어요 itu netral. 밥 먹어 버렸어요 bikin pendengar nanya ‘kenapa? harusnya nggak dimakan?’. Pakai cuma kalau ada rasa nyesel, kaget, atau lega.",
        ),
        p(
          "Buat rasa ‘tanpa sadar’, -아/어 버리다 sering dipasangin sama ",
          ref("깜빡 / 나도 모르게 / 실수로", "ki-kata-kecil", "kkamppak"),
          ": 나도 모르게 말해 버렸어요 = ",
          i("keceplosan"),
          ".",
        ),
        callout(
          "tip",
          "Rumus ke-an Indonesia dibedah lengkap di ",
          ref(
            "rumus ketiduran, kelupaan, keceplosan",
            "ik-nggak-sengaja",
            "rumus",
          ),
          ". Langsung praktik: ",
          ref("ketiduran", "ik-nggak-sengaja", "ketiduran"),
          ", ",
          ref("keceplosan", "ik-nggak-sengaja", "keceplosan"),
          ".",
        ),
      ],
    },
    // ───────────────────────────── -게 되다
    {
      key: "ge-doeda",
      title: "-게 되다: jadi, akhirnya",
      blocks: [
        grammar({
          number: "06",
          title: "-게 되다",
          descriptionKo:
            "자기 뜻보다 상황이나 다른 사람 때문에 어떤 결과가 생겼을 때 써요.",
          descriptionTranslation:
            "Artinya ‘jadi ...’ atau ‘akhirnya ...’ karena keadaan, bukan murni keputusan sendiri. Juga dipakai buat ngomong rendah hati: daripada ‘aku memutuskan kerja di sini’, orang Korea bilang ‘aku jadi kerja di sini’. Ini favorit buat perkenalan diri di tempat kerja.",
          rules: [
            {
              condition: "Kata kerja",
              form: "-게 되다",
              example: "일하다 → 일하게 되다",
            },
            {
              condition: "Lampau (paling sering)",
              form: "-게 됐어요",
              example: "알게 됐어요",
            },
            {
              condition: "Nanti",
              form: "-게 될 거예요",
              example: "만나게 될 거예요",
            },
            {
              condition: "Negatif",
              form: "안 -게 됐어요 / -지 않게 됐어요",
              example: "못 가게 됐어요",
            },
            { condition: "반말", form: "-게 됐어", example: "가게 됐어" },
          ],
          examples: [
            { before: "한국 회사에서 ", emphasis: "일하게 됐어요", after: "." },
            {
              before: "드라마 보다가 한국어를 ",
              emphasis: "좋아하게 됐어요",
              after: ".",
            },
            {
              before: "이번에 같이 ",
              emphasis: "일하게 된",
              after: " 리나입니다.",
            },
          ],
          tipKo: "자기소개할 때 ‘-게 됐어요’를 쓰면 겸손하게 들려요.",
          tipTranslation:
            "Waktu perkenalan, ‘같이 일하게 된 ...입니다’ kedengeran sopan dan rendah hati. Hafalin kalimat ini sebelum hari pertama kerja.",
          theme: "blue",
        }),
        h3("Artinya apa sih?"),
        p(
          "Bahasa Indonesia sering pakai ",
          i("jadi"),
          " buat rasa ini: ",
          i(
            "‘Aku jadi suka K-pop gara-gara temen.’ ‘Jadinya kita lembur.’ ‘Akhirnya aku dapet kerja di Korea.’",
          ),
          " Hasilnya muncul karena keadaan, bukan karena kamu ngerencanain dari awal.",
        ),
        h3("Contoh"),
        ex(
          "다음 달부터 한국 회사에서 일하게 됐어요.",
          "Mulai bulan depan aku jadi kerja di perusahaan Korea.",
        ),
        ex(
          "드라마 보다가 한국어를 좋아하게 됐어요.",
          "Gara-gara nonton drakor, aku jadi suka bahasa Korea.",
        ),
        ex(
          "안녕하세요. 이번에 같이 일하게 된 리나입니다. 잘 부탁드립니다.",
          "Halo, saya Rina, yang mulai sekarang kerja bareng di sini. Mohon bimbingannya.",
          "perkenalan hari pertama",
        ),
        ex(
          "주문이 많아서 이번 주말에도 일하게 됐어요.",
          "Pesanannya banyak, jadinya weekend ini juga kerja.",
        ),
        ex(
          "처음엔 김치를 못 먹었는데 이제 잘 먹게 됐어요.",
          "Awalnya nggak bisa makan kimchi, sekarang jadi doyan.",
        ),
        h3("Di obrolan"),
        ...chat(
          [
            {
              who: "리나",
              ko: "안녕하세요. 이번에 같이 일하게 된 리나입니다. 잘 부탁드립니다.",
              id: "Halo, saya Rina, mulai sekarang kerja bareng di sini. Mohon bimbingannya.",
            },
            {
              who: "민수",
              ko: "반가워요. 한국에는 어떻게 오게 됐어요?",
              id: "Salam kenal. Gimana ceritanya bisa ke Korea?",
            },
            {
              who: "리나",
              ko: "EPS 시험에 합격해서 오게 됐어요.",
              id: "Lulus ujian EPS, jadinya bisa ke sini.",
            },
            {
              who: "민수",
              ko: "와, 축하해요! 한국어도 잘하시네요.",
              id: "Wah, selamat! Bahasa Koreanya jago juga ya.",
            },
            {
              who: "리나",
              ko: "아니에요, 아직 멀었어요.",
              id: "Ah nggak, masih jauh kok.",
            },
          ],
          {
            questions: [
              {
                ko: "리나는 어떻게 한국에 오게 됐어요?",
                id: "Gimana ceritanya Rina bisa ke Korea?",
              },
              {
                ko: "민수가 칭찬했을 때 리나는 뭐라고 대답했어요?",
                id: "Waktu dipuji Minsu, Rina jawab apa?",
              },
            ],
            tip: {
              title: "꿀팁 · TIP",
              ko: "‘어떻게 오게 됐어요?’는 처음 만난 사람에게 자주 하는 질문이에요.",
              id: "어떻게 오게 됐어요? (gimana ceritanya bisa ke sini?) itu pertanyaan wajib ke orang baru. Siapin jawabannya pakai -게 됐어요.",
            },
            theme: "blue",
          },
        ),
        callout(
          "warning",
          "Jebakan: ‘jadi’ buat kata sifat (jadi dingin, jadi sibuk) itu bukan -게 되다, tapi ",
          ref("-아/어지다", "ki-keadaan", "ajida"),
          ". 추워졌어요, bukan 춥게 됐어요. Aturan gampangnya: kata kerja → -게 되다, kata sifat → -아/어지다.",
        ),
        p(
          "Kalau kamu sendiri yang mutusin, pakai ",
          ref("-기로 하다", "ki-bisa-harus", "giro-hada"),
          ": 한국에 가기로 했어요 (aku mutusin ke Korea). Kalau ‘akhirnya’-nya setelah perjuangan panjang, tambahin ",
          ref("결국", "ki-kata-kecil", "gyeolguk"),
          ".",
        ),
      ],
    },
    // ───────────────────────────── -아/어지다
    {
      key: "ajida",
      title: "-아/어지다: jadi (berubah), makin",
      blocks: [
        grammar({
          number: "07",
          title: "-아/어지다",
          descriptionKo: "형용사에 붙어서 상태가 변하는 것을 나타내요.",
          descriptionTranslation:
            "Ditempel ke kata sifat buat bilang ‘jadi ...’: jadi dingin, jadi sibuk, jadi lancar. Ditempel ke beberapa kata kerja, artinya mirip ter- atau di-: lampunya mati sendiri, pulpennya enak dipakai nulis.",
          rules: [
            {
              condition: "Vokal terakhir ㅏ / ㅗ",
              form: "-아지다",
              example: "좋다 → 좋아지다, 많다 → 많아지다",
            },
            {
              condition: "Vokal lain",
              form: "-어지다",
              example: "길다 → 길어지다, 늦다 → 늦어지다",
            },
            {
              condition: "하다",
              form: "-해지다",
              example: "따뜻하다 → 따뜻해지다",
            },
            {
              condition: "ㅂ tidak beraturan",
              form: "-워지다",
              example: "춥다 → 추워지다, 덥다 → 더워지다",
            },
            {
              condition: "ㅡ hilang",
              form: "-아/어지다",
              example: "바쁘다 → 바빠지다, 예쁘다 → 예뻐지다",
            },
            {
              condition: "르 tidak beraturan",
              form: "-ㄹ라지다 / -ㄹ러지다",
              example: "빠르다 → 빨라지다",
            },
            {
              condition: "ㅎ tidak beraturan",
              form: "-애지다",
              example: "빨갛다 → 빨개지다",
            },
            {
              condition: "Kata kerja (ter-)",
              form: "-아/어지다",
              example: "켜다 → 켜지다, 쓰다 → 써지다",
            },
          ],
          examples: [
            { before: "날씨가 많이 ", emphasis: "추워졌어요", after: "." },
            {
              before: "한국어 실력이 많이 ",
              emphasis: "좋아졌어요",
              after: "!",
            },
            { before: "얼굴이 ", emphasis: "빨개졌어요", after: "." },
          ],
          tipKo: "‘점점’과 같이 쓰면 ‘makin’의 느낌이 나요.",
          tipTranslation:
            "Tambahin 점점 (perlahan-lahan) biar rasanya ‘makin’: 점점 추워져요 = makin dingin.",
          theme: "blue",
        }),
        h3("Artinya apa sih?"),
        p(
          "Bayangin perubahan: tadinya A, sekarang B. ",
          i(
            "‘Udah mulai dingin.’ ‘Kerjaan jadi sibuk.’ ‘Bahasa Koreamu makin jago!’",
          ),
          " Semua itu -아/어지다. Kalau ada 점점, rasanya jadi ",
          i("makin lama makin ..."),
        ),
        h3("Contoh"),
        ex(
          "11월이 되니까 날씨가 많이 추워졌어요.",
          "Masuk November, udah dingin banget.",
        ),
        ex(
          "와, 한국어 실력이 많이 좋아졌어요!",
          "Wah, bahasa Koreamu makin jago!",
        ),
        ex(
          "요즘 주문이 많아서 일이 바빠졌어요.",
          "Akhir-akhir ini pesanan banyak, kerjaan jadi sibuk.",
        ),
        ex(
          "칭찬을 들으니까 얼굴이 빨개졌어요.",
          "Dipuji gitu, mukaku langsung merah. Salting deh.",
        ),
        ex(
          "화장실 불이 저절로 꺼졌어요.",
          "Lampu kamar mandi mati sendiri.",
          "arti ter-",
        ),
        ex(
          "이 볼펜 잘 안 써져요.",
          "Pulpen ini susah dipakai nulis.",
          "arti ter- / ‘bisa di-’",
        ),
        callout(
          "warning",
          "Jebakan 1: jangan tempel ke kata kerja biasa buat arti ‘jadi’. ‘Jadi suka’ = 좋아하게 됐어요, bukan 좋아해졌어요. Kata kerja pakai ",
          ref("-게 되다", "ki-keadaan", "ge-doeda"),
          ".",
        ),
        callout(
          "warning",
          "Jebakan 2: 좋아지다 dan 좋아하다 beda jauh. 좋아졌어요 = jadi lebih baik (cuaca, kondisi, skill). 좋아해요 = suka. ‘Kondisiku udah membaik’ = 몸이 좋아졌어요.",
        ),
        p(
          "Buat ‘makin ... makin ...’ yang lengkap, cek ",
          ref("-(으)면 -(으)ㄹ수록", "ki-waktu-sebab", "eulsurok"),
          " dan dari arah Indonesia ",
          ref("makin", "ik-dugaan", "makin"),
          ".",
        ),
      ],
    },
    // ───────────────────────────── -(으)ㄹ 뻔했다
    {
      key: "eul-ppeonhada",
      title: "-(으)ㄹ 뻔했다: hampir (tapi nggak jadi)",
      blocks: [
        grammar({
          number: "08",
          title: "-(으)ㄹ 뻔했다",
          descriptionKo:
            "어떤 일이 거의 일어날 뻔했지만 실제로는 일어나지 않았을 때 써요.",
          descriptionTranslation:
            "Artinya ‘hampir aja ...’, dan kejadiannya nggak beneran terjadi. Hampir jatuh, hampir telat, hampir ketinggalan bus. Hampir selalu dalam bentuk lampau, dan sering diikuti rasa lega.",
          rules: [
            {
              condition: "Akhiran vokal",
              form: "-ㄹ 뻔했다",
              example: "넘어지다 → 넘어질 뻔했다",
            },
            {
              condition: "Akhiran konsonan",
              form: "-을 뻔했다",
              example: "늦다 → 늦을 뻔했다",
            },
            {
              condition: "Batang berakhiran ㄹ",
              form: "-ㄹ 뻔했다",
              example: "울다 → 울 뻔했다",
            },
            {
              condition: "하다",
              form: "할 뻔했다",
              example: "지각하다 → 지각할 뻔했다",
            },
            {
              condition: "Lebay (saking ...)",
              form: "-아/어서 죽을 뻔했다",
              example: "웃겨서 죽을 뻔했다",
            },
            {
              condition: "반말",
              form: "-(으)ㄹ 뻔했어",
              example: "넘어질 뻔했어",
            },
          ],
          examples: [
            { before: "지하철에서 ", emphasis: "넘어질 뻔했어요", after: "." },
            { before: "늦잠 자서 ", emphasis: "지각할 뻔했어요", after: "." },
            {
              before: "버스를 ",
              emphasis: "놓칠 뻔했어요",
              after: ". 다행히 탔어요.",
            },
          ],
          tipKo: "‘다행히’, ‘큰일 날 뻔했다’와 같이 자주 써요.",
          tipTranslation:
            "Ungkapan wajib: 큰일 날 뻔했어요! = ‘Hampir aja gawat!’ Sering disambung 다행이에요 (untung).",
          theme: "blue",
        }),
        h3("Artinya apa sih?"),
        p(
          i("Hampir"),
          " di bahasa Indonesia punya dua arti, dan bahasa Korea misahin keduanya:",
        ),
        table([
          ["Indonesia", "Maksudnya", "Korea"],
          [
            "Hampir jatuh",
            "Nyaris terjadi, tapi nggak",
            ref("-(으)ㄹ 뻔했다", "ki-keadaan", "eul-ppeonhada"),
          ],
          [
            "Hampir selesai",
            "Jumlahnya udah mendekati",
            ref("거의", "ki-kata-kecil", "geoui"),
          ],
        ]),
        h3("Contoh"),
        ex("늦잠 자서 지각할 뻔했어요.", "Bangun kesiangan, hampir aja telat."),
        ex("지하철에서 넘어질 뻔했어요.", "Hampir jatuh di subway."),
        ex(
          "장갑을 안 껴서 손을 다칠 뻔했어요. 큰일 날 뻔했어요.",
          "Nggak pakai sarung tangan, hampir aja tanganku luka. Nyaris gawat.",
          "safety briefing di pabrik",
        ),
        ex(
          "버스를 놓칠 뻔했는데 다행히 탔어요.",
          "Hampir ketinggalan bus, untung masih kekejar.",
        ),
        ex(
          "영화가 너무 슬퍼서 울 뻔했어.",
          "Filmnya sedih banget, hampir nangis.",
          "반말",
        ),
        ex(
          "너무 웃겨서 죽을 뻔했어 ㅋㅋ",
          "Lucu banget, sampe mau mati ketawa wkwk.",
          "반말, lebay",
        ),
        callout(
          "warning",
          "Jebakan: ‘hampir jatuh’ bukan 거의 넘어졌어요. Kalimat itu bikin orang Korea bingung: jadi kamu jatuh atau nggak? Kalau kejadiannya nggak terjadi, pakai -(으)ㄹ 뻔했다.",
        ),
        p(
          "Rasa lega setelahnya biasanya pakai ",
          ref("다행이다", "ki-kata-kecil", "dahaeng"),
          ": 넘어질 뻔했는데 다행히 괜찮아요.",
        ),
        callout(
          "tip",
          "Latihan dari arah Indonesia: ",
          ref("hampir", "ik-waktu", "hampir"),
          ".",
        ),
      ],
    },
    // ───────────────────────────── -(으)ㄴ/는 척하다
    {
      key: "cheok",
      title: "-(으)ㄴ/는 척하다: pura-pura, sok",
      blocks: [
        grammar({
          number: "09",
          title: "-(으)ㄴ/는 척하다",
          descriptionKo: "사실이 아닌데 그런 것처럼 행동할 때 써요.",
          descriptionTranslation:
            "Artinya ‘pura-pura’. Dan kabar baiknya, ini juga pas banget buat ‘sok’: sok tau, sok sibuk, sok kuat. Bentuk di depan 척 ngikutin waktu dan jenis katanya, mirip -는 것 같다.",
          rules: [
            {
              condition: "Kata kerja, sekarang",
              form: "-는 척하다",
              example: "자다 → 자는 척하다",
            },
            {
              condition: "Kata kerja, lampau",
              form: "-(으)ㄴ 척하다",
              example: "못 듣다 → 못 들은 척하다",
            },
            {
              condition: "Kata sifat",
              form: "-(으)ㄴ 척하다",
              example: "바쁘다 → 바쁜 척하다, 아프다 → 아픈 척하다",
            },
            {
              condition: "있다 / 없다",
              form: "-는 척하다",
              example: "멋있는 척하다",
            },
            {
              condition: "Kata benda",
              form: "-인 척하다",
              example: "학생인 척하다",
            },
            {
              condition: "Sok tau / pura-pura nggak kenal",
              form: "아는 척 / 모르는 척",
              example: "아는 척하지 마",
            },
            { condition: "반말", form: "-는 척했어", example: "자는 척했어" },
          ],
          examples: [
            { before: "동생이 ", emphasis: "자는 척하고", after: " 있어요." },
            {
              before: "친구가 불렀는데 ",
              emphasis: "못 들은 척했어요",
              after: ".",
            },
            {
              before: "사장님이 오니까 다들 ",
              emphasis: "바쁜 척했어요",
              after: ".",
            },
          ],
          tipKo: "‘-(으)ㄴ/는 체하다’도 같은 뜻이에요.",
          tipTranslation:
            "Kadang kamu liat -(으)ㄴ/는 체하다. Artinya sama, cuma lebih jarang di obrolan.",
          theme: "blue",
        }),
        h3("Artinya apa sih?"),
        p(
          "Dua kata Indonesia sekaligus: ",
          b("pura-pura"),
          " dan ",
          b("sok"),
          ". ‘Pura-pura tidur’ = 자는 척하다. ‘Sok sibuk’ = 바쁜 척하다. ‘Sok tau’ = 아는 척하다.",
        ),
        h3("Contoh"),
        ex(
          "사장님이 오니까 다들 바쁜 척했어요 ㅋㅋ",
          "Begitu bos dateng, semua langsung sok sibuk wkwk.",
        ),
        ex(
          "친구가 불렀는데 못 들은 척했어요.",
          "Temen manggil, tapi aku pura-pura nggak denger.",
        ),
        ex(
          "동생이 엄마 오니까 자는 척해요.",
          "Adikku pura-pura tidur begitu mama dateng.",
        ),
        ex("모르면서 아는 척하지 마.", "Nggak tau ya jangan sok tau.", "반말"),
        ex(
          "괜찮은 척했지만 사실 많이 힘들었어요.",
          "Aku pura-pura baik-baik aja, padahal sebenernya berat banget.",
        ),
        callout(
          "warning",
          "Jebakan: 아는 척하다 punya dua arti. Bisa ‘sok tau’, tapi juga ‘nyapa orang yang kamu kenal’. 왜 아까 아는 척 안 했어? = ‘Kok tadi nggak nyapa?’. Begitu juga 모르는 척하다 = ‘pura-pura nggak kenal’ atau ‘cuekin’. Liat konteksnya.",
        ),
        p(
          "Bagian depan 척 ngikutin aturan yang sama kayak ",
          ref("-(으)ㄴ/는 것 같다", "ki-akhiran-rasa", "geot-gatda"),
          ". Kalau kamu udah lancar yang itu, -척하다 tinggal ganti ujungnya.",
        ),
        callout(
          "tip",
          "Latihan dari arah Indonesia: ",
          ref("pura-pura", "ik-andai", "pura-pura"),
          ".",
        ),
        h3("Coba bikin sendiri"),
        bullet("Dia pura-pura nggak tau. (모르다)"),
        bullet("Jangan sok kuat. (강하다)"),
        callout("success", "모르는 척했어요. / 강한 척하지 마세요."),
      ],
    },
  ],
  outro: [
    h3("Rangkuman"),
    table([
      ["Pola", "Indonesia", "Contoh"],
      ["-아/어 보다", "coba / pernah (lampau)", "먹어 보세요 / 가 봤어요"],
      ["-(으)ㄴ 적이 있다", "pernah", "본 적이 없어요"],
      ["-고 있다", "lagi (aksi)", "먹고 있어요"],
      ["-아/어 있다", "dalam keadaan, ter-", "앉아 있어요, 열려 있어요"],
      ["-아/어 버리다", "terlanjur, keburu, ke-an", "다 먹어 버렸어요"],
      ["-게 되다", "jadi (kata kerja), akhirnya", "일하게 됐어요"],
      ["-아/어지다", "jadi (kata sifat), makin", "추워졌어요"],
      ["-(으)ㄹ 뻔했다", "hampir (nggak jadi)", "넘어질 뻔했어요"],
      ["-(으)ㄴ/는 척하다", "pura-pura, sok", "바쁜 척했어요"],
    ]),
    h3("Latihan kilat"),
    bullet("Lagi duduk di kursi. → 의자에 (앉다 ___)."),
    bullet("Lagi nonton drakor. → 드라마를 (보다 ___)."),
    bullet("Hampir ketinggalan kereta. → 기차를 (놓치다 ___)."),
    bullet("Cuacanya jadi panas. → 날씨가 (덥다 ___)."),
    callout(
      "success",
      "앉아 있어요 · 보고 있어요 · 놓칠 뻔했어요 · 더워졌어요",
    ),
    p(
      "Udah kebayang bedanya video (-고 있다) sama foto (-아/어 있다)? Gas tes di kuis. Salah dikit nggak apa-apa, ulang aja.",
    ),
    quizRef(),
  ],
  quiz: {
    title: "Kuis: Pengalaman dan keadaan",
    description:
      "12 soal pilihan ganda: coba, pernah, lagi, dalam keadaan, keburu, jadi, hampir, dan pura-pura. Lulus kalau benar minimal 70%.",
    passingScore: 70,
    questions: [
      {
        key: "keadaan-a-itda-anja",
        prompt: "‘Minsu lagi duduk di sana.’ Yang bener?",
        options: [
          { text: "민수 씨는 저기 앉아 있어요.", correct: true },
          { text: "민수 씨는 저기 앉고 있어요." },
          { text: "민수 씨는 저기 앉아 봤어요." },
          { text: "민수 씨는 저기 앉게 됐어요." },
        ],
        explanation:
          "Duduk itu keadaan setelah aksinya selesai, jadi pakai -아/어 있다. 앉고 있어요 malah kedengeran kayak ‘lagi dalam proses duduk’.",
      },
      {
        key: "keadaan-go-itda-meokda",
        prompt: "‘Lagi makan nih, nanti aku telepon ya.’ Bagian pertamanya?",
        options: [
          { text: "지금 밥 먹고 있어요.", correct: true },
          { text: "지금 밥 먹어 있어요." },
          { text: "지금 밥 먹어 버렸어요." },
          { text: "지금 밥 먹은 적이 있어요." },
        ],
        explanation:
          "Makan itu aksi yang lagi jalan, jadi -고 있다. Kata kerja yang punya objek (먹다, 보다) nggak bisa pakai -아/어 있다.",
      },
      {
        key: "keadaan-go-itda-pakaian",
        prompt: "‘Orang yang lagi pakai masker itu 반장님.’ Yang bener?",
        options: [
          { text: "마스크를 쓰고 있는 사람이 반장님이에요.", correct: true },
          { text: "마스크를 써 있는 사람이 반장님이에요." },
          { text: "마스크가 쓰여 있는 사람이 반장님이에요." },
        ],
        explanation:
          "Pakaian pengecualian: ‘lagi pakai’ baju, topi, masker selalu -고 있다. 쓰여 있다 artinya ‘tertulis’, beda jauh.",
      },
      {
        key: "keadaan-a-itda-mun",
        prompt: "Kamu liat pintu gudang lagi kebuka. Kamu bilang ke 반장님:",
        options: [
          { text: "창고 문이 열려 있어요.", correct: true },
          { text: "창고 문이 열어 있어요." },
          { text: "창고 문을 열어 봤어요." },
          { text: "창고 문을 열고 있어요." },
        ],
        explanation:
          "Pintu dalam keadaan terbuka = 열려 있다 (dari 열리다, ‘terbuka’). 열어 있다 salah karena 열다 punya objek, dan 문을 열고 있어요 artinya ada orang yang lagi ngebuka pintunya.",
      },
      {
        key: "keadaan-a-boda-lampau",
        prompt: "Temen nanya, kamu jawab ‘제주도에 가 봤어요.’ Artinya?",
        options: [
          { text: "Aku pernah ke Jeju.", correct: true },
          { text: "Aku lagi nyoba ke Jeju sekarang." },
          { text: "Aku hampir ke Jeju." },
          { text: "Aku jadi ke Jeju." },
        ],
        explanation:
          "-아/어 보다 dalam bentuk lampau artinya ‘pernah’, bukan ‘udah nyoba’. Sama kayak 가 본 적이 있어요.",
      },
      {
        key: "keadaan-eun-jeok-salju",
        prompt: "‘Aku belum pernah liat salju.’ Yang bener?",
        options: [
          { text: "저는 눈을 본 적이 없어요.", correct: true },
          { text: "저는 눈을 보고 있지 않아요." },
          { text: "저는 눈을 볼 뻔했어요." },
          { text: "저는 눈을 본 척했어요." },
        ],
        explanation:
          "‘Belum pernah’ tetap pakai -(으)ㄴ 적이 없다. Mau negesin ‘belum’, tambahin 아직: 아직 본 적이 없어요.",
      },
      {
        key: "keadaan-a-beorida-kue",
        prompt: "‘Kueku keburu diabisin adikku.’ Yang paling pas rasanya?",
        options: [
          { text: "동생이 제 케이크를 다 먹어 버렸어요.", correct: true },
          { text: "동생이 제 케이크를 다 먹게 됐어요." },
          { text: "동생이 제 케이크를 다 먹고 있어요." },
          { text: "동생이 제 케이크를 다 먹을 뻔했어요." },
        ],
        explanation:
          "‘Keburu, abis deh, nggak bisa dibalikin’ = -아/어 버리다. 먹을 뻔했어요 malah artinya hampir dimakan tapi nggak jadi.",
      },
      {
        key: "keadaan-ge-doeda-suka",
        prompt:
          "‘Gara-gara drakor, aku jadi suka bahasa Korea.’ Bagian akhirnya?",
        options: [
          { text: "한국어를 좋아하게 됐어요.", correct: true },
          { text: "한국어를 좋아해졌어요." },
          { text: "한국어가 좋아졌어요." },
          { text: "한국어를 좋아해 버렸어요." },
        ],
        explanation:
          "‘Jadi’ buat kata kerja (좋아하다) = -게 되다. 좋아졌어요 artinya ‘jadi lebih baik’ (kondisi, skill), bukan ‘jadi suka’.",
      },
      {
        key: "keadaan-ajida-dingin",
        prompt: "‘Masuk November, udah jadi dingin banget.’ Bagian akhirnya?",
        options: [
          { text: "날씨가 많이 추워졌어요.", correct: true },
          { text: "날씨가 많이 춥게 됐어요." },
          { text: "날씨가 많이 추워 있어요." },
          { text: "날씨가 많이 춥고 있어요." },
        ],
        explanation:
          "‘Jadi’ buat kata sifat = -아/어지다. 춥다 → 추워지다 (ㅂ jadi 워). Kata kerja → -게 되다, kata sifat → -아/어지다.",
      },
      {
        key: "keadaan-ppeon-jatuh",
        prompt:
          "‘Hampir jatuh di subway’ (tapi untungnya nggak jatuh). Yang bener?",
        options: [
          { text: "지하철에서 넘어질 뻔했어요.", correct: true },
          { text: "지하철에서 거의 넘어졌어요." },
          { text: "지하철에서 넘어져 버렸어요." },
          { text: "지하철에서 넘어지고 있었어요." },
        ],
        explanation:
          "Nyaris terjadi tapi nggak = -(으)ㄹ 뻔했다. 거의 넘어졌어요 bikin orang Korea bingung: jadi kamu jatuh atau nggak?",
      },
      {
        key: "keadaan-cheok-sibuk",
        prompt:
          "‘Begitu bos dateng, semua langsung sok sibuk.’ Bagian akhirnya?",
        options: [
          { text: "다들 바쁜 척했어요.", correct: true },
          { text: "다들 바쁘는 척했어요." },
          { text: "다들 바빠졌어요." },
          { text: "다들 바쁘게 됐어요." },
        ],
        explanation:
          "Pura-pura / sok = -(으)ㄴ/는 척하다. Kata sifat pakai -(으)ㄴ: 바쁜 척. 바빠졌어요 artinya beneran jadi sibuk, bukan pura-pura.",
      },
      {
        key: "keadaan-ge-doeda-perkenalan",
        prompt:
          "Hari pertama kerja, kamu mau perkenalan yang sopan dan rendah hati. Yang paling pas?",
        options: [
          {
            text: "이번에 같이 일하게 된 리나입니다. 잘 부탁드립니다.",
            correct: true,
          },
          { text: "이번에 같이 일해 본 리나입니다. 잘 부탁드립니다." },
          { text: "이번에 같이 일해 버린 리나입니다. 잘 부탁드립니다." },
        ],
        explanation:
          "-게 되다 bikin kesannya ‘aku jadi kerja di sini’ (karena keadaan), bukan ‘aku memutuskan’. Ini kalimat perkenalan standar di tempat kerja Korea.",
      },
    ],
  },
});
