import { b, callout, defineBab, ex, grammar, h3, i, p, ref } from "../blocks";

/** One rule row of a grammar card: situation, Korean pattern, short example. */
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
  key: "ik-03-alasan",
  materials: {
    "ik-soalnya": {
      description:
        "Soalnya: alasan di belakang pakai -거든, atau di depan pakai -아서 dan -(으)니까.",
      blocks: [
        grammar({
          theme: "blue",
          number: "01",
          title: "soalnya → -거든, -아서, -(으)니까",
          descriptionKo: "이유를 앞이나 뒤에서 말할 때 써요.",
          descriptionTranslation:
            "Kalau alasannya nyusul di belakang, persis kayak bahasa Indonesia, pakai -거든. Kalau alasannya di depan, pakai -아서 (netral) atau -(으)니까 (lebih nekanin alasan). Kalimat yang nyuruh atau ngajak wajib pakai -(으)니까.",
          rules: [
            r(
              "Alasan nyusul di belakang",
              "-거든(요)",
              "먼저 갈게. 피곤하거든.",
            ),
            r("Alasan di depan, netral", "-아서/어서", "피곤해서 먼저 갈게."),
            r("Nyuruh atau ngajak", "-(으)니까", "피곤하니까 쉬자."),
            r("Jawab pertanyaan 왜?", "-아서요/어서요", "배가 아파서요."),
          ],
          examples: [
            e("저 돼지고기 못 먹어요. 무슬림", "이거든요", "."),
            e("", "배고파서", " 라면 먹었어."),
            e("내일 시험이 ", "있으니까", " 일찍 자자."),
          ],
        }),
        p(
          i('"Aku pulang duluan ya, soalnya capek."'),
          " Keputusannya dulu, alasannya belakangan. Gimana bilangnya?",
        ),
        p(
          "Urutan kayak bahasa Indonesia pakai ",
          ref("-거든", "ki-geodeunyo"),
          ": ",
          b("먼저 갈게. 피곤하거든."),
          " Urutan Korea, alasan di depan, pakai ",
          ref("-아서/어서", "ki-aseo-karena"),
          " yang paling netral, atau ",
          ref("-(으)니까", "ki-nikka"),
          " kalau alasannya mau ditekanin.",
        ),
        h3("Contoh"),
        ex(
          "오늘은 못 가요. 야근해야 되거든요.",
          "Hari ini nggak bisa, soalnya harus lembur.",
        ),
        ex("피곤해서 먼저 갈게.", "Aku pulang duluan ya, soalnya capek."),
        ex("배가 아파서요.", "Soalnya perutku sakit.", "jawaban buat 왜?"),
        ex("늦었으니까 택시 타자.", "Udah kemaleman, naik taksi aja yuk."),
        callout(
          "warning",
          b("-아서 nggak bisa dipakai buat nyuruh atau ngajak."),
          " ",
          i('"Mau hujan, bawa payung ya."'),
          " Kalau pakai -아서 (비가 와서 우산 가져가), kedengerannya aneh. Yang benar: ",
          b("비가 오니까 우산 가져가."),
          " Kalimat belakangnya nyuruh, ngajak, atau minta tolong? Pakai -(으)니까.",
        ),
        callout(
          "tip",
          "Alasannya bawa hasil jelek? Cek ",
          ref("gara-gara", "ik-gara-gara"),
          ". -거든 juga dipakai buat ngasih info baru, cek ",
          ref("loh", "ik-loh"),
          ".",
        ),
      ],
    },
    "ik-gara-gara": {
      description:
        "Gara-gara: sebab yang bawa hasil jelek, pakai -아서, 때문에, atau -는 바람에.",
      blocks: [
        grammar({
          theme: "blue",
          number: "02",
          title: "gara-gara → -아서, 때문에, -는 바람에",
          descriptionKo: "안 좋은 결과의 원인을 말할 때 써요.",
          descriptionTranslation:
            "Gara-gara itu alasan yang bawa hasil jelek. Paling natural pakai -아서. Kalau penyebabnya kata benda, tempel 때문에, dan kalau penyebabnya kejadian mendadak yang bikin rencana berantakan, pakai -는 바람에.",
          rules: [
            r("Ngobrol, netral", "-아서/어서", "길이 막혀서 늦었어."),
            r("Penyebabnya kata benda", "N 때문에", "눈 때문에 늦었어요."),
            r("Nyalahin orang", "너 때문에", "너 때문에 늦었잖아!"),
            r("Kejadian mendadak", "-는 바람에", "늦잠 자는 바람에 지각했어."),
            r("Laporan resmi", "-기 때문에", "막혔기 때문에 늦었습니다."),
          ],
          examples: [
            e("길이 ", "막혀서", " 늦었어요."),
            e("", "눈 때문에", " 버스가 안 와요."),
            e("휴대폰이 ", "꺼지는 바람에", " 연락을 못 했어요."),
          ],
        }),
        p(
          i('"Gara-gara macet, aku telat."'),
          " Ini alasan yang bawa hasil jelek: telat, rusak, dimarahin. Gimana bilangnya?",
        ),
        p(
          "Buat ngobrol, paling natural ",
          ref("-아서/어서", "ki-aseo-karena"),
          ": ",
          b("길이 막혀서 늦었어."),
          " Penyebabnya kata benda? Tempel ",
          ref("때문에", "ki-gi-ttaemune"),
          ", ini yang paling mirip gara-gara. Kejadian mendadak yang bikin berantakan pakai ",
          ref("-는 바람에", "ki-neun-barame"),
          ".",
        ),
        h3("Contoh"),
        ex(
          "너 때문에 늦었잖아!",
          "Gara-gara kamu aku telat, tahu!",
          "nyalahin banget",
        ),
        ex(
          "기계가 갑자기 고장 나는 바람에 야근했어요.",
          "Gara-gara mesinnya tiba-tiba rusak, aku jadi lembur.",
        ),
        ex(
          "감기 때문에 오늘 결근했어요.",
          "Gara-gara flu, hari ini aku nggak masuk kerja.",
        ),
        ex(
          "길이 막혔기 때문에 늦었습니다.",
          "Saya terlambat karena jalanan macet.",
          "resmi, buat laporan",
        ),
        callout(
          "warning",
          b("-는 바람에 selalu pakai 는."),
          " Walaupun kejadiannya udah lewat, tetap ",
          b("자는 바람에"),
          ", bukan 잤는 바람에. Bentuk lampaunya cukup di akhir kalimat: ",
          b("늦잠 자는 바람에 지각했어."),
        ),
        callout(
          "tip",
          "Alasannya netral, bukan hasil jelek? Cek ",
          ref("soalnya", "ik-soalnya"),
          ". Hasil jeleknya gara-gara kamu nggak sengaja? Cek ",
          ref("rumus ke-/ter-", "ik-ke-an-rumus"),
          ".",
        ),
      ],
    },
    "ik-mumpung": {
      description:
        "Mumpung: manfaatin kesempatan pakai -(으)ㄹ 때 + harus/yuk, atau -(으)ㄴ 김에.",
      blocks: [
        grammar({
          theme: "blue",
          number: "03",
          title: "mumpung → -(으)ㄹ 때, -는 김에",
          descriptionKo: "좋은 기회를 놓치지 말자고 할 때 써요.",
          descriptionTranslation:
            "Bahasa Korea nggak punya satu kata khusus buat mumpung. Paling sering pakai -(으)ㄹ 때, terus bagian belakangnya ngajak atau bilang harus. Kalau kamu udah terlanjur ada di sana, pakai -(으)ㄴ 김에.",
          rules: [
            r("Mumpung, harus", "-(으)ㄹ 때 -아야지", "젊을 때 많이 배워야지."),
            r("Mumpung, ngajak", "-(으)ㄹ 때 -자", "날씨 좋을 때 한강 가자!"),
            r(
              "Mumpung, nyaranin",
              "-(으)ㄹ 때 -(으)세요",
              "젊을 때 여행 많이 하세요.",
            ),
            r("Udah terlanjur di sana", "-(으)ㄴ 김에", "나온 김에 장도 보자."),
          ],
          examples: [
            e("한국에 ", "있을 때", " 많이 놀러 다녀야지."),
            e("날씨 ", "좋을 때", " 한강 가자!"),
            e("부산 ", "온 김에", " 바다 보러 가요."),
          ],
        }),
        p(
          i('"Mumpung di Korea, jalan-jalan yang banyak!"'),
          " Ada kesempatan yang nggak bakal lama, jadi harus dimanfaatin. Gimana bilangnya?",
        ),
        p(
          "Pakai ",
          ref("-(으)ㄹ 때", "ki-eul-ttae"),
          ", terus tutup pakai ajakan atau ",
          ref("-아야지", "ki-aya-hada"),
          ": ",
          b("한국에 있을 때 많이 놀러 다녀야지."),
          " Kalau udah terlanjur keluar atau ada di sana, pakai ",
          ref("-(으)ㄴ 김에", "ki-neun-gime"),
          ": ",
          b("나온 김에 장도 보고 가자."),
        ),
        h3("Contoh"),
        ex(
          "젊을 때 많이 배워야 돼요.",
          "Mumpung masih muda, harus banyak belajar.",
        ),
        ex(
          "휴가 있을 때 고향에 다녀와야지.",
          "Mumpung ada cuti, aku harus pulang kampung dulu nih.",
        ),
        ex(
          "사장님 기분 좋으실 때 휴가 얘기해 봐.",
          "Mumpung bos lagi mood bagus, coba omongin soal cuti.",
        ),
        ex(
          "나온 김에 장도 보고 가자.",
          "Mumpung udah keluar, sekalian belanja yuk.",
        ),
        callout(
          "warning",
          b("-(으)ㄹ 때 doang belum mumpung."),
          " ",
          b("한국에 있을 때 일했어요"),
          ' cuma artinya "waktu di Korea aku kerja". Biar jadi mumpung, bagian belakangnya harus ngajak, nyaranin, atau bilang harus.',
        ),
        callout(
          "tip",
          "Toh udah mau ngelakuin sesuatu, jadi sekalian? Cek ",
          ref("sekalian", "ik-sekalian"),
          ". Takut kesempatannya keburu lewat? Cek ",
          ref("keburu", "ik-keburu"),
          ".",
        ),
      ],
    },
    "ik-sekalian": {
      description:
        "Sekalian: toh udah mau ngelakuin sesuatu, jadi sekalian aja, pakai -는 김에.",
      blocks: [
        grammar({
          theme: "blue",
          number: "04",
          title: "sekalian → -는 김에",
          descriptionKo: "어떤 일을 하는 기회에 다른 일도 같이 할 때 써요.",
          descriptionTranslation:
            "Toh udah mau ngelakuin sesuatu, jadi sekalian aja ngerjain hal lain. Kegiatan utamanya ditempelin -는 김에. Kalau kegiatannya udah kejadian (udah dateng, udah keluar), pakai -(으)ㄴ 김에.",
          rules: [
            r("Lagi atau mau dilakuin", "-는 김에", "가는 김에 사다 줘."),
            r(
              "Kegiatan orang lain, sopan",
              "-(으)시는 김에",
              "가시는 김에 사다 주세요.",
            ),
            r("Udah kejadian", "-(으)ㄴ 김에", "온 김에 친구도 만났어요."),
            r(
              "Mumpung lagi dibahas",
              "말 나온 김에",
              "말 나온 김에, 회식 언제예요?",
            ),
            r("Cuma barengan", "같이", "이것도 같이 계산해 주세요."),
          ],
          examples: [
            e("편의점 ", "가는 김에", " 물 좀 사다 줘."),
            e("편의점 ", "가시는 김에", " 물 좀 사다 주세요."),
            e("서울 ", "온 김에", " 친구도 만났어요."),
          ],
        }),
        p(
          i('"Sekalian ke minimarket, beliin air ya."'),
          " Toh udah mau ngelakuin sesuatu, jadi sekalian aja ngerjain hal lain. Gimana bilangnya?",
        ),
        p(
          "Tempel ",
          ref("-는 김에", "ki-neun-gime"),
          " ke kegiatan utamanya: ",
          b("편의점 가는 김에 물 좀 사다 줘."),
          " Kegiatannya udah kejadian? Ganti jadi -(으)ㄴ 김에: ",
          b("서울 온 김에."),
        ),
        h3("Contoh"),
        ex(
          "나가는 김에 쓰레기 좀 버려 줘.",
          "Sekalian keluar, buangin sampah dong.",
        ),
        ex(
          "커피 사러 가는 김에 네 것도 사 올게.",
          "Sekalian beli kopi, aku beliin punyamu juga deh.",
        ),
        ex(
          "은행 가는 김에 집에 돈도 보낼게요.",
          "Sekalian ke bank, aku kirim uang ke rumah juga.",
        ),
        ex(
          "말 나온 김에, 다음 주 회식 언제예요?",
          "Mumpung lagi dibahas, makan-makan kantor minggu depan kapan?",
        ),
        callout(
          "warning",
          b("-는 김에 butuh kegiatan beneran."),
          " Harus ada kegiatan yang lagi atau udah dilakuin: pergi, keluar, dateng, masak. ",
          i('"Yang ini sekalian dibayar ya"'),
          " nggak ada kegiatannya, jadi pakai ",
          b("같이"),
          ": ",
          b("이것도 같이 계산해 주세요."),
        ),
        callout(
          "tip",
          "Manfaatin kesempatan yang nggak bakal lama? Cek ",
          ref("mumpung", "ik-mumpung"),
          ". Nitipnya biar halus, tambahin 좀, cek ",
          ref("dong", "ik-dong"),
          ".",
        ),
      ],
    },
    "ik-asal": {
      description:
        "Asal dan yang penting: satu syarat yang udah cukup, pakai -기만 하면.",
      blocks: [
        grammar({
          theme: "blue",
          number: "05",
          title: "asal / yang penting → -기만 하면",
          descriptionKo: "한 가지 조건만 있으면 충분하다고 할 때 써요.",
          descriptionTranslation:
            "Kamu nyebut satu syarat yang udah cukup, yang lain nggak masalah. Tempel -기만 하면 ke syaratnya, terus tutup pakai 돼 (udah cukup) atau hasilnya. Kalau syaratnya kata benda, cukup pakai 만 + -(으)면.",
          rules: [
            r(
              "Yang penting ..., cukup",
              "-기만 하면 돼",
              "건강하기만 하면 돼.",
            ),
            r("Asal ..., pasti", "-기만 하면", "할랄이기만 하면 다 먹어요."),
            r("Kata benda", "N만 -(으)면", "비자만 나오면 갈 거예요."),
            r("Asal nggak ...", "N만 안 -(으)면", "비만 안 오면 가자."),
          ],
          examples: [
            e("", "건강하기만 하면", " 돼."),
            e("열심히 ", "하기만 하면", " 돼요."),
            e("비자", "만 나오면", " 바로 갈 거예요."),
          ],
        }),
        p(
          i('"Yang penting sehat." "Asal halal, aku makan semua."'),
          " Kamu nyebut satu syarat yang udah cukup, yang lain nggak masalah. Gimana bilangnya?",
        ),
        p(
          "Pakai ",
          ref("-기만 하면", "ki-giman-hamyeon"),
          ", terus tutup pakai 돼: ",
          b("건강하기만 하면 돼."),
          " Kalau syaratnya kata benda, lebih simpel pakai 만 + ",
          ref("-(으)면", "ki-myeon"),
          ": ",
          b("비자만 나오면 바로 갈 거예요."),
        ),
        h3("Contoh"),
        ex("할랄이기만 하면 다 먹어요.", "Asal halal, aku makan semua."),
        ex("시간 맞춰 오기만 하면 돼요.", "Yang penting dateng tepat waktu."),
        ex(
          "비만 안 오면 내일 소풍 가자.",
          "Asal nggak hujan, besok piknik yuk.",
        ),
        ex(
          "천천히 하기만 하면 돼. 안전이 제일 중요해.",
          "Yang penting pelan-pelan. Keselamatan nomor satu.",
        ),
        callout(
          "warning",
          b("Asal ≠ asal-asalan."),
          " Syarat yang cukup pakai -기만 하면. Tapi ",
          i('"jangan asal-asalan"'),
          " itu maksudnya sembarangan, jadi pakai ",
          b("대충"),
          ": ",
          b("대충 하지 마."),
        ),
        callout(
          "tip",
          '"Apa aja boleh" tanpa syarat? Cek ',
          ref("terserah", "ik-terserah"),
          ". Syaratnya malah nggak perlu dilakuin? Cek ",
          ref("nggak usah", "ik-nggak-usah"),
          ".",
        ),
      ],
    },
  },
  vocabulary: {
    title: "Kosakata: alasan dan kesempatan",
    description:
      "Cara bilang soalnya, gara-gara, mumpung, sekalian, dan asal dalam bahasa Korea.",
    entries: [
      {
        term: "-거든",
        meanings: ["soalnya", "soalnya gini loh"],
        example: {
          ko: "오늘은 못 가요. 야근해야 되거든요.",
          id: "Hari ini nggak bisa, soalnya harus lembur.",
        },
      },
      {
        term: "때문에",
        meanings: ["gara-gara", "karena"],
        example: {
          ko: "눈 때문에 버스가 안 와요.",
          id: "Gara-gara salju, busnya nggak dateng-dateng.",
        },
      },
      {
        term: "-(으)ㄹ 때",
        meanings: ["mumpung", "waktu, ketika"],
        example: {
          ko: "날씨 좋을 때 한강 가자!",
          id: "Mumpung cuacanya bagus, ke Hangang yuk!",
        },
      },
      {
        term: "-는 김에",
        meanings: ["sekalian", "mumpung udah"],
        example: {
          ko: "편의점 가는 김에 물 좀 사다 줘.",
          id: "Sekalian ke minimarket, beliin air dong.",
        },
      },
      {
        term: "-기만 하면",
        meanings: ["asal", "yang penting"],
        example: { ko: "건강하기만 하면 돼.", id: "Yang penting sehat." },
      },
    ],
  },
  quiz: {
    title: "Kuis: soalnya, gara-gara, mumpung, sekalian, asal",
    description:
      "Sebelas situasi ngobrol. Pilih cara kasih alasan atau manfaatin kesempatan yang paling natural.",
    passingScore: 70,
    questions: [
      {
        key: "soalnya-urutan-indo",
        prompt:
          'Kamu mau bilang "Aku pulang duluan ya, soalnya capek" ke bestie, urutannya persis kayak bahasa Indonesia. Pilih yang paling natural.',
        options: [
          { text: "먼저 갈게. 피곤하거든.", correct: true },
          { text: "먼저 갈게. 피곤하잖아." },
          { text: "먼저 갈게. 피곤하기 때문입니다." },
        ],
        explanation:
          '-거든 itu soalnya buat alasan baru yang temenmu belum tahu. -잖아 artinya "kan", kesannya dia harusnya udah tahu kamu capek. -기 때문입니다 kaku banget buat ngobrol sama bestie.',
      },
      {
        key: "soalnya-nyuruh",
        prompt:
          'Ke teman: "Bawa payung ya, soalnya kayaknya mau hujan." Pilih yang benar.',
        options: [
          { text: "비가 올 것 같으니까 우산 가져가.", correct: true },
          { text: "비가 올 것 같아서 우산 가져가." },
          { text: "비가 올 것 같기 때문에 우산 가져가." },
        ],
        explanation:
          "Kalimat belakangnya nyuruh, jadi alasannya wajib pakai -(으)니까. -아서 dan -기 때문에 nggak bisa dipasangin sama perintah.",
      },
      {
        key: "gara-gara-benda",
        prompt:
          '"Gara-gara salju, busnya nggak dateng-dateng." Penyebabnya kata benda (눈). Pilih yang benar.',
        options: [
          { text: "눈 때문에 버스가 안 와요.", correct: true },
          { text: "눈 바람에 버스가 안 와요." },
          { text: "눈이니까 버스가 안 와요." },
        ],
        explanation:
          'Kata benda langsung tempel 때문에. -는 바람에 butuh kata kerja (오는 바람에), dan 눈이니까 artinya "karena itu salju", nggak nyambung.',
      },
      {
        key: "gara-gara-baram",
        prompt: '"Gara-gara kesiangan, aku telat masuk." Pilih yang benar.',
        options: [
          { text: "늦잠 자는 바람에 지각했어.", correct: true },
          { text: "늦잠 잤는 바람에 지각했어." },
          { text: "늦잠 자는 김에 지각했어." },
        ],
        explanation:
          "-는 바람에 selalu pakai 는, walaupun kejadiannya udah lewat. Lampaunya cukup di 지각했어. -는 김에 itu sekalian, jelas bukan maksudnya.",
      },
      {
        key: "gara-gara-ke-bos",
        prompt:
          "Kamu telat masuk kerja karena busnya mogok. Ke 반장님, pilih yang paling aman.",
        options: [
          {
            text: "죄송합니다. 버스가 고장 나는 바람에 늦었어요.",
            correct: true,
          },
          { text: "버스 때문에 늦었잖아요." },
          { text: "늦었어. 버스가 고장 났거든." },
        ],
        explanation:
          "Minta maaf dulu, terus ceritain kejadian mendadaknya pakai -는 바람에. -잖아요 kesannya dia harusnya udah ngerti, dan pilihan ketiga pakai 반말 ke atasan. Red flag.",
      },
      {
        key: "mumpung-muda",
        prompt:
          'Ke teman: "Mumpung masih muda, banyakin jalan-jalan!" Pilih yang paling pas.',
        options: [
          { text: "젊을 때 여행 많이 다녀야지!", correct: true },
          { text: "젊을 때 여행 많이 다녔어." },
          { text: "젊기 때문에 여행 많이 다녀야 돼." },
        ],
        explanation:
          'Rasa mumpung muncul dari -(으)ㄹ 때 plus bagian belakang yang bilang "harus dimanfaatin" (-아야지). 다녔어 cuma cerita masa lalu, dan 때문에 bikin mudanya jadi alasan, bukan kesempatan.',
      },
      {
        key: "mumpung-terlanjur",
        prompt:
          'Kamu lagi liburan ke Busan. "Mumpung lagi di Busan, kita lihat laut yuk." Pilih yang paling natural.',
        options: [
          { text: "부산 온 김에 바다 보러 가요.", correct: true },
          { text: "부산 와서 바다 보러 가요." },
          { text: "부산 오는 바람에 바다 보러 가요." },
        ],
        explanation:
          "Udah terlanjur ada di Busan, jadi -(으)ㄴ 김에. -아서 cuma urutan biasa tanpa rasa mumpung, dan -는 바람에 itu buat kejadian yang bawa hasil jelek.",
      },
      {
        key: "sekalian-nitip",
        prompt:
          'Teman sekamarmu mau ke 편의점. "Sekalian ke minimarket, beliin air dong." Pilih yang paling natural.',
        options: [
          { text: "편의점 가는 김에 물 좀 사다 줘.", correct: true },
          { text: "편의점 가는 바람에 물 좀 사다 줘." },
          { text: "편의점 가기 전에 물 좀 사다 줘." },
        ],
        explanation:
          'Dia toh udah mau pergi, jadi nitipnya pakai -는 김에. -는 바람에 itu buat kejadian mendadak yang hasilnya jelek, dan -기 전에 artinya "sebelum pergi", nggak masuk akal.',
      },
      {
        key: "sekalian-bayar",
        prompt:
          'Di kasir, kamu mau bilang "Yang ini sekalian dibayar ya." Pilih yang benar.',
        options: [
          { text: "이것도 같이 계산해 주세요.", correct: true },
          { text: "이것도 계산하는 김에 주세요." },
          { text: "이것도 계산하기만 하면 돼요." },
        ],
        explanation:
          "Sekalian di sini cuma artinya barengan, nggak ada kegiatan lain yang ditumpangin. Jadi pakai 같이, bukan -는 김에.",
      },
      {
        key: "asal-sehat",
        prompt: '"Yang penting sehat." Pilih yang paling pas.',
        options: [
          { text: "건강하기만 하면 돼.", correct: true },
          { text: "건강해서 돼." },
          { text: "건강하기 때문에 돼." },
        ],
        explanation:
          "-기만 하면 돼 = asal itu aja, udah cukup. -아서 dan 때문에 bikin sehat jadi alasan, bukan syarat. Jujurly, ini kalimat favorit orang tua di mana-mana.",
      },
      {
        key: "asal-atau-asalan",
        prompt: '반장님 bilang ke kamu: "대충 하지 마." Artinya apa?',
        options: [
          { text: "Jangan asal-asalan.", correct: true },
          { text: "Asal dikerjain aja udah cukup." },
          { text: "Jangan dikerjain dulu." },
        ],
        explanation:
          '대충 = asal jadi, sembarangan. Jadi 대충 하지 마 = jangan asal-asalan. Asal yang artinya "yang penting" itu beda total, pakai -기만 하면 돼.',
      },
    ],
  },
});
