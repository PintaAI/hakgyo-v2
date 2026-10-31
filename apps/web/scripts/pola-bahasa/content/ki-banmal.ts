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
  key: "ki-banmal",
  title: "반말: ngomong santai",
  description:
    "Rumus ubah bahasa sopan ke 반말 (buang -요), pengecualian yang wajib hafal, dan kapan boleh dipakai. Dijelasin lewat ngoko dan krama.",
  intro: [
    opener({
      eyebrow: "PAHAM POLA · BAB 10",
      chapterNumber: "10",
      titleKo: "반말, 언제 써요?",
      subtitle:
        "Buang -요 itu gampang. Yang susah: tau kapan boleh. Ini ngoko-krama versi Korea.",
      question: "우리 동갑인데 말 놓을까요?",
      answer: "좋아! 이제 편하게 말하자.",
      focus: [
        {
          label: "문법 · Pola",
          title: "-요 빼기",
          description: "먹어요 → 먹어. Hampir semua pola cukup buang -요.",
        },
        {
          label: "표현 · Kata kunci",
          title: "이야 · 응 · 나 · -자",
          description: "Pengecualian wajib hafal: 학생이야, 응, 나/너, 가자!",
        },
        {
          label: "함정 · Jebakan",
          title: "사장님 반말 ≠ izin",
          description:
            "Atasan boleh santai ke kamu. Kamu tetap jawab pakai -요.",
        },
      ],
      objectives: [
        {
          ko: "존댓말을 반말로 바꿀 수 있어요.",
          id: "Bisa ubah kalimat sopan ke 반말, termasuk pengecualiannya.",
        },
        {
          ko: "반말을 써도 되는 때와 안 되는 때를 알아요.",
          id: "Tau kapan boleh 반말 dan kapan wajib pakai -요.",
        },
      ],
      theme: "sunset",
    }),
    p(
      "Kalau kamu orang Jawa, atau punya temen orang Jawa, kamu udah ngerti konsep ",
      b("반말"),
      " tanpa sadar. Ke simbah pakai krama (",
      i("dhahar"),
      "), ke temen sebaya pakai ngoko (",
      i("mangan"),
      "). Bahasa Korea juga gitu: ada 존댓말 (bahasa sopan, pakai -요) dan 반말 (bahasa santai).",
    ),
    p(
      "Kabar baiknya: kalau kamu udah bisa versi sopan, 반말 itu gampang banget. Hampir semuanya cuma ",
      b("buang -요"),
      ". Yang susah justru bagian ketiga: ",
      i("kapan"),
      " boleh dipakai. Salah dikit, kamu bisa dianggap nggak sopan.",
    ),
    table([
      ["Bagian", "Isinya"],
      [
        ref("Rumus ubah", "ki-banmal", "rumus"),
        "Buang -요, plus contoh semua pola penting",
      ],
      [
        ref("Pengecualian", "ki-banmal", "pengecualian"),
        "Bentuk yang nggak cukup dibuang -요-nya",
      ],
      [
        ref("Kapan boleh 반말", "ki-banmal", "kapan"),
        "Ngoko vs krama, cara minta izin, jebakan di tempat kerja",
      ],
    ]),
  ],
  sections: [
    // ───────────────────────────── rumus
    {
      key: "rumus",
      title: "Rumus ubah: buang -요",
      blocks: [
        grammar({
          number: "01",
          title: "-아/어요 → -아/어",
          descriptionKo: "대부분의 존댓말은 끝의 ‘요’를 빼면 반말이 돼요.",
          descriptionTranslation:
            "Aturan utamanya cuma satu: ambil kalimat sopan yang berakhiran -요, terus buang -요-nya. 먹어요 jadi 먹어. 말했잖아요 jadi 말했잖아. Ini berlaku buat hampir semua akhiran yang udah kamu pelajari.",
          rules: [
            {
              condition: "Sekarang",
              form: "-아/어요 → -아/어",
              example: "먹어요 → 먹어, 가요 → 가",
            },
            {
              condition: "Lampau",
              form: "-았/었어요 → -았/었어",
              example: "먹었어요 → 먹었어",
            },
            {
              condition: "Rencana",
              form: "-(으)ㄹ 거예요 → -(으)ㄹ 거야",
              example: "갈 거예요 → 갈 거야",
            },
            {
              condition: "Akhiran perasaan",
              form: "buang -요",
              example: "맛있네요 → 맛있네",
            },
            {
              condition: "Janji / ajakan nanya",
              form: "buang -요",
              example: "갈게요 → 갈게, 갈까요? → 갈까?",
            },
            {
              condition: "Nanya (intonasi naik)",
              form: "-아/어?",
              example: "밥 먹었어?",
            },
          ],
          examples: [
            { before: "밥 ", emphasis: "먹었어", after: "?" },
            { before: "내일 ", emphasis: "갈게", after: "." },
            { before: "아까 ", emphasis: "말했잖아", after: "." },
          ],
          tipKo:
            "반말에서는 같은 문장이 억양에 따라 질문, 명령, 제안이 될 수 있어요.",
          tipTranslation:
            "Di 반말, 가 bisa berarti ‘aku pergi’, ‘pergi?’, atau ‘pergi sana!’, tergantung intonasi. Persis kayak ‘makan’ di bahasa Indonesia yang bisa jadi pernyataan, pertanyaan, atau suruhan.",
          theme: "amber",
        }),
        h3("Artinya apa sih?"),
        p(
          "Bayangin -요 sebagai ",
          i("‘Pak / Bu / Kak’"),
          " yang ditempel di ujung kalimat. Ke temen deket, kamu nggak bakal bilang ",
          i("‘Udah makan, Kak?’"),
          " tiap ngomong. Cukup ",
          i("‘Udah makan?’"),
          " Itu 반말.",
        ),
        h3("Semua pola yang udah kamu pelajari, versi santai"),
        table([
          ["Sopan", "반말", "Pola"],
          ["먹어요 / 먹었어요", "먹어 / 먹었어", "Dasar"],
          [
            "말했잖아요",
            "말했잖아",
            ref("-잖아요", "ki-akhiran-rasa", "janayo"),
          ],
          [
            "시험이 있거든요",
            "시험이 있거든",
            ref("-거든요", "ki-akhiran-rasa", "geodeunyo"),
          ],
          ["맛있네요", "맛있네", ref("-네요", "ki-akhiran-rasa", "neyo")],
          [
            "비가 올 것 같아요",
            "비가 올 것 같아",
            ref("-것 같다", "ki-akhiran-rasa", "geot-gatda"),
          ],
          [
            "비가 오나 봐요",
            "비가 오나 봐",
            ref("-나 봐요", "ki-akhiran-rasa", "na-bwa"),
          ],
          [
            "벌써 갔을걸요",
            "벌써 갔을걸",
            ref("-(으)ㄹ걸요", "ki-akhiran-rasa", "eulgeol"),
          ],
          [
            "힘들겠어요",
            "힘들겠다 / 힘들겠어",
            ref("-겠-", "ki-akhiran-rasa", "getda"),
          ],
          [
            "빨리 오래요",
            "빨리 오래",
            ref("-래요", "ki-akhiran-rasa", "daeyo"),
          ],
          [
            "갈까요?",
            "갈까?",
            ref("-(으)ㄹ까요?", "ki-minta-ajak", "eulkkayo"),
          ],
          [
            "먹을래요?",
            "먹을래?",
            ref("-(으)ㄹ래요?", "ki-minta-ajak", "eullaeyo"),
          ],
          ["갈게요", "갈게", ref("-(으)ㄹ게요", "ki-minta-ajak", "eulgeyo")],
          ["먹어 봐요", "먹어 봐", ref("-아/어 보다", "ki-keadaan", "a-boda")],
          [
            "가고 있어요",
            "가고 있어",
            ref("-고 있다", "ki-keadaan", "go-itda"),
          ],
        ]),
        h3("Di obrolan"),
        ...chat(
          [
            { who: "지은", ko: "리나야, 밥 먹었어?", id: "Rina, udah makan?" },
            { who: "리나", ko: "아직. 너는?", id: "Belum. Kamu?" },
            {
              who: "지은",
              ko: "나도 아직. 같이 먹을래?",
              id: "Aku juga belum. Mau makan bareng?",
            },
            {
              who: "리나",
              ko: "좋아! 할랄 식당 갈까?",
              id: "Boleh! Ke restoran halal yuk?",
            },
            {
              who: "지은",
              ko: "응, 가자! 나 진짜 배고파.",
              id: "Ayo! Aku laper banget.",
            },
          ],
          {
            questions: [
              {
                ko: "지은은 리나에게 뭘 하자고 했어요?",
                id: "지은 ngajak Rina ngapain?",
              },
              {
                ko: "‘먹을래?’와 ‘갈까?’를 존댓말로 바꾸면?",
                id: "Kalau 먹을래? dan 갈까? diubah ke versi sopan jadi apa?",
              },
            ],
            tip: {
              title: "꿀팁 · TIP",
              ko: "반말 질문은 끝을 올려서 말해요: 밥 먹었어?↗",
              id: "Pertanyaan 반말 cuma beda di intonasi: ujungnya naik. 밥 먹었어?↗",
            },
          },
        ),
        callout(
          "warning",
          "Jebakan: -습니다 / -ㅂ니다 (bahasa super formal) nggak bisa langsung dibuang. Ubah dulu ke bentuk -아/어요, baru buang -요. 감사합니다 → 고마워요 → 고마워. 알겠습니다 → 알겠어요 → 알겠어.",
        ),
        h3("Coba bikin sendiri"),
        bullet("Ubah ke 반말: 내일 시간 있어요?"),
        bullet("Ubah ke 반말: 그 영화 재밌더라고요."),
        callout(
          "success",
          "내일 시간 있어? / 그 영화 재밌더라. (Yang ini pengecualian! Lihat bagian berikutnya.)",
        ),
      ],
    },
    // ───────────────────────────── pengecualian
    {
      key: "pengecualian",
      title: "Pengecualian yang wajib dihafal",
      blocks: [
        p(
          "Ada beberapa bentuk yang nggak bisa cuma dibuang -요-nya. Kalau kamu buang -요 dari 학생이에요, hasilnya ",
          b("학생이에"),
          ", dan itu salah. Daftar ini pendek, tapi wajib hafal karena muncul terus.",
        ),
        h3("Akhiran dan kata"),
        table([
          ["Sopan", "반말", "Catatan"],
          [
            "학생이에요 / 의사예요",
            "학생이야 / 의사야",
            "Bukan 학생이에. Akhiran konsonan → -이야, vokal → -야",
          ],
          ["아니에요", "아니야", "Bukan 아니에"],
          ["뭐예요? / 누구예요?", "뭐야? / 누구야?", ""],
          ["네 / 예", "응 / 어", "어 lebih santai lagi"],
          ["아니요", "아니", ""],
          ["-(으)세요 (silakan)", "-아/어", "앉으세요 → 앉아"],
          ["-아/어 주세요", "-아/어 줘", "도와주세요 → 도와줘"],
          ["-지 마세요", "-지 마", "가지 마세요 → 가지 마"],
          ["-(으)ㅂ시다", "-자", "가자! = yuk!"],
          ["-죠 / -지요", "-지", "내일 오지?"],
          ["-군요", "-구나 / -는구나", "그렇구나 = oh gitu"],
          ["-더라고요", "-더라", "맛있더라"],
          ["-습니다", "-아/어 (atau -다)", "감사합니다 → 고마워"],
        ]),
        h3("Kata ganti"),
        table([
          ["Sopan", "반말", "Indonesia"],
          ["저", "나", "aku"],
          ["제가", "내가", "aku (subjek)"],
          ["제 (저의)", "내 (나의)", "-ku"],
          ["저희", "우리", "kami"],
          ["(nama + 씨)", "너 / 네가", "kamu"],
          ["(nama + 씨)의", "네 / 너의", "-mu"],
        ]),
        callout(
          "warning",
          "Jebakan: 네가 (kamu, subjek) dan 내가 (aku, subjek) bunyinya hampir sama. Karena itu orang Korea ngucapin 네가 jadi ‘니가’ di obrolan. Kalau kamu denger 니가, itu ‘kamu’.",
        ),
        h3("Manggil nama"),
        p(
          "Di 반말, nama dipanggil pakai -아 atau -야, kayak ",
          i("‘Rin!’"),
          " atau ",
          i("‘Ji!’"),
          " di bahasa Indonesia:",
        ),
        bullet("Akhiran konsonan + 아: 지은 → ", b("지은아")),
        bullet("Akhiran vokal + 야: 리나 → ", b("리나야")),
        callout(
          "info",
          "Jangan pakai -아/-야 ke orang yang lebih tua, sedeket apa pun. Panggil 언니, 오빠, 형, 누나 aja. Itu persis kayak ‘Kak’ atau ‘Mas/Mbak’ di bahasa kita.",
        ),
        h3("Di obrolan"),
        ...chat(
          [
            {
              who: "민수",
              ko: "지은아, 이 우산 네 거야?",
              id: "Ji, payung ini punyamu?",
            },
            {
              who: "지은",
              ko: "아니, 내 거 아니야. 리나 거야.",
              id: "Bukan, bukan punyaku. Punya Rina.",
            },
            {
              who: "민수",
              ko: "아, 그래? 리나야, 이거 네 거지?",
              id: "Oh gitu? Rin, ini punyamu kan?",
            },
            {
              who: "리나",
              ko: "응, 내 거야! 고마워.",
              id: "Iya, punyaku! Makasih.",
            },
            {
              who: "민수",
              ko: "비 오니까 같이 가자.",
              id: "Lagi hujan, yuk pulang bareng.",
            },
          ],
          {
            questions: [
              { ko: "우산은 누구 거예요?", id: "Payungnya punya siapa?" },
              {
                ko: "이 대화에서 ‘아니에요’, ‘네’, ‘갑시다’는 어떻게 바뀌었어요?",
                id: "Di obrolan ini, 아니에요, 네, dan 갑시다 berubah jadi apa?",
              },
            ],
            tip: {
              title: "꿀팁 · TIP",
              ko: "‘네 거’는 말할 때 보통 ‘니 거’라고 발음해요.",
              id: "Di obrolan, 네 거 biasanya diucapin ‘니 거’ biar nggak ketuker sama 내 거.",
            },
          },
        ),
        h3("Contoh"),
        ex("야, 이거 뭐야?", "Eh, ini apaan?"),
        ex("나 학생 아니야. 회사원이야.", "Aku bukan mahasiswa. Aku karyawan."),
        ex("잠깐만, 기다려 줘!", "Bentar, tungguin dong!"),
        ex("울지 마. 괜찮아.", "Jangan nangis. Nggak apa-apa."),
        ex("배고파. 우리 밥 먹으러 가자!", "Laper. Yuk, kita makan!"),
      ],
    },
    // ───────────────────────────── kapan
    {
      key: "kapan",
      title: "Kapan boleh 반말?",
      blocks: [
        p(
          "Bagian ini lebih penting dari rumusnya. Baca dulu artikel singkat ini, baru liat tabelnya.",
        ),
        culture({
          titleKo: "반말, 언제 써도 돼요?",
          titleId: "Kapan boleh pakai 반말?",
          paragraphs: [
            {
              ko: "한국어에서 존댓말과 반말은 친절함의 문제가 아니라 관계의 문제예요.",
              id: "Sopan atau santai di bahasa Korea bukan soal kamu ramah atau nggak, tapi soal hubungan. Analogi paling pas buat kita: ngoko dan krama. Ke temen sebaya pakai ngoko, ke simbah pakai krama. 반말 itu ngoko-nya bahasa Korea.",
            },
            {
              ko: "처음 만난 사람에게는 나이와 상관없이 존댓말을 써요.",
              id: "Ke orang yang baru kenal, umur berapa pun, pakai -요. 반말 baru boleh ke temen sebaya yang udah akrab, atau ke yang lebih muda setelah kalian akrab.",
            },
            {
              ko: "반말로 바꾸고 싶으면 보통 먼저 물어봐요. ‘우리 말 놓을까요?’",
              id: "Pindah ke 반말 biasanya pakai izin, dan yang lebih tua biasanya yang nawarin duluan: 우리 말 놓을까요? (kita ngomong santai aja yuk?) atau 편하게 말해 (santai aja ngomongnya).",
            },
            {
              ko: "사장님이나 반장님이 반말을 해도 직원은 존댓말로 대답해요.",
              id: "Jebakan pekerja EPS: 사장님 dan 반장님 hampir pasti ngomong 반말 ke kamu (빨리 와, 이거 해). Itu bukan izin buat balas santai. Tetap jawab pakai -요: 네, 알겠습니다 / 네, 지금 갈게요. Persis kayak simbah yang ngomong ngoko ke cucu, tapi cucunya tetap jawab krama.",
            },
            {
              ko: "한국에서는 한 살 차이도 중요해요.",
              id: "Umur itu penting banget di Korea. Temen yang lebih tua setahun pun biasanya tetap kamu panggil 언니/오빠/형/누나, dan kamu nggak 반말 duluan sebelum dia ngizinin. Di drakor, ‘너 지금 나한테 반말했어?’ (kamu barusan ngomong santai ke aku?!) itu tanda orangnya tersinggung.",
            },
          ],
          checklist: [
            {
              ko: "처음 만난 사람에게는 존댓말을 써요.",
              id: "Ke orang baru, aku pakai -요.",
            },
            {
              ko: "‘말 놓을까요?’라고 물어볼 수 있어요.",
              id: "Aku bisa minta izin pakai 말 놓을까요?",
            },
            {
              ko: "사장님이 반말을 해도 존댓말로 대답해요.",
              id: "Walaupun 사장님 ngomong 반말, aku tetap jawab pakai -요.",
            },
            {
              ko: "나이가 많은 사람에게 먼저 반말하지 않아요.",
              id: "Aku nggak 반말 duluan ke yang lebih tua.",
            },
          ],
          theme: "teal",
        }),
        h3("Ke siapa pakai apa"),
        table([
          ["Ke siapa", "Bahasa", "Analogi Jawa"],
          ["Temen sebaya yang udah akrab", "반말", "ngoko"],
          ["Adik, atau yang lebih muda dan udah akrab", "반말", "ngoko"],
          [
            "Kakak tingkat, kakak kenalan",
            "-요 (반말 kalau dia ngizinin)",
            "krama madya",
          ],
          ["Orang yang baru kenal, umur berapa pun", "-요", "krama"],
          ["Atasan, 사장님, 반장님, dosen", "-요 / -습니다", "krama inggil"],
          [
            "Orang tua sendiri",
            "Tergantung keluarga, banyak yang 반말",
            "beda-beda tiap keluarga",
          ],
        ]),
        h3("Minta izin dulu"),
        p(
          "Di Korea, pindah ke 반말 biasanya pakai izin. Yang lebih tua biasanya yang nawarin duluan. Ungkapan yang sering kamu denger:",
        ),
        ex("우리 말 놓을까요?", "Kita ngomong santai aja yuk?"),
        ex("말 편하게 해도 돼요?", "Boleh ngomong santai aja?"),
        ex(
          "편하게 말해. 나한테 반말해도 돼.",
          "Santai aja. Ngomong 반말 ke aku juga boleh.",
          "dari yang lebih tua",
        ),
        ...chat(
          [
            {
              who: "민수",
              ko: "리나 씨, 우리 동갑이죠? 말 놓을까요?",
              id: "Rina, kita seumuran kan? Ngomong santai aja yuk?",
            },
            { who: "리나", ko: "좋아요! 아, 좋아!", id: "Boleh! Eh, boleh!" },
            {
              who: "민수",
              ko: "ㅋㅋ 앞으로 잘 부탁해.",
              id: "Wkwk, mulai sekarang mohon bantuannya ya.",
            },
            {
              who: "리나",
              ko: "나도! 잘 부탁해, 민수야.",
              id: "Aku juga! Mohon bantuannya ya, Minsu.",
            },
          ],
          {
            questions: [
              {
                ko: "민수와 리나는 왜 말을 놓기로 했어요?",
                id: "Kenapa Minsu dan Rina mutusin ngomong santai?",
              },
              {
                ko: "리나는 왜 ‘좋아요’라고 했다가 ‘좋아’로 바꿨어요?",
                id: "Kenapa Rina bilang 좋아요, terus langsung ganti jadi 좋아?",
              },
            ],
            tip: {
              title: "꿀팁 · TIP",
              ko: "말을 놓은 뒤에도 나이가 많은 사람은 ‘언니, 오빠, 형, 누나’라고 불러요.",
              id: "Udah 반말-an pun, yang lebih tua tetap dipanggil 언니/오빠/형/누나, bukan nama doang.",
            },
            theme: "green",
          },
        ),
        callout(
          "warning",
          "Inget lagi: 사장님 dan 반장님 boleh 반말 ke kamu, tapi kamu tetap jawab pakai -요. Dari bawah ke atas selalu sopan.",
        ),
        h3("Bentuk -다: bukan 반말 obrolan"),
        p(
          "Kamu pasti pernah liat kalimat kayak 했다, 먹는다, 춥다 di buku, berita, soal ujian, atau caption Instagram. Ini ",
          b("bentuk -다"),
          " (gaya tulisan atau gaya polos). Bukan 반말 obrolan, tapi gaya buat nulis, diary, dan ngomong ke diri sendiri.",
        ),
        table([
          ["Jenis kata", "Bentuk -다", "Contoh"],
          ["Kata kerja, akhiran vokal", "-ㄴ다", "간다, 본다"],
          ["Kata kerja, akhiran konsonan", "-는다", "먹는다, 읽는다"],
          ["Kata sifat", "-다 (bentuk kamus)", "춥다, 좋다"],
          ["Lampau", "-았/었다", "했다, 먹었다"],
          ["Kata benda", "-(이)다", "학생이다, 친구다"],
        ]),
        ex(
          "오늘은 날씨가 춥다. 빨리 집에 가고 싶다.",
          "Hari ini dingin. Pengen cepet pulang.",
          "diary",
        ),
        ex("아, 배고프다.", "Aduh, laper.", "ngomong sendiri"),
        ex("드디어 합격했다!", "Akhirnya lulus!", "caption / seruan"),
        callout(
          "info",
          "Waktu ngomong sendiri atau berseru, orang Korea juga pakai -다: 맛있다! 춥다! Ini bukan ngomong ke orang lain, jadi aman dipakai kapan aja, bahkan di depan atasan.",
        ),
        callout(
          "tip",
          "Kalau ragu, pakai -요. Nggak pernah ada orang Korea yang tersinggung karena kamu terlalu sopan. Kebalikannya? Bisa banget.",
        ),
      ],
    },
  ],
  outro: [
    h3("Rangkuman"),
    table([
      ["", "Aturannya"],
      ["Rumus", "Buang -요. -습니다 diubah ke -아/어요 dulu."],
      [
        "Pengecualian",
        "이에요/예요 → 이야/야, 네 → 응, 저 → 나, -세요 → -아/어, -ㅂ시다 → -자, -군요 → -구나",
      ],
      [
        "Boleh ke",
        "Temen sebaya yang akrab, yang lebih muda setelah akrab, siapa aja yang ngizinin",
      ],
      [
        "Jangan ke",
        "Orang baru, atasan, orang yang lebih tua (kecuali diizinin)",
      ],
      [
        "Bentuk -다",
        "Gaya tulisan, diary, ngomong sendiri. Bukan 반말 obrolan.",
      ],
    ]),
    h3("Latihan kilat"),
    p("Ubah ke 반말."),
    bullet("저는 인도네시아 사람이에요."),
    bullet("같이 갑시다!"),
    bullet("여기 앉으세요."),
    bullet("내일 전화할게요."),
    callout(
      "success",
      "나는 인도네시아 사람이야. · 같이 가자! · 여기 앉아. · 내일 전화할게.",
    ),
    p(
      "Udah lancar buang -요? Gas cek di kuis: ubah kalimat, tebak pengecualian, dan pilih kapan boleh 반말. Bisa diulang kok, santuy.",
    ),
    quizRef(),
  ],
  quiz: {
    title: "Kuis: 반말, ngomong santai",
    description:
      "12 soal pilihan ganda soal rumus 반말, pengecualiannya, dan kapan boleh dipakai. Lulus kalau benar minimal 70%.",
    passingScore: 70,
    questions: [
      {
        key: "banmal-rumus-meogeosseoyo",
        prompt: "Versi 반말 dari ‘밥 먹었어요?’ yang bener yang mana?",
        options: [
          { text: "밥 먹었어?", correct: true },
          { text: "밥 먹었습니까?" },
          { text: "밥 드셨어요?" },
          { text: "밥 먹었어요?" },
        ],
        explanation:
          "Rumus utamanya: buang -요. 먹었어요 → 먹었어, terus intonasinya naik biar jadi pertanyaan. 먹었습니까 dan 드셨어요 malah makin sopan.",
      },
      {
        key: "banmal-pengecualian-ieyo",
        prompt: "‘저는 학생이에요’ kalau diubah ke 반말 jadi apa?",
        options: [
          { text: "나는 학생이야.", correct: true },
          { text: "나는 학생이에." },
          { text: "저는 학생이야." },
          { text: "너는 학생이야." },
        ],
        explanation:
          "Dua jebakan sekaligus: 이에요 nggak cukup dibuang -요-nya, tapi jadi 이야. Dan 저 (aku versi sopan) juga ikut ganti jadi 나. 너 itu ‘kamu’, bukan ‘aku’.",
      },
      {
        key: "banmal-pengecualian-anieyo",
        prompt:
          "Temen deket nanya ‘너 배고파?’, kamu mau jawab ‘nggak’. Yang natural?",
        options: [
          { text: "아니, 안 배고파.", correct: true },
          { text: "아니에, 안 배고파." },
          { text: "아니요, 안 배고파." },
        ],
        explanation:
          "아니요 itu versi sopan. Ke temen deket cukup 아니. Bentuk 아니에 nggak ada, itu hasil buang -요 yang kebablasan.",
      },
      {
        key: "banmal-pengecualian-gamsahamnida",
        prompt: "‘감사합니다’ versi 반말-nya apa?",
        options: [
          { text: "고마워", correct: true },
          { text: "감사합니" },
          { text: "고마워요" },
          { text: "감사해요" },
        ],
        explanation:
          "-습니다 nggak bisa langsung dibuang. Ubah dulu ke -아/어요 (고마워요), baru buang -요: 고마워. 고마워요 dan 감사해요 masih sopan.",
      },
      {
        key: "banmal-pengecualian-eupsida",
        prompt: "Mau ngajak temen: ‘Yuk, makan bareng!’ versi 반말?",
        options: [
          { text: "같이 먹자!", correct: true },
          { text: "같이 먹읍시!" },
          { text: "같이 먹을게!" },
          { text: "같이 먹어요!" },
        ],
        explanation:
          "-(으)ㅂ시다 versi 반말-nya -자. 먹자 = yuk makan. 먹을게 itu janji (‘aku makan ya’), dan 먹어요 masih sopan.",
      },
      {
        key: "banmal-pengecualian-euseyo",
        prompt: "‘여기 앉으세요’ versi 반말-nya?",
        options: [
          { text: "여기 앉아.", correct: true },
          { text: "여기 앉으세." },
          { text: "여기 앉자." },
          { text: "여기 앉으셔." },
        ],
        explanation:
          "-(으)세요 (silakan) jadi -아/어: 앉아. 앉자 artinya ‘yuk duduk’ (ngajak), bukan nyuruh duduk.",
      },
      {
        key: "banmal-pengecualian-deora",
        prompt: "‘그 영화 재밌더라고요’ versi 반말 yang paling pas?",
        options: [
          { text: "그 영화 재밌더라.", correct: true },
          { text: "그 영화 재밌더." },
          { text: "그 영화 재밌었어요." },
        ],
        explanation:
          "-더라고요 versi santainya -더라. Bentuk 재밌더 nggak ada. 재밌었어요 masih sopan dan rasa ‘ternyata’-nya hilang.",
      },
      {
        key: "banmal-niga",
        prompt: "Di obrolan kamu denger ‘니가 먼저 했잖아!’. 니가 itu siapa?",
        options: [
          { text: "Kamu (dari 네가)", correct: true },
          { text: "Aku (dari 내가)" },
          { text: "Kami (dari 우리가)" },
          { text: "Dia (dari 그가)" },
        ],
        explanation:
          "네가 (kamu) dan 내가 (aku) bunyinya hampir sama, jadi orang Korea ngucapin 네가 jadi 니가. Artinya: ‘Kan kamu duluan yang mulai!’",
      },
      {
        key: "banmal-eps-banjangnim",
        prompt:
          "반장님 bilang ke kamu: ‘리나야, 이거 빨리 해.’ Balasan yang paling aman?",
        options: [
          { text: "네, 알겠습니다!", correct: true },
          { text: "응, 알겠어!" },
          { text: "알았어, 할게." },
          { text: "왜?" },
        ],
        explanation:
          "Atasan boleh 반말 ke kamu, tapi itu bukan izin buat balas santai. Dari bawah ke atas tetap sopan. Kayak simbah ngoko ke cucu, cucunya tetap krama.",
      },
      {
        key: "banmal-kapan-izin",
        prompt:
          "Kenalan baru di kampus keliatannya seumuran. Kamu pengen ngobrol santai. Paling aman ngomong apa?",
        options: [
          { text: "혹시 우리 동갑이에요? 말 놓을까요?", correct: true },
          { text: "야, 너 몇 살이야?" },
          { text: "우리 동갑이지? 반말할게." },
          { text: "너 이름 뭐야?" },
        ],
        explanation:
          "Ke orang baru, mulai dari -요, terus minta izin dulu pakai 말 놓을까요?. Langsung 반말 ke orang yang baru kenal bisa dianggap nggak sopan, umur berapa pun dia.",
      },
      {
        key: "banmal-kapan-siapa",
        prompt: "Ke siapa kamu boleh langsung pakai 반말?",
        options: [
          {
            text: "Temen sebaya yang udah akrab dan biasa 반말-an sama kamu",
            correct: true,
          },
          { text: "반장님, soalnya dia juga 반말 ke kamu" },
          { text: "Kakak tingkat yang baru kenal kemarin" },
          { text: "Pelanggan di 편의점 yang keliatan lebih muda" },
        ],
        explanation:
          "반말 itu soal hubungan, bukan umur doang. Temen sebaya yang udah akrab: aman. Atasan, orang baru, dan pelanggan: tetap -요.",
      },
      {
        key: "banmal-bentuk-da",
        prompt:
          "Lagi makan bareng 사장님, kamu kepedesan dan refleks bilang ‘아, 맵다!’. Gimana?",
        options: [
          {
            text: "Aman. Itu seruan ke diri sendiri (bentuk -다), bukan 반말 ke orang.",
            correct: true,
          },
          { text: "Nggak sopan. Harusnya bilang 맵습니다!" },
          { text: "Salah. Bentuk -다 cuma boleh dipakai di tulisan." },
        ],
        explanation:
          "Bentuk -다 kayak 맵다!, 춥다!, 맛있다! itu ngomong ke diri sendiri atau berseru. Bukan ngomong ke lawan bicara, jadi aman di depan siapa aja.",
      },
    ],
  },
});
