import { b, callout, defineBab, ex, grammar, h3, i, p, ref } from "../blocks";

export default defineBab({
  key: "ki-08-andai",
  materials: {
    "ki-asseoya": {
      description:
        "-았/었어야 했는데 = harusnya (tadi) ...: nyesel karena sesuatu yang nggak kamu lakuin.",
      blocks: [
        grammar({
          number: "01",
          title: "-았/었어야 했는데",
          descriptionKo: "과거에 하지 않은 일을 후회할 때 써요.",
          descriptionTranslation:
            "Nyesel karena sesuatu yang nggak kamu lakuin di masa lalu: “harusnya tadi bawa payung”. Ujung -는데 sengaja digantung, kayak kita bilang “harusnya tadi...” terus menghela napas.",
          rules: [
            {
              condition: "Vokal terakhir ㅏ / ㅗ",
              form: "-았어야 했는데",
              example: "가다 → 갔어야 했는데",
            },
            {
              condition: "Vokal lain",
              form: "-었어야 했는데",
              example: "먹다 → 먹었어야 했는데",
            },
            {
              condition: "하다",
              form: "했어야 했는데",
              example: "예약했어야 했는데",
            },
            {
              condition: "Harusnya nggak",
              form: "-지 말았어야 했는데",
              example: "말하지 말았어야 했는데",
            },
            {
              condition: "Penutup tegas",
              form: "-았/었어야 했어요",
              example: "일찍 출발했어야 했어요",
            },
            {
              condition: "Negur orang (반말)",
              form: "-았/었어야지",
              example: "미리 말했어야지!",
            },
          ],
          examples: [
            { before: "우산을 ", emphasis: "가져왔어야 했는데", after: "." },
            { before: "더 일찍 ", emphasis: "출발했어야 했어요", after: "." },
            {
              before: "그 말은 하지 ",
              emphasis: "말았어야 했는데",
              after: "...",
            },
          ],
          theme: "amber",
        }),
        p(
          b("Artinya apa sih? "),
          "Rumusnya: ",
          b("harus"),
          " (",
          ref("-아/어야 하다", "ki-aya-hada"),
          ") + ",
          b("dulu"),
          " (lampau) + ",
          b("tapi nggak kejadian"),
          " (-는데). Hasilnya: ",
          i("harusnya tadi ..."),
        ),
        h3("Contoh"),
        ex("아, 우산을 가져왔어야 했는데.", "Aduh, harusnya tadi bawa payung."),
        ex(
          "더 일찍 출발했어야 했어요. 길이 너무 막혀요.",
          "Harusnya berangkat lebih awal. Macet parah.",
        ),
        ex(
          "미리 예약했어야 했는데 자리가 없네요.",
          "Harusnya pesan dari awal, ternyata udah penuh.",
        ),
        ex(
          "그 말은 하지 말았어야 했는데...",
          "Harusnya aku nggak ngomong gitu...",
        ),
        ex(
          "그럼 나한테 미리 말했어야지!",
          "Ya harusnya kamu bilang ke aku dari awal dong!",
          "반말, negur",
        ),
        callout(
          "warning",
          "Jebakan: “harusnya” di bahasa Indonesia juga dipakai buat nebak. “Harusnya dia udah sampai sekarang” itu bukan nyesel, jadi pakai -았/었을 거예요: 지금쯤 도착했을 거예요. Kalau pakai 도착했어야 했는데, kesannya kamu ngeluh dia belum sampai.",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("harusnya", "ik-harusnya"),
          ". Bedanya sama ",
          ref("-았/었으면 좋았을 텐데", "ki-asseumyeon-teonde"),
          ": -았/었어야 했는데 ada rasa salah, 좋았을 텐데 cuma rasa sayang.",
        ),
      ],
    },
    "ki-asseumyeon-teonde": {
      description:
        "-았/었으면 좋았을 텐데 = coba / kalau aja ...: berandai-andai soal masa lalu.",
      blocks: [
        grammar({
          number: "02",
          title: "-았/었으면 좋았을 텐데",
          descriptionKo: "이미 지나간 일을 아쉬워할 때 써요.",
          descriptionTranslation:
            "Berandai-andai soal masa lalu yang udah nggak bisa diubah: “coba kamu ikut kemarin”, “kalau aja aku belajar dari dulu”. Rasanya sayang dan agak nyesek. Saudaranya, -았/었으면 좋겠다, dipakai buat harapan ke depan: “semoga ...”.",
          rules: [
            {
              condition: "Vokal terakhir ㅏ / ㅗ",
              form: "-았으면 좋았을 텐데",
              example: "가다 → 갔으면 좋았을 텐데",
            },
            {
              condition: "Vokal lain",
              form: "-었으면 좋았을 텐데",
              example: "배우다 → 배웠으면 좋았을 텐데",
            },
            {
              condition: "하다",
              form: "했으면 좋았을 텐데",
              example: "같이 했으면 좋았을 텐데",
            },
            {
              condition: "Kata benda",
              form: "-였/이었으면 좋았을 텐데",
              example: "주말이었으면 좋았을 텐데",
            },
            {
              condition: "Harapan ke depan",
              form: "-았/었으면 좋겠다",
              example: "비가 안 왔으면 좋겠어요",
            },
          ],
          examples: [
            {
              before: "너도 같이 ",
              emphasis: "갔으면 좋았을 텐데",
              after: ".",
            },
            {
              before: "한국어를 더 일찍 ",
              emphasis: "배웠으면 좋았을 텐데",
              after: ".",
            },
            {
              before: "내일 비가 안 ",
              emphasis: "왔으면 좋겠어요",
              after: ".",
            },
          ],
          theme: "amber",
        }),
        p(
          b("Artinya apa sih? "),
          "Pecah jadi tiga: ",
          b("-았/었으면"),
          " (kalau dulu ...) + ",
          b("좋았을"),
          " (pasti enak) + ",
          b("텐데"),
          " (tapi kenyataannya nggak). Hasilnya: ",
          i("coba kalau ..."),
          ", dengan ujung yang digantung.",
        ),
        h3("Contoh"),
        ex("어제 너도 같이 갔으면 좋았을 텐데.", "Coba kemarin kamu ikut."),
        ex(
          "조금만 더 일찍 왔으면 좋았을 텐데.",
          "Coba kamu datang sedikit lebih awal.",
        ),
        ex(
          "한국어를 더 일찍 배웠으면 좋았을 텐데.",
          "Kalau aja aku belajar bahasa Korea dari dulu.",
        ),
        ex(
          "내일 비가 안 왔으면 좋겠어요.",
          "Semoga besok nggak hujan.",
          "harapan ke depan",
        ),
        callout(
          "warning",
          "Jebakan: “coba” punya dua arti. “Coba deh” = nyoba, pakai ",
          ref("-아/어 보다", "ki-a-boda"),
          ". “Coba kemarin kamu datang” = berandai-andai, pakai pola ini. Jangan bilang ✗ 어제 와 보세요.",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("kalau aja", "ik-kalau-aja"),
          ". Bedanya sama ",
          ref("-았/었어야 했는데", "ki-asseoya"),
          ": itu ada rasa salah. Ke teman yang nggak bisa datang, pakai 좋았을 텐데 biar nggak kedengeran nyalahin.",
        ),
      ],
    },
    "ki-neun-ge-natda": {
      description:
        "-는 게 낫다 = mendingan ...: milih yang lebih oke dari dua pilihan.",
      blocks: [
        grammar({
          number: "03",
          title: "-는 게 낫다",
          descriptionKo: "두 가지 중에서 더 좋은 쪽을 말할 때 써요.",
          descriptionTranslation:
            "Artinya “mendingan ...” atau “lebih baik ...”. Dipakai buat milih di antara dua pilihan atau nyaranin dengan halus. 게 itu singkatan 것이, jadi harfiahnya: “yang ... itu lebih baik”.",
          rules: [
            {
              condition: "Kata kerja",
              form: "-는 게 낫다",
              example: "타다 → 타는 게 나아요",
            },
            {
              condition: "Negatif",
              form: "안 -는 게 낫다",
              example: "안 가는 게 나아요",
            },
            {
              condition: "Lebih halus",
              form: "-는 게 나을 것 같아요",
              example: "쉬는 게 나을 것 같아요",
            },
            {
              condition: "Bandingin dua hal",
              form: "A보다 B가 (더) 낫다",
              example: "이거보다 저게 나아요",
            },
            {
              condition: "반말",
              form: "-는 게 나아 / 낫지",
              example: "택시 타는 게 나아",
            },
          ],
          examples: [
            {
              before: "지금은 지하철 ",
              emphasis: "타는 게 나아요",
              after: ".",
            },
            {
              before: "아프면 오늘은 ",
              emphasis: "쉬는 게 나을 것 같아요",
              after: ".",
            },
            { before: "이거보다 저게 더 ", emphasis: "나아요", after: "." },
          ],
          theme: "amber",
        }),
        p(
          b("Artinya apa sih? "),
          "Sama persis kayak ",
          i("mendingan"),
          " waktu lagi nimbang-nimbang: ",
          i("“Jam segini macet. Mendingan naik subway.”"),
          " Kamu bandingin dua pilihan, terus nunjuk yang lebih oke.",
        ),
        h3("Contoh"),
        ex(
          "지금은 길이 막히니까 지하철 타는 게 나아요.",
          "Jam segini macet, mendingan naik subway.",
        ),
        ex(
          "아프면 오늘은 쉬는 게 나을 것 같아요.",
          "Kalau lagi sakit, kayaknya mendingan hari ini istirahat.",
        ),
        ex(
          "사장님한테 솔직하게 말하는 게 나아요.",
          "Mendingan jujur aja ke bos.",
        ),
        ex(
          "혼자 가는 것보다 같이 가는 게 낫지.",
          "Mending pergi bareng daripada sendirian.",
          "반말",
        ),
        callout(
          "warning",
          "Jebakan: 낫다 itu ㅅ tidak beraturan: 나아요, bukan ✗ 낫아요. Jangan ketuker sama 낳다 (melahirkan). Satu lagi, 낫다 juga bisa berarti “sembuh”: 감기가 다 나았어요 = flunya udah sembuh.",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("mendingan", "ik-mendingan"),
          ". Bedanya sama ",
          ref("차라리", "ki-charari"),
          ": 차라리 itu mendingan yang pasrah, kayak “udahlah, mending aku aja”.",
        ),
      ],
    },
    "ki-ryeogo-haenneunde": {
      description:
        "-(으)려고 했는데 = tadinya mau ..., tapi: rencana yang gagal atau berubah.",
      blocks: [
        grammar({
          number: "04",
          title: "-(으)려고 했는데",
          descriptionKo: "하려고 계획했지만 그렇게 되지 않았을 때 써요.",
          descriptionTranslation:
            "Artinya “tadinya mau ..., tapi ...”. Kamu udah niat, tapi rencananya gagal atau berubah. Sering dipakai buat minta maaf atau jelasin kenapa sesuatu nggak jadi.",
          rules: [
            {
              condition: "Akhiran vokal / ㄹ",
              form: "-려고 했는데",
              example: "가다 → 가려고 했는데, 만들다 → 만들려고 했는데",
            },
            {
              condition: "Akhiran konsonan",
              form: "-으려고 했는데",
              example: "먹다 → 먹으려고 했는데",
            },
            {
              condition: "하다",
              form: "하려고 했는데",
              example: "전화하려고 했는데",
            },
            {
              condition: "Baru aja mau",
              form: "-(으)려던 참이었어요",
              example: "연락하려던 참이었어요",
            },
          ],
          examples: [
            {
              before: "어제 ",
              emphasis: "전화하려고 했는데",
              after: " 깜빡했어요.",
            },
            {
              before: "오늘 ",
              emphasis: "운동하려고 했는데",
              after: " 비가 와서 못 했어요.",
            },
            {
              before: "저도 지금 ",
              emphasis: "전화하려던 참이었어요",
              after: "!",
            },
          ],
          theme: "amber",
        }),
        p(
          b("Artinya apa sih? "),
          b("-(으)려고"),
          " (niatnya) + ",
          b("했는데"),
          " (udah ada rencana, tapi...). Di bahasa Indonesia: ",
          i("tadinya mau..., niatnya..., padahal tadinya..."),
        ),
        h3("Contoh"),
        ex(
          "어제 전화하려고 했는데 깜빡했어요. 죄송해요.",
          "Kemarin tadinya mau nelepon, tapi lupa. Maaf ya.",
        ),
        ex(
          "오늘 운동하려고 했는데 비가 와서 못 했어요.",
          "Hari ini tadinya mau olahraga, tapi hujan, jadi batal deh.",
        ),
        ex(
          "일찍 자려고 했는데 결국 새벽까지 게임했어요.",
          "Niatnya tidur cepat, ujung-ujungnya main game sampai subuh.",
        ),
        ex(
          "그 신발 사려고 했는데 벌써 다 팔렸어요.",
          "Tadinya mau beli sepatu itu, eh udah habis terjual.",
        ),
        ex(
          "A: 왜 연락 안 했어? B: 하려고 했는데...",
          "A: Kok nggak ngabarin? B: Tadinya mau sih...",
          "반말",
        ),
        callout(
          "warning",
          "Jebakan: ",
          ref("-(으)려고", "ki-ryeogo"),
          " dan ",
          ref("-(으)러", "ki-reo"),
          " sama-sama sering diterjemahin “untuk”. Tapi “tadinya mau” selalu -(으)려고 했는데, bukan ✗ -(으)러 했는데. -(으)러 cuma bisa diikuti 가다 atau 오다.",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("padahal tadinya mau", "ik-padahal-rencana"),
          " dan ",
          ref("nggak jadi", "ik-nggak-jadi"),
          ".",
        ),
      ],
    },
  },
  vocabulary: {
    title: "Kosakata: Andai-andai dan penyesalan",
    description:
      "Empat pola buat nyesel, berandai-andai, dan milih yang lebih baik: harusnya, coba kalau aja, mendingan, tadinya mau.",
    entries: [
      {
        term: "-았/었어야 했는데",
        meanings: ["harusnya tadi", "seharusnya"],
        example: {
          ko: "아, 우산을 가져왔어야 했는데.",
          id: "Aduh, harusnya tadi bawa payung.",
        },
      },
      {
        term: "-았/었으면 좋았을 텐데",
        meanings: ["coba", "kalau aja"],
        example: {
          ko: "어제 너도 같이 갔으면 좋았을 텐데.",
          id: "Coba kemarin kamu ikut.",
        },
      },
      {
        term: "-는 게 낫다",
        meanings: ["mendingan", "lebih baik"],
        example: {
          ko: "지금은 지하철 타는 게 나아요.",
          id: "Sekarang mendingan naik subway.",
        },
      },
      {
        term: "-(으)려고 했는데",
        meanings: ["tadinya mau", "niatnya"],
        example: {
          ko: "어제 전화하려고 했는데 깜빡했어요.",
          id: "Kemarin tadinya mau nelepon, tapi lupa.",
        },
      },
    ],
  },
  quiz: {
    title: "Kuis: Andai-andai dan penyesalan",
    description:
      "10 soal pilihan ganda: harusnya tadi, coba kalau aja, mendingan, dan tadinya mau. Lulus kalau benar minimal 70%.",
    passingScore: 70,
    questions: [
      {
        key: "ki08-asseoya-payung",
        prompt: "“Aduh, harusnya tadi bawa payung.” Bahasa Koreanya?",
        options: [
          { text: "아, 우산을 가져왔어야 했는데.", correct: true },
          { text: "아, 우산을 가져오려고 했는데." },
          { text: "아, 우산을 가져왔으면 좋겠어요." },
          { text: "아, 우산을 가져와 봤어요." },
        ],
        explanation:
          "Nyesel karena nggak ngelakuin sesuatu = -았/었어야 했는데. 가져오려고 했는데 artinya “tadinya mau bawa”, dan 좋겠어요 itu harapan ke depan.",
      },
      {
        key: "ki08-asseoya-jimalgo",
        prompt: "“Harusnya aku nggak ngomong gitu...” Yang pas?",
        options: [
          { text: "그 말은 하지 말았어야 했는데...", correct: true },
          { text: "그 말은 하려고 했는데..." },
          { text: "그 말은 하지 마세요..." },
          { text: "그 말은 하는 게 나아요..." },
        ],
        explanation:
          "“Harusnya nggak” = -지 말았어야 했는데. 하지 마세요 itu larangan ke orang lain, bukan nyesel.",
      },
      {
        key: "ki08-harusnya-dugaan",
        prompt:
          "“Harusnya dia udah sampai sekarang.” Di sini “harusnya” artinya nebak, bukan nyesel. Yang pas?",
        options: [
          { text: "지금쯤 도착했을 거예요.", correct: true },
          { text: "지금쯤 도착했어야 했는데요." },
          { text: "지금쯤 도착하려고 했어요." },
          { text: "지금쯤 도착하는 게 나아요." },
        ],
        explanation:
          "“Harusnya” yang nebak pakai -았/었을 거예요. Kalau pakai 도착했어야 했는데, artinya jadi ngeluh: “harusnya udah sampai (tapi kok belum)”.",
      },
      {
        key: "ki08-teonde-coba",
        prompt: "“Coba kemarin kamu ikut.” Yang pas?",
        options: [
          { text: "어제 너도 같이 갔으면 좋았을 텐데.", correct: true },
          { text: "어제 너도 같이 가 봐." },
          { text: "어제 너도 같이 가려고 했는데." },
          { text: "어제 너도 같이 갔으면 좋겠다." },
        ],
        explanation:
          "“Coba” yang berandai-andai soal masa lalu = -았/었으면 좋았을 텐데. 가 봐 itu “coba” yang nyoba, dan 좋겠다 dipakai buat yang belum kejadian.",
      },
      {
        key: "ki08-joketda-harapan",
        prompt: "“Semoga besok nggak hujan.” Yang pas?",
        options: [
          { text: "내일 비가 안 왔으면 좋겠어요.", correct: true },
          { text: "내일 비가 안 왔으면 좋았을 텐데." },
          { text: "내일 비가 안 왔어야 했는데." },
        ],
        explanation:
          "Harapan ke depan = -았/었으면 좋겠다. Bentuknya lampau, tapi artinya “semoga”. 좋았을 텐데 cuma buat yang udah lewat.",
      },
      {
        key: "ki08-teonde-teman",
        prompt:
          "Temanmu nggak bisa datang ke acara ulang tahunmu karena kerja. Kamu mau bilang sayang, tapi tanpa nyalahin dia. Yang paling pas?",
        options: [
          { text: "너도 왔으면 좋았을 텐데. 다음에 보자!", correct: true },
          { text: "너도 왔어야지!" },
          { text: "너도 왔어야 했는데." },
        ],
        explanation:
          "-았/었으면 좋았을 텐데 fokus ke “sayang ya”. 왔어야지 itu negur, dan 왔어야 했는데 ke orang lain kedengeran kayak nyalahin.",
      },
      {
        key: "ki08-natda-subway",
        prompt: "“Jam segini macet. Mendingan naik subway.” Bagian keduanya?",
        options: [
          { text: "지하철 타는 게 나아요.", correct: true },
          { text: "지하철 탔어야 했는데요." },
          { text: "지하철 타려고 했어요." },
          { text: "지하철 타 버렸어요." },
        ],
        explanation:
          "Milih yang lebih oke dari dua pilihan = -는 게 낫다. Mau lebih halus lagi: 지하철 타는 게 나을 것 같아요.",
      },
      {
        key: "ki08-natda-ejaan",
        prompt: "낫다 + -아요 jadi apa?",
        options: [
          { text: "나아요", correct: true },
          { text: "낫아요" },
          { text: "낳아요" },
          { text: "났어요" },
        ],
        explanation:
          "낫다 itu ㅅ tidak beraturan: ㅅ-nya hilang sebelum vokal, jadi 나아요. 낳아요 itu dari 낳다 (melahirkan), beda kata.",
      },
      {
        key: "ki08-ryeogo-telepon",
        prompt: "“Kemarin tadinya mau nelepon, tapi lupa.” Yang benar?",
        options: [
          { text: "어제 전화하려고 했는데 깜빡했어요.", correct: true },
          { text: "어제 전화하러 했는데 깜빡했어요." },
          { text: "어제 전화해 버렸는데 깜빡했어요." },
          { text: "어제 전화했어야 했는데 깜빡했어요." },
        ],
        explanation:
          "“Tadinya mau ... tapi” selalu -(으)려고 했는데. -(으)러 cuma bisa diikuti 가다/오다, jadi ✗ 하러 했는데 salah.",
      },
      {
        key: "ki08-ryeodeon-cham",
        prompt:
          "Teman nelepon duluan, padahal kamu juga baru mau nelepon dia. Kamu bilang: “Aku juga baru mau nelepon!”",
        options: [
          { text: "저도 전화하려던 참이었어요!", correct: true },
          { text: "저도 전화했어야 했는데요!" },
          { text: "저도 전화해 봤어요!" },
          { text: "저도 전화하는 게 나아요!" },
        ],
        explanation:
          "-(으)려던 참이었어요 = “baru aja mau ...”. Pas banget buat momen kebetulan kayak gini.",
      },
    ],
  },
});
