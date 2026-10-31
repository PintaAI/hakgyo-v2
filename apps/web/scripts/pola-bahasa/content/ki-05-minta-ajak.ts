import { b, callout, defineBab, ex, grammar, h3, i, p, ref } from "../blocks";

export default defineBab({
  key: "ki-05-minta-ajak",
  materials: {
    "ki-a-juseyo": {
      description:
        "-아/어 주세요 artinya tolong …, rasanya sama kayak akhiran -in: fotoin, bukain, beliin.",
      blocks: [
        grammar({
          number: "01",
          title: "-아/어 주세요",
          descriptionKo:
            "다른 사람에게 나를 위해 무엇을 해 달라고 부탁할 때 써요.",
          descriptionTranslation:
            "Artinya “tolong …” atau akhiran “-in” (fotoin, bukain, beliin). Kata kerjanya pakai bentuk -아/어 kayak -아요/어요, lalu tambah 주세요 (kasih). Jadi harfiahnya “kasih aku tindakan itu”.",
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
              condition: "Kata benda",
              form: "N 주세요",
              example: "물 → 물 주세요",
            },
            {
              condition: "Lebih halus",
              form: "-아/어 주시겠어요?",
              example: "찍어 주시겠어요?",
            },
            { condition: "반말", form: "-아/어 줘", example: "도와줘" },
          ],
          examples: [
            { before: "천천히 말", emphasis: "해 주세요", after: "." },
            { before: "사진 좀 찍", emphasis: "어 주시겠어요", after: "?" },
          ],
        }),
        p(
          b("Artinya apa sih? "),
          "Akhiran ",
          b("-in"),
          " yang kita pakai tiap hari rasanya sama: ",
          i("fotoin"),
          " = 찍어 주세요, ",
          i("bukain"),
          " = 열어 주세요, ",
          i("beliin"),
          " = 사 주세요. Tambah ",
          ref("좀", "ki-jom"),
          " biar makin halus.",
        ),
        h3("Contoh"),
        ex(
          "천천히 말해 주세요.",
          "Tolong ngomongnya pelan-pelan ya.",
          "kalimat penyelamat pekerja baru",
        ),
        ex(
          "봉투에 넣어 주세요.",
          "Tolong masukin ke kantong ya.",
          "pembeli di 편의점",
        ),
        ex(
          "사진 좀 찍어 주시겠어요?",
          "Boleh minta tolong fotoin?",
          "ke orang asing",
        ),
        ex("도착하면 알려 주세요.", "Kalau udah nyampe kabarin ya."),
        ex("이것 좀 도와줘.", "Bantuin ini dong.", "반말"),
        callout(
          "warning",
          "Jebakan: kalau kamu yang nawarin bantuan ke orang yang lebih tua atau atasan, ganti 주다 jadi ",
          b("드리다"),
          ": ",
          b("제가 도와드릴게요"),
          " (",
          i("saya bantu ya"),
          "). ✗ 제가 도와줄게요 ke 사장님 kedengeran kurang sopan.",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("dong", "ik-dong"),
          ". Bedanya sama ",
          ref("-(으)세요", "ki-euseyo"),
          ": 앉으세요 hasilnya buat dia sendiri, 기다려 주세요 hasilnya buat kamu.",
        ),
      ],
    },
    "ki-euseyo": {
      description:
        "-(으)세요 artinya silakan … atau … ya, sambil ngehormatin orang yang diajak ngomong.",
      blocks: [
        grammar({
          number: "02",
          title: "-(으)세요",
          descriptionKo:
            "상대방을 높이면서 무엇을 하라고 말하거나 물어볼 때 써요.",
          descriptionTranslation:
            "Punya dua tugas: nyuruh dengan sopan (“silakan …”, “… ya”) dan ngehormatin orang yang diajak ngomong, kayak krama di bahasa Jawa. Beberapa kata kerja punya bentuk hormat khusus.",
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
          ],
          examples: [
            { before: "여기 앉", emphasis: "으세요", after: "." },
            { before: "맛있게 ", emphasis: "드세요", after: "." },
          ],
        }),
        p(
          b("Artinya apa sih? "),
          "Bayangin bahasa Jawa: ",
          i("mangan"),
          " jadi ",
          i("dhahar"),
          " buat orang yang dihormatin. Sama: 먹다 jadi ",
          b("드시다"),
          ". Makanya ",
          i("selamat makan"),
          " ke orang lain itu 맛있게 드세요, bukan 먹으세요.",
        ),
        h3("Contoh"),
        ex("여기 앉으세요.", "Silakan duduk sini.", "nawarin kursi di subway"),
        ex("이쪽으로 오세요.", "Sini, lewat sini ya.", "staf kafe ke tamu"),
        ex("맛있게 드세요.", "Selamat makan ya."),
        ex("조심히 가세요.", "Hati-hati di jalan ya."),
        ex(
          "사장님, 어디 가세요?",
          "Pak, mau ke mana?",
          "pertanyaan hormat, bukan perintah",
        ),
        callout(
          "warning",
          "Jebakan: jangan pakai -(으)세요 buat dirimu sendiri. ✗ 저는 학생이세요 dan ✗ 제가 가세요 itu salah. Yang benar ",
          b("저는 학생이에요"),
          " dan ",
          b("제가 갈게요"),
          ".",
        ),
        callout(
          "tip",
          "Versi santainya (앉으세요 → 앉아) ada di ",
          ref("rumus 반말", "ki-banmal-rumus"),
          ". Bedanya sama ",
          ref("-아/어 주세요", "ki-a-juseyo"),
          ": 기다리세요 kedengeran nyuruh, 기다려 주세요 kedengeran minta tolong.",
        ),
      ],
    },
    "ki-ji-maseyo": {
      description:
        "-지 마세요 artinya jangan …: larangan langsung ke orang di depanmu.",
      blocks: [
        grammar({
          number: "03",
          title: "-지 마세요",
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
            { condition: "반말", form: "-지 마", example: "울지 마" },
          ],
          examples: [
            { before: "걱정하", emphasis: "지 마세요", after: "." },
            {
              before: "기계 만지",
              emphasis: "지 마세요",
              after: ". 위험해요.",
            },
          ],
        }),
        p(
          b("Artinya apa sih? "),
          i("Jangan khawatir"),
          ", ",
          i("jangan pegang mesinnya"),
          ", ",
          i("jangan nangis."),
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
        ex("슬퍼하지 마세요.", "Jangan sedih ya."),
        ex(
          "울지 마. 내가 있잖아.",
          "Jangan nangis. Kan ada aku.",
          "반말, adegan drakor",
        ),
        callout(
          "warning",
          "Jebakan: ",
          i("jangan pergi"),
          " bukan ✗ 안 가세요. Itu malah artinya ",
          i("(Bapak) nggak pergi?"),
          ". Yang benar ",
          b("가지 마세요"),
          ".",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("nggak usah", "ik-nggak-usah"),
          ". Bedanya sama ",
          ref("-(으)면 안 되다", "ki-myeon-an-doeda"),
          ": itu jelasin aturan dengan netral, jadi lebih aman buat ngingetin atasan.",
        ),
      ],
    },
    "ki-eulkkayo": {
      description:
        "-(으)ㄹ까요? artinya … yuk?, gimana kalau …?, atau mau aku …?: ngajak sambil ngasih ruang buat nolak.",
      blocks: [
        grammar({
          number: "04",
          title: "-(으)ㄹ까요?",
          descriptionKo:
            "같이 하자고 제안하거나 상대방의 생각을 물어볼 때 써요.",
          descriptionTranslation:
            "Punya tiga rasa: ngajak (“… yuk?”), nawarin atau minta pendapat (“mau aku …?”, “enaknya … apa ya?”), dan bertanya-tanya (“… nggak ya?”). Ini cara paling aman buat ngajak orang yang lebih tua.",
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
              condition: "Nawarin ke atasan",
              form: "-아/어 드릴까요?",
              example: "도와드릴까요?",
            },
            { condition: "반말", form: "-(으)ㄹ까?", example: "갈까?" },
          ],
          examples: [
            { before: "같이 점심 먹", emphasis: "을까요", after: "?" },
            { before: "제가 도와드릴", emphasis: "까요", after: "?" },
          ],
        }),
        p(
          b("Artinya apa sih? "),
          "Mirip ",
          i("yuk?"),
          " yang pakai tanda tanya: kamu ngajak sambil ngasih ruang buat nolak. Makanya sopan. Jawabnya cukup ",
          b("네, 좋아요!"),
        ),
        h3("Contoh"),
        ex("같이 점심 먹을까요?", "Makan siang bareng yuk?"),
        ex("창문 열까요?", "Jendelanya aku bukain ya?", "nawarin"),
        ex("사장님, 제가 도와드릴까요?", "Pak, mau saya bantu?"),
        ex("몇 시에 만날까요?", "Enaknya ketemu jam berapa?"),
        ex("내일 눈이 올까요?", "Besok turun salju nggak ya?"),
        callout(
          "warning",
          "Jebakan: jangan ketuker sama ",
          ref("-(으)ㄹ래요?", "ki-eullaeyo"),
          ". ",
          b("창문 열까요?"),
          " = ",
          i("mau aku bukain jendelanya?"),
          " (kamu yang buka). ",
          b("창문 열래요?"),
          " = ",
          i("kamu mau buka jendelanya?"),
          " (dia yang buka).",
        ),
        callout(
          "tip",
          "Bedanya sama ",
          ref("-(으)ㅂ시다", "ki-eupsida"),
          ": -(으)ㅂ시다 ngajak sambil mutusin (",
          i("ayo!"),
          "), jadi kurang pas ke atasan. -(으)ㄹ까요? ngajak sambil nanya, jadi aman.",
        ),
      ],
    },
    "ki-eupsida": {
      description:
        "-(으)ㅂ시다 artinya mari atau ayo kita: tegas dan memimpin, jadi jangan dipakai ke atasan.",
      blocks: [
        grammar({
          number: "05",
          title: "-(으)ㅂ시다",
          descriptionKo:
            "여러 사람에게 같이 하자고 말할 때 써요. 윗사람에게는 잘 쓰지 않아요.",
          descriptionTranslation:
            "Artinya “mari …” atau “ayo kita …”. Kedengeran tegas dan memimpin, kayak 반장님 ngomong ke tim. Bentuknya sopan, tapi nggak cocok dipakai ke orang yang posisinya di atas kamu.",
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
            { condition: "반말", form: "-자", example: "가다 → 가자!" },
          ],
          examples: [
            { before: "자, 이제 시작", emphasis: "합시다", after: "." },
            { before: "밥 먹으러 가", emphasis: "자", after: "!" },
          ],
        }),
        p(
          b("Artinya apa sih? "),
          "Kata ",
          i("mari"),
          " di bahasa Indonesia itu sopan, jadi orang Indonesia sering mikir 갑시다 juga sopan. Faktanya, -(으)ㅂ시다 rasanya kayak ",
          i("ayo, gerak!"),
          " dari pemimpin. Kamu bakal sering denger pola ini dari 반장님, pengumuman, dan poster.",
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
        ex("밥 먹으러 가자!", "Yuk makan!", "반말, ke temen"),
        callout(
          "warning",
          "Jebakan: ✗ 사장님, 같이 식사합시다. Maksudnya sopan, tapi kedengeran kayak kamu yang ngatur bos. Ganti dengan ",
          b("사장님, 같이 식사하러 가실까요?"),
          ". Ke temen sebaya cukup ",
          b("같이 먹어요"),
          " atau ",
          b("먹자"),
          ".",
        ),
        callout(
          "tip",
          "Bentuk -자 dan pengecualian 반말 lainnya ada di ",
          ref("pengecualian 반말", "ki-banmal-pengecualian"),
          ". Bedanya sama ",
          ref("-(으)ㄹ까요?", "ki-eulkkayo"),
          ": -(으)ㄹ까요? ngajak sambil nanya, jadi orang bisa nolak.",
        ),
      ],
    },
    "ki-eulgeyo": {
      description:
        "-(으)ㄹ게요 artinya aku … ya atau … deh: janji atau keputusan yang mikirin si pendengar.",
      blocks: [
        grammar({
          number: "06",
          title: "-(으)ㄹ게요",
          descriptionKo:
            "듣는 사람을 생각하면서 내가 무엇을 하겠다고 약속할 때 써요.",
          descriptionTranslation:
            "Artinya “aku … ya” atau “… deh”. Kamu janji atau mutusin ngelakuin sesuatu, dan itu ada hubungannya sama si pendengar. Cuma buat diri sendiri, dan nggak bisa dijadiin pertanyaan.",
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
              condition: "Negatif",
              form: "안 -(으)ㄹ게요",
              example: "안 늦을게요",
            },
            { condition: "반말", form: "-(으)ㄹ게", example: "갈게" },
          ],
          examples: [
            { before: "끝나면 연락", emphasis: "할게요", after: "." },
            { before: "이걸로 ", emphasis: "할게요", after: "." },
          ],
        }),
        p(
          b("Artinya apa sih? "),
          "Ini ",
          i("deh"),
          " versi Korea. ",
          i("Yang ini aja deh"),
          " = 이걸로 할게요. ",
          i("Nanti aku kabarin"),
          " = 연락할게요. Dibacanya [갈께요], tapi ditulis ",
          b("갈게요"),
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
        ex("먼저 갈게. 내일 봐!", "Aku duluan ya. Sampai besok!", "반말"),
        callout(
          "warning",
          "Jebakan: -(으)ㄹ게요 nggak bisa dipakai buat nanya. ✗ 내일 올게요? salah. Buat nanya, pakai ",
          ref("-(으)ㄹ래요?", "ki-eullaeyo"),
          ": ",
          b("내일 올래요?"),
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("deh", "ik-deh"),
          ". Bedanya sama ",
          b("-(으)ㄹ 거예요"),
          ": 갈 거예요 cuma info rencana, 갈게요 janji ke pendengar.",
        ),
      ],
    },
    "ki-eullaeyo": {
      description:
        "-(으)ㄹ래요? artinya mau …? kalau nanya, dan aku mau … (aja) kalau jawab.",
      blocks: [
        grammar({
          number: "07",
          title: "-(으)ㄹ래요",
          descriptionKo:
            "상대방이 뭘 하고 싶은지 묻거나 내가 하고 싶은 것을 말할 때 써요.",
          descriptionTranslation:
            "Artinya “mau …?” kalau nanya, dan “aku mau … (aja)” kalau jawab. Ini soal pilihan atau kemauan saat itu. Rasanya santai dan akrab, cocok ke temen atau rekan kerja sebaya.",
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
            {
              condition: "Negatif",
              form: "안 -(으)ㄹ래요",
              example: "안 갈래요",
            },
            { condition: "반말", form: "-(으)ㄹ래?", example: "먹을래?" },
          ],
          examples: [
            { before: "뭐 먹", emphasis: "을래요", after: "?" },
            { before: "저는 라면 먹", emphasis: "을래요", after: "." },
          ],
          tipKo: "윗사람에게는 “드실래요?”, “드시겠어요?”처럼 높여서 물어봐요.",
          tipTranslation:
            "Ke atasan, naikin sedikit jadi -(으)실래요? atau -(으)시겠어요?: 커피 드실래요?, 커피 드시겠어요?",
        }),
        p(
          b("Artinya apa sih? "),
          i("Mau makan apa?"),
          " → 뭐 먹을래요?. ",
          i("Aku ramyeon aja"),
          " → 저는 라면 먹을래요. Versi 반말-nya favorit buat ngajak temen: ",
          b("주말에 같이 영화 볼래?"),
        ),
        h3("Contoh"),
        ex("뭐 먹을래요?", "Mau makan apa?"),
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
        callout(
          "warning",
          "Jebakan: hati-hati sama ㄹ. ",
          b("올래요?"),
          " = ",
          i("mau dateng?"),
          ", tapi ",
          b("오래요"),
          " = ",
          i("(dia) nyuruh dateng"),
          ", dari ",
          ref("-래요", "ki-daeyo"),
          ". Bedanya cuma ada ㄹ di bawah atau nggak.",
        ),
        callout(
          "tip",
          "Ditanya 뭐 먹을래요? dan mau jawab ",
          i("terserah"),
          "? Cek ",
          ref("terserah", "ik-terserah"),
          ". Bedanya sama ",
          ref("-고 싶다", "ki-go-sipda"),
          ": 라면 먹고 싶어요 = lagi pengen, 라면 먹을래요 = pilih itu sekarang.",
        ),
      ],
    },
  },
  vocabulary: {
    title: "Kosakata: Minta, ajak, janji",
    description:
      "Tujuh pola buat minta tolong, nyuruh sopan, ngelarang, ngajak, dan janji. Masing-masing dengan arti dan satu contoh.",
    entries: [
      {
        term: "-아/어 주세요",
        meanings: ["tolong …", "-in"],
        example: {
          ko: "천천히 말해 주세요.",
          id: "Tolong ngomongnya pelan-pelan ya.",
        },
      },
      {
        term: "-(으)세요",
        meanings: ["silakan", "… ya"],
        example: { ko: "여기 앉으세요.", id: "Silakan duduk sini." },
      },
      {
        term: "-지 마세요",
        meanings: ["jangan"],
        example: { ko: "걱정하지 마세요.", id: "Jangan khawatir." },
      },
      {
        term: "-(으)ㄹ까요?",
        meanings: ["yuk?", "mau aku …?", "gimana kalau …?"],
        example: { ko: "같이 점심 먹을까요?", id: "Makan siang bareng yuk?" },
      },
      {
        term: "-(으)ㅂ시다",
        meanings: ["mari", "ayo kita"],
        example: { ko: "자, 이제 시작합시다.", id: "Oke, ayo kita mulai." },
      },
      {
        term: "-(으)ㄹ게요",
        meanings: ["aku … ya", "… deh"],
        example: {
          ko: "끝나면 연락할게요.",
          id: "Nanti kalau udah kelar aku kabarin.",
        },
      },
      {
        term: "-(으)ㄹ래요?",
        meanings: ["mau …?", "aku mau …"],
        example: { ko: "뭐 먹을래요?", id: "Mau makan apa?" },
      },
    ],
  },
  quiz: {
    title: "Kuis: Minta, ajak, janji",
    description:
      "12 soal buat ngecek kamu udah bisa milih -아/어 주세요, -(으)세요, -지 마세요, -(으)ㄹ까요?, -(으)ㅂ시다, -(으)ㄹ게요, dan -(으)ㄹ래요 sesuai situasi.",
    passingScore: 70,
    questions: [
      {
        key: "ma-a-juseyo-1",
        prompt:
          "Kamu minta ke kasir 편의점: “Tolong panasin ya.” (panasin = 데우다). Yang paling pas?",
        options: [
          { text: "좀 데워 주세요.", correct: true },
          { text: "좀 데우세요." },
          { text: "좀 데웁시다." },
          { text: "좀 데울게요." },
        ],
        explanation:
          "Kasirnya manasin buat kamu, jadi pakai -아/어 주세요 (rasa “-in”). 데우세요 kedengeran nyuruh, 데웁시다 ngajak bareng, 데울게요 malah kamu yang janji manasin.",
      },
      {
        key: "ma-a-juseyo-2",
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
        key: "ma-euseyo-1",
        prompt:
          "반장님 pulang duluan, kamu masih di pabrik. Kamu bilang apa ke dia?",
        options: [
          { text: "안녕히 가세요.", correct: true },
          { text: "안녕히 계세요." },
          { text: "안녕히 주무세요." },
        ],
        explanation:
          "Orang yang pergi dikasih 안녕히 가세요 (hati-hati di jalan). 안녕히 계세요 buat orang yang tetap tinggal, jadi itu kalimat dia ke kamu. 주무세요 buat selamat tidur.",
      },
      {
        key: "ma-euseyo-2",
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
        key: "ma-ji-maseyo-1",
        prompt:
          "선배 Korea-mu mau pulang duluan. Kamu bilang “Jangan pergi dulu dong.” versi sopan:",
        options: [
          { text: "가지 마세요.", correct: true },
          { text: "안 가세요." },
          { text: "가지 않아요." },
          { text: "가면 돼요." },
        ],
        explanation:
          "“Jangan …” = -지 마세요. 안 가세요 justru nanya “nggak pergi?”, 가지 않아요 = “nggak pergi”, dan 가면 돼요 = “pergi aja, oke”. Jebakan klasik!",
      },
      {
        key: "ma-ji-maseyo-2",
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
        key: "ma-eulkkayo-1",
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
        key: "ma-eulkkayo-vs-eullaeyo-1",
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
        key: "ma-eupsida-1",
        prompt: "Kamu mau ngajak 사장님 makan siang bareng. Yang paling aman?",
        options: [
          { text: "사장님, 같이 식사하러 가실까요?", correct: true },
          { text: "사장님, 같이 식사합시다." },
          { text: "사장님, 같이 식사할래?" },
          { text: "사장님, 같이 식사할게요." },
        ],
        explanation:
          "식사합시다 kedengeran kayak kamu yang ngatur bos. 할래? itu 반말, dan 할게요 cuma janji dari kamu. Ke atasan, ngajak sambil nanya pakai -(으)실까요?.",
      },
      {
        key: "ma-eulgeyo-1",
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
        key: "ma-eulgeyo-2",
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
        key: "ma-eullaeyo-1",
        prompt:
          "Tanya bestie (반말): “Mau nonton bareng weekend ini?” Yang benar?",
        options: [
          { text: "이번 주말에 같이 영화 볼래?", correct: true },
          { text: "이번 주말에 같이 영화 볼게?" },
          { text: "이번 주말에 같이 영화 보래?" },
          { text: "이번 주말에 같이 영화 봅시다?" },
        ],
        explanation:
          "Nanya kemauan temen = -(으)ㄹ래?. 볼게 nggak bisa nanya, 보래 artinya “katanya disuruh nonton”, dan 봅시다 bukan pertanyaan, apalagi ke bestie.",
      },
    ],
  },
});
