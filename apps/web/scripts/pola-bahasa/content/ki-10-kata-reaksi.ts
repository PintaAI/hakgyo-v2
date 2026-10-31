import { b, callout, defineBab, ex, grammar, h3, i, p, ref } from "../blocks";

/** One rule row of a grammar card. */
const r = (condition: string, form: string, example: string) => ({
  condition,
  form,
  example,
});

/** One grammar-card example; `emphasis` is the word itself. */
const e = (before: string, emphasis: string, after: string) => ({
  before,
  emphasis,
  after,
});

export default defineBab({
  key: "ki-10-kata-reaksi",
  materials: {
    "ki-ohiryeo": {
      description:
        "오히려 = malah, justru: hasilnya kebalikan dari yang kamu kira.",
      blocks: [
        grammar({
          number: "01",
          title: "오히려",
          theme: "amber",
          descriptionKo: "기대와 반대되는 결과가 나왔을 때 써요.",
          descriptionTranslation:
            "오히려 itu “malah” atau “justru”. Dipakai waktu hasilnya kebalikan dari yang kamu kira. Taruh di depan bagian yang “kebalik”.",
          rules: [
            r(
              "Hasil kebalikan",
              "-는데 오히려",
              "약을 먹었는데 오히려 더 아파요.",
            ),
            r("Justru lebih …", "오히려 더", "오히려 더 피곤해요."),
            r("Balas makasih", "오히려 제가", "오히려 제가 감사하죠."),
            r(
              "Bukannya …, malah …",
              "-기는커녕",
              "사과하기는커녕 화를 냈어요.",
            ),
          ],
          examples: [
            e("도와주려고 했는데 ", "오히려", " 방해가 됐어요."),
            e("천천히 하니까 ", "오히려", " 더 빨리 끝났어요."),
            e("택시를 탔는데 ", "오히려", " 더 늦었어요."),
          ],
        }),
        p(
          b("Artinya apa sih? "),
          "Persis ",
          i("“udah minum obat, malah tambah sakit”"),
          ". Ada harapan, terus kenyataannya belok ke arah sebaliknya.",
        ),
        h3("Contoh"),
        ex(
          "약을 먹었는데 오히려 더 아파요.",
          "Udah minum obat, malah tambah sakit.",
        ),
        ex("쉬는 날이 오히려 더 피곤해요.", "Hari libur justru lebih capek."),
        ex(
          "A: 도와줘서 고마워요. B: 오히려 제가 더 감사하죠.",
          "A: Makasih udah bantu. B: Justru aku yang makasih.",
        ),
        callout(
          "warning",
          "Jebakan: “bukannya …, malah …” (bukannya minta maaf, malah marah) lebih pas pakai ",
          ref("-기는커녕", "ki-gineunkeonyeong"),
          ": 사과하기는커녕 화를 냈어요.",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("malah", "ik-malah"),
          ".",
        ),
      ],
    },
    "ki-simjieo": {
      description:
        "Tiga cara bilang ‘bahkan’: 심지어 di depan, -조차 dan -까지 nempel ke kata benda.",
      blocks: [
        grammar({
          number: "02",
          title: "심지어 / -조차 / -까지",
          theme: "amber",
          descriptionKo: "예상보다 더한 것을 덧붙여 말할 때 써요.",
          descriptionTranslation:
            "Tiga-tiganya “bahkan”. Bedanya posisi dan rasa: 심지어 ditaruh di depan, -조차 buat “… aja nggak”, dan -까지 buat “udah gitu, … pula”.",
          rules: [
            r("Di depan kalimat", "심지어", "심지어 사장님도 몰라요."),
            r("“… aja nggak” (negatif)", "benda + 조차", "물조차 못 마셨어요."),
            r("Nambah-nambahin", "benda + 까지", "바람까지 불어요."),
            r("Bahkan, positif", "심지어 + -까지", "심지어 김치까지 담가요."),
          ],
          examples: [
            e("", "심지어", " 주말에도 일해요."),
            e("너무 바빠서 물", "조차", " 못 마셨어요."),
            e("비가 오는데 바람", "까지", " 불어요."),
          ],
        }),
        p(
          b("Artinya apa sih? "),
          "Semuanya ",
          i("bahkan"),
          ". Kalau bingung, mulai dari 심지어 di depan kalimat, itu yang paling aman.",
        ),
        h3("Contoh"),
        ex("인사조차 안 하고 갔어요.", "Dia pergi, bahkan nggak pamit."),
        ex("그 사람 이름조차 기억이 안 나요.", "Namanya aja aku nggak inget."),
        ex("길도 막히는데 비까지 와요.", "Udah macet, hujan pula."),
        ex(
          "그 친구는 심지어 김치까지 직접 담가요.",
          "Temen itu bahkan bikin kimchi sendiri.",
        ),
        callout(
          "warning",
          "Jebakan: -조차 hampir selalu dipakai buat hal negatif atau keadaan buruk. Buat “bahkan” yang positif (bahkan dia bikin kimchi sendiri!), pakai ",
          b("심지어"),
          " atau ",
          b("-까지"),
          ".",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("bahkan", "ik-bahkan"),
          ".",
        ),
      ],
    },
    "ki-charari": {
      description:
        "차라리 = mending ... aja, dengan rasa pasrah: dua pilihan sama-sama kurang oke.",
      blocks: [
        grammar({
          number: "03",
          title: "차라리",
          theme: "amber",
          descriptionKo: "둘 다 마음에 안 들 때, 덜 나쁜 쪽을 고르면서 써요.",
          descriptionTranslation:
            "차라리 itu “mending … aja” dengan rasa pasrah. Dua pilihannya sama-sama kurang oke, dan kamu ambil yang paling nggak nyebelin. Taruh di depan pilihan yang kamu ambil.",
          rules: [
            r("Pasrah, ambil alih", "차라리 제가", "차라리 제가 할게요."),
            r("Ganti rencana", "차라리 -(으)ㄹ까요?", "차라리 택시 탈까요?"),
            r(
              "Daripada begini terus",
              "이럴 거면 차라리",
              "이럴 거면 차라리 안 갈래.",
            ),
            r(
              "Saran netral",
              "-는 게 낫다, tanpa 차라리",
              "지하철 타는 게 나아요.",
            ),
          ],
          examples: [
            e("", "차라리", " 제가 할게요."),
            e("버스가 안 오네요. ", "차라리", " 택시 탈까요?"),
            e("이렇게 비쌀 거면 ", "차라리", " 집에서 해 먹을래."),
          ],
        }),
        p(
          b("Artinya apa sih? "),
          "Kayak ",
          i("“udahlah, mending aku aja”"),
          ". Ada nada “daripada begini terus” di belakangnya.",
        ),
        h3("Contoh"),
        ex("차라리 내일 다시 올게요.", "Mending aku balik lagi besok aja."),
        ex(
          "줄 서는 것보다 차라리 다른 데 가는 게 낫겠어요.",
          "Daripada ngantri, mending ke tempat lain aja.",
        ),
        ex(
          "이럴 거면 차라리 안 갈래.",
          "Kalau gini caranya, mending nggak usah pergi.",
          "반말",
        ),
        callout(
          "warning",
          "Jebakan: buat saran netral (“mendingan naik subway”), pakai ",
          ref("-는 게 낫다", "ki-neun-ge-natda"),
          ". 차라리 ke atasan bisa kedengeran kayak kamu kesel sama pilihan lainnya.",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("mendingan", "ik-mendingan"),
          ".",
        ),
      ],
    },
    "ki-eojjeonji": {
      description:
        "어쩐지 = pantesan: kamu udah ngerasa ada yang aneh, terus dapet penjelasannya.",
      blocks: [
        grammar({
          number: "04",
          title: "어쩐지",
          theme: "amber",
          descriptionKo: "이상하다고 느낀 일의 이유를 알게 됐을 때 써요.",
          descriptionTranslation:
            "어쩐지 itu “pantesan”. Kamu udah ngerasa ada yang aneh, terus sekarang dapet penjelasannya. Pasangan setianya -더라(고요).",
          rules: [
            r("Penjelasan + 어쩐지", "-구나. 어쩐지 …", "세일이구나. 어쩐지!"),
            r("Ke temen", "어쩐지 + -더라", "어쩐지 사람이 많더라."),
            r("Sopan", "어쩐지 + -더라고요", "어쩐지 피곤해 보이더라고요."),
            r(
              "Tanpa penjelasan",
              "어쩐지 = entah kenapa",
              "어쩐지 기분이 좋아요.",
            ),
          ],
          examples: [
            e("아, 휴일이었구나. ", "어쩐지", " 길이 안 막히더라."),
            e("가수였어요? ", "어쩐지", " 노래를 잘하더라고요."),
            e("", "어쩐지", " 맛있더라. 사장님이 직접 만드셨구나!"),
          ],
        }),
        p(
          b("Artinya apa sih? "),
          "Urutannya: ada penjelasan dulu (hari ini diskon), terus 어쩐지 + hal aneh yang tadi kamu lihat (pantesan rame).",
        ),
        h3("Contoh"),
        ex(
          "아, 오늘 세일이구나. 어쩐지 사람이 많더라.",
          "Oh, hari ini diskon. Pantesan rame.",
        ),
        ex(
          "A: 민수 씨 어제 밤새웠대요. B: 어쩐지 피곤해 보이더라고요.",
          "A: Katanya Minsu begadang semalem. B: Pantesan keliatan capek.",
        ),
        ex(
          "어쩐지 조용하더라. 다들 퇴근했구나.",
          "Pantesan sepi. Ternyata semua udah pulang.",
        ),
        callout(
          "warning",
          "Jebakan: kalau nggak ada penjelasan yang nyusul, 어쩐지 artinya “entah kenapa”: ",
          b("어쩐지 기분이 좋아요"),
          " = “Entah kenapa aku lagi seneng.” Bukan “pantesan seneng”.",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("pantesan", "ik-pantesan"),
          ". Bedanya sama ",
          ref("알고 보니", "ki-algo-boni"),
          ": 어쩐지 = udah curiga dari awal, 알고 보니 = faktanya kebalikan dari dugaan.",
        ),
      ],
    },
    "ki-algo-boni": {
      description:
        "알고 보니 = ternyata, waktu fakta sebenarnya terbongkar dan beda dari dugaan.",
      blocks: [
        grammar({
          number: "05",
          title: "알고 보니",
          theme: "amber",
          descriptionKo: "나중에 진짜 사실을 알게 됐을 때 써요.",
          descriptionTranslation:
            "알고 보니 itu “ternyata”, harfiahnya “setelah tahu dan dilihat”. Dipakai waktu fakta sebenarnya terbongkar, biasanya beda dari dugaan. Paling sering buat cerita, dengan kalimat lampau.",
          rules: [
            r(
              "Kirain A, ternyata B",
              "-ㄴ 줄 알았는데, 알고 보니",
              "화난 줄 알았는데, 알고 보니 피곤했어요.",
            ),
            r(
              "Cerita fakta",
              "알고 보니 + lampau",
              "알고 보니 같은 고향이었어요.",
            ),
            r("Reaksi spontan", "-네요, bukan 알고 보니", "어, 맛있네요!"),
            r("Lihat sendiri", "-더라고요", "생각보다 맵더라고요."),
          ],
          examples: [
            e(
              "한국 사람인 줄 알았는데, ",
              "알고 보니",
              " 인도네시아 사람이었어요.",
            ),
            e("", "알고 보니", " 그 가게는 오늘 쉬는 날이었어요."),
            e("", "알고 보니", " 제 실수였어요."),
          ],
        }),
        p(
          b("Artinya apa sih? "),
          "Ini “ternyata” versi plot twist: ",
          i("“kirain A, ternyata B”"),
          ".",
        ),
        h3("Contoh"),
        ex("알고 보니 사장님 아들이었어요.", "Ternyata dia anaknya bos."),
        ex(
          "화난 줄 알았는데, 알고 보니 그냥 피곤했어요.",
          "Kirain dia marah, ternyata cuma capek.",
        ),
        ex("알고 보니 같은 고향이었어요!", "Ternyata kita sekampung!"),
        ex(
          "알고 보니 그 식당 고기가 다 할랄이었어요.",
          "Ternyata daging di restoran itu halal semua.",
        ),
        callout(
          "warning",
          "Jebakan: “ternyata” punya tiga padanan. Reaksi spontan saat itu (ternyata enak!) → ",
          ref("-네요", "ki-neyo"),
          ". Cerita hal yang kamu lihat sendiri → ",
          ref("-더라고요", "ki-deora"),
          ". Fakta yang terbongkar, kebalikan dari dugaan → 알고 보니.",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("ternyata", "ik-ternyata"),
          ".",
        ),
      ],
    },
    "ki-hoksi": {
      description:
        "혹시 buat nanya sopan atau ‘jangan-jangan’; 설마 buat ‘masa sih’ yang kamu harap nggak bener.",
      blocks: [
        grammar({
          number: "06",
          title: "혹시 / 설마",
          theme: "amber",
          descriptionKo:
            "혹시는 조심스럽게 물을 때, 설마는 믿고 싶지 않을 때 써요.",
          descriptionTranslation:
            "혹시 punya dua tugas: bikin pertanyaan jadi sopan (“maaf, kira-kira …?”) dan “jangan-jangan”. 설마 itu “masa sih”, buat hal yang kamu harap nggak bener.",
          rules: [
            r("Nanya sopan", "혹시 + pertanyaan", "혹시 인도네시아 분이세요?"),
            r(
              "Cari barang",
              "혹시 … 못 보셨어요?",
              "혹시 제 우산 못 보셨어요?",
            ),
            r(
              "Jangan-jangan",
              "혹시 -(으)ㄴ 거 아니야?",
              "혹시 까먹은 거 아니야?",
            ),
            r("Nggak percaya", "설마", "설마요!"),
          ],
          examples: [
            e("", "혹시", " 한국어 할 줄 아세요?"),
            e("", "혹시", " 이 근처에 할랄 식당 있어요?"),
            e("", "설마", " 오늘 시험이야?"),
          ],
        }),
        p(
          b("Artinya apa sih? "),
          "혹시 itu “kalau-kalau”: bikin pertanyaan lebih lembut. 설마 itu ",
          i("“masa iya sih?!”"),
          " dengan muka nggak percaya.",
        ),
        h3("Contoh"),
        ex(
          "혹시 인도네시아 분이세요?",
          "Maaf, orang Indonesia ya?",
          "nyapa orang asing",
        ),
        ex("혹시 제 우산 못 보셨어요?", "Kira-kira lihat payungku nggak?"),
        ex("혹시 걔 까먹은 거 아니야?", "Jangan-jangan dia lupa?", "반말"),
        ex("설마 벌써 다 먹었어?", "Masa udah kamu abisin semua?", "반말"),
        ex(
          "A: 민수 씨 회사 그만둔대요. B: 설마요!",
          "A: Katanya Minsu resign. B: Masa sih!",
        ),
        callout(
          "warning",
          "Jebakan: jangan pakai 설마 buat nanya sopan. ",
          b("설마 인도네시아 분이세요?"),
          " kedengeran “masa sih kamu orang Indonesia?!”, kayak kamu nggak percaya. Buat nyapa, pakai 혹시.",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("jangan-jangan", "ik-jangan-jangan"),
          ".",
        ),
      ],
    },
    "ki-dahaeng": {
      description:
        "다행이다 = untung, syukurlah: lega karena yang buruk nggak kejadian.",
      blocks: [
        grammar({
          number: "07",
          title: "다행이다 / 다행히",
          theme: "amber",
          descriptionKo: "나쁜 일이 생기지 않아서 마음이 놓일 때 써요.",
          descriptionTranslation:
            "다행이다 itu “untung” atau “syukurlah”, rasa lega karena yang buruk nggak kejadian. Polanya alasan + -아/어서 다행이에요. 다행히 ditaruh di depan, artinya “untungnya”.",
          rules: [
            r(
              "Alasan + lega",
              "-아/어서 다행이에요",
              "비가 안 와서 다행이에요.",
            ),
            r("Untungnya …", "다행히", "다행히 안 다쳤어요."),
            r("Lega, spontan", "다행이다!", "아, 다행이다!"),
            r("Hoki, beruntung", "운이 좋다, bukan 다행", "운이 좋았어요."),
          ],
          examples: [
            e("버스를 안 놓쳐서 ", "다행이에요", "."),
            e("", "다행히", " 지갑을 찾았어요."),
            e("", "다행히", " 표가 한 장 남아 있었어요."),
          ],
        }),
        p(
          b("Artinya apa sih? "),
          "Ini ",
          i("“untung nggak hujan”"),
          " atau ",
          i("“fiuh, syukurlah”"),
          ". Nadanya lega, bukan bangga.",
        ),
        h3("Contoh"),
        ex("비가 안 와서 다행이에요.", "Untung nggak hujan."),
        ex("다행히 크게 안 다쳤어요.", "Untungnya lukanya nggak parah."),
        ex(
          "막차를 탈 수 있어서 다행이었어요.",
          "Untung masih kekejar kereta terakhir.",
        ),
        ex("아, 다행이다!", "Fiuh, syukurlah!", "반말"),
        callout(
          "warning",
          "Jebakan: “untung” yang artinya laba itu ",
          b("이익"),
          ", dan “beruntung, hoki” itu ",
          b("운이 좋다"),
          ". 다행이다 khusus rasa lega.",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("untung", "ik-untung"),
          ". Sering muncul setelah ",
          ref("-(으)ㄹ 뻔했다", "ki-eul-ppeonhada"),
          ": 넘어질 뻔했는데 다행히 괜찮아요.",
        ),
      ],
    },
    "ki-aswipgedo": {
      description:
        "아쉽다 = sayang banget, nanggung; 아쉽게도 = sayangnya, di awal kalimat.",
      blocks: [
        grammar({
          number: "08",
          title: "아쉽게도 / 아쉽다",
          theme: "amber",
          descriptionKo: "기회를 놓치거나 조금 모자라서 서운할 때 써요.",
          descriptionTranslation:
            "아쉽다 itu “sayang banget” atau “nanggung”, waktu kesempatan lewat atau sesuatu kurang dikit. 아쉽게도 artinya “sayangnya”, ditaruh di awal kalimat buat ngabarin hal yang nggak enak dengan halus.",
          rules: [
            r(
              "Kesempatan lewat",
              "-아/어서 아쉬워요",
              "같이 못 가서 아쉬워요.",
            ),
            r("Spontan", "아쉽다!", "벌써 끝났어? 아쉽다!"),
            r("Kabar nggak enak", "아쉽게도", "아쉽게도 표가 다 팔렸어요."),
            r("Sayang kalau dibuang", "아깝다", "버리기 아까워요."),
            r("Kasihan", "안됐다", "정말 안됐네요."),
          ],
          examples: [
            e("", "아쉽게도", " 그날은 일이 있어요."),
            e("한 문제 차이로 떨어져서 너무 ", "아쉬워요", "."),
            e("벌써 가요? ", "아쉽네요", "."),
          ],
        }),
        p(
          b("Artinya apa sih? "),
          "Ini ",
          i("“yah, sayang banget!”"),
          " pas acara seru udah kelar, atau ",
          i("“sayangnya aku nggak bisa”"),
          " pas nolak ajakan.",
        ),
        h3("Contoh"),
        ex(
          "아쉽게도 이번 주말에는 못 가요.",
          "Sayangnya weekend ini aku nggak bisa dateng.",
        ),
        ex("벌써 끝났어? 아쉽다!", "Udah selesai? Yah, sayang banget!", "반말"),
        ex("같이 못 가서 아쉬워요.", "Sayang banget nggak bisa pergi bareng."),
        ex("아쉽게도 표가 다 팔렸어요.", "Sayangnya tiketnya udah abis."),
        callout(
          "warning",
          "Jebakan: “sayang” di bahasa Indonesia artinya banyak. “Kasihan” = ",
          b("안됐다"),
          ". “Sayang kalau dibuang” = ",
          b("아깝다"),
          ". “Sayang” ke pacar = ",
          b("자기야"),
          ". 아쉽다 khusus rasa “nanggung, kesempatan lewat”.",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("sayangnya", "ik-sayangnya"),
          ".",
        ),
      ],
    },
    "ki-hagin": {
      description:
        "하긴 = emang sih, iya juga ya; 원래 = emang dari sananya, aslinya.",
      blocks: [
        grammar({
          number: "09",
          title: "하긴 / 원래",
          theme: "amber",
          descriptionKo:
            "하긴은 상대 말에 동의할 때, 원래는 처음부터 그랬을 때 써요.",
          descriptionTranslation:
            "Dua-duanya “emang”, tapi tugasnya beda. 하긴 itu “emang sih, iya juga ya”, waktu kamu setuju setelah mikir sebentar. 원래 itu “emang dari sananya” atau “aslinya”.",
          rules: [
            r("Setuju, iya juga", "하긴", "하긴 그렇네요."),
            r("Setuju + alasan", "하긴, -(으)니까", "하긴, 월요일이니까."),
            r("Sifat dari sananya", "원래", "걔는 원래 말이 없어."),
            r(
              "Emang biasanya gitu",
              "원래 + kalimat",
              "원래 이 시간엔 막혀요.",
            ),
            r("Asalnya", "원래 + kata benda", "원래 부산 사람이에요."),
          ],
          examples: [
            e("A: 주말이라 사람 많을 거예요. B: ", "하긴", " 그렇겠네요."),
            e("이 식당은 ", "원래", " 줄이 길어요."),
            e("그 친구는 ", "원래", " 좀 조용해요."),
          ],
        }),
        p(
          b("Artinya apa sih? "),
          "하긴 = ",
          i("“emang sih, bener juga”"),
          " (setuju). 원래 = ",
          i("“emang orangnya gitu”"),
          " (dari sananya).",
        ),
        h3("Contoh"),
        ex(
          "A: 이 시간엔 택시 잡기 힘들어요. B: 하긴 그렇네요.",
          "A: Jam segini susah dapet taksi. B: Iya juga ya.",
        ),
        ex(
          "하긴, 월요일이니까 피곤하겠다.",
          "Emang sih, hari Senin pasti capek.",
          "반말",
        ),
        ex("걔는 원래 말이 없어요.", "Dia emang pendiem orangnya."),
        ex("원래 이 시간에는 길이 막혀요.", "Jam segini emang selalu macet."),
        ex("원래 부산 사람이에요.", "Aslinya orang Busan."),
        callout(
          "warning",
          "Jebakan: “emang kenapa?” (nanya balik) bukan 하긴 atau 원래, tapi ",
          ref("왜?", "ki-wae"),
          ": 왜? 무슨 일 있어?",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("emang", "ik-emang"),
          ".",
        ),
      ],
    },
    "ki-itjana": {
      description:
        "있잖아 = eh, tau nggak: pembuka obrolan sebelum cerita atau minta sesuatu.",
      blocks: [
        grammar({
          number: "10",
          title: "있잖아",
          theme: "amber",
          descriptionKo: "이야기를 시작하기 전에 상대의 관심을 끌 때 써요.",
          descriptionTranslation:
            "있잖아 (sopan: 있잖아요) itu “eh, tau nggak …” atau “eh, gini loh …”. Dipakai di awal buat narik perhatian sebelum cerita atau minta sesuatu. Biasanya diikuti jeda sebentar.",
          rules: [
            r("Ke temen", "있잖아", "있잖아, 나 어제…"),
            r("Sopan", "있잖아요", "있잖아요, 언니."),
            r(
              "Mau minta tolong",
              "있잖아, … 줄래?",
              "있잖아, 이것 좀 봐 줄래?",
            ),
            r("Di tengah, tanpa jeda", "-잖아 = kan", "돈 있잖아."),
          ],
          examples: [
            e("", "있잖아", ", 나 어제 진짜 웃긴 일 있었어."),
            e("", "있잖아요", ", 선배. 저 질문 하나 있어요."),
            e("", "있잖아", ", 부탁 하나만 해도 돼?"),
          ],
        }),
        p(
          b("Artinya apa sih? "),
          "Kayak kamu nyolek temen sebelum mulai gosip: ",
          i("“Eh, tau nggak…”"),
          ". Belum ada isinya, cuma pemanasan.",
        ),
        h3("Contoh"),
        ex(
          "있잖아, 나 어제 진짜 웃긴 일 있었어.",
          "Eh tau nggak, kemarin ada kejadian lucu banget.",
          "반말",
        ),
        ex(
          "있잖아, 그 드라마 봤어?",
          "Eh, udah nonton drakor itu belum?",
          "반말",
        ),
        ex(
          "있잖아요, 언니. 저 다음 달에 인도네시아 가요.",
          "Kak, tau nggak, bulan depan aku pulang ke Indonesia.",
        ),
        callout(
          "warning",
          "Jebakan: 있잖아 juga bisa artinya “kan ada” (pola ",
          ref("-잖아", "ki-janayo"),
          "): ",
          b("돈 있잖아"),
          " = “kan kamu punya duit”. Kalau di awal kalimat dan diikuti jeda, itu pembuka cerita.",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("loh / tau nggak", "ik-loh"),
          ".",
        ),
      ],
    },
    "ki-wae": {
      description:
        "왜 bukan cuma ‘kenapa’: di obrolan sering rasanya ‘kok’, heran atau protes halus.",
      blocks: [
        grammar({
          number: "11",
          title: "왜",
          theme: "amber",
          descriptionKo: "이유를 묻거나, 이상하다고 느낄 때 써요.",
          descriptionTranslation:
            "왜 itu “kenapa”, tapi di obrolan sering rasanya “kok”: heran atau protes halus. Taruh di awal pertanyaan.",
          rules: [
            r("Nanya alasan", "왜 + pertanyaan", "왜 안 왔어요?"),
            r("Heran, “kok … banget”", "왜 이렇게", "왜 이렇게 비싸요?"),
            r("Ada apa?", "왜? / 왜 그래?", "왜 그래? 어디 아파?"),
            r("“Kok” yang kagum", "-네요, bukan 왜", "맛있네요!"),
          ],
          examples: [
            e("버스가 ", "왜", " 이렇게 안 와요?"),
            e("", "왜", " 전화 안 받았어?"),
            e("오늘 ", "왜", " 이렇게 조용해요?"),
          ],
        }),
        p(
          b("Artinya apa sih? "),
          i("“Kok belum dateng?”"),
          " dan ",
          i("“Kok mahal banget sih?”"),
          " dua-duanya pakai 왜. Jadi kalau kamu mau bilang “kok” yang heran, mulai dari 왜.",
        ),
        h3("Contoh"),
        ex("왜 아직 안 와요?", "Kok belum dateng?"),
        ex("왜 이렇게 비싸요?", "Kok mahal banget sih?"),
        ex("왜, 무슨 일 있어?", "Kenapa, ada apa?", "반말"),
        ex("왜 그래? 어디 아파?", "Kamu kenapa? Sakit?", "반말"),
        callout(
          "warning",
          "Jebakan: “kok” yang kagum (kok enak!) bukan 왜. Pakai ",
          ref("-네요", "ki-neyo"),
          ": ",
          b("맛있네요!"),
          " Kalau bilang 왜 맛있어요?, artinya “kenapa enak?”, kayak lagi nanya resep.",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("kok", "ik-kok"),
          " dan ",
          ref("emang (kenapa?)", "ik-emang"),
          ".",
        ),
      ],
    },
    "ki-kkamppak": {
      description:
        "깜빡, 나도 모르게, 실수로: tiga kunci buat rasa ke-/ter- Indonesia (kelupaan, ketiduran, kebawa).",
      blocks: [
        grammar({
          number: "12",
          title: "깜빡 / 나도 모르게 / 실수로",
          theme: "amber",
          descriptionKo:
            "깜빡은 잊었을 때, 나도 모르게는 저절로 했을 때, 실수로는 잘못해서 했을 때 써요.",
          descriptionTranslation:
            "Bahasa Korea nggak punya awalan ke-/ter-. Rasa kelupaan, ketiduran, keceplosan, atau kebawa dibikin pakai tiga kata ini. Taruh sebelum kata kerjanya.",
          rules: [
            r("Kelupaan", "깜빡하다", "깜빡했어요!"),
            r("Ketiduran", "깜빡 잠들다", "깜빡 잠들었어요."),
            r("Refleks, tanpa sadar", "나도 모르게", "나도 모르게 웃었어요."),
            r("Salah ambil, salah pencet", "실수로", "실수로 지웠어요."),
          ],
          examples: [
            e("숙제를 ", "깜빡", "했어요."),
            e("", "나도 모르게", " 인도네시아어로 대답했어요."),
            e("", "실수로", " 메시지를 다른 사람한테 보냈어요."),
          ],
        }),
        p(
          b("Artinya apa sih? "),
          "Tanya dulu: kamu lupa (깜빡), refleks (나도 모르게), atau salah ambil atau salah pencet (실수로)?",
        ),
        h3("Contoh"),
        ex("아, 깜빡했어요! 죄송해요.", "Aduh, kelupaan! Maaf ya."),
        ex(
          "지갑을 깜빡하고 집에 두고 왔어요.",
          "Dompetku kelupaan, ketinggalan di rumah.",
        ),
        ex(
          "드라마 보다가 깜빡 잠들었어요.",
          "Lagi nonton drakor, eh ketiduran.",
        ),
        ex(
          "나도 모르게 크게 웃어 버렸어요.",
          "Tanpa sadar aku ketawa kenceng.",
        ),
        ex(
          "실수로 동료 우산을 가져왔어요.",
          "Payung temen kerja nggak sengaja kebawa.",
        ),
        callout(
          "warning",
          "Jebakan: “nggak sengaja” Indonesia bisa dua rasa. Salah ambil atau salah pencet = ",
          b("실수로"),
          ". Reaksi refleks (ketawa, nangis, keceplosan) = ",
          b("나도 모르게"),
          ". 실수로 웃었어요 kedengeran aneh.",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("rumus ke-/ter-", "ik-ke-an-rumus"),
          ", ",
          ref("kelupaan", "ik-kelupaan"),
          ", ",
          ref("ketiduran", "ik-ketiduran"),
          ", ",
          ref("keceplosan", "ik-keceplosan"),
          ", dan ",
          ref("kebawa", "ik-kebawa"),
          ". Pasangannya: ",
          ref("-아/어 버리다", "ki-a-beorida"),
          ".",
        ),
      ],
    },
    "ki-dangyeonhaji": {
      description:
        "당연하지 = ya iya dong, jelas lah; 당연히 = tentu aja, pastinya.",
      blocks: [
        grammar({
          number: "13",
          title: "당연하지",
          theme: "amber",
          descriptionKo: "대답이 너무 분명한 질문에 대답할 때 써요.",
          descriptionTranslation:
            "당연하지 (sopan: 당연하죠) itu “ya iya dong” atau “jelas lah”, dipakai sendiri sebagai jawaban. 당연히 artinya “tentu aja”, ditaruh sebelum kata kerja.",
          rules: [
            r("Jawab temen", "당연하지", "당연하지!"),
            r("Sopan, ke sebaya", "당연하죠", "당연하죠!"),
            r("Sebelum kata kerja", "당연히", "당연히 가야죠."),
            r("Ke atasan", "그럼요 / 물론이죠", "그럼요, 사장님."),
          ],
          examples: [
            e("A: 내일 올 거지? B: ", "당연하지", "!"),
            e("그건 ", "당연히", " 제가 해야죠."),
            e("A: 이거 먹어도 돼? B: ", "당연하지", "."),
          ],
        }),
        p(
          b("Artinya apa sih? "),
          "Ini ",
          i("“ya iyalah!”"),
          " pas temen nanya hal yang jawabannya jelas banget.",
        ),
        h3("Contoh"),
        ex(
          "A: 같이 갈래? B: 당연하지!",
          "A: Mau ikut? B: Ya iya dong!",
          "반말",
        ),
        ex(
          "A: 이거 다 먹어도 돼? B: 당연하지, 다 먹어.",
          "A: Boleh aku abisin? B: Ya iyalah, abisin aja.",
          "반말",
        ),
        ex("당연히 도와드려야죠.", "Ya pastinya harus aku bantu dong."),
        ex(
          "A: 저 기억하세요? B: 그럼요! 당연히 기억하죠.",
          "A: Masih inget saya? B: Tentu! Pastinya inget dong.",
        ),
        callout(
          "warning",
          "Jebakan: 당연하죠 ke atasan bisa kedengeran “ya jelas lah, ngapain nanya”. Ke 사장님, lebih aman pakai ",
          b("그럼요"),
          " atau ",
          b("물론이죠"),
          " (tentu, Pak).",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("dong", "ik-dong"),
          ".",
        ),
      ],
    },
    "ki-dwaesseo": {
      description:
        "됐어 artinya tergantung nada: udah beres, udah deh nggak usah, atau ‘yes, berhasil!’.",
      blocks: [
        grammar({
          number: "14",
          title: "됐어",
          theme: "amber",
          descriptionKo:
            "‘되다’의 과거형으로, 일이 끝났거나 더 필요 없을 때 써요.",
          descriptionTranslation:
            "됐어 (sopan: 됐어요) asalnya dari 되다 (jadi). Artinya tergantung nada: “udah beres”, “udah deh, nggak usah”, atau “yes, berhasil!”. Mirip “udah” di bahasa Indonesia.",
          rules: [
            r("Udah siap, beres", "다 됐어요", "밥 다 됐어요."),
            r("Nggak usah", "됐어", "됐어, 내가 할게."),
            r("Berhasil!", "됐다!", "됐다! 끝났다!"),
            r("Nolak sopan", "괜찮아요, bukan 됐어요", "괜찮아요, 감사합니다."),
          ],
          examples: [
            e("이제 다 ", "됐어요", ". 가져가세요."),
            e("", "됐어", ", 신경 쓰지 마."),
            e("", "됐다", "! 드디어 합격했어!"),
          ],
        }),
        p(
          b("Artinya apa sih? "),
          "Mirip ",
          i("“udah”"),
          ": “udah, makanannya siap”, “udah, nggak usah”, atau “udah, kelar!”. Nada yang nentuin.",
        ),
        h3("Contoh"),
        ex("밥 다 됐어요. 드세요.", "Makanan udah siap. Silakan makan."),
        ex(
          "A: 도와줄까? B: 됐어, 내가 할게.",
          "A: Mau aku bantu? B: Nggak usah, aku aja.",
          "반말",
        ),
        ex("됐다! 드디어 끝났다!", "Yes! Akhirnya kelar juga!", "반말"),
        ex("이제 됐어?", "Udah puas sekarang?", "반말, sarkas"),
        callout(
          "warning",
          "Jebakan: 됐어 dengan nada ketus artinya “udahlah!” yang dingin, kayak orang ngambek. Buat nolak tawaran bantuan dengan sopan, pakai ",
          b("괜찮아요"),
          " (nggak apa-apa, makasih).",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("udah deh", "ik-deh"),
          " dan ",
          ref("nggak usah", "ik-nggak-usah"),
          ".",
        ),
      ],
    },
    "ki-maeumdaero": {
      description:
        "Terserah versi Korea: 아무거나 (apa aja), 편한 대로 (senyamanmu), dan 마음대로 해 yang bisa ketus.",
      blocks: [
        grammar({
          number: "15",
          title: "마음대로 해 / 아무거나",
          theme: "amber",
          descriptionKo:
            "아무거나는 뭐든 괜찮을 때, 마음대로 해는 상대에게 결정을 맡길 때 써요.",
          descriptionTranslation:
            "“Terserah” di bahasa Indonesia bisa santai atau ngambek, bahasa Korea misahin dua rasa itu. 아무거나 artinya “apa aja”. 마음대로 해 harfiahnya “sesuka hatimu” dan sering kedengeran ketus.",
          rules: [
            r("Apa aja", "아무거나", "아무거나 괜찮아요."),
            r(
              "Di mana / kapan aja",
              "아무 데나 / 아무 때나",
              "아무 데나 앉으세요.",
            ),
            r("Terserah (sopan)", "편한 대로 하세요", "편한 대로 하세요."),
            r("Terserah! (ngambek)", "마음대로 해", "몰라, 마음대로 해."),
            r("Kamu yang tentuin", "네가 정해", "네가 정해."),
          ],
          examples: [
            e("저는 ", "아무거나", " 괜찮아요."),
            e("시간은 ", "편한 대로", " 정하세요."),
            e("그럼 네 ", "마음대로 해", "!"),
          ],
        }),
        p(
          b("Artinya apa sih? "),
          "Kalau maksudmu “terserah, apa aja boleh”, pakai 아무거나 atau 편한 대로. Kalau maksudmu “terserah!” yang ngambek, itu 마음대로 해.",
        ),
        h3("Contoh"),
        ex(
          "A: 뭐 먹을래요? B: 아무거나 괜찮아요.",
          "A: Mau makan apa? B: Apa aja boleh.",
        ),
        ex("아무 때나 연락하세요.", "Hubungi aku kapan aja."),
        ex("아무 데나 앉으세요.", "Duduk di mana aja."),
        ex(
          "몰라, 네 마음대로 해.",
          "Nggak tahu ah, terserah kamu.",
          "반말, lagi ngambek",
        ),
        callout(
          "warning",
          "Jebakan: 마음대로 해 sering kedengeran kayak “terserah!” versi ngambek. Kalau maksudmu baik, pakai ",
          b("편한 대로 해"),
          " atau ",
          b("네가 정해"),
          " (kamu yang tentuin).",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("terserah", "ik-terserah"),
          ".",
        ),
      ],
    },
  },
  vocabulary: {
    title: "Kosakata: kata kecil reaksi dan perasaan",
    description:
      "Lima belas kata dan ungkapan reaksi yang bikin obrolanmu hidup, masing-masing dengan arti dan satu contoh kalimat.",
    entries: [
      {
        term: "오히려",
        meanings: ["malah", "justru"],
        example: {
          ko: "약을 먹었는데 오히려 더 아파요.",
          id: "Udah minum obat, malah tambah sakit.",
        },
      },
      {
        term: "심지어 / -조차 / -까지",
        meanings: ["bahkan", "bahkan ... pun", "bahkan sampai"],
        example: {
          ko: "너무 바빠서 물조차 못 마셨어요.",
          id: "Sibuk banget, minum aja nggak sempet.",
        },
      },
      {
        term: "차라리",
        meanings: ["mending ... aja"],
        example: {
          ko: "차라리 제가 할게요.",
          id: "Udah, mending aku aja yang kerjain.",
        },
      },
      {
        term: "어쩐지",
        meanings: ["pantesan", "entah kenapa"],
        example: {
          ko: "어쩐지 사람이 많더라.",
          id: "Pantesan rame.",
        },
      },
      {
        term: "알고 보니",
        meanings: ["ternyata", "setelah tahu"],
        example: {
          ko: "알고 보니 같은 고향이었어요!",
          id: "Ternyata kita sekampung!",
        },
      },
      {
        term: "혹시 / 설마",
        meanings: ["kira-kira", "jangan-jangan", "masa sih"],
        example: {
          ko: "혹시 인도네시아 분이세요?",
          id: "Maaf, orang Indonesia ya?",
        },
      },
      {
        term: "다행이다 / 다행히",
        meanings: ["untung", "syukurlah", "untungnya"],
        example: { ko: "비가 안 와서 다행이에요.", id: "Untung nggak hujan." },
      },
      {
        term: "아쉽게도 / 아쉽다",
        meanings: ["sayangnya", "sayang banget", "nanggung"],
        example: {
          ko: "아쉽게도 이번 주말에는 못 가요.",
          id: "Sayangnya weekend ini aku nggak bisa dateng.",
        },
      },
      {
        term: "하긴 / 원래",
        meanings: ["emang sih", "iya juga ya", "emang dari dulu"],
        example: {
          ko: "걔는 원래 말이 없어요.",
          id: "Dia emang pendiem orangnya.",
        },
      },
      {
        term: "있잖아",
        meanings: ["eh, tau nggak", "eh gini"],
        example: {
          ko: "있잖아, 나 어제 진짜 웃긴 일 있었어.",
          id: "Eh tau nggak, kemarin ada kejadian lucu banget.",
        },
      },
      {
        term: "왜",
        meanings: ["kok", "kenapa"],
        example: { ko: "왜 아직 안 와요?", id: "Kok belum dateng?" },
      },
      {
        term: "깜빡 / 나도 모르게 / 실수로",
        meanings: ["kelupaan", "tanpa sadar", "nggak sengaja"],
        example: {
          ko: "드라마 보다가 깜빡 잠들었어요.",
          id: "Lagi nonton drakor, eh ketiduran.",
        },
      },
      {
        term: "당연하지",
        meanings: ["ya iya dong", "jelas lah"],
        example: {
          ko: "A: 같이 갈래? B: 당연하지!",
          id: "A: Mau ikut? B: Ya iya dong!",
        },
      },
      {
        term: "됐어",
        meanings: ["udah deh", "nggak usah", "udah beres"],
        example: {
          ko: "됐어, 내가 할게.",
          id: "Nggak usah, aku aja.",
        },
      },
      {
        term: "마음대로 해 / 아무거나",
        meanings: ["terserah", "apa aja"],
        example: {
          ko: "아무거나 괜찮아요.",
          id: "Apa aja boleh.",
        },
      },
    ],
  },
  quiz: {
    title: "Kuis: kata kecil reaksi dan perasaan",
    description:
      "12 soal pilihan ganda soal 오히려, 어쩐지, 알고 보니, 혹시, 다행이다, 됐어, dan kata reaksi lainnya. Lulus kalau benar minimal 70%.",
    passingScore: 70,
    questions: [
      {
        key: "ki10-ohiryeo",
        prompt: "‘Udah minum obat, (___) tambah sakit.’ Isi yang pas?",
        options: [
          { text: "오히려", correct: true },
          { text: "심지어" },
          { text: "다행히" },
          { text: "원래" },
        ],
        explanation:
          "오히려 = malah, justru. Hasilnya kebalikan dari yang kamu kira: 약을 먹었는데 오히려 더 아파요.",
      },
      {
        key: "ki10-jocha",
        prompt: "‘Sibuk banget, minum aja nggak sempet.’ Yang paling natural?",
        options: [
          { text: "너무 바빠서 물조차 못 마셨어요.", correct: true },
          { text: "너무 바빠서 물조차 마셨어요." },
          { text: "너무 바빠서 차라리 물 못 마셨어요." },
        ],
        explanation:
          "-조차 = bahkan ... pun, dan hampir selalu nongol di kalimat negatif. Tanpa 못, kalimatnya jadi aneh.",
      },
      {
        key: "ki10-charari",
        prompt:
          "Rekan kerja dari tadi salah terus ngerjain tugas. Kamu agak pasrah: ‘Udah, mending aku aja.’",
        options: [
          { text: "차라리 제가 할게요.", correct: true },
          { text: "오히려 제가 할게요." },
          { text: "어쩐지 제가 할게요." },
          { text: "혹시 제가 할게요." },
        ],
        explanation:
          "차라리 = mending ... aja, dengan rasa pasrah: dua pilihan sama-sama kurang oke, kamu ambil yang paling nggak nyebelin.",
      },
      {
        key: "ki10-eojjeonji",
        prompt: "‘Oh, hari ini diskon. (___) 사람이 많더라.’ (Pantesan rame.)",
        options: [
          { text: "어쩐지", correct: true },
          { text: "알고 보니" },
          { text: "혹시" },
          { text: "하긴" },
        ],
        explanation:
          "어쩐지 = pantesan. Kamu udah ngerasa ada yang aneh (rame), terus dapet penjelasannya (diskon). Pasangan setianya -더라.",
      },
      {
        key: "ki10-algo-boni",
        prompt:
          "‘Kirain dia marah, (___) cuma capek.’ Faktanya terbongkar, kebalikan dari dugaan. Isi yang pas?",
        options: [
          { text: "알고 보니", correct: true },
          { text: "어쩐지" },
          { text: "설마" },
          { text: "아쉽게도" },
        ],
        explanation:
          "알고 보니 = ternyata, versi plot twist: kirain A, ternyata B. 화난 줄 알았는데, 알고 보니 그냥 피곤했어요.",
      },
      {
        key: "ki10-hoksi",
        prompt:
          "Mau nyapa orang asing dengan sopan: ‘Maaf, orang Indonesia ya?’",
        options: [
          { text: "혹시 인도네시아 분이세요?", correct: true },
          { text: "설마 인도네시아 분이세요?" },
          { text: "왜 인도네시아 분이세요?" },
          { text: "어쩐지 인도네시아 분이세요?" },
        ],
        explanation:
          "혹시 di depan pertanyaan bikin kalimat langsung halus, kayak ‘maaf, kira-kira...’. 설마 itu ‘masa sih’, kedengeran nggak percaya.",
      },
      {
        key: "ki10-dahaeng",
        prompt: "‘Untung nggak hujan.’ Yang bener?",
        options: [
          { text: "비가 안 와서 다행이에요.", correct: true },
          { text: "비가 안 와서 아쉬워요." },
          { text: "비가 안 와서 이익이에요." },
          { text: "비가 안 와서 당연해요." },
        ],
        explanation:
          "다행이다 = untung, syukurlah, lega karena yang buruk nggak kejadian. 이익 itu untung dalam arti laba, dan 아쉬워요 malah ‘sayang banget’.",
      },
      {
        key: "ki10-aswipda",
        prompt:
          "Makanan sisa masih banyak dan kamu bilang ‘sayang kalau dibuang’. Kata yang pas?",
        options: [
          { text: "아깝다", correct: true },
          { text: "아쉽다" },
          { text: "다행이다" },
        ],
        explanation:
          "‘Sayang kalau dibuang’ = 아깝다. 아쉽다 khusus rasa nanggung atau kesempatan lewat, kayak acara seru yang keburu kelar.",
      },
      {
        key: "ki10-wae-neyo",
        prompt: "Kamu nyobain masakan temen dan kaget: ‘Kok enak!’ Yang pas?",
        options: [
          { text: "맛있네요!", correct: true },
          { text: "왜 맛있어요?" },
          { text: "왜 이렇게 맛있어요?" },
        ],
        explanation:
          "‘Kok’ yang kagum itu -네요, bukan 왜. 왜 맛있어요? kedengeran kayak kamu nanya alasannya, literally minta resep.",
      },
      {
        key: "ki10-kkamppak",
        prompt: "‘Lagi nonton drakor, eh ketiduran.’ Yang bener?",
        options: [
          { text: "드라마 보다가 깜빡 잠들었어요.", correct: true },
          { text: "드라마 보다가 실수로 잠들었어요." },
          { text: "드라마 보다가 결국 잠잤어요." },
        ],
        explanation:
          "Ketiduran = 깜빡 잠들다. 실수로 itu ‘nggak sengaja’ karena salah ambil atau salah pencet, bukan buat tidur.",
      },
      {
        key: "ki10-dangyeon",
        prompt:
          "사장님 nanya ‘내일도 나올 수 있어요?’. Kamu mau jawab ‘tentu, Pak’ dengan sopan.",
        options: [
          { text: "그럼요! 나올 수 있어요.", correct: true },
          { text: "당연하지! 나올 수 있어." },
          { text: "아무거나요." },
          { text: "됐어요." },
        ],
        explanation:
          "Ke atasan, 그럼요 atau 물론이죠 itu ‘tentu’ yang aman. 당연하지 itu 반말, dan 당연하죠 pun bisa kedengeran ‘ya jelas lah, ngapain nanya’.",
      },
      {
        key: "ki10-dwaesseo",
        prompt:
          "Rekan kerja yang lebih senior nawarin bantuan, tapi kamu bisa sendiri. Cara nolak yang halus?",
        options: [
          { text: "괜찮아요, 감사합니다.", correct: true },
          { text: "됐어요!" },
          { text: "마음대로 하세요." },
          { text: "당연하죠." },
        ],
        explanation:
          "됐어(요) dengan nada ketus artinya ‘udahlah!’ yang dingin. Buat nolak bantuan dengan sopan, pakai 괜찮아요.",
      },
    ],
  },
});
