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
  key: "ik-06-waktu",
  materials: {
    "ik-udah": {
      description:
        "Udah yang biasa cukup pakai bentuk lampau. 벌써 buat udah yang bikin kaget, 이미 buat udah dari tadi.",
      blocks: [
        p(
          i('"Udah makan?" "Udah jam sepuluh?!" "Aku udah tahu kok."'),
          " Tiga-tiganya pakai udah, tapi rasanya beda. Gimana bilangnya?",
        ),
        table([
          ["Korea", "Nuansa"],
          [
            b("밥 먹었어?"),
            "Udah yang biasa. Cukup bentuk lampau -았/었, tanpa kata tambahan.",
          ],
          [
            ref("벌써 10시야?", "ki-beolsseo"),
            "Kok udah? Kaget karena lebih cepat dari dugaan.",
          ],
          [
            ref("그거 이미 알아.", "ki-beolsseo"),
            "Udah dari tadi, udah jadi fakta. Nadanya datar.",
          ],
          [ref("부산에 가 봤어요?", "ki-a-boda"), "Udah pernah (pengalaman)."],
        ]),
        h3("Contoh"),
        ex("숙제 다 했어요.", "PR-nya udah aku kerjain semua."),
        ex("벌써 다 먹었어?", "Kok udah habis aja?"),
        ex("버스는 이미 떠났어요.", "Busnya udah berangkat (dari tadi)."),
        ex("집에 돈 보냈어.", "Aku udah kirim uang ke rumah."),
        callout(
          "warning",
          b("Jebakan: nempelin 이미 di mana-mana."),
          " Ditanya ",
          b("밥 먹었어요?"),
          " terus jawab ",
          b("이미 먹었어요"),
          ' kedengeran kayak "udah dari tadi, ngapain nanya". Jawab aja ',
          b("네, 먹었어요."),
        ),
      ],
    },
    "ik-belum": {
      description:
        "Belum = 아직 + 안 + bentuk lampau. Kalau cuma jawab belum, bilang 아직이요.",
      blocks: [
        p(
          i('"Belum makan." "Belum selesai, Pak."'),
          " Kelihatannya gampang, tapi ada satu jebakan di cara jawabnya. Gimana bilangnya?",
        ),
        table([
          ["Korea", "Nuansa"],
          [
            ref("아직 안 먹었어.", "ki-ajik"),
            "Rumusnya 아직 + 안 + lampau. Lampau, karena sampai sekarang belum terjadi.",
          ],
          [
            ref("아직 못 끝냈어요.", "ki-ajik"),
            "Belum bisa atau belum sempat. 못 kedengeran kamu udah usaha.",
          ],
          [
            ref("아직이요.", "ki-ajik"),
            'Jawaban pendek "belum". Sopan dan aman.',
          ],
          [
            ref("아직 멀었어요.", "ki-ajik"),
            '"Masih lama", masih jauh dari selesai.',
          ],
        ]),
        h3("Contoh"),
        ex("걔 아직 안 왔어.", "Dia belum dateng."),
        ex("월급이 아직 안 들어왔어요.", "Gajinya belum masuk."),
        ex("아직 답장 못 했어.", "Belum sempet bales."),
        ...chat([
          {
            who: "Minho",
            ko: "안디 씨, 밥 먹었어요?",
            id: "Andi, udah makan?",
          },
          {
            who: "Andi",
            ko: "아직이요. 해가 지면 먹어요.",
            id: "Belum. Nanti kalau udah magrib baru makan.",
          },
          { who: "Minho", ko: "아, 라마단이죠?", id: "Oh, lagi Ramadan ya?" },
        ]),
        callout(
          "warning",
          b("Jebakan: jawab cuma 아니요."),
          " Ditanya ",
          b("밥 먹었어요?"),
          " terus jawab ",
          b("아니요"),
          " doang kedengeran ketus, seolah kamu nggak mau makan. Jawab ",
          b("아직이요"),
          ": maksudnya jelas, nanti juga makan.",
        ),
      ],
    },
    "ik-masih": {
      description:
        "Masih = 아직 + bentuk sekarang. Masih aja yang nadanya heran atau kesel = 아직도.",
      blocks: [
        p(
          i('"Masih kerja?" "Masih aja ngeluh." "Masih ada waktu kok."'),
          " Yang kedua jelas nadanya kesel. Gimana bilangnya?",
        ),
        table([
          ["Korea", "Nuansa"],
          [
            ref("아직 일해?", "ki-ajik"),
            "Masih (keadaan lanjut). 아직 + bentuk sekarang, bukan lampau.",
          ],
          [
            ref("아직도 자?", "ki-ajik"),
            "Masih aja? Ada rasa heran atau kesel, kok belum berubah juga.",
          ],
          [ref("아직 시간 있어.", "ki-ajik"), "Masih ada (sisa)."],
        ]),
        h3("Contoh"),
        ex("아직 회사예요.", "Aku masih di kantor."),
        ex("아직 머리가 아파요.", "Kepalaku masih sakit."),
        ex("아직도 그 얘기 해?", "Masih aja bahas itu?"),
        ex("시간이 아직 10분 남았어요.", "Waktunya masih sisa sepuluh menit."),
        callout(
          "warning",
          b("Jebakan: 아직도 ke atasan."),
          " ",
          b("아직도 안 끝났어요?"),
          " ke orang lain kedengeran nyindir (",
          i("belum kelar juga?!"),
          "). Jangan dipakai ke 사장님 atau 반장님. Buat diri sendiri aman: ",
          b("저 아직도 이해가 안 돼요."),
        ),
      ],
    },
    "ik-baru": {
      description:
        "Baru punya banyak maksud: barusan (방금), baru mulai (이제 막), baru sekarang (이제야), dan cuma (-밖에 안).",
      blocks: [
        p(
          i(
            '"Aku baru sampe." "Baru tiga orang yang dateng." "Baru ngerti sekarang."',
          ),
          " Satu kata, banyak maksud. Gimana bilangnya?",
        ),
        table([
          ["Korea", "Nuansa"],
          [
            ref("방금 도착했어.", "ki-bangeum"),
            "Baru aja, barusan. Selalu lampau.",
          ],
          [ref("이제 막 시작했어.", "ki-bangeum"), "Baru mulai."],
          [
            ref("이제야 알았어.", "ki-bangeum"),
            "Baru sekarang, akhirnya. Ada rasa telat.",
          ],
          [
            ref("세 명밖에 안 왔어.", "ki-bakke"),
            "Baru (cuma sedikit). -밖에 wajib diikuti kalimat negatif.",
          ],
          [b("새 핸드폰이야."), "Baru buat benda: 새 di depan kata benda."],
        ]),
        h3("Contoh"),
        ex("사장님 방금 나가셨어요.", "Bos baru aja keluar."),
        ex(
          "한국어는 이제 막 시작했어요.",
          "Bahasa Korea aku baru mulai belajar.",
        ),
        ex("아직 한 달밖에 안 됐어요.", "Baru sebulan (di sini)."),
        ex("이제야 일이 끝났어.", "Kerjaan baru kelar sekarang."),
        callout(
          "warning",
          b("Jebakan: -밖에 tanpa negatif."),
          " ",
          b("세 명밖에 안 왔어"),
          ", bukan ",
          b("세 명밖에 왔어"),
          ". Rasanya kayak ",
          i('"nggak ada selain tiga orang"'),
          ". Tanpa 안 atau 없다, kalimatnya salah.",
        ),
      ],
    },
    "ik-sempat": {
      description:
        "Nggak sempat = 못 dengan alasan di depan. Buat minta maaf karena lagi sibuk ngapain, pakai -느라고.",
      blocks: [
        p(
          i('"Sorry, nggak sempet bales, tadi lagi kerja."'),
          " Kamu mau, tapi nggak bisa karena sibuk. Gimana bilangnya?",
        ),
        table([
          ["Korea", "Nuansa"],
          [
            ref("일하느라고 답장 못 했어.", "ki-neurago"),
            "Gara-gara sibuk ngapain, jadi nggak sempat. Pas buat minta maaf.",
          ],
          [
            ref("시간이 없어서 못 먹었어.", "ki-aseo-karena"),
            "Nggak sempat karena nggak ada waktu. Netral.",
          ],
          [
            b("오늘 만날 시간 있어?"),
            '"Sempet ketemu nggak?" Nanya waktu luang.',
          ],
          [
            ref("서울에서 산 적이 있어요.", "ki-eun-jeok"),
            "Sempat yang artinya pernah. Nggak ada hubungannya sama waktu luang.",
          ],
        ]),
        h3("Contoh"),
        ex(
          "자느라 전화 못 받았어.",
          "Lagi tidur, jadi nggak sempet angkat telpon.",
        ),
        ex(
          "죄송해요, 기도하느라고 전화 못 받았어요.",
          "Maaf, tadi lagi salat, jadi nggak sempet angkat telpon.",
        ),
        ex(
          "바빠서 밥 먹을 시간도 없었어.",
          "Sibuk banget, makan aja nggak sempet.",
        ),
        callout(
          "warning",
          b("Jebakan: lampau sebelum -느라고."),
          " ",
          b("일했느라고"),
          " itu salah. Lampaunya cukup di ujung kalimat: ",
          b("일하느라고 못 했어."),
          " Pakai juga 못, bukan 안, biar nggak kedengeran kamu sengaja.",
        ),
      ],
    },
    "ik-keburu": {
      description:
        "Keburu = sesuatu kejadian duluan. Pakai 벌써 (+ -아/어 버렸어), dan -기 전에 buat biar nggak keburu.",
      blocks: [
        p(
          i('"Tokonya keburu tutup." "Ayo berangkat, nanti keburu macet."'),
          " Nggak ada satu kata Korea yang pas. Gimana bilangnya?",
        ),
        table([
          ["Korea", "Nuansa"],
          [
            ref("가게가 벌써 문 닫았어요.", "ki-beolsseo"),
            "Udah kejadian duluan, kita telat.",
          ],
          [
            ref("버스가 벌써 가 버렸어.", "ki-a-beorida"),
            "Sama, plus rasa nyesel: yah, udah terlanjur.",
          ],
          [
            ref("길이 막히기 전에 출발하자.", "ki-gi-jeone"),
            'Biar nggak keburu. Bahasa Korea mikirnya "sebelum macet".',
          ],
        ]),
        h3("Contoh"),
        ex(
          "할랄 메뉴가 벌써 다 떨어졌대.",
          "Katanya menu halalnya keburu habis.",
        ),
        ex("다 팔리기 전에 빨리 사요.", "Beli cepet, sebelum keburu habis."),
        ex("비 오기 전에 빨래 걷어.", "Angkat jemuran sebelum keburu hujan."),
        callout(
          "warning",
          b("Jebakan: keburu bukan buru-buru."),
          " ",
          i("Buru-buru"),
          " itu ",
          b("서두르다"),
          ": ",
          b("서두르지 마"),
          " (jangan buru-buru). ",
          i("Keburu"),
          " soal sesuatu yang terjadi duluan, jadi jangan pakai 서두르다 buat ",
          i("keburu tutup"),
          ".",
        ),
      ],
    },
    "ik-nggak-jadi": {
      description:
        "Nggak jadi karena keputusan = 안 -기로 했어, akhirnya nggak = 결국, terpaksa batal = 못 -게 됐어.",
      blocks: [
        p(
          i(
            '"Aku nggak jadi pergi." "Acaranya nggak jadi." "Eh, nggak jadi deh."',
          ),
          " Batalnya beda-beda sebabnya. Gimana bilangnya?",
        ),
        table([
          ["Korea", "Nuansa"],
          [
            ref("안 가기로 했어.", "ki-giro-hada"),
            "Batal karena keputusan kamu sendiri.",
          ],
          [
            ref("결국 안 갔어.", "ki-gyeolguk"),
            "Akhirnya nggak, setelah mikir atau ada kejadian.",
          ],
          [
            ref("못 가게 됐어요.", "ki-ge-doeda"),
            "Batal karena keadaan, bukan kemauan kamu. Paling sopan buat izin.",
          ],
          [b("회식이 취소됐어요."), "Acaranya dibatalin (취소되다)."],
        ]),
        h3("Contoh"),
        ex("너무 비싸서 안 사기로 했어.", "Kemahalan, jadi nggak jadi beli."),
        ex(
          "죄송해요, 야근 때문에 못 가게 됐어요.",
          "Maaf, gara-gara lembur aku jadi nggak bisa dateng.",
        ),
        ex("토요일 특근 취소됐어!", "Lembur hari Sabtu nggak jadi!"),
        ex("아, 그냥 안 할게.", "Eh, nggak jadi deh."),
        callout(
          "warning",
          b("Jebakan: jadi = 되다?"),
          " Jangan terjemahin ",
          i("nggak jadi"),
          " jadi ",
          b("안 됐어"),
          ". ",
          b("예약이 안 됐어"),
          " artinya ",
          i("reservasinya nggak berhasil"),
          ", bukan batal. Beda jauh.",
        ),
      ],
    },
    "ik-hampir": {
      description:
        "Hampir yang nyaris kejadian pakai -(으)ㄹ 뻔했어. Hampir yang soal jumlah atau proses pakai 거의.",
      blocks: [
        p(
          i('"Hampir jatuh!" "Hampir selesai."'),
          " Yang satu nyaris kejadian (untung nggak), yang satu udah sebagian besar. Gimana bilangnya?",
        ),
        table([
          ["Korea", "Nuansa"],
          [
            ref("넘어질 뻔했어.", "ki-eul-ppeonhada"),
            "Nyaris kejadian, tapi nggak. Selalu lampau.",
          ],
          [
            ref("하마터면 다칠 뻔했어.", "ki-eul-ppeonhada"),
            "Lebih dramatis: hampir aja.",
          ],
          [
            ref("거의 다 했어.", "ki-geoui"),
            "Udah sebagian besar (jumlah, proses).",
          ],
          [
            ref("요즘 거의 못 자요.", "ki-geoui"),
            "Hampir nggak, jarang banget.",
          ],
        ]),
        h3("Contoh"),
        ex("지하철 놓칠 뻔했어요.", "Hampir ketinggalan kereta."),
        ex("하마터면 지각할 뻔했어요.", "Hampir aja telat masuk kerja."),
        ex("거의 다 왔어.", "Udah hampir sampe."),
        ex("월급 거의 다 썼어.", "Gajiku udah hampir habis."),
        callout(
          "warning",
          b("Jebakan paling sering: 거의 넘어졌어."),
          " Orang Indonesia mikir hampir = 거의. Padahal buat nyaris kejadian, bilangnya ",
          b("넘어질 뻔했어"),
          ". 거의 cuma buat jumlah atau proses: hampir selesai, hampir habis, hampir sampe.",
        ),
      ],
    },
  },
  vocabulary: {
    title: "Kosakata: kata waktu yang licin",
    description:
      "Delapan kata waktu yang maknanya dobel: udah, belum, masih, baru, sempat, keburu, nggak jadi, dan hampir.",
    entries: [
      {
        term: "-았/었어",
        meanings: ["udah", "sudah"],
        example: { ko: "밥 먹었어요?", id: "Udah makan?" },
      },
      {
        term: "아직 안 -았/었어",
        meanings: ["belum"],
        example: { ko: "아직 안 먹었어요.", id: "Aku belum makan." },
      },
      {
        term: "아직",
        meanings: ["masih", "belum"],
        example: { ko: "아직 회사예요.", id: "Aku masih di kantor." },
      },
      {
        term: "방금",
        meanings: ["baru aja", "barusan"],
        example: { ko: "방금 도착했어요.", id: "Aku baru aja sampe." },
      },
      {
        term: "-느라고",
        meanings: ["nggak sempat karena lagi", "gara-gara sibuk"],
        example: {
          ko: "일하느라고 답장 못 했어요.",
          id: "Sorry nggak sempet bales, tadi lagi kerja.",
        },
      },
      {
        term: "벌써",
        meanings: ["keburu", "udah (kok cepet)"],
        example: {
          ko: "가게가 벌써 문 닫았어요.",
          id: "Tokonya keburu tutup.",
        },
      },
      {
        term: "안 -기로 했어",
        meanings: ["nggak jadi"],
        example: { ko: "안 가기로 했어요.", id: "Aku nggak jadi pergi." },
      },
      {
        term: "-(으)ㄹ 뻔했어",
        meanings: ["hampir", "nyaris"],
        example: { ko: "넘어질 뻔했어요.", id: "Aku hampir jatuh." },
      },
    ],
  },
  quiz: {
    title: "Kuis: kata waktu yang licin",
    description:
      "Sepuluh soal pilihan ganda. Pilih cara ngomong yang paling natural buat tiap situasi.",
    passingScore: 70,
    questions: [
      {
        key: "udah-sapaan",
        prompt:
          'Rekan kerja nyapa: "밥 먹었어요?" Kamu udah makan. Jawab yang paling natural:',
        options: [
          { text: "네, 먹었어요.", correct: true },
          { text: "네, 이미 먹었어요." },
          { text: "네, 먹어 봤어요." },
        ],
        explanation:
          "Udah yang biasa cukup pakai bentuk lampau. 이미 bikin kesannya kayak 'udah dari tadi, ngapain nanya', dan 먹어 봤어요 artinya udah pernah nyobain.",
      },
      {
        key: "udah-kaget",
        prompt: 'Kamu lihat jam, kaget: "Hah, udah jam dua belas?!"',
        options: [
          { text: "벌써 12시야?", correct: true },
          { text: "이미 12시야." },
          { text: "아직 12시야?" },
        ],
        explanation:
          "Udah yang bikin kaget karena kecepetan itu 벌써. 이미 nadanya datar, dan 아직 artinya masih.",
      },
      {
        key: "belum-jawab",
        prompt:
          '반장님 nanya "밥 먹었어요?" Kamu belum makan. Jawab singkat dan sopan:',
        options: [
          { text: "아직이요.", correct: true },
          { text: "아니요." },
          { text: "아직 안 먹어요." },
        ],
        explanation:
          "아직이요 itu jawaban 'belum' yang halus. 아니요 doang kedengeran ketus, dan 아직 안 먹어요 (bentuk sekarang) artinya geser jadi 'aku belum mau makan'.",
      },
      {
        key: "masih-aja",
        prompt:
          'Udah siang, adikmu masih tidur. Kamu heran: "Masih aja tidur?"',
        options: [
          { text: "아직도 자?", correct: true },
          { text: "아직 잤어?" },
          { text: "벌써 자?" },
        ],
        explanation:
          "Masih aja yang nadanya heran atau kesel itu 아직도. 벌써 자? artinya 'kok udah tidur?'.",
      },
      {
        key: "baru-cuma",
        prompt: 'Rapat mau mulai, tapi "baru dua orang yang dateng."',
        options: [
          { text: "두 명밖에 안 왔어.", correct: true },
          { text: "두 명밖에 왔어." },
          { text: "방금 두 명 왔어." },
        ],
        explanation:
          "Baru yang artinya cuma sedikit pakai -밖에, dan -밖에 wajib diikuti negatif (안 왔어). 방금 itu barusan, bukan cuma.",
      },
      {
        key: "baru-sekarang",
        prompt: 'Dalam "이제야 알았어", 이제야 ngasih rasa apa?',
        options: [
          { text: "Baru sekarang, akhirnya (agak telat)", correct: true },
          { text: "Barusan banget, beberapa detik lalu" },
          { text: "Cuma sedikit" },
        ],
        explanation:
          "이제야 = baru sekarang, akhirnya. Barusan itu 방금, cuma itu -밖에 안. Satu kata baru, banyak bentuk Korea.",
      },
      {
        key: "sempat-salat",
        prompt:
          'Bos nelpon pas kamu lagi salat. Abis itu kamu bilang: "Maaf, tadi lagi salat, jadi nggak sempet angkat."',
        options: [
          { text: "죄송해요, 기도하느라고 전화 못 받았어요.", correct: true },
          { text: "죄송해요, 기도했느라고 전화 못 받았어요." },
          { text: "죄송해요, 기도하느라고 전화 안 받았어요." },
        ],
        explanation:
          "-느라고 nggak boleh ada lampau di depannya, jadi 기도했느라고 salah. Pakai 못, soalnya 안 kedengeran kayak kamu sengaja nggak ngangkat.",
      },
      {
        key: "keburu-macet",
        prompt: '"Ayo berangkat sekarang, nanti keburu macet."',
        options: [
          { text: "길이 막히기 전에 지금 출발하자.", correct: true },
          { text: "길이 막혔기 전에 지금 출발하자." },
          { text: "서둘러서 길이 막혀 버렸어." },
        ],
        explanation:
          "Biar nggak keburu = -기 전에 (sebelum). Bagian sebelum -기 전에 nggak pakai lampau, jadi 막혔기 전에 salah.",
      },
      {
        key: "nggak-jadi-izin",
        prompt:
          "Kamu udah janji dateng ke acara 반장님, tapi tiba-tiba harus lembur. Bilang dengan sopan:",
        options: [
          { text: "죄송해요, 야근 때문에 못 가게 됐어요.", correct: true },
          { text: "죄송해요, 야근 때문에 안 가기로 했어요." },
          { text: "죄송해요, 야근 때문에 안 됐어요." },
        ],
        explanation:
          "Batal karena keadaan (bukan kemauan kamu) = 못 -게 됐어요. 안 가기로 했어요 kesannya kamu sendiri yang milih nggak dateng, dan 안 됐어요 artinya 'nggak berhasil'.",
      },
      {
        key: "hampir-jatuh",
        prompt:
          'Kamu kepeleset di tangga, tapi nggak sampai jatuh. "Hampir jatuh!"',
        options: [
          { text: "넘어질 뻔했어!", correct: true },
          { text: "거의 넘어졌어!" },
          { text: "넘어질 뻔해!" },
        ],
        explanation:
          "Nyaris kejadian (tapi untungnya nggak) = -(으)ㄹ 뻔했어, selalu lampau. 거의 cuma buat jumlah atau proses, kayak 거의 다 했어.",
      },
    ],
  },
});
