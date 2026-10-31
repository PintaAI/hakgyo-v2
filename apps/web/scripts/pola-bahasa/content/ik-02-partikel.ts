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
  key: "ik-02-partikel",
  materials: {
    "ik-kok": {
      description:
        "Kok yang heran, kok yang kaget seneng, dan kok yang nyangkal halus.",
      blocks: [
        grammar({
          theme: "blue",
          number: "01",
          title: "kok → 왜, -네, 아니야~",
          descriptionKo:
            "이상하거나 놀랄 때, 또는 부드럽게 아니라고 할 때 써요.",
          descriptionTranslation:
            "Kok punya tiga maksud, dan Korea pakai bentuk yang beda buat masing-masing. Kok yang heran atau protes pakai 왜. Kok yang kaget seneng pakai -네, dan kok yang nyangkal halus pakai 아니야~.",
          rules: [
            r("Heran, protes", "왜", "왜 아직 안 와?"),
            r("Kaget seneng", "-네(요)", "맛있네!"),
            r("Muji orang", "-(으)시네요", "한국어 잘하시네요!"),
            r("Nyangkal halus", "아니야~ / 아니에요", "아니야~ 괜찮아."),
          ],
          examples: [
            e("", "왜", " 이렇게 비싸요?"),
            e("와, 벌써 다 ", "했네", "?"),
            e("", "아니야~", " 화 안 났어."),
          ],
        }),
        p(
          i('"Kok belum dateng?" "Kok enak!" "Nggak kok."'),
          " Tiga kok, tiga maksud: heran, kaget seneng, dan nyangkal halus. Gimana bilangnya?",
        ),
        p(
          "Kok yang heran pakai ",
          ref("왜", "ki-wae"),
          ": ",
          b("왜 아직 안 와?"),
          " Kok yang kaget seneng pakai ",
          ref("-네", "ki-neyo"),
          ": ",
          b("맛있네!"),
          " Kok yang nyangkal pakai ",
          ref("아니야~", "ki-banmal-pengecualian"),
          ", sopannya 아니에요.",
        ),
        h3("Contoh"),
        ex("왜 아직 안 와?", "Kok belum dateng?", "반말"),
        ex("한국어 잘하시네요!", "Kok jago bahasa Korea!", "buat muji"),
        ex("생각보다 쉽네요.", "Kok gampang ya, nggak nyangka."),
        ex("아니에요, 저 안 피곤해요.", "Nggak kok, aku nggak capek.", "sopan"),
        callout(
          "warning",
          b('Jangan bilang "kok enak" pakai 왜.'),
          " 왜 맛있어? kedengeran kayak kamu nuntut alasan, seolah makanan enak itu aneh. Yang masak bisa tersinggung. Buat kok yang kaget seneng, pakai ",
          b("-네"),
          ".",
        ),
        callout(
          "tip",
          '"Emang kenapa?" juga pakai 왜, cek ',
          ref("emang", "ik-emang"),
          ". Kaget karena baru tahu sesuatu? Cek ",
          ref("ternyata", "ik-ternyata"),
          ".",
        ),
      ],
    },
    "ik-sih": {
      description:
        "Sih yang penasaran (siapa sih?) dan sih yang ngelembutin pendapat (aku sih nggak masalah).",
      blocks: [
        grammar({
          theme: "blue",
          number: "02",
          title: "sih → -는데?, 나는 -는데",
          descriptionKo: "궁금해서 묻거나, 내 생각을 부드럽게 말할 때 써요.",
          descriptionTranslation:
            'Sih bikin pertanyaan kerasa penasaran, dan bikin pendapat kerasa "ini menurut aku aja ya". Buat nanya, pakai kata tanya + -ㄴ데? dengan nada naik. Buat pendapat, pakai 나는 + -는데 yang digantung.',
          rules: [
            r("Penasaran (apa)", "뭔데?", "그게 뭔데?"),
            r(
              "Penasaran (siapa, di mana)",
              "누군데? / 어딘데?",
              "거기 어딘데?",
            ),
            r("Pendapat sendiri", "나는 -는데", "나는 괜찮은데."),
            r("Pendapat, sopan", "저는 -는데요", "저는 괜찮은데요."),
          ],
          examples: [
            e("그 사람 ", "누군데", "?"),
            e("", "나는 좋은데", "?"),
            e("저는 지하철이 더 ", "편한데요", "."),
          ],
        }),
        p(
          i('"Siapa sih?" "Aku sih nggak masalah."'),
          ' Sih bikin pertanyaan kerasa penasaran, dan bikin pendapat kerasa "ini menurut aku aja ya". Gimana bilangnya?',
        ),
        p(
          "Dua-duanya pakai ",
          ref("-는데", "ki-neunde"),
          ". Buat nanya: ",
          b("누군데?"),
          " dengan nada naik. Buat pendapat: ",
          b("나는 괜찮은데."),
          " yang digantung, artinya menurut aku, nggak tahu yang lain.",
        ),
        h3("Contoh"),
        ex("그게 뭔데?", "Itu apa sih?"),
        ex("어딘데?", "Di mana sih?"),
        ex(
          "나는 지하철 타는 게 나은데.",
          "Kalau aku sih mendingan naik subway.",
        ),
        ex(
          "저는 매운 거 괜찮은데요.",
          "Kalau saya sih nggak masalah sama yang pedes.",
          "sopan",
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
        callout(
          "tip",
          "Herannya pakai nada protes? Cek ",
          ref("kok", "ik-kok"),
          ". Mau ngasih saran, bukan cuma pendapat? Cek ",
          ref("mendingan", "ik-mendingan"),
          ".",
        ),
      ],
    },
    "ik-dong": {
      description:
        "Dong buat minta tolong (bantuin dong) dan buat jawaban yang jelas (ya iya dong).",
      blocks: [
        grammar({
          theme: "blue",
          number: "03",
          title: "dong → 좀, 당연하지",
          descriptionKo: "부탁을 부드럽게 하거나, 당연하다고 대답할 때 써요.",
          descriptionTranslation:
            'Dong yang minta tolong pakai 좀 + -아/어 줘. 좀 itu pelembutnya, persis kayak dong. Dong yang artinya "jelas lah" pakai 당연하지.',
          rules: [
            r("Minta tolong, ke teman", "좀 -아/어 줘", "좀 도와줘."),
            r("Minta tolong, sopan", "좀 -아/어 주세요", "좀 도와주세요."),
            r("Lebih lembut, nawar", "좀 -아/어 줄래?", "좀 도와줄래?"),
            r("Ya iya dong", "당연하지 / 당연하죠", "당연하지!"),
          ],
          examples: [
            e("물 ", "좀 주세요", "."),
            e("내일 나 ", "좀 깨워 줘", "."),
            e("", "당연하지", "! 나도 갈게."),
          ],
          tipKo: "좀은 부탁할 때 말을 부드럽게 만들어요.",
          tipTranslation:
            '좀 aslinya "sedikit". Di permintaan, rasanya jadi kayak dong: lebih halus, nggak kayak nyuruh.',
        }),
        p(
          i('"Bantuin dong." "Ya iya dong!"'),
          ' Dong yang pertama ngelembutin permintaan, yang kedua bilang "jelas lah". Gimana bilangnya?',
        ),
        p(
          "Minta tolong ke teman pakai ",
          ref("좀", "ki-jom"),
          ": ",
          b("좀 도와줘."),
          " Ke siapa aja, sopannya ",
          ref("-아/어 주세요", "ki-a-juseyo"),
          ". Mau lebih lembut, kayak nawar: ",
          ref("-(으)ㄹ래?", "ki-eullaeyo"),
          ". Buat ",
          i("ya iya dong"),
          ", pakai ",
          ref("당연하지", "ki-dangyeonhaji"),
          ".",
        ),
        h3("Contoh"),
        ex("사진 좀 찍어 주세요.", "Fotoin dong."),
        ex("빨리 좀 와!", "Cepetan dong!", "nggak sabar, ke teman"),
        ex("이것 좀 가르쳐 줄래?", "Ajarin ini dong, mau nggak?"),
        ex("당연하죠! 같이 가요.", "Ya iya dong! Ayo bareng.", "sopan"),
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
        callout(
          "tip",
          "Nyaranin orang buat nyoba sesuatu? Cek ",
          ref("deh", "ik-deh"),
          ". Nolak tawaran dengan halus? Cek ",
          ref("nggak usah", "ik-nggak-usah"),
          ".",
        ),
      ],
    },
    "ik-deh": {
      description:
        "Deh buat mutusin (yang ini aja deh), nyaranin (coba deh), dan nyerah (udah deh).",
      blocks: [
        grammar({
          theme: "blue",
          number: "04",
          title: "deh → -(으)ㄹ게, 한번 -아 봐, 됐어",
          descriptionKo: "결정하거나, 권하거나, 그만하자고 할 때 써요.",
          descriptionTranslation:
            "Deh itu tanda kamu lagi mutusin, nyaranin, atau nyerah. Mutusin buat diri sendiri pakai -(으)ㄹ게. Nyaranin pakai 한번 -아/어 봐, dan nyerah atau nolak pakai 됐어.",
          rules: [
            r("Mutusin sendiri", "-(으)ㄹ게(요)", "이걸로 할게요."),
            r("Nyaranin, ke teman", "한번 -아/어 봐", "한번 먹어 봐."),
            r("Nyaranin, sopan", "한번 -아/어 보세요", "한번 드셔 보세요."),
            r("Nyerah, nolak", "됐어", "됐어, 내가 할게."),
          ],
          examples: [
            e("아이스 아메리카노로 ", "할게요", "."),
            e("이거 진짜 맛있어. ", "한번 먹어 봐", "."),
            e("", "됐어", ", 내가 할게."),
          ],
          tipKo: "여기서 한번은 '한 번'이 아니라 부드럽게 권하는 말이에요.",
          tipTranslation:
            '한번 di sini bukan "satu kali", tapi pelembut kayak coba deh.',
        }),
        p(
          i('"Yang ini aja deh." "Coba deh." "Udah deh."'),
          " Deh itu tanda kamu lagi mutusin, nyaranin, atau nyerah. Gimana bilangnya?",
        ),
        p(
          "Mutusin buat diri sendiri pakai ",
          ref("-(으)ㄹ게", "ki-eulgeyo"),
          ": ",
          b("이걸로 할게."),
          " Nyaranin pakai ",
          ref("-아/어 보다", "ki-a-boda"),
          ": ",
          b("한번 먹어 봐."),
          " Nyerah atau nolak pakai ",
          ref("됐어", "ki-dwaesseo"),
          ", tapi hati-hati, bisa kedengeran dingin.",
        ),
        h3("Contoh"),
        ex("나 먼저 갈게.", "Aku duluan deh."),
        ex("이 노래 한번 들어 봐.", "Coba deh dengerin lagu ini."),
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
        callout(
          "tip",
          "Minta tolong, bukan mutusin? Cek ",
          ref("dong", "ik-dong"),
          '. Mau bilang "terserah deh"? Cek ',
          ref("terserah", "ik-terserah"),
          ".",
        ),
      ],
    },
    "ik-kan": {
      description:
        "Kan yang ngingetin (kan udah aku bilang) dan kan yang minta konfirmasi (besok libur kan?).",
      blocks: [
        grammar({
          theme: "blue",
          number: "05",
          title: "kan → -잖아, -지?",
          descriptionKo: "상대도 아는 걸 말하거나, 맞는지 확인할 때 써요.",
          descriptionTranslation:
            "Kan punya dua tugas, dan bahasa Korea pakai dua akhiran yang beda. Ngingetin hal yang dia udah tahu pakai -잖아 dengan nada turun. Minta konfirmasi pakai -지? dengan nada naik.",
          rules: [
            r("Ngingetin, nada turun", "-잖아(요)", "말했잖아."),
            r("Alasan yang sama-sama tahu", "-잖아", "주말이잖아."),
            r("Minta konfirmasi, nada naik", "-지?", "내일 쉬지?"),
            r("Konfirmasi, sopan", "-죠?", "인도네시아 사람이죠?"),
          ],
          examples: [
            e("비 ", "오잖아", ". 우산 가져가."),
            e("", "맛있지", "?"),
            e("내일 ", "쉬죠", "?"),
          ],
        }),
        p(
          i('"Kan udah aku bilang!" "Besok libur kan?"'),
          " Yang pertama ngingetin, yang kedua minta dicek. Gimana bilangnya?",
        ),
        p(
          "Kan yang ngingetin pakai ",
          ref("-잖아", "ki-janayo"),
          ": ",
          b("말했잖아."),
          " Kan yang minta konfirmasi pakai ",
          ref("-지? / -죠?", "ki-jiyo"),
          ": ",
          b("내일 쉬지?"),
          " Bedanya ada di nada: -잖아 turun, -지? naik.",
        ),
        h3("Contoh"),
        ex("말했잖아!", "Kan udah aku bilang!"),
        ex(
          "내일 주말이잖아. 늦게 자도 돼.",
          "Kan besok weekend. Boleh tidur malem.",
        ),
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
        callout(
          "tip",
          "Ngasih info yang dia belum tahu? Cek ",
          ref("loh", "ik-loh"),
          ". Ngingetin sambil protes? Cek ",
          ref("padahal (nyalahin)", "ik-padahal-protes"),
          ".",
        ),
      ],
    },
    "ik-loh": {
      description:
        "Loh dan tau nggak: buka cerita pakai 있잖아, ngasih info baru pakai -거든.",
      blocks: [
        grammar({
          theme: "blue",
          number: "06",
          title: "loh / tau nggak → 있잖아, -거든",
          descriptionKo:
            "이야기를 시작하거나, 상대가 모르는 걸 알려 줄 때 써요.",
          descriptionTranslation:
            "Loh dipakai buat narik perhatian. Buat buka cerita, mulai pakai 있잖아 (eh tau nggak). Buat ngasih info yang dia belum tahu, tutup pakai -거든 dengan nada turun.",
          rules: [
            r("Buka cerita, ke teman", "있잖아", "있잖아, 나 합격했어!"),
            r("Buka cerita, sopan", "있잖아요", "있잖아요, 저 내일 쉬어요."),
            r("Info baru, sopan", "-거든요", "이거 진짜 맛있거든요."),
            r(
              "Ngegas, ke teman akrab",
              "-거든? (nada naik)",
              "나 벌써 왔거든?",
            ),
          ],
          examples: [
            e("", "있잖아", ", 나 토픽 합격했어!"),
            e("저 이 일 해 ", "봤거든요", "."),
            e("이 집 떡볶이 진짜 ", "맛있거든요", "."),
          ],
        }),
        p(
          i('"Eh tau nggak..." "Ini enak banget loh."'),
          " Loh dipakai buat narik perhatian: buka cerita, atau ngasih info yang dia belum tahu. Gimana bilangnya?",
        ),
        p(
          "Buat buka cerita, mulai pakai ",
          ref("있잖아", "ki-itjana"),
          ". Buat info baru, tutup pakai ",
          ref("-거든", "ki-geodeunyo"),
          ": ",
          b("이거 진짜 맛있거든요."),
          " Ke orang yang lebih tua, selalu tambahin -요.",
        ),
        h3("Contoh"),
        ex(
          "있잖아, 나 어제 지하철에서 연예인 봤어.",
          "Eh tau nggak, kemarin aku lihat artis di subway.",
        ),
        ex(
          "있잖아요, 저 다음 달에 고향에 가요.",
          "Eh, bulan depan saya pulang kampung loh.",
          "sopan",
        ),
        ex(
          "이거 진짜 맛있거든요. 한번 드셔 보세요.",
          "Ini enak banget loh. Silakan dicoba.",
        ),
        ex("나 벌써 왔거든?", "Aku udah dateng loh!", "ngegas, ke teman akrab"),
        callout(
          "warning",
          b("Nada -거든 itu penting."),
          " Nada turun = ngasih info atau alasan, aman. Nada naik (",
          b("-거든?"),
          ') = ngegas, kayak "tau nggak sih!". Ke atasan selalu pakai ',
          b("-거든요"),
          " dengan nada turun dan lembut.",
        ),
        callout(
          "tip",
          "-거든 juga dipakai buat kasih alasan, cek ",
          ref("soalnya", "ik-soalnya"),
          ". Kalau dia udah tahu infonya, pakai ",
          ref("kan", "ik-kan"),
          ".",
        ),
      ],
    },
    "ik-emang": {
      description:
        "Emang buat nanya balik (왜?), setuju (하긴), dan bilang dari sananya (원래).",
      blocks: [
        grammar({
          theme: "blue",
          number: "07",
          title: "emang → 왜?, 하긴, 원래",
          descriptionKo: "되묻거나, 동의하거나, 원래 그렇다고 할 때 써요.",
          descriptionTranslation:
            "Emang punya tiga maksud. Nanya balik (emang kenapa?) pakai 왜?. Setuju setelah mikir (emang sih) pakai 하긴, dan dari sananya (dia emang gitu) pakai 원래.",
          rules: [
            r("Nanya balik", "왜? / 왜요?", "왜? 무슨 일 있어?"),
            r("Setuju setelah mikir", "하긴", "하긴 그렇네."),
            r("Dari sananya", "원래", "걔는 원래 그래."),
            r("Dari sananya, hormat", "원래 -(으)세요", "원래 말이 없으세요."),
          ],
          examples: [
            e("", "왜", "? 무슨 일 있어?"),
            e("", "하긴", " 그렇네."),
            e("이 식당은 ", "원래", " 사람이 많아."),
          ],
        }),
        p(
          i('"Emang kenapa?" "Emang sih." "Dia emang gitu orangnya."'),
          ' Satu kata, tiga maksud: nanya balik, setuju, dan "dari sananya". Gimana bilangnya?',
        ),
        p(
          "Nanya balik pakai ",
          ref("왜?", "ki-wae"),
          ", sopannya 왜요? dengan nada lembut. Setuju pakai ",
          ref("하긴", "ki-hagin"),
          ", dan dari sananya pakai ",
          ref("원래", "ki-hagin"),
          ".",
        ),
        h3("Contoh"),
        ex("왜요? 무슨 일 있어요?", "Emang kenapa? Ada apa?", "sopan"),
        ex("하긴, 주말이니까 사람 많겠다.", "Emang sih, weekend pasti rame."),
        ex(
          "한국 겨울은 원래 이렇게 추워요?",
          "Emang musim dingin Korea sedingin ini?",
        ),
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
        callout(
          "tip",
          "왜 juga dipakai buat kok yang heran, cek ",
          ref("kok", "ik-kok"),
          ". Ngingetin hal yang dia udah tahu? Cek ",
          ref("kan", "ik-kan"),
          ".",
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
