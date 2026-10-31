import { b, callout, defineBab, ex, h3, i, p, ref, table } from "../blocks";

export default defineBab({
  key: "ik-05-nebak",
  materials: {
    "ik-kayaknya": {
      description:
        "Kayaknya dalam bahasa Korea punya beberapa bentuk, tergantung seberapa yakin kamu dan dari mana kamu nebak.",
      blocks: [
        p(
          i(
            '"Kayaknya mau hujan." "Kayaknya dia lagi sibuk." "Kayaknya dia udah pulang deh."',
          ),
          " Satu kata, tapi yakinnya beda-beda. Gimana bilangnya?",
        ),
        table([
          ["Korea", "Nuansa"],
          [
            ref("비가 올 것 같아.", "ki-geot-gatda"),
            "Dugaan umum. Paling serbaguna dan aman di hampir semua situasi.",
          ],
          [
            ref("바쁜가 봐.", "ki-na-bwa"),
            "Nebak dari tanda yang kelihatan, misalnya dia nggak bales chat.",
          ],
          [
            ref("벌써 갔을걸.", "ki-eulgeol"),
            '"Kayaknya sih", tapi kamu kurang yakin.',
          ],
          [
            ref("맛있겠다!", "ki-getda"),
            "Nebak rasa atau perasaan secara spontan: kayaknya enak, pasti capek.",
          ],
        ]),
        h3("Contoh"),
        ex("내일 추울 것 같아요.", "Kayaknya besok dingin."),
        ex(
          "밖에 비가 오나 봐요. 다들 우산을 들고 있어요.",
          "Kayaknya di luar hujan. Semua orang bawa payung.",
        ),
        ex("아마 내일 쉬는 날일걸요.", "Kayaknya sih besok libur."),
        ex(
          "12시간 일했어? 진짜 피곤하겠다.",
          "Kerja 12 jam? Pasti capek banget.",
        ),
        callout(
          "warning",
          b("Jebakan: lihat makanan, belum nyicip."),
          " Kalau baru lihat foto atau makanannya, bilang ",
          b("맛있겠다!"),
          " Kalau udah nyicip dan mau menilai, baru ",
          b("맛있는 것 같아."),
          " Kalau kebalik, kedengerannya aneh.",
        ),
      ],
    },
    "ik-jangan-jangan": {
      description:
        "Jangan-jangan itu nebak sambil cemas, bukan larangan. Bahasa Koreanya 혹시 atau 설마.",
      blocks: [
        p(
          i('"Jangan-jangan dia lupa."'),
          " Kamu lagi nebak, tapi sambil cemas. Gimana bilangnya?",
        ),
        table([
          ["Korea", "Nuansa"],
          [
            ref("혹시 걔 잊어버린 거 아니야?", "ki-hoksi"),
            'Paling umum. Kira-kira artinya "apa mungkin dia lupa?"',
          ],
          [
            ref("혹시 잊어버리신 거 아니에요?", "ki-hoksi"),
            "Versi sopan, buat orang yang lebih tua.",
          ],
          [
            ref("설마 벌써 끝난 건 아니겠지?", "ki-hoksi"),
            'Takut hal buruk kejadian: "masa sih udah selesai?"',
          ],
          [ref("설마!", "ki-hoksi"), '"Masa sih! Nggak mungkin!"'],
        ]),
        h3("Contoh"),
        ex(
          "지갑이 없어. 혹시 버스에 두고 내린 거 아닐까?",
          "Dompetku nggak ada. Jangan-jangan ketinggalan di bus?",
        ),
        ex(
          "이거 혹시 돼지고기 들어간 거 아니에요?",
          "Jangan-jangan ini ada babinya?",
          "penting buat yang makan halal",
        ),
        ex(
          "혹시 저한테 화나신 거 아니에요?",
          "Jangan-jangan Bapak marah sama saya?",
        ),
        callout(
          "warning",
          b('Jebakan: "jangan" di sini bukan larangan.'),
          " Jangan otomatis pakai ",
          b("-지 마"),
          ". ",
          i("Jangan-jangan"),
          " itu tebakan, jadi pakai ",
          b("혹시 / 설마"),
          " lalu tutup kalimatnya dengan ",
          b("-(으)ㄴ/는 거 아니야?"),
        ),
      ],
    },
    "ik-ternyata": {
      description:
        "Ternyata jarang jadi satu kata dalam bahasa Korea. Biasanya cukup akhiran -네 atau -더라, atau 알고 보니 buat plot twist.",
      blocks: [
        p(
          i(
            '"Ternyata enak!" "Ternyata dia anaknya bos." "Kemarin ke sana, ternyata tutup."',
          ),
          " Tiga kalimat, tiga rasa ternyata. Gimana bilangnya?",
        ),
        table([
          ["Korea", "Nuansa"],
          [
            ref("맛있네!", "ki-neyo"),
            "Baru sadar sekarang, sambil ngalamin langsung.",
          ],
          [
            ref("알고 보니 사장님 아들이었어.", "ki-algo-boni"),
            "Plot twist: setelah tahu faktanya, ceritanya jadi beda.",
          ],
          [
            ref("어제 가 봤는데 문 닫았더라.", "ki-deora"),
            "Cerita hal yang kamu lihat sendiri waktu itu.",
          ],
          [
            b("생각보다 쉬웠어."),
            '"Ternyata lebih gampang dari yang aku kira."',
          ],
        ]),
        h3("Contoh"),
        ex("김치 별로 안 맵네!", "Ternyata kimchi nggak terlalu pedes!"),
        ex(
          "알고 보니 그 사람이 범인이었어.",
          "Ternyata dia pelakunya.",
          "plot twist drakor",
        ),
        ex(
          "그 식당 가 봤는데 진짜 맛있더라.",
          "Aku nyobain restoran itu, ternyata enak banget.",
        ),
        ex("시험이 생각보다 어려웠어요.", "Ternyata ujiannya lebih susah."),
        callout(
          "warning",
          b("Jebakan: ternyata yang kamu dengar dari orang lain."),
          " -더라 cuma buat hal yang kamu lihat atau alami sendiri. Kalau infonya dari orang lain (",
          i('"ternyata besok libur, kata bos"'),
          "), pakai ",
          b("-대"),
          ": ",
          b("내일 쉰대!"),
        ),
      ],
    },
    "ik-pantesan": {
      description:
        "Pantesan dipakai waktu kamu baru tahu alasan dari hal aneh yang tadi kamu rasain. Bahasa Koreanya 어쩐지 ... -더라.",
      blocks: [
        p(
          i('"Oh, lagi diskon. Pantesan rame."'),
          " Tadi kamu udah ngerasa aneh, terus baru tahu alasannya. Gimana bilangnya?",
        ),
        table([
          ["Korea", "Nuansa"],
          [
            ref("어쩐지 사람이 많더라.", "ki-eojjeonji"),
            "Paling klasik: 어쩐지 + hal aneh yang tadi kamu lihat, ditutup -더라.",
          ],
          [
            ref("어쩐지 사람이 많더라고요.", "ki-deora"),
            "Versi sopan dari kalimat di atas.",
          ],
          [
            ref("아, 그래서 그랬구나.", "ki-gunyo"),
            '"Oh, pantesan." Reaksi pendek waktu orang lain ngasih penjelasan.',
          ],
        ]),
        h3("Contoh"),
        ex(
          "아, 세일하는구나. 어쩐지 사람이 많더라.",
          "Oh, lagi diskon. Pantesan rame.",
        ),
        ex("아, 비 왔어? 어쩐지 시원하더라.", "Oh, abis hujan? Pantesan adem."),
        ex(
          "오늘 월급날이구나. 어쩐지 다들 기분이 좋더라.",
          "Oh, hari ini gajian. Pantesan semua pada happy.",
        ),
        ex(
          "어제 밤새웠구나. 어쩐지 피곤해 보이더라.",
          "Semalem begadang ya. Pantesan kelihatan capek.",
        ),
        callout(
          "warning",
          b("Jebakan: 어쩐지 doang belum tentu pantesan."),
          " ",
          b("어쩐지 슬퍼"),
          " artinya ",
          i('"entah kenapa aku sedih"'),
          ". Biar jelas artinya pantesan, sebut dulu alasannya, terus tutup dengan ",
          b("-더라"),
          ".",
        ),
      ],
    },
    "ik-untung": {
      description:
        "Untung yang artinya lega dibilang dengan 다행이다: alasannya pakai -아서/어서, lalu ditutup 다행이야.",
      blocks: [
        p(
          i('"Untung nggak hujan."'),
          " Kamu lega karena hal buruk nggak kejadian. Gimana bilangnya?",
        ),
        table([
          ["Korea", "Nuansa"],
          [
            ref("비가 안 와서 다행이야.", "ki-dahaeng"),
            "Paling umum. Sebelum -아서 nggak pakai lampau, walaupun kejadiannya udah lewat.",
          ],
          [
            ref("다행히 비가 안 왔어.", "ki-dahaeng"),
            '"Untungnya nggak hujan." Pas buat cerita.',
          ],
          [
            ref("다행이다! / 다행이네요.", "ki-dahaeng"),
            '"Syukurlah!" Reaksi waktu dengar kabar baik.',
          ],
          [
            ref("네가 있어서 다행이야.", "ki-aseo-karena"),
            '"Untung ada kamu." Kalimat drakor banget.',
          ],
        ]),
        h3("Contoh"),
        ex("안 늦어서 다행이야.", "Untung aku nggak telat."),
        ex("다행히 친구가 도와줬어요.", "Untungnya ada temen yang bantuin."),
        ex("사장님이 이해해 주셔서 다행이에요.", "Untung bos mau ngerti."),
        ex(
          "기차 놓칠 뻔했어. 진짜 다행이다.",
          "Hampir ketinggalan kereta. Untung banget.",
        ),
        callout(
          "warning",
          b("Jebakan: untung yang artinya laba."),
          " ",
          i('"Jualan hari ini untung banyak"'),
          " itu soal duit, bukan lega. Bilangnya ",
          b("오늘 장사 잘됐어."),
          " Jangan pakai 다행 di sini.",
        ),
      ],
    },
    "ik-sayangnya": {
      description:
        "Sayangnya buat nyampein kabar kurang enak atau rasa kecewa: 아쉽게도 dan 아쉽다.",
      blocks: [
        p(
          i('"Sayangnya aku nggak bisa dateng."'),
          " Kamu nyampein kabar yang kurang enak dengan halus. Gimana bilangnya?",
        ),
        table([
          ["Korea", "Nuansa"],
          [
            ref("아쉽게도 못 가.", "ki-aswipgedo"),
            "Nyampein kabar kurang enak dengan halus.",
          ],
          [
            ref("네가 못 와서 아쉬웠어.", "ki-aswipgedo"),
            '"Sayang banget kamu nggak dateng." Fokus ke rasa kecewa.',
          ],
          [
            ref("아쉽다... / 아쉽네요.", "ki-aswipgedo"),
            '"Yah, sayang banget." Reaksi pendek.',
          ],
        ]),
        h3("Contoh"),
        ex(
          "아쉽게도 이번 주말에는 일이 있어서 못 가요.",
          "Sayangnya weekend ini aku ada kerjaan, jadi nggak bisa dateng.",
        ),
        ex(
          "벚꽃이 벌써 다 져서 아쉬워.",
          "Sayang banget bunga sakuranya udah pada gugur.",
        ),
        ex(
          "아쉽게도 할랄 메뉴는 없습니다.",
          "Sayangnya nggak ada menu halal.",
          "gaya resmi restoran",
        ),
        callout(
          "warning",
          b('Jebakan: sayang yang "jangan dibuang".'),
          " ",
          i('"Sayang kalau dibuang"'),
          " itu bukan 아쉽다, tapi ",
          b("아깝다"),
          ": ",
          b("버리기 아까워."),
          " 아쉽다 = kecewa karena ada yang kurang. 아깝다 = sayang karena barang, duit, atau waktu kebuang.",
        ),
      ],
    },
  },
  vocabulary: {
    title: "Kosakata: nebak dan bereaksi",
    description:
      "Enam cara nebak dan bereaksi: kayaknya, jangan-jangan, ternyata, pantesan, untung, dan sayangnya.",
    entries: [
      {
        term: "-(으)ㄴ/는 것 같아",
        meanings: ["kayaknya", "sepertinya"],
        example: { ko: "비가 올 것 같아요.", id: "Kayaknya mau hujan." },
      },
      {
        term: "혹시 -(으)ㄴ/는 거 아니야?",
        meanings: ["jangan-jangan", "apa mungkin"],
        example: {
          ko: "혹시 걔 잊어버린 거 아니야?",
          id: "Jangan-jangan dia lupa?",
        },
      },
      {
        term: "-네",
        meanings: ["ternyata", "wah"],
        example: {
          ko: "김치 별로 안 맵네!",
          id: "Ternyata kimchi nggak terlalu pedes!",
        },
      },
      {
        term: "어쩐지",
        meanings: ["pantesan"],
        example: {
          ko: "아, 세일하는구나. 어쩐지 사람이 많더라.",
          id: "Oh, lagi diskon. Pantesan rame.",
        },
      },
      {
        term: "-아서 다행이야",
        meanings: ["untung", "syukurlah"],
        example: { ko: "비가 안 와서 다행이야.", id: "Untung nggak hujan." },
      },
      {
        term: "아쉽게도",
        meanings: ["sayangnya"],
        example: {
          ko: "아쉽게도 이번 주말에는 못 가요.",
          id: "Sayangnya weekend ini aku nggak bisa dateng.",
        },
      },
    ],
  },
  quiz: {
    title: "Kuis: nebak dan bereaksi",
    description:
      "Sepuluh situasi ngobrol. Pilih cara nebak dan bereaksi yang paling natural dalam bahasa Korea.",
    passingScore: 70,
    questions: [
      {
        key: "kayaknya-tanda",
        prompt:
          'Temen nggak bales chat dari pagi. Kamu nebak dari tanda itu: "Kayaknya dia lagi sibuk."',
        options: [
          { text: "바쁜가 봐.", correct: true },
          { text: "바빠 봐." },
          { text: "바쁜 척해." },
        ],
        explanation:
          'Nebak dari tanda yang kelihatan pakai -나 봐, dan kata sifat jadi -(으)ㄴ가 봐: 바쁜가 봐. 바쁜 척해 artinya "pura-pura sibuk", beda jauh.',
      },
      {
        key: "kayaknya-makanan",
        prompt:
          'Lagi scroll foto ayam goreng, belum nyobain. "Kayaknya enak banget!"',
        options: [
          { text: "와, 맛있겠다!", correct: true },
          { text: "와, 맛있었어!" },
          { text: "와, 맛있더라!" },
        ],
        explanation:
          "Lihat makanan tapi belum nyicip pakai -겠다. 맛있었어 dan 맛있더라 dua-duanya buat makanan yang udah kamu cobain.",
      },
      {
        key: "kayaknya-ragu",
        prompt:
          'Ditanya kapan bos pulang. Kamu kurang yakin: "Kayaknya sih udah pulang."',
        options: [
          { text: "벌써 가셨을걸요.", correct: true },
          { text: "벌써 가셨대요." },
          { text: "벌써 가셨네요." },
        ],
        explanation:
          '-(으)ㄹ걸요 itu "kayaknya sih", pas buat dugaan yang kamu sendiri kurang yakin. -대요 artinya "katanya", dan -네요 buat hal yang baru kamu sadari sendiri.',
      },
      {
        key: "jangan-jangan-lupa",
        prompt:
          'Temen janjian jam 7, udah jam 8 belum dateng. "Jangan-jangan dia lupa."',
        options: [
          { text: "혹시 걔 잊어버린 거 아니야?", correct: true },
          { text: "걔 잊어버리지 마." },
          { text: "걔 잊어버릴 수 있어." },
        ],
        explanation:
          'Jangan-jangan itu tebakan sambil cemas, bukan larangan. Rumusnya 혹시 + -(으)ㄴ 거 아니야? Kalau pakai -지 마, artinya malah "jangan lupa".',
      },
      {
        key: "ternyata-enak",
        prompt:
          "Kamu baru nyicip kimchi buatan temen, dan ternyata enak banget. Spontan kamu bilang:",
        options: [
          { text: "맛있네!", correct: true },
          { text: "알고 보니 맛있어." },
          { text: "맛있대!" },
        ],
        explanation:
          'Baru sadar sekarang sambil ngalamin langsung pakai -네. 알고 보니 buat plot twist soal fakta, dan 맛있대 artinya "katanya enak".',
      },
      {
        key: "ternyata-katanya",
        prompt:
          'Bos baru aja bilang besok libur. Kamu kabarin bestie: "Eh, ternyata besok libur!"',
        options: [
          { text: "야, 내일 쉰대!", correct: true },
          { text: "야, 내일 쉬더라!" },
          { text: "야, 내일 쉬네!" },
        ],
        explanation:
          "Infonya dari orang lain (bos), jadi pakai -대 (katanya). -더라 cuma buat hal yang kamu lihat atau alami sendiri.",
      },
      {
        key: "pantesan-rame",
        prompt:
          'Temen bilang hari ini ada diskon. Kamu mau bilang "Oh, lagi diskon. Pantesan rame."',
        options: [
          { text: "아, 세일하는구나. 어쩐지 사람이 많더라.", correct: true },
          { text: "아, 세일하는구나. 왜 사람이 많아?" },
          { text: "아, 세일하는구나. 사람이 많을 것 같아." },
        ],
        explanation:
          "Pantesan = 어쩐지 + hal aneh yang tadi kamu lihat sendiri, ditutup -더라. Pilihan lain malah nanya lagi atau nebak, padahal alasannya udah ketahuan.",
      },
      {
        key: "untung-bentuk",
        prompt: '"Untung nggak hujan." Mana yang bener?',
        options: [
          { text: "비가 안 와서 다행이야.", correct: true },
          { text: "비가 안 왔어서 다행이야." },
          { text: "비가 안 오니까 다행했어." },
        ],
        explanation:
          "Sebelum -아서/어서 nggak boleh ada bentuk lampau, walaupun kejadiannya udah lewat. Jadi 안 와서 다행이야, bukan 안 왔어서.",
      },
      {
        key: "untung-laba",
        prompt:
          'Temen yang jualan online cerita: "Hari ini untung banyak!" Maksudnya laba. Bilangnya?',
        options: [
          { text: "오늘 장사 잘됐어!", correct: true },
          { text: "오늘 장사가 다행이야!" },
          { text: "다행히 오늘 장사했어!" },
        ],
        explanation:
          "Untung yang artinya laba itu urusan duit, jadi pakai 장사 잘됐어. 다행 cuma buat rasa lega.",
      },
      {
        key: "sayang-dibuang",
        prompt:
          'Nasi sisa masih bagus. "Sayang kalau dibuang." Pilih kata yang pas.',
        options: [
          { text: "버리기 아까워.", correct: true },
          { text: "버리기 아쉬워." },
          { text: "아쉽게도 버려." },
        ],
        explanation:
          "Sayang karena barang, duit, atau waktu kebuang itu 아깝다. 아쉽다 dipakai buat rasa kecewa karena ada yang kurang.",
      },
    ],
  },
});
