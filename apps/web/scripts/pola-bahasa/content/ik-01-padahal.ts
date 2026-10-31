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
  key: "ik-01-padahal",
  materials: {
    "ik-padahal-hasil": {
      description:
        "Padahal buat hasil yang nggak sesuai harapan: udah makan, kok masih laper.",
      blocks: [
        grammar({
          theme: "blue",
          number: "01",
          title: "padahal → -는데, -는데도",
          descriptionKo: "기대와 다른 결과를 말할 때 써요.",
          descriptionTranslation:
            "Bagian yang ada setelah kata padahal ditempelin -는데, terus pindah ke depan kalimat. Hasil yang nggak sesuai harapan ditaruh di belakang. Mau lebih tegas (udah ... pun, tetep aja), pakai -는데도.",
          rules: [
            r("Ngobrol sehari-hari", "-는데", "밥 먹었는데 배고파."),
            r("Lebih tegas, heran", "-는데도", "약 먹었는데도 아파."),
            r("Kata sifat sekarang", "-(으)ㄴ데", "비싼데 맛없어."),
            r("Tulisan, netral", "-지만", "먹었지만 배고파요."),
          ],
          examples: [
            e("열심히 ", "공부했는데", " 시험에 떨어졌어요."),
            e("약을 ", "먹었는데도", " 열이 안 내려요."),
            e("이 옷 ", "비싼데", " 금방 찢어졌어."),
          ],
          tipKo: "형용사는 -는데가 아니라 -(으)ㄴ데를 써요.",
          tipTranslation:
            "Kata sifat pakai -(으)ㄴ데: 비싼데, 바쁜데, 좋은데. Jangan bilang 비싸는데.",
        }),
        p(
          i('"Aku masih laper, padahal udah makan."'),
          " Kamu udah ngelakuin sesuatu, tapi hasilnya nggak sesuai harapan. Gimana bilangnya?",
        ),
        p(
          "Pilihan pertamamu ",
          ref("-는데", "ki-neunde"),
          ": ",
          b("밥 먹었는데 아직 배고파."),
          " Kalau mau nekanin rasa heran atau kesel, pakai ",
          ref("-는데도", "ki-neundedo"),
          ". ",
          ref("-지만", "ki-jiman"),
          " juga bisa, tapi rasanya kaku dan lebih sering dipakai di tulisan.",
        ),
        h3("Contoh"),
        ex(
          "일찍 나왔는데 또 지각했어요.",
          "Padahal udah berangkat pagi, aku telat lagi.",
        ),
        ex(
          "야근까지 했는데 월급이 똑같아요.",
          "Gajinya sama aja, padahal udah lembur segala.",
        ),
        ex(
          "매일 연습했는데도 발음이 어려워요.",
          "Padahal udah latihan tiap hari, pelafalannya tetep susah.",
        ),
        ex("밥 먹었는데 또 배고파.", "Padahal udah makan, laper lagi.", "반말"),
        callout(
          "warning",
          b("Urutannya kebalik."),
          " Di bahasa Indonesia, padahal ada di belakang: ",
          i('"Aku laper, padahal udah makan."'),
          " Di bahasa Korea, bagian setelah padahal (udah makan) pindah ke ",
          b("depan"),
          " dan ditempelin -는데: ",
          b("밥 먹었는데 배고파."),
          ' Kalau kamu bilang 배고픈데 밥 먹었어, artinya malah "aku laper, terus aku udah makan".',
        ),
        callout(
          "tip",
          "Padahal yang nadanya nyalahin ada di ",
          ref("padahal (nyalahin)", "ik-padahal-protes"),
          ". Hasilnya malah kebalik dari harapan? Cek ",
          ref("malah", "ik-malah"),
          ".",
        ),
      ],
    },
    "ik-padahal-protes": {
      description:
        "Padahal yang nadanya nyalahin: udah janji, kok nggak dateng?",
      blocks: [
        grammar({
          theme: "blue",
          number: "02",
          title: "padahal (nyalahin) → -(으)면서, -잖아",
          descriptionKo: "상대의 말과 행동이 다를 때 따지는 말이에요.",
          descriptionTranslation:
            "Padahal yang ini bukan cuma heran, tapi protes. Tempel -(으)면서 ke hal yang udah dia lakuin atau omongin, terus sambung pakai 왜. -잖아 lebih pendek: kamu ngingetin hal yang dia udah tahu.",
          rules: [
            r("Nyalahin, ke teman akrab", "-(으)면서", "알면서 왜 물어봐?"),
            r("Udah kejadian", "-았/었으면서", "약속했으면서 왜 안 와?"),
            r("Ngingetin, kesel", "-잖아", "약속했잖아!"),
            r("Lebih lembut", "-는데", "약속했는데 왜 안 왔어?"),
            r("Ke atasan", "-(으)셨는데요...", "그렇게 말씀하셨는데요..."),
          ],
          examples: [
            e("", "알면서", " 왜 물어봐?"),
            e("돈 없다고 ", "했으면서", " 새 폰 샀어?"),
            e("어제 왜 안 왔어? 온다고 ", "했잖아", "."),
          ],
          tipKo: "-(으)면서와 왜는 친한 친구한테만 써요.",
          tipTranslation:
            "-(으)면서 + 왜 kedengeran tajam. Pakai cuma ke teman akrab, jangan ke orang yang lebih tua.",
        }),
        p(
          i('"Padahal kamu udah janji, kok nggak dateng?"'),
          " Kamu nggak cuma heran, kamu juga protes. Gimana bilangnya?",
        ),
        p(
          "Yang paling jelas nyalahin itu ",
          ref("-(으)면서", "ki-myeonseo-padahal"),
          ": ",
          b("약속했으면서 왜 안 왔어?"),
          " Mau pendek dan kesel, pakai ",
          ref("-잖아", "ki-janayo"),
          ": ",
          b("약속했잖아!"),
          " Mau lebih lembut, balik ke ",
          ref("-는데", "ki-neunde"),
          ".",
        ),
        h3("Contoh"),
        ex("약속했으면서 왜 안 왔어?", "Padahal udah janji, kok nggak dateng?"),
        ex(
          "자기는 늦게 오면서 나한테만 뭐라고 해.",
          "Padahal dia sendiri telat, kok cuma aku yang diomelin.",
        ),
        ex("괜찮다고 했으면서 왜 화내?", "Katanya nggak apa-apa, kok marah?"),
        ex(
          "어제 왜 안 왔어? 온다고 했잖아.",
          "Kemarin kok nggak dateng? Kan katanya mau dateng.",
        ),
        callout(
          "warning",
          b("Jangan dipakai ke atasan."),
          " -(으)면서 dan 왜 kedengeran nyolot. Ke 사장님 atau 반장님, cukup sebut faktanya pakai bentuk hormat, terus kalimatnya digantung: ",
          b("사장님, 토요일은 쉬어도 된다고 하셨는데요..."),
          " Beliau udah ngerti maksudmu tanpa kamu nyalahin.",
        ),
        callout(
          "tip",
          "Cuma mau ngingetin tanpa protes? Cek ",
          ref("kan", "ik-kan"),
          ". Kesel karena usahamu sia-sia? Cek ",
          ref("padahal udah ... (kesel)", "ik-padahal-kesal"),
          ".",
        ),
      ],
    },
    "ik-padahal-rencana": {
      description:
        "Padahal tadinya mau, tapi rencananya batal: -(으)려고 했는데 dan teman-temannya.",
      blocks: [
        grammar({
          theme: "blue",
          number: "03",
          title: "padahal tadinya mau → -(으)려고 했는데",
          descriptionKo: "하려고 했던 계획이 안 됐을 때 써요.",
          descriptionTranslation:
            "Buat rencana yang akhirnya batal, tempel -(으)려고 했는데 ke kata kerjanya. Habis itu sebut alasannya, atau biarin kalimatnya ngegantung. 했-nya wajib lampau, soalnya rencananya udah lewat.",
          rules: [
            r("Tadinya niat", "-(으)려고 했는데", "가려고 했는데..."),
            r("Udah janjian", "-기로 했는데", "만나기로 했는데..."),
            r("Pengen banget", "-고 싶었는데", "가고 싶었는데..."),
            r(
              "Dari awal udah niat",
              "원래 -(으)려고 했는데",
              "원래 쉬려고 했는데...",
            ),
          ],
          examples: [
            e("", "전화하려고 했는데", " 깜빡했어요."),
            e("오늘 같이 밥 ", "먹기로 했는데", "..."),
            e("고향에 ", "가고 싶었는데", " 표가 너무 비쌌어요."),
          ],
          tipKo: "뒤를 말하지 않고 끝내도 자연스러워요.",
          tipTranslation:
            "Kalimatnya nggak harus selesai. 가려고 했는데... dengan nada turun udah kerasa sayangnya.",
        }),
        p(
          i('"Padahal tadinya aku mau dateng..."'),
          " Rencananya udah ada, tapi akhirnya batal. Gimana bilangnya?",
        ),
        p(
          "Yang paling sering: ",
          ref("-(으)려고 했는데", "ki-ryeogo-haenneunde"),
          ". Kalau rencananya udah disepakati sama orang lain, pakai ",
          ref("-기로 했는데", "ki-giro-hada"),
          ". Kalau lebih ke perasaan pengen, pakai ",
          ref("-고 싶었는데", "ki-go-sipda"),
          ". Tambahin ",
          ref("원래", "ki-hagin"),
          " (aslinya) biar kedengeran ngeluh.",
        ),
        h3("Contoh"),
        ex(
          "가려고 했는데 갑자기 야근이 생겼어.",
          "Padahal tadinya mau dateng, eh tiba-tiba ada lembur.",
          "반말",
        ),
        ex(
          "주말에 쉬려고 했는데 특근이 생겼어요.",
          "Tadinya weekend mau istirahat, eh ada kerja tambahan.",
        ),
        ex(
          "친구랑 영화 보기로 했는데 친구가 아파서 취소됐어요.",
          "Padahal udah janjian nonton sama temen, tapi dia sakit jadi batal.",
        ),
        ex(
          "원래 오늘 운동하려고 했는데 비가 와서 못 했어요.",
          "Aslinya hari ini mau olahraga, tapi hujan jadi nggak jadi.",
        ),
        callout(
          "warning",
          b("했-nya wajib lampau."),
          " Rencananya udah lewat, jadi bilangnya ",
          b("가려고 했는데"),
          ". Kalau ",
          b("가려고 하는데"),
          ', artinya malah "aku lagi mau pergi nih", rencananya masih jalan.',
        ),
        callout(
          "tip",
          "Rencananya batal total? Cek ",
          ref("nggak jadi", "ik-nggak-jadi"),
          ". Nyesel karena nggak ngelakuin sesuatu? Cek ",
          ref("harusnya", "ik-harusnya"),
          ".",
        ),
      ],
    },
    "ik-padahal-kesal": {
      description:
        "Padahal buat nambahin info yang bikin makin kesel: padahal udah nunggu dua jam.",
      blocks: [
        grammar({
          theme: "blue",
          number: "04",
          title: "padahal udah ... → -이나 ...-는데",
          descriptionKo: "많이 애썼는데 서운한 마음을 말할 때 써요.",
          descriptionTranslation:
            "Padahal di sini nambahin usaha yang bikin kamu makin kesel. Tempel 이나 ke angkanya (sampai segitu), terus tutup pakai -는데 yang digantung. Hasilnya kerasa kecewa tanpa harus marah-marah.",
          rules: [
            r("Angka, akhiran konsonan", "-이나", "두 시간이나"),
            r("Angka, akhiran vokal", "-나", "다섯 개나"),
            r("Kecewa, digantung", "...-는데", "세 번이나 말했는데."),
            r("Lebih emosional", "얼마나 -는데!", "얼마나 기다렸는데!"),
            r("Nyalahin langsung", "-잖아", "두 시간이나 기다렸잖아!"),
            r("Udah capek-capek", "힘들게 -는데", "힘들게 만들었는데..."),
          ],
          examples: [
            e("두 ", "시간이나", " 기다렸는데."),
            e("메시지를 다섯 ", "번이나", " 보냈는데 답장이 없어."),
            e("", "얼마나", " 열심히 준비했는데!"),
          ],
        }),
        p(
          i('"Dia nggak dateng. Padahal aku udah nunggu dua jam."'),
          " Di sini padahal nambahin usaha yang udah kamu keluarin, biasanya pakai angka. Gimana bilangnya?",
        ),
        p(
          "Tempel 이나 ke angkanya, terus tutup pakai ",
          ref("-는데", "ki-neunde"),
          " yang digantung: ",
          b("두 시간이나 기다렸는데."),
          " Mau langsung nyalahin orangnya, ganti akhirannya jadi ",
          ref("-잖아", "ki-janayo"),
          ": ",
          b("두 시간이나 기다렸잖아!"),
        ),
        h3("Contoh"),
        ex("세 번이나 말했는데.", "Padahal udah aku bilangin tiga kali."),
        ex(
          "한 시간이나 걸려서 왔는데 문을 닫았어요.",
          "Padahal udah jauh-jauh sejam ke sini, tokonya tutup.",
        ),
        ex(
          "엄마가 힘들게 만들었는데 하나도 안 먹었어?",
          "Padahal Mama udah capek-capek masak, kamu nggak makan sama sekali?",
        ),
        ex(
          "30분이나 줄 섰는데 다 팔렸대요.",
          "Padahal udah antre setengah jam, katanya udah habis.",
        ),
        callout(
          "warning",
          b('이나 juga artinya "atau".'),
          " ",
          b("커피나 차"),
          " = kopi atau teh. Tapi kalau nempel di angka, ",
          b("세 번이나"),
          " = sampai tiga kali. Akhiran konsonan pakai 이나 (",
          b("두 시간이나"),
          "), akhiran vokal pakai 나 (",
          b("다섯 개나"),
          ").",
        ),
        callout(
          "tip",
          "Mau nambahin info yang paling ekstrem? Cek ",
          ref("bahkan", "ik-bahkan"),
          ". Hasilnya cuma nggak sesuai harapan, tanpa kesel? Balik ke ",
          ref("padahal (hasil nggak sesuai)", "ik-padahal-hasil"),
          ".",
        ),
      ],
    },
  },
  vocabulary: {
    title: "Kosakata: padahal",
    description:
      "Empat cara bilang padahal dalam bahasa Korea, masing-masing dengan satu contoh.",
    entries: [
      {
        term: "-는데",
        meanings: ["padahal", "udah ..., tapi"],
        example: {
          ko: "밥 먹었는데 아직 배고파요.",
          id: "Aku masih laper, padahal udah makan.",
        },
      },
      {
        term: "-(으)면서",
        meanings: ["padahal (nyalahin)", "katanya ..., kok"],
        example: { ko: "알면서 왜 물어봐?", id: "Udah tahu kok nanya?" },
      },
      {
        term: "-(으)려고 했는데",
        meanings: ["padahal tadinya mau", "niatnya ..., tapi"],
        example: {
          ko: "전화하려고 했는데 깜빡했어요.",
          id: "Tadinya mau nelpon, tapi kelupaan.",
        },
      },
      {
        term: "-이나 ...-는데",
        meanings: ["padahal udah (sampai segitu)"],
        example: {
          ko: "두 시간이나 기다렸는데.",
          id: "Padahal aku udah nunggu dua jam.",
        },
      },
    ],
  },
  quiz: {
    title: "Kuis: padahal",
    description:
      "Sepuluh situasi ngobrol. Pilih cara bilang padahal yang paling natural dalam bahasa Korea.",
    passingScore: 70,
    questions: [
      {
        key: "hasil-laper",
        prompt:
          'Kamu mau bilang ke bestie: "Aku masih laper, padahal udah makan." Pilih yang paling natural.',
        options: [
          { text: "밥 먹었는데 아직 배고파.", correct: true },
          { text: "배고픈데 밥 먹었어." },
          { text: "밥을 먹었음에도 불구하고 아직 배가 고프다." },
          { text: "밥 먹어서 아직 배고파." },
        ],
        explanation:
          'Bagian setelah padahal (udah makan) ditempelin -는데 dan ditaruh di depan. 배고픈데 밥 먹었어 urutannya kebalik. -음에도 불구하고 itu bahasa berita, dan -어서 malah bikin artinya "gara-gara makan jadi laper".',
      },
      {
        key: "hasil-kopi",
        prompt:
          '"Kopinya mahal, padahal nggak enak." Bagian mana yang ditempelin -는데?',
        options: [
          { text: "맛없는데 비싸.", correct: true },
          { text: "비싼데 맛없어." },
          { text: "비싸서 맛없어." },
        ],
        explanation:
          'Yang bikin heran: nggak enak, tapi kok mahal. Bagian setelah kata padahal (nggak enak) yang ditempelin -는데. 비싼데 맛없어 artinya "mahal, tapi nggak enak", fokusnya beda.',
      },
      {
        key: "hasil-sifat",
        prompt:
          'Mau bilang "Bajunya cepet sobek, padahal mahal." Bentuk yang benar buat kata sifat 비싸다?',
        options: [
          { text: "이 옷 비싼데 금방 찢어졌어.", correct: true },
          { text: "이 옷 비싸는데 금방 찢어졌어." },
          { text: "이 옷 비싸었는데 금방 찢어졌어." },
        ],
        explanation:
          "Kata sifat sekarang pakai -(으)ㄴ데: 비싼데, 바쁜데, 싼데. 비싸는데 itu kesalahan klasik, dan 비싸었는데 nggak ada (lampaunya 비쌌는데).",
      },
      {
        key: "hasil-tegas",
        prompt:
          '"Udah minum obat pun, demamnya tetep nggak turun." Mana yang paling kerasa "tetep aja"?',
        options: [
          { text: "약을 먹었는데도 열이 안 내려요.", correct: true },
          { text: "약을 먹어서 열이 안 내려요." },
          { text: "약을 먹으려고 했는데 열이 안 내려요." },
        ],
        explanation:
          "-는데도 = udah ... pun, tetep aja. -어서 malah bikin obatnya jadi penyebab, dan -려고 했는데 artinya kamu belum jadi minum obat.",
      },
      {
        key: "protes-bestie",
        prompt:
          'Temenmu bilang mau dateng, tapi nggak muncul. Kamu kesel: "Kemarin kok nggak dateng? Padahal katanya mau dateng." Pilih yang paling pas.',
        options: [
          { text: "어제 왜 안 왔어? 온다고 했으면서.", correct: true },
          { text: "어제 왜 안 왔어? 오면서." },
          { text: "어제 왜 안 왔어? 온다고 하려고 했는데." },
        ],
        explanation:
          '-(으)면서 setelah bentuk lampau (했으면서) itu padahal yang nyalahin. 오면서 doang artinya "sambil dateng", dan -려고 했는데 itu buat rencana kamu sendiri yang batal.',
      },
      {
        key: "protes-sambil",
        prompt: "알면서 왜 물어봐? Di kalimat ini, 알면서 artinya apa?",
        options: [
          { text: "Padahal udah tahu", correct: true },
          { text: "Sambil cari tahu" },
          { text: "Kalau udah tahu" },
        ],
        explanation:
          'Ada 왜 dan nadanya kesel, jadi -면서 di sini artinya padahal: "udah tahu kok nanya?". Arti sambil nggak nyambung sama nada protes.',
      },
      {
        key: "protes-atasan",
        prompt:
          "사장님 bilang Sabtu boleh libur, sekarang malah nyuruh masuk. Kamu mau ngingetin dengan sopan. Pilih yang paling aman.",
        options: [
          {
            text: "사장님, 토요일은 쉬어도 된다고 하셨는데요...",
            correct: true,
          },
          { text: "사장님, 쉬어도 된다고 했잖아!" },
          { text: "사장님, 왜요? 쉬어도 된다고 했으면서." },
        ],
        explanation:
          "Ke atasan, cukup sebut faktanya dengan bentuk hormat (하셨는데요) dan biarin kalimatnya ngegantung. 했잖아! itu 반말 yang kesel, dan 왜요 + -(으)면서 kedengeran nyolot.",
      },
      {
        key: "rencana-waktu",
        prompt:
          'Kamu mau bilang "Padahal tadinya aku mau dateng..." (rencananya udah batal). Pilih yang benar.',
        options: [
          { text: "가려고 했는데...", correct: true },
          { text: "가려고 하는데..." },
          { text: "가면서..." },
        ],
        explanation:
          'Rencananya udah lewat, jadi 했 wajib lampau. 가려고 하는데 artinya "aku lagi mau pergi nih" (rencananya masih jalan), dan 가면서 artinya "sambil pergi".',
      },
      {
        key: "rencana-janjian",
        prompt:
          '"Padahal kita udah janjian makan bareng..." Bentuk mana yang paling pas buat rencana yang udah disepakati berdua?',
        options: [
          { text: "같이 밥 먹기로 했는데...", correct: true },
          { text: "같이 밥 먹고 싶었는데..." },
          { text: "같이 밥 먹었는데..." },
        ],
        explanation:
          "-기로 했는데 = udah diputusin atau janjian. -고 싶었는데 cuma bilang kamu pengen, dan 먹었는데 artinya makan barengnya udah kejadian.",
      },
      {
        key: "kesal-iina",
        prompt:
          '"Padahal udah aku bilangin tiga kali." Pilih yang paling kerasa kesel dan kecewa.',
        options: [
          { text: "세 번이나 말했는데.", correct: true },
          { text: "세 번 말했어요." },
          { text: "세 번 말하려고 했는데." },
          { text: "세 번 말해서." },
        ],
        explanation:
          '이나 setelah angka artinya "sampai segitu", dan -는데 yang ngegantung bikin kecewanya kerasa. 말했어요 cuma laporan datar, dan 말하려고 했는데 artinya kamu malah belum sempet bilang.',
      },
    ],
  },
});
