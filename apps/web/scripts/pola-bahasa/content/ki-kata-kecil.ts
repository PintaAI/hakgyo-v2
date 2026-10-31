import {
  b,
  bullet,
  callout,
  chat,
  defineMaterial,
  ex,
  h3,
  i,
  opener,
  p,
  quizRef,
  ref,
  table,
} from "../blocks";

export default defineMaterial({
  key: "ki-kata-kecil",
  title: "Kata keterangan obrolan",
  description:
    "좀, 벌써, 아직, 어쩐지, 하긴, 됐어: kata-kata kecil yang bikin omongan kamu kedengeran kayak orang Korea beneran, bukan buku pelajaran.",
  intro: [
    opener({
      eyebrow: "PAHAM POLA · BAB 9",
      chapterNumber: "09",
      titleKo: "작은 말, 큰 차이",
      subtitle:
        "좀, 벌써, 어쩐지, 하긴, 됐어: kata kecil yang bikin kamu kedengeran kayak orang Korea beneran.",
      question: "벌써 다 했어요?",
      answer: "아직이요. 근데 거의 다 했어요!",
      focus: [
        {
          label: "문법 · Pola",
          title: "-밖에 + negatif",
          description: "‘Cuma, baru’ yang wajib diikuti 안, 못, atau 없다.",
        },
        {
          label: "표현 · Kata kunci",
          title: "좀 · 어쩐지 · 혹시",
          description:
            "Dong, pantesan, kira-kira: tiga kata yang bikin obrolan hidup.",
        },
        {
          label: "함정 · Jebakan",
          title: "방금 ≠ 금방",
          description:
            "Barusan vs bentar lagi. Hurufnya kebalik, artinya juga.",
        },
      ],
      objectives: [
        {
          ko: "대화에서 자주 쓰는 부사를 자연스럽게 쓸 수 있어요.",
          id: "Bisa nyelipin kata keterangan obrolan dengan natural.",
        },
        {
          ko: "비슷한 말의 느낌 차이를 알 수 있어요.",
          id: "Bisa bedain rasa kata yang mirip: 벌써/이미, 결국/드디어, 방금/금방.",
        },
      ],
      theme: "rose",
    }),
    p(
      "Tata bahasa bikin kalimat kamu bener. Kata-kata kecil bikin kalimat kamu ",
      b("hidup"),
      ". Orang Korea nggak ngomong ‘tolong bantu saya’, mereka bilang 좀 도와주세요. Mereka nggak bilang ‘ternyata dia orang Indonesia’ secara kaku, mereka bilang 알고 보니...",
    ),
    p(
      "Materi ini isinya 22 kata dan ungkapan yang paling sering nongol di obrolan, drakor, dan tempat kerja. Nggak ada rumus ribet. Tiap kata cukup kamu pahami rasanya lewat padanan Indonesia, liat contohnya, dan hindari jebakannya.",
    ),
    callout(
      "tip",
      "Cara belajar paling efektif: pilih 3 kata per hari, terus selipin ke chat kamu sama temen Korea atau ke catatan harian. Dalam seminggu, semuanya udah nempel.",
    ),
  ],
  sections: [
    // ───────────────────────────── 좀
    {
      key: "jom",
      title: "좀: dong, agak",
      blocks: [
        p(
          b("좀"),
          " asalnya dari 조금 (sedikit). Tapi di obrolan, tugas utamanya adalah ",
          b("ngalusin permintaan"),
          ", persis kayak ",
          i("dong"),
          " atau ",
          i("ya"),
          " di ",
          i("‘bantuin dong’"),
          ". Tanpa 좀, permintaan bisa kedengeran kayak perintah.",
        ),
        p(
          "Rasa lainnya: ",
          i("agak"),
          " (좀 비싸요 = agak mahal) dan, kalau diucapin ketus, ",
          i("‘ih, please deh!’"),
          ".",
        ),
        h3("Contoh"),
        ex("좀 도와주세요.", "Bantuin dong."),
        ex("소금 좀 주세요.", "Minta garemnya ya.", "di restoran"),
        ex("잠깐만 좀 기다려 주세요.", "Tunggu sebentar ya."),
        ex("이거 좀 비싸네요.", "Ini agak mahal ya."),
        ex("야, 좀 조용히 해!", "Woy, bisa diem nggak sih!", "반말, kesel"),
        callout(
          "tip",
          "좀 그래요 (agak gimana gitu) adalah cara super halus buat nolak atau nggak setuju. Kalau temen Korea jawab ‘음... 좀 그래’, itu artinya ‘nggak deh’.",
        ),
        p("Dari arah Indonesia: ", ref("dong", "ik-partikel", "dong"), "."),
      ],
    },
    // ───────────────────────────── 벌써 / 이미
    {
      key: "beolsseo",
      title: "벌써 / 이미: udah (kok cepet) / sudah",
      blocks: [
        p(
          "Dua-duanya ",
          i("udah"),
          ", tapi rasanya beda. ",
          b("벌써"),
          " = udah, dan kamu kaget karena lebih cepet dari dugaan (",
          i("‘hah, udah?!’"),
          "). ",
          b("이미"),
          " = sudah, fakta datar, sering dengan rasa ‘udah telat’.",
        ),
        h3("Contoh"),
        ex("벌써 열 시예요?", "Hah, udah jam sepuluh aja?"),
        ex("벌써 다 먹었어요? 빠르다!", "Udah abis? Cepet amat!"),
        ex(
          "이미 늦었어요. 기차가 떠났어요.",
          "Udah telat. Keretanya udah jalan.",
        ),
        ex("그건 이미 알고 있어요.", "Itu aku udah tau kok."),
        ex("벌써 일 년이 지났네.", "Nggak kerasa udah setahun ya.", "반말"),
        callout(
          "warning",
          "Jebakan: ‘udah’ yang biasa (udah makan, udah sampe) nggak butuh kata apa-apa, cukup bentuk lampau: 밥 먹었어요. Kalau kamu nambahin 벌써 ke temen yang baru dateng (벌써 왔어요?), artinya ‘kok udah dateng? cepet banget’.",
        ),
        p(
          "Lawannya: ",
          ref("아직", "ki-kata-kecil", "ajik"),
          ". Dari arah Indonesia: ",
          ref("udah", "ik-waktu", "udah"),
          " dan ",
          ref("keburu", "ik-waktu", "keburu"),
          ".",
        ),
      ],
    },
    // ───────────────────────────── 아직 / 아직도
    {
      key: "ajik",
      title: "아직 / 아직도: belum, masih / masih aja",
      blocks: [
        p(
          b("아직"),
          " artinya dua, tergantung kalimatnya. Diikuti kalimat negatif = ",
          i("belum"),
          " (아직 안 먹었어요). Diikuti kalimat positif = ",
          i("masih"),
          " (아직 일해요). ",
          b("아직도"),
          " = ",
          i("masih aja"),
          ", biasanya dengan nada heran atau kesel.",
        ),
        h3("Contoh"),
        ex("아직 밥 안 먹었어요.", "Belum makan."),
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
          "Jebakan: kalau ditanya ‘udah?’ dan jawabannya ‘belum’, bilang 아직이요 (atau 아직요), bukan 아니요. 아니요 artinya ‘nggak’, kedengeran kayak kamu nggak akan ngelakuinnya sama sekali.",
        ),
        p(
          "Dari arah Indonesia: ",
          ref("belum", "ik-waktu", "belum"),
          " dan ",
          ref("masih", "ik-waktu", "masih"),
          ".",
        ),
      ],
    },
    // ───────────────────────────── 방금 / 이제 막 / 이제야
    {
      key: "bangeum",
      title: "방금 / 이제 막 / 이제야: baru aja, baru mulai, baru sekarang",
      blocks: [
        p(
          "Kata ",
          i("baru"),
          " di bahasa Indonesia punya banyak arti. Bahasa Korea misahin:",
        ),
        table([
          ["Korea", "Indonesia", "Contoh"],
          ["방금", "baru aja (barusan)", "방금 도착했어요."],
          ["이제 막", "baru mulai, baru banget", "이제 막 시작했어요."],
          ["이제야", "baru sekarang (akhirnya, telat)", "이제야 이해했어요."],
          [
            ref("-밖에 안", "ki-kata-kecil", "bakke"),
            "baru (jumlahnya sedikit)",
            "세 명밖에 안 왔어요.",
          ],
        ]),
        h3("Contoh"),
        ex("방금 도착했어요.", "Baru aja sampe."),
        ex("방금 뭐라고 했어요?", "Barusan kamu bilang apa?"),
        ex(
          "한국에 온 지 이제 막 한 달 됐어요.",
          "Baru banget sebulan aku di Korea.",
        ),
        ex(
          "설명을 세 번 듣고 이제야 이해했어요.",
          "Udah dijelasin tiga kali, baru sekarang ngerti.",
        ),
        callout(
          "warning",
          "Jebakan: 방금 dan 금방 kebalik hurufnya, artinya juga beda. 방금 = barusan (udah lewat). 금방 = bentar lagi / cepet (nanti). 금방 갈게요 = ‘Bentar lagi aku dateng.’",
        ),
        p("Dari arah Indonesia: ", ref("baru", "ik-waktu", "baru"), "."),
      ],
    },
    // ───────────────────────────── -밖에 안/못
    {
      key: "bakke",
      title: "-밖에 안/못: cuma, baru",
      blocks: [
        p(
          b("-밖에"),
          " ditempel ke kata benda, terus ",
          b("wajib"),
          " diikuti kalimat negatif (안, 못, 없다, 모르다). Artinya ",
          i("cuma"),
          " atau ",
          i("baru"),
          ", dengan rasa ‘kurang dari harapan’.",
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
          "Jebakan: jangan lupa negatifnya. ✗ 세 명밖에 왔어요 salah. Kalau mau kalimat positif, pakai -만: 세 명만 왔어요 (yang dateng cuma tiga, netral). -밖에 안 lebih ngerasa ‘dikit banget’.",
        ),
        callout(
          "info",
          "밖에 juga artinya ‘di luar’: 밖에 비가 와요 (di luar hujan). Bedain dari posisinya: -밖에 ‘cuma’ nempel langsung ke kata benda dan diikuti negatif.",
        ),
        p(
          "Dari arah Indonesia: ",
          ref("baru", "ik-waktu", "baru"),
          " (baru sedikit).",
        ),
      ],
    },
    // ───────────────────────────── 거의
    {
      key: "geoui",
      title: "거의: hampir (jumlah)",
      blocks: [
        p(
          b("거의"),
          " = ",
          i("hampir"),
          " buat jumlah atau tingkat: hampir selesai, hampir tiap hari, hampir sampe. Kalau diikuti negatif, artinya ",
          i("hampir nggak"),
          " / ",
          i("jarang banget"),
          ".",
        ),
        h3("Contoh"),
        ex("거의 다 했어요.", "Udah hampir selesai."),
        ex(
          "거의 다 왔어요!",
          "Udah hampir nyampe!",
          "chat sama temen yang nunggu",
        ),
        ex(
          "요즘 거의 매일 야근해요.",
          "Akhir-akhir ini hampir tiap hari lembur.",
        ),
        ex("고기는 거의 안 먹어요.", "Aku hampir nggak pernah makan daging."),
        ex("통장에 돈이 거의 없어.", "Tabunganku udah hampir abis.", "반말"),
        callout(
          "warning",
          "Jebakan: ‘hampir jatuh’, ‘hampir telat’ (nyaris terjadi tapi nggak) bukan 거의. Pakai ",
          ref("-(으)ㄹ 뻔했다", "ki-keadaan", "eul-ppeonhada"),
          ": 넘어질 뻔했어요.",
        ),
        p("Dari arah Indonesia: ", ref("hampir", "ik-waktu", "hampir"), "."),
      ],
    },
    // ───────────────────────────── 결국
    {
      key: "gyeolguk",
      title: "결국: akhirnya, ujung-ujungnya",
      blocks: [
        p(
          b("결국"),
          " = ",
          i("akhirnya"),
          " atau ",
          i("ujung-ujungnya"),
          ", setelah proses, galau, atau perjuangan. Hasilnya bisa baik atau buruk, tapi sering nggak sesuai rencana awal.",
        ),
        h3("Contoh"),
        ex(
          "고민하다가 결국 안 갔어요.",
          "Mikir-mikir, ujung-ujungnya nggak jadi pergi.",
        ),
        ex("계속 참다가 결국 울었어요.", "Nahan terus, akhirnya nangis juga."),
        ex("결국 사장님한테 혼났어요.", "Ujung-ujungnya dimarahin bos."),
        ex(
          "힘들어도 결국은 다 잘될 거예요.",
          "Walaupun berat, pada akhirnya semua bakal baik-baik aja.",
        ),
        callout(
          "warning",
          "Jebakan: ‘akhirnya!’ yang seneng karena udah lama ditunggu itu 드디어, bukan 결국. 드디어 비자가 나왔어요! = ‘Akhirnya visaku keluar!’ 결국 lebih ke ‘ujung-ujungnya’.",
        ),
        p(
          "Pola yang nyambung: ",
          ref("-게 되다", "ki-keadaan", "ge-doeda"),
          " (jadi ..., karena keadaan). Dari arah Indonesia: ",
          ref("nggak jadi", "ik-waktu", "nggak-jadi"),
          ".",
        ),
      ],
    },
    // ───────────────────────────── 오히려
    {
      key: "ohiryeo",
      title: "오히려: malah, justru",
      blocks: [
        p(
          b("오히려"),
          " = ",
          i("malah"),
          " atau ",
          i("justru"),
          ". Hasilnya kebalikan dari yang kamu kira.",
        ),
        h3("Contoh"),
        ex(
          "약을 먹었는데 오히려 더 아파요.",
          "Udah minum obat, malah tambah sakit.",
        ),
        ex(
          "도와주려고 했는데 오히려 방해가 됐어요.",
          "Niatnya bantu, malah ngerepotin.",
        ),
        ex("쉬는 날이 오히려 더 피곤해요.", "Hari libur justru lebih capek."),
        ex(
          "A: 도와줘서 고마워요. B: 제가 오히려 감사하죠.",
          "A: Makasih udah bantu. B: Justru aku yang makasih.",
        ),
        callout(
          "warning",
          "Jebakan: ‘bukannya ..., malah ...’ (bukannya minta maaf, malah marah) lebih pas pakai ",
          ref("-기는커녕", "ki-waktu-sebab", "gineunkeonyeong"),
          ": 사과하기는커녕 화를 냈어요.",
        ),
        p("Dari arah Indonesia: ", ref("malah", "ik-alasan", "malah"), "."),
      ],
    },
    // ───────────────────────────── 심지어 / -조차 / -까지
    {
      key: "simjieo",
      title: "심지어 / -조차 / -까지: bahkan",
      blocks: [
        p(i("Bahkan"), " punya beberapa versi di bahasa Korea:"),
        table([
          ["Korea", "Posisi", "Rasanya"],
          ["심지어", "Di awal kalimat", "bahkan (paling umum)"],
          [
            "-조차",
            "Nempel ke kata benda",
            "bahkan ... pun (biasanya negatif)",
          ],
          [
            "-까지",
            "Nempel ke kata benda",
            "bahkan sampai ... (nambah-nambahin)",
          ],
          ["-도", "Nempel ke kata benda", "juga / pun (paling ringan)"],
        ]),
        h3("Contoh"),
        ex("심지어 사장님도 몰라요.", "Bahkan bos juga nggak tau."),
        ex(
          "너무 바빠서 물조차 못 마셨어요.",
          "Sibuk banget, bahkan minum aja nggak sempet.",
        ),
        ex(
          "비가 오는데 바람까지 불어요.",
          "Udah hujan, anginnya kenceng pula.",
        ),
        ex("인사조차 안 하고 갔어요.", "Dia pergi, bahkan nggak pamit."),
        ex(
          "그 사람은 심지어 제 이름도 몰라요.",
          "Orang itu bahkan nggak tau namaku.",
        ),
        callout(
          "warning",
          "Jebakan: -조차 hampir selalu dipakai di kalimat negatif atau keadaan buruk. Buat ‘bahkan’ yang positif (bahkan dia bisa masak rendang!), pakai 심지어 atau -까지: 심지어 렌당까지 만들 줄 알아요.",
        ),
        p("Dari arah Indonesia: ", ref("bahkan", "ik-alasan", "bahkan"), "."),
      ],
    },
    // ───────────────────────────── 차라리
    {
      key: "charari",
      title: "차라리: mending ... aja",
      blocks: [
        p(
          b("차라리"),
          " = ",
          i("mending ... aja"),
          ", dengan rasa pasrah. Dua pilihannya sama-sama kurang oke, dan kamu milih yang paling nggak nyebelin.",
        ),
        h3("Contoh"),
        ex("차라리 내가 할게요.", "Udah, mending aku aja yang kerjain."),
        ex(
          "이렇게 기다릴 거면 차라리 걸어가요.",
          "Kalau nunggunya selama ini, mending jalan kaki aja.",
        ),
        ex(
          "이럴 거면 차라리 안 갈래.",
          "Kalau gini caranya, mending nggak usah pergi.",
          "반말",
        ),
        ex("차라리 잘됐네요.", "Malah bagus deh jadinya."),
        callout(
          "warning",
          "Jebakan: buat saran netral (‘mendingan naik subway’), pakai ",
          ref("-는 게 낫다", "ki-andai", "neun-ge-natda"),
          ". 차라리 ke atasan bisa kedengeran kayak kamu kesel sama pilihan lainnya.",
        ),
        p(
          "Dari arah Indonesia: ",
          ref("mendingan", "ik-alasan", "mendingan"),
          ".",
        ),
      ],
    },
    // ───────────────────────────── 어쩐지
    {
      key: "eojjeonji",
      title: "어쩐지: pantesan",
      blocks: [
        p(
          b("어쩐지"),
          " = ",
          i("pantesan"),
          ". Kamu udah ngerasa ada yang aneh, terus sekarang dapet penjelasannya. Pasangan setianya: ",
          ref("-더라", "ki-akhiran-rasa", "deora"),
          " atau ",
          b("-다 했어"),
          " (‘udah kuduga’).",
        ),
        h3("Contoh"),
        ex(
          "아, 오늘 세일이구나. 어쩐지 사람이 많더라.",
          "Oh, hari ini diskon. Pantesan rame.",
        ),
        ex(
          "A: 민수 씨 어제 밤새웠대요. B: 어쩐지 피곤해 보이더라고요.",
          "A: Katanya Minsu begadang semalem. B: Pantesan keliatan capek.",
        ),
        ex(
          "어쩐지 조용하다 했어. 다 나갔구나.",
          "Pantesan sepi. Semua pada keluar toh.",
          "반말",
        ),
        ex(
          "어쩐지 맛있더라. 사장님이 직접 만드셨구나!",
          "Pantesan enak. Ternyata bos sendiri yang masak!",
        ),
        callout(
          "info",
          "어쩐지 kadang juga artinya ‘entah kenapa’: 어쩐지 기분이 좋아요 = ‘Entah kenapa aku lagi seneng.’ Kalau nggak ada penjelasan yang nyusul, biasanya artinya yang ini.",
        ),
        p(
          "Dari arah Indonesia: ",
          ref("pantesan", "ik-dugaan", "pantesan"),
          ".",
        ),
      ],
    },
    // ───────────────────────────── 알고 보니
    {
      key: "algo-boni",
      title: "알고 보니: ternyata (setelah tau)",
      blocks: [
        p(
          b("알고 보니"),
          " secara harfiah ‘setelah tau dan diliat’. Artinya ",
          i("ternyata"),
          " waktu fakta sebenarnya terbongkar. Biasanya dipakai buat cerita, dengan kalimat lampau.",
        ),
        h3("Contoh"),
        ex(
          "알고 보니 인도네시아 사람이었어요.",
          "Ternyata dia orang Indonesia.",
        ),
        ex(
          "화난 줄 알았는데 알고 보니 그냥 피곤했던 거였어요.",
          "Kirain dia marah, ternyata cuma capek.",
        ),
        ex("알고 보니 같은 고향이었어요!", "Ternyata kita sekampung!"),
        ex(
          "알고 보니 그 가게 할랄 인증이 있더라고요.",
          "Ternyata toko itu ada sertifikat halalnya.",
        ),
        callout(
          "warning",
          "Jebakan: ‘ternyata’ punya tiga padanan. Reaksi spontan saat itu (ternyata enak!) → ",
          ref("-네요", "ki-akhiran-rasa", "neyo"),
          ". Cerita hal yang kamu liat sendiri → ",
          ref("-더라고요", "ki-akhiran-rasa", "deora"),
          ". Fakta yang terbongkar, kebalikan dari dugaan → 알고 보니.",
        ),
        p(
          "Dari arah Indonesia: ",
          ref("ternyata", "ik-dugaan", "ternyata"),
          ".",
        ),
      ],
    },
    // ───────────────────────────── 혹시 / 설마
    {
      key: "hoksi",
      title: "혹시 / 설마: kira-kira, jangan-jangan / masa sih",
      blocks: [
        p(
          b("혹시"),
          " punya dua tugas. Pertama, pembuka pertanyaan yang sopan: ",
          i("‘maaf, kira-kira ...?’"),
          ". Kedua, ",
          i("jangan-jangan"),
          ". ",
          b("설마"),
          " = ",
          i("masa sih / jangan-jangan"),
          " yang kamu harap nggak bener.",
        ),
        h3("Contoh"),
        ex(
          "혹시 인도네시아 분이세요?",
          "Maaf, Mas/Mbak orang Indonesia ya?",
          "nyapa orang asing",
        ),
        ex("혹시 제 우산 못 보셨어요?", "Kira-kira liat payungku nggak?"),
        ex("혹시 걔 잊어버린 거 아니야?", "Jangan-jangan dia lupa?", "반말"),
        ex("설마 벌써 다 먹었어?", "Masa udah kamu abisin semua?", "반말"),
        ex(
          "A: 민수 씨 회사 그만둔대요. B: 설마요!",
          "A: Katanya Minsu resign. B: Masa sih!",
        ),
        callout(
          "tip",
          "혹시 adalah senjata sopan buat ngomong ke orang asing atau atasan. Tambahin di depan pertanyaan apa aja, dan kalimat kamu langsung kedengeran lebih halus.",
        ),
        p(
          "Dari arah Indonesia: ",
          ref("jangan-jangan", "ik-dugaan", "jangan-jangan"),
          ".",
        ),
      ],
    },
    // ───────────────────────────── 다행이다 / 다행히
    {
      key: "dahaeng",
      title: "다행이다 / 다행히: untung, syukurlah",
      blocks: [
        p(
          b("다행이다"),
          " = ",
          i("untung / syukurlah"),
          ". Polanya: alasan + -아/어서 다행이에요. ",
          b("다행히"),
          " ditaruh di awal kalimat: ",
          i("untungnya ..."),
        ),
        h3("Contoh"),
        ex("비가 안 와서 다행이에요.", "Untung nggak hujan."),
        ex("다행히 크게 안 다쳤어요.", "Untungnya lukanya nggak parah."),
        ex(
          "막차를 탈 수 있어서 다행이었어요.",
          "Untung masih kekejar kereta terakhir.",
        ),
        ex("아, 다행이다!", "Fiuh, syukurlah!", "반말"),
        callout(
          "warning",
          "Jebakan: ‘untung’ yang artinya laba itu 이익, dan ‘beruntung / hoki’ itu 운이 좋다. 다행이다 khusus rasa lega karena yang buruk nggak terjadi.",
        ),
        p(
          "Sering muncul setelah ",
          ref("-(으)ㄹ 뻔했다", "ki-keadaan", "eul-ppeonhada"),
          ": 넘어질 뻔했는데 다행히 괜찮아요. Dari arah Indonesia: ",
          ref("untung", "ik-dugaan", "untung"),
          ".",
        ),
      ],
    },
    // ───────────────────────────── 아쉽다 / 아쉽게도
    {
      key: "aswipgedo",
      title: "아쉽다 / 아쉽게도: sayang banget, sayangnya",
      blocks: [
        p(
          b("아쉽다"),
          " = ",
          i("sayang banget, nanggung, kurang puas"),
          ". Dipakai waktu kesempatan lewat atau sesuatu kurang dikit. ",
          b("아쉽게도"),
          " = ",
          i("sayangnya"),
          ", di awal kalimat.",
        ),
        h3("Contoh"),
        ex(
          "아쉽게도 이번 주말에는 못 가요.",
          "Sayangnya weekend ini aku nggak bisa dateng.",
        ),
        ex("벌써 끝났어요? 아쉽다!", "Udah selesai? Yah, sayang banget!"),
        ex("같이 못 가서 아쉬워요.", "Sayang banget nggak bisa pergi bareng."),
        ex("아쉽게도 표가 다 팔렸어요.", "Sayangnya tiketnya udah sold out."),
        callout(
          "warning",
          "Jebakan: ‘sayang’ di bahasa Indonesia artinya banyak. ‘Kasihan’ (sayang ya dia sakit) = 안됐다 / 불쌍하다. ‘Sayang’ ke pacar = 자기야. ‘Sayang kalau dibuang’ = 아깝다. 아쉽다 khusus rasa ‘nanggung, kurang, kesempatan lewat’.",
        ),
        p(
          "Dari arah Indonesia: ",
          ref("sayangnya", "ik-dugaan", "sayangnya"),
          ".",
        ),
      ],
    },
    // ───────────────────────────── 하긴 / 원래
    {
      key: "hagin",
      title: "하긴 / 원래: emang sih / emang dari dulu",
      blocks: [
        p(
          b("하긴"),
          " = ",
          i("emang sih"),
          " atau ",
          i("iya juga ya"),
          ", waktu kamu setuju setelah mikir sebentar. ",
          b("원래"),
          " = ",
          i("emang (dari sananya)"),
          " atau ",
          i("aslinya"),
          ".",
        ),
        h3("Contoh"),
        ex(
          "하긴, 월요일이니까 피곤하겠다.",
          "Emang sih, hari Senin pasti capek.",
          "반말",
        ),
        ex(
          "A: 이 시간엔 택시 잡기 힘들어요. B: 하긴 그렇네요.",
          "A: Jam segini susah dapet taksi. B: Iya juga ya.",
        ),
        ex("걔는 원래 말이 없어요.", "Dia emang pendiem orangnya."),
        ex("원래 이 시간에는 길이 막혀요.", "Jam segini emang selalu macet."),
        ex("원래 계획은 그게 아니었어요.", "Rencana awalnya bukan gitu."),
        callout(
          "info",
          "원래 juga artinya ‘awalnya / aslinya’: 원래 부산 사람이에요 = ‘Aslinya orang Busan.’ Jadi kalau ada 원래, bayangin ‘dari sananya’.",
        ),
        p("Dari arah Indonesia: ", ref("emang", "ik-partikel", "emang"), "."),
      ],
    },
    // ───────────────────────────── 있잖아
    {
      key: "itjana",
      title: "있잖아: eh, tau nggak",
      blocks: [
        p(
          b("있잖아"),
          " (sopan: 있잖아요) adalah pembuka obrolan, kayak ",
          i("‘eh, tau nggak...’"),
          ", ",
          i("‘eh, gini loh...’"),
          ". Dipakai buat narik perhatian sebelum cerita atau minta sesuatu.",
        ),
        h3("Contoh"),
        ex(
          "있잖아, 나 어제 진짜 웃긴 일 있었어.",
          "Eh tau nggak, kemarin ada kejadian lucu banget.",
          "반말",
        ),
        ex(
          "있잖아요, 사장님... 내일 하루 쉬어도 될까요?",
          "Hmm, Pak... besok saya boleh libur sehari?",
        ),
        ex(
          "있잖아, 그 드라마 봤어?",
          "Eh, udah nonton drakor itu belum?",
          "반말",
        ),
        ...chat(
          [
            {
              who: "지은",
              ko: "있잖아, 나 어제 진짜 신기한 일 있었어.",
              id: "Eh tau nggak, kemarin ada kejadian ajaib banget.",
            },
            { who: "리나", ko: "뭔데?", id: "Apaan?" },
            {
              who: "지은",
              ko: "카페에서 옆 사람이 인도네시아어로 통화하더라.",
              id: "Di kafe, orang sebelahku nelpon pakai bahasa Indonesia.",
            },
            {
              who: "리나",
              ko: "혹시 유학생이었어?",
              id: "Kira-kira mahasiswa?",
            },
            {
              who: "지은",
              ko: "아니, 알고 보니 우리 회사 신입이었어!",
              id: "Bukan, ternyata karyawan baru di kantorku!",
            },
            {
              who: "리나",
              ko: "대박! 세상 진짜 좁다.",
              id: "Gila! Dunia sempit banget.",
            },
          ],
          {
            questions: [
              {
                ko: "지은은 왜 ‘있잖아’로 말을 시작했어요?",
                id: "Kenapa 지은 buka obrolan pakai 있잖아?",
              },
              {
                ko: "옆 사람은 알고 보니 누구였어요?",
                id: "Ternyata orang sebelahnya itu siapa?",
              },
            ],
            theme: "rose",
          },
        ),
        callout(
          "warning",
          "Jebakan: 있잖아 juga bisa artinya ‘kan ada’ (pola ",
          ref("-잖아", "ki-akhiran-rasa", "janayo"),
          "): 돈 있잖아 = ‘kan kamu punya duit’. Kalau di awal kalimat dan diikuti jeda, itu pembuka cerita.",
        ),
        p(
          "Dari arah Indonesia: ",
          ref("loh / tau nggak", "ik-partikel", "loh"),
          ".",
        ),
      ],
    },
    // ───────────────────────────── 왜
    {
      key: "wae",
      title: "왜: kenapa, kok",
      blocks: [
        p(
          b("왜"),
          " bukan cuma ",
          i("kenapa"),
          ". Di obrolan, rasanya sering ",
          i("kok"),
          ": heran atau protes halus. ",
          i("‘Kok belum dateng?’"),
          " = 왜 아직 안 와요?",
        ),
        h3("Contoh"),
        ex("왜 아직 안 와요?", "Kok belum dateng?"),
        ex("왜 이렇게 비싸요?", "Kok mahal banget sih?"),
        ex("왜, 무슨 일 있어?", "Kenapa, ada apa?", "반말"),
        ex("왜 그래? 어디 아파?", "Kamu kenapa? Sakit?", "반말"),
        callout(
          "warning",
          "Jebakan EPS: kalau 반장님 manggil nama kamu, jangan jawab 왜요? Itu bisa kedengeran ‘apaan sih?’. Jawab 네? atau 네, 반장님! Dan ‘kok’ yang kagum (kok enak!) bukan 왜, tapi ",
          ref("-네요", "ki-akhiran-rasa", "neyo"),
          ": 맛있네요!",
        ),
        p(
          "Dari arah Indonesia: ",
          ref("kok", "ik-partikel", "kok"),
          " dan ",
          ref("emang (kenapa?)", "ik-partikel", "emang"),
          ".",
        ),
      ],
    },
    // ───────────────────────────── 깜빡 / 나도 모르게 / 실수로
    {
      key: "kkamppak",
      title:
        "깜빡 / 나도 모르게 / 실수로: kelupaan, tanpa sadar, nggak sengaja",
      blocks: [
        p(
          "Tiga ungkapan ini kunci buat bikin rasa ",
          b("ke-an"),
          " Indonesia (kelupaan, ketiduran, keceplosan, kebawa):",
        ),
        table([
          ["Korea", "Indonesia", "Contoh"],
          ["깜빡하다 / 깜빡 잊다", "kelupaan (sebentar)", "깜빡했어요."],
          ["깜빡 잠들다", "ketiduran", "깜빡 잠들었어요."],
          ["나도 모르게", "tanpa sadar, refleks", "나도 모르게 말해 버렸어요."],
          ["실수로", "nggak sengaja, salah", "실수로 가져왔어요."],
        ]),
        h3("Contoh"),
        ex("아, 깜빡했어요! 죄송해요.", "Aduh, kelupaan! Maaf ya."),
        ex(
          "지갑을 깜빡하고 집에 두고 왔어요.",
          "Dompetku kelupaan ketinggalan di rumah.",
        ),
        ex(
          "드라마 보다가 깜빡 잠들었어요.",
          "Lagi nonton drakor, eh ketiduran.",
        ),
        ex(
          "너무 웃겨서 나도 모르게 크게 웃어 버렸어요.",
          "Lucu banget, tanpa sadar aku ketawa kenceng.",
        ),
        ex(
          "실수로 동료 우산을 가져왔어요.",
          "Payung temen kerja nggak sengaja kebawa.",
        ),
        callout(
          "tip",
          "Rumusnya: kata-kata ini + ",
          ref("-아/어 버리다", "ki-keadaan", "a-beorida"),
          " = rasa ke-an yang pas. 나도 모르게 말해 버렸어요 = keceplosan.",
        ),
        p(
          "Dari arah Indonesia: ",
          ref("kelupaan", "ik-nggak-sengaja", "kelupaan"),
          ", ",
          ref("ketiduran", "ik-nggak-sengaja", "ketiduran"),
          ", ",
          ref("keceplosan", "ik-nggak-sengaja", "keceplosan"),
          ", ",
          ref("kebawa", "ik-nggak-sengaja", "kebawa"),
          ".",
        ),
      ],
    },
    // ───────────────────────────── 당연하지
    {
      key: "dangyeonhaji",
      title: "당연하지: ya iya dong",
      blocks: [
        p(
          b("당연하지"),
          " (sopan: 당연하죠) = ",
          i("ya iya dong, jelas lah"),
          ". ",
          b("당연히"),
          " = ",
          i("tentu aja, pastinya"),
          ".",
        ),
        h3("Contoh"),
        ex(
          "A: 같이 갈래? B: 당연하지!",
          "A: Mau ikut? B: Ya iya dong!",
          "반말",
        ),
        ex("당연히 도와드려야죠.", "Ya pastinya harus aku bantu dong."),
        ex(
          "A: 이거 다 먹어도 돼? B: 당연하지, 다 먹어.",
          "A: Boleh aku abisin? B: Ya iyalah, abisin aja.",
          "반말",
        ),
        callout(
          "warning",
          "Jebakan: 당연하죠 ke atasan bisa kedengeran ‘ya jelas lah, ngapain nanya’. Ke 사장님, lebih aman pakai 그럼요 atau 물론이죠 (tentu, Pak).",
        ),
        p("Dari arah Indonesia: ", ref("dong", "ik-partikel", "dong"), "."),
      ],
    },
    // ───────────────────────────── 됐어
    {
      key: "dwaesseo",
      title: "됐어: udah deh, nggak usah",
      blocks: [
        p(
          b("됐어"),
          " (sopan: 됐어요) asalnya dari 되다 (jadi). Artinya tergantung nada:",
        ),
        bullet(
          b("Udah jadi / beres"),
          ": 밥 다 됐어요 = ",
          i("Makanannya udah siap."),
        ),
        bullet(
          b("Udah deh, nggak usah"),
          ": 됐어, 내가 할게 = ",
          i("Udah, nggak usah, aku aja."),
        ),
        bullet(b("Berhasil!"), ": 됐다! = ", i("Yes, bisa!")),
        h3("Contoh"),
        ex("밥 다 됐어요. 드세요.", "Makanan udah siap. Silakan makan."),
        ex(
          "A: 도와줄까? B: 됐어, 내가 할게.",
          "A: Mau aku bantu? B: Nggak usah, aku aja.",
          "반말",
        ),
        ex("됐다! 드디어 끝났다!", "Yes! Akhirnya kelar juga!", "반말"),
        ex("이제 됐어?", "Udah puas sekarang?", "반말, sarkas"),
        callout(
          "warning",
          "Jebakan: 됐어 dengan nada ketus artinya ‘udahlah!’ yang dingin, kayak orang ngambek. Ke atasan atau orang yang nawarin bantuan, tolak halus pakai 괜찮아요 (nggak apa-apa, makasih).",
        ),
        p(
          "Dari arah Indonesia: ",
          ref("deh (udah deh)", "ik-partikel", "deh"),
          " dan ",
          ref("nggak usah", "ik-andai", "nggak-usah"),
          ".",
        ),
      ],
    },
    // ───────────────────────────── 마음대로 / 아무거나
    {
      key: "maeumdaero",
      title: "마음대로 해 / 아무거나: terserah, apa aja",
      blocks: [
        p(i("Terserah"), " punya beberapa rasa di bahasa Korea:"),
        table([
          ["Korea", "Rasanya", "Aman ke atasan?"],
          ["아무거나 괜찮아요", "apa aja boleh", "Aman"],
          ["편한 대로 하세요", "senyamanmu aja", "Aman dan sopan"],
          ["네가 정해", "kamu yang tentuin", "반말, ke temen"],
          ["마음대로 해", "terserah! (bisa ketus)", "Jangan"],
        ]),
        h3("Contoh"),
        ex(
          "A: 뭐 먹을래요? B: 아무거나 괜찮아요.",
          "A: Mau makan apa? B: Apa aja boleh.",
        ),
        ex("편한 대로 하세요.", "Senyamannya aja."),
        ex("아무 때나 연락하세요.", "Kabarin kapan aja."),
        ex("아무 데나 앉으세요.", "Duduk di mana aja."),
        ex(
          "몰라, 네 마음대로 해.",
          "Nggak tau ah, terserah kamu.",
          "반말, lagi ngambek",
        ),
        callout(
          "warning",
          "Jebakan: 마음대로 해 sering kedengeran kayak ‘terserah!’ versi ngambek. Kalau maksudmu baik, pakai 편한 대로 해 atau 네가 정해.",
        ),
        p(
          "Dari arah Indonesia: ",
          ref("terserah", "ik-andai", "terserah"),
          ".",
        ),
      ],
    },
  ],
  outro: [
    h3("Rangkuman"),
    table([
      ["Korea", "Indonesia"],
      ["좀", "dong, agak"],
      ["벌써 / 이미", "udah (kok cepet) / sudah"],
      ["아직 / 아직도", "belum, masih / masih aja"],
      ["방금 / 이제 막 / 이제야", "barusan / baru mulai / baru sekarang"],
      ["-밖에 안", "cuma, baru"],
      ["거의", "hampir (jumlah)"],
      ["결국 / 드디어", "ujung-ujungnya / akhirnya!"],
      ["오히려", "malah, justru"],
      ["심지어 / -조차 / -까지", "bahkan"],
      ["차라리", "mending ... aja"],
      ["어쩐지", "pantesan"],
      ["알고 보니", "ternyata (fakta terbongkar)"],
      ["혹시 / 설마", "kira-kira, jangan-jangan / masa sih"],
      ["다행이다", "untung, syukurlah"],
      ["아쉽다", "sayang banget"],
      ["하긴 / 원래", "emang sih / emang dari sananya"],
      ["있잖아", "eh, tau nggak"],
      ["왜", "kenapa, kok"],
      ["깜빡 / 나도 모르게 / 실수로", "kelupaan / tanpa sadar / nggak sengaja"],
      ["당연하지", "ya iya dong"],
      ["됐어", "udah deh, nggak usah"],
      ["아무거나 / 편한 대로", "apa aja / terserah"],
    ]),
    h3("Latihan kilat"),
    p("Isi dengan kata yang pas."),
    bullet("(___) 도착했어요. → Baru aja sampe."),
    bullet("천 원(___) 없어요. → Cuma punya seribu won."),
    bullet("(___) 사람이 많더라. → Pantesan rame."),
    bullet("비가 안 와서 (___)이에요. → Untung nggak hujan."),
    bullet("A: 다 했어요? B: (___). → Belum."),
    callout("success", "방금 · 밖에 · 어쩐지 · 다행 · 아직이요"),
    p(
      "Udah nempel semua? Gas cek di kuis, ada 15 soal kilat. Santuy, bisa diulang.",
    ),
    quizRef(),
  ],
  quiz: {
    title: "Kuis: Kata keterangan obrolan",
    description:
      "15 soal pilihan ganda soal kata kecil di obrolan: 좀, 벌써, 아직, 방금, -밖에, 어쩐지, 알고 보니, 혹시, dan teman-temannya. Lulus kalau benar minimal 70%.",
    passingScore: 70,
    questions: [
      {
        key: "kata-kecil-jom",
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
        key: "kata-kecil-beolsseo",
        prompt:
          "Temenmu dateng jauh lebih cepet dari janji. Kamu kaget: ‘Hah, udah dateng?’",
        options: [
          { text: "벌써 왔어요?", correct: true },
          { text: "아직 왔어요?" },
          { text: "방금 와요?" },
          { text: "거의 왔어요?" },
        ],
        explanation:
          "벌써 = udah, dan kamu kaget karena lebih cepet dari dugaan. 이미 lebih datar, tanpa rasa kaget.",
      },
      {
        key: "kata-kecil-ajigiyo",
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
        key: "kata-kecil-geumbang",
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
        key: "kata-kecil-bakke",
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
        key: "kata-kecil-geoui",
        prompt: "‘Udah hampir selesai.’ Yang bener?",
        options: [
          { text: "거의 다 했어요.", correct: true },
          { text: "다 할 뻔했어요." },
          { text: "결국 다 했어요." },
          { text: "벌써 안 했어요." },
        ],
        explanation:
          "거의 = hampir buat jumlah atau tingkat. -(으)ㄹ 뻔했다 itu ‘hampir’ yang nyaris terjadi tapi nggak jadi, kayak hampir jatuh.",
      },
      {
        key: "kata-kecil-deudieo",
        prompt:
          "Kamu seneng banget karena udah lama nunggu: ‘Akhirnya visaku keluar!’",
        options: [
          { text: "드디어 비자가 나왔어요!", correct: true },
          { text: "결국 비자가 나왔어요!" },
          { text: "오히려 비자가 나왔어요!" },
          { text: "차라리 비자가 나왔어요!" },
        ],
        explanation:
          "‘Akhirnya!’ yang seneng karena lama ditunggu = 드디어. 결국 lebih ke ‘ujung-ujungnya’, sering buat hasil yang nggak sesuai rencana.",
      },
      {
        key: "kata-kecil-ohiryeo",
        prompt: "‘Udah minum obat, (___) tambah sakit.’ Isi yang pas?",
        options: [
          { text: "오히려", correct: true },
          { text: "심지어" },
          { text: "다행히" },
          { text: "원래" },
        ],
        explanation:
          "오히려 = malah, justru. Hasilnya kebalikan dari yang kamu kira: 약을 먹었는데 오히려 더 아파요.",
      },
      {
        key: "kata-kecil-eojjeonji",
        prompt: "‘Oh, hari ini diskon. (___) 사람이 많더라.’ (Pantesan rame.)",
        options: [
          { text: "어쩐지", correct: true },
          { text: "알고 보니" },
          { text: "혹시" },
          { text: "하긴" },
        ],
        explanation:
          "어쩐지 = pantesan. Kamu udah ngerasa ada yang aneh (rame), terus dapet penjelasannya (diskon). Pasangan setianya -더라.",
      },
      {
        key: "kata-kecil-algo-boni",
        prompt:
          "‘Kirain dia marah, (___) cuma capek.’ Faktanya terbongkar, kebalikan dari dugaan. Isi yang pas?",
        options: [
          { text: "알고 보니", correct: true },
          { text: "어쩐지" },
          { text: "설마" },
          { text: "아쉽게도" },
        ],
        explanation:
          "알고 보니 = ternyata, waktu fakta sebenernya terbongkar: 화난 줄 알았는데 알고 보니 그냥 피곤했던 거였어요.",
      },
      {
        key: "kata-kecil-hoksi",
        prompt:
          "Mau nyapa orang asing dengan sopan: ‘Maaf, orang Indonesia ya?’",
        options: [
          { text: "혹시 인도네시아 분이세요?", correct: true },
          { text: "설마 인도네시아 분이세요?" },
          { text: "왜 인도네시아 분이세요?" },
          { text: "어쩐지 인도네시아 분이세요?" },
        ],
        explanation:
          "혹시 di depan pertanyaan bikin kalimat langsung halus, kayak ‘maaf, kira-kira...’. 설마 itu ‘masa sih’, kedengeran nggak percaya.",
      },
      {
        key: "kata-kecil-dahaeng",
        prompt: "‘Untung nggak hujan.’ Yang bener?",
        options: [
          { text: "비가 안 와서 다행이에요.", correct: true },
          { text: "비가 안 와서 아쉬워요." },
          { text: "비가 안 와서 이익이에요." },
          { text: "비가 안 와서 당연해요." },
        ],
        explanation:
          "다행이다 = untung, syukurlah, rasa lega karena yang buruk nggak terjadi. 이익 itu untung dalam arti laba, dan 아쉬워요 malah ‘sayang banget’.",
      },
      {
        key: "kata-kecil-wae-banjangnim",
        prompt: "반장님 manggil namamu dari jauh. Jawaban yang aman?",
        options: [
          { text: "네, 반장님!", correct: true },
          { text: "왜요?" },
          { text: "됐어요." },
          { text: "마음대로 하세요." },
        ],
        explanation:
          "왜요? waktu dipanggil bisa kedengeran ‘apaan sih?’. Cukup jawab 네? atau 네, 반장님!",
      },
      {
        key: "kata-kecil-dwaesseo",
        prompt:
          "Rekan kerja yang lebih senior nawarin bantuan, tapi kamu bisa sendiri. Cara nolak yang halus?",
        options: [
          { text: "괜찮아요, 감사합니다.", correct: true },
          { text: "됐어요!" },
          { text: "마음대로 하세요." },
          { text: "당연하죠." },
        ],
        explanation:
          "됐어(요) dengan nada ketus artinya ‘udahlah!’ yang dingin. Buat nolak bantuan dengan sopan, pakai 괜찮아요.",
      },
      {
        key: "kata-kecil-mulloniji",
        prompt:
          "사장님 nanya ‘내일도 나올 수 있어요?’. Kamu mau jawab ‘tentu, Pak’ dengan sopan.",
        options: [
          { text: "그럼요! 나올 수 있어요.", correct: true },
          { text: "당연하지! 나올 수 있어." },
          { text: "아무거나요." },
          { text: "됐어요." },
        ],
        explanation:
          "Ke atasan, 그럼요 atau 물론이죠 itu ‘tentu’ yang aman. 당연하지 itu 반말, dan 당연하죠 pun bisa kedengeran ‘ya jelas lah, ngapain nanya’.",
      },
    ],
  },
});
