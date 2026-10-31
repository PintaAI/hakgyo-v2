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
  key: "ik-06-waktu",
  materials: {
    "ik-udah": {
      description:
        "Udah yang biasa cukup pakai bentuk lampau. 벌써 buat udah yang bikin kaget, 이미 buat udah dari tadi.",
      blocks: [
        grammar({
          number: "01",
          theme: "blue",
          title: "udah → -았/었어, 벌써, 이미",
          descriptionKo:
            "끝난 일은 과거형으로 말하고, 생각보다 빠를 때는 벌써, 이미 끝난 사실에는 이미를 써요.",
          descriptionTranslation:
            "Udah yang biasa cukup pakai bentuk lampau -았/었, tanpa kata tambahan. 벌써 buat udah yang bikin kaget karena kecepetan. 이미 buat udah dari tadi, nadanya datar.",
          rules: [
            r("Udah yang biasa", "-았/었어", "밥 먹었어?"),
            r("Kaget, kok cepet", "벌써", "벌써 10시야?"),
            r("Udah dari tadi, fakta", "이미", "그거 이미 알아."),
            r("Udah pernah", "-아/어 봤어", "부산에 가 봤어요?"),
          ],
          examples: [
            e("숙제 다 ", "했어요", "."),
            e("", "벌써", " 다 먹었어?"),
            e("버스는 ", "이미", " 떠났어요."),
          ],
        }),
        p(
          i('"Udah makan?" "Udah jam sepuluh?!" "Aku udah tahu kok."'),
          " Tiga-tiganya pakai udah, tapi rasanya beda. Gimana bilangnya?",
        ),
        p(
          "Udah yang biasa cukup bentuk lampau. Kalau kaget, tambah ",
          ref("벌써", "ki-beolsseo"),
          ". Kalau udah dari tadi, ",
          ref("이미", "ki-beolsseo"),
          ". Udah pernah nyoba? Pakai ",
          ref("-아/어 봤어", "ki-a-boda"),
          ".",
        ),
        h3("Contoh"),
        ex("집에 돈 보냈어.", "Aku udah kirim uang ke rumah."),
        ex("벌써 금요일이네!", "Wah, udah Jumat aja!"),
        ex("그 영화 이미 봤어요.", "Film itu udah aku tonton."),
        ex("김치 먹어 봤어요?", "Udah pernah nyobain kimchi?"),
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
        callout(
          "tip",
          "Lawannya: ",
          ref("belum", "ik-belum"),
          ". Kalau sesuatu udah kejadian duluan sebelum kamu sempat: ",
          ref("keburu", "ik-keburu"),
          ".",
        ),
      ],
    },
    "ik-belum": {
      description:
        "Belum = 아직 + 안 + bentuk lampau. Kalau cuma jawab belum, bilang 아직이요.",
      blocks: [
        grammar({
          number: "02",
          theme: "blue",
          title: "belum → 아직 안 -았/었어",
          descriptionKo: "아직 하지 않은 일은 아직 안 + 과거형으로 말해요.",
          descriptionTranslation:
            'Belum = 아직 + 안 + bentuk lampau. Lampau, soalnya kamu ngomongin sesuatu yang sampai sekarang belum terjadi. Kalau cuma jawab "belum", bilang 아직이요.',
          rules: [
            r("Belum ngelakuin", "아직 안 -았/었어", "아직 안 먹었어."),
            r(
              "Belum bisa, udah usaha",
              "아직 못 -았/었어",
              "아직 못 끝냈어요.",
            ),
            r("Jawaban pendek", "아직이요", "밥이요? 아직이요."),
            r("Masih lama", "아직 멀었어요", "끝나려면 아직 멀었어요."),
          ],
          examples: [
            e("걔 ", "아직 안 왔어", "."),
            e("월급이 ", "아직 안 들어왔어요", "."),
            e("숙제 ", "아직 못 했어요", "."),
          ],
        }),
        p(
          i('"Belum makan." "Belum selesai, Pak."'),
          " Kelihatannya gampang, tapi ada satu jebakan di cara jawabnya. Gimana bilangnya?",
        ),
        p(
          "Rumusnya ",
          ref("아직", "ki-ajik"),
          " + 안 + lampau. Belum bisa atau belum sempat? Ganti 안 jadi 못, biar kedengeran kamu udah usaha.",
        ),
        h3("Contoh"),
        ex("아직 결정 안 했어요.", "Aku belum mutusin."),
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
          {
            who: "Minho",
            ko: "아, 지금 라마단이죠?",
            id: "Oh, lagi Ramadan ya?",
          },
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
        callout(
          "tip",
          "Belum berubah dan masih berlangsung? Itu ",
          ref("masih", "ik-masih"),
          ". Kebalikannya: ",
          ref("udah", "ik-udah"),
          ".",
        ),
      ],
    },
    "ik-masih": {
      description:
        "Masih = 아직 + bentuk sekarang. Masih aja yang nadanya heran atau kesel = 아직도.",
      blocks: [
        grammar({
          number: "03",
          theme: "blue",
          title: "masih → 아직, 아직도",
          descriptionKo:
            "어떤 상태가 계속될 때 아직을 쓰고, 놀라거나 답답할 때는 아직도를 써요.",
          descriptionTranslation:
            "Masih = 아직 + bentuk sekarang, bukan lampau. Masih aja yang nadanya heran atau kesel pakai 아직도. Buat sisa waktu atau barang, tutup pakai 있어 atau 남았어.",
          rules: [
            r("Keadaan masih lanjut", "아직 + bentuk sekarang", "아직 일해?"),
            r("Heran, kesel", "아직도", "아직도 자?"),
            r("Masih ada sisa", "아직 ... 있어 / 남았어", "아직 시간 있어."),
          ],
          examples: [
            e("", "아직", " 회사예요."),
            e("", "아직", " 머리가 아파요."),
            e("", "아직도", " 그 얘기 해?"),
          ],
        }),
        p(
          i('"Masih kerja?" "Masih aja ngeluh." "Masih ada waktu kok."'),
          " Yang kedua jelas nadanya kesel. Gimana bilangnya?",
        ),
        p(
          "Dua-duanya ada di ",
          ref("아직 / 아직도", "ki-ajik"),
          ". 아직 buat masih yang netral, 아직도 buat masih aja yang heran atau kesel.",
        ),
        h3("Contoh"),
        ex("저 아직 기숙사에 있어요.", "Aku masih di asrama."),
        ex("아직 배불러요.", "Aku masih kenyang."),
        ex("아직도 그 드라마 봐?", "Masih aja nonton drakor itu?"),
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
        callout(
          "tip",
          "Masih belum kejadian sama sekali? Cek ",
          ref("belum", "ik-belum"),
          ". Baru kelar sekarang setelah lama nunggu? Itu ",
          ref("baru", "ik-baru"),
          " (이제야).",
        ),
      ],
    },
    "ik-baru": {
      description:
        "Baru punya banyak maksud: barusan (방금), baru mulai (이제 막), baru sekarang (이제야), dan cuma (-밖에 안).",
      blocks: [
        grammar({
          number: "04",
          theme: "blue",
          title: "baru → 방금, 이제 막, 이제야, -밖에",
          descriptionKo:
            "방금 일어난 일, 막 시작한 일, 늦게 된 일, 적은 수량에 따라 다른 말을 써요.",
          descriptionTranslation:
            "Baru di Korea punya banyak bentuk. Barusan pakai 방금, baru mulai pakai 이제 막, baru sekarang (agak telat) pakai 이제야. Baru yang artinya cuma sedikit pakai -밖에 plus kalimat negatif.",
          rules: [
            r("Barusan", "방금", "방금 도착했어."),
            r("Baru mulai", "이제 막", "이제 막 시작했어."),
            r("Baru sekarang, telat", "이제야", "이제야 알았어."),
            r("Cuma sedikit", "-밖에 안 / 없어", "세 명밖에 안 왔어."),
            r("Benda baru", "새 + kata benda", "새 핸드폰이야."),
          ],
          examples: [
            e("사장님 ", "방금", " 나가셨어요."),
            e("한국어는 ", "이제 막", " 시작했어요."),
            e("아직 한 달", "밖에", " 안 됐어요."),
          ],
        }),
        p(
          i(
            '"Aku baru sampe." "Baru tiga orang yang dateng." "Baru ngerti sekarang."',
          ),
          " Satu kata, banyak maksud. Gimana bilangnya?",
        ),
        p(
          "Barusan: ",
          ref("방금", "ki-bangeum"),
          ". Baru mulai: ",
          ref("이제 막", "ki-bangeum"),
          ". Baru sekarang: ",
          ref("이제야", "ki-bangeum"),
          ". Cuma sedikit: ",
          ref("-밖에 안", "ki-bakke"),
          ". Buat benda, cukup taruh 새 di depan kata bendanya.",
        ),
        h3("Contoh"),
        ex("방금 도착했어.", "Aku baru sampe."),
        ex("이제야 이해가 돼요.", "Baru sekarang aku ngerti."),
        ex("세 명밖에 안 왔어요.", "Baru tiga orang yang dateng."),
        ex("새 신발 샀어요.", "Aku beli sepatu baru."),
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
        callout(
          "tip",
          "Belum berubah dari tadi? Itu ",
          ref("masih", "ik-masih"),
          ". Udah kejadian lebih cepat dari dugaan: ",
          ref("udah", "ik-udah"),
          " (벌써).",
        ),
      ],
    },
    "ik-sempat": {
      description:
        "Nggak sempat = 못 dengan alasan di depan. Buat minta maaf karena lagi sibuk ngapain, pakai -느라고.",
      blocks: [
        grammar({
          number: "05",
          theme: "blue",
          title: "nggak sempat → -느라고",
          descriptionKo:
            "어떤 일을 하느라 다른 일을 못 했을 때 -느라고를 써요.",
          descriptionTranslation:
            "Nggak sempat karena lagi sibuk ngapain = -느라고 + 못. Pas banget buat minta maaf. Kalau alasannya cuma nggak ada waktu, pakai 시간이 없어서 못 했어.",
          rules: [
            r(
              "Lagi sibuk ngapain",
              "-느라고 못 -았/었어",
              "일하느라고 못 했어.",
            ),
            r(
              "Nggak ada waktu",
              "시간이 없어서 못",
              "시간이 없어서 못 먹었어.",
            ),
            r(
              "Nanya sempat nggak",
              "-(으)ㄹ 수 있어? / 시간 있어?",
              "오늘 만날 수 있어?",
            ),
            r(
              "Sempat = pernah",
              "-(으)ㄴ 적이 있어",
              "서울에서 산 적이 있어요.",
            ),
          ],
          examples: [
            e("", "자느라", " 전화 못 받았어."),
            e("시험 ", "공부하느라고", " 못 갔어요."),
            e("요즘 ", "일하느라고", " 연락 못 했어."),
          ],
        }),
        p(
          i('"Sorry, nggak sempet bales, tadi lagi kerja."'),
          " Kamu mau, tapi nggak bisa karena lagi sibuk. Gimana bilangnya?",
        ),
        p(
          "Lagi sibuk ngapain, jadi nggak sempat: ",
          ref("-느라고", "ki-neurago"),
          ". Kalau cuma nggak ada waktu: ",
          ref("-아서/어서", "ki-aseo-karena"),
          " + 못. Nanya sempat nggak: ",
          ref("-(으)ㄹ 수 있어?", "ki-eul-su-itda"),
          ". Sempat yang artinya pernah beda lagi: ",
          ref("-(으)ㄴ 적이 있다", "ki-eun-jeok"),
          ".",
        ),
        h3("Contoh"),
        ex(
          "미안, 일하느라고 답장 못 했어.",
          "Sorry, nggak sempet bales, tadi lagi kerja.",
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
        callout(
          "tip",
          "Udah buru-buru tapi kalah cepet? Cek ",
          ref("keburu", "ik-keburu"),
          ". Rencananya batal sama sekali: ",
          ref("nggak jadi", "ik-nggak-jadi"),
          ".",
        ),
      ],
    },
    "ik-keburu": {
      description:
        "Keburu = sesuatu kejadian duluan. Pakai 벌써 (+ -아/어 버렸어), dan -기 전에 buat biar nggak keburu.",
      blocks: [
        grammar({
          number: "06",
          theme: "blue",
          title: "keburu → 벌써, -기 전에",
          descriptionKo:
            "어떤 일이 먼저 일어났을 때는 벌써를 쓰고, 그 일을 막으려면 -기 전에를 써요.",
          descriptionTranslation:
            'Nggak ada satu kata Korea buat keburu. Kalau udah kejadian duluan, pakai 벌써, plus -아/어 버렸어 kalau kamu nyesel. Kalau mau mencegah, Korea mikirnya "sebelum": -기 전에.',
          rules: [
            r(
              "Udah kejadian duluan",
              "벌써 -았/었어",
              "가게가 벌써 문 닫았어요.",
            ),
            r("Plus nyesel", "벌써 -아/어 버렸어", "버스가 벌써 가 버렸어."),
            r("Biar nggak keburu", "-기 전에", "막히기 전에 출발하자."),
          ],
          examples: [
            e("버스가 ", "벌써", " 가 버렸어."),
            e("길이 ", "막히기 전에", " 출발하자."),
            e("다 ", "팔리기 전에", " 빨리 사요."),
          ],
        }),
        p(
          i('"Tokonya keburu tutup." "Ayo berangkat, nanti keburu macet."'),
          " Nggak ada satu kata Korea yang pas. Gimana bilangnya?",
        ),
        p(
          "Udah kejadian duluan: ",
          ref("벌써", "ki-beolsseo"),
          ", bisa ditambah ",
          ref("-아/어 버렸어", "ki-a-beorida"),
          " biar nyeselnya kerasa. Biar nggak keburu: ",
          ref("-기 전에", "ki-gi-jeone"),
          ".",
        ),
        h3("Contoh"),
        ex("가게가 벌써 문 닫았어요.", "Tokonya keburu tutup."),
        ex(
          "할랄 메뉴가 벌써 다 떨어졌대.",
          "Katanya menu halalnya keburu habis.",
        ),
        ex("비 오기 전에 빨래 걷어.", "Angkat jemuran sebelum keburu hujan."),
        ex("식기 전에 드세요.", "Silakan dimakan, sebelum keburu dingin."),
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
        callout(
          "tip",
          "Hal buruknya nyaris kejadian, tapi nggak? Itu ",
          ref("hampir", "ik-hampir"),
          ". Nggak sempat karena lagi sibuk: ",
          ref("sempat", "ik-sempat"),
          ".",
        ),
      ],
    },
    "ik-nggak-jadi": {
      description:
        "Nggak jadi karena keputusan = 안 -기로 했어, akhirnya nggak = 결국, terpaksa batal = 못 -게 됐어.",
      blocks: [
        grammar({
          number: "07",
          theme: "blue",
          title: "nggak jadi → 안 -기로 했어, 결국",
          descriptionKo:
            "계획이 바뀌었을 때는 이유에 따라 -기로 했다, 결국, -게 됐다를 써요.",
          descriptionTranslation:
            "Batal karena keputusanmu sendiri: 안 -기로 했어. Akhirnya nggak, setelah mikir atau ada kejadian: 결국 안 -았/었어. Batal karena keadaan, bukan kemauanmu: 못 -게 됐어, paling sopan buat izin.",
          rules: [
            r("Keputusan sendiri", "안 -기로 했어", "안 가기로 했어."),
            r("Akhirnya nggak", "결국 안 -았/었어", "결국 안 갔어."),
            r("Karena keadaan, sopan", "못 -게 됐어요", "못 가게 됐어요."),
            r("Acaranya batal", "취소됐어", "회식이 취소됐어요."),
            r("Eh, nggak jadi deh", "그냥 안 할게", "아, 그냥 안 할게."),
          ],
          examples: [
            e("너무 비싸서 안 ", "사기로 했어", "."),
            e("비가 와서 ", "결국", " 안 갔어."),
            e("죄송해요, 야근 때문에 ", "못 가게 됐어요", "."),
          ],
        }),
        p(
          i(
            '"Aku nggak jadi pergi." "Acaranya nggak jadi." "Eh, nggak jadi deh."',
          ),
          " Batalnya beda-beda sebabnya. Gimana bilangnya?",
        ),
        p(
          "Keputusan sendiri: ",
          ref("-기로 하다", "ki-giro-hada"),
          ". Akhirnya nggak: ",
          ref("결국", "ki-gyeolguk"),
          ". Terpaksa batal karena keadaan: ",
          ref("-게 되다", "ki-ge-doeda"),
          ". Tadinya mau, tapi batal: ",
          ref("-(으)려고 했는데", "ki-ryeogo-haenneunde"),
          ".",
        ),
        h3("Contoh"),
        ex(
          "이번 휴가 때 고향에 안 가기로 했어요.",
          "Liburan kali ini aku nggak jadi pulang kampung.",
        ),
        ex(
          "고민하다가 결국 안 샀어.",
          "Udah mikir-mikir, akhirnya nggak jadi beli.",
        ),
        ex(
          "죄송해요, 갑자기 일이 생겨서 못 가게 됐어요.",
          "Maaf, tiba-tiba ada urusan, jadi aku nggak bisa dateng.",
        ),
        ex("토요일 특근 취소됐어!", "Lembur hari Sabtu nggak jadi!"),
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
        callout(
          "tip",
          "Mau cerita rencana yang batal sambil kasih alasan? Cek ",
          ref("padahal (rencana)", "ik-padahal-rencana"),
          ". Nyesel karena nggak jadi: ",
          ref("harusnya", "ik-harusnya"),
          ".",
        ),
      ],
    },
    "ik-hampir": {
      description:
        "Hampir yang nyaris kejadian pakai -(으)ㄹ 뻔했어. Hampir yang soal jumlah atau proses pakai 거의.",
      blocks: [
        grammar({
          number: "08",
          theme: "blue",
          title: "hampir → -(으)ㄹ 뻔했어, 거의",
          descriptionKo:
            "일어날 뻔했지만 안 일어난 일에는 -(으)ㄹ 뻔했다를, 양이나 진행 정도에는 거의를 써요.",
          descriptionTranslation:
            "Hampir yang nyaris kejadian (untung nggak) pakai -(으)ㄹ 뻔했어, selalu lampau. Hampir yang soal jumlah atau proses pakai 거의: hampir selesai, hampir habis, hampir sampe.",
          rules: [
            r("Nyaris kejadian", "-(으)ㄹ 뻔했어", "넘어질 뻔했어."),
            r(
              "Lebih dramatis",
              "하마터면 -(으)ㄹ 뻔했어",
              "하마터면 다칠 뻔했어.",
            ),
            r("Jumlah, proses", "거의", "거의 다 했어."),
            r("Hampir nggak, jarang", "거의 안 / 못", "요즘 거의 못 자요."),
          ],
          examples: [
            e("지하철 ", "놓칠 뻔했어요", "."),
            e("하마터면 지각", "할 뻔했어요", "."),
            e("", "거의", " 다 왔어."),
          ],
        }),
        p(
          i('"Hampir jatuh!" "Hampir selesai."'),
          " Yang satu nyaris kejadian (untung nggak), yang satu udah sebagian besar. Gimana bilangnya?",
        ),
        p(
          "Nyaris kejadian: ",
          ref("-(으)ㄹ 뻔했다", "ki-eul-ppeonhada"),
          ". Jumlah atau proses: ",
          ref("거의", "ki-geoui"),
          ".",
        ),
        h3("Contoh"),
        ex("계단에서 넘어질 뻔했어.", "Aku hampir jatuh di tangga."),
        ex("하마터면 다칠 뻔했어요.", "Hampir aja aku luka."),
        ex("월급 거의 다 썼어.", "Gajiku udah hampir habis."),
        ex(
          "요즘 바빠서 거의 못 자요.",
          "Akhir-akhir ini sibuk, hampir nggak bisa tidur.",
        ),
        callout(
          "warning",
          b("Jebakan paling sering: 거의 넘어졌어."),
          " Orang Indonesia mikir hampir = 거의. Padahal buat nyaris kejadian, bilangnya ",
          b("넘어질 뻔했어"),
          ". 거의 cuma buat jumlah atau proses: hampir selesai, hampir habis, hampir sampe.",
        ),
        callout(
          "tip",
          "Lega karena nggak jadi kejadian? Sambung pakai ",
          ref("untung", "ik-untung"),
          ": ",
          b("넘어질 뻔했어. 다행이다!"),
          " Kalau udah kejadian duluan: ",
          ref("keburu", "ik-keburu"),
          ".",
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
