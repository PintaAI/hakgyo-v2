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
  key: "ki-bisa-harus",
  title: "Bisa, harus, boleh",
  description:
    "Pengen, bisa, bisa (karena tahu caranya), harus, boleh, nggak boleh, nggak usah, dan mutusin. Satu kata Indonesia sering punya dua-tiga pola Korea, jadi di sini kita bedah satu-satu.",
  intro: [
    opener({
      eyebrow: "PAHAM POLA · BAB 4",
      chapterNumber: "04",
      titleKo: "할 수 있다, 해야 한다",
      subtitle:
        "Bisa, harus, boleh, nggak usah: biar nggak salah paham sama 사장님.",
      question: "반장님, 내일도 꼭 와야 돼요?",
      answer: "아니요, 내일은 안 와도 돼요. 쉬세요!",
      focus: [
        {
          label: "문법 · Pola",
          title: "수 있다 · 줄 알다 · 아야 하다",
          description:
            "Dua macam “bisa” dan satu “harus” yang paling sering kamu denger.",
        },
        {
          label: "표현 · Kata kunci",
          title: "-아도 될까요? / 안 돼요",
          description:
            "Minta izin dengan halus dan paham jawabannya, boleh atau nggak.",
        },
        {
          label: "함정 · Jebakan",
          title: "안 와도 돼요 ≠ 오면 안 돼요",
          description:
            "“Nggak usah dateng” beda jauh sama “jangan dateng”. Jangan auto panik.",
        },
      ],
      objectives: [
        {
          ko: "상황에 맞게 ‘수 있다’와 ‘줄 알다’를 골라 쓸 수 있어요.",
          id: "Bisa milih “bisa” yang pas: 수 있다 atau 줄 알다.",
        },
        {
          ko: "허락, 의무, 금지, 불필요를 구별해서 말할 수 있어요.",
          id: "Bisa bedain boleh, harus, nggak boleh, dan nggak usah.",
        },
      ],
    }),
    p(
      "Kata ",
      i("“bisa”"),
      " itu jebakan nomor satu buat orang Indonesia. ",
      i("“Bisa dateng besok?”"),
      ", ",
      i("“Bisa nyetir?”"),
      ", dan ",
      i("“Bisa bahasa Korea?”"),
      " kedengeran sama, tapi di bahasa Korea polanya bisa beda.",
    ),
    p(
      "Hal yang sama terjadi sama ",
      i("“nggak boleh”"),
      " dan ",
      i("“nggak usah”"),
      ". Salah pilih sedikit, ",
      i("“nggak usah dateng”"),
      " bisa berubah jadi ",
      i("“jangan dateng”"),
      ". Di tempat kerja, itu bisa bikin salah paham sama 사장님.",
    ),
    p("Di materi ini kamu bakal belajar:"),
    bullet(b("Keinginan"), ": pengen (-고 싶다)."),
    bullet(
      b("Kemampuan"),
      ": bisa (-(으)ㄹ 수 있다) vs bisa karena tahu caranya (-(으)ㄹ 줄 알다).",
    ),
    bullet(
      b("Kewajiban dan izin"),
      ": harus (-아야 하다), boleh (-아도 되다), nggak boleh (-(으)면 안 되다), nggak usah (-지 않아도 되다).",
    ),
    bullet(b("Keputusan"), ": mutusin, janjian, nggak jadi (-기로 하다)."),
    callout(
      "info",
      "Banyak pola di sini memakai bentuk -아/어 yang sama kayak -아요/어요. Kalau kamu udah lancar 먹어요, 가요, 해요, separuh kerjaanmu udah beres.",
    ),
  ],
  sections: [
    // ─────────────────────────────────────────────── -고 싶다
    {
      key: "go-sipda",
      title: "-고 싶다: pengen, mau",
      blocks: [
        grammar({
          number: "01",
          title: "-고 싶다 / -고 싶어 하다",
          theme: "green",
          descriptionKo: "하고 싶은 일이나 바라는 것을 말할 때 써요.",
          descriptionTranslation:
            "Artinya “pengen” atau “mau”. Tempel -고 싶다 ke kata kerja, bentuknya sama buat semua. Kalau yang pengen orang lain (dia, temenku, adikku), ganti jadi -고 싶어 하다.",
          rules: [
            {
              condition: "Akhiran vokal",
              form: "-고 싶어요",
              example: "가다 → 가고 싶어요",
            },
            {
              condition: "Akhiran konsonan",
              form: "-고 싶어요",
              example: "먹다 → 먹고 싶어요",
            },
            {
              condition: "하다",
              form: "-하고 싶어요",
              example: "일하다 → 일하고 싶어요",
            },
            {
              condition: "Lampau",
              form: "-고 싶었어요",
              example: "보고 싶었어요",
            },
            {
              condition: "Negatif",
              form: "안 -고 싶어요 / -고 싶지 않아요",
              example: "가고 싶지 않아요",
            },
            {
              condition: "Orang ketiga",
              form: "-고 싶어 하다",
              example: "동생이 가고 싶어 해요",
            },
            {
              condition: "Kata sifat",
              form: "-아/어지고 싶다",
              example: "날씬하다 → 날씬해지고 싶어요",
            },
            {
              condition: "반말",
              form: "-고 싶어 / -고 싶다!",
              example: "먹고 싶다!",
            },
          ],
          examples: [
            { before: "한국에서 일하", emphasis: "고 싶어요", after: "." },
            { before: "엄마가 보", emphasis: "고 싶어요", after: "." },
            { before: "떡볶이 먹", emphasis: "고 싶다", after: "!" },
            {
              before: "친구가 한국 화장품을 사",
              emphasis: "고 싶어 해요",
              after: ".",
            },
          ],
          tipKo: "보고 싶다는 ‘그립다’라는 뜻으로 많이 써요.",
          tipTranslation:
            "보고 싶어요 artinya bukan cuma “pengen liat”, tapi juga “kangen”. Kalimat wajib buat video call sama keluarga.",
        }),
        p(
          b("Artinya apa sih?"),
          " Sama kayak ",
          i("“pengen”"),
          ". Yang perlu diinget cuma dua: orang Korea jarang langsung bilang ",
          i("“dia pengen”"),
          " pakai -고 싶다, karena kita nggak bisa tahu isi hati orang lain. Jadi mereka bilang ",
          i("“dia keliatan pengen”"),
          ": ",
          b("-고 싶어 하다"),
          ".",
        ),
        h3("Contoh"),
        ex("한국에서 일하고 싶어요.", "Aku pengen kerja di Korea."),
        ex("엄마가 보고 싶어요.", "Aku kangen ibu.", "video call sama rumah"),
        ex("주말에는 그냥 쉬고 싶어요.", "Weekend aku pengen rebahan aja."),
        ex("떡볶이 먹고 싶다!", "Pengen tteokbokki!", "반말, ngomong sendiri"),
        ex(
          "제 친구가 한국 화장품을 사고 싶어 해요.",
          "Temenku pengen beli skincare Korea.",
        ),
        ex(
          "오늘은 아무것도 하기 싫어요.",
          "Hari ini lagi nggak pengen ngapa-ngapain.",
          "kebalikannya: -기 싫다",
        ),
        callout(
          "warning",
          "Jebakan: ",
          i("“Aku pengen kamu dateng”"),
          " bukan ✗ 네가 오고 싶어. -고 싶다 cuma buat keinginan si pembicara sendiri. Kalau keinginannya buat orang lain, pakai ",
          b("-았/었으면 좋겠다"),
          ": ",
          b("네가 왔으면 좋겠어"),
          ". Jebakan kedua: ",
          i("“pengen kurus”"),
          " itu kata sifat, jadi harus pakai -아/어지다: ",
          b("날씬해지고 싶어요"),
          ", bukan ✗ 날씬하고 싶어요.",
        ),
        h3("Ngobrol: rencana weekend"),
        ...chat(
          [
            {
              who: "민지",
              ko: "주말에 뭐 하고 싶어요?",
              id: "Weekend pengen ngapain?",
            },
            {
              who: "Andi",
              ko: "그냥 쉬고 싶어요. 요즘 너무 피곤해요.",
              id: "Pengen rebahan aja. Akhir-akhir ini capek banget.",
            },
            {
              who: "민지",
              ko: "그럼 일요일에 같이 떡볶이 먹으러 갈래요?",
              id: "Kalau gitu, Minggu mau makan tteokbokki bareng?",
            },
            {
              who: "Andi",
              ko: "좋아요! 제 친구도 떡볶이 먹고 싶어 했어요. 같이 가도 돼요?",
              id: "Boleh! Temenku juga pengen tteokbokki. Dia boleh ikut?",
            },
            { who: "민지", ko: "당연하죠!", id: "Ya boleh dong!" },
          ],
          {
            theme: "green",
            questions: [
              {
                ko: "Andi는 주말에 뭐 하고 싶어요?",
                id: "Weekend ini Andi pengen ngapain?",
              },
              {
                ko: "Andi 친구는 뭘 먹고 싶어 했어요?",
                id: "Temennya Andi pengen makan apa?",
              },
            ],
            tip: {
              title: "싶어요 vs 싶어 해요",
              ko: "내 마음은 ‘-고 싶어요’, 다른 사람 마음은 ‘-고 싶어 해요’로 말해요.",
              id: "Keinginan sendiri pakai -고 싶어요. Keinginan orang lain pakai -고 싶어 해요, kayak 친구도 먹고 싶어 했어요.",
            },
          },
        ),
        h3("Bandingin sama pola mirip"),
        bullet(
          ref("-(으)ㄹ래요", "ki-minta-ajak", "eullaeyo"),
          ": ",
          i("“aku mau … (aja)”"),
          " buat milih sesuatu sekarang. 라면 먹을래요 = aku pilih ramyeon. 라면 먹고 싶어요 = aku lagi pengen ramyeon.",
        ),
        bullet(
          ref("-(으)려고", "ki-alasan-urutan", "ryeogo"),
          ": ",
          i("“biar, supaya”"),
          ", buat niat yang lagi dijalanin. 한국에 가려고 공부해요 = belajar biar bisa ke Korea.",
        ),
        callout(
          "tip",
          "Pengen sesuatu yang udah lewat (",
          i("“coba kemarin kamu dateng”"),
          ")? Itu masuk andai-andai, cek ",
          ref("kalau aja", "ik-andai", "kalau-aja"),
          " dan pola ",
          ref("-았/었으면 좋았을 텐데", "ki-andai", "asseumyeon-teonde"),
          ".",
        ),
      ],
    },

    // ─────────────────────────────────────────────── -(으)ㄹ 수 있다
    {
      key: "eul-su-itda",
      title: "-(으)ㄹ 수 있다/없다: bisa, sempat, memungkinkan",
      blocks: [
        grammar({
          number: "02",
          title: "-(으)ㄹ 수 있다 / 없다",
          theme: "green",
          descriptionKo:
            "어떤 일이 가능한지, 할 능력이나 상황이 되는지 말할 때 써요.",
          descriptionTranslation:
            "Artinya “bisa” dalam arti paling luas: mampu, ada kesempatan, keadaannya memungkinkan. Kebalikannya -(으)ㄹ 수 없다 (nggak bisa). Di obrolan sehari-hari, “nggak bisa” lebih sering cukup pakai 못.",
          rules: [
            {
              condition: "Akhiran vokal",
              form: "-ㄹ 수 있어요",
              example: "가다 → 갈 수 있어요",
            },
            {
              condition: "Akhiran konsonan",
              form: "-을 수 있어요",
              example: "먹다 → 먹을 수 있어요",
            },
            {
              condition: "Akhiran ㄹ",
              form: "langsung + 수 있어요",
              example: "만들다 → 만들 수 있어요",
            },
            {
              condition: "하다",
              form: "할 수 있어요",
              example: "운전하다 → 운전할 수 있어요",
            },
            {
              condition: "ㄷ tak beraturan",
              form: "ㄷ → ㄹ + -을 수",
              example: "듣다 → 들을 수 있어요",
            },
            {
              condition: "ㅂ tak beraturan",
              form: "ㅂ → 우 + -ㄹ 수",
              example: "돕다 → 도울 수 있어요",
            },
            {
              condition: "Negatif",
              form: "-(으)ㄹ 수 없어요",
              example: "갈 수 없어요",
            },
            {
              condition: "Negatif (ngobrol)",
              form: "못 + kata kerja",
              example: "못 가요",
            },
            {
              condition: "Lampau",
              form: "-(으)ㄹ 수 있었어요",
              example: "만날 수 있었어요",
            },
          ],
          examples: [
            {
              before: "내일 아침 일찍 오",
              emphasis: "ㄹ 수 있어요",
              after: "?",
            },
            {
              before: "저는 돼지고기를 먹",
              emphasis: "을 수 없어요",
              after: ".",
            },
            {
              before: "여기서 와이파이 쓸",
              emphasis: " 수 있어요",
              after: "?",
            },
            { before: "그럴", emphasis: " 수 있지", after: "." },
          ],
          tipKo: "‘그럴 수 있어’는 ‘이해한다’는 뜻으로도 써요.",
          tipTranslation:
            "그럴 수 있지 = “ya wajar sih, bisa aja kejadian”. Respons santai yang green flag banget.",
        }),
        p(
          b("Artinya apa sih?"),
          " Ini ",
          i("“bisa”"),
          " serba guna: ",
          i("“Bisa dateng pagi?”"),
          ", ",
          i("“Di sini bisa pakai wifi?”"),
          ", ",
          i("“Aku nggak bisa makan babi.”"),
          " Intinya: mungkin atau nggak mungkin.",
        ),
        h3("Contoh"),
        ex(
          "내일 아침 일찍 올 수 있어요?",
          "Besok pagi bisa dateng lebih awal?",
          "사장님 ke pekerja",
        ),
        ex(
          "저는 무슬림이라서 돼지고기를 먹을 수 없어요.",
          "Aku muslim, jadi nggak bisa makan babi.",
        ),
        ex(
          "이 상자는 너무 무거워서 혼자 들 수 없어요.",
          "Kardus ini berat banget, nggak bisa diangkat sendirian.",
        ),
        ex(
          "여기서 와이파이 쓸 수 있어요?",
          "Di sini bisa pakai wifi?",
          "di kafe",
        ),
        ex(
          "오늘은 바빠서 못 만나요.",
          "Hari ini sibuk, jadi nggak bisa ketemu.",
          "versi ngobrol pakai 못",
        ),
        ex(
          "그럴 수 있지. 신경 쓰지 마.",
          "Wajar kok. Nggak usah dipikirin.",
          "반말",
        ),
        callout(
          "warning",
          "Jebakan: ",
          i("“Bisa bahasa Korea?”"),
          " jarang ditanya pakai 한국어 할 수 있어요?. Itu kedengeran kayak ",
          i("“kamu mampu nggak sih?”"),
          ". Orang Korea biasanya nanya ",
          b("한국어 할 줄 알아요?"),
          " atau langsung ",
          b("한국어 잘하세요?"),
          ". Jebakan kedua: spasi. 갈 수 있어요 (dipisah) beda sama 갈수록 (nempel, artinya ",
          i("“makin lama”"),
          ").",
        ),
        h3("Bandingin sama pola mirip"),
        p(
          "Pasangan paling sering ketuker: -(으)ㄹ 수 있다 dan ",
          ref("-(으)ㄹ 줄 알다", "ki-bisa-harus", "eul-jul-alda"),
          ". Tabel lengkapnya ada di bagian itu. Versi singkatnya: 수 있다 = mungkin/mampu, 줄 알다 = tahu caranya.",
        ),
        callout(
          "tip",
          "“Nggak sempet makan” juga “nggak bisa” versi waktu. Cara ngomongnya ada di ",
          ref("sempat", "ik-waktu", "sempat"),
          ".",
        ),
        h3("Coba bikin sendiri"),
        p(
          "Tanya ke 반장님: ",
          i("“Besok saya bisa libur?”"),
          " (libur = 쉬다)",
        ),
        callout(
          "success",
          "Jawaban: ",
          b("반장님, 내일 쉴 수 있을까요?"),
          " Pakai -(으)ㄹ까요 di ujung biar lebih halus.",
        ),
      ],
    },

    // ─────────────────────────────────────────────── -(으)ㄹ 줄 알다
    {
      key: "eul-jul-alda",
      title: "-(으)ㄹ 줄 알다/모르다: bisa (tahu caranya)",
      blocks: [
        grammar({
          number: "03",
          title: "-(으)ㄹ 줄 알다 / 모르다",
          theme: "green",
          descriptionKo: "어떤 일을 하는 방법을 알고 있는지 말할 때 써요.",
          descriptionTranslation:
            "Artinya “bisa” dalam arti “tahu caranya, punya skill”: nyetir, berenang, masak, baca Hangeul. Kebalikannya -(으)ㄹ 줄 모르다. Cara nempelnya sama persis kayak -(으)ㄹ 수 있다.",
          rules: [
            {
              condition: "Akhiran vokal",
              form: "-ㄹ 줄 알아요",
              example: "타다 → 탈 줄 알아요",
            },
            {
              condition: "Akhiran konsonan",
              form: "-을 줄 알아요",
              example: "읽다 → 읽을 줄 알아요",
            },
            {
              condition: "Akhiran ㄹ",
              form: "langsung + 줄 알아요",
              example: "만들다 → 만들 줄 알아요",
            },
            {
              condition: "하다",
              form: "할 줄 알아요",
              example: "운전하다 → 운전할 줄 알아요",
            },
            {
              condition: "Negatif",
              form: "-(으)ㄹ 줄 몰라요",
              example: "수영할 줄 몰라요",
            },
            {
              condition: "Arti lain: “kirain”",
              form: "-(으)ㄹ 줄 알았어요",
              example: "비가 올 줄 알았어요",
            },
            {
              condition: "Arti lain: “nggak nyangka”",
              form: "-(으)ㄹ 줄 몰랐어요",
              example: "이렇게 추울 줄 몰랐어요",
            },
          ],
          examples: [
            { before: "운전", emphasis: "할 줄 알아요", after: "?" },
            { before: "김치찌개 끓일", emphasis: " 줄 알아요", after: "." },
            { before: "수영", emphasis: "할 줄 몰라요", after: "." },
            {
              before: "한국 겨울이 이렇게 추울",
              emphasis: " 줄 몰랐어요",
              after: ".",
            },
          ],
          tipKo: "과거형 ‘-(으)ㄹ 줄 몰랐어요’는 ‘예상 못 했다’는 뜻이에요.",
          tipTranslation:
            "Bentuk lampau bukan soal skill lagi. 이렇게 추울 줄 몰랐어요 = “nggak nyangka bakal sedingin ini”.",
        }),
        p(
          b("Artinya apa sih?"),
          " Ini ",
          i("“bisa”"),
          " yang nanya soal ",
          i("skill"),
          ". Pas wawancara kerja EPS, kamu bakal sering denger: ",
          b("지게차 운전할 줄 알아요?"),
          " (",
          i("“Bisa bawa forklift?”"),
          ").",
        ),
        h3("Contoh"),
        ex(
          "지게차 운전할 줄 알아요?",
          "Bisa bawa forklift?",
          "wawancara kerja",
        ),
        ex("저는 김치찌개 끓일 줄 알아요.", "Aku bisa masak kimchi jjigae."),
        ex(
          "한글은 읽을 줄 아는데 말하기는 아직 서툴러요.",
          "Hangeul sih bisa baca, tapi ngomongnya masih kaku.",
        ),
        ex("수영할 줄 몰라요.", "Aku nggak bisa berenang."),
        ex(
          "한국 겨울이 이렇게 추울 줄 몰랐어요.",
          "Nggak nyangka musim dingin Korea sedingin ini.",
        ),
        ex("네가 올 줄 알았어.", "Udah kuduga kamu bakal dateng.", "반말"),
        callout(
          "warning",
          "Jebakan: -(으)ㄹ 줄 알다 cuma buat skill. ",
          i("“Besok bisa dateng?”"),
          " itu soal jadwal, bukan skill, jadi pakai ",
          b("내일 올 수 있어요?"),
          ". Kalau kamu bilang ✗ 내일 올 줄 알아요?, artinya jadi aneh (",
          i("“kamu tahu caranya dateng besok?”"),
          ").",
        ),
        h3("Ngobrol: wawancara kerja"),
        ...chat(
          [
            {
              who: "면접관",
              ko: "한국어 할 줄 알아요?",
              id: "Bisa bahasa Korea?",
            },
            {
              who: "Andi",
              ko: "네, 조금 할 줄 알아요.",
              id: "Iya, bisa dikit.",
            },
            {
              who: "면접관",
              ko: "지게차 운전할 줄 알아요?",
              id: "Bisa bawa forklift?",
            },
            {
              who: "Andi",
              ko: "아니요, 아직 할 줄 몰라요. 그래도 빨리 배울 수 있어요.",
              id: "Belum bisa. Tapi saya bisa belajar cepet.",
            },
            {
              who: "면접관",
              ko: "주말에도 일할 수 있어요?",
              id: "Weekend juga bisa kerja?",
            },
            { who: "Andi", ko: "네, 할 수 있어요.", id: "Iya, bisa." },
          ],
          {
            theme: "blue",
            questions: [
              {
                ko: "Andi는 지게차를 운전할 줄 알아요?",
                id: "Andi bisa bawa forklift nggak?",
              },
              {
                ko: "Andi는 주말에도 일할 수 있어요?",
                id: "Andi bisa kerja pas weekend?",
              },
            ],
            tip: {
              title: "기술 vs 상황",
              ko: "기술은 ‘줄 알아요?’, 일정이나 상황은 ‘수 있어요?’로 물어봐요.",
              id: "Skill (forklift, bahasa) ditanya pakai 줄 알아요?. Jadwal dan keadaan (weekend, besok) pakai 수 있어요?.",
            },
          },
        ),
        h3("Bandingin: dua-duanya “bisa”"),
        table([
          [
            "Situasi",
            ref("-(으)ㄹ 수 있다", "ki-bisa-harus", "eul-su-itda"),
            "-(으)ㄹ 줄 알다",
          ],
          [
            "Bisa nyetir? (skill)",
            "운전할 수 있어요? (boleh juga)",
            "운전할 줄 알아요? (paling natural)",
          ],
          ["Besok bisa dateng? (jadwal)", "내일 올 수 있어요? ✓", "✗"],
          ["Habis minum, bisa nyetir? (keadaan)", "운전할 수 있어요? ✓", "✗"],
          ["Bisa makan pedes? (kuat/mampu)", "매운 거 먹을 수 있어요? ✓", "✗"],
        ]),
        callout(
          "tip",
          "Gampangnya: kalau bisa diganti ",
          i("“tahu caranya”"),
          ", pakai 줄 알다. Kalau nggak, pakai 수 있다.",
        ),
      ],
    },

    // ─────────────────────────────────────────────── -아야 하다
    {
      key: "aya-hada",
      title: "-아야/어야 하다/되다: harus",
      blocks: [
        grammar({
          number: "04",
          title: "-아야/어야 하다 / 되다",
          theme: "green",
          descriptionKo: "꼭 해야 하는 일이나 의무를 말할 때 써요.",
          descriptionTranslation:
            "Artinya “harus” atau “wajib”. Cara nempelnya ikut -아요/어요: ganti 요 jadi 야, lalu tambah 해요 atau 돼요. 해야 해요 dan 해야 돼요 artinya sama. Di obrolan, 돼요 lebih sering kedengeran.",
          rules: [
            {
              condition: "Vokal ㅏ/ㅗ",
              form: "-아야 해요/돼요",
              example: "가다 → 가야 돼요",
            },
            {
              condition: "Vokal lain",
              form: "-어야 해요/돼요",
              example: "먹다 → 먹어야 해요",
            },
            {
              condition: "하다",
              form: "해야 해요/돼요",
              example: "일하다 → 일해야 돼요",
            },
            {
              condition: "ㅂ tak beraturan",
              form: "ㅂ → 워 + 야",
              example: "줍다 → 주워야 돼요",
            },
            {
              condition: "ㄷ tak beraturan",
              form: "-어야",
              example: "걷다 → 걸어야 돼요",
            },
            {
              condition: "르 tak beraturan",
              form: "-라야/러야",
              example: "부르다 → 불러야 돼요",
            },
            {
              condition: "Kata benda",
              form: "-이어야/여야 해요",
              example: "학생 → 학생이어야 해요",
            },
            {
              condition: "Lampau",
              form: "-아야/어야 했어요",
              example: "가야 했어요",
            },
            {
              condition: "반말 (niat sendiri)",
              form: "-아야지/어야지",
              example: "가야지",
            },
          ],
          examples: [
            { before: "내일 7시까지 출근", emphasis: "해야 돼요", after: "." },
            {
              before: "일할 때는 안전화를 신",
              emphasis: "어야 해요",
              after: ".",
            },
            { before: "비자를 연장", emphasis: "해야 돼요", after: "." },
            { before: "이번 달에는 돈을 아껴", emphasis: "야 돼", after: "." },
          ],
          tipKo: "‘-아야지’는 스스로 다짐할 때 써요.",
          tipTranslation:
            "이제 진짜 공부해야지 = “oke, sekarang aku beneran harus belajar deh”. Ngomong ke diri sendiri, kayak niat diet tiap Senin.",
        }),
        p(
          b("Artinya apa sih?"),
          " ",
          i("“Harus”"),
          ", ",
          i("“wajib”"),
          ", ",
          i("“mesti”"),
          ". Aturan pabrik, tugas kuliah, perpanjang visa, semuanya pakai pola ini.",
        ),
        h3("Contoh"),
        ex(
          "내일 아침 7시까지 출근해야 돼요.",
          "Besok jam 7 pagi udah harus masuk kerja.",
        ),
        ex(
          "일할 때는 안전화를 신어야 해요.",
          "Pas kerja wajib pakai sepatu safety.",
          "aturan pabrik",
        ),
        ex("비자를 연장해야 돼요.", "Aku harus perpanjang visa."),
        ex(
          "기도하러 가야 돼요. 금방 올게요.",
          "Aku harus salat dulu. Bentar lagi balik kok.",
        ),
        ex("과제를 오늘까지 내야 해요.", "Tugasnya harus dikumpulin hari ini."),
        ex(
          "이번 달에는 돈을 아껴야 돼.",
          "Bulan ini aku harus hemat.",
          "반말, abis kirim uang ke rumah",
        ),
        callout(
          "warning",
          "Jebakan: ",
          i("“nggak harus”"),
          " itu bukan ✗ 안 해야 돼요. Kalimat itu artinya ",
          i("“harus nggak ngelakuin”"),
          " dan jarang dipakai. Buat ",
          i("“nggak harus / nggak usah”"),
          ", pakai ",
          ref("-지 않아도 되다", "ki-bisa-harus", "ji-anado-doeda"),
          ": 안 해도 돼요. Buat ",
          i("“nggak boleh”"),
          ", pakai ",
          ref("-(으)면 안 되다", "ki-bisa-harus", "myeon-an-doeda"),
          ".",
        ),
        h3("Bandingin sama pola mirip"),
        p(
          "Kalau ",
          i("“harus”"),
          "-nya udah telat (",
          i("“harusnya tadi bawa payung”"),
          "), pakai bentuk penyesalan ",
          ref("-았/었어야 했는데", "ki-andai", "asseoya"),
          ": 우산을 가져왔어야 했는데.",
        ),
        callout(
          "tip",
          "Praktik bilang ",
          i("“harusnya”"),
          " ada di ",
          ref("harusnya", "ik-andai", "harusnya"),
          ". Bentuk -아야지 juga muncul di ",
          ref("mumpung", "ik-alasan", "mumpung"),
          ": 한국에 있을 때 많이 놀러 다녀야지.",
        ),
        h3("Coba bikin sendiri"),
        p(
          "Bilang: ",
          i("“Aku harus kirim uang ke rumah hari ini.”"),
          " (kirim uang = 돈을 보내다, rumah = 집)",
        ),
        callout("success", "Jawaban: ", b("오늘 집에 돈을 보내야 돼요.")),
      ],
    },

    // ─────────────────────────────────────────────── -아도 되다
    {
      key: "ado-doeda",
      title: "-아도/어도 되다: boleh",
      blocks: [
        grammar({
          number: "05",
          title: "-아도/어도 되다",
          theme: "green",
          descriptionKo:
            "어떤 일을 해도 괜찮다고 허락하거나 허락을 구할 때 써요.",
          descriptionTranslation:
            "Artinya “boleh”. Bentuknya -아도/어도 (walaupun) + 되다, jadi secara harfiah “walaupun kamu …, nggak apa-apa”. Paling sering dipakai buat minta izin: … 돼요?",
          rules: [
            {
              condition: "Vokal ㅏ/ㅗ",
              form: "-아도 돼요",
              example: "앉다 → 앉아도 돼요",
            },
            {
              condition: "Vokal lain",
              form: "-어도 돼요",
              example: "먹다 → 먹어도 돼요",
            },
            {
              condition: "하다",
              form: "해도 돼요",
              example: "말하다 → 말해도 돼요",
            },
            {
              condition: "ㅂ tak beraturan",
              form: "-워도 돼요",
              example: "눕다 → 누워도 돼요",
            },
            {
              condition: "Minta izin halus",
              form: "-아도/어도 될까요?",
              example: "가도 될까요?",
            },
            {
              condition: "Variasi",
              form: "-아도 괜찮아요 / 좋아요",
              example: "열어도 괜찮아요?",
            },
            {
              condition: "반말",
              form: "-아도/어도 돼?",
              example: "먹어도 돼?",
            },
          ],
          examples: [
            { before: "사진 찍", emphasis: "어도 돼요", after: "?" },
            { before: "여기 앉", emphasis: "아도 돼요", after: "?" },
            { before: "잠깐 기도하고 와", emphasis: "도 될까요", after: "?" },
            { before: "이거 먹", emphasis: "어도 돼", after: "?" },
          ],
          tipKo: "‘돼요’가 맞고 ‘되요’는 틀린 맞춤법이에요.",
          tipTranslation:
            "Tulis 돼요 (dari 되어요), bukan 되요. Orang Korea sendiri sering salah ketik ini, tapi di ujian tetap dihitung salah.",
        }),
        p(
          b("Artinya apa sih?"),
          " ",
          i("“Boleh foto?”"),
          ", ",
          i("“Boleh duduk sini?”"),
          ", ",
          i("“Pak, boleh saya salat sebentar?”"),
          " Jawabannya: ",
          b("네, 돼요"),
          " / ",
          b("그럼요"),
          " (boleh) atau ",
          b("안 돼요"),
          " (nggak boleh).",
        ),
        h3("Contoh"),
        ex("사진 찍어도 돼요?", "Boleh foto?"),
        ex("여기 앉아도 돼요?", "Boleh duduk sini?", "di kafe yang penuh"),
        ex(
          "사장님, 잠깐 기도하고 와도 될까요?",
          "Pak, boleh saya salat sebentar?",
          "minta izin di tempat kerja",
        ),
        ex("창문 좀 열어도 괜찮아요?", "Jendelanya boleh aku buka?"),
        ex(
          "말 편하게 해도 돼요?",
          "Boleh ngomong santai aja?",
          "minta izin pakai 반말",
        ),
        ex("이거 먹어도 돼?", "Ini boleh aku makan?", "반말, ke roommate"),
        callout(
          "warning",
          "Jebakan: jawaban ",
          i("“nggak boleh”"),
          " itu ",
          b("안 돼요"),
          " atau ",
          b("-(으)면 안 돼요"),
          ". Jangan jawab ✗ 안 찍어도 돼요, karena itu artinya ",
          i("“nggak usah foto”"),
          ". Beda jauh: yang satu melarang, yang satu cuma bilang nggak perlu.",
        ),
        h3("Ngobrol: izin salat pas kerja"),
        ...chat(
          [
            {
              who: "Andi",
              ko: "반장님, 지금 잠깐 기도하고 와도 될까요?",
              id: "Pak, boleh saya salat sebentar sekarang?",
            },
            {
              who: "반장님",
              ko: "지금요? 얼마나 걸려요?",
              id: "Sekarang? Berapa lama?",
            },
            {
              who: "Andi",
              ko: "10분이면 돼요.",
              id: "Sepuluh menit cukup kok.",
            },
            {
              who: "반장님",
              ko: "그래요, 갔다 와요. 근데 기계는 끄고 가야 돼요.",
              id: "Oke, sana. Tapi mesinnya harus dimatiin dulu ya.",
            },
            {
              who: "Andi",
              ko: "네, 알겠습니다. 감사합니다!",
              id: "Siap, Pak. Makasih!",
            },
          ],
          {
            theme: "green",
            questions: [
              {
                ko: "Andi는 반장님한테 뭘 물어봤어요?",
                id: "Andi minta izin apa ke 반장님?",
              },
              {
                ko: "가기 전에 뭘 해야 돼요?",
                id: "Sebelum pergi, Andi harus ngapain?",
              },
            ],
            tip: {
              title: "될까요?로 더 부드럽게",
              ko: "윗사람한테 허락을 구할 때는 ‘-아도 돼요?’보다 ‘-아도 될까요?’가 더 부드러워요.",
              id: "Ke atasan, -아도 될까요? kedengeran lebih halus daripada -아도 돼요?. Rasanya kayak “kira-kira boleh nggak ya, Pak?”",
            },
          },
        ),
        culture({
          titleKo: "일터에서 허락 구하기",
          titleId: "Minta izin di tempat kerja Korea",
          paragraphs: [
            {
              ko: "한국 회사에서는 자리를 비울 때 먼저 반장님이나 사장님한테 말하는 게 예의예요. 말없이 자리를 비우면 문제가 될 수 있어요.",
              id: "Di tempat kerja Korea, kalau mau ninggalin posisi, sopannya bilang dulu ke 반장님 atau 사장님. Kalau ngilang tanpa bilang, bisa jadi masalah, apalagi di jalur produksi.",
            },
            {
              ko: "기도 시간이 필요하면 처음부터 솔직하게 말하세요. ‘하루에 두 번, 10분쯤 기도해야 돼요’처럼 시간을 구체적으로 말하면 이해하기 쉬워요.",
              id: "Kalau butuh waktu salat, bilang jujur dari awal. Sebutin waktunya dengan jelas, misalnya “sehari dua kali, sekitar 10 menit”. Atasan jadi gampang ngatur jadwal.",
            },
            {
              ko: "음식도 마찬가지예요. ‘저는 돼지고기를 먹으면 안 돼요’라고 미리 말하면 회식 때 메뉴를 같이 고를 수 있어요.",
              id: "Soal makanan juga sama. Bilang dari awal 저는 돼지고기를 먹으면 안 돼요, biar pas 회식 (makan bareng kantor) menunya bisa dipilih bareng.",
            },
            {
              ko: "허락을 받으면 ‘감사합니다’라고 하고, 돌아와서는 ‘다녀왔습니다’라고 인사해요.",
              id: "Abis dikasih izin, bilang 감사합니다. Pas balik, sapa lagi dengan 다녀왔습니다 (“saya udah balik”). Kecil, tapi green flag banget.",
            },
          ],
          checklist: [
            {
              ko: "자리를 비우기 전에 먼저 말해요.",
              id: "Aku bilang dulu sebelum ninggalin posisi.",
            },
            {
              ko: "‘-아도 될까요?’로 허락을 구할 수 있어요.",
              id: "Aku bisa minta izin pakai -아도 될까요?.",
            },
            {
              ko: "‘먹으면 안 돼요’로 음식 제한을 설명할 수 있어요.",
              id: "Aku bisa jelasin pantangan makanan pakai 먹으면 안 돼요.",
            },
          ],
        }),
        h3("Bandingin: boleh, harus, nggak boleh, nggak usah"),
        table([
          ["Pola", "Arti", "Contoh (오다)"],
          ["-아도 되다", "boleh", "와도 돼요"],
          [
            ref("-아야 하다", "ki-bisa-harus", "aya-hada"),
            "harus",
            "와야 돼요",
          ],
          [
            ref("-(으)면 안 되다", "ki-bisa-harus", "myeon-an-doeda"),
            "nggak boleh",
            "오면 안 돼요",
          ],
          [
            ref("안 -아도 되다", "ki-bisa-harus", "ji-anado-doeda"),
            "nggak usah",
            "안 와도 돼요",
          ],
        ]),
        callout(
          "info",
          "Jangan ketuker sama ",
          ref("-아도/어도 (walaupun)", "ki-waktu-sebab", "ado"),
          ". Kalau ada 되다/괜찮다 di belakang, artinya ",
          i("“boleh”"),
          ". Kalau nyambung ke kalimat lain, artinya ",
          i("“walaupun”"),
          ".",
        ),
      ],
    },

    // ─────────────────────────────────────────────── -(으)면 안 되다
    {
      key: "myeon-an-doeda",
      title: "-(으)면 안 되다: nggak boleh",
      blocks: [
        grammar({
          number: "06",
          title: "-(으)면 안 되다",
          theme: "green",
          descriptionKo: "어떤 일을 하는 것이 금지되어 있을 때 써요.",
          descriptionTranslation:
            "Artinya “nggak boleh” atau “dilarang”. Secara harfiah: “kalau kamu …, nggak oke”. Kalau dijadiin pertanyaan (-(으)면 안 돼요?), rasanya berubah jadi permintaan halus: “boleh nggak sih …?”",
          rules: [
            {
              condition: "Akhiran vokal",
              form: "-면 안 돼요",
              example: "가다 → 가면 안 돼요",
            },
            {
              condition: "Akhiran konsonan",
              form: "-으면 안 돼요",
              example: "먹다 → 먹으면 안 돼요",
            },
            {
              condition: "Akhiran ㄹ",
              form: "-면 안 돼요",
              example: "열다 → 열면 안 돼요",
            },
            {
              condition: "하다",
              form: "-하면 안 돼요",
              example: "말하다 → 말하면 안 돼요",
            },
            {
              condition: "ㄷ tak beraturan",
              form: "ㄷ → ㄹ + -으면",
              example: "듣다 → 들으면 안 돼요",
            },
            {
              condition: "ㅂ tak beraturan",
              form: "ㅂ → 우 + -면",
              example: "눕다 → 누우면 안 돼요",
            },
            {
              condition: "Permintaan halus",
              form: "-(으)면 안 될까요?",
              example: "가면 안 될까요?",
            },
            {
              condition: "반말",
              form: "-(으)면 안 돼",
              example: "늦으면 안 돼!",
            },
          ],
          examples: [
            { before: "여기서 담배 피우", emphasis: "면 안 돼요", after: "." },
            { before: "기계에 손을 넣", emphasis: "으면 안 돼요", after: "." },
            { before: "늦", emphasis: "으면 안 돼", after: "!" },
            {
              before: "오늘 조금 일찍 퇴근하",
              emphasis: "면 안 될까요",
              after: "?",
            },
          ],
        }),
        p(
          b("Artinya apa sih?"),
          " Aturan dan larangan: ",
          i("“Di sini nggak boleh ngerokok”"),
          ", ",
          i("“Aku nggak boleh makan babi.”"),
          " Bentuk tanyanya enak banget buat nego: ",
          i("“Hari ini boleh nggak saya pulang agak cepet?”"),
        ),
        h3("Contoh"),
        ex("여기서 담배 피우면 안 돼요.", "Di sini nggak boleh ngerokok."),
        ex(
          "기계가 돌아갈 때 손을 넣으면 안 돼요.",
          "Pas mesin jalan, tangan nggak boleh dimasukin.",
          "briefing keselamatan",
        ),
        ex("저는 돼지고기를 먹으면 안 돼요.", "Aku nggak boleh makan babi."),
        ex(
          "수업 시간에 휴대폰을 쓰면 안 돼요.",
          "Pas kelas nggak boleh main HP.",
        ),
        ex(
          "오늘 조금 일찍 퇴근하면 안 될까요?",
          "Hari ini boleh nggak saya pulang agak cepet?",
          "nego halus ke 사장님",
        ),
        ex("늦으면 안 돼!", "Jangan sampai telat!", "반말"),
        callout(
          "warning",
          "Jebakan: kata ",
          i("“jangan”"),
          " di bahasa Indonesia bisa jadi dua pola. -(으)면 안 돼요 = ",
          i("“aturannya nggak boleh”"),
          " (netral, jelasin aturan). ",
          ref("-지 마세요", "ki-minta-ajak", "ji-maseyo"),
          " = ",
          i("“jangan!”"),
          " (nyuruh langsung). Ke atasan, -(으)면 안 돼요 lebih aman karena nggak kedengeran nyuruh.",
        ),
        h3("Ngobrol: hari pertama di pabrik"),
        ...chat(
          [
            {
              who: "반장님",
              ko: "기계가 돌아갈 때 손을 넣으면 안 돼요.",
              id: "Pas mesin jalan, tangan nggak boleh dimasukin.",
            },
            {
              who: "Rudi",
              ko: "네. 장갑도 껴야 돼요?",
              id: "Siap. Sarung tangan juga harus dipakai?",
            },
            {
              who: "반장님",
              ko: "네, 장갑을 끼고 안전화도 신어야 돼요.",
              id: "Iya, pakai sarung tangan, sepatu safety juga wajib.",
            },
            {
              who: "Rudi",
              ko: "휴대폰은 써도 돼요?",
              id: "HP boleh dipakai?",
            },
            {
              who: "반장님",
              ko: "쉬는 시간에는 써도 되는데, 일할 때 쓰면 안 돼요.",
              id: "Pas istirahat boleh, tapi pas kerja nggak boleh.",
            },
            { who: "Rudi", ko: "알겠습니다.", id: "Siap, paham." },
          ],
          {
            theme: "rose",
            questions: [
              {
                ko: "일할 때 휴대폰을 써도 돼요?",
                id: "Pas kerja boleh pakai HP?",
              },
              {
                ko: "기계가 돌아갈 때 뭘 하면 안 돼요?",
                id: "Pas mesin jalan, apa yang nggak boleh dilakuin?",
              },
            ],
          },
        ),
        h3("Bandingin sama pola mirip"),
        p(
          "Kebalikannya ",
          ref("-아도 되다", "ki-bisa-harus", "ado-doeda"),
          " (boleh). Jangan ketuker sama ",
          ref("-지 않아도 되다", "ki-bisa-harus", "ji-anado-doeda"),
          " (nggak usah). 오면 안 돼요 = ",
          i("“jangan dateng”"),
          ", 안 와도 돼요 = ",
          i("“nggak usah dateng”"),
          ".",
        ),
        callout(
          "tip",
          "Bedanya ",
          i("“nggak boleh”"),
          " dan ",
          i("“nggak usah”"),
          " dari sisi Indonesia dibahas di ",
          ref("nggak usah", "ik-andai", "nggak-usah"),
          ".",
        ),
        h3("Coba bikin sendiri"),
        p(
          "Tulis tanda buat dapur asrama: ",
          i("“Di sini nggak boleh masak babi.”"),
          " (masak = 요리하다, babi = 돼지고기)",
        ),
        callout(
          "success",
          "Jawaban: ",
          b("여기서 돼지고기를 요리하면 안 돼요."),
        ),
      ],
    },

    // ─────────────────────────────────────────────── -지 않아도 되다
    {
      key: "ji-anado-doeda",
      title: "-지 않아도 되다 / 안 -아도 되다: nggak usah, nggak perlu",
      blocks: [
        grammar({
          number: "07",
          title: "-지 않아도 되다 / 안 -아도 되다",
          theme: "green",
          descriptionKo: "꼭 할 필요가 없다고 말할 때 써요.",
          descriptionTranslation:
            "Artinya “nggak usah” atau “nggak perlu”. Ini kebalikan dari harus: kamu dibebasin dari kewajiban, bukan dilarang. Ada dua bentuk dengan arti sama. 안 -아도 되다 lebih sering di obrolan.",
          rules: [
            {
              condition: "Bentuk panjang",
              form: "-지 않아도 돼요",
              example: "가다 → 가지 않아도 돼요",
            },
            {
              condition: "Bentuk pendek (vokal ㅏ/ㅗ)",
              form: "안 -아도 돼요",
              example: "오다 → 안 와도 돼요",
            },
            {
              condition: "Bentuk pendek (vokal lain)",
              form: "안 -어도 돼요",
              example: "벗다 → 안 벗어도 돼요",
            },
            {
              condition: "하다",
              form: "안 해도 돼요",
              example: "하다 → 안 해도 돼요",
            },
            {
              condition: "N하다",
              form: "N 안 해도 / N하지 않아도",
              example: "걱정 안 해도 돼요",
            },
            {
              condition: "Kata sifat",
              form: "-지 않아도 돼요",
              example: "비싸지 않아도 돼요",
            },
            {
              condition: "Lebih tegas",
              form: "-(으)ㄹ 필요 없어요",
              example: "갈 필요 없어요",
            },
            { condition: "반말", form: "안 -아도 돼", example: "안 와도 돼" },
          ],
          examples: [
            { before: "내일은 ", emphasis: "안 와도 돼요", after: "." },
            { before: "걱정하", emphasis: "지 않아도 돼요", after: "." },
            { before: "신발 ", emphasis: "안 벗어도 돼요", after: "." },
            { before: "돈 ", emphasis: "안 내도 돼", after: ". 내가 살게." },
          ],
        }),
        p(
          b("Artinya apa sih?"),
          " ",
          i("“Besok nggak usah dateng”"),
          ", ",
          i("“Sepatunya nggak usah dilepas”"),
          ", ",
          i("“Nggak usah bayar, aku traktir.”"),
          " Rasanya lega: kamu boleh nggak ngelakuin itu.",
        ),
        h3("Contoh"),
        ex(
          "내일은 안 와도 돼요.",
          "Besok nggak usah dateng.",
          "사장님, karena pabrik libur",
        ),
        ex("걱정하지 않아도 돼요.", "Nggak usah khawatir."),
        ex("신발 안 벗어도 돼요.", "Sepatunya nggak usah dilepas."),
        ex("오늘은 야근 안 해도 돼요.", "Hari ini nggak usah lembur."),
        ex(
          "다 외우지 않아도 돼요. 이해만 하면 돼요.",
          "Nggak perlu hafal semua. Yang penting paham.",
        ),
        ex(
          "돈 안 내도 돼. 내가 살게.",
          "Nggak usah bayar. Aku yang traktir.",
          "반말",
        ),
        callout(
          "warning",
          "Jebakan paling bahaya di bab ini. Bayangin 반장님 bilang ",
          b("내일 안 와도 돼요"),
          " dan kamu kira artinya ",
          i("“besok jangan dateng”"),
          ", terus kamu panik dikira dipecat. Padahal artinya cuma ",
          i("“besok nggak usah masuk”"),
          ". Kebalikannya juga: ",
          b("내일 오면 안 돼요"),
          " baru artinya ",
          i("“besok jangan dateng”"),
          ".",
        ),
        h3("Bandingin sama pola mirip"),
        table([
          ["Bahasa Indonesia", "Korea", "Pola"],
          [
            "Besok harus dateng",
            "내일 와야 돼요",
            ref("-아야 되다", "ki-bisa-harus", "aya-hada"),
          ],
          [
            "Besok boleh dateng",
            "내일 와도 돼요",
            ref("-아도 되다", "ki-bisa-harus", "ado-doeda"),
          ],
          ["Besok nggak usah dateng", "내일 안 와도 돼요", "안 -아도 되다"],
          [
            "Besok jangan dateng",
            "내일 오면 안 돼요",
            ref("-(으)면 안 되다", "ki-bisa-harus", "myeon-an-doeda"),
          ],
        ]),
        p(
          "Ada satu ",
          i("“nggak usah”"),
          " lagi yang sebenarnya nolak halus: ",
          i("“Nggak usah repot-repot”"),
          ". Itu bukan pola ini, tapi ",
          b("괜찮아요, 신경 쓰지 마세요"),
          " (lihat ",
          ref("-지 마세요", "ki-minta-ajak", "ji-maseyo"),
          ").",
        ),
        callout(
          "tip",
          "Semua rasa ",
          i("“nggak usah”"),
          " dibedah di ",
          ref("nggak usah", "ik-andai", "nggak-usah"),
          ".",
        ),
        h3("Coba bikin sendiri"),
        p(
          "Bilang ke temen: ",
          i("“Nggak usah jemput, aku naik subway aja.”"),
          " (jemput = 데리러 오다, naik subway = 지하철 타다)",
        ),
        callout(
          "success",
          "Jawaban: ",
          b("데리러 안 와도 돼. 지하철 타고 갈게."),
          " Versi sopan: 데리러 안 오셔도 돼요. 지하철 타고 갈게요.",
        ),
      ],
    },

    // ─────────────────────────────────────────────── -기로 하다
    {
      key: "giro-hada",
      title: "-기로 하다: mutusin, janjian",
      blocks: [
        grammar({
          number: "08",
          title: "-기로 하다",
          theme: "green",
          descriptionKo:
            "어떤 일을 하겠다고 결정하거나 다른 사람과 약속할 때 써요.",
          descriptionTranslation:
            "Artinya “mutusin buat …” atau “janjian …”. Karena keputusannya udah diambil, hampir selalu dipakai dalam bentuk lampau: -기로 했어요. Pasang 안 di depan buat “nggak jadi” (mutusin nggak).",
          rules: [
            {
              condition: "Akhiran vokal",
              form: "-기로 했어요",
              example: "가다 → 가기로 했어요",
            },
            {
              condition: "Akhiran konsonan",
              form: "-기로 했어요",
              example: "먹다 → 먹기로 했어요",
            },
            {
              condition: "하다",
              form: "-하기로 했어요",
              example: "공부하다 → 공부하기로 했어요",
            },
            {
              condition: "Mutusin nggak",
              form: "안 -기로 했어요",
              example: "안 가기로 했어요",
            },
            {
              condition: "Janjian",
              form: "N(이)랑 -기로 했어요",
              example: "친구랑 만나기로 했어요",
            },
            {
              condition: "Udah dijadwalin",
              form: "-기로 되어 있어요",
              example: "회의하기로 되어 있어요",
            },
            { condition: "반말", form: "-기로 했어", example: "만나기로 했어" },
          ],
          examples: [
            {
              before: "매일 한국어를 공부하",
              emphasis: "기로 했어요",
              after: ".",
            },
            {
              before: "친구랑 토요일에 만나",
              emphasis: "기로 했어요",
              after: ".",
            },
            {
              before: "그 회사에는 안 가",
              emphasis: "기로 했어요",
              after: ".",
            },
            { before: "우리 7시에 만나", emphasis: "기로 했잖아", after: "!" },
          ],
        }),
        p(
          b("Artinya apa sih?"),
          " ",
          i("“Mulai tahun ini aku mutusin buat …”"),
          ", ",
          i("“Aku janjian sama temen hari Sabtu”"),
          ", ",
          i("“Aku nggak jadi pergi.”"),
          " Semua itu -기로 했어요.",
        ),
        h3("Contoh"),
        ex(
          "올해부터 매일 한국어를 공부하기로 했어요.",
          "Mulai tahun ini aku mutusin belajar bahasa Korea tiap hari.",
        ),
        ex(
          "친구랑 토요일에 만나기로 했어요.",
          "Aku janjian sama temen hari Sabtu.",
        ),
        ex(
          "이번 달부터 돈을 모으기로 했어요.",
          "Mulai bulan ini aku mutusin buat nabung.",
        ),
        ex(
          "다음 달에 고향에 가기로 했어요.",
          "Bulan depan aku udah mutusin pulang kampung.",
        ),
        ex(
          "그 회사에는 안 가기로 했어요.",
          "Aku nggak jadi masuk perusahaan itu.",
        ),
        ex(
          "우리 7시에 만나기로 했잖아!",
          "Kita kan janjian jam 7!",
          "반말, ke bestie yang ngaret",
        ),
        callout(
          "warning",
          "Jebakan: ",
          i("“nggak jadi”"),
          " punya dua arti. Kalau kamu yang ",
          i("mutusin"),
          " batal, pakai ",
          b("안 -기로 했어요"),
          ". Kalau ujung-ujungnya batal karena keadaan, pakai ",
          ref("결국", "ki-kata-kecil", "gyeolguk"),
          ": ",
          b("결국 못 갔어요"),
          ". Satu lagi: bentuk sekarang (하기로 해요) jarang dipakai, kecuali buat ngajak sepakat: ",
          b("그럼 내일 다시 이야기하기로 해요"),
          " (",
          i("“ya udah, kita sepakat bahas lagi besok ya”"),
          ").",
        ),
        h3("Ngobrol: rencana sama bestie"),
        ...chat(
          [
            {
              who: "민지",
              ko: "너 이번 주말에 뭐 해?",
              id: "Weekend ini kamu ngapain?",
            },
            {
              who: "Rina",
              ko: "친구들이랑 부산에 가기로 했어.",
              id: "Aku janjian ke Busan sama temen-temen.",
            },
            {
              who: "민지",
              ko: "와, 좋겠다! KTX 타고 가?",
              id: "Wah, enak banget! Naik KTX?",
            },
            {
              who: "Rina",
              ko: "아니, 돈 아끼려고 버스 타기로 했어.",
              id: "Nggak, biar hemat kita mutusin naik bus.",
            },
            {
              who: "민지",
              ko: "근데 너 다음 주에 시험 있잖아?",
              id: "Eh tapi kamu minggu depan ujian, kan?",
            },
            {
              who: "Rina",
              ko: "맞아… 그래서 일요일에는 공부하기로 했어.",
              id: "Iya… makanya hari Minggu aku mutusin belajar.",
            },
          ],
          {
            theme: "violet",
            questions: [
              {
                ko: "Rina는 주말에 누구랑 어디에 가기로 했어요?",
                id: "Weekend ini Rina janjian ke mana, sama siapa?",
              },
              {
                ko: "Rina는 왜 버스를 타기로 했어요?",
                id: "Kenapa Rina mutusin naik bus?",
              },
            ],
            tip: {
              title: "결정은 과거형으로",
              ko: "결정이나 약속은 이미 정한 거라서 보통 ‘-기로 했어요’라고 해요.",
              id: "Keputusan dan janji itu udah diambil, jadi biasanya pakai bentuk lampau -기로 했어요, walaupun acaranya baru nanti.",
            },
          },
        ),
        callout(
          "tip",
          "Bedah ",
          i("“nggak jadi”"),
          " dari sisi Indonesia ada di ",
          ref("nggak jadi", "ik-waktu", "nggak-jadi"),
          ".",
        ),
        h3("Coba bikin sendiri"),
        p(
          "Bilang: ",
          i("“Aku sama temen-temen janjian makan bareng abis gajian.”"),
          " (abis gajian = 월급 받고 나서)",
        ),
        callout(
          "success",
          "Jawaban: ",
          b("친구들이랑 월급 받고 나서 같이 밥 먹기로 했어요."),
        ),
      ],
    },
  ],
  outro: [
    h3("Rangkuman kilat"),
    table([
      ["Pola", "Rasa Indonesia", "Contoh"],
      [ref("-고 싶다", "ki-bisa-harus", "go-sipda"), "pengen", "가고 싶어요"],
      [
        ref("-(으)ㄹ 수 있다", "ki-bisa-harus", "eul-su-itda"),
        "bisa (mungkin, mampu)",
        "갈 수 있어요",
      ],
      [
        ref("-(으)ㄹ 줄 알다", "ki-bisa-harus", "eul-jul-alda"),
        "bisa (tahu caranya)",
        "운전할 줄 알아요",
      ],
      [ref("-아야 하다", "ki-bisa-harus", "aya-hada"), "harus", "가야 돼요"],
      [ref("-아도 되다", "ki-bisa-harus", "ado-doeda"), "boleh", "가도 돼요"],
      [
        ref("-(으)면 안 되다", "ki-bisa-harus", "myeon-an-doeda"),
        "nggak boleh",
        "가면 안 돼요",
      ],
      [
        ref("안 -아도 되다", "ki-bisa-harus", "ji-anado-doeda"),
        "nggak usah",
        "안 가도 돼요",
      ],
      [
        ref("-기로 하다", "ki-bisa-harus", "giro-hada"),
        "mutusin, janjian",
        "가기로 했어요",
      ],
    ]),
    h3("Mini latihan: pilih pola yang pas"),
    bullet("1. “Bisa berenang?” → 수영할 …… ?"),
    bullet("2. “Besok nggak usah lembur.” → 내일은 야근 …… ."),
    bullet("3. “Di sini nggak boleh foto.” → 여기서 사진을 …… ."),
    bullet("4. “Boleh aku duduk sini?” → 여기 …… ?"),
    bullet("5. “Aku nggak jadi pulang kampung.” → 고향에 …… ."),
    callout(
      "success",
      "Jawaban: 1. 줄 알아요 · 2. 안 해도 돼요 · 3. 찍으면 안 돼요 · 4. 앉아도 돼요 · 5. 안 가기로 했어요. Nomor 2 dan 3 itu yang paling sering ketuker, jadi kalau dua-duanya bener, kamu aman di tempat kerja.",
    ),
    h3("Ngobrol: besok nggak usah masuk"),
    ...chat(
      [
        {
          who: "반장님",
          ko: "내일은 기계 점검이 있어서 안 와도 돼요.",
          id: "Besok ada pengecekan mesin, jadi nggak usah masuk.",
        },
        {
          who: "Andi",
          ko: "아, 네. 그럼 모레는 몇 시까지 와야 돼요?",
          id: "Oh, iya. Terus lusa harus dateng jam berapa?",
        },
        {
          who: "반장님",
          ko: "8시까지 오면 돼요. 늦으면 안 돼요.",
          id: "Jam 8 aja. Jangan telat ya.",
        },
        {
          who: "Andi",
          ko: "알겠습니다. 혹시 내일 공장에 와서 짐 좀 가져가도 돼요?",
          id: "Siap. Kalau besok saya ke pabrik ambil barang, boleh?",
        },
        {
          who: "반장님",
          ko: "네, 오전에는 사무실에 사람이 있으니까 와도 돼요.",
          id: "Boleh, pagi ada orang di kantor kok.",
        },
      ],
      {
        theme: "blue",
        questions: [
          {
            ko: "Andi는 내일 공장에 와야 돼요?",
            id: "Besok Andi harus masuk kerja nggak?",
          },
          {
            ko: "모레는 몇 시까지 와야 돼요?",
            id: "Lusa harus dateng paling telat jam berapa?",
          },
          {
            ko: "내일 짐을 가지러 와도 돼요?",
            id: "Besok Andi boleh dateng ambil barang?",
          },
        ],
        tip: {
          title: "안 와도 돼요 ≠ 오면 안 돼요",
          ko: "‘안 와도 돼요’는 올 필요가 없다는 뜻이고, ‘오면 안 돼요’는 오지 말라는 뜻이에요.",
          id: "안 와도 돼요 = nggak usah dateng (santai, bukan dipecat). 오면 안 돼요 = jangan dateng. Satu dibebasin, satu dilarang.",
        },
      },
    ),
    p(
      "Udah ngerasa pede bedain bisa, harus, boleh, dan nggak usah? Gas cek di kuis singkat ini. Lulus 70 ya!",
    ),
    quizRef(),
  ],
  quiz: {
    title: "Kuis: bisa, harus, boleh",
    description:
      "Cek dulu kamu udah bisa bedain pengen, bisa, harus, boleh, nggak boleh, nggak usah, dan mutusin. Lulus kalau benar 70%.",
    passingScore: 70,
    questions: [
      {
        key: "go-sipda-1",
        prompt: "Pilih yang pas buat: “Temenku pengen beli skincare Korea.”",
        options: [
          { text: "친구가 한국 화장품을 사고 싶어 해요.", correct: true },
          { text: "친구가 한국 화장품을 사고 싶어요." },
          { text: "친구가 한국 화장품을 살 수 있어요." },
        ],
        explanation:
          "Yang pengen itu temenmu, bukan kamu. Keinginan orang lain pakai -고 싶어 하다, karena kita nggak bisa tahu isi hati orang lain secara langsung.",
      },
      {
        key: "go-sipda-2",
        prompt: "“Aku pengen kurus.” Mana yang bener?",
        options: [
          { text: "날씬해지고 싶어요.", correct: true },
          { text: "날씬하고 싶어요." },
          { text: "날씬해야 돼요." },
        ],
        explanation:
          "날씬하다 itu kata sifat. Buat “pengen jadi …”, kata sifat harus diubah dulu pakai -아/어지다: 날씬해지다 → 날씬해지고 싶어요. 날씬해야 돼요 malah artinya “harus kurus”.",
      },
      {
        key: "su-vs-jul-1",
        prompt:
          "Pas wawancara EPS, cara paling natural nanya “Bisa bawa forklift?” itu…",
        options: [
          { text: "지게차 운전할 줄 알아요?", correct: true },
          { text: "지게차 운전해야 돼요?" },
          { text: "지게차 운전해도 돼요?" },
          { text: "지게차 운전하기로 했어요?" },
        ],
        explanation:
          "Forklift itu soal skill, jadi pakai -(으)ㄹ 줄 알다 (tahu caranya). 해야 돼요 = harus, 해도 돼요 = boleh, 하기로 했어요 = udah mutusin. Beda semua.",
      },
      {
        key: "su-vs-jul-2",
        prompt:
          "사장님 mau nanya: “Besok bisa dateng lebih pagi?” Pilih yang bener.",
        options: [
          { text: "내일 일찍 올 수 있어요?", correct: true },
          { text: "내일 일찍 올 줄 알아요?" },
          { text: "내일 일찍 오고 싶어 해요?" },
        ],
        explanation:
          "Ini soal jadwal, bukan skill. Jadi pakai -(으)ㄹ 수 있다. 올 줄 알아요? kedengeran aneh, kayak nanya “kamu tahu caranya dateng?”.",
      },
      {
        key: "jul-past-1",
        prompt:
          "Arti paling pas dari 한국 겨울이 이렇게 추울 줄 몰랐어요 adalah…",
        options: [
          {
            text: "Nggak nyangka musim dingin Korea sedingin ini.",
            correct: true,
          },
          { text: "Aku nggak tahu cara ngadepin musim dingin Korea." },
          { text: "Musim dingin Korea nggak boleh sedingin ini." },
        ],
        explanation:
          "Bentuk lampau -(으)ㄹ 줄 몰랐어요 bukan soal skill lagi, tapi “nggak nyangka”. Kebalikannya -(으)ㄹ 줄 알았어요 = “udah kuduga / kirain”.",
      },
      {
        key: "aya-hada-1",
        prompt: "“Aku harus perpanjang visa.” Pilih yang bener.",
        options: [
          { text: "비자를 연장해야 돼요.", correct: true },
          { text: "비자를 연장해도 돼요." },
          { text: "비자를 연장하면 안 돼요." },
        ],
        explanation:
          "Harus = -아야/어야 하다/되다. 연장하다 → 연장해야 돼요. Yang lain artinya “boleh perpanjang” dan “nggak boleh perpanjang”.",
      },
      {
        key: "nggak-harus-1",
        prompt: "“Hari ini nggak harus lembur.” Mana yang natural?",
        options: [
          { text: "오늘은 야근 안 해도 돼요.", correct: true },
          { text: "오늘은 야근 안 해야 돼요." },
          { text: "오늘은 야근하면 안 돼요." },
        ],
        explanation:
          "Jebakan klasik! 안 해야 돼요 artinya “harus nggak ngelakuin”, dan 하면 안 돼요 artinya “dilarang”. “Nggak harus / nggak usah” itu 안 -아도 되다: 안 해도 돼요.",
      },
      {
        key: "anado-trap-1",
        prompt: "반장님 bilang: 내일은 안 와도 돼요. Maksudnya apa?",
        options: [
          { text: "Besok nggak usah masuk.", correct: true },
          { text: "Besok jangan dateng." },
          { text: "Besok harus dateng." },
          { text: "Kamu dipecat mulai besok." },
        ],
        explanation:
          "Santuy, bukan dipecat. 안 와도 돼요 = nggak perlu dateng. Kalau beneran dilarang dateng, kalimatnya 내일 오면 안 돼요.",
      },
      {
        key: "myeon-an-1",
        prompt:
          "Tanda di pabrik: “Di sini nggak boleh foto.” Pilih yang bener.",
        options: [
          { text: "여기서 사진을 찍으면 안 돼요.", correct: true },
          { text: "여기서 사진을 안 찍어도 돼요." },
          { text: "여기서 사진을 찍어야 돼요." },
        ],
        explanation:
          "Larangan = -(으)면 안 되다. 안 찍어도 돼요 cuma bilang “nggak usah foto”, bukan melarang.",
      },
      {
        key: "ado-doeda-1",
        prompt:
          "Kamu mau izin salat sebentar ke 사장님. Mana yang paling halus?",
        options: [
          { text: "사장님, 잠깐 기도하고 와도 될까요?", correct: true },
          { text: "사장님, 잠깐 기도하러 가기로 했어요." },
          { text: "사장님, 잠깐 기도하면 안 돼요." },
        ],
        explanation:
          "Minta izin = -아도/어도 되다, dan -아도 될까요? bikin makin halus ke atasan. 가기로 했어요 kesannya kamu udah mutusin sendiri tanpa nanya.",
      },
      {
        key: "giro-hada-1",
        prompt: "Kamu udah mutusin buat nggak masuk perusahaan itu. Bilangnya…",
        options: [
          { text: "그 회사에는 안 가기로 했어요.", correct: true },
          { text: "그 회사에는 안 가고 싶어 해요." },
          { text: "그 회사에는 갈 수 없어요." },
        ],
        explanation:
          "Keputusan sendiri = -기로 하다, dan “mutusin nggak” = 안 -기로 했어요. 갈 수 없어요 artinya “nggak bisa”, kayak ada halangan, bukan pilihanmu.",
      },
      {
        key: "giro-hada-2",
        prompt:
          "Lengkapin chat ke bestie yang ngaret: “우리 7시에 만나____!” (Kita kan janjian jam 7!)",
        options: [
          { text: "기로 했잖아", correct: true },
          { text: "고 싶잖아" },
          { text: "도 되잖아" },
        ],
        explanation:
          "Janjian = -기로 하다, ditambah -잖아 buat “kan”. 만나기로 했잖아! = “Kita kan udah janjian!”",
      },
    ],
  },
});
