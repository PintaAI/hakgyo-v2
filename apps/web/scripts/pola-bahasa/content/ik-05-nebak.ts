import { b, callout, defineBab, ex, grammar, h3, i, p, ref } from "../blocks";

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
  key: "ik-05-nebak",
  materials: {
    "ik-kayaknya": {
      description:
        "Kayaknya dalam bahasa Korea punya beberapa bentuk, tergantung seberapa yakin kamu dan dari mana kamu nebak.",
      blocks: [
        grammar({
          number: "01",
          theme: "blue",
          title: "kayaknya → -것 같아",
          descriptionKo:
            "무엇을 보고 짐작하는지, 얼마나 확실한지에 따라 다른 표현을 써요.",
          descriptionTranslation:
            "Kayaknya punya beberapa bentuk, tergantung kamu nebak dari mana dan seberapa yakin. Yang paling aman dan serbaguna: -(으)ㄴ/는 것 같아. Tiga bentuk lainnya buat situasi khusus.",
          rules: [
            r("Dugaan umum", "-(으)ㄴ/는 것 같아", "비가 올 것 같아."),
            r("Nebak dari tanda", "-나 봐 / -(으)ㄴ가 봐", "바쁜가 봐."),
            r("Kurang yakin", "-(으)ㄹ걸", "벌써 갔을걸."),
            r("Rasa atau perasaan, spontan", "-겠다", "맛있겠다!"),
          ],
          examples: [
            e("내일 추울 ", "것 같아요", "."),
            e("다들 우산을 들고 있네. 비가 ", "오나 봐", "."),
            e("12시간 일했어? 진짜 ", "피곤하겠다", "."),
          ],
          tipKo:
            "앞으로의 일은 -(으)ㄹ 것 같아, 지금의 일은 -는 것 같아로 말해요.",
          tipTranslation:
            "Nebak hal yang belum kejadian pakai -(으)ㄹ 것 같아 (비가 올 것 같아, kayaknya mau hujan). Nebak keadaan sekarang pakai -는 것 같아 (비가 오는 것 같아, kayaknya lagi hujan).",
        }),
        p(
          i(
            '"Kayaknya mau hujan." "Kayaknya dia lagi sibuk." "Kayaknya sih dia udah pulang."',
          ),
          " Satu kata, tapi yakinnya beda-beda. Gimana bilangnya?",
        ),
        p(
          "Pilihan aman: ",
          ref("-(으)ㄴ/는 것 같아", "ki-geot-gatda"),
          ". Nebak dari tanda yang kelihatan: ",
          ref("-나 봐", "ki-na-bwa"),
          ". Kurang yakin: ",
          ref("-(으)ㄹ걸", "ki-eulgeol"),
          ". Nebak rasa atau perasaan secara spontan: ",
          ref("-겠다", "ki-getda"),
          ".",
        ),
        h3("Contoh"),
        ex("이 옷 좀 작은 것 같아요.", "Kayaknya baju ini agak kekecilan."),
        ex(
          "민수 씨가 오늘 바쁜가 봐요.",
          "Kayaknya Minsu lagi sibuk hari ini.",
          "dia nggak bales chat",
        ),
        ex("아마 내일 쉬는 날일걸요.", "Kayaknya sih besok libur."),
        ex("와, 이 라면 진짜 맵겠다.", "Wah, ramen ini kayaknya pedes banget."),
        callout(
          "warning",
          b("Jebakan: lihat makanan, belum nyicip."),
          " Kalau baru lihat foto atau makanannya, bilang ",
          b("맛있겠다!"),
          " Kalau udah nyicip dan mau menilai, baru ",
          b("맛있는 것 같아."),
          " Kalau kebalik, kedengerannya aneh.",
        ),
        callout(
          "tip",
          "Nebaknya sambil cemas? Cek ",
          ref("jangan-jangan", "ik-jangan-jangan"),
          ". Kalau tebakanmu terbukti bener, lanjut ke ",
          ref("ternyata", "ik-ternyata"),
          ".",
        ),
      ],
    },
    "ik-jangan-jangan": {
      description:
        "Jangan-jangan itu nebak sambil cemas, bukan larangan. Bahasa Koreanya 혹시 atau 설마.",
      blocks: [
        grammar({
          number: "02",
          theme: "blue",
          title: "jangan-jangan → 혹시, 설마",
          descriptionKo: "걱정하면서 짐작할 때 혹시나 설마를 써요.",
          descriptionTranslation:
            "Jangan-jangan itu nebak sambil cemas, bukan larangan. Taruh 혹시 di depan, lalu tutup kalimatnya dengan -(으)ㄴ/는 거 아니야? Kalau kamu takut hal buruk dan berharap itu nggak bener, pakai 설마.",
          rules: [
            r(
              "Nebak sambil cemas",
              "혹시 -(으)ㄴ 거 아니야?",
              "혹시 잊어버린 거 아니야?",
            ),
            r(
              "Ke orang yang lebih tua",
              "혹시 -(으)신 거 아니에요?",
              "혹시 화나신 거 아니에요?",
            ),
            r(
              "Takut hal buruk",
              "설마 -(으)ㄴ/는 건 아니겠지?",
              "설마 벌써 끝난 건 아니겠지?",
            ),
            r("Nggak percaya", "설마!", "설마! 진짜?"),
          ],
          examples: [
            e("", "혹시", " 걔 잊어버린 거 아니야?"),
            e("", "설마", " 벌써 끝난 건 아니겠지?"),
            e("", "혹시", " 저한테 화나신 거 아니에요?"),
          ],
          tipKo: "혹시는 '혹시 시간 있어요?'처럼 부드럽게 물어볼 때도 써요.",
          tipTranslation:
            '혹시 juga dipakai buat nanya dengan halus, kayak "kira-kira ada waktu?": 혹시 시간 있어요?',
        }),
        p(
          i('"Jangan-jangan dia lupa."'),
          " Kamu lagi nebak, tapi sambil cemas. Gimana bilangnya?",
        ),
        p(
          "Dua-duanya ada di ",
          ref("혹시 / 설마", "ki-hoksi"),
          ". 혹시 buat tebakan yang bikin cemas, 설마 buat hal buruk yang kamu harap nggak kejadian. Ujungnya biasanya ",
          b("-(으)ㄴ/는 거 아니야?"),
        ),
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
        ex("설마 오늘 또 야근이야?", "Masa sih hari ini lembur lagi?"),
        callout(
          "warning",
          b('Jebakan: "jangan" di sini bukan larangan.'),
          " Jangan langsung pakai ",
          b("-지 마"),
          ". ",
          i("Jangan-jangan"),
          " itu tebakan, jadi pakai ",
          b("혹시 / 설마"),
          " lalu tutup kalimatnya dengan ",
          b("-(으)ㄴ/는 거 아니야?"),
        ),
        callout(
          "tip",
          "Nebaknya biasa aja, tanpa cemas? Pakai ",
          ref("kayaknya", "ik-kayaknya"),
          ". Kalau tebakanmu ternyata bener dan semuanya jadi masuk akal, cek ",
          ref("pantesan", "ik-pantesan"),
          ".",
        ),
      ],
    },
    "ik-ternyata": {
      description:
        "Ternyata jarang jadi satu kata dalam bahasa Korea. Biasanya cukup akhiran -네 atau -더라, atau 알고 보니 buat plot twist.",
      blocks: [
        grammar({
          number: "03",
          theme: "blue",
          title: "ternyata → -네, 알고 보니, -더라",
          descriptionKo:
            "새로 알게 된 사실을 말할 때, 어떻게 알게 됐는지에 따라 다른 표현을 써요.",
          descriptionTranslation:
            "Ternyata jarang jadi satu kata di Korea. Baru sadar sekarang: tempel -네. Cerita hal yang kamu lihat sendiri waktu itu: -더라. Plot twist setelah tahu faktanya: 알고 보니.",
          rules: [
            r("Baru sadar sekarang", "-네", "맛있네!"),
            r("Cerita yang kamu lihat sendiri", "-더라", "문 닫았더라."),
            r(
              "Fakta di balik cerita",
              "알고 보니",
              "알고 보니 사장님 아들이었어.",
            ),
            r("Beda dari dugaan", "생각보다", "생각보다 쉬웠어."),
            r("Dengar dari orang lain", "-대", "내일 쉰대!"),
          ],
          examples: [
            e("와, 한국어 진짜 ", "잘하네", "!"),
            e("어제 가 봤는데 문 ", "닫았더라", "."),
            e("", "알고 보니", " 사장님 아들이었어."),
          ],
        }),
        p(
          i(
            '"Ternyata enak!" "Ternyata dia anaknya bos." "Kemarin ke sana, ternyata tutup."',
          ),
          " Tiga kalimat, tiga rasa ternyata. Gimana bilangnya?",
        ),
        p(
          "Baru sadar sekarang: ",
          ref("-네", "ki-neyo"),
          ". Cerita yang kamu lihat sendiri: ",
          ref("-더라", "ki-deora"),
          ". Fakta yang bikin cerita jadi beda: ",
          ref("알고 보니", "ki-algo-boni"),
          ". Kalau infonya dari orang lain: ",
          ref("-대", "ki-daeyo"),
          ".",
        ),
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
        ex(
          "시험이 생각보다 어려웠어요.",
          "Ternyata ujiannya lebih susah dari dugaanku.",
        ),
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
        callout(
          "tip",
          "Faktanya sekalian ngejelasin hal aneh yang tadi kamu rasain? Itu ",
          ref("pantesan", "ik-pantesan"),
          ". Kalau belum pasti dan masih nebak: ",
          ref("kayaknya", "ik-kayaknya"),
          ".",
        ),
      ],
    },
    "ik-pantesan": {
      description:
        "Pantesan dipakai waktu kamu baru tahu alasan dari hal aneh yang tadi kamu rasain. Bahasa Koreanya 어쩐지 ... -더라.",
      blocks: [
        grammar({
          number: "04",
          theme: "blue",
          title: "pantesan → 어쩐지",
          descriptionKo:
            "이상하다고 느꼈던 일의 이유를 알게 됐을 때 어쩐지를 써요.",
          descriptionTranslation:
            "Pantesan dipakai waktu kamu baru tahu alasan dari hal yang tadi terasa aneh. Sebut alasannya dulu, lalu 어쩐지 + hal aneh tadi, ditutup -더라. Buat reaksi pendek, cukup 그래서 그랬구나.",
          rules: [
            r("Santai", "어쩐지 -더라", "어쩐지 사람이 많더라."),
            r("Sopan", "어쩐지 -더라고요", "어쩐지 사람이 많더라고요."),
            r("Reaksi pendek", "그래서 그랬구나", "아, 그래서 그랬구나."),
          ],
          examples: [
            e("아, 세일하는구나. ", "어쩐지", " 사람이 많더라."),
            e("비 왔어? ", "어쩐지", " 시원하더라."),
          ],
        }),
        p(
          i('"Oh, lagi diskon. Pantesan rame."'),
          " Tadi kamu udah ngerasa aneh, terus baru tahu alasannya. Gimana bilangnya?",
        ),
        p(
          "Kuncinya ",
          ref("어쩐지", "ki-eojjeonji"),
          ", lalu ditutup ",
          ref("-더라", "ki-deora"),
          " karena kamu nyeritain hal yang tadi kamu lihat sendiri. Kalau orang lain yang ngasih penjelasan, reaksi pendeknya pakai ",
          ref("-구나", "ki-gunyo"),
          ": ",
          b("아, 그래서 그랬구나."),
        ),
        h3("Contoh"),
        ex(
          "아, 세일하는구나. 어쩐지 사람이 많더라.",
          "Oh, lagi diskon. Pantesan rame.",
        ),
        ex(
          "오늘 월급날이구나. 어쩐지 다들 기분이 좋더라.",
          "Oh, hari ini gajian. Pantesan semua pada seneng.",
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
        callout(
          "tip",
          "Faktanya bikin kaget, bukan ngejelasin hal aneh? Pakai ",
          ref("ternyata", "ik-ternyata"),
          ".",
        ),
      ],
    },
    "ik-untung": {
      description:
        "Untung yang artinya lega dibilang dengan 다행이다: alasannya pakai -아서/어서, lalu ditutup 다행이야.",
      blocks: [
        grammar({
          number: "05",
          theme: "blue",
          title: "untung → -아서 다행이야",
          descriptionKo:
            "나쁜 일이 생기지 않아서 마음이 놓일 때 다행이다를 써요.",
          descriptionTranslation:
            "Untung yang artinya lega pakai 다행이다. Alasannya ditempel -아서/어서, lalu ditutup 다행이야. Buat cerita, taruh 다행히 (untungnya) di awal kalimat.",
          rules: [
            r("Alasan + lega", "-아서/어서 다행이야", "안 늦어서 다행이야."),
            r("Sopan", "-아서/어서 다행이에요", "괜찮아서 다행이에요."),
            r("Cerita", "다행히", "다행히 비가 안 왔어."),
            r("Reaksi", "다행이다! / 다행이네요", "아, 다행이다!"),
          ],
          examples: [
            e("비가 안 ", "와서 다행이야", "."),
            e("", "다행히", " 비가 그쳤어요."),
            e("네가 ", "있어서 다행이야", "."),
          ],
          tipKo: "-아서/어서 앞에는 과거형을 쓰지 않아요.",
          tipTranslation:
            "Sebelum -아서 jangan pakai lampau, walaupun kejadiannya udah lewat: 안 와서 다행이야, bukan 안 왔어서.",
        }),
        p(
          i('"Untung nggak hujan."'),
          " Kamu lega karena hal buruk nggak kejadian. Gimana bilangnya?",
        ),
        p(
          "Pakai ",
          ref("다행이다 / 다행히", "ki-dahaeng"),
          ". Alasannya ditempel ",
          ref("-아서/어서", "ki-aseo-karena"),
          ", jadi rumusnya ",
          b("alasan + -아서 다행이야"),
          ".",
        ),
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
        callout(
          "tip",
          "Kebalikannya, kalau hasilnya bikin kecewa: ",
          ref("sayangnya", "ik-sayangnya"),
          ". Kalau hal buruknya nyaris kejadian: ",
          ref("hampir", "ik-hampir"),
          ".",
        ),
      ],
    },
    "ik-sayangnya": {
      description:
        "Sayangnya buat nyampein kabar kurang enak atau rasa kecewa: 아쉽게도 dan 아쉽다.",
      blocks: [
        grammar({
          number: "06",
          theme: "blue",
          title: "sayangnya → 아쉽게도",
          descriptionKo: "아쉬운 소식을 부드럽게 전할 때 아쉽게도를 써요.",
          descriptionTranslation:
            "Sayangnya dipakai buat nyampein kabar kurang enak dengan halus: taruh 아쉽게도 di awal kalimat. Kalau mau nunjukin rasa kecewanya, pakai 아쉽다.",
          rules: [
            r("Kabar kurang enak", "아쉽게도", "아쉽게도 못 가요."),
            r("Rasa kecewa", "-아서/어서 아쉬워", "못 와서 아쉬웠어."),
            r("Reaksi pendek", "아쉽다 / 아쉽네요", "아, 아쉽다."),
            r("Sayang kalau kebuang", "아깝다", "버리기 아까워."),
          ],
          examples: [
            e("", "아쉽게도", " 오늘은 자리가 없습니다."),
            e("시간이 없어서 ", "아쉽네요", "."),
          ],
        }),
        p(
          i('"Sayangnya aku nggak bisa dateng."'),
          " Kamu nyampein kabar yang kurang enak dengan halus. Gimana bilangnya?",
        ),
        p(
          "Dua-duanya ada di ",
          ref("아쉽게도 / 아쉽다", "ki-aswipgedo"),
          ". 아쉽게도 buat nyampein kabarnya, 아쉽다 buat rasa kecewamu sendiri.",
        ),
        h3("Contoh"),
        ex(
          "아쉽게도 이번 주말에는 일이 있어서 못 가요.",
          "Sayangnya akhir pekan ini aku ada kerjaan, jadi nggak bisa dateng.",
        ),
        ex("네가 못 와서 아쉬웠어.", "Sayang banget kamu nggak dateng."),
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
        callout(
          "tip",
          "Kebalikannya, kalau hasilnya bikin lega: ",
          ref("untung", "ik-untung"),
          ". Kalau nyesel karena kamu sendiri yang salah: ",
          ref("harusnya", "ik-harusnya"),
          ".",
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
          id: "Sayangnya akhir pekan ini aku nggak bisa dateng.",
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
