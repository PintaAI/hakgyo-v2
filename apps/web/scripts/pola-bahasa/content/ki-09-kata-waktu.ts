import { b, callout, defineBab, ex, h3, i, p, ref } from "../blocks";

export default defineBab({
  key: "ki-09-kata-waktu",
  materials: {
    "ki-jom": {
      description:
        "좀 asalnya ‘sedikit’, tapi di obrolan tugas utamanya ngalusin permintaan, persis kayak ‘dong’.",
      blocks: [
        callout(
          "info",
          b("좀"),
          " = ",
          i("dong, sedikit, agak"),
          ". Asalnya dari 조금 (sedikit). Taruh sebelum kata kerja atau setelah kata benda yang diminta: ",
          b("좀 도와주세요"),
          ", ",
          b("소금 좀 주세요"),
          ". Kalau ketemu kata sifat, artinya ",
          i("agak"),
          ": 좀 비싸요.",
        ),
        p(
          b("Artinya apa sih? "),
          "Bandingin ",
          i("‘Bantu!’"),
          " sama ",
          i("‘Bantuin dong.’"),
          " Isinya sama, rasanya beda jauh. 좀 itu ‘dong’-nya bahasa Korea: tanpa 좀, permintaan bisa kedengeran kayak perintah.",
        ),
        h3("Contoh"),
        ex("좀 도와주세요.", "Bantuin dong."),
        ex("소금 좀 주세요.", "Minta garamnya ya.", "di restoran"),
        ex(
          "사장님, 오늘 좀 일찍 가도 될까요?",
          "Pak, hari ini boleh pulang agak cepet?",
        ),
        ex("이거 좀 비싸네요.", "Ini agak mahal ya."),
        ex("야, 좀 조용히 해!", "Woy, diem dong!", "반말, kesel"),
        callout(
          "warning",
          "Jebakan: 좀 nggak selalu ‘sedikit’. Kalau temen Korea jawab ajakanmu pakai ",
          b("음... 좀 그래"),
          ", itu bukan ‘agak oke’, tapi ‘nggak deh’ versi halus.",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("dong", "ik-dong"),
          ".",
        ),
      ],
    },
    "ki-beolsseo": {
      description:
        "벌써 dan 이미 sama-sama ‘udah’: yang satu kaget karena kecepetan, yang satu fakta datar.",
      blocks: [
        callout(
          "info",
          b("벌써"),
          " = ",
          i("udah (kok cepet?)"),
          ", kamu kaget karena lebih cepet dari dugaan. ",
          b("이미"),
          " = ",
          i("sudah"),
          ", fakta datar, sering dengan rasa ‘udah telat’. Dua-duanya ditaruh sebelum kata kerja, biasanya bentuk lampau.",
        ),
        p(
          b("Artinya apa sih? "),
          "벌써 itu ",
          i("‘hah, udah?!’"),
          ". 이미 itu ",
          i("‘udah dari tadi, telat kamu’"),
          ". Kalau kamu nggak kaget dan nggak telat, nggak usah pakai dua-duanya.",
        ),
        h3("Contoh"),
        ex("벌써 열 시예요?", "Hah, udah jam sepuluh?"),
        ex("벌써 다 먹었어요? 빠르다!", "Udah abis? Cepet amat!"),
        ex("기차가 이미 떠났어요.", "Keretanya udah berangkat.", "telat"),
        ex("그건 이미 알고 있어요.", "Itu aku udah tahu kok."),
        ex("벌써 일 년이 지났네.", "Nggak kerasa udah setahun ya.", "반말"),
        callout(
          "warning",
          "Jebakan: ‘udah’ yang biasa (udah makan, udah sampai) cukup bentuk lampau: ",
          b("밥 먹었어요"),
          ". Kalau kamu bilang ",
          b("벌써 왔어요?"),
          " ke temen yang baru dateng, artinya ‘kok udah dateng? cepet banget’.",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("udah", "ik-udah"),
          " dan ",
          ref("keburu", "ik-keburu"),
          ". Lawan katanya: ",
          ref("아직", "ki-ajik"),
          ".",
        ),
      ],
    },
    "ki-ajik": {
      description:
        "아직 bisa ‘belum’ atau ‘masih’, tergantung kalimatnya. 아직도 itu ‘masih aja’.",
      blocks: [
        callout(
          "info",
          b("아직"),
          " + kalimat negatif = ",
          i("belum"),
          " (아직 안 먹었어요). ",
          b("아직"),
          " + kalimat positif = ",
          i("masih"),
          " (아직 일해요). ",
          b("아직도"),
          " = ",
          i("masih aja"),
          ", biasanya dengan nada heran atau kesel.",
        ),
        p(
          b("Artinya apa sih? "),
          "Bahasa Indonesia punya dua kata, ",
          i("belum"),
          " dan ",
          i("masih"),
          ". Bahasa Korea cukup satu, 아직, lalu kalimat sesudahnya yang nentuin artinya.",
        ),
        h3("Contoh"),
        ex("아직 밥 안 먹었어요.", "Aku belum makan."),
        ex("A: 다 했어요? B: 아직이요.", "A: Udah selesai? B: Belum."),
        ex("아직 일하고 있어요.", "Masih kerja."),
        ex("한국어 아직 잘 못해요.", "Bahasa Koreaku masih belum lancar."),
        ex(
          "아직도 자? 벌써 열두 시야!",
          "Masih aja tidur? Udah jam dua belas!",
          "반말",
        ),
        callout(
          "warning",
          "Jebakan: kalau ditanya ‘udah?’ dan jawabannya ‘belum’, bilang ",
          b("아직이요"),
          " (atau 아직요), bukan 아니요. 아니요 artinya ‘nggak’, kedengeran kayak kamu nggak bakal ngerjainnya sama sekali.",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("belum", "ik-belum"),
          " dan ",
          ref("masih", "ik-masih"),
          ".",
        ),
      ],
    },
    "ki-bangeum": {
      description:
        "‘Baru’ versi waktu: 방금 (barusan), 이제 막 (baru mulai), 이제야 (baru sekarang, telat).",
      blocks: [
        callout(
          "info",
          b("방금"),
          " = ",
          i("baru aja, barusan"),
          " (udah lewat). ",
          b("이제 막"),
          " = ",
          i("baru mulai, baru banget"),
          ". ",
          b("이제야"),
          " = ",
          i("baru sekarang"),
          " (akhirnya, tapi telat). Ketiganya ditaruh sebelum kata kerja.",
        ),
        p(
          b("Artinya apa sih? "),
          "Kata ",
          i("baru"),
          " di bahasa Indonesia artinya banyak. Bahasa Korea misahin: kejadian barusan, sesuatu yang baru mulai, dan sesuatu yang baru kejadian setelah lama ditunggu.",
        ),
        h3("Contoh"),
        ex("방금 도착했어요.", "Baru aja sampai."),
        ex("방금 뭐라고 했어요?", "Barusan kamu bilang apa?"),
        ex("이제 막 시작했어요.", "Baru aja mulai."),
        ex(
          "한국에 온 지 이제 막 한 달 됐어요.",
          "Aku baru banget sebulan di Korea.",
        ),
        ex(
          "세 번 듣고 이제야 이해했어요.",
          "Udah dengerin tiga kali, baru sekarang ngerti.",
        ),
        callout(
          "warning",
          "Jebakan: ",
          b("방금"),
          " dan ",
          b("금방"),
          " hurufnya kebalik, artinya juga kebalik. 방금 = barusan (udah lewat). 금방 = bentar lagi (nanti). 금방 갈게요 = ‘Bentar lagi aku dateng.’",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("baru", "ik-baru"),
          ". Bedanya sama ",
          ref("-밖에 안", "ki-bakke"),
          ": itu ‘baru’ yang soal jumlah (baru tiga orang).",
        ),
      ],
    },
    "ki-bakke": {
      description:
        "-밖에 = cuma, baru (jumlahnya dikit). Wajib diikuti kalimat negatif.",
      blocks: [
        callout(
          "info",
          b("-밖에"),
          " = ",
          i("cuma, baru"),
          ", dengan rasa ‘kurang dari harapan’. Nempel langsung ke kata benda, terus ",
          b("wajib"),
          " diikuti kalimat negatif: 안, 못, 없다, atau 모르다. Contoh: ",
          b("만 원밖에 없어요"),
          ".",
        ),
        p(
          b("Artinya apa sih? "),
          "Strukturnya mirip ",
          i("‘nggak ada selain ...’"),
          ". 세 명밖에 안 왔어요 itu literally ‘selain tiga orang, nggak ada yang dateng’, alias baru tiga orang.",
        ),
        h3("Contoh"),
        ex("세 명밖에 안 왔어요.", "Baru tiga orang yang dateng."),
        ex("지갑에 만 원밖에 없어요.", "Di dompet cuma ada sepuluh ribu won."),
        ex("한국어는 조금밖에 못 해요.", "Bahasa Korea aku cuma bisa dikit."),
        ex("아직 한 번밖에 안 가 봤어요.", "Baru sekali aku ke sana."),
        ex(
          "나한테는 너밖에 없어.",
          "Aku cuma punya kamu.",
          "반말, drakor banget",
        ),
        callout(
          "warning",
          "Jebakan: jangan lupa negatifnya. ✗ 세 명밖에 왔어요 itu salah. Kalau mau kalimat positif, pakai ",
          b("-만"),
          ": 세 명만 왔어요 (cuma tiga, netral). -밖에 안 lebih kerasa ‘dikit banget’.",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("baru", "ik-baru"),
          ". Bedanya sama ",
          ref("방금 / 이제야", "ki-bangeum"),
          ": itu ‘baru’ yang soal waktu.",
        ),
      ],
    },
    "ki-geoui": {
      description:
        "거의 = hampir, buat jumlah atau tingkat: hampir selesai, hampir tiap hari.",
      blocks: [
        callout(
          "info",
          b("거의"),
          " = ",
          i("hampir"),
          " buat jumlah atau tingkat. Sering bareng 다: ",
          b("거의 다"),
          " (hampir semua). Kalau diikuti kalimat negatif, artinya ",
          i("hampir nggak, jarang banget"),
          ": 거의 안 먹어요.",
        ),
        p(
          b("Artinya apa sih? "),
          "Bayangin progress bar. 거의 itu bar yang udah 90%: hampir selesai, hampir nyampe, hampir abis.",
        ),
        h3("Contoh"),
        ex("거의 다 했어요.", "Udah hampir selesai."),
        ex(
          "거의 다 왔어요!",
          "Udah hampir nyampe!",
          "chat ke temen yang nunggu",
        ),
        ex(
          "요즘 거의 매일 야근해요.",
          "Akhir-akhir ini hampir tiap hari lembur.",
        ),
        ex("고기는 거의 안 먹어요.", "Aku hampir nggak pernah makan daging."),
        callout(
          "warning",
          "Jebakan: ‘hampir jatuh’, ‘hampir telat’ (nyaris kejadian, tapi nggak jadi) bukan 거의. Pakai ",
          ref("-(으)ㄹ 뻔했다", "ki-eul-ppeonhada"),
          ": 넘어질 뻔했어요.",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("hampir", "ik-hampir"),
          ".",
        ),
      ],
    },
    "ki-gyeolguk": {
      description:
        "결국 = akhirnya, ujung-ujungnya: hasil setelah proses atau galau, sering nggak sesuai rencana.",
      blocks: [
        callout(
          "info",
          b("결국"),
          " = ",
          i("akhirnya, ujung-ujungnya"),
          ", setelah proses, galau, atau perjuangan. Hasilnya bisa baik atau buruk, tapi sering nggak sesuai rencana awal. Taruh di awal kalimat atau sebelum kata kerja.",
        ),
        p(
          b("Artinya apa sih? "),
          "Pas banget sama ",
          i("‘ujung-ujungnya’"),
          ": udah mikir lama, udah nahan-nahan, eh hasilnya begini juga.",
        ),
        h3("Contoh"),
        ex(
          "고민하다가 결국 안 갔어요.",
          "Mikir-mikir, ujung-ujungnya nggak jadi pergi.",
        ),
        ex("계속 참다가 결국 울었어요.", "Nahan terus, akhirnya nangis juga."),
        ex("결국 사장님한테 혼났어요.", "Ujung-ujungnya dimarahin bos."),
        ex(
          "힘들어도 결국 다 잘될 거예요.",
          "Walaupun berat, pada akhirnya semua bakal baik-baik aja.",
        ),
        callout(
          "warning",
          "Jebakan: ‘akhirnya!’ yang seneng karena udah lama ditunggu itu ",
          b("드디어"),
          ", bukan 결국. 드디어 비자가 나왔어요! = ‘Akhirnya visaku keluar!’",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("nggak jadi", "ik-nggak-jadi"),
          ". Bedanya sama ",
          ref("-게 되다", "ki-ge-doeda"),
          ": itu akhiran kata kerja (‘jadi ...’ karena keadaan), dan bisa dipakai bareng: 결국 한국에 가게 됐어요.",
        ),
      ],
    },
  },
  vocabulary: {
    title: "Kosakata: kata kecil waktu dan jumlah",
    description:
      "Tujuh kata kecil soal waktu dan jumlah, masing-masing dengan arti dan satu contoh kalimat.",
    entries: [
      {
        term: "좀",
        meanings: ["dong", "sedikit", "agak"],
        example: { ko: "좀 도와주세요.", id: "Bantuin dong." },
      },
      {
        term: "벌써 / 이미",
        meanings: ["udah (kok cepet)", "sudah"],
        example: { ko: "벌써 열 시예요?", id: "Hah, udah jam sepuluh?" },
      },
      {
        term: "아직 / 아직도",
        meanings: ["belum", "masih", "masih aja"],
        example: { ko: "아직 밥 안 먹었어요.", id: "Aku belum makan." },
      },
      {
        term: "방금 / 이제 막 / 이제야",
        meanings: ["barusan", "baru mulai", "baru sekarang"],
        example: { ko: "방금 도착했어요.", id: "Baru aja sampai." },
      },
      {
        term: "-밖에 안/못",
        meanings: ["cuma", "baru (jumlah)"],
        example: {
          ko: "지갑에 만 원밖에 없어요.",
          id: "Di dompet cuma ada sepuluh ribu won.",
        },
      },
      {
        term: "거의",
        meanings: ["hampir", "hampir nggak (+ negatif)"],
        example: { ko: "거의 다 했어요.", id: "Udah hampir selesai." },
      },
      {
        term: "결국",
        meanings: ["akhirnya", "ujung-ujungnya"],
        example: {
          ko: "고민하다가 결국 안 갔어요.",
          id: "Mikir-mikir, ujung-ujungnya nggak jadi pergi.",
        },
      },
    ],
  },
  quiz: {
    title: "Kuis: kata kecil waktu dan jumlah",
    description:
      "12 soal pilihan ganda soal 좀, 벌써, 아직, 방금, -밖에, 거의, dan 결국. Lulus kalau benar minimal 70%.",
    passingScore: 70,
    questions: [
      {
        key: "ki09-jom",
        prompt:
          "Kata mana yang bikin permintaan jadi halus, kayak ‘dong’ di ‘bantuin dong’?",
        options: [
          { text: "좀", correct: true },
          { text: "벌써" },
          { text: "거의" },
          { text: "결국" },
        ],
        explanation:
          "좀 asalnya dari 조금 (sedikit), tapi di obrolan tugasnya ngalusin permintaan: 좀 도와주세요 = bantuin dong.",
      },
      {
        key: "ki09-jom-geurae",
        prompt:
          "Kamu ngajak temen Korea nonton, dia jawab ‘음... 좀 그래.’ Maksudnya?",
        options: [
          { text: "Nggak deh (nolak halus)", correct: true },
          { text: "Boleh, agak seru kayaknya" },
          { text: "Bentar lagi aku kabarin" },
        ],
        explanation:
          "좀 그래 itu cara super halus buat bilang ‘nggak deh’. Bukan ‘agak oke’, jangan auto seneng dulu.",
      },
      {
        key: "ki09-beolsseo",
        prompt:
          "Temenmu dateng jauh lebih cepet dari janji. Kamu kaget: ‘Hah, udah dateng?’",
        options: [
          { text: "벌써 왔어요?", correct: true },
          { text: "아직 왔어요?" },
          { text: "방금 와요?" },
          { text: "거의 왔어요?" },
        ],
        explanation:
          "벌써 = udah, plus kaget karena lebih cepet dari dugaan. 이미 lebih datar, tanpa rasa kaget.",
      },
      {
        key: "ki09-imi",
        prompt:
          "‘Keretanya udah berangkat’ (kamu telat). Kata yang paling pas?",
        options: [
          { text: "기차가 이미 떠났어요.", correct: true },
          { text: "기차가 아직 떠났어요." },
          { text: "기차가 거의 떠났어요." },
        ],
        explanation:
          "이미 = sudah, fakta datar dengan rasa ‘udah telat’. 아직 + positif artinya ‘masih’, jadi kalimatnya jadi aneh.",
      },
      {
        key: "ki09-ajigiyo",
        prompt:
          "반장님 nanya ‘다 했어요?’ dan kamu belum selesai. Jawaban yang pas?",
        options: [
          { text: "아직이요.", correct: true },
          { text: "아니요." },
          { text: "벌써요." },
          { text: "방금이요." },
        ],
        explanation:
          "Buat ‘belum’, jawab 아직이요. 아니요 artinya ‘nggak’, kedengeran kayak kamu nggak bakal ngerjainnya sama sekali.",
      },
      {
        key: "ki09-ajikdo",
        prompt: "‘아직도 자?’ artinya apa?",
        options: [
          { text: "Masih aja tidur?", correct: true },
          { text: "Belum tidur?" },
          { text: "Udah tidur?" },
          { text: "Baru aja tidur?" },
        ],
        explanation:
          "아직도 = masih aja, biasanya dengan nada heran atau kesel. Vibes-nya kayak emak yang bangunin kamu jam 12 siang.",
      },
      {
        key: "ki09-geumbang",
        prompt: "Temen chat: ‘금방 갈게!’ Artinya?",
        options: [
          { text: "Bentar lagi aku dateng!", correct: true },
          { text: "Aku barusan dateng!" },
          { text: "Aku baru sekarang dateng!" },
          { text: "Aku udah dateng duluan!" },
        ],
        explanation:
          "금방 = bentar lagi (nanti). Jangan ketuker sama 방금 = barusan (udah lewat). Hurufnya kebalik, artinya juga kebalik.",
      },
      {
        key: "ki09-ijeya",
        prompt:
          "‘Udah dijelasin tiga kali, (___) ngerti.’ Rasanya ‘baru sekarang, telat banget’. Isi yang pas?",
        options: [
          { text: "이제야 이해했어요", correct: true },
          { text: "방금 이해했어요" },
          { text: "벌써 이해했어요" },
        ],
        explanation:
          "이제야 = baru sekarang, setelah lama atau telat. 방금 cuma ‘barusan’, dan 벌써 malah ‘kok cepet’.",
      },
      {
        key: "ki09-bakke",
        prompt: "‘Baru tiga orang yang dateng.’ Yang bener?",
        options: [
          { text: "세 명밖에 안 왔어요.", correct: true },
          { text: "세 명밖에 왔어요." },
          { text: "세 명밖에 많이 왔어요." },
          { text: "거의 세 명 왔어요." },
        ],
        explanation:
          "-밖에 wajib diikuti kalimat negatif (안, 못, 없다). ✗ 세 명밖에 왔어요 salah. Mau positif? Pakai -만: 세 명만 왔어요.",
      },
      {
        key: "ki09-geoui",
        prompt: "‘Udah hampir selesai.’ Yang bener?",
        options: [
          { text: "거의 다 했어요.", correct: true },
          { text: "다 할 뻔했어요." },
          { text: "결국 다 했어요." },
          { text: "벌써 안 했어요." },
        ],
        explanation:
          "거의 = hampir buat jumlah atau tingkat. -(으)ㄹ 뻔했다 itu ‘hampir’ yang nyaris kejadian tapi nggak jadi, kayak hampir jatuh.",
      },
      {
        key: "ki09-deudieo",
        prompt:
          "Kamu seneng banget karena udah lama nunggu: ‘Akhirnya visaku keluar!’",
        options: [
          { text: "드디어 비자가 나왔어요!", correct: true },
          { text: "결국 비자가 나왔어요!" },
          { text: "이미 비자가 나왔어요!" },
          { text: "거의 비자가 나왔어요!" },
        ],
        explanation:
          "‘Akhirnya!’ yang seneng karena lama ditunggu = 드디어. 결국 lebih ke ‘ujung-ujungnya’, sering buat hasil yang nggak sesuai rencana.",
      },
      {
        key: "ki09-gyeolguk",
        prompt:
          "‘Mikir-mikir, ujung-ujungnya nggak jadi pergi.’ Isi yang pas: 고민하다가 (___) 안 갔어요.",
        options: [
          { text: "결국", correct: true },
          { text: "드디어" },
          { text: "방금" },
        ],
        explanation:
          "결국 = ujung-ujungnya, hasil setelah galau panjang. 드디어 itu ‘akhirnya!’ yang seneng, nggak cocok buat batal pergi.",
      },
    ],
  },
});
