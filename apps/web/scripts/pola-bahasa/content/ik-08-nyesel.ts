import {
  b,
  callout,
  chat,
  defineBab,
  ex,
  h3,
  i,
  p,
  ref,
  table,
} from "../blocks";

export default defineBab({
  key: "ik-08-nyesel",
  materials: {
    "ik-harusnya": {
      description:
        "Harusnya yang nyesel pakai -았/었어야 했는데, atau versi santainya -(으)ㄹ걸. Harusnya yang aturan pakai -아/어야 돼.",
      blocks: [
        p(
          i('"Harusnya tadi bawa payung."'),
          " Ujan deres, kamu basah kuyup, dan cuma bisa nyesel. Gimana bilangnya?",
        ),
        table([
          ["Korea", "Nuansa"],
          [
            ref("우산을 가져왔어야 했는데.", "ki-asseoya"),
            "Bentuk standar buat nyesel. Sopan: ...했는데요.",
          ],
          [
            ref("우산 가져올걸.", "ki-asseoya"),
            "Versi santai, kayak ngomong ke diri sendiri. -(으)ㄹ걸 di sini artinya nyesel, bukan kayaknya.",
          ],
          [
            ref("그렇게 많이 먹지 말걸.", "ki-asseoya"),
            "Harusnya nggak ...: pakai -지 말걸 atau -지 말았어야 했는데.",
          ],
          [
            ref("안전모를 써야 돼요.", "ki-aya-hada"),
            "Harusnya yang artinya aturan atau wajib. Bukan nyesel.",
          ],
        ]),
        h3("Contoh"),
        ex("더 열심히 공부했어야 했는데.", "Harusnya aku belajar lebih giat."),
        ex("그 말은 하지 말았어야 했는데.", "Harusnya aku nggak ngomong gitu."),
        ex("어제 일찍 잘걸.", "Harusnya kemarin tidur lebih awal."),
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
      ],
    },
    "ik-kalau-aja": {
      description:
        "Kalau aja buat hal yang udah lewat pakai -았/었으면 좋았을 텐데. Buat harapan yang masih mungkin, pakai -았/었으면 좋겠다.",
      blocks: [
        p(
          i('"Coba kemarin kamu dateng, seru banget loh."'),
          " Kamu berandai-andai soal hal yang udah lewat. Gimana bilangnya?",
        ),
        table([
          ["Korea", "Nuansa"],
          [
            ref("어제 너도 왔으면 좋았을 텐데.", "ki-asseumyeon-teonde"),
            "Andai soal masa lalu. Udah lewat, nggak bisa diubah.",
          ],
          [
            ref("어제 너도 왔으면...", "ki-asseumyeon-teonde"),
            "Digantung. Lebih santai, rasa sayangnya kerasa dari nada.",
          ],
          [
            ref("내일 쉬었으면 좋겠다.", "ki-asseumyeon-teonde"),
            "Andai soal nanti, masih berharap. Ujungnya 좋겠다.",
          ],
        ]),
        h3("Contoh"),
        ex(
          "그때 한국어를 더 배웠으면 좋았을 텐데요.",
          "Coba dulu aku belajar bahasa Korea lebih banyak.",
        ),
        ex(
          "아까 더 일찍 왔으면 좋았을 텐데.",
          "Coba tadi aku dateng lebih awal.",
        ),
        ex(
          "빨리 고향에 갔으면 좋겠어요.",
          "Pengen banget cepet pulang kampung.",
        ),
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
      ],
    },
    "ik-terserah": {
      description:
        "Terserah punya banyak versi: 네가 정해, 편한 대로 해, 아무거나 괜찮아, sampai 마음대로 해 yang bisa kedengeran ketus.",
      blocks: [
        p(
          i('"Mau makan apa?" "Terserah."'),
          " Kata paling legendaris, dan nadanya bisa beda jauh. Gimana bilangnya?",
        ),
        table([
          ["Korea", "Nuansa"],
          [
            ref("아무거나 괜찮아요.", "ki-maeumdaero"),
            "Apa aja boleh. Paling aman, juga ke orang yang lebih tua.",
          ],
          [
            b("네가 정해."),
            "Kamu yang nentuin (정하다 = menentukan). Santai, ke teman.",
          ],
          [
            b("편하신 대로 하세요."),
            "Terserah Bapak/Ibu, senyamannya. Sopan banget.",
          ],
          [
            ref("마음대로 해.", "ki-maeumdaero"),
            "Terserah kamu. Bisa kedengeran ketus atau nyerah, tergantung nada.",
          ],
        ]),
        h3("Contoh"),
        ex("아무 데나 괜찮아.", "Terserah, di mana aja oke."),
        ex("저는 다 좋아요.", "Aku sih semua oke."),
        ex("마음대로 해!", "Terserah kamu deh!", "nada naik, kesel"),
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
      ],
    },
    "ik-nggak-usah": {
      description:
        "Nggak usah = 안 -아도 돼 (nggak perlu). Buat nolak tawaran dengan halus, cukup 괜찮아요.",
      blocks: [
        p(
          i('"Nggak usah dateng, aku udah sembuh kok."'),
          " Nggak usah bisa berarti nggak perlu, atau nolak tawaran dengan halus. Gimana bilangnya?",
        ),
        table([
          ["Korea", "Nuansa"],
          [
            ref("안 와도 돼.", "ki-ji-anado-doeda"),
            "Nggak perlu. Paling umum buat ngobrol.",
          ],
          [
            ref("오지 않아도 돼요.", "ki-ji-anado-doeda"),
            "Sama, sedikit lebih rapi dan formal.",
          ],
          [b("괜찮아요."), "Nolak tawaran dengan halus: nggak usah, makasih."],
          [
            ref("신경 쓰지 마.", "ki-ji-maseyo"),
            '"Nggak usah dipikirin." Santai, ke teman.',
          ],
        ]),
        h3("Contoh"),
        ex("돈 안 내도 돼. 내가 살게.", "Nggak usah bayar. Aku traktir."),
        ex("내일은 일찍 안 와도 돼요.", "Besok nggak usah dateng pagi."),
        ex("걱정하지 않아도 돼요.", "Nggak usah khawatir."),
        callout(
          "warning",
          b("Jebakan terbesar: nggak usah bukan nggak boleh."),
          " ",
          b("안 와도 돼"),
          " = nggak usah dateng (boleh dateng kalau mau). ",
          ref("오면 안 돼", "ki-myeon-an-doeda"),
          " = nggak boleh dateng (dilarang). Salah pilih, maksud kamu jadi beda jauh.",
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
