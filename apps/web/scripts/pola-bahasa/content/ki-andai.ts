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
  key: "ki-andai",
  title: "Andai-andai dan penyesalan",
  description:
    "Harusnya tadi, coba kalau aja, mendingan, dan tadinya mau. Pola buat nyesel, berandai-andai, dan milih yang lebih baik.",
  intro: [
    opener({
      eyebrow: "PAHAM POLA · BAB 8",
      chapterNumber: "08",
      titleKo: "후회와 아쉬움",
      subtitle:
        "Harusnya tadi, coba kalau aja, mendingan, tadinya mau: paket lengkap buat curhat dan nyesel.",
      question: "어제 왜 안 왔어?",
      answer: "가려고 했는데 일이 늦게 끝났어. 나도 갔으면 좋았을 텐데...",
      focus: [
        {
          label: "문법 · Pola",
          title: "-았/었어야 했는데",
          description: "Harusnya tadi ... Nyesel, dan ada rasa salah.",
        },
        {
          label: "표현 · Kata kunci",
          title: "-는 게 낫다 · -(으)려고 했는데",
          description: "Mendingan ... dan tadinya mau ... (tapi gagal).",
        },
        {
          label: "함정 · Jebakan",
          title: "좋았을 텐데 ≠ 좋겠다",
          description:
            "Yang satu udah lewat (sayang), yang satu harapan ke depan (semoga).",
        },
      ],
      objectives: [
        {
          ko: "지나간 일에 대한 후회와 아쉬움을 말할 수 있어요.",
          id: "Bisa ngungkapin nyesel dan sayang soal hal yang udah lewat.",
        },
        {
          ko: "더 나은 선택을 부드럽게 제안할 수 있어요.",
          id: "Bisa nyaranin pilihan yang lebih oke dengan halus.",
        },
      ],
      theme: "forest",
    }),
    p(
      i(
        "‘Harusnya tadi bawa payung.’ ‘Coba kamu ikut kemarin.’ ‘Mendingan naik subway aja.’ ‘Tadinya mau nelpon, eh lupa.’",
      ),
    ),
    p(
      "Kalimat kayak gini muncul tiap hari, apalagi waktu curhat. Di bahasa Indonesia semuanya pakai kata kecil (",
      i("harusnya, coba, mendingan, tadinya"),
      "). Di bahasa Korea, masing-masing punya pola sendiri. Empat pola di materi ini bakal bikin curhatan kamu kedengeran jauh lebih natural.",
    ),
    table([
      ["Pola", "Rasanya"],
      [ref("-았/었어야 했는데", "ki-andai", "asseoya"), "harusnya (tadi) ..."],
      [
        ref("-았/었으면 좋았을 텐데", "ki-andai", "asseumyeon-teonde"),
        "coba / kalau aja ...",
      ],
      [ref("-는 게 낫다", "ki-andai", "neun-ge-natda"), "mendingan ..."],
      [
        ref("-(으)려고 했는데", "ki-andai", "ryeogo-haenneunde"),
        "tadinya mau ... (tapi)",
      ],
    ]),
  ],
  sections: [
    // ───────────────────────────── -았/었어야 했는데
    {
      key: "asseoya",
      title: "-았/었어야 했는데: harusnya (tadi) ...",
      blocks: [
        grammar({
          number: "01",
          title: "-았/었어야 했는데",
          descriptionKo: "과거에 하지 않은 일을 후회할 때 써요.",
          descriptionTranslation:
            "Nyesel karena sesuatu yang nggak kamu lakuin di masa lalu: ‘harusnya tadi bawa payung’. Ujung -는데 sengaja digantung, kayak kita bilang ‘harusnya tadi...’ terus ngehela napas.",
          rules: [
            {
              condition: "Vokal terakhir ㅏ / ㅗ",
              form: "-았어야 했는데",
              example: "가다 → 갔어야 했는데",
            },
            {
              condition: "Vokal lain",
              form: "-었어야 했는데",
              example: "먹다 → 먹었어야 했는데",
            },
            {
              condition: "하다",
              form: "했어야 했는데",
              example: "예약했어야 했는데",
            },
            {
              condition: "Harusnya nggak",
              form: "-지 말았어야 했는데",
              example: "말하지 말았어야 했는데",
            },
            {
              condition: "Penutup tegas",
              form: "-았/었어야 했어요",
              example: "일찍 출발했어야 했어요",
            },
            {
              condition: "Negur orang (반말)",
              form: "-았/었어야지",
              example: "미리 말했어야지!",
            },
          ],
          examples: [
            { before: "우산을 ", emphasis: "가져왔어야 했는데", after: "." },
            { before: "더 일찍 ", emphasis: "출발했어야 했어요", after: "." },
            {
              before: "그 말은 하지 ",
              emphasis: "말았어야 했는데",
              after: "...",
            },
          ],
          tipKo: "‘-아/어야 하다(해야 하다)’의 과거형이에요.",
          tipTranslation:
            "Ini bentuk lampau dari ‘harus’ (-아/어야 하다). 해야 해요 = harus ngerjain. 했어야 했는데 = harusnya dulu dikerjain.",
          theme: "green",
        }),
        h3("Artinya apa sih?"),
        p(
          "Rumus otaknya: ",
          b("harus"),
          " (",
          ref("-아/어야 하다", "ki-bisa-harus", "aya-hada"),
          ") + ",
          b("dulu"),
          " (lampau) + ",
          b("tapi nggak kejadian"),
          " (-는데). Hasilnya: ",
          i("harusnya tadi ..."),
        ),
        h3("Contoh"),
        ex("아, 우산을 가져왔어야 했는데.", "Aduh, harusnya tadi bawa payung."),
        ex(
          "더 일찍 출발했어야 했어요. 길이 너무 막혀요.",
          "Harusnya berangkat lebih awal. Macet parah.",
        ),
        ex(
          "미리 예약했어야 했는데 자리가 없네요.",
          "Harusnya pesen dari awal, ternyata udah penuh.",
        ),
        ex(
          "어제 일찍 잤어야 했는데 드라마 보다가 새벽 세 시에 잤어요.",
          "Harusnya semalem tidur cepet, malah nonton drakor sampe jam tiga pagi.",
        ),
        ex(
          "그 말은 하지 말았어야 했는데...",
          "Harusnya aku nggak ngomong gitu...",
        ),
        ex(
          "그럼 나한테 미리 말했어야지!",
          "Ya harusnya kamu bilang ke aku dari awal dong!",
          "반말, negur",
        ),
        h3("Di obrolan"),
        ...chat(
          [
            {
              who: "리나",
              ko: "아, 비 온다... 우산 가져왔어야 했는데.",
              id: "Yah, hujan... Harusnya tadi bawa payung.",
            },
            {
              who: "지은",
              ko: "일기예보 안 봤어? 오늘 비 온다고 했잖아.",
              id: "Nggak liat ramalan cuaca? Kan katanya hari ini hujan.",
            },
            {
              who: "리나",
              ko: "응, 늦잠 자서 못 봤어.",
              id: "Iya, bangun kesiangan jadi nggak sempet liat.",
            },
            {
              who: "지은",
              ko: "괜찮아. 내 우산 같이 쓰자.",
              id: "Nggak apa-apa. Pakai payungku bareng yuk.",
            },
          ],
          {
            questions: [
              {
                ko: "리나는 왜 우산이 없어요?",
                id: "Kenapa Rina nggak bawa payung?",
              },
              {
                ko: "‘가져왔어야 했는데’는 후회예요, 추측이에요?",
                id: "가져왔어야 했는데 itu nyesel atau nebak?",
              },
            ],
            theme: "green",
          },
        ),
        callout(
          "warning",
          "Jebakan: ‘harusnya’ di bahasa Indonesia juga dipakai buat dugaan. ‘Harusnya dia udah sampe sekarang’ itu bukan nyesel, tapi nebak. Itu pakai -았/었을 거예요: 지금쯤 도착했을 거예요. Kalau kamu pakai 도착했어야 했는데, artinya jadi ‘harusnya dia udah sampe (tapi belum)’, yang kedengeran kayak ngeluh.",
        ),
        callout(
          "warning",
          "Hati-hati juga sama -았/었어야지 ke orang lain. Itu negur. Wajar dari 반장님 ke pekerja, tapi jangan dipakai ke atasan.",
        ),
        p(
          "Penyesalan yang lebih singkat dan spontan: ",
          ref("-(으)ㄹ걸", "ki-akhiran-rasa", "eulgeol"),
          ". 우산 가져올걸 = ",
          i("tau gitu bawa payung"),
          ".",
        ),
        callout(
          "tip",
          "Latihan dari arah Indonesia: ",
          ref("harusnya", "ik-andai", "harusnya"),
          ".",
        ),
      ],
    },
    // ───────────────────────────── -았/었으면 좋았을 텐데
    {
      key: "asseumyeon-teonde",
      title: "-았/었으면 좋았을 텐데: coba / kalau aja ...",
      blocks: [
        grammar({
          number: "02",
          title: "-았/었으면 좋았을 텐데",
          descriptionKo:
            "이미 지나간 일에 대해 ‘그랬다면 좋았을 거예요’라고 아쉬워할 때 써요.",
          descriptionTranslation:
            "Berandai-andai soal masa lalu yang udah nggak bisa diubah: ‘coba kamu ikut kemarin’, ‘kalau aja aku belajar lebih awal’. Rasanya sayang dan agak nyesek. Saudaranya, -았/었으면 좋겠다, dipakai buat harapan ke depan: ‘semoga ...’, ‘pengennya ...’.",
          rules: [
            {
              condition: "Vokal terakhir ㅏ / ㅗ",
              form: "-았으면 좋았을 텐데",
              example: "가다 → 갔으면 좋았을 텐데",
            },
            {
              condition: "Vokal lain",
              form: "-었으면 좋았을 텐데",
              example: "배우다 → 배웠으면 좋았을 텐데",
            },
            {
              condition: "하다",
              form: "했으면 좋았을 텐데",
              example: "같이 했으면 좋았을 텐데",
            },
            {
              condition: "Kata benda",
              form: "-였/이었으면 좋았을 텐데",
              example: "주말이었으면 좋았을 텐데",
            },
            {
              condition: "Harapan ke depan",
              form: "-았/었으면 좋겠다",
              example: "내일 비가 안 왔으면 좋겠어요",
            },
            {
              condition: "Andai (hasil lain)",
              form: "-았/었으면 -았/었을 거예요",
              example: "알았으면 왔을 거예요",
            },
          ],
          examples: [
            {
              before: "너도 같이 ",
              emphasis: "갔으면 좋았을 텐데",
              after: ".",
            },
            {
              before: "한국어를 더 일찍 ",
              emphasis: "배웠으면 좋았을 텐데",
              after: ".",
            },
            {
              before: "내일 비가 안 ",
              emphasis: "왔으면 좋겠어요",
              after: ".",
            },
          ],
          tipKo: "‘-았/었으면 좋겠다’는 지금이나 앞으로의 바람이에요.",
          tipTranslation:
            "Bentuknya mirip, tapi beda waktu. 좋았을 텐데 = udah lewat, sayang. 좋겠다 = semoga nanti kejadian.",
          theme: "green",
        }),
        h3("Artinya apa sih?"),
        p(
          "Pecah jadi tiga: ",
          b("-았/었으면"),
          " (kalau dulu ...) + ",
          b("좋았을"),
          " (pasti bagus) + ",
          b("텐데"),
          " (tapi kenyataannya nggak). Hasilnya kalimat ",
          i("‘coba kalau ..., pasti ...’"),
          " yang ujungnya digantung.",
        ),
        h3("Contoh"),
        ex(
          "어제 너도 같이 갔으면 좋았을 텐데.",
          "Coba kemarin kamu ikut. Seru banget padahal.",
        ),
        ex(
          "조금만 더 일찍 왔으면 좋았을 텐데.",
          "Coba kamu dateng sedikit lebih awal.",
        ),
        ex(
          "한국어를 더 일찍 배웠으면 좋았을 텐데.",
          "Kalau aja aku belajar bahasa Korea dari dulu.",
        ),
        ex(
          "오늘이 주말이었으면 좋겠다.",
          "Pengennya hari ini weekend.",
          "harapan, 반말",
        ),
        ex("돈이 좀 더 있었으면 좋겠어요.", "Pengen punya duit lebih dikit."),
        ex(
          "미리 알았으면 도와줬을 거예요.",
          "Kalau aku tau dari awal, pasti aku bantuin.",
        ),
        h3("Di obrolan"),
        ...chat(
          [
            {
              who: "지은",
              ko: "어제 콘서트 진짜 대박이었어!",
              id: "Konser kemarin gila banget!",
            },
            {
              who: "리나",
              ko: "아, 나도 갔으면 좋았을 텐데... 일 때문에 못 갔어.",
              id: "Yah, coba aku bisa ikut... Gara-gara kerja nggak bisa dateng.",
            },
            {
              who: "지은",
              ko: "다음에는 꼭 같이 가자. 표는 내가 미리 예매할게.",
              id: "Next time pokoknya bareng ya. Tiketnya aku pesenin duluan.",
            },
            {
              who: "리나",
              ko: "진짜? 다음 콘서트는 주말이었으면 좋겠다!",
              id: "Serius? Semoga konser berikutnya pas weekend!",
            },
          ],
          {
            questions: [
              {
                ko: "리나는 왜 콘서트에 못 갔어요?",
                id: "Kenapa Rina nggak bisa nonton konser?",
              },
              {
                ko: "‘좋았을 텐데’와 ‘좋겠다’는 어떻게 달라요?",
                id: "Apa bedanya 좋았을 텐데 sama 좋겠다 di obrolan ini?",
              },
            ],
            tip: {
              title: "꿀팁 · TIP",
              ko: "지나간 일은 ‘좋았을 텐데’, 앞으로의 바람은 ‘좋겠다’예요.",
              id: "Udah lewat → 좋았을 텐데 (sayang). Belum kejadian → 좋겠다 (semoga).",
            },
          },
        ),
        callout(
          "warning",
          "Jebakan: ‘coba’ di bahasa Indonesia punya dua arti. ‘Coba deh’ = nyoba, pakai ",
          ref("-아/어 보다", "ki-keadaan", "a-boda"),
          ". ‘Coba kamu dateng kemarin’ = berandai-andai, pakai pola ini. Jangan sampai bilang 어제 와 보세요 buat ‘coba kemarin kamu dateng’.",
        ),
        p(
          "Bedanya sama ",
          ref("-았/었어야 했는데", "ki-andai", "asseoya"),
          ": -았/었어야 했는데 fokus ke ‘harusnya aku ngelakuin’ (ada rasa salah). -았/었으면 좋았을 텐데 fokus ke ‘pasti lebih enak kalau ...’ (rasa sayang). Ke temen yang nggak bisa dateng, pakai yang kedua biar nggak kedengeran nyalahin.",
        ),
        callout(
          "tip",
          "Latihan dari arah Indonesia: ",
          ref("coba / kalau aja", "ik-andai", "kalau-aja"),
          ".",
        ),
      ],
    },
    // ───────────────────────────── -는 게 낫다
    {
      key: "neun-ge-natda",
      title: "-는 게 낫다: mendingan ...",
      blocks: [
        grammar({
          number: "03",
          title: "-는 게 낫다",
          descriptionKo: "두 가지 중에서 어느 쪽이 더 좋은지 말할 때 써요.",
          descriptionTranslation:
            "Artinya ‘mendingan ...’ atau ‘lebih baik ...’. Dipakai buat milih antara dua pilihan atau nyaranin dengan halus. 낫다 sendiri artinya ‘lebih baik’, dan 게 adalah singkatan dari 것이 (hal ...). Jadi secara harfiah: ‘yang ... itu lebih baik’.",
          rules: [
            {
              condition: "Kata kerja",
              form: "-는 게 낫다",
              example: "타다 → 타는 게 나아요",
            },
            {
              condition: "Negatif",
              form: "안 -는 게 / -지 않는 게 낫다",
              example: "안 가는 게 나아요",
            },
            {
              condition: "Lebih halus",
              form: "-는 게 나을 것 같아요",
              example: "쉬는 게 나을 것 같아요",
            },
            {
              condition: "Bandingin dua hal",
              form: "A보다 B가 (더) 낫다",
              example: "이거보다 저게 나아요",
            },
            {
              condition: "Nyaranin (sebaiknya)",
              form: "-는 게 좋겠어요",
              example: "병원에 가는 게 좋겠어요",
            },
            {
              condition: "반말",
              form: "-는 게 나아 / 낫지",
              example: "택시 타는 게 나아",
            },
          ],
          examples: [
            {
              before: "지금은 지하철 ",
              emphasis: "타는 게 나아요",
              after: ".",
            },
            {
              before: "아프면 오늘은 ",
              emphasis: "쉬는 게 나을 것 같아요",
              after: ".",
            },
            { before: "이거보다 저게 더 ", emphasis: "나아요", after: "." },
          ],
          tipKo: "‘낫다’는 ㅅ 불규칙이에요: 나아요, 나았어요.",
          tipTranslation:
            "낫다 itu ㅅ tidak beraturan: ㅅ-nya hilang sebelum vokal. 나아요, bukan 낫아요.",
          theme: "green",
        }),
        h3("Artinya apa sih?"),
        p(
          "Sama persis kayak ",
          i("mendingan"),
          " waktu kita lagi nimbang-nimbang: ",
          i("‘Jam segini macet. Mendingan naik subway.’"),
          " Kamu bandingin dua pilihan, terus nunjuk yang lebih oke.",
        ),
        h3("Contoh"),
        ex(
          "지금은 길이 막히니까 지하철 타는 게 나아요.",
          "Jam segini macet, mendingan naik subway.",
        ),
        ex(
          "아프면 오늘은 쉬는 게 나을 것 같아요.",
          "Kalau lagi sakit, kayaknya mendingan hari ini istirahat.",
        ),
        ex(
          "사장님한테 솔직하게 말하는 게 나아요.",
          "Mendingan jujur aja ke bos.",
        ),
        ex(
          "혼자 가는 것보다 같이 가는 게 낫지.",
          "Mending pergi bareng daripada sendirian.",
          "반말",
        ),
        ex(
          "이 색보다 저 색이 더 나아요.",
          "Warna yang itu lebih oke daripada yang ini.",
          "milih baju",
        ),
        h3("Di obrolan"),
        ...chat(
          [
            {
              who: "민수",
              ko: "리나 씨, 공항까지 택시 타고 갈까요?",
              id: "Rina, ke bandara naik taksi aja?",
            },
            {
              who: "리나",
              ko: "지금 퇴근 시간이라 길이 막힐 거예요. 지하철 타는 게 나아요.",
              id: "Sekarang jam pulang kerja, pasti macet. Mendingan naik subway.",
            },
            {
              who: "민수",
              ko: "그래요? 근데 짐이 좀 많은데...",
              id: "Gitu ya? Tapi barangku agak banyak...",
            },
            {
              who: "리나",
              ko: "그럼 공항버스 타는 게 나을 것 같아요. 짐 넣는 곳도 있어요.",
              id: "Kalau gitu kayaknya mendingan naik bus bandara. Ada bagasinya juga.",
            },
          ],
          {
            questions: [
              {
                ko: "리나는 왜 택시가 별로라고 했어요?",
                id: "Kenapa menurut Rina naik taksi kurang oke?",
              },
              {
                ko: "마지막에 리나는 뭘 타라고 했어요?",
                id: "Akhirnya Rina nyaranin naik apa?",
              },
            ],
            theme: "green",
          },
        ),
        callout(
          "warning",
          "Jebakan ejaan dan bunyi: 낫다 (lebih baik / sembuh), 낳다 (melahirkan), dan 났다 (lampau dari 나다, muncul) bunyinya mirip banget. Satu lagi: 낫다 juga artinya ‘sembuh’: 감기가 다 나았어요 = flunya udah sembuh. Konteks yang nentuin.",
        ),
        p(
          "Kalau ‘mendingan’-nya bernada pasrah, kayak ",
          i("‘udahlah, mending aku aja yang kerjain’"),
          ", pakai ",
          ref("차라리", "ki-kata-kecil", "charari"),
          ": 차라리 내가 할게요.",
        ),
        callout(
          "tip",
          "Latihan dari arah Indonesia: ",
          ref("mendingan", "ik-alasan", "mendingan"),
          ".",
        ),
      ],
    },
    // ───────────────────────────── -(으)려고 했는데
    {
      key: "ryeogo-haenneunde",
      title: "-(으)려고 했는데: tadinya mau ... (tapi)",
      blocks: [
        grammar({
          number: "04",
          title: "-(으)려고 했는데",
          descriptionKo: "하려고 계획했지만 그렇게 되지 않았을 때 써요.",
          descriptionTranslation:
            "Artinya ‘tadinya mau ..., tapi ...’. Kamu udah niat, tapi rencananya gagal atau berubah. Sering dipakai buat minta maaf atau ngejelasin kenapa sesuatu nggak jadi. Kalimatnya juga sering sengaja digantung: ‘tadinya mau sih...’.",
          rules: [
            {
              condition: "Akhiran vokal / ㄹ",
              form: "-려고 했는데",
              example: "가다 → 가려고 했는데, 만들다 → 만들려고 했는데",
            },
            {
              condition: "Akhiran konsonan",
              form: "-으려고 했는데",
              example: "먹다 → 먹으려고 했는데",
            },
            {
              condition: "하다",
              form: "하려고 했는데",
              example: "전화하려고 했는데",
            },
            {
              condition: "Pas banget baru mau",
              form: "-(으)려던 참이었어요",
              example: "연락하려던 참이었어요",
            },
            {
              condition: "Rencana yang masih jalan",
              form: "-(으)려고 해요",
              example: "다음 달에 가려고 해요",
            },
            {
              condition: "반말",
              form: "-(으)려고 했는데",
              example: "하려고 했는데...",
            },
          ],
          examples: [
            {
              before: "어제 ",
              emphasis: "전화하려고 했는데",
              after: " 깜빡했어요.",
            },
            {
              before: "오늘 ",
              emphasis: "운동하려고 했는데",
              after: " 비가 와서 못 했어요.",
            },
            { before: "마침 연락", emphasis: "하려던 참이었어요", after: "!" },
          ],
          tipKo:
            "‘-려던 참이었어요’는 ‘마침 그렇게 하려고 했어요’라는 뜻이에요.",
          tipTranslation:
            "Bonus: -(으)려던 참이었어요 = ‘baru aja mau ...!’. Pas temen nelpon duluan: 저도 전화하려던 참이었어요! (Aku juga baru mau nelpon!)",
          theme: "green",
        }),
        h3("Artinya apa sih?"),
        p(
          "Jembatannya: ",
          b("-(으)려고"),
          " (niatnya) + ",
          b("했는데"),
          " (udah ada rencana, tapi...). Di bahasa Indonesia: ",
          i("tadinya mau..., niatnya..., padahal tadinya..."),
        ),
        h3("Contoh"),
        ex(
          "어제 전화하려고 했는데 깜빡했어요. 죄송해요.",
          "Kemarin tadinya mau nelpon, tapi lupa. Maaf ya.",
        ),
        ex(
          "오늘 운동하려고 했는데 비가 와서 못 했어요.",
          "Hari ini tadinya mau olahraga, tapi hujan jadi nggak jadi.",
        ),
        ex(
          "일찍 자려고 했는데 결국 새벽까지 게임했어요.",
          "Niatnya tidur cepet, ujung-ujungnya main game sampe subuh.",
        ),
        ex(
          "그 신발 사려고 했는데 벌써 다 팔렸어요.",
          "Tadinya mau beli sepatu itu, eh udah sold out.",
        ),
        ex(
          "A: 왜 연락 안 했어? B: 하려고 했는데...",
          "A: Kok nggak ngabarin? B: Tadinya mau sih...",
          "반말, digantung",
        ),
        h3("Di obrolan"),
        ...chat(
          [
            {
              who: "지은",
              ko: "여보세요? 리나야, 어제 왜 연락 안 했어?",
              id: "Halo? Rin, kok kemarin nggak ngabarin?",
            },
            {
              who: "리나",
              ko: "아, 안 그래도 지금 전화하려던 참이었어!",
              id: "Eh, pas banget, aku baru mau nelpon kamu!",
            },
            {
              who: "지은",
              ko: "진짜? ㅋㅋ 어제 계속 기다렸잖아.",
              id: "Masa? Wkwk. Kan kemarin aku nungguin terus.",
            },
            {
              who: "리나",
              ko: "미안해. 연락하려고 했는데 깜빡 잠들었어.",
              id: "Maaf ya. Tadinya mau ngabarin, tapi ketiduran.",
            },
            {
              who: "지은",
              ko: "괜찮아. 그럼 오늘 저녁 같이 먹을래?",
              id: "Nggak apa-apa. Kalau gitu, nanti malem makan bareng yuk?",
            },
          ],
          {
            questions: [
              {
                ko: "리나는 어제 왜 연락을 못 했어요?",
                id: "Kenapa kemarin Rina nggak ngabarin?",
              },
              {
                ko: "‘전화하려던 참이었어’는 무슨 뜻이에요?",
                id: "전화하려던 참이었어 artinya apa?",
              },
            ],
            tip: {
              title: "꿀팁 · TIP",
              ko: "‘안 그래도’를 같이 쓰면 ‘마침’이라는 느낌이 더 강해져요.",
              id: "Tambahin 안 그래도 (pas banget nih) biar rasa ‘baru aja mau’ makin kerasa.",
            },
            theme: "green",
          },
        ),
        callout(
          "warning",
          "Jebakan: -(으)려고 dan -(으)러 sama-sama sering diterjemahin ‘untuk’. ",
          ref("-(으)려고", "ki-alasan-urutan", "ryeogo"),
          " = niat atau tujuan, bisa dipakai sama kata kerja apa aja. ",
          ref("-(으)러", "ki-alasan-urutan", "reo"),
          " cuma bisa diikuti 가다/오다/다니다. Pola ‘tadinya mau’ selalu pakai -려고 했는데, bukan ✗ -러 했는데.",
        ),
        p(
          "Kalau rencananya batal karena keputusan, pakai ",
          ref("안 -기로 했어요", "ki-bisa-harus", "giro-hada"),
          ". Kalau nggak jadinya setelah lama mikir, tambahin ",
          ref("결국", "ki-kata-kecil", "gyeolguk"),
          ".",
        ),
        callout(
          "tip",
          "Latihan dari arah Indonesia: ",
          ref("padahal tadinya mau...", "ik-padahal", "rencana"),
          " dan ",
          ref("nggak jadi", "ik-waktu", "nggak-jadi"),
          ".",
        ),
        h3("Coba bikin sendiri"),
        bullet(
          "Tadinya mau masak, tapi capek banget jadi beli di minimarket. (요리하다, 편의점에서 사다)",
        ),
        callout(
          "success",
          "요리하려고 했는데 너무 피곤해서 편의점에서 샀어요.",
        ),
      ],
    },
  ],
  outro: [
    h3("Rangkuman"),
    table([
      ["Pola", "Indonesia", "Rasanya", "Contoh"],
      [
        "-았/었어야 했는데",
        "harusnya tadi",
        "Nyesel, ada rasa salah",
        "우산을 가져왔어야 했는데",
      ],
      [
        "-았/었으면 좋았을 텐데",
        "coba / kalau aja",
        "Sayang, udah lewat",
        "같이 갔으면 좋았을 텐데",
      ],
      [
        "-았/었으면 좋겠다",
        "semoga / pengennya",
        "Harapan ke depan",
        "비가 안 왔으면 좋겠어요",
      ],
      [
        "-는 게 낫다",
        "mendingan",
        "Milih yang lebih oke",
        "지하철 타는 게 나아요",
      ],
      ["-(으)려고 했는데", "tadinya mau", "Rencana gagal", "전화하려고 했는데"],
    ]),
    h3("Latihan kilat"),
    bullet("Harusnya tadi aku makan dulu. (먹다)"),
    bullet("Coba kemarin cuacanya cerah. (날씨가 좋다)"),
    bullet("Mendingan tanya ke 반장님. (물어보다)"),
    bullet("Tadinya mau ke pasar, tapi tutup. (시장에 가다, 문을 닫다)"),
    callout(
      "success",
      "먹었어야 했는데 · 어제 날씨가 좋았으면 좋았을 텐데 · 반장님한테 물어보는 게 나아요 · 시장에 가려고 했는데 문을 닫았어요",
    ),
    p(
      "Udah bisa bedain nyesel, sayang, mendingan, dan tadinya mau? Gas buktiin di kuis. Kalau ada yang salah, baca lagi bagiannya terus ulang aja.",
    ),
    quizRef(),
  ],
  quiz: {
    title: "Kuis: Andai-andai dan penyesalan",
    description:
      "11 soal pilihan ganda: harusnya tadi, coba kalau aja, mendingan, dan tadinya mau. Lulus kalau benar minimal 70%.",
    passingScore: 70,
    questions: [
      {
        key: "andai-asseoya-payung",
        prompt: "‘Aduh, harusnya tadi bawa payung.’ Bahasa Koreanya?",
        options: [
          { text: "아, 우산을 가져왔어야 했는데.", correct: true },
          { text: "아, 우산을 가져오려고 했는데." },
          { text: "아, 우산을 가져왔으면 좋겠어요." },
          { text: "아, 우산을 가져와 봤어요." },
        ],
        explanation:
          "Nyesel karena nggak ngelakuin sesuatu = -았/었어야 했는데. 가져오려고 했는데 artinya ‘tadinya mau bawa’, dan 좋겠어요 itu harapan ke depan.",
      },
      {
        key: "andai-asseoya-jimalgo",
        prompt: "‘Harusnya aku nggak ngomong gitu...’ yang pas?",
        options: [
          { text: "그 말은 하지 말았어야 했는데...", correct: true },
          { text: "그 말은 하려고 했는데..." },
          { text: "그 말은 하지 마세요..." },
          { text: "그 말은 안 했으면 좋겠어요..." },
        ],
        explanation:
          "‘Harusnya nggak’ = -지 말았어야 했는데. 하지 마세요 itu larangan ke orang lain, bukan nyesel.",
      },
      {
        key: "andai-harusnya-dugaan",
        prompt:
          "‘Harusnya dia udah sampe sekarang.’ Di sini ‘harusnya’ artinya nebak, bukan nyesel. Yang pas?",
        options: [
          { text: "지금쯤 도착했을 거예요.", correct: true },
          { text: "지금쯤 도착했어야 했는데요." },
          { text: "지금쯤 도착하려고 했어요." },
          { text: "지금쯤 도착하는 게 나아요." },
        ],
        explanation:
          "‘Harusnya’ yang nebak pakai -았/었을 거예요. Kalau pakai 도착했어야 했는데, artinya jadi ngeluh: ‘harusnya udah sampe (tapi kok belum)’.",
      },
      {
        key: "andai-teonde-coba",
        prompt: "‘Coba kemarin kamu ikut. Seru banget padahal.’ Yang pas?",
        options: [
          { text: "어제 너도 같이 갔으면 좋았을 텐데.", correct: true },
          { text: "어제 너도 같이 가 봐." },
          { text: "어제 너도 같이 가려고 했는데." },
          { text: "어제 너도 같이 갔으면 좋겠다." },
        ],
        explanation:
          "‘Coba’ yang berandai-andai soal masa lalu = -았/었으면 좋았을 텐데. 가 봐 itu ‘coba’ yang nyoba, dan 좋겠다 dipakai buat yang belum kejadian.",
      },
      {
        key: "andai-joketda-harapan",
        prompt: "‘Semoga besok nggak hujan.’ Yang pas?",
        options: [
          { text: "내일 비가 안 왔으면 좋겠어요.", correct: true },
          { text: "내일 비가 안 왔으면 좋았을 텐데." },
          { text: "내일 비가 안 왔어야 했는데." },
        ],
        explanation:
          "Harapan ke depan = -았/었으면 좋겠다. Bentuknya lampau, tapi artinya ‘semoga’. 좋았을 텐데 cuma buat yang udah lewat.",
      },
      {
        key: "andai-teonde-temen",
        prompt:
          "Temenmu nggak bisa dateng ke acara ultahmu karena kerja. Kamu mau bilang sayang, tapi tanpa nyalahin dia. Yang paling pas?",
        options: [
          { text: "너도 왔으면 좋았을 텐데. 다음에 보자!", correct: true },
          { text: "너도 왔어야지!" },
          { text: "너도 왔어야 했는데." },
        ],
        explanation:
          "-았/었으면 좋았을 텐데 fokus ke ‘sayang ya’. 왔어야지 itu negur, dan 왔어야 했는데 ke orang lain kedengeran kayak nyalahin.",
      },
      {
        key: "andai-natda-subway",
        prompt: "‘Jam segini macet. Mendingan naik subway.’ Bagian keduanya?",
        options: [
          { text: "지하철 타는 게 나아요.", correct: true },
          { text: "지하철 탔어야 했는데요." },
          { text: "지하철 타려고 했어요." },
          { text: "지하철 타 버렸어요." },
        ],
        explanation:
          "Milih yang lebih oke dari dua pilihan = -는 게 낫다. Mau lebih halus lagi: 지하철 타는 게 나을 것 같아요.",
      },
      {
        key: "andai-natda-ejaan",
        prompt: "낫다 + -아요 jadi apa?",
        options: [
          { text: "나아요", correct: true },
          { text: "낫아요" },
          { text: "낳아요" },
          { text: "났어요" },
        ],
        explanation:
          "낫다 itu ㅅ tidak beraturan: ㅅ-nya hilang sebelum vokal, jadi 나아요. 낳아요 itu dari 낳다 (melahirkan), beda kata.",
      },
      {
        key: "andai-charari",
        prompt:
          "Nada pasrah: ‘Udahlah, mending aku aja yang kerjain.’ Yang paling pas?",
        options: [
          { text: "차라리 내가 할게요.", correct: true },
          { text: "내가 했어야 했는데요." },
          { text: "내가 하려고 했는데요." },
          { text: "내가 했으면 좋았을 텐데요." },
        ],
        explanation:
          "‘Mending ... aja’ yang pasrah pakai 차라리. Kalau sarannya netral (mendingan naik subway), baru pakai -는 게 낫다.",
      },
      {
        key: "andai-ryeogo-telpon",
        prompt: "‘Kemarin tadinya mau nelpon, tapi lupa.’ Yang bener?",
        options: [
          { text: "어제 전화하려고 했는데 깜빡했어요.", correct: true },
          { text: "어제 전화하러 했는데 깜빡했어요." },
          { text: "어제 전화해 버렸는데 깜빡했어요." },
          { text: "어제 전화했으면 좋겠는데 깜빡했어요." },
        ],
        explanation:
          "‘Tadinya mau ... tapi’ selalu -(으)려고 했는데. -(으)러 cuma bisa diikuti 가다/오다/다니다, jadi ✗ 하러 했는데 salah.",
      },
      {
        key: "andai-ryeodeon-cham",
        prompt:
          "Temen nelpon duluan, padahal kamu juga baru mau nelpon dia. Kamu bilang: ‘Aku juga baru mau nelpon!’",
        options: [
          { text: "저도 전화하려던 참이었어요!", correct: true },
          { text: "저도 전화했어야 했는데요!" },
          { text: "저도 전화해 봤어요!" },
          { text: "저도 전화하는 게 나아요!" },
        ],
        explanation:
          "-(으)려던 참이었어요 = ‘baru aja mau ...’. Pas banget buat momen kebetulan kayak gini, apalagi ditambah 안 그래도.",
      },
    ],
  },
});
