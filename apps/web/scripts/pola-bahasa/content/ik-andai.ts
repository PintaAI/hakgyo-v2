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
  key: "ik-andai",
  title: "Harusnya, kalau aja, terserah: nyesel, berandai, dan ngasih pilihan",
  description:
    "Cara bilang harusnya, coba kalau aja, pura-pura, terserah, dan nggak usah dalam bahasa Korea, lengkap dengan nada sopan dan santainya.",
  intro: [
    opener({
      eyebrow: "BERANI NGOMONG · BAB 7",
      chapterNumber: "07",
      titleKo: "후회, 바람, 배려",
      subtitle:
        "Harusnya, coba kalau aja, terserah, nggak usah: biar nyesel dan nolak pun tetep sopan.",
      question: "점심 뭐 먹을래요?",
      answer: "저는 아무거나 괜찮아요. 편하신 대로 하세요.",
      focus: [
        {
          label: "말하기 · Bilangnya",
          title: "-았/었어야 했는데 & -(으)ㄹ걸",
          description:
            'Dua cara bilang "harusnya tadi": yang satu rapi, yang satu santai kayak ngomong ke diri sendiri.',
        },
        {
          label: "뉘앙스 · Nuansa",
          title: "Terserah yang nggak ketus",
          description:
            "편하신 대로 하세요 aman ke 사장님. 마음대로 해 gampang kedengeran kesel.",
        },
        {
          label: "함정 · Jebakan",
          title: "Nggak usah ≠ nggak boleh",
          description:
            "안 와도 돼 = nggak usah dateng. 오면 안 돼 = jangan dateng. Ketuker dikit, orang bisa ngerasa diusir.",
        },
      ],
      objectives: [
        {
          ko: "후회와 바람을 상황에 맞게 말할 수 있어요.",
          id: "Bisa bilang harusnya dan kalau aja sesuai situasi.",
        },
        {
          ko: "윗사람한테 '아무거나'와 '괜찮아요'를 공손하게 말할 수 있어요.",
          id: "Bisa bilang terserah dan nggak usah ke atasan tanpa kedengeran ketus.",
        },
      ],
    }),
    p(
      "Materi terakhir kursus ini ngebahas lima kata yang isinya perasaan dan sikap: nyesel, berandai-andai, pura-pura, ngasih pilihan ke orang lain, dan nolak dengan halus.",
    ),
    callout(
      "tip",
      "Kata kayak ",
      i("terserah"),
      " dan ",
      i("nggak usah"),
      " gampang kedengeran ketus kalau salah pilih bentuk. Perhatiin kolom Nuansa di tiap tabel, apalagi kalau ngomong ke 사장님 atau orang yang lebih tua.",
    ),
  ],
  sections: [
    {
      key: "harusnya",
      title: "Harusnya",
      blocks: [
        p(
          i('"Harusnya tadi bawa payung."'),
          " Ujan deres, kamu basah kuyup, dan cuma bisa nyesel. Gimana bilangnya?",
        ),
        p(
          "Hati-hati: ",
          i("harusnya"),
          " punya tiga maksud. Bisa nyesel (udah lewat), bisa aturan (wajib), bisa perkiraan (mestinya). Tiap maksud beda bentuk Koreanya.",
        ),
        h3("1. Nyesel: harusnya tadi ..."),
        table([
          ["Korea", "Nuansa", "Pola"],
          [
            b("우산을 가져왔어야 했는데."),
            "Bentuk standar buat nyesel. Bisa sopan: ...했는데요.",
            ref("-았/었어야 했는데", "ki-andai", "asseoya"),
          ],
          [
            b("우산 가져올걸."),
            'Santai, kayak ngomong ke diri sendiri: "mending tadi bawa payung".',
            ref("-(으)ㄹ걸", "ki-akhiran-rasa", "eulgeol"),
          ],
          [
            b("우산 가져올걸 그랬어."),
            "Sama dengan di atas, lebih lengkap. Bisa sopan: 그랬어요.",
            ref("-(으)ㄹ걸", "ki-akhiran-rasa", "eulgeol"),
          ],
          [
            b("우산을 가져왔으면 좋았을 텐데."),
            'Lebih ke berandai: "coba tadi bawa payung".',
            ref("-았/었으면 좋았을 텐데", "ki-andai", "asseumyeon-teonde"),
          ],
        ]),
        p(
          "Bentuk ",
          b("-(으)ㄹ걸"),
          " ini kembarannya ",
          b("-(으)ㄹ걸"),
          ' yang artinya "kayaknya sih". Bedanya di nada: kalau nyesel, nadanya turun dan biasanya ngomong ke diri sendiri. Penjelasan nebak-nebaknya ada di ',
          ref("kayaknya", "ik-dugaan", "kayaknya"),
          ".",
        ),
        h3("Harusnya nggak ... (nyesel udah ngelakuin)"),
        ex("그렇게 많이 먹지 말걸.", "Harusnya nggak makan sebanyak itu."),
        ex("그 말은 하지 말았어야 했는데.", "Harusnya aku nggak ngomong gitu."),
        ex(
          "어제 늦게 자지 말걸 그랬어요.",
          "Harusnya kemarin nggak tidur kemaleman.",
        ),
        p(
          "Kuncinya ",
          b("-지 말다"),
          " (jangan), saudaranya ",
          ref("-지 마세요", "ki-minta-ajak", "ji-maseyo"),
          ". Jadi: ",
          b("-지 말걸"),
          " atau ",
          b("-지 말았어야 했는데"),
          ".",
        ),
        h3("2. Aturan: harusnya (wajib) ..."),
        p(
          'Kalau maksudnya "seharusnya, wajib", itu bukan nyesel. Pakai ',
          ref("-아/어야 돼요 / 해요", "ki-bisa-harus", "aya-hada"),
          ".",
        ),
        ex(
          "공장 안에서는 안전모를 써야 돼요.",
          "Di dalam pabrik harusnya (wajib) pakai helm.",
        ),
        ex(
          "외국인 등록증은 항상 가지고 다녀야 해요.",
          "Kartu ARC harusnya selalu dibawa ke mana-mana.",
        ),
        h3("3. Perkiraan: harusnya (mestinya) ..."),
        ex(
          "지금쯤 도착했을 거예요.",
          "Harusnya dia udah sampai sekarang.",
          "-(으)ㄹ 거예요 = perkiraan",
        ),
        ex(
          "원래 오늘 쉬는 날인데 출근했어요.",
          "Harusnya hari ini libur, tapi aku masuk kerja.",
          "원래 = aslinya, harusnya",
        ),
        p(
          "Kata ",
          ref("원래", "ki-kata-kecil", "hagin"),
          " di contoh terakhir bikin rasa ",
          i("padahal"),
          ", lihat ",
          ref("padahal", "ik-padahal", "hasil"),
          ".",
        ),
        callout(
          "warning",
          b("Jebakan: jangan buang 었-nya."),
          " Buat nyesel, bentuknya ",
          b("가져왔어야 했는데"),
          " (ada 왔). Kalau kamu bilang ",
          b("가져와야 해"),
          ', artinya malah "harus bawa" (aturan, sekarang). Satu suku kata bedanya, maksudnya beda jauh.',
        ),
        callout(
          "warning",
          b("Jebakan: satu kata, tiga maksud."),
          " Sebelum ngomong, tanya ke diri sendiri: aku lagi nyesel, ngomongin aturan, atau nebak? Nyesel = ",
          b("-았/었어야 했는데 / -(으)ㄹ걸"),
          ". Aturan = ",
          b("-아/어야 돼"),
          ". Nebak = ",
          b("-(으)ㄹ 거예요"),
          ".",
        ),
        h3("Contoh obrolan"),
        p("Andi dateng ke pabrik basah kuyup."),
        ...chat(
          [
            {
              who: "반장님",
              ko: "왜 이렇게 젖었어?",
              id: "Kok basah banget?",
            },
            {
              who: "Andi",
              ko: "아침에 날씨가 좋아서 우산을 안 가져왔어요. 가져왔어야 했는데요...",
              id: "Tadi pagi cerah, jadi nggak bawa payung. Harusnya bawa...",
            },
            {
              who: "반장님",
              ko: "내 우산 빌려줄게. 퇴근할 때 써.",
              id: "Aku pinjemin payungku. Pakai pas pulang nanti.",
            },
            {
              who: "Andi",
              ko: "감사합니다. 다음부터는 꼭 챙길게요.",
              id: "Makasih, Pak. Lain kali pasti aku bawa.",
            },
          ],
          {
            questions: [
              {
                ko: "안디는 왜 우산을 안 가져왔어요?",
                id: "Kenapa Andi nggak bawa payung?",
              },
              {
                ko: "'Harusnya tadi bawa payung'을 혼잣말로 짧게 어떻게 말해요?",
                id: 'Gimana bilang "harusnya tadi bawa payung" singkat, ke diri sendiri?',
              },
            ],
            tip: {
              title: "꿀팁 · TIP",
              ko: "혼잣말은 '-(으)ㄹ걸', 윗사람한테 설명할 때는 '-았/었어야 했는데요'가 좋아요.",
              id: "Ngomong ke diri sendiri: 우산 가져올걸. Jelasin ke atasan: 가져왔어야 했는데요.",
            },
          },
        ),
        p(
          "Pola lain di obrolan ini: ",
          ref("왜", "ki-kata-kecil", "wae"),
          " (",
          i("kok"),
          "), ",
          ref("-아서/어서", "ki-alasan-urutan", "aseo-karena"),
          ", ",
          ref("-(으)ㄹ 때", "ki-waktu-sebab", "eul-ttae"),
          ", dan ",
          ref("-(으)ㄹ게요", "ki-minta-ajak", "eulgeyo"),
          ".",
        ),
        h3("Coba bikin sendiri"),
        bullet(i('"Harusnya aku belajar lebih giat." (dua versi)')),
        bullet(i('"Harusnya nggak beli ini."')),
        callout(
          "success",
          "1. ",
          b("더 열심히 공부했어야 했는데."),
          " Versi santai: ",
          b("더 열심히 공부할걸."),
          " 2. ",
          b("이거 사지 말걸."),
          " atau ",
          b("이거 사지 말았어야 했는데."),
        ),
      ],
    },
    {
      key: "kalau-aja",
      title: "Kalau aja, coba",
      blocks: [
        p(
          i('"Coba kemarin kamu dateng, seru banget loh."'),
          ' Ini bukan "coba" yang artinya mencoba. Ini "coba" yang artinya ',
          i("kalau aja"),
          ". Gimana bilangnya?",
        ),
        h3("Andai soal masa lalu: udah lewat, nggak bisa diubah"),
        table([
          ["Korea", "Nuansa", "Pola"],
          [
            b("어제 너도 왔으면 좋았을 텐데."),
            'Standar. "Coba kemarin kamu dateng." Ada rasa sayang.',
            ref("-았/었으면 좋았을 텐데", "ki-andai", "asseumyeon-teonde"),
          ],
          [
            b("어제 너도 왔으면..."),
            "Digantung. Lebih santai, rasa sayangnya kerasa dari nada.",
            ref("-(으)면", "ki-alasan-urutan", "myeon"),
          ],
          [
            b("그때 한국어를 더 배웠으면 좋았을 텐데요."),
            "Versi sopan, buat ngobrol sama orang yang lebih tua.",
            ref("-았/었으면 좋았을 텐데", "ki-andai", "asseumyeon-teonde"),
          ],
        ]),
        h3("Andai soal sekarang atau nanti: harapan"),
        p(
          "Kalau yang kamu andai-andaiin masih bisa kejadian, ganti ujungnya jadi ",
          b("-았/었으면 좋겠다"),
          ": ",
          i('"semoga, pengen banget"'),
          ".",
        ),
        ex("내일 쉬었으면 좋겠다.", "Kalau aja besok libur."),
        ex(
          "빨리 고향에 갔으면 좋겠어요.",
          "Pengen banget cepet pulang kampung.",
        ),
        ex("월급이 좀 더 올랐으면 좋겠어.", "Kalau aja gajinya naik dikit."),
        p(
          "Bentuknya sama-sama pakai -았/었으면, lihat ",
          ref("-았/었으면 좋았을 텐데", "ki-andai", "asseumyeon-teonde"),
          ". Bedanya cuma ujungnya: ",
          b("좋았을 텐데"),
          " (udah lewat) vs ",
          b("좋겠다"),
          " (masih berharap).",
        ),
        h3("Andai yang nggak mungkin: kalau aku jadi kamu"),
        ex(
          "내가 너라면 솔직하게 말할 거야.",
          "Kalau aku jadi kamu, aku bakal ngomong jujur.",
        ),
        ex(
          "돈이 많다면 세계 여행을 하고 싶어요.",
          "Kalau aja duitku banyak, aku pengen keliling dunia.",
        ),
        p(
          "Di sini cukup pakai ",
          ref("-(으)면", "ki-alasan-urutan", "myeon"),
          " biasa, atau ",
          b("-다면"),
          " biar rasa andai-andainya lebih kerasa, ditambah ",
          ref("-고 싶다", "ki-bisa-harus", "go-sipda"),
          " atau -(으)ㄹ 거야.",
        ),
        callout(
          "warning",
          b('Jebakan: "coba" yang dua.'),
          " ",
          i('"Coba deh makan ini"'),
          " = mencoba, pakai ",
          ref("-아/어 보다", "ki-keadaan", "a-boda"),
          " (lihat ",
          ref("deh", "ik-partikel", "deh"),
          "). ",
          i('"Coba kemarin kamu dateng"'),
          " = kalau aja, pakai ",
          b("-았/었으면 좋았을 텐데"),
          '. Jangan sampai jadi ~~어제 와 봤으면~~, karena artinya aneh: "kalau kemarin kamu nyobain dateng".',
        ),
        callout(
          "warning",
          b("Jebakan: 좋았을 텐데 vs 좋겠다."),
          " ",
          b("같이 갔으면 좋았을 텐데"),
          ' = "coba kita pergi bareng" (udah nggak bisa). ',
          b("같이 갔으면 좋겠다"),
          ' = "semoga kita bisa pergi bareng" (masih bisa). Salah pilih, temen kamu bakal bingung kamu lagi ngajak atau lagi nyesel.',
        ),
        h3("Contoh obrolan"),
        p("Rina baru pulang nonton konser K-pop. Jisu nggak ikut."),
        ...chat(
          [
            {
              who: "Jisu",
              ko: "어제 콘서트 어땠어?",
              id: "Konser kemarin gimana?",
            },
            {
              who: "Rina",
              ko: "대박이었어! 너도 같이 갔으면 좋았을 텐데.",
              id: "Gila sih! Coba kamu ikut juga.",
            },
            {
              who: "Jisu",
              ko: "나도 가고 싶었는데... 알바 때문에.",
              id: "Aku juga pengen banget... gara-gara kerja part-time.",
            },
            {
              who: "Rina",
              ko: "다음에는 꼭 같이 가자!",
              id: "Next time harus bareng ya!",
            },
          ],
          {
            questions: [
              {
                ko: "지수는 왜 콘서트에 못 갔어요?",
                id: "Kenapa Jisu nggak ikut nonton konser?",
              },
              {
                ko: "리나가 '같이 갔으면 좋겠다'라고 했으면 뜻이 어떻게 달라져요?",
                id: "Kalau Rina bilang 같이 갔으면 좋겠다, artinya jadi gimana?",
              },
              {
                ko: "'Coba kemarin kamu dateng'을 친구한테 어떻게 말해요?",
                id: 'Gimana bilang "coba kemarin kamu dateng" ke teman?',
              },
            ],
          },
        ),
        p(
          "Pola lain di obrolan ini: ",
          b("가고 싶었는데"),
          " (padahal pengen, lihat ",
          ref("padahal: rencana", "ik-padahal", "rencana"),
          "), ",
          ref("때문에", "ki-waktu-sebab", "gi-ttaemune"),
          ", dan ",
          ref("가자", "ki-banmal", "pengecualian"),
          ".",
        ),
        h3("Coba bikin sendiri"),
        bullet(i('"Coba tadi aku dateng lebih awal."')),
        bullet(i('"Kalau aja minggu depan nggak lembur."')),
        callout(
          "success",
          "1. ",
          b("아까 더 일찍 왔으면 좋았을 텐데."),
          " (udah lewat) 2. ",
          b("다음 주에는 야근이 없었으면 좋겠다."),
          " (masih berharap)",
        ),
      ],
    },
    {
      key: "pura-pura",
      title: "Pura-pura",
      blocks: [
        p(i('"Dia pura-pura nggak denger."'), " Gimana bilangnya?"),
        p(
          "Kabar baik: pura-pura cuma punya satu pola utama, yaitu ",
          ref("-(으)ㄴ/는 척하다", "ki-keadaan", "cheok"),
          ". Yang perlu diperhatiin cuma cara nempelnya.",
        ),
        h3("Cara nempel 척하다"),
        table([
          ["Jenis kata", "Korea", "Arti"],
          ["Kata kerja (lagi/biasa)", b("자는 척하다"), "pura-pura tidur"],
          ["Kata kerja (udah)", b("못 들은 척하다"), "pura-pura nggak denger"],
          ["Kata sifat", b("바쁜 척하다"), "pura-pura sibuk"],
          ["Kata benda", b("학생인 척하다"), "pura-pura jadi pelajar"],
        ]),
        h3("Contoh"),
        ex(
          "엄마가 불렀는데 자는 척했어.",
          "Mama manggil, aku pura-pura tidur.",
        ),
        ex(
          "사장님 말씀을 못 들은 척했어요.",
          "Aku pura-pura nggak denger omongan bos.",
        ),
        ex("왜 바쁜 척해?", "Kok sok sibuk?"),
        ex(
          "모르는 척하지 마.",
          "Jangan pura-pura nggak tahu.",
          "-지 마 = jangan",
        ),
        ex(
          "괜찮은 척했지만 사실 너무 힘들었어.",
          "Aku pura-pura baik-baik aja, padahal capek banget.",
        ),
        p(
          "Larangan ",
          b("-지 마"),
          " dijelasin di ",
          ref("-지 마세요", "ki-minta-ajak", "ji-maseyo"),
          '. Versi nyalahin "padahal tahu, pura-pura nggak tahu" (',
          b("다 알면서 모르는 척해"),
          ") ada di ",
          ref("padahal: protes", "ik-padahal", "protes"),
          ".",
        ),
        h3('척 juga bisa berarti "sok"'),
        bullet(b("잘난 척하다"), " = sok hebat, sok keren"),
        bullet(b("아는 척하다"), " = sok tahu"),
        bullet(b("착한 척하다"), " = sok baik"),
        ex("잘난 척 좀 하지 마.", "Nggak usah sok hebat deh."),
        callout(
          "warning",
          b("Jebakan: tanda waktu ditaruh di 척하다, bukan di depannya."),
          ' "Aku tadi pura-pura tidur" = ',
          b("자는 척했어"),
          ", bukan ~~잤는 척했어~~. Lampaunya cukup di ",
          b("했어"),
          ". Pengecualian: kalau yang dipura-purain itu hal yang udah selesai, kayak ",
          b("못 들은 척"),
          " (pura-pura nggak denger) atau ",
          b("못 본 척"),
          " (pura-pura nggak lihat), pakai -(으)ㄴ.",
        ),
        callout(
          "warning",
          b("Jebakan: 아는 척 punya dua arti."),
          " ",
          b("아는 척하지 마"),
          ' = "jangan sok tahu". Tapi ',
          b("길에서 아는 척했어"),
          ' bisa berarti "aku nyapa dia di jalan (kayak orang kenal)". Lihat konteksnya.',
        ),
        h3("Contoh obrolan"),
        p(
          "Jisu cerita ke Rina habis papasan sama mantannya di perpustakaan kampus.",
        ),
        ...chat(
          [
            {
              who: "Jisu",
              ko: "아까 도서관에서 전 남친 봤어.",
              id: "Tadi aku lihat mantan di perpus.",
            },
            { who: "Rina", ko: "진짜? 인사했어?", id: "Serius? Kamu nyapa?" },
            {
              who: "Jisu",
              ko: "아니, 못 본 척했어.",
              id: "Nggak, aku pura-pura nggak lihat.",
            },
            { who: "Rina", ko: "걔는?", id: "Dia?" },
            {
              who: "Jisu",
              ko: "걔도 핸드폰 보는 척하더라.",
              id: "Ternyata dia juga pura-pura main HP.",
            },
          ],
          {
            questions: [
              {
                ko: "지수는 전 남친을 보고 어떻게 했어요?",
                id: "Jisu ngapain waktu lihat mantannya?",
              },
              {
                ko: "'Pura-pura tidur'를 한국어로 어떻게 말해요?",
                id: 'Gimana bilang "pura-pura tidur"?',
              },
            ],
          },
        ),
        p(
          "Pola lain di obrolan ini: ",
          ref("-더라", "ki-akhiran-rasa", "deora"),
          " (cerita hal yang kamu lihat sendiri, lihat ",
          ref("ternyata", "ik-dugaan", "ternyata"),
          ").",
        ),
        h3("Coba bikin sendiri"),
        bullet(i('"Aku pura-pura sibuk."')),
        bullet(i('"Jangan pura-pura nggak denger!"')),
        callout(
          "success",
          "1. ",
          b("바쁜 척했어."),
          " 2. ",
          b("못 들은 척하지 마!"),
        ),
      ],
    },
    {
      key: "terserah",
      title: "Terserah",
      blocks: [
        p(
          i('"Mau makan apa?" "Terserah."'),
          " Kata paling legendaris (dan paling bikin pusing). Di bahasa Korea, terserah punya banyak versi, dan nadanya bisa beda jauh. Gimana bilangnya?",
        ),
        h3("1. Terserah kamu yang mutusin"),
        table([
          ["Korea", "Nuansa", "Pola"],
          [
            b("네가 정해."),
            'Santai, netral: "kamu yang tentuin".',
            "정하다 = menentukan",
          ],
          [
            b("편한 대로 해. / 편하신 대로 하세요."),
            'Ramah: "senyamannya kamu aja". Versi sopan aman buat atasan.',
            ref("-대로", "ki-kata-kecil", "maeumdaero"),
          ],
          [
            b("마음대로 해."),
            '"Sesukamu." Hati-hati, gampang kedengeran ketus.',
            ref("마음대로 해", "ki-kata-kecil", "maeumdaero"),
          ],
          [
            b("알아서 해."),
            '"Urus sendiri." Bisa netral, bisa nyerah dan kesel.',
            ref("마음대로 / 알아서", "ki-kata-kecil", "maeumdaero"),
          ],
        ]),
        h3("2. Apa aja boleh"),
        table([
          ["Korea", "Nuansa", "Pola"],
          [
            b("아무거나 괜찮아(요)."),
            '"Apa aja oke." Buat makanan, barang.',
            ref("아무거나", "ki-kata-kecil", "maeumdaero"),
          ],
          [
            b("아무 데나 괜찮아."),
            '"Di mana aja." Buat tempat.',
            ref("아무거나", "ki-kata-kecil", "maeumdaero"),
          ],
          [
            b("아무 때나 괜찮아요."),
            '"Kapan aja." Buat waktu.',
            ref("아무거나", "ki-kata-kecil", "maeumdaero"),
          ],
          [
            b("저는 다 좋아요."),
            '"Aku suka semua." Paling positif.',
            "ungkapan tetap",
          ],
        ]),
        h3("3. Terserah (kesel, nyerah)"),
        ex("마음대로 해!", "Terserah kamu deh!", "nada naik, kesel"),
        ex("알아서 해.", "Ya udah, urus aja sendiri."),
        ex("됐어.", "Udah, nggak usah.", "lihat deh"),
        p(
          "Kata ",
          ref("됐어", "ki-kata-kecil", "dwaesseo"),
          " juga dibahas di ",
          ref("deh", "ik-partikel", "deh"),
          ".",
        ),
        callout(
          "warning",
          b("Jebakan: 마음대로 해 ke atasan."),
          ' Di bahasa Indonesia, "terserah Bapak" itu sopan. Tapi ',
          b("마음대로 하세요"),
          " ke 사장님 bisa kedengeran kayak kamu kesel atau nggak peduli. Pakai ",
          b("사장님 편하신 대로 하세요"),
          " atau ",
          b("저는 아무거나 괜찮아요"),
          ".",
        ),
        callout(
          "warning",
          b("Jebakan: 아무거나 vs 아무것도."),
          " ",
          b("아무거나 먹어"),
          ' = "aku makan apa aja". ',
          b("아무것도 안 먹어"),
          ' = "aku nggak makan apa-apa". 아무것도 selalu bareng kata negatif (안/못/없다).',
        ),
        callout(
          "tip",
          "Orang Korea juga suka bilang 아무거나, tapi kadang bikin yang nanya bingung milih. Kasih opini dikit biar lebih enak: ",
          b("다 좋은데, 굳이 고르자면 비빔밥이요."),
          " (",
          i("Semua oke sih, tapi kalau harus milih, bibimbap."),
          ")",
        ),
        culture({
          titleKo: "윗사람한테 '아무거나'",
          titleId: "Bilang terserah ke 사장님 dan orang yang lebih tua",
          paragraphs: [
            {
              ko: "인도네시아어로 'terserah Bapak'은 공손한 말이에요. 하지만 한국어로 사장님한테 '마음대로 하세요'라고 하면 화가 났거나 관심이 없는 것처럼 들릴 수 있어요.",
              id: 'Di Indonesia, "terserah Bapak" itu sopan. Tapi kalau kamu bilang 마음대로 하세요 ke 사장님, bisa kedengeran kayak lagi kesel atau nggak peduli.',
            },
            {
              ko: "윗사람이 고르라고 하면 '편하신 대로 하세요'나 '저는 아무거나 괜찮아요'라고 하세요. 높임말 '-시-'가 들어가서 상대를 배려하는 느낌이 나요.",
              id: "Kalau atasan nyuruh kamu milih, bilang 편하신 대로 하세요 atau 저는 아무거나 괜찮아요. Ada -시- (bentuk hormat), jadi kerasa kamu menghargai dia.",
            },
            {
              ko: "윗사람이 밥을 사 줄 때는 너무 비싼 메뉴는 피하는 게 좋아요. 그리고 못 먹는 음식은 처음에 말하세요. '저는 돼지고기를 못 먹어요'처럼요.",
              id: "Kalau atasan traktir, mending hindari menu yang paling mahal. Makanan yang nggak bisa kamu makan juga bilang dari awal aja: 저는 돼지고기를 못 먹어요.",
            },
          ],
          checklist: [
            {
              ko: "사장님한테 '편하신 대로 하세요'라고 말할 수 있어요.",
              id: "Aku bisa bilang terserah ke 사장님 dengan sopan.",
            },
            {
              ko: "못 먹는 음식을 처음에 말할 수 있어요.",
              id: "Aku bisa bilang dari awal makanan yang nggak bisa aku makan.",
            },
          ],
        }),
        h3("Contoh obrolan"),
        p("Jam makan siang di pabrik. 사장님 mau traktir."),
        ...chat(
          [
            {
              who: "사장님",
              ko: "오늘 점심 뭐 먹을래?",
              id: "Siang ini mau makan apa?",
            },
            {
              who: "Andi",
              ko: "저는 아무거나 괜찮아요. 아, 돼지고기만 빼고요.",
              id: "Aku apa aja boleh, Pak. Eh, asal bukan babi.",
            },
            {
              who: "사장님",
              ko: "그럼 생선구이 어때?",
              id: "Kalau gitu ikan bakar gimana?",
            },
            {
              who: "Andi",
              ko: "좋아요! 감사합니다.",
              id: "Boleh! Makasih, Pak.",
            },
          ],
          {
            questions: [
              {
                ko: "안디는 어떤 음식을 빼 달라고 했어요?",
                id: "Andi minta makanan apa yang jangan?",
              },
              {
                ko: "'Terserah Bapak aja'를 사장님한테 어떻게 말해요?",
                id: 'Gimana bilang "terserah Bapak aja" ke 사장님?',
              },
            ],
            tip: {
              title: "꿀팁 · TIP",
              ko: "'아무거나'만 말하지 말고 못 먹는 음식이나 좋아하는 걸 하나 말해 주면 좋아요.",
              id: "Jangan cuma 아무거나. Sebutin satu yang nggak bisa kamu makan atau yang kamu suka, biar yang nanya gampang milih.",
            },
          },
        ),
        p(
          "Pola lain di obrolan ini: ",
          ref("-(으)ㄹ래?", "ki-minta-ajak", "eullaeyo"),
          ' (mau ...?). Butuh cara lain bilang "asal"? Lihat ',
          ref("asal", "ik-alasan", "asal"),
          ".",
        ),
        h3("Coba bikin sendiri"),
        bullet(i('"Terserah Bapak aja." (ke 사장님)')),
        bullet(i('"Mau duduk di mana?" "Terserah, di mana aja."')),
        callout(
          "success",
          "1. ",
          b("사장님 편하신 대로 하세요."),
          " 2. ",
          b("아무 데나 괜찮아."),
        ),
      ],
    },
    {
      key: "nggak-usah",
      title: "Nggak usah",
      blocks: [
        p(
          i('"Nggak usah dateng, aku udah sembuh kok."'),
          " Gimana bilangnya? ",
          i("Nggak usah"),
          " bisa berarti nggak perlu, nolak tawaran dengan halus, atau malah ngelarang dengan kesel.",
        ),
        h3("1. Nggak perlu"),
        table([
          ["Korea", "Nuansa", "Pola"],
          [
            b("안 와도 돼."),
            'Paling sering: "nggak dateng juga nggak apa-apa".',
            ref("안 -아/어도 돼", "ki-bisa-harus", "ji-anado-doeda"),
          ],
          [
            b("오지 않아도 돼요."),
            "Sama, sedikit lebih rapi dan formal.",
            ref("-지 않아도 돼요", "ki-bisa-harus", "ji-anado-doeda"),
          ],
          [
            b("올 필요 없어."),
            '"Nggak perlu dateng." Lebih tegas dan datar.',
            "필요 없다 = nggak perlu",
          ],
        ]),
        ex("돈 안 내도 돼. 내가 살게.", "Nggak usah bayar. Aku traktir."),
        ex("내일은 일찍 안 와도 돼요.", "Besok nggak usah dateng pagi."),
        ex("걱정하지 않아도 돼요.", "Nggak usah khawatir."),
        h3("2. Nolak tawaran dengan halus"),
        table([
          ["Korea", "Nuansa", "Pola"],
          [
            b("괜찮아요."),
            '"Nggak usah, makasih." Paling umum.',
            "ungkapan tetap",
          ],
          [
            b("신경 쓰지 마세요."),
            '"Nggak usah dipikirin, nggak usah repot." Ke orang tua, 안 그러셔도 돼요 lebih halus.',
            ref("-지 마세요", "ki-minta-ajak", "ji-maseyo"),
          ],
          [
            b("안 그러셔도 돼요."),
            '"Nggak usah gitu, Pak/Bu." Sopan banget ke orang yang lebih tua.',
            ref("안 -아/어도 돼요", "ki-bisa-harus", "ji-anado-doeda"),
          ],
        ]),
        callout(
          "warning",
          b("Jebakan: 괜찮아요 itu nolak, bukan setuju."),
          " Ditawarin kopi, kamu jawab ",
          b("괜찮아요"),
          ', artinya "nggak usah, makasih". Kalau mau, bilang ',
          b("네, 좋아요"),
          " atau ",
          b("감사합니다"),
          '. Banyak orang Indonesia ngira 괜찮아요 = "boleh", terus bingung kok kopinya nggak dateng.',
        ),
        h3("3. Nggak usah (kesel, ngelarang)"),
        ex(
          "상관하지 마.",
          "Nggak usah ikut campur.",
          "ketus, cuma pas lagi kesel",
        ),
        ex("신경 쓰지 마.", "Nggak usah dipikirin.", "santai, ke teman"),
        ex("아는 척하지 마.", "Nggak usah sok tahu."),
        ex("됐어, 하지 마.", "Udah, nggak usah."),
        p(
          "Sok tahu pakai ",
          ref("-는 척하다", "ki-keadaan", "cheok"),
          " (lihat ",
          ref("pura-pura", "ik-andai", "pura-pura"),
          "), dan ",
          ref("됐어", "ki-kata-kecil", "dwaesseo"),
          ' buat "udah deh".',
        ),
        callout(
          "warning",
          b("Jebakan terbesar: nggak usah ≠ nggak boleh."),
          " ",
          b("안 와도 돼"),
          ' = "nggak usah dateng" (boleh dateng, boleh nggak). ',
          b("오면 안 돼"),
          ' = "jangan dateng, nggak boleh". Kalau ketuker, kamu bisa bikin orang ngerasa diusir. Lihat ',
          ref("-(으)면 안 되다", "ki-bisa-harus", "myeon-an-doeda"),
          ".",
        ),
        h3("Contoh obrolan"),
        p("Pulang kerja, hujan deres. 사장님 nawarin nganter Andi."),
        ...chat(
          [
            {
              who: "사장님",
              ko: "비 오는데 기숙사까지 태워 줄까?",
              id: "Lagi hujan nih, mau aku anter ke asrama?",
            },
            {
              who: "Andi",
              ko: "아, 괜찮아요. 가까워서 걸어가면 돼요.",
              id: "Oh, nggak usah, Pak. Deket kok, jalan kaki juga bisa.",
            },
            {
              who: "사장님",
              ko: "비가 이렇게 많이 오는데? 그냥 타.",
              id: "Hujannya deres gini? Udah, naik aja.",
            },
            {
              who: "Andi",
              ko: "그럼... 신경 써 주셔서 감사합니다.",
              id: "Kalau gitu... makasih banyak udah repot-repot, Pak.",
            },
          ],
          {
            questions: [
              {
                ko: "안디는 처음에 사장님 제안에 뭐라고 대답했어요?",
                id: "Pertama kali ditawarin, Andi jawab apa?",
              },
              {
                ko: "'Nggak usah dateng'과 'jangan dateng'은 한국어로 어떻게 달라요?",
                id: 'Apa bedanya "nggak usah dateng" dan "jangan dateng" dalam bahasa Korea?',
              },
            ],
          },
        ),
        p(
          "Pola lain di obrolan ini: ",
          ref("-는데", "ki-alasan-urutan", "neunde"),
          ", ",
          ref("-(으)ㄹ까?", "ki-minta-ajak", "eulkkayo"),
          ", ",
          ref("-아/어 주다", "ki-minta-ajak", "a-juseyo"),
          ", dan ",
          ref("-아/어도 되다", "ki-bisa-harus", "ado-doeda"),
          ". Perhatiin: Andi nolak sekali dulu, terus nerima. Ini sopan santun yang mirip banget sama kebiasaan kita.",
        ),
        culture({
          titleKo: "'괜찮아요'로 거절하기",
          titleId: "Nolak tawaran dengan halus",
          paragraphs: [
            {
              ko: "한국에서 '괜찮아요'는 '필요 없어요, 감사합니다'라는 뜻일 때가 많아요. 커피를 권할 때 '괜찮아요'라고 하면 보통 거절이에요. 받고 싶으면 '네, 감사합니다'라고 하세요.",
              id: 'Di Korea, 괜찮아요 sering artinya "nggak usah, makasih". Ditawarin kopi terus jawab 괜찮아요? Itu nolak. Kalau mau, bilang 네, 감사합니다.',
            },
            {
              ko: "윗사람이 도와주겠다고 하면 한 번 사양하는 경우가 많아요. '아, 안 그러셔도 돼요'라고 하고, 다시 권하면 '그럼 감사합니다'라고 받으면 자연스러워요.",
              id: "Kalau atasan nawarin bantuan, biasanya kita nolak halus sekali dulu: 아, 안 그러셔도 돼요. Kalau dia nawarin lagi, terima aja: 그럼 감사합니다. Mirip kebiasaan kita, kan?",
            },
            {
              ko: "선물을 받을 때는 '뭘 이런 걸 다...'라고 말하기도 해요. '이런 것까지 안 주셔도 되는데'라는 느낌이에요. 그래도 마지막에는 꼭 '감사합니다'라고 하세요.",
              id: 'Pas dikasih oleh-oleh, orang Korea sering bilang 뭘 이런 걸 다... Rasanya kayak "aduh, nggak usah repot-repot". Tapi ujungnya tetep bilang 감사합니다 ya.',
            },
          ],
          checklist: [
            {
              ko: "'괜찮아요'가 거절이라는 걸 알아요.",
              id: 'Aku tahu 괜찮아요 itu nolak, bukan "boleh".',
            },
            {
              ko: "윗사람의 제안을 공손하게 한 번 사양할 수 있어요.",
              id: "Aku bisa nolak halus tawaran atasan sekali dulu.",
            },
          ],
        }),
        h3("Coba bikin sendiri"),
        bullet(i('"Nggak usah repot-repot, Bu." (ke ibu kos)')),
        bullet(
          i(
            '"Besok nggak usah masuk kerja." vs "Besok nggak boleh masuk kerja."',
          ),
        ),
        callout(
          "success",
          "1. ",
          b("아, 안 그러셔도 돼요."),
          " atau ",
          b("괜찮아요, 신경 쓰지 마세요."),
          " 2. ",
          b("내일 출근 안 해도 돼요."),
          " vs ",
          b("내일 출근하면 안 돼요."),
          " Bedanya jauh banget, kan?",
        ),
      ],
    },
  ],
  outro: [
    h3("Rangkuman"),
    table([
      ["Indonesia", "Bilangnya", "Kunci"],
      [
        "Harusnya tadi ...",
        b("-았/었어야 했는데 / -(으)ㄹ걸"),
        ref("-았/었어야 했는데", "ki-andai", "asseoya"),
      ],
      [
        "Coba / kalau aja (udah lewat)",
        b("-았/었으면 좋았을 텐데"),
        ref("-았/었으면 좋았을 텐데", "ki-andai", "asseumyeon-teonde"),
      ],
      ["Semoga, pengen banget", b("-았/었으면 좋겠다"), "harapan"],
      [
        "Pura-pura",
        b("-(으)ㄴ/는 척하다"),
        ref("-(으)ㄴ/는 척하다", "ki-keadaan", "cheok"),
      ],
      [
        "Terserah",
        b("편한 대로 하세요 / 아무거나 괜찮아요"),
        ref("마음대로 / 아무거나", "ki-kata-kecil", "maeumdaero"),
      ],
      [
        "Nggak usah",
        b("안 -아/어도 돼 / 괜찮아요"),
        ref("-지 않아도 되다", "ki-bisa-harus", "ji-anado-doeda"),
      ],
    ]),
    callout(
      "success",
      "Selamat, kamu udah sampai ujung kursus Berani Ngomong! Dari padahal sampai nggak usah, kamu sekarang punya stok cara ngomong yang natural. Biar nempel, balik lagi ke ",
      ref("padahal", "ik-padahal"),
      " dan coba bikin satu kalimat sendiri buat tiap maksud. Ngomong keras-keras, ya. Kursus ini namanya Berani Ngomong, bukan Berani Baca.",
    ),
    p(
      "Sebelum pamit, cek dulu yuk: kuis singkat soal milih cara ngomong yang paling natural. Nilai 70 udah lulus.",
    ),
    quizRef(),
  ],
  quiz: {
    title: "Kuis: harusnya, kalau aja, terserah",
    description:
      "Sepuluh situasi ngobrol. Pilih cara bilang yang paling natural, dari nyesel sampai nolak tawaran 사장님.",
    passingScore: 70,
    questions: [
      {
        key: "harusnya-payung",
        prompt:
          'Hujan deres, kamu basah kuyup. Kamu ngomong ke diri sendiri: "Harusnya tadi bawa payung." Pilih yang paling natural.',
        options: [
          { text: "우산 가져올걸.", correct: true },
          { text: "우산 가져와야 해." },
          { text: "우산 가져올게." },
          { text: "우산 가져와 봐." },
        ],
        explanation:
          '-(으)ㄹ걸 dengan nada turun = nyesel, kayak ngomel ke diri sendiri. 가져와야 해 itu aturan ("harus bawa"), 가져올게 malah janji ("aku bawain ya").',
      },
      {
        key: "harusnya-aturan",
        prompt:
          'Kamu jelasin ke temen baru di pabrik: "Di dalam pabrik harusnya pakai helm." (aturan, wajib)',
        options: [
          { text: "공장 안에서는 안전모를 써야 돼요.", correct: true },
          { text: "공장 안에서는 안전모를 썼어야 했는데요." },
          { text: "공장 안에서는 안전모를 쓸걸요." },
        ],
        explanation:
          "Harusnya yang artinya wajib = -아/어야 돼요. 썼어야 했는데 itu nyesel (udah lewat), jadi kedengeran kayak kamu lagi nyesel nggak pakai helm.",
      },
      {
        key: "harusnya-nggak-beli",
        prompt: 'Kamu nyesel belanja online: "Harusnya aku nggak beli ini."',
        options: [
          { text: "이거 사지 말걸.", correct: true },
          { text: "이거 사면 안 돼." },
          { text: "이거 사지 마." },
        ],
        explanation:
          'Nyesel udah ngelakuin sesuatu = -지 말걸 (atau -지 말았어야 했는데). 사면 안 돼 itu larangan ("nggak boleh beli"), 사지 마 nyuruh orang lain jangan beli.',
      },
      {
        key: "coba-kemarin",
        prompt:
          'Kamu cerita ke bestie yang nggak ikut nonton konser: "Coba kemarin kamu ikut, seru banget!"',
        options: [
          { text: "어제 너도 왔으면 좋았을 텐데!", correct: true },
          { text: "어제 너도 와 봤으면 좋겠다!" },
          { text: "어제 너도 와 봐!" },
        ],
        explanation:
          'Coba yang artinya kalau aja (udah lewat) = -았/었으면 좋았을 텐데. Jangan kepancing "coba" = -아/어 보다, itu buat nyobain sesuatu.',
      },
      {
        key: "semoga-libur",
        prompt:
          'Kamu lagi capek dan berharap: "Kalau aja besok libur." (masih bisa kejadian)',
        options: [
          { text: "내일 쉬었으면 좋겠다.", correct: true },
          { text: "내일 쉬었으면 좋았을 텐데." },
          { text: "내일 쉬었어야 했는데." },
        ],
        explanation:
          "Masih berharap = -았/었으면 좋겠다. 좋았을 텐데 dipakai buat yang udah lewat, jadi aneh kalau buat besok.",
      },
      {
        key: "pura-pura-tidur",
        prompt:
          '"Tadi pas Mama manggil, aku pura-pura tidur." Pilih yang bener.',
        options: [
          { text: "엄마가 불렀는데 자는 척했어.", correct: true },
          { text: "엄마가 불렀는데 잤는 척했어." },
          { text: "엄마가 불렀는데 자는 척해." },
        ],
        explanation:
          "Tanda lampau ditaruh di 척했어, bukan di depannya. 잤는 척 itu bentuk yang salah, dan 자는 척해 masih bentuk sekarang.",
      },
      {
        key: "terserah-sajangnim",
        prompt:
          '사장님 nanya mau makan siang di mana. Kamu mau bilang "Terserah Bapak aja."',
        options: [
          { text: "사장님 편하신 대로 하세요.", correct: true },
          { text: "사장님 마음대로 하세요." },
          { text: "알아서 하세요." },
        ],
        explanation:
          '편하신 대로 하세요 = "senyamannya Bapak aja", sopan dan ramah. 마음대로 하세요 dan 알아서 하세요 gampang kedengeran kesel atau nggak peduli. Red flag ke atasan.',
      },
      {
        key: "di-mana-aja",
        prompt:
          'Bestie nanya mau duduk di mana di kafe. "Terserah, di mana aja."',
        options: [
          { text: "아무 데나 괜찮아.", correct: true },
          { text: "아무것도 괜찮아." },
          { text: "아무 때나 괜찮아." },
        ],
        explanation:
          'Tempat = 아무 데나. 아무 때나 itu "kapan aja", dan 아무것도 selalu bareng kata negatif (아무것도 안 먹어 = nggak makan apa-apa).',
      },
      {
        key: "nggak-usah-masuk",
        prompt:
          'Kamu kabarin rekan kerja: "Besok nggak usah masuk kerja." (maksudnya boleh libur)',
        options: [
          { text: "내일 출근 안 해도 돼요.", correct: true },
          { text: "내일 출근하면 안 돼요." },
          { text: "내일 출근하지 마세요." },
        ],
        explanation:
          'Nggak usah = 안 -아/어도 돼요, artinya boleh nggak masuk. 출근하면 안 돼요 dan 출근하지 마세요 itu "jangan masuk", kesannya kayak dia dilarang dateng.',
      },
      {
        key: "mau-kopi",
        prompt: "사장님 nawarin kopi dan kamu MAU. Jawab apa?",
        options: [
          { text: "네, 감사합니다.", correct: true },
          { text: "괜찮아요." },
          { text: "신경 쓰지 마세요." },
        ],
        explanation:
          'Jebakan klasik: 괜찮아요 di sini artinya "nggak usah, makasih". Kalau mau, bilang 네, 감사합니다. Kalau jawab 괜찮아요, siap-siap kopinya nggak dateng.',
      },
    ],
  },
});
