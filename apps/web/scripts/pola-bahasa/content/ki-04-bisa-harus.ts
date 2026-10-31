import { b, callout, defineBab, ex, grammar, h3, i, p, ref } from "../blocks";

export default defineBab({
  key: "ki-04-bisa-harus",
  materials: {
    "ki-go-sipda": {
      description:
        "-고 싶다 artinya ingin atau pengen. Buat keinginan orang lain, pakai -고 싶어 하다.",
      blocks: [
        grammar({
          number: "01",
          title: "-고 싶다 / -고 싶어 하다",
          descriptionKo: "하고 싶은 일이나 바라는 것을 말할 때 써요.",
          descriptionTranslation:
            "Artinya “pengen” atau “mau”. Tempel -고 싶다 ke kata kerja, bentuknya sama buat semua. Kalau yang pengen orang lain (dia, temenku, adikku), ganti jadi -고 싶어 하다.",
          rules: [
            {
              condition: "Akhiran vokal",
              form: "-고 싶어요",
              example: "가다 → 가고 싶어요",
            },
            {
              condition: "Akhiran konsonan",
              form: "-고 싶어요",
              example: "먹다 → 먹고 싶어요",
            },
            {
              condition: "Negatif",
              form: "-고 싶지 않아요",
              example: "가고 싶지 않아요",
            },
            {
              condition: "Orang lain",
              form: "-고 싶어 하다",
              example: "동생이 가고 싶어 해요",
            },
            {
              condition: "반말",
              form: "-고 싶어 / -고 싶다!",
              example: "먹고 싶다!",
            },
          ],
          examples: [
            { before: "한국에서 일하", emphasis: "고 싶어요", after: "." },
            {
              before: "친구가 한국 화장품을 사",
              emphasis: "고 싶어 해요",
              after: ".",
            },
          ],
        }),
        p(
          b("Artinya apa sih? "),
          "Sama kayak ",
          i("pengen"),
          ". Bonusnya, ",
          b("보고 싶어요"),
          " bukan cuma ",
          i("pengen liat"),
          ", tapi juga ",
          i("kangen"),
          ".",
        ),
        h3("Contoh"),
        ex("한국에서 일하고 싶어요.", "Aku pengen kerja di Korea."),
        ex("엄마가 보고 싶어요.", "Aku kangen ibu.", "video call sama rumah"),
        ex("주말에는 그냥 쉬고 싶어요.", "Weekend aku pengen rebahan aja."),
        ex(
          "제 친구가 한국 화장품을 사고 싶어 해요.",
          "Temenku pengen beli skincare Korea.",
        ),
        ex("떡볶이 먹고 싶다!", "Pengen tteokbokki!", "반말, ngomong sendiri"),
        callout(
          "warning",
          "Jebakan: buat keinginan orang lain, jangan pakai -고 싶어요. ✗ 친구가 가고 싶어요 kedengeran janggal, soalnya kamu nggak bisa tahu isi hati orang. Yang natural ",
          b("친구가 가고 싶어 해요"),
          " (temenku keliatan pengen pergi).",
        ),
        callout(
          "tip",
          "Pengen sesuatu yang udah telat? Cek ",
          ref("kalau aja", "ik-kalau-aja"),
          ". Bedanya sama ",
          ref("-(으)ㄹ래요", "ki-eullaeyo"),
          ": 라면 먹고 싶어요 = lagi pengen ramyeon, 라면 먹을래요 = aku pilih ramyeon.",
        ),
      ],
    },
    "ki-eul-su-itda": {
      description:
        "-(으)ㄹ 수 있다/없다 artinya bisa atau nggak bisa: mampu, sempat, atau keadaannya memungkinkan.",
      blocks: [
        grammar({
          number: "02",
          title: "-(으)ㄹ 수 있다 / 없다",
          descriptionKo:
            "어떤 일이 가능한지, 할 능력이나 상황이 되는지 말할 때 써요.",
          descriptionTranslation:
            "Artinya “bisa” dalam arti paling luas: mampu, sempat, keadaannya memungkinkan. Kebalikannya -(으)ㄹ 수 없다. Di obrolan sehari-hari, “nggak bisa” sering cukup pakai 못.",
          rules: [
            {
              condition: "Akhiran vokal",
              form: "-ㄹ 수 있어요",
              example: "가다 → 갈 수 있어요",
            },
            {
              condition: "Akhiran konsonan",
              form: "-을 수 있어요",
              example: "먹다 → 먹을 수 있어요",
            },
            {
              condition: "Akhiran ㄹ",
              form: "langsung + 수 있어요",
              example: "만들다 → 만들 수 있어요",
            },
            {
              condition: "Negatif",
              form: "-(으)ㄹ 수 없어요",
              example: "갈 수 없어요",
            },
            {
              condition: "Negatif (ngobrol)",
              form: "못 + kata kerja",
              example: "못 가요",
            },
          ],
          examples: [
            {
              before: "내일 아침 일찍 오",
              emphasis: "ㄹ 수 있어요",
              after: "?",
            },
            {
              before: "여기서 와이파이 쓸",
              emphasis: " 수 있어요",
              after: "?",
            },
          ],
        }),
        p(
          b("Artinya apa sih? "),
          "Ini ",
          i("bisa"),
          " serba guna: ",
          i("bisa dateng pagi?"),
          ", ",
          i("di sini bisa pakai wifi?"),
          ". Intinya: mungkin atau nggak mungkin.",
        ),
        h3("Contoh"),
        ex(
          "내일 아침 일찍 올 수 있어요?",
          "Besok pagi bisa dateng lebih awal?",
          "사장님 ke pekerja",
        ),
        ex(
          "이 상자는 너무 무거워서 혼자 들 수 없어요.",
          "Kardus ini berat banget, nggak bisa diangkat sendirian.",
        ),
        ex(
          "여기서 와이파이 쓸 수 있어요?",
          "Di sini bisa pakai wifi?",
          "di kafe",
        ),
        ex(
          "오늘은 바빠서 못 만나요.",
          "Hari ini sibuk, jadi nggak bisa ketemu.",
          "versi ngobrol pakai 못",
        ),
        ex("그럴 수 있지.", "Ya wajar sih, bisa aja kejadian.", "반말"),
        callout(
          "warning",
          "Jebakan: buat kata kerja N하다, 못 nyelip sebelum 하다. ",
          i("Aku nggak bisa nyetir"),
          " jadinya ",
          b("운전 못 해요"),
          ", bukan ✗ 못 운전해요.",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("sempat", "ik-sempat"),
          ". Bedanya sama ",
          ref("-(으)ㄹ 줄 알다", "ki-eul-jul-alda"),
          ": 줄 알다 cuma buat skill (tahu caranya).",
        ),
      ],
    },
    "ki-eul-jul-alda": {
      description:
        "-(으)ㄹ 줄 알다/모르다 artinya bisa atau nggak bisa dalam arti tahu caranya: nyetir, berenang, masak.",
      blocks: [
        grammar({
          number: "03",
          title: "-(으)ㄹ 줄 알다 / 모르다",
          descriptionKo: "어떤 일을 하는 방법을 알고 있는지 말할 때 써요.",
          descriptionTranslation:
            "Artinya “bisa” dalam arti “tahu caranya, punya skill”: nyetir, berenang, masak, baca Hangeul. Kebalikannya -(으)ㄹ 줄 모르다. Cara nempelnya sama persis kayak -(으)ㄹ 수 있다.",
          rules: [
            {
              condition: "Akhiran vokal",
              form: "-ㄹ 줄 알아요",
              example: "타다 → 탈 줄 알아요",
            },
            {
              condition: "Akhiran konsonan",
              form: "-을 줄 알아요",
              example: "읽다 → 읽을 줄 알아요",
            },
            {
              condition: "Akhiran ㄹ",
              form: "langsung + 줄 알아요",
              example: "만들다 → 만들 줄 알아요",
            },
            {
              condition: "하다",
              form: "할 줄 알아요",
              example: "운전하다 → 운전할 줄 알아요",
            },
            {
              condition: "Negatif",
              form: "-(으)ㄹ 줄 몰라요",
              example: "수영할 줄 몰라요",
            },
          ],
          examples: [
            { before: "운전", emphasis: "할 줄 알아요", after: "?" },
            { before: "수영", emphasis: "할 줄 몰라요", after: "." },
          ],
        }),
        p(
          b("Artinya apa sih? "),
          "Ini ",
          i("bisa"),
          " yang nanya soal skill. Gampangnya: kalau bisa diganti ",
          i("tahu caranya"),
          ", pakai 줄 알다. Kalau nggak, pakai -(으)ㄹ 수 있다.",
        ),
        h3("Contoh"),
        ex(
          "지게차 운전할 줄 알아요?",
          "Bisa bawa forklift?",
          "wawancara kerja",
        ),
        ex("저는 김치찌개 끓일 줄 알아요.", "Aku bisa masak kimchi jjigae."),
        ex(
          "한글은 읽을 줄 아는데 말하기는 아직 서툴러요.",
          "Hangeul sih bisa baca, tapi ngomongnya masih kaku.",
        ),
        ex("수영할 줄 몰라요.", "Aku nggak bisa berenang."),
        ex(
          "한국 겨울이 이렇게 추울 줄 몰랐어요.",
          "Nggak nyangka musim dingin Korea sedingin ini.",
          "bentuk lampau: nggak nyangka",
        ),
        callout(
          "warning",
          "Jebakan: -(으)ㄹ 줄 알다 cuma buat skill. ",
          i("Besok bisa dateng?"),
          " itu soal jadwal, jadi pakai ",
          b("내일 올 수 있어요?"),
          ". ✗ 내일 올 줄 알아요? malah kedengeran aneh.",
        ),
        callout(
          "tip",
          "Bedanya sama ",
          ref("-(으)ㄹ 수 있다", "ki-eul-su-itda"),
          ": 수 있다 = mungkin atau mampu, 줄 알다 = tahu caranya. Buat skill dua-duanya boleh, tapi 줄 알다 paling natural.",
        ),
      ],
    },
    "ki-aya-hada": {
      description:
        "-아야/어야 하다 (atau 되다) artinya harus atau wajib. Ganti 요 di -아요/어요 jadi 야.",
      blocks: [
        grammar({
          number: "04",
          title: "-아야/어야 하다 / 되다",
          descriptionKo: "꼭 해야 하는 일이나 의무를 말할 때 써요.",
          descriptionTranslation:
            "Artinya “harus” atau “wajib”. Cara nempelnya ikut -아요/어요: ganti 요 jadi 야, lalu tambah 해요 atau 돼요. 해야 해요 dan 해야 돼요 artinya sama, tapi 돼요 lebih sering di obrolan.",
          rules: [
            {
              condition: "Vokal ㅏ/ㅗ",
              form: "-아야 해요/돼요",
              example: "가다 → 가야 돼요",
            },
            {
              condition: "Vokal lain",
              form: "-어야 해요/돼요",
              example: "먹다 → 먹어야 해요",
            },
            {
              condition: "하다",
              form: "해야 해요/돼요",
              example: "일하다 → 일해야 돼요",
            },
            {
              condition: "Lampau",
              form: "-아야/어야 했어요",
              example: "가야 했어요",
            },
          ],
          examples: [
            { before: "내일 7시까지 출근", emphasis: "해야 돼요", after: "." },
            {
              before: "일할 때는 안전화를 신",
              emphasis: "어야 해요",
              after: ".",
            },
          ],
        }),
        p(
          b("Artinya apa sih? "),
          i("Harus"),
          ", ",
          i("wajib"),
          ", ",
          i("mesti"),
          ". Aturan pabrik, tugas kuliah, urusan dokumen, semuanya pakai pola ini.",
        ),
        h3("Contoh"),
        ex(
          "내일 아침 7시까지 출근해야 돼요.",
          "Besok jam 7 pagi udah harus masuk kerja.",
        ),
        ex(
          "일할 때는 안전화를 신어야 해요.",
          "Pas kerja wajib pakai sepatu safety.",
          "aturan pabrik",
        ),
        ex("과제를 오늘까지 내야 해요.", "Tugasnya harus dikumpulin hari ini."),
        ex("이번 달에는 돈을 아껴야 돼.", "Bulan ini aku harus hemat.", "반말"),
        callout(
          "warning",
          "Jebakan: ",
          i("nggak harus"),
          " itu bukan ✗ 안 해야 돼요, karena artinya malah ",
          i("harus nggak ngelakuin"),
          ". Buat ",
          i("nggak harus"),
          ", pakai ",
          ref("-지 않아도 되다", "ki-ji-anado-doeda"),
          ": ",
          b("안 해도 돼요"),
          ".",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("harusnya", "ik-harusnya"),
          ". Bedanya sama ",
          ref("-았/었어야 했는데", "ki-asseoya"),
          ": itu ",
          i("harusnya tadi …"),
          " buat nyesel hal yang udah lewat.",
        ),
      ],
    },
    "ki-ado-doeda": {
      description:
        "-아도/어도 되다 artinya boleh. Paling sering dipakai buat minta izin: … 돼요?",
      blocks: [
        grammar({
          number: "05",
          title: "-아도/어도 되다",
          descriptionKo:
            "어떤 일을 해도 괜찮다고 허락하거나 허락을 구할 때 써요.",
          descriptionTranslation:
            "Artinya “boleh”. Bentuknya -아도/어도 (walaupun) + 되다, jadi harfiahnya “walaupun kamu …, nggak apa-apa”. Paling sering dipakai buat minta izin: … 돼요?",
          rules: [
            {
              condition: "Vokal ㅏ/ㅗ",
              form: "-아도 돼요",
              example: "앉다 → 앉아도 돼요",
            },
            {
              condition: "Vokal lain",
              form: "-어도 돼요",
              example: "먹다 → 먹어도 돼요",
            },
            {
              condition: "하다",
              form: "해도 돼요",
              example: "말하다 → 말해도 돼요",
            },
            {
              condition: "Minta izin halus",
              form: "-아도/어도 될까요?",
              example: "가도 될까요?",
            },
            {
              condition: "반말",
              form: "-아도/어도 돼?",
              example: "먹어도 돼?",
            },
          ],
          examples: [
            { before: "사진 찍", emphasis: "어도 돼요", after: "?" },
            { before: "여기 앉", emphasis: "아도 돼요", after: "?" },
          ],
        }),
        p(
          b("Artinya apa sih? "),
          i("Boleh foto?"),
          ", ",
          i("boleh duduk sini?"),
          ". Jawabannya ",
          b("네, 돼요"),
          " (boleh) atau ",
          b("안 돼요"),
          " (nggak boleh).",
        ),
        h3("Contoh"),
        ex("사진 찍어도 돼요?", "Boleh foto?"),
        ex("여기 앉아도 돼요?", "Boleh duduk sini?", "di kafe yang penuh"),
        ex(
          "창문 좀 열어도 될까요?",
          "Jendelanya boleh saya buka?",
          "izin halus ke yang lebih tua",
        ),
        ex("이거 먹어도 돼?", "Ini boleh aku makan?", "반말, ke roommate"),
        callout(
          "warning",
          "Jebakan: jawaban ",
          i("nggak boleh"),
          " itu ",
          b("안 돼요"),
          ". Jangan jawab ✗ 안 찍어도 돼요, karena artinya ",
          i("nggak usah foto"),
          ". Yang satu melarang, yang satu cuma bilang nggak perlu.",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("nggak usah", "ik-nggak-usah"),
          ". Bedanya sama ",
          ref("-아도/어도", "ki-ado"),
          ": tanpa 되다 di belakang, artinya ",
          i("walaupun"),
          ".",
        ),
      ],
    },
    "ki-myeon-an-doeda": {
      description:
        "-(으)면 안 되다 artinya nggak boleh atau dilarang. Versi tanyanya enak buat nego halus.",
      blocks: [
        grammar({
          number: "06",
          title: "-(으)면 안 되다",
          descriptionKo: "어떤 일을 하는 것이 금지되어 있을 때 써요.",
          descriptionTranslation:
            "Artinya “nggak boleh” atau “dilarang”. Harfiahnya: “kalau kamu …, nggak oke”. Kalau dijadiin pertanyaan (-(으)면 안 될까요?), rasanya jadi permintaan halus: “boleh nggak …?”",
          rules: [
            {
              condition: "Akhiran vokal",
              form: "-면 안 돼요",
              example: "가다 → 가면 안 돼요",
            },
            {
              condition: "Akhiran konsonan",
              form: "-으면 안 돼요",
              example: "먹다 → 먹으면 안 돼요",
            },
            {
              condition: "Akhiran ㄹ",
              form: "-면 안 돼요",
              example: "열다 → 열면 안 돼요",
            },
            {
              condition: "하다",
              form: "-하면 안 돼요",
              example: "말하다 → 말하면 안 돼요",
            },
            {
              condition: "Permintaan halus",
              form: "-(으)면 안 될까요?",
              example: "가면 안 될까요?",
            },
          ],
          examples: [
            { before: "여기서 담배 피우", emphasis: "면 안 돼요", after: "." },
            {
              before: "오늘 조금 일찍 퇴근하",
              emphasis: "면 안 될까요",
              after: "?",
            },
          ],
        }),
        p(
          b("Artinya apa sih? "),
          "Aturan dan larangan: ",
          i("di sini nggak boleh ngerokok."),
          " Bentuk tanyanya enak buat nego: ",
          i("hari ini boleh nggak saya pulang agak cepet?"),
        ),
        h3("Contoh"),
        ex("여기서 담배 피우면 안 돼요.", "Di sini nggak boleh ngerokok."),
        ex(
          "기계가 돌아갈 때 손을 넣으면 안 돼요.",
          "Pas mesin jalan, tangan nggak boleh dimasukin.",
          "briefing keselamatan",
        ),
        ex(
          "수업 시간에 휴대폰을 쓰면 안 돼요.",
          "Pas kelas nggak boleh main HP.",
        ),
        ex(
          "오늘 조금 일찍 퇴근하면 안 될까요?",
          "Hari ini boleh nggak saya pulang agak cepet?",
          "nego halus ke 사장님",
        ),
        ex("늦으면 안 돼!", "Jangan sampai telat!", "반말"),
        callout(
          "warning",
          "Jebakan: ",
          b("오면 안 돼요"),
          " artinya ",
          i("jangan dateng"),
          ", sedangkan ",
          b("안 와도 돼요"),
          " artinya ",
          i("nggak usah dateng"),
          ". Posisi 안 ngubah arti total, jadi jangan sampai ketuker.",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("nggak usah", "ik-nggak-usah"),
          ". Bedanya sama ",
          ref("-지 마세요", "ki-ji-maseyo"),
          ": -지 마세요 nyuruh langsung (",
          i("jangan!"),
          "), -(으)면 안 돼요 jelasin aturan, jadi lebih aman ke atasan.",
        ),
      ],
    },
    "ki-ji-anado-doeda": {
      description:
        "-지 않아도 되다 atau 안 -아도 되다 artinya nggak usah atau nggak perlu: dibebasin, bukan dilarang.",
      blocks: [
        grammar({
          number: "07",
          title: "-지 않아도 되다 / 안 -아도 되다",
          descriptionKo: "꼭 할 필요가 없다고 말할 때 써요.",
          descriptionTranslation:
            "Artinya “nggak usah” atau “nggak perlu”. Kamu dibebasin dari kewajiban, bukan dilarang. Ada dua bentuk dengan arti sama, dan 안 -아도 되다 lebih sering di obrolan.",
          rules: [
            {
              condition: "Bentuk panjang",
              form: "-지 않아도 돼요",
              example: "가다 → 가지 않아도 돼요",
            },
            {
              condition: "Bentuk pendek (ㅏ/ㅗ)",
              form: "안 -아도 돼요",
              example: "오다 → 안 와도 돼요",
            },
            {
              condition: "Bentuk pendek (vokal lain)",
              form: "안 -어도 돼요",
              example: "벗다 → 안 벗어도 돼요",
            },
            {
              condition: "N하다",
              form: "N 안 해도 돼요",
              example: "걱정하다 → 걱정 안 해도 돼요",
            },
            {
              condition: "반말",
              form: "안 -아도/어도 돼",
              example: "안 와도 돼",
            },
          ],
          examples: [
            { before: "내일은 ", emphasis: "안 와도 돼요", after: "." },
            { before: "걱정하", emphasis: "지 않아도 돼요", after: "." },
          ],
        }),
        p(
          b("Artinya apa sih? "),
          i("Besok nggak usah dateng"),
          ", ",
          i("sepatunya nggak usah dilepas."),
          " Rasanya lega: kamu boleh nggak ngelakuin itu.",
        ),
        h3("Contoh"),
        ex(
          "내일은 안 와도 돼요.",
          "Besok nggak usah dateng.",
          "사장님, pas pabrik libur",
        ),
        ex("신발 안 벗어도 돼요.", "Sepatunya nggak usah dilepas."),
        ex("오늘은 야근 안 해도 돼요.", "Hari ini nggak usah lembur."),
        ex(
          "돈 안 내도 돼. 내가 살게.",
          "Nggak usah bayar. Aku yang traktir.",
          "반말",
        ),
        callout(
          "warning",
          "Jebakan paling bahaya: kalau 반장님 bilang ",
          b("내일 안 와도 돼요"),
          ", artinya cuma ",
          i("besok nggak usah masuk"),
          ", bukan ",
          i("jangan dateng"),
          " apalagi dipecat. Yang artinya ",
          i("jangan dateng"),
          " itu ",
          b("내일 오면 안 돼요"),
          ".",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("nggak usah", "ik-nggak-usah"),
          ". Bedanya sama ",
          ref("-아야/어야 하다", "ki-aya-hada"),
          ": 와야 돼요 = harus dateng, 안 와도 돼요 = nggak harus dateng.",
        ),
      ],
    },
    "ki-giro-hada": {
      description:
        "-기로 하다 artinya memutuskan atau janjian. Hampir selalu dipakai lampau: -기로 했어요.",
      blocks: [
        grammar({
          number: "08",
          title: "-기로 하다",
          descriptionKo:
            "어떤 일을 하겠다고 결정하거나 다른 사람과 약속할 때 써요.",
          descriptionTranslation:
            "Artinya “mutusin buat …” atau “janjian …”. Karena keputusannya udah diambil, hampir selalu dipakai lampau: -기로 했어요. Pasang 안 di depan buat “mutusin nggak”.",
          rules: [
            {
              condition: "Akhiran vokal",
              form: "-기로 했어요",
              example: "가다 → 가기로 했어요",
            },
            {
              condition: "Akhiran konsonan",
              form: "-기로 했어요",
              example: "먹다 → 먹기로 했어요",
            },
            {
              condition: "Mutusin nggak",
              form: "안 -기로 했어요",
              example: "안 가기로 했어요",
            },
            {
              condition: "Janjian",
              form: "N(이)랑 -기로 했어요",
              example: "친구랑 만나기로 했어요",
            },
            { condition: "반말", form: "-기로 했어", example: "만나기로 했어" },
          ],
          examples: [
            {
              before: "매일 한국어를 공부하",
              emphasis: "기로 했어요",
              after: ".",
            },
            {
              before: "친구랑 토요일에 만나",
              emphasis: "기로 했어요",
              after: ".",
            },
          ],
        }),
        p(
          b("Artinya apa sih? "),
          i("Mulai tahun ini aku mutusin buat …"),
          ", ",
          i("aku janjian sama temen hari Sabtu"),
          ", ",
          i("aku mutusin nggak ikut."),
          " Semua itu -기로 했어요.",
        ),
        h3("Contoh"),
        ex(
          "올해부터 매일 한국어를 공부하기로 했어요.",
          "Mulai tahun ini aku mutusin belajar bahasa Korea tiap hari.",
        ),
        ex(
          "친구랑 토요일에 만나기로 했어요.",
          "Aku janjian sama temen hari Sabtu.",
        ),
        ex(
          "그 회사에는 안 가기로 했어요.",
          "Aku mutusin nggak masuk perusahaan itu.",
        ),
        ex(
          "우리 7시에 만나기로 했잖아!",
          "Kita kan janjian jam 7!",
          "반말, ke bestie yang ngaret",
        ),
        callout(
          "warning",
          "Jebakan: ",
          i("nggak jadi"),
          " punya dua arti. Kalau kamu sendiri yang mutusin batal, pakai ",
          b("안 -기로 했어요"),
          ". Kalau batal karena keadaan, pakai ",
          ref("결국", "ki-gyeolguk"),
          ": ",
          b("결국 못 갔어요"),
          ".",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("nggak jadi", "ik-nggak-jadi"),
          ".",
        ),
      ],
    },
  },
  vocabulary: {
    title: "Kosakata: Bisa, harus, boleh",
    description:
      "Delapan pola buat bilang pengen, bisa, harus, boleh, nggak boleh, nggak usah, dan mutusin. Masing-masing dengan arti dan satu contoh.",
    entries: [
      {
        term: "-고 싶다",
        meanings: ["ingin", "pengen"],
        example: {
          ko: "한국에서 일하고 싶어요.",
          id: "Aku pengen kerja di Korea.",
        },
      },
      {
        term: "-(으)ㄹ 수 있다/없다",
        meanings: ["bisa", "sempat", "nggak bisa"],
        example: {
          ko: "여기서 와이파이 쓸 수 있어요?",
          id: "Di sini bisa pakai wifi?",
        },
      },
      {
        term: "-(으)ㄹ 줄 알다/모르다",
        meanings: ["bisa (tahu caranya)", "nggak bisa"],
        example: { ko: "수영할 줄 몰라요.", id: "Aku nggak bisa berenang." },
      },
      {
        term: "-아야/어야 하다",
        meanings: ["harus", "wajib"],
        example: {
          ko: "일할 때는 안전화를 신어야 해요.",
          id: "Pas kerja wajib pakai sepatu safety.",
        },
      },
      {
        term: "-아도/어도 되다",
        meanings: ["boleh"],
        example: { ko: "사진 찍어도 돼요?", id: "Boleh foto?" },
      },
      {
        term: "-(으)면 안 되다",
        meanings: ["nggak boleh", "dilarang"],
        example: {
          ko: "여기서 담배 피우면 안 돼요.",
          id: "Di sini nggak boleh ngerokok.",
        },
      },
      {
        term: "-지 않아도 되다",
        meanings: ["nggak usah", "nggak perlu"],
        example: { ko: "내일은 안 와도 돼요.", id: "Besok nggak usah dateng." },
      },
      {
        term: "-기로 하다",
        meanings: ["janjian", "memutuskan"],
        example: {
          ko: "친구랑 토요일에 만나기로 했어요.",
          id: "Aku janjian sama temen hari Sabtu.",
        },
      },
    ],
  },
  quiz: {
    title: "Kuis: Bisa, harus, boleh",
    description:
      "11 soal buat ngecek kamu udah bisa bedain pengen, bisa, harus, boleh, nggak boleh, nggak usah, dan mutusin.",
    passingScore: 70,
    questions: [
      {
        key: "bh-go-sipda-1",
        prompt: "Pilih yang pas buat: “Temenku pengen beli skincare Korea.”",
        options: [
          { text: "친구가 한국 화장품을 사고 싶어 해요.", correct: true },
          { text: "친구가 한국 화장품을 사고 싶어요." },
          { text: "친구가 한국 화장품을 살 수 있어요." },
        ],
        explanation:
          "Yang pengen itu temenmu, bukan kamu. Keinginan orang lain pakai -고 싶어 하다, soalnya kita nggak bisa tahu isi hati orang lain secara langsung.",
      },
      {
        key: "bh-su-vs-jul-1",
        prompt:
          "Pas wawancara kerja, cara paling natural nanya “Bisa bawa forklift?” itu…",
        options: [
          { text: "지게차 운전할 줄 알아요?", correct: true },
          { text: "지게차 운전해야 돼요?" },
          { text: "지게차 운전해도 돼요?" },
          { text: "지게차 운전하기로 했어요?" },
        ],
        explanation:
          "Forklift itu soal skill, jadi pakai -(으)ㄹ 줄 알다 (tahu caranya). 해야 돼요 = harus, 해도 돼요 = boleh, 하기로 했어요 = udah mutusin. Beda semua.",
      },
      {
        key: "bh-su-vs-jul-2",
        prompt:
          "사장님 mau nanya: “Besok bisa dateng lebih pagi?” Pilih yang bener.",
        options: [
          { text: "내일 일찍 올 수 있어요?", correct: true },
          { text: "내일 일찍 올 줄 알아요?" },
          { text: "내일 일찍 오고 싶어 해요?" },
        ],
        explanation:
          "Ini soal jadwal, bukan skill. Jadi pakai -(으)ㄹ 수 있다. 올 줄 알아요? kedengeran aneh, kayak nanya “kamu tahu caranya dateng?”.",
      },
      {
        key: "bh-mot-1",
        prompt: "“Aku nggak bisa nyetir.” Mana yang benar?",
        options: [
          { text: "운전 못 해요.", correct: true },
          { text: "못 운전해요." },
          { text: "운전하면 안 돼요." },
        ],
        explanation:
          "Buat kata kerja N하다, 못 nyelip sebelum 하다: 운전 못 해요. 운전하면 안 돼요 artinya “nggak boleh nyetir”, itu larangan, bukan soal bisa.",
      },
      {
        key: "bh-jul-past-1",
        prompt:
          "Arti paling pas dari 한국 겨울이 이렇게 추울 줄 몰랐어요 adalah…",
        options: [
          {
            text: "Nggak nyangka musim dingin Korea sedingin ini.",
            correct: true,
          },
          { text: "Aku nggak tahu cara ngadepin musim dingin Korea." },
          { text: "Musim dingin Korea nggak boleh sedingin ini." },
        ],
        explanation:
          "Bentuk lampau -(으)ㄹ 줄 몰랐어요 bukan soal skill lagi, tapi “nggak nyangka”. Plot twist kecil yang sering muncul di drakor.",
      },
      {
        key: "bh-aya-hada-1",
        prompt: "“Pas kerja wajib pakai sepatu safety.” Pilih yang bener.",
        options: [
          { text: "일할 때는 안전화를 신어야 해요.", correct: true },
          { text: "일할 때는 안전화를 신어도 돼요." },
          { text: "일할 때는 안전화를 신으면 안 돼요." },
        ],
        explanation:
          "Wajib = -아야/어야 하다. 신다 → 신어야 해요. Yang lain artinya “boleh pakai” dan “nggak boleh pakai”.",
      },
      {
        key: "bh-nggak-harus-1",
        prompt: "“Hari ini nggak harus lembur.” Mana yang natural?",
        options: [
          { text: "오늘은 야근 안 해도 돼요.", correct: true },
          { text: "오늘은 야근 안 해야 돼요." },
          { text: "오늘은 야근하면 안 돼요." },
        ],
        explanation:
          "Jebakan klasik! 안 해야 돼요 artinya “harus nggak ngelakuin”, dan 하면 안 돼요 artinya “dilarang”. “Nggak harus” itu 안 -아도 되다: 안 해도 돼요.",
      },
      {
        key: "bh-anado-trap-1",
        prompt: "반장님 bilang: 내일은 안 와도 돼요. Maksudnya apa?",
        options: [
          { text: "Besok nggak usah masuk.", correct: true },
          { text: "Besok jangan dateng." },
          { text: "Besok harus dateng." },
          { text: "Kamu dipecat mulai besok." },
        ],
        explanation:
          "Santuy, bukan dipecat. 안 와도 돼요 = nggak perlu dateng. Kalau beneran dilarang dateng, kalimatnya 내일 오면 안 돼요.",
      },
      {
        key: "bh-myeon-an-1",
        prompt:
          "Tanda di pabrik: “Di sini nggak boleh foto.” Pilih yang bener.",
        options: [
          { text: "여기서 사진을 찍으면 안 돼요.", correct: true },
          { text: "여기서 사진을 안 찍어도 돼요." },
          { text: "여기서 사진을 찍어야 돼요." },
        ],
        explanation:
          "Larangan = -(으)면 안 되다. 안 찍어도 돼요 cuma bilang “nggak usah foto”, bukan melarang.",
      },
      {
        key: "bh-ado-doeda-1",
        prompt: "Kamu mau izin buka jendela ke 반장님. Mana yang paling halus?",
        options: [
          { text: "반장님, 창문 좀 열어도 될까요?", correct: true },
          { text: "반장님, 창문 좀 열기로 했어요." },
          { text: "반장님, 창문 좀 열면 안 돼요." },
          { text: "반장님, 창문 좀 안 열어도 돼요." },
        ],
        explanation:
          "Minta izin = -아도/어도 되다, dan -아도 될까요? bikin makin halus ke atasan. 열기로 했어요 kesannya kamu udah mutusin sendiri tanpa nanya.",
      },
      {
        key: "bh-giro-hada-1",
        prompt: "Kamu udah mutusin buat nggak masuk perusahaan itu. Bilangnya…",
        options: [
          { text: "그 회사에는 안 가기로 했어요.", correct: true },
          { text: "그 회사에는 안 가고 싶어 해요." },
          { text: "그 회사에는 갈 수 없어요." },
        ],
        explanation:
          "Keputusan sendiri = -기로 하다, dan “mutusin nggak” = 안 -기로 했어요. 갈 수 없어요 artinya “nggak bisa”, kayak ada halangan, bukan pilihanmu.",
      },
    ],
  },
});
