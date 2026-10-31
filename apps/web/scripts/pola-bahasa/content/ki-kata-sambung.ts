import {
  b,
  bullet,
  callout,
  chat,
  culture,
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
  key: "ki-kata-sambung",
  title: "Kata sambung di awal kalimat",
  description:
    "그리고, 그래서, 근데, 그럼, dan kawan-kawannya: kata kecil di awal kalimat yang bikin omongan kamu nyambung, nggak patah-patah kayak robot.",
  intro: [
    opener({
      eyebrow: "PAHAM POLA · BAB 1",
      chapterNumber: "01",
      titleKo: "문장을 잇는 말",
      subtitle:
        "Kata kecil di awal kalimat yang bikin ngomongmu ngalir, bukan kayak robot baca daftar.",
      question: "오늘 좀 피곤해 보여요. 괜찮아요?",
      answer: "어제 야근했어요. 그래서 좀 피곤해요. 그래도 괜찮아요!",
      focus: [
        {
          label: "문법 · Pola",
          title: "그렇다 + akhiran",
          description:
            "그래서, 근데, 그럼, 그러니까, 그래도: semuanya lahir dari 그렇다 (begitu) plus akhiran yang udah kamu kenal.",
        },
        {
          label: "표현 · Kata kunci",
          title: "근데 · 그럼 · 아니면",
          description:
            "Tiga kata yang paling sering keluar di obrolan: ganti topik, nanggepin omongan, dan nawarin pilihan.",
        },
        {
          label: "함정 · Jebakan",
          title: "그래서 ≠ 그래도",
          description:
            "Beda satu suku kata, artinya kebalik. Plus: habis 그래서 jangan langsung nyuruh atau ngajak.",
        },
      ],
      objectives: [
        {
          ko: "그리고, 그래서, 근데로 짧은 문장을 자연스럽게 이어요.",
          id: "Nyambungin kalimat pendek pakai 그리고, 그래서, 근데 biar ngomongnya ngalir.",
        },
        {
          ko: "상황에 맞게 그럼, 그러니까, 그래도, 아니면을 골라요.",
          id: "Milih 그럼, 그러니까, 그래도, atau 아니면 yang pas sama situasinya.",
        },
      ],
    }),
    p(
      "Pernah ngerasa gini? Kamu udah bisa bikin kalimat pendek kayak ",
      b("밥 먹었어요. 피곤해요. 자고 싶어요."),
      " Semuanya bener, tapi kok kedengerannya kayak robot baca daftar?",
    ),
    p(
      "Masalahnya bukan kosakata. Yang kurang itu lem yang nyambungin kalimat satu ke kalimat berikutnya. Di bahasa Indonesia kita punya ",
      i("terus, jadi, tapi, kalau gitu, makanya, walaupun gitu, atau"),
      ". Bahasa Korea juga punya, dan kabar baiknya: posisinya sama persis, di awal kalimat baru. Kamu tinggal ganti katanya.",
    ),
    p(
      "Rahasia kecilnya: hampir semua kata sambung ini dibangun dari ",
      b("그렇다"),
      " (",
      i("begitu"),
      ") ditambah akhiran yang kamu pelajari di materi sebelah. Jadi kalau kamu udah paham akhirannya, kata sambungnya auto kebaca.",
    ),
    table([
      ["Kata sambung", "Asalnya", "Akhiran aslinya"],
      [
        "그래서",
        "그렇다 + -아서",
        ref("-아서/어서", "ki-alasan-urutan", "aseo-karena"),
      ],
      [
        "그런데 / 근데",
        "그렇다 + -는데",
        ref("-는데", "ki-alasan-urutan", "neunde"),
      ],
      [
        "그럼 / 그러면",
        "그렇다 + -(으)면",
        ref("-(으)면", "ki-alasan-urutan", "myeon"),
      ],
      [
        "그러니까",
        "그렇다 + -(으)니까",
        ref("-(으)니까", "ki-alasan-urutan", "nikka"),
      ],
      ["그래도", "그렇다 + -아도", ref("-아도/어도", "ki-waktu-sebab", "ado")],
      ["하지만", "하다 + -지만", ref("-지만", "ki-alasan-urutan", "jiman")],
      [
        "아니면",
        "아니다 + -(으)면",
        ref("-(으)면", "ki-alasan-urutan", "myeon"),
      ],
    ]),
    callout(
      "tip",
      "Kata sambung di sini selalu ada di awal kalimat baru. Kalau kamu mau nyambung dua kalimat jadi satu kalimat panjang, pakai akhiran di tengah kalimat. Itu ada di materi ",
      ref("Penyambung 1: dan, karena, tapi, kalau", "ki-alasan-urutan"),
      ".",
    ),
  ],
  sections: [
    {
      key: "geurigo",
      title: "그리고: dan, terus",
      blocks: [
        p(
          b("Artinya apa sih? "),
          b("그리고"),
          " itu ",
          i("dan"),
          " atau ",
          i("terus"),
          ". Dipakai buat nambahin info, atau nyebut kejadian berikutnya. Nadanya netral, aman dipakai di obrolan, chat, sampai tulisan resmi.",
        ),
        h3("Contoh"),
        ex(
          "저는 인도네시아 사람이에요. 그리고 지금 안산에서 일해요.",
          "Aku orang Indonesia. Terus sekarang aku kerja di Ansan.",
        ),
        ex(
          "퇴근하고 편의점에 갔어요. 그리고 라면을 샀어요.",
          "Pulang kerja aku mampir ke minimarket. Terus beli ramyeon.",
        ),
        ex(
          "오늘은 청소 좀 해 주세요. 그리고 내일은 창고 정리해 주세요.",
          "Hari ini tolong bersih-bersih ya. Terus besok beresin gudang.",
          "반장님 ke pekerja",
        ),
        ex(
          "이 김밥 주세요. 그리고 물도 하나 주세요.",
          "Kimbap ini satu ya. Terus airnya juga satu.",
        ),
        ex(
          "그 드라마 진짜 재밌어. 그리고 남주가 너무 잘생겼어.",
          "Drakor itu seru banget. Terus pemeran cowoknya ganteng parah.",
          "반말",
        ),
        p(
          "Di pabrik, 반장님 sering kasih tugas satu-satu pakai ",
          b("그리고"),
          ":",
        ),
        ...chat(
          [
            {
              who: "반장님",
              ko: "오늘은 3번 라인 청소 좀 해 주세요.",
              id: "Hari ini tolong bersihin line 3 ya.",
            },
            {
              who: "Kamu",
              ko: "네, 알겠습니다.",
              id: "Siap, Pak.",
            },
            {
              who: "반장님",
              ko: "그리고 점심 먹고 창고 정리도 해 주세요.",
              id: "Terus habis makan siang, beresin gudang juga ya.",
            },
            {
              who: "Kamu",
              ko: "네. 그리고 내일은 몇 시까지 오면 돼요?",
              id: "Siap. Terus besok saya dateng paling telat jam berapa?",
            },
            {
              who: "반장님",
              ko: "내일은 여덟 시까지 오세요.",
              id: "Besok dateng jam delapan, ya.",
            },
          ],
          {
            theme: "blue",
            questions: [
              {
                ko: "점심 먹고 뭐 해야 돼요?",
                id: "Habis makan siang harus ngapain?",
              },
              {
                ko: "내일은 몇 시까지 와야 돼요?",
                id: "Besok harus dateng paling telat jam berapa?",
              },
            ],
            tip: {
              title: "그리고 · nambah satu lagi",
              ko: "할 일이나 질문을 하나 더 말할 때 문장 앞에 '그리고'를 붙여요.",
              id: "Mau nambahin satu tugas atau satu pertanyaan lagi? Buka kalimat barunya pakai 그리고.",
            },
          },
        ),
        callout(
          "warning",
          "Jebakan: ",
          b("그리고"),
          " itu buat nyambung kalimat, bukan nyambung dua kata benda. ",
          i("Nasi dan kimchi"),
          " jadinya ",
          b("밥하고 김치"),
          " atau ",
          b("밥이랑 김치"),
          ". Kalau kamu bilang ",
          b("밥 그리고 김치"),
          ", kedengerannya kaku kayak baca daftar belanja.",
        ),
        p(
          b("그리고 vs -고. "),
          "Dua kalimat ",
          b("밥 먹어요. 그리고 자요."),
          " itu bener, tapi orang Korea lebih sering langsung nyambungin jadi satu: ",
          b("밥 먹고 자요."),
          " Akhiran ",
          ref("-고", "ki-alasan-urutan", "go"),
          " itu versi nempelnya ",
          b("그리고"),
          ".",
        ),
        p(
          b("그리고 vs 그래서. "),
          b("그리고"),
          " cuma nambahin, nggak ada hubungan sebab-akibat. Kalau kalimat kedua itu akibat dari kalimat pertama, pakai ",
          ref("그래서", "ki-kata-sambung", "geuraeseo"),
          ".",
        ),
        p(
          b("반말: "),
          b("그리고"),
          " nggak berubah. Di chat santai kadang ditulis ",
          b("그리구"),
          ", versi imutnya.",
        ),
      ],
    },
    {
      key: "geuraeseo",
      title: "그래서: jadi, makanya",
      blocks: [
        p(
          b("Artinya apa sih? "),
          b("그래서"),
          " itu ",
          i("jadi"),
          ", ",
          i("makanya"),
          ", atau ",
          i("karena itu"),
          ". Kalimat sebelumnya alasan, kalimat sesudahnya akibat. Asalnya dari ",
          b("그렇다 + -아서"),
          ", jadi aturan mainnya ikut ",
          ref("-아서/어서 (karena)", "ki-alasan-urutan", "aseo-karena"),
          ".",
        ),
        h3("Contoh"),
        ex(
          "어제 야근했어요. 그래서 너무 피곤해요.",
          "Kemarin aku lembur. Jadi sekarang capek banget.",
        ),
        ex(
          "버스를 놓쳤어요. 그래서 늦었어요. 죄송합니다.",
          "Aku ketinggalan bus. Makanya telat. Maaf ya, Pak.",
        ),
        ex(
          "다음 달에 한국에 가요. 그래서 요즘 한국어를 열심히 공부해요.",
          "Bulan depan aku berangkat ke Korea. Makanya akhir-akhir ini rajin belajar bahasa Korea.",
        ),
        ex(
          "그래서 어떻게 됐어요?",
          "Terus akhirnya gimana?",
          "minta orang lanjutin cerita",
        ),
        ...chat(
          [
            {
              who: "Teman",
              ko: "나 어제 그 드라마 끝까지 다 봤어.",
              id: "Kemarin aku nonton drakor itu sampai tamat.",
            },
            {
              who: "Kamu",
              ko: "그래서? 결말 어떻게 됐어?",
              id: "Terus? Ending-nya gimana?",
            },
            {
              who: "Teman",
              ko: "주인공 둘이 결혼했어. 그래서 새벽에 엄청 울었어.",
              id: "Dua pemeran utamanya nikah. Makanya aku nangis kejer dini hari.",
            },
            {
              who: "Kamu",
              ko: "아, 그래서 오늘 눈이 부었구나!",
              id: "Oh, pantesan matamu bengkak hari ini!",
            },
          ],
          {
            questions: [
              {
                ko: "친구는 왜 새벽에 울었어요?",
                id: "Kenapa temanmu nangis dini hari?",
              },
              {
                ko: "두 번째 줄의 '그래서?'는 무슨 뜻이에요?",
                id: "'그래서?' di baris kedua maksudnya apa?",
              },
            ],
            tip: {
              title: "그래서? · nada naik",
              ko: "'그래서?'를 올라가는 억양으로 말하면 '그다음에 어떻게 됐어?'라는 뜻이에요.",
              id: "그래서? dengan nada naik artinya 'terus, terus?'. Kalau datar, bisa kedengeran 'terus kenapa?'.",
            },
          },
        ),
        callout(
          "warning",
          "Jebakan: sama kayak -아서, ",
          b("그래서"),
          " nggak enak dipakai sebelum perintah atau ajakan. ",
          i("Hujan nih. Jadi bawa payung ya"),
          " itu ",
          b("비 와요. 그러니까 우산 가져가세요."),
          " Kalau pakai ",
          b("그래서 우산 가져가세요"),
          ", orang Korea bakal ngerasa ada yang janggal.",
        ),
        table([
          ["", "그래서", "그러니까"],
          ["Habis itu boleh perintah/ajakan?", "Nggak", "Boleh"],
          [
            "Nuansa",
            "Cerita sebab-akibat, netral",
            "Nekenin alasan, kadang nyalahin",
          ],
          [
            "Contoh",
            "피곤했어요. 그래서 일찍 잤어요.",
            "피곤하죠? 그러니까 일찍 주무세요.",
          ],
        ]),
        callout(
          "tip",
          "Hati-hati sama ",
          b("그래서요?"),
          " yang diucapin datar. Bisa kedengeran kayak ",
          i("terus kenapa? emang penting?"),
          " Kalau mau minta orang lanjut cerita, pakai nada naik dan antusias, atau bilang ",
          b("그래서 어떻게 됐어요?"),
        ),
        p(
          "Mau latihan bilang ",
          i("soalnya"),
          " dan ",
          i("gara-gara"),
          " dalam bahasa Korea? Cek ",
          ref("soalnya", "ik-alasan", "soalnya"),
          " dan ",
          ref("gara-gara", "ik-alasan", "gara-gara"),
          ".",
        ),
      ],
    },
    {
      key: "geureonde",
      title: "그런데 / 근데: tapi, eh btw",
      blocks: [
        p(
          b("Artinya apa sih? "),
          b("그런데"),
          " punya dua kerjaan. Pertama, ",
          i("tapi"),
          " yang lembut. Kedua, ",
          i("eh btw"),
          " atau ",
          i("ngomong-ngomong"),
          " buat ganti topik. Di omongan hampir selalu disingkat jadi ",
          b("근데"),
          ". Asalnya dari ",
          b("그렇다 + -는데"),
          ", jadi rasanya mirip ",
          ref("-는데", "ki-alasan-urutan", "neunde"),
          ".",
        ),
        h3("Arti 1: tapi"),
        ex(
          "이 식당 맛있어요. 근데 좀 비싸요.",
          "Restoran ini enak. Tapi agak mahal sih.",
        ),
        ex(
          "한국어를 열심히 공부했어요. 그런데 아직 말하기가 어려워요.",
          "Aku udah rajin belajar bahasa Korea. Tapi ngomongnya masih susah.",
        ),
        h3("Arti 2: eh btw, ngomong-ngomong"),
        ex("근데 너 밥 먹었어?", "Eh btw, kamu udah makan?", "반말"),
        ex(
          "근데 반장님 어디 가셨어요?",
          "Ngomong-ngomong, Pak Banjang ke mana ya?",
        ),
        ...chat(
          [
            {
              who: "Teman",
              ko: "오늘 날씨 진짜 좋다.",
              id: "Cuaca hari ini enak banget.",
            },
            {
              who: "Kamu",
              ko: "그치. 근데 내일 시험 아니야?",
              id: "Iya kan. Eh btw, besok bukannya ujian?",
            },
            {
              who: "Teman",
              ko: "아, 맞다! 근데 나 아직 공부 하나도 안 했어.",
              id: "Oh iya! Tapi aku belum belajar sama sekali.",
            },
            {
              who: "Kamu",
              ko: "그럼 오늘 같이 공부하자.",
              id: "Kalau gitu hari ini belajar bareng yuk.",
            },
          ],
          {
            theme: "green",
            questions: [
              {
                ko: "두 번째 줄의 '근데'는 '하지만'이에요, 아니면 화제를 바꾸는 말이에요?",
                id: "근데 di baris kedua itu 'tapi', atau buat ganti topik?",
              },
              {
                ko: "세 번째 줄의 '근데'는요?",
                id: "Kalau 근데 di baris ketiga?",
              },
            ],
            tip: {
              title: "근데 · dua muka",
              ko: "'근데'는 '하지만'의 뜻도 있고, 화제를 바꿀 때도 써요. 앞뒤 내용을 보면 알 수 있어요.",
              id: "근데 bisa berarti 'tapi', bisa juga 'eh btw'. Lihat aja kalimat sebelum dan sesudahnya.",
            },
          },
        ),
        p(
          b("근데"),
          " juga sering muncul di depan pertanyaan dengan rasa ",
          i("sih"),
          ": ",
          b("근데 왜요?"),
          " = ",
          i("emang kenapa sih?"),
          " Lihat juga ",
          ref("sih", "ik-partikel", "sih"),
          ".",
        ),
        callout(
          "warning",
          "Jebakan: ",
          b("근데"),
          " itu bahasa lisan. Di esai, soal menulis TOPIK, atau email resmi, tulis ",
          b("그런데"),
          " atau ",
          b("하지만"),
          ". Satu lagi: kalau orang Korea buka kalimat pakai ",
          b("근데"),
          ", belum tentu dia mau membantah. Sering banget cuma pindah topik.",
        ),
        p(
          b("근데 vs 하지만. "),
          "Dua-duanya ",
          i("tapi"),
          ". ",
          b("근데"),
          " santai dan lembut, ",
          ref("하지만", "ki-kata-sambung", "hajiman"),
          " lebih tegas dan lebih sering di tulisan. Di chat sama bestie Korea, ",
          b("근데"),
          " udah paling pas.",
        ),
      ],
    },
    {
      key: "geureom",
      title: "그럼: kalau gitu",
      blocks: [
        p(
          b("Artinya apa sih? "),
          b("그럼"),
          " itu singkatan ",
          b("그러면"),
          " (",
          b("그렇다 + -(으)면"),
          "). Artinya ",
          i("kalau gitu"),
          " atau ",
          i("ya udah kalau gitu"),
          ". Dipakai buat nanggepin omongan orang, terus ambil keputusan atau kasih usul.",
        ),
        h3("Contoh"),
        ...chat(
          [
            {
              who: "Teman kerja",
              ko: "저 오늘 시간 없어요.",
              id: "Aku hari ini nggak ada waktu.",
            },
            {
              who: "Kamu",
              ko: "그럼 내일 만날까요?",
              id: "Kalau gitu besok aja ketemuannya?",
            },
            {
              who: "Teman kerja",
              ko: "내일은 야근해요.",
              id: "Besok aku lembur.",
            },
            {
              who: "Kamu",
              ko: "아, 그럼 토요일은 어때요?",
              id: "Oh, kalau gitu Sabtu gimana?",
            },
            {
              who: "Teman kerja",
              ko: "그럼요, 좋아요!",
              id: "Boleh banget, oke!",
            },
          ],
          {
            questions: [
              {
                ko: "두 사람은 언제 만나요?",
                id: "Mereka akhirnya ketemu kapan?",
              },
              {
                ko: "마지막 줄의 '그럼요'는 무슨 뜻이에요?",
                id: "그럼요 di baris terakhir artinya apa?",
              },
            ],
            tip: {
              title: "그럼 vs 그럼요",
              ko: "'그럼'은 '그러면'이라는 뜻이에요. '그럼요'는 '당연하죠'라는 뜻으로도 많이 써요.",
              id: "그럼 = kalau gitu. Tapi 그럼요 sering juga berarti 'tentu dong / ya iyalah'.",
            },
          },
        ),
        ex(
          "아, 그거 다 팔렸어요? 그럼 이걸로 주세요.",
          "Oh, yang itu habis? Kalau gitu yang ini aja deh.",
          "di kafe",
        ),
        ex("그럼 내일 봬요!", "Ya udah, sampai ketemu besok ya!"),
        ex(
          "비 와? 그럼 택시 타자.",
          "Hujan? Kalau gitu naik taksi aja yuk.",
          "반말",
        ),
        ex(
          "그럼요!",
          "Ya iyalah! / Tentu dong!",
          "arti kedua: setuju banget, sopan",
        ),
        p(
          "Arti kedua itu penting: ",
          b("그럼요"),
          " (sopan) atau ",
          b("그럼"),
          " (반말) bisa berarti ",
          i("ya iyalah"),
          ", mirip ",
          ref("당연하지", "ki-kata-kecil", "dangyeonhaji"),
          ".",
        ),
        callout(
          "warning",
          "Jebakan: kata ",
          i("jadi"),
          " di bahasa Indonesia dipakai buat dua hal. ",
          i("Aku sakit. Jadi nggak masuk kerja"),
          " itu akibat yang udah kejadian, pakai ",
          ref("그래서", "ki-kata-sambung", "geuraeseo"),
          ". ",
          i("Kamu sakit? Jadi istirahat aja"),
          " itu keputusan setelah denger info, pakai ",
          b("그럼"),
          ". Dan ingat, ",
          b("그럼"),
          " selalu nanggepin sesuatu, jadi jangan dipakai buat buka cerita dari nol.",
        ),
        callout(
          "tip",
          b("그럼"),
          " dan ",
          b("그러면"),
          " artinya sama. ",
          b("그러면"),
          " versi lengkap, lebih sering di tulisan atau instruksi. Habis ",
          b("그럼"),
          " paling sering nyusul ajakan kayak ",
          ref("-(으)ㄹ까요?", "ki-minta-ajak", "eulkkayo"),
          ".",
        ),
      ],
    },
    {
      key: "geureonikka",
      title: "그러니까: makanya, jadi gini",
      blocks: [
        p(
          b("Artinya apa sih? "),
          b("그러니까"),
          " (",
          b("그렇다 + -(으)니까"),
          ") punya tiga pemakaian: ",
          i("makanya/jadi"),
          " sebelum saran atau perintah, ",
          i("makanya!"),
          " buat setuju atau nyalahin, dan ",
          i("jadi gini / maksudku"),
          " waktu ngejelasin ulang. Di omongan cepat sering kedengeran ",
          b("그니까"),
          ".",
        ),
        h3("Arti 1: alasan, terus saran"),
        ex(
          "내일 아침에 비가 온대요. 그러니까 우산 꼭 챙기세요.",
          "Katanya besok pagi hujan. Jadi jangan lupa bawa payung ya.",
        ),
        ex(
          "이 기계는 위험해요. 그러니까 장갑 끼고 하세요.",
          "Mesin ini bahaya. Makanya pakai sarung tangan ya.",
        ),
        h3("Arti 2: makanya! / nah, itu dia!"),
        ...chat(
          [
            {
              who: "Teman",
              ko: "아, 또 늦잠 잤어…",
              id: "Aduh, kesiangan lagi…",
            },
            {
              who: "Kamu",
              ko: "그러니까 일찍 자라고 했잖아.",
              id: "Makanya, kan udah aku bilang tidur cepet.",
            },
          ],
          {
            theme: "rose",
            questions: [
              {
                ko: "여기서 '그러니까'는 어떤 느낌이에요?",
                id: "그러니까 di sini rasanya gimana: ngehibur, atau 'tuh kan'?",
              },
            ],
            tip: {
              title: "그러니까 ~했잖아 · khusus temen",
              ko: "'그러니까 ~했잖아'는 친한 친구에게만 쓰세요. 윗사람에게는 탓하는 말처럼 들려요.",
              id: "Pola 그러니까 ~했잖아 cukup buat temen deket. Ke atasan kedengerannya kayak nyalahin.",
            },
          },
        ),
        ...chat(
          [
            {
              who: "Teman",
              ko: "이 드라마 남주 진짜 답답하다.",
              id: "Pemeran cowok drakor ini bikin gemes banget, lemot.",
            },
            {
              who: "Kamu",
              ko: "그러니까! 그냥 고백하면 되는데.",
              id: "Iya kan! Padahal tinggal nembak aja.",
            },
          ],
          {
            theme: "rose",
            questions: [
              {
                ko: "'그러니까!'는 동의하는 말이에요, 반대하는 말이에요?",
                id: "그러니까! itu tanda setuju atau nggak setuju?",
              },
            ],
          },
        ),
        h3("Arti 3: jadi gini, maksudku"),
        ex(
          "그러니까 제 말은, 오늘은 못 간다는 거예요.",
          "Jadi maksudku, hari ini aku nggak bisa dateng.",
        ),
        callout(
          "warning",
          "Jebakan: ",
          b("그러니까"),
          " gampang kedengeran nyalahin. ",
          b("그러니까 제가 말했잖아요"),
          " ke 사장님 itu red flag, rasanya kayak ",
          i("tuh kan, saya bilang juga apa"),
          ". Ke atasan, cukup jelasin faktanya aja.",
        ),
        culture({
          titleKo: "윗사람에게 말할 때",
          titleId: "Ngomong ke 사장님 dan 반장님",
          theme: "amber",
          paragraphs: [
            {
              ko: "한국 직장에서는 윗사람에게 말할 때 말투가 아주 중요해요. '그러니까 제가 말했잖아요'는 내용이 맞아도 상대를 탓하는 말처럼 들려요.",
              id: "Di tempat kerja Korea, nada ngomong ke atasan itu penting banget. 그러니까 제가 말했잖아요 walaupun isinya bener, tetep kedengeran kayak nyalahin.",
            },
            {
              ko: "문제가 생기면 먼저 사실만 짧게 말해요. 예를 들면 '반장님, 기계가 또 멈췄어요. 어떻게 할까요?'처럼요.",
              id: "Kalau ada masalah, sampaikan faktanya dulu, singkat aja. Misalnya: 반장님, 기계가 또 멈췄어요. 어떻게 할까요? (Pak, mesinnya mati lagi. Gimana ya?)",
            },
            {
              ko: "부탁할 때나 다른 의견을 말할 때는 '죄송하지만'이나 '그런데요'로 부드럽게 시작하면 좋아요.",
              id: "Mau minta tolong atau beda pendapat? Buka pakai 죄송하지만 atau 그런데요 biar lebih halus dan nggak kesannya ngelawan.",
            },
          ],
          checklist: [
            {
              ko: "윗사람에게 '그러니까 제가 말했잖아요'라고 하지 않아요.",
              id: "Aku nggak bilang 그러니까 제가 말했잖아요 ke atasan.",
            },
            {
              ko: "문제가 생기면 사실부터 짧게 말해요.",
              id: "Kalau ada masalah, aku sampaikan faktanya dulu.",
            },
            {
              ko: "부탁할 때 '죄송하지만'으로 시작해요.",
              id: "Aku buka permintaan pakai 죄송하지만.",
            },
          ],
        }),
        p(
          b("그러니까 vs 그래서. "),
          "Habis ",
          b("그러니까"),
          " boleh perintah dan ajakan, habis ",
          ref("그래서", "ki-kata-sambung", "geuraeseo"),
          " nggak. Aturannya sama persis kayak versi akhirannya: ",
          ref("-(으)니까", "ki-alasan-urutan", "nikka"),
          " vs ",
          ref("-아서", "ki-alasan-urutan", "aseo-karena"),
          ".",
        ),
        p(
          "Arti ",
          i("makanya, kan udah aku bilang"),
          " sering jalan bareng ",
          ref("-잖아", "ki-akhiran-rasa", "janayo"),
          ". Mau latihan ngomong ",
          i("soalnya"),
          "? Cek ",
          ref("soalnya", "ik-alasan", "soalnya"),
          ".",
        ),
      ],
    },
    {
      key: "hajiman",
      title: "하지만 / 그렇지만: tetapi",
      blocks: [
        p(
          b("Artinya apa sih? "),
          b("하지만"),
          " dan ",
          b("그렇지만"),
          " itu ",
          i("tetapi"),
          " atau ",
          i("namun"),
          ". Kontrasnya jelas dan tegas. Paling sering ketemu di tulisan, berita, pidato, soal ujian, dan lirik lagu. Di obrolan sehari-hari, orang Korea lebih sering pakai ",
          ref("근데", "ki-kata-sambung", "geureonde"),
          ".",
        ),
        h3("Contoh"),
        ex(
          "한국 생활은 힘들어요. 하지만 많이 배워요.",
          "Hidup di Korea itu berat. Tapi aku banyak belajar.",
        ),
        ex(
          "월급은 많지 않아요. 그렇지만 동료들이 친절해요.",
          "Gajinya nggak gede. Tapi rekan kerjanya baik-baik.",
        ),
        ex(
          "저도 가고 싶어요. 하지만 오늘은 일이 너무 많아요.",
          "Aku juga pengen ikut. Tapi hari ini kerjaanku numpuk banget.",
        ),
        ex(
          "열심히 준비했습니다. 하지만 결과는 좋지 않았습니다.",
          "Saya sudah berusaha keras. Namun hasilnya kurang baik.",
          "gaya pidato atau laporan",
        ),
        table([
          ["Kata", "Biasanya di mana", "Nuansa"],
          ["하지만", "Tulisan, pidato, ujian, lirik", "Tegas, netral"],
          ["그렇지만", "Tulisan, omongan sopan", "Sedikit lebih halus"],
          ["그러나", "Berita, tulisan resmi", "Paling kaku, jarang diucapin"],
          [
            ref("근데", "ki-kata-sambung", "geureonde"),
            "Obrolan, chat",
            "Santai, bisa juga buat ganti topik",
          ],
        ]),
        callout(
          "warning",
          "Jebakan: banyak orang Indonesia pakai ",
          b("하지만"),
          " di tiap obrolan karena itu yang diajarin duluan di buku. Nggak salah, tapi kedengerannya kayak lagi baca teks. Satu lagi: ",
          b("하지만"),
          " itu satu kata utuh di awal kalimat. Kalau mau ",
          i("tapi"),
          " di tengah kalimat, tempel ",
          ref("-지만", "ki-alasan-urutan", "jiman"),
          " ke kata kerjanya: ",
          b("먹었지만"),
          ", ",
          b("비싸지만"),
          ".",
        ),
        p(
          "Bonus yang wajib hafal: ",
          b("죄송하지만"),
          " = ",
          i("maaf, tapi... / permisi"),
          ", pembuka sopan sebelum minta tolong. Contoh: ",
          b("죄송하지만 화장실이 어디예요?"),
        ),
        p(
          "Mau tahu kapan ",
          i("padahal"),
          " pakai pola tapi? Cek ",
          ref("padahal: hasilnya nggak sesuai", "ik-padahal", "hasil"),
          ".",
        ),
      ],
    },
    {
      key: "geuraedo",
      title: "그래도: walaupun gitu, tetap aja",
      blocks: [
        p(
          b("Artinya apa sih? "),
          b("그래도"),
          " (",
          b("그렇다 + -아도"),
          ") artinya ",
          i("walaupun gitu"),
          ", ",
          i("tetep aja"),
          ", atau ",
          i("tapi ya tetep"),
          ". Dipakai kalau situasinya nggak mendukung, tapi kamu tetep milih, ngerasa, atau ngelakuin sesuatu.",
        ),
        h3("Contoh"),
        ex(
          "일이 힘들어요. 그래도 재미있어요.",
          "Kerjaannya berat. Tapi tetep seru sih.",
        ),
        ex("비가 와요. 그래도 갈 거예요?", "Hujan loh. Tetep mau pergi?"),
        ex(
          "입맛이 없어요? 그래도 조금이라도 드세요.",
          "Nggak nafsu makan? Tetep makan ya, walaupun dikit.",
        ),
        ex(
          "시험에 떨어졌어요. 그래도 다음에 다시 도전할 거예요.",
          "Aku nggak lulus ujian. Tapi aku bakal coba lagi.",
        ),
        ex(
          "그래도 다행이다.",
          "Ya tapi masih untung lah.",
          "kalimat buat menghibur",
        ),
        ...chat(
          [
            {
              who: "Teman",
              ko: "오늘 손님 너무 많아서 죽는 줄 알았어.",
              id: "Hari ini pelanggan rame banget, kirain bakal tepar.",
            },
            {
              who: "Kamu",
              ko: "그래도 고생했어! 맛있는 거 먹으러 가자.",
              id: "Tetep aja, kamu keren udah bertahan! Yuk makan yang enak.",
            },
            {
              who: "Teman",
              ko: "근데 나 돈 없어. 이번 달 월급 집에 다 보냈어.",
              id: "Tapi aku bokek. Gaji bulan ini udah aku kirim ke rumah semua.",
            },
            {
              who: "Kamu",
              ko: "괜찮아. 그럼 오늘은 내가 살게!",
              id: "Santuy. Kalau gitu hari ini aku yang traktir!",
            },
          ],
          {
            theme: "green",
            questions: [
              {
                ko: "친구는 왜 돈이 없어요?",
                id: "Kenapa temanmu lagi bokek?",
              },
              {
                ko: "오늘 누가 밥을 사요?",
                id: "Hari ini siapa yang traktir?",
              },
            ],
            tip: {
              title: "그래도 · buat nyemangatin",
              ko: "힘든 하루를 보낸 친구에게 '그래도 고생했어'라고 말해 보세요.",
              id: "Temen abis ngelewatin hari yang berat? Bilang 그래도 고생했어: 'walaupun gitu, kamu udah berjuang'.",
            },
          },
        ),
        p(
          b("그래도"),
          " sering banget dipakai buat menghibur atau nyemangatin, kayak ",
          i("ya walaupun gitu, minimal..."),
          ". Pasangan favoritnya: ",
          b("그래도 다행이다"),
          " (lihat ",
          ref("다행이다", "ki-kata-kecil", "dahaeng"),
          ").",
        ),
        callout(
          "warning",
          "Jebakan: jangan ketuker ",
          b("그래도"),
          " sama ",
          b("그래서"),
          ". Cuma beda satu suku kata, artinya kebalik. ",
          b("비가 와요. 그래서 안 가요."),
          " = ",
          i("Hujan. Jadi aku nggak pergi."),
          " ",
          b("비가 와요. 그래도 가요."),
          " = ",
          i("Hujan. Tapi aku tetep pergi."),
        ),
        p(
          b("그래도 vs 하지만. "),
          ref("하지만", "ki-kata-sambung", "hajiman"),
          " cuma nunjukin kontras. ",
          b("그래도"),
          " nekenin ",
          i("tetep"),
          ", walaupun ada halangan. ",
          i("Mahal. Tapi tetep aku beli"),
          " → ",
          b("비싸요. 그래도 살 거예요."),
          " Versi nempelnya ada di ",
          ref("-아도/어도", "ki-waktu-sebab", "ado"),
          " dan ",
          ref("-는데도", "ki-alasan-urutan", "neundedo"),
          ".",
        ),
      ],
    },
    {
      key: "animyeon",
      title: "아니면: atau, kalau nggak",
      blocks: [
        p(
          b("Artinya apa sih? "),
          b("아니면"),
          " (",
          b("아니다 + -(으)면"),
          ") literally ",
          i("kalau bukan"),
          ". Dipakai buat nawarin pilihan lain: ",
          i("atau"),
          ". Paling sering di pertanyaan, atau waktu kamu nebak-nebak.",
        ),
        h3("Contoh"),
        ex(
          "커피 드릴까요, 아니면 차 드릴까요?",
          "Mau kopi, atau teh?",
          "kasir kafe",
        ),
        ex(
          "이번 주말에 만날까요? 아니면 다음 주가 좋아요?",
          "Ketemu weekend ini? Atau minggu depan lebih enak?",
        ),
        ex(
          "라면 먹을래? 아니면 밖에 나가서 먹을래?",
          "Mau makan ramyeon? Atau makan di luar aja?",
          "반말",
        ),
        ex(
          "전화를 안 받네. 자나? 아니면 아직 일하나?",
          "Nggak diangkat. Lagi tidur ya? Atau masih kerja?",
          "ngomong sendiri",
        ),
        ex(
          "같이 갈래? 아니면 말고.",
          "Mau ikut? Kalau nggak ya udah.",
          "반말, 아니면 말고 = kalau nggak ya udah",
        ),
        ...chat(
          [
            {
              who: "Kasir",
              ko: "주문하시겠어요?",
              id: "Mau pesan apa?",
            },
            {
              who: "Kamu",
              ko: "아이스 아메리카노 하나 주세요.",
              id: "Es americano satu ya.",
            },
            {
              who: "Kasir",
              ko: "매장에서 드시고 가세요? 아니면 포장해 드릴까요?",
              id: "Diminum di sini? Atau dibungkus?",
            },
            {
              who: "Kamu",
              ko: "포장해 주세요. 그리고 시럽은 빼 주세요.",
              id: "Dibungkus aja. Terus sirupnya nggak usah ya.",
            },
          ],
          {
            theme: "blue",
            questions: [
              {
                ko: "손님은 커피를 어디에서 마셔요?",
                id: "Pelanggannya (kamu) minum kopinya di mana?",
              },
              {
                ko: "여기서 '아니면'은 무슨 뜻이에요?",
                id: "아니면 di sini artinya apa?",
              },
            ],
            tip: {
              title: "아니면 · tinggal pilih",
              ko: "점원이 '아니면'으로 두 가지를 물어보면 원하는 것 하나만 말하면 돼요.",
              id: "Kalau kasir nanya dua pilihan pakai 아니면, kamu cukup sebut satu yang kamu mau.",
            },
          },
        ),
        table([
          ["Yang mau disambung", "Pakai", "Contoh"],
          [
            "Dua kalimat atau pertanyaan",
            "아니면",
            "라면 먹을래? 아니면 김밥 먹을래?",
          ],
          [
            "Dua kata kerja dalam satu kalimat",
            ref("-거나", "ki-alasan-urutan", "geona"),
            "주말에 쉬거나 운동해요.",
          ],
          ["Dua kata benda", "(이)나", "커피나 차 마실래요?"],
        ]),
        callout(
          "warning",
          "Jebakan: ",
          i("kalau nggak"),
          " di bahasa Indonesia juga dipakai buat ancaman atau akibat: ",
          i("Cepetan, kalau nggak aku tinggal"),
          ". Buat arti ini, yang paling aman ",
          b("안 그러면"),
          ": ",
          b("빨리 와. 안 그러면 나 먼저 간다."),
          " Simpan ",
          b("아니면"),
          " buat nawarin pilihan.",
        ),
        callout(
          "tip",
          "Orang Korea sering nggak pakai ",
          b("아니면"),
          " sama sekali dan cuma jejerin dua pertanyaan: ",
          b("커피 마실래요? 차 마실래요?"),
          " Jadi kalau kamu denger dua pertanyaan beruntun, itu juga artinya ",
          i("atau"),
          ". Pola ",
          ref("-(으)ㄹ래요?", "ki-minta-ajak", "eullaeyo"),
          " paling sering nemenin ",
          b("아니면"),
          ".",
        ),
      ],
    },
  ],
  outro: [
    h3("Rangkuman kilat"),
    table([
      ["Kata", "Indonesia", "Contoh"],
      [
        ref("그리고", "ki-kata-sambung", "geurigo"),
        "dan, terus",
        "라면을 샀어요. 그리고 커피도 샀어요.",
      ],
      [
        ref("그래서", "ki-kata-sambung", "geuraeseo"),
        "jadi, makanya",
        "늦잠 잤어요. 그래서 늦었어요.",
      ],
      [
        ref("그런데 / 근데", "ki-kata-sambung", "geureonde"),
        "tapi; eh btw",
        "근데 너 밥 먹었어?",
      ],
      [
        ref("그럼", "ki-kata-sambung", "geureom"),
        "kalau gitu",
        "그럼 내일 만나요.",
      ],
      [
        ref("그러니까", "ki-kata-sambung", "geureonikka"),
        "makanya; jadi gini",
        "추워요. 그러니까 따뜻하게 입으세요.",
      ],
      [
        ref("하지만", "ki-kata-sambung", "hajiman"),
        "tetapi (lebih tulisan)",
        "비싸요. 하지만 좋아요.",
      ],
      [
        ref("그래도", "ki-kata-sambung", "geuraedo"),
        "walaupun gitu, tetep",
        "비가 와요. 그래도 가요.",
      ],
      [
        ref("아니면", "ki-kata-sambung", "animyeon"),
        "atau",
        "커피? 아니면 차?",
      ],
    ]),
    h3("Coba bikin sendiri"),
    p("Isi titik-titiknya pakai kata sambung yang paling pas."),
    bullet(
      b("배가 고팠어요. ___ 라면을 먹었어요."),
      " → ",
      i("Aku laper. Jadi makan ramyeon."),
    ),
    bullet(
      b("배가 불러요. ___ 디저트는 먹을 거예요."),
      " → ",
      i("Udah kenyang. Tapi dessert tetep aku makan."),
    ),
    bullet(
      b("A: 오늘 너무 바빠요. B: ___ 내일 만나요."),
      " → ",
      i("Kalau gitu besok aja ketemu."),
    ),
    bullet(
      b("밥 먹었어? ___ 내일 시험 몇 시야?"),
      " → ",
      i("Udah makan? Eh btw, besok ujian jam berapa?"),
    ),
    bullet(
      b("비빔밥 드실래요? ___ 김밥 드실래요?"),
      " → ",
      i("Mau bibimbap? Atau kimbap?"),
    ),
    callout(
      "success",
      "Jawaban: ",
      b("그래서"),
      ", ",
      b("그래도"),
      ", ",
      b("그럼"),
      ", ",
      b("근데"),
      ", ",
      b("아니면"),
      ". Semua bener? Gas lanjut ke ",
      ref("Penyambung 1", "ki-alasan-urutan"),
      " buat belajar versi nempelnya di tengah kalimat.",
    ),
    p(
      "Udah pede? Kerjain kuis singkat di bawah. Dapet minimal 70 berarti kamu udah lulus bab ini.",
    ),
    quizRef(),
  ],
  quiz: {
    title: "Kuis: Kata sambung di awal kalimat",
    description:
      "12 soal singkat buat ngecek kamu udah bisa milih 그리고, 그래서, 근데, 그럼, 그러니까, 하지만, 그래도, dan 아니면 sesuai situasi.",
    passingScore: 70,
    questions: [
      {
        key: "geuraeseo-1",
        prompt:
          "Aku ketinggalan bus. Makanya telat. → 버스를 놓쳤어요. ___ 늦었어요.",
        options: [
          { text: "그래서", correct: true },
          { text: "그래도" },
          { text: "아니면" },
          { text: "그럼" },
        ],
        explanation:
          "Kalimat pertama alasan, kalimat kedua akibat yang udah kejadian. Itu kerjaannya 그래서. 그래도 malah kebalik artinya: 'walaupun gitu'.",
      },
      {
        key: "geuraeseo-vs-geureonikka-1",
        prompt:
          'Kamu mau bilang: "Hujan nih. Jadi bawa payung ya." Mana yang paling natural?',
        options: [
          { text: "비 와요. 그러니까 우산 가져가세요.", correct: true },
          { text: "비 와요. 그래서 우산 가져가세요." },
          { text: "비 와요. 그래도 우산 가져가세요." },
        ],
        explanation:
          "Kalimat keduanya nyuruh. Habis 그래서 nggak enak langsung nyuruh atau ngajak, jadi pakai 그러니까. Aturannya sama kayak -아서 vs -(으)니까.",
      },
      {
        key: "geuraedo-1",
        prompt:
          "Udah kenyang. Tapi dessert tetep aku makan. → 배가 불러요. ___ 디저트는 먹을 거예요.",
        options: [
          { text: "그래도", correct: true },
          { text: "그래서" },
          { text: "그리고" },
          { text: "그럼" },
        ],
        explanation:
          "Situasinya nggak mendukung (udah kenyang), tapi kamu tetep makan. Itu rasa 'tetep aja' punya 그래도. Kalau 그래서, artinya jadi aneh: 'kenyang, makanya makan dessert'.",
      },
      {
        key: "geuraedo-vs-geuraeseo-1",
        prompt: "비가 와요. 그래도 가요. Artinya apa?",
        options: [
          { text: "Hujan. Tapi aku tetep pergi.", correct: true },
          { text: "Hujan. Jadi aku nggak pergi." },
          { text: "Hujan. Kalau gitu ayo pergi." },
          { text: "Hujan. Atau aku pergi." },
        ],
        explanation:
          "그래도 = walaupun gitu, tetep. Jangan ketuker sama 그래서: beda satu suku kata, tapi artinya kebalik.",
      },
      {
        key: "geureom-1",
        prompt:
          "A: 오늘 너무 바빠요. B: ___ 내일 만나요. (Kalau gitu besok aja ketemu.)",
        options: [
          { text: "그럼", correct: true },
          { text: "그래서" },
          { text: "하지만" },
          { text: "그래도" },
        ],
        explanation:
          "B nanggepin info dari A, terus ambil keputusan. Itu tugas 그럼 (kalau gitu). 그래서 dipakai buat akibat dari omongan kamu sendiri.",
      },
      {
        key: "geureom-jebakan-1",
        prompt:
          'Temanmu bilang 감기 걸렸어요 (Aku pilek). Kamu mau bilang "Jadi istirahat aja." Kata sambung yang pas?',
        options: [
          { text: "그럼 푹 쉬세요.", correct: true },
          { text: "그래서 푹 쉬세요." },
          { text: "그리고 푹 쉬세요." },
        ],
        explanation:
          "Kata 'jadi' di sini bukan akibat, tapi saran setelah denger info. Pakai 그럼. Ini jebakan klasik karena di bahasa Indonesia dua-duanya 'jadi'.",
      },
      {
        key: "geureom-yo-1",
        prompt:
          "Rekan kerja nanya 내일도 와요? lalu kamu jawab 그럼요! Artinya?",
        options: [
          { text: "Ya iyalah! / Tentu dong!", correct: true },
          { text: "Kalau gitu nggak usah." },
          { text: "Terus kenapa?" },
          { text: "Atau yang lain?" },
        ],
        explanation:
          "그럼요 punya arti kedua: setuju banget, kayak 'ya iyalah' versi sopan. Mirip 당연하죠.",
      },
      {
        key: "geureonde-1",
        prompt:
          "Udah makan? Eh btw, besok ujian jam berapa? → 밥 먹었어? ___ 내일 시험 몇 시야?",
        options: [
          { text: "근데", correct: true },
          { text: "그래서" },
          { text: "그러니까" },
          { text: "아니면" },
        ],
        explanation:
          "Kamu pindah topik, jadi pakai 근데 (eh btw). Ingat, 근데 nggak selalu berarti membantah. Sering banget cuma ganti topik.",
      },
      {
        key: "hajiman-register-1",
        prompt:
          "Kamu nulis email resmi ke kantor atau esai TOPIK dan butuh kata 'tapi' di awal kalimat. Mana yang paling pas?",
        options: [
          { text: "하지만", correct: true },
          { text: "근데" },
          { text: "그니까" },
          { text: "그럼" },
        ],
        explanation:
          "근데 itu bahasa lisan, nggak cocok buat tulisan resmi. Di tulisan pakai 하지만 (atau 그런데 versi lengkapnya).",
      },
      {
        key: "geureonikka-boss-1",
        prompt:
          "Mesin di pabrik mati lagi. Kemarin kamu udah ngingetin soal mesin itu. Apa yang paling pas kamu bilang ke 반장님?",
        options: [
          { text: "반장님, 기계가 또 멈췄어요. 어떻게 할까요?", correct: true },
          { text: "그러니까 제가 말했잖아요." },
          { text: "그래서요?" },
          { text: "아니면 말고요." },
        ],
        explanation:
          "그러니까 제가 말했잖아요 ke atasan rasanya kayak 'tuh kan, saya bilang juga apa'. Red flag! Sampaikan faktanya aja, terus tanya langkah berikutnya.",
      },
      {
        key: "geureonikka-makanya-1",
        prompt:
          "Temanmu bilang 이 드라마 남주 진짜 답답하다. Kamu setuju banget. Jawaban paling natural?",
        options: [
          { text: "그러니까!", correct: true },
          { text: "그래서?" },
          { text: "그래도!" },
          { text: "아니면?" },
        ],
        explanation:
          "그러니까! yang diucapin sendirian artinya 'iya kan! nah, itu dia!'. Cara paling cepet buat bilang setuju banget sama temen.",
      },
      {
        key: "animyeon-1",
        prompt:
          "Mau bibimbap? Atau kimbap? → 비빔밥 드실래요? ___ 김밥 드실래요?",
        options: [
          { text: "아니면", correct: true },
          { text: "그리고" },
          { text: "그래도" },
          { text: "그럼" },
        ],
        explanation:
          "Nawarin pilihan lain di antara dua pertanyaan pakai 아니면 (atau). Kalau dua kata benda dalam satu kalimat, cukup pakai (이)나: 비빔밥이나 김밥.",
      },
    ],
  },
});
