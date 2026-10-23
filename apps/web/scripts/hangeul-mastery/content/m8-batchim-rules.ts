import {
  audioClip,
  b,
  bullet,
  callout,
  contrast,
  divider,
  game,
  heading,
  numbered,
  p,
  quote,
  table,
} from "../blocks";
import type {
  BlockNoteBlock,
  ModuleContent,
  QuestionContent,
} from "../content-types";

// An audio clip whose player label does not reveal the Korean text (the
// builder's default file name is the text itself, which would give away
// listening answers).
const listen = (
  text: string,
  label = "Dengarkan",
  caption = "",
): BlockNoteBlock => {
  const block = audioClip(text, caption);
  return { ...block, props: { ...block.props, fileName: label } };
};

const choice = (
  key: string,
  prompt: string | BlockNoteBlock[],
  correct: string,
  wrong: [string, string, string],
  explanation: string,
): QuestionContent => ({
  key,
  type: "SINGLE_CHOICE",
  prompt,
  explanation,
  options: [
    { content: correct, correct: true },
    ...wrong.map((content) => ({ content })),
  ],
});

const hear = (
  text: string,
  intro = "Dengarkan, lalu pilih kata yang kamu dengar.",
) => [p(intro), listen(text)];

export const m8BatchimRules: ModuleContent = {
  key: "m8-batchim-rules",
  title: "Batchim ganda dan perubahan bunyi",
  description:
    "Batchim yang pindah ke blok berikutnya (연음), batchim ganda, dan perubahan bunyi inti seperti 합니다 [함니다] dan 한국말 [한궁말]. Di akhir modul kamu bisa membaca 감사합니다 sendiri.",
  items: [
    {
      type: "material",
      key: "m8-liaison",
      title: "연음: batchim pindah ke depan",
      description:
        "Saat blok berikutnya diawali ㅇ diam, batchim pindah mengisi tempat kosong itu: 음악 [으막], 한국어 [한구거].",
      minutes: 14,
      blocks: [
        heading("Tempat kosong yang diisi"),
        p(
          "Kamu tahu bahwa ㅇ di awal blok itu diam: ia hanya penanda tempat kosong. Kalau blok sebelumnya punya batchim, batchim itu ",
          b("pindah"),
          " mengisi tempat kosong tersebut. Aturan ini disebut ",
          b("연음 (yeoneum)"),
          ", artinya 'bunyi yang disambung'.",
        ),
        quote("음악 → 으 + 막 → [으막]"),
        p(
          "Bahasa Indonesia melakukan hal yang sama tanpa kita sadari. 'Makan' ditambah '-an' menjadi 'makanan', dan kita mengucapkannya ",
          b("ma-ka-nan"),
          ": n pindah ke suku kata berikutnya. Korea hanya menuliskannya dengan jelas: ejaan tetap 음악, bunyinya [으막].",
        ),
        table([
          ["Ditulis", "Dibaca", "Arti"],
          ["음악", "[으막]", "musik"],
          ["한국어", "[한구거]", "bahasa Korea"],
          ["한국인", "[한구긴]", "orang Korea"],
          ["직업", "[지겁]", "pekerjaan, profesi"],
          ["발음", "[바름]", "pelafalan"],
          ["일요일", "[이료일]", "hari Minggu"],
          ["금요일", "[그묘일]", "hari Jumat"],
          ["이름이", "[이르미]", "namanya (nama + partikel 이)"],
        ]),
        heading("Tiga hal yang perlu diperhatikan", 3),
        numbered(
          b("ㄹ yang pindah menjadi r ringan. "),
          "발음 dibaca [바름], 일요일 dibaca [이료일]. Begitu ㄹ ada di awal suku kata, ia kembali menjadi r yang diketuk sekali.",
        ),
        numbered(
          b("Huruf asli batchim kembali terdengar. "),
          "옷 [옫] tetapi 옷이 [오시]; 꽃 [꼳] tetapi 꽃이 [꼬치]; 앞 [압] tetapi 앞에 [아페]. Huruf dobel pindah utuh: 밖에 [바께], 있어요 [이써요].",
        ),
        numbered(
          b("ㅇ di bawah tidak pindah. "),
          "ㅇ batchim adalah bunyi ng yang nyata, jadi ia tetap di tempatnya: 고양이 (kucing) dibaca [고양이], 영어 (bahasa Inggris) dibaca [영어].",
        ),
        contrast(
          "Ejaan dan bunyi",
          "Putar setiap kata. Audionya mengikuti cara orang Korea mengucapkannya.",
          [
            {
              items: [
                { text: "한국", meaning: "Korea · dibaca [한국]" },
                { text: "한국어", meaning: "bahasa Korea · dibaca [한구거]" },
              ],
              note: "Di 한국, ㄱ ditutup tanpa meledak. Di 한국어, ㄱ pindah dan menjadi 거.",
            },
            {
              items: [
                { text: "음악", meaning: "musik · dibaca [으막]" },
                { text: "발음", meaning: "pelafalan · dibaca [바름]" },
              ],
            },
            {
              items: [
                { text: "옷", meaning: "baju · dibaca [옫]" },
                { text: "옷이", meaning: "bajunya · dibaca [오시]" },
              ],
              note: "Ejaan menyimpan ㅅ yang asli; ia terdengar lagi saat diikuti vokal.",
            },
            {
              items: [
                { text: "있어요", meaning: "ada · dibaca [이써요]" },
                { text: "맛있어요", meaning: "enak · dibaca [마시써요]" },
              ],
            },
            {
              items: [
                { text: "고양이", meaning: "kucing · dibaca [고양이]" },
                { text: "영어", meaning: "bahasa Inggris · dibaca [영어]" },
              ],
              note: "ㅇ batchim tidak pindah.",
            },
          ],
          { showRomanization: false },
        ),
        heading("Baca kalimat perkenalan", 3),
        table([
          ["Ditulis", "Dibaca", "Arti"],
          ["이름이 뭐예요?", "[이르미 뭐예요]", "Siapa namamu?"],
          ["제 이름은 부디예요.", "[제 이르믄 부디예요]", "Nama saya Budi."],
          ["직업이 뭐예요?", "[지거비 뭐예요]", "Apa pekerjaanmu?"],
          ["회사원이에요.", "[회사워니에요]", "Saya karyawan perusahaan."],
          [
            "한국어를 공부해요.",
            "[한구거를 공부해요]",
            "Saya belajar bahasa Korea.",
          ],
        ]),
        listen("이름이 뭐예요?", "이름이 뭐예요?"),
        listen("제 이름은 부디예요.", "제 이름은 부디예요."),
        listen("한국어를 공부해요.", "한국어를 공부해요."),
        callout(
          "tip",
          "Saat membaca, lihat dulu apakah blok berikutnya diawali ㅇ. Kalau ya, dan blok sebelumnya punya batchim selain ㅇ, sambungkan batchim itu ke vokal berikutnya.",
        ),
        game(
          "word-builder",
          "batchim",
          "Susun kata",
          "Susun 음악, 한국어, 발음, dan kata batchim lainnya.",
        ),
        callout(
          "success",
          "Ringkasnya: batchim pindah ke blok berikutnya yang diawali ㅇ diam (음악 [으막], 한국어 [한구거]). Huruf asli terdengar lagi (옷이 [오시]), ㄹ menjadi r ringan (발음 [바름]), dan ㅇ batchim tidak pindah (고양이).",
        ),
      ],
    },
    {
      type: "material",
      key: "m8-double-batchim",
      title: "Batchim ganda: kiri atau kanan?",
      description:
        "Blok dengan dua konsonan di bawah. Aturan kiri atau kanan dan delapan kata kunci.",
      minutes: 14,
      blocks: [
        heading("Dua huruf di lantai bawah"),
        p(
          "Beberapa kata punya ",
          b("dua konsonan berbeda"),
          " di bagian bawah blok, misalnya 닭 (ayam) dan 값 (harga). Ini disebut 겹받침 (batchim ganda). Ada 11 gugus: ㄳ ㄵ ㄶ ㄺ ㄻ ㄼ ㄽ ㄾ ㄿ ㅀ ㅄ.",
        ),
        p("Aturannya dibagi dua:"),
        bullet(
          b("Kalau setelahnya tidak ada vokal "),
          "(di akhir kata atau sebelum konsonan), hanya ",
          b("satu"),
          " huruf yang dibaca.",
        ),
        bullet(
          b("Kalau setelahnya ada vokal "),
          "(blok diawali ㅇ), keduanya dibaca: huruf kanan pindah ke blok berikutnya (연음).",
        ),
        heading("Huruf mana yang dibaca?", 3),
        table([
          ["Baca huruf", "Gugus", "Contoh"],
          [
            "Kiri",
            "ㄳ ㄵ ㄶ ㄼ ㄽ ㄾ ㅀ ㅄ",
            "앉다 [안따], 많다 [만타], 여덟 [여덜], 값 [갑], 없다 [업따]",
          ],
          ["Kanan", "ㄺ ㄻ ㄿ", "닭 [닥], 읽다 [익따], 삶 [삼]"],
        ]),
        callout(
          "tip",
          "Cara mengingat: kebanyakan gugus membaca huruf kiri. Hanya tiga gugus yang membaca huruf kanan, yaitu ㄹ yang diikuti ㄱ, ㅁ, atau ㅍ: ㄺ, ㄻ, ㄿ.",
        ),
        heading("Delapan kata kunci", 3),
        p(
          "Kamu tidak perlu menghafal 11 aturan. Hafalkan delapan kata ini, dan polanya akan ikut tertanam.",
        ),
        table([
          ["Kata", "Arti", "Gugus", "Sendiri", "Dengan vokal"],
          ["닭", "ayam", "ㄺ, baca kanan", "[닥]", "닭이 [달기]"],
          ["읽다", "membaca", "ㄺ, baca kanan", "[익따]", "읽어요 [일거요]"],
          ["삶", "kehidupan", "ㄻ, baca kanan", "[삼]", "삶이 [살미]"],
          ["앉다", "duduk", "ㄵ, baca kiri", "[안따]", "앉아요 [안자요]"],
          ["많다", "banyak", "ㄶ, baca kiri", "[만타]", "많아요 [마나요]"],
          ["없다", "tidak ada", "ㅄ, baca kiri", "[업따]", "없어요 [업써요]"],
          ["값", "harga", "ㅄ, baca kiri", "[갑]", "값이 [갑씨]"],
          ["여덟", "delapan", "ㄼ, baca kiri", "[여덜]", ""],
        ]),
        p(
          "Kamu mungkin memperhatikan bahwa ",
          b("다"),
          " sering terdengar [따], dan 많다 terdengar [만타]. Itu dua perubahan bunyi lain (pengencangan dan ㅎ) yang akan kamu pelajari di pelajaran berikutnya. ㅄ yang diikuti vokal juga begitu: ㅅ pindah dan terdengar tegang, jadi 없어요 dibaca [업써요].",
        ),
        contrast(
          "Sendiri dan dengan vokal",
          "Putar setiap pasangan. Di kata pertama hanya satu huruf terdengar; di kata kedua keduanya terdengar.",
          [
            {
              items: [
                { text: "닭", meaning: "ayam · dibaca [닥]" },
                { text: "닭이", meaning: "ayamnya · dibaca [달기]" },
              ],
            },
            {
              items: [
                { text: "읽다", meaning: "membaca · dibaca [익따]" },
                { text: "읽어요", meaning: "(saya) membaca · dibaca [일거요]" },
              ],
            },
            {
              items: [
                { text: "앉다", meaning: "duduk · dibaca [안따]" },
                { text: "앉아요", meaning: "(saya) duduk · dibaca [안자요]" },
              ],
            },
            {
              items: [
                { text: "많다", meaning: "banyak · dibaca [만타]" },
                { text: "많아요", meaning: "banyak (sopan) · dibaca [마나요]" },
              ],
              note: "ㅎ di batchim hilang sebelum vokal.",
            },
            {
              items: [
                { text: "없다", meaning: "tidak ada · dibaca [업따]" },
                {
                  text: "없어요",
                  meaning: "tidak ada (sopan) · dibaca [업써요]",
                },
              ],
            },
            {
              items: [
                { text: "값", meaning: "harga · dibaca [갑]" },
                { text: "삶", meaning: "kehidupan · dibaca [삼]" },
                { text: "여덟", meaning: "delapan · dibaca [여덜]" },
              ],
            },
          ],
          { showRomanization: false },
        ),
        heading("Kalimat sehari-hari", 3),
        table([
          ["Ditulis", "Dibaca", "Arti"],
          ["책을 읽어요.", "[채글 일거요]", "Saya membaca buku."],
          ["여기 앉으세요.", "[여기 안즈세요]", "Silakan duduk di sini."],
          ["시간이 없어요.", "[시가니 업써요]", "Tidak ada waktu."],
          ["사람이 많아요.", "[사라미 마나요]", "Orangnya banyak."],
        ]),
        listen("여기 앉으세요.", "여기 앉으세요."),
        listen("시간이 없어요.", "시간이 없어요."),
        callout(
          "info",
          "Ada beberapa pengecualian, misalnya 밟다 (menginjak) dibaca [밥따] dan 읽고 dibaca [일꼬]. Itu materi lanjutan dan tidak diuji di kursus ini.",
        ),
        game(
          "syllable-forge",
          "batchim",
          "Susun blok batchim",
          "Latih blok dengan batchim, termasuk yang diikuti vokal.",
        ),
        callout(
          "success",
          "Ringkasnya: batchim ganda dibaca satu huruf kalau tidak diikuti vokal. Kebanyakan membaca huruf kiri; ㄺ ㄻ ㄿ membaca huruf kanan. Kalau diikuti vokal, huruf kanan pindah: 닭이 [달기], 앉아요 [안자요].",
        ),
      ],
    },
    {
      type: "material",
      key: "m8-sound-changes",
      title: "Perubahan bunyi inti dan 감사합니다",
      description:
        "ㅂ→ㅁ di 합니다, ㄱ→ㅇ di 한국말, pengencangan di 학교, dan ㅎ di 좋아요 dan 좋다. Lalu kamu membaca 감사합니다 sendiri.",
      minutes: 18,
      blocks: [
        heading("Kenapa bunyinya berubah?"),
        p(
          "Ejaan Korea menyimpan bentuk asli kata, tetapi mulut selalu mencari cara termudah untuk mengucapkannya. Bahasa Indonesia juga begitu: awalan me- berubah menjadi mem-, men-, atau meng- mengikuti huruf sesudahnya (membaca, menulis, menggambar). Di bahasa Korea, ",
          b("batchim menyesuaikan diri dengan huruf sesudahnya"),
          ". Ada empat pola yang wajib kamu kenal.",
        ),
        heading("1. ㅂ menjadi ㅁ sebelum ㄴ dan ㅁ", 3),
        p(
          "Bentuk sopan resmi -ㅂ니다 ada di mana-mana: di kantor, di pengumuman, dan di bahan belajar EPS-TOPIK. Saat batchim ㅂ bertemu ㄴ, bibir yang sudah tertutup untuk ㅂ langsung mengalirkan udara lewat hidung, jadi ㅂ terdengar ",
          b("ㅁ"),
          ".",
        ),
        table([
          ["Ditulis", "Dibaca", "Arti"],
          ["합니다", "[함니다]", "melakukan (sopan resmi)"],
          ["입니다", "[임니다]", "adalah (sopan resmi)"],
          ["미안합니다", "[미안함니다]", "maaf (sopan resmi)"],
          ["고맙습니다", "[고맙씀니다]", "terima kasih (sopan resmi)"],
          ["반갑습니다", "[반갑씀니다]", "senang bertemu (sopan resmi)"],
        ]),
        heading("2. ㄱ ㄷ ㅂ menjadi ㅇ ㄴ ㅁ sebelum ㄴ dan ㅁ", 3),
        p(
          "Pola nomor 1 sebenarnya bagian dari pola yang lebih besar. Ketiga batchim letup berubah menjadi pasangan sengaunya, di tempat mulut yang sama:",
        ),
        table([
          ["Batchim", "Menjadi", "Contoh"],
          [
            "[ㄱ]",
            "[ㅇ]",
            "한국말 [한궁말] bahasa Korea, 국물 [궁물] kuah, 작년 [장년] tahun lalu",
          ],
          ["[ㄷ]", "[ㄴ]", "거짓말 [거진말] bohong, 있는 [인는] yang ada"],
          ["[ㅂ]", "[ㅁ]", "합니다 [함니다], 십만 [심만] seratus ribu"],
        ]),
        callout(
          "warning",
          "Kesalahan yang sangat umum adalah membaca 한국말 huruf demi huruf, [한국말]. Orang Korea mengucapkannya [한궁말]. Latih kata ini sampai terasa alami.",
        ),
        heading("3. Pengencangan setelah ㄱ ㄷ ㅂ", 3),
        p(
          "Setelah batchim yang dibaca [ㄱ], [ㄷ], atau [ㅂ], konsonan polos berikutnya (ㄱ ㄷ ㅂ ㅅ ㅈ) terdengar ",
          b("tegang"),
          ": 학교 terdengar [학꾜]. Ini terjadi sendiri karena mulut baru saja menutup rapat. Kamu tidak perlu menghafalnya; cukup kenali saat mendengarnya.",
        ),
        table([
          ["Ditulis", "Dibaca", "Arti"],
          ["학교", "[학꾜]", "sekolah"],
          ["학생", "[학쌩]", "siswa"],
          ["식당", "[식땅]", "rumah makan"],
          ["숙제", "[숙쩨]", "pekerjaan rumah (PR)"],
          ["입구", "[입꾸]", "pintu masuk"],
        ]),
        heading("4. ㅎ yang hilang dan ㅎ yang menambah napas", 3),
        p(b("ㅎ hilang. "), "Batchim ㅎ yang diikuti vokal tidak dibaca:"),
        bullet("좋아요 [조아요]: bagus; aku suka"),
        bullet("많아요 [마나요]: banyak"),
        bullet("괜찮아요 [괜차나요]: tidak apa-apa"),
        bullet("싫어요 [시러요]: tidak mau"),
        p(
          b("ㅎ menambah napas. "),
          "Kalau ㅎ bertemu ㄱ, ㄷ, ㅂ, atau ㅈ (di urutan mana pun), keduanya melebur menjadi huruf aspirasi ㅋ, ㅌ, ㅍ, atau ㅊ:",
        ),
        bullet("좋다 [조타]: baik (ㅎ + ㄷ → ㅌ)"),
        bullet("좋고 [조코]: baik dan ... (ㅎ + ㄱ → ㅋ)"),
        bullet("축하해요 [추카해요]: selamat! (ㄱ + ㅎ → ㅋ)"),
        bullet("입학 [이팍]: masuk sekolah (ㅂ + ㅎ → ㅍ)"),
        bullet(
          "못해요 [모태요]: tidak bisa (ㅅ dibaca [ㄷ], lalu ㄷ + ㅎ → ㅌ)",
        ),
        callout(
          "info",
          "ㅎ di tengah kata juga sering terdengar lemah saat orang berbicara cepat, misalnya di 사랑해요 atau 안녕하세요. Saat belajar, tetap ucapkan dengan jelas.",
        ),
        contrast(
          "Ejaan dan bunyi",
          "Putar setiap kata dan bandingkan dengan cara bacanya.",
          [
            {
              items: [
                { text: "합니다", meaning: "dibaca [함니다]" },
                {
                  text: "감사합니다",
                  meaning: "terima kasih · dibaca [감사함니다]",
                },
              ],
            },
            {
              items: [
                { text: "입니다", meaning: "adalah · dibaca [임니다]" },
                {
                  text: "반갑습니다",
                  meaning: "senang bertemu · dibaca [반갑씀니다]",
                },
              ],
            },
            {
              items: [
                { text: "한국말", meaning: "bahasa Korea · dibaca [한궁말]" },
                { text: "국물", meaning: "kuah · dibaca [궁물]" },
              ],
            },
            {
              items: [
                { text: "학교", meaning: "sekolah · dibaca [학꾜]" },
                { text: "식당", meaning: "rumah makan · dibaca [식땅]" },
              ],
            },
            {
              items: [
                { text: "좋아요", meaning: "bagus · dibaca [조아요]" },
                {
                  text: "괜찮아요",
                  meaning: "tidak apa-apa · dibaca [괜차나요]",
                },
              ],
            },
            {
              items: [
                { text: "좋다", meaning: "baik · dibaca [조타]" },
                { text: "축하해요", meaning: "selamat · dibaca [추카해요]" },
              ],
            },
          ],
          { showRomanization: false },
        ),
        p(
          "Sekarang kamu juga tahu kenapa romanisasi di Modul 6 mengikuti bunyi: 한국말 ditulis hangungmal, bukan hangukmal.",
        ),
        divider(),
        heading("Momen yang kamu tunggu"),
        p(
          "Di Modul 0, kamu mendengar tiga frasa yang belum bisa kamu baca. Sekarang tidak ada lagi yang tersembunyi. Baca ketiganya sendiri, blok demi blok, sebelum memutar audionya.",
        ),
        heading("안녕하세요", 3),
        p(
          "안 (ㅇ + ㅏ + ㄴ), 녕 (ㄴ + ㅕ + ㅇ), 하, 세, 요. Tidak ada perubahan bunyi: dibaca persis seperti tulisannya. Artinya: halo, apa kabar?",
        ),
        listen("안녕하세요", "안녕하세요"),
        heading("사랑해요", 3),
        p(
          "사, 랑 (ㄹ + ㅏ + ㅇ), 해, 요. ㅇ di bawah 랑 tidak pindah. Artinya: aku sayang kamu.",
        ),
        listen("사랑해요", "사랑해요"),
        heading("감사합니다", 3),
        numbered("감 = ㄱ + ㅏ + ㅁ"),
        numbered("사 = ㅅ + ㅏ"),
        numbered(
          "합 = ㅎ + ㅏ + ㅂ, tetapi ㅂ bertemu ㄴ di blok berikutnya, jadi terdengar [함]",
        ),
        numbered("니 = ㄴ + ㅣ"),
        numbered("다 = ㄷ + ㅏ"),
        quote("감사합니다 → [감사함니다] = terima kasih"),
        listen("감사합니다", "감사합니다"),
        callout(
          "success",
          "Kamu berhasil! Frasa yang dulu hanya bisa kamu dengar, sekarang bisa kamu baca, dan kamu tahu persis kenapa 감사합니다 terdengar [감사함니다]. Itulah artinya menguasai Hangeul.",
        ),
        heading("Bonus: baca sendiri", 3),
        p("Tutup kolom tengah dengan tanganmu, baca, lalu cek."),
        table([
          ["Ditulis", "Dibaca", "Arti"],
          ["반갑습니다", "[반갑씀니다]", "senang bertemu"],
          ["만나서 반가워요", "[만나서 반가워요]", "senang bertemu denganmu"],
          ["축하해요", "[추카해요]", "selamat!"],
          ["괜찮아요", "[괜차나요]", "tidak apa-apa"],
          ["한국말 잘해요", "[한궁말 잘해요]", "kamu pandai berbahasa Korea"],
          [
            "사장님, 감사합니다",
            "[사장님 감사함니다]",
            "Pak/Bu bos, terima kasih",
          ],
        ]),
        game(
          "word-builder",
          "batchim",
          "Susun kata batchim",
          "Ulangi semua kata dari modul batchim.",
        ),
        callout(
          "success",
          "Ringkasnya: ㄱ ㄷ ㅂ menjadi ㅇ ㄴ ㅁ sebelum ㄴ ㅁ (합니다 [함니다], 한국말 [한궁말]); setelah ㄱ ㄷ ㅂ konsonan berikutnya terdengar tegang (학교 [학꾜]); ㅎ hilang sebelum vokal (좋아요 [조아요]) dan menambah napas di samping ㄱ ㄷ ㅂ ㅈ (좋다 [조타]).",
        ),
      ],
    },
    {
      type: "assessment",
      key: "m8-quiz",
      title: "Kuis Modul 8: batchim ganda dan perubahan bunyi",
      description:
        "16 soal tentang 연음, batchim ganda, dan perubahan bunyi, ditambah ulasan.",
      instructions:
        "Pilih satu jawaban untuk setiap soal. Pilihan dalam tanda kurung siku, misalnya [으막], menunjukkan cara membaca, bukan ejaan. Nilai lulus 80%.",
      passingScore: 80,
      shuffleOptions: true,
      questions: [
        choice(
          "m8-quiz-eumak",
          "Bagaimana 음악 (musik) dibaca?",
          "[으막]",
          ["[음악]", "[음막]", "[으나]"],
          "Blok 악 diawali ㅇ diam, jadi batchim ㅁ dari 음 pindah ke situ: [으막].",
        ),
        choice(
          "m8-quiz-hangugeo",
          "Bagaimana 한국어 (bahasa Korea) dibaca?",
          "[한구거]",
          ["[한국어]", "[항구거]", "[한궁어]"],
          "ㄱ dari 국 pindah ke 어 yang diawali ㅇ diam: [한구거]. ㄴ di 한 tidak berubah karena setelahnya ada ㄱ, bukan ㅇ.",
        ),
        choice(
          "m8-quiz-ieumi",
          "Bagaimana 이름이 (namanya) dibaca?",
          "[이르미]",
          ["[이름이]", "[이르이]", "[이름미]"],
          "ㅁ dari 름 pindah ke 이: [이르미]. Kalimat 이름이 뭐예요? dibaca [이르미 뭐예요].",
        ),
        choice(
          "m8-quiz-dak",
          "Bagaimana 닭 (ayam) dibaca kalau berdiri sendiri?",
          "[닥]",
          ["[달]", "[달기]", "[다]"],
          "ㄺ termasuk tiga gugus yang membaca huruf kanan (ㄺ ㄻ ㄿ), jadi 닭 dibaca [닥]. [달기] adalah bacaan 닭이.",
        ),
        choice(
          "m8-quiz-yeodeol",
          "Bagaimana 여덟 (delapan) dibaca kalau berdiri sendiri?",
          "[여덜]",
          ["[여덥]", "[여덕]", "[여더]"],
          "ㄼ membaca huruf kiri, yaitu ㄹ: [여덜].",
        ),
        choice(
          "m8-quiz-anjayo",
          "Bagaimana 앉아요 (duduk) dibaca?",
          "[안자요]",
          ["[아나요]", "[안아요]", "[앙자요]"],
          "Sebelum vokal, kedua huruf ㄵ terdengar: ㄴ tetap di bawah, ㅈ pindah ke blok berikutnya: [안자요].",
        ),
        choice(
          "m8-quiz-hamnida",
          "Bagaimana 합니다 dibaca?",
          "[함니다]",
          ["[한니다]", "[항니다]", "[하니다]"],
          "Batchim ㅂ bertemu ㄴ, jadi berubah menjadi pasangan sengaunya ㅁ: [함니다].",
        ),
        choice(
          "m8-quiz-hear-gamsahamnida",
          hear(
            "감사합니다",
            "Dengarkan. Bagaimana kata yang kamu dengar DITULIS?",
          ),
          "감사합니다",
          ["감사함니다", "감사한니다", "감사하니다"],
          "Terdengar [감사함니다], tetapi ditulis 감사합니다. Ejaan menyimpan ㅂ yang asli; ㅂ terdengar ㅁ karena bertemu ㄴ.",
        ),
        choice(
          "m8-quiz-hangungmal",
          "Bagaimana 한국말 (bahasa Korea) dibaca?",
          "[한궁말]",
          ["[한국말]", "[한구말]", "[항국말]"],
          "Batchim ㄱ bertemu ㅁ, jadi berubah menjadi ㅇ: [한궁말]. Membacanya huruf demi huruf, [한국말], adalah kesalahan yang umum.",
        ),
        choice(
          "m8-quiz-joayo",
          "Bagaimana 좋아요 dibaca?",
          "[조아요]",
          ["[조하요]", "[조타요]", "[조카요]"],
          "Batchim ㅎ yang diikuti vokal hilang: [조아요].",
        ),
        choice(
          "m8-quiz-jota",
          "Bagaimana 좋다 dibaca?",
          "[조타]",
          ["[조다]", "[조하다]", "[존다]"],
          "ㅎ bertemu ㄷ dan keduanya melebur menjadi ㅌ yang berhembus: [조타].",
        ),
        choice(
          "m8-review-hear-bang",
          hear(
            "방",
            "Ulasan Modul 7. Dengarkan, lalu pilih kata yang kamu dengar.",
          ),
          "방",
          ["반", "밤", "밥"],
          "방 (kamar) berakhir dengan ng (ㅇ). 반 berakhir n, 밤 berakhir m, 밥 berakhir p yang ditahan.",
        ),
        choice(
          "m8-review-kkot",
          "Ulasan Modul 7. Bagaimana 꽃 (bunga) dibaca kalau berdiri sendiri?",
          "[꼳]",
          ["[꼬츠]", "[꼭]", "[꼽]"],
          "ㅊ di posisi batchim dibaca [ㄷ], jadi 꽃 dibaca [꼳]. Kalau diikuti vokal, ㅊ terdengar lagi: 꽃이 [꼬치].",
        ),
        choice(
          "m8-review-read-hakgyo",
          "Ulasan Modul 7. Apa arti 학교?",
          "sekolah",
          ["siswa", "guru", "rumah sakit"],
          "학교 = sekolah, dibaca [학꾜]. Siswa = 학생, guru = 선생님, rumah sakit = 병원.",
        ),
        choice(
          "m8-review-read-uisa",
          "Ulasan Modul 5. Apa arti 의사?",
          "dokter",
          ["kursi", "perusahaan", "rapat"],
          "의사 = dokter. Kursi = 의자, perusahaan = 회사, rapat = 회의.",
        ),
        choice(
          "m8-review-hear-tokki",
          hear(
            "토끼",
            "Ulasan Modul 4. Dengarkan, lalu pilih kata yang kamu dengar.",
          ),
          "토끼",
          ["도끼", "토기", "또끼"],
          "토끼 (kelinci) diawali ㅌ yang berhembus. 도끼 (kapak) diawali ㄷ polos.",
        ),
      ],
    },
  ],
};
