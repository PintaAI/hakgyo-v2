import { b, callout, defineBab, ex, h3, i, p, ref, table } from "../blocks";

export default defineBab({
  key: "ik-03-alasan",
  materials: {
    "ik-soalnya": {
      description:
        "Soalnya: alasan di belakang pakai -거든, atau di depan pakai -아서 dan -(으)니까.",
      blocks: [
        p(
          i('"Aku pulang duluan ya, soalnya capek."'),
          " Keputusannya dulu, alasannya belakangan. Gimana bilangnya?",
        ),
        table([
          ["Korea", "Nuansa"],
          [
            ref("먼저 갈게. 피곤하거든.", "ki-geodeunyo"),
            "Urutannya persis kayak bahasa Indonesia: keputusan dulu, alasan nyusul pakai -거든. Sopannya -거든요.",
          ],
          [
            ref("피곤해서 먼저 갈게.", "ki-aseo-karena"),
            "Urutan Korea: alasan di depan. Paling sering dan netral.",
          ],
          [
            ref("피곤하니까 먼저 갈게.", "ki-nikka"),
            "Alasannya lebih ditekankan. Wajib dipakai kalau kalimatnya nyuruh atau ngajak.",
          ],
        ]),
        h3("Contoh"),
        ex(
          "저 돼지고기 못 먹어요. 무슬림이거든요.",
          "Aku nggak bisa makan babi, soalnya aku muslim.",
        ),
        ex(
          "오늘은 못 가요. 야근해야 되거든요.",
          "Hari ini nggak bisa, soalnya harus lembur.",
        ),
        ex("배고파서 라면 먹었어.", "Aku makan ramyeon, soalnya laper."),
        ex(
          "내일 시험이 있으니까 오늘은 일찍 자자.",
          "Besok ada ujian, jadi malam ini tidur cepet yuk.",
        ),
        callout(
          "warning",
          b("-아서 nggak bisa dipakai buat nyuruh atau ngajak."),
          " ",
          i('"Mau hujan, bawa payung ya."'),
          " Kalau pakai -아서 (비가 와서 우산 가져가), kedengerannya aneh. Yang benar: ",
          b("비가 오니까 우산 가져가."),
          " Kalimat belakangnya nyuruh, ngajak, atau minta tolong? Pakai -(으)니까.",
        ),
      ],
    },
    "ik-gara-gara": {
      description:
        "Gara-gara: sebab yang bawa hasil jelek, pakai -아서, 때문에, atau -는 바람에.",
      blocks: [
        p(
          i('"Gara-gara macet, aku telat."'),
          " Ini alasan yang bawa hasil jelek: telat, rusak, dimarahin. Gimana bilangnya?",
        ),
        table([
          ["Korea", "Nuansa"],
          [
            ref("길이 막혀서 늦었어.", "ki-aseo-karena"),
            "Paling natural buat ngobrol. Netral, nggak terlalu nyalahin.",
          ],
          [
            ref("눈 때문에 버스가 안 와요.", "ki-gi-ttaemune"),
            "Penyebabnya kata benda, jadi langsung tempel 때문에. Paling mirip gara-gara.",
          ],
          [
            ref("늦잠 자는 바람에 지각했어.", "ki-neun-barame"),
            "Kejadian mendadak yang bikin rencana berantakan.",
          ],
        ]),
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
          "휴대폰이 꺼지는 바람에 연락을 못 했어요.",
          "Gara-gara HP-ku mati, aku nggak bisa ngabarin.",
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
      ],
    },
    "ik-mumpung": {
      description:
        "Mumpung: manfaatin kesempatan pakai -(으)ㄹ 때 + harus/yuk, atau -(으)ㄴ 김에.",
      blocks: [
        p(
          i('"Mumpung di Korea, jalan-jalan yang banyak!"'),
          " Ada kesempatan yang nggak bakal lama, jadi harus dimanfaatin. Bahasa Korea nggak punya satu kata khusus buat mumpung. Gimana bilangnya?",
        ),
        table([
          ["Korea", "Nuansa"],
          [
            ref("한국에 있을 때 많이 놀러 다녀야지.", "ki-eul-ttae"),
            "Mumpung masih ada kesempatan: -(으)ㄹ 때 + harus (-아야지).",
          ],
          [
            ref("날씨 좋을 때 한강 가자!", "ki-eul-ttae"),
            '"Mumpung cuacanya bagus, ke Hangang yuk!" -(으)ㄹ 때 + ajakan.',
          ],
          [
            ref("나온 김에 장도 보고 가자.", "ki-neun-gime"),
            "Mumpung udah terlanjur keluar atau ada di sana: -(으)ㄴ 김에.",
          ],
        ]),
        h3("Contoh"),
        ex(
          "젊을 때 많이 배워야 돼요.",
          "Mumpung masih muda, harus banyak belajar.",
        ),
        ex(
          "부산 온 김에 바다 보러 가요.",
          "Mumpung lagi di Busan, kita lihat laut yuk.",
        ),
        ex(
          "휴가 있을 때 고향에 다녀와야지.",
          "Mumpung ada cuti, aku harus pulang kampung dulu nih.",
        ),
        ex(
          "사장님 기분 좋으실 때 휴가 얘기해 봐.",
          "Mumpung bos lagi mood bagus, coba omongin soal cuti.",
        ),
        callout(
          "warning",
          b("-(으)ㄹ 때 doang belum mumpung."),
          " ",
          b("한국에 있을 때 일했어요"),
          ' cuma artinya "waktu di Korea aku kerja". Biar jadi mumpung, bagian belakangnya harus ngajak atau bilang harus: ',
          ref("-아야지 / -아야 돼", "ki-aya-hada"),
          ", -자, atau -(으)세요.",
        ),
      ],
    },
    "ik-sekalian": {
      description:
        "Sekalian: toh udah mau ngelakuin sesuatu, jadi sekalian aja, pakai -는 김에.",
      blocks: [
        p(
          i('"Sekalian ke minimarket, beliin air ya."'),
          " Toh udah mau ngelakuin sesuatu, jadi sekalian aja ngerjain hal lain. Gimana bilangnya?",
        ),
        table([
          ["Korea", "Nuansa"],
          [
            ref("편의점 가는 김에 물 좀 사다 줘.", "ki-neun-gime"),
            "Santai, ke teman. Kegiatan yang mau dilakuin nempel di -는 김에.",
          ],
          [
            ref("편의점 가시는 김에 물 좀 사다 주세요.", "ki-neun-gime"),
            "Sopan. 가시는 = versi hormat dari 가는.",
          ],
          [
            ref("서울 온 김에 친구도 만났어요.", "ki-neun-gime"),
            "-(으)ㄴ 김에: udah terlanjur di sana, jadi sekalian.",
          ],
        ]),
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
      ],
    },
    "ik-asal": {
      description:
        "Asal dan yang penting: satu syarat yang udah cukup, pakai -기만 하면.",
      blocks: [
        p(
          i('"Yang penting sehat." "Asal halal, aku makan semua."'),
          " Kamu nyebut satu syarat yang udah cukup, yang lain nggak masalah. Gimana bilangnya?",
        ),
        table([
          ["Korea", "Nuansa"],
          [
            ref("건강하기만 하면 돼.", "ki-giman-hamyeon"),
            '"Yang penting sehat." Ditutup 돼 = udah cukup.',
          ],
          [
            ref("열심히 하기만 하면 돼요.", "ki-giman-hamyeon"),
            '"Asal rajin, udah cukup." Sering dipakai buat nyemangatin.',
          ],
          [
            ref("비자만 나오면 바로 갈 거예요.", "ki-myeon"),
            'Kata benda + 만 + -(으)면: "asal visanya keluar". Lebih simpel.',
          ],
        ]),
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
