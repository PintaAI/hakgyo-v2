import { b, callout, defineBab, ex, h3, i, p, ref, table } from "../blocks";

export default defineBab({
  key: "ik-02-partikel",
  materials: {
    "ik-kok": {
      description:
        "Kok yang heran, kok yang kaget seneng, dan kok yang nyangkal halus.",
      blocks: [
        p(
          i('"Kok belum dateng?" "Kok enak!" "Nggak kok."'),
          " Tiga kok, tiga maksud: heran, kaget seneng, dan nyangkal halus. Gimana bilangnya?",
        ),
        table([
          ["Korea", "Nuansa"],
          [
            ref("왜 아직 안 와?", "ki-wae"),
            "Kok yang heran atau protes. Santai, ke teman.",
          ],
          [
            ref("맛있네!", "ki-neyo"),
            "Kok yang kaget seneng. Hasilnya lebih bagus dari dugaan.",
          ],
          [
            ref("아니야~", "ki-banmal-pengecualian"),
            '"Nggak kok~" Nyangkal dengan lembut. Sopannya 아니에요.',
          ],
        ]),
        h3("Contoh"),
        ex("왜 이렇게 비싸요?", "Kok mahal banget?"),
        ex("한국어 잘하시네요!", "Kok jago bahasa Korea!", "buat muji"),
        ex("와, 벌써 다 했네?", "Wah, kok udah selesai?"),
        ex("아니야~ 화 안 났어.", "Nggak kok~ Aku nggak marah."),
        callout(
          "warning",
          b('Jangan bilang "kok enak" pakai 왜.'),
          " 왜 맛있어? kedengeran kayak kamu nuntut alasan, seolah makanan enak itu aneh. Yang masak bisa tersinggung. 왜 cuma buat kok yang heran atau protes. Buat kok yang kaget seneng, pakai ",
          b("-네"),
          ".",
        ),
      ],
    },
    "ik-sih": {
      description:
        "Sih yang penasaran (siapa sih?) dan sih yang ngelembutin pendapat (aku sih nggak masalah).",
      blocks: [
        p(
          i('"Siapa sih?" "Aku sih nggak masalah."'),
          ' Sih bikin pertanyaan kerasa penasaran, dan bikin pendapat kerasa "ini menurut aku aja ya". Gimana bilangnya?',
        ),
        table([
          ["Korea", "Nuansa"],
          [
            ref("누군데?", "ki-neunde"),
            '"Siapa sih?" Kata tanya + -ㄴ데? dengan nada naik. Penasaran.',
          ],
          [
            ref("뭔데?", "ki-neunde"),
            '"Apa sih?" Misalnya temen bilang dia punya kabar.',
          ],
          [
            ref("나는 괜찮은데.", "ki-neunde"),
            '"Aku sih nggak masalah." 나는 + -는데 yang digantung: menurut aku, nggak tahu yang lain.',
          ],
          [
            ref("저는 괜찮은데요.", "ki-neunde"),
            'Versi sopan: "kalau saya sih nggak apa-apa".',
          ],
        ]),
        h3("Contoh"),
        ex("그게 뭔데?", "Itu apa sih?"),
        ex("어딘데?", "Di mana sih?"),
        ex("나는 좋은데?", "Aku sih suka-suka aja?"),
        ex(
          "나는 지하철 타는 게 나은데.",
          "Kalau aku sih mendingan naik subway.",
        ),
        callout(
          "warning",
          b("Ke atasan jangan pakai 뭔데요?"),
          ' Walaupun ada -요, rasanya masih "apaan sih?". Ke 사장님 atau 반장님 cukup tanya biasa: ',
          b("무슨 일이에요?"),
          " (",
          i("Ada apa, Pak?"),
          ").",
        ),
      ],
    },
    "ik-dong": {
      description:
        "Dong buat minta tolong (bantuin dong) dan buat jawaban yang jelas (ya iya dong).",
      blocks: [
        p(
          i('"Bantuin dong." "Ya iya dong!"'),
          ' Dong yang pertama ngelembutin permintaan, yang kedua bilang "jelas lah". Gimana bilangnya?',
        ),
        table([
          ["Korea", "Nuansa"],
          [
            ref("좀 도와줘.", "ki-jom"),
            '"Bantuin dong." Santai, ke teman. 좀 itu pelembutnya.',
          ],
          [ref("좀 도와주세요.", "ki-a-juseyo"), "Sopan, aman ke siapa aja."],
          [
            ref("좀 도와줄래?", "ki-eullaeyo"),
            '"Mau bantuin aku nggak?" Lebih lembut lagi, kayak nawar.',
          ],
          [
            ref("당연하지!", "ki-dangyeonhaji"),
            '"Ya iya dong!" Sopannya 당연하죠.',
          ],
        ]),
        h3("Contoh"),
        ex("물 좀 주세요.", "Minta air dong.", "di warung atau restoran"),
        ex("사진 좀 찍어 주세요.", "Fotoin dong."),
        ex("내일 나 좀 깨워 줘.", "Besok bangunin aku dong."),
        ex("빨리 좀 와!", "Cepetan dong dateng!", "nggak sabar, ke teman"),
        callout(
          "warning",
          b("Jangan lupa 줘."),
          " ",
          i('"Ajarin dong"'),
          " itu ",
          b("좀 가르쳐 줘"),
          ". Tanpa 줘, ",
          b("가르쳐"),
          ' jadi perintah biasa ("ajarin!"), bukan minta tolong.',
        ),
      ],
    },
    "ik-deh": {
      description:
        "Deh buat mutusin (yang ini aja deh), nyaranin (coba deh), dan nyerah (udah deh).",
      blocks: [
        p(
          i('"Yang ini aja deh." "Coba deh." "Udah deh."'),
          " Deh itu tanda kamu lagi mutusin, nyaranin, atau nyerah. Gimana bilangnya?",
        ),
        table([
          ["Korea", "Nuansa"],
          [
            ref("이걸로 할게.", "ki-eulgeyo"),
            '"Yang ini aja deh." Mutusin buat diri sendiri. Sopannya 이걸로 할게요.',
          ],
          [
            ref("한번 먹어 봐.", "ki-a-boda"),
            '"Coba deh dimakan." 한번 di sini pelembut, bukan "satu kali".',
          ],
          [
            ref("됐어, 내가 할게.", "ki-dwaesseo"),
            '"Udah deh, aku aja." Nolak atau nyudahin. Bisa kedengeran dingin.',
          ],
        ]),
        h3("Contoh"),
        ex(
          "아이스 아메리카노로 할게요.",
          "Es americano aja deh.",
          "pesan di kafe",
        ),
        ex("나 먼저 갈게.", "Aku duluan deh."),
        ex(
          "한번 드셔 보세요.",
          "Silakan dicoba deh.",
          "sopan, ke yang lebih tua",
        ),
        ex("그래, 알았어.", "Ya udah deh, oke."),
        callout(
          "warning",
          b("-(으)ㄹ게 cuma buat diri sendiri."),
          ' Artinya "aku ... ya", jadi nggak bisa dipakai buat nanya orang lain. ',
          i('"Mau makan?"'),
          " itu ",
          b("먹을래?"),
          ", bukan 먹을게?",
        ),
      ],
    },
    "ik-kan": {
      description:
        "Kan yang ngingetin (kan udah aku bilang) dan kan yang minta konfirmasi (besok libur kan?).",
      blocks: [
        p(
          i('"Kan udah aku bilang!" "Besok libur kan?"'),
          " Yang pertama ngingetin, yang kedua minta dicek. Bahasa Korea pakai dua akhiran yang beda. Gimana bilangnya?",
        ),
        table([
          ["Korea", "Nuansa"],
          [
            ref("말했잖아.", "ki-janayo"),
            '"Kan udah aku bilang." Ngingetin hal yang dia udah tahu. Nada turun.',
          ],
          [
            ref("오늘 금요일이잖아.", "ki-janayo"),
            '"Kan hari ini Jumat." Alasan yang sama-sama udah tahu.',
          ],
          [
            ref("내일 쉬지?", "ki-jiyo"),
            '"Besok libur kan?" Minta konfirmasi. Nada naik. Sopannya 쉬죠?',
          ],
        ]),
        h3("Contoh"),
        ex("비 오잖아. 우산 가져가.", "Kan lagi hujan. Bawa payung."),
        ex("맛있지?", "Enak kan?"),
        ex("인도네시아 사람이죠?", "Kamu orang Indonesia kan?", "sopan"),
        ex(
          "제가 말씀드렸잖아요.",
          "Kan udah saya sampaikan.",
          "sopan, tapi tetap ngingetin",
        ),
        callout(
          "warning",
          b("-잖아요 ke atasan bisa kedengeran negur."),
          ' Walaupun ada -요, tetap ada rasa "masa Bapak nggak tahu". Buat jelasin alasan ke 사장님, lebih aman pakai ',
          ref("-거든요", "ki-geodeunyo"),
          ": ",
          b("어제 기계가 고장 났거든요."),
          " (",
          i("Soalnya kemarin mesinnya rusak, Pak."),
          ")",
        ),
      ],
    },
    "ik-loh": {
      description:
        "Loh dan tau nggak: buka cerita pakai 있잖아, ngasih info baru pakai -거든.",
      blocks: [
        p(
          i('"Eh tau nggak..." "Ini enak banget loh."'),
          " Loh dipakai buat narik perhatian: buka cerita, atau ngasih info yang dia belum tahu. Gimana bilangnya?",
        ),
        table([
          ["Korea", "Nuansa"],
          [
            ref("있잖아, ...", "ki-itjana"),
            '"Eh tau nggak..." Di awal kalimat, kode "dengerin, aku mau cerita".',
          ],
          [
            ref("이거 진짜 맛있거든요.", "ki-geodeunyo"),
            '"Ini enak banget loh." Info baru, nada turun. Sopan.',
          ],
          [
            ref("나 벌써 왔거든?", "ki-geodeunyo"),
            '"Aku udah dateng loh!" Nada naik, agak nyolot. Cuma ke teman akrab.',
          ],
        ]),
        h3("Contoh"),
        ex(
          "있잖아, 나 어제 지하철에서 연예인 봤어.",
          "Eh tau nggak, kemarin aku lihat artis di subway.",
        ),
        ex("있잖아, 나 토픽 합격했어!", "Eh tau nggak, aku lulus TOPIK!"),
        ex(
          "있잖아요, 저 다음 달에 고향에 가요.",
          "Eh, bulan depan saya pulang kampung loh.",
          "sopan",
        ),
        ex("저 이 일 해 봤거든요.", "Saya udah pernah kerja ini loh."),
        callout(
          "warning",
          b("Nada -거든 itu penting."),
          " Nada turun = ngasih info atau alasan, aman. Nada naik (",
          b("-거든?"),
          ') = ngegas, kayak "tau nggak sih!". Ke atasan selalu pakai ',
          b("-거든요"),
          " dengan nada turun dan lembut.",
        ),
      ],
    },
    "ik-emang": {
      description:
        "Emang buat nanya balik (왜?), setuju (하긴), dan bilang dari sananya (원래).",
      blocks: [
        p(
          i('"Emang kenapa?" "Emang sih." "Dia emang gitu orangnya."'),
          ' Satu kata, tiga maksud: nanya balik, setuju, dan "dari sananya". Gimana bilangnya?',
        ),
        table([
          ["Korea", "Nuansa"],
          [
            ref("왜?", "ki-wae"),
            '"Emang kenapa?" Nanya balik. Sopannya 왜요?, dengan nada lembut.',
          ],
          [
            ref("하긴.", "ki-hagin"),
            '"Emang sih." Kamu setuju setelah mikir lagi.',
          ],
          [
            ref("걔는 원래 그래.", "ki-hagin"),
            '"Dia emang gitu orangnya." 원래 = dari sananya, dari dulu.',
          ],
        ]),
        h3("Contoh"),
        ex("왜? 무슨 일 있어?", "Emang kenapa? Ada apa?"),
        ex("하긴 그렇네.", "Iya juga ya, emang gitu."),
        ex("이 식당은 원래 사람이 많아.", "Restoran ini emang selalu rame."),
        ex(
          "사장님은 원래 말이 없으세요.",
          "Bos emang dari sananya pendiem.",
          "bentuk hormat",
        ),
        callout(
          "warning",
          b("Jangan ketuker 원래 dan 하긴."),
          " 원래 = emang dari sananya (fakta). 하긴 = emang sih (setuju setelah mikir). ",
          i('"Emang sih, dia emang gitu"'),
          " → ",
          b("하긴, 걔는 원래 그래."),
        ),
      ],
    },
  },
  vocabulary: {
    title: "Kosakata: partikel obrolan",
    description:
      "Bentuk Korea yang bawa rasa kok, sih, dong, deh, kan, loh, dan emang.",
    entries: [
      {
        term: "왜",
        meanings: ["kok", "kenapa"],
        example: { ko: "왜 아직 안 와?", id: "Kok belum dateng?" },
      },
      {
        term: "-는데?",
        meanings: ["... sih?", "aku sih ..."],
        example: { ko: "누군데?", id: "Siapa sih?" },
      },
      {
        term: "좀",
        meanings: ["dong", "tolong", "agak"],
        example: { ko: "물 좀 주세요.", id: "Minta air dong." },
      },
      {
        term: "-(으)ㄹ게",
        meanings: ["deh", "aku ... ya"],
        example: { ko: "이걸로 할게요.", id: "Yang ini aja deh." },
      },
      {
        term: "-잖아",
        meanings: ["kan", "kan udah"],
        example: { ko: "말했잖아.", id: "Kan udah aku bilang." },
      },
      {
        term: "있잖아",
        meanings: ["eh tau nggak", "loh"],
        example: {
          ko: "있잖아, 나 토픽 합격했어!",
          id: "Eh tau nggak, aku lulus TOPIK!",
        },
      },
      {
        term: "원래",
        meanings: ["emang", "dari sananya", "aslinya"],
        example: { ko: "걔는 원래 그래.", id: "Dia emang gitu orangnya." },
      },
    ],
  },
  quiz: {
    title: "Kuis: kok, sih, dong, deh, kan, loh, emang",
    description:
      "Dua belas situasi ngobrol. Pilih bentuk Korea yang bawa rasa partikelnya dengan pas.",
    passingScore: 70,
    questions: [
      {
        key: "kok-enak",
        prompt:
          'Temen Koreamu masakin kamu, dan ternyata enak banget. Kamu mau bilang "Kok enak!" Pilih yang paling natural.',
        options: [
          { text: "맛있네!", correct: true },
          { text: "왜 맛있어?" },
          { text: "맛있잖아!" },
          { text: "맛있거든?" },
        ],
        explanation:
          "Kok yang kaget seneng pakai -네. 왜 맛있어? kesannya kamu nuntut alasan kenapa enak, bisa bikin yang masak tersinggung. -잖아 dan -거든? malah kayak ngegas.",
      },
      {
        key: "kok-heran",
        prompt:
          'Udah lewat jam janjian, temenmu belum muncul. Kamu chat: "Kok belum dateng?" Pilih yang pas.',
        options: [
          { text: "왜 아직 안 와?", correct: true },
          { text: "아직 안 오네!" },
          { text: "아직 안 오잖아." },
        ],
        explanation:
          'Kok yang heran plus agak protes = 왜. 안 오네! itu nyadar sendiri tanpa nanya, dan 안 오잖아 artinya "kan dia belum dateng", bukan nanya.',
      },
      {
        key: "sih-penasaran",
        prompt:
          'Temenmu bilang "aku punya kabar". Kamu penasaran: "Apa sih?" Pilih yang bawa rasa sih.',
        options: [
          { text: "뭔데?", correct: true },
          { text: "뭐야." },
          { text: "뭘까요?" },
        ],
        explanation:
          'Kata tanya + -ㄴ데? dengan nada naik = penasaran ala sih. 뭐야 cuma "apa?" biasa, dan 뭘까요? itu mikir sendiri, "apa ya kira-kira?".',
      },
      {
        key: "sih-atasan",
        prompt:
          '반장님 manggil kamu dan bilang ada yang mau diomongin. Kamu mau nanya "Ada apa, Pak?" Pilih yang paling aman.',
        options: [
          { text: "무슨 일이에요?", correct: true },
          { text: "뭔데요?" },
          { text: "왜?" },
        ],
        explanation:
          '뭔데요? walaupun ada -요 masih kerasa "apaan sih?", dan 왜? sendirian jutek. Ke atasan, tanya biasa aja: 무슨 일이에요?',
      },
      {
        key: "dong-tolong",
        prompt:
          'Ke teman sekamar: "Bangunin aku besok dong." Pilih yang paling natural.',
        options: [
          { text: "내일 나 좀 깨워 줘.", correct: true },
          { text: "내일 나 깨워." },
          { text: "내일 나 좀 깨울게." },
          { text: "내일 나 깨우잖아." },
        ],
        explanation:
          'Minta tolong butuh 좀 + -아/어 줘. Tanpa 줘 (깨워) jadi perintah, -(으)ㄹ게 artinya kamu sendiri yang bakal bangunin, dan -잖아 artinya "kan kamu bangunin aku".',
      },
      {
        key: "dong-agak",
        prompt: "좀 비싸요. Di kalimat ini, 좀 artinya apa?",
        options: [
          { text: "Agak", correct: true },
          { text: "Dong" },
          { text: "Banget" },
        ],
        explanation:
          '좀 baru kerasa kayak dong kalau ada di permintaan (좀 도와줘). Di kalimat biasa, 좀 artinya "agak": agak mahal.',
      },
      {
        key: "deh-cuma-aku",
        prompt: 'Kamu mau nanya ke temen: "Mau makan?" Mana yang benar?',
        options: [
          { text: "먹을래?", correct: true },
          { text: "먹을게?" },
          { text: "먹자?" },
        ],
        explanation:
          '-(으)ㄹ게 itu "aku ... deh", cuma buat keputusan kamu sendiri, jadi nggak bisa dipakai nanya orang. Buat nanya mau atau nggak, pakai -(으)ㄹ래?',
      },
      {
        key: "deh-tawaran-atasan",
        prompt:
          '사장님 nawarin nganterin kamu pulang, tapi kamu mau nolak dengan sopan: "Nggak usah deh, Pak." Pilih yang paling aman.',
        options: [
          { text: "괜찮아요, 사장님. 감사합니다.", correct: true },
          { text: "됐어요." },
          { text: "됐어, 내가 갈게." },
        ],
        explanation:
          '됐어(요) bisa kedengeran dingin, kayak "ya udah, bodo amat". Buat nolak tawaran atasan, pakai 괜찮아요 plus makasih.',
      },
      {
        key: "kan-jenis",
        prompt:
          'Kamu mau ngingetin temen yang lupa: "Kan udah aku bilang!" Pilih yang pas.',
        options: [
          { text: "말했잖아!", correct: true },
          { text: "말했지?" },
          { text: "말했거든요." },
        ],
        explanation:
          '-잖아 = "kamu udah tahu ini", nada turun. 말했지? itu nanya konfirmasi ("aku udah bilang, kan?"), bukan ngingetin dengan kesel.',
      },
      {
        key: "kan-konfirmasi",
        prompt:
          'Kamu lumayan yakin besok libur, tapi pengen ngecek ke teman: "Besok libur kan?" Pilih yang pas.',
        options: [
          { text: "내일 쉬지?", correct: true },
          { text: "내일 쉬잖아." },
          { text: "내일 쉴게?" },
        ],
        explanation:
          '-지? dengan nada naik = minta konfirmasi. 쉬잖아 itu pernyataan "kan besok libur", bukan nanya, dan -(으)ㄹ게 nggak bisa dipakai buat nanya.',
      },
      {
        key: "loh-atasan",
        prompt:
          'Ke 사장님, kamu mau bilang dengan sopan: "Saya udah pernah kerja ini loh." Pilih yang paling pas.',
        options: [
          { text: "저 이 일 해 봤거든요.", correct: true },
          { text: "저 이 일 해 봤잖아요." },
          { text: "나 이 일 해 봤거든?" },
        ],
        explanation:
          'Info baru yang dia belum tahu = -거든요 dengan nada turun. -잖아요 kesannya "masa Bapak nggak tahu", dan 나 ... -거든? itu 반말 yang ngegas.',
      },
      {
        key: "emang-dari-sananya",
        prompt:
          'Temen Koreamu heran kenapa 반장님 diem terus. Kamu jelasin: "Dia emang gitu orangnya." Pilih yang pas.',
        options: [
          { text: "원래 그래.", correct: true },
          { text: "하긴 그래." },
          { text: "왜 그래?" },
        ],
        explanation:
          'Emang yang artinya "dari sananya" = 원래. 하긴 itu emang sih, setuju setelah mikir, dan 왜 그래? malah nanya "kenapa sih dia?".',
      },
    ],
  },
});
