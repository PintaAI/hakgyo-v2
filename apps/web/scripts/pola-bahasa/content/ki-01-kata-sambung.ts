import { b, callout, defineBab, ex, grammar, h3, i, p, ref } from "../blocks";

/** One rule row of a grammar card. */
const r = (condition: string, form: string, example: string) => ({
  condition,
  form,
  example,
});

/** One grammar-card example; `emphasis` is the word itself. */
const e = (before: string, emphasis: string, after: string) => ({
  before,
  emphasis,
  after,
});

export default defineBab({
  key: "ki-01-kata-sambung",
  materials: {
    "ki-geurigo": {
      description:
        "그리고 dipakai di awal kalimat baru buat nambahin info atau nyebut kejadian berikutnya.",
      blocks: [
        grammar({
          number: "01",
          title: "그리고",
          theme: "amber",
          descriptionKo:
            "앞 문장에 내용을 더하거나 다음에 한 일을 말할 때 써요.",
          descriptionTranslation:
            "그리고 artinya “dan” atau “terus”. Taruh di awal kalimat baru buat nambah info atau nyebut kejadian berikutnya. Nadanya netral, aman buat ngobrol, chat, sampai tulisan resmi.",
          rules: [
            r("Nambah info", "그리고", "싸요. 그리고 맛있어요."),
            r("Kejadian berikutnya", "그리고", "밥 먹었어요. 그리고 잤어요."),
            r("Nambah pesanan", "그리고 ...도", "그리고 물도 주세요."),
            r("Dua kata benda", "하고 / (이)랑", "밥하고 김치"),
          ],
          examples: [
            e(
              "저는 인도네시아 사람이에요. ",
              "그리고",
              " 지금 안산에서 일해요.",
            ),
            e("편의점에 갔어요. ", "그리고", " 라면을 샀어요."),
            e("이 김밥 주세요. ", "그리고", " 물도 하나 주세요."),
          ],
        }),
        p(
          b("Artinya apa sih? "),
          "Persis kayak ",
          i("terus"),
          " waktu kamu cerita: ",
          i("Aku pulang kerja. Terus beli ramyeon."),
          " Kalimat keduanya cuma nambah info, nggak ada sebab-akibat.",
        ),
        h3("Contoh"),
        ex(
          "퇴근하고 편의점에 갔어요. 그리고 라면을 샀어요.",
          "Pulang kerja aku mampir ke minimarket. Terus beli ramyeon.",
        ),
        ex(
          "이 식당은 싸요. 그리고 양도 많아요.",
          "Restoran ini murah. Terus porsinya juga banyak.",
        ),
        ex(
          "오늘은 청소 좀 해 주세요. 그리고 내일은 창고 정리해 주세요.",
          "Hari ini tolong bersih-bersih ya. Terus besok beresin gudang.",
          "반장님 ke pekerja",
        ),
        ex(
          "숙제 다 했어. 그리고 빨래도 했어.",
          "PR udah kelar. Terus cucian juga udah.",
          "반말",
        ),
        callout(
          "warning",
          "Jebakan: ",
          b("그리고"),
          " itu buat nyambung kalimat, bukan dua kata benda. ",
          i("Nasi dan kimchi"),
          " jadinya ",
          b("밥하고 김치"),
          " atau ",
          b("밥이랑 김치"),
          ". Kalau kamu bilang ",
          b("밥 그리고 김치"),
          ", kedengerannya kaku kayak baca daftar belanja.",
        ),
        callout(
          "tip",
          "Versi nempelnya di tengah kalimat: ",
          ref("-고", "ki-go"),
          " (",
          b("밥 먹고 자요"),
          "). Bedanya sama ",
          ref("그래서", "ki-geuraeseo"),
          ": kalau kalimat kedua itu akibat dari kalimat pertama, pakai 그래서.",
        ),
      ],
    },
    "ki-geuraeseo": {
      description:
        "그래서 menyambung alasan di kalimat pertama dengan akibatnya di kalimat berikutnya.",
      blocks: [
        grammar({
          number: "02",
          title: "그래서",
          theme: "amber",
          descriptionKo: "앞 문장이 이유이고 뒤 문장이 그 결과일 때 써요.",
          descriptionTranslation:
            "그래서 artinya “jadi”, “makanya”, “karena itu”. Kalimat sebelumnya alasan, kalimat sesudahnya akibat. Asalnya dari 그렇다 + -아서, jadi aturan mainnya ikut -아서.",
          rules: [
            r("Alasan → akibat", "그래서", "늦잠 잤어요. 그래서 늦었어요."),
            r(
              "Minta lanjut cerita",
              "그래서 + pertanyaan",
              "그래서 어떻게 됐어요?",
            ),
            r("Tulisan resmi", "따라서", "따라서 회의를 연기합니다."),
            r(
              "Habis itu nyuruh atau ngajak",
              "그러니까",
              "그러니까 우산 가져가세요.",
            ),
          ],
          examples: [
            e("어제 야근했어요. ", "그래서", " 너무 피곤해요."),
            e("버스를 놓쳤어요. ", "그래서", " 늦었어요."),
            e("", "그래서", " 어떻게 됐어요?"),
          ],
          tipKo: "그래서 뒤에는 명령이나 제안을 잘 안 써요.",
          tipTranslation:
            "Habis 그래서, jangan langsung nyuruh atau ngajak. Buat itu, pakai 그러니까.",
        }),
        p(
          b("Artinya apa sih? "),
          "Kayak ",
          i("makanya"),
          " waktu kamu jelasin kenapa sesuatu kejadian: ",
          i("Kemarin lembur. Makanya capek."),
          " Alasan dulu, akibat belakangan.",
        ),
        h3("Contoh"),
        ex(
          "어제 야근했어요. 그래서 너무 피곤해요.",
          "Kemarin aku lembur. Jadi sekarang capek banget.",
        ),
        ex(
          "다음 달에 한국에 가요. 그래서 요즘 한국어를 열심히 공부해요.",
          "Bulan depan aku berangkat ke Korea. Makanya sekarang rajin belajar bahasa Korea.",
        ),
        ex(
          "길이 너무 막혔어요. 그래서 지하철을 탔어요.",
          "Jalanan macet parah. Jadi aku naik subway.",
        ),
        ex(
          "그래서 어떻게 됐어?",
          "Terus akhirnya gimana?",
          "반말, minta teman lanjutin cerita",
        ),
        callout(
          "warning",
          "Jebakan: habis ",
          b("그래서"),
          " jangan langsung nyuruh atau ngajak. ",
          i("Hujan nih. Jadi bawa payung ya"),
          " itu ",
          b("비가 와요. 그러니까 우산 가져가세요."),
          " Kalau pakai ",
          b("그래서 우산 가져가세요"),
          ", orang Korea bakal ngerasa ada yang janggal.",
        ),
        callout(
          "tip",
          "Mau praktik kasih alasan? Cek ",
          ref("soalnya", "ik-soalnya"),
          " dan ",
          ref("gara-gara", "ik-gara-gara"),
          ", yang pakai versi nempelnya, ",
          ref("-아서/어서", "ki-aseo-karena"),
          ". Bedanya sama ",
          ref("그러니까", "ki-geureonikka"),
          ": habis 그러니까 boleh nyuruh atau ngajak.",
        ),
      ],
    },
    "ki-geureonde": {
      description:
        "그런데 atau 근데 bisa berarti tapi yang lembut, bisa juga buat ganti topik kayak eh btw.",
      blocks: [
        grammar({
          number: "03",
          title: "그런데 / 근데",
          theme: "amber",
          descriptionKo: "앞 말과 다른 내용을 말하거나 화제를 바꿀 때 써요.",
          descriptionTranslation:
            "그런데 punya dua arti: “tapi” yang lembut, dan “ngomong-ngomong” buat ganti topik. Di omongan, orang Korea hampir selalu bilang 근데. Asalnya dari 그렇다 + -는데.",
          rules: [
            r("Tapi yang lembut", "근데", "맛있어요. 근데 좀 비싸요."),
            r("Ganti topik", "근데", "근데 밥 먹었어?"),
            r("Tulisan, email resmi", "그런데", "그런데 문제가 하나 있습니다."),
            r("Versi nempelnya", "-는데", "맛있는데 비싸요."),
          ],
          examples: [
            e("이 식당 맛있어요. ", "근데", " 좀 비싸요."),
            e("", "근데", " 너 밥 먹었어?"),
            e("", "근데", " 반장님 어디 가셨어요?"),
          ],
        }),
        p(
          b("Artinya apa sih? "),
          "Lihat kalimat sebelumnya. Kalau isinya berlawanan, artinya ",
          i("tapi"),
          ". Kalau topiknya pindah, artinya ",
          i("ngomong-ngomong"),
          ". Jadi orang Korea yang buka kalimat pakai 근데 belum tentu mau membantah.",
        ),
        h3("Contoh"),
        ex(
          "한국어를 열심히 공부했어요. 그런데 아직 말하기가 어려워요.",
          "Aku udah rajin belajar bahasa Korea. Tapi ngomongnya masih susah.",
        ),
        ex(
          "이 옷 예쁘다. 근데 사이즈가 없네.",
          "Bajunya cakep. Tapi ukurannya nggak ada.",
          "반말",
        ),
        ex("근데 너 밥 먹었어?", "Eh, kamu udah makan?", "반말, ganti topik"),
        ex(
          "근데 반장님 어디 가셨어요?",
          "Ngomong-ngomong, 반장님 ke mana ya?",
          "ganti topik",
        ),
        callout(
          "warning",
          "Jebakan: ",
          b("근데"),
          " itu bahasa lisan. Di esai TOPIK atau email resmi, tulis ",
          b("그런데"),
          " atau ",
          b("하지만"),
          ".",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Versi nempelnya, ",
          ref("-는데", "ki-neunde"),
          ", dipakai di ",
          ref("sih", "ik-sih"),
          ". Bedanya sama ",
          ref("하지만", "ki-hajiman"),
          ": 하지만 lebih tegas dan lebih sering di tulisan.",
        ),
      ],
    },
    "ki-geureom": {
      description:
        "그럼 dipakai buat nanggepin omongan orang, lalu ambil keputusan atau kasih usul.",
      blocks: [
        grammar({
          number: "04",
          title: "그럼 / 그러면",
          theme: "amber",
          descriptionKo: "상대방의 말을 듣고 결정하거나 제안할 때 써요.",
          descriptionTranslation:
            "그럼 itu singkatan 그러면 (그렇다 + -(으)면), artinya “kalau gitu”. Kamu denger info dari orang lain, lalu ambil keputusan atau kasih usul. 그럼요! juga bisa berarti “ya iyalah!”.",
          rules: [
            r(
              "Nanggepin info, terus usul",
              "그럼",
              "바빠요? 그럼 내일 만나요.",
            ),
            r("Versi lengkap, lebih rapi", "그러면", "그러면 이렇게 할까요?"),
            r("Pamitan", "그럼", "그럼 내일 봬요!"),
            r("Setuju banget (sopan)", "그럼요!", "A: 내일도 와요? B: 그럼요!"),
          ],
          examples: [
            e("오늘 시간 없어요? ", "그럼", " 내일 만날까요?"),
            e("아, 다 팔렸어요? ", "그럼", " 이걸로 주세요."),
            e("", "그럼요", "! 당연하죠."),
          ],
        }),
        p(
          b("Artinya apa sih? "),
          "Persis ",
          i("ya udah, kalau gitu..."),
          ". Orang lain kasih info, kamu nanggepin pakai keputusan atau usul.",
        ),
        h3("Contoh"),
        ex(
          "오늘 시간 없어요? 그럼 내일 만날까요?",
          "Hari ini nggak ada waktu? Kalau gitu besok aja ketemunya?",
        ),
        ex(
          "아, 그거 다 팔렸어요? 그럼 이걸로 주세요.",
          "Oh, yang itu habis? Kalau gitu yang ini aja deh.",
          "di kafe",
        ),
        ex(
          "비 와? 그럼 택시 타자.",
          "Hujan? Kalau gitu naik taksi aja yuk.",
          "반말",
        ),
        ex("그럼 내일 봬요!", "Ya udah, sampai ketemu besok ya!"),
        ex("그럼요!", "Ya iyalah! / Tentu dong!", "sopan, setuju banget"),
        callout(
          "warning",
          "Jebakan: kata ",
          i("jadi"),
          " di bahasa Indonesia dipakai buat dua hal. ",
          i("Aku sakit. Jadi nggak masuk kerja"),
          " itu akibat yang udah kejadian, pakai ",
          b("그래서"),
          ". ",
          i("Kamu sakit? Jadi istirahat aja"),
          " itu keputusan setelah denger info, pakai ",
          b("그럼"),
          ".",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Arti ",
          i("ya iyalah"),
          "-nya ada di ",
          ref("dong", "ik-dong"),
          ". Bedanya sama ",
          ref("그래서", "ki-geuraeseo"),
          ": 그래서 buat akibat dari cerita kamu sendiri, 그럼 buat nanggepin omongan orang. Versi nempelnya: ",
          ref("-(으)면", "ki-myeon"),
          ".",
        ),
      ],
    },
    "ki-geureonikka": {
      description:
        "그러니까 nekenin alasan sebelum saran, dipakai buat setuju banget, atau buat jelasin ulang.",
      blocks: [
        grammar({
          number: "05",
          title: "그러니까 / 그니까",
          theme: "amber",
          descriptionKo:
            "이유를 강조하면서 부탁하거나, 맞장구치거나, 다시 설명할 때 써요.",
          descriptionTranslation:
            "그러니까 (그렇다 + -(으)니까) punya tiga pemakaian: “makanya” sebelum saran atau perintah, “iya kan!” buat setuju banget, dan “jadi gini” buat jelasin ulang. Di omongan cepat sering jadi 그니까.",
          rules: [
            r(
              "Alasan + saran / perintah",
              "그러니까",
              "추워요. 그러니까 따뜻하게 입으세요.",
            ),
            r("Setuju banget", "그러니까! / 그니까!", "그니까, 진짜 덥다."),
            r("Jelasin ulang", "그러니까 제 말은...", "그러니까 제 말은요..."),
            r(
              "Ke atasan",
              "Hindari, kedengeran nyalahin",
              "✗ 그러니까 제가 말했잖아요",
            ),
          ],
          examples: [
            e("내일 비가 온대요. ", "그러니까", " 우산 꼭 챙기세요."),
            e("이 기계는 위험해요. ", "그러니까", " 장갑 끼고 하세요."),
            e("", "그러니까", "! 나도 그렇게 생각했어."),
          ],
        }),
        p(
          b("Artinya apa sih? "),
          "Rasanya kayak ",
          i("makanya"),
          " yang nekenin alasan. Bedanya sama 그래서: habis 그러니까 boleh nyuruh, ngajak, atau nyaranin.",
        ),
        h3("Contoh"),
        ex(
          "내일 비가 온대요. 그러니까 우산 꼭 챙기세요.",
          "Katanya besok hujan. Jadi jangan lupa bawa payung ya.",
        ),
        ex(
          "이 기계는 위험해요. 그러니까 장갑 끼고 하세요.",
          "Mesin ini bahaya. Makanya pakai sarung tangan ya.",
        ),
        ex(
          "그러니까! 나도 그렇게 생각했어.",
          "Iya kan! Aku juga mikir gitu.",
          "반말, setuju banget",
        ),
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
          ". Ke atasan, cukup sampaikan faktanya.",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("soalnya", "ik-soalnya"),
          " (versi nempelnya, ",
          ref("-(으)니까", "ki-nikka"),
          ") dan ",
          ref("kan", "ik-kan"),
          ". Bedanya sama ",
          ref("그래서", "ki-geuraeseo"),
          ": habis 그래서 nggak enak langsung nyuruh atau ngajak.",
        ),
      ],
    },
    "ki-hajiman": {
      description:
        "하지만 dan 그렇지만 itu tetapi yang tegas, paling sering ketemu di tulisan dan omongan resmi.",
      blocks: [
        grammar({
          number: "06",
          title: "하지만 / 그렇지만",
          theme: "amber",
          descriptionKo: "앞 문장과 반대되는 내용을 분명하게 말할 때 써요.",
          descriptionTranslation:
            "하지만 dan 그렇지만 artinya “tetapi” atau “namun”. Kontrasnya jelas dan tegas. Paling sering muncul di tulisan, pidato, soal ujian, dan lirik lagu.",
          rules: [
            r(
              "Tulisan, pidato, ujian",
              "하지만",
              "하지만 결과는 좋지 않았습니다.",
            ),
            r("Sedikit lebih halus", "그렇지만", "그렇지만 동료들이 친절해요."),
            r("Ngobrol santai", "근데", "근데 좀 비싸."),
            r("Di tengah kalimat", "-지만", "비싸지만 맛있어요."),
          ],
          examples: [
            e("한국 생활은 힘들어요. ", "하지만", " 많이 배워요."),
            e("월급은 많지 않아요. ", "그렇지만", " 동료들이 친절해요."),
            e("열심히 준비했습니다. ", "하지만", " 결과는 좋지 않았습니다."),
          ],
        }),
        p(
          b("Artinya apa sih? "),
          "Kayak ",
          i("tetapi"),
          " atau ",
          i("namun"),
          " di bahasa baku. Di obrolan sama teman, orang Korea lebih sering pakai ",
          b("근데"),
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
          "gaya laporan",
        ),
        callout(
          "warning",
          "Jebakan: banyak orang Indonesia pakai ",
          b("하지만"),
          " di tiap obrolan karena itu yang diajarin duluan di buku. Nggak salah, tapi kedengerannya kayak lagi baca teks. Ke teman, pakai ",
          ref("근데", "ki-geureonde"),
          ".",
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Versi nempelnya, ",
          ref("-지만", "ki-jiman"),
          ", ada di ",
          ref("padahal", "ik-padahal-hasil"),
          ". -지만 nempel di tengah kalimat (",
          b("비싸지만 맛있어요"),
          "), sedangkan 하지만 berdiri di awal kalimat baru.",
        ),
      ],
    },
    "ki-geuraedo": {
      description:
        "그래도 dipakai kalau situasinya nggak mendukung, tapi kamu tetap milih atau ngelakuin sesuatu.",
      blocks: [
        grammar({
          number: "07",
          title: "그래도",
          theme: "amber",
          descriptionKo:
            "앞의 상황과 상관없이 뒤의 일을 하거나 그렇게 느낄 때 써요.",
          descriptionTranslation:
            "그래도 (그렇다 + -아도) artinya “walaupun gitu” atau “tetap aja”. Ada halangan, tapi kamu tetap milih, ngerasa, atau ngelakuin sesuatu. Sering juga dipakai buat menghibur.",
          rules: [
            r("Ada halangan, tetap jalan", "그래도", "비가 와요. 그래도 가요."),
            r("Ngebujuk", "그래도 + -세요", "그래도 조금 드세요."),
            r("Menghibur", "그래도", "그래도 다행이에요."),
            r("Versi nempelnya", "-아도/어도, -는데도", "비가 와도 가요."),
          ],
          examples: [
            e("일이 힘들어요. ", "그래도", " 재미있어요."),
            e("비가 와요. ", "그래도", " 갈 거예요?"),
            e("", "그래도", " 다행이에요."),
          ],
        }),
        p(
          b("Artinya apa sih? "),
          "Kayak ",
          i("ya tapi tetap aja"),
          ". ",
          i("Mahal. Tapi tetap aku beli."),
          " Halangannya ada, tapi jalan terus.",
        ),
        h3("Contoh"),
        ex(
          "일이 힘들어요. 그래도 재미있어요.",
          "Kerjaannya berat. Tapi tetap seru sih.",
        ),
        ex(
          "시험에 떨어졌어요. 그래도 다음에 다시 도전할 거예요.",
          "Aku nggak lulus ujian. Tapi aku bakal coba lagi.",
        ),
        ex(
          "입맛이 없어요? 그래도 조금이라도 드세요.",
          "Nggak nafsu makan? Tetap makan ya, walaupun dikit.",
        ),
        ex(
          "그래도 다치지 않아서 다행이에요.",
          "Ya tapi untung kamu nggak luka.",
          "buat menghibur",
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
          i("Hujan. Tapi aku tetap pergi."),
        ),
        callout(
          "tip",
          "Mau praktik ngomong? Cek ",
          ref("padahal", "ik-padahal-hasil"),
          ", yang pakai versi nempelnya, ",
          ref("-는데도", "ki-neundedo"),
          " (",
          b("먹었는데도 배고파요"),
          "). Versi nempel buat andai-andai: ",
          ref("-아도/어도", "ki-ado"),
          ".",
        ),
      ],
    },
    "ki-animyeon": {
      description:
        "아니면 dipakai buat nawarin pilihan lain di antara dua pertanyaan atau dua tebakan.",
      blocks: [
        grammar({
          number: "08",
          title: "아니면",
          theme: "amber",
          descriptionKo: "다른 선택지를 말하거나 다른 가능성을 추측할 때 써요.",
          descriptionTranslation:
            "아니면 (아니다 + -(으)면) arti harfiahnya “kalau bukan”. Dipakai buat nawarin pilihan lain, jadi artinya “atau”. Paling sering di pertanyaan, atau waktu kamu nebak-nebak.",
          rules: [
            r("Di antara dua pertanyaan", "아니면", "커피? 아니면 차?"),
            r("Usul cadangan", "아니면", "아니면 다음 주에 만날까요?"),
            r("Nebak-nebak", "아니면", "자나? 아니면 일하나?"),
            r("Satu kalimat, kata kerja", "-거나", "쉬거나 운동해요."),
            r("Satu kalimat, kata benda", "(이)나", "커피나 차"),
          ],
          examples: [
            e("커피 드릴까요, ", "아니면", " 차 드릴까요?"),
            e("라면 먹을래? ", "아니면", " 나가서 먹을래?"),
            e("자나? ", "아니면", " 아직 일하나?"),
          ],
        }),
        p(
          b("Artinya apa sih? "),
          "Persis ",
          i("atau"),
          " di antara dua pertanyaan: ",
          i("Mau kopi? Atau teh?"),
          " Taruh 아니면 di depan pilihan kedua.",
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
          "라면 먹을래? 아니면 나가서 먹을래?",
          "Mau makan ramyeon? Atau makan di luar aja?",
          "반말",
        ),
        ex(
          "전화를 안 받네. 자나? 아니면 아직 일하나?",
          "Nggak diangkat. Lagi tidur ya? Atau masih kerja?",
          "nebak sendiri",
        ),
        callout(
          "warning",
          "Jebakan: ",
          b("아니면"),
          " paling pas buat pilihan di pertanyaan atau tebakan. Buat cerita kebiasaan kayak ",
          i("weekend aku istirahat atau olahraga"),
          ", jangan dipisah jadi dua kalimat pakai 아니면. Tempel -거나: ",
          b("주말에 쉬거나 운동해요."),
        ),
        callout(
          "tip",
          "Bedanya sama ",
          ref("-거나", "ki-geona"),
          ": -거나 nempel di kata kerja dalam satu kalimat. Kalau jawabannya ",
          i("terserah, apa aja"),
          ", cek ",
          ref("terserah", "ik-terserah"),
          ".",
        ),
      ],
    },
  },
  vocabulary: {
    title: "Kosakata: Kata sambung di awal kalimat",
    description:
      "Delapan kata sambung yang bikin omonganmu nyambung, masing-masing dengan arti dan satu contoh.",
    entries: [
      {
        term: "그리고",
        meanings: ["dan", "terus"],
        example: {
          ko: "편의점에 갔어요. 그리고 라면을 샀어요.",
          id: "Aku ke minimarket. Terus beli ramyeon.",
        },
      },
      {
        term: "그래서",
        meanings: ["jadi", "makanya", "karena itu"],
        example: {
          ko: "늦잠을 잤어요. 그래서 늦었어요.",
          id: "Aku kesiangan. Makanya telat.",
        },
      },
      {
        term: "그런데 / 근데",
        meanings: ["tapi", "eh btw", "ngomong-ngomong"],
        example: {
          ko: "근데 너 밥 먹었어?",
          id: "Eh, kamu udah makan?",
        },
      },
      {
        term: "그럼",
        meanings: ["kalau gitu", "ya udah", "ya iyalah (그럼요)"],
        example: {
          ko: "바빠요? 그럼 내일 만나요.",
          id: "Lagi sibuk? Kalau gitu besok aja ketemu.",
        },
      },
      {
        term: "그러니까",
        meanings: ["makanya", "iya kan", "jadi gini"],
        example: {
          ko: "추워요. 그러니까 따뜻하게 입으세요.",
          id: "Dingin nih. Makanya pakai baju yang anget ya.",
        },
      },
      {
        term: "하지만 / 그렇지만",
        meanings: ["tetapi", "namun"],
        example: {
          ko: "비싸요. 하지만 품질이 좋아요.",
          id: "Mahal. Tapi kualitasnya bagus.",
        },
      },
      {
        term: "그래도",
        meanings: ["tetap aja", "walaupun gitu"],
        example: {
          ko: "비가 와요. 그래도 갈 거예요.",
          id: "Hujan. Tapi aku tetap pergi.",
        },
      },
      {
        term: "아니면",
        meanings: ["atau", "kalau nggak"],
        example: {
          ko: "커피 마실래요? 아니면 차 마실래요?",
          id: "Mau kopi? Atau teh?",
        },
      },
    ],
  },
  quiz: {
    title: "Kuis: Kata sambung di awal kalimat",
    description:
      "12 soal buat ngecek kamu udah bisa milih 그리고, 그래서, 근데, 그럼, 그러니까, 하지만, 그래도, dan 아니면 sesuai situasi.",
    passingScore: 70,
    questions: [
      {
        key: "ks-geurigo-1",
        prompt:
          "Kimbap ini satu ya. Terus airnya juga satu. → 이 김밥 주세요. ___ 물도 하나 주세요.",
        options: [
          { text: "그리고", correct: true },
          { text: "그래서" },
          { text: "그래도" },
          { text: "아니면" },
        ],
        explanation:
          "Kalimat kedua cuma nambahin pesanan, nggak ada sebab-akibat. Itu kerjaannya 그리고 (terus, dan).",
      },
      {
        key: "ks-geuraeseo-1",
        prompt:
          "Aku ketinggalan bus. Makanya telat. → 버스를 놓쳤어요. ___ 늦었어요.",
        options: [
          { text: "그래서", correct: true },
          { text: "그래도" },
          { text: "아니면" },
          { text: "그럼" },
        ],
        explanation:
          "Kalimat pertama alasan, kalimat kedua akibat yang udah kejadian. Itu tugas 그래서. 그래도 malah kebalik: 'walaupun gitu'.",
      },
      {
        key: "ks-geuraeseo-vs-geureonikka-1",
        prompt:
          'Kamu mau bilang: "Hujan nih. Jadi bawa payung ya." Mana yang paling natural?',
        options: [
          { text: "비가 와요. 그러니까 우산 가져가세요.", correct: true },
          { text: "비가 와요. 그래서 우산 가져가세요." },
          { text: "비가 와요. 그래도 우산 가져가세요." },
        ],
        explanation:
          "Kalimat keduanya nyuruh. Habis 그래서 nggak enak langsung nyuruh atau ngajak, jadi pakai 그러니까.",
      },
      {
        key: "ks-geureonde-1",
        prompt:
          "Udah makan? Eh btw, besok ujian jam berapa? → 밥 먹었어? ___ 내일 시험 몇 시야?",
        options: [
          { text: "근데", correct: true },
          { text: "그래서" },
          { text: "그러니까" },
          { text: "아니면" },
        ],
        explanation:
          "Kamu pindah topik, jadi pakai 근데. Ingat, 근데 nggak selalu berarti membantah. Sering banget cuma ganti topik.",
      },
      {
        key: "ks-hajiman-register-1",
        prompt:
          "Kamu nulis esai TOPIK dan butuh kata 'tapi' di awal kalimat. Mana yang paling pas?",
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
        key: "ks-geureom-1",
        prompt:
          "A: 오늘 너무 바빠요. B: ___ 내일 만나요. (Kalau gitu besok aja ketemu.)",
        options: [
          { text: "그럼", correct: true },
          { text: "그래서" },
          { text: "하지만" },
          { text: "그래도" },
        ],
        explanation:
          "B nanggepin info dari A, terus ambil keputusan. Itu tugas 그럼 (kalau gitu).",
      },
      {
        key: "ks-geureom-jadi-1",
        prompt:
          'Temanmu bilang 감기 걸렸어요 (aku pilek). Kamu mau bilang "Jadi istirahat aja." Mana yang pas?',
        options: [
          { text: "그럼 푹 쉬세요.", correct: true },
          { text: "그래서 푹 쉬세요." },
          { text: "그리고 푹 쉬세요." },
        ],
        explanation:
          "'Jadi' di sini bukan akibat, tapi saran setelah denger info. Pakai 그럼. Jebakan klasik, soalnya di bahasa Indonesia dua-duanya 'jadi'.",
      },
      {
        key: "ks-geureomyo-1",
        prompt:
          "Rekan kerja nanya 내일도 와요? terus kamu jawab 그럼요! Artinya?",
        options: [
          { text: "Ya iyalah! / Tentu dong!", correct: true },
          { text: "Kalau gitu nggak usah." },
          { text: "Terus kenapa?" },
          { text: "Atau yang lain?" },
        ],
        explanation:
          "그럼요 punya arti kedua: setuju banget, kayak 'ya iyalah' versi sopan.",
      },
      {
        key: "ks-geureonikka-agree-1",
        prompt:
          "Temanmu bilang 오늘 진짜 덥다. Kamu setuju banget. Jawaban paling natural?",
        options: [
          { text: "그러니까!", correct: true },
          { text: "그래서?" },
          { text: "아니면?" },
          { text: "하지만!" },
        ],
        explanation:
          "그러니까! yang diucapin sendirian artinya 'iya kan! nah, itu dia!'. Cara paling cepet buat bilang setuju banget.",
      },
      {
        key: "ks-geureonikka-boss-1",
        prompt:
          "Mesin di pabrik mati lagi. Kemarin kamu udah ngingetin soal mesin itu. Apa yang paling pas kamu bilang ke 반장님?",
        options: [
          { text: "반장님, 기계가 또 멈췄어요. 어떻게 할까요?", correct: true },
          { text: "그러니까 제가 말했잖아요." },
          { text: "그래서요?" },
        ],
        explanation:
          "그러니까 제가 말했잖아요 ke atasan rasanya kayak 'tuh kan, saya bilang juga apa'. Red flag! Sampaikan faktanya aja, terus tanya langkah berikutnya.",
      },
      {
        key: "ks-geuraedo-1",
        prompt:
          "Udah kenyang. Tapi dessert tetap aku makan. → 배가 불러요. ___ 디저트는 먹을 거예요.",
        options: [
          { text: "그래도", correct: true },
          { text: "그래서" },
          { text: "그리고" },
          { text: "그럼" },
        ],
        explanation:
          "Ada halangan (udah kenyang), tapi kamu tetap makan. Itu rasa 'tetap aja' punya 그래도. Kalau 그래서, artinya jadi aneh: 'kenyang, makanya makan dessert'.",
      },
      {
        key: "ks-animyeon-1",
        prompt:
          "Mau bibimbap? Atau kimbap? → 비빔밥 드실래요? ___ 김밥 드실래요?",
        options: [
          { text: "아니면", correct: true },
          { text: "그리고" },
          { text: "그래도" },
          { text: "그럼" },
        ],
        explanation:
          "Nawarin pilihan lain di antara dua pertanyaan pakai 아니면 (atau). Gampang kan?",
      },
    ],
  },
});
