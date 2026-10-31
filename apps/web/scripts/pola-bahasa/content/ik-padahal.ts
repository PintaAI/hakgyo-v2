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
  key: "ik-padahal",
  title: "Padahal: satu kata, empat maksud",
  description:
    "Kata pembuka kursus Berani Ngomong. Padahal punya empat maksud, dan tiap maksud punya cara bilang sendiri dalam bahasa Korea.",
  intro: [
    opener({
      eyebrow: "BERANI NGOMONG · BAB 1",
      chapterNumber: "01",
      titleKo: "먹었는데 배고파",
      subtitle:
        "Satu kata padahal, empat maksud. Pilih bentuk Korea yang pas, jangan asal terjemahin.",
      question: "아까 점심 먹었잖아?",
      answer: "응, 먹었는데 또 배고파.",
      focus: [
        {
          label: "말하기 · Bilangnya",
          title: "-는데, -(으)면서, -려고 했는데",
          description:
            "Hasil nggak sesuai harapan, protes, rencana batal, dan tambahan yang bikin kesel. Tiap maksud punya bentuknya sendiri.",
        },
        {
          label: "뉘앙스 · Nuansa",
          title: "Lembut, tajam, atau digantung",
          description:
            "-는데 itu aman dan lembut, -(으)면서 nyalahin dengan tajam, -는데... yang digantung kerasa kecewa.",
        },
        {
          label: "함정 · Jebakan",
          title: "Urutannya kebalik",
          description:
            "Bagian setelah kata padahal justru ditaruh di depan dan ditempelin -는데.",
        },
      ],
      objectives: [
        {
          ko: "'padahal'의 네 가지 뜻을 구별할 수 있어요.",
          id: "Bisa bedain empat maksud padahal.",
        },
        {
          ko: "상황에 맞게 -는데, -(으)면서, -려고 했는데로 말할 수 있어요.",
          id: "Bisa bilang padahal pakai -는데, -(으)면서, atau -려고 했는데 sesuai situasi.",
        },
      ],
    }),
    p(
      "Selamat datang di ",
      b("Indo → Korea: Berani Ngomong"),
      ". Di sini kita nggak mulai dari tata bahasa Korea. Kita mulai dari kata yang tiap hari keluar dari mulut kamu: ",
      i("padahal, kok, soalnya, ketiduran"),
      ". Terus kita cari cara bilangnya dalam bahasa Korea.",
    ),
    p("Hakgyo punya dua kursus yang saling nyambung:"),
    bullet(
      b("Korea → Indo: Paham Pola"),
      ". Kamu lihat pola Korea (misalnya ",
      ref("-는데", "ki-alasan-urutan", "neunde"),
      "), lalu pahami artinya. Ini buat ",
      b("paham"),
      ": baca, dengerin, ujian.",
    ),
    bullet(
      b("Indo → Korea: Berani Ngomong"),
      " (kursus ini). Kamu mulai dari maksud yang mau kamu omongin, lalu pilih bentuk Korea yang pas. Ini buat ",
      b("ngomong"),
      ".",
    ),
    p(
      "Satu kata Indonesia sering punya beberapa maksud, dan tiap maksud beda bentuk Koreanya. Jadi tiap kata di kursus ini kita bedah pakai urutan yang sama: ",
      b("maksud → pilihan Korea → nuansa → jebakan"),
      ", lalu dipraktikin di obrolan dan kuis.",
    ),
    callout(
      "tip",
      "Cara pakai tautan: setiap pola Korea yang ",
      b("tebal dan bisa diklik"),
      " ngebuka penjelasan lengkapnya di kursus Korea → Indo. Lagi buru-buru? Cukup hafalin kalimat contohnya dulu. Penasaran kenapa bentuknya gitu? Klik aja.",
    ),
    p(
      "Contoh di sini kebanyakan pakai 반말 (bahasa santai) biar kerasa kayak ngobrol beneran, dan versi sopannya (-요) ikut ditulis kalau penting. Belum paham cara ubah sopan ke santai? Cek ",
      ref("rumus 반말", "ki-banmal", "rumus"),
      ". Ingat ya, ke 사장님, 반장님, dosen, atau orang yang baru kenal, tetap pakai -요.",
    ),
  ],
  sections: [
    {
      key: "hasil",
      title: "Padahal 1: hasilnya nggak sesuai harapan",
      blocks: [
        p(
          i('"Aku masih laper, padahal udah makan."'),
          " Kalimat kayak gini pasti sering banget kamu omongin. Gimana bilangnya?",
        ),
        p(
          "Di sini ",
          i("padahal"),
          " artinya: ada sesuatu yang udah terjadi, tapi hasilnya nggak sesuai yang kamu harapin. Udah makan, harusnya kenyang. Eh, masih laper.",
        ),
        h3("Pilihan bahasa Korea"),
        table([
          ["Korea", "Nuansa", "Pola"],
          [
            b("밥 먹었는데 아직 배고파."),
            "Paling natural buat ngobrol. Ini pilihan pertama kamu.",
            ref("-는데", "ki-alasan-urutan", "neunde"),
          ],
          [
            b("밥 먹었는데도 아직 배고파."),
            'Lebih tegas: "udah makan pun tetep aja laper". Ada rasa heran atau kesel.',
            ref("-는데도", "ki-alasan-urutan", "neundedo"),
          ],
          [
            b("밥을 먹었지만 아직 배고파."),
            "Netral, agak kaku. Lebih sering di tulisan atau pidato.",
            ref("-지만", "ki-alasan-urutan", "jiman"),
          ],
          [
            b("밥을 먹었음에도 불구하고 아직 배가 고프다."),
            "Resmi banget, buat tulisan atau berita. Jangan dipakai ngobrol.",
            "-(으)ㅁ에도 불구하고",
          ],
        ]),
        p(
          "Versi sopannya tinggal tambah -요: ",
          b("밥 먹었는데 아직 배고파요."),
          " Bagian ",
          b("-는데"),
          " di tengah nggak berubah, yang berubah cuma akhir kalimat.",
        ),
        h3("Nempelnya gimana?"),
        p(
          "Kunci padahal jenis ini ada di ",
          ref("-는데", "ki-alasan-urutan", "neunde"),
          ". Bentuknya sedikit beda tergantung katanya:",
        ),
        bullet(
          "Udah kejadian (lampau): ",
          b("먹었는데, 했는데, 갔는데"),
          ". Paling sering dipakai buat padahal.",
        ),
        bullet("Kata kerja sekarang: ", b("먹는데, 오는데, 일하는데"), "."),
        bullet(
          "Kata sifat sekarang: ",
          b("싼데, 비싼데, 바쁜데"),
          " (pakai -(으)ㄴ데, bukan ~~싸는데~~).",
        ),
        bullet("Kata benda: ", b("학생인데, 한국 사람인데"), "."),
        h3("Contoh"),
        ex(
          "열심히 공부했는데 시험에 떨어졌어.",
          "Aku nggak lulus ujian, padahal udah belajar mati-matian.",
        ),
        ex(
          "비가 오는데도 사람이 많아요.",
          "Rame banget, padahal lagi hujan.",
          "-는데도: hujan pun tetep rame",
        ),
        ex(
          "한국 사람인데 매운 거 못 먹어.",
          "Dia nggak kuat pedes, padahal orang Korea.",
        ),
        ex(
          "이 옷 비싼데 금방 찢어졌어.",
          "Bajunya cepet sobek, padahal mahal.",
        ),
        ex(
          "야근까지 했는데 월급이 똑같아요.",
          "Gajinya sama aja, padahal aku udah lembur segala.",
          "curhat pekerja EPS",
        ),
        ex(
          "약을 먹었는데도 열이 안 내려요.",
          "Demamnya nggak turun-turun, padahal udah minum obat.",
        ),
        callout(
          "warning",
          b("Jebakan urutan kata."),
          " Dalam bahasa Indonesia, ",
          i("padahal"),
          " biasanya ditaruh di belakang: ",
          i('"Aku laper, padahal udah makan."'),
          ' Dalam bahasa Korea, bagian "udah makan" (yang ditempelin -는데) harus ada di ',
          b("depan"),
          ": ",
          b("밥 먹었는데 배고파."),
          ' Kalau kamu nerjemahin kata per kata jadi ~~배고픈데 밥 먹었어~~, artinya kebalik: "aku laper, nah aku udah makan".',
        ),
        callout(
          "tip",
          "Kabar baik buat yang otaknya masih mikir pakai urutan Indonesia: pas ngobrol santai, orang Korea juga sering ",
          b("nambahin bagian padahal-nya di belakang"),
          ", kayak nyusul. ",
          b("아직 배고파, 밥 먹었는데도."),
          ' Artinya sama: "masih laper, padahal udah makan". Jadi boleh ngomong yang penting dulu, terus tambahin alasannya. Asal di tulisan dan ujian tetap pakai urutan normal.',
        ),
        callout(
          "warning",
          b("Jebakan kedua: dibalik maksudnya."),
          " ",
          i('"Kopinya mahal, padahal nggak enak."'),
          ' Coba pikir dulu: mana yang bikin heran? Nggak enak, tapi kok mahal. Jadi bagian yang ditempelin -는데 adalah "nggak enak": ',
          b("맛없는데 비싸."),
          " Tips: bagian setelah kata ",
          i("padahal"),
          " selalu jadi bagian yang ditempelin -는데.",
        ),
        h3("Kalau mau dipecah jadi dua kalimat"),
        p(
          "Kadang kamu ngomong satu kalimat dulu, baru sadar mau nambahin padahal. Pakai kata sambung di awal kalimat kedua:",
        ),
        ex(
          "밥 먹었어. 근데 아직 배고파.",
          "Aku udah makan. Tapi masih laper.",
          "근데 = santai",
        ),
        ex(
          "밥 먹었어. 그래도 배고파.",
          "Aku udah makan. Tetep aja laper.",
          "그래도 = tetep aja",
        ),
        p(
          "Penjelasan lengkapnya ada di ",
          ref("그런데 / 근데", "ki-kata-sambung", "geureonde"),
          " dan ",
          ref("그래도", "ki-kata-sambung", "geuraedo"),
          ".",
        ),
        h3("Contoh obrolan"),
        p("Rina lagi nongkrong sama bestie Koreanya, Jisu, habis kelas."),
        ...chat(
          [
            { who: "Rina", ko: "아, 배고파.", id: "Aduh, laper." },
            {
              who: "Jisu",
              ko: "아까 점심 먹었잖아?",
              id: "Kan tadi udah makan siang?",
            },
            {
              who: "Rina",
              ko: "응, 먹었는데 또 배고파. 요즘 왜 이러지?",
              id: "Iya, padahal udah makan, eh laper lagi. Kenapa ya akhir-akhir ini?",
            },
            {
              who: "Jisu",
              ko: "시험 기간이라서 그래. 떡볶이 먹으러 갈래?",
              id: "Itu gara-gara lagi musim ujian. Mau makan tteokbokki?",
            },
            { who: "Rina", ko: "좋아! 가자!", id: "Boleh! Gas!" },
          ],
          {
            questions: [
              {
                ko: "리나는 점심을 먹었는데 지금 어때요?",
                id: "Rina udah makan siang, terus sekarang gimana?",
              },
              {
                ko: "'Padahal udah tidur, masih ngantuk'을 친구한테 어떻게 말해요?",
                id: "Gimana bilang 'Padahal udah tidur, masih ngantuk' ke teman?",
              },
            ],
            tip: {
              title: "꿀팁 · TIP",
              ko: "먹었는데 + 배고파: '-는데' 부분이 앞에 와요.",
              id: "Bagian yang ditempelin -는데 (udah makan) selalu di depan, hasil yang bikin heran (masih laper) di belakang.",
            },
          },
        ),
        p(
          "Pola lain di obrolan ini: ",
          ref("-잖아", "ki-akhiran-rasa", "janayo"),
          " (",
          i("kan"),
          "), ",
          ref("-(이)라서", "ki-alasan-urutan", "aseo-karena"),
          " (",
          i("gara-gara"),
          "), ",
          ref("-(으)러 가다", "ki-alasan-urutan", "reo"),
          ", ",
          ref("-(으)ㄹ래?", "ki-minta-ajak", "eullaeyo"),
          ", dan ",
          ref("가자", "ki-banmal", "pengecualian"),
          ".",
        ),
        h3("Coba bikin sendiri"),
        bullet(i('"Aku masih ngantuk, padahal udah tidur sepuluh jam."')),
        bullet(i('"Kopi ini mahal, padahal nggak enak."')),
        callout(
          "success",
          "1. ",
          b("열 시간이나 잤는데도 아직 졸려."),
          ' (이나 = "sampai segitu", lihat Padahal 4.) Versi biasa: ',
          b("열 시간 잤는데 아직 졸려."),
          " 2. ",
          b("이 커피 맛없는데 비싸."),
          " Inget, yang ditempelin -는데 itu bagian setelah kata padahal.",
        ),
      ],
    },
    {
      key: "protes",
      title: "Padahal 2: nyalahin atau protes",
      blocks: [
        p(
          i('"Padahal kamu udah janji, kok nggak dateng?"'),
          " Ini padahal yang nadanya nyalahin. Kamu nggak cuma heran, kamu juga protes. Gimana bilangnya?",
        ),
        h3("Pilihan bahasa Korea"),
        table([
          ["Korea", "Nuansa", "Pola"],
          [
            b("약속했으면서 왜 안 왔어?"),
            'Nyalahin dengan jelas: "udah janji, kok nggak dateng?" Nadanya tajam.',
            ref("-(으)면서 padahal", "ki-alasan-urutan", "myeonseo-padahal"),
          ],
          [
            b("약속했잖아!"),
            '"Kan udah janji!" Pendek, kesel, ngingetin hal yang dia udah tahu.',
            ref("-잖아", "ki-akhiran-rasa", "janayo"),
          ],
          [
            b("약속했는데 왜 안 왔어?"),
            "Lebih lembut. Masih protes, tapi nggak sepedes -(으)면서.",
            ref("-는데", "ki-alasan-urutan", "neunde"),
          ],
        ]),
        p(
          "Kata ",
          ref("왜", "ki-kata-kecil", "wae"),
          " di sini artinya ",
          i("kok"),
          ", bukan cuma ",
          i("kenapa"),
          ". Lebih lengkap soal ini ada di ",
          ref("kok", "ik-partikel", "kok"),
          ".",
        ),
        h3("-(으)면서: padahal yang paling khas"),
        p(
          "Pola ",
          ref("-(으)면서", "ki-alasan-urutan", "myeonseo-padahal"),
          " biasanya kamu kenal sebagai ",
          i("sambil"),
          ". Tapi kalau kalimatnya nadanya nyalahin, artinya jadi ",
          i("padahal (dia sendiri)"),
          ". Ini favorit orang Korea buat ngomel.",
        ),
        ex("알면서 왜 물어봐?", "Udah tahu kok nanya?"),
        ex(
          "자기는 늦게 오면서 나한테만 뭐라고 해.",
          "Padahal dia sendiri telat, kok aku doang yang diomelin.",
        ),
        ex(
          "돈 없다고 했으면서 새 폰 샀어?",
          "Katanya nggak punya duit, kok beli HP baru?",
        ),
        ex(
          "다 알면서 모르는 척해.",
          "Padahal dia tahu semuanya, tapi pura-pura nggak tahu.",
        ),
        p(
          "Yang terakhir pakai ",
          ref("-는 척하다", "ki-keadaan", "cheok"),
          ", lengkapnya ada di ",
          ref("pura-pura", "ik-andai", "pura-pura"),
          ".",
        ),
        callout(
          "warning",
          b('Jebakan: kok jadi "sambil"?'),
          " ",
          b("알면서"),
          ' bisa berarti "sambil tahu" atau "padahal tahu". Bedainnya dari nada dan isi kalimat: kalau ada ',
          b("왜"),
          " atau nadanya kesel, pasti artinya padahal. Trik gampang: kalau ada bentuk lampau, ",
          b("했으면서, 먹었으면서"),
          ", itu pasti padahal, karena ",
          i("sambil"),
          " nggak pernah pakai bentuk lampau.",
        ),
        h3("Protes ke atasan? Hati-hati"),
        p(
          "-(으)면서 dan ",
          b("왜"),
          " kedengeran nyolot. Jangan dipakai ke 사장님 atau 반장님. Kalau mau ngingetin atasan dengan sopan, pakai ",
          ref("-잖아요", "ki-akhiran-rasa", "janayo"),
          " yang dilembutin, atau ",
          ref("-는데요", "ki-alasan-urutan", "neunde"),
          " yang digantung:",
        ),
        ex(
          "사장님, 어제 이번 주 토요일은 쉬어도 된다고 하셨는데요...",
          "Pak, padahal kemarin Bapak bilang Sabtu ini boleh libur...",
          "paling aman, sopan dan digantung",
        ),
        ex(
          "반장님, 이거 어제 다 끝냈잖아요.",
          "Ketua, ini kan udah selesai semua kemarin.",
          "boleh kalau udah akrab, nadanya harus lembut",
        ),
        culture({
          titleKo: "윗사람한테 서운한 점 말하기",
          titleId: "Protes ke atasan tanpa kedengeran nyalahin",
          theme: "amber",
          paragraphs: [
            {
              ko: "한국 직장에서는 윗사람한테 '왜요?'나 '-(으)면서'로 따지면 버릇없게 들릴 수 있어요. 내용이 맞아도 말투 때문에 분위기가 나빠져요.",
              id: "Di tempat kerja Korea, protes ke atasan pakai 왜요? atau -(으)면서 bisa kedengeran kurang ajar. Walaupun kamu bener, nadanya bikin suasana jadi nggak enak.",
            },
            {
              ko: "그래서 사실만 말하고 문장을 끝까지 말하지 않아요. '어제 쉬어도 된다고 하셨는데요...'처럼 말하면 사장님이 무슨 뜻인지 알아요.",
              id: "Makanya orang Korea cukup nyebut faktanya, terus kalimatnya digantung. Bilang 어제 쉬어도 된다고 하셨는데요... aja, 사장님 udah ngerti maksudnya tanpa kamu nyalahin.",
            },
            {
              ko: "앞에 '죄송한데요'나 '혹시'를 붙이면 더 부드러워요. 말할 때는 목소리를 낮추고 천천히 말해요.",
              id: "Tambahin 죄송한데요 (maaf, tapi...) atau 혹시 (kira-kira) di depan biar makin halus. Ngomongnya pelan dan suaranya jangan naik.",
            },
          ],
          checklist: [
            {
              ko: "윗사람한테는 '-(으)면서'와 '왜'를 안 써요.",
              id: "Aku nggak pakai -(으)면서 dan 왜 ke atasan.",
            },
            {
              ko: "'-(으)셨는데요...'로 부드럽게 말할 수 있어요.",
              id: "Aku bisa protes halus pakai -(으)셨는데요...",
            },
          ],
        }),
        h3("Contoh obrolan"),
        p("Rina nunggu Jisu kemarin sore, tapi Jisu nggak dateng."),
        ...chat(
          [
            {
              who: "Rina",
              ko: "어제 왜 안 왔어? 온다고 했으면서.",
              id: "Kemarin kok nggak dateng? Padahal katanya mau dateng.",
            },
            {
              who: "Jisu",
              ko: "미안... 갑자기 일이 생겼어.",
              id: "Sorry... tiba-tiba ada urusan.",
            },
            {
              who: "Rina",
              ko: "그럼 연락이라도 하지. 계속 기다렸잖아.",
              id: "Ya kabarin kek. Kan aku nungguin terus.",
            },
            {
              who: "Jisu",
              ko: "진짜 미안해. 오늘 저녁은 내가 살게!",
              id: "Maaf banget. Makan malam hari ini aku yang traktir deh!",
            },
          ],
          {
            questions: [
              {
                ko: "지수는 어제 왜 안 왔어요?",
                id: "Kenapa kemarin Jisu nggak dateng?",
              },
              {
                ko: "'Padahal katanya mau dateng'을 한국어로 어떻게 말해요?",
                id: "Gimana bilang 'Padahal katanya mau dateng' dalam bahasa Korea?",
              },
              {
                ko: "같은 말을 반장님한테 한다면 어떻게 바꿔요?",
                id: "Kalau protes yang sama mau disampaikan ke 반장님, kalimatnya diubah jadi gimana?",
              },
            ],
            tip: {
              title: "꿀팁 · TIP",
              ko: "온다고 했으면서 = 온다고 했는데 + 짜증",
              id: "-(으)면서 di akhir kalimat nadanya nyalahin. Cuma buat teman akrab. Ke atasan pakai -는데요... yang digantung.",
            },
          },
        ),
        p(
          "Pola lain di obrolan ini: ",
          ref("-잖아", "ki-akhiran-rasa", "janayo"),
          " dan ",
          ref("-(으)ㄹ게", "ki-minta-ajak", "eulgeyo"),
          " (",
          i("deh"),
          ", lihat ",
          ref("deh", "ik-partikel", "deh"),
          ").",
        ),
        h3("Coba bikin sendiri"),
        bullet(i('"Udah tahu kok nanya?" (ke teman)')),
        bullet(i('"Katanya lagi diet, kok makan ayam goreng?"')),
        callout(
          "success",
          "1. ",
          b("알면서 왜 물어봐?"),
          " 2. ",
          b("다이어트한다고 했으면서 왜 치킨 먹어?"),
          " Bisa juga lebih lembut: ",
          b("다이어트한다고 했는데 왜 치킨 먹어?"),
        ),
      ],
    },
    {
      key: "rencana",
      title: "Padahal 3: rencana yang nggak jadi",
      blocks: [
        p(
          i('"Padahal tadinya aku mau dateng..."'),
          " Ini padahal buat rencana atau niat yang akhirnya batal. Biasanya diikuti alasan, atau malah dibiarin ngegantung. Gimana bilangnya?",
        ),
        h3("Pilihan bahasa Korea"),
        table([
          ["Maksud", "Korea", "Pola"],
          [
            "Tadinya niat mau",
            b("가려고 했는데..."),
            ref("-(으)려고 했는데", "ki-andai", "ryeogo-haenneunde"),
          ],
          [
            "Udah diputusin atau janjian",
            b("가기로 했는데..."),
            ref("-기로 했는데", "ki-bisa-harus", "giro-hada"),
          ],
          [
            "Padahal pengen banget",
            b("가고 싶었는데..."),
            ref("-고 싶었는데", "ki-bisa-harus", "go-sipda"),
          ],
          [
            "Aslinya, dari awal",
            b("원래 가려고 했는데..."),
            ref("원래", "ki-kata-kecil", "hagin"),
          ],
        ]),
        p(
          "Paling sering dipakai: ",
          ref("-(으)려고 했는데", "ki-andai", "ryeogo-haenneunde"),
          ". Kalimatnya boleh ",
          b("sengaja digantung"),
          ". Cukup ",
          b("가려고 했는데..."),
          ' dengan nada menurun, orang Korea langsung ngerti: "tadinya mau, tapi...".',
        ),
        h3("Contoh"),
        ex(
          "가려고 했는데 갑자기 야근이 생겼어.",
          "Padahal tadinya mau dateng, eh tiba-tiba ada lembur.",
        ),
        ex(
          "전화하려고 했는데 깜빡했어요.",
          "Tadinya mau nelpon, tapi kelupaan.",
          "lihat juga kelupaan",
        ),
        ex(
          "오늘 운동하기로 했는데 비가 와서 못 했어.",
          "Padahal hari ini udah niat olahraga, tapi hujan jadi nggak bisa.",
        ),
        ex(
          "고향에 가고 싶었는데 비행기표가 너무 비쌌어요.",
          "Padahal pengen banget pulang kampung, tapi tiket pesawatnya mahal banget.",
        ),
        ex(
          "원래 오늘 쉬려고 했는데...",
          "Padahal aslinya hari ini mau istirahat...",
          "digantung, ada nada ngeluh",
        ),
        p(
          "Kata ",
          ref("깜빡하다", "ki-kata-kecil", "kkamppak"),
          " dibahas di ",
          ref("kelupaan", "ik-nggak-sengaja", "kelupaan"),
          '. Buat "nggak jadi" yang lebih luas, cek ',
          ref("nggak jadi", "ik-waktu", "nggak-jadi"),
          ".",
        ),
        callout(
          "warning",
          b("Jebakan bentuk waktu."),
          " Rencananya udah lewat, jadi ",
          b("했"),
          " di belakangnya wajib lampau: ",
          b("가려고 했는데"),
          ", bukan ~~가려고 하는데~~. Kalau ",
          b("하는데"),
          ', artinya malah "aku lagi mau pergi nih" (rencananya masih jalan).',
        ),
        callout(
          "warning",
          b("Jebakan -려고 vs -러."),
          ' Dua-duanya artinya "untuk/mau", tapi buat rencana batal yang dipakai cuma ',
          b("-려고 했는데"),
          ". ~~가러 했는데~~ itu salah. Bedanya dijelasin di ",
          ref("-(으)러", "ki-alasan-urutan", "reo"),
          " dan ",
          ref("-(으)려고", "ki-alasan-urutan", "ryeogo"),
          ".",
        ),
        h3("Digantung boleh, tapi ke atasan sebaiknya lengkap"),
        p(
          "Ke teman, ",
          b("가려고 했는데..."),
          " udah cukup. Ke atasan, tambahin alasannya pakai ",
          ref("-아서/어서", "ki-alasan-urutan", "aseo-karena"),
          " biar nggak kesannya ngeles: ",
          b("가려고 했는데 일이 늦게 끝나서 못 갔어요."),
          " (",
          i(
            "Tadinya mau ke sana, tapi kerjaan selesainya telat, jadi nggak bisa.",
          ),
          ")",
        ),
        h3("Contoh obrolan"),
        p(
          "Di pabrik, 반장님 nanyain pekerja yang kemarin katanya mau ke dokter.",
        ),
        ...chat(
          [
            {
              who: "반장님",
              ko: "어제 병원 갔어?",
              id: "Kemarin udah ke rumah sakit?",
            },
            {
              who: "Andi",
              ko: "가려고 했는데 일이 늦게 끝나서 못 갔어요.",
              id: "Tadinya mau ke sana, Pak, tapi kerjaannya selesai telat jadi nggak sempet.",
            },
            {
              who: "반장님",
              ko: "그럼 오늘은 일찍 가. 아프면 일도 못 하잖아.",
              id: "Ya udah, hari ini pulang cepet. Kalau sakit kan nggak bisa kerja juga.",
            },
            {
              who: "Andi",
              ko: "감사합니다. 오늘은 꼭 갈게요.",
              id: "Makasih, Pak. Hari ini aku pasti ke sana.",
            },
          ],
          {
            questions: [
              {
                ko: "안디 씨는 어제 왜 병원에 못 갔어요?",
                id: "Kenapa kemarin Andi nggak jadi ke rumah sakit?",
              },
              {
                ko: "'Padahal tadinya mau nelpon, tapi kelupaan'을 사장님한테 어떻게 말해요?",
                id: "Gimana bilang 'Tadinya mau nelpon, tapi kelupaan' ke 사장님?",
              },
            ],
            tip: {
              title: "꿀팁 · TIP",
              ko: "가려고 했는데 + 이유 + 못 갔어요",
              id: "Ke atasan, jangan berhenti di -려고 했는데... aja. Tambahin alasannya pakai -아서/어서, terus tutup dengan 못 갔어요.",
            },
          },
        ),
        p(
          "Perhatiin: 반장님 ngomong 반말, Andi tetap jawab pakai -요. Ini aturan penting buat pekerja EPS, lihat ",
          ref("kapan boleh 반말", "ki-banmal", "kapan"),
          ". Pola lain di sini: ",
          ref("-잖아", "ki-akhiran-rasa", "janayo"),
          " dan ",
          ref("-(으)ㄹ게요", "ki-minta-ajak", "eulgeyo"),
          ".",
        ),
        h3("Coba bikin sendiri"),
        bullet(i('"Padahal tadinya mau bales chat kamu, tapi ketiduran."')),
        bullet(i('"Padahal kita udah janjian makan bareng..." (digantung)')),
        callout(
          "success",
          "1. ",
          b("답장하려고 했는데 잠들어 버렸어."),
          " (lihat ",
          ref("ketiduran", "ik-nggak-sengaja", "ketiduran"),
          ") 2. ",
          b("같이 밥 먹기로 했는데..."),
        ),
      ],
    },
    {
      key: "kesal",
      title: "Padahal 4: tambahan yang bernada kesal",
      blocks: [
        p(
          i('"Dia nggak dateng. Padahal aku udah nunggu dua jam."'),
          " Di sini padahal dipakai buat nambahin info yang bikin kamu makin kesel atau kecewa. Biasanya ada angka atau usaha yang dibanggain: ",
          i("udah dua jam, udah tiga kali, udah capek-capek."),
          " Gimana bilangnya?",
        ),
        h3("Pilihan bahasa Korea"),
        table([
          ["Korea", "Nuansa", "Pola"],
          [
            b("두 시간이나 기다렸는데."),
            'Paling pas. 이나 artinya "sampai segitu", -는데 di akhir bikin kalimatnya ngegantung kecewa.',
            ref("-는데", "ki-alasan-urutan", "neunde"),
          ],
          [
            b("얼마나 기다렸는데!"),
            '"Kamu tahu nggak aku nunggu selama apa!" Lebih emosional.',
            ref("-는데", "ki-alasan-urutan", "neunde"),
          ],
          [
            b("두 시간이나 기다렸잖아!"),
            'Nyalahin langsung ke orangnya: "kan aku udah nunggu dua jam!"',
            ref("-잖아", "ki-akhiran-rasa", "janayo"),
          ],
          [
            b("힘들게 만들었는데..."),
            '"Padahal udah capek-capek bikin..." Kecewa, bukan marah.',
            ref("-는데", "ki-alasan-urutan", "neunde"),
          ],
        ]),
        h3("Rahasianya: 이나 + angka"),
        p(
          "Partikel ",
          b("이나 / 나"),
          " setelah angka artinya ",
          i('"sampai segitu banyak"'),
          '. Ini yang bikin kalimat kerasa "padahal udah ...".',
        ),
        bullet(
          "Akhiran konsonan pakai 이나: ",
          b("두 시간이나, 세 번이나, 만 원이나"),
        ),
        bullet("Akhiran vokal pakai 나: ", b("다섯 개나, 열 개나")),
        callout(
          "warning",
          b('Jebakan: 이나 juga artinya "atau".'),
          " ",
          b("커피나 차"),
          " = ",
          i("kopi atau teh"),
          ". Tapi setelah angka, ",
          b("세 번이나"),
          " = ",
          i("sampai tiga kali"),
          '. Bedainnya gampang: kalau nempel di angka dan nadanya kesel atau kaget, itu "sampai segitu".',
        ),
        h3("Contoh"),
        ex("세 번이나 말했는데.", "Padahal udah aku bilangin tiga kali."),
        ex(
          "엄마가 힘들게 만들었는데 하나도 안 먹었어?",
          "Padahal Mama udah capek-capek masak, kamu nggak makan sama sekali?",
        ),
        ex("내가 얼마나 기다렸는데!", "Kamu tahu nggak aku nunggu selama apa!"),
        ex(
          "30분이나 줄 섰는데 다 팔렸대요.",
          "Padahal udah antre setengah jam, katanya udah habis.",
          "-대요 = katanya",
        ),
        ex(
          "어제 새벽까지 했는데 사장님이 다시 하래요.",
          "Padahal kemarin aku ngerjain sampai subuh, bos nyuruh ulang.",
          "-래요 = disuruh",
        ),
        p(
          "Bentuk ",
          b("-대요"),
          " dan ",
          b("-래요"),
          " dijelasin di ",
          ref("-대요 / -래요", "ki-akhiran-rasa", "daeyo"),
          '. Rasa "sampai segitu" mirip ',
          i("bahkan"),
          ", lihat ",
          ref("bahkan", "ik-alasan", "bahkan"),
          ".",
        ),
        callout(
          "warning",
          b("Jebakan urutan lagi."),
          " Dalam bahasa Indonesia, kalimat kesel ini sering jadi kalimat kedua: ",
          i('"Dia nggak dateng. Padahal aku udah nunggu dua jam."'),
          " Di bahasa Korea juga boleh dipisah gitu: ",
          b("걔 안 왔어. 두 시간이나 기다렸는데."),
          " Kalimat kedua berdiri sendiri dan berhenti di -는데. Jangan diganti ~~하지만 두 시간 기다렸어~~, karena rasa kesel dan kecewanya hilang.",
        ),
        h3("Contoh obrolan"),
        p("Jisu telat banget ketemuan sama Rina di depan stasiun."),
        ...chat(
          [
            {
              who: "Jisu",
              ko: "미안, 많이 기다렸어?",
              id: "Sorry, nunggu lama ya?",
            },
            {
              who: "Rina",
              ko: "응. 한 시간이나 기다렸는데.",
              id: "Iya. Padahal aku udah nunggu sejam.",
            },
            {
              who: "Jisu",
              ko: "진짜 미안해. 길이 너무 막혀서...",
              id: "Maaf banget. Jalanan macet parah...",
            },
            {
              who: "Rina",
              ko: "연락이라도 하지. 전화도 안 받고.",
              id: "Kabarin kek. Ditelpon juga nggak diangkat.",
            },
            {
              who: "Jisu",
              ko: "배터리가 나갔어. 오늘 커피는 내가 살게!",
              id: "HP-ku mati. Kopi hari ini aku yang traktir deh!",
            },
          ],
          {
            questions: [
              {
                ko: "리나는 지수를 얼마나 기다렸어요?",
                id: "Rina nunggu Jisu berapa lama?",
              },
              {
                ko: "'Padahal aku udah nelpon tiga kali'를 한국어로 어떻게 말해요?",
                id: "Gimana bilang 'Padahal aku udah nelpon tiga kali' dalam bahasa Korea?",
              },
            ],
            tip: {
              title: "꿀팁 · TIP",
              ko: "숫자 + 이나 + -었는데",
              id: "한 시간이나 기다렸는데 kerasa kecewa karena dua hal: 이나 (sampai segitu) dan -는데 yang dibiarin ngegantung di akhir.",
            },
          },
        ),
        p(
          "Alasan ",
          b("길이 막혀서"),
          " pakai ",
          ref("-아서/어서", "ki-alasan-urutan", "aseo-karena"),
          ", lebih lengkapnya di ",
          ref("gara-gara", "ik-alasan", "gara-gara"),
          ".",
        ),
        h3("Coba bikin sendiri"),
        bullet(i('"Padahal aku udah ngirim lima kali." (pesan, 메시지)')),
        bullet(i('"Padahal udah capek-capek belajar..."')),
        callout(
          "success",
          "1. ",
          b("메시지 다섯 번이나 보냈는데."),
          " 2. ",
          b("힘들게 공부했는데..."),
          " Atau versi lebih emosional: ",
          b("내가 얼마나 열심히 공부했는데!"),
        ),
      ],
    },
  ],
  outro: [
    h3("Rangkuman padahal"),
    table([
      ["Maksud", "Contoh Indonesia", "Bilangnya"],
      [
        "Hasil nggak sesuai harapan",
        "Masih laper, padahal udah makan",
        ref("밥 먹었는데(도) 배고파", "ki-alasan-urutan", "neundedo"),
      ],
      [
        "Nyalahin, protes",
        "Padahal udah janji, kok nggak dateng?",
        ref("약속했으면서 왜 안 왔어?", "ki-alasan-urutan", "myeonseo-padahal"),
      ],
      [
        "Rencana batal",
        "Padahal tadinya mau dateng...",
        ref("가려고 했는데...", "ki-andai", "ryeogo-haenneunde"),
      ],
      [
        "Tambahan yang bikin kesel",
        "Padahal udah nunggu dua jam",
        ref("두 시간이나 기다렸는데", "ki-alasan-urutan", "neunde"),
      ],
    ]),
    callout(
      "success",
      "Kamu sekarang udah bisa bilang padahal dalam empat situasi. Inget satu hal: bagian setelah kata ",
      i("padahal"),
      " biasanya yang ditempelin -는데 dan ditaruh di depan. Next, kita masuk ke partikel yang paling Indonesia banget: ",
      ref("kok, sih, dong, deh", "ik-partikel"),
      ".",
    ),
    p(
      "Sebelum lanjut, tes dulu yuk. Sepuluh situasi, kamu tinggal pilih cara bilang yang paling natural.",
    ),
    quizRef(),
  ],
  quiz: {
    title: "Kuis: padahal",
    description:
      "Sepuluh situasi ngobrol. Pilih cara bilang padahal yang paling natural dalam bahasa Korea.",
    passingScore: 70,
    questions: [
      {
        key: "hasil-laper",
        prompt:
          'Kamu mau bilang ke bestie: "Aku masih laper, padahal udah makan." Pilih yang paling natural.',
        options: [
          { text: "밥 먹었는데 아직 배고파.", correct: true },
          { text: "배고픈데 밥 먹었어." },
          { text: "밥을 먹었음에도 불구하고 아직 배가 고프다." },
          { text: "밥 먹어서 아직 배고파." },
        ],
        explanation:
          'Bagian setelah padahal (udah makan) ditempelin -는데 dan ditaruh di depan. 배고픈데 밥 먹었어 urutannya kebalik, artinya jadi "aku laper, nah aku udah makan". -음에도 불구하고 itu bahasa berita, dan -어서 malah bikin artinya "gara-gara makan jadi laper".',
      },
      {
        key: "hasil-kopi",
        prompt:
          '"Kopinya mahal, padahal nggak enak." Bagian mana yang ditempelin -는데?',
        options: [
          { text: "맛없는데 비싸.", correct: true },
          { text: "비싼데 맛없어." },
          { text: "비싸서 맛없어." },
        ],
        explanation:
          'Yang bikin heran: nggak enak, tapi kok mahal. Bagian setelah kata padahal (nggak enak) yang ditempelin -는데. 비싼데 맛없어 artinya "mahal, tapi nggak enak", fokusnya beda.',
      },
      {
        key: "hasil-sifat",
        prompt:
          'Mau bilang "Bajunya cepet sobek, padahal mahal." Bentuk -는데 yang benar buat kata sifat 비싸다?',
        options: [
          { text: "이 옷 비싼데 금방 찢어졌어.", correct: true },
          { text: "이 옷 비싸는데 금방 찢어졌어." },
          { text: "이 옷 비싸었는데 금방 찢어졌어." },
        ],
        explanation:
          "Kata sifat sekarang pakai -(으)ㄴ데: 비싼데, 바쁜데, 싼데. 비싸는데 itu kesalahan klasik, dan 비싸었는데 bukan bentuk yang ada (lampau-nya 비쌌는데).",
      },
      {
        key: "protes-bestie",
        prompt:
          'Temenmu bilang mau dateng, tapi nggak muncul. Kamu kesel dan mau bilang: "Kemarin kok nggak dateng? Padahal katanya mau dateng." Pilih yang paling pas.',
        options: [
          { text: "어제 왜 안 왔어? 온다고 했으면서.", correct: true },
          { text: "어제 왜 안 왔어? 오면서." },
          { text: "어제 왜 안 왔어? 온다고 하려고 했는데." },
        ],
        explanation:
          '-(으)면서 setelah bentuk lampau (했으면서) artinya padahal yang nyalahin. 오면서 doang artinya "sambil dateng", dan -려고 했는데 itu buat rencana kamu sendiri yang batal.',
      },
      {
        key: "protes-sambil",
        prompt: "알면서 왜 물어봐? Di kalimat ini, 알면서 artinya apa?",
        options: [
          { text: "Padahal udah tahu", correct: true },
          { text: "Sambil cari tahu" },
          { text: "Kalau udah tahu" },
        ],
        explanation:
          'Ada 왜 dan nadanya kesel, jadi -면서 di sini artinya padahal: "udah tahu kok nanya?". Rasa sambil nggak nyambung sama nada protes.',
      },
      {
        key: "protes-atasan",
        prompt:
          "사장님 bilang Sabtu boleh libur, sekarang malah nyuruh masuk. Kamu mau ngingetin dengan sopan. Pilih yang paling aman.",
        options: [
          {
            text: "사장님, 어제 토요일은 쉬어도 된다고 하셨는데요...",
            correct: true,
          },
          { text: "사장님, 쉬어도 된다고 했으면서 왜 나와요?" },
          { text: "사장님, 쉬어도 된다고 했잖아!" },
          { text: "사장님, 왜요? 쉬어도 된다고 했어요." },
        ],
        explanation:
          "Ke atasan, cukup sebut faktanya dengan bentuk hormat (하셨는데요) dan biarin kalimatnya ngegantung. -(으)면서 + 왜 kedengeran nyolot, 했잖아! itu 반말 yang kesel.",
      },
      {
        key: "rencana-waktu",
        prompt:
          'Kamu mau bilang "Padahal tadinya aku mau dateng..." (rencananya udah batal). Pilih yang benar.',
        options: [
          { text: "가려고 했는데...", correct: true },
          { text: "가려고 하는데..." },
          { text: "가러 했는데..." },
          { text: "가면서..." },
        ],
        explanation:
          'Rencananya udah lewat, jadi 했 wajib lampau. 가려고 하는데 artinya "aku lagi mau pergi nih" (rencananya masih jalan), dan -러 nggak bisa dipakai bareng 하다.',
      },
      {
        key: "rencana-janjian",
        prompt:
          '"Padahal kita udah janjian makan bareng..." Bentuk mana yang paling pas buat rencana yang udah disepakati berdua?',
        options: [
          { text: "같이 밥 먹기로 했는데...", correct: true },
          { text: "같이 밥 먹고 싶었는데..." },
          { text: "같이 밥 먹었는데..." },
        ],
        explanation:
          "-기로 했는데 = udah diputusin atau janjian. -고 싶었는데 cuma bilang kamu pengen, dan 먹었는데 artinya udah kejadian makan bareng.",
      },
      {
        key: "kesal-iina",
        prompt:
          '"Padahal udah aku bilangin tiga kali." Pilih yang paling kerasa kesel dan kecewa.',
        options: [
          { text: "세 번이나 말했는데.", correct: true },
          { text: "세 번 말했어요." },
          { text: "세 번 말하려고 했는데." },
          { text: "세 번 말해서." },
        ],
        explanation:
          '이나 setelah angka artinya "sampai segitu", dan -는데 yang ngegantung di akhir bikin rasa kecewanya kerasa. 말했어요 cuma laporan datar, dan 말하려고 했는데 artinya kamu malah belum sempet bilang.',
      },
      {
        key: "kesal-atau",
        prompt: "Di kalimat 커피나 차 마실래?, 이나/나 artinya apa?",
        options: [
          { text: "Atau", correct: true },
          { text: "Sampai segitu banyak" },
          { text: "Padahal" },
        ],
        explanation:
          '이나/나 baru artinya "sampai segitu" kalau nempel di angka dan nadanya kaget atau kesel (세 번이나). Di antara dua benda, artinya "atau": kopi atau teh.',
      },
    ],
  },
});
