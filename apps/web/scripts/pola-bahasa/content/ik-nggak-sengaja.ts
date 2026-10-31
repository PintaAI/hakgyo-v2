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
  key: "ik-nggak-sengaja",
  title: 'Ketiduran, kelupaan, keceplosan: bilang "nggak sengaja"',
  description:
    "Bahasa Korea nggak punya imbuhan ke-an atau ter- buat hal yang terjadi tanpa sengaja. Di sini kamu belajar rumus penggantinya, lalu pakai buat ketiduran, kelupaan, keceplosan, dan kebawa.",
  intro: [
    opener({
      eyebrow: "BERANI NGOMONG · BAB 6",
      chapterNumber: "06",
      titleKo: "나도 모르게",
      subtitle:
        'Ketiduran, kelupaan, keceplosan: cara bilang "aku nggak sengaja" tanpa imbuhan ke-an.',
      question: "어제 왜 답장 안 했어?",
      answer: "미안, 나도 모르게 잠들어 버렸어.",
      focus: [
        {
          label: "말하기 · Bilangnya",
          title: "나도 모르게 · 실수로 · 깜빡",
          description:
            "Tiga kata kecil pengganti ke-an dan ter-. Tempel ke kata kerja, langsung kerasa nggak sengaja.",
        },
        {
          label: "뉘앙스 · Nuansa",
          title: "-아/어 버렸어 = terlanjur",
          description:
            'Nambahin rasa "duh, udah kejadian" yang bikin permintaan maafmu kedengeran tulus.',
        },
        {
          label: "함정 · Jebakan",
          title: "잤어 ≠ ketiduran",
          description:
            "Tanpa rumusnya, 잤어 atau 말했어 kedengeran kayak kamu emang niat. Plot twist yang nggak kamu mau.",
        },
      ],
      objectives: [
        {
          ko: "실수로 한 일을 상황에 맞게 말할 수 있어요.",
          id: "Bisa bilang hal yang nggak sengaja kamu lakuin sesuai situasi.",
        },
        {
          ko: "실수했을 때 윗사람에게 공손하게 사과할 수 있어요.",
          id: "Bisa minta maaf dengan sopan ke atasan waktu bikin salah.",
        },
      ],
    }),
    p(
      i("Ketiduran, kelupaan, keceplosan, kebawa, kepencet."),
      " Bahasa Indonesia cukup tempel ke-an atau ter-, beres. Bahasa Korea nggak punya imbuhan kayak gitu. Jadi kalau kamu cuma bilang ",
      b("잤어"),
      ' (aku tidur), rasa "nggak sengaja"-nya hilang. Kedengerannya kayak kamu emang niat tidur.',
    ),
    p(
      "Solusinya: pakai ",
      b("rumus"),
      ". Gabungin kata kecil dan akhiran di kartu atas, jadilah ke-an versi Korea. Urutan materinya:",
    ),
    bullet(b("Rumus"), ": bahan-bahan dasarnya."),
    bullet(b("Ketiduran"), ": tidur padahal nggak niat."),
    bullet(b("Kelupaan"), ": lupa ngelakuin atau lupa bawa sesuatu."),
    bullet(b("Keceplosan"), ": ngomong hal yang harusnya nggak diomongin."),
    bullet(b("Kebawa"), ": barang kebawa, atau kebawa suasana."),
    callout(
      "tip",
      'Bagian ini kepake banget buat minta maaf. Telat, lupa, salah ngomong, semuanya butuh rasa "aku nggak sengaja kok". Di tempat kerja Korea, minta maaf yang jelas itu green flag.',
    ),
  ],
  sections: [
    {
      key: "rumus",
      title: "Rumus ke-an dan ter- versi Korea",
      blocks: [
        p(
          i('"Aduh, kehapus!" "Kepencet!" "Keketawa!"'),
          " Gimana bilangnya kalau bahasa Korea nggak punya ke-an?",
        ),
        h3("Bahan-bahannya"),
        table([
          ["Korea", "Nuansa", "Pola"],
          [
            b("나도 모르게"),
            '"Tanpa sadar", "tau-tau". Buat hal yang keluar dari diri sendiri: ketawa, ketiduran, keceplosan.',
            ref("나도 모르게", "ki-kata-kecil", "kkamppak"),
          ],
          [
            b("실수로"),
            '"Nggak sengaja", "salah". Buat tindakan yang keliru: kehapus, kepencet, kebawa.',
            ref("실수로", "ki-kata-kecil", "kkamppak"),
          ],
          [
            b("깜빡"),
            '"Sekilas", "sebentar lupa". Buat lupa dan tidur sebentar.',
            ref("깜빡", "ki-kata-kecil", "kkamppak"),
          ],
          [
            b("-아/어 버렸어"),
            '"Terlanjur", "habis deh". Nambahin rasa nyesel atau "udah kejadian, mau gimana lagi".',
            ref("-아/어 버리다", "ki-keadaan", "a-beorida"),
          ],
        ]),
        p(
          "Rumusnya: ",
          b("[나도 모르게 / 실수로 / 깜빡] + kata kerja + -아/어 버렸어"),
          ". Nggak harus dipakai semua. Satu atau dua bahan biasanya udah cukup.",
        ),
        h3("Contoh"),
        ex("실수로 사진을 지워 버렸어.", "Fotonya kehapus.", "실수로 + 버렸어"),
        ex("잘못 눌렀어요.", "Kepencet, Kak.", "잘못 = salah"),
        ex(
          "나도 모르게 웃어 버렸어.",
          "Aku keketawa.",
          "padahal nggak boleh ketawa",
        ),
        ex("깜빡 잊어버렸어요.", "Kelupaan.", "잊어버리다 udah ada 버리다-nya"),
        ex(
          "저도 모르게 반말이 나왔어요.",
          "Keceplosan pakai 반말.",
          "sopan: 나 jadi 저, lihat keceplosan",
        ),
        h3('Bonus: kata kerja yang udah "ter-" dari sananya'),
        p(
          'Beberapa kata kerja Korea artinya memang udah "terjadi sendiri", kayak ter- di bahasa Indonesia. Nggak perlu rumus lagi:',
        ),
        bullet(
          b("떨어지다"),
          " = jatuh, terjatuh: ",
          b("핸드폰이 떨어졌어."),
          " (HP-ku jatuh.)",
        ),
        bullet(
          b("깨지다"),
          " = pecah: ",
          b("컵이 깨졌어요."),
          " (Gelasnya pecah.)",
        ),
        bullet(
          b("잠들다"),
          " = tertidur: ",
          b("아기가 잠들었어."),
          " (Bayinya ketiduran.)",
        ),
        bullet(
          b("열리다"),
          " = terbuka: ",
          b("문이 열렸어."),
          " (Pintunya kebuka.)",
        ),
        p(
          "Banyak dari kata ini berakhiran -지다, saudaranya pola ",
          ref("-아/어지다", "ki-keadaan", "ajida"),
          ' yang artinya "jadi berubah".',
        ),
        callout(
          "warning",
          b('Jebakan: "jatuh" atau "aku jatuhin"?'),
          " ",
          b("컵이 떨어졌어요"),
          ' artinya "gelasnya jatuh", kayak gelasnya jatuh sendiri. Kalau kamu yang nyenggol, orang Korea lebih suka kamu ngaku: ',
          b("제가 실수로 컵을 떨어뜨렸어요"),
          " (aku nggak sengaja jatuhin gelasnya). 떨어뜨리다 = menjatuhkan. Di tempat kerja, ngaku duluan itu jauh lebih sopan.",
        ),
        callout(
          "warning",
          b("Jebakan: jangan semua dikasih 버리다."),
          ' -아/어 버리다 bukan cuma "nggak sengaja". Kadang artinya "sampai habis" atau "lega, beres": ',
          b("다 먹어 버렸어"),
          ' = "aku habisin semua". Pakai 버리다 kalau memang ada rasa "terlanjur" atau nyesel. Kalau cuma fakta biasa, cukup ',
          b("잠들었어, 떨어졌어"),
          ".",
        ),
        callout(
          "info",
          'Ter- di bahasa Indonesia juga punya arti lain yang bukan "nggak sengaja": ',
          i("terbaik"),
          " (paling) = ",
          b("제일 좋은"),
          ", ",
          i("tak terlupakan"),
          " (bisa) = ",
          b("잊을 수 없는"),
          ". Yang itu jangan pakai rumus ini.",
        ),
        h3("Contoh obrolan"),
        p('Rina lagi shift di 편의점. Tiba-tiba ada bunyi "prang".'),
        ...chat(
          [
            { who: "점장님", ko: "무슨 소리야?", id: "Suara apa itu?" },
            {
              who: "Rina",
              ko: "죄송해요, 제가 실수로 컵을 떨어뜨렸어요.",
              id: "Maaf, Bu, gelasnya nggak sengaja aku jatuhin.",
            },
            {
              who: "점장님",
              ko: "괜찮아? 안 다쳤어?",
              id: "Nggak apa-apa? Nggak luka?",
            },
            {
              who: "Rina",
              ko: "네, 괜찮아요. 바로 치울게요.",
              id: "Iya, nggak apa-apa. Langsung aku beresin.",
            },
          ],
          {
            questions: [
              { ko: "리나는 뭘 떨어뜨렸어요?", id: "Rina jatuhin apa?" },
              {
                ko: "'Filenya kehapus'를 한국어로 어떻게 말해요?",
                id: "Gimana bilang 'Filenya kehapus' dalam bahasa Korea?",
              },
            ],
            tip: {
              title: "꿀팁 · TIP",
              ko: "'제가 실수로'로 시작하면 내가 했다고 먼저 인정하는 거라서 더 정중하게 들려요.",
              id: "Mulai dari 제가 실수로 (aku yang nggak sengaja). Kamu ngaku duluan, jadi kedengeran lebih sopan.",
            },
          },
        ),
        p(
          "Pola lain di obrolan ini: ",
          ref("-(으)ㄹ게요", "ki-minta-ajak", "eulgeyo"),
          " (janji langsung beresin). 점장님 ngomong 반말, Rina tetap pakai -요, lihat ",
          ref("kapan boleh 반말", "ki-banmal", "kapan"),
          ".",
        ),
        h3("Coba bikin sendiri"),
        bullet(i('"Filenya kehapus." (파일)')),
        bullet(i('"HP-ku jatuh ke air." (물에)')),
        callout(
          "success",
          "1. ",
          b("실수로 파일을 지워 버렸어."),
          " 2. ",
          b("핸드폰이 물에 떨어졌어."),
          " Kalau kamu yang jatuhin: ",
          b("핸드폰을 물에 떨어뜨렸어."),
        ),
      ],
    },
    {
      key: "ketiduran",
      title: "Ketiduran",
      blocks: [
        p(
          i('"Sorry baru bales, tadi ketiduran."'),
          " Kalimat wajib anak chat jam dua pagi. Gimana bilangnya?",
        ),
        h3("Ketiduran beneran: nggak niat tidur, eh tidur"),
        table([
          ["Korea", "Nuansa", "Pola"],
          [
            b("잠들어 버렸어."),
            'Paling pas buat "ketiduran". Ada rasa "terlanjur, maaf ya".',
            ref("-아/어 버리다", "ki-keadaan", "a-beorida"),
          ],
          [
            b("나도 모르게 잠들었어."),
            '"Tau-tau udah tidur." Nekenin kamu nggak sadar.',
            ref("나도 모르게", "ki-kata-kecil", "kkamppak"),
          ],
          [
            b("깜빡 잠들었어."),
            '"Ketiduran bentar." Kesannya cuma sebentar, nggak sengaja.',
            ref("깜빡", "ki-kata-kecil", "kkamppak"),
          ],
        ]),
        p(
          "Versi sopan: ",
          b("죄송해요, 잠들어 버렸어요."),
          " Ke atasan atau dosen, lebih formal lagi: ",
          b("죄송합니다. 깜빡 잠들었습니다."),
        ),
        h3("Ketiduran sampai kesiangan"),
        p(
          'Kalau ketidurannya bikin telat bangun, orang Korea nggak bilang "ketiduran". Mereka bilang ',
          b("늦잠을 잤어"),
          " (bangun kesiangan).",
        ),
        ex("늦잠 잤어!", "Aku kesiangan!"),
        ex(
          "늦잠 자는 바람에 지각했어요.",
          "Gara-gara kesiangan, aku telat masuk.",
          "-는 바람에 = gara-gara (hal nggak terduga)",
        ),
        p(
          "Pola ",
          ref("-는 바람에", "ki-waktu-sebab", "neun-barame"),
          " cocok banget buat alasan sial kayak gini. Lengkapnya di ",
          ref("gara-gara", "ik-alasan", "gara-gara"),
          ".",
        ),
        h3("Ketiduran sebentar: terkantuk-kantuk"),
        p(
          "Kepala ngangguk-ngangguk di kelas atau di subway? Itu ",
          b("졸다"),
          ": tidur-tidur ayam, nggak sengaja.",
        ),
        ex("수업 시간에 졸았어.", "Aku ketiduran bentar di kelas."),
        ex(
          "지하철에서 졸다가 내릴 역을 지나쳤어요.",
          "Aku ketiduran di subway sampai stasiunnya kelewatan.",
          "-다가 = lagi ..., eh",
        ),
        p(
          "Bentuk ",
          ref("-다가", "ki-waktu-sebab", "daga"),
          ' pas banget buat cerita "lagi ngapain, eh tiba-tiba kejadian".',
        ),
        callout(
          "warning",
          b("Jebakan: 졸다 vs 졸리다."),
          " ",
          b("졸려"),
          " = ngantuk (perasaan). ",
          b("졸았어"),
          ' = ketiduran sebentar (kejadian). Jadi "aku ngantuk" itu ',
          b("졸려"),
          ", bukan ~~졸아~~. Kalau kamu bilang ",
          b("수업 시간에 졸았어"),
          ", artinya kamu udah ngangguk-ngangguk beneran.",
        ),
        callout(
          "warning",
          b("Jebakan: 잤어 doang."),
          " ",
          b("어제 일찍 잤어"),
          ' = "kemarin aku tidur cepet" (niat). Kalau maksudmu ketiduran pas lagi nunggu chat atau nonton, pakai ',
          b("잠들어 버렸어"),
          " atau ",
          b("나도 모르게 잠들었어"),
          " biar orang tahu kamu nggak sengaja.",
        ),
        h3("Contoh obrolan"),
        p("Pagi-pagi, Jisu ngechat Rina yang semalam ngilang."),
        ...chat(
          [
            {
              who: "Jisu",
              ko: "어제 왜 답장 안 했어?",
              id: "Kemarin kok nggak bales?",
            },
            {
              who: "Rina",
              ko: "미안! 드라마 보다가 나도 모르게 잠들어 버렸어.",
              id: "Sorry! Lagi nonton drakor, eh ketiduran.",
            },
            { who: "Jisu", ko: "ㅋㅋ 또?", id: "Wkwk, lagi?" },
            {
              who: "Rina",
              ko: "응... 눈 떠 보니까 아침이었어.",
              id: "Iya... pas melek, udah pagi.",
            },
          ],
          {
            questions: [
              {
                ko: "리나는 왜 답장을 못 했어요?",
                id: "Kenapa Rina nggak bales chat Jisu?",
              },
              {
                ko: "'Sorry, aku ketiduran di bus'를 친구한테 어떻게 말해요?",
                id: "Gimana bilang 'Sorry, aku ketiduran di bus' ke temen?",
              },
            ],
          },
        ),
        p(
          "Pola lain di obrolan ini: ",
          ref("왜", "ki-kata-kecil", "wae"),
          " (",
          i("kok"),
          "), ",
          ref("-다가", "ki-waktu-sebab", "daga"),
          ", dan ",
          ref("-아/어 보다", "ki-keadaan", "a-boda"),
          " di ",
          b("눈 떠 보니까"),
          ' ("pas aku buka mata, ternyata...").',
        ),
        h3("Kesiangan sampai telat kerja"),
        culture({
          titleKo: "지각했을 때 사과하는 법",
          titleId: "Telat kerja gara-gara kesiangan? Gini minta maafnya",
          paragraphs: [
            {
              ko: "한국 직장에서는 출근 시간을 지키는 게 아주 중요해요. 늦을 것 같으면 출근 시간 전에 먼저 전화하거나 문자를 보내세요.",
              id: "Di tempat kerja Korea, dateng tepat waktu itu penting banget. Kalau kayaknya bakal telat, telepon atau chat atasan sebelum jam masuk.",
            },
            {
              ko: "도착하면 변명보다 사과를 먼저 해요. '죄송합니다. 늦잠을 자서 늦었습니다.'처럼 짧고 솔직하게 말하는 게 좋아요.",
              id: "Pas nyampe, minta maaf dulu, baru alasan. Pendek dan jujur aja: 죄송합니다. 늦잠을 자서 늦었습니다. Nggak usah ngarang cerita panjang.",
            },
            {
              ko: "마지막에 '다음부터 조심하겠습니다'라고 하면 책임감 있게 들려요.",
              id: "Tutup pakai 다음부터 조심하겠습니다 (lain kali saya lebih hati-hati). Kedengeran bertanggung jawab, poin plus di mata 반장님.",
            },
          ],
          checklist: [
            {
              ko: "늦을 것 같으면 미리 연락해요.",
              id: "Kalau bakal telat, aku ngabarin duluan.",
            },
            {
              ko: "변명보다 사과를 먼저 해요.",
              id: "Aku minta maaf dulu, baru jelasin alasannya.",
            },
          ],
        }),
        p(
          "Andi telat 20 menit masuk pabrik. 반장님 udah nunggu di depan line.",
        ),
        ...chat(
          [
            {
              who: "반장님",
              ko: "왜 이렇게 늦었어?",
              id: "Kok telat banget?",
            },
            {
              who: "Andi",
              ko: "죄송합니다. 알람을 못 듣고 늦잠을 잤어요.",
              id: "Maaf, Pak. Alarmnya nggak kedengeran, saya kesiangan.",
            },
            {
              who: "반장님",
              ko: "늦을 것 같으면 미리 전화해.",
              id: "Kalau mau telat, telepon dulu.",
            },
            {
              who: "Andi",
              ko: "네, 다음부터는 꼭 미리 연락드릴게요.",
              id: "Siap, Pak. Lain kali saya pasti ngabarin dulu.",
            },
          ],
          {
            questions: [
              { ko: "안디는 왜 늦었어요?", id: "Kenapa Andi telat?" },
              {
                ko: "반장님은 다음부터 어떻게 하라고 했어요?",
                id: "반장님 nyuruh Andi ngapain lain kali?",
              },
              {
                ko: "'Maaf, Pak, saya kesiangan'을 반장님한테 어떻게 말해요?",
                id: "Gimana bilang 'Maaf, Pak, saya kesiangan' ke 반장님?",
              },
            ],
          },
        ),
        h3("Coba bikin sendiri"),
        bullet(i('"Maaf, aku ketiduran di bus." (ke teman)')),
        bullet(i('"Maaf, Pak, saya kesiangan." (ke 반장님)')),
        callout(
          "success",
          "1. ",
          b("미안, 버스에서 잠들어 버렸어."),
          " 2. ",
          b("죄송합니다, 늦잠을 잤어요."),
          " Bisa ditambah alasan telatnya: ",
          b("늦잠 자는 바람에 늦었어요."),
        ),
      ],
    },
    {
      key: "kelupaan",
      title: "Kelupaan",
      blocks: [
        p(
          i('"Eh, kelupaan!"'),
          " Lupa ngabarin, lupa bawa dompet, lupa nama orang. Bahasa Indonesia cukup satu kata. Bahasa Korea beda-beda tergantung lupanya kayak apa. Gimana bilangnya?",
        ),
        h3("Lupa sebentar, lupa ngelakuin"),
        table([
          ["Korea", "Nuansa", "Pola"],
          [
            b("깜빡했어."),
            'Paling sering. "Kelupaan" ringan, lupa sesaat.',
            ref("깜빡하다", "ki-kata-kecil", "kkamppak"),
          ],
          [
            b("깜빡 잊어버렸어."),
            'Sama, lebih lengkap. Ada rasa "duh, terlanjur".',
            ref("-아/어 버리다", "ki-keadaan", "a-beorida"),
          ],
          [
            b("잊어버렸어."),
            "Lupa beneran. Bisa lebih berat dari 깜빡.",
            ref("-아/어 버리다", "ki-keadaan", "a-beorida"),
          ],
          [
            b("약 먹는 걸 깜빡했어."),
            "Lupa ngelakuin sesuatu: kata kerja + -는 걸 깜빡했어.",
            ref("깜빡하다", "ki-kata-kecil", "kkamppak"),
          ],
        ]),
        ex(
          "아, 깜빡했다!",
          "Ah, kelupaan!",
          "ngomong ke diri sendiri, bentuk -다",
        ),
        ex("문 잠그는 거 깜빡했어요.", "Aku kelupaan ngunci pintu."),
        ex(
          "엄마한테 돈 보내는 걸 깜빡했어.",
          "Aku kelupaan kirim uang ke Ibu.",
        ),
        h3("Kelupaan bawa, ketinggalan"),
        p(
          'Buat barang yang ketinggalan, orang Korea biasanya nggak pakai "lupa". Mereka bilang "aku taruh, terus pergi": ',
          b("놓고 왔어"),
          " atau ",
          b("두고 왔어"),
          ".",
        ),
        ex("지갑을 집에 놓고 왔어.", "Dompetku ketinggalan di rumah."),
        ex(
          "버스에 우산을 두고 내렸어요.",
          "Payungku ketinggalan di bus.",
          "두고 내리다 = turun ninggalin",
        ),
        ex(
          "우산 가져오는 걸 깜빡했어.",
          "Aku kelupaan bawa payung.",
          "nggak kebawa sama sekali",
        ),
        h3("Nggak inget sama sekali"),
        ex("이름이 기억이 안 나요.", "Aku lupa namanya.", "nggak inget"),
        ex("어디에 뒀는지 기억이 안 나.", "Aku lupa naruhnya di mana."),
        callout(
          "warning",
          b("Jebakan: lupa ≠ nggak tahu."),
          ' Orang Indonesia kadang bilang "lupa" buat hal yang sebenernya belum pernah tahu. Di bahasa Korea itu beda: ',
          b("몰라요"),
          " = nggak tahu, ",
          b("기억이 안 나요"),
          " = pernah tahu tapi lupa. Kalau ditanya alamat yang belum pernah kamu tahu, jawab ",
          b("몰라요"),
          ".",
        ),
        callout(
          "warning",
          b("Jebakan: 잊어버렸어 bisa kedengeran berat."),
          " ",
          b("약속을 잊어버렸어"),
          " bisa kesannya kamu nggak peduli sama janjinya. Buat lupa yang kecil dan mau minta maaf, ",
          b("깜빡했어요"),
          ' lebih enak didenger: "maaf, kelupaan".',
        ),
        p(
          "Kelupaan sering nongol bareng rencana yang batal: ",
          b("전화하려고 했는데 깜빡했어요"),
          " (tadinya mau nelpon, tapi kelupaan). Lihat ",
          ref("padahal: rencana yang nggak jadi", "ik-padahal", "rencana"),
          ".",
        ),
        h3("Contoh obrolan"),
        p("Pagi di pabrik. Andi dateng tanpa sepatu safety."),
        ...chat(
          [
            {
              who: "반장님",
              ko: "안전화 어디 있어?",
              id: "Sepatu safety-mu mana?",
            },
            {
              who: "Andi",
              ko: "죄송합니다. 기숙사에 놓고 왔어요.",
              id: "Maaf, Pak. Ketinggalan di asrama.",
            },
            {
              who: "반장님",
              ko: "빨리 가서 신고 와. 안전화 없으면 일하면 안 돼.",
              id: "Cepet ambil, pakai. Nggak pakai sepatu safety nggak boleh kerja.",
            },
            {
              who: "Andi",
              ko: "네, 다음부터 조심할게요.",
              id: "Iya, Pak, lain kali aku lebih hati-hati.",
            },
          ],
          {
            questions: [
              {
                ko: "안디는 안전화를 어디에 두고 왔어요?",
                id: "Sepatu safety Andi ketinggalan di mana?",
              },
              {
                ko: "'Dompetku ketinggalan di rumah'를 한국어로 어떻게 말해요?",
                id: "Gimana bilang 'Dompetku ketinggalan di rumah'?",
              },
            ],
            tip: {
              title: "꿀팁 · TIP",
              ko: "물건을 안 가져왔을 때는 '잊어버렸어요'보다 '놓고 왔어요', '두고 왔어요'가 더 자연스러워요.",
              id: "Buat barang ketinggalan, 놓고 왔어요 atau 두고 왔어요 lebih natural daripada 잊어버렸어요.",
            },
          },
        ),
        p(
          "Pola lain di obrolan ini: ",
          ref("-아서/어서 (lalu)", "ki-alasan-urutan", "aseo-lalu"),
          " di ",
          b("가서 신고 와"),
          ", ",
          ref("-(으)면 안 되다", "ki-bisa-harus", "myeon-an-doeda"),
          " (nggak boleh), dan ",
          ref("-(으)ㄹ게요", "ki-minta-ajak", "eulgeyo"),
          ".",
        ),
        h3("Coba bikin sendiri"),
        bullet(i('"Aku kelupaan bales chat kamu."')),
        bullet(i('"HP-ku ketinggalan di kafe."')),
        callout(
          "success",
          "1. ",
          b("답장하는 걸 깜빡했어."),
          " Minta maafnya sekalian: ",
          b("미안, 답장하는 걸 깜빡했어."),
          " 2. ",
          b("핸드폰을 카페에 두고 왔어."),
          " (atau ",
          b("놓고 왔어"),
          ")",
        ),
      ],
    },
    {
      key: "keceplosan",
      title: "Keceplosan",
      blocks: [
        p(
          i('"Duh, aku keceplosan cerita ke dia."'),
          " Rahasia temen, kejutan ulang tahun, atau tiba-tiba ngomong 반말 ke 사장님. Gimana bilangnya?",
        ),
        h3("Keceplosan cerita"),
        table([
          ["Korea", "Nuansa", "Pola"],
          [
            b("나도 모르게 말해 버렸어."),
            'Paling aman dan paling jelas: "tanpa sadar aku ngomong".',
            ref("나도 모르게 + -아/어 버리다", "ki-keadaan", "a-beorida"),
          ],
          [
            b("비밀을 말해 버렸어."),
            '"Rahasianya keceplosan." Fokus ke apa yang bocor.',
            ref("-아/어 버리다", "ki-keadaan", "a-beorida"),
          ],
          [
            b("실수로 말했어."),
            '"Nggak sengaja aku omongin." Lebih datar.',
            ref("실수로", "ki-kata-kecil", "kkamppak"),
          ],
        ]),
        h3("Keceplosan pakai 반말"),
        p(
          "Ini keceplosan paling khas buat pelajar bahasa Korea. Lagi asyik ngobrol sama 반장님, eh ngomong santai. Langsung minta maaf:",
        ),
        ex(
          "죄송해요, 저도 모르게 반말이 나왔어요.",
          "Maaf, keceplosan pakai 반말.",
        ),
        ex(
          "아, 죄송합니다. 반말이 나왔네요.",
          "Aduh, maaf. Kok keluar 반말-nya.",
        ),
        callout(
          "warning",
          b("Jebakan: 나도 모르게 ke atasan."),
          " Kalimatnya udah pakai -요, tapi 나 itu kata ganti santai. Ke 사장님, 반장님, atau 선배 ganti jadi ",
          b("저도 모르게"),
          ". Kalau masih 나도 모르게, kamu minta maaf karena 반말 sambil... pakai 반말 lagi.",
        ),
        p(
          "Kapan boleh dan nggak boleh 반말, lihat ",
          ref("kapan boleh 반말", "ki-banmal", "kapan"),
          ".",
        ),
        h3("Salah ngomong"),
        p("Kalau yang keceplosan itu kata yang salah, bukan rahasia:"),
        ex(
          "말이 헛나왔어요.",
          "Aku salah ngomong (keplesed).",
          "lidah keplesed",
        ),
        ex(
          "잘못 말했어요. 화요일 아니고 수요일이에요.",
          "Salah ngomong. Bukan Selasa, tapi Rabu.",
        ),
        callout(
          "warning",
          b("Jebakan: 그만 di kalimat keceplosan."),
          " Di novel atau drakor kadang muncul ",
          b("그만 말해 버렸어"),
          '. Di sini 그만 artinya "eh, tau-tau", bukan "stop". Bentuk ini agak jadul. Sementara ',
          b("그만 말해!"),
          ' artinya "udah, stop ngomong!". Buat kamu sendiri, lebih aman pakai ',
          b("나도 모르게"),
          ".",
        ),
        callout(
          "warning",
          b("Jebakan: 말했어 doang."),
          " ",
          b("민호한테 말했어"),
          ' = "aku udah bilang ke Minho" (sengaja). Kalau nggak ditambah ',
          b("나도 모르게"),
          " atau ",
          b("버렸어"),
          ", temen kamu bakal mikir kamu emang niat bocorin.",
        ),
        h3("Contoh obrolan"),
        p("Minho tiba-tiba tahu kalau Jisu naksir dia. Jisu curiga ke Rina."),
        ...chat(
          [
            {
              who: "Jisu",
              ko: "민호가 어떻게 알았지?",
              id: "Kok Minho bisa tahu ya?",
            },
            {
              who: "Rina",
              ko: "미안... 나도 모르게 말해 버렸어.",
              id: "Sorry... aku keceplosan.",
            },
            {
              who: "Jisu",
              ko: "헐, 비밀이라고 했잖아!",
              id: "Hah, kan aku udah bilang itu rahasia!",
            },
            {
              who: "Rina",
              ko: "진짜 미안해. 다시는 안 그럴게.",
              id: "Maaf banget. Nggak bakal gitu lagi.",
            },
          ],
          {
            questions: [
              {
                ko: "지수는 왜 화가 났어요?",
                id: "Kenapa Jisu kesel?",
              },
              {
                ko: "리나가 '말했어'라고만 했으면 어떻게 들렸을까요?",
                id: "Kalau Rina cuma bilang 말했어, kedengerannya gimana?",
              },
            ],
          },
        ),
        p(
          "Pola lain di obrolan ini: ",
          ref("-잖아", "ki-akhiran-rasa", "janayo"),
          " (",
          i("kan"),
          ", lihat ",
          ref("kan", "ik-partikel", "kan"),
          ") dan ",
          ref("-(으)ㄹ게", "ki-minta-ajak", "eulgeyo"),
          " buat janji.",
        ),
        h3("Keceplosan 반말 ke atasan"),
        culture({
          titleKo: "반말 실수, 이렇게 수습해요",
          titleId: "Keceplosan 반말 ke atasan? Gini cara beresinnya",
          theme: "rose",
          paragraphs: [
            {
              ko: "한국에서는 나이와 직급에 따라 말투가 달라져요. 사장님, 반장님, 선배한테 반말을 하면 무례하게 들릴 수 있어요.",
              id: "Di Korea, cara ngomong ngikutin umur dan jabatan. 반말 ke 사장님, 반장님, atau 선배 bisa kedengeran nggak sopan.",
            },
            {
              ko: "그래도 외국인이 실수로 반말을 하면 한국 사람들도 대부분 이해해요. 중요한 건 바로 사과하고 다시 존댓말로 말하는 거예요.",
              id: "Tapi tenang, orang Korea biasanya ngerti kalau orang asing keceplosan. Yang penting langsung minta maaf, terus balik ngomong sopan. Nggak usah overthinking.",
            },
            {
              ko: "이때는 '나도 모르게'가 아니라 '저도 모르게'라고 해요. '죄송합니다, 저도 모르게 반말이 나왔어요.' 이 한 문장이면 충분해요.",
              id: "Di sini pakai 저도 모르게, bukan 나도 모르게. Satu kalimat ini udah cukup: 죄송합니다, 저도 모르게 반말이 나왔어요.",
            },
            {
              ko: "윗사람이 '말 편하게 해'라고 하면 그때부터 반말을 해도 돼요. 그 전에는 먼저 반말을 하지 마세요.",
              id: "Kalau atasan atau senior bilang 말 편하게 해 (ngomong santai aja), baru deh boleh 반말. Sebelum itu, jangan mulai duluan.",
            },
          ],
          checklist: [
            {
              ko: "반말이 나오면 바로 사과할 수 있어요.",
              id: "Aku bisa langsung minta maaf kalau keceplosan 반말.",
            },
            {
              ko: "윗사람한테는 '저도 모르게'라고 말해요.",
              id: "Ke atasan, aku pakai 저도 모르게.",
            },
          ],
        }),
        p(
          "Istirahat siang di pabrik. Andi lagi seru ngobrolin bola sama 반장님.",
        ),
        ...chat(
          [
            {
              who: "반장님",
              ko: "어제 축구 봤어? 한국이 이겼잖아.",
              id: "Kemarin nonton bola? Korea menang, kan.",
            },
            {
              who: "Andi",
              ko: "봤어! 진짜 대박이었어!",
              id: "Nonton! Gila sih, keren banget!",
            },
            {
              who: "Andi",
              ko: "아, 죄송합니다. 저도 모르게 반말이 나왔어요.",
              id: "Eh, maaf, Pak. Saya keceplosan pakai 반말.",
            },
            {
              who: "반장님",
              ko: "하하, 괜찮아. 그만큼 신났구나.",
              id: "Haha, nggak apa-apa. Segitu serunya ya.",
            },
            {
              who: "Andi",
              ko: "네, 너무 재밌었어요.",
              id: "Iya, Pak, seru banget.",
            },
          ],
          {
            questions: [
              { ko: "안디는 왜 사과했어요?", id: "Kenapa Andi minta maaf?" },
              {
                ko: "반장님은 화가 났어요?",
                id: "반장님 marah nggak?",
              },
              {
                ko: "'Maaf, Pak, saya keceplosan pakai 반말'을 사장님한테 어떻게 말해요?",
                id: "Gimana bilang 'Maaf, Pak, saya keceplosan pakai 반말' ke 사장님?",
              },
            ],
            tip: {
              title: "꿀팁 · TIP",
              ko: "사과한 다음에는 바로 존댓말로 다시 말하면 돼요. 너무 길게 사과하지 않아도 괜찮아요.",
              id: "Habis minta maaf, langsung lanjut pakai -요 lagi. Nggak perlu minta maaf panjang-panjang.",
            },
          },
        ),
        h3("Coba bikin sendiri"),
        bullet(i('"Maaf, Pak, saya keceplosan pakai 반말."')),
        bullet(i('"Aku keceplosan bilang soal pestanya." (파티)')),
        callout(
          "success",
          "1. ",
          b("죄송합니다, 저도 모르게 반말이 나왔어요."),
          " 2. ",
          b("나도 모르게 파티 얘기를 해 버렸어."),
        ),
      ],
    },
    {
      key: "kebawa",
      title: "Kebawa",
      blocks: [
        p(
          i('"Eh, kunci loker kebawa pulang."'),
          " Atau ",
          i('"Aku kebawa suasana, jadi beli banyak."'),
          " Kebawa punya dua maksud: barang yang ikut kebawa, dan diri sendiri yang kebawa perasaan. Gimana bilangnya?",
        ),
        h3("Barang kebawa"),
        table([
          ["Korea", "Nuansa", "Pola"],
          [
            b("실수로 가져왔어."),
            'Paling jelas: "nggak sengaja kebawa ke sini".',
            ref("실수로", "ki-kata-kecil", "kkamppak"),
          ],
          [
            b("열쇠를 집에 가져와 버렸어."),
            'Ada rasa "duh, terlanjur kebawa".',
            ref("-아/어 버리다", "ki-keadaan", "a-beorida"),
          ],
          [
            b("나도 모르게 들고 왔어."),
            '"Tau-tau udah kepegang aku." Buat barang yang dipegang tangan.',
            ref("나도 모르게", "ki-kata-kecil", "kkamppak"),
          ],
        ]),
        ex(
          "네 볼펜을 실수로 가져왔어. 내일 줄게.",
          "Pulpenmu kebawa aku. Besok aku balikin.",
        ),
        ex(
          "죄송해요, 가게 열쇠를 집에 가져갔어요.",
          "Maaf, kunci toko kebawa pulang.",
          "ngomong di toko, jadi 가져갔어요",
        ),
        callout(
          "warning",
          b("Jebakan: 가져오다 atau 가져가다?"),
          ' Dua-duanya "bawa", tapi arahnya beda. ',
          b("가져오다"),
          " = bawa ke tempat kamu ngomong sekarang. ",
          b("가져가다"),
          ' = bawa pergi dari tempat ini. Lagi di rumah? "Kuncinya kebawa ke sini" = ',
          b("집에 가져와 버렸어"),
          '. Lagi di toko? "Kemarin kuncinya kebawa pulang" = ',
          b("집에 가져갔어요"),
          ". Kalau yang kebawa orang (adik, temen), pakai ",
          b("데려오다 / 데려가다"),
          ".",
        ),
        h3("Kebawa suasana atau perasaan"),
        table([
          ["Korea", "Nuansa", "Pola"],
          [
            b("분위기에 휩쓸려서 비싼 걸 샀어."),
            '"Kebawa suasana." 휩쓸리다 = keseret arus.',
            ref("-아서/어서", "ki-alasan-urutan", "aseo-karena"),
          ],
          [
            b("나도 모르게 따라 울었어."),
            '"Ikut kebawa nangis." 따라 = ikut-ikutan.',
            ref("나도 모르게", "ki-kata-kecil", "kkamppak"),
          ],
          [
            b("나도 모르게 화를 냈어."),
            '"Kebawa emosi, jadi marah."',
            ref("나도 모르게", "ki-kata-kecil", "kkamppak"),
          ],
        ]),
        ex(
          "드라마 보다가 나도 모르게 따라 울었어.",
          "Nonton drakor, aku ikut kebawa nangis.",
        ),
        ex(
          "세일 분위기에 휩쓸려서 이것저것 다 샀어요.",
          "Lagi diskon, aku kebawa suasana, jadi borong semua.",
        ),
        callout(
          "warning",
          b("Jebakan: jangan terjemahin kata per kata."),
          ' "Kebawa" itu bukan ~~가져가졌어~~ atau bentuk pasif aneh lainnya. Bahasa Korea nggak bilang "barangnya terbawa". Yang ada: ',
          b("aku"),
          " nggak sengaja bawa. Jadi subjeknya selalu orang: ",
          b("(내가) 실수로 가져왔어"),
          ".",
        ),
        h3("Contoh obrolan"),
        p("Rina dateng shift pagi di 편의점, langsung ke 점장님."),
        ...chat(
          [
            {
              who: "Rina",
              ko: "점장님, 죄송해요. 어제 창고 열쇠를 실수로 집에 가져갔어요.",
              id: "Bu, maaf. Kemarin kunci gudang nggak sengaja kebawa pulang.",
            },
            {
              who: "점장님",
              ko: "아, 그래서 아침에 못 찾았구나.",
              id: "Oh, pantesan tadi pagi nggak ketemu.",
            },
            {
              who: "Rina",
              ko: "여기 있어요. 다음부터 꼭 확인할게요.",
              id: "Ini, Bu. Lain kali aku pasti cek dulu.",
            },
            { who: "점장님", ko: "그래, 괜찮아.", id: "Iya, nggak apa-apa." },
          ],
          {
            questions: [
              {
                ko: "리나는 뭘 집에 가져갔어요?",
                id: "Rina nggak sengaja bawa pulang apa?",
              },
              {
                ko: "리나는 왜 '가져왔어요'가 아니라 '가져갔어요'라고 했어요?",
                id: "Kenapa Rina bilang 가져갔어요, bukan 가져왔어요?",
              },
              {
                ko: "'Charger kamu kebawa aku'를 친구한테 어떻게 말해요?",
                id: "Gimana bilang 'Charger kamu kebawa aku' ke temen?",
              },
            ],
          },
        ),
        p(
          "Pola lain di obrolan ini: ",
          ref("-구나", "ki-akhiran-rasa", "gunyo"),
          " (",
          i("oh, gitu ya"),
          ", di sini rasanya mirip ",
          ref("pantesan", "ik-dugaan", "pantesan"),
          ") dan ",
          ref("-(으)ㄹ게요", "ki-minta-ajak", "eulgeyo"),
          ".",
        ),
        h3("Coba bikin sendiri"),
        bullet(i('"Charger kamu kebawa aku." (충전기)')),
        bullet(i('"Aku kebawa emosi, maaf ya."')),
        callout(
          "success",
          "1. ",
          b("네 충전기를 실수로 가져왔어."),
          " 2. ",
          b("나도 모르게 화를 냈어. 미안해."),
        ),
      ],
    },
  ],
  outro: [
    h3("Rangkuman nggak sengaja"),
    table([
      ["Indonesia", "Bilangnya", "Kunci"],
      [
        "Ketiduran",
        b("잠들어 버렸어 / 깜빡 잠들었어"),
        ref("-아/어 버리다", "ki-keadaan", "a-beorida"),
      ],
      [
        "Kesiangan",
        b("늦잠 잤어"),
        ref("-는 바람에", "ki-waktu-sebab", "neun-barame"),
      ],
      [
        "Kelupaan",
        b("깜빡했어 / -는 걸 깜빡했어"),
        ref("깜빡하다", "ki-kata-kecil", "kkamppak"),
      ],
      ["Ketinggalan", b("놓고 왔어 / 두고 왔어"), "kata kerja biasa"],
      [
        "Keceplosan",
        b("나도 모르게 말해 버렸어"),
        ref("나도 모르게", "ki-kata-kecil", "kkamppak"),
      ],
      [
        "Kebawa (barang)",
        b("실수로 가져왔어 / 가져갔어"),
        ref("실수로", "ki-kata-kecil", "kkamppak"),
      ],
      [
        "Kebawa suasana",
        b("분위기에 휩쓸려서 / 나도 모르게"),
        ref("나도 모르게", "ki-kata-kecil", "kkamppak"),
      ],
    ]),
    callout(
      "success",
      'Sekarang kamu bisa bilang "aku nggak sengaja" tanpa imbuhan ke-an. Inget rumusnya: ',
      b("나도 모르게 / 실수로 / 깜빡 + -아/어 버렸어"),
      ". Next, kita ngomongin hal yang udah lewat dan nggak bisa diulang: ",
      ref("harusnya, kalau aja, terserah", "ik-andai"),
      ".",
    ),
    p(
      "Sebelum lanjut, tes dulu yuk. Ada 10 soal pilihan ngomong: ketiduran, kelupaan, keceplosan, sampai kebawa. Lulus kalau dapet 70.",
    ),
    quizRef(),
  ],
  quiz: {
    title: "Kuis: ketiduran, kelupaan, keceplosan",
    description:
      'Pilih cara paling natural buat bilang "aku nggak sengaja" ke bestie, 반장님, atau 사장님.',
    passingScore: 70,
    questions: [
      {
        key: "ketiduran-ke-bestie",
        prompt:
          'Semalam kamu nggak bales chat bestie karena nggak sengaja ketiduran. Pilih yang paling natural: "Sorry, aku ketiduran."',
        options: [
          { text: "미안, 잠들어 버렸어.", correct: true },
          { text: "미안, 잤어." },
          { text: "미안, 졸려." },
          { text: "미안, 잠들게 했어." },
        ],
        explanation:
          '잠들어 버렸어 = ketiduran, ada rasa terlanjur. 잤어 doang kedengeran kayak kamu emang niat tidur, dan 졸려 itu cuma "ngantuk".',
      },
      {
        key: "kesiangan-ke-banjangnim",
        prompt:
          'Kamu telat masuk kerja karena bangun kesiangan. Kamu mau bilang ke 반장님: "Maaf, Pak, saya telat karena kesiangan."',
        options: [
          { text: "죄송합니다. 늦잠을 자서 늦었어요.", correct: true },
          { text: "죄송합니다. 졸아서 늦었어요." },
          { text: "미안, 늦잠 자서 늦었어." },
          { text: "죄송합니다. 잠들어 버려서 늦었어요." },
        ],
        explanation:
          "Bangun kesiangan itu 늦잠을 자다. 졸다 = tidur-tidur ayam, 잠들어 버리다 = ketiduran pas nggak niat tidur. Versi 미안 ... 늦었어 itu 반말, no debat jangan ke 반장님.",
      },
      {
        key: "ngantuk-bukan-ketiduran",
        prompt: 'Kamu mau bilang ke temen sekelas: "Aku ngantuk banget."',
        options: [
          { text: "너무 졸려.", correct: true },
          { text: "너무 졸았어." },
          { text: "너무 잠들었어." },
        ],
        explanation:
          "졸리다 = ngantuk (perasaan). 졸았어 artinya kamu udah ngangguk-ngangguk ketiduran beneran. Beda tipis, tapi maknanya jauh.",
      },
      {
        key: "kelupaan-bales-chat",
        prompt:
          'Kamu mau bilang ke bestie: "Sorry, aku kelupaan bales chat kamu."',
        options: [
          { text: "미안, 답장하는 걸 깜빡했어.", correct: true },
          { text: "미안, 답장을 몰랐어." },
          { text: "미안, 답장이 기억이 안 나." },
          { text: "미안, 답장하는 걸 놓고 왔어." },
        ],
        explanation:
          "Lupa ngelakuin sesuatu = kata kerja + -는 걸 깜빡했어. 몰랐어 itu nggak tahu, 기억이 안 나 itu nggak inget isinya, dan 놓고 왔어 cuma buat barang.",
      },
      {
        key: "dompet-ketinggalan",
        prompt: 'Pilih yang paling natural: "Dompetku ketinggalan di rumah."',
        options: [
          { text: "지갑을 집에 놓고 왔어.", correct: true },
          { text: "지갑을 집에 잊어버렸어." },
          { text: "지갑이 집에 떨어졌어." },
          { text: "지갑을 집에 가져갔어." },
        ],
        explanation:
          "Barang ketinggalan = 놓고 왔어 / 두고 왔어 (aku taruh, terus pergi). 잊어버렸어 kedengeran aneh buat barang, dan 가져갔어 malah artinya kebawa pulang.",
      },
      {
        key: "lupa-atau-nggak-tahu",
        prompt:
          "반장님 nanya alamat kantor imigrasi. Kamu belum pernah tahu alamatnya sama sekali. Jawab yang paling pas:",
        options: [
          { text: "잘 모르겠어요.", correct: true },
          { text: "기억이 안 나요." },
          { text: "깜빡했어요." },
        ],
        explanation:
          'Belum pernah tahu = 모르다. 기억이 안 나요 dan 깜빡했어요 artinya kamu pernah tahu tapi lupa. Jangan bilang "lupa" buat hal yang emang belum kamu tahu.',
      },
      {
        key: "keceplosan-banmal-sajangnim",
        prompt:
          "Lagi seru ngobrol, kamu keceplosan pakai 반말 ke 사장님. Minta maaf yang paling pas:",
        options: [
          { text: "죄송합니다. 저도 모르게 반말이 나왔어요.", correct: true },
          { text: "죄송합니다. 나도 모르게 반말이 나왔어요." },
          { text: "죄송합니다, 반말을 해 버렸어." },
          { text: "미안해요, 반말 했어요." },
        ],
        explanation:
          "Ke atasan pakai 저도 모르게, bukan 나도 모르게. Versi 해 버렸어 ditutup pakai 반말 lagi, auto makin salah. 반말 했어요 doang nggak ada rasa nggak sengaja.",
      },
      {
        key: "keceplosan-rahasia",
        prompt:
          "Rahasia bestie-mu nggak sengaja kamu ceritain ke Minho. Mana yang bikin jelas kamu nggak niat?",
        options: [
          { text: "나도 모르게 민호한테 말해 버렸어.", correct: true },
          { text: "민호한테 말했어." },
          { text: "민호한테 그만 말해." },
          { text: "민호한테 말하려고 했어." },
        ],
        explanation:
          "나도 모르게 + -아/어 버렸어 = keceplosan. 말했어 doang kesannya sengaja bocorin (red flag), 그만 말해 = stop ngomong, dan -려고 했어 = tadinya mau bilang.",
      },
      {
        key: "gelas-pecah-ngaku",
        prompt:
          'Kamu nyenggol gelas di 편의점 sampai jatuh. Kamu mau bilang ke 점장님: "Maaf, gelasnya nggak sengaja aku jatuhin."',
        options: [
          { text: "죄송해요, 제가 실수로 컵을 떨어뜨렸어요.", correct: true },
          { text: "죄송해요, 컵이 떨어졌어요." },
          { text: "죄송해요, 제가 실수로 컵을 떨어졌어요." },
          { text: "죄송해요, 나도 모르게 컵을 떨어뜨렸어." },
        ],
        explanation:
          "떨어뜨리다 = menjatuhkan, dan 제가 실수로 bikin kamu ngaku duluan. 컵이 떨어졌어요 kesannya gelasnya jatuh sendiri. 떨어지다 nggak bisa punya objek 을/를, dan versi terakhir pakai 반말.",
      },
      {
        key: "kebawa-pulang-arah",
        prompt:
          'Kamu lagi di toko tempat kerja dan mau bilang: "Kemarin kunci toko kebawa pulang."',
        options: [
          { text: "어제 가게 열쇠를 집에 가져갔어요.", correct: true },
          { text: "어제 가게 열쇠를 집에 가져왔어요." },
          { text: "어제 가게 열쇠를 집에 데려갔어요." },
          { text: "어제 가게 열쇠가 집에 가져가졌어요." },
        ],
        explanation:
          "Kamu ngomong di toko, kuncinya pergi dari sini, jadi 가져가다. 가져오다 dipakai kalau kamu lagi di rumah. 데려가다 cuma buat orang, dan bentuk pasif 가져가졌어요 nggak dipakai.",
      },
    ],
  },
});
