import { b, callout, defineBab, ex, grammar, h3, i, p, ref } from "../blocks";

export default defineBab({
  key: "ki-03-waktu-sebab",
  materials: {
    "ki-gi-jeone": {
      description:
        "-기 전에 artinya sebelum. Tempel ke kata kerja, bentuknya sama buat semua.",
      blocks: [
        grammar({
          number: "01",
          title: "-기 전에",
          theme: "amber",
          descriptionKo: "어떤 일을 하기 앞서 다른 일을 할 때 써요.",
          descriptionTranslation:
            "Artinya “sebelum”. Tempel -기 전에 ke kata kerja, bentuknya sama buat semua, nggak peduli akhiran vokal atau konsonan. Buat kata benda cukup N 전에.",
          rules: [
            {
              condition: "Akhiran vokal",
              form: "-기 전에",
              example: "가다 → 가기 전에",
            },
            {
              condition: "Akhiran konsonan",
              form: "-기 전에",
              example: "먹다 → 먹기 전에",
            },
            {
              condition: "하다",
              form: "-하기 전에",
              example: "출발하다 → 출발하기 전에",
            },
            {
              condition: "Kata benda",
              form: "N 전에",
              example: "출근 → 출근 전에",
            },
            {
              condition: "Jangka waktu",
              form: "N 전에 (= … yang lalu)",
              example: "10분 → 10분 전에",
            },
          ],
          examples: [
            { before: "자", emphasis: "기 전에", after: " 샤워해요." },
            {
              before: "일하",
              emphasis: "기 전에",
              after: " 장갑을 꼭 끼세요.",
            },
            { before: "출근 ", emphasis: "전에", after: " 커피 한 잔 마셔요." },
          ],
        }),
        p(
          b("Artinya apa sih? "),
          "Sama persis kayak ",
          i("sebelum"),
          ". Bedanya cuma urutan: bagian ",
          i("sebelum tidur"),
          " wajib di depan. ",
          i("Aku mandi sebelum tidur"),
          " jadi ",
          b("자기 전에 샤워해요"),
          ".",
        ),
        h3("Contoh"),
        ex("자기 전에 샤워해요.", "Aku mandi sebelum tidur."),
        ex(
          "일하기 전에 장갑을 꼭 끼세요.",
          "Sebelum kerja, sarung tangan wajib dipakai ya.",
          "반장님 ke pekerja baru",
        ),
        ex(
          "한국에 오기 전에 LPK에서 한국어를 배웠어요.",
          "Sebelum ke Korea, aku belajar bahasa Korea di LPK.",
        ),
        ex("10분 전에 도착했어요.", "Aku udah nyampe 10 menit yang lalu."),
        ex("밥 먹기 전에 손 씻어.", "Cuci tangan dulu sebelum makan.", "반말"),
        callout(
          "warning",
          "Jebakan: orang Indonesia sering nulis ",
          b("왔기 전에"),
          " karena mikir ",
          i("sebelum aku (udah) dateng"),
          ". Salah. Kata kerja sebelum -기 전에 selalu polos: ",
          b("오기 전에"),
          ". Tanda lampaunya cukup di kata kerja terakhir: ",
          b("오기 전에 배웠어요"),
          ".",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("keburu", "ik-keburu"),
          ". Kebalikannya ",
          ref("-(으)ㄴ 후에", "ki-eun-hue"),
          ": -기 전에 nggak peduli vokal atau konsonan, -(으)ㄴ 후에 peduli (먹은 후에, 간 후에).",
        ),
      ],
    },
    "ki-eun-hue": {
      description:
        "-(으)ㄴ 후에 atau -(으)ㄴ 다음에 artinya setelah atau abis. Huruf ㄴ-nya udah nandain selesai.",
      blocks: [
        grammar({
          number: "02",
          title: "-(으)ㄴ 후에 / -(으)ㄴ 다음에",
          theme: "amber",
          descriptionKo: "어떤 일이 끝나고 그 뒤에 다른 일을 할 때 써요.",
          descriptionTranslation:
            "Artinya “setelah” atau “abis …”. 후에 agak rapi, 다음에 lebih santai, artinya sama. Huruf ㄴ di sini udah nandain “selesai”, jadi nggak perlu -았/었- lagi.",
          rules: [
            {
              condition: "Akhiran vokal",
              form: "-ㄴ 후에",
              example: "가다 → 간 후에",
            },
            {
              condition: "Akhiran konsonan",
              form: "-은 후에",
              example: "먹다 → 먹은 후에",
            },
            {
              condition: "Akhiran ㄹ",
              form: "ㄹ hilang + -ㄴ 후에",
              example: "만들다 → 만든 후에",
            },
            {
              condition: "하다",
              form: "-한 후에",
              example: "퇴근하다 → 퇴근한 후에",
            },
            {
              condition: "Kata benda",
              form: "N 후에",
              example: "수업 → 수업 후에",
            },
            {
              condition: "Jangka waktu",
              form: "N 후에 (= … lagi)",
              example: "3일 → 3일 후에",
            },
          ],
          examples: [
            { before: "밥을 먹", emphasis: "은 후에", after: " 약을 드세요." },
            {
              before: "일이 끝",
              emphasis: "난 다음에",
              after: " 같이 저녁 먹어요.",
            },
          ],
        }),
        p(
          b("Artinya apa sih? "),
          "Kayak ",
          i("abis makan, baru minum obat"),
          ". Di obrolan santai, orang Korea juga sering pakai ",
          b("-고 나서"),
          " dengan arti yang sama: ",
          b("먹고 나서"),
          ".",
        ),
        h3("Contoh"),
        ex(
          "밥을 먹은 후에 약을 드세요.",
          "Obatnya diminum abis makan ya.",
          "apoteker",
        ),
        ex(
          "일이 끝난 다음에 같이 저녁 먹어요.",
          "Abis kerja kelar, makan malam bareng yuk.",
        ),
        ex("퇴근 후에 마트에 갔어요.", "Pulang kerja aku mampir ke mart."),
        ex(
          "수업 끝나고 나서 도서관 갈 거예요.",
          "Abis kelas aku mau ke perpus.",
        ),
        ex("3일 후에 다시 오세요.", "Tiga hari lagi dateng lagi ya."),
        callout(
          "warning",
          "Jebakan: jangan dobel tanda lampau. ",
          b("먹었은 후에"),
          " itu salah, karena ㄴ di ",
          b("먹은"),
          " udah artinya ",
          i("udah"),
          ". Kejadiannya lampau pun, lampaunya cukup di akhir: ",
          b("먹은 후에 잤어요"),
          ".",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("baru", "ik-baru"),
          ". Bedanya sama ",
          ref("-자마자", "ki-jamaja"),
          ": -(으)ㄴ 후에 jedanya bisa lama, -자마자 langsung tanpa jeda.",
        ),
      ],
    },
    "ki-eul-ttae": {
      description:
        "-(으)ㄹ 때 artinya pas, waktu, ketika. Kalau kejadiannya udah lewat duluan, pakai -았/었을 때.",
      blocks: [
        grammar({
          number: "03",
          title: "-(으)ㄹ 때",
          theme: "amber",
          descriptionKo: "어떤 일이 일어나는 시간이나 상황을 말할 때 써요.",
          descriptionTranslation:
            "Artinya “pas”, “waktu”, “ketika”. Bisa nempel ke kata kerja dan kata sifat. Kalau kejadiannya udah selesai duluan, pakai -았/었을 때.",
          rules: [
            {
              condition: "Akhiran vokal",
              form: "-ㄹ 때",
              example: "가다 → 갈 때",
            },
            {
              condition: "Akhiran konsonan",
              form: "-을 때",
              example: "먹다 → 먹을 때",
            },
            {
              condition: "Akhiran ㄹ",
              form: "ㄹ tetap + 때",
              example: "힘들다 → 힘들 때",
            },
            {
              condition: "Kata sifat",
              form: "-(으)ㄹ 때 juga",
              example: "바쁘다 → 바쁠 때, 좋다 → 좋을 때",
            },
            {
              condition: "Udah selesai duluan",
              form: "-았/었을 때",
              example: "오다 → 왔을 때",
            },
            {
              condition: "Kata benda",
              form: "N 때",
              example: "방학 → 방학 때",
            },
          ],
          examples: [
            {
              before: "모",
              emphasis: "를 때",
              after: "는 반장님한테 물어보세요.",
            },
            {
              before: "한국에 처음 왔",
              emphasis: "을 때",
              after: " 너무 추웠어요.",
            },
          ],
        }),
        p(
          b("Artinya apa sih? "),
          "Bayangin kata ",
          i("pas"),
          ": ",
          i("pas makan jangan main HP"),
          ", ",
          i("pas capek aku dengerin lagu ini"),
          ". Itu semua -(으)ㄹ 때.",
        ),
        h3("Contoh"),
        ex(
          "모를 때는 반장님한테 물어보세요.",
          "Kalau pas nggak tahu, tanya aja ke 반장님.",
        ),
        ex(
          "한국에 처음 왔을 때 너무 추웠어요.",
          "Waktu pertama dateng ke Korea, dingin banget.",
        ),
        ex(
          "힘들 때 이 노래를 들어요.",
          "Pas lagi capek, aku dengerin lagu ini.",
        ),
        ex(
          "어렸을 때 드라마를 많이 봤어요.",
          "Waktu kecil aku sering banget nonton drama.",
        ),
        ex("밥 먹을 때 휴대폰 보지 마.", "Jangan main HP pas makan.", "반말"),
        callout(
          "warning",
          "Jebakan: ",
          b("한국에 갈 때"),
          " artinya pas lagi berangkat (masih di jalan), sedangkan ",
          b("한국에 갔을 때"),
          " artinya pas udah di Korea. Orang Indonesia sering pakai 갈 때 buat dua-duanya, soalnya ",
          i("waktu ke Korea"),
          " nggak punya tanda waktu.",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("mumpung", "ik-mumpung"),
          ". Bedanya sama ",
          ref("-(으)면", "ki-myeon"),
          ": -(으)면 itu syarat (",
          i("kalau"),
          "), -(으)ㄹ 때 itu keadaannya (",
          i("pas"),
          ").",
        ),
      ],
    },
    "ki-ado": {
      description:
        "-아도/어도 artinya walaupun atau biarpun. Bagian depannya boleh fakta, boleh juga andai-andai.",
      blocks: [
        grammar({
          number: "04",
          title: "-아도/어도",
          theme: "amber",
          descriptionKo: "앞의 내용과 상관없이 뒤의 일이 일어날 때 써요.",
          descriptionTranslation:
            "Artinya “walaupun”, “biarpun”, “… pun tetep”. Cara nempelnya sama kayak -아요/어요: ganti 요 jadi 도. Ditambah 아무리 di depan, artinya jadi “se-… apa pun”.",
          rules: [
            {
              condition: "Vokal ㅏ/ㅗ",
              form: "-아도",
              example: "비싸다 → 비싸도",
            },
            {
              condition: "Vokal lain",
              form: "-어도",
              example: "먹다 → 먹어도",
            },
            {
              condition: "하다",
              form: "해도",
              example: "공부하다 → 공부해도",
            },
            {
              condition: "ㅂ tak beraturan",
              form: "-워도",
              example: "춥다 → 추워도",
            },
            {
              condition: "Kata benda",
              form: "-여도 / -이어도",
              example: "친구여도, 학생이어도",
            },
            {
              condition: "Lampau",
              form: "-았/었어도",
              example: "하다 → 했어도",
            },
          ],
          examples: [
            { before: "비싸", emphasis: "도", after: " 이건 사고 싶어요." },
            {
              before: "아무리 피곤해",
              emphasis: "도",
              after: " 안전모는 꼭 써야 해요.",
            },
          ],
        }),
        p(
          b("Artinya apa sih? "),
          "Kayak ",
          i("hujan pun tetep berangkat"),
          ". Bagian depannya bisa fakta (",
          i("emang udah mahal"),
          "), bisa juga andai-andai (",
          i("seandainya hujan pun"),
          ").",
        ),
        h3("Contoh"),
        ex(
          "비싸도 이건 사고 싶어요.",
          "Biarpun mahal, yang ini tetep pengen aku beli.",
        ),
        ex(
          "아무리 피곤해도 안전모는 꼭 써야 해요.",
          "Secapek apa pun, helm wajib dipakai.",
          "aturan di pabrik",
        ),
        ex("비가 와도 출근해야 돼요.", "Hujan pun tetep harus masuk kerja."),
        ex(
          "바빠도 밥은 꼭 챙겨 먹어.",
          "Sesibuk apa pun, makan jangan sampai lupa.",
          "반말, chat dari ibu",
        ),
        callout(
          "warning",
          "Jebakan: ",
          b("먹어도"),
          " sendirian artinya ",
          i("walaupun makan"),
          ". Tapi ",
          b("먹어도 돼요"),
          " artinya ",
          i("boleh makan"),
          ". Kalau ada 되다 di belakang, itu bukan walaupun, tapi ",
          ref("-아도/어도 되다", "ki-ado-doeda"),
          ".",
        ),
        callout(
          "tip",
          "Bedanya sama ",
          ref("-는데도", "ki-neundedo"),
          ": -는데도 selalu fakta (",
          i("padahal udah …"),
          "), -아도/어도 boleh andai-andai. Versi awal kalimatnya: ",
          ref("그래도", "ki-geuraedo"),
          ".",
        ),
      ],
    },
    "ki-daga": {
      description:
        "-다가 artinya lagi …, eh terus …: kegiatan pertama kepotong sama hal lain.",
      blocks: [
        grammar({
          number: "05",
          title: "-다가",
          theme: "amber",
          descriptionKo:
            "어떤 일을 하는 도중에 다른 일이 생기거나 바뀔 때 써요.",
          descriptionTranslation:
            "Artinya “lagi … eh, terus …”. Kegiatan pertama kepotong di tengah jalan, lalu ada hal lain yang terjadi. Bentuknya satu buat semua kata kerja, dan orang yang ngelakuin dua bagiannya harus sama.",
          rules: [
            {
              condition: "Akhiran vokal",
              form: "-다가",
              example: "가다 → 가다가",
            },
            {
              condition: "Akhiran konsonan",
              form: "-다가",
              example: "먹다 → 먹다가",
            },
            {
              condition: "하다",
              form: "-하다가",
              example: "일하다 → 일하다가",
            },
            {
              condition: "Udah selesai, terus …",
              form: "-았/었다가",
              example: "들르다 → 들렀다가",
            },
          ],
          examples: [
            {
              before: "학교에 가",
              emphasis: "다가",
              after: " 친구를 만났어요.",
            },
            { before: "드라마를 보", emphasis: "다가", after: " 잠들었어요." },
          ],
        }),
        p(
          b("Artinya apa sih? "),
          "Ini pola favorit buat cerita. ",
          i("Lagi nonton drakor, eh ketiduran."),
          " Kata ",
          i("lagi"),
          " plus ",
          i("eh"),
          " itu jiwanya -다가.",
        ),
        h3("Contoh"),
        ex(
          "학교에 가다가 친구를 만났어요.",
          "Lagi jalan ke kampus, eh ketemu temen.",
        ),
        ex(
          "일하다가 손을 다쳤어요.",
          "Lagi kerja, tanganku luka.",
          "laporan ke 반장님",
        ),
        ex("드라마를 보다가 잠들었어요.", "Lagi nonton drakor, eh ketiduran."),
        ex(
          "편의점에 들렀다가 집에 갔어요.",
          "Mampir ke minimarket dulu, abis itu pulang.",
        ),
        callout(
          "warning",
          "Jebakan: orang yang ",
          i("lagi …"),
          " dan yang ",
          i("eh terus …"),
          " harus sama. ✗ 동생이 공부하다가 제가 TV를 봤어요 salah, soalnya yang belajar adik, yang nonton aku. Kalau orangnya beda, pakai ",
          b("-는 동안"),
          " (selama): ",
          b("동생이 공부하는 동안 저는 TV를 봤어요"),
          ".",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("ketiduran", "ik-ketiduran"),
          ". Bedanya sama ",
          ref("-(으)면서", "ki-myeonseo"),
          ": -(으)면서 dua kegiatan jalan barengan (sambil), -다가 kegiatan pertama kepotong.",
        ),
      ],
    },
    "ki-jamaja": {
      description:
        "-자마자 artinya begitu …, langsung …: jarak dua kejadian hampir nol.",
      blocks: [
        grammar({
          number: "06",
          title: "-자마자",
          theme: "amber",
          descriptionKo: "앞의 일이 끝나고 바로 뒤의 일이 일어날 때 써요.",
          descriptionTranslation:
            "Artinya “begitu …, langsung …”. Jarak antara dua kejadian hampir nol. Bentuknya cuma satu dan cuma buat kata kerja. Sering ditemenin 바로 (langsung).",
          rules: [
            {
              condition: "Akhiran vokal",
              form: "-자마자",
              example: "끝나다 → 끝나자마자",
            },
            {
              condition: "Akhiran konsonan",
              form: "-자마자",
              example: "받다 → 받자마자",
            },
            {
              condition: "하다",
              form: "-하자마자",
              example: "도착하다 → 도착하자마자",
            },
            {
              condition: "Lampau",
              form: "di kata kerja akhir aja",
              example: "보자마자 울었어요",
            },
          ],
          examples: [
            { before: "집에 도착하", emphasis: "자마자", after: " 잤어요." },
            {
              before: "월급을 받",
              emphasis: "자마자",
              after: " 집에 돈을 보냈어요.",
            },
          ],
        }),
        p(
          b("Artinya apa sih? "),
          "Kalau kalimat Indonesiamu ada ",
          i("begitu …"),
          " atau ",
          i("baru … langsung …"),
          ", biasanya itu -자마자. ",
          i("Baru melek, langsung liat HP."),
        ),
        h3("Contoh"),
        ex("집에 도착하자마자 잤어요.", "Begitu nyampe rumah, langsung tidur."),
        ex(
          "월급을 받자마자 집에 돈을 보냈어요.",
          "Begitu gajian, langsung kirim uang ke rumah.",
        ),
        ex(
          "눈 뜨자마자 휴대폰부터 봐요.",
          "Baru melek, yang dicek pertama HP.",
        ),
        ex(
          "그 노래를 듣자마자 팬이 됐어요.",
          "Begitu denger lagunya, auto jadi fans.",
        ),
        ex(
          "버스에 타자마자 잠들었어.",
          "Baru naik bus, langsung tidur.",
          "반말",
        ),
        callout(
          "warning",
          "Jebakan: jangan tulis ✗ 도착했자마자. Tanda lampau cuma di kata kerja terakhir: ",
          b("도착하자마자 잤어요"),
          ". Satu lagi, -자마자 nggak bisa nempel ke kata sifat: ✗ 피곤하자마자.",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("baru", "ik-baru"),
          ". Bedanya sama ",
          ref("-(으)ㄴ 후에", "ki-eun-hue"),
          ": -(으)ㄴ 후에 cuma bilang ",
          i("setelah"),
          ", jedanya bisa lama.",
        ),
      ],
    },
    "ki-neurago": {
      description:
        "-느라고 artinya gara-gara lagi sibuk …, jadi nggak sempat. Pola buat ngeles dengan sopan.",
      blocks: [
        grammar({
          number: "07",
          title: "-느라고 / -느라",
          theme: "amber",
          descriptionKo:
            "어떤 일을 하느라 다른 일을 못 했거나 힘들었을 때 써요.",
          descriptionTranslation:
            "Artinya “gara-gara lagi sibuk …, jadi nggak sempat …”. Kamu lagi ngerjain A, makanya B gagal atau jadi berat. Hasilnya hampir selalu negatif: 못, 늦다, 바쁘다, 힘들다.",
          rules: [
            {
              condition: "Akhiran vokal",
              form: "-느라고",
              example: "보다 → 보느라고",
            },
            {
              condition: "Akhiran konsonan",
              form: "-느라고",
              example: "먹다 → 먹느라고",
            },
            {
              condition: "Akhiran ㄹ",
              form: "ㄹ hilang + -느라고",
              example: "놀다 → 노느라고",
            },
            {
              condition: "하다",
              form: "-하느라고",
              example: "일하다 → 일하느라고",
            },
            {
              condition: "Versi singkat",
              form: "-느라",
              example: "일하느라 바빴어요",
            },
          ],
          examples: [
            {
              before: "일하",
              emphasis: "느라고",
              after: " 전화를 못 받았어요.",
            },
            {
              before: "드라마 보",
              emphasis: "느라고",
              after: " 밤을 새웠어요.",
            },
          ],
        }),
        p(
          b("Artinya apa sih? "),
          "Inget chat ",
          i("sorry baru bales, tadi lagi kerja"),
          "? Itu -느라고 banget. Kata Indonesianya biasanya ",
          i("nggak sempet"),
          " atau ",
          i("keasyikan …"),
          ".",
        ),
        h3("Contoh"),
        ex(
          "일하느라고 전화를 못 받았어요. 죄송해요.",
          "Maaf, tadi lagi kerja jadi nggak sempet angkat telepon.",
          "ke 사장님",
        ),
        ex(
          "드라마 보느라고 밤을 새웠어요.",
          "Gara-gara nonton drakor, aku begadang.",
        ),
        ex(
          "친구랑 노느라고 숙제를 못 했어요.",
          "Keasyikan main sama temen, PR-nya nggak kelar.",
        ),
        ex(
          "알바하느라 답장을 못 했어. 미안!",
          "Sorry nggak sempet bales, tadi lagi part-time!",
          "반말",
        ),
        callout(
          "warning",
          "Jebakan: -느라고 cuma buat kegiatan yang kamu ",
          i("sengaja"),
          " lakuin. Hujan atau sakit itu bukan kegiatan, jadi ✗ 비가 오느라고 dan ✗ 아프느라고 salah. Pakai ",
          ref("-아서/어서", "ki-aseo-karena"),
          ": ",
          b("비가 와서"),
          ", ",
          b("아파서"),
          ".",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("sempat", "ik-sempat"),
          ". Bedanya sama ",
          ref("-는 바람에", "ki-neun-barame"),
          ": -는 바람에 buat kejadian mendadak yang nggak kamu sengaja.",
        ),
      ],
    },
    "ki-gi-ttaemune": {
      description:
        "-기 때문에 dan N 때문에 artinya karena atau gara-gara, versi yang tegas dan agak resmi.",
      blocks: [
        grammar({
          number: "08",
          title: "-기 때문에 / N 때문에",
          theme: "amber",
          descriptionKo: "이유를 분명하게 말할 때 써요.",
          descriptionTranslation:
            "Artinya “karena” versi tegas dan agak resmi. Sering muncul di tulisan, presentasi, dan soal EPS-TOPIK. Beda sama -아서, di sini boleh pakai tanda lampau sebelum 기.",
          rules: [
            {
              condition: "Kata kerja/sifat",
              form: "-기 때문에",
              example: "바쁘다 → 바쁘기 때문에",
            },
            {
              condition: "Lampau",
              form: "-았/었기 때문에",
              example: "막히다 → 막혔기 때문에",
            },
            {
              condition: "Kata benda + 이다",
              form: "-이기 때문에",
              example: "학생 → 학생이기 때문에",
            },
            {
              condition: "Kata benda saja",
              form: "N 때문에",
              example: "비 → 비 때문에",
            },
            {
              condition: "Di akhir kalimat",
              form: "-기 때문이에요",
              example: "늦었기 때문이에요",
            },
          ],
          examples: [
            { before: "길이 막혔", emphasis: "기 때문에", after: " 늦었어요." },
            {
              before: "비 ",
              emphasis: "때문에",
              after: " 오늘 작업이 취소됐어요.",
            },
          ],
        }),
        p(
          b("Artinya apa sih? "),
          "Ini ",
          i("karena"),
          " yang kamu pakai pas mau kedengeran jelas dan serius. ",
          b("N 때문에"),
          " paling mirip ",
          i("gara-gara …"),
          ": 너 때문에 = gara-gara kamu. Buat hal baik, orang Korea pakai ",
          b("덕분에"),
          " (berkat).",
        ),
        h3("Contoh"),
        ex("길이 막혔기 때문에 늦었어요.", "Aku telat karena macet."),
        ex(
          "비 때문에 오늘 작업이 취소됐어요.",
          "Gara-gara hujan, kerjaan hari ini dibatalin.",
        ),
        ex(
          "저는 무슬림이기 때문에 돼지고기를 안 먹어요.",
          "Aku muslim, jadi nggak makan babi.",
        ),
        ex(
          "내일 시험이 있기 때문에 오늘은 못 놀아요.",
          "Besok ada ujian, jadi hari ini nggak bisa main.",
        ),
        callout(
          "warning",
          "Jebakan: -기 때문에 nggak bisa disambung ajakan atau perintah. ✗ 비가 오기 때문에 우산을 가져가세요 kedengeran janggal. Buat ",
          i("karena hujan, bawa payung ya"),
          ", pakai ",
          ref("-(으)니까", "ki-nikka"),
          ": ",
          b("비가 오니까 우산 가져가세요"),
          ".",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("gara-gara", "ik-gara-gara"),
          " dan ",
          ref("soalnya", "ik-soalnya"),
          ". Bedanya sama ",
          ref("-아서/어서", "ki-aseo-karena"),
          ": -아서 lebih santai dan nggak boleh pakai lampau di depannya.",
        ),
      ],
    },
    "ki-neun-barame": {
      description:
        "-는 바람에 artinya gara-gara ada kejadian mendadak, jadinya hasilnya jelek.",
      blocks: [
        grammar({
          number: "09",
          title: "-는 바람에",
          theme: "amber",
          descriptionKo: "갑자기 생긴 일 때문에 안 좋은 결과가 생겼을 때 써요.",
          descriptionTranslation:
            "Artinya “gara-gara (tiba-tiba) …, jadinya …”. Ada kejadian yang nggak kamu duga, lalu hasilnya jelek. Bentuknya selalu -는, walaupun kejadiannya udah lewat.",
          rules: [
            {
              condition: "Akhiran vokal",
              form: "-는 바람에",
              example: "자다 → 자는 바람에",
            },
            {
              condition: "Akhiran konsonan",
              form: "-는 바람에",
              example: "웃다 → 웃는 바람에",
            },
            {
              condition: "Akhiran ㄹ",
              form: "ㄹ hilang + -는 바람에",
              example: "울다 → 우는 바람에",
            },
            {
              condition: "Lampau",
              form: "tetap -는, lampau di akhir",
              example: "자는 바람에 늦었어요",
            },
            {
              condition: "Kata sifat",
              form: "nggak bisa",
              example: "✗ 바쁜 바람에",
            },
          ],
          examples: [
            {
              before: "늦잠을 자",
              emphasis: "는 바람에",
              after: " 지각했어요.",
            },
            {
              before: "기계가 갑자기 고장 나",
              emphasis: "는 바람에",
              after: " 야근했어요.",
            },
          ],
        }),
        p(
          b("Artinya apa sih? "),
          "Pas kamu ngeluh: ",
          i("gara-gara HP mati, aku nggak bisa ngabarin."),
          " Ada rasa ",
          i("duh, sial"),
          " di situ. Kalimat belakangnya hampir selalu lampau, karena kamu lagi cerita hal yang udah kejadian.",
        ),
        h3("Contoh"),
        ex(
          "늦잠을 자는 바람에 지각했어요.",
          "Gara-gara kesiangan, aku telat masuk.",
        ),
        ex(
          "기계가 갑자기 고장 나는 바람에 야근했어요.",
          "Mesinnya mendadak rusak, jadinya lembur.",
          "cerita di pabrik",
        ),
        ex(
          "휴대폰 배터리가 나가는 바람에 연락을 못 했어요.",
          "HP-ku mati kehabisan baterai, jadi nggak bisa ngabarin.",
        ),
        ex(
          "지하철을 잘못 타는 바람에 30분이나 늦었어요.",
          "Salah naik subway, jadinya telat sampai 30 menit.",
        ),
        callout(
          "warning",
          "Jebakan: orang Indonesia sering nulis ✗ 잤는 바람에 atau ✗ 잔 바람에 karena kejadiannya udah lewat. Yang benar tetap ",
          b("자는 바람에"),
          ". Lampaunya cukup di akhir: ",
          b("자는 바람에 지각했어요"),
          ".",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("gara-gara", "ik-gara-gara"),
          ". Bedanya sama ",
          ref("-느라고", "ki-neurago"),
          ": -느라고 buat kegiatan yang kamu sengaja lakuin, -는 바람에 buat kejadian mendadak.",
        ),
      ],
    },
    "ki-neun-gime": {
      description:
        "-는 김에 artinya sekalian atau mumpung lagi: kamu udah ngelakuin A, jadi sekalian B.",
      blocks: [
        grammar({
          number: "10",
          title: "-는 김에 / -(으)ㄴ 김에",
          theme: "amber",
          descriptionKo: "어떤 일을 하는 기회에 다른 일도 같이 할 때 써요.",
          descriptionTranslation:
            "Artinya “sekalian” atau “mumpung lagi …”. Kamu udah (atau lagi) ngelakuin A, jadi sekalian aja B. Pakai -는 kalau A lagi atau mau dilakuin, -(으)ㄴ kalau A udah terjadi.",
          rules: [
            {
              condition: "Lagi/mau dilakuin",
              form: "-는 김에",
              example: "가다 → 가는 김에",
            },
            {
              condition: "Akhiran ㄹ",
              form: "ㄹ hilang + -는 김에",
              example: "만들다 → 만드는 김에",
            },
            {
              condition: "Udah terjadi (vokal)",
              form: "-ㄴ 김에",
              example: "오다 → 온 김에",
            },
            {
              condition: "Udah terjadi (konsonan)",
              form: "-은 김에",
              example: "씻다 → 씻은 김에",
            },
          ],
          examples: [
            {
              before: "편의점 ",
              emphasis: "가는 김에",
              after: " 물 좀 사다 줘.",
            },
            {
              before: "서울에 ",
              emphasis: "온 김에",
              after: " 친구도 만났어요.",
            },
          ],
        }),
        p(
          b("Artinya apa sih? "),
          "Kata ",
          i("sekalian"),
          " yang paling sering kamu pakai buat nitip: ",
          i("sekalian ke minimarket, beliin air ya."),
          " Pasangan favoritnya ",
          b("사다 주다"),
          " (beliin terus bawain).",
        ),
        h3("Contoh"),
        ex(
          "나가는 김에 쓰레기 좀 버려 줄래요?",
          "Sekalian keluar, buangin sampah dong.",
        ),
        ex(
          "서울에 온 김에 친구도 만났어요.",
          "Mumpung udah di Seoul, sekalian ketemu temen.",
        ),
        ex(
          "청소하는 김에 냉장고도 정리했어요.",
          "Sekalian bersih-bersih, kulkas juga aku rapiin.",
        ),
        ex(
          "편의점 가는 김에 물 좀 사다 줘.",
          "Sekalian ke minimarket, beliin air ya.",
          "반말, ke roommate",
        ),
        callout(
          "warning",
          "Jebakan: ",
          i("sekalian"),
          " yang artinya ",
          i("sekaligus"),
          " itu bukan 김에. ",
          i("Bayarnya sekalian aja"),
          " jadinya ",
          b("한꺼번에 계산해 주세요"),
          ", bukan ✗ 계산하는 김에.",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("sekalian", "ik-sekalian"),
          " dan ",
          ref("mumpung", "ik-mumpung"),
          ". Bedanya sama ",
          ref("-(으)ㄹ 때", "ki-eul-ttae"),
          ": ",
          i("mumpung masih muda"),
          " (kesempatan yang lagi ada) pakai 젊을 때, bukan 김에.",
        ),
      ],
    },
    "ki-gineunkeonyeong": {
      description:
        "-기는커녕 artinya boro-boro … atau bukannya … malah …, dengan nada kesel.",
      blocks: [
        grammar({
          number: "11",
          title: "-기는커녕 / N은/는커녕",
          theme: "amber",
          descriptionKo:
            "기대한 일은 물론이고 더 쉬운 일도 안 될 때, 또는 반대 결과가 나올 때 써요.",
          descriptionTranslation:
            "Artinya “boro-boro …” atau “bukannya … malah …”. Yang diharapkan nggak kejadian, yang lebih gampang pun nggak, atau yang terjadi malah kebalikannya. Biasanya ditemenin 도, 오히려, atau -만 di belakang.",
          rules: [
            {
              condition: "Kata kerja/sifat",
              form: "-기는커녕",
              example: "쉬다 → 쉬기는커녕",
            },
            {
              condition: "하다",
              form: "-하기는커녕",
              example: "사과하다 → 사과하기는커녕",
            },
            {
              condition: "Kata benda (vokal)",
              form: "N는커녕",
              example: "커피 → 커피는커녕",
            },
            {
              condition: "Kata benda (konsonan)",
              form: "N은커녕",
              example: "밥 → 밥은커녕",
            },
          ],
          examples: [
            {
              before: "사과하",
              emphasis: "기는커녕",
              after: " 오히려 화를 냈어요.",
            },
            { before: "밥", emphasis: "은커녕", after: " 물도 못 마셨어요." },
          ],
        }),
        p(
          b("Artinya apa sih? "),
          "Ada dua rasa: ",
          i("boro-boro makan, minum aja nggak sempet"),
          " (yang lebih gampang pun gagal), dan ",
          i("bukannya minta maaf, malah marah"),
          " (hasilnya kebalikan). Dua-duanya bernada kesel.",
        ),
        h3("Contoh"),
        ex(
          "사과하기는커녕 오히려 화를 냈어요.",
          "Bukannya minta maaf, dia malah marah.",
        ),
        ex(
          "주말에 쉬기는커녕 더 바빴어요.",
          "Boro-boro istirahat, weekend malah makin sibuk.",
        ),
        ex(
          "밥은커녕 물도 못 마셨어요.",
          "Boro-boro makan, minum air aja nggak sempet.",
          "shift sibuk di pabrik",
        ),
        ex(
          "돈을 모으기는커녕 빚만 늘었어요.",
          "Bukannya nabung, malah utang yang nambah.",
        ),
        callout(
          "warning",
          "Jebakan: ",
          i("bukan … tapi …"),
          " yang netral itu bukan 커녕. ",
          i("Aku minumnya bukan kopi, tapi teh"),
          " jadinya ",
          b("커피 말고 차를 마셨어요"),
          ". ✗ 커피는커녕 차를 마셨어요 kedengeran aneh, seolah teh itu hal yang lebih buruk.",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("malah", "ik-malah"),
          ". Bedanya sama ",
          ref("오히려", "ki-ohiryeo"),
          ": 오히려 cuma kata ",
          i("malah"),
          ", dan sering dipasang bareng -기는커녕.",
        ),
      ],
    },
    "ki-eulsurok": {
      description:
        "-(으)면 -(으)ㄹ수록 artinya makin … makin …: kata kerjanya diulang dua kali.",
      blocks: [
        grammar({
          number: "12",
          title: "-(으)면 -(으)ㄹ수록",
          theme: "amber",
          descriptionKo: "앞의 정도가 커지면 뒤의 정도도 같이 커질 때 써요.",
          descriptionTranslation:
            "Artinya “makin … makin …”. Kata kerjanya diulang dua kali, sama kayak kita ngulang “makin”. Bagian -(으)면 di depan boleh dibuang: 들을수록 좋아요 juga bener.",
          rules: [
            {
              condition: "Akhiran vokal",
              form: "-면 -ㄹ수록",
              example: "보다 → 보면 볼수록",
            },
            {
              condition: "Akhiran konsonan",
              form: "-으면 -을수록",
              example: "먹다 → 먹으면 먹을수록",
            },
            {
              condition: "Akhiran ㄹ",
              form: "-면 -수록 (ㄹ tetap)",
              example: "알다 → 알면 알수록",
            },
            {
              condition: "하다",
              form: "-하면 -할수록",
              example: "공부하다 → 공부하면 할수록",
            },
            {
              condition: "Kata sifat",
              form: "-(으)ㄹ수록",
              example: "빠르다 → 빠를수록",
            },
            {
              condition: "Ungkapan tetap",
              form: "갈수록",
              example: "= makin lama makin",
            },
          ],
          examples: [
            { before: "들으면 들", emphasis: "을수록", after: " 좋아요." },
            {
              before: "한국어는 공부하면 ",
              emphasis: "할수록",
              after: " 재미있어요.",
            },
          ],
        }),
        p(
          b("Artinya apa sih? "),
          "Persis kayak ",
          i("makin didengerin makin enak"),
          " atau ",
          i("makin cepet makin bagus"),
          ". Tulisnya nempel: ",
          b("볼수록"),
          ", bukan 볼 수록.",
        ),
        h3("Contoh"),
        ex(
          "들으면 들을수록 좋아요.",
          "Makin didengerin, makin enak.",
          "lagu K-pop baru",
        ),
        ex(
          "한국어는 공부하면 할수록 재미있어요.",
          "Bahasa Korea tuh makin dipelajari makin seru.",
        ),
        ex(
          "빠를수록 좋아요.",
          "Makin cepet makin bagus.",
          "kalimat favorit 사장님",
        ),
        ex("날씨가 갈수록 추워지네요.", "Cuacanya makin lama makin dingin ya."),
        ex(
          "그 사람은 알면 알수록 멋있어.",
          "Orang itu makin dikenal makin keren.",
          "반말",
        ),
        callout(
          "warning",
          "Jebakan: ",
          i("makin"),
          " yang berdiri sendiri (",
          i("makin dingin"),
          ") itu bukan -(으)ㄹ수록, tapi ",
          ref("-아/어지다", "ki-ajida"),
          ": ",
          b("점점 추워져요"),
          ". -(으)ㄹ수록 cuma dipakai kalau ada dua hal yang naik bareng.",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("makin … makin", "ik-makin"),
          ".",
        ),
      ],
    },
    "ki-giman-hamyeon": {
      description:
        "-기만 하면 artinya asal …, yang penting …, atau tiap kali …, pasti ….",
      blocks: [
        grammar({
          number: "13",
          title: "-기만 하면",
          theme: "amber",
          descriptionKo:
            "그 일 하나만 하면 된다고 말하거나, 그 일을 할 때마다 같은 결과가 생길 때 써요.",
          descriptionTranslation:
            "Punya dua arti. Kalau ujungnya 돼요, artinya “asal …, udah cukup” atau “tinggal … aja”. Kalau ujungnya kejadian lain, artinya “tiap kali …, pasti …”.",
          rules: [
            {
              condition: "Kata kerja",
              form: "-기만 하면",
              example: "오다 → 오기만 하면",
            },
            {
              condition: "Kata sifat",
              form: "-기만 하면",
              example: "건강하다 → 건강하기만 하면",
            },
            {
              condition: "Arti “asal”",
              form: "-기만 하면 돼요",
              example: "하기만 하면 돼요",
            },
            {
              condition: "Arti “tiap kali”",
              form: "-기만 하면 + hasil",
              example: "보기만 하면 울어요",
            },
            {
              condition: "Kata benda",
              form: "N만 있으면",
              example: "돈 → 돈만 있으면",
            },
          ],
          examples: [
            { before: "서류에 사인하", emphasis: "기만 하면", after: " 돼요." },
            {
              before: "동생은 드라마를 보",
              emphasis: "기만 하면",
              after: " 울어요.",
            },
          ],
        }),
        p(
          b("Artinya apa sih? "),
          "Arti pertama: ",
          i("yang penting sehat"),
          ", ",
          i("tinggal tanda tangan aja"),
          ". Arti kedua: ",
          i("adikku tiap nonton drakor pasti nangis."),
        ),
        h3("Contoh"),
        ex(
          "열심히 하기만 하면 돼요.",
          "Yang penting kamu rajin, itu udah cukup.",
        ),
        ex(
          "서류에 사인하기만 하면 돼요.",
          "Tinggal tanda tangan dokumennya aja.",
        ),
        ex("시간 맞춰 오기만 하면 괜찮아요.", "Asal dateng tepat waktu, aman."),
        ex(
          "동생은 드라마를 보기만 하면 울어요.",
          "Adikku tiap nonton drakor pasti nangis.",
        ),
        ex(
          "건강하기만 하면 돼.",
          "Yang penting sehat.",
          "반말, ibu di telepon",
        ),
        callout(
          "warning",
          "Jebakan: ",
          i("asal"),
          " yang artinya ",
          i("asal-asalan"),
          " (sembarangan) itu bukan -기만 하면, tapi ",
          b("대충"),
          ": ",
          b("대충 하지 마세요"),
          " = jangan asal-asalan.",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("asal", "ik-asal"),
          ". Bedanya sama ",
          ref("-(으)면", "ki-myeon"),
          ": 오면 돼요 cuma ",
          i("kalau dateng, oke"),
          ", 오기만 하면 돼요 nekenin ",
          i("asal dateng aja, beres"),
          ".",
        ),
      ],
    },
  },
  vocabulary: {
    title: "Kosakata: Waktu dan sebab",
    description:
      "Tiga belas pola buat nyambungin cerita: sebelum, setelah, pas, gara-gara, sekalian, sampai makin-makin. Masing-masing dengan arti dan satu contoh.",
    entries: [
      {
        term: "-기 전에",
        meanings: ["sebelum"],
        example: { ko: "자기 전에 샤워해요.", id: "Aku mandi sebelum tidur." },
      },
      {
        term: "-(으)ㄴ 후에 / 다음에",
        meanings: ["abis", "setelah"],
        example: {
          ko: "밥을 먹은 후에 약을 드세요.",
          id: "Obatnya diminum abis makan ya.",
        },
      },
      {
        term: "-(으)ㄹ 때",
        meanings: ["pas", "waktu", "ketika"],
        example: {
          ko: "힘들 때 이 노래를 들어요.",
          id: "Pas lagi capek, aku dengerin lagu ini.",
        },
      },
      {
        term: "-아도/어도",
        meanings: ["walaupun", "biarpun"],
        example: {
          ko: "비가 와도 출근해야 돼요.",
          id: "Hujan pun tetep harus masuk kerja.",
        },
      },
      {
        term: "-다가",
        meanings: ["lagi …, eh terus"],
        example: {
          ko: "드라마를 보다가 잠들었어요.",
          id: "Lagi nonton drakor, eh ketiduran.",
        },
      },
      {
        term: "-자마자",
        meanings: ["begitu …, langsung"],
        example: {
          ko: "집에 도착하자마자 잤어요.",
          id: "Begitu nyampe rumah, langsung tidur.",
        },
      },
      {
        term: "-느라고",
        meanings: ["gara-gara sibuk …", "nggak sempat karena …"],
        example: {
          ko: "일하느라고 전화를 못 받았어요.",
          id: "Tadi lagi kerja, jadi nggak sempet angkat telepon.",
        },
      },
      {
        term: "-기 때문에 / 때문에",
        meanings: ["karena", "gara-gara"],
        example: {
          ko: "비 때문에 오늘 작업이 취소됐어요.",
          id: "Gara-gara hujan, kerjaan hari ini dibatalin.",
        },
      },
      {
        term: "-는 바람에",
        meanings: ["gara-gara (mendadak)"],
        example: {
          ko: "늦잠을 자는 바람에 지각했어요.",
          id: "Gara-gara kesiangan, aku telat masuk.",
        },
      },
      {
        term: "-는 김에",
        meanings: ["sekalian", "mumpung"],
        example: {
          ko: "편의점 가는 김에 물 좀 사다 줘.",
          id: "Sekalian ke minimarket, beliin air ya.",
        },
      },
      {
        term: "-기는커녕",
        meanings: ["boro-boro", "bukannya … malah"],
        example: {
          ko: "주말에 쉬기는커녕 더 바빴어요.",
          id: "Boro-boro istirahat, weekend malah makin sibuk.",
        },
      },
      {
        term: "-(으)면 -(으)ㄹ수록",
        meanings: ["makin … makin"],
        example: {
          ko: "들으면 들을수록 좋아요.",
          id: "Makin didengerin, makin enak.",
        },
      },
      {
        term: "-기만 하면",
        meanings: ["asal", "yang penting", "tiap kali"],
        example: {
          ko: "서류에 사인하기만 하면 돼요.",
          id: "Tinggal tanda tangan dokumennya aja.",
        },
      },
    ],
  },
  quiz: {
    title: "Kuis: Waktu dan sebab",
    description:
      "12 soal buat ngecek kamu udah bisa milih sebelum, setelah, pas, lagi … eh, begitu … langsung, gara-gara, sekalian, boro-boro, makin-makin, dan asal sesuai situasi.",
    passingScore: 70,
    questions: [
      {
        key: "ws-gi-jeone-1",
        prompt:
          "Mana yang benar buat “Sebelum dateng ke Korea, aku belajar bahasa Korea di LPK”?",
        options: [
          {
            text: "한국에 오기 전에 LPK에서 한국어를 배웠어요.",
            correct: true,
          },
          { text: "한국에 왔기 전에 LPK에서 한국어를 배웠어요." },
          { text: "한국에 온 전에 LPK에서 한국어를 배웠어요." },
          { text: "한국에 오기 후에 LPK에서 한국어를 배웠어요." },
        ],
        explanation:
          "Kata kerja sebelum -기 전에 selalu polos: 오기 전에. Tanda lampaunya cukup di akhir (배웠어요). 왔기 전에 itu jebakan klasik orang Indonesia.",
      },
      {
        key: "ws-eun-hue-1",
        prompt:
          "Apoteker bilang “Obatnya diminum abis makan ya.” Mana yang benar?",
        options: [
          { text: "밥을 먹은 후에 약을 드세요.", correct: true },
          { text: "밥을 먹었은 후에 약을 드세요." },
          { text: "밥을 먹는 후에 약을 드세요." },
          { text: "밥을 먹기 후에 약을 드세요." },
        ],
        explanation:
          "Setelah = -(으)ㄴ 후에, dan akhiran konsonan dapet -은: 먹은 후에. ㄴ-nya udah artinya “udah”, jadi 먹었은 itu dobel lampau. -기 cuma pasangannya 전에.",
      },
      {
        key: "ws-eul-ttae-1",
        prompt:
          "“Waktu pertama (udah) nyampe di Korea, dingin banget.” Pilih yang paling pas.",
        options: [
          { text: "한국에 처음 갈 때 너무 추웠어요." },
          { text: "한국에 처음 왔을 때 너무 추웠어요.", correct: true },
          { text: "한국에 처음 오면 너무 추웠어요." },
          { text: "한국에 처음 온 김에 너무 추웠어요." },
        ],
        explanation:
          "Kamu udah nyampe di Korea, jadi pakai -았/었을 때: 왔을 때. 갈 때 artinya pas lagi berangkat, masih di jalan.",
      },
      {
        key: "ws-daga-1",
        prompt:
          "“Lagi nonton drakor, eh ketiduran.” Pilih yang paling natural.",
        options: [
          { text: "드라마를 보다가 잠들었어요.", correct: true },
          { text: "드라마를 보자마자 잠들었어요." },
          { text: "드라마를 보기 전에 잠들었어요." },
          { text: "드라마를 보는 김에 잠들었어요." },
        ],
        explanation:
          "“Lagi … eh …” itu jiwanya -다가: kegiatan pertama kepotong sama hal lain. 보자마자 artinya baru mulai nonton langsung tidur, beda cerita.",
      },
      {
        key: "ws-jamaja-1",
        prompt:
          "“Begitu gajian, langsung kirim uang ke rumah.” Mana yang benar?",
        options: [
          { text: "월급을 받았자마자 집에 돈을 보냈어요." },
          { text: "월급을 받자마자 집에 돈을 보냈어요.", correct: true },
          { text: "월급을 받다가 집에 돈을 보냈어요." },
          { text: "월급을 받기 전에 집에 돈을 보냈어요." },
        ],
        explanation:
          "Begitu … langsung = -자마자, dan kata kerjanya polos: 받자마자. Tanda lampau cuma di akhir (보냈어요). 받았자마자 itu salah.",
      },
      {
        key: "ws-neurago-1",
        prompt: "Kalimat mana yang SALAH?",
        options: [
          { text: "일하느라고 전화를 못 받았어요." },
          { text: "비가 와도 출근해야 돼요." },
          { text: "비가 오느라고 못 갔어요.", correct: true },
          { text: "비싸도 이건 사고 싶어요." },
        ],
        explanation:
          "-느라고 cuma buat kegiatan yang kamu sengaja lakuin. Hujan bukan kegiatanmu, jadi 비가 오느라고 salah. Pakai 비가 와서 atau 비가 오는 바람에. Dua kalimat -아도/어도 (walaupun) itu bener semua.",
      },
      {
        key: "ws-ttaemune-1",
        prompt: "“Karena hujan, bawa payung ya.” Pilih yang paling natural.",
        options: [
          { text: "비가 오기 때문에 우산 가져가세요." },
          { text: "비가 오니까 우산 가져가세요.", correct: true },
          { text: "비가 와서 우산 가져가세요." },
          { text: "비가 오는 바람에 우산 가져가세요." },
        ],
        explanation:
          "Ada suruhan (가져가세요) di belakang, jadi pakai -(으)니까. -아서, -기 때문에, dan -는 바람에 nggak cocok disambung perintah atau ajakan.",
      },
      {
        key: "ws-barame-1",
        prompt: "“Gara-gara kesiangan, aku telat masuk.” Mana yang benar?",
        options: [
          { text: "늦잠을 잤는 바람에 지각했어요." },
          { text: "늦잠을 잔 바람에 지각했어요." },
          { text: "늦잠을 자는 바람에 지각했어요.", correct: true },
          { text: "늦잠을 자기 전에 지각했어요." },
        ],
        explanation:
          "-는 바람에 bentuknya selalu -는, walaupun kejadiannya udah lewat: 자는 바람에. Lampaunya cukup di akhir (지각했어요).",
      },
      {
        key: "ws-gime-1",
        prompt:
          "Roommate mau ke minimarket. Kamu nitip: “Sekalian ke minimarket, beliin air ya.”",
        options: [
          { text: "편의점 가는 김에 물 좀 사다 줘.", correct: true },
          { text: "편의점 가기는커녕 물 좀 사다 줘." },
          { text: "편의점 갈수록 물 좀 사다 줘." },
          { text: "편의점 가느라고 물 좀 사다 줘." },
        ],
        explanation:
          "“Sekalian” buat nitip itu -는 김에. Temennya lagi mau pergi, jadi pakai 가는 김에. Plus 사다 주다 = beliin terus bawain.",
      },
      {
        key: "ws-keonyeong-1",
        prompt:
          "“Boro-boro makan, minum air aja nggak sempet.” Pilih yang paling pas.",
        options: [
          { text: "밥 말고 물을 마셨어요." },
          { text: "밥은커녕 물도 못 마셨어요.", correct: true },
          { text: "밥 때문에 물도 못 마셨어요." },
          { text: "밥만 있으면 물도 못 마셨어요." },
        ],
        explanation:
          "Boro-boro = N은/는커녕, biasanya ditemenin 도 + 못 di belakang. 밥 말고 물을 마셨어요 artinya “bukan nasi, tapi air”, netral dan nggak ada rasa kesel-nya.",
      },
      {
        key: "ws-surok-1",
        prompt:
          "“Cuacanya makin dingin ya.” (cuma satu hal yang berubah) Mana yang pas?",
        options: [
          { text: "날씨가 점점 추워지네요.", correct: true },
          { text: "날씨가 추울수록 좋아요." },
          { text: "날씨가 춥기만 하면 돼요." },
          { text: "날씨가 추워도 돼요." },
        ],
        explanation:
          "“Makin” yang berdiri sendiri itu -아/어지다 (jadi makin …): 추워지네요. 추울수록 좋아요 artinya “makin dingin makin bagus”, beda maksud. -(으)ㄹ수록 dipakai kalau ada dua hal yang naik bareng.",
      },
      {
        key: "ws-giman-1",
        prompt:
          "Staf kantor bilang: “Tinggal tanda tangan dokumennya aja.” Mana yang dia ucapin?",
        options: [
          { text: "서류에 사인해도 돼요." },
          { text: "서류에 사인하기만 하면 돼요.", correct: true },
          { text: "서류에 사인하자마자 돼요." },
          { text: "서류에 사인하기 때문에 돼요." },
        ],
        explanation:
          "“Tinggal … aja” atau “asal …” = -기만 하면 돼요. 사인해도 돼요 artinya “boleh tanda tangan”, bukan “cukup tanda tangan”.",
      },
    ],
  },
});
