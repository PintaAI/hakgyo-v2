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
  key: "ki-minta-ajak",
  title: "Minta, ajak, janji",
  description:
    "Tolong, silakan, jangan, yuk, mari, aku … deh, dan mau …? Pola buat minta tolong, ngajak, dan janji tanpa kedengeran kasar ke 사장님 atau kaku ke bestie.",
  intro: [
    opener({
      eyebrow: "PAHAM POLA · BAB 5",
      chapterNumber: "05",
      titleKo: "부탁, 제안, 약속",
      subtitle:
        "Minta tolong, ngajak, dan janji tanpa kedengeran nyuruh-nyuruh ke 사장님 atau kaku ke bestie.",
      question: "퇴근하고 같이 치킨 먹을까요?",
      answer: "좋아요! 제가 자리 예약할게요.",
      focus: [
        {
          label: "문법 · Pola",
          title: "주세요 · 까요 · 게요 · 래요",
          description:
            "Tujuh akhiran buat minta tolong, nyuruh halus, ngelarang, ngajak, nawarin, dan janji.",
        },
        {
          label: "표현 · Kata kunci",
          title: "좀 · 같이 · 먼저",
          description:
            "Kata kecil yang bikin permintaan dan ajakan kedengeran halus, kayak “dong”, “bareng”, “duluan”.",
        },
        {
          label: "함정 · Jebakan",
          title: "갑시다 ke 사장님",
          description:
            "“Mari” di bahasa Indonesia itu sopan, tapi -(으)ㅂ시다 ke atasan kedengeran kayak kamu yang ngatur.",
        },
      ],
      objectives: [
        {
          ko: "상황에 맞게 부탁하고 제안할 수 있어요.",
          id: "Bisa minta tolong dan ngajak sesuai situasi dan lawan bicara.",
        },
        {
          ko: "윗사람에게 공손하게 제안하고 도움을 드릴 수 있어요.",
          id: "Bisa ngajak dan nawarin bantuan ke atasan tanpa kedengeran ngatur.",
        },
      ],
    }),
    p(
      "Bahasa Indonesia punya senjata rahasia buat ngelunakin omongan: ",
      i("“dong”, “ya”, “yuk”, “deh”"),
      ", sampai akhiran ",
      i("“-in”"),
      " kayak ",
      i("fotoin, beliin, bukain"),
      ". Bahasa Korea juga punya, cuma bentuknya akhiran kata kerja.",
    ),
    p(
      "Masalahnya, salah pilih akhiran bisa bikin kamu kedengeran nyuruh-nyuruh. Contoh paling klasik: ngajak 사장님 makan pakai ",
      b("갑시다"),
      ". Maksudnya ",
      i("“mari, Pak”"),
      ", tapi kedengerannya kayak kamu yang jadi bos.",
    ),
    p("Peta polanya:"),
    bullet(
      b("Minta"),
      ": tolong (-아/어 주세요), silakan (-(으)세요), jangan (-지 마세요).",
    ),
    bullet(
      b("Ngajak dan nawarin"),
      ": yuk? / mau aku …? (-(으)ㄹ까요), mari (-(으)ㅂ시다), mau …? (-(으)ㄹ래요).",
    ),
    bullet(b("Janji"), ": aku … ya / deh (-(으)ㄹ게요)."),
    callout(
      "info",
      "Hampir semua pola di sini punya versi 반말 yang sering banget dipakai: 줘, 하지 마, 갈까?, 가자, 갈게, 먹을래?. Rumus lengkapnya ada di ",
      ref("pengecualian 반말", "ki-banmal", "pengecualian"),
      ".",
    ),
  ],
  sections: [
    // ─────────────────────────────────────────────── -아/어 주세요
    {
      key: "a-juseyo",
      title: "-아/어 주세요: tolong …",
      blocks: [
        grammar({
          number: "01",
          title: "-아/어 주세요",
          theme: "rose",
          descriptionKo:
            "다른 사람에게 나를 위해 무엇을 해 달라고 부탁할 때 써요.",
          descriptionTranslation:
            "Artinya “tolong …” atau akhiran “-in” (fotoin, bukain, beliin). Kata kerjanya pakai bentuk -아/어 kayak -아요/어요, lalu tambah 주세요 (kasih). Jadi literally “kasih aku tindakan itu”.",
          rules: [
            {
              condition: "Vokal ㅏ/ㅗ",
              form: "-아 주세요",
              example: "닫다 → 닫아 주세요",
            },
            {
              condition: "Vokal lain",
              form: "-어 주세요",
              example: "기다리다 → 기다려 주세요",
            },
            {
              condition: "하다",
              form: "해 주세요",
              example: "말하다 → 말해 주세요",
            },
            {
              condition: "ㅂ tak beraturan",
              form: "-와/워 주세요",
              example: "돕다 → 도와주세요",
            },
            {
              condition: "르 tak beraturan",
              form: "-라/러 주세요",
              example: "부르다 → 불러 주세요",
            },
            {
              condition: "Kata benda",
              form: "N 주세요",
              example: "물 → 물 주세요",
            },
            {
              condition: "Lebih halus",
              form: "-아/어 주시겠어요?",
              example: "찍어 주시겠어요?",
            },
            {
              condition: "Lebih halus",
              form: "-아/어 주실 수 있어요?",
              example: "알려 주실 수 있어요?",
            },
            { condition: "반말", form: "-아/어 줘", example: "도와줘" },
          ],
          examples: [
            { before: "천천히 말", emphasis: "해 주세요", after: "." },
            { before: "다시 한 번 설명", emphasis: "해 주세요", after: "." },
            { before: "사진 좀 찍", emphasis: "어 주실 수 있어요", after: "?" },
            { before: "이것 좀 도와", emphasis: "줘", after: "." },
          ],
          tipKo: "부탁할 때 ‘좀’을 넣으면 더 부드러워요.",
          tipTranslation:
            "좀 itu kayak “dong” atau “ya” di bahasa Indonesia. 물 좀 주세요 kedengeran jauh lebih enak daripada 물 주세요.",
        }),
        p(
          b("Artinya apa sih?"),
          " Ini jembatan yang enak banget buat orang Indonesia. Akhiran ",
          b("-in"),
          " yang kita pakai tiap hari itu rasanya sama: ",
          i("fotoin"),
          " = 찍어 주세요, ",
          i("bukain"),
          " = 열어 주세요, ",
          i("beliin"),
          " = 사 주세요, ",
          i("kasih tahu"),
          " = 알려 주세요.",
        ),
        h3("Contoh"),
        ex(
          "천천히 말해 주세요.",
          "Tolong ngomongnya pelan-pelan ya.",
          "kalimat penyelamat pekerja baru",
        ),
        ex(
          "반장님, 이거 어떻게 하는지 한 번만 보여 주세요.",
          "반장님, tolong tunjukin sekali lagi cara ngerjainnya.",
        ),
        ex(
          "봉투에 넣어 주세요.",
          "Tolong masukin ke kantong ya.",
          "pembeli di 편의점",
        ),
        ex(
          "사진 좀 찍어 주실 수 있어요?",
          "Boleh minta tolong fotoin?",
          "ke orang asing di tempat wisata",
        ),
        ex("도착하면 알려 주세요.", "Kalau udah nyampe kabarin ya."),
        ex("이것 좀 도와줘.", "Bantuin ini dong.", "반말"),
        ...chat(
          [
            {
              who: "반장님",
              ko: "리즈키 씨, 이 박스들 저쪽으로 빨리 옮겨요.",
              id: "Rizky, kotak-kotak ini cepet pindahin ke sana ya.",
            },
            {
              who: "리즈키",
              ko: "죄송해요, 반장님. 천천히 말해 주세요.",
              id: "Maaf, 반장님. Tolong ngomongnya pelan-pelan ya.",
            },
            {
              who: "반장님",
              ko: "이 박스, 저쪽으로 옮겨 주세요.",
              id: "Kotak ini, tolong pindahin ke sana.",
            },
            {
              who: "리즈키",
              ko: "아, 네! 근데 이거 너무 무거워요. 같이 좀 들어 주실 수 있어요?",
              id: "Oh, siap! Tapi ini berat banget. Bisa bantu angkat bareng, Pak?",
            },
            {
              who: "반장님",
              ko: "그래요. 하나, 둘, 셋!",
              id: "Oke. Satu, dua, tiga!",
            },
            {
              who: "리즈키",
              ko: "감사합니다, 반장님!",
              id: "Makasih, 반장님!",
            },
          ],
          {
            questions: [
              {
                ko: "리즈키 씨는 처음에 반장님에게 뭘 부탁했어요?",
                id: "Pertama kali, Rizky minta tolong apa ke 반장님?",
              },
              {
                ko: "박스는 어때요?",
                id: "Kotaknya kenapa?",
              },
            ],
            tip: {
              title: "주세요 vs 주실 수 있어요?",
              ko: "윗사람에게는 ‘-아/어 주세요’보다 ‘-아/어 주실 수 있어요?’가 더 공손해요.",
              id: "Ke atasan, -아/어 주실 수 있어요? (bisa minta tolong …?) lebih halus daripada -아/어 주세요.",
            },
          },
        ),
        callout(
          "warning",
          "Jebakan: kalau kamu yang nawarin bantuan ke orang yang lebih tua atau atasan, jangan pakai 주다, tapi ",
          b("드리다"),
          ": ",
          b("제가 도와드릴게요"),
          " (",
          i("“saya bantu ya”"),
          "). Jebakan kedua: ",
          i("“tolong!”"),
          " yang beneran darurat itu ",
          b("도와주세요!"),
          ", bukan cuma 주세요.",
        ),
        h3("Bandingin sama pola mirip"),
        p(
          ref("-(으)세요", "ki-minta-ajak", "euseyo"),
          " juga bisa nyuruh, tapi rasanya ",
          i("“silakan …”"),
          " atau ",
          i("“… ya”"),
          ", dan hasilnya buat si pendengar sendiri (앉으세요 = silakan duduk). -아/어 주세요 hasilnya buat ",
          i("kamu"),
          " (기다려 주세요 = tolong tungguin aku).",
        ),
        callout(
          "tip",
          "Kata ",
          ref("좀", "ki-kata-kecil", "jom"),
          " adalah partner wajib pola ini. Cara bilang ",
          i("“dong”"),
          " ada di ",
          ref("dong", "ik-partikel", "dong"),
          ".",
        ),
        h3("Coba bikin sendiri"),
        p("Minta ke kasir: ", i("“Tolong panasin ya.”"), " (panasin = 데우다)"),
        callout(
          "success",
          "Jawaban: ",
          b("데워 주세요."),
          " Lebih manis lagi: 좀 데워 주세요.",
        ),
      ],
    },

    // ─────────────────────────────────────────────── -(으)세요
    {
      key: "euseyo",
      title: "-(으)세요: silakan, … ya",
      blocks: [
        grammar({
          number: "02",
          title: "-(으)세요",
          theme: "rose",
          descriptionKo:
            "상대방을 높이면서 무엇을 하라고 말하거나 물어볼 때 써요.",
          descriptionTranslation:
            "Punya dua tugas. (1) Nyuruh dengan sopan: “silakan …”, “… ya”. (2) Ngehormatin orang yang dibicarain, kayak krama di bahasa Jawa: 어디 가세요? = “Bapak mau tindak ke mana?”. Beberapa kata kerja punya bentuk hormat khusus.",
          rules: [
            {
              condition: "Akhiran vokal",
              form: "-세요",
              example: "가다 → 가세요",
            },
            {
              condition: "Akhiran konsonan",
              form: "-으세요",
              example: "앉다 → 앉으세요",
            },
            {
              condition: "Akhiran ㄹ",
              form: "ㄹ hilang + -세요",
              example: "만들다 → 만드세요",
            },
            {
              condition: "하다",
              form: "하세요",
              example: "조심하다 → 조심하세요",
            },
            {
              condition: "ㄷ tak beraturan",
              form: "ㄷ → ㄹ + -으세요",
              example: "걷다 → 걸으세요",
            },
            {
              condition: "Khusus: 먹다/마시다",
              form: "드세요",
              example: "맛있게 드세요",
            },
            {
              condition: "Khusus: 자다",
              form: "주무세요",
              example: "안녕히 주무세요",
            },
            {
              condition: "Khusus: 있다 (berada)",
              form: "계세요",
              example: "안녕히 계세요",
            },
            {
              condition: "Khusus: 말하다",
              form: "말씀하세요",
              example: "편하게 말씀하세요",
            },
            { condition: "반말", form: "-아/어", example: "앉으세요 → 앉아" },
          ],
          examples: [
            { before: "여기 앉", emphasis: "으세요", after: "." },
            { before: "맛있게 ", emphasis: "드세요", after: "." },
            { before: "조심히 가", emphasis: "세요", after: "." },
            { before: "사장님, 어디 가", emphasis: "세요", after: "?" },
          ],
          tipKo: "자기 자신에게는 ‘-(으)세요’를 쓰지 않아요.",
          tipTranslation:
            "-(으)세요 itu buat ngehormatin orang lain. Jadi “aku pergi” jangan jadi 제가 가세요.",
        }),
        p(
          b("Artinya apa sih?"),
          " Bayangin bahasa Jawa: ",
          i("mangan"),
          " jadi ",
          i("dhahar"),
          " kalau buat orang yang dihormatin. Sama: 먹다 jadi ",
          b("드시다"),
          ", 자다 jadi ",
          b("주무시다"),
          ". Makanya ",
          i("“selamat makan”"),
          " ke orang lain itu 맛있게 드세요, bukan 먹으세요.",
        ),
        h3("Contoh"),
        ex("여기 앉으세요.", "Silakan duduk sini.", "nawarin kursi di subway"),
        ex("이쪽으로 오세요.", "Sini, lewat sini ya.", "staf kafe ke tamu"),
        ex("맛있게 드세요.", "Selamat makan ya."),
        ex("조심히 가세요.", "Hati-hati di jalan ya."),
        ex(
          "안녕히 주무세요.",
          "Selamat tidur.",
          "ke orang tua atau yang lebih tua",
        ),
        ex(
          "사장님, 어디 가세요?",
          "Pak, mau ke mana?",
          "pertanyaan hormat, bukan perintah",
        ),
        callout(
          "warning",
          "Jebakan 1: jangan pakai -(으)세요 buat dirimu sendiri. ✗ 저는 학생이세요, ✗ 제가 가세요 itu salah. Jebakan 2: ke 사장님 atau 반장님, -(으)세요 yang isinya nyuruh (",
          i("기다리세요"),
          " = tunggu) bisa kedengeran ngatur. Lebih aman pakai ",
          ref("-아/어 주세요", "ki-minta-ajak", "a-juseyo"),
          " atau ",
          b("-아/어 주시겠어요?"),
          ". Jebakan 3: ",
          b("안녕히 가세요"),
          " buat orang yang pergi, ",
          b("안녕히 계세요"),
          " buat orang yang tinggal.",
        ),
        h3("Bandingin sama pola mirip"),
        table([
          ["Pola", "Rasa", "Contoh"],
          ["-(으)세요", "silakan … (sopan)", "앉으세요"],
          [
            ref("-아/어 주세요", "ki-minta-ajak", "a-juseyo"),
            "tolong … (buat aku)",
            "기다려 주세요",
          ],
          [
            ref("-지 마세요", "ki-minta-ajak", "ji-maseyo"),
            "jangan …",
            "가지 마세요",
          ],
          [
            ref("-(으)ㅂ시다", "ki-minta-ajak", "eupsida"),
            "mari kita …",
            "갑시다",
          ],
        ]),
        callout(
          "tip",
          "Versi santainya: 앉으세요 → 앉아, 드세요 → 먹어. Rumus lengkap ada di ",
          ref("rumus 반말", "ki-banmal", "rumus"),
          ".",
        ),
      ],
    },

    // ─────────────────────────────────────────────── -지 마세요
    {
      key: "ji-maseyo",
      title: "-지 마세요: jangan",
      blocks: [
        grammar({
          number: "03",
          title: "-지 마세요",
          theme: "rose",
          descriptionKo: "상대방에게 어떤 일을 하지 말라고 말할 때 써요.",
          descriptionTranslation:
            "Artinya “jangan …”. Tempel -지 마세요 ke kata kerja, bentuknya sama buat semua. Versi santainya -지 마, versi resminya (pengumuman, tanda) -지 마십시오.",
          rules: [
            {
              condition: "Akhiran vokal",
              form: "-지 마세요",
              example: "가다 → 가지 마세요",
            },
            {
              condition: "Akhiran konsonan",
              form: "-지 마세요",
              example: "먹다 → 먹지 마세요",
            },
            {
              condition: "하다",
              form: "-하지 마세요",
              example: "걱정하다 → 걱정하지 마세요",
            },
            {
              condition: "Kata sifat (perasaan)",
              form: "-아/어하지 마세요",
              example: "슬프다 → 슬퍼하지 마세요",
            },
            {
              condition: "Resmi",
              form: "-지 마십시오",
              example: "들어가지 마십시오",
            },
            { condition: "반말", form: "-지 마", example: "울지 마" },
          ],
          examples: [
            { before: "걱정하", emphasis: "지 마세요", after: "." },
            {
              before: "기계 만지",
              emphasis: "지 마세요",
              after: ". 위험해요.",
            },
            { before: "신경 쓰", emphasis: "지 마세요", after: "." },
            { before: "울", emphasis: "지 마", after: "." },
          ],
        }),
        p(
          b("Artinya apa sih?"),
          " ",
          i("“Jangan khawatir”"),
          ", ",
          i("“Jangan pegang mesinnya”"),
          ", ",
          i("“Jangan nangis.”"),
          " Larangan langsung ke orang di depanmu.",
        ),
        h3("Contoh"),
        ex("걱정하지 마세요.", "Jangan khawatir."),
        ex(
          "기계 만지지 마세요. 위험해요.",
          "Jangan pegang mesinnya. Bahaya.",
          "반장님 ke pekerja baru",
        ),
        ex("여기에 차를 세우지 마세요.", "Jangan parkir di sini."),
        ex(
          "괜찮아요, 신경 쓰지 마세요.",
          "Nggak apa-apa, nggak usah repot-repot.",
          "nolak halus",
        ),
        ex("슬퍼하지 마세요.", "Jangan sedih ya."),
        ex(
          "울지 마. 내가 있잖아.",
          "Jangan nangis. Kan ada aku.",
          "반말, adegan drakor",
        ),
        ...chat(
          [
            {
              who: "반장님",
              ko: "일하기 전에 장갑 끼세요. 그리고 이 기계는 만지지 마세요.",
              id: "Sebelum kerja, pakai sarung tangan ya. Terus mesin ini jangan dipegang.",
            },
            {
              who: "아디",
              ko: "네. 근데 이 빨간 버튼은 눌러도 돼요?",
              id: "Siap. Tapi tombol merah ini boleh dipencet?",
            },
            {
              who: "반장님",
              ko: "아니요, 그것도 누르면 안 돼요. 모르면 꼭 물어보세요.",
              id: "Nggak, itu juga nggak boleh dipencet. Kalau nggak tahu, wajib tanya ya.",
            },
            {
              who: "아디",
              ko: "네, 알겠습니다. 조심할게요.",
              id: "Siap, ngerti. Saya bakal hati-hati.",
            },
          ],
          {
            theme: "rose",
            questions: [
              {
                ko: "아디 씨는 이 기계를 만져도 돼요?",
                id: "Adi boleh pegang mesin itu?",
              },
              {
                ko: "모를 때는 어떻게 해야 돼요?",
                id: "Kalau nggak tahu, Adi harus ngapain?",
              },
            ],
            tip: {
              title: "Larangan di pabrik",
              ko: "반장님은 ‘-지 마세요’를 쓰고, 직원은 ‘-아도 돼요?’로 물어봐요.",
              id: "반장님 ngelarang pakai -지 마세요. Kamu sebagai pekerja nanya izin pakai -아/어도 돼요?, bukan ngelarang balik.",
            },
          },
        ),
        callout(
          "warning",
          "Jebakan 1: ",
          i("“jangan pergi”"),
          " bukan ✗ 안 가세요. Itu artinya ",
          i("“(Bapak) nggak pergi?”"),
          ". Yang benar ",
          b("가지 마세요"),
          ". Jebakan 2: kata sifat nggak bisa langsung. ",
          i("“Jangan sedih”"),
          " bukan ✗ 슬프지 마세요, tapi ",
          b("슬퍼하지 마세요"),
          ". Jebakan 3: ke atasan, -지 마세요 kedengeran nyuruh. Buat ngingetin bos, pakai ",
          ref("-(으)면 안 돼요", "ki-bisa-harus", "myeon-an-doeda"),
          " yang netral.",
        ),
        h3("Bandingin sama pola mirip"),
        bullet(
          ref("-(으)면 안 되다", "ki-bisa-harus", "myeon-an-doeda"),
          ": ",
          i("“nggak boleh”"),
          " (jelasin aturan). -지 마세요: ",
          i("“jangan!”"),
          " (nyuruh langsung).",
        ),
        bullet(
          ref("-지 않아도 되다", "ki-bisa-harus", "ji-anado-doeda"),
          ": ",
          i("“nggak usah”"),
          " (bebas dari kewajiban). Cuma 신경 쓰지 마세요 yang kebetulan juga diterjemahin ",
          i("“nggak usah repot-repot”"),
          ".",
        ),
        callout(
          "tip",
          i("“Nggak usah”"),
          " kadang -지 마세요, kadang -지 않아도 되다. Bedahnya ada di ",
          ref("nggak usah", "ik-andai", "nggak-usah"),
          ".",
        ),
      ],
    },

    // ─────────────────────────────────────────────── -(으)ㄹ까요?
    {
      key: "eulkkayo",
      title: "-(으)ㄹ까요?: yuk? / mau aku …? / … ya?",
      blocks: [
        grammar({
          number: "04",
          title: "-(으)ㄹ까요?",
          theme: "rose",
          descriptionKo:
            "같이 하자고 제안하거나, 상대방의 생각을 묻거나, 궁금한 것을 말할 때 써요.",
          descriptionTranslation:
            "Pola serba guna dengan tiga rasa. (1) Ngajak: “… yuk?”. (2) Nawarin atau minta pendapat: “mau aku …?”, “enaknya … apa ya?”. (3) Bertanya-tanya: “… nggak ya?”. Ini cara paling aman buat ngajak atasan.",
          rules: [
            {
              condition: "Akhiran vokal",
              form: "-ㄹ까요?",
              example: "가다 → 갈까요?",
            },
            {
              condition: "Akhiran konsonan",
              form: "-을까요?",
              example: "먹다 → 먹을까요?",
            },
            {
              condition: "Akhiran ㄹ",
              form: "langsung + 까요?",
              example: "열다 → 열까요?",
            },
            {
              condition: "하다",
              form: "할까요?",
              example: "시작하다 → 시작할까요?",
            },
            {
              condition: "ㄷ tak beraturan",
              form: "ㄷ → ㄹ + -을까요?",
              example: "걷다 → 걸을까요?",
            },
            {
              condition: "ㅂ tak beraturan",
              form: "ㅂ → 우 + -ㄹ까요?",
              example: "춥다 → 추울까요?",
            },
            {
              condition: "Nawarin ke atasan",
              form: "-아/어 드릴까요?",
              example: "도와드릴까요?",
            },
            {
              condition: "Nebak hal lampau",
              form: "-았/었을까요?",
              example: "벌써 갔을까요?",
            },
            { condition: "반말", form: "-(으)ㄹ까?", example: "갈까?" },
          ],
          examples: [
            { before: "같이 점심 먹", emphasis: "을까요", after: "?" },
            { before: "창문 ", emphasis: "열까요", after: "?" },
            { before: "제가 도와드릴", emphasis: "까요", after: "?" },
            { before: "내일 눈이 ", emphasis: "올까요", after: "?" },
          ],
          tipKo: "‘갈까요?’에 대답할 때는 ‘네, 가요’ 또는 ‘좋아요’라고 해요.",
          tipTranslation:
            "Kalau diajak 갈까요?, jawab 네, 가요! atau 좋아요!, bukan ngulang 갈까요.",
        }),
        p(
          b("Artinya apa sih?"),
          " Mirip ",
          i("“yuk?”"),
          " yang ada tanda tanyanya: kamu ngajak sambil ngasih ruang buat nolak. Makanya sopan. Bentuk ini juga dipakai pas kamu mikir keras: ",
          i("“besok turun salju nggak ya?”"),
        ),
        h3("Contoh"),
        ex("같이 점심 먹을까요?", "Makan siang bareng yuk?"),
        ex("창문 열까요?", "Jendelanya aku bukain ya?", "nawarin"),
        ex("사장님, 제가 도와드릴까요?", "Pak, mau saya bantu?"),
        ex("몇 시에 만날까요?", "Enaknya ketemu jam berapa?"),
        ex("내일 눈이 올까요?", "Besok turun salju nggak ya?"),
        ex("주말에 뭐 할까?", "Weekend ngapain ya kita?", "반말, ke bestie"),
        ...chat(
          [
            {
              who: "아구스",
              ko: "민수 씨, 퇴근하고 같이 저녁 먹을까요?",
              id: "Minsu, abis kerja makan malam bareng yuk?",
            },
            {
              who: "민수",
              ko: "좋아요! 뭐 먹을까요?",
              id: "Boleh! Enaknya makan apa?",
            },
            {
              who: "아구스",
              ko: "저는 할랄 음식만 먹어요. 근처에 할랄 식당이 있을까요?",
              id: "Aku cuma makan yang halal. Di deket sini ada restoran halal nggak ya?",
            },
            {
              who: "민수",
              ko: "음, 제가 한번 찾아볼까요? … 아, 역 앞에 케밥집이 있어요!",
              id: "Hmm, mau aku cariin? … Eh, ada kedai kebab di depan stasiun!",
            },
            {
              who: "아구스",
              ko: "오, 좋아요. 그럼 몇 시에 만날까요?",
              id: "Wah, mantap. Terus ketemu jam berapa?",
            },
            {
              who: "민수",
              ko: "일곱 시 어때요?",
              id: "Jam tujuh gimana?",
            },
          ],
          {
            theme: "green",
            questions: [
              {
                ko: "두 사람은 퇴근하고 뭐 해요?",
                id: "Mereka mau ngapain abis kerja?",
              },
              {
                ko: "아구스 씨는 어떤 음식을 먹어요?",
                id: "Agus makan makanan yang kayak gimana?",
              },
              {
                ko: "두 사람은 몇 시에 만나요?",
                id: "Mereka ketemu jam berapa?",
              },
            ],
            tip: {
              title: "제가 + -(으)ㄹ까요? = nawarin",
              ko: "‘제가’와 같이 쓰면 상대방에게 도움을 제안하는 뜻이 돼요.",
              id: "Kalau subjeknya 제가, -(으)ㄹ까요? artinya nawarin: 제가 찾아볼까요? = “mau aku cariin?”.",
            },
          },
        ),
        callout(
          "warning",
          "Jebakan: jangan ketuker sama ",
          ref("-(으)ㄹ래요?", "ki-minta-ajak", "eullaeyo"),
          ". ",
          b("창문 열까요?"),
          " = ",
          i("“mau aku bukain jendelanya?”"),
          " (kamu yang buka). ",
          b("창문 열래요?"),
          " = ",
          i("“kamu mau buka jendelanya?”"),
          " (dia yang buka). Satu suku kata, beda orang yang kerja.",
        ),
        h3("Bandingin sama pola mirip"),
        table([
          ["Pola", "Rasa", "Cocok ke atasan?"],
          ["-(으)ㄹ까요?", "yuk? / mau aku …?", "Aman"],
          [
            ref("-(으)ㅂ시다", "ki-minta-ajak", "eupsida"),
            "mari! (ngajak tegas)",
            "Hindari",
          ],
          [
            ref("-(으)ㄹ래요?", "ki-minta-ajak", "eullaeyo"),
            "mau …? (nanya keinginan)",
            "Kurang pas, pakai -(으)시겠어요?",
          ],
          ["-아요/어요 (같이 가요)", "yuk (santai)", "Bisa ke yang akrab"],
        ]),
        callout(
          "tip",
          "Rasa ",
          i("“… nggak ya?”"),
          " itu tetangga dekat dugaan ",
          i("“kayaknya”"),
          ". Kalau mau nebak dengan nada setengah yakin, cek ",
          ref("-(으)ㄹ걸요", "ki-akhiran-rasa", "eulgeol"),
          " dan ",
          ref("kayaknya", "ik-dugaan", "kayaknya"),
          ".",
        ),
        h3("Coba bikin sendiri"),
        p(
          "Ajak temen kerja: ",
          i("“Abis kerja, makan ayam goreng bareng yuk?”"),
          " (ayam goreng = 치킨)",
        ),
        callout(
          "success",
          "Jawaban: ",
          b("퇴근하고 같이 치킨 먹을까요?"),
          " Versi 반말: 퇴근하고 치킨 먹을까?",
        ),
      ],
    },

    // ─────────────────────────────────────────────── -(으)ㅂ시다
    {
      key: "eupsida",
      title: "-(으)ㅂ시다: mari, ayo (hati-hati ke atasan)",
      blocks: [
        grammar({
          number: "05",
          title: "-(으)ㅂ시다",
          theme: "rose",
          descriptionKo:
            "여러 사람에게 같이 하자고 말할 때 써요. 윗사람에게는 잘 쓰지 않아요.",
          descriptionTranslation:
            "Artinya “mari …” atau “ayo kita …”. Kedengeran tegas dan memimpin, kayak ketua kelas atau 반장님 ngomong ke tim. Sopan secara bentuk, tapi nggak cocok dipakai ke orang yang posisinya di atas kamu.",
          rules: [
            {
              condition: "Akhiran vokal",
              form: "-ㅂ시다",
              example: "가다 → 갑시다",
            },
            {
              condition: "Akhiran konsonan",
              form: "-읍시다",
              example: "먹다 → 먹읍시다",
            },
            {
              condition: "Akhiran ㄹ",
              form: "ㄹ hilang + -ㅂ시다",
              example: "만들다 → 만듭시다",
            },
            {
              condition: "하다",
              form: "합시다",
              example: "시작하다 → 시작합시다",
            },
            {
              condition: "ㄷ tak beraturan",
              form: "ㄷ → ㄹ + -읍시다",
              example: "걷다 → 걸읍시다",
            },
            { condition: "Ke atasan", form: "-(으)시죠", example: "가시죠" },
            {
              condition: "Santai sopan",
              form: "-아요/어요",
              example: "같이 가요",
            },
            { condition: "반말", form: "-자", example: "가자!" },
          ],
          examples: [
            { before: "자, 이제 시작", emphasis: "합시다", after: "." },
            { before: "조금만 더 힘냅", emphasis: "시다", after: "!" },
            { before: "쓰레기는 분리해서 버립", emphasis: "시다", after: "." },
            { before: "밥 먹으러 가", emphasis: "자", after: "!" },
          ],
          tipKo: "윗사람에게는 ‘-(으)시죠’나 ‘-(으)ㄹ까요?’를 쓰세요.",
          tipTranslation:
            "Mau ngajak 사장님? Pakai 가시죠 (mari, Pak) atau 같이 가실까요?. Jauh lebih halus.",
        }),
        p(
          b("Artinya apa sih?"),
          " Kata ",
          i("“mari”"),
          " di bahasa Indonesia itu sopan, jadi orang Indonesia mikir 갑시다 juga sopan. Faktanya, -(으)ㅂ시다 rasanya kayak ",
          i("“ayo, gerak!”"),
          " dari pemimpin. Kamu bakal sering ",
          i("denger"),
          " pola ini dari 반장님, di pengumuman, dan di poster, tapi jarang ",
          i("ngomong"),
          " pakai ini ke atasan.",
        ),
        h3("Contoh"),
        ex(
          "자, 이제 시작합시다.",
          "Oke, ayo kita mulai.",
          "반장님 ke tim pas pagi",
        ),
        ex("조금만 더 힘냅시다!", "Ayo semangat, dikit lagi!"),
        ex(
          "쓰레기는 분리해서 버립시다.",
          "Mari buang sampah sesuai jenisnya.",
          "poster di asrama",
        ),
        ex(
          "다음 주에 다시 이야기합시다.",
          "Kita bahas lagi minggu depan aja.",
          "di rapat, dari yang memimpin",
        ),
        ex(
          "사장님, 같이 가시죠.",
          "Pak, mari jalan bareng.",
          "versi aman ke atasan",
        ),
        ex("밥 먹으러 가자!", "Yuk makan!", "반말, ke temen"),
        ...chat(
          [
            {
              who: "반장님",
              ko: "자, 여러분, 오늘도 안전하게 일합시다!",
              id: "Oke, semuanya, hari ini juga kerja yang aman ya!",
            },
            {
              who: "직원들",
              ko: "네!",
              id: "Siap!",
            },
            {
              who: "반장님",
              ko: "벌써 열두 시네요. 점심 먹으러 갑시다.",
              id: "Udah jam dua belas nih. Ayo makan siang.",
            },
            {
              who: "데위",
              ko: "사장님, 같이 가시죠.",
              id: "Pak, mari jalan bareng.",
            },
            {
              who: "사장님",
              ko: "그래요, 같이 갑시다.",
              id: "Oke, ayo bareng.",
            },
          ],
          {
            questions: [
              {
                ko: "반장님은 누구에게 ‘갑시다’라고 했어요?",
                id: "반장님 bilang 갑시다 ke siapa?",
              },
              {
                ko: "데위 씨는 사장님에게 뭐라고 했어요?",
                id: "Dewi ngajak 사장님 pakai kalimat apa?",
              },
            ],
            tip: {
              title: "Arah ajakan",
              ko: "윗사람은 ‘갑시다’를 써도 되지만, 아랫사람은 ‘가시죠’를 써요.",
              id: "Atasan boleh bilang 갑시다 ke bawahan. Kamu ke atasan: 가시죠.",
            },
          },
        ),
        culture({
          titleKo: "윗사람에게 제안하기",
          titleId: "Ngajak atasan tanpa kedengeran ngatur",
          paragraphs: [
            {
              ko: "한국 직장에서는 나이와 직급이 중요해요. 그래서 같은 제안이라도 누구에게 말하는지에 따라 표현이 달라져요.",
              id: "Di tempat kerja Korea, umur dan jabatan itu penting banget. Ajakan yang sama bisa beda bentuknya, tergantung kamu ngomong ke siapa.",
            },
            {
              ko: "‘-(으)ㅂ시다’는 존댓말이지만, 말하는 사람이 결정하는 느낌이 있어요. 그래서 반장님이나 사장님이 직원들에게 자주 써요.",
              id: "-(으)ㅂ시다 secara bentuk memang sopan, tapi rasanya kayak yang ngomong yang mutusin. Makanya pola ini sering keluar dari mulut 반장님 atau 사장님 ke karyawan.",
            },
            {
              ko: "윗사람에게 제안할 때는 ‘-(으)시죠’나 ‘-(으)실까요?’를 쓰면 좋아요. 결정을 상대방에게 맡기는 느낌이라서 더 공손해요.",
              id: "Kalau mau ngajak atasan, pakai -(으)시죠 atau -(으)실까요?. Rasanya kamu nyerahin keputusan ke dia, jadi lebih sopan.",
            },
            {
              ko: "회식 자리에서 사장님이 ‘한잔합시다!’라고 하면, 직원은 ‘네, 감사합니다!’라고 대답하면 돼요.",
              id: "Pas 회식 (makan-makan bareng kantor), kalau 사장님 bilang “한잔합시다!”, kamu cukup jawab “네, 감사합니다!”. Nggak minum alkohol? Cara nolaknya ada di bagian -(으)ㄹ래요.",
            },
          ],
          checklist: [
            {
              ko: "사장님에게 ‘갑시다’ 대신 ‘가시죠’를 쓸 수 있어요.",
              id: "Aku bisa pakai 가시죠, bukan 갑시다, ke 사장님.",
            },
            {
              ko: "포스터나 공지에 있는 ‘-(으)ㅂ시다’의 뜻을 알아요.",
              id: "Aku paham arti -(으)ㅂ시다 di poster atau pengumuman.",
            },
          ],
        }),
        callout(
          "warning",
          "Jebakan khas orang Indonesia: ✗ 사장님, 같이 식사합시다. Maksudnya sopan, tapi kedengeran kayak kamu yang ngatur bosmu. Ganti dengan ",
          b("사장님, 같이 식사하시죠"),
          " atau ",
          b("같이 식사하실까요?"),
          ". Ke temen sebaya, cukup ",
          b("같이 먹어요"),
          " atau 반말 ",
          b("먹자"),
          ".",
        ),
        h3("Bandingin sama pola mirip"),
        p(
          ref("-(으)ㄹ까요?", "ki-minta-ajak", "eulkkayo"),
          " ngajak sambil nanya (",
          i("“yuk?”"),
          "), jadi orang bisa nolak. -(으)ㅂ시다 ngajak sambil mutusin (",
          i("“ayo!”"),
          "). Dalam 반말, -(으)ㅂ시다 jadi ",
          b("-자"),
          ", bentuk yang super sering di drakor: 가자, 먹자, 헤어지자.",
        ),
        callout(
          "tip",
          "Bentuk -자 dan pengecualian 반말 lainnya dirangkum di ",
          ref("pengecualian 반말", "ki-banmal", "pengecualian"),
          ". Kapan boleh pakai 반말 ke siapa, cek ",
          ref("kapan boleh 반말", "ki-banmal", "kapan"),
          ".",
        ),
      ],
    },

    // ─────────────────────────────────────────────── -(으)ㄹ게요
    {
      key: "eulgeyo",
      title: "-(으)ㄹ게요: aku … ya, … deh (janji)",
      blocks: [
        grammar({
          number: "06",
          title: "-(으)ㄹ게요",
          theme: "rose",
          descriptionKo:
            "듣는 사람을 생각하면서 내가 무엇을 하겠다고 약속하거나 결정할 때 써요.",
          descriptionTranslation:
            "Artinya “aku … ya” atau “… deh”. Kamu mutusin atau janji ngelakuin sesuatu, dan keputusan itu ada hubungannya sama si pendengar. Cuma buat diri sendiri (aku/kami), dan nggak bisa dijadiin pertanyaan.",
          rules: [
            {
              condition: "Akhiran vokal",
              form: "-ㄹ게요",
              example: "가다 → 갈게요",
            },
            {
              condition: "Akhiran konsonan",
              form: "-을게요",
              example: "먹다 → 먹을게요",
            },
            {
              condition: "Akhiran ㄹ",
              form: "langsung + 게요",
              example: "만들다 → 만들게요",
            },
            {
              condition: "하다",
              form: "할게요",
              example: "연락하다 → 연락할게요",
            },
            {
              condition: "ㄷ tak beraturan",
              form: "ㄷ → ㄹ + -을게요",
              example: "듣다 → 들을게요",
            },
            {
              condition: "ㅂ tak beraturan",
              form: "ㅂ → 우 + -ㄹ게요",
              example: "돕다 → 도울게요",
            },
            {
              condition: "Negatif",
              form: "안 -(으)ㄹ게요",
              example: "안 늦을게요",
            },
            {
              condition: "Ke atasan",
              form: "-아/어 드릴게요",
              example: "해 드릴게요",
            },
            { condition: "반말", form: "-(으)ㄹ게", example: "갈게" },
          ],
          examples: [
            { before: "내일 ", emphasis: "갈게요", after: "." },
            { before: "이걸로 ", emphasis: "할게요", after: "." },
            { before: "끝나면 연락", emphasis: "할게요", after: "." },
            { before: "먼저 ", emphasis: "갈게", after: "." },
          ],
          tipKo: "‘갈게요’는 [갈께요]로 읽지만, 쓸 때는 ‘게’로 써요.",
          tipTranslation:
            "Dibaca [갈께요], tapi ditulis 갈게요. Salah ketik 갈께요 sering banget, termasuk di chat orang Korea, tapi tetap salah.",
        }),
        p(
          b("Artinya apa sih?"),
          " Ini ",
          i("“deh”"),
          " versi Korea. ",
          i("“Yang ini aja deh”"),
          " = 이걸로 할게요. ",
          i("“Aku duluan ya”"),
          " = 먼저 갈게. ",
          i("“Nanti aku kabarin”"),
          " = 연락할게요. Ada rasa ",
          i("“oke, aku yang ambil keputusan, kamu tenang aja”"),
          ".",
        ),
        h3("Contoh"),
        ex("내일 갈게요.", "Besok aku dateng ya."),
        ex("이걸로 할게요.", "Yang ini aja deh.", "pas pesen di kafe"),
        ex("끝나면 연락할게요.", "Nanti kalau udah kelar aku kabarin."),
        ex(
          "다시는 안 늦을게요. 죄송합니다.",
          "Nggak bakal telat lagi deh. Maaf ya, Pak.",
          "ke 반장님",
        ),
        ex("제가 할게요.", "Aku aja yang ngerjain."),
        ex("먼저 갈게. 내일 봐!", "Aku duluan ya. Sampai besok!", "반말"),
        ...chat(
          [
            {
              who: "직원",
              ko: "주문하시겠어요?",
              id: "Mau pesan apa?",
            },
            {
              who: "사라",
              ko: "음… 이걸로 할게요. 아이스 아메리카노 한 잔이요.",
              id: "Hmm… yang ini aja deh. Es americano satu.",
            },
            {
              who: "직원",
              ko: "드시고 가세요?",
              id: "Diminum di sini?",
            },
            {
              who: "사라",
              ko: "아니요, 가져갈게요.",
              id: "Nggak, dibawa aja.",
            },
            {
              who: "직원",
              ko: "네, 진동벨이 울리면 가지러 오세요.",
              id: "Oke, kalau bel getarnya bunyi, silakan ambil ke sini ya.",
            },
            {
              who: "사라",
              ko: "네, 감사합니다.",
              id: "Oke, makasih.",
            },
          ],
          {
            theme: "blue",
            questions: [
              {
                ko: "사라 씨는 뭘 주문했어요?",
                id: "Sarah pesan apa?",
              },
              {
                ko: "사라 씨는 카페에서 마셔요?",
                id: "Sarah minum di kafe atau dibawa?",
              },
            ],
            tip: {
              title: "Pesan = 할게요",
              ko: "주문할 때 ‘이걸로 할게요’와 ‘이거 주세요’ 둘 다 자연스러워요.",
              id: "Pas pesan, 이걸로 할게요 (yang ini aja deh) dan 이거 주세요 (minta yang ini) dua-duanya natural.",
            },
          },
        ),
        callout(
          "warning",
          "Jebakan 1: nggak bisa nanya pakai -(으)ㄹ게요. ✗ 내일 올게요? salah. Buat nanya, pakai ",
          ref("-(으)ㄹ래요?", "ki-minta-ajak", "eullaeyo"),
          " atau ",
          ref("-(으)ㄹ까요?", "ki-minta-ajak", "eulkkayo"),
          ". Jebakan 2: cuma buat ",
          i("aku"),
          ". ✗ 친구가 갈게요 salah. Jebakan 3: beda sama ",
          b("-(으)ㄹ 거예요"),
          ". 내일 갈 거예요 = ",
          i("“besok aku (rencananya) berangkat”"),
          ", info doang. 내일 갈게요 = ",
          i("“besok aku dateng ya”"),
          ", janji ke kamu.",
        ),
        h3("Bandingin sama pola mirip"),
        bullet(
          ref("-(으)ㄹ래요", "ki-minta-ajak", "eullaeyo"),
          ": ",
          i("“aku mau …”"),
          " (keinginan sendiri). -(으)ㄹ게요: ",
          i("“aku … ya”"),
          " (janji, mikirin pendengar).",
        ),
        bullet(
          ref("차라리", "ki-kata-kecil", "charari"),
          " + -(으)ㄹ게요: ",
          i("“mending aku aja deh”"),
          ". 차라리 내가 할게.",
        ),
        callout(
          "tip",
          "Pola ini jawaban utama buat kata ",
          i("“deh”"),
          ". Lihat semua rasa ",
          i("deh"),
          " di ",
          ref("deh", "ik-partikel", "deh"),
          ".",
        ),
        h3("Coba bikin sendiri"),
        p(
          "Bales chat ibu: ",
          i("“Iya, nanti malem aku telepon ya.”"),
          " (nanti malem = 이따 밤에)",
        ),
        callout("success", "Jawaban: ", b("네, 이따 밤에 전화할게요.")),
      ],
    },

    // ─────────────────────────────────────────────── -(으)ㄹ래요
    {
      key: "eullaeyo",
      title: "-(으)ㄹ래요: mau …? / aku mau …",
      blocks: [
        grammar({
          number: "07",
          title: "-(으)ㄹ래요",
          theme: "rose",
          descriptionKo:
            "상대방이 뭘 하고 싶은지 묻거나, 내가 하고 싶은 것을 말할 때 써요.",
          descriptionTranslation:
            "Artinya “mau …?” kalau nanya, dan “aku mau … (aja)” kalau jawab. Ini soal pilihan atau kemauan sekarang. Santai dan akrab, cocok ke temen, rekan kerja sebaya, atau orang yang udah kenal.",
          rules: [
            {
              condition: "Akhiran vokal",
              form: "-ㄹ래요",
              example: "가다 → 갈래요",
            },
            {
              condition: "Akhiran konsonan",
              form: "-을래요",
              example: "먹다 → 먹을래요",
            },
            {
              condition: "Akhiran ㄹ",
              form: "langsung + 래요",
              example: "놀다 → 놀래요",
            },
            { condition: "하다", form: "할래요", example: "하다 → 할래요" },
            {
              condition: "ㄷ tak beraturan",
              form: "ㄷ → ㄹ + -을래요",
              example: "걷다 → 걸을래요",
            },
            {
              condition: "Negatif",
              form: "안 -(으)ㄹ래요",
              example: "안 갈래요",
            },
            {
              condition: "Ke atasan",
              form: "-(으)시겠어요?",
              example: "드시겠어요?",
            },
            { condition: "반말", form: "-(으)ㄹ래?", example: "먹을래?" },
          ],
          examples: [
            { before: "뭐 먹", emphasis: "을래요", after: "?" },
            { before: "같이 사진 찍", emphasis: "을래요", after: "?" },
            { before: "저는 라면 먹", emphasis: "을래요", after: "." },
            { before: "이번 주말에 같이 영화 ", emphasis: "볼래", after: "?" },
          ],
        }),
        p(
          b("Artinya apa sih?"),
          " ",
          i("“Mau makan apa?”"),
          " → 뭐 먹을래요?. ",
          i("“Aku ramyeon aja”"),
          " → 저는 라면 먹을래요. Versi 반말-nya juga favorit buat ngajak: ",
          i("“Weekend nonton bareng yuk?”"),
          " → 주말에 같이 영화 볼래?",
        ),
        h3("Contoh"),
        ex("뭐 먹을래요?", "Mau makan apa?"),
        ex("커피 마실래요?", "Mau ngopi?", "ke rekan kerja sebaya"),
        ex("저는 라면 먹을래요.", "Aku ramyeon aja deh."),
        ex("오늘은 집에서 쉴래요.", "Hari ini aku mau istirahat di rumah aja."),
        ex(
          "이번 주말에 같이 영화 볼래?",
          "Weekend ini nonton bareng yuk?",
          "반말",
        ),
        ex(
          "나 안 갈래.",
          "Aku nggak ikut ah.",
          "반말, bisa kedengeran ngambek",
        ),
        ...chat(
          [
            {
              who: "지은",
              ko: "이번 주말에 같이 영화 볼래?",
              id: "Weekend ini nonton bareng yuk?",
            },
            {
              who: "나야",
              ko: "좋아! 뭐 볼래?",
              id: "Gas! Mau nonton apa?",
            },
            {
              who: "지은",
              ko: "공포 영화 어때? 끝나고 삼겹살도 먹을래?",
              id: "Film horor gimana? Abis itu mau makan samgyeopsal juga?",
            },
            {
              who: "나야",
              ko: "아, 미안. 나 돼지고기 못 먹어. 닭갈비 먹을래?",
              id: "Aduh, sori. Aku nggak bisa makan babi. Dakgalbi aja gimana?",
            },
            {
              who: "지은",
              ko: "아 맞다! 좋아, 닭갈비 먹자.",
              id: "Oh iya, lupa! Oke, makan dakgalbi aja.",
            },
            {
              who: "나야",
              ko: "그럼 영화표는 내가 예매할게!",
              id: "Kalau gitu tiket filmnya aku yang pesen ya!",
            },
          ],
          {
            theme: "green",
            questions: [
              {
                ko: "두 사람은 주말에 뭐 해요?",
                id: "Mereka mau ngapain weekend ini?",
              },
              {
                ko: "나야는 왜 삼겹살을 안 먹어요?",
                id: "Kenapa Naya nggak makan samgyeopsal?",
              },
              {
                ko: "영화표는 누가 예매해요?",
                id: "Siapa yang pesen tiket filmnya?",
              },
            ],
            tip: {
              title: "Nolak, terus tawarin ganti",
              ko: "거절할 때는 이유를 말하고 다른 것을 제안하면 좋아요.",
              id: "Kalau nolak, kasih alasan singkat, terus tawarin pilihan lain pakai -(으)ㄹ래?. Auto nggak canggung.",
            },
          },
        ),
        culture({
          theme: "amber",
          titleKo: "제안을 부드럽게 거절하기",
          titleId: "Nolak ajakan dengan halus, termasuk soal halal dan salat",
          paragraphs: [
            {
              ko: "한국 사람들은 거절할 때 ‘싫어요’라고 직접 말하지 않는 경우가 많아요. 대신 이유를 말하고 ‘다음에 같이 가요’라고 해요.",
              id: "Orang Korea jarang nolak pakai 싫어요 (nggak mau) secara langsung. Biasanya mereka kasih alasan, terus bilang “다음에 같이 가요” (lain kali bareng ya).",
            },
            {
              ko: "술이나 돼지고기를 못 먹으면 ‘저는 종교 때문에 술을 못 마셔요’처럼 짧게 이유를 말하면 돼요. 대부분 이해해 줘요.",
              id: "Kalau kamu nggak minum alkohol atau nggak makan babi, cukup kasih alasan singkat kayak “저는 종교 때문에 술을 못 마셔요” (saya nggak minum alkohol karena agama). Kebanyakan orang ngerti kok.",
            },
            {
              ko: "기도 시간에는 동료에게 ‘잠깐 기도하고 올게요’라고 말해요. 반장님에게는 ‘잠깐 기도하고 와도 될까요?’라고 물어보면 더 공손해요.",
              id: "Pas waktunya salat, ke temen kerja cukup bilang “잠깐 기도하고 올게요” (aku salat bentar ya). Ke 반장님, lebih sopan minta izin: “잠깐 기도하고 와도 될까요?”.",
            },
            {
              ko: "윗사람의 제안을 거절할 때는 먼저 ‘감사합니다’라고 하세요. 예를 들면 ‘감사합니다. 근데 오늘은 일이 있어서요. 다음에 꼭 갈게요.’",
              id: "Kalau nolak ajakan atasan, mulai dengan 감사합니다 dulu. Contohnya: “Makasih, Pak. Tapi hari ini saya ada urusan. Lain kali pasti ikut deh.”",
            },
          ],
          checklist: [
            {
              ko: "‘싫어요’ 대신 이유를 말하고 거절할 수 있어요.",
              id: "Aku bisa nolak pakai alasan, bukan 싫어요.",
            },
            {
              ko: "‘잠깐 기도하고 올게요’라고 말할 수 있어요.",
              id: "Aku bisa izin salat bentar ke temen kerja.",
            },
            {
              ko: "윗사람에게는 ‘감사합니다’로 거절을 시작할 수 있어요.",
              id: "Aku bisa mulai nolak ajakan atasan dengan 감사합니다.",
            },
          ],
        }),
        callout(
          "warning",
          "Jebakan 1: ke 사장님, -(으)ㄹ래요? kedengeran terlalu akrab. Ganti dengan ",
          b("커피 드시겠어요?"),
          " atau ",
          b("커피 드릴까요?"),
          ". Jebakan 2: hati-hati sama ",
          ref("-래요 (katanya disuruh)", "ki-akhiran-rasa", "daeyo"),
          ". ",
          b("올래요?"),
          " = ",
          i("“mau dateng?”"),
          ", tapi ",
          b("오래요"),
          " = ",
          i("“(dia) nyuruh dateng”"),
          ". Bedanya cuma ada ㄹ di bawah atau nggak.",
        ),
        h3("Bandingin sama pola mirip"),
        table([
          ["Pola", "Rasa", "Contoh"],
          ["-(으)ㄹ래요", "aku mau … (pilihan sekarang)", "라면 먹을래요"],
          [
            ref("-고 싶다", "ki-bisa-harus", "go-sipda"),
            "pengen (keinginan)",
            "라면 먹고 싶어요",
          ],
          [
            ref("-(으)ㄹ게요", "ki-minta-ajak", "eulgeyo"),
            "aku … ya (janji, mikirin kamu)",
            "제가 라면 끓일게요",
          ],
          [
            ref("-(으)ㄹ까요?", "ki-minta-ajak", "eulkkayo"),
            "yuk? / mau aku …?",
            "라면 먹을까요?",
          ],
        ]),
        callout(
          "tip",
          "Mau versi 반말 pola-pola ini (먹을래?, 갈게, 갈까?) sekaligus? Cek ",
          ref("rumus 반말", "ki-banmal", "rumus"),
          ".",
        ),
        h3("Coba bikin sendiri"),
        p(
          "Tanya bestie: ",
          i(
            "“Mau ikut ke Itaewon nggak? Ada masjid sama makanan halal di sana.”",
          ),
          " (ikut = 같이 가다)",
        ),
        callout(
          "success",
          "Jawaban: ",
          b("이태원 같이 갈래? 거기 이슬람 사원도 있고 할랄 음식도 있어."),
        ),
      ],
    },
  ],
  outro: [
    h3("Rangkuman kilat"),
    table([
      ["Pola", "Rasa Indonesia", "Ke atasan", "반말"],
      [
        ref("-아/어 주세요", "ki-minta-ajak", "a-juseyo"),
        "tolong, -in",
        "-아/어 주시겠어요?",
        "-아/어 줘",
      ],
      [
        ref("-(으)세요", "ki-minta-ajak", "euseyo"),
        "silakan",
        "Aman (kecuali nyuruh bos)",
        "-아/어",
      ],
      [
        ref("-지 마세요", "ki-minta-ajak", "ji-maseyo"),
        "jangan",
        "Pakai -(으)면 안 돼요",
        "-지 마",
      ],
      [
        ref("-(으)ㄹ까요?", "ki-minta-ajak", "eulkkayo"),
        "yuk? / mau aku …?",
        "Aman",
        "-(으)ㄹ까?",
      ],
      [
        ref("-(으)ㅂ시다", "ki-minta-ajak", "eupsida"),
        "mari, ayo",
        "Hindari, pakai -(으)시죠",
        "-자",
      ],
      [
        ref("-(으)ㄹ게요", "ki-minta-ajak", "eulgeyo"),
        "aku … ya, deh",
        "-아/어 드릴게요",
        "-(으)ㄹ게",
      ],
      [
        ref("-(으)ㄹ래요", "ki-minta-ajak", "eullaeyo"),
        "mau …?",
        "Pakai -(으)시겠어요?",
        "-(으)ㄹ래?",
      ],
    ]),
    h3("Mini latihan: siapa ngomong apa"),
    bullet("1. Ke kasir: “Tolong dipanasin ya.” → 좀 데워 …… ."),
    bullet("2. Ke 사장님: “Pak, mari makan bareng.” → 사장님, 같이 식사 …… ."),
    bullet("3. Ke temen: “Aku duluan ya.” → 먼저 …… ."),
    bullet("4. Ke temen: “Mau makan apa?” → 뭐 …… ?"),
    bullet("5. Ke adik yang sedih: “Jangan nangis.” → …… ."),
    callout(
      "success",
      "Jawaban: 1. 주세요 · 2. 하시죠 (atau 하실까요?) · 3. 갈게 · 4. 먹을래 · 5. 울지 마. Kalau nomor 2 kamu jawab 합시다, balik lagi ke bagian -(으)ㅂ시다, ya.",
    ),
    p("Sekarang lihat semua pola nyatu di satu obrolan:"),
    ...chat(
      [
        {
          who: "데위",
          ko: "반장님, 점심 같이 드시러 가실까요?",
          id: "반장님, makan siang bareng yuk, Pak?",
        },
        {
          who: "반장님",
          ko: "좋아요. 근데 일 좀 끝내고 갈게요. 먼저 가서 자리 잡아 줘요.",
          id: "Boleh. Tapi saya beresin kerjaan dulu ya. Kamu duluan, tolong cariin tempat duduk.",
        },
        {
          who: "데위",
          ko: "네! 뭐 드실지 미리 주문해 드릴까요?",
          id: "Siap! Mau saya pesenin duluan, Pak?",
        },
        {
          who: "반장님",
          ko: "아니요, 괜찮아요. 신경 쓰지 마세요.",
          id: "Nggak usah, nggak apa-apa. Nggak usah repot-repot.",
        },
      ],
      {
        questions: [
          {
            ko: "반장님은 왜 바로 못 가요?",
            id: "Kenapa 반장님 nggak bisa langsung berangkat?",
          },
          {
            ko: "반장님은 데위 씨에게 뭘 부탁했어요?",
            id: "반장님 minta tolong apa ke Dewi?",
          },
        ],
        tip: {
          title: "드릴까요? = nawarin ke atasan",
          ko: "윗사람에게 무엇을 해 주겠다고 할 때는 ‘-아/어 드릴까요?’를 써요.",
          id: "Mau nawarin bantuan ke atasan? Pakai -아/어 드릴까요?, bukan -아/어 줄까요?.",
        },
      },
    ),
    callout(
      "tip",
      "Udah ngerasa jago? Coba kuis singkat di bawah. Dua belas soal, lulus kalau dapet 70. Gas!",
    ),
    quizRef(),
  ],
  quiz: {
    title: "Kuis: minta, ajak, janji",
    description:
      "Dua belas soal pilihan ganda soal -아/어 주세요, -(으)세요, -지 마세요, -(으)ㄹ까요?, -(으)ㅂ시다, -(으)ㄹ게요, dan -(으)ㄹ래요. Lulus kalau dapet 70.",
    passingScore: 70,
    questions: [
      {
        key: "a-juseyo-1",
        prompt:
          "Kamu minta ke kasir 편의점: “Tolong panasin ya.” (panasin = 데우다). Yang paling pas?",
        options: [
          { text: "좀 데워 주세요.", correct: true },
          { text: "좀 데우세요." },
          { text: "좀 데웁시다." },
          { text: "좀 데울게요." },
        ],
        explanation:
          "Kasirnya manasin buat kamu, jadi pakai -아/어 주세요 (rasa “-in”). 데우세요 itu “silakan panasin” buat dirinya sendiri, 데웁시다 ngajak bareng, 데울게요 malah kamu yang janji manasin.",
      },
      {
        key: "a-juseyo-2",
        prompt:
          "Kamu mau nawarin bantuan ke 반장님: “Saya bantu ya, Pak.” Yang paling sopan?",
        options: [
          { text: "제가 도와드릴게요.", correct: true },
          { text: "제가 도와줄게요." },
          { text: "제가 도우세요." },
          { text: "제가 도와주세요." },
        ],
        explanation:
          "Bantuan dari kamu ke atasan pakai 드리다, bukan 주다: 도와드릴게요. -(으)세요 nggak pernah dipakai buat diri sendiri, dan 도와주세요 malah artinya kamu yang minta tolong.",
      },
      {
        key: "euseyo-1",
        prompt:
          "Temen kerjamu pulang duluan, kamu masih di pabrik. Kamu bilang apa ke dia?",
        options: [
          { text: "안녕히 가세요.", correct: true },
          { text: "안녕히 계세요." },
          { text: "안녕히 주무세요." },
        ],
        explanation:
          "Orang yang pergi dikasih 안녕히 가세요 (hati-hati di jalan). 안녕히 계세요 buat orang yang tetap tinggal, jadi itu kalimat dia ke kamu. 주무세요 buat selamat tidur.",
      },
      {
        key: "euseyo-2",
        prompt: "Kalimat mana yang SALAH?",
        options: [
          { text: "저는 학생이세요.", correct: true },
          { text: "맛있게 드세요." },
          { text: "여기 앉으세요." },
          { text: "사장님, 어디 가세요?" },
        ],
        explanation:
          "-(으)세요 itu buat ngehormatin orang lain, bukan diri sendiri. Yang bener: 저는 학생이에요. Tiga kalimat lainnya natural banget.",
      },
      {
        key: "ji-maseyo-1",
        prompt:
          "Bestie Korea-mu mau pulang ke Seoul. Kamu bilang “Jangan pergi dong.” versi sopan:",
        options: [
          { text: "가지 마세요.", correct: true },
          { text: "안 가세요." },
          { text: "가지 않아요." },
          { text: "가면 돼요." },
        ],
        explanation:
          "“Jangan …” = -지 마세요. 안 가세요 justru nanya “(kamu) nggak pergi?”, 가지 않아요 = “nggak pergi”, dan 가면 돼요 = “pergi aja boleh”. Jebakan klasik!",
      },
      {
        key: "ji-maseyo-2",
        prompt:
          "Adikmu lagi galau. Kamu mau bilang “Jangan sedih ya.” Yang benar?",
        options: [
          { text: "슬퍼하지 마세요.", correct: true },
          { text: "슬프지 마세요." },
          { text: "안 슬프세요." },
        ],
        explanation:
          "슬프다 itu kata sifat, jadi nggak bisa langsung ditempel -지 마세요. Ubah dulu jadi kata kerja perasaan: 슬퍼하다 → 슬퍼하지 마세요.",
      },
      {
        key: "eupsida-1",
        prompt: "Kamu mau ngajak 사장님 makan siang bareng. Yang paling aman?",
        options: [
          { text: "사장님, 같이 식사하시죠.", correct: true },
          { text: "사장님, 같이 식사합시다." },
          { text: "사장님, 같이 식사할래?" },
          { text: "사장님, 같이 식사할게요." },
        ],
        explanation:
          "식사합시다 kedengeran kayak kamu yang ngatur bos, red flag. 할래? itu 반말, dan 할게요 cuma janji dari kamu. Ke atasan pakai -(으)시죠 atau -(으)실까요?.",
      },
      {
        key: "eulkkayo-vs-eullaeyo-1",
        prompt: "Temenmu bilang “창문 열까요?” Maksudnya apa?",
        options: [
          { text: "Mau aku bukain jendelanya?", correct: true },
          { text: "Kamu mau buka jendelanya?" },
          { text: "Tolong bukain jendelanya." },
          { text: "Jangan buka jendelanya." },
        ],
        explanation:
          "-(으)ㄹ까요? di sini nawarin: dia yang mau buka. Kalau “kamu mau buka?”, itu 창문 열래요?. Satu suku kata, beda orang yang kerja.",
      },
      {
        key: "eulkkayo-1",
        prompt:
          "Ajak temen kerja: “Abis kerja, makan ayam goreng bareng yuk?” (ayam goreng = 치킨)",
        options: [
          { text: "퇴근하고 같이 치킨 먹을까요?", correct: true },
          { text: "퇴근하고 같이 치킨 먹을게요?" },
          { text: "퇴근하고 같이 치킨 먹어 주세요." },
          { text: "퇴근하고 같이 치킨 먹지 마세요." },
        ],
        explanation:
          "Ngajak sambil ngasih ruang buat nolak = -(으)ㄹ까요?. -(으)ㄹ게요 nggak bisa jadi pertanyaan, 먹어 주세요 malah minta dia makan buat kamu, dan 먹지 마세요 itu ngelarang.",
      },
      {
        key: "eulgeyo-1",
        prompt:
          "Bales chat ibu: “Iya, nanti malem aku telepon ya.” (nanti malem = 이따 밤에)",
        options: [
          { text: "네, 이따 밤에 전화할게요.", correct: true },
          { text: "네, 이따 밤에 전화할래요?" },
          { text: "네, 이따 밤에 전화하세요." },
          { text: "네, 이따 밤에 전화할까요?" },
        ],
        explanation:
          "Kamu janji ke ibu, jadi pakai -(으)ㄹ게요 (“aku … ya”). 전화할래요? nanya mau nelpon nggak, 전화하세요 nyuruh ibu yang nelpon, 전화할까요? masih nanya pendapat.",
      },
      {
        key: "eulgeyo-2",
        prompt: "Kalimat mana yang SALAH?",
        options: [
          { text: "내일 올게요?", correct: true },
          { text: "제가 할게요." },
          { text: "다시는 안 늦을게요." },
          { text: "먼저 갈게." },
        ],
        explanation:
          "-(으)ㄹ게요 itu janji dari aku, jadi nggak bisa dijadiin pertanyaan. Mau nanya “besok kamu dateng?” pakai 내일 올래요? atau 내일 오세요?.",
      },
      {
        key: "eullaeyo-1",
        prompt: "Tanya bestie (반말): “Mau ikut ke Itaewon nggak?” Yang benar?",
        options: [
          { text: "이태원 같이 갈래?", correct: true },
          { text: "이태원 같이 갈게?" },
          { text: "이태원 같이 오래?" },
          { text: "이태원 같이 갑시다?" },
        ],
        explanation:
          "Nanya kemauan temen = -(으)ㄹ래?. 갈게 nggak bisa nanya, 오래 artinya “katanya disuruh dateng”, dan 갑시다 bukan pertanyaan, apalagi ke bestie.",
      },
    ],
  },
});
