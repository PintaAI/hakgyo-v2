import { b, callout, defineBab, ex, grammar, h3, i, p, ref } from "../blocks";

export default defineBab({
  key: "ki-06-akhiran-rasa",
  materials: {
    "ki-janayo": {
      description:
        "-잖아요 = kan yang ngingetin: info yang lawan bicara sebenarnya udah tahu.",
      blocks: [
        grammar({
          number: "01",
          title: "-잖아요",
          descriptionKo: "듣는 사람도 이미 아는 사실을 다시 말할 때 써요.",
          descriptionTranslation:
            "Dipakai buat ngingetin hal yang lawan bicara sebenarnya udah tahu. Rasanya persis kayak kan di “kan udah aku bilang”. Nadanya bisa santai, bisa juga protes, tergantung intonasi.",
          rules: [
            {
              condition: "Kata kerja / sifat",
              form: "-잖아요",
              example: "가다 → 가잖아요, 춥다 → 춥잖아요",
            },
            {
              condition: "Lampau",
              form: "-았/었잖아요",
              example: "말했잖아요, 먹었잖아요",
            },
            {
              condition: "Kata benda, akhiran vokal",
              form: "-잖아요",
              example: "친구잖아요",
            },
            {
              condition: "Kata benda, akhiran konsonan",
              form: "-이잖아요",
              example: "학생이잖아요",
            },
            { condition: "반말", form: "-잖아", example: "말했잖아" },
          ],
          examples: [
            { before: "제가 어제 ", emphasis: "말했잖아요", after: "." },
            { before: "오늘 일요일", emphasis: "이잖아요", after: "." },
            { before: "너 매운 거 잘 먹", emphasis: "잖아", after: "." },
          ],
          theme: "amber",
        }),
        p(
          b("Artinya apa sih? "),
          "Kuncinya: infonya ",
          b("udah diketahui berdua"),
          ". Kamu nggak ngasih info baru, kamu cuma bilang “inget kan?”. Persis kayak ",
          i("Kan aku udah bilang"),
          " atau ",
          i("Kamu kan Muslim"),
          ".",
        ),
        h3("Contoh"),
        ex("제가 어제 말했잖아요.", "Kan kemarin aku udah bilang."),
        ex(
          "오늘 일요일이잖아요. 공장 쉬는 날이에요.",
          "Hari ini kan Minggu. Pabrik libur.",
        ),
        ex("비 오잖아요. 우산 가져가세요.", "Kan lagi hujan. Bawa payung gih."),
        ex(
          "저 무슬림이잖아요. 돼지고기는 못 먹어요.",
          "Aku kan Muslim. Nggak bisa makan babi.",
          "ke teman yang udah tahu",
        ),
        ex("너 매운 거 잘 먹잖아.", "Kamu kan jago makan pedas.", "반말"),
        callout(
          "warning",
          "Jebakan: jangan pakai -잖아요 buat info baru. 저 인도네시아 사람이잖아요 ke orang yang baru kenal kedengeran aneh, kayak bilang “aku kan orang Indonesia” ke orang asing. Buat info baru, pakai ",
          ref("-거든요", "ki-geodeunyo"),
          ".",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("kan", "ik-kan"),
          " dan ",
          ref("padahal (nyalahin)", "ik-padahal-protes"),
          ". Bedanya sama ",
          ref("-죠", "ki-jiyo"),
          ": -죠 masih nanya, -잖아요 udah yakin dan cuma ngingetin.",
        ),
      ],
    },
    "ki-jiyo": {
      description:
        "-죠? = kan? / ya? buat mastiin atau minta lawan bicara setuju.",
      blocks: [
        grammar({
          number: "02",
          title: "-지요 / -죠",
          descriptionKo: "상대방에게 확인하거나 동의를 구할 때 써요.",
          descriptionTranslation:
            "Dipakai buat mastiin atau minta setuju: “besok datang kan?”, “dingin ya?”. Di obrolan hampir selalu disingkat jadi -죠. Kamu udah punya dugaan, tinggal minta lawan bicara bilang “iya”.",
          rules: [
            {
              condition: "Kata kerja / sifat",
              form: "-죠",
              example: "오다 → 오죠, 춥다 → 춥죠",
            },
            { condition: "Lampau", form: "-았/었죠", example: "먹었죠, 했죠" },
            {
              condition: "Kata benda, akhiran vokal",
              form: "-죠",
              example: "친구죠",
            },
            {
              condition: "Kata benda, akhiran konsonan",
              form: "-이죠",
              example: "학생이죠",
            },
            { condition: "반말", form: "-지", example: "내일 오지?" },
          ],
          examples: [
            { before: "내일 쉬는 날이", emphasis: "죠", after: "?" },
            { before: "한국 겨울 진짜 춥", emphasis: "죠", after: "?" },
            { before: "그렇", emphasis: "죠", after: "!" },
          ],
          theme: "amber",
        }),
        p(
          b("Artinya apa sih? "),
          "Anggap aja -죠 itu ",
          i("kan?"),
          " atau ",
          i("ya?"),
          " di ujung kalimat. 내일 와요? = ",
          i("besok datang?"),
          " (beneran nggak tahu). 내일 오죠? = ",
          i("besok datang kan?"),
          " (aku kira iya).",
        ),
        h3("Contoh"),
        ex("내일 쉬는 날이죠?", "Besok libur kan?"),
        ex("이거 할랄이죠?", "Ini halal kan?", "ke teman yang udah ngecek"),
        ex("한국 겨울 진짜 춥죠?", "Musim dingin di Korea dingin banget ya?"),
        ex(
          "A: 이 드라마 재밌죠? B: 그렇죠!",
          "A: Drakor ini seru kan? B: Iya dong!",
        ),
        ex("너도 같이 가지?", "Kamu ikut juga kan?", "반말"),
        callout(
          "warning",
          "Jebakan: jangan ketuker sama 줘요 (kasih, tolong). Bunyinya mirip, tapi 내일 오죠? artinya “besok datang kan?”, bukan permintaan. Waktu nulis chat, pastiin kamu nulis 죠, bukan 줘.",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("kan", "ik-kan"),
          ". Bedanya sama ",
          ref("-잖아요", "ki-janayo"),
          ": 월급날이죠? = gajian kan? (mastiin). 월급날이잖아요! = kan gajian! (kamu lupa ya?).",
        ),
      ],
    },
    "ki-geodeunyo": {
      description:
        "-거든요 = soalnya: alasan atau latar belakang yang lawan bicara belum tahu.",
      blocks: [
        grammar({
          number: "03",
          title: "-거든요",
          descriptionKo: "상대방이 모르는 이유나 사정을 알려 줄 때 써요.",
          descriptionTranslation:
            "Dipakai buat ngasih alasan atau latar belakang yang lawan bicara belum tahu. Padanan paling pas: soalnya, yang ditaruh di belakang. Bisa juga buat buka cerita, kayak “jadi gini...”.",
          rules: [
            {
              condition: "Kata kerja / sifat",
              form: "-거든요",
              example: "바쁘다 → 바쁘거든요",
            },
            {
              condition: "Lampau",
              form: "-았/었거든요",
              example: "먹었거든요, 했거든요",
            },
            {
              condition: "Kata benda, akhiran vokal",
              form: "-거든요",
              example: "친구거든요",
            },
            {
              condition: "Kata benda, akhiran konsonan",
              form: "-이거든요",
              example: "학생이거든요",
            },
            { condition: "반말", form: "-거든", example: "피곤하거든" },
          ],
          examples: [
            {
              before: "먼저 갈게요. 내일 일찍 출근해야 하",
              emphasis: "거든요",
              after: ".",
            },
            { before: "저 무슬림이", emphasis: "거든요", after: "." },
            {
              before: "제가 어제 홍대에 갔",
              emphasis: "거든요",
              after: ". 근데...",
            },
          ],
          theme: "amber",
        }),
        p(
          b("Artinya apa sih? "),
          i("Soalnya"),
          "! Urutannya juga sama kayak bahasa Indonesia: ngomong dulu, alasannya belakangan. ",
          i("Aku duluan ya. Soalnya besok kerja pagi."),
        ),
        h3("Contoh"),
        ex(
          "먼저 갈게요. 내일 일찍 출근해야 하거든요.",
          "Aku duluan ya. Soalnya besok harus berangkat kerja pagi.",
        ),
        ex(
          "저는 돼지고기 안 먹어요. 무슬림이거든요.",
          "Aku nggak makan babi. Soalnya aku Muslim.",
          "ke kenalan baru",
        ),
        ex(
          "이 편의점은 밤에 손님이 별로 없거든요.",
          "Minimarket ini malam-malam sepi soalnya.",
        ),
        ex(
          "제가 어제 홍대에 갔거든요. 근데 거기서 연예인을 봤어요!",
          "Jadi gini, kemarin aku ke Hongdae. Terus di sana aku lihat artis!",
        ),
        ex(
          "오늘은 못 가. 야간 근무가 있거든.",
          "Hari ini nggak bisa. Soalnya ada shift malam.",
          "반말",
        ),
        callout(
          "warning",
          "Jebakan: -거든요 cuma bisa di akhir kalimat. Kalau alasannya mau ditaruh di depan, pakai ",
          ref("-아서/어서", "ki-aseo-karena"),
          " atau ",
          ref("-(으)니까", "ki-nikka"),
          ": 피곤해서 먼저 갈게요. Jangan ✗ 피곤하거든요 먼저 갈게요.",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("soalnya", "ik-soalnya"),
          " dan ",
          ref("loh", "ik-loh"),
          ". Bedanya sama ",
          ref("-잖아요", "ki-janayo"),
          ": -거든요 buat info baru, -잖아요 buat hal yang lawan bicara udah tahu.",
        ),
      ],
    },
    "ki-neyo": {
      description:
        "-네요 = wah, ternyata: reaksi spontan waktu kamu baru ngeh sesuatu.",
      blocks: [
        grammar({
          number: "04",
          title: "-네요",
          descriptionKo: "지금 새로 알게 된 것에 놀라거나 감탄할 때 써요.",
          descriptionTranslation:
            "Reaksi spontan waktu kamu baru ngeh sesuatu, saat itu juga: “wah, enak!”, “eh, udah jam lima aja”. Kuncinya, kamu baru ngalamin atau lihat sendiri barusan.",
          rules: [
            {
              condition: "Kata kerja / sifat",
              form: "-네요",
              example: "맛있다 → 맛있네요",
            },
            {
              condition: "Batang berakhiran ㄹ (ㄹ hilang)",
              form: "-네요",
              example: "멀다 → 머네요",
            },
            { condition: "Lampau", form: "-았/었네요", example: "많이 컸네요" },
            {
              condition: "Kata benda, akhiran vokal",
              form: "-네요",
              example: "다섯 시네요",
            },
            {
              condition: "Kata benda, akhiran konsonan",
              form: "-이네요",
              example: "학생이네요",
            },
            { condition: "반말", form: "-네", example: "맛있네!" },
          ],
          examples: [
            { before: "와, 이 떡볶이 진짜 맛있", emphasis: "네요", after: "!" },
            { before: "벌써 다섯 시", emphasis: "네요", after: "." },
            { before: "한국어 잘하시", emphasis: "네요", after: "!" },
          ],
          theme: "amber",
        }),
        p(
          b("Artinya apa sih? "),
          "-네요 itu suara kamu yang lagi kaget kecil: ",
          i("wah..., eh..., ternyata..."),
          ", atau ",
          i("kok"),
          " yang kagum. Kamu nggak lagi ngasih info, kamu lagi ",
          b("bereaksi"),
          ".",
        ),
        h3("Contoh"),
        ex("와, 이 떡볶이 진짜 맛있네요!", "Wah, tteokbokki-nya enak banget!"),
        ex("벌써 다섯 시네요.", "Eh, udah jam lima aja."),
        ex("오늘 사람 진짜 많네요.", "Ramai banget ya hari ini."),
        ex("어, 눈 오네요!", "Eh, salju turun!", "pertama kali lihat salju"),
        ex(
          "한국어 잘하시네요!",
          "Kok jago sih bahasa Koreanya!",
          "pujian yang bakal sering kamu dengar",
        ),
        callout(
          "warning",
          "Jebakan: -네요 cuma buat hal yang baru kamu sadari. ✗ 저는 인도네시아 사람이네요 kedengeran kayak kamu baru nyadar kamu orang Indonesia. Cukup bilang 인도네시아 사람이에요.",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("ternyata", "ik-ternyata"),
          " dan ",
          ref("kok", "ik-kok"),
          ". Bedanya sama ",
          ref("-더라고요", "ki-deora"),
          ": -네요 kaget saat itu juga, -더라고요 diceritain belakangan.",
        ),
      ],
    },
    "ki-gunyo": {
      description:
        "-군요 / -구나 = oh, gitu ya: nerima info yang baru kamu dengar.",
      blocks: [
        grammar({
          number: "05",
          title: "-군요 / -구나",
          descriptionKo: "새로 알게 된 사실을 받아들이면서 말할 때 써요.",
          descriptionTranslation:
            "Dipakai waktu kamu baru dapat info dan nerima info itu: “oh, gitu ya”, “oh, pantes”. Bentuk sopannya, -군요, agak resmi. Di obrolan santai, versi 반말 -구나 jauh lebih sering.",
          rules: [
            {
              condition: "Kata sifat",
              form: "-군요",
              example: "예쁘다 → 예쁘군요",
            },
            {
              condition: "Kata kerja",
              form: "-는군요",
              example: "먹다 → 먹는군요",
            },
            { condition: "Lampau", form: "-았/었군요", example: "갔군요" },
            {
              condition: "Kata benda",
              form: "-(이)군요",
              example: "학생이군요, 친구군요",
            },
            {
              condition: "반말",
              form: "-구나 / -는구나",
              example: "그렇구나, 잘 먹는구나",
            },
          ],
          examples: [
            { before: "아, 그렇", emphasis: "군요", after: "." },
            { before: "그래서 오늘 안 왔", emphasis: "군요", after: "." },
            { before: "아, 오늘 휴일이", emphasis: "구나", after: "!" },
          ],
          theme: "amber",
        }),
        p(
          b("Artinya apa sih? "),
          "Bayangin teman cerita, terus kamu manggut-manggut: ",
          i("“Ooh, gitu ya.” “Oh, pantes.”"),
          " Itu -군요. Yang wajib dihafal: ",
          b("그렇군요"),
          " (sopan) dan ",
          b("그렇구나"),
          " (santai).",
        ),
        h3("Contoh"),
        ex(
          "A: 저 다음 달에 인도네시아에 돌아가요. B: 아, 그렇군요.",
          "A: Bulan depan aku pulang ke Indonesia. B: Oh, gitu ya.",
        ),
        ex(
          "그래서 민수 씨가 오늘 안 왔군요.",
          "Oh, makanya Minsu hari ini nggak datang.",
        ),
        ex(
          "매운 걸 잘 드시는군요!",
          "Wah, ternyata kuat makan pedas ya!",
          "sopan, ke orang yang lebih tua",
        ),
        ex("그렇구나. 몰랐어.", "Oh gitu. Aku baru tahu.", "반말"),
        ex("아, 오늘 휴일이구나!", "Oh, hari ini tanggal merah toh!", "반말"),
        callout(
          "warning",
          "Jebakan: -군요 di obrolan sopan kedengeran agak kaku, kayak bapak-bapak. Ke teman kerja seumuran, 아, 그렇구나 atau 아, 그래요? lebih natural. Ke 사장님, 아, 그렇군요 aman dan sopan.",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("pantesan", "ik-pantesan"),
          " dan ",
          ref("ternyata", "ik-ternyata"),
          ". Bedanya sama ",
          ref("-네요", "ki-neyo"),
          ": -네요 kaget sendiri (wah!), -군요 nerima info dari orang (oh, gitu).",
        ),
      ],
    },
    "ki-geot-gatda": {
      description:
        "-(으)ㄴ/는 것 같다 = kayaknya: buat nebak atau ngalusin pendapat sendiri.",
      blocks: [
        grammar({
          number: "06",
          title: "-(으)ㄴ/는/(으)ㄹ 것 같다",
          descriptionKo: "추측하거나 자기 생각을 부드럽게 말할 때 써요.",
          descriptionTranslation:
            "Ini kayaknya yang serba guna. Bisa buat nebak (“kayaknya mau hujan”) atau buat ngalusin pendapat (“kayaknya agak kekecilan”). Bentuk di depan 것 ikut waktunya: udah, lagi, atau bakal terjadi.",
          rules: [
            {
              condition: "Kata kerja / 있다·없다, sekarang",
              form: "-는 것 같다",
              example: "비가 오는 것 같아요, 맛있는 것 같아요",
            },
            {
              condition: "Kata kerja, lampau",
              form: "-(으)ㄴ 것 같다",
              example: "비가 온 것 같아요",
            },
            {
              condition: "Nanti / bakal terjadi",
              form: "-(으)ㄹ 것 같다",
              example: "비가 올 것 같아요",
            },
            {
              condition: "Kata sifat, sekarang",
              form: "-(으)ㄴ 것 같다",
              example: "바쁜 것 같아요, 작은 것 같아요",
            },
            {
              condition: "Kata benda",
              form: "-인 것 같다",
              example: "한국 사람인 것 같아요",
            },
            {
              condition: "Obrolan",
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
              before: "반장님이 오늘 기분이 안 ",
              emphasis: "좋은 것 같아요",
              after: ".",
            },
            { before: "버스를 잘못 ", emphasis: "탄 것 같아요", after: "." },
          ],
          theme: "amber",
        }),
        p(
          b("Artinya apa sih? "),
          "Persis kayak ",
          i("kayaknya"),
          ", termasuk kebiasaan kita bilang ",
          i("“kayaknya aku laper deh”"),
          " padahal jelas laper. Orang Korea juga gitu, biar omongannya nggak terlalu tegas.",
        ),
        h3("Contoh"),
        ex(
          "하늘 보니까 비가 올 것 같아요.",
          "Lihat langitnya, kayaknya mau hujan.",
        ),
        ex(
          "반장님이 오늘 기분이 안 좋은 것 같아요.",
          "Kayaknya mood 반장님 lagi jelek hari ini.",
        ),
        ex(
          "이 옷은 좀 작은 것 같아요.",
          "Kayaknya baju ini agak kekecilan.",
          "nolak halus di toko",
        ),
        ex(
          "이번 주는 못 갈 것 같아요. 죄송해요.",
          "Kayaknya minggu ini aku nggak bisa datang. Maaf ya.",
        ),
        ex(
          "저 사람 인도네시아 사람인 것 같아.",
          "Kayaknya orang itu orang Indonesia deh.",
          "반말",
        ),
        callout(
          "warning",
          "Jebakan: jangan pakai “kayaknya” buat hal yang harus tegas di tempat kerja. Kalau 사장님 nanya 이거 할 수 있어요? terus kamu jawab 할 수 있을 것 같아요, artinya “kayaknya sih bisa...”, dan itu bikin dia ragu. Kalau yakin, bilang aja 네, 할 수 있어요!",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("kayaknya", "ik-kayaknya"),
          ". Ada juga kayaknya yang lebih spesifik: ",
          ref("-나 봐요", "ki-na-bwa"),
          " (dari tanda yang kamu lihat) dan ",
          ref("-(으)ㄹ걸요", "ki-eulgeol"),
          " (kurang yakin).",
        ),
      ],
    },
    "ki-na-bwa": {
      description:
        "-나 봐요 = kayaknya, ditebak dari tanda yang kamu lihat atau dengar.",
      blocks: [
        grammar({
          number: "07",
          title: "-나 봐요 / -(으)ㄴ가 봐요",
          descriptionKo: "보거나 들은 것을 근거로 추측할 때 써요.",
          descriptionTranslation:
            "Kayaknya versi detektif. Kamu lihat atau dengar suatu tanda, terus nyimpulin dari situ: “antreannya panjang, kayaknya enak”. Biasanya soal orang lain atau keadaan di luar kamu.",
          rules: [
            {
              condition: "Kata kerja / 있다·없다",
              form: "-나 봐요",
              example: "오다 → 오나 봐요, 맛있나 봐요",
            },
            {
              condition: "Lampau",
              form: "-았/었나 봐요",
              example: "못 잤나 봐요",
            },
            {
              condition: "Kata sifat, akhiran vokal",
              form: "-ㄴ가 봐요",
              example: "바쁘다 → 바쁜가 봐요",
            },
            {
              condition: "Kata sifat, akhiran konsonan",
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
              before: "저 식당 줄이 길어요. ",
              emphasis: "맛있나 봐요",
              after: ".",
            },
            {
              before: "사장님이 전화를 안 받으세요. ",
              emphasis: "바쁘신가 봐요",
              after: ".",
            },
          ],
          tipKo:
            "말할 때는 형용사에도 -나 봐요를 자주 써요. 바쁜가 봐요 = 바쁘나 봐요.",
          tipTranslation:
            "Di obrolan, kata sifat juga sering pakai -나 봐요: 바쁘나 봐요. Artinya sama kayak 바쁜가 봐요, jadi dua-duanya aman.",
          theme: "amber",
        }),
        p(
          b("Artinya apa sih? "),
          "Ada bukti, terus kamu nebak: ",
          i("“Dia nguap terus. Kayaknya semalam begadang.”"),
          " Ada 보다 di dalamnya, tapi artinya bukan “melihat”. Anggap aja satu paket.",
        ),
        h3("Contoh"),
        ex(
          "민수 씨가 계속 하품하네요. 어제 잠을 못 잤나 봐요.",
          "Minsu nguap terus. Kayaknya semalam nggak bisa tidur.",
        ),
        ex(
          "사람들이 우산을 쓰고 있어요. 밖에 비가 오나 봐요.",
          "Orang-orang pada pakai payung. Kayaknya di luar hujan.",
        ),
        ex(
          "저 식당 줄이 엄청 길어요. 맛있나 봐요.",
          "Antrean restoran itu panjang banget. Kayaknya enak.",
        ),
        ex(
          "답장이 없네. 자나 봐.",
          "Nggak dibalas. Kayaknya udah tidur.",
          "반말, nunggu chat",
        ),
        callout(
          "warning",
          "Jebakan: -나 봐요 nggak dipakai buat pendapat kamu sendiri. Habis nonton film, jangan bilang ✗ 재미있나 봐요, kan kamu udah nonton! Bilang 재미있었어요. -나 봐요 cocok kalau kamu cuma lihat orang lain ketawa-ketawa nonton film itu.",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("kayaknya", "ik-kayaknya"),
          ". Bedanya sama ",
          ref("-것 같아요", "ki-geot-gatda"),
          ": -것 같아요 boleh dari perasaan sendiri, -나 봐요 harus ada tanda yang kamu tangkap.",
        ),
      ],
    },
    "ki-eulgeol": {
      description:
        "-(으)ㄹ걸요 = kayaknya sih: nebak tapi kurang yakin, sering buat ngoreksi halus.",
      blocks: [
        grammar({
          number: "08",
          title: "-(으)ㄹ걸요",
          descriptionKo: "확실하지 않은 추측을 말할 때 써요.",
          descriptionTranslation:
            "Nebak tapi kurang yakin: “kayaknya sih udah pulang deh”, “setahuku sih buka 24 jam”. Sering dipakai buat ngoreksi orang dengan halus. Versi 반말 -(으)ㄹ걸 yang diucapin ke diri sendiri juga bisa berarti nyesel: “tahu gitu ...”.",
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
              condition: "Lampau",
              form: "-았/었을걸요",
              example: "갔을걸요",
            },
            { condition: "Kata benda", form: "-일걸요", example: "학생일걸요" },
          ],
          examples: [
            { before: "아마 벌써 ", emphasis: "퇴근했을걸요", after: "." },
            { before: "그 편의점은 24시간 ", emphasis: "할걸요", after: "." },
            { before: "그거 생각보다 ", emphasis: "비쌀걸요", after: "." },
          ],
          theme: "amber",
        }),
        p(
          b("Artinya apa sih? "),
          "Ini kayaknya yang paling nggak yakin. Rasanya kayak ",
          i("“setahuku sih...”"),
          " atau ",
          i("“kayaknya deh, tapi jangan pegang omonganku ya”"),
          ".",
        ),
        h3("Contoh"),
        ex(
          "A: 민수 씨 사무실에 있어요? B: 아마 벌써 퇴근했을걸요.",
          "A: Minsu ada di kantor? B: Kayaknya sih udah pulang deh.",
        ),
        ex(
          "그 편의점은 24시간 할걸요.",
          "Setahuku minimarket itu buka 24 jam deh.",
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
        callout(
          "warning",
          "Jebakan: -(으)ㄹ걸요 dan ",
          ref("-(으)ㄹ게요", "ki-eulgeyo"),
          " beda satu huruf, tapi artinya jauh. 할게요 = “aku kerjain ya” (janji). 할걸요 = “kayaknya sih dikerjain...” (nebak). Kalau 반장님 nyuruh sesuatu, jawab 네, 할게요!",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("kayaknya", "ik-kayaknya"),
          ". Bedanya sama ",
          ref("-것 같아요", "ki-geot-gatda"),
          ": -것 같아요 netral, -(으)ㄹ걸요 terang-terangan kurang yakin.",
        ),
      ],
    },
    "ki-getda": {
      description:
        "-겠다 / -겠어요 = pasti ... ya: nebak perasaan orang dari situasinya.",
      blocks: [
        grammar({
          number: "09",
          title: "-겠어요 / -겠다",
          descriptionKo: "지금 상황을 보고 다른 사람의 마음을 짐작할 때 써요.",
          descriptionTranslation:
            "Reaksi langsung dari situasi di depan mata, terutama buat ngerasain perasaan orang lain: “pasti capek ya”, “pasti kangen keluarga ya”. Juga dipakai waktu lihat makanan: “kelihatannya enak!”.",
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
              condition: "Hormat",
              form: "-(으)시겠어요",
              example: "힘드시겠어요",
            },
            { condition: "반말, seruan", form: "-겠다", example: "맛있겠다!" },
            { condition: "반말, biasa", form: "-겠어", example: "힘들겠어" },
          ],
          examples: [
            { before: "와, 진짜 ", emphasis: "힘드셨겠어요", after: "." },
            { before: "와, ", emphasis: "맛있겠다", after: "!" },
            { before: "가족이 많이 보고 ", emphasis: "싶겠어요", after: "." },
          ],
          theme: "amber",
        }),
        p(
          b("Artinya apa sih? "),
          "Kayak bilang ",
          i("“pasti capek ya”"),
          " ke teman yang habis lembur. Kamu nggak benar-benar tahu dia capek, tapi dari situasinya kamu bisa ngerasain. Satu -겠어요 bikin kamu kedengeran ",
          b("peduli"),
          ".",
        ),
        h3("Contoh"),
        ex(
          "A: 어제 열두 시간 일했어요. B: 와, 진짜 힘드셨겠어요.",
          "A: Kemarin aku kerja dua belas jam. B: Wah, pasti capek banget ya.",
        ),
        ex("와, 맛있겠다!", "Wah, kelihatannya enak!", "makanan baru datang"),
        ex(
          "가족이 많이 보고 싶겠어요.",
          "Pasti kangen banget sama keluarga ya.",
        ),
        ex(
          "내일 시험이야? 긴장되겠다.",
          "Besok ujian? Pasti deg-degan ya.",
          "반말",
        ),
        callout(
          "warning",
          "Jebakan: waktu 반장님 ngasih instruksi, jawab 네, 알겠습니다 (siap, saya ngerti). Jangan 알아요, yang artinya “aku udah tahu kok” dan bisa kedengeran kayak instruksinya nggak perlu.",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("kayaknya", "ik-kayaknya"),
          ". Bedanya sama ",
          ref("-것 같아요", "ki-geot-gatda"),
          ": ke teman yang habis lembur, 힘들겠어요 jauh lebih hangat daripada 힘든 것 같아요.",
        ),
      ],
    },
    "ki-deora": {
      description:
        "-더라고요 = ternyata: cerita hal yang dulu kamu lihat atau rasain sendiri.",
      blocks: [
        grammar({
          number: "10",
          title: "-더라고요 / -더라",
          descriptionKo:
            "전에 직접 보거나 느낀 것을 나중에 다른 사람에게 말할 때 써요.",
          descriptionTranslation:
            "Buat cerita hal yang kamu lihat, dengar, atau rasain sendiri sebelumnya, dan waktu itu kamu agak kaget. “Kemarin aku ke sana, ternyata enak banget.” Kamu jadi saksi mata yang lagi lapor.",
          rules: [
            {
              condition: "Kata kerja / sifat",
              form: "-더라고요",
              example: "맛있다 → 맛있더라고요",
            },
            {
              condition: "Udah terjadi waktu kamu lihat",
              form: "-았/었더라고요",
              example: "문 닫았더라고요",
            },
            {
              condition: "Kata benda, akhiran vokal",
              form: "-더라고요",
              example: "친구더라고요",
            },
            {
              condition: "Kata benda, akhiran konsonan",
              form: "-이더라고요",
              example: "학생이더라고요",
            },
            { condition: "반말", form: "-더라", example: "맛있더라" },
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
            {
              before: "한국 사람들은 밥을 빨리 먹",
              emphasis: "더라고요",
              after: ".",
            },
          ],
          theme: "amber",
        }),
        p(
          b("Artinya apa sih? "),
          "Bayangin kamu cerita: ",
          i(
            "“Kemarin aku coba restoran yang viral itu. Ternyata enak banget!”",
          ),
          " Bagian ",
          i("ternyata enak banget"),
          " itu -더라고요. Bahannya tiga: udah lewat, kamu alami sendiri, dan ada rasa “oh, ternyata”.",
        ),
        h3("Contoh"),
        ex(
          "어제 그 식당 가 봤는데 진짜 맛있더라고요.",
          "Kemarin aku coba restoran itu, ternyata enak banget.",
        ),
        ex(
          "한국 사람들은 밥을 진짜 빨리 먹더라고요.",
          "Orang Korea ternyata makannya cepat banget.",
        ),
        ex(
          "마트에 갔는데 벌써 문 닫았더라고요.",
          "Aku ke supermarket, ternyata udah tutup.",
        ),
        ex(
          "처음에는 김치가 너무 맵더라고요.",
          "Awalnya kimchi kerasa pedas banget.",
          "perasaanmu sendiri boleh",
        ),
        ex(
          "민수 여자 친구 봤는데 엄청 예쁘더라.",
          "Aku lihat pacarnya Minsu, ternyata cantik banget.",
          "반말",
        ),
        callout(
          "warning",
          "Jebakan: jangan pakai -더라고요 buat hal yang cuma kamu dengar dari orang. Itu “katanya”, pakai ",
          ref("-대요", "ki-daeyo"),
          ". 맛있더라고요 = aku udah nyobain. 맛있대요 = katanya enak.",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("ternyata", "ik-ternyata"),
          " dan ",
          ref("pantesan", "ik-pantesan"),
          ". Bedanya sama ",
          ref("-네요", "ki-neyo"),
          ": -네요 kaget saat itu juga, -더라고요 diceritain belakangan.",
        ),
      ],
    },
    "ki-daeyo": {
      description:
        "-대요 / -래요 / -재요 = katanya, disuruh, diajak: nyampein omongan orang lain.",
      blocks: [
        grammar({
          number: "11",
          title: "-대요 / -래요 / -재요",
          descriptionKo: "다른 사람에게 들은 말을 짧게 전할 때 써요.",
          descriptionTranslation:
            "Bentuk singkat buat nyampein omongan orang lain. -대요 = katanya. -(으)래요 = disuruh (dan “katanya dia ...” buat kata benda). -재요 = diajak. Sering banget di tempat kerja, waktu kamu nyampein pesan 사장님 ke teman.",
          rules: [
            {
              condition: "Katanya: kata kerja",
              form: "-ㄴ대요 / -는대요",
              example: "간대요, 먹는대요",
            },
            {
              condition: "Katanya: kata sifat / lampau",
              form: "-대요 / -았/었대요",
              example: "바쁘대요, 갔대요",
            },
            {
              condition: "Katanya: kata benda",
              form: "-(이)래요",
              example: "학생이래요, 친구래요",
            },
            {
              condition: "Disuruh (jangan)",
              form: "-(으)래요 / -지 말래요",
              example: "오래요, 가지 말래요",
            },
            { condition: "Diajak", form: "-재요", example: "가재요, 먹재요" },
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
          theme: "amber",
        }),
        p(
          b("Artinya apa sih? "),
          "Kamu jadi kurir pesan. Bahasa Indonesia juga punya kata beda buat tiap jenis pesan: ",
          i("katanya"),
          " (info), ",
          i("disuruh"),
          " (perintah), ",
          i("diajak"),
          " (ajakan). Aslinya ini singkatan dari -다고 해요, -(으)라고 해요, dan -자고 해요.",
        ),
        h3("Contoh"),
        ex(
          "사장님이 내일은 일곱 시까지 오래요.",
          "Kata bos, besok disuruh datang jam tujuh.",
        ),
        ex(
          "민수 씨 오늘 못 온대요. 많이 아프대요.",
          "Minsu katanya nggak bisa datang hari ini. Lagi sakit banget katanya.",
        ),
        ex("일기예보에서 내일 비 온대요.", "Kata ramalan cuaca, besok hujan."),
        ex("반장님이 점심 같이 먹재요.", "반장님 ngajak makan siang bareng."),
        ex(
          "엄마가 밥 꼭 챙겨 먹으래.",
          "Kata mama, jangan lupa makan.",
          "반말, habis video call",
        ),
        callout(
          "warning",
          "Jebakan: 사장님이 오래요 artinya bos nyuruh kita datang, bukan “bos mau datang” (itu 사장님이 온대요). Hati-hati juga sama ",
          ref("-(으)ㄹ래요", "ki-eullaeyo"),
          ": 먹으래요 = disuruh makan, 먹을래요? = mau makan? Bedanya cuma ㄹ!",
        ),
        callout(
          "tip",
          "Mau nebak sendiri, bukan nyampein omongan orang? Cek ",
          ref("kayaknya", "ik-kayaknya"),
          ". Bedanya sama ",
          ref("-나 봐요", "ki-na-bwa"),
          ": -나 봐요 nebak dari tanda, -대요 ada orang yang beneran ngomong gitu.",
        ),
      ],
    },
  },
  vocabulary: {
    title: "Kosakata: Akhiran perasaan dan dugaan",
    description:
      "Sebelas akhiran yang bikin bahasa Korea kamu hidup: kan, soalnya, wah ternyata, kayaknya, dan katanya.",
    entries: [
      {
        term: "-잖아요",
        meanings: ["kan", "kan udah tahu"],
        example: {
          ko: "제가 어제 말했잖아요.",
          id: "Kan kemarin aku udah bilang.",
        },
      },
      {
        term: "-지요 / -죠",
        meanings: ["kan?", "ya?"],
        example: { ko: "내일 쉬는 날이죠?", id: "Besok libur kan?" },
      },
      {
        term: "-거든요",
        meanings: ["soalnya", "jadi gini"],
        example: {
          ko: "먼저 갈게요. 내일 일찍 출근해야 하거든요.",
          id: "Aku duluan ya. Soalnya besok kerja pagi.",
        },
      },
      {
        term: "-네요",
        meanings: ["wah", "ternyata", "eh"],
        example: {
          ko: "와, 이 떡볶이 진짜 맛있네요!",
          id: "Wah, tteokbokki-nya enak banget!",
        },
      },
      {
        term: "-군요",
        meanings: ["oh, gitu ya", "oh, pantes"],
        example: {
          ko: "그래서 민수 씨가 오늘 안 왔군요.",
          id: "Oh, makanya Minsu hari ini nggak datang.",
        },
      },
      {
        term: "-(으)ㄴ/는 것 같다",
        meanings: ["kayaknya", "sepertinya"],
        example: {
          ko: "하늘 보니까 비가 올 것 같아요.",
          id: "Lihat langitnya, kayaknya mau hujan.",
        },
      },
      {
        term: "-나 봐요",
        meanings: ["kayaknya (dari tanda)", "pasti ... nih"],
        example: {
          ko: "저 식당 줄이 엄청 길어요. 맛있나 봐요.",
          id: "Antrean restoran itu panjang banget. Kayaknya enak.",
        },
      },
      {
        term: "-(으)ㄹ걸요",
        meanings: ["kayaknya sih", "setahuku sih"],
        example: {
          ko: "아마 벌써 퇴근했을걸요.",
          id: "Kayaknya sih udah pulang deh.",
        },
      },
      {
        term: "-겠다",
        meanings: ["pasti ... ya", "kelihatannya"],
        example: {
          ko: "와, 진짜 힘드셨겠어요.",
          id: "Wah, pasti capek banget ya.",
        },
      },
      {
        term: "-더라고요 / -더라",
        meanings: ["ternyata", "aku lihat sendiri"],
        example: {
          ko: "어제 그 식당 가 봤는데 진짜 맛있더라고요.",
          id: "Kemarin aku coba restoran itu, ternyata enak banget.",
        },
      },
      {
        term: "-대요 / -래요 / -재요",
        meanings: ["katanya", "disuruh", "diajak"],
        example: {
          ko: "사장님이 내일은 일곱 시까지 오래요.",
          id: "Kata bos, besok disuruh datang jam tujuh.",
        },
      },
    ],
  },
  quiz: {
    title: "Kuis: Akhiran perasaan dan dugaan",
    description:
      "12 soal pilihan ganda: pilih akhiran yang pas sama perasaannya (kan, soalnya, wah ternyata, kayaknya, katanya). Lulus kalau benar minimal 70%.",
    passingScore: 70,
    questions: [
      {
        key: "ki06-janayo-kan",
        prompt:
          "Temanmu nanya jam ketemuan, padahal tadi udah kamu kasih tahu. “Jam tiga! Kan tadi udah aku bilang~” → 세 시! 아까 말했(___)~",
        options: [
          { text: "잖아", correct: true },
          { text: "거든" },
          { text: "네" },
          { text: "대" },
        ],
        explanation:
          "Infonya udah diketahui berdua, kamu cuma ngingetin. Itu kan versi -잖아(요). -거든 buat info yang lawan bicara belum tahu.",
      },
      {
        key: "ki06-jiyo-mastiin",
        prompt:
          "Kamu kira besok libur, tapi mau mastiin ke teman kerja: “Besok libur kan?”",
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
        key: "ki06-geodeunyo-soalnya",
        prompt:
          "Kenalan baru ngajak makan samgyeopsal. “Aku nggak makan babi. Soalnya aku Muslim.” → 저는 돼지고기 안 먹어요. 무슬림이(___).",
        options: [
          { text: "거든요", correct: true },
          { text: "잖아요" },
          { text: "네요" },
          { text: "래요" },
        ],
        explanation:
          "Dia belum tahu kamu Muslim, jadi ini info baru = -거든요 (soalnya). Kalau pakai -잖아요, kesannya “kan kamu udah tahu aku Muslim”.",
      },
      {
        key: "ki06-neyo-reaksi",
        prompt:
          "Kamu baru nyicip tteokbokki dan kaget ternyata enak banget. Reaksi spontanmu?",
        options: [
          { text: "와, 진짜 맛있네요!", correct: true },
          { text: "와, 진짜 맛있잖아요!" },
          { text: "와, 진짜 맛있대요!" },
          { text: "와, 진짜 맛있을걸요!" },
        ],
        explanation:
          "Baru ngalamin saat itu juga dan kaget = -네요 (wah, ternyata). 맛있대요 artinya “katanya enak”, padahal kamu sendiri yang lagi makan.",
      },
      {
        key: "ki06-gunyo-nerima",
        prompt:
          "사장님 bilang bulan depan pabrik pindah ke Incheon. Kamu nerima info itu dengan sopan: “Oh, gitu ya, Pak.”",
        options: [
          { text: "아, 그렇군요.", correct: true },
          { text: "아, 그렇잖아요." },
          { text: "아, 그렇거든요." },
          { text: "아, 그럴게요." },
        ],
        explanation:
          "Baru dapat info terus nerima = -군요 (oh, gitu ya). Ke atasan, 그렇군요 aman dan sopan. Ke teman, cukup 그렇구나.",
      },
      {
        key: "ki06-geot-gatda-kekecilan",
        prompt:
          "Lagi nyoba baju di toko, kamu mau nolak halus: “Kayaknya agak kekecilan.”",
        options: [
          { text: "좀 작은 것 같아요.", correct: true },
          { text: "좀 작는 것 같아요." },
          { text: "좀 작은가 봐요." },
          { text: "좀 작대요." },
        ],
        explanation:
          "Pendapatmu sendiri = -것 같아요, dan kata sifat sekarang pakai -(으)ㄴ: 작은. -(으)ㄴ가 봐요 aneh di sini, soalnya kamu sendiri yang lagi pakai bajunya.",
      },
      {
        key: "ki06-na-bwa-tanda",
        prompt:
          "Dari jendela kamu lihat orang-orang di luar pada pakai payung. Kamu nyimpulin dari tanda itu:",
        options: [
          { text: "밖에 비가 오나 봐요.", correct: true },
          { text: "밖에 비가 오잖아요." },
          { text: "밖에 비가 온대요." },
          { text: "밖에 비가 올게요." },
        ],
        explanation:
          "Nebak dari tanda yang kamu lihat = -나 봐요. -대요 dipakai kalau ada orang yang beneran ngomong gitu (katanya).",
      },
      {
        key: "ki06-eulgeol-eulgeyo",
        prompt: "반장님 nyuruh kamu beresin gudang. Jawaban yang benar?",
        options: [
          { text: "네, 할게요!", correct: true },
          { text: "네, 할걸요." },
          { text: "네, 하네요." },
          { text: "네, 하잖아요." },
        ],
        explanation:
          "-(으)ㄹ게요 = janji “aku kerjain ya”. -(으)ㄹ걸요 = “kayaknya sih dikerjain...”, nebak dan nggak yakin. Beda satu huruf, artinya jauh!",
      },
      {
        key: "ki06-getda-empati",
        prompt:
          "Rekan kerja cerita kemarin lembur 12 jam. Tanggapan yang paling hangat?",
        options: [
          { text: "와, 진짜 힘들었겠어요.", correct: true },
          { text: "와, 진짜 힘들었잖아요." },
          { text: "와, 진짜 힘들었대요." },
          { text: "와, 진짜 힘들었거든요." },
        ],
        explanation:
          "Ngerasain perasaan orang dari ceritanya = -겠-: “pasti capek ya”. Satu kalimat ini bikin kamu kedengeran peduli.",
      },
      {
        key: "ki06-getda-algetseumnida",
        prompt:
          "반장님 selesai ngasih instruksi kerja. Kamu mau bilang “siap, saya ngerti”. Yang pas?",
        options: [
          { text: "네, 알겠습니다.", correct: true },
          { text: "네, 알아요." },
          { text: "네, 알걸요." },
          { text: "네, 아네요." },
        ],
        explanation:
          "알겠습니다 itu jawaban standar waktu dikasih instruksi. 알아요 bisa kedengeran “aku udah tahu kok”, kayak instruksinya nggak perlu.",
      },
      {
        key: "ki06-deora-saksi",
        prompt:
          "Kemarin kamu nyobain restoran baru, ternyata enak banget. Kamu cerita ke teman:",
        options: [
          { text: "어제 가 봤는데 진짜 맛있더라고요.", correct: true },
          { text: "어제 가 봤는데 진짜 맛있대요." },
          { text: "어제 가 봤는데 진짜 맛있나 봐요." },
          { text: "어제 가 봤는데 진짜 맛있겠어요." },
        ],
        explanation:
          "Udah lewat + kamu alami sendiri + ada rasa “ternyata” = -더라고요. 맛있대요 artinya kamu cuma dengar dari orang.",
      },
      {
        key: "ki06-daeyo-disuruh",
        prompt: "Teman bilang “사장님이 빨리 오래요.” Artinya?",
        options: [
          { text: "Bos nyuruh (kita) cepat datang.", correct: true },
          { text: "Bos mau cepat datang." },
          { text: "Bos ngajak datang bareng." },
          { text: "Bos nanya mau datang atau nggak." },
        ],
        explanation:
          "-(으)래요 = disuruh. “Katanya bos mau datang” itu 사장님이 온대요, dan “ngajak” itu -재요.",
      },
    ],
  },
});
