import { b, callout, defineBab, ex, h3, i, p, ref, table } from "../blocks";

export default defineBab({
  key: "ik-07-nggak-sengaja",
  materials: {
    "ik-ke-an-rumus": {
      description:
        "Bahasa Korea nggak punya imbuhan ke- atau ter-. Rumusnya: 나도 모르게 / 실수로 / 깜빡 + -아/어 버렸어.",
      blocks: [
        p(
          i('"Aduh, kehapus!" "Kepencet!" "Keketawa!"'),
          " Bahasa Indonesia cukup tempel ke- atau ter-. Bahasa Korea nggak punya imbuhan kayak gitu. Gimana bilangnya?",
        ),
        table([
          ["Korea", "Nuansa"],
          [
            ref("나도 모르게", "ki-kkamppak"),
            'Tanpa sadar, "aku sendiri nggak tahu". Buat gerakan atau perasaan.',
          ],
          [
            ref("실수로", "ki-kkamppak"),
            "Nggak sengaja, karena salah atau ceroboh.",
          ],
          [ref("깜빡", "ki-kkamppak"), "Sekejap lupa atau lengah."],
          [
            ref("-아/어 버렸어", "ki-a-beorida"),
            "Akhiran yang ngasih rasa terlanjur, yah udah kejadian.",
          ],
        ]),
        h3("Contoh"),
        ex("실수로 사진을 지워 버렸어.", "Fotonya kehapus."),
        ex(
          "나도 모르게 웃어 버렸어.",
          "Aku keketawa.",
          "padahal nggak boleh ketawa",
        ),
        ex("잘못 눌렀어요.", "Kepencet, Kak.", "잘못 = salah"),
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
          ". Satu atau dua bahan biasanya udah cukup.",
        ),
      ],
    },
    "ik-ketiduran": {
      description:
        "Ketiduran = 잠들어 버렸어 atau 나도 모르게 잠들었어. Kesiangan punya kata sendiri: 늦잠 자다.",
      blocks: [
        p(
          i('"Sorry baru bales, tadi ketiduran."'),
          " Kalimat wajib anak chat jam dua pagi. Gimana bilangnya?",
        ),
        table([
          ["Korea", "Nuansa"],
          [
            ref("잠들어 버렸어.", "ki-a-beorida"),
            "Nggak niat tidur, eh tidur. Paling umum.",
          ],
          [
            ref("나도 모르게 잠들었어.", "ki-kkamppak"),
            "Tanpa sadar ketiduran.",
          ],
          [
            ref("깜빡 잠들었어.", "ki-kkamppak"),
            "Ketiduran sebentar, lengah sekejap.",
          ],
          [b("늦잠 잤어."), "Ketiduran sampai kesiangan."],
          [
            b("수업 시간에 졸았어."),
            "Tidur-tidur ayam, kepala ngangguk-ngangguk.",
          ],
        ]),
        h3("Contoh"),
        ex("미안, 버스에서 잠들어 버렸어.", "Sorry, aku ketiduran di bus."),
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
      ],
    },
    "ik-kelupaan": {
      description:
        "Kelupaan ngelakuin sesuatu = 깜빡했어. Barang ketinggalan punya bentuk sendiri: 놓고 왔어 / 두고 왔어.",
      blocks: [
        p(
          i('"Eh, kelupaan!"'),
          " Lupa ngabarin, lupa bawa dompet, lupa nama orang. Bahasa Korea beda-beda tergantung lupanya. Gimana bilangnya?",
        ),
        table([
          ["Korea", "Nuansa"],
          [
            ref("깜빡했어.", "ki-kkamppak"),
            "Lupa sebentar. Ringan, pas buat minta maaf.",
          ],
          [
            ref("약 먹는 걸 깜빡했어.", "ki-kkamppak"),
            "Lupa ngelakuin sesuatu: kata kerja + -는 걸 깜빡했어.",
          ],
          [
            b("지갑을 집에 놓고 왔어."),
            "Barang ketinggalan (aku taruh, terus pergi).",
          ],
          [b("이름이 기억이 안 나요."), "Nggak inget sama sekali."],
        ]),
        h3("Contoh"),
        ex("아, 깜빡했다!", "Ah, kelupaan!", "ngomong ke diri sendiri"),
        ex(
          "미안, 답장하는 걸 깜빡했어.",
          "Sorry, aku kelupaan bales chat kamu.",
        ),
        ex("문 잠그는 거 깜빡했어요.", "Aku kelupaan ngunci pintu."),
        ex("버스에 우산을 두고 내렸어요.", "Payungku ketinggalan di bus."),
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
      ],
    },
    "ik-keceplosan": {
      description:
        "Keceplosan = 나도 모르게 말해 버렸어. Ke atasan, ganti 나 jadi 저: 저도 모르게.",
      blocks: [
        p(
          i('"Duh, aku keceplosan cerita ke dia."'),
          " Rahasia temen, kejutan ulang tahun, atau tiba-tiba ngomong 반말 ke 사장님. Gimana bilangnya?",
        ),
        table([
          ["Korea", "Nuansa"],
          [
            ref("나도 모르게 말해 버렸어.", "ki-kkamppak"),
            "Keceplosan cerita. Paling umum.",
          ],
          [
            ref("비밀을 말해 버렸어.", "ki-a-beorida"),
            "Rahasianya udah terlanjur keluar.",
          ],
          [
            ref("저도 모르게 반말이 나왔어요.", "ki-kkamppak"),
            "Keceplosan pakai 반말. Versi sopan buat minta maaf.",
          ],
          [b("잘못 말했어요."), "Salah ngomong, mau ngoreksi."],
        ]),
        h3("Contoh"),
        ex(
          "나도 모르게 파티 얘기를 해 버렸어.",
          "Aku keceplosan bilang soal pestanya.",
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
      ],
    },
    "ik-kebawa": {
      description:
        "Barang kebawa = 실수로 가져왔어 / 가져갔어. Kebawa suasana atau perasaan = 나도 모르게.",
      blocks: [
        p(
          i('"Eh, pulpen kamu kebawa aku."'),
          " Atau ",
          i('"Nonton drakor, aku ikut kebawa nangis."'),
          " Gimana bilangnya?",
        ),
        table([
          ["Korea", "Nuansa"],
          [
            ref("실수로 가져왔어.", "ki-kkamppak"),
            "Barang kebawa ke tempat kamu sekarang.",
          ],
          [
            ref("실수로 집에 가져갔어요.", "ki-kkamppak"),
            "Barang kebawa pergi dari tempat kamu ngomong sekarang.",
          ],
          [
            ref("나도 모르게 따라 울었어.", "ki-kkamppak"),
            "Kebawa perasaan, ikut nangis.",
          ],
        ]),
        h3("Contoh"),
        ex(
          "네 볼펜을 실수로 가져왔어. 내일 줄게.",
          "Pulpenmu kebawa aku. Besok aku balikin.",
        ),
        ex(
          "죄송해요, 가게 열쇠를 집에 가져갔어요.",
          "Maaf, kunci toko kebawa pulang.",
          "ngomong di toko",
        ),
        ex(
          "드라마 보다가 나도 모르게 따라 울었어.",
          "Nonton drakor, aku ikut kebawa nangis.",
        ),
        ex("나도 모르게 화를 냈어. 미안해.", "Aku kebawa emosi. Maaf ya."),
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
      ],
    },
    "ik-pura-pura": {
      description:
        "Pura-pura cuma punya satu pola utama, -(으)ㄴ/는 척하다. Yang perlu diperhatiin cara nempelnya.",
      blocks: [
        p(
          i('"Dia pura-pura nggak denger."'),
          " Atau versi sindiran: ",
          i('"Sok sibuk banget sih."'),
          " Gimana bilangnya?",
        ),
        table([
          ["Korea", "Nuansa"],
          [
            ref("자는 척했어.", "ki-cheok"),
            "Kata kerja: -는 척. Pura-pura tidur.",
          ],
          [
            ref("못 들은 척했어.", "ki-cheok"),
            "Hal yang udah kejadian: -(으)ㄴ 척. Pura-pura nggak denger.",
          ],
          [
            ref("바쁜 척해.", "ki-cheok"),
            "Kata sifat: -(으)ㄴ 척. Pura-pura atau sok sibuk.",
          ],
          [
            ref("아는 척하지 마.", "ki-cheok"),
            '"Jangan sok tahu." 척 juga bisa berarti sok.',
          ],
        ]),
        h3("Contoh"),
        ex(
          "엄마가 불렀는데 자는 척했어.",
          "Mama manggil, aku pura-pura tidur.",
        ),
        ex("모르는 척하지 마.", "Jangan pura-pura nggak tahu."),
        ex(
          "괜찮은 척했지만 사실 너무 힘들었어.",
          "Aku pura-pura baik-baik aja, padahal capek banget.",
        ),
        ex("잘난 척 좀 하지 마.", "Nggak usah sok hebat deh."),
        callout(
          "warning",
          b("Jebakan: lampau ditaruh di 척하다."),
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
