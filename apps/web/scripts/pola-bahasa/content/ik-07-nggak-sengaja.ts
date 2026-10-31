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
  key: "ik-07-nggak-sengaja",
  materials: {
    "ik-ke-an-rumus": {
      description:
        "Bahasa Korea nggak punya imbuhan ke- atau ter-. Rumusnya: 나도 모르게 / 실수로 / 깜빡 + -아/어 버렸어.",
      blocks: [
        grammar({
          number: "01",
          theme: "blue",
          title: "ke-/ter- → 나도 모르게 + -아/어 버렸어",
          descriptionKo:
            "모르고 하거나 실수로 한 일은 나도 모르게, 실수로, 깜빡에 -아/어 버렸어를 붙여서 말해요.",
          descriptionTranslation:
            "Bahasa Korea nggak punya imbuhan ke- atau ter-. Gantinya, pakai kata keterangan (나도 모르게, 실수로, 깜빡, 잘못), plus akhiran -아/어 버렸어 yang ngasih rasa terlanjur.",
          rules: [
            r("Tanpa sadar", "나도 모르게", "나도 모르게 웃었어."),
            r("Nggak sengaja, ceroboh", "실수로", "실수로 지웠어."),
            r("Lupa sekejap", "깜빡", "깜빡 잊어버렸어."),
            r("Salah pencet, salah pilih", "잘못", "잘못 눌렀어요."),
            r("Rasa terlanjur", "-아/어 버렸어", "지워 버렸어."),
          ],
          examples: [
            e("", "실수로", " 사진을 지워 버렸어."),
            e("", "나도 모르게", " 웃어 버렸어."),
            e("", "잘못", " 눌렀어요."),
          ],
        }),
        p(
          i('"Aduh, kehapus!" "Kepencet!" "Keketawa!"'),
          " Bahasa Indonesia cukup tempel ke- atau ter-. Bahasa Korea nggak punya imbuhan kayak gitu. Gimana bilangnya?",
        ),
        p(
          "Pilih bahannya: ",
          ref("나도 모르게 / 실수로 / 깜빡", "ki-kkamppak"),
          " buat rasa nggak sengaja, lalu ",
          ref("-아/어 버리다", "ki-a-beorida"),
          " buat rasa terlanjur. Satu atau dua bahan biasanya udah cukup.",
        ),
        h3("Contoh"),
        ex("실수로 메시지를 지워 버렸어요.", "Pesannya kehapus."),
        ex(
          "나도 모르게 웃어 버렸어.",
          "Aku keketawa.",
          "padahal nggak boleh ketawa",
        ),
        ex("잘못 눌렀어요. 죄송해요.", "Kepencet, maaf."),
        ex("깜빡 잊어버렸어요.", "Kelupaan."),
        callout(
          "warning",
          b("Jebakan: 버렸어 doang belum tentu nggak sengaja."),
          " ",
          b("다 먹어 버렸어"),
          " bisa berarti ",
          i('"aku abisin semua"'),
          ", malah sengaja. Biar jelas nggak sengaja, tambah ",
          b("나도 모르게"),
          " atau ",
          b("실수로"),
          ".",
        ),
        callout(
          "tip",
          "Rumus ini dipakai satu per satu di ",
          ref("ketiduran", "ik-ketiduran"),
          ", ",
          ref("kelupaan", "ik-kelupaan"),
          ", ",
          ref("keceplosan", "ik-keceplosan"),
          ", dan ",
          ref("kebawa", "ik-kebawa"),
          ".",
        ),
      ],
    },
    "ik-ketiduran": {
      description:
        "Ketiduran = 잠들어 버렸어 atau 나도 모르게 잠들었어. Kesiangan punya kata sendiri: 늦잠 자다.",
      blocks: [
        grammar({
          number: "02",
          theme: "blue",
          title: "ketiduran → 잠들어 버렸어",
          descriptionKo:
            "자려고 하지 않았는데 잠이 들었을 때 잠들어 버렸어요라고 해요.",
          descriptionTranslation:
            "Ketiduran = nggak niat tidur, eh tidur. Bilangnya 잠들어 버렸어 atau 깜빡 잠들었어. Kesiangan punya kata sendiri: 늦잠 자다.",
          rules: [
            r("Nggak niat tidur", "잠들어 버렸어", "버스에서 잠들어 버렸어."),
            r("Ketiduran sebentar", "깜빡 잠들었어", "소파에서 깜빡 잠들었어."),
            r("Kesiangan", "늦잠 자다", "오늘 늦잠 잤어요."),
            r("Tidur-tidur ayam", "졸다", "수업 시간에 졸았어."),
          ],
          examples: [
            e("미안, 버스에서 ", "잠들어 버렸어", "."),
            e("소파에서 ", "깜빡 잠들었어요", "."),
            e("오늘 ", "늦잠 잤어요", "."),
          ],
        }),
        p(
          i('"Sorry baru bales, tadi ketiduran."'),
          " Kalimat wajib anak chat jam dua pagi. Gimana bilangnya?",
        ),
        p(
          "Pakai ",
          ref("-아/어 버리다", "ki-a-beorida"),
          " buat rasa terlanjur: ",
          b("잠들어 버렸어"),
          ". Atau tambah ",
          ref("깜빡 / 나도 모르게", "ki-kkamppak"),
          " di depan 잠들었어. Kalau ketidurannya bikin telat, sambung pakai ",
          ref("-는 바람에", "ki-neun-barame"),
          ".",
        ),
        h3("Contoh"),
        ex(
          "미안, 어제 너무 피곤해서 잠들어 버렸어.",
          "Sorry, kemarin capek banget, jadi ketiduran.",
        ),
        ex(
          "영화 보다가 나도 모르게 잠들었어요.",
          "Lagi nonton film, eh aku ketiduran.",
        ),
        ex(
          "죄송합니다. 깜빡 잠들었습니다.",
          "Maaf, saya ketiduran.",
          "formal, ke atasan atau dosen",
        ),
        ex(
          "늦잠 자는 바람에 지각했어요.",
          "Gara-gara kesiangan, aku telat masuk.",
        ),
        callout(
          "warning",
          b("Jebakan: 졸다 vs 졸리다."),
          " ",
          b("졸려"),
          " = ngantuk (perasaan). ",
          b("졸았어"),
          " = udah ketiduran ngangguk-ngangguk beneran. Mau bilang ",
          i('"aku ngantuk"'),
          ", pakai ",
          b("졸려"),
          ".",
        ),
        callout(
          "tip",
          "Rumus umumnya ada di ",
          ref("rumus ke-/ter-", "ik-ke-an-rumus"),
          ". Lupa ngelakuin sesuatu: ",
          ref("kelupaan", "ik-kelupaan"),
          ".",
        ),
      ],
    },
    "ik-kelupaan": {
      description:
        "Kelupaan ngelakuin sesuatu = 깜빡했어. Barang ketinggalan punya bentuk sendiri: 놓고 왔어 / 두고 왔어.",
      blocks: [
        grammar({
          number: "03",
          theme: "blue",
          title: "kelupaan → 깜빡했어",
          descriptionKo: "할 일을 잠깐 잊었을 때 깜빡했어요라고 해요.",
          descriptionTranslation:
            "Lupa sebentar yang ringan = 깜빡했어. Lupa ngelakuin sesuatu: kata kerja + -는 걸 깜빡했어. Barang ketinggalan punya bentuk sendiri: 놓고 왔어 atau 두고 왔어.",
          rules: [
            r("Lupa sebentar", "깜빡했어", "아, 깜빡했다!"),
            r("Lupa ngelakuin", "-는 걸 깜빡했어", "약 먹는 걸 깜빡했어."),
            r(
              "Barang ketinggalan",
              "놓고 왔어 / 두고 왔어",
              "지갑을 집에 놓고 왔어.",
            ),
            r(
              "Nggak inget sama sekali",
              "기억이 안 나",
              "이름이 기억이 안 나요.",
            ),
          ],
          examples: [
            e("미안, 답장하는 걸 ", "깜빡했어", "."),
            e("문 잠그는 거 ", "깜빡했어요", "."),
            e("우산을 버스에 ", "두고 내렸어요", "."),
          ],
        }),
        p(
          i('"Eh, kelupaan!"'),
          " Lupa ngabarin, lupa bawa dompet, lupa nama orang. Bahasa Korea beda-beda tergantung lupanya. Gimana bilangnya?",
        ),
        p(
          "Lupa yang ringan pakai ",
          ref("깜빡", "ki-kkamppak"),
          ". Buat barang ketinggalan, yang paling natural ",
          b("놓고 왔어"),
          " atau ",
          b("두고 왔어"),
          " (aku taruh, terus pergi).",
        ),
        h3("Contoh"),
        ex("아, 깜빡했다!", "Ah, kelupaan!", "ngomong ke diri sendiri"),
        ex("오늘 약 먹는 걸 깜빡했어요.", "Hari ini aku kelupaan minum obat."),
        ex("휴대폰을 사무실에 두고 왔어요.", "HP-ku ketinggalan di kantor."),
        ex("그 사람 이름이 기억이 안 나.", "Aku nggak inget nama orang itu."),
        callout(
          "warning",
          b("Jebakan: barang ketinggalan pakai 잊어버렸어."),
          " ",
          i('"Dompetku kelupaan di rumah"'),
          " jangan jadi ",
          b("지갑을 집에 잊어버렸어"),
          ". Buat barang yang ketinggalan, bilang ",
          b("놓고 왔어"),
          " atau ",
          b("두고 왔어"),
          ".",
        ),
        callout(
          "tip",
          "Barangnya malah kebawa, bukan ketinggalan? Cek ",
          ref("kebawa", "ik-kebawa"),
          ". Rumus umumnya: ",
          ref("rumus ke-/ter-", "ik-ke-an-rumus"),
          ".",
        ),
      ],
    },
    "ik-keceplosan": {
      description:
        "Keceplosan = 나도 모르게 말해 버렸어. Ke atasan, ganti 나 jadi 저: 저도 모르게.",
      blocks: [
        grammar({
          number: "04",
          theme: "blue",
          title: "keceplosan → 나도 모르게 말해 버렸어",
          descriptionKo:
            "말하면 안 되는 것을 모르고 말했을 때 나도 모르게 말해 버렸어요라고 해요.",
          descriptionTranslation:
            "Keceplosan = tanpa sadar ngomongin hal yang harusnya nggak diomongin. Bilangnya 나도 모르게 말해 버렸어. Ke atasan, ganti 나 jadi 저: 저도 모르게.",
          rules: [
            r(
              "Santai",
              "나도 모르게 말해 버렸어",
              "나도 모르게 민호한테 말해 버렸어.",
            ),
            r("Ke atasan", "저도 모르게", "저도 모르게 반말이 나왔어요."),
            r(
              "Salah sebut, mau ngoreksi",
              "잘못 말했어요",
              "잘못 말했어요. 수요일이에요.",
            ),
          ],
          examples: [
            e("나도 모르게 ", "말해 버렸어", "."),
            e("죄송해요, ", "저도 모르게", " 반말이 나왔어요."),
            e("", "잘못", " 말했어요."),
          ],
        }),
        p(
          i('"Duh, aku keceplosan cerita ke dia."'),
          " Rahasia temen, kejutan ulang tahun, atau tiba-tiba ngomong 반말 ke 사장님. Gimana bilangnya?",
        ),
        p(
          "Gabungin ",
          ref("나도 모르게", "ki-kkamppak"),
          " sama ",
          ref("-아/어 버렸어", "ki-a-beorida"),
          ": ",
          b("나도 모르게 말해 버렸어"),
          ". Kalau kamu cuma salah sebut, cukup ",
          b("잘못 말했어요"),
          ".",
        ),
        h3("Contoh"),
        ex(
          "나도 모르게 민호한테 비밀을 말해 버렸어.",
          "Aku keceplosan cerita rahasianya ke Minho.",
        ),
        ex(
          "미안, 나도 모르게 깜짝 파티 얘기를 해 버렸어.",
          "Sorry, aku keceplosan soal pesta kejutannya.",
        ),
        ex(
          "죄송합니다. 저도 모르게 반말이 나왔어요.",
          "Maaf, Pak, saya keceplosan pakai 반말.",
        ),
        ex(
          "잘못 말했어요. 화요일 아니고 수요일이에요.",
          "Salah ngomong. Bukan Selasa, tapi Rabu.",
        ),
        callout(
          "warning",
          b("Jebakan: 나도 모르게 ke atasan."),
          " Kalimatnya udah pakai -요, tapi 나 itu kata ganti santai. Ke 사장님 atau 반장님 ganti jadi ",
          b("저도 모르게"),
          ". Kalau nggak, kamu minta maaf karena 반말 sambil... pakai 반말 lagi.",
        ),
        callout(
          "tip",
          "Rumus umumnya: ",
          ref("rumus ke-/ter-", "ik-ke-an-rumus"),
          ". Kebawa emosi sampai ngomong kasar? Cek ",
          ref("kebawa", "ik-kebawa"),
          ".",
        ),
      ],
    },
    "ik-kebawa": {
      description:
        "Barang kebawa = 실수로 가져왔어 / 가져갔어. Kebawa suasana atau perasaan = 나도 모르게.",
      blocks: [
        grammar({
          number: "05",
          theme: "blue",
          title: "kebawa → 실수로 가져왔어",
          descriptionKo:
            "남의 물건을 실수로 가지고 왔을 때 실수로 가져왔어요라고 해요.",
          descriptionTranslation:
            "Barang kebawa = 실수로 가져왔어 atau 가져갔어, tergantung kamu lagi di mana. Kebawa suasana atau perasaan beda lagi: pakai 나도 모르게.",
          rules: [
            r(
              "Kebawa ke sini",
              "실수로 가져왔어",
              "네 볼펜을 실수로 가져왔어.",
            ),
            r(
              "Kebawa pergi dari sini",
              "실수로 가져갔어",
              "열쇠를 집에 가져갔어요.",
            ),
            r("Kebawa perasaan", "나도 모르게", "나도 모르게 따라 울었어."),
            r(
              "Kebawa emosi",
              "나도 모르게 화를 냈어",
              "미안, 나도 모르게 화냈어.",
            ),
          ],
          examples: [
            e("미안, 네 우산을 ", "실수로 가져왔어", "."),
            e("가게 열쇠를 ", "실수로", " 집에 가져갔어요."),
            e("", "나도 모르게", " 화를 냈어. 미안해."),
          ],
        }),
        p(
          i('"Eh, pulpen kamu kebawa aku."'),
          " Atau ",
          i('"Nonton drakor, aku ikut kebawa nangis."'),
          " Gimana bilangnya?",
        ),
        p(
          "Barang kebawa pakai ",
          ref("실수로", "ki-kkamppak"),
          " + 가져왔어 atau 가져갔어. Kebawa perasaan pakai ",
          ref("나도 모르게", "ki-kkamppak"),
          ".",
        ),
        h3("Contoh"),
        ex(
          "네 볼펜을 실수로 가져왔어. 내일 줄게.",
          "Pulpenmu kebawa aku. Besok aku balikin.",
        ),
        ex(
          "죄송해요, 어제 가게 열쇠를 집에 가져갔어요.",
          "Maaf, kemarin kunci toko kebawa pulang.",
          "ngomong di toko",
        ),
        ex(
          "드라마 보다가 나도 모르게 따라 울었어.",
          "Nonton drakor, aku ikut kebawa nangis.",
        ),
        ex(
          "친구들이 다 웃어서 나도 따라 웃었어.",
          "Temen-temen pada ketawa, aku jadi kebawa ketawa.",
        ),
        callout(
          "warning",
          b("Jebakan: 가져오다 atau 가져가다?"),
          " Lihat kamu lagi di mana. ",
          b("가져오다"),
          " = barangnya datang ke tempat kamu ngomong sekarang. ",
          b("가져가다"),
          " = barangnya pergi dari sini. Di rumah: ",
          b("열쇠를 집에 가져왔어"),
          ". Di toko: ",
          b("열쇠를 집에 가져갔어요"),
          ".",
        ),
        callout(
          "tip",
          "Barangnya malah ketinggalan? Itu ",
          ref("kelupaan", "ik-kelupaan"),
          " (놓고 왔어). Rumus umumnya: ",
          ref("rumus ke-/ter-", "ik-ke-an-rumus"),
          ".",
        ),
      ],
    },
    "ik-pura-pura": {
      description:
        "Pura-pura cuma punya satu pola utama, -(으)ㄴ/는 척하다. Yang perlu diperhatiin cara nempelnya.",
      blocks: [
        grammar({
          number: "06",
          theme: "blue",
          title: "pura-pura → -(으)ㄴ/는 척하다",
          descriptionKo:
            "사실이 아닌데 그런 것처럼 행동할 때 -(으)ㄴ/는 척하다를 써요.",
          descriptionTranslation:
            "Pura-pura cuma punya satu pola utama: -(으)ㄴ/는 척하다. Yang perlu diperhatiin cara nempelnya: kata kerja pakai -는 척, kata sifat dan hal yang udah kejadian pakai -(으)ㄴ 척. 척 juga bisa berarti sok.",
          rules: [
            r("Kata kerja", "-는 척", "자는 척했어."),
            r("Udah kejadian", "-(으)ㄴ 척", "못 들은 척했어."),
            r("Kata sifat", "-(으)ㄴ 척", "바쁜 척해."),
            r("Sok", "-(으)ㄴ/는 척하지 마", "아는 척하지 마."),
          ],
          examples: [
            e("엄마가 불렀는데 ", "자는 척했어", "."),
            e("", "괜찮은 척했지만", " 사실 너무 힘들었어."),
            e("", "아는 척하지", " 마."),
          ],
        }),
        p(
          i('"Dia pura-pura nggak denger."'),
          " Atau versi sindiran: ",
          i('"Sok sibuk banget sih."'),
          " Gimana bilangnya?",
        ),
        p(
          "Polanya satu: ",
          ref("-(으)ㄴ/는 척하다", "ki-cheok"),
          ". Lampaunya ditaruh di 척했어, bukan di kata kerja depannya.",
        ),
        h3("Contoh"),
        ex("못 들은 척하지 마.", "Jangan pura-pura nggak denger."),
        ex("모르는 척했어요.", "Aku pura-pura nggak tahu."),
        ex("걔는 맨날 바쁜 척해.", "Dia tiap hari sok sibuk."),
        ex("잘난 척 좀 하지 마.", "Nggak usah sok hebat deh."),
        callout(
          "warning",
          b("Jebakan: lampau ditaruh di kata kerja depan."),
          " ",
          b("자는 척했어"),
          ", bukan ",
          b("잤는 척했어"),
          ". Lampaunya cukup di ",
          b("했어"),
          ". Pengecualian cuma buat hal yang udah kejadian, kayak ",
          b("못 들은 척"),
          " dan ",
          b("못 본 척"),
          ".",
        ),
        callout(
          "tip",
          "Pura-pura itu sengaja. Yang beneran nggak sengaja ada di ",
          ref("rumus ke-/ter-", "ik-ke-an-rumus"),
          ".",
        ),
      ],
    },
  },
  vocabulary: {
    title: "Kosakata: nggak sengaja dan pura-pura",
    description:
      "Rumus ke-/ter- versi Korea, empat kejadian nggak sengaja, dan pura-pura.",
    entries: [
      {
        term: "나도 모르게 -아/어 버렸어",
        meanings: ["nggak sengaja", "tanpa sadar ke-/ter-"],
        example: { ko: "나도 모르게 웃어 버렸어.", id: "Aku keketawa." },
      },
      {
        term: "잠들어 버렸어",
        meanings: ["ketiduran"],
        example: {
          ko: "미안, 버스에서 잠들어 버렸어.",
          id: "Sorry, aku ketiduran di bus.",
        },
      },
      {
        term: "깜빡했어",
        meanings: ["kelupaan", "lupa sebentar"],
        example: {
          ko: "답장하는 걸 깜빡했어요.",
          id: "Aku kelupaan bales chat.",
        },
      },
      {
        term: "나도 모르게 말해 버렸어",
        meanings: ["keceplosan"],
        example: {
          ko: "나도 모르게 파티 얘기를 해 버렸어.",
          id: "Aku keceplosan bilang soal pestanya.",
        },
      },
      {
        term: "실수로 가져왔어",
        meanings: ["kebawa", "nggak sengaja kebawa"],
        example: {
          ko: "네 볼펜을 실수로 가져왔어.",
          id: "Pulpenmu kebawa aku.",
        },
      },
      {
        term: "-(으)ㄴ/는 척하다",
        meanings: ["pura-pura", "sok"],
        example: { ko: "못 들은 척했어요.", id: "Aku pura-pura nggak denger." },
      },
    ],
  },
  quiz: {
    title: "Kuis: nggak sengaja dan pura-pura",
    description:
      "Sepuluh soal: ketiduran, kelupaan, keceplosan, kebawa, sampai pura-pura. Pilih yang paling natural.",
    passingScore: 70,
    questions: [
      {
        key: "rumus-kehapus",
        prompt:
          'Foto penting kamu kehapus gara-gara salah pencet. "Fotonya kehapus."',
        options: [
          { text: "실수로 사진을 지워 버렸어.", correct: true },
          { text: "사진을 지웠어." },
          { text: "사진을 지우려고 했어." },
        ],
        explanation:
          "실수로 + -아/어 버렸어 bikin jelas kamu nggak sengaja. 지웠어 doang kesannya kamu sengaja hapus, dan -려고 했어 artinya 'tadinya mau hapus'.",
      },
      {
        key: "ketiduran-bestie",
        prompt:
          'Bestie nge-chat jam 11 malem, kamu baru bales pagi. "Sorry, aku ketiduran."',
        options: [
          { text: "미안, 잠들어 버렸어.", correct: true },
          { text: "미안, 졸려." },
          { text: "미안, 늦잠 잤어." },
        ],
        explanation:
          "Ketiduran pas nggak niat tidur = 잠들어 버렸어. 졸려 artinya 'aku ngantuk', dan 늦잠 잤어 artinya kesiangan.",
      },
      {
        key: "ngantuk",
        prompt: 'Kamu mau bilang ke temen sekelas: "Aku ngantuk banget."',
        options: [
          { text: "너무 졸려.", correct: true },
          { text: "너무 졸았어." },
          { text: "너무 잠들었어." },
        ],
        explanation:
          "졸리다 = ngantuk (perasaan). 졸았어 artinya kamu udah ketiduran ngangguk-ngangguk beneran. Beda tipis, tapi maknanya jauh.",
      },
      {
        key: "kelupaan-chat",
        prompt: 'Kamu lupa bales chat temen. "Sorry, aku kelupaan bales."',
        options: [
          { text: "미안, 답장하는 걸 깜빡했어.", correct: true },
          { text: "미안, 답장을 몰랐어." },
          { text: "미안, 답장하는 걸 놓고 왔어." },
        ],
        explanation:
          "Lupa ngelakuin sesuatu = kata kerja + -는 걸 깜빡했어. 몰랐어 itu nggak tahu, dan 놓고 왔어 cuma buat barang yang ketinggalan.",
      },
      {
        key: "dompet-ketinggalan",
        prompt: '"Dompetku ketinggalan di rumah." Pilih yang paling natural.',
        options: [
          { text: "지갑을 집에 놓고 왔어.", correct: true },
          { text: "지갑을 집에 잊어버렸어." },
          { text: "지갑을 집에 가져갔어." },
        ],
        explanation:
          "Barang ketinggalan = 놓고 왔어 / 두고 왔어. 잊어버렸어 kedengeran aneh buat barang, dan 가져갔어 malah artinya kebawa.",
      },
      {
        key: "keceplosan-banmal",
        prompt:
          "Lagi seru ngobrol, kamu keceplosan pakai 반말 ke 사장님. Minta maaf yang paling pas:",
        options: [
          { text: "죄송합니다. 저도 모르게 반말이 나왔어요.", correct: true },
          { text: "죄송합니다. 나도 모르게 반말이 나왔어요." },
          { text: "미안, 반말 해 버렸어." },
        ],
        explanation:
          "Ke atasan pakai 저도 모르게, bukan 나도 모르게. Versi 미안 ... 버렸어 itu 반말 lagi, auto makin salah.",
      },
      {
        key: "keceplosan-rahasia",
        prompt:
          "Rahasia temenmu nggak sengaja kamu ceritain ke Minho. Mana yang bikin jelas kamu nggak niat?",
        options: [
          { text: "나도 모르게 민호한테 말해 버렸어.", correct: true },
          { text: "민호한테 말했어." },
          { text: "민호한테 말하려고 했어." },
        ],
        explanation:
          "나도 모르게 + -아/어 버렸어 = keceplosan. 말했어 doang kesannya kamu sengaja bocorin, dan -려고 했어 artinya 'tadinya mau bilang'.",
      },
      {
        key: "kebawa-arah",
        prompt:
          'Kamu lagi di toko, ngaku ke 점장님: "Kemarin kunci toko kebawa pulang."',
        options: [
          { text: "어제 가게 열쇠를 집에 가져갔어요.", correct: true },
          { text: "어제 가게 열쇠를 집에 가져왔어요." },
          { text: "어제 가게 열쇠를 집에 데려갔어요." },
        ],
        explanation:
          "Kamu ngomong di toko dan kuncinya pergi dari sini, jadi 가져가다. 가져오다 dipakai kalau kamu lagi di rumah, dan 데려가다 cuma buat orang.",
      },
      {
        key: "pura-pura-tidur",
        prompt: '"Kemarin aku pura-pura tidur." Mana yang bener?',
        options: [
          { text: "어제 자는 척했어.", correct: true },
          { text: "어제 잤는 척했어." },
          { text: "어제 자는 척해." },
        ],
        explanation:
          "Lampaunya cukup di 척했어, bagian depannya tetap -는: 자는 척했어. 잤는 척 itu salah bentuk, dan 척해 bentuk sekarang.",
      },
      {
        key: "sok-tahu",
        prompt:
          'Temen sok tahu soal drakor yang belum dia tonton. "Jangan sok tahu deh."',
        options: [
          { text: "아는 척하지 마.", correct: true },
          { text: "알아 버리지 마." },
          { text: "아는 것 같지 마." },
        ],
        explanation:
          "척하다 juga bisa berarti sok: 아는 척하다 = sok tahu. Tambah -지 마 buat 'jangan'.",
      },
    ],
  },
});
