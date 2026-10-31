import { b, callout, defineBab, ex, h3, i, p, ref, table } from "../blocks";

export default defineBab({
  key: "ik-01-padahal",
  materials: {
    "ik-padahal-hasil": {
      description:
        "Padahal buat hasil yang nggak sesuai harapan: udah makan, kok masih laper.",
      blocks: [
        p(
          i('"Aku masih laper, padahal udah makan."'),
          " Kamu udah ngelakuin sesuatu, tapi hasilnya nggak sesuai harapan. Gimana bilangnya?",
        ),
        table([
          ["Korea", "Nuansa"],
          [
            ref("밥 먹었는데 아직 배고파.", "ki-neunde"),
            "Paling natural buat ngobrol. Ini pilihan pertama kamu.",
          ],
          [
            ref("밥 먹었는데도 아직 배고파.", "ki-neundedo"),
            "Lebih tegas: udah makan pun tetep aja laper. Ada rasa heran atau kesel.",
          ],
          [
            ref("밥을 먹었지만 아직 배고파.", "ki-jiman"),
            "Netral dan agak kaku. Lebih sering di tulisan.",
          ],
        ]),
        h3("Contoh"),
        ex(
          "열심히 공부했는데 시험에 떨어졌어요.",
          "Aku nggak lulus ujian, padahal udah belajar mati-matian.",
        ),
        ex(
          "이 옷 비싼데 금방 찢어졌어.",
          "Bajunya cepet sobek, padahal mahal.",
          "kata sifat: 비싼데, bukan 비싸는데",
        ),
        ex(
          "약을 먹었는데도 열이 안 내려요.",
          "Demamnya nggak turun, padahal udah minum obat.",
        ),
        ex(
          "야근까지 했는데 월급이 똑같아요.",
          "Gajinya sama aja, padahal udah lembur segala.",
        ),
        callout(
          "warning",
          b("Urutannya kebalik."),
          " Di bahasa Indonesia, padahal ditaruh di belakang: ",
          i('"Aku laper, padahal udah makan."'),
          " Di bahasa Korea, bagian setelah kata padahal (udah makan) ditempelin -는데 dan pindah ke ",
          b("depan"),
          ": ",
          b("밥 먹었는데 배고파."),
          ' Kalau kamu bilang 배고픈데 밥 먹었어, artinya malah jadi "aku laper, nah aku udah makan".',
        ),
      ],
    },
    "ik-padahal-protes": {
      description:
        "Padahal yang nadanya nyalahin: udah janji, kok nggak dateng?",
      blocks: [
        p(
          i('"Padahal kamu udah janji, kok nggak dateng?"'),
          " Kamu nggak cuma heran, kamu juga protes. Gimana bilangnya?",
        ),
        table([
          ["Korea", "Nuansa"],
          [
            ref("약속했으면서 왜 안 왔어?", "ki-myeonseo-padahal"),
            "Nyalahin dengan jelas. Nadanya tajam, cuma buat teman akrab.",
          ],
          [
            ref("약속했잖아!", "ki-janayo"),
            '"Kan udah janji!" Pendek dan kesel, ngingetin hal yang dia udah tahu.',
          ],
          [
            ref("약속했는데 왜 안 왔어?", "ki-neunde"),
            "Lebih lembut. Masih protes, tapi nggak sepedes -(으)면서.",
          ],
        ]),
        h3("Contoh"),
        ex("알면서 왜 물어봐?", "Udah tahu kok nanya?"),
        ex(
          "자기는 늦게 오면서 나한테만 뭐라고 해.",
          "Padahal dia sendiri telat, kok cuma aku yang diomelin.",
        ),
        ex(
          "돈 없다고 했으면서 새 폰 샀어?",
          "Katanya nggak punya duit, kok beli HP baru?",
        ),
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
      ],
    },
    "ik-padahal-rencana": {
      description:
        "Padahal tadinya mau, tapi rencananya batal: -(으)려고 했는데 dan teman-temannya.",
      blocks: [
        p(
          i('"Padahal tadinya aku mau dateng..."'),
          " Rencananya udah ada, tapi akhirnya batal. Biasanya diikuti alasan, atau dibiarin ngegantung. Gimana bilangnya?",
        ),
        table([
          ["Korea", "Nuansa"],
          [
            ref("가려고 했는데...", "ki-ryeogo-haenneunde"),
            "Tadinya niat mau. Paling sering, boleh digantung dengan nada turun.",
          ],
          [
            ref("가기로 했는데...", "ki-giro-hada"),
            "Udah diputusin atau udah janjian sama orang lain.",
          ],
          [
            ref("가고 싶었는데...", "ki-go-sipda"),
            "Padahal pengen banget. Lebih ke perasaan.",
          ],
          [
            ref("원래 가려고 했는데...", "ki-hagin"),
            "원래 = aslinya, dari awal. Ada nada ngeluh.",
          ],
        ]),
        h3("Contoh"),
        ex(
          "가려고 했는데 갑자기 야근이 생겼어.",
          "Padahal tadinya mau dateng, eh tiba-tiba ada lembur.",
        ),
        ex(
          "전화하려고 했는데 깜빡했어요.",
          "Tadinya mau nelpon, tapi kelupaan.",
        ),
        ex(
          "오늘 같이 밥 먹기로 했는데...",
          "Padahal hari ini kita udah janjian makan bareng...",
          "digantung",
        ),
        ex(
          "고향에 가고 싶었는데 비행기표가 너무 비쌌어요.",
          "Padahal pengen banget pulang kampung, tapi tiket pesawatnya mahal banget.",
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
      ],
    },
    "ik-padahal-kesal": {
      description:
        "Padahal buat nambahin info yang bikin makin kesel: padahal udah nunggu dua jam.",
      blocks: [
        p(
          i('"Dia nggak dateng. Padahal aku udah nunggu dua jam."'),
          " Di sini padahal nambahin info yang bikin kamu makin kesel. Biasanya ada angka atau usaha yang udah kamu keluarin. Gimana bilangnya?",
        ),
        table([
          ["Korea", "Nuansa"],
          [
            ref("두 시간이나 기다렸는데.", "ki-neunde"),
            "Paling pas. 이나 = sampai segitu, dan -는데 yang digantung bikin kerasa kecewa.",
          ],
          [
            ref("얼마나 기다렸는데!", "ki-neunde"),
            '"Kamu tahu nggak aku nunggu selama apa!" Lebih emosional.',
          ],
          [
            ref("두 시간이나 기다렸잖아!", "ki-janayo"),
            'Nyalahin langsung ke orangnya: "kan aku udah nunggu dua jam!"',
          ],
          [
            ref("힘들게 만들었는데...", "ki-neunde"),
            '"Padahal udah capek-capek bikin..." Kecewa, bukan marah.',
          ],
        ]),
        h3("Contoh"),
        ex("세 번이나 말했는데.", "Padahal udah aku bilangin tiga kali."),
        ex(
          "30분이나 줄 섰는데 다 팔렸대요.",
          "Padahal udah antre setengah jam, katanya udah habis.",
        ),
        ex(
          "엄마가 힘들게 만들었는데 하나도 안 먹었어?",
          "Padahal Mama udah capek-capek masak, kamu nggak makan sama sekali?",
        ),
        ex(
          "메시지를 다섯 번이나 보냈는데 답장이 없어.",
          "Padahal udah chat lima kali, nggak dibales juga.",
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
