import {
  b,
  callout,
  chat,
  defineBab,
  ex,
  grammar,
  h3,
  i,
  p,
  ref,
} from "../blocks";

/** One rule row of a grammar card: situation, Korean form, short example. */
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
  key: "ik-08-nyesel",
  materials: {
    "ik-harusnya": {
      description:
        "Harusnya yang nyesel pakai -았/었어야 했는데, atau versi santainya -(으)ㄹ걸. Harusnya yang aturan pakai -아/어야 돼.",
      blocks: [
        grammar({
          number: "01",
          theme: "blue",
          title: "harusnya → -았/었어야 했는데",
          descriptionKo: "하지 않은 일을 후회할 때 -았/었어야 했는데를 써요.",
          descriptionTranslation:
            "Harusnya yang nyesel soal hal yang udah lewat pakai -았/었어야 했는데. Versi santainya, kayak ngomong ke diri sendiri: -(으)ㄹ걸. Harusnya yang artinya aturan beda lagi: -아/어야 돼.",
          rules: [
            r("Nyesel, standar", "-았/었어야 했는데", "가져왔어야 했는데."),
            r("Nyesel, santai", "-(으)ㄹ걸", "우산 가져올걸."),
            r("Harusnya nggak", "-지 말걸", "많이 먹지 말걸."),
            r("Aturan, wajib", "-아/어야 돼", "안전모를 써야 돼요."),
          ],
          examples: [
            e("우산을 ", "가져왔어야 했는데", "."),
            e("어제 일찍 ", "잘걸", "."),
            e("그렇게 많이 ", "먹지 말걸", "."),
          ],
          tipKo: "후회하는 -(으)ㄹ걸은 혼잣말처럼 끝을 내려서 말해요.",
          tipTranslation:
            '-(으)ㄹ걸 yang nyesel diucapin dengan nada turun, kayak ngomong ke diri sendiri. Beda sama -(으)ㄹ걸요 yang artinya "kayaknya sih".',
        }),
        p(
          i('"Harusnya tadi bawa payung."'),
          " Ujan deres, kamu basah kuyup, dan cuma bisa nyesel. Gimana bilangnya?",
        ),
        p(
          "Nyesel pakai ",
          ref("-았/었어야 했는데", "ki-asseoya"),
          ", atau versi santainya -(으)ㄹ걸. Harusnya yang artinya aturan pakai ",
          ref("-아/어야 하다", "ki-aya-hada"),
          ".",
        ),
        h3("Contoh"),
        ex("더 열심히 공부했어야 했는데.", "Harusnya aku belajar lebih giat."),
        ex("그 말은 하지 말았어야 했는데.", "Harusnya aku nggak ngomong gitu."),
        ex("미리 예약했어야 했는데요.", "Harusnya saya pesen dari awal."),
        ex("아, 택시 탈걸.", "Duh, harusnya tadi naik taksi."),
        callout(
          "warning",
          b("Jebakan: jangan buang 었-nya."),
          " Buat nyesel, bentuknya ",
          b("가져왔어야 했는데"),
          " (ada 왔). Kalau kamu bilang ",
          b("가져와야 해"),
          ", artinya geser jadi ",
          i('"harus bawa"'),
          ", kayak ngomongin aturan, bukan nyesel.",
        ),
        callout(
          "tip",
          "Berandai-andai soal yang udah lewat? Cek ",
          ref("kalau aja", "ik-kalau-aja"),
          ". Kecewa karena keadaan, bukan salahmu: ",
          ref("sayangnya", "ik-sayangnya"),
          ".",
        ),
      ],
    },
    "ik-kalau-aja": {
      description:
        "Kalau aja buat hal yang udah lewat pakai -았/었으면 좋았을 텐데. Buat harapan yang masih mungkin, pakai -았/었으면 좋겠다.",
      blocks: [
        grammar({
          number: "02",
          theme: "blue",
          title: "kalau aja → -았/었으면 좋았을 텐데",
          descriptionKo:
            "지나간 일을 아쉬워하면서 상상할 때 -았/었으면 좋았을 텐데를 써요.",
          descriptionTranslation:
            "Kalau aja atau coba soal hal yang udah lewat pakai -았/었으면 좋았을 텐데. Boleh juga digantung: -았/었으면.... Buat harapan yang masih mungkin, ujungnya ganti jadi 좋겠다.",
          rules: [
            r(
              "Udah lewat",
              "-았/었으면 좋았을 텐데",
              "너도 왔으면 좋았을 텐데.",
            ),
            r("Digantung, santai", "-았/었으면...", "너도 왔으면..."),
            r("Masih berharap", "-았/었으면 좋겠다", "내일 쉬었으면 좋겠다."),
          ],
          examples: [
            e("어제 너도 ", "왔으면 좋았을 텐데", "."),
            e("아까 더 일찍 ", "왔으면 좋았을 텐데", "."),
            e("빨리 고향에 ", "갔으면 좋겠어요", "."),
          ],
        }),
        p(
          i('"Coba kemarin kamu dateng, seru banget loh."'),
          " Kamu berandai-andai soal hal yang udah lewat. Gimana bilangnya?",
        ),
        p(
          "Pakai ",
          ref("-았/었으면 좋았을 텐데", "ki-asseumyeon-teonde"),
          ". Bagian kalau-nya dari ",
          ref("-(으)면", "ki-myeon"),
          ", tapi dikasih lampau karena kejadiannya udah lewat.",
        ),
        h3("Contoh"),
        ex(
          "그때 한국어를 더 배웠으면 좋았을 텐데요.",
          "Coba dulu aku belajar bahasa Korea lebih banyak.",
        ),
        ex("돈을 좀 모았으면 좋았을 텐데.", "Coba dulu aku nabung."),
        ex(
          "어제 너도 왔으면... 진짜 재밌었어.",
          "Coba kemarin kamu dateng... seru banget.",
        ),
        ex("주말에 비가 안 왔으면 좋겠다.", "Semoga akhir pekan nggak hujan."),
        callout(
          "warning",
          b('Jebakan: "coba" yang dua.'),
          " ",
          i('"Coba deh makan ini"'),
          " itu mencoba, pakai ",
          ref("-아/어 보다", "ki-a-boda"),
          ": ",
          b("한번 먹어 봐."),
          " ",
          i('"Coba kemarin kamu dateng"'),
          " itu kalau aja, pakai ",
          b("-았/었으면 좋았을 텐데"),
          ".",
        ),
        callout(
          "tip",
          "Nyesel karena kamu sendiri yang salah? Cek ",
          ref("harusnya", "ik-harusnya"),
          ". Kecewa karena keadaan: ",
          ref("sayangnya", "ik-sayangnya"),
          ".",
        ),
      ],
    },
    "ik-terserah": {
      description:
        "Terserah punya banyak versi: 네가 정해, 편한 대로 해, 아무거나 괜찮아, sampai 마음대로 해 yang bisa kedengeran ketus.",
      blocks: [
        grammar({
          number: "03",
          theme: "blue",
          title: "terserah → 마음대로 해, 아무거나",
          descriptionKo:
            "상대에게 선택을 맡길 때 아무거나, 편한 대로, 마음대로 같은 말을 써요.",
          descriptionTranslation:
            "Terserah punya banyak versi, dan nadanya bisa beda jauh. Paling aman 아무거나 괜찮아 (apa aja boleh). Ke atasan pakai 편하신 대로 하세요, soalnya 마음대로 해 bisa kedengeran ketus.",
          rules: [
            r("Apa aja boleh", "아무거나 괜찮아", "저는 아무거나 괜찮아요."),
            r("Tempat mana aja", "아무 데나", "아무 데나 괜찮아."),
            r("Ke teman", "네가 정해", "난 몰라, 네가 정해."),
            r("Ke atasan", "편하신 대로 하세요", "사장님 편하신 대로 하세요."),
            r("Kesel, nyerah", "마음대로 해", "몰라, 마음대로 해!"),
          ],
          examples: [
            e("저는 ", "아무거나", " 괜찮아요."),
            e("사장님 ", "편하신 대로", " 하세요."),
            e("", "마음대로", " 해!"),
          ],
        }),
        p(
          i('"Mau makan apa?" "Terserah."'),
          " Kata paling legendaris, dan nadanya bisa beda jauh. Gimana bilangnya?",
        ),
        p(
          "Paling aman ",
          ref("아무거나", "ki-maeumdaero"),
          ". Kalau mau nyerahin keputusan, ",
          ref("마음대로 해", "ki-maeumdaero"),
          ", tapi hati-hati sama nadanya.",
        ),
        h3("Contoh"),
        ex("아무 데나 괜찮아.", "Terserah, di mana aja oke."),
        ex("저는 다 좋아요.", "Aku sih semua oke."),
        ex("네가 골라.", "Kamu aja yang pilih."),
        ...chat([
          { who: "Jisu", ko: "뭐 먹을래?", id: "Mau makan apa?" },
          { who: "Rina", ko: "아무거나 괜찮아.", id: "Terserah, apa aja oke." },
          {
            who: "Jisu",
            ko: "그럼 비빔밥 먹을까?",
            id: "Kalau gitu bibimbap yuk?",
          },
          { who: "Rina", ko: "좋아!", id: "Gas!" },
        ]),
        callout(
          "warning",
          b("Jebakan: 마음대로 하세요 ke atasan."),
          " Walaupun pakai -세요, ",
          b("마음대로 하세요"),
          " ke 사장님 bisa kedengeran kayak kamu kesel atau nggak peduli. Pakai ",
          b("사장님 편하신 대로 하세요"),
          " atau ",
          b("저는 아무거나 괜찮아요"),
          ".",
        ),
        callout(
          "tip",
          "Mau nolak tawaran dengan halus, bukan nyerahin pilihan? Cek ",
          ref("nggak usah", "ik-nggak-usah"),
          ".",
        ),
      ],
    },
    "ik-nggak-usah": {
      description:
        "Nggak usah = 안 -아도 돼 (nggak perlu). Buat nolak tawaran dengan halus, cukup 괜찮아요.",
      blocks: [
        grammar({
          number: "04",
          theme: "blue",
          title: "nggak usah → 안 -아도 돼, 괜찮아",
          descriptionKo:
            "할 필요가 없을 때는 안 -아도 돼요를 쓰고, 제안을 거절할 때는 괜찮아요를 써요.",
          descriptionTranslation:
            "Nggak usah yang artinya nggak perlu: 안 -아/어도 돼. Versi yang lebih rapi: -지 않아도 돼요. Buat nolak tawaran dengan halus, cukup 괜찮아요.",
          rules: [
            r("Nggak perlu, santai", "안 -아/어도 돼", "안 와도 돼."),
            r("Lebih rapi", "-지 않아도 돼요", "오지 않아도 돼요."),
            r("Nolak tawaran", "괜찮아요", "괜찮아요. 감사합니다."),
            r(
              "Nggak usah dipikirin",
              "신경 쓰지 마",
              "신경 쓰지 마. 별일 아니야.",
            ),
            r("Ketus", "됐어", "됐어, 안 해도 돼."),
          ],
          examples: [
            e("돈 ", "안 내도 돼", ". 내가 살게."),
            e("내일은 일찍 ", "안 와도 돼요", "."),
            e("", "괜찮아요", ". 감사합니다."),
          ],
        }),
        p(
          i('"Nggak usah dateng, aku udah sembuh kok."'),
          " Nggak usah bisa berarti nggak perlu, atau nolak tawaran dengan halus. Gimana bilangnya?",
        ),
        p(
          "Nggak perlu pakai ",
          ref("-지 않아도 되다", "ki-ji-anado-doeda"),
          ", yang versi ngobrolnya 안 -아/어도 돼. Nolak tawaran cukup 괜찮아요. Nggak usah dipikirin: ",
          ref("신경 쓰지 마", "ki-ji-maseyo"),
          ". Versi ketusnya: ",
          ref("됐어", "ki-dwaesseo"),
          ".",
        ),
        h3("Contoh"),
        ex("걱정하지 않아도 돼요.", "Nggak usah khawatir."),
        ex("오늘은 야근 안 해도 돼요.", "Hari ini nggak usah lembur."),
        ex(
          "괜찮아요. 아까 마셨어요.",
          "Nggak usah, tadi udah minum kok.",
          "nolak kopi dari 반장님",
        ),
        ex(
          "신경 쓰지 마. 별일 아니야.",
          "Nggak usah dipikirin. Bukan apa-apa kok.",
        ),
        callout(
          "warning",
          b("Jebakan terbesar: nggak usah bukan nggak boleh."),
          " ",
          b("안 와도 돼"),
          " = nggak usah dateng (boleh dateng kalau mau). ",
          ref("오면 안 돼", "ki-myeon-an-doeda"),
          " = nggak boleh dateng (dilarang). Salah pilih, maksud kamu jadi beda jauh.",
        ),
        callout(
          "tip",
          "Nyerahin pilihan ke orang lain? Cek ",
          ref("terserah", "ik-terserah"),
          ". Nyesel karena udah ngelakuin sesuatu: ",
          ref("harusnya", "ik-harusnya"),
          " (-지 말걸).",
        ),
      ],
    },
  },
  vocabulary: {
    title: "Kosakata: nyesel dan ngasih pilihan",
    description:
      "Empat ungkapan buat nyesel, berandai-andai, nyerahin pilihan, dan bilang nggak perlu.",
    entries: [
      {
        term: "-았/었어야 했는데",
        meanings: ["harusnya (tadi)"],
        example: {
          ko: "우산을 가져왔어야 했는데.",
          id: "Harusnya tadi bawa payung.",
        },
      },
      {
        term: "-았/었으면 좋았을 텐데",
        meanings: ["kalau aja", "coba (dulu)"],
        example: {
          ko: "어제 너도 왔으면 좋았을 텐데.",
          id: "Coba kemarin kamu dateng juga.",
        },
      },
      {
        term: "마음대로 해",
        meanings: ["terserah (kamu)"],
        example: {
          ko: "네 마음대로 해. 나는 다 좋아.",
          id: "Terserah kamu. Aku sih oke semua.",
        },
      },
      {
        term: "안 -아도 돼",
        meanings: ["nggak usah", "nggak perlu"],
        example: { ko: "내일은 안 와도 돼요.", id: "Besok nggak usah dateng." },
      },
    ],
  },
  quiz: {
    title: "Kuis: nyesel dan ngasih pilihan",
    description:
      "Sembilan soal soal nyesel, berandai-andai, terserah, dan nggak usah. Pilih yang paling natural.",
    passingScore: 70,
    questions: [
      {
        key: "harusnya-payung",
        prompt: 'Kamu kehujanan dan nyesel: "Harusnya tadi bawa payung."',
        options: [
          { text: "우산을 가져왔어야 했는데.", correct: true },
          { text: "우산을 가져와야 해." },
          { text: "우산을 가져올 거예요." },
        ],
        explanation:
          "Nyesel soal hal yang udah lewat pakai -았/었어야 했는데. 가져와야 해 artinya 'harus bawa' (aturan), dan 가져올 거예요 artinya 'nanti bakal bawa'.",
      },
      {
        key: "harusnya-jangan",
        prompt:
          'Abis makan kebanyakan, perut begah. "Harusnya nggak makan sebanyak itu."',
        options: [
          { text: "그렇게 많이 먹지 말걸.", correct: true },
          { text: "그렇게 많이 먹을걸." },
          { text: "그렇게 많이 먹지 마." },
        ],
        explanation:
          "Nyesel udah ngelakuin sesuatu pakai -지 말걸. 먹을걸 artinya malah 'harusnya makan banyak', dan 먹지 마 itu larangan buat orang lain.",
      },
      {
        key: "harusnya-aturan",
        prompt:
          '"Di dalam pabrik harusnya pakai helm." Maksudnya aturan, bukan nyesel.',
        options: [
          { text: "공장 안에서는 안전모를 써야 돼요.", correct: true },
          { text: "공장 안에서는 안전모를 썼어야 했는데요." },
          { text: "공장 안에서는 안전모를 쓸걸요." },
        ],
        explanation:
          "Harusnya yang artinya aturan atau wajib pakai -아/어야 되다. Dua pilihan lain bentuk nyesel, jadi nggak nyambung buat aturan.",
      },
      {
        key: "kalau-aja-lewat",
        prompt:
          'Acara kemarin seru banget, tapi temenmu nggak ikut. "Coba kemarin kamu dateng."',
        options: [
          { text: "어제 너도 왔으면 좋았을 텐데.", correct: true },
          { text: "어제 너도 와 봐." },
          { text: "어제 너도 왔으면 좋겠다." },
        ],
        explanation:
          "Andai soal hal yang udah lewat = -았/었으면 좋았을 텐데. 와 봐 itu 'coba' yang artinya mencoba, dan 좋겠다 buat harapan yang masih mungkin.",
      },
      {
        key: "kalau-aja-harapan",
        prompt: 'Kamu capek banget dan berharap: "Kalau aja besok libur."',
        options: [
          { text: "내일 쉬었으면 좋겠다.", correct: true },
          { text: "내일 쉬었으면 좋았을 텐데." },
          { text: "내일 쉬었어야 했는데." },
        ],
        explanation:
          "Besok belum kejadian, jadi masih berharap: -았/었으면 좋겠다. 좋았을 텐데 dan 했어야 했는데 buat hal yang udah lewat.",
      },
      {
        key: "terserah-makan",
        prompt:
          'Bestie nanya "뭐 먹을래?" Kamu beneran nggak masalah makan apa aja.',
        options: [
          { text: "아무거나 괜찮아.", correct: true },
          { text: "아무것도 괜찮아." },
          { text: "마음대로 먹지 마." },
        ],
        explanation:
          "Apa aja boleh = 아무거나. 아무것도 dipakai bareng negatif (아무것도 안 먹어 = nggak makan apa-apa).",
      },
      {
        key: "terserah-atasan",
        prompt: '사장님 nanya mau makan siang di mana. "Terserah Bapak aja."',
        options: [
          { text: "사장님 편하신 대로 하세요.", correct: true },
          { text: "사장님 마음대로 하세요." },
          { text: "네가 정해." },
        ],
        explanation:
          "Ke atasan, 편하신 대로 하세요 paling sopan. 마음대로 하세요 bisa kedengeran kesel atau cuek, dan 네가 정해 itu 반말.",
      },
      {
        key: "nggak-usah-bayar",
        prompt: 'Kamu mau traktir temen: "Nggak usah bayar, aku yang traktir."',
        options: [
          { text: "돈 안 내도 돼. 내가 살게.", correct: true },
          { text: "돈 내면 안 돼. 내가 살게." },
          { text: "돈 내지 않아야 돼. 내가 살게." },
        ],
        explanation:
          "Nggak usah = 안 -아도 돼 (nggak perlu). 내면 안 돼 artinya 'nggak boleh bayar', kesannya ngelarang, dan -지 않아야 돼 artinya 'harus nggak bayar'.",
      },
      {
        key: "nggak-usah-tawaran",
        prompt:
          '반장님 nawarin kopi, tapi kamu lagi nggak pengen. Nolak halus: "Nggak usah, makasih."',
        options: [
          { text: "괜찮아요. 감사합니다.", correct: true },
          { text: "안 돼요. 감사합니다." },
          { text: "신경 쓰지 마. 고마워." },
        ],
        explanation:
          "괜찮아요 itu cara nolak tawaran yang paling halus. 안 돼요 kedengeran kayak ngelarang, dan 신경 쓰지 마 itu 반말.",
      },
    ],
  },
});
