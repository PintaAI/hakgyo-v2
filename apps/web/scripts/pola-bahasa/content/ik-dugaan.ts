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
  key: "ik-dugaan",
  title: "Kayaknya, ternyata, pantesan: nebak dan bereaksi",
  description:
    "Kata buat nebak, kaget, lega, dan kecewa: makin, pantesan, ternyata, jangan-jangan, untung, sayangnya, kayaknya. Di bahasa Korea, kebanyakan jadi akhiran kalimat.",
  intro: [
    opener({
      eyebrow: "BERANI NGOMONG · BAB 4",
      chapterNumber: "04",
      titleKo: "추측과 반응",
      subtitle:
        "Kayaknya, pantesan, ternyata, untung: biar reaksi kamu nggak kaku kayak robot buku pelajaran.",
      question: "오늘 왜 이렇게 사람이 많지?",
      answer: "세일한대. 어쩐지 많더라!",
      focus: [
        {
          label: "말하기 · Bilangnya",
          title: "-네, -더라, 것 같아",
          description:
            "Ternyata, pantesan, dan kayaknya jarang jadi kata sendiri. Rasanya nempel di akhir kalimat.",
        },
        {
          label: "뉘앙스 · Nuansa",
          title: "Seberapa yakin kamu?",
          description:
            "것 같아 buat dugaan umum, -나 봐 kalau ada tandanya, -(으)ㄹ걸 kalau masih ragu.",
        },
        {
          label: "함정 · Jebakan",
          title: "Untung ≠ laba, sayang ≠ cinta",
          description:
            "Satu kata Indonesia bisa punya beberapa arti. Salah pilih, maksud kamu melenceng jauh.",
        },
      ],
      objectives: [
        {
          ko: "추측하는 말을 확신 정도에 맞게 말할 수 있어요.",
          id: "Bisa bilang kayaknya sesuai seberapa yakin kamu.",
        },
        {
          ko: "'어쩐지', '알고 보니', '다행이다'로 자연스럽게 반응할 수 있어요.",
          id: "Bisa bereaksi natural: pantesan, ternyata, untung.",
        },
      ],
    }),
    p(
      'Bedanya sama bahasa Indonesia: di bahasa Korea, rasa "kayaknya" atau "ternyata" sering ',
      b("nggak jadi kata sendiri"),
      ", tapi nempel di akhir kalimat. ",
      i("Ternyata enak"),
      " cukup ",
      b("맛있네!"),
      " Jadi selain hafal kata, kamu juga perlu hafal akhirannya.",
    ),
    callout(
      "tip",
      "Kayak biasa, pola Korea yang tebal bisa diklik buat penjelasan lengkap. Contoh di sini campur sopan (-요) dan 반말. Cara ubahnya ada di ",
      ref("rumus 반말", "ki-banmal", "rumus"),
      ".",
    ),
  ],
  sections: [
    {
      key: "makin",
      title: "Makin",
      blocks: [
        p(
          i('"Makin dipelajari, makin seru."'),
          " Atau versi ngeluhnya: ",
          i('"Kerjaan makin lama makin berat."'),
          " Gimana bilangnya?",
        ),
        p(
          i("Makin"),
          " punya dua maksud: ",
          b("makin A makin B"),
          " (dua hal naik bareng), dan ",
          b("makin lama makin"),
          " (sesuatu berubah pelan-pelan seiring waktu). Bentuk Koreanya beda.",
        ),
        h3("Makin A, makin B"),
        table([
          ["Korea", "Nuansa", "Pola"],
          [
            b("공부하면 할수록 재미있어요."),
            'Bentuk lengkap: "makin dipelajari makin seru". Kata kerjanya diulang dua kali.',
            ref("-(으)면 -(으)ㄹ수록", "ki-waktu-sebab", "eulsurok"),
          ],
          [
            b("공부할수록 재미있어요."),
            "Versi pendek, artinya sama. Sering banget dipakai ngobrol.",
            ref("-(으)ㄹ수록", "ki-waktu-sebab", "eulsurok"),
          ],
          [
            b("빠르면 빠를수록 좋아요."),
            '"Makin cepet makin bagus." Ungkapan wajib hafal, sering keluar dari mulut 사장님.',
            ref("-(으)면 -(으)ㄹ수록", "ki-waktu-sebab", "eulsurok"),
          ],
        ]),
        p("Cara bikinnya: kata kerja atau sifat yang sama ditulis dua kali."),
        bullet(b("보다 → 보면 볼수록"), " (makin dilihat makin ...)"),
        bullet(b("먹다 → 먹으면 먹을수록"), " (makin dimakan makin ...)"),
        bullet(b("듣다 → 들으면 들을수록"), " (ㄷ berubah jadi ㄹ)"),
        bullet(b("많다 → 많으면 많을수록"), " (makin banyak makin ...)"),
        h3("Makin lama makin ..."),
        table([
          ["Korea", "Nuansa", "Pola"],
          [
            b("날씨가 점점 추워져요."),
            "점점 = pelan-pelan, sedikit demi sedikit. Netral.",
            ref("-아/어지다", "ki-keadaan", "ajida"),
          ],
          [
            b("일이 갈수록 힘들어져."),
            '갈수록 = "makin ke sini". Sering buat ngeluh.',
            ref("-아/어지다", "ki-keadaan", "ajida"),
          ],
          [
            b("한국어 실력이 많이 늘었네!"),
            '"Bahasa Koreamu makin jago ya!" Kata kerja 늘다 udah berarti "nambah, makin bagus".',
            ref("-네", "ki-akhiran-rasa", "neyo"),
          ],
        ]),
        callout(
          "warning",
          b("Jebakan: lupa -아/어지다."),
          " ",
          b("추워요"),
          ' artinya "dingin" (keadaan). Buat "makin dingin", kata sifatnya harus berubah jadi ',
          b("추워져요"),
          ". Kalimat ~~점점 추워요~~ kedengeran janggal. Inget: 점점 / 갈수록 + kata sifat hampir selalu pakai ",
          ref("-아/어지다", "ki-keadaan", "ajida"),
          ".",
        ),
        callout(
          "warning",
          b('Jebakan: nerjemahin "makin" jadi 더 더.'),
          " ~~더 공부해서 더 재미있어~~ itu bukan cara orang Korea ngomong. Kalau dua hal naik bareng, pakai ",
          b("-(으)ㄹ수록"),
          ". Kata ",
          b("더"),
          ' cukup buat "lebih" biasa: ',
          b("더 주세요"),
          " (minta lagi dong).",
        ),
        h3("Contoh"),
        ex("생각하면 할수록 화가 나.", "Makin dipikirin makin kesel."),
        ex(
          "그 사람은 볼수록 매력 있어요.",
          "Orang itu makin dilihat makin menarik.",
        ),
        ex("물가가 갈수록 올라요.", "Harga-harga makin lama makin naik."),
        ex(
          "기계 일에 점점 익숙해졌어요.",
          "Lama-lama aku makin terbiasa kerja pakai mesin.",
          "pekerja EPS",
        ),
        h3("Contoh obrolan"),
        p("Rina lagi bahas drakor sama Jisu."),
        ...chat(
          [
            {
              who: "Jisu",
              ko: "그 드라마 어때?",
              id: "Drakor itu gimana?",
            },
            {
              who: "Rina",
              ko: "처음엔 좀 지루했는데 보면 볼수록 재미있어.",
              id: "Awalnya agak ngebosenin, tapi makin ditonton makin seru.",
            },
            {
              who: "Jisu",
              ko: "그치? 남자 주인공이 갈수록 멋있어지잖아.",
              id: "Iya kan? Pemeran cowoknya makin ke sini makin keren.",
            },
            {
              who: "Rina",
              ko: "맞아! 그리고 드라마 덕분에 내 한국어도 늘고 있어.",
              id: "Bener! Terus gara-gara drakor, bahasa Koreaku juga makin jago.",
            },
            {
              who: "Jisu",
              ko: "진짜 많이 늘었어!",
              id: "Beneran makin jago kok!",
            },
          ],
          {
            questions: [
              {
                ko: "리나는 그 드라마가 처음에 어땠어요?",
                id: "Awalnya menurut Rina drakornya gimana?",
              },
              {
                ko: "'Makin ditonton makin seru'를 친구한테 어떻게 말해요?",
                id: 'Gimana bilang "makin ditonton makin seru" ke teman?',
              },
            ],
            tip: {
              title: "꿀팁 · TIP",
              ko: "'보면 볼수록'은 짧게 '볼수록'이라고 해도 돼요. 뜻은 같아요.",
              id: "보면 볼수록 boleh dipendekin jadi 볼수록. Artinya sama, malah lebih sering dipakai ngobrol.",
            },
          },
        ),
        p(
          "Pola lain di obrolan ini: ",
          ref("-는데", "ki-alasan-urutan", "neunde"),
          ", ",
          ref("그치? (-지?)", "ki-akhiran-rasa", "jiyo"),
          ", ",
          ref("-잖아", "ki-akhiran-rasa", "janayo"),
          ", dan ",
          ref("-고 있다", "ki-keadaan", "go-itda"),
          ".",
        ),
        h3("Coba bikin sendiri"),
        bullet(i('"Makin didengerin makin enak lagunya."')),
        bullet(i('"Kerjaannya makin lama makin gampang." (sopan)')),
        callout(
          "success",
          "1. ",
          b("이 노래는 들으면 들을수록 좋아."),
          " (atau ",
          b("들을수록 좋아"),
          ") 2. ",
          b("일이 점점 쉬워져요."),
        ),
      ],
    },
    {
      key: "pantesan",
      title: "Pantesan",
      blocks: [
        p(
          i('"Oh, lagi diskon. Pantesan rame."'),
          " Kamu tadi udah ngerasa ada yang aneh (kok rame?), terus baru tahu alasannya. Gimana bilangnya?",
        ),
        h3("Pilihan bahasa Korea"),
        table([
          ["Korea", "Nuansa", "Pola"],
          [
            b("어쩐지 사람이 많더라."),
            "Paling klasik. 어쩐지 + hal aneh yang tadi kamu lihat sendiri, ditutup -더라.",
            ref("어쩐지", "ki-kata-kecil", "eojjeonji"),
          ],
          [
            b("어쩐지 조용하다 했어."),
            '"Pantesan, dari tadi aku udah ngerasa sepi." Santai banget, sering di drakor.',
            ref("어쩐지", "ki-kata-kecil", "eojjeonji"),
          ],
          [
            b("아, 그래서 그렇구나."),
            '"Oh, pantesan gitu." Reaksi pendek waktu orang lain ngasih penjelasan.',
            ref("-구나", "ki-akhiran-rasa", "gunyo"),
          ],
          [
            b("어쩐지 사람이 많더라고요."),
            "Versi sopan dari baris pertama.",
            ref("-더라고요", "ki-akhiran-rasa", "deora"),
          ],
        ]),
        h3("Urutannya: penjelasan dulu, baru pantesan"),
        p(
          "Biasanya ada dua kalimat. Kalimat pertama: kamu baru tahu faktanya, ditutup ",
          ref("-구나", "ki-akhiran-rasa", "gunyo"),
          " atau ",
          ref("-네", "ki-akhiran-rasa", "neyo"),
          ". Kalimat kedua: ",
          b("어쩐지"),
          " + hal aneh yang tadi kamu rasain, ditutup ",
          ref("-더라", "ki-akhiran-rasa", "deora"),
          ".",
        ),
        ex(
          "아, 세일하는구나. 어쩐지 사람이 많더라.",
          "Oh, lagi diskon. Pantesan rame.",
        ),
        ex(
          "오늘 월급날이구나. 어쩐지 다들 기분이 좋더라.",
          "Oh, hari ini gajian. Pantesan semua pada happy.",
        ),
        ex("아, 비 왔어? 어쩐지 시원하더라.", "Oh, abis hujan? Pantesan adem."),
        ex(
          "그 사람 가수였어요? 어쩐지 노래를 잘하더라고요.",
          "Dia penyanyi? Pantesan nyanyinya bagus.",
        ),
        ex(
          "너 어제 밤새웠구나. 어쩐지 피곤해 보이더라.",
          "Kamu begadang semalem ya. Pantesan kelihatan capek.",
        ),
        callout(
          "warning",
          b('Jebakan: 어쩐지 doang belum tentu "pantesan".'),
          " ",
          b("어쩐지 슬퍼"),
          ' artinya "entah kenapa aku sedih". Biar jelas artinya pantesan, kasih penjelasannya dulu, terus tutup dengan ',
          b("-더라"),
          " atau ",
          b("-다 했어"),
          ". Kalau cuma ~~어쩐지 사람이 많아~~, kedengeran nggak selesai.",
        ),
        callout(
          "tip",
          i("Pantesan"),
          " dan ",
          i("ternyata"),
          " sering jalan bareng: ternyata faktanya gini, pantesan kejadiannya gitu. Lihat juga ",
          ref("ternyata", "ik-dugaan", "ternyata"),
          ".",
        ),
        h3("Contoh obrolan"),
        p("Rina part-time di 편의점. Sore ini tokonya rame banget."),
        ...chat(
          [
            {
              who: "점장님",
              ko: "오늘 손님 진짜 많지?",
              id: "Hari ini pembelinya banyak banget ya?",
            },
            {
              who: "Rina",
              ko: "네, 너무 많아요. 왜 이렇게 많아요?",
              id: "Iya, banyak banget. Kok bisa serame ini?",
            },
            {
              who: "점장님",
              ko: "오늘부터 컵라면 1+1 행사야.",
              id: "Mulai hari ini ada promo beli satu gratis satu buat cup ramyeon.",
            },
            {
              who: "Rina",
              ko: "아, 그렇군요. 어쩐지 컵라면이 금방 없어지더라고요.",
              id: "Oh, gitu. Pantesan cup ramyeon cepet banget abisnya.",
            },
            {
              who: "점장님",
              ko: "창고에서 좀 더 가져와 줘.",
              id: "Tolong ambilin lagi dari gudang ya.",
            },
            {
              who: "Rina",
              ko: "네, 지금 가져올게요.",
              id: "Siap, aku ambil sekarang.",
            },
          ],
          {
            questions: [
              {
                ko: "오늘 왜 손님이 많아요?",
                id: "Kenapa hari ini pembelinya banyak?",
              },
              {
                ko: "리나는 점장님한테 '그렇구나' 대신 뭐라고 했어요?",
                id: "Ke 점장님, Rina pakai apa sebagai ganti 그렇구나?",
              },
            ],
            tip: {
              title: "꿀팁 · TIP",
              ko: "점장님처럼 윗사람한테는 '그렇구나' 말고 '그렇군요'나 '아, 그래요?'라고 해요.",
              id: "Ke atasan, ganti 그렇구나 jadi 그렇군요 atau 아, 그래요? biar tetap sopan.",
            },
          },
        ),
        p(
          "Pola lain di obrolan ini: ",
          ref("-지?", "ki-akhiran-rasa", "jiyo"),
          ", ",
          ref("-아/어 줘", "ki-minta-ajak", "a-juseyo"),
          ", dan ",
          ref("-(으)ㄹ게요", "ki-minta-ajak", "eulgeyo"),
          ". Perhatiin juga: 점장님 ngomong 반말, Rina tetap pakai -요.",
        ),
        h3("Coba bikin sendiri"),
        bullet(i('"Oh, kamu orang Bandung? Pantesan bahasa Sundanya lancar."')),
        bullet(i('"Oh, hari ini hari Minggu. Pantesan jalanan sepi."')),
        callout(
          "success",
          "1. ",
          b("반둥 사람이구나. 어쩐지 순다어를 잘하더라."),
          " 2. ",
          b("오늘 일요일이구나. 어쩐지 길이 조용하더라."),
          " Atau ",
          b("어쩐지 길이 조용하다 했어."),
        ),
      ],
    },
    {
      key: "ternyata",
      title: "Ternyata",
      blocks: [
        p(
          i(
            '"Ternyata enak!" "Ternyata dia anaknya bos." "Kemarin ke sana, ternyata tutup."',
          ),
          " Tiga kalimat, tiga rasa ternyata yang beda. Gimana bilangnya?",
        ),
        h3("Pilihan bahasa Korea"),
        table([
          ["Maksud", "Korea", "Pola"],
          [
            "Baru sadar sekarang, lagi ngalamin langsung",
            b("맛있네! / 맛있네요!"),
            ref("-네", "ki-akhiran-rasa", "neyo"),
          ],
          [
            "Baru tahu info dari orang lain",
            b("반둥 사람이구나."),
            ref("-구나", "ki-akhiran-rasa", "gunyo"),
          ],
          [
            "Plot twist: setelah tahu faktanya",
            b("알고 보니 사장님 아들이었어."),
            ref("알고 보니", "ki-kata-kecil", "algo-boni"),
          ],
          [
            "Cerita hal yang kamu lihat sendiri",
            b("어제 가 봤는데 문 닫았더라."),
            ref("-더라", "ki-akhiran-rasa", "deora"),
          ],
          [
            "Beda dari yang kamu kira",
            b("생각보다 쉬웠어."),
            '생각보다 = "dari yang aku kira"',
          ],
        ]),
        h3("Contoh"),
        ex(
          "한국어 생각보다 재미있네요!",
          "Ternyata bahasa Korea seru juga ya!",
        ),
        ex(
          "벌써 다 먹었네.",
          "Ternyata udah abis semua.",
          "-았네 = baru sadar sesuatu udah terjadi",
        ),
        ex(
          "알고 보니 그 사람이 범인이었어.",
          "Ternyata dia pelakunya.",
          "plot twist drakor",
        ),
        ex(
          "그 식당 가 봤는데 진짜 맛있더라.",
          "Aku udah nyobain restoran itu, ternyata enak banget.",
        ),
        ex(
          "시험이 생각보다 어려웠어요.",
          "Ujiannya ternyata lebih susah dari yang aku kira.",
        ),
        callout(
          "warning",
          b('Jebakan: "ternyata" yang kamu denger dari orang lain.'),
          " -더라 cuma buat hal yang kamu ",
          b("lihat atau alami sendiri"),
          ". Kalau infonya dari orang lain (",
          i('"Ternyata besok libur, kata bos"'),
          "), pakai ",
          ref("-대", "ki-akhiran-rasa", "daeyo"),
          ": ",
          b("내일 쉰대!"),
          " Dan -더라 juga nggak dipakai buat tindakan kamu sendiri: ~~내가 먹더라~~ itu aneh.",
        ),
        callout(
          "warning",
          b('Jebakan: nyari satu kata buat "ternyata".'),
          " Nggak ada satu kata Korea yang pas buat semua ",
          i("ternyata"),
          ". Yang paling sering malah cuma akhiran: ",
          b("-네"),
          " atau ",
          b("-더라"),
          ". ",
          b("알고 보니"),
          " baru dipakai kalau beneran ada fakta baru yang bikin kaget.",
        ),
        p(
          "Ternyata sering disusul pantesan. Lihat ",
          ref("pantesan", "ik-dugaan", "pantesan"),
          ".",
        ),
        h3("Contoh obrolan"),
        p("Andi ngobrol sama Minho, rekan kerja seumuran di pabrik."),
        ...chat(
          [
            {
              who: "Minho",
              ko: "새로 온 반장님 봤어?",
              id: "Udah lihat ketua tim yang baru?",
            },
            {
              who: "Andi",
              ko: "응, 봤어. 처음엔 좀 무서워 보였는데 친절하시더라.",
              id: "Udah. Awalnya agak serem, tapi ternyata baik.",
            },
            {
              who: "Minho",
              ko: "근데 알고 보니 사장님 조카래.",
              id: "Btw, ternyata dia keponakannya bos, katanya.",
            },
            {
              who: "Andi",
              ko: "진짜? 어쩐지 사장님이랑 좀 닮으셨더라.",
              id: "Serius? Pantesan agak mirip sama bos.",
            },
            {
              who: "Minho",
              ko: "그치? 나도 듣고 깜짝 놀랐어.",
              id: "Iya kan? Aku juga kaget pas denger.",
            },
          ],
          {
            questions: [
              {
                ko: "새로 온 반장님은 누구 조카래요?",
                id: "Ketua tim yang baru itu keponakan siapa?",
              },
              {
                ko: "'Ternyata (dia) baik'을 친구한테 어떻게 말해요?",
                id: 'Gimana bilang "ternyata dia baik" ke teman?',
              },
            ],
          },
        ),
        p(
          "Pola lain di obrolan ini: ",
          ref("-는데", "ki-alasan-urutan", "neunde"),
          ", ",
          ref("-래 (katanya)", "ki-akhiran-rasa", "daeyo"),
          ", ",
          ref("어쩐지", "ki-kata-kecil", "eojjeonji"),
          ", dan ",
          ref("그치? (-지?)", "ki-akhiran-rasa", "jiyo"),
          ".",
        ),
        h3("Coba bikin sendiri"),
        bullet(i('"Ternyata kimchi nggak terlalu pedes." (lagi nyobain)')),
        bullet(i('"Kemarin aku ke Myeongdong, ternyata rame banget."')),
        callout(
          "success",
          "1. ",
          b("김치 별로 안 맵네!"),
          " 2. ",
          b("어제 명동에 가 봤는데 사람이 진짜 많더라."),
        ),
      ],
    },
    {
      key: "jangan-jangan",
      title: "Jangan-jangan",
      blocks: [
        p(
          i('"Jangan-jangan dia lupa."'),
          " Kamu lagi nebak, tapi nebaknya sambil cemas. Gimana bilangnya?",
        ),
        h3("Pilihan bahasa Korea"),
        table([
          ["Korea", "Nuansa", "Pola"],
          [
            b("혹시 걔 잊어버린 거 아니야?"),
            'Paling umum. Harfiahnya "apa mungkin dia lupa, bukan?"',
            ref("혹시", "ki-kata-kecil", "hoksi"),
          ],
          [
            b("혹시 잊어버린 거 아니에요?"),
            "Versi sopan.",
            ref("혹시", "ki-kata-kecil", "hoksi"),
          ],
          [
            b("설마 우리 잘리는 건 아니겠지?"),
            'Takut banget hal buruk: "masa sih kita dipecat?" 설마 = "masa iya".',
            ref("설마", "ki-kata-kecil", "hoksi"),
          ],
          [
            b("내가 틀린 거 아닐까?"),
            'Lebih lembut, kayak ngomong ke diri sendiri: "jangan-jangan aku yang salah ya?"',
            ref("-(으)ㄹ까", "ki-minta-ajak", "eulkkayo"),
          ],
        ]),
        h3("Rumusnya"),
        p(
          b("혹시 / 설마"),
          " di depan, lalu kalimatnya ditutup ",
          b("-(으)ㄴ/는 거 아니야?"),
          ' ("bukan ... kan?"):',
        ),
        bullet("Udah kejadian: ", b("잊어버린 거 아니야? / 간 거 아니야?")),
        bullet(
          "Lagi terjadi (kata kerja): ",
          b("오는 거 아니야? / 자는 거 아니야?"),
        ),
        bullet("Kata sifat: ", b("아픈 거 아니야? / 바쁜 거 아니야?")),
        h3("Contoh"),
        ex(
          "지갑이 없어. 혹시 버스에 두고 내린 거 아닐까?",
          "Dompetku nggak ada. Jangan-jangan ketinggalan di bus?",
        ),
        ex(
          "이거 혹시 돼지고기 들어 있는 거 아니에요?",
          "Jangan-jangan ini ada babinya?",
          "penting buat yang makan halal",
        ),
        ex(
          "혹시 저한테 화나신 거 아니에요?",
          "Jangan-jangan Bapak marah sama saya?",
          "ke atasan",
        ),
        ex(
          "설마 벌써 끝난 건 아니겠지?",
          "Jangan-jangan udah selesai? Masa sih.",
        ),
        ex("설마!", "Masa sih! / Nggak mungkin!"),
        callout(
          "warning",
          b('Jebakan: "jangan" bukan larangan.'),
          " Orang Indonesia kadang otomatis mikir ke ",
          ref("-지 마", "ki-minta-ajak", "ji-maseyo"),
          ". Padahal ",
          i("jangan-jangan"),
          " sama sekali bukan larangan, tapi tebakan. Jadi pakainya ",
          b("혹시 / 설마"),
          ", bukan ~~하지 마~~.",
        ),
        callout(
          "warning",
          b("Jebakan: 혹시 nggak selalu cemas."),
          " ",
          b("혹시"),
          " juga dipakai buat nanya sopan, kayak ",
          i('"permisi, kebetulan ..."'),
          ": ",
          b("혹시 화장실 어디예요?"),
          ' (Permisi, toiletnya di mana ya?) Rasa "jangan-jangan" baru muncul kalau ditutup ',
          b("-(으)ㄴ/는 거 아니야?"),
          ".",
        ),
        p(
          "Kalau nebaknya tanpa rasa cemas, pakai ",
          ref("kayaknya", "ik-dugaan", "kayaknya"),
          ".",
        ),
        h3("Contoh obrolan"),
        p("Andi dicariin 반장님, padahal dia nggak tahu kenapa."),
        ...chat(
          [
            {
              who: "Andi",
              ko: "민호야, 반장님이 아까부터 나 찾으셨대.",
              id: "Minho, katanya ketua tim nyariin aku dari tadi.",
            },
            { who: "Minho", ko: "왜?", id: "Kenapa?" },
            {
              who: "Andi",
              ko: "모르겠어. 혹시 내가 뭐 잘못한 거 아닐까?",
              id: "Nggak tahu. Jangan-jangan aku bikin salah?",
            },
            {
              who: "Minho",
              ko: "설마. 너 요즘 일 잘하잖아.",
              id: "Masa sih. Kamu kan lagi kerjanya bagus.",
            },
            {
              who: "Andi",
              ko: "그래도 걱정돼...",
              id: "Tetep aja khawatir...",
            },
            {
              who: "Minho",
              ko: "걱정하지 마. 다음 주 일정 때문인 것 같아.",
              id: "Jangan khawatir. Kayaknya soal jadwal minggu depan.",
            },
          ],
          {
            questions: [
              {
                ko: "안디는 왜 걱정해요?",
                id: "Kenapa Andi khawatir?",
              },
              {
                ko: "민호는 반장님이 왜 안디를 찾으신 것 같다고 해요?",
                id: "Menurut Minho, kenapa ketua tim nyariin Andi?",
              },
              {
                ko: "'Jangan-jangan aku bikin salah?'를 한국어로 어떻게 말해요?",
                id: 'Gimana bilang "jangan-jangan aku bikin salah?"',
              },
            ],
          },
        ),
        p(
          "Pola lain di obrolan ini: ",
          ref("-대 (katanya)", "ki-akhiran-rasa", "daeyo"),
          ", ",
          ref("-잖아", "ki-akhiran-rasa", "janayo"),
          ", ",
          ref("그래도", "ki-kata-sambung", "geuraedo"),
          ", ",
          ref("-지 마", "ki-minta-ajak", "ji-maseyo"),
          ", ",
          ref("때문", "ki-waktu-sebab", "gi-ttaemune"),
          ", dan ",
          ref("-(으)ㄴ 것 같아", "ki-akhiran-rasa", "geot-gatda"),
          ".",
        ),
        h3("Coba bikin sendiri"),
        bullet(i('"Jangan-jangan dia lagi sakit?" (temen nggak bales chat)')),
        bullet(i('"Jangan-jangan tokonya udah tutup?" (sopan)')),
        callout(
          "success",
          "1. ",
          b("혹시 걔 아픈 거 아니야?"),
          " 2. ",
          b("혹시 가게가 벌써 문 닫은 거 아니에요?"),
        ),
      ],
    },
    {
      key: "untung",
      title: "Untung",
      blocks: [
        p(
          i('"Untung nggak hujan."'),
          " Kamu lega karena hal buruk nggak kejadian, atau hal baik kebetulan terjadi. Gimana bilangnya?",
        ),
        h3("Pilihan bahasa Korea"),
        table([
          ["Korea", "Nuansa", "Pola"],
          [
            b("비가 안 와서 다행이야."),
            'Paling umum: "untung nggak hujan". Alasan pakai -아서, ditutup 다행이다.',
            ref("다행이다", "ki-kata-kecil", "dahaeng"),
          ],
          [
            b("다행히 비가 안 왔어."),
            '"Untungnya nggak hujan." Pas buat cerita.',
            ref("다행히", "ki-kata-kecil", "dahaeng"),
          ],
          [
            b("다행이다! / 다행이네요."),
            '"Syukurlah!" Reaksi waktu denger kabar baik dari orang lain.',
            ref("-네요", "ki-akhiran-rasa", "neyo"),
          ],
          [
            b("네가 있어서 다행이야."),
            '"Untung ada kamu." Kalimat drakor banget.',
            ref("-아서/어서", "ki-alasan-urutan", "aseo-karena"),
          ],
        ]),
        h3("Untung aja, hampir celaka"),
        p(
          'Kadang "untung" datang abis hampir celaka: ',
          i('"Hampir ketinggalan kereta. Untung aja."'),
          " Gabungin ",
          ref("-(으)ㄹ 뻔했다", "ki-keadaan", "eul-ppeonhada"),
          " sama 다행이다:",
        ),
        ex(
          "기차 놓칠 뻔했어. 진짜 다행이다.",
          "Hampir ketinggalan kereta. Untung banget.",
        ),
        ex("큰일 날 뻔했어요!", "Hampir aja gawat!", "ungkapan wajib hafal"),
        p(
          "Soal hampir lebih lengkap ada di ",
          ref("hampir", "ik-waktu", "hampir"),
          ".",
        ),
        callout(
          "warning",
          b("Jebakan: untung yang artinya laba."),
          " ",
          i('"Jualan hari ini untung banyak"'),
          " itu soal duit, bukan lega. Bahasa Koreanya beda total: ",
          b("오늘 장사 잘됐어."),
          " atau ",
          b("이익이 많이 남았어요."),
          " Jangan pakai 다행 di sini.",
        ),
        callout(
          "warning",
          b("Jebakan bentuk lampau."),
          " Sebelum -아서 nggak boleh ada -았: ~~비가 안 왔어서 다행이야~~. Yang bener ",
          b("비가 안 와서 다행이야"),
          ", walaupun kejadiannya udah lewat. Aturan ini dijelasin di ",
          ref("-아서/어서", "ki-alasan-urutan", "aseo-karena"),
          ".",
        ),
        p(
          "Kebalikan untung adalah sayangnya. Lihat ",
          ref("sayangnya", "ik-dugaan", "sayangnya"),
          ".",
        ),
        h3("Contoh"),
        ex("다행히 친구가 도와줬어요.", "Untungnya ada temen yang bantuin."),
        ex("사장님이 이해해 주셔서 다행이에요.", "Untung bos mau ngerti."),
        ex("많이 안 다쳐서 다행이다.", "Untung lukanya nggak parah."),
        h3("Contoh obrolan"),
        p("Rina cerita ke Jisu soal HP-nya yang ketinggalan di subway."),
        ...chat(
          [
            {
              who: "Rina",
              ko: "큰일 날 뻔했어! 핸드폰을 지하철에 두고 내렸어.",
              id: "Hampir aja gawat! HP-ku ketinggalan di subway.",
            },
            {
              who: "Jisu",
              ko: "헐, 그래서 찾았어?",
              id: "Hah, terus ketemu?",
            },
            {
              who: "Rina",
              ko: "응, 다행히 어떤 아저씨가 역에 맡겨 주셨어.",
              id: "Iya, untungnya ada bapak-bapak yang nitipin ke stasiun.",
            },
            {
              who: "Jisu",
              ko: "와, 진짜 다행이다!",
              id: "Wah, syukur banget!",
            },
            {
              who: "Rina",
              ko: "응. 거기에 외국인등록증도 있었거든.",
              id: "Iya. Soalnya kartu ARC-ku juga ada di situ.",
            },
          ],
          {
            questions: [
              {
                ko: "리나는 핸드폰을 어디에 두고 내렸어요?",
                id: "HP Rina ketinggalan di mana?",
              },
              {
                ko: "'Untung HP-nya ketemu'를 한국어로 어떻게 말해요?",
                id: 'Gimana bilang "untung HP-nya ketemu"?',
              },
            ],
            tip: {
              title: "꿀팁 · TIP",
              ko: "'다행이다' 앞에는 과거형 없이 '-아서/어서'를 써요. '찾았어서'가 아니라 '찾아서 다행이야'.",
              id: "Sebelum 다행이다 pakai -아서/어서 tanpa bentuk lampau: 찾아서 다행이야, bukan 찾았어서.",
            },
          },
        ),
        p(
          "Pola lain di obrolan ini: ",
          ref("-(으)ㄹ 뻔했다", "ki-keadaan", "eul-ppeonhada"),
          ", ",
          ref("그래서", "ki-kata-sambung", "geuraeseo"),
          ", ",
          ref("-아/어 주다", "ki-minta-ajak", "a-juseyo"),
          ", dan ",
          ref("-거든", "ki-akhiran-rasa", "geodeunyo"),
          " (lihat ",
          ref("soalnya", "ik-alasan", "soalnya"),
          ").",
        ),
        h3("Coba bikin sendiri"),
        bullet(i('"Untung aku nggak telat."')),
        bullet(i('"Untungnya busnya masih ada." (cerita, sopan)')),
        callout(
          "success",
          "1. ",
          b("안 늦어서 다행이야."),
          " 2. ",
          b("다행히 버스가 아직 있었어요."),
        ),
      ],
    },
    {
      key: "sayangnya",
      title: "Sayangnya",
      blocks: [
        p(
          i('"Sayangnya aku nggak bisa dateng."'),
          " Kamu nyampein kabar yang kurang enak, atau ngungkapin rasa kecewa. Gimana bilangnya?",
        ),
        h3("Pilihan bahasa Korea"),
        table([
          ["Korea", "Nuansa", "Pola"],
          [
            b("아쉽게도 못 가."),
            '"Sayangnya aku nggak bisa dateng." Nyampein kabar kurang enak dengan halus.',
            ref("아쉽게도", "ki-kata-kecil", "aswipgedo"),
          ],
          [
            b("네가 못 와서 아쉬웠어."),
            '"Sayang banget kamu nggak dateng." Fokus ke perasaan kecewa.',
            ref("-아서 아쉽다", "ki-kata-kecil", "aswipgedo"),
          ],
          [
            b("아쉽다... / 아쉽네요."),
            '"Yah, sayang banget." Reaksi pendek.',
            ref("아쉽다", "ki-kata-kecil", "aswipgedo"),
          ],
          [
            b("안타깝게도"),
            "Lebih berat, ada rasa iba. Biasanya buat kabar sedih atau berita.",
            "kata sendiri, tanpa pola",
          ],
        ]),
        h3("Contoh"),
        ex(
          "아쉽게도 이번 주말에는 일이 있어서 못 가요.",
          "Sayangnya weekend ini aku ada kerjaan, jadi nggak bisa dateng.",
          "nolak ajakan dengan sopan",
        ),
        ex(
          "벚꽃이 벌써 다 져서 아쉬워.",
          "Sayang banget bunga sakuranya udah pada gugur.",
        ),
        ex(
          "시간이 너무 빨리 지나가서 아쉬워요.",
          "Sayang ya, waktunya cepet banget.",
        ),
        ex(
          "아쉽게도 할랄 메뉴는 없습니다.",
          "Sayangnya nggak ada menu halal.",
          "gaya restoran, resmi",
        ),
        callout(
          "warning",
          b('Jebakan: sayang yang "jangan dibuang".'),
          " ",
          i('"Sayang kalau dibuang, masih bisa dimakan"'),
          " itu bukan 아쉽다, tapi ",
          b("아깝다"),
          ": ",
          b("아직 먹을 수 있는데 버리기 아까워."),
          " Bedanya: 아쉽다 = kecewa karena ada yang kurang. 아깝다 = sayang karena barang, duit, atau waktu kebuang.",
        ),
        callout(
          "warning",
          b("Jebakan: sayang yang artinya cinta."),
          " Panggilan ",
          i('"sayang"'),
          " ke pacar itu ",
          b("자기야"),
          ", dan ",
          i('"aku sayang kamu"'),
          " itu ",
          b("사랑해"),
          ". Jangan sampai ngomong 아쉬워 ke pacar ya.",
        ),
        p(
          "Kalau sayangnya disusul andai-andai (",
          i('"sayang ya, coba kemarin kamu ikut"'),
          "), pakai ",
          ref("-았/었으면 좋았을 텐데", "ki-andai", "asseumyeon-teonde"),
          ". Lengkapnya di ",
          ref("kalau aja", "ik-andai", "kalau-aja"),
          ". Kebalikan sayangnya: ",
          ref("untung", "ik-dugaan", "untung"),
          ".",
        ),
        h3("Contoh obrolan"),
        p("Jisu ngajak Rina nonton konser, tapi Rina ada shift malam."),
        ...chat(
          [
            {
              who: "Jisu",
              ko: "금요일에 같이 콘서트 갈래? 표 두 장 있어.",
              id: "Jumat mau nonton konser bareng? Aku punya dua tiket.",
            },
            {
              who: "Rina",
              ko: "와, 가고 싶다! 근데 아쉽게도 그날 야간 근무야.",
              id: "Wah, pengen banget! Tapi sayangnya hari itu aku shift malam.",
            },
            {
              who: "Jisu",
              ko: "아, 진짜? 아쉽다...",
              id: "Yah, serius? Sayang banget...",
            },
            {
              who: "Rina",
              ko: "표 아깝다. 다른 친구랑 가.",
              id: "Sayang tiketnya. Pergi sama temen lain aja.",
            },
            {
              who: "Jisu",
              ko: "응, 다음에는 꼭 같이 가자!",
              id: "Oke, lain kali harus bareng ya!",
            },
          ],
          {
            questions: [
              {
                ko: "리나는 왜 콘서트에 못 가요?",
                id: "Kenapa Rina nggak bisa nonton konser?",
              },
              {
                ko: "표에 대해서는 왜 '아쉽다'가 아니라 '아깝다'라고 했어요?",
                id: "Kenapa buat tiketnya Rina bilang 아깝다, bukan 아쉽다?",
              },
            ],
          },
        ),
        p(
          "Pola lain di obrolan ini: ",
          ref("-(으)ㄹ래?", "ki-minta-ajak", "eullaeyo"),
          ", ",
          ref("-고 싶다", "ki-bisa-harus", "go-sipda"),
          ", ",
          ref("근데", "ki-kata-sambung", "geureonde"),
          ", dan ",
          ref("가자", "ki-banmal", "pengecualian"),
          ".",
        ),
        h3("Coba bikin sendiri"),
        bullet(i('"Sayangnya tiketnya udah habis." (sopan)')),
        bullet(i('"Sayang banget liburannya cuma tiga hari."')),
        callout(
          "success",
          "1. ",
          b("아쉽게도 표가 다 팔렸어요."),
          " 2. ",
          b("휴가가 3일밖에 안 돼서 아쉬워."),
          " (",
          ref("-밖에 안", "ki-kata-kecil", "bakke"),
          " = cuma)",
        ),
      ],
    },
    {
      key: "kayaknya",
      title: "Kayaknya",
      blocks: [
        p(
          i(
            '"Kayaknya mau hujan." "Kayaknya dia lagi sibuk." "Kayaknya dia udah pulang deh."',
          ),
          " Satu kata, tapi tingkat yakinnya beda-beda. Bahasa Korea punya bentuk sendiri buat tiap rasa. Gimana bilangnya?",
        ),
        h3("Pilihan bahasa Korea"),
        table([
          ["Maksud", "Korea", "Nuansa", "Pola"],
          [
            "Dugaan umum, pendapat halus",
            b("비가 올 것 같아."),
            "Paling serbaguna. Aman buat hampir semua situasi.",
            ref("-(으)ㄴ/는 것 같다", "ki-akhiran-rasa", "geot-gatda"),
          ],
          [
            "Nebak dari tanda yang kelihatan",
            b("바쁜가 봐."),
            "Kamu lihat sesuatu (dia nggak bales chat), terus nyimpulin.",
            ref("-나 봐 / -(으)ㄴ가 봐", "ki-akhiran-rasa", "na-bwa"),
          ],
          [
            'Kurang yakin, "kayaknya sih"',
            b("벌써 갔을걸."),
            '"Kayaknya udah pulang deh, tapi nggak yakin." Juga buat ngoreksi orang dengan halus.',
            ref("-(으)ㄹ걸", "ki-akhiran-rasa", "eulgeol"),
          ],
          [
            "Nebak perasaan atau rasa",
            b("맛있겠다! / 힘들겠다."),
            '"Kayaknya enak!" "Pasti capek ya." Reaksi spontan.',
            ref("-겠다", "ki-akhiran-rasa", "getda"),
          ],
        ]),
        h3("-(으)ㄴ/는 것 같다: waktunya ikut berubah"),
        bullet(
          "Udah terjadi: ",
          b("비가 온 것 같아"),
          " (kayaknya tadi hujan)",
        ),
        bullet(
          "Lagi terjadi: ",
          b("비가 오는 것 같아"),
          " (kayaknya lagi hujan)",
        ),
        bullet(
          "Bakal terjadi: ",
          b("비가 올 것 같아"),
          " (kayaknya mau hujan)",
        ),
        bullet(
          "Kata sifat sekarang: ",
          b("좀 큰 것 같아요"),
          " (kayaknya agak kebesaran)",
        ),
        callout(
          "tip",
          "Orang Korea sering pakai ",
          b("것 같아요"),
          " buat ngehalusin pendapat, walaupun sebenernya yakin. ",
          b("이 옷 좀 큰 것 같아요"),
          " kedengeran lebih sopan daripada ",
          b("이 옷 커요"),
          '. Persis kayak kita bilang "kayaknya agak kebesaran deh".',
        ),
        h3("Contoh"),
        ex(
          "걔 요즘 연애하나 봐. 계속 웃어.",
          "Kayaknya dia lagi pacaran. Senyum-senyum terus.",
        ),
        ex(
          "밖에 비가 오나 봐요. 다들 우산을 들고 있어요.",
          "Kayaknya di luar hujan. Semua orang bawa payung.",
        ),
        ex(
          "아마 내일 쉬는 날일걸요.",
          "Kayaknya sih besok libur.",
          "kurang yakin, sopan",
        ),
        ex("그 식당 할랄 아닐걸.", "Kayaknya restoran itu nggak halal deh."),
        ex(
          "와, 이 치킨 진짜 맛있겠다!",
          "Wah, ayam gorengnya kayaknya enak banget!",
          "lihat makanannya, belum nyobain",
        ),
        ex(
          "12시간 일했어? 진짜 피곤하겠다.",
          "Kerja 12 jam? Pasti capek banget.",
        ),
        callout(
          "warning",
          b("Jebakan: -겠다 vs 것 같다 waktu lihat makanan."),
          " Lagi lihat foto atau makanan di depan mata, belum dicobain: ",
          b("맛있겠다!"),
          " Udah nyicip dikit dan nilai: ",
          b("맛있는 것 같아."),
          " Kalau kebalik, kedengeran aneh.",
        ),
        callout(
          "warning",
          b("Jebakan: bentuk -나 봐."),
          " Kata kerja pakai ",
          b("-나 봐"),
          " (",
          b("오나 봐, 자나 봐"),
          "), kata sifat pakai ",
          b("-(으)ㄴ가 봐"),
          " (",
          b("바쁜가 봐, 아픈가 봐"),
          "), udah terjadi pakai ",
          b("-았나 봐"),
          " (",
          b("갔나 봐"),
          '). Dan -나 봐 butuh "bukti" yang kamu lihat. Kalau nggak ada tandanya, pakai ',
          b("것 같다"),
          " aja.",
        ),
        culture({
          titleKo: "확실해도 '것 같아요'",
          titleId: 'Yakin pun tetep bilang "kayaknya"',
          paragraphs: [
            {
              ko: "한국 사람들은 자기 의견을 말할 때 '것 같아요'를 자주 써요. 확실히 알아도 '좋은 것 같아요', '맞는 것 같아요'처럼 말하면 더 부드럽게 들려요.",
              id: "Orang Korea sering banget pakai 것 같아요 waktu ngasih pendapat. Walaupun yakin, bilang 좋은 것 같아요 atau 맞는 것 같아요 kedengeran lebih halus.",
            },
            {
              ko: "특히 윗사람한테 다른 의견을 말할 때 '이건 좀 아닌 것 같아요'라고 하면 덜 딱딱해요. '이건 틀렸어요'라고 바로 말하면 너무 세게 들릴 수 있어요.",
              id: "Apalagi kalau mau beda pendapat sama atasan. 이건 좀 아닌 것 같아요 jauh lebih aman daripada langsung 이건 틀렸어요, yang bisa kedengeran nyolot.",
            },
            {
              ko: "하지만 사실이나 숫자를 말할 때는 그냥 말해도 돼요. '내일 9시에 시작해요'처럼요. 모든 말에 '것 같아요'를 붙이면 자신감이 없어 보일 수 있어요.",
              id: "Tapi buat fakta atau angka, ngomong langsung aja: 내일 9시에 시작해요. Kalau semua kalimat pakai 것 같아요, kamu malah kelihatan nggak pede.",
            },
          ],
          checklist: [
            {
              ko: "윗사람한테 의견을 '것 같아요'로 부드럽게 말할 수 있어요.",
              id: "Aku bisa ngehalusin pendapat ke atasan pakai 것 같아요.",
            },
            {
              ko: "사실을 말할 때는 '것 같아요' 없이 말할 수 있어요.",
              id: "Aku tahu kapan nggak perlu 것 같아요: buat fakta.",
            },
          ],
        }),
        p(
          "Kalau nebaknya sambil cemas atau takut, pindah ke ",
          ref("jangan-jangan", "ik-dugaan", "jangan-jangan"),
          ".",
        ),
        h3("Contoh obrolan"),
        p("Pagi-pagi di pabrik, Andi dan Minho ngerasa suasananya beda."),
        ...chat(
          [
            {
              who: "Minho",
              ko: "반장님 오늘 기분 안 좋으신가 봐.",
              id: "Kayaknya ketua tim lagi bad mood hari ini.",
            },
            { who: "Andi", ko: "왜?", id: "Kenapa?" },
            {
              who: "Minho",
              ko: "아침부터 한마디도 안 하셔.",
              id: "Dari pagi nggak ngomong sepatah kata pun.",
            },
            {
              who: "Andi",
              ko: "어제 늦게까지 야근하셨을걸. 피곤하시겠다.",
              id: "Kayaknya sih kemarin lembur sampai malem. Pasti capek.",
            },
            {
              who: "Minho",
              ko: "그런 것 같아. 오늘은 조용히 일하자.",
              id: "Kayaknya iya. Hari ini kerja yang anteng aja yuk.",
            },
          ],
          {
            questions: [
              {
                ko: "민호는 왜 반장님 기분이 안 좋으신 것 같다고 생각해요?",
                id: "Kenapa Minho nebak ketua tim lagi bad mood?",
              },
              {
                ko: "친구가 아침부터 답장을 안 해요. 'Kayaknya dia sibuk'을 어떻게 말해요?",
                id: 'Temen nggak bales chat dari pagi. Gimana bilang "kayaknya dia lagi sibuk"?',
              },
            ],
          },
        ),
        p(
          "Perhatiin ",
          b("-(으)시-"),
          " di ",
          b("좋으신가 봐, 하셨을걸, 피곤하시겠다"),
          ": walaupun Andi dan Minho ngomong 반말, mereka tetap hormat waktu ngomongin 반장님. Pola lain: ",
          ref("-자", "ki-banmal", "pengecualian"),
          ".",
        ),
        h3("Coba bikin sendiri"),
        bullet(i('"Kayaknya besok dingin."')),
        bullet(i('"Kayaknya dia lagi tidur." (lampu kamarnya mati)')),
        bullet(i('"Kayaknya enak!" (lihat foto makanan)')),
        callout(
          "success",
          "1. ",
          b("내일 추울 것 같아."),
          " 2. ",
          b("자나 봐."),
          " 3. ",
          b("맛있겠다!"),
        ),
      ],
    },
  ],
  outro: [
    h3("Rangkuman"),
    table([
      ["Indonesia", "Bilangnya", "Pola"],
      [
        "Makin dipelajari makin seru",
        b("공부할수록 재미있어"),
        ref("-(으)ㄹ수록", "ki-waktu-sebab", "eulsurok"),
      ],
      [
        "Pantesan rame",
        b("어쩐지 사람이 많더라"),
        ref("어쩐지", "ki-kata-kecil", "eojjeonji"),
      ],
      ["Ternyata enak", b("맛있네!"), ref("-네", "ki-akhiran-rasa", "neyo")],
      [
        "Ternyata dia orang Indonesia",
        b("알고 보니 인도네시아 사람이었어"),
        ref("알고 보니", "ki-kata-kecil", "algo-boni"),
      ],
      [
        "Jangan-jangan dia lupa",
        b("혹시 잊어버린 거 아니야?"),
        ref("혹시", "ki-kata-kecil", "hoksi"),
      ],
      [
        "Untung nggak hujan",
        b("비가 안 와서 다행이야"),
        ref("다행이다", "ki-kata-kecil", "dahaeng"),
      ],
      [
        "Sayangnya nggak bisa dateng",
        b("아쉽게도 못 가"),
        ref("아쉽게도", "ki-kata-kecil", "aswipgedo"),
      ],
      [
        "Kayaknya mau hujan",
        b("비가 올 것 같아"),
        ref("-(으)ㄹ 것 같다", "ki-akhiran-rasa", "geot-gatda"),
      ],
    ]),
    callout(
      "success",
      "Sekarang kamu bisa nebak, kaget, lega, dan kecewa dalam bahasa Korea. Next: kata-kata waktu yang sering bikin bingung karena maknanya dobel, kayak ",
      i("udah, belum, masih, baru"),
      ". Lanjut ke ",
      ref("udah, belum, masih, baru", "ik-waktu"),
      ".",
    ),
    p(
      "Sebelum lanjut, tes reaksi kamu dulu yuk: kuis singkat soal milih cara ngomong yang paling natural. Nilai 70 udah lulus.",
    ),
    quizRef(),
  ],
  quiz: {
    title: "Kuis: kayaknya, pantesan, ternyata",
    description:
      "Sepuluh situasi ngobrol. Pilih cara nebak dan bereaksi yang paling natural dalam bahasa Korea.",
    passingScore: 70,
    questions: [
      {
        key: "makin-cepat",
        prompt:
          '사장님 bilang kerjaan ini harus cepet. Kamu mau jawab "Iya, makin cepat makin bagus ya, Pak." Pilih yang paling natural.',
        options: [
          { text: "네, 빠르면 빠를수록 좋죠.", correct: true },
          { text: "네, 더 빨라서 더 좋죠." },
          { text: "네, 점점 빨라서 좋죠." },
        ],
        explanation:
          'Makin A makin B = -(으)면 -(으)ㄹ수록. 빠르면 빠를수록 itu ungkapan wajib hafal. 더 빨라서 더 좋아 artinya "karena lebih cepet jadi lebih bagus", rasanya beda.',
      },
      {
        key: "pantesan-rame",
        prompt:
          'Temen bilang hari ini ada diskon. Kamu mau bilang "Oh, lagi diskon. Pantesan rame."',
        options: [
          { text: "아, 세일하는구나. 어쩐지 사람이 많더라.", correct: true },
          { text: "아, 세일하는구나. 그래서 사람이 많아?" },
          { text: "아, 세일하는구나. 왜 사람이 많아?" },
        ],
        explanation:
          "Pantesan = 어쩐지 + hal aneh yang tadi kamu lihat sendiri, ditutup -더라. Dua pilihan lain malah nanya lagi, padahal kamu udah tahu alasannya.",
      },
      {
        key: "ternyata-enak",
        prompt:
          "Kamu baru nyicip kimchi buatan temen, dan ternyata enak banget. Spontan kamu bilang:",
        options: [
          { text: "맛있네!", correct: true },
          { text: "왜 맛있어?" },
          { text: "알고 보니 맛있어." },
          { text: "맛있대!" },
        ],
        explanation:
          'Baru sadar sekarang sambil ngalamin langsung = -네. 왜 맛있어? kedengeran kayak nuntut alasan, 알고 보니 buat plot twist fakta, dan 맛있대 artinya "katanya enak".',
      },
      {
        key: "ternyata-katanya",
        prompt:
          'Bos baru aja bilang besok libur. Kamu kabarin bestie: "Eh, ternyata besok libur!"',
        options: [
          { text: "야, 내일 쉰대!", correct: true },
          { text: "야, 내일 쉬더라!" },
          { text: "야, 내일 쉬네!" },
        ],
        explanation:
          "Infonya dari orang lain (bos), jadi pakai -대 (katanya). -더라 cuma buat hal yang kamu lihat atau alami sendiri.",
      },
      {
        key: "jangan-jangan",
        prompt:
          'Temen janjian jam 7, udah jam 8 belum dateng. "Jangan-jangan dia lupa."',
        options: [
          { text: "혹시 걔 잊어버린 거 아니야?", correct: true },
          { text: "걔 잊어버리지 마." },
          { text: "걔 잊어버릴 수 있어." },
        ],
        explanation:
          'Jangan-jangan itu nebak sambil cemas, bukan larangan. Rumusnya 혹시 + -(으)ㄴ 거 아니야? Kalau pakai -지 마, artinya malah "jangan lupa".',
      },
      {
        key: "untung-bentuk",
        prompt: '"Untung nggak hujan." Mana yang bener?',
        options: [
          { text: "비가 안 와서 다행이야.", correct: true },
          { text: "비가 안 왔어서 다행이야." },
          { text: "비가 안 오니까 다행했어." },
        ],
        explanation:
          "Sebelum -아서/어서 nggak boleh ada bentuk lampau, walaupun kejadiannya udah lewat. Jadi 안 와서 다행이야, bukan 안 왔어서.",
      },
      {
        key: "untung-laba",
        prompt:
          'Temen yang jualan online cerita: "Hari ini untung banyak!" Maksudnya laba. Bilangnya?',
        options: [
          { text: "오늘 장사 잘됐어!", correct: true },
          { text: "오늘 장사가 다행이야!" },
          { text: "다행히 오늘 장사했어!" },
        ],
        explanation:
          "Untung yang artinya laba itu urusan duit, bukan lega. Pakai 장사 잘됐어 atau 이익이 많이 남았어. 다행 cuma buat rasa lega.",
      },
      {
        key: "sayang-dibuang",
        prompt:
          'Nasi sisa masih bagus. "Sayang kalau dibuang." Pilih kata yang pas.',
        options: [
          { text: "버리기 아까워.", correct: true },
          { text: "버리기 아쉬워." },
          { text: "버리기 안타까워." },
        ],
        explanation:
          "Sayang karena barang, duit, atau waktu kebuang = 아깝다. 아쉽다 itu kecewa karena ada yang kurang, 안타깝다 lebih ke iba.",
      },
      {
        key: "kayaknya-tanda",
        prompt:
          'Temen nggak bales chat dari pagi. Kamu nebak dari tanda itu: "Kayaknya dia lagi sibuk."',
        options: [
          { text: "바쁜가 봐.", correct: true },
          { text: "바빠 봐." },
          { text: "바쁜 척해." },
        ],
        explanation:
          'Nebak dari tanda yang kelihatan = -나 봐 / -(으)ㄴ가 봐. Kata sifat pakai -(으)ㄴ가 봐: 바쁜가 봐. 바빠 봐 nggak nyambung, dan 바쁜 척해 artinya "pura-pura sibuk".',
      },
      {
        key: "kayaknya-makanan",
        prompt:
          'Lagi scroll foto ayam goreng, belum nyobain. "Kayaknya enak banget!"',
        options: [
          { text: "와, 맛있겠다!", correct: true },
          { text: "와, 맛있었어!" },
          { text: "와, 맛있더라!" },
        ],
        explanation:
          "Lihat makanan tapi belum nyicip = -겠다. 맛있었어 dan 맛있더라 dua-duanya buat yang udah kamu cobain.",
      },
    ],
  },
});
