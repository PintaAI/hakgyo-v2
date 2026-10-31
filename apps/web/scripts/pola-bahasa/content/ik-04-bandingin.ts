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
  key: "ik-04-bandingin",
  materials: {
    "ik-malah": {
      description:
        "Malah: hasilnya kebalik dari harapan (오히려), atau bukannya ..., malah ... (-기는커녕).",
      blocks: [
        grammar({
          theme: "blue",
          number: "01",
          title: "malah → 오히려, -기는커녕",
          descriptionKo: "기대와 반대되는 결과가 나왔을 때 써요.",
          descriptionTranslation:
            "Malah dipakai kalau hasilnya justru kebalikan dari harapan. Pakai 오히려, biasanya setelah -는데. Kalau yang diharapin nggak kejadian sama sekali (bukannya ..., malah ...), pakai -기는커녕.",
          rules: [
            r("Hasil kebalik", "-는데 오히려", "먹었는데 오히려 더 아파."),
            r("Yang jelek jadi bagus", "오히려", "오히려 잘됐네!"),
            r("Bukannya ..., malah", "-기는커녕", "사과하기는커녕 화를 냈어."),
            r("Kata benda", "N은/는커녕", "칭찬은커녕 혼났어."),
          ],
          examples: [
            e("도와주려고 했는데 ", "오히려", " 방해가 됐어요."),
            e("야근이 없어서 ", "오히려", " 좋아요."),
            e("돈을 ", "모으기는커녕", " 빚만 늘었어요."),
          ],
        }),
        p(
          i('"Udah minum obat, malah tambah sakit."'),
          " Kamu ngarepin satu hasil, yang keluar justru kebalikannya. Gimana bilangnya?",
        ),
        p(
          "Hasil yang kebalik pakai ",
          ref("오히려", "ki-ohiryeo"),
          ": ",
          b("약을 먹었는데 오히려 더 아파."),
          " Kalau yang diharapin nggak kejadian sama sekali, pakai ",
          ref("-기는커녕", "ki-gineunkeonyeong"),
          ": ",
          b("사과하기는커녕 화를 냈어."),
        ),
        h3("Contoh"),
        ex(
          "약을 먹었는데 오히려 더 아파.",
          "Udah minum obat, malah tambah sakit.",
          "반말",
        ),
        ex("오히려 잘됐네!", "Malah bagus dong!"),
        ex(
          "사과하기는커녕 화를 냈어.",
          "Bukannya minta maaf, dia malah marah.",
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
        callout(
          "tip",
          "Hasilnya cuma nggak sesuai harapan? Cek ",
          ref("padahal (hasil nggak sesuai)", "ik-padahal-hasil"),
          ". Baru nyadar keadaannya beda dari dugaan? Cek ",
          ref("ternyata", "ik-ternyata"),
          ".",
        ),
      ],
    },
    "ik-bahkan": {
      description:
        "Bahkan: nambahin info paling ekstrem pakai 심지어, -조차, atau -까지.",
      blocks: [
        grammar({
          theme: "blue",
          number: "02",
          title: "bahkan → 심지어, -조차, -까지",
          descriptionKo: "놀라운 정보를 하나 더 말할 때 써요.",
          descriptionTranslation:
            "Bahkan nambahin info paling ekstrem yang bikin orang kaget. 심지어 ditaruh di awal dan paling netral. -조차 dan -까지 nempel di kata benda: -조차 buat hal negatif, -까지 bisa buat yang positif.",
          rules: [
            r("Paling netral, di awal", "심지어", "심지어 사장님도 몰라."),
            r("Negatif (nggak, belum)", "N조차", "사장님조차 몰라."),
            r(
              "Nambah satu lagi, positif juga",
              "N까지",
              "사장님까지 도와주셨어요.",
            ),
            r("Bahkan ... aja", "N도", "점심도 못 먹었어요."),
          ],
          examples: [
            e("너무 바빠서 ", "심지어", " 점심도 못 먹었어요."),
            e("나는 그 사람 이름", "조차", " 몰라."),
            e("감기에 걸렸는데 열", "까지", " 나요."),
          ],
        }),
        p(
          i('"Bahkan bos juga nggak tahu."'),
          " Kamu nambahin info paling ekstrem yang bikin orang kaget. Gimana bilangnya?",
        ),
        p(
          "Ketiganya ada di ",
          ref("심지어 / -조차 / -까지", "ki-simjieo"),
          ". Yang paling aman ",
          b("심지어"),
          " di awal: ",
          b("심지어 사장님도 몰라."),
          " Mau lebih nempel ke kata bendanya, pakai -조차 buat yang negatif atau -까지 buat yang positif.",
        ),
        h3("Contoh"),
        ex("심지어 사장님도 몰라.", "Bahkan bos juga nggak tahu."),
        ex(
          "한국에 3년 살았는데 김치조차 못 먹어.",
          "Udah tiga tahun di Korea, bahkan kimchi aja belum bisa makan.",
        ),
        ex(
          "이사할 때 사장님까지 도와주셨어요.",
          "Pas pindahan, bahkan bos ikut bantuin.",
        ),
        ex(
          "주말에도 일하고 심지어 공휴일에도 일해요.",
          "Weekend kerja, bahkan tanggal merah juga kerja.",
        ),
        callout(
          "warning",
          b("-조차 buat yang jelek-jelek."),
          " -조차 hampir selalu diikuti kalimat negatif (못, 안, 모르다, 없다). Buat hal positif kayak ",
          i('"bahkan bos ikut bantu"'),
          ", pakai -까지: ",
          b("사장님까지 도와주셨어요"),
          ", bukan 사장님조차 도와주셨어요.",
        ),
        callout(
          "tip",
          "Hasilnya justru kebalik dari harapan? Cek ",
          ref("malah", "ik-malah"),
          ". Nekanin usaha yang udah kamu keluarin? Cek ",
          ref("padahal udah ... (kesel)", "ik-padahal-kesal"),
          ".",
        ),
      ],
    },
    "ik-mendingan": {
      description:
        "Mendingan: bandingin pilihan pakai -는 게 낫다, atau nyerah dan pilih jalan lain pakai 차라리.",
      blocks: [
        grammar({
          theme: "blue",
          number: "03",
          title: "mendingan → -는 게 낫다, 차라리",
          descriptionKo: "두 가지를 비교해서 더 좋은 쪽을 권할 때 써요.",
          descriptionTranslation:
            "Mendingan dipakai buat nimbang dua pilihan, terus ngasih saran. Pakai -는 게 나아. Kalau nadanya udahlah (nyerah sama keadaan, terus pilih jalan lain), pakai 차라리.",
          rules: [
            r("Ngasih saran", "-는 게 나아(요)", "택시 타는 게 나아."),
            r("Dua benda", "A보다 B가 나아요", "버스보다 지하철이 나아요."),
            r(
              "Ke atasan, halus",
              "-는 게 좋을 것 같아요",
              "택시 타는 게 좋을 것 같아요.",
            ),
            r("Udahlah, nyerah", "차라리", "차라리 내가 할게."),
            r("Kondisi badan", "나아지다", "좀 나아졌어?"),
          ],
          examples: [
            e("오늘은 집에서 ", "쉬는 게 나아요", "."),
            e("버스보다 지하철이 ", "나아요", "."),
            e("버스가 안 오네. ", "차라리", " 걸어가자."),
          ],
        }),
        p(
          i('"Mendingan naik taksi aja."'),
          " Kamu nimbang dua pilihan, terus ngasih saran. Gimana bilangnya?",
        ),
        p(
          "Saran biasa pakai ",
          ref("-는 게 낫다", "ki-neun-ge-natda"),
          ": ",
          b("택시 타는 게 나아."),
          " Ke atasan, bikin lebih halus pakai ",
          ref("-는 게 좋을 것 같아요", "ki-geot-gatda"),
          ". Kalau udah nyerah sama keadaan, pakai ",
          ref("차라리", "ki-charari"),
          ".",
        ),
        h3("Contoh"),
        ex(
          "지하철 타는 게 나아요. 더 빠르거든요.",
          "Mending naik subway, soalnya lebih cepet.",
        ),
        ex(
          "택시 타는 게 좋을 것 같아요.",
          "Kayaknya mending naik taksi, Pak.",
          "halus, ke atasan",
        ),
        ex("차라리 내가 할게.", "Udahlah, mending aku aja."),
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
        callout(
          "tip",
          "Nyesel karena tadi nggak milih yang lebih baik? Cek ",
          ref("harusnya", "ik-harusnya"),
          ". Mau nyerahin pilihannya ke orang lain? Cek ",
          ref("terserah", "ik-terserah"),
          ".",
        ),
      ],
    },
    "ik-makin": {
      description:
        "Makin ... makin: dua hal naik barengan, pakai -(으)면 -(으)ㄹ수록.",
      blocks: [
        grammar({
          theme: "blue",
          number: "04",
          title: "makin ... makin → -(으)면 -(으)ㄹ수록",
          descriptionKo: "한 가지가 변하면 다른 것도 따라 변할 때 써요.",
          descriptionTranslation:
            "Makin ... makin dipakai kalau dua hal naik barengan. Kata kerjanya diulang: -(으)면 dulu, terus -(으)ㄹ수록. Versi pendeknya cukup -(으)ㄹ수록, dan buat perubahan pelan-pelan pakai 갈수록 atau 점점 + -아/어지다.",
          rules: [
            r("Bentuk lengkap", "-(으)면 -(으)ㄹ수록", "하면 할수록"),
            r("Versi pendek", "-(으)ㄹ수록", "볼수록"),
            r("Kata sifat", "-(으)면 -(으)ㄹ수록", "빠르면 빠를수록 좋아요."),
            r("ㄷ jadi ㄹ", "듣다 → 들을수록", "들으면 들을수록"),
            r("Makin lama", "갈수록 / 점점 -아/어지다", "점점 추워져요."),
          ],
          examples: [
            e("한국어는 ", "공부하면 할수록", " 재미있어요."),
            e("그 사람은 ", "볼수록", " 매력 있어요."),
            e("일이 ", "갈수록", " 힘들어져요."),
          ],
        }),
        p(
          i('"Makin dipelajari, makin seru."'),
          " Dua hal naik barengan: yang satu nambah, yang lain ikut nambah. Gimana bilangnya?",
        ),
        p(
          "Pakai ",
          ref("-(으)면 -(으)ㄹ수록", "ki-eulsurok"),
          ": ",
          b("공부하면 할수록 재미있어요."),
          " Kalau yang berubah cuma satu hal, pelan-pelan seiring waktu, pakai 점점 + ",
          ref("-아/어지다", "ki-ajida"),
          ": ",
          b("날씨가 점점 추워져요."),
        ),
        h3("Contoh"),
        ex("생각하면 할수록 화가 나.", "Makin dipikirin makin kesel."),
        ex(
          "이 노래는 들으면 들을수록 좋아.",
          "Lagu ini makin didengerin makin enak.",
          "듣다 → 들을수록",
        ),
        ex(
          "빠르면 빠를수록 좋아요.",
          "Makin cepet makin bagus.",
          "sering keluar dari mulut 사장님",
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
        callout(
          "tip",
          "Bandingin dua pilihan, bukan dua hal yang naik bareng? Cek ",
          ref("mendingan", "ik-mendingan"),
          ". Mau nambahin info paling ekstrem? Cek ",
          ref("bahkan", "ik-bahkan"),
          ".",
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
