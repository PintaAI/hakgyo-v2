import { b, callout, defineBab, ex, grammar, h3, i, p, ref } from "../blocks";

/** One attachment rule row of a grammar card. */
const r = (condition: string, form: string, example: string) => ({
  condition,
  form,
  example,
});

/** One grammar-card example; `emphasis` is the pattern part. */
const e = (before: string, emphasis: string, after: string) => ({
  before,
  emphasis,
  after,
});

export default defineBab({
  key: "ki-02-penyambung-dasar",
  materials: {
    "ki-go": {
      description:
        "-고 itu dan atau terus versi nempel, buat nyebut dua hal atau dua kejadian berurutan.",
      blocks: [
        grammar({
          number: "01",
          title: "-고",
          descriptionKo:
            "두 가지를 나열하거나, 일을 순서대로 이어서 말할 때 써요.",
          descriptionTranslation:
            "-고 itu “dan” atau “terus” yang nempel di kata kerja. Bisa buat nyebut dua hal sekaligus (murah dan enak) atau dua kejadian berurutan (makan terus tidur). Cara nempelnya paling gampang: langsung tempel ke batang kata.",
          rules: [
            r("Batang berakhiran vokal", "-고", "가다 → 가고"),
            r("Batang berakhiran konsonan", "-고", "먹다 → 먹고"),
            r("하다", "-하고", "일하다 → 일하고"),
            r("Kata benda", "-(이)고", "학생이고, 친구고"),
            r("Lampau", "Cukup di akhir kalimat", "밥 먹고 잤어요"),
          ],
          examples: [
            e("이 식당은 ", "싸고", " 맛있어요."),
            e("밥 ", "먹고", " 잤어요."),
            e("저는 낮에 ", "일하고", " 밤에 공부해요."),
          ],
          tipKo: "순서대로 한 일은 보통 마지막 동사에만 과거를 붙여요.",
          tipTranslation:
            "Buat urutan kejadian, tanda lampau (-았/었) cukup di kata kerja terakhir. 밥 먹고 잤어요 udah jelas dua-duanya kemarin.",
        }),
        p(
          b("Artinya apa sih? "),
          "Anggap aja -고 itu ",
          i("dan"),
          " atau ",
          i("terus"),
          ". Bedanya, di Korea kata ",
          i("dan"),
          "-nya nempel di belakang kata kerja pertama, bukan berdiri sendiri.",
        ),
        h3("Contoh"),
        ex(
          "퇴근하고 바로 기숙사에 가요.",
          "Habis pulang kerja aku langsung ke asrama.",
        ),
        ex("손 씻고 밥 먹어.", "Cuci tangan dulu, terus makan.", "반말"),
        ex(
          "편의점에서 삼각김밥 사고 커피도 샀어요.",
          "Di minimarket aku beli kimbap segitiga, terus beli kopi juga.",
        ),
        ex(
          "이 노래는 가사도 좋고 멜로디도 좋아요.",
          "Lagu ini liriknya bagus, melodinya juga bagus.",
        ),
        callout(
          "warning",
          "Jebakan: orang Indonesia sering pakai -고 buat semua ",
          i("terus"),
          ". Padahal kalau kegiatan kedua terjadi di tempat itu atau pakai hasil kegiatan pertama, Korea pakai -아서. ",
          i("Ke pasar terus beli buah (di pasar itu)"),
          " = ",
          b("시장에 가서 과일을 샀어요"),
          ", bukan ",
          b("시장에 가고 과일을 샀어요"),
          ".",
        ),
        callout(
          "tip",
          "Bedanya sama ",
          ref("-아서/어서 (lalu)", "ki-aseo-lalu"),
          ": kegiatan keduanya masih nyambung sama yang pertama. Versi awal kalimatnya: ",
          ref("그리고", "ki-geurigo"),
          ".",
        ),
      ],
    },
    "ki-aseo-karena": {
      description:
        "-아서/어서 itu karena yang paling netral, nempel langsung di kata kerja alasannya.",
      blocks: [
        grammar({
          number: "02",
          title: "-아서/어서 (karena)",
          theme: "blue",
          descriptionKo: "앞의 내용이 뒤의 내용의 이유가 될 때 써요.",
          descriptionTranslation:
            "-아서/어서 itu “karena” atau “gara-gara” yang nempel di alasannya. Ini cara paling netral buat kasih alasan di obrolan sehari-hari. Alasan di depan, akibat di belakang, persis kayak “karena hujan, aku nggak pergi”.",
          rules: [
            r(
              "Vokal terakhir ㅏ atau ㅗ",
              "-아서",
              "가다 → 가서, 좋다 → 좋아서",
            ),
            r("Vokal lain", "-어서", "먹다 → 먹어서, 마시다 → 마셔서"),
            r("하다", "-해서", "피곤하다 → 피곤해서"),
            r("ㅡ hilang", "-아서/어서", "바쁘다 → 바빠서, 아프다 → 아파서"),
            r("Kata benda", "-(이)라서", "휴일이라서, 휴가라서"),
            r("Lampau", "Nggak boleh -았/었", "늦어서 (bukan 늦었어서)"),
          ],
          examples: [
            e("비가 ", "와서", " 못 갔어요."),
            e("배가 ", "아파서", " 일찍 퇴근했어요."),
            e("길이 ", "막혀서", " 늦었어요."),
          ],
          tipKo: "-아서/어서 뒤에는 명령이나 제안이 오지 않아요.",
          tipTranslation:
            "Habis -아서 jangan pakai perintah atau ajakan. Buat itu, pakai -(으)니까.",
        }),
        p(
          b("Artinya apa sih? "),
          "-아서 itu ",
          i("karena"),
          " atau ",
          i("soalnya"),
          " yang langsung nempel di kata kerja alasannya. ",
          i("Karena hujan"),
          " jadinya ",
          b("비가 와서"),
          ". Tanda waktunya cukup ditaruh di akhir kalimat.",
        ),
        h3("Contoh"),
        ex(
          "늦어서 죄송합니다.",
          "Maaf saya telat.",
          "kalimat wajib di tempat kerja",
        ),
        ex(
          "어제 너무 피곤해서 일찍 잤어요.",
          "Kemarin capek banget, jadi aku tidur cepet.",
        ),
        ex(
          "만나서 반가워요.",
          "Seneng ketemu kamu.",
          "literally karena ketemu, aku seneng",
        ),
        ex(
          "기계가 고장 나서 오늘 작업이 일찍 끝났어요.",
          "Mesinnya rusak, jadi kerjaan hari ini kelar lebih cepet.",
        ),
        ex(
          "비가 안 와서 다행이에요.",
          "Untung nggak hujan.",
          "-아서 다행이다 = untung ...",
        ),
        callout(
          "warning",
          "Jebakan: jangan pakai bentuk lampau sebelum -아서. ",
          b("왔어서"),
          " dan ",
          b("늦었어서"),
          " itu salah. Tulis ",
          b("와서"),
          ", ",
          b("늦어서"),
          ", lampaunya taruh di akhir: ",
          b("늦어서 버스를 놓쳤어요."),
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("soalnya", "ik-soalnya"),
          ", ",
          ref("gara-gara", "ik-gara-gara"),
          ", dan ",
          ref("untung", "ik-untung"),
          ". Bedanya sama ",
          ref("-(으)니까", "ki-nikka"),
          ": habis -(으)니까 boleh perintah dan ajakan.",
        ),
      ],
    },
    "ki-aseo-lalu": {
      description:
        "-아서/어서 juga bisa berarti lalu, kalau kegiatan kedua masih nyambung sama tempat atau hasil kegiatan pertama.",
      blocks: [
        grammar({
          number: "03",
          title: "-아서/어서 (lalu)",
          theme: "blue",
          descriptionKo:
            "앞의 행동을 하고, 그 장소나 결과를 이어서 뒤의 행동을 할 때 써요.",
          descriptionTranslation:
            "Bentuknya sama persis dengan -아서 “karena”, tapi artinya “terus” yang masih nyambung. Kegiatan kedua terjadi di tempat itu, sama orang itu, atau pakai hasil kegiatan pertama.",
          rules: [
            r("Vokal terakhir ㅏ atau ㅗ", "-아서", "가다 → 가서, 오다 → 와서"),
            r("Vokal lain", "-어서", "만들다 → 만들어서, 열다 → 열어서"),
            r("하다", "-해서", "요리하다 → 요리해서"),
            r("Lampau", "Tetap tanpa -았/었", "가서 샀어요"),
            r(
              "Kata kerja yang sering dipakai",
              "가다, 오다, 만나다, 앉다, 일어나다, 만들다",
              "앉아서 기다려요",
            ),
          ],
          examples: [
            e("시장에 ", "가서", " 과일을 샀어요."),
            e("친구를 ", "만나서", " 같이 밥을 먹었어요."),
            e("여기 ", "앉아서", " 기다리세요."),
          ],
          tipKo: "이 뜻일 때는 뒤에 명령이나 제안이 와도 괜찮아요.",
          tipTranslation:
            "Buat arti “lalu” ini, perintah dan ajakan boleh banget: 가서 물어보세요 = “sana tanya langsung”.",
        }),
        p(
          b("Artinya apa sih? "),
          "Logikanya kayak ",
          i("terus di situ"),
          " atau ",
          i("terus pakai itu"),
          ". Kegiatan pertama jadi panggung buat kegiatan kedua. Ketemu teman → makan bareng teman itu.",
        ),
        h3("Contoh"),
        ex(
          "편의점에 가서 물 좀 사 올게요.",
          "Aku ke minimarket bentar ya, beli air.",
        ),
        ex(
          "박스를 열어서 수량을 확인해 주세요.",
          "Buka kardusnya, terus cek jumlahnya ya.",
          "instruksi 반장님",
        ),
        ex(
          "돈을 모아서 부모님께 보내 드렸어요.",
          "Aku ngumpulin uang, terus aku kirim ke ortu.",
        ),
        ex(
          "김밥을 만들어서 동료들한테 줬어요.",
          "Aku bikin kimbap, terus aku kasih ke rekan kerja.",
        ),
        ex("사진 찍어서 보내 줘.", "Fotoin terus kirim ke aku ya.", "반말"),
        callout(
          "warning",
          "Jebakan: kata ",
          i("terus"),
          " bikin orang Indonesia refleks pakai -고. Tanya diri sendiri: kegiatan kedua terjadi di tempat itu, sama orang itu, atau pakai benda itu? Kalau iya, pakai -아서. ",
          b("친구를 만나서 영화를 봤어요"),
          " = nonton bareng teman itu. ",
          b("친구를 만나고 집에 왔어요"),
          " = habis itu pulang sendiri.",
        ),
        callout(
          "tip",
          "Bedanya sama ",
          ref("-아서/어서 (karena)", "ki-aseo-karena"),
          ": kalau bagian kedua itu perasaan atau keadaan, biasanya artinya karena (",
          b("친구를 만나서 기뻤어요"),
          "). Pembanding lainnya: ",
          ref("-고", "ki-go"),
          ".",
        ),
      ],
    },
    "ki-nikka": {
      description:
        "-(으)니까 itu karena yang nekenin alasan, dan boleh dilanjut perintah, ajakan, atau saran.",
      blocks: [
        grammar({
          number: "04",
          title: "-(으)니까",
          theme: "blue",
          descriptionKo:
            "이유를 말할 때 써요. 뒤에 명령이나 제안이 올 수 있어요.",
          descriptionTranslation:
            "-(으)니까 juga “karena”, tapi nadanya nekenin alasan, kayak “kan..., makanya...”. Kelebihannya: boleh dilanjut perintah, ajakan, atau saran.",
          rules: [
            r("Batang berakhiran vokal", "-니까", "가다 → 가니까"),
            r("Batang berakhiran konsonan", "-으니까", "먹다 → 먹으니까"),
            r(
              "Batang berakhiran ㄹ",
              "ㄹ hilang + -니까",
              "살다 → 사니까, 멀다 → 머니까",
            ),
            r("하다", "-하니까", "피곤하다 → 피곤하니까"),
            r("ㅂ tak beraturan", "-우니까", "춥다 → 추우니까"),
            r("Kata benda", "-(이)니까", "주말이니까, 친구니까"),
            r("Lampau", "-았/었으니까", "늦었으니까, 먹었으니까"),
          ],
          examples: [
            e("", "피곤하니까", " 좀 쉬세요."),
            e("비가 ", "오니까", " 우산 가져가세요."),
            e("", "늦었으니까", " 택시 타요."),
          ],
          tipKo: "-(으)니까는 과거 '-았/었-'과 같이 쓸 수 있어요.",
          tipTranslation:
            "Beda dengan -아서, -(으)니까 boleh pakai lampau: 다 먹었으니까 가자 = “udah selesai makan, yuk cabut”.",
        }),
        p(
          b("Artinya apa sih? "),
          "Kalau -아서 itu ",
          i("karena"),
          " yang kalem, -(으)니까 itu ",
          i("kan..., makanya..."),
          ". Alasannya kamu sodorin sebagai dasar buat apa yang mau kamu minta, saranin, atau putusin.",
        ),
        h3("Contoh"),
        ex(
          "오늘 추우니까 따뜻하게 입고 나가.",
          "Hari ini dingin, jadi pakai baju yang anget ya.",
          "반말",
        ),
        ex(
          "이건 위험하니까 만지지 마세요.",
          "Ini bahaya, jadi jangan dipegang ya.",
        ),
        ex("시간이 없으니까 빨리 해요.", "Waktunya mepet, cepetan yuk."),
        ex(
          "오늘 월급날이니까 내가 살게!",
          "Hari ini gajian, aku yang traktir!",
          "반말",
        ),
        callout(
          "warning",
          "Jebakan: buat minta maaf, terima kasih, dan salam, pakai -아서. ",
          b("늦었으니까 죄송합니다"),
          " kedengeran kayak nyari pembenaran. Yang bener ",
          b("늦어서 죄송합니다"),
          ". Sama juga: ",
          b("만나서 반가워요"),
          ", bukan ",
          b("만나니까 반가워요"),
          ".",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("soalnya", "ik-soalnya"),
          ". Bedanya sama ",
          ref("-아서/어서 (karena)", "ki-aseo-karena"),
          ": -아서 nggak bisa disusul perintah. Versi awal kalimatnya: ",
          ref("그러니까", "ki-geureonikka"),
          ".",
        ),
      ],
    },
    "ki-jiman": {
      description:
        "-지만 itu tapi yang nempel di kata kerja atau kata sifat, buat kontras yang jelas.",
      blocks: [
        grammar({
          number: "05",
          title: "-지만",
          theme: "rose",
          descriptionKo: "앞의 내용과 반대되는 내용을 말할 때 써요.",
          descriptionTranslation:
            "-지만 itu “tapi” yang nempel di kata kerja atau kata sifat. Kontrasnya jelas: bagian depan dan belakang beda arah. Nadanya netral sampai agak formal, jadi aman dipakai ke siapa aja.",
          rules: [
            r("Semua batang", "-지만", "비싸다 → 비싸지만, 먹다 → 먹지만"),
            r("하다", "-하지만", "피곤하다 → 피곤하지만"),
            r("Kata benda", "-(이)지만", "학생이지만, 친구지만"),
            r("Lampau", "-았/었지만", "먹었지만, 공부했지만"),
            r("Dugaan", "-겠지만", "힘들겠지만"),
          ],
          examples: [
            e("", "비싸지만", " 맛있어요."),
            e("열심히 ", "공부했지만", " 시험에 떨어졌어요."),
            e("", "죄송하지만", " 좀 도와주시겠어요?"),
          ],
          tipKo: "'죄송하지만', '미안하지만'은 부탁하기 전에 자주 써요.",
          tipTranslation:
            "죄송하지만 = “maaf, tapi...” atau “permisi”, pembuka sopan sebelum minta tolong.",
        }),
        p(
          b("Artinya apa sih? "),
          "Simpel: -지만 = ",
          i("tapi"),
          ". Tempel ke kata sebelum ",
          i("tapi"),
          ". ",
          i("Mahal tapi enak"),
          " → ",
          b("비싸지만 맛있어요"),
          ".",
        ),
        h3("Contoh"),
        ex(
          "월급은 적지만 일은 편해요.",
          "Gajinya kecil, tapi kerjaannya santai.",
        ),
        ex(
          "한국 음식은 좋아하지만 너무 매운 건 못 먹어요.",
          "Aku suka makanan Korea, tapi yang pedes banget aku nggak kuat.",
        ),
        ex("죄송하지만 할랄 음식 있어요?", "Permisi, ada makanan halal nggak?"),
        ex(
          "힘들겠지만 조금만 참으세요.",
          "Pasti berat, tapi sabar dikit lagi ya.",
        ),
        callout(
          "warning",
          "Jebakan: -지만 cuma buat kontras, nggak bisa buat kasih latar. Mau bilang ",
          i("lagi hujan nih, ada payung nggak?"),
          " → ",
          b("비가 오는데 우산 있어요?"),
          " Kalau pakai ",
          b("비가 오지만 우산 있어요?"),
          ", artinya jadi aneh: ",
          i("hujan, tapi ada payung?"),
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("padahal", "ik-padahal-hasil"),
          ". Bedanya sama ",
          ref("-는데", "ki-neunde"),
          ": -는데 lebih lembut dan lebih sering kedengeran di obrolan. Versi awal kalimatnya: ",
          ref("하지만", "ki-hajiman"),
          ".",
        ),
      ],
    },
    "ki-neunde": {
      description:
        "-는데 kasih latar dulu sebelum masuk ke inti, dan bisa berarti nah, tapi, atau padahal.",
      blocks: [
        grammar({
          number: "06",
          title: "-는데 / -(으)ㄴ데",
          theme: "rose",
          descriptionKo:
            "뒤의 말을 하기 전에 배경이나 상황을 먼저 말할 때 써요.",
          descriptionTranslation:
            "-는데 itu pola paling serbaguna. Tugasnya kasih latar dulu sebelum masuk ke inti. Tergantung isinya, artinya bisa “nah...”, “tapi”, atau “padahal”.",
          rules: [
            r("Kata kerja", "-는데", "먹다 → 먹는데, 가다 → 가는데"),
            r("있다 / 없다", "-는데", "맛있다 → 맛있는데, 없다 → 없는데"),
            r("Kata sifat, batang vokal", "-ㄴ데", "비싸다 → 비싼데"),
            r(
              "Kata sifat, batang konsonan",
              "-은데",
              "작다 → 작은데, 좋다 → 좋은데",
            ),
            r(
              "Batang berakhiran ㄹ",
              "ㄹ hilang",
              "살다 → 사는데, 멀다 → 먼데",
            ),
            r("Kata benda", "-인데", "학생이다 → 학생인데"),
            r("Lampau (semua)", "-았/었는데", "먹었는데, 비쌌는데"),
          ],
          examples: [
            e("지금 밥 ", "먹는데", " 같이 먹을래요?"),
            e("이 옷 ", "예쁜데", " 좀 비싸요."),
            e("저는 ", "괜찮은데", "요."),
          ],
          tipKo: "문장 끝에 '-는데요'를 쓰면 부드럽게 말하는 느낌이 나요.",
          tipTranslation:
            "Di akhir kalimat, -는데(요) bikin nada lembut dan menggantung, kayak “sih”. 저는 괜찮은데요 = “Aku sih nggak apa-apa.”",
        }),
        p(
          b("Artinya apa sih? "),
          "Bayangin kamu ngomong: ",
          i("Aku lagi makan nih. Nah, mau ikut?"),
          " Bagian ",
          i("aku lagi makan nih"),
          " itu latar, dan -는데 itu ",
          i("nah"),
          "-nya. Orang Korea suka banget kasih konteks dulu baru masuk ke inti.",
        ),
        h3("Contoh"),
        ex(
          "지금 편의점 가는데 뭐 사다 줄까?",
          "Aku mau ke minimarket nih. Mau nitip apa?",
          "반말",
        ),
        ex(
          "내일 회식이 있는데 같이 갈 수 있어요?",
          "Besok ada makan-makan kantor, kamu bisa ikut?",
        ),
        ex(
          "반장님, 이 기계가 좀 이상한데 한번 봐 주시겠어요?",
          "Pak, mesin ini kayaknya aneh nih, bisa tolong dicek?",
        ),
        ex(
          "이 식당 맛있는데 좀 비싸.",
          "Restoran ini enak, tapi agak mahal.",
          "반말, arti tapi",
        ),
        ex(
          "열심히 공부했는데 시험에 떨어졌어요.",
          "Padahal udah belajar mati-matian, eh nggak lulus.",
        ),
        callout(
          "warning",
          "Jebakan: kata sifat pakai -(으)ㄴ데, bukan -는데. ",
          b("비싼데"),
          " dan ",
          b("좋은데"),
          ", bukan ",
          b("비싸는데"),
          " atau ",
          b("좋는데"),
          ". Tapi 있다/없다 tetap -는데: ",
          b("맛있는데"),
          ".",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? -는데 itu jantungnya ",
          ref("padahal", "ik-padahal-hasil"),
          ", ",
          ref("padahal udah ... (kesel)", "ik-padahal-kesal"),
          ", dan ",
          ref("sih", "ik-sih"),
          ". Bedanya sama ",
          ref("-지만", "ki-jiman"),
          ": -지만 cuma kontras yang tegas. Versi awal kalimatnya: ",
          ref("근데", "ki-geureonde"),
          ".",
        ),
      ],
    },
    "ki-neundedo": {
      description:
        "-는데도 artinya padahal udah ..., tetap aja, buat hasil yang beneran nggak sesuai harapan.",
      blocks: [
        grammar({
          number: "07",
          title: "-는데도 / -(으)ㄴ데도",
          theme: "rose",
          descriptionKo:
            "앞의 상황이 있었는데도 예상과 다른 결과가 나올 때 써요.",
          descriptionTranslation:
            "-는데도 = -는데 + 도 (“pun”). Artinya “padahal udah ..., tetap aja ...”. Lebih tegas dari -는데: kamu nekenin hasilnya bener-bener nggak sesuai harapan, sering sambil heran atau kesel.",
          rules: [
            r("Kata kerja", "-는데도", "먹다 → 먹는데도"),
            r("있다 / 없다", "-는데도", "없다 → 없는데도"),
            r("Kata sifat, batang vokal", "-ㄴ데도", "바쁘다 → 바쁜데도"),
            r("Kata sifat, batang konsonan", "-은데도", "많다 → 많은데도"),
            r("Kata benda", "-인데도", "주말이다 → 주말인데도"),
            r("Lampau", "-았/었는데도", "먹었는데도, 말했는데도"),
          ],
          examples: [
            e("밥을 ", "먹었는데도", " 배고파요."),
            e("약을 ", "먹었는데도", " 안 나아요."),
            e("", "주말인데도", " 출근해야 돼요."),
          ],
          tipKo: "'-는데도'는 실제로 일어난 일에만 써요.",
          tipTranslation:
            "-는데도 cuma buat kenyataan yang udah atau lagi terjadi. Buat andai-andai (“walaupun nanti...”), pakai -아도/어도.",
        }),
        p(
          b("Artinya apa sih? "),
          "Pikirin kalimat ",
          i("udah makan pun, tetap laper"),
          ". Kata ",
          i("pun"),
          "-nya itu 도. Jadi ",
          b("먹었는데도"),
          " = ",
          i("udah makan pun"),
          ".",
        ),
        h3("Contoh"),
        ex(
          "열 시간이나 잤는데도 계속 졸려요.",
          "Udah tidur sepuluh jam, tetap aja ngantuk.",
        ),
        ex(
          "에어컨을 켰는데도 너무 더워요.",
          "AC udah nyala, tetap panas banget.",
        ),
        ex(
          "돈이 없는데도 또 앨범을 샀어.",
          "Padahal lagi bokek, aku tetap beli album lagi.",
          "반말, K-popers pasti relate",
        ),
        ex(
          "몇 번이나 설명했는데도 이해를 못 해요.",
          "Udah dijelasin berkali-kali, tetap nggak ngerti juga.",
        ),
        callout(
          "warning",
          "Jebakan: -는데도 cuma buat hal yang beneran terjadi. ",
          i("Walaupun besok hujan, aku tetap berangkat"),
          " itu belum kejadian, jadi pakai -아도/어도: ",
          b("내일 비가 와도 갈 거예요."),
          " Bukan ",
          b("내일 비가 오는데도 갈 거예요."),
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("padahal", "ik-padahal-hasil"),
          ". Bedanya sama ",
          ref("-는데", "ki-neunde"),
          ": ",
          b("먹었는데 배고파"),
          " itu santai, ",
          b("먹었는데도 배고파"),
          " lebih tegas. Versi awal kalimatnya: ",
          ref("그래도", "ki-geuraedo"),
          ". Andai-andai pakai ",
          ref("-아도/어도", "ki-ado"),
          ".",
        ),
      ],
    },
    "ki-myeonseo-padahal": {
      description:
        "-(으)면서 juga bisa berarti padahal yang nyalahin, kayak udah tahu kok nanya.",
      blocks: [
        grammar({
          number: "08",
          title: "-(으)면서 (padahal)",
          theme: "rose",
          descriptionKo: "앞의 사실과 맞지 않는 말이나 행동을 따질 때 써요.",
          descriptionTranslation:
            "Bentuknya sama persis dengan -(으)면서 “sambil”, tapi di sini artinya “padahal” yang nyalahin atau protes. Kamu nunjukin omongan atau sikap orang nggak cocok sama kenyataan.",
          rules: [
            r("Batang berakhiran vokal", "-면서", "자다 → 자면서"),
            r("Batang berakhiran konsonan", "-으면서", "없다 → 없으면서"),
            r("Batang berakhiran ㄹ", "-면서", "알다 → 알면서"),
            r("하다", "-하면서", "좋아하다 → 좋아하면서"),
            r("Lampau", "-았/었으면서", "약속했으면서, 늦었으면서"),
          ],
          examples: [
            e("", "알면서", " 왜 물어봐요?"),
            e("", "약속했으면서", " 왜 안 왔어?"),
            e("자기도 ", "늦었으면서", " 나한테만 뭐라고 해."),
          ],
          tipKo: "이 뜻은 주로 친한 사이에서 반말로 따질 때 써요.",
          tipTranslation:
            "Nadanya protes, jadi biasanya dipakai ke teman akrab dalam 반말. Ke atasan? Mending jangan.",
        }),
        p(
          b("Artinya apa sih? "),
          "Di bahasa Indonesia, ",
          i("padahal"),
          " kadang dipakai buat nyalahin: ",
          i("Padahal udah janji, kok nggak dateng?"),
          " -(으)면서 versi ini persis itu. Bagian ",
          i("kok ..."),
          "-nya hampir selalu nyusul, sering pakai ",
          b("왜"),
          ".",
        ),
        h3("Contoh"),
        ex("알면서 왜 물어봐?", "Udah tahu kok nanya?", "반말"),
        ex("약속했으면서 왜 안 왔어?", "Udah janji, kok nggak dateng?", "반말"),
        ex(
          "자기도 늦었으면서 나한테만 뭐라고 해.",
          "Padahal dia sendiri juga telat, kok aku doang yang diomelin.",
        ),
        ex(
          "너도 좋아하면서 왜 아닌 척해?",
          "Kamu juga suka kan, kok pura-pura nggak?",
          "ngeledek teman yang lagi salting",
        ),
        callout(
          "warning",
          "Jebakan: kalimatnya bisa kebaca dua arti. ",
          b("알면서"),
          " = ",
          i("sambil tahu"),
          "? Nggak masuk akal, kan. Kalau arti ",
          i("sambil"),
          " nggak nyambung, apalagi ada 왜 atau nada protes, berarti ini ",
          i("padahal"),
          ".",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("padahal (nyalahin)", "ik-padahal-protes"),
          ". Bedanya sama ",
          ref("-(으)면서 (sambil)", "ki-myeonseo"),
          ": bentuknya sama, tapi artinya dua kegiatan barengan.",
        ),
      ],
    },
    "ki-myeon": {
      description:
        "-(으)면 itu kalau yang nempel di belakang syarat, buat syarat, kebiasaan, sampai andai-andai.",
      blocks: [
        grammar({
          number: "09",
          title: "-(으)면",
          theme: "green",
          descriptionKo: "조건이나 가정을 말할 때 써요.",
          descriptionTranslation:
            "-(으)면 = “kalau” atau “nanti kalau udah”. Syarat di depan, hasil di belakang, sama kayak bahasa Indonesia. Bisa buat syarat nyata, kebiasaan, sampai andai-andai.",
          rules: [
            r("Batang berakhiran vokal", "-면", "가다 → 가면, 바쁘다 → 바쁘면"),
            r(
              "Batang berakhiran konsonan",
              "-으면",
              "먹다 → 먹으면, 있다 → 있으면",
            ),
            r("Batang berakhiran ㄹ", "-면", "알다 → 알면, 멀다 → 멀면"),
            r("하다", "-하면", "공부하다 → 공부하면"),
            r("ㅂ tak beraturan", "-우면", "덥다 → 더우면"),
            r("Kata benda", "-(이)면", "학생이면, 주말이면"),
            r("Lampau", "-았/었으면", "끝났으면, 먹었으면"),
          ],
          examples: [
            e("시간 ", "있으면", " 전화하세요."),
            e("일이 ", "끝나면", " 연락할게요."),
            e("", "모르면", " 물어보세요."),
          ],
          tipKo: "'-았/었으면 좋겠다'는 바라는 것을 말할 때 써요.",
          tipTranslation:
            "-았/었으면 좋겠다 = “semoga” atau “pengen banget”. 빨리 주말이었으면 좋겠다 = “Pengen cepet weekend.”",
        }),
        p(
          b("Artinya apa sih? "),
          "Di bahasa Indonesia, ",
          i("kalau"),
          " ditaruh di depan syarat: ",
          i("kalau ada waktu"),
          ". Di Korea, nempel di belakang syarat: ",
          b("시간 있으면"),
          ". Urutannya tetap sama: syarat dulu, hasil belakangan.",
        ),
        h3("Contoh"),
        ex(
          "모르면 언제든지 물어보세요.",
          "Kalau nggak ngerti, tanya aja kapan pun.",
          "kalimat favorit 반장님",
        ),
        ex(
          "일 끝나면 같이 치킨 먹으러 갈래?",
          "Habis kerja, mau makan ayam bareng?",
          "반말, -면 = nanti kalau udah",
        ),
        ex(
          "이 버튼을 누르면 기계가 멈춰요.",
          "Kalau tombol ini dipencet, mesinnya berhenti.",
        ),
        ex("피곤하면 먼저 들어가세요.", "Kalau capek, pulang duluan aja."),
        callout(
          "warning",
          "Jebakan: ",
          i("kalau"),
          " buat topik (",
          i("kalau aku sih nggak masalah"),
          ") bukan -면, tapi 은/는: ",
          b("저는 괜찮은데요."),
          " ",
          i("Kalau aku?"),
          " = ",
          b("저는요?"),
        ),
        callout(
          "tip",
          "Mau praktik berandai-andai? Cek ",
          ref("kalau aja", "ik-kalau-aja"),
          ". Bedanya sama ",
          ref("-(으)ㄹ 때", "ki-eul-ttae"),
          ": buat momen tertentu (",
          i("waktu aku dateng ke Korea"),
          ") pakai ",
          b("한국에 왔을 때"),
          ". Versi awal kalimatnya: ",
          ref("그럼", "ki-geureom"),
          ".",
        ),
      ],
    },
    "ki-reo": {
      description:
        "-(으)러 가다/오다 itu pergi atau dateng buat sesuatu, dan wajib disusul kata kerja gerak.",
      blocks: [
        grammar({
          number: "10",
          title: "-(으)러 가다/오다",
          theme: "green",
          descriptionKo: "어떤 곳에 가거나 오는 목적을 말할 때 써요.",
          descriptionTranslation:
            "-(으)러 = “buat” atau “untuk” yang nunjukin tujuan pergi. Kuncinya: habis -(으)러 wajib kata kerja gerak, kayak 가다, 오다, 다니다, 나가다.",
          rules: [
            r("Batang berakhiran vokal", "-러", "보다 → 보러, 사다 → 사러"),
            r(
              "Batang berakhiran konsonan",
              "-으러",
              "먹다 → 먹으러, 찾다 → 찾으러",
            ),
            r("Batang berakhiran ㄹ", "-러", "놀다 → 놀러"),
            r("하다", "-하러", "운동하다 → 운동하러"),
            r(
              "Habis itu wajib",
              "가다, 오다, 다니다, 나가다",
              "밥 먹으러 가요",
            ),
          ],
          examples: [
            e("밥 ", "먹으러", " 가요."),
            e("친구를 ", "만나러", " 홍대에 왔어요."),
            e("주말에 ", "놀러", " 가자!"),
          ],
          tipKo: "'놀러 가다/오다'는 하나의 표현처럼 자주 써요.",
          tipTranslation:
            "놀러 와! = “Main ke sini ya!” Ungkapan super sering, hafalin satu paket.",
        }),
        p(
          b("Artinya apa sih? "),
          "Di Indonesia kita bilang ",
          i("pergi buat makan"),
          ". Korea kebalik: tujuannya dulu, baru geraknya. ",
          b("밥 먹으러 가요"),
          " = ",
          i("makan-buat pergi"),
          ".",
        ),
        h3("Contoh"),
        ex("점심 먹으러 갈까요?", "Yuk makan siang?", "ajakan ke rekan kerja"),
        ex(
          "다음 주에 우리 집에 놀러 와.",
          "Minggu depan main ke rumahku ya.",
          "반말",
        ),
        ex("송금하러 은행에 가야 해요.", "Aku harus ke bank buat kirim uang."),
        ex(
          "저는 한국어를 배우러 학원에 다녀요.",
          "Aku rutin ke tempat les buat belajar bahasa Korea.",
          "다니다 = rutin pergi",
        ),
        ex("편의점에 뭐 하러 가?", "Ke minimarket mau ngapain?", "반말"),
        callout(
          "warning",
          "Jebakan: -(으)러 cuma boleh ketemu kata kerja gerak. ",
          i("Aku belajar bahasa Korea biar bisa kerja di Korea"),
          " itu bukan ",
          b("한국에서 일하러 한국어를 배워요"),
          ", karena 배우다 bukan gerak. Yang bener: ",
          b("한국에서 일하려고 한국어를 배워요."),
        ),
        callout(
          "tip",
          "Bedanya sama ",
          ref("-(으)려고", "ki-ryeogo"),
          ": habis -(으)려고 boleh kata kerja apa aja, tapi nggak bisa disusul ajakan. Habis -(으)러 boleh: ",
          b("먹으러 가자!"),
        ),
      ],
    },
    "ki-ryeogo": {
      description:
        "-(으)려고 itu biar atau supaya, buat nunjukin niat, dan -(으)려고 하다 buat rencana.",
      blocks: [
        grammar({
          number: "11",
          title: "-(으)려고",
          theme: "green",
          descriptionKo: "어떤 일을 하려는 의도나 목적을 말할 때 써요.",
          descriptionTranslation:
            "-(으)려고 = “biar”, “supaya”, atau “buat” yang nunjukin niat. Beda sama -(으)러, habis -(으)려고 boleh kata kerja apa aja. Ada juga -(으)려고 하다 = “berencana” atau “mau...”.",
          rules: [
            r(
              "Batang berakhiran vokal",
              "-려고",
              "가다 → 가려고, 사다 → 사려고",
            ),
            r("Batang berakhiran konsonan", "-으려고", "먹다 → 먹으려고"),
            r("Batang berakhiran ㄹ", "-려고", "만들다 → 만들려고"),
            r("하다", "-하려고", "저축하다 → 저축하려고"),
            r("Rencana", "-(으)려고 하다", "이사하려고 해요"),
          ],
          examples: [
            e("한국에서 ", "일하려고", " 한국어를 배워요."),
            e("돈을 ", "모으려고", " 커피를 끊었어요."),
            e("이번 휴가 때 고향에 ", "가려고", " 해요."),
          ],
          tipKo: "회화에서는 '-(으)려고요'로 문장을 끝내기도 해요.",
          tipTranslation:
            "Bisa jadi akhir kalimat. 왜 일찍 왔어요? → 일 좀 미리 하려고요. = “Biar bisa ngerjain duluan.”",
        }),
        p(
          b("Artinya apa sih? "),
          "Pikirin ",
          i("biar"),
          " atau ",
          i("supaya"),
          ". Di Indonesia, ",
          i("biar"),
          " ditaruh di depan tujuan: ",
          i("biar bisa nabung"),
          ". Di Korea, -(으)려고 nempel di belakang tujuan: ",
          b("돈을 모으려고"),
          ".",
        ),
        h3("Contoh"),
        ex(
          "살 빼려고 요즘 저녁을 안 먹어요.",
          "Biar kurus, akhir-akhir ini aku nggak makan malam.",
        ),
        ex(
          "한국 드라마를 자막 없이 보려고 매일 공부해요.",
          "Biar bisa nonton drakor tanpa subtitle, aku belajar tiap hari.",
        ),
        ex(
          "돈 아끼려고 도시락 싸 왔어요.",
          "Biar hemat, aku bawa bekal dari rumah.",
        ),
        ex("지금 막 나가려고 했어.", "Aku baru aja mau keluar.", "반말"),
        callout(
          "warning",
          "Jebakan: habis -(으)려고 nggak bisa perintah atau ajakan. ",
          b("살 빼려고 운동하세요"),
          " itu janggal. Pakai -(으)려면 (",
          i("kalau mau ..."),
          "): ",
          b("살을 빼려면 운동하세요."),
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("padahal tadinya mau", "ik-padahal-rencana"),
          ", yang pakai ",
          ref("-(으)려고 했는데", "ki-ryeogo-haenneunde"),
          ". Bedanya sama ",
          ref("-(으)러", "ki-reo"),
          ": -(으)러 cuma buat tujuan pergi.",
        ),
      ],
    },
    "ki-myeonseo": {
      description:
        "-(으)면서 itu sambil, buat dua kegiatan barengan yang dilakuin orang yang sama.",
      blocks: [
        grammar({
          number: "12",
          title: "-(으)면서",
          descriptionKo: "두 가지 행동이 동시에 일어날 때 써요.",
          descriptionTranslation:
            "-(으)면서 = “sambil”. Dua kegiatan barengan, dilakuin orang yang sama. Bisa juga berarti “selama” (selama tinggal di Korea).",
          rules: [
            r(
              "Batang berakhiran vokal",
              "-면서",
              "보다 → 보면서, 마시다 → 마시면서",
            ),
            r("Batang berakhiran konsonan", "-으면서", "먹다 → 먹으면서"),
            r("Batang berakhiran ㄹ", "-면서", "살다 → 살면서, 놀다 → 놀면서"),
            r("하다", "-하면서", "일하다 → 일하면서"),
            r(
              "ㄷ tak beraturan",
              "ㄷ → ㄹ + -으면서",
              "듣다 → 들으면서, 걷다 → 걸으면서",
            ),
            r("Lampau", "Cukup di kata kerja terakhir", "들으면서 공부했어요"),
          ],
          examples: [
            e("음악을 ", "들으면서", " 공부해요."),
            e("밥 ", "먹으면서", " 드라마 봐요."),
            e("", "일하면서", " 대학교에 다녀요."),
          ],
          tipKo: "두 행동을 하는 사람은 같아야 해요.",
          tipTranslation:
            "Pelakunya harus sama. “Aku masak sambil adikku nyanyi” nggak bisa pakai -(으)면서.",
        }),
        p(
          b("Artinya apa sih? "),
          "Gampang: -(으)면서 = ",
          i("sambil"),
          ". Bedanya cuma posisi. ",
          i("Sambil dengerin musik"),
          " → ",
          b("음악을 들으면서"),
          ".",
        ),
        h3("Contoh"),
        ex("운전하면서 핸드폰 보지 마세요.", "Jangan main HP sambil nyetir."),
        ex(
          "저는 공장에서 일하면서 토픽 공부해요.",
          "Aku belajar TOPIK sambil kerja di pabrik.",
        ),
        ex("걸으면서 얘기할까요?", "Ngobrolnya sambil jalan aja yuk?"),
        ex(
          "한국에 살면서 김치를 좋아하게 됐어요.",
          "Selama tinggal di Korea, aku jadi suka kimchi.",
          "arti selama",
        ),
        callout(
          "warning",
          "Jebakan: ",
          i("lagi jalan ke kampus, eh ketemu teman"),
          " itu bukan -면서, tapi ",
          ref("-다가", "ki-daga"),
          ": ",
          b("학교에 가다가 친구를 만났어요."),
          " -(으)면서 cuma buat dua kegiatan yang beneran barengan.",
        ),
        callout(
          "tip",
          "Bedanya sama ",
          ref("-고", "ki-go"),
          ": ",
          b("밥 먹고 TV 봐요"),
          " = makan dulu, baru nonton. Bentuknya sama dengan ",
          ref("-(으)면서 (padahal)", "ki-myeonseo-padahal"),
          ", tapi artinya nyalahin.",
        ),
      ],
    },
    "ki-geona": {
      description:
        "-거나 itu atau buat kata kerja dan kata sifat, sementara kata benda pakai (이)나.",
      blocks: [
        grammar({
          number: "13",
          title: "-거나",
          descriptionKo: "두 가지 중에서 하나를 고를 때 써요.",
          descriptionTranslation:
            "-거나 = “atau” buat kata kerja dan kata sifat. “Weekend aku istirahat atau olahraga.” Tinggal tempel ke batang kata. Buat kata benda, pakai (이)나.",
          rules: [
            r("Semua batang", "-거나", "쉬다 → 쉬거나, 먹다 → 먹거나"),
            r("하다", "-하거나", "운동하다 → 운동하거나"),
            r("Lampau", "-았/었거나", "갔거나, 잤거나"),
            r("Kata benda", "-(이)나", "커피나 차, 빵이나 밥"),
          ],
          examples: [
            e("주말에 ", "쉬거나", " 운동해요."),
            e("모르는 게 있으면 ", "물어보거나", " 검색해 보세요."),
            e("심심하면 드라마를 ", "보거나", " 친구한테 전화해요."),
          ],
          tipKo: "명사 뒤에는 '-거나' 대신 '(이)나'를 써요.",
          tipTranslation:
            "Kata benda pakai (이)나: 라면이나 김밥, bukan 라면거나 김밥.",
        }),
        p(
          b("Artinya apa sih? "),
          i("Atau"),
          " di bahasa Indonesia satu kata buat semua. Korea misahin: kata kerja dan kata sifat pakai -거나, kata benda pakai (이)나, dan di antara dua pertanyaan pakai 아니면.",
        ),
        h3("Contoh"),
        ex(
          "쉬는 날에는 보통 빨래하거나 청소해요.",
          "Pas hari libur biasanya aku nyuci atau bersih-bersih.",
        ),
        ex(
          "퇴근하고 유튜브 보거나 그냥 자요.",
          "Habis kerja aku nonton YouTube atau langsung tidur.",
        ),
        ex("문자 보내거나 전화해 줘.", "Chat atau telepon aku ya.", "반말"),
        ex(
          "커피나 녹차 드릴까요?",
          "Mau kopi atau teh hijau?",
          "kata benda → (이)나",
        ),
        callout(
          "warning",
          "Jebakan: -거나 nggak bisa nempel ke kata benda. ",
          i("Ramyeon atau kimbap"),
          " itu ",
          b("라면이나 김밥"),
          ", bukan ",
          b("라면거나 김밥"),
          ". Cek dulu: yang mau kamu sambung itu kata kerja atau kata benda?",
        ),
        callout(
          "tip",
          "Bedanya sama ",
          ref("아니면", "ki-animyeon"),
          ": 아니면 buat nawarin pilihan di antara dua pertanyaan. Kalau jawabannya ",
          i("terserah, apa aja"),
          ", cek ",
          ref("terserah", "ik-terserah"),
          ".",
        ),
      ],
    },
  },
  vocabulary: {
    title: "Kosakata: Penyambung dasar",
    description:
      "Tiga belas akhiran penyambung buat dan, karena, tapi, kalau, dan kawan-kawannya, masing-masing dengan arti dan satu contoh.",
    entries: [
      {
        term: "-고",
        meanings: ["dan", "lalu", "terus"],
        example: { ko: "밥 먹고 잤어요.", id: "Aku makan terus tidur." },
      },
      {
        term: "-아서/어서 (karena)",
        meanings: ["karena", "soalnya", "gara-gara"],
        example: {
          ko: "길이 막혀서 늦었어요.",
          id: "Jalanan macet, jadi aku telat.",
        },
      },
      {
        term: "-아서/어서 (lalu)",
        meanings: ["lalu", "terus (di situ)"],
        example: {
          ko: "시장에 가서 과일을 샀어요.",
          id: "Aku ke pasar terus beli buah di sana.",
        },
      },
      {
        term: "-(으)니까",
        meanings: ["karena", "kan ..., makanya"],
        example: {
          ko: "추우니까 따뜻하게 입으세요.",
          id: "Dingin nih, pakai baju yang anget ya.",
        },
      },
      {
        term: "-지만",
        meanings: ["tapi", "tetapi"],
        example: {
          ko: "비싸지만 맛있어요.",
          id: "Mahal tapi enak.",
        },
      },
      {
        term: "-는데 / -(으)ㄴ데",
        meanings: ["nah ...", "tapi", "padahal"],
        example: {
          ko: "지금 편의점 가는데 뭐 사다 줄까?",
          id: "Aku mau ke minimarket nih. Mau nitip apa?",
        },
      },
      {
        term: "-는데도",
        meanings: ["padahal udah ..., tetap", "walaupun udah"],
        example: {
          ko: "밥을 먹었는데도 배고파요.",
          id: "Udah makan, tetap aja laper.",
        },
      },
      {
        term: "-(으)면서 (padahal)",
        meanings: ["padahal", "udah ... kok"],
        example: {
          ko: "알면서 왜 물어봐?",
          id: "Udah tahu kok nanya?",
        },
      },
      {
        term: "-(으)면",
        meanings: ["kalau", "nanti kalau udah"],
        example: {
          ko: "시간 있으면 전화하세요.",
          id: "Kalau ada waktu, telepon ya.",
        },
      },
      {
        term: "-(으)러 가다/오다",
        meanings: ["pergi untuk", "dateng buat"],
        example: {
          ko: "점심 먹으러 갈까요?",
          id: "Yuk makan siang?",
        },
      },
      {
        term: "-(으)려고",
        meanings: ["biar", "supaya", "mau ..."],
        example: {
          ko: "돈을 모으려고 커피를 끊었어요.",
          id: "Biar bisa nabung, aku berhenti beli kopi.",
        },
      },
      {
        term: "-(으)면서 (sambil)",
        meanings: ["sambil", "selama"],
        example: {
          ko: "음악을 들으면서 공부해요.",
          id: "Aku belajar sambil dengerin musik.",
        },
      },
      {
        term: "-거나",
        meanings: ["atau"],
        example: {
          ko: "주말에 쉬거나 운동해요.",
          id: "Weekend aku istirahat atau olahraga.",
        },
      },
    ],
  },
  quiz: {
    title: "Kuis: Penyambung dasar",
    description:
      "12 soal soal -고, -아서, -(으)니까, -지만, -는데, -(으)면 dan kawan-kawannya. Pilih pola yang pas sama situasinya.",
    passingScore: 70,
    questions: [
      {
        key: "pd-go-vs-aseo-1",
        prompt:
          "Kamu mau bilang: “Aku ke pasar terus beli buah (di pasar itu).” Mana yang paling pas?",
        options: [
          { text: "시장에 가서 과일을 샀어요.", correct: true },
          { text: "시장에 가고 과일을 샀어요." },
          { text: "시장에 가니까 과일을 샀어요." },
        ],
        explanation:
          "Belinya di pasar itu juga, jadi kegiatan kedua masih nyambung sama tempatnya. Itu tugas -아서 (lalu). -고 kesannya dua kegiatan terpisah, dan -(으)니까 malah jadi alasan.",
      },
      {
        key: "pd-aseo-lampau-1",
        prompt: "Kamu telat masuk kerja. Mana kalimat minta maaf yang bener?",
        options: [
          { text: "늦어서 죄송합니다.", correct: true },
          { text: "늦었어서 죄송합니다." },
          { text: "늦었으니까 죄송합니다." },
          { text: "늦지만 죄송합니다." },
        ],
        explanation:
          "Sebelum -아서 nggak boleh ada -았/었, jadi 늦었어서 salah. 늦었으니까 kedengeran kayak nyari pembenaran. Buat minta maaf, -아서 juaranya.",
      },
      {
        key: "pd-aseo-vs-nikka-1",
        prompt:
          "Kamu mau bilang ke rekan kerja: “Hujan nih, bawa payung ya.” Mana yang natural?",
        options: [
          { text: "비가 오니까 우산 가져가세요.", correct: true },
          { text: "비가 와서 우산 가져가세요." },
          { text: "비가 오지만 우산 가져가세요." },
        ],
        explanation:
          "Habis alasannya ada perintah (가져가세요). Kalau ujungnya perintah atau ajakan, pakai -(으)니까. -아서 + perintah itu janggal, dan -지만 artinya malah “tapi”.",
      },
      {
        key: "pd-nikka-greeting-1",
        prompt: "Pertama kali ketemu orang baru. Mana salam yang bener?",
        options: [
          { text: "만나서 반가워요.", correct: true },
          { text: "만나니까 반가워요." },
          { text: "만나고 반가워요." },
        ],
        explanation:
          "Salam, minta maaf, dan terima kasih pakai -아서. 만나니까 kedengeran kayak lagi ngasih alasan, bukan nyapa. Hafalin satu paket aja: 만나서 반가워요.",
      },
      {
        key: "pd-jiman-vs-neunde-1",
        prompt:
          "Kamu mau nanya: “Lagi hujan nih, ada payung nggak?” Mana yang paling natural?",
        options: [
          { text: "비가 오는데 우산 있어요?", correct: true },
          { text: "비가 오지만 우산 있어요?" },
          { text: "비가 와서 우산 있어요?" },
        ],
        explanation:
          "“Lagi hujan nih” itu latar sebelum pertanyaan, dan latar itu kerjaannya -는데. -지만 cuma buat kontras, jadinya “hujan, tapi ada payung?” yang aneh.",
      },
      {
        key: "pd-neunde-sifat-1",
        prompt: "Mana yang bener buat “Baju ini cantik, tapi agak mahal”?",
        options: [
          { text: "이 옷 예쁜데 좀 비싸요.", correct: true },
          { text: "이 옷 예쁘는데 좀 비싸요." },
          { text: "이 옷 예뻐는데 좀 비싸요." },
        ],
        explanation:
          "예쁘다 itu kata sifat, jadi pakai -(으)ㄴ데: 예쁜데. -는데 cuma buat kata kerja dan 있다/없다. Jebakan favorit, hati-hati ya.",
      },
      {
        key: "pd-neundedo-vs-ado-1",
        prompt: "“Walaupun besok hujan, aku tetap berangkat.” Mana yang bener?",
        options: [
          { text: "내일 비가 와도 갈 거예요.", correct: true },
          { text: "내일 비가 오는데도 갈 거예요." },
          { text: "내일 비가 오니까 갈 거예요." },
        ],
        explanation:
          "Hujannya belum kejadian, masih andai-andai. -는데도 cuma buat hal yang beneran terjadi, jadi pakai -아도/어도. -(으)니까 artinya malah “karena hujan, aku pergi”.",
      },
      {
        key: "pd-myeonseo-padahal-1",
        prompt: "Temanmu bilang “알면서 왜 물어봐?” Artinya apa?",
        options: [
          { text: "Udah tahu kok nanya?", correct: true },
          { text: "Sambil tahu, kenapa nanya?" },
          { text: "Kalau tahu, kenapa nanya?" },
        ],
        explanation:
          "Arti “sambil” nggak masuk akal di sini, apalagi ada 왜 dan nada protes. Jadi ini -(으)면서 versi “padahal”: udah tahu kok masih nanya.",
      },
      {
        key: "pd-myeon-topik-1",
        prompt:
          "Temanmu nanya mau makan di mana. Kamu mau bilang “Kalau aku sih apa aja oke.” Mana yang natural?",
        options: [
          { text: "저는 아무거나 괜찮은데요.", correct: true },
          { text: "저면 아무거나 괜찮아요." },
          { text: "제가 하면 아무거나 괜찮아요." },
        ],
        explanation:
          "“Kalau” yang buat topik (kalau aku sih) bukan -(으)면, tapi 은/는. Tambah -는데요 di ujung biar nadanya lembut kayak “sih”.",
      },
      {
        key: "pd-reo-vs-ryeogo-1",
        prompt:
          "“Aku belajar bahasa Korea biar bisa kerja di Korea.” Mana yang bener?",
        options: [
          { text: "한국에서 일하려고 한국어를 배워요.", correct: true },
          { text: "한국에서 일하러 한국어를 배워요." },
          { text: "한국에서 일하면서 한국어를 배워요." },
        ],
        explanation:
          "배우다 bukan kata kerja gerak, jadi -(으)러 nggak bisa. Buat niat atau tujuan, pakai -(으)려고. Opsi -면서 grammarnya bener, tapi artinya beda: “belajar sambil kerja di Korea”.",
      },
      {
        key: "pd-myeonseo-vs-go-1",
        prompt: "“Aku nonton drakor sambil makan ramyeon.” Mana yang pas?",
        options: [
          { text: "라면 먹으면서 드라마 봐요.", correct: true },
          { text: "라면 먹고 드라마 봐요." },
          { text: "라면 먹거나 드라마 봐요." },
        ],
        explanation:
          "Dua kegiatan barengan = -(으)면서. 먹고 artinya makan dulu baru nonton, dan 먹거나 artinya “makan atau nonton”, pilih salah satu.",
      },
      {
        key: "pd-geona-noun-1",
        prompt:
          "Kasir nanya “Mau kopi atau teh hijau?” → 커피___ 녹차 드릴까요?",
        options: [
          { text: "나", correct: true },
          { text: "거나" },
          { text: "고" },
          { text: "지만" },
        ],
        explanation:
          "커피 itu kata benda, jadi “atau”-nya pakai (이)나: 커피나 녹차. -거나 cuma nempel ke kata kerja dan kata sifat, kayak 쉬거나.",
      },
    ],
  },
});
