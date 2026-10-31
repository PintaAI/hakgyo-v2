import {
  b,
  callout,
  culture,
  defineBab,
  ex,
  grammar,
  h3,
  i,
  p,
  ref,
} from "../blocks";

export default defineBab({
  key: "ki-11-banmal",
  materials: {
    "ki-banmal-rumus": {
      description:
        "Rumus utama 반말: ambil kalimat sopan berakhiran -요, terus buang -요-nya.",
      blocks: [
        grammar({
          number: "01",
          title: "-요 빼기 · buang -요",
          descriptionKo: "대부분의 존댓말은 끝의 ‘요’를 빼면 반말이 돼요.",
          descriptionTranslation:
            "Aturan utamanya cuma satu: ambil kalimat sopan yang berakhiran -요, terus buang -요-nya. 먹어요 jadi 먹어, 말했잖아요 jadi 말했잖아. Ini berlaku buat hampir semua akhiran yang udah kamu pelajari.",
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
              example: "맛있네요 → 맛있네, 말했잖아요 → 말했잖아",
            },
            {
              condition: "Janji, ajakan, nanya mau",
              form: "buang -요",
              example: "갈게요 → 갈게, 갈까요? → 갈까?, 먹을래요? → 먹을래?",
            },
            {
              condition: "Pertanyaan",
              form: "sama, intonasi naik",
              example: "밥 먹었어?↗",
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
            "Di 반말, 가 bisa berarti ‘aku pergi’, ‘pergi?’, atau ‘pergi sana!’, tergantung intonasi. Persis kayak ‘makan’ di bahasa Indonesia.",
        }),
        p(
          b("Artinya apa sih? "),
          "Bayangin -요 sebagai ",
          i("‘Pak / Bu / Kak’"),
          " yang ditempel di ujung kalimat. Ke temen deket, kamu nggak bakal bilang ",
          i("‘Udah makan, Kak?’"),
          " tiap ngomong. Cukup ",
          i("‘Udah makan?’"),
          " Itu 반말.",
        ),
        h3("Contoh"),
        ex("밥 먹었어?", "Udah makan?", "dari 밥 먹었어요?"),
        ex("나 내일 갈게.", "Aku besok dateng ya.", "dari 갈게요"),
        ex("이거 진짜 맛있네.", "Ini enak banget ya.", "dari 맛있네요"),
        ex("아까 말했잖아.", "Kan tadi udah aku bilang.", "dari 말했잖아요"),
        ex("주말에 뭐 할 거야?", "Weekend mau ngapain?", "dari 할 거예요?"),
        callout(
          "warning",
          "Jebakan: -습니다 / -ㅂ니다 (bahasa super formal) nggak bisa langsung dibuang. Ubah dulu ke bentuk -아/어요, baru buang -요: ",
          b("감사합니다 → 고마워요 → 고마워"),
          ". ✗ 감사합니 itu nggak ada.",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("kan", "ik-kan"),
          " dan ",
          ref("deh", "ik-deh"),
          ", contohnya banyak versi 반말. Ada juga bentuk yang nggak ikut rumus ini: ",
          ref("pengecualian 반말", "ki-banmal-pengecualian"),
          ". Sebelum dipakai, cek dulu ",
          ref("kapan boleh 반말", "ki-banmal-kapan"),
          ".",
        ),
      ],
    },
    "ki-banmal-pengecualian": {
      description:
        "Bentuk 반말 yang nggak cukup dibuang -요-nya: 이야, 응, 나, -아/어, -자, -구나.",
      blocks: [
        grammar({
          number: "02",
          title: "이야 · 응 · 나 · -자",
          descriptionKo: "어떤 말은 ‘요’만 빼면 안 되고 모양이 바뀌어요.",
          descriptionTranslation:
            "Ada beberapa bentuk yang nggak bisa cuma dibuang -요-nya. Kalau 학생이에요 dibuang -요, hasilnya 학생이에, dan itu salah. Daftarnya pendek, tapi wajib hafal karena muncul terus.",
          rules: [
            {
              condition: "Kata benda, akhiran konsonan",
              form: "이에요 → 이야",
              example: "학생이에요 → 학생이야",
            },
            {
              condition: "Kata benda, akhiran vokal",
              form: "예요 → 야",
              example: "의사예요 → 의사야, 뭐예요? → 뭐야?",
            },
            {
              condition: "Bukan",
              form: "아니에요 → 아니야",
              example: "제 거 아니에요 → 내 거 아니야",
            },
            {
              condition: "Iya / nggak",
              form: "네 → 응 (어), 아니요 → 아니",
              example: "응, 좋아!",
            },
            {
              condition: "Aku",
              form: "저 / 제가 / 제 → 나 / 내가 / 내",
              example: "제가 할게요 → 내가 할게",
            },
            {
              condition: "Kami",
              form: "저희 → 우리",
              example: "저희 집 → 우리 집",
            },
            {
              condition: "Silakan, ... ya",
              form: "-(으)세요 → -아/어",
              example: "앉으세요 → 앉아",
            },
            {
              condition: "Tolong",
              form: "-아/어 주세요 → -아/어 줘",
              example: "도와주세요 → 도와줘",
            },
            {
              condition: "Jangan",
              form: "-지 마세요 → -지 마",
              example: "가지 마세요 → 가지 마",
            },
            {
              condition: "Mari, yuk",
              form: "-(으)ㅂ시다 → -자",
              example: "갑시다 → 가자",
            },
            {
              condition: "Oh, gitu ya",
              form: "-군요 → -구나",
              example: "그렇군요 → 그렇구나",
            },
            {
              condition: "Ternyata (dilihat sendiri)",
              form: "-더라고요 → -더라",
              example: "맛있더라고요 → 맛있더라",
            },
          ],
          examples: [
            { before: "나 학생 ", emphasis: "아니야", after: "." },
            { before: "우리 밥 먹으러 ", emphasis: "가자", after: "!" },
            { before: "잠깐만, ", emphasis: "기다려 줘", after: "!" },
          ],
        }),
        p(
          b("Artinya apa sih? "),
          "Mirip pindah dari ",
          i("‘saya’"),
          " ke ",
          i("‘aku’"),
          ", atau dari ",
          i("‘silakan duduk’"),
          " ke ",
          i("‘duduk sini’"),
          ". Manggil nama juga ganti: akhiran konsonan + 아 (지은아), akhiran vokal + 야 (리나야).",
        ),
        h3("Contoh"),
        ex("야, 이거 뭐야?", "Eh, ini apaan?"),
        ex("나 학생 아니야. 회사원이야.", "Aku bukan mahasiswa. Aku karyawan."),
        ex("잠깐만, 기다려 줘!", "Bentar, tungguin dong!"),
        ex("울지 마. 괜찮아.", "Jangan nangis. Nggak apa-apa."),
        ex("리나야, 이거 네 거야?", "Rin, ini punyamu?"),
        callout(
          "warning",
          "Jebakan: ",
          b("네가"),
          " (kamu) dan ",
          b("내가"),
          " (aku) bunyinya hampir sama. Makanya di obrolan 네가 diucapin ",
          b("니가"),
          ". Kalau kamu denger 니가, itu ‘kamu’.",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("kan", "ik-kan"),
          " (-지? versi santai) dan ",
          ref("dong", "ik-dong"),
          ". Rumus dasarnya ada di ",
          ref("rumus 반말", "ki-banmal-rumus"),
          ".",
        ),
      ],
    },
    "ki-banmal-kapan": {
      description:
        "반말 itu ngoko-nya bahasa Korea: soal hubungan, bukan soal ramah atau nggak. Kapan boleh, kapan wajib -요.",
      blocks: [
        p(
          b("Artinya apa sih? "),
          "Kalau kamu orang Jawa, kamu udah paham konsepnya: ke temen sebaya pakai ngoko (",
          i("mangan"),
          "), ke simbah pakai krama (",
          i("dhahar"),
          "). 반말 itu ngoko-nya bahasa Korea, dan -요 itu krama-nya.",
        ),
        culture({
          titleKo: "반말, 언제 써도 돼요?",
          titleId: "Kapan boleh pakai 반말?",
          paragraphs: [
            {
              ko: "존댓말과 반말은 친절함의 문제가 아니라 관계의 문제예요.",
              id: "Sopan atau santai di bahasa Korea bukan soal kamu ramah atau nggak, tapi soal hubungan.",
            },
            {
              ko: "처음 만난 사람에게는 나이와 상관없이 존댓말을 써요.",
              id: "Ke orang yang baru kenal, umur berapa pun, pakai -요. 반말 baru boleh ke temen sebaya yang udah akrab, atau ke yang lebih muda setelah kalian akrab.",
            },
            {
              ko: "반말로 바꾸고 싶으면 보통 먼저 물어봐요.",
              id: "Pindah ke 반말 biasanya pakai izin, dan yang lebih tua biasanya nawarin duluan: 우리 말 놓을까요? (kita ngomong santai aja yuk?).",
            },
            {
              ko: "한국에서는 한 살 차이도 중요해요.",
              id: "Beda umur setahun pun penting. Temen yang lebih tua tetap dipanggil 언니, 오빠, 형, atau 누나, dan kamu nggak 반말 duluan sebelum dia ngizinin.",
            },
            {
              ko: "책이나 일기에서 보는 ‘-다’는 반말 대화와 달라요.",
              id: "Bentuk -다 (했다, 춥다, 맛있다!) yang kamu lihat di buku, diary, atau seruan ke diri sendiri itu bukan 반말 ke orang, jadi aman diucapin di depan siapa aja.",
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
          ],
        }),
        h3("Contoh"),
        ex(
          "우리 동갑이죠? 말 놓을까요?",
          "Kita seumuran kan? Ngomong santai aja yuk?",
        ),
        ex("말 편하게 해도 돼요?", "Boleh ngomong santai aja?"),
        ex(
          "편하게 말해. 나한테 반말해도 돼.",
          "Santai aja. Ngomong 반말 ke aku juga boleh.",
          "dari yang lebih tua",
        ),
        ex(
          "A: 리나야, 이거 빨리 해. B: 네, 알겠습니다!",
          "A: Rina, ini cepet kerjain. B: Baik, Pak!",
          "반장님 ke pekerja",
        ),
        callout(
          "warning",
          "Jebakan pekerja EPS: 사장님 dan 반장님 hampir pasti ngomong 반말 ke kamu. Itu ",
          b("bukan izin"),
          " buat balas santai. Tetap jawab pakai -요 atau -습니다, kayak cucu yang tetap krama walaupun simbah ngomong ngoko.",
        ),
        callout(
          "tip",
          "Kalau ragu, pakai -요. Mau praktik bedain versi sopan dan santai? Cek ",
          ref("terserah", "ik-terserah"),
          " dan ",
          ref("nggak usah", "ik-nggak-usah"),
          ".",
        ),
      ],
    },
  },
  vocabulary: {
    title: "Kosakata: 반말",
    description:
      "Rumus 반말, pengecualian yang wajib dihafal, dan cara minta izin ngomong santai.",
    entries: [
      {
        term: "반말 (-요 빼기)",
        meanings: ["bahasa santai", "buang -요"],
        example: { ko: "밥 먹었어?", id: "Udah makan?" },
      },
      {
        term: "이야 · 응 · 나 · -자",
        meanings: ["bentuk 반말 yang berubah", "pengecualian"],
        example: {
          ko: "나 학생 아니야. 회사원이야.",
          id: "Aku bukan mahasiswa. Aku karyawan.",
        },
      },
      {
        term: "말 놓다",
        meanings: ["mulai ngomong santai", "pindah ke 반말"],
        example: {
          ko: "우리 말 놓을까요?",
          id: "Kita ngomong santai aja yuk?",
        },
      },
    ],
  },
  quiz: {
    title: "Kuis: 반말, ngomong santai",
    description:
      "10 soal pilihan ganda soal rumus 반말, pengecualiannya, dan kapan boleh dipakai. Lulus kalau benar minimal 70%.",
    passingScore: 70,
    questions: [
      {
        key: "ki11-rumus-meogeosseoyo",
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
        key: "ki11-rumus-gamsahamnida",
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
        key: "ki11-pengecualian-ieyo",
        prompt: "‘저는 학생이에요’ kalau diubah ke 반말 jadi apa?",
        options: [
          { text: "나는 학생이야.", correct: true },
          { text: "나는 학생이에." },
          { text: "저는 학생이야." },
          { text: "너는 학생이야." },
        ],
        explanation:
          "Dua jebakan sekaligus: 이에요 jadi 이야, dan 저 ikut ganti jadi 나. 너 itu ‘kamu’, bukan ‘aku’.",
      },
      {
        key: "ki11-pengecualian-anieyo",
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
        key: "ki11-pengecualian-eupsida",
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
        key: "ki11-pengecualian-euseyo",
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
        key: "ki11-niga",
        prompt: "Di obrolan kamu denger ‘니가 먼저 했잖아!’. 니가 itu siapa?",
        options: [
          { text: "Kamu (dari 네가)", correct: true },
          { text: "Aku (dari 내가)" },
          { text: "Kami (dari 우리가)" },
        ],
        explanation:
          "네가 (kamu) dan 내가 (aku) bunyinya hampir sama, jadi orang Korea ngucapin 네가 jadi 니가. Artinya: ‘Kan kamu duluan yang mulai!’",
      },
      {
        key: "ki11-kapan-banjangnim",
        prompt:
          "반장님 bilang ke kamu: ‘리나야, 이거 빨리 해.’ Balasan yang paling aman?",
        options: [
          { text: "네, 알겠습니다!", correct: true },
          { text: "응, 알겠어!" },
          { text: "알았어, 할게." },
          { text: "왜?" },
        ],
        explanation:
          "Atasan boleh 반말 ke kamu, tapi itu bukan izin buat balas santai. Dari bawah ke atas tetap sopan, kayak cucu yang tetap krama ke simbah.",
      },
      {
        key: "ki11-kapan-izin",
        prompt:
          "Kenalan baru di kampus keliatannya seumuran. Kamu pengen ngobrol santai. Paling aman ngomong apa?",
        options: [
          { text: "혹시 우리 동갑이에요? 말 놓을까요?", correct: true },
          { text: "야, 너 몇 살이야?" },
          { text: "우리 동갑이지? 반말할게." },
          { text: "너 이름 뭐야?" },
        ],
        explanation:
          "Ke orang baru, mulai dari -요, terus minta izin pakai 말 놓을까요?. Langsung 반말 ke orang yang baru kenal bisa dianggap nggak sopan, umur berapa pun dia.",
      },
      {
        key: "ki11-kapan-bentuk-da",
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
          "Bentuk -다 kayak 맵다!, 춥다!, 맛있다! itu ngomong ke diri sendiri atau berseru. Bukan ngomong ke lawan bicara, jadi santuy aja di depan siapa pun.",
      },
    ],
  },
});
