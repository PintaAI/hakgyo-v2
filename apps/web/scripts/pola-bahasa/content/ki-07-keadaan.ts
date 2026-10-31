import { b, callout, defineBab, ex, grammar, h3, i, p, ref } from "../blocks";

export default defineBab({
  key: "ki-07-keadaan",
  materials: {
    "ki-a-boda": {
      description:
        "-아/어 보다 = coba ...: nyaranin, nawarin diri, dan (kalau lampau) pernah.",
      blocks: [
        grammar({
          number: "01",
          title: "-아/어 보다",
          descriptionKo: "어떤 일을 한번 시험 삼아 할 때 써요.",
          descriptionTranslation:
            "Artinya ‘coba ...’. Dipakai buat nyaranin (‘coba deh’), nawarin diri (‘aku coba ya’), atau minta izin nyoba. Kalau bentuknya lampau, artinya jadi ‘pernah’: 가 봤어요 = aku pernah ke sana.",
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
          theme: "blue",
        }),
        p(
          b("Artinya apa sih? "),
          b("-아/어 보다 = coba"),
          ". Tambahin 한번 biar makin natural: 한번 먹어 보세요 = ",
          i("cobain deh"),
          ". Satu hal lagi: kalau lampau, artinya ",
          i("pernah"),
          ", bukan ‘udah nyoba’.",
        ),
        h3("Contoh"),
        ex(
          "이 김치 한번 먹어 보세요. 안 매워요.",
          "Cobain deh kimchi ini. Nggak pedas kok.",
        ),
        ex("이 신발 신어 봐도 돼요?", "Sepatu ini boleh dicoba?", "di toko"),
        ex("제가 사장님한테 한번 물어볼게요.", "Aku coba tanyain ke bos ya."),
        ex("한복 입어 봤어요?", "Pernah pakai hanbok?"),
        ex(
          "이 노래 들어 봐. 진짜 좋아.",
          "Dengerin deh lagu ini. Bagus banget.",
          "반말",
        ),
        callout(
          "warning",
          "‘Coba’ di bahasa Indonesia juga dipakai buat berandai-andai. ‘Coba kemarin kamu datang’ itu bukan nyoba, jadi jangan pakai ✗ 어제 와 보세요. Itu pakai ",
          ref("-았/었으면 좋았을 텐데", "ki-asseumyeon-teonde"),
          ".",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("deh", "ik-deh"),
          ". Bedanya sama ",
          ref("-(으)ㄴ 적이 있다", "ki-eun-jeok"),
          ": 가 봤어요 dan 간 적이 있어요 sama-sama ‘pernah ke sana’, yang pertama lebih santai.",
        ),
      ],
    },
    "ki-eun-jeok": {
      description:
        "-(으)ㄴ 적이 있다/없다 = pernah dan nggak pernah, buat pengalaman yang spesial.",
      blocks: [
        grammar({
          number: "02",
          title: "-(으)ㄴ 적이 있다 / 없다",
          descriptionKo: "과거에 그런 경험이 있는지 없는지 말할 때 써요.",
          descriptionTranslation:
            "Artinya ‘pernah’ (있다) dan ‘nggak pernah’ (없다). Biasanya buat pengalaman yang jarang atau spesial, bukan rutinitas. Sering digabung sama -아/어 보다 jadi -아/어 본 적이 있다.",
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
              example: "만들다 → 만든 적이 있다",
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
          theme: "blue",
        }),
        p(
          b("Artinya apa sih? "),
          i("Pernah"),
          " dan ",
          i("nggak pernah"),
          " nyambung satu-satu. ",
          b("적"),
          " artinya kira-kira ‘waktu, momen’, jadi 간 적이 있어요 secara harfiah: ‘ada momen aku pergi’.",
        ),
        h3("Contoh"),
        ex("한국 음식 먹어 본 적 있어요?", "Pernah makan makanan Korea?"),
        ex(
          "저는 눈을 본 적이 없어요. 인도네시아에는 눈이 안 오거든요.",
          "Aku belum pernah lihat salju. Soalnya di Indonesia nggak ada salju.",
        ),
        ex(
          "지하철에서 지갑을 잃어버린 적이 있어요.",
          "Aku pernah kehilangan dompet di subway.",
        ),
        ex(
          "저는 한 번도 지각한 적이 없어요.",
          "Aku sekali pun belum pernah telat.",
        ),
        ex(
          "드라마 촬영하는 거 본 적 있어?",
          "Pernah lihat syuting drakor?",
          "반말",
        ),
        callout(
          "warning",
          "‘Belum’ dan ‘belum pernah’ beda pola. ‘Belum makan’ (hari ini) = 아직 안 먹었어요. ‘Belum pernah makan’ (seumur hidup) = 먹어 본 적이 없어요. Jangan pakai 적이 없다 buat rutinitas kayak makan siang hari ini.",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("belum", "ik-belum"),
          ". Bedanya sama ",
          ref("-아/어 봤어요", "ki-a-boda"),
          ": artinya sama-sama pernah, tapi 가 봤어요 lebih santai.",
        ),
      ],
    },
    "ki-go-itda": {
      description:
        "-고 있다 = lagi / sedang ngelakuin sesuatu yang ada aksinya.",
      blocks: [
        grammar({
          number: "03",
          title: "-고 있다",
          descriptionKo: "어떤 행동을 지금 하고 있을 때 써요.",
          descriptionTranslation:
            "Artinya ‘lagi / sedang’ ngelakuin sesuatu. Bisa buat detik ini (‘lagi makan’) atau buat periode yang lagi jalan (‘lagi belajar bahasa Korea akhir-akhir ini’). Juga dipakai buat ‘lagi pakai’ baju, topi, dan masker.",
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
              form: "입고 / 신고 / 쓰고 있다",
              example: "모자를 쓰고 있어요",
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
          theme: "blue",
        }),
        p(
          b("Artinya apa sih? "),
          b("-고 있다 = lagi / sedang"),
          " + kata kerja yang ada aksinya. Kalau kamu bisa bayangin orangnya lagi gerak (",
          i("makan, kerja, jalan"),
          "), pakai -고 있다.",
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
        ex("전화했을 때 자고 있었어요.", "Pas kamu nelepon, aku lagi tidur."),
        ex(
          "지금 가고 있어! 5분만!",
          "Lagi di jalan nih! Lima menit lagi!",
          "반말",
        ),
        callout(
          "warning",
          "‘Lagi duduk’ dan ‘lagi berdiri’ itu keadaan, bukan aksi. Pakai ",
          ref("-아/어 있다", "ki-a-itda"),
          ": 앉아 있어요, bukan ✗ 앉고 있어요 (artinya malah ‘lagi proses duduk’).",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("masih", "ik-masih"),
          ": ‘masih kerja’ = 아직 일하고 있어요.",
        ),
      ],
    },
    "ki-a-itda": {
      description:
        "-아/어 있다 = dalam keadaan: pintu terbuka, lampu nyala, lagi duduk.",
      blocks: [
        grammar({
          number: "04",
          title: "-아/어 있다",
          descriptionKo: "어떤 일이 끝난 뒤 그 상태가 계속될 때 써요.",
          descriptionTranslation:
            "Dipakai buat keadaan yang tersisa setelah sesuatu terjadi: pintunya terbuka, lampunya nyala, dia lagi duduk. Jembatan terbaiknya imbuhan ter-: terbuka, tertutup, tertempel. Cuma bisa dipakai sama kata kerja yang nggak punya objek.",
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
              condition: "Kata kerja pasif",
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
              before: "냉장고에 김밥이 하나 ",
              emphasis: "남아 있어요",
              after: ".",
            },
          ],
          theme: "blue",
        }),
        p(
          b("Artinya apa sih? "),
          "Bayangin foto, bukan video. -고 있다 itu video: ada gerakan yang lagi jalan. -아/어 있다 itu foto: aksinya udah selesai, tinggal keadaannya. Rasanya kayak ",
          b("ter-"),
          ": pintu ",
          i("terbuka"),
          " = 문이 열려 있어요.",
        ),
        h3("Contoh"),
        ex(
          "문이 열려 있어요. 닫아 주세요.",
          "Pintunya terbuka. Tolong ditutup.",
        ),
        ex("민수 씨는 저기 앉아 있어요.", "Minsu lagi duduk di sana."),
        ex(
          "퇴근 시간인데 사무실 불이 아직 켜져 있어요.",
          "Udah jam pulang, tapi lampu kantor masih nyala.",
        ),
        ex(
          "벽에 안전 수칙이 붙어 있어요.",
          "Di dinding ada aturan keselamatan yang tertempel.",
          "pabrik",
        ),
        ex(
          "냉장고에 김밥 하나 남아 있어.",
          "Di kulkas masih sisa satu kimbap.",
          "반말",
        ),
        callout(
          "warning",
          "Pakaian itu pengecualian. ‘Lagi pakai masker’ = 마스크를 쓰고 있어요, bukan ✗ 마스크를 써 있어요. Kata kerja yang punya objek (먹다, 입다, 열다) nggak bisa pakai -아/어 있다.",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("masih", "ik-masih"),
          ": ‘lampunya masih nyala’ = 불이 아직 켜져 있어요. Bedanya sama ",
          ref("-고 있다", "ki-go-itda"),
          ": 앉아 있어요 (lagi duduk, keadaan) vs 먹고 있어요 (lagi makan, aksi).",
        ),
      ],
    },
    "ki-a-beorida": {
      description:
        "-아/어 버리다 = terlanjur, keburu: kejadian yang tuntas dan nggak bisa dibalikin.",
      blocks: [
        grammar({
          number: "05",
          title: "-아/어 버리다",
          descriptionKo: "어떤 일이 완전히 끝나서 되돌릴 수 없을 때 써요.",
          descriptionTranslation:
            "Nambahin rasa ‘tuntas, nggak bisa dibalikin’. Bisa nyesel (‘yah, keburu habis’), bisa juga lega (‘udah, beresin aja sekalian’). Ini kunci buat rasa ke- dan ter- Indonesia: ketiduran, keceplosan.",
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
              before: "너무 피곤해서 ",
              emphasis: "잠들어 버렸어요",
              after: ".",
            },
          ],
          theme: "blue",
        }),
        p(
          b("Artinya apa sih? "),
          "버리다 sendiri artinya ‘buang’. Ditempel ke kata kerja lain, artinya jadi ‘sampai habis, tuntas’. Bahasa Indonesia punya banyak cara buat rasa ini: ",
          i("keburu, terlanjur, ketiduran, keceplosan"),
          ".",
        ),
        h3("Contoh"),
        ex(
          "동생이 제 케이크를 다 먹어 버렸어요.",
          "Kueku keburu dihabisin adikku.",
        ),
        ex(
          "뛰어갔는데 버스가 벌써 떠나 버렸어요.",
          "Udah lari-lari, busnya keburu jalan.",
        ),
        ex(
          "비밀인데 친구한테 말해 버렸어요.",
          "Padahal rahasia, aku keceplosan ngomong ke teman.",
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
        callout(
          "warning",
          "Jangan tempel 버리다 ke semua kalimat lampau. 밥 먹었어요 itu netral. 밥 먹어 버렸어요 bikin orang nanya ‘loh, kenapa? harusnya nggak dimakan?’. Pakai cuma kalau ada rasa nyesel, kaget, atau lega.",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("rumus ke-/ter-", "ik-ke-an-rumus"),
          ", ",
          ref("ketiduran", "ik-ketiduran"),
          ", dan ",
          ref("keceplosan", "ik-keceplosan"),
          ". Buat rasa ‘tanpa sadar’, pasangin sama ",
          ref("나도 모르게", "ki-kkamppak"),
          ".",
        ),
      ],
    },
    "ki-ge-doeda": {
      description:
        "-게 되다 = jadi, akhirnya: hasil yang muncul karena keadaan, bukan rencana.",
      blocks: [
        grammar({
          number: "06",
          title: "-게 되다",
          descriptionKo: "상황 때문에 어떤 결과가 생겼을 때 써요.",
          descriptionTranslation:
            "Artinya ‘jadi ...’ atau ‘akhirnya ...’ karena keadaan, bukan murni keputusan sendiri. Juga dipakai buat ngomong rendah hati: daripada ‘aku memutuskan kerja di sini’, orang Korea bilang ‘aku jadi kerja di sini’.",
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
              condition: "Jadinya nggak bisa",
              form: "못 -게 됐어요",
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
          theme: "blue",
        }),
        p(
          b("Artinya apa sih? "),
          "Bahasa Indonesia sering pakai ",
          i("jadi"),
          " buat rasa ini: ",
          i("‘Aku jadi suka K-pop gara-gara teman.’ ‘Jadinya kita lembur.’"),
          " Hasilnya muncul karena keadaan, bukan karena kamu rencanain dari awal.",
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
          "안녕하세요. 이번에 같이 일하게 된 리나입니다.",
          "Halo, saya Rina, yang mulai sekarang kerja bareng di sini.",
          "perkenalan hari pertama",
        ),
        ex(
          "주문이 많아서 이번 주말에도 일하게 됐어요.",
          "Pesanannya banyak, jadinya weekend ini juga kerja.",
        ),
        ex(
          "일이 생겨서 못 가게 됐어요.",
          "Ada urusan, jadinya nggak bisa datang.",
        ),
        callout(
          "warning",
          "‘Jadi’ buat kata sifat (jadi dingin, jadi sibuk) bukan -게 되다, tapi ",
          ref("-아/어지다", "ki-ajida"),
          ": 추워졌어요, bukan ✗ 춥게 됐어요. Gampangnya: kata kerja → -게 되다, kata sifat → -아/어지다.",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("nggak jadi", "ik-nggak-jadi"),
          ". Bedanya sama ",
          ref("-기로 하다", "ki-giro-hada"),
          ": -기로 하다 itu kamu sendiri yang mutusin.",
        ),
      ],
    },
    "ki-ajida": {
      description:
        "-아/어지다 = jadi (berubah): kata sifat yang keadaannya berubah, jadi dingin, jadi sibuk.",
      blocks: [
        grammar({
          number: "07",
          title: "-아/어지다",
          descriptionKo: "형용사에 붙어서 상태가 바뀌는 것을 나타내요.",
          descriptionTranslation:
            "Ditempel ke kata sifat buat bilang ‘jadi ...’: jadi dingin, jadi sibuk, jadi lebih baik. Tambahin 점점 biar rasanya ‘makin’: 점점 추워져요 = makin dingin.",
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
          ],
          examples: [
            { before: "날씨가 많이 ", emphasis: "추워졌어요", after: "." },
            {
              before: "한국어 실력이 많이 ",
              emphasis: "좋아졌어요",
              after: "!",
            },
            { before: "요즘 일이 ", emphasis: "바빠졌어요", after: "." },
          ],
          theme: "blue",
        }),
        p(
          b("Artinya apa sih? "),
          "Bayangin perubahan: tadinya A, sekarang B. ",
          i(
            "‘Udah mulai dingin.’ ‘Kerjaan jadi sibuk.’ ‘Bahasa Koreamu makin jago!’",
          ),
          " Semua itu -아/어지다.",
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
        ex("날씨가 점점 따뜻해져요.", "Cuacanya makin hangat."),
        callout(
          "warning",
          "좋아지다 dan 좋아하다 beda jauh. 좋아졌어요 = jadi lebih baik (cuaca, kondisi, skill). ‘Jadi suka’ itu dari kata kerja, jadi pakai ",
          ref("-게 되다", "ki-ge-doeda"),
          ": 좋아하게 됐어요, bukan ✗ 좋아해졌어요.",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("makin ... makin", "ik-makin"),
          ". Bedanya sama ",
          ref("-(으)면 -(으)ㄹ수록", "ki-eulsurok"),
          ": pola itu buat ‘makin A, makin B’, -아/어지다 cuma buat satu perubahan.",
        ),
      ],
    },
    "ki-eul-ppeonhada": {
      description:
        "-(으)ㄹ 뻔했다 = hampir aja ...: nyaris terjadi, tapi untungnya nggak.",
      blocks: [
        grammar({
          number: "08",
          title: "-(으)ㄹ 뻔했다",
          descriptionKo:
            "어떤 일이 일어날 것 같았지만 실제로는 일어나지 않았을 때 써요.",
          descriptionTranslation:
            "Artinya ‘hampir aja ...’, dan kejadiannya nggak beneran terjadi: hampir jatuh, hampir telat, hampir ketinggalan bus. Hampir selalu dalam bentuk lampau, dan sering diikuti rasa lega.",
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
              condition: "반말",
              form: "-(으)ㄹ 뻔했어",
              example: "넘어질 뻔했어",
            },
          ],
          examples: [
            { before: "지하철에서 ", emphasis: "넘어질 뻔했어요", after: "." },
            { before: "늦잠 자서 ", emphasis: "지각할 뻔했어요", after: "." },
            { before: "버스를 ", emphasis: "놓칠 뻔했어요", after: "." },
          ],
          theme: "blue",
        }),
        p(
          b("Artinya apa sih? "),
          i("Hampir"),
          " punya dua arti. ",
          i("Hampir jatuh"),
          " = nyaris terjadi, tapi nggak: -(으)ㄹ 뻔했다. ",
          i("Hampir selesai"),
          " = jumlahnya udah mendekati: ",
          ref("거의", "ki-geoui"),
          ". Bahasa Korea misahin keduanya.",
        ),
        h3("Contoh"),
        ex("늦잠 자서 지각할 뻔했어요.", "Bangun kesiangan, hampir aja telat."),
        ex("지하철에서 넘어질 뻔했어요.", "Hampir jatuh di subway."),
        ex(
          "버스를 놓칠 뻔했는데 다행히 탔어요.",
          "Hampir ketinggalan bus, untung masih kekejar.",
        ),
        ex("큰일 날 뻔했어요!", "Hampir aja gawat!"),
        ex(
          "영화가 너무 슬퍼서 울 뻔했어.",
          "Filmnya sedih banget, hampir nangis.",
          "반말",
        ),
        callout(
          "warning",
          "‘Hampir jatuh’ bukan ✗ 거의 넘어졌어요. Kalimat itu bikin orang Korea bingung: jadi kamu jatuh atau nggak? Kalau kejadiannya nggak terjadi, pakai -(으)ㄹ 뻔했다.",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("hampir", "ik-hampir"),
          ".",
        ),
      ],
    },
    "ki-cheok": {
      description:
        "-(으)ㄴ/는 척하다 = pura-pura, dan juga pas buat sok: sok tahu, sok sibuk.",
      blocks: [
        grammar({
          number: "09",
          title: "-(으)ㄴ/는 척하다",
          descriptionKo: "사실이 아닌데 그런 것처럼 행동할 때 써요.",
          descriptionTranslation:
            "Artinya ‘pura-pura’. Ini juga pas banget buat ‘sok’: sok tahu, sok sibuk, sok kuat. Bentuk di depan 척 ikut jenis kata dan waktunya, mirip -(으)ㄴ/는 것 같다.",
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
            { condition: "반말", form: "-는 척했어", example: "자는 척했어" },
          ],
          examples: [
            { before: "동생이 ", emphasis: "자는 척해요", after: "." },
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
          theme: "blue",
        }),
        p(
          b("Artinya apa sih? "),
          "Dua kata Indonesia sekaligus: ",
          b("pura-pura"),
          " dan ",
          b("sok"),
          ". ",
          i("Pura-pura tidur"),
          " = 자는 척하다. ",
          i("Sok sibuk"),
          " = 바쁜 척하다. ",
          i("Sok tahu"),
          " = 아는 척하다.",
        ),
        h3("Contoh"),
        ex(
          "사장님이 오니까 다들 바쁜 척했어요.",
          "Begitu bos datang, semua langsung sok sibuk.",
        ),
        ex(
          "친구가 불렀는데 못 들은 척했어요.",
          "Teman manggil, tapi aku pura-pura nggak dengar.",
        ),
        ex(
          "엄마가 오니까 동생이 자는 척해요.",
          "Begitu mama datang, adikku pura-pura tidur.",
        ),
        ex(
          "괜찮은 척했지만 사실 많이 힘들었어요.",
          "Aku pura-pura baik-baik aja, padahal sebenarnya berat banget.",
        ),
        ex(
          "모르면서 아는 척하지 마.",
          "Nggak tahu ya jangan sok tahu.",
          "반말",
        ),
        callout(
          "warning",
          "아는 척하다 punya dua arti. Bisa ‘sok tahu’, tapi juga ‘nyapa orang yang kamu kenal’. 왜 아까 아는 척 안 했어? = ‘Kok tadi nggak nyapa?’. Lihat konteksnya.",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("pura-pura", "ik-pura-pura"),
          ". Bedanya sama ",
          ref("-(으)ㄴ/는 것 같다", "ki-geot-gatda"),
          ": bagian depannya sama persis, tinggal ganti ujungnya.",
        ),
      ],
    },
  },
  vocabulary: {
    title: "Kosakata: Pengalaman dan keadaan",
    description:
      "Sembilan pola buat cerita pengalaman dan keadaan: coba, pernah, lagi, keburu, jadi, hampir, dan pura-pura.",
    entries: [
      {
        term: "-아/어 보다",
        meanings: ["coba", "pernah (lampau)"],
        example: {
          ko: "이 김치 한번 먹어 보세요.",
          id: "Cobain deh kimchi ini.",
        },
      },
      {
        term: "-(으)ㄴ 적이 있다",
        meanings: ["pernah", "nggak pernah (없다)"],
        example: {
          ko: "저는 눈을 본 적이 없어요.",
          id: "Aku belum pernah lihat salju.",
        },
      },
      {
        term: "-고 있다",
        meanings: ["lagi", "sedang"],
        example: {
          ko: "지금 밥 먹고 있어요.",
          id: "Lagi makan nih.",
        },
      },
      {
        term: "-아/어 있다",
        meanings: ["dalam keadaan", "ter-"],
        example: {
          ko: "문이 열려 있어요.",
          id: "Pintunya terbuka.",
        },
      },
      {
        term: "-아/어 버리다",
        meanings: ["keburu", "terlanjur", "habis deh"],
        example: {
          ko: "동생이 제 케이크를 다 먹어 버렸어요.",
          id: "Kueku keburu dihabisin adikku.",
        },
      },
      {
        term: "-게 되다",
        meanings: ["jadi", "akhirnya"],
        example: {
          ko: "드라마 보다가 한국어를 좋아하게 됐어요.",
          id: "Gara-gara nonton drakor, aku jadi suka bahasa Korea.",
        },
      },
      {
        term: "-아/어지다",
        meanings: ["jadi", "makin", "berubah"],
        example: {
          ko: "날씨가 많이 추워졌어요.",
          id: "Cuacanya udah jadi dingin banget.",
        },
      },
      {
        term: "-(으)ㄹ 뻔했다",
        meanings: ["hampir aja", "nyaris"],
        example: {
          ko: "늦잠 자서 지각할 뻔했어요.",
          id: "Bangun kesiangan, hampir aja telat.",
        },
      },
      {
        term: "-(으)ㄴ/는 척하다",
        meanings: ["pura-pura", "sok"],
        example: {
          ko: "사장님이 오니까 다들 바쁜 척했어요.",
          id: "Begitu bos datang, semua langsung sok sibuk.",
        },
      },
    ],
  },
  quiz: {
    title: "Kuis: Pengalaman dan keadaan",
    description:
      "12 soal pilihan ganda: coba, pernah, lagi, dalam keadaan, keburu, jadi, hampir, dan pura-pura. Lulus kalau benar minimal 70%.",
    passingScore: 70,
    questions: [
      {
        key: "ki07-a-boda-lampau",
        prompt: "Teman nanya, kamu jawab ‘제주도에 가 봤어요.’ Artinya?",
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
        key: "ki07-eun-jeok-salju",
        prompt: "‘Aku belum pernah lihat salju.’ Yang benar?",
        options: [
          { text: "저는 눈을 본 적이 없어요.", correct: true },
          { text: "저는 눈을 보고 있지 않아요." },
          { text: "저는 눈을 볼 뻔했어요." },
          { text: "저는 눈을 본 척했어요." },
        ],
        explanation:
          "‘Belum pernah’ (seumur hidup) = -(으)ㄴ 적이 없다. 보고 있지 않아요 artinya ‘lagi nggak lihat’, beda jauh.",
      },
      {
        key: "ki07-go-itda-makan",
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
        key: "ki07-a-itda-duduk",
        prompt: "‘Minsu lagi duduk di sana.’ Yang benar?",
        options: [
          { text: "민수 씨는 저기 앉아 있어요.", correct: true },
          { text: "민수 씨는 저기 앉고 있어요." },
          { text: "민수 씨는 저기 앉아 봤어요." },
          { text: "민수 씨는 저기 앉게 됐어요." },
        ],
        explanation:
          "Duduk itu keadaan setelah aksinya selesai, jadi -아/어 있다. 앉고 있어요 malah kedengeran kayak ‘lagi dalam proses duduk’.",
      },
      {
        key: "ki07-a-itda-pintu",
        prompt: "Kamu lihat pintu gudang lagi terbuka. Kamu bilang ke 반장님:",
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
        key: "ki07-go-itda-masker",
        prompt: "‘Orang yang lagi pakai masker itu 반장님.’ Yang benar?",
        options: [
          { text: "마스크를 쓰고 있는 사람이 반장님이에요.", correct: true },
          { text: "마스크를 써 있는 사람이 반장님이에요." },
          { text: "마스크를 쓰게 된 사람이 반장님이에요." },
        ],
        explanation:
          "Pakaian itu pengecualian: ‘lagi pakai’ baju, topi, atau masker selalu -고 있다, bukan -아/어 있다.",
      },
      {
        key: "ki07-a-beorida-kue",
        prompt: "‘Kueku keburu dihabisin adikku.’ Yang paling pas rasanya?",
        options: [
          { text: "동생이 제 케이크를 다 먹어 버렸어요.", correct: true },
          { text: "동생이 제 케이크를 다 먹게 됐어요." },
          { text: "동생이 제 케이크를 다 먹고 있어요." },
          { text: "동생이 제 케이크를 다 먹을 뻔했어요." },
        ],
        explanation:
          "‘Keburu, habis deh, nggak bisa dibalikin’ = -아/어 버리다. 먹을 뻔했어요 malah artinya hampir dimakan tapi nggak jadi.",
      },
      {
        key: "ki07-ge-doeda-suka",
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
        key: "ki07-ge-doeda-perkenalan",
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
      {
        key: "ki07-ajida-dingin",
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
        key: "ki07-ppeon-jatuh",
        prompt:
          "‘Hampir jatuh di subway’ (tapi untungnya nggak jatuh). Yang benar?",
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
        key: "ki07-cheok-sibuk",
        prompt:
          "‘Begitu bos datang, semua langsung sok sibuk.’ Bagian akhirnya?",
        options: [
          { text: "다들 바쁜 척했어요.", correct: true },
          { text: "다들 바쁘는 척했어요." },
          { text: "다들 바빠졌어요." },
          { text: "다들 바쁘게 됐어요." },
        ],
        explanation:
          "Pura-pura / sok = -(으)ㄴ/는 척하다. Kata sifat pakai -(으)ㄴ: 바쁜 척. 바빠졌어요 artinya beneran jadi sibuk, bukan pura-pura.",
      },
    ],
  },
});
