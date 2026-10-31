import { b, callout, defineBab, ex, h3, i, p, ref, table } from "../blocks";

export default defineBab({
  key: "ik-04-bandingin",
  materials: {
    "ik-malah": {
      description:
        "Malah: hasilnya kebalik dari harapan (오히려), atau bukannya ..., malah ... (-기는커녕).",
      blocks: [
        p(
          i('"Udah minum obat, malah tambah sakit."'),
          " Kamu ngarepin satu hasil, yang keluar justru kebalikannya. Gimana bilangnya?",
        ),
        table([
          ["Korea", "Nuansa"],
          [
            ref("약을 먹었는데 오히려 더 아파.", "ki-ohiryeo"),
            "Hasilnya kebalik dari harapan. Biasanya ada -는데 di depannya, kayak padahal.",
          ],
          [
            ref("오히려 잘됐네!", "ki-ohiryeo"),
            '"Malah bagus dong!" Yang kelihatan jelek ternyata nguntungin.',
          ],
          [
            ref("사과하기는커녕 화를 냈어.", "ki-gineunkeonyeong"),
            '"Bukannya minta maaf, malah marah." Yang diharapin nggak kejadian sama sekali.',
          ],
        ]),
        h3("Contoh"),
        ex(
          "도와주려고 했는데 오히려 방해가 됐어요.",
          "Niatnya bantu, malah jadi ganggu.",
        ),
        ex("야근이 없어서 오히려 좋아요.", "Nggak ada lembur, malah enak."),
        ex(
          "돈을 모으기는커녕 빚만 늘었어요.",
          "Boro-boro nabung, utang malah nambah.",
        ),
        ex(
          "칭찬은커녕 혼나기만 했어.",
          "Boro-boro dipuji, malah dimarahin terus.",
          "kata benda + 은커녕",
        ),
        callout(
          "warning",
          b("Malah nggak selalu kebalik."),
          " ",
          i('"Dia baik, malah suka traktir."'),
          " Ini bukan hasil kebalik, tapi nambahin info. Jadi jangan pakai 오히려, pakai ",
          ref("bahkan", "ik-bahkan"),
          ": ",
          b("착하고 심지어 밥도 자주 사 줘."),
        ),
      ],
    },
    "ik-bahkan": {
      description:
        "Bahkan: nambahin info paling ekstrem pakai 심지어, -조차, atau -까지.",
      blocks: [
        p(
          i('"Bahkan bos juga nggak tahu."'),
          " Kamu nambahin info paling ekstrem yang bikin orang kaget. Gimana bilangnya?",
        ),
        table([
          ["Korea", "Nuansa"],
          [
            ref("심지어 사장님도 몰라.", "ki-simjieo"),
            "심지어 di awal: bahkan yang paling netral. Bisa positif, bisa negatif.",
          ],
          [
            ref("사장님조차 몰라.", "ki-simjieo"),
            '"Bos pun nggak tahu." -조차 nempel di kata benda. Hampir selalu buat hal negatif.',
          ],
          [
            ref("사장님까지 도와주셨어요.", "ki-simjieo"),
            '"Sampai-sampai bos ikut bantu." -까지 buat nambah satu lagi, bisa positif.',
          ],
        ]),
        h3("Contoh"),
        ex(
          "너무 바빠서 심지어 점심도 못 먹었어요.",
          "Sibuk banget, bahkan makan siang aja nggak sempet.",
        ),
        ex(
          "한국에 3년 살았는데 김치조차 못 먹어.",
          "Udah tiga tahun di Korea, bahkan kimchi aja belum bisa makan.",
        ),
        ex("나는 그 사람 이름조차 몰라.", "Aku bahkan nggak tahu namanya."),
        ex("감기에 걸렸는데 열까지 나요.", "Lagi pilek, bahkan sampai demam."),
        callout(
          "warning",
          b("-조차 buat yang jelek-jelek."),
          " -조차 hampir selalu diikuti kalimat negatif (못, 안, 모르다, 없다). Buat hal positif kayak ",
          i('"bahkan bos ikut bantu"'),
          ", pakai -까지: ",
          b("사장님까지 도와주셨어요"),
          ", bukan 사장님조차 도와주셨어요.",
        ),
      ],
    },
    "ik-mendingan": {
      description:
        "Mendingan: bandingin pilihan pakai -는 게 낫다, atau nyerah dan pilih jalan lain pakai 차라리.",
      blocks: [
        p(
          i('"Mendingan naik taksi aja."'),
          " Kamu nimbang dua pilihan, terus ngasih saran. Gimana bilangnya?",
        ),
        table([
          ["Korea", "Nuansa"],
          [
            ref("택시 타는 게 나아.", "ki-neun-ge-natda"),
            '"Mending naik taksi." Bandingin dan ngasih saran. Sopannya 나아요.',
          ],
          [
            ref("버스보다 지하철이 나아요.", "ki-neun-ge-natda"),
            '"Mending subway daripada bus." Dua benda dibandingin pakai 보다.',
          ],
          [
            ref("택시 타는 게 좋을 것 같아요.", "ki-geot-gatda"),
            "Lebih halus. Pas buat ngasih saran ke atasan.",
          ],
          [
            ref("차라리 내가 할게.", "ki-charari"),
            '"Udahlah, mending aku aja." Nyerah sama keadaan, terus milih jalan lain.',
          ],
        ]),
        h3("Contoh"),
        ex(
          "오늘은 집에서 쉬는 게 나아요.",
          "Hari ini mending istirahat di rumah.",
        ),
        ex(
          "지하철 타는 게 나아요. 더 빠르거든요.",
          "Mending naik subway, soalnya lebih cepet.",
        ),
        ex(
          "버스가 안 오네. 차라리 걸어가자.",
          "Busnya nggak dateng-dateng. Udahlah, mending jalan kaki aja.",
        ),
        ex("좀 나아졌어?", "Udah mendingan?", "soal kondisi badan"),
        callout(
          "warning",
          b("낫다 nggak beraturan."),
          " ㅅ-nya hilang kalau ketemu vokal: ",
          b("나아요, 나아, 나아졌어"),
          ". Jadi bukan 낫어요. Hati-hati juga sama ejaannya: ",
          b("낫다"),
          " (lebih baik, sembuh) beda sama ",
          b("낳다"),
          " (melahirkan).",
        ),
      ],
    },
    "ik-makin": {
      description:
        "Makin ... makin: dua hal naik barengan, pakai -(으)면 -(으)ㄹ수록.",
      blocks: [
        p(
          i('"Makin dipelajari, makin seru."'),
          " Dua hal naik barengan: yang satu nambah, yang lain ikut nambah. Gimana bilangnya?",
        ),
        table([
          ["Korea", "Nuansa"],
          [
            ref("공부하면 할수록 재미있어요.", "ki-eulsurok"),
            "Bentuk lengkap. Kata kerjanya diulang dua kali.",
          ],
          [
            ref("공부할수록 재미있어요.", "ki-eulsurok"),
            "Versi pendek, artinya sama. Sering banget dipakai ngobrol.",
          ],
          [
            ref("빠르면 빠를수록 좋아요.", "ki-eulsurok"),
            '"Makin cepet makin bagus." Ungkapan wajib hafal, sering keluar dari mulut 사장님.',
          ],
          [
            ref("일이 갈수록 힘들어져요.", "ki-ajida"),
            '"Makin lama makin berat." 갈수록 atau 점점 + -아/어지다 buat perubahan pelan-pelan.',
          ],
        ]),
        h3("Contoh"),
        ex("생각하면 할수록 화가 나.", "Makin dipikirin makin kesel."),
        ex(
          "이 노래는 들으면 들을수록 좋아.",
          "Lagu ini makin didengerin makin enak.",
          "듣다 → 들을수록",
        ),
        ex(
          "그 사람은 볼수록 매력 있어요.",
          "Orang itu makin dilihat makin menarik.",
        ),
        ex("날씨가 점점 추워져요.", "Cuacanya makin lama makin dingin."),
        callout(
          "warning",
          b('Jangan terjemahin "makin" jadi 더 ... 더.'),
          " Kalimat kayak 더 공부해서 더 재미있어 bukan cara orang Korea ngomong. Kalau dua hal naik bareng, pakai ",
          b("-(으)ㄹ수록"),
          ". Kata ",
          b("더"),
          ' cukup buat "lebih" biasa: ',
          b("더 주세요"),
          " (minta lagi dong).",
        ),
      ],
    },
  },
  vocabulary: {
    title: "Kosakata: bandingin dan kontras",
    description:
      "Cara bilang malah, bahkan, mendingan, dan makin ... makin dalam bahasa Korea.",
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
        term: "심지어",
        meanings: ["bahkan", "sampai-sampai"],
        example: {
          ko: "너무 바빠서 심지어 점심도 못 먹었어요.",
          id: "Sibuk banget, bahkan makan siang aja nggak sempet.",
        },
      },
      {
        term: "-는 게 낫다",
        meanings: ["mendingan", "lebih baik"],
        example: { ko: "택시 타는 게 나아요.", id: "Mending naik taksi." },
      },
      {
        term: "-(으)면 -(으)ㄹ수록",
        meanings: ["makin ... makin"],
        example: {
          ko: "공부하면 할수록 재미있어요.",
          id: "Makin dipelajari makin seru.",
        },
      },
    ],
  },
  quiz: {
    title: "Kuis: malah, bahkan, mendingan, makin",
    description:
      "Sepuluh situasi ngobrol. Pilih cara bandingin dan kontras yang paling natural.",
    passingScore: 70,
    questions: [
      {
        key: "malah-kebalik",
        prompt: '"Udah minum obat, malah tambah sakit." Pilih yang paling pas.',
        options: [
          { text: "약을 먹었는데 오히려 더 아파.", correct: true },
          { text: "약을 먹었는데 심지어 더 아파." },
          { text: "약을 먹어서 더 아파." },
        ],
        explanation:
          'Hasilnya kebalik dari harapan, jadi pakai 오히려. 심지어 itu bahkan (nambah info). 약을 먹어서 더 아파 artinya "sakitnya gara-gara obat", beda cerita.',
      },
      {
        key: "malah-bukannya",
        prompt:
          '"Bukannya bantuin, dia malah main HP." Pilih yang paling natural.',
        options: [
          { text: "도와주기는커녕 휴대폰만 봤어.", correct: true },
          { text: "도와주는 김에 휴대폰만 봤어." },
          { text: "도와줘서 휴대폰만 봤어." },
        ],
        explanation:
          "-기는커녕 = boro-boro, bukannya ... malah. -는 김에 itu sekalian, dan -아서 bikin bantuinnya jadi alasan main HP. Nggak nyambung.",
      },
      {
        key: "malah-atau-bahkan",
        prompt:
          '"Dia baik, malah suka traktir." Malah di sini maksudnya apa, dan bilangnya gimana?',
        options: [
          {
            text: "Maksudnya bahkan: 착하고 심지어 밥도 자주 사 줘.",
            correct: true,
          },
          { text: "Maksudnya kebalik: 착한데 오히려 밥을 자주 사 줘." },
          { text: "Maksudnya bukannya: 착하기는커녕 밥을 자주 사 줘." },
        ],
        explanation:
          "Traktir itu bukan hasil kebalik dari baik, tapi info tambahan yang makin bagus. Jadi malah di sini = bahkan, pakai 심지어. 오히려 cuma buat hasil yang kebalik.",
      },
      {
        key: "bahkan-positif",
        prompt:
          'Kamu cerita ke rekan kerja: "Pas pindahan, bahkan bos ikut bantuin." Pilih yang benar.',
        options: [
          { text: "이사할 때 사장님까지 도와주셨어요.", correct: true },
          { text: "이사할 때 사장님조차 도와주셨어요." },
          { text: "이사할 때 사장님 때문에 도와주셨어요." },
        ],
        explanation:
          "Hal yang bagus pakai -까지. -조차 hampir selalu buat kalimat negatif (nggak bisa, nggak tahu). 때문에 itu gara-gara, nggak nyambung di sini.",
      },
      {
        key: "bahkan-negatif",
        prompt: '"Aku bahkan nggak tahu namanya." Pilih yang paling pas.',
        options: [
          { text: "나는 그 사람 이름조차 몰라.", correct: true },
          { text: "나는 오히려 그 사람 이름을 몰라." },
          { text: "나는 그 사람 이름 때문에 몰라." },
        ],
        explanation:
          'Kalimatnya negatif (몰라), jadi -조차 pas banget. 오히려 itu malah (hasil kebalik), dan 때문에 bikin artinya "gara-gara namanya".',
      },
      {
        key: "mendingan-ke-atasan",
        prompt:
          'Kamu mau nyaranin ke 사장님: "Mending naik taksi aja, Pak." Pilih yang paling halus.',
        options: [
          { text: "택시 타는 게 좋을 것 같아요.", correct: true },
          { text: "택시 타는 게 나아." },
          { text: "차라리 택시 타요." },
        ],
        explanation:
          '-는 게 좋을 것 같아요 kedengeran kayak nawarin, keputusannya tetap di atasan. 나아 itu 반말, dan 차라리 bawa rasa "udahlah" yang kurang sopan di depan bos.',
      },
      {
        key: "mendingan-charari",
        prompt:
          'Udah 30 menit busnya nggak dateng-dateng. Kamu bilang ke temen: "Udahlah, mending jalan kaki aja." Pilih yang paling pas.',
        options: [
          { text: "차라리 걸어가자.", correct: true },
          { text: "오히려 걸어가자." },
          { text: "걸어가기만 하면 돼." },
        ],
        explanation:
          '차라리 = udahlah, daripada gini mending yang itu. 오히려 itu malah (hasil kebalik), dan -기만 하면 돼 artinya "asal jalan kaki, udah cukup".',
      },
      {
        key: "mendingan-bentuk",
        prompt:
          '"Mending naik subway." (sopan) Bentuk 낫다 yang benar yang mana?',
        options: [
          { text: "지하철 타는 게 나아요.", correct: true },
          { text: "지하철 타는 게 낫어요." },
          { text: "지하철 타는 게 낳아요." },
        ],
        explanation:
          "낫다 nggak beraturan: ㅅ-nya hilang kalau ketemu vokal, jadi 나아요. 낫어요 nggak ada, dan 낳아요 itu dari 낳다 (melahirkan). Plot twist yang nggak kamu mau.",
      },
      {
        key: "makin-cepat",
        prompt:
          '사장님 bilang kerjaan ini harus cepet. Kamu jawab "Iya, makin cepat makin bagus ya, Pak." Pilih yang paling natural.',
        options: [
          { text: "네, 빠르면 빠를수록 좋죠.", correct: true },
          { text: "네, 더 빨라서 더 좋죠." },
          { text: "네, 점점 빨라서 좋죠." },
        ],
        explanation:
          'Makin A makin B = -(으)면 -(으)ㄹ수록. 빠르면 빠를수록 itu ungkapan wajib hafal. 더 빨라서 더 좋아 artinya "karena lebih cepet jadi lebih bagus", rasanya beda.',
      },
      {
        key: "makin-lama",
        prompt: '"Cuacanya makin lama makin dingin." Pilih yang benar.',
        options: [
          { text: "날씨가 점점 추워져요.", correct: true },
          { text: "날씨가 점점 추워요." },
          { text: "날씨가 더 추워서 더 추워요." },
        ],
        explanation:
          "Buat perubahan pelan-pelan, kata sifatnya harus berubah pakai -아/어지다: 추워져요. 점점 추워요 kedengeran janggal, dan 더 ... 더 bukan cara orang Korea bilang makin.",
      },
    ],
  },
});
