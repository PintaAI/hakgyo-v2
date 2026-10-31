import {
  b,
  bullet,
  callout,
  chat,
  defineMaterial,
  ex,
  grammar,
  h3,
  i,
  opener,
  p,
  quizRef,
  ref,
  table,
} from "../blocks";

export default defineMaterial({
  key: "ki-akhiran-rasa",
  title: "Akhiran perasaan dan dugaan",
  description:
    "-잖아요, -거든요, -네요, -것 같아요, -더라고요, -대요: akhiran kecil yang bikin bahasa Korea kamu kedengeran hidup. Dijelasin lewat kan, soalnya, ternyata, kayaknya, dan katanya.",
  intro: [
    opener({
      eyebrow: "PAHAM POLA · BAB 6",
      chapterNumber: "06",
      titleKo: "말끝에 담긴 느낌",
      subtitle:
        "Kan, soalnya, wah ternyata, kayaknya, katanya: biar bahasa Korea kamu nggak kaku kayak robot.",
      question: "이 떡볶이 어때요?",
      answer: "와, 진짜 맛있네요! 저 매운 거 좋아하거든요.",
      focus: [
        {
          label: "문법 · Pola",
          title: "-잖아요 · -거든요 · -네요",
          description: "Tiga akhiran rasa: kan, soalnya, dan wah ternyata.",
        },
        {
          label: "표현 · Kata kunci",
          title: "-것 같아요 · -대요",
          description:
            "Kayaknya dan katanya: nebak sendiri vs nyampein omongan orang.",
        },
        {
          label: "함정 · Jebakan",
          title: "할걸요 ≠ 할게요",
          description:
            "Beda satu huruf, artinya jauh. Jangan sampe salah jawab ke 반장님.",
        },
      ],
      objectives: [
        {
          ko: "상황에 맞는 말끝으로 느낌을 표현할 수 있어요.",
          id: "Bisa milih akhiran yang pas sama perasaanmu.",
        },
        {
          ko: "추측하는 말과 들은 말을 구별해서 말할 수 있어요.",
          id: "Bisa bedain nebak sendiri dan nyampein omongan orang.",
        },
      ],
      theme: "rose",
    }),
    p(
      "Coba bayangin kamu ngomong bahasa Indonesia tanpa ",
      i("kan, sih, soalnya, ternyata, kayaknya"),
      ". Kalimatnya bener semua, tapi kedengeran kayak robot. Nah, itu yang kejadian kalau kamu ngomong Korea cuma pakai -아요/어요.",
    ),
    p(
      "Bahasa Korea punya akhiran yang tugasnya mirip partikel obrolan kita. Akhiran ini nggak ngubah isi kalimat. Yang diubah adalah ",
      b("perasaan"),
      " di baliknya: kamu ngingetin, ngasih alasan, kaget, atau cuma nebak.",
    ),
    callout(
      "info",
      "Kabar baiknya: orang Indonesia punya keuntungan besar di sini. Buku-buku buat penutur Inggris susah payah jelasin -잖아요 dan -거든요, padahal kita tinggal bilang ",
      i("kan"),
      " dan ",
      i("soalnya"),
      ". Jalan pintas ini yang kita pakai sepanjang materi.",
    ),
    h3("Yang bakal kamu pelajari"),
    table([
      ["Akhiran", "Rasanya dalam bahasa Indonesia"],
      [ref("-잖아요", "ki-akhiran-rasa", "janayo"), "kan (kamu udah tau)"],
      [
        ref("-지요 / -죠", "ki-akhiran-rasa", "jiyo"),
        "...kan? / ...ya? (minta setuju)",
      ],
      [ref("-거든요", "ki-akhiran-rasa", "geodeunyo"), "soalnya, gini loh"],
      [
        ref("-네요", "ki-akhiran-rasa", "neyo"),
        "wah, ternyata (baru sadar sekarang)",
      ],
      [ref("-군요", "ki-akhiran-rasa", "gunyo"), "oh, gitu ya"],
      [ref("-(으)ㄴ/는 것 같다", "ki-akhiran-rasa", "geot-gatda"), "kayaknya"],
      [
        ref("-나 봐요", "ki-akhiran-rasa", "na-bwa"),
        "kayaknya (dilihat dari tandanya)",
      ],
      [
        ref("-(으)ㄹ걸요", "ki-akhiran-rasa", "eulgeol"),
        "kayaknya sih (nggak yakin)",
      ],
      [ref("-겠-", "ki-akhiran-rasa", "getda"), "pasti ... ya"],
      [
        ref("-더라고요", "ki-akhiran-rasa", "deora"),
        "ternyata (aku liat sendiri)",
      ],
      [
        ref("-대요 / -래요", "ki-akhiran-rasa", "daeyo"),
        "katanya, disuruh, diajak",
      ],
    ]),
    p(
      "Semua akhiran di sini punya versi santai: tinggal buang -요. Rumus lengkapnya ada di ",
      ref("반말: rumus ubah", "ki-banmal", "rumus"),
      ".",
    ),
  ],
  sections: [
    // ───────────────────────────── -잖아요
    {
      key: "janayo",
      title: "-잖아요: kan (kamu udah tau)",
      blocks: [
        grammar({
          number: "01",
          title: "-잖아요",
          descriptionKo:
            "듣는 사람도 이미 아는 사실을 다시 떠올리게 할 때 써요.",
          descriptionTranslation:
            "Dipakai buat ngingetin sesuatu yang lawan bicara sebenernya udah tau. Rasanya persis kayak kan di ‘kan udah aku bilang’. Bisa netral (cuma ngingetin), bisa juga nadanya protes, tergantung intonasi.",
          rules: [
            {
              condition: "Kata kerja / sifat",
              form: "-잖아요",
              example: "가다 → 가잖아요, 춥다 → 춥잖아요",
            },
            {
              condition: "Bentuk lampau",
              form: "-았/었잖아요",
              example: "말했잖아요, 먹었잖아요",
            },
            {
              condition: "Kata benda akhiran vokal",
              form: "-잖아요",
              example: "친구잖아요",
            },
            {
              condition: "Kata benda akhiran konsonan",
              form: "-이잖아요",
              example: "학생이잖아요",
            },
            {
              condition: "Rencana / masa depan",
              form: "-(으)ㄹ 거잖아요",
              example: "내일 갈 거잖아요",
            },
            { condition: "반말", form: "-잖아", example: "말했잖아" },
          ],
          examples: [
            { before: "제가 어제 ", emphasis: "말했잖아요", after: "." },
            {
              before: "오늘 일요일",
              emphasis: "이잖아요",
              after: ". 공장 쉬는 날이에요.",
            },
            { before: "너 매운 거 잘 먹", emphasis: "잖아", after: "." },
          ],
          tipKo: "억양에 따라 부드럽게도, 따지는 말투로도 들려요.",
          tipTranslation:
            "Intonasinya nentuin segalanya. Diucapin pelan dan turun = ngingetin biasa. Diucapin tinggi dan cepet = ‘kan udah aku bilang!’ yang nyolot.",
          theme: "rose",
        }),
        h3("Artinya apa sih?"),
        p(
          "Kuncinya satu: informasinya ",
          b("udah diketahui berdua"),
          ". Kamu nggak lagi ngasih info baru, kamu lagi bilang ‘inget kan?’. Makanya padanannya ",
          i("kan"),
          " yang ini: ",
          i("Kan aku udah bilang. Kamu kan Muslim. Kan hari ini libur."),
        ),
        p(
          "Selain ngingetin, -잖아요 juga sering dipakai sebagai ",
          b("alasan yang semua orang udah tau"),
          ". ",
          i("Aku nggak ikut, kan besok kerja pagi."),
          " Di sini dia mirip ",
          i("soalnya"),
          ", bedanya pendengar udah tau alasannya.",
        ),
        h3("Contoh"),
        ex("제가 어제 말했잖아요.", "Kan kemarin aku udah bilang."),
        ex(
          "오늘 일요일이잖아요. 공장 쉬는 날이에요.",
          "Hari ini kan Minggu. Pabrik libur.",
        ),
        ex("비 오잖아요. 우산 가져가세요.", "Kan lagi hujan. Bawa payung gih."),
        ex(
          "저 무슬림이잖아요. 그래서 돼지고기는 못 먹어요.",
          "Aku kan Muslim. Jadi nggak bisa makan babi.",
          "temen kerjamu udah tau, kamu cuma ngingetin",
        ),
        ex("너 매운 거 잘 먹잖아.", "Kamu kan jago makan pedes.", "반말"),
        h3("Di obrolan"),
        ...chat(
          [
            {
              who: "지은",
              ko: "우리 내일 몇 시에 만나?",
              id: "Besok kita ketemu jam berapa?",
            },
            {
              who: "리나",
              ko: "세 시! 아까 말했잖아~",
              id: "Jam tiga! Kan tadi udah aku bilang~",
            },
            { who: "지은", ko: "아 맞다, 미안 ㅋㅋ", id: "Oh iya, sori wkwk" },
            {
              who: "리나",
              ko: "늦으면 안 돼! 너 맨날 늦잖아.",
              id: "Jangan telat ya! Kamu kan telat mulu.",
            },
          ],
          {
            questions: [
              {
                ko: "두 사람은 내일 몇 시에 만나요?",
                id: "Besok mereka ketemu jam berapa?",
              },
              {
                ko: "리나는 왜 ‘말했어’가 아니라 ‘말했잖아’라고 했어요?",
                id: "Kenapa Rina bilang 말했잖아, bukan cuma 말했어?",
              },
            ],
            tip: {
              title: "꿀팁 · TIP",
              ko: "‘말했잖아~’처럼 끝을 길게 끌면 장난스럽게 들려요.",
              id: "Kalau ujungnya dipanjangin kayak 말했잖아~, kedengeran becanda, bukan marah.",
            },
          },
        ),
        callout(
          "warning",
          "Jebakan 1: jangan pakai -잖아요 buat info yang lawan bicara belum tau. ‘저 인도네시아 사람이잖아요’ ke orang yang baru kenal kedengeran aneh, kayak ‘aku kan orang Indonesia’ ke orang asing. Buat info baru, pakai ",
          ref("-거든요", "ki-akhiran-rasa", "geodeunyo"),
          ".",
        ),
        callout(
          "warning",
          "Jebakan 2: hati-hati ke atasan. ‘사장님이 말씀하셨잖아요’ bisa kedengeran kayak kamu nyalahin 사장님: ‘kan Bapak sendiri yang bilang!’. Ke atasan, lebih aman bilang ‘사장님이 그렇게 말씀하셔서...’ (soalnya Bapak bilang gitu...).",
        ),
        h3("Bandingin: dua macam kan"),
        p(
          "Bahasa Indonesia cuma punya satu ",
          i("kan"),
          ", tapi maksudnya dua. Bahasa Korea misahin keduanya:",
        ),
        table([
          ["Indonesia", "Maksudnya", "Korea"],
          [
            "Kan udah aku bilang.",
            "Ngingetin, kamu pasti tau",
            ref("-잖아요", "ki-akhiran-rasa", "janayo"),
          ],
          [
            "Besok libur kan?",
            "Nanya, minta dibenerin",
            ref("-죠?", "ki-akhiran-rasa", "jiyo"),
          ],
        ]),
        p(
          "Kalau kamu bisa ganti ",
          i("kan"),
          "-nya jadi ‘inget nggak sih’, pakai -잖아요. Kalau bisa diganti ‘bener nggak?’, pakai -죠.",
        ),
        callout(
          "tip",
          "Mau latihan ngomong dari arah sebaliknya? Cek ",
          ref("kan", "ik-partikel", "kan"),
          " dan ",
          ref("padahal (protes)", "ik-padahal", "protes"),
          ". Di situ -잖아 dipakai buat ‘padahal kamu udah janji!’.",
        ),
        h3("Coba bikin sendiri"),
        bullet("Kan kamu udah makan tadi. (먹다)"),
        bullet("Kan dia orang Korea. (한국 사람)"),
        callout("success", "아까 먹었잖아요. / 그 사람 한국 사람이잖아요."),
      ],
    },
    // ───────────────────────────── -지요 / -죠
    {
      key: "jiyo",
      title: "-지요 / -죠: ...kan? ...ya?",
      blocks: [
        grammar({
          number: "02",
          title: "-지요 / -죠",
          descriptionKo: "상대방에게 동의를 구하거나 확인할 때 써요.",
          descriptionTranslation:
            "Dipakai buat minta dibenerin atau minta setuju: ‘besok dateng kan?’, ‘dingin ya?’. Dalam obrolan hampir selalu disingkat jadi -죠. Kalau dipakai di kalimat pernyataan, rasanya ‘ya iya dong’ atau ‘bener kan’.",
          rules: [
            {
              condition: "Kata kerja / sifat",
              form: "-죠",
              example: "오다 → 오죠, 춥다 → 춥죠",
            },
            {
              condition: "Bentuk lampau",
              form: "-았/었죠",
              example: "먹었죠, 했죠",
            },
            {
              condition: "Kata benda akhiran vokal",
              form: "-죠",
              example: "친구죠",
            },
            {
              condition: "Kata benda akhiran konsonan",
              form: "-이죠",
              example: "학생이죠",
            },
            {
              condition: "Bentuk lengkap (tulisan, resmi)",
              form: "-지요",
              example: "가지요",
            },
            { condition: "반말", form: "-지", example: "내일 오지?" },
          ],
          examples: [
            { before: "내일 쉬는 날이", emphasis: "죠", after: "?" },
            { before: "한국 겨울 진짜 춥", emphasis: "죠", after: "?" },
            { before: "그렇", emphasis: "죠", after: "!" },
          ],
          tipKo: "질문할 때는 끝을 올리고, 맞장구칠 때는 내려요.",
          tipTranslation:
            "Nanya: ujungnya naik (오죠↗). Setuju atau nyimpulin: ujungnya turun (그렇죠↘).",
          theme: "rose",
        }),
        h3("Artinya apa sih?"),
        p(
          "Pikirin -죠 sebagai ",
          i("kan?"),
          " atau ",
          i("ya?"),
          " di ujung kalimat. Kamu udah punya dugaan, tinggal minta lawan bicara bilang ‘iya’. Ini beda dari pertanyaan biasa (-아요?) yang bener-bener nanya dari nol.",
        ),
        table([
          ["Kalimat", "Rasanya"],
          ["내일 와요?", "Besok dateng? (beneran nggak tau)"],
          ["내일 오죠?", "Besok dateng kan? (aku kira iya)"],
        ]),
        p("-죠 juga punya beberapa pemakaian lain yang sering kamu denger:"),
        bullet(
          b("Setuju / ‘bener kan’"),
          ": 그렇죠! = ",
          i("Nah, bener!"),
          " atau ",
          i("Iya dong."),
        ),
        bullet(
          b("Pertanyaan yang lebih halus"),
          ": 성함이 어떻게 되시죠? = ",
          i("Namanya siapa ya?"),
          " Sering dipakai staf toko, bank, dan rumah sakit.",
        ),
        bullet(
          b("Ajakan sopan"),
          ": 같이 가시죠. = ",
          i("Mari, kita jalan bareng."),
          " Biasanya diucapin ke orang yang dihormati.",
        ),
        h3("Contoh"),
        ex("내일 쉬는 날이죠?", "Besok libur kan?"),
        ex(
          "이거 할랄이죠?",
          "Ini halal kan?",
          "nanya ke temen yang udah ngecek",
        ),
        ex("한국 겨울 진짜 춥죠?", "Musim dingin di Korea dingin banget ya?"),
        ex(
          "실례지만 성함이 어떻게 되시죠?",
          "Maaf, namanya siapa ya?",
          "resepsionis rumah sakit",
        ),
        ex(
          "A: 이 드라마 재밌죠? B: 그렇죠!",
          "A: Drakor ini seru kan? B: Iya dong!",
        ),
        ex("너도 같이 가지?", "Kamu ikut juga kan?", "반말"),
        callout(
          "warning",
          "Jebakan: -죠 bunyinya mirip 줘요 (tolong kasih). 내일 오죠? artinya ‘besok dateng kan?’, bukan permintaan. Dengerin konteksnya, dan pastiin kamu nggak nulis 줘 waktu maksudnya 죠.",
        ),
        h3("-죠 vs -잖아요"),
        p(
          "Dua-duanya bisa diterjemahin ",
          i("kan"),
          ". Bedanya: -죠 masih nanya atau ngajak setuju. ",
          ref("-잖아요", "ki-akhiran-rasa", "janayo"),
          " udah yakin dan cuma ngingetin.",
        ),
        ex("오늘 월급날이죠?", "Hari ini gajian kan? (aku cuma mastiin)"),
        ex("오늘 월급날이잖아요!", "Hari ini kan gajian! (kamu lupa ya?)"),
        callout(
          "tip",
          "Latihan dari arah Indonesia: ",
          ref("kan", "ik-partikel", "kan"),
          ". Di sana ada contoh ‘besok libur kan?’ yang dijawab pakai -지.",
        ),
      ],
    },
    // ───────────────────────────── -거든요
    {
      key: "geodeunyo",
      title: "-거든요: soalnya, gini loh",
      blocks: [
        grammar({
          number: "03",
          title: "-거든요",
          descriptionKo: "상대방이 모르는 이유나 배경을 알려 줄 때 써요.",
          descriptionTranslation:
            "Dipakai buat ngasih alasan atau latar belakang yang lawan bicara belum tau. Padanan paling pas: soalnya, yang ditaruh di belakang kalimat. Bisa juga jadi pembuka cerita (‘jadi gini...’) dan, dalam 반말, buat nyolot (‘asal tau aja ya’).",
          rules: [
            {
              condition: "Kata kerja / sifat",
              form: "-거든요",
              example: "바쁘다 → 바쁘거든요",
            },
            {
              condition: "Bentuk lampau",
              form: "-았/었거든요",
              example: "먹었거든요, 했거든요",
            },
            {
              condition: "Kata benda akhiran vokal",
              form: "-거든요",
              example: "친구거든요",
            },
            {
              condition: "Kata benda akhiran konsonan",
              form: "-이거든요",
              example: "학생이거든요",
            },
            {
              condition: "Rencana",
              form: "-(으)ㄹ 거거든요",
              example: "내일 갈 거거든요",
            },
            { condition: "반말", form: "-거든", example: "피곤하거든" },
          ],
          examples: [
            {
              before: "먼저 갈게요. 내일 일찍 출근해야 하",
              emphasis: "거든요",
              after: ".",
            },
            { before: "저 지금 금식 중이", emphasis: "거든요", after: "." },
            {
              before: "제가 어제 홍대에 갔",
              emphasis: "거든요",
              after: ". 근데...",
            },
          ],
          tipKo:
            "이유를 말할 때는 문장 뒤에 와요. 인도네시아어 ‘soalnya’처럼요.",
          tipTranslation:
            "Urutannya sama kayak bahasa Indonesia: ngomong dulu, alasannya belakangan. ‘Aku duluan ya. Soalnya besok kerja pagi.’",
          theme: "rose",
        }),
        h3("Artinya apa sih?"),
        p(
          "Ada tiga rasa -거든요, dan ketiganya bisa kamu tebak dari bahasa Indonesia.",
        ),
        bullet(
          b("Soalnya"),
          " (paling sering): alasan di belakang. ",
          i("Aku nggak makan dulu. Soalnya lagi puasa."),
        ),
        bullet(
          b("Jadi gini..."),
          ": buka cerita dengan latar belakang, terus lanjut ke intinya. ",
          i("Kemarin aku ke Hongdae kan. Terus..."),
        ),
        bullet(
          b("Asal tau aja / loh"),
          " (반말, nada naik): nyolot atau negesin. ",
          i("Aku nggak bego ya, asal tau aja."),
        ),
        h3("Contoh"),
        ex(
          "먼저 갈게요. 내일 일찍 출근해야 하거든요.",
          "Aku duluan ya. Soalnya besok harus berangkat kerja pagi.",
        ),
        ex(
          "점심 안 먹어요? / 네, 저 지금 금식 중이거든요.",
          "Nggak makan siang? / Iya, soalnya aku lagi puasa.",
        ),
        ex(
          "이 편의점은 밤에 손님이 별로 없거든요. 그래서 혼자 일해도 괜찮아요.",
          "Minimarket ini malem-malem sepi soalnya. Jadi kerja sendirian juga aman.",
        ),
        ex(
          "제가 어제 홍대에 갔거든요. 근데 거기서 연예인을 봤어요!",
          "Jadi gini, kemarin aku ke Hongdae. Terus di sana aku liat artis!",
        ),
        ex(
          "나 바보 아니거든?",
          "Aku nggak bego ya, asal tau aja.",
          "반말, nyolot",
        ),
        h3("Di obrolan"),
        ...chat(
          [
            {
              who: "반장님",
              ko: "리나 씨, 오늘 왜 이렇게 빨리 가요?",
              id: "Rina, kok hari ini pulang cepet banget?",
            },
            {
              who: "리나",
              ko: "죄송해요. 오늘 비자 연장하러 출입국에 가야 하거든요.",
              id: "Maaf, Pak. Soalnya hari ini harus ke imigrasi buat perpanjang visa.",
            },
            {
              who: "반장님",
              ko: "아, 그래요. 조심히 가요.",
              id: "Oh gitu. Hati-hati ya.",
            },
          ],
          {
            questions: [
              {
                ko: "리나는 오늘 어디에 가야 해요?",
                id: "Hari ini Rina harus ke mana?",
              },
              {
                ko: "반장님은 리나의 이유를 미리 알고 있었어요?",
                id: "반장님 udah tau alasannya Rina dari awal?",
              },
            ],
            tip: {
              title: "꿀팁 · TIP",
              ko: "윗사람에게는 먼저 ‘죄송해요’라고 하고 이유를 말해요.",
              id: "Ke atasan, minta maaf dulu, baru kasih alasannya pakai -거든요.",
            },
          },
        ),
        callout(
          "warning",
          "Jebakan 1: -거든요 cuma bisa di belakang. Kalau alasannya di depan (‘karena capek, aku pulang’), pakai ",
          ref("-아서/어서", "ki-alasan-urutan", "aseo-karena"),
          " atau ",
          ref("-(으)니까", "ki-alasan-urutan", "nikka"),
          ": 피곤해서 먼저 갈게요. Jangan bikin ✗ 피곤하거든요 먼저 갈게요.",
        ),
        callout(
          "warning",
          "Jebakan 2: jangan keseringan ke atasan. Satu -거든요 itu wajar. Tiga kali berturut-turut bisa kedengeran kayak kamu lagi ngeles. Kalau kamu salah, minta maaf dulu (죄송합니다), baru jelasin alasannya.",
        ),
        h3("-거든요 vs -잖아요"),
        p("Dua-duanya bisa jadi alasan, tapi bedanya ada di siapa yang tau."),
        table([
          ["", "-거든요", "-잖아요"],
          [
            "Pendengar udah tau?",
            "Belum. Ini info baru.",
            "Udah. Aku cuma ngingetin.",
          ],
          ["Padanan", "soalnya, gini loh", "kan"],
          [
            "Contoh",
            "저 무슬림이거든요. (ke kenalan baru)",
            "저 무슬림이잖아요. (ke temen lama)",
          ],
        ]),
        callout(
          "info",
          "Ada juga -거든 yang artinya ‘kalau’, misalnya 시간 있거든 연락해 (kalau ada waktu, kabarin). Bentuknya sama, tapi posisinya di tengah kalimat dan diikuti kalimat lain. Yang di akhir kalimat itu ‘soalnya’.",
        ),
        callout(
          "tip",
          "Mau latihan dari arah Indonesia? Cek ",
          ref("soalnya", "ik-alasan", "soalnya"),
          " dan ",
          ref("loh", "ik-partikel", "loh"),
          ".",
        ),
        h3("Coba bikin sendiri"),
        bullet(
          "Aku nggak bisa ikut. Soalnya ada shift malem. (야간 근무가 있다)",
        ),
        callout("success", "저는 못 가요. 야간 근무가 있거든요."),
      ],
    },
    // ───────────────────────────── -네요
    {
      key: "neyo",
      title: "-네요: wah, ternyata",
      blocks: [
        grammar({
          number: "04",
          title: "-네요",
          descriptionKo: "지금 새로 알게 된 것에 놀라거나 감탄할 때 써요.",
          descriptionTranslation:
            "Reaksi spontan waktu kamu baru ngeh sesuatu, saat itu juga. ‘Wah, enak!’, ‘Eh, udah jam lima aja’, ‘Kok jago?’. Kuncinya: kamu baru ngalamin atau liat sendiri barusan.",
          rules: [
            {
              condition: "Kata kerja / sifat",
              form: "-네요",
              example: "맛있다 → 맛있네요",
            },
            {
              condition: "Batang berakhiran ㄹ (ㄹ hilang)",
              form: "-네요",
              example: "멀다 → 머네요, 살다 → 사네요",
            },
            {
              condition: "Bentuk lampau",
              form: "-았/었네요",
              example: "많이 컸네요",
            },
            {
              condition: "Kata benda akhiran vokal",
              form: "-네요",
              example: "다섯 시네요",
            },
            {
              condition: "Kata benda akhiran konsonan",
              form: "-이네요",
              example: "학생이네요",
            },
            {
              condition: "Dugaan (+겠)",
              form: "-겠네요",
              example: "힘들겠네요",
            },
            { condition: "반말", form: "-네", example: "맛있네!" },
          ],
          examples: [
            { before: "와, 이 떡볶이 진짜 맛있", emphasis: "네요", after: "!" },
            { before: "벌써 다섯 시", emphasis: "네요", after: "." },
            { before: "한국어 잘하시", emphasis: "네요", after: "!" },
          ],
          tipKo: "ㄹ로 끝나는 말은 ㄹ이 빠져요: 멀다 → 머네요.",
          tipTranslation:
            "Jebakan ejaan: batang yang berakhiran ㄹ kehilangan ㄹ-nya. 멀다 jadi 머네요, bukan ✗ 멀네요. Di obrolan kamu kadang denger 멀네요, tapi yang baku 머네요.",
          theme: "rose",
        }),
        h3("Artinya apa sih?"),
        p(
          "-네요 adalah suara kamu yang lagi kaget kecil. Di bahasa Indonesia rasanya ",
          i("wah..., ternyata..., kok..., eh..."),
          ". Kamu nggak lagi ngasih info, kamu lagi ",
          b("bereaksi"),
          ".",
        ),
        bullet(i("Wah, enak!"), " → 맛있네요!"),
        bullet(i("Ternyata jauh juga ya."), " → 머네요."),
        bullet(
          i("Kok jago sih bahasa Koreanya?"),
          " → 한국어 잘하시네요!",
          " (kok yang kagum, bukan protes)",
        ),
        h3("Contoh"),
        ex(
          "와, 이 떡볶이 진짜 맛있네요!",
          "Wah, tteokbokki-nya enak banget ternyata!",
        ),
        ex(
          "벌써 다섯 시네요. 퇴근해야겠다.",
          "Eh, udah jam lima aja. Pulang ah.",
        ),
        ex("오늘 사람 진짜 많네요.", "Rame banget ya hari ini."),
        ex(
          "어, 눈 오네요!",
          "Eh, salju turun!",
          "pertama kali liat salju di Korea",
        ),
        ex(
          "한국어 잘하시네요!",
          "Wah, bahasa Koreanya jago ya!",
          "pujian yang bakal sering kamu denger",
        ),
        ex(
          "사진 보니까 날씨 좋네!",
          "Liat fotonya, cuacanya cerah ya!",
          "반말, chat sama bestie",
        ),
        callout(
          "tip",
          "Kalau dipuji ‘한국어 잘하시네요!’, jangan jawab 네 (iya, emang). Jawaban yang natural dan rendah hati: 아니에요, 아직 멀었어요 (ah nggak, masih jauh).",
        ),
        h3("Di obrolan"),
        ...chat(
          [
            {
              who: "민수",
              ko: "리나 씨, 떡볶이 어때요?",
              id: "Rina, tteokbokki-nya gimana?",
            },
            {
              who: "리나",
              ko: "와, 진짜 맛있네요! 근데 좀 맵네요.",
              id: "Wah, enak banget ternyata! Tapi agak pedes ya.",
            },
            {
              who: "민수",
              ko: "ㅋㅋ 물 드릴까요?",
              id: "Wkwk, mau aku ambilin air?",
            },
            {
              who: "리나",
              ko: "네, 감사해요. 어, 벌써 아홉 시네요!",
              id: "Iya, makasih. Eh, udah jam sembilan aja!",
            },
            {
              who: "민수",
              ko: "그러네요. 이제 갈까요?",
              id: "Iya ya. Pulang yuk?",
            },
          ],
          {
            questions: [
              {
                ko: "리나는 떡볶이를 먹고 뭐라고 했어요?",
                id: "Rina bilang apa abis nyobain tteokbokki?",
              },
              {
                ko: "리나는 시계를 보고 왜 ‘-네요’를 썼어요?",
                id: "Kenapa Rina pakai -네요 waktu liat jam?",
              },
            ],
            theme: "rose",
          },
        ),
        callout(
          "warning",
          "Jebakan: -네요 cuma buat hal yang baru kamu sadari. Jangan pakai buat fakta yang udah lama kamu tau, apalagi soal diri sendiri. ✗ 저는 인도네시아 사람이네요 kedengeran kayak kamu baru nyadar kamu orang Indonesia. Cukup bilang 인도네시아 사람이에요.",
        ),
        h3("-네요 vs -군요 vs -더라고요"),
        p(
          "Ketiganya bisa jadi ",
          i("ternyata"),
          ". Bedanya ada di kapan dan dari mana kamu tau.",
        ),
        table([
          ["Pola", "Kapan kamu tau", "Rasanya", "Contoh"],
          [
            ref("-네요", "ki-akhiran-rasa", "neyo"),
            "Barusan, lagi ngalamin",
            "wah!",
            "맛있네요! (lagi makan)",
          ],
          [
            ref("-군요", "ki-akhiran-rasa", "gunyo"),
            "Barusan, sering dari omongan orang",
            "oh gitu ya",
            "아, 그렇군요.",
          ],
          [
            ref("-더라고요", "ki-akhiran-rasa", "deora"),
            "Dulu, terus diceritain sekarang",
            "ternyata (aku liat sendiri)",
            "맛있더라고요. (kemarin aku makan di sana)",
          ],
        ]),
        callout(
          "tip",
          "Latihan dari arah Indonesia: ",
          ref("ternyata", "ik-dugaan", "ternyata"),
          " dan ",
          ref("kok", "ik-partikel", "kok"),
          " (kok yang kagum: ‘kok enak?’ → 맛있네?).",
        ),
      ],
    },
    // ───────────────────────────── -군요
    {
      key: "gunyo",
      title: "-군요 / -구나: oh, gitu ya",
      blocks: [
        grammar({
          number: "05",
          title: "-군요 / -는군요",
          descriptionKo:
            "새로 알게 된 사실을 받아들이면서 ‘아, 그렇구나’ 하고 말할 때 써요.",
          descriptionTranslation:
            "Dipakai waktu kamu baru dapet info dan nerima info itu: ‘oh, gitu ya’, ‘oh, pantes’. Versi 반말-nya, -구나, super sering di drakor dan obrolan santai. Bentuk sopannya (-군요) agak formal, jadi anak muda lebih sering pakai -네요 atau 그렇구나.",
          rules: [
            {
              condition: "Kata sifat",
              form: "-군요",
              example: "예쁘다 → 예쁘군요",
            },
            {
              condition: "Kata kerja (sekarang)",
              form: "-는군요",
              example: "먹다 → 먹는군요",
            },
            { condition: "있다 / 없다", form: "-군요", example: "맛있군요" },
            {
              condition: "Bentuk lampau",
              form: "-았/었군요",
              example: "갔군요, 했군요",
            },
            {
              condition: "Kata benda",
              form: "-(이)군요",
              example: "학생이군요, 친구군요",
            },
            {
              condition: "반말 (kata sifat / benda)",
              form: "-구나 / -(이)구나",
              example: "그렇구나, 휴일이구나",
            },
            {
              condition: "반말 (kata kerja)",
              form: "-는구나",
              example: "매운 거 잘 먹는구나",
            },
          ],
          examples: [
            { before: "아, 그렇", emphasis: "군요", after: "." },
            { before: "그래서 오늘 안 왔", emphasis: "군요", after: "." },
            { before: "아, 오늘 휴일이", emphasis: "구나", after: "!" },
          ],
          tipKo: "형용사에는 ‘-는군요’를 쓰지 않아요.",
          tipTranslation:
            "Kata sifat nggak pakai 는: 예쁘군요, bukan ✗ 예쁘는군요. Persis kayak aturan -는데 / -(으)ㄴ데.",
          theme: "rose",
        }),
        h3("Artinya apa sih?"),
        p(
          "Bayangin temen kamu cerita, terus kamu manggut-manggut: ",
          i("‘Ooh, gitu ya.’ ‘Oh, pantes.’ ‘Oh, jadi dia orang Busan toh.’"),
          " Itulah -군요. Rasanya kayak puzzle yang baru kepasang di kepala kamu.",
        ),
        p(
          "Yang paling wajib kamu hafal: ",
          b("그렇군요"),
          " (sopan) dan ",
          b("그렇구나"),
          " (santai). Dua kata ini aja udah bikin kamu kedengeran kayak pendengar yang baik.",
        ),
        h3("Contoh"),
        ex(
          "A: 저 다음 달에 인도네시아에 돌아가요. B: 아, 그렇군요.",
          "A: Bulan depan aku pulang ke Indonesia. B: Oh, gitu ya.",
        ),
        ex(
          "그래서 민수 씨가 오늘 안 왔군요.",
          "Oh, makanya Minsu hari ini nggak dateng.",
        ),
        ex(
          "매운 걸 잘 드시는군요!",
          "Wah, ternyata kuat makan pedes ya!",
          "sopan, ke orang yang lebih tua",
        ),
        ex("그렇구나. 몰랐어.", "Oh gitu. Aku baru tau.", "반말"),
        ex("아, 오늘 휴일이구나!", "Oh, hari ini tanggal merah toh!", "반말"),
        h3("Di obrolan"),
        ...chat(
          [
            {
              who: "민수",
              ko: "나 사실 부산 출신이야.",
              id: "Aku sebenernya asli Busan loh.",
            },
            {
              who: "리나",
              ko: "아, 그래서 사투리를 쓰는구나!",
              id: "Ooh, pantes logatnya beda!",
            },
            { who: "민수", ko: "티 나? ㅋㅋ", id: "Keliatan ya? Wkwk" },
            {
              who: "리나",
              ko: "응, 완전. 억양이 좀 다르잖아.",
              id: "Iya, banget. Intonasimu kan agak beda.",
            },
          ],
          {
            questions: [
              { ko: "민수는 어디 출신이에요?", id: "Minsu asalnya dari mana?" },
              {
                ko: "리나는 ‘쓰는구나’라고 할 때 그 사실을 원래 알았어요?",
                id: "Waktu bilang 쓰는구나, Rina udah tau dari dulu atau baru tau?",
              },
            ],
          },
        ),
        callout(
          "warning",
          "Jebakan: -군요 di obrolan sopan kedengeran agak kaku atau ‘bapak-bapak’, apalagi dari anak muda. Ke temen kerja seumuran, 아, 그렇구나 atau 아, 그래요? lebih natural. Ke 사장님, 아, 그렇군요 aman dan sopan.",
        ),
        callout(
          "info",
          "Di drakor, kamu juga bakal denger -구나 dipakai buat ngomong ke diri sendiri: 벌써 봄이구나 (udah musim semi ya...). Rasanya kayak monolog kecil.",
        ),
        p(
          "Bandingin sama ",
          ref("-네요", "ki-akhiran-rasa", "neyo"),
          ": -네요 lebih spontan dan kaget (",
          i("wah!"),
          "), -군요 lebih kalem dan nerima (",
          i("oh, gitu"),
          "). Contoh: liat salju turun → 눈이 오네요! Dikasih tau orang kalau di luar salju → 아, 눈이 오는군요.",
        ),
        callout(
          "tip",
          "Pola ‘oh, pantes’ ini nyambung banget sama ",
          ref("pantesan", "ik-dugaan", "pantesan"),
          ": 아, 세일하는구나. 어쩐지 사람이 많더라.",
        ),
      ],
    },
    // ───────────────────────────── -(으)ㄴ/는 것 같다
    {
      key: "geot-gatda",
      title: "-(으)ㄴ/는 것 같다: kayaknya",
      blocks: [
        grammar({
          number: "06",
          title: "-(으)ㄴ/는/(으)ㄹ 것 같다",
          descriptionKo: "추측하거나 자기 생각을 부드럽게 말할 때 써요.",
          descriptionTranslation:
            "Ini kayaknya serba guna. Bisa buat nebak (‘kayaknya mau hujan’) atau buat ngalusin pendapat sendiri (‘kayaknya ini agak kekecilan deh’). Bentuknya berubah tergantung waktu: lagi terjadi, udah terjadi, atau bakal terjadi.",
          rules: [
            {
              condition: "Kata kerja, sekarang",
              form: "-는 것 같다",
              example: "비가 오는 것 같아요",
            },
            {
              condition: "Kata kerja, lampau",
              form: "-(으)ㄴ 것 같다",
              example: "비가 온 것 같아요",
            },
            {
              condition: "Kata kerja / sifat, nanti",
              form: "-(으)ㄹ 것 같다",
              example: "비가 올 것 같아요",
            },
            {
              condition: "Kata sifat, sekarang",
              form: "-(으)ㄴ 것 같다",
              example: "바쁜 것 같아요, 작은 것 같아요",
            },
            {
              condition: "있다 / 없다",
              form: "-는 것 같다",
              example: "맛있는 것 같아요",
            },
            {
              condition: "Kata benda",
              form: "-인 것 같다",
              example: "한국 사람인 것 같아요",
            },
            { condition: "반말", form: "-것 같아", example: "올 것 같아" },
            {
              condition: "Obrolan cepat",
              form: "-거 같아요",
              example: "비 올 거 같아요",
            },
          ],
          examples: [
            {
              before: "하늘 보니까 비가 ",
              emphasis: "올 것 같아요",
              after: ".",
            },
            {
              before: "반장님 오늘 기분이 안 ",
              emphasis: "좋은 것 같아요",
              after: ".",
            },
            { before: "길을 잘못 ", emphasis: "든 것 같아요", after: "." },
          ],
          tipKo: "말할 때는 ‘것’을 ‘거’로 줄여서 많이 말해요.",
          tipTranslation:
            "Di obrolan, 것 hampir selalu jadi 거: 올 거 같아요. Kalau kamu denger ‘거 같아’, itu pola yang sama.",
          theme: "rose",
        }),
        h3("Artinya apa sih?"),
        p(
          "Persis kayak ",
          i("kayaknya"),
          " di bahasa Indonesia, termasuk kebiasaan buruknya. Kita sering bilang ",
          i("‘kayaknya aku laper deh’"),
          " padahal jelas-jelas laper. Orang Korea juga gitu: 배고픈 것 같아요. Fungsinya ngalusin omongan biar nggak terlalu tegas.",
        ),
        h3("Tiga waktu, tiga bentuk"),
        table([
          ["Korea", "Indonesia", "Kenapa"],
          [
            "비가 온 것 같아요.",
            "Kayaknya tadi hujan.",
            "Jalanan basah, hujannya udah lewat.",
          ],
          [
            "비가 오는 것 같아요.",
            "Kayaknya lagi hujan.",
            "Ada suara di atap.",
          ],
          ["비가 올 것 같아요.", "Kayaknya mau hujan.", "Langitnya gelap."],
        ]),
        h3("Contoh"),
        ex(
          "하늘 보니까 비가 올 것 같아요.",
          "Liat langitnya, kayaknya mau hujan.",
        ),
        ex(
          "반장님이 오늘 기분이 안 좋은 것 같아요.",
          "Kayaknya mood 반장님 lagi jelek hari ini.",
        ),
        ex("어? 길을 잘못 든 것 같아요.", "Eh? Kayaknya kita salah jalan."),
        ex(
          "이 옷은 좀 작은 것 같아요.",
          "Kayaknya baju ini agak kekecilan.",
          "halus nolak di toko",
        ),
        ex(
          "저 사람 인도네시아 사람인 것 같아.",
          "Kayaknya orang itu orang Indonesia deh.",
          "반말",
        ),
        ex(
          "이번 주는 못 갈 것 같아요. 죄송해요.",
          "Kayaknya minggu ini aku nggak bisa dateng. Maaf ya.",
          "nolak dengan halus",
        ),
        callout(
          "warning",
          "Jebakan: jangan pakai ‘kayaknya’ buat hal yang harus tegas, apalagi di tempat kerja. Kalau 사장님 nanya 이거 할 수 있어요? terus kamu jawab 할 수 있을 것 같아요, artinya ‘kayaknya sih bisa...’, dan itu bikin dia ragu. Kalau yakin, bilang aja 네, 할 수 있어요!",
        ),
        callout(
          "warning",
          "Jebakan bentuk: kata sifat sekarang pakai -(으)ㄴ, bukan -는. 바쁜 것 같아요, bukan ✗ 바쁘는 것 같아요. Tapi kata sifat yang berakhiran 있다/없다 tetap pakai -는: 맛있는 것 같아요.",
        ),
        p(
          "Ada dua ‘kayaknya’ lain yang lebih spesifik: ",
          ref("-나 봐요", "ki-akhiran-rasa", "na-bwa"),
          " (nebak dari tanda yang kamu liat) dan ",
          ref("-(으)ㄹ걸요", "ki-akhiran-rasa", "eulgeol"),
          " (kayaknya sih, tapi nggak yakin). Tabel perbandingan lengkapnya ada di bagian -(으)ㄹ걸요.",
        ),
        callout(
          "tip",
          "Latihan dari arah Indonesia: ",
          ref("kayaknya", "ik-dugaan", "kayaknya"),
          ".",
        ),
        h3("Coba bikin sendiri"),
        bullet("Kayaknya dia udah pulang. (집에 가다)"),
        bullet("Kayaknya makanan ini pedes. (맵다)"),
        callout(
          "success",
          "집에 간 것 같아요. / 이 음식 매운 것 같아요. (맵다 → 매운)",
        ),
      ],
    },
    // ───────────────────────────── -나 봐요
    {
      key: "na-bwa",
      title: "-나 봐요 / -(으)ㄴ가 봐요: kayaknya (diliat dari tandanya)",
      blocks: [
        grammar({
          number: "07",
          title: "-나 봐요 / -(으)ㄴ가 봐요",
          descriptionKo: "보거나 들은 단서를 보고 추측할 때 써요.",
          descriptionTranslation:
            "Kayaknya versi detektif. Kamu liat atau denger suatu tanda, terus nyimpulin dari situ: ‘antriannya panjang, kayaknya enak’. Hampir selalu soal orang lain atau keadaan di luar kamu, bukan soal pendapat kamu sendiri.",
          rules: [
            {
              condition: "Kata kerja",
              form: "-나 봐요",
              example: "오다 → 오나 봐요",
            },
            {
              condition: "Kata kerja / sifat, lampau",
              form: "-았/었나 봐요",
              example: "못 잤나 봐요",
            },
            {
              condition: "있다 / 없다",
              form: "-나 봐요",
              example: "맛있나 봐요",
            },
            {
              condition: "Kata sifat akhiran vokal",
              form: "-ㄴ가 봐요",
              example: "바쁘다 → 바쁜가 봐요",
            },
            {
              condition: "Kata sifat akhiran konsonan",
              form: "-은가 봐요",
              example: "좋다 → 좋은가 봐요",
            },
            {
              condition: "Kata benda",
              form: "-인가 봐요",
              example: "학생인가 봐요",
            },
            {
              condition: "반말",
              form: "-나 봐 / -(으)ㄴ가 봐",
              example: "자나 봐, 바쁜가 봐",
            },
          ],
          examples: [
            { before: "밖에 비가 ", emphasis: "오나 봐요", after: "." },
            {
              before: "저 식당 줄이 엄청 길어요. ",
              emphasis: "맛있나 봐요",
              after: ".",
            },
            {
              before: "사장님이 전화를 안 받으시네요. ",
              emphasis: "바쁘신가 봐요",
              after: ".",
            },
          ],
          tipKo: "‘보다’가 들어 있지만 ‘보다(see)’의 뜻은 아니에요.",
          tipTranslation:
            "Ada 보다 di dalamnya, tapi artinya bukan ‘melihat’. Anggap aja satu paket: -나 봐요 = ‘kayaknya, diliat dari tandanya’.",
          theme: "rose",
        }),
        h3("Artinya apa sih?"),
        p(
          "Coba inget kalimat kayak gini: ",
          i("‘Dia nguap terus. Kayaknya semalem begadang.’"),
          " Kamu punya bukti (nguap), terus nebak (begadang). Itu tugas -나 봐요. Di bahasa Indonesia kadang rasanya juga ",
          i("‘pasti ... nih’"),
          " atau ",
          i("‘kayaknya sih ... ya’"),
          ".",
        ),
        h3("Contoh"),
        ex(
          "민수 씨가 계속 하품하네요. 어제 잠을 못 잤나 봐요.",
          "Minsu nguap terus. Kayaknya semalem nggak bisa tidur.",
        ),
        ex(
          "사람들이 우산을 쓰고 있어요. 밖에 비가 오나 봐요.",
          "Orang-orang pada pakai payung. Kayaknya di luar hujan.",
        ),
        ex(
          "저 식당 줄이 엄청 길어요. 맛있나 봐요.",
          "Antrian restoran itu panjang banget. Kayaknya enak.",
        ),
        ex(
          "사장님이 전화를 안 받으시네요. 바쁘신가 봐요.",
          "Bos nggak angkat telepon. Kayaknya lagi sibuk.",
        ),
        ex(
          "답장이 없네. 자나 봐.",
          "Nggak dibales. Kayaknya udah tidur.",
          "반말, nunggu chat",
        ),
        ex(
          "제가 많이 피곤했나 봐요. 버스에서 잠들었어요.",
          "Kayaknya aku capek banget deh. Sampe ketiduran di bus.",
          "nebak soal diri sendiri dari ‘bukti’",
        ),
        callout(
          "warning",
          "Jebakan: -나 봐요 nggak dipakai buat pendapat kamu sendiri. Abis nonton film, kamu nggak bilang ✗ 재미있나 봐요 (kayaknya seru), soalnya kamu udah nonton! Bilang 재미있네요 atau 재미있었어요. Pakai -나 봐요 kalau kamu cuma liat orang lain ketawa-ketawa nonton film itu.",
        ),
        h3("-나 봐요 vs -것 같아요"),
        p(
          "Seringnya dua-duanya bisa dipakai. Bedanya, ",
          ref("-것 같아요", "ki-akhiran-rasa", "geot-gatda"),
          " lebih luas: bisa pakai bukti, bisa juga cuma perasaan atau pendapat. -나 봐요 harus ada tanda yang kamu tangkep.",
        ),
        ex(
          "이 옷 좀 작은 것 같아요.",
          "Kayaknya baju ini kekecilan. (pendapatku waktu nyoba)",
        ),
        ex(
          "✗ 이 옷 좀 작은가 봐요.",
          "Kedengeran aneh, karena kamu sendiri yang lagi pakai bajunya.",
        ),
        callout(
          "tip",
          "Latihan dari arah Indonesia: ",
          ref("kayaknya", "ik-dugaan", "kayaknya"),
          " (bagian ‘menebak dari tanda’) dan ",
          ref("jangan-jangan", "ik-dugaan", "jangan-jangan"),
          ".",
        ),
      ],
    },
    // ───────────────────────────── -(으)ㄹ걸요
    {
      key: "eulgeol",
      title: "-(으)ㄹ걸요: kayaknya sih (nggak yakin)",
      blocks: [
        grammar({
          number: "08",
          title: "-(으)ㄹ걸요",
          descriptionKo:
            "확실하지 않은 추측을 말할 때 써요. 혼잣말로 쓰면 후회를 나타내요.",
          descriptionTranslation:
            "Punya dua wajah. (1) Nebak tapi nggak yakin: ‘kayaknya sih udah pulang deh’, ‘setauku sih buka 24 jam’. Sering dipakai buat ngoreksi orang dengan halus. (2) Versi 반말 tanpa -요, diucapin turun, artinya nyesel: ‘harusnya tadi ...’.",
          rules: [
            {
              condition: "Akhiran vokal",
              form: "-ㄹ걸요",
              example: "가다 → 갈걸요",
            },
            {
              condition: "Akhiran konsonan",
              form: "-을걸요",
              example: "있다 → 있을걸요",
            },
            {
              condition: "Batang berakhiran ㄹ",
              form: "-걸요",
              example: "멀다 → 멀걸요",
            },
            {
              condition: "Bentuk lampau",
              form: "-았/었을걸요",
              example: "갔을걸요",
            },
            { condition: "Kata benda", form: "-일걸요", example: "학생일걸요" },
            {
              condition: "Nyesel (반말)",
              form: "-(으)ㄹ걸 (그랬다)",
              example: "우산 가져올걸",
            },
          ],
          examples: [
            { before: "아마 벌써 퇴근", emphasis: "했을걸요", after: "." },
            { before: "그 편의점은 24시간 ", emphasis: "할걸요", after: "." },
            { before: "아, 우산 가져", emphasis: "올걸", after: "..." },
          ],
          tipKo: "추측일 때는 끝을 살짝 올리고, 후회일 때는 내려요.",
          tipTranslation:
            "Nebak: ujungnya naik dikit (갔을걸요↗). Nyesel: ujungnya turun, kayak ngedumel sendiri (가져올걸↘).",
          theme: "rose",
        }),
        h3("Wajah 1: kayaknya sih..."),
        p(
          "Ini ",
          i("kayaknya"),
          " yang paling nggak yakin. Rasanya kayak ",
          i("‘setauku sih...’"),
          " atau ",
          i("‘kayaknya deh, tapi jangan pegang omonganku ya’"),
          ". Sering juga dipakai buat ngoreksi orang secara halus: ",
          i("‘Hmm, kayaknya lebih mahal dari itu deh.’"),
        ),
        ex(
          "A: 민수 씨 사무실에 있어요? B: 아마 벌써 퇴근했을걸요.",
          "A: Minsu ada di kantor? B: Kayaknya sih udah pulang deh.",
        ),
        ex(
          "그 편의점은 24시간 할걸요.",
          "Setauku minimarket itu buka 24 jam deh.",
        ),
        ex(
          "지금 가도 문 닫았을걸요.",
          "Ke sana sekarang juga kayaknya udah tutup sih.",
        ),
        ex(
          "그거 생각보다 비쌀걸요.",
          "Itu kayaknya lebih mahal dari yang kamu kira loh.",
          "ngoreksi halus",
        ),
        h3("Wajah 2: harusnya tadi..."),
        p(
          "Kalau diucapin ke diri sendiri, tanpa -요, -(으)ㄹ걸 artinya nyesel. Sering ditambah 그랬다: -(으)ㄹ걸 그랬어.",
        ),
        ex("아, 우산 가져올걸.", "Aduh, harusnya tadi bawa payung."),
        ex("그냥 택시 탈걸 그랬어.", "Tau gitu tadi naik taksi aja."),
        ex("더 일찍 잘걸...", "Nyesel nggak tidur lebih awal..."),
        p(
          "Penyesalan yang lebih panjang dan serius dibahas di ",
          ref("-았/었어야 했는데", "ki-andai", "asseoya"),
          ". Dari arah Indonesia: ",
          ref("harusnya", "ik-andai", "harusnya"),
          ".",
        ),
        callout(
          "warning",
          "Jebakan bunyi: -(으)ㄹ걸요 dan ",
          ref("-(으)ㄹ게요", "ki-minta-ajak", "eulgeyo"),
          " beda satu huruf, tapi artinya jauh. 갈게요 = ‘aku pergi ya’ (janji). 갈걸요 = ‘kayaknya dia pergi deh’ (nebak). Kalau 반장님 nyuruh sesuatu terus kamu jawab ✗ 할걸요, artinya ‘kayaknya sih dikerjain...’. Yang bener: 네, 할게요!",
        ),
        h3("Tiga ‘kayaknya’ (plus satu ‘pasti’)"),
        table([
          ["Pola", "Rasanya", "Dasarnya", "Contoh"],
          [
            ref("-것 같아요", "ki-akhiran-rasa", "geot-gatda"),
            "kayaknya",
            "Apa aja: bukti, perasaan, pendapat",
            "비가 올 것 같아요.",
          ],
          [
            ref("-나 봐요", "ki-akhiran-rasa", "na-bwa"),
            "kayaknya (dari tanda)",
            "Tanda yang kamu liat atau denger",
            "우산 쓰네. 비가 오나 봐요.",
          ],
          [
            ref("-(으)ㄹ걸요", "ki-akhiran-rasa", "eulgeol"),
            "kayaknya sih (nggak yakin)",
            "Ingatan atau info samar",
            "아마 비 올걸요.",
          ],
          [
            ref("-겠어요", "ki-akhiran-rasa", "getda"),
            "pasti ... (reaksi)",
            "Situasi yang ada di depan mata",
            "하늘 보니까 비 오겠어요.",
          ],
        ]),
        callout(
          "tip",
          "Latihan dari arah Indonesia: ",
          ref("kayaknya", "ik-dugaan", "kayaknya"),
          ", bagian ‘kurang yakin’.",
        ),
      ],
    },
    // ───────────────────────────── -겠-
    {
      key: "getda",
      title: "-겠-: pasti ... ya",
      blocks: [
        grammar({
          number: "09",
          title: "-겠어요 / -겠다",
          descriptionKo:
            "지금 상황을 보고 바로 추측하거나 상대방의 마음을 헤아릴 때 써요.",
          descriptionTranslation:
            "Reaksi langsung dari situasi di depan mata, terutama buat ngerasain perasaan orang lain: ‘pasti capek ya’, ‘pasti kangen keluarga ya’. Juga dipakai waktu liat makanan (‘keliatannya enak!’) dan di beberapa ungkapan tetap kayak 알겠습니다 dan 모르겠어요.",
          rules: [
            {
              condition: "Kata kerja / sifat",
              form: "-겠어요",
              example: "힘들다 → 힘들겠어요",
            },
            {
              condition: "Hal yang udah lewat",
              form: "-았/었겠어요",
              example: "힘들었겠어요",
            },
            {
              condition: "Hormat (orangnya dihormati)",
              form: "-(으)시겠어요",
              example: "힘드시겠어요",
            },
            {
              condition: "Kata benda",
              form: "-(이)겠어요",
              example: "학생이겠어요",
            },
            { condition: "반말, seruan", form: "-겠다", example: "맛있겠다!" },
            { condition: "반말, biasa", form: "-겠어", example: "힘들겠어" },
          ],
          examples: [
            { before: "와, 진짜 ", emphasis: "힘드셨겠어요", after: "." },
            { before: "와, ", emphasis: "맛있겠다", after: "!" },
            { before: "가족이 많이 보고 ", emphasis: "싶겠어요", after: "." },
          ],
          tipKo:
            "‘알겠습니다’는 ‘알았어요’라는 뜻이에요. 지시를 받았을 때 써요.",
          tipTranslation:
            "알겠습니다 = ‘siap, saya ngerti’. Ini jawaban standar waktu dikasih instruksi di tempat kerja.",
          theme: "rose",
        }),
        h3("Artinya apa sih?"),
        p(
          "Dalam bahasa Indonesia, kita sering bilang ",
          i("‘pasti capek ya’"),
          " ke temen yang abis lembur. Kita nggak bener-bener tau dia capek, tapi dari situasinya kita bisa ngerasain. Itu -겠어요. Kalimat ini bikin kamu kedengeran ",
          b("peduli"),
          ", bukan cuma bisa bahasa Korea.",
        ),
        h3("Contoh"),
        ex(
          "A: 어제 열두 시간 일했어요. B: 와, 진짜 힘드셨겠어요.",
          "A: Kemarin aku kerja dua belas jam. B: Wah, pasti capek banget ya.",
        ),
        ex("와, 맛있겠다!", "Wah, keliatannya enak!", "liat makanan dateng"),
        ex(
          "가족이 많이 보고 싶겠어요.",
          "Pasti kangen banget sama keluarga ya.",
        ),
        ex(
          "이렇게 비가 오면 길이 많이 막히겠어요.",
          "Kalau hujannya gini, pasti macet parah nih.",
        ),
        ex(
          "내일 시험이야? 긴장되겠다.",
          "Besok ujian? Pasti deg-degan ya.",
          "반말",
        ),
        h3("Di obrolan"),
        ...chat(
          [
            {
              who: "민수",
              ko: "어제 열두 시간 일했어요.",
              id: "Kemarin aku kerja dua belas jam.",
            },
            {
              who: "리나",
              ko: "와, 진짜 힘들었겠어요.",
              id: "Wah, pasti capek banget ya.",
            },
            {
              who: "민수",
              ko: "네... 그래도 내일은 쉬어요.",
              id: "Iya... tapi besok libur kok.",
            },
            {
              who: "리나",
              ko: "잘됐네요! 푹 쉬세요.",
              id: "Syukur deh! Istirahat yang puas ya.",
            },
          ],
          {
            questions: [
              {
                ko: "민수는 어제 몇 시간 일했어요?",
                id: "Kemarin Minsu kerja berapa jam?",
              },
              {
                ko: "리나는 민수가 힘든 걸 직접 봤어요, 아니면 짐작했어요?",
                id: "Rina liat sendiri Minsu kecapekan, atau cuma ngerasain dari ceritanya?",
              },
            ],
            tip: {
              title: "꿀팁 · TIP",
              ko: "‘-겠어요’ 한마디로 상대방 마음을 알아줄 수 있어요.",
              id: "Satu -겠어요 aja udah bikin kamu kedengeran peduli, bukan cuma bisa bahasa Korea.",
            },
            theme: "rose",
          },
        ),
        h3("Ungkapan tetap yang wajib hafal"),
        table([
          ["Korea", "Kapan dipakai", "Rasanya"],
          [
            "알겠습니다 / 알겠어요",
            "Dikasih instruksi atau penjelasan",
            "Siap, ngerti.",
          ],
          [
            "모르겠어요",
            "Ditanya dan kamu nggak tau",
            "Saya kurang tau. (lebih halus dari 몰라요)",
          ],
          [
            "잘 먹겠습니다",
            "Sebelum makan, apalagi ditraktir",
            "Makasih, saya makan ya.",
          ],
          ["처음 뵙겠습니다", "Pertama kali ketemu, resmi", "Salam kenal."],
          [
            "제가 하겠습니다",
            "Menawarkan diri, resmi",
            "Biar saya yang kerjain.",
          ],
        ]),
        callout(
          "warning",
          "Jebakan EPS: waktu 반장님 ngasih instruksi, jawab 네, 알겠습니다. Jangan 알아요. 알아요 artinya ‘aku udah tau kok’, yang bisa kedengeran kayak kamu nganggap instruksinya nggak perlu. Sama juga: 몰라요 ke atasan kedengeran ketus. Pakai 잘 모르겠어요.",
        ),
        p(
          "Bedanya sama ",
          ref("-것 같아요", "ki-akhiran-rasa", "geot-gatda"),
          ": -겠어요 itu reaksi spontan atas situasi saat ini, kayak ",
          i("‘pasti...’"),
          ". -것 같아요 lebih mikir dan bisa dipakai buat pendapat kamu sendiri. Ke temen yang abis lembur, 힘들겠어요 jauh lebih hangat daripada 힘든 것 같아요.",
        ),
        p(
          "-겠어요 juga sering nempel ke ",
          ref("-네요", "ki-akhiran-rasa", "neyo"),
          ": 힘들겠네요 (wah, pasti capek ya). Ini kombinasi yang super natural buat nanggepin cerita orang.",
        ),
        h3("Coba bikin sendiri"),
        bullet(
          "Temenmu bilang dia baru pindah ke asrama yang jauh dari pabrik. Tanggepin: ‘Pasti repot ya.’ (불편하다)",
        ),
        callout("success", "불편하겠어요. / 불편하겠네요."),
      ],
    },
    // ───────────────────────────── -더라고요
    {
      key: "deora",
      title: "-더라고요 / -더라: ternyata (aku liat sendiri)",
      blocks: [
        grammar({
          number: "10",
          title: "-더라고요 / -더라",
          descriptionKo:
            "과거에 직접 보거나 느낀 것을 지금 다른 사람에게 전할 때 써요.",
          descriptionTranslation:
            "Dipakai buat nyeritain hal yang kamu liat, denger, atau rasain sendiri di masa lalu, dan waktu itu kamu agak kaget. ‘Kemarin aku ke sana, ternyata tutup.’ ‘Orang Korea ternyata makannya cepet banget.’ Kamu jadi saksi mata yang lagi lapor.",
          rules: [
            {
              condition: "Kata kerja / sifat",
              form: "-더라고요",
              example: "맛있다 → 맛있더라고요",
            },
            {
              condition: "Udah terjadi waktu kamu liat",
              form: "-았/었더라고요",
              example: "문 닫았더라고요",
            },
            {
              condition: "Kata benda akhiran vokal",
              form: "-더라고요",
              example: "친구더라고요",
            },
            {
              condition: "Kata benda akhiran konsonan",
              form: "-이더라고요",
              example: "학생이더라고요",
            },
            { condition: "반말", form: "-더라", example: "맛있더라" },
            {
              condition: "Versi lain (dibuka buat lanjut)",
              form: "-던데(요)",
              example: "맛있던데요?",
            },
          ],
          examples: [
            {
              before: "그 식당 가 봤는데 진짜 맛있",
              emphasis: "더라고요",
              after: ".",
            },
            {
              before: "가 보니까 벌써 문 닫았",
              emphasis: "더라고요",
              after: ".",
            },
            { before: "어쩐지 사람이 많", emphasis: "더라", after: "." },
          ],
          tipKo:
            "내가 일부러 한 행동에는 잘 안 써요. 내가 보고 느낀 것에 써요.",
          tipTranslation:
            "Fokusnya apa yang kamu saksiin atau rasain, bukan apa yang kamu sengaja lakuin.",
          theme: "rose",
        }),
        h3("Artinya apa sih?"),
        p(
          "Bayangin kamu lagi cerita ke temen: ",
          i(
            "‘Kemarin aku coba restoran yang viral itu. Ternyata enak banget!’",
          ),
          " Bagian ",
          i("ternyata enak banget"),
          " itu -더라고요. Ada tiga bahan: (1) kejadiannya udah lewat, (2) kamu ngalamin sendiri, (3) ada rasa ‘oh, ternyata’.",
        ),
        h3("Contoh"),
        ex(
          "어제 그 식당 가 봤는데 진짜 맛있더라고요.",
          "Kemarin aku coba ke restoran itu, ternyata enak banget.",
        ),
        ex(
          "한국 사람들은 밥을 진짜 빨리 먹더라고요.",
          "Orang Korea ternyata makannya cepet banget.",
          "pengamatan pas awal kerja di Korea",
        ),
        ex(
          "편의점에 가 봤는데 벌써 문 닫았더라고요.",
          "Aku ke minimarket, ternyata udah tutup.",
        ),
        ex(
          "처음에는 김치가 너무 맵더라고요. 지금은 잘 먹어요.",
          "Awalnya kimchi kerasa pedes banget. Sekarang udah doyan.",
          "perasaan kamu sendiri boleh",
        ),
        ex(
          "민수 여자 친구 봤는데 엄청 예쁘더라.",
          "Aku liat pacarnya Minsu, ternyata cantik banget.",
          "반말",
        ),
        ex(
          "아, 오늘 세일이구나. 어쩐지 사람이 많더라.",
          "Oh, hari ini diskon. Pantesan rame.",
        ),
        h3("Di obrolan"),
        ...chat(
          [
            { who: "지은", ko: "주말에 뭐 했어?", id: "Weekend ngapain?" },
            {
              who: "리나",
              ko: "그 유명한 할랄 식당 가 봤어.",
              id: "Aku nyobain restoran halal yang terkenal itu.",
            },
            { who: "지은", ko: "진짜? 어땠어?", id: "Serius? Gimana?" },
            {
              who: "리나",
              ko: "진짜 맛있더라! 근데 줄이 엄청 길더라.",
              id: "Enak banget ternyata! Tapi antriannya panjang banget.",
            },
            {
              who: "지은",
              ko: "아, 그래서 다들 거기 가는구나.",
              id: "Oh, pantes semua orang pada ke sana.",
            },
          ],
          {
            questions: [
              {
                ko: "리나는 주말에 어디에 갔어요?",
                id: "Weekend kemarin Rina ke mana?",
              },
              {
                ko: "‘맛있더라’는 리나가 직접 먹어 봤다는 뜻이에요?",
                id: "맛있더라 artinya Rina nyobain sendiri atau cuma denger dari orang?",
              },
            ],
            theme: "rose",
          },
        ),
        callout(
          "warning",
          "Jebakan 1: jangan pakai buat tindakan kamu sendiri yang kamu sengaja. ✗ 저는 어제 운동하더라고요 kedengeran kayak kamu nonton diri sendiri olahraga. Cukup 어제 운동했어요. Tapi perasaan dan sensasi kamu sendiri boleh: 저는 좀 무섭더라고요 (aku ternyata agak takut).",
        ),
        callout(
          "warning",
          "Jebakan 2: jangan pakai buat hal yang cuma kamu denger dari orang. Kalau kamu nggak ngalamin sendiri, itu ‘katanya’, pakai ",
          ref("-대요", "ki-akhiran-rasa", "daeyo"),
          ". 맛있더라고요 = aku udah nyobain. 맛있대요 = katanya enak.",
        ),
        h3("Pasangan setianya: 어쩐지"),
        p(
          "-더라 sering nempel ke ",
          ref("어쩐지", "ki-kata-kecil", "eojjeonji"),
          " (pantesan). Polanya: kamu dapet penjelasan, terus nyambungin ke hal aneh yang kamu liat sebelumnya. ",
          b("어쩐지 ... 더라"),
          " = ",
          i("pantesan tadi ..."),
        ),
        p(
          "Perbandingan lengkap -더라고요 dengan -네요 dan -군요 ada di bagian ",
          ref("-네요", "ki-akhiran-rasa", "neyo"),
          ". Kalau ‘ternyata’-nya berupa fakta yang terbongkar, pakai ",
          ref("알고 보니", "ki-kata-kecil", "algo-boni"),
          ".",
        ),
        callout(
          "tip",
          "Latihan dari arah Indonesia: ",
          ref("ternyata", "ik-dugaan", "ternyata"),
          " dan ",
          ref("pantesan", "ik-dugaan", "pantesan"),
          ".",
        ),
      ],
    },
    // ───────────────────────────── -대요 / -래요 / -재요
    {
      key: "daeyo",
      title: "-대요 / -래요 / -재요: katanya, disuruh, diajak",
      blocks: [
        grammar({
          number: "11",
          title: "-대요 / -래요 / -재요 / -냬요",
          descriptionKo: "다른 사람에게 들은 말을 짧게 전할 때 써요.",
          descriptionTranslation:
            "Bentuk singkat buat nyampein omongan orang lain. -대요 = katanya. -래요 = disuruh (atau ‘katanya dia itu ...’ buat kata benda). -재요 = diajak. -냬요 = ditanya. Super sering di tempat kerja, karena kamu bakal sering nyampein pesan 사장님 ke temen.",
          rules: [
            {
              condition: "Katanya: kata kerja, akhiran vokal",
              form: "-ㄴ대요",
              example: "가다 → 간대요",
            },
            {
              condition: "Katanya: kata kerja, akhiran konsonan",
              form: "-는대요",
              example: "먹다 → 먹는대요",
            },
            {
              condition: "Katanya: kata sifat",
              form: "-대요",
              example: "바쁘대요, 좋대요",
            },
            {
              condition: "Katanya: lampau",
              form: "-았/었대요",
              example: "갔대요",
            },
            {
              condition: "Katanya: rencana",
              form: "-(으)ㄹ 거래요",
              example: "갈 거래요",
            },
            {
              condition: "Katanya: kata benda",
              form: "-(이)래요",
              example: "학생이래요, 친구래요",
            },
            {
              condition: "Disuruh",
              form: "-(으)래요",
              example: "오래요, 먹으래요",
            },
            {
              condition: "Disuruh jangan",
              form: "-지 말래요",
              example: "가지 말래요",
            },
            {
              condition: "Diminta (buat dia)",
              form: "-아/어 달래요",
              example: "도와 달래요",
            },
            { condition: "Diajak", form: "-재요", example: "가재요, 먹재요" },
            { condition: "Ditanya", form: "-냬요", example: "언제 오냬요" },
            {
              condition: "반말",
              form: "buang -요",
              example: "간대, 오래, 가재",
            },
          ],
          examples: [
            { before: "민수 씨 오늘 못 ", emphasis: "온대요", after: "." },
            { before: "사장님이 빨리 ", emphasis: "오래요", after: "." },
            { before: "반장님이 점심 같이 ", emphasis: "먹재요", after: "." },
          ],
          tipKo:
            "원래 ‘-다고 해요’, ‘-라고 해요’, ‘-자고 해요’가 줄어든 말이에요.",
          tipTranslation:
            "Ini singkatan: -다고 해요 → -대요, -(으)라고 해요 → -래요, -자고 해요 → -재요, -냐고 해요 → -냬요. Di ujian kamu bakal liat bentuk panjangnya, di obrolan bentuk pendeknya.",
          theme: "rose",
        }),
        h3("Artinya apa sih?"),
        p(
          "Pikirin kayak kamu jadi kurir pesan. Yang kamu sampein bentuknya macem-macem, dan bahasa Indonesia juga punya kata beda buat tiap jenis:",
        ),
        table([
          ["Omongan asli", "Kamu sampein", "Indonesia"],
          ["“바빠요.”", "바쁘대요.", "Katanya dia sibuk."],
          ["“빨리 와!”", "빨리 오래요.", "Disuruh cepet dateng."],
          ["“같이 먹자.”", "같이 먹재요.", "Dia ngajak makan bareng."],
          ["“언제 와?”", "언제 오냬요.", "Dia nanya kapan dateng."],
          ["“저 학생이에요.”", "학생이래요.", "Katanya dia mahasiswa."],
        ]),
        h3("Contoh"),
        ex(
          "사장님이 내일은 일곱 시까지 오래요.",
          "Kata bos, besok disuruh dateng jam tujuh.",
        ),
        ex(
          "민수 씨 오늘 못 온대요. 많이 아프대요.",
          "Minsu katanya nggak bisa dateng hari ini. Katanya sakit parah.",
        ),
        ex("일기예보에서 내일 비 온대요.", "Kata ramalan cuaca, besok hujan."),
        ex("반장님이 점심 같이 먹재요.", "반장님 ngajak makan siang bareng."),
        ex(
          "그 사람 인도네시아 사람이래요.",
          "Katanya orang itu orang Indonesia.",
        ),
        ex(
          "엄마가 밥 꼭 챙겨 먹으래.",
          "Kata mama, makannya jangan sampe telat.",
          "반말, abis video call",
        ),
        h3("Di obrolan"),
        ...chat(
          [
            {
              who: "반장님",
              ko: "리나 씨, 민수 씨한테 내일 일곱 시까지 오라고 해 줘요.",
              id: "Rina, tolong bilangin ke Minsu, besok dateng jam tujuh ya.",
            },
            { who: "리나", ko: "네, 알겠습니다.", id: "Siap, Pak." },
            {
              who: "리나",
              ko: "민수 씨, 반장님이 내일 일곱 시까지 오래요.",
              id: "Minsu, kata 반장님 besok disuruh dateng jam tujuh.",
            },
            {
              who: "민수",
              ko: "일곱 시요? 왜요?",
              id: "Jam tujuh? Kenapa?",
            },
            {
              who: "리나",
              ko: "내일 물건이 많이 들어온대요.",
              id: "Katanya besok barang yang masuk banyak.",
            },
            {
              who: "민수",
              ko: "아, 알겠어요. 고마워요.",
              id: "Oh, oke. Makasih ya.",
            },
          ],
          {
            questions: [
              {
                ko: "민수는 내일 몇 시까지 가야 해요?",
                id: "Besok Minsu harus dateng paling lambat jam berapa?",
              },
              {
                ko: "‘오래요’와 ‘들어온대요’는 어떻게 달라요?",
                id: "Apa bedanya 오래요 sama 들어온대요 di obrolan ini?",
              },
            ],
            tip: {
              title: "꿀팁 · TIP",
              ko: "명령을 전할 때는 ‘-(으)래요’, 사실을 전할 때는 ‘-대요’를 써요.",
              id: "Nyampein suruhan → -(으)래요. Nyampein info → -대요.",
            },
            theme: "rose",
          },
        ),
        callout(
          "info",
          "-대요 juga bisa jadi pertanyaan: 왜 안 온대요? = ‘Katanya kenapa dia nggak dateng?’. Kamu nanya isi omongan orang ketiga.",
        ),
        callout(
          "warning",
          "Jebakan 1: -래요 punya tiga wajah. 사장님이 오래요 = ‘bos nyuruh (kita) dateng’, bukan ‘bos mau dateng’. 학생이래요 = ‘katanya dia mahasiswa’. Dan beda lagi sama ",
          ref("-(으)ㄹ래요", "ki-minta-ajak", "eullaeyo"),
          " = ‘mau ...?’: 먹을래요? (mau makan?) vs 먹으래요 (disuruh makan). Bedanya cuma ㄹ!",
        ),
        callout(
          "warning",
          "Jebakan 2 (ejaan): -대요 (katanya) beda sama -데요. -데요 itu singkatan dari ",
          ref("-더라고요", "ki-akhiran-rasa", "deora"),
          ". 맛있대요 = katanya enak (orang lain yang bilang). 맛있데요 = ternyata enak (aku udah nyobain). Bunyinya hampir sama, jadi orang Korea pun sering salah tulis.",
        ),
        p(
          "Bandingin juga sama ",
          ref("-나 봐요", "ki-akhiran-rasa", "na-bwa"),
          ": -나 봐요 = kamu nebak dari tanda. -대요 = ada orang yang beneran ngomong gitu.",
        ),
        h3("Coba bikin sendiri"),
        bullet(
          "Sampein ke temen: 사장님 bilang “내일 쉬어요.” → Katanya besok libur.",
        ),
        bullet(
          "Sampein ke temen: 반장님 bilang “같이 가자.” → 반장님 ngajak pergi bareng.",
        ),
        callout("success", "내일 쉰대요. / 반장님이 같이 가재요."),
      ],
    },
  ],
  outro: [
    h3("Rangkuman"),
    table([
      ["Pola", "Indonesia", "Kuncinya", "반말"],
      ["-잖아요", "kan", "Pendengar udah tau", "-잖아"],
      ["-죠", "...kan? / ya?", "Minta setuju", "-지"],
      ["-거든요", "soalnya", "Info baru, di belakang", "-거든"],
      ["-네요", "wah, ternyata", "Baru sadar, saat ini juga", "-네"],
      ["-군요", "oh, gitu ya", "Nerima info baru", "-구나"],
      ["-것 같아요", "kayaknya", "Serba guna, ngalusin", "-것 같아"],
      ["-나 봐요", "kayaknya (dari tanda)", "Ada bukti", "-나 봐"],
      ["-(으)ㄹ걸요", "kayaknya sih", "Nggak yakin / nyesel", "-(으)ㄹ걸"],
      ["-겠어요", "pasti ... ya", "Ngerasain situasi orang", "-겠다"],
      ["-더라고요", "ternyata (aku liat)", "Saksi mata, udah lewat", "-더라"],
      [
        "-대요 / -래요",
        "katanya / disuruh",
        "Nyampein omongan orang",
        "-대 / -래",
      ],
    ]),
    h3("Latihan kilat"),
    p("Pilih akhiran yang paling pas."),
    bullet(
      "Temenmu lupa jadwal: ‘Kan aku udah bilang besok libur!’ → 내일 쉰다고 말했(___)!",
    ),
    bullet("Kamu nyicip sup buatan ibu kos: ‘Wah, enak!’ → 맛있(___)!"),
    bullet(
      "Ditanya kenapa nggak ikut makan: ‘Soalnya lagi puasa.’ → 금식 중이(___).",
    ),
    bullet("Temen abis shift malam 12 jam: ‘Pasti capek ya.’ → 피곤하(___)."),
    bullet(
      "Nyampein pesan: ‘Kata bos, besok disuruh dateng jam 7.’ → 사장님이 내일 일곱 시까지 오(___).",
    ),
    callout("success", "잖아요 · 네요 · 거든요 · 겠어요 · 래요"),
    p(
      "Udah bisa ngerasain bedanya kan, soalnya, dan wah ternyata? Gas buktiin di kuis. Kalau ada yang meleset, balik ke bagiannya terus ulang aja.",
    ),
    quizRef(),
  ],
  quiz: {
    title: "Kuis: Akhiran perasaan dan dugaan",
    description:
      "12 soal pilihan ganda: pilih akhiran yang pas sama perasaannya (kan, soalnya, wah ternyata, kayaknya, katanya). Lulus kalau benar minimal 70%.",
    passingScore: 70,
    questions: [
      {
        key: "rasa-janayo-kan",
        prompt:
          "Temenmu nanya jam ketemuan, padahal tadi udah kamu kasih tau. ‘Jam tiga! Kan tadi udah aku bilang~’ → 세 시! 아까 말했(___)~",
        options: [
          { text: "잖아", correct: true },
          { text: "거든" },
          { text: "네" },
          { text: "대" },
        ],
        explanation:
          "Infonya udah diketahui berdua, kamu cuma ngingetin. Itu kan versi -잖아(요). -거든 dipakai buat info yang lawan bicara belum tau.",
      },
      {
        key: "rasa-geodeunyo-soalnya",
        prompt:
          "Kenalan baru nawarin makan siang, padahal kamu lagi puasa. ‘Nggak usah, makasih. Soalnya aku lagi puasa.’ → 괜찮아요. 저 지금 금식 중이(___).",
        options: [
          { text: "거든요", correct: true },
          { text: "잖아요" },
          { text: "네요" },
          { text: "래요" },
        ],
        explanation:
          "Dia belum tau kamu puasa, jadi ini info baru = -거든요 (soalnya). Kalau pakai -잖아요, kesannya ‘kan kamu udah tau aku puasa’.",
      },
      {
        key: "rasa-neyo-reaksi",
        prompt:
          "Kamu baru nyicip tteokbokki dan kaget ternyata enak banget. Reaksi spontanmu?",
        options: [
          { text: "와, 진짜 맛있네요!", correct: true },
          { text: "와, 진짜 맛있잖아요!" },
          { text: "와, 진짜 맛있대요!" },
          { text: "와, 진짜 맛있을걸요!" },
        ],
        explanation:
          "Baru ngalamin saat itu juga dan kaget = -네요 (wah, ternyata). 맛있대요 artinya ‘katanya enak’, padahal kamu yang lagi makan.",
      },
      {
        key: "rasa-jiyo-mastiin",
        prompt:
          "Kamu kira besok libur, tapi mau mastiin ke temen kerja: ‘Besok libur kan?’",
        options: [
          { text: "내일 쉬는 날이죠?", correct: true },
          { text: "내일 쉬는 날이잖아요!" },
          { text: "내일 쉬는 날이네요." },
          { text: "내일 쉬는 날이래요." },
        ],
        explanation:
          "Kan yang nanya dan minta dibenerin = -죠?. -잖아요 udah yakin dan cuma ngingetin, jadi bukan pertanyaan.",
      },
      {
        key: "rasa-gunyo-pantes",
        prompt:
          "Temen bilang dia asli Busan. Kamu manggut-manggut: ‘Ooh, pantes logatnya beda!’",
        options: [
          { text: "아, 그래서 사투리를 쓰는구나!", correct: true },
          { text: "아, 그래서 사투리를 쓰잖아!" },
          { text: "아, 그래서 사투리를 쓰거든!" },
          { text: "아, 그래서 사투리를 쓸게!" },
        ],
        explanation:
          "Baru dapet info terus nerima: ‘oh, gitu ya / oh, pantes’ = -구나 (sopannya -군요). Kata kerja pakai -는구나.",
      },
      {
        key: "rasa-geot-gatda-kekecilan",
        prompt:
          "Lagi nyoba baju di toko, kamu mau nolak halus: ‘Kayaknya agak kekecilan.’",
        options: [
          { text: "좀 작은 것 같아요.", correct: true },
          { text: "좀 작는 것 같아요." },
          { text: "좀 작은가 봐요." },
          { text: "좀 작대요." },
        ],
        explanation:
          "Pendapatmu sendiri = -것 같아요, dan kata sifat sekarang pakai -(으)ㄴ: 작은. -나 봐요/-(으)ㄴ가 봐요 aneh di sini karena kamu sendiri yang lagi pakai bajunya.",
      },
      {
        key: "rasa-na-bwa-tanda",
        prompt:
          "Dari jendela kamu liat orang-orang di luar pada pakai payung. Kamu nyimpulin dari tanda itu:",
        options: [
          { text: "밖에 비가 오나 봐요.", correct: true },
          { text: "밖에 비가 오잖아요." },
          { text: "밖에 비가 온대요." },
          { text: "밖에 비가 올게요." },
        ],
        explanation:
          "Nebak dari tanda yang kamu liat = -나 봐요. -대요 dipakai kalau ada orang yang beneran ngomong gitu (katanya).",
      },
      {
        key: "rasa-eulgeol-eulgeyo",
        prompt: "반장님 nyuruh kamu beresin gudang. Jawaban yang bener?",
        options: [
          { text: "네, 할게요!", correct: true },
          { text: "네, 할걸요." },
          { text: "네, 하네요." },
          { text: "네, 하잖아요." },
        ],
        explanation:
          "-(으)ㄹ게요 = janji ‘aku kerjain ya’. -(으)ㄹ걸요 = ‘kayaknya sih dikerjain...’, nebak dan nggak yakin. Beda satu huruf, artinya jauh!",
      },
      {
        key: "rasa-getda-empati",
        prompt:
          "Rekan kerja cerita kemarin lembur 12 jam. Tanggepan yang paling hangat?",
        options: [
          { text: "와, 진짜 힘들었겠어요.", correct: true },
          { text: "와, 진짜 힘들었잖아요." },
          { text: "와, 진짜 힘들었대요." },
          { text: "와, 진짜 힘들었거든요." },
        ],
        explanation:
          "Ngerasain perasaan orang dari ceritanya = -겠-: ‘pasti capek ya’. Ini bikin kamu kedengeran peduli.",
      },
      {
        key: "rasa-getda-algetseumnida",
        prompt:
          "반장님 selesai ngasih instruksi kerja. Kamu mau bilang ‘siap, saya ngerti’. Yang pas?",
        options: [
          { text: "네, 알겠습니다.", correct: true },
          { text: "네, 알아요." },
          { text: "네, 알걸요." },
          { text: "네, 아네요." },
        ],
        explanation:
          "알겠습니다 itu jawaban standar waktu dikasih instruksi. 알아요 bisa kedengeran ‘aku udah tau kok’, kayak instruksinya nggak perlu.",
      },
      {
        key: "rasa-deora-saksi",
        prompt:
          "Kemarin kamu nyobain restoran baru, ternyata enak banget. Kamu cerita ke temen:",
        options: [
          { text: "어제 가 봤는데 진짜 맛있더라고요.", correct: true },
          { text: "어제 가 봤는데 진짜 맛있대요." },
          { text: "어제 가 봤는데 진짜 맛있나 봐요." },
          { text: "어제 가 봤는데 진짜 맛있겠어요." },
        ],
        explanation:
          "Udah lewat + kamu ngalamin sendiri + ada rasa ‘ternyata’ = -더라고요. 맛있대요 artinya kamu cuma denger dari orang.",
      },
      {
        key: "rasa-daeyo-disuruh",
        prompt: "Temen bilang ‘사장님이 빨리 오래요.’ Artinya?",
        options: [
          { text: "Bos nyuruh (kita) cepet dateng.", correct: true },
          { text: "Bos mau cepet dateng." },
          { text: "Bos nanya kapan kita dateng." },
          { text: "Bos ngajak dateng bareng." },
        ],
        explanation:
          "-(으)래요 = disuruh. ‘Katanya bos mau dateng’ itu 사장님이 온대요, ‘ngajak’ itu -재요, dan ‘nanya’ itu -냬요.",
      },
    ],
  },
});
