import {
  assessmentRef,
  audioClip,
  b,
  callout,
  contrast,
  conversation,
  game,
  lessonPage,
  p,
  rules,
} from "../blocks";
import type {
  BlockNoteBlock,
  ModuleContent,
  QuestionContent,
} from "../content-types";

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
) => [p(intro), audioClip(text)];

export const m8BatchimRules: ModuleContent = {
  key: "m8-batchim-rules",
  title: "Batchim ganda dan perubahan bunyi",
  description:
    "Batchim yang pindah ke blok berikutnya (연음), batchim ganda, dan dua perubahan bunyi: 합니다 [함니다] dan 한국말 [한궁말]. Di akhir modul kamu bisa membaca 감사합니다 sendiri.",
  items: [
    {
      type: "material",
      key: "m8-liaison",
      title: "연음: batchim pindah ke depan",
      description:
        "Batchim pindah ke blok berikutnya kalau blok itu dimulai ㅇ.",
      minutes: 6,
      blocks: [
        lessonPage({
          theme: "forest",
          imageKey: "chapter-8",
          imageAlt: "Murid mendengarkan dengan headphone di taman",
          chapter: 8,
          title: "연음 · 합니다",
          subtitle: "Batchim ganda dan perubahan bunyi",
          question: "한국어 공부해요?",
          answer: "네, 감사합니다!",
          cards: [
            {
              label: "Bunyi",
              title: "Batchim pindah",
              description: "음악 dibaca [으막]",
            },
            {
              label: "Perubahan",
              title: "ㅂ → ㅁ, ㄱ → ㅇ",
              description: "합니다 · 한국말",
            },
            {
              label: "Latihan",
              title: "Dialog penutup",
              description: "Permainan dan kuis bab",
            },
          ],
          goals: [
            "Membaca batchim yang pindah ke blok berikutnya.",
            "Mengucapkan 감사합니다 dengan benar.",
          ],
        }),
        callout(
          "info",
          "Ejaannya tetap, tapi bunyinya ",
          b("disambung"),
          ". Ini yang membuat 한국어 terdengar [한구거].",
        ),
        rules({
          title: "Batchim pindah ke ㅇ diam",
          intro:
            "ㅇ di depan blok itu tempat kosong. Batchim dari blok sebelumnya pindah mengisinya.",
          columns: ["Ditulis", "Dibaca", "Arti"],
          rows: [
            { when: "음악", result: "[으막]", example: "musik" },
            { when: "한국어", result: "[한구거]", example: "bahasa Korea" },
            { when: "이름이", result: "[이르미]", example: "namanya" },
            {
              when: "옷이",
              result: "[오시]",
              example: "bajunya: ㅅ terdengar lagi",
            },
            { when: "발음", result: "[바름]", example: "pelafalan: ㄹ jadi r" },
          ],
          tip: {
            title: "ㅇ di bawah tidak pindah",
            text: "ㅇ di bawah blok itu bunyi ng, jadi tetap di tempatnya: 고양이, 영어.",
          },
        }),
        contrast(
          "Ejaan dan bunyi",
          "Putar setiap pasangan. Dengarkan batchim yang pindah.",
          [
            {
              items: [
                { text: "한국", meaning: "Korea · [한국]" },
                { text: "한국어", meaning: "bahasa Korea · [한구거]" },
              ],
              note: "Di 한국어, ㄱ pindah dan jadi 거.",
            },
            {
              items: [
                { text: "옷", meaning: "baju · [옫]" },
                { text: "옷이", meaning: "bajunya · [오시]" },
              ],
              note: "Sendiri dibaca [옫]. Diikuti ㅇ, ㅅ terdengar lagi.",
            },
            {
              items: [
                { text: "있어요", meaning: "ada · [이써요]" },
                { text: "맛있어요", meaning: "enak · [마시써요]" },
              ],
            },
            {
              items: [
                { text: "고양이", meaning: "kucing · [고양이]" },
                { text: "영어", meaning: "bahasa Inggris · [영어]" },
              ],
              note: "ㅇ di bawah tidak pindah.",
            },
          ],
          { showRomanization: false },
        ),
        p("Baca sendiri dulu, lalu putar audionya."),
        audioClip(
          "이름이 뭐예요?",
          "[이르미 뭐예요] Siapa namamu?",
          "이름이 뭐예요?",
        ),
        audioClip(
          "한국어를 공부해요.",
          "[한구거를 공부해요] Saya belajar bahasa Korea.",
          "한국어를 공부해요.",
        ),
        game(
          "word-builder",
          "batchim",
          "Susun kata",
          "Susun 음악, 한국어, 발음, dan kata batchim lainnya.",
        ),
        callout(
          "success",
          b("Ingat: "),
          "blok berikutnya dimulai ㅇ? Batchim pindah ke sana: 음악 [으막].",
        ),
      ],
    },
    {
      type: "material",
      key: "m8-double-batchim",
      title: "Batchim ganda: kiri atau kanan?",
      description: "Blok dengan dua konsonan di bawah, dan mana yang dibaca.",
      minutes: 5,
      blocks: [
        callout(
          "info",
          "Beberapa blok punya ",
          b("dua konsonan di bawah"),
          ", misalnya 닭 dan 없다. Kalau sesudahnya tidak ada vokal, hanya satu yang dibaca.",
        ),
        rules({
          title: "Kiri atau kanan?",
          intro:
            "Kebanyakan dibaca huruf kiri. Hanya ㄺ ㄻ ㄿ yang dibaca huruf kanan.",
          columns: ["Gugus", "Baca", "Contoh"],
          rows: [
            {
              when: "kebanyakan (ㅄ ㄵ ㄼ …)",
              result: "kiri",
              example: "값 [갑], 여덟 [여덜]",
            },
            { when: "ㄺ ㄻ ㄿ", result: "kanan", example: "닭 [닥], 삶 [삼]" },
          ],
          tip: {
            title: "Ada vokal sesudahnya?",
            text: "Kalau blok berikutnya dimulai ㅇ, keduanya dibaca: huruf kanan pindah. 닭이 [달기], 앉아요 [안자요].",
          },
        }),
        contrast(
          "Sendiri dan dengan vokal",
          "Putar setiap pasangan. Di kata pertama satu huruf terdengar, di kata kedua dua-duanya.",
          [
            {
              items: [
                { text: "닭", meaning: "ayam · [닥]" },
                { text: "닭이", meaning: "ayamnya · [달기]" },
              ],
            },
            {
              items: [
                { text: "읽다", meaning: "membaca · [익따]" },
                { text: "읽어요", meaning: "(saya) membaca · [일거요]" },
              ],
            },
            {
              items: [
                { text: "앉다", meaning: "duduk · [안따]" },
                { text: "앉아요", meaning: "(saya) duduk · [안자요]" },
              ],
            },
            {
              items: [
                { text: "없다", meaning: "tidak ada · [업따]" },
                { text: "없어요", meaning: "tidak ada (sopan) · [업써요]" },
              ],
            },
          ],
          { showRomanization: false },
        ),
        audioClip(
          "시간이 없어요.",
          "[시가니 업써요] Tidak ada waktu.",
          "시간이 없어요.",
        ),
        game(
          "syllable-forge",
          "batchim",
          "Susun blok batchim",
          "Latih blok dengan batchim, termasuk yang diikuti vokal.",
        ),
        callout(
          "success",
          b("Ingat: "),
          "kebanyakan baca huruf kiri, ㄺ ㄻ ㄿ baca huruf kanan.",
        ),
      ],
    },
    {
      type: "material",
      key: "m8-sound-changes",
      title: "합니다 dan 한국말: dua perubahan bunyi",
      description:
        "ㅂ jadi ㅁ dan ㄱ jadi ㅇ sebelum ㄴ atau ㅁ, lalu 감사합니다.",
      minutes: 7,
      blocks: [
        callout(
          "info",
          "Kadang batchim berubah bunyi supaya lebih mudah diucapkan. Ejaannya tetap. Ini ",
          b("dua yang paling sering"),
          ".",
        ),
        rules({
          title: "ㅂ jadi ㅁ sebelum ㄴ atau ㅁ",
          intro:
            "Bentuk sopan -ㅂ니다 ada di mana-mana, jadi ini perubahan yang paling sering kamu dengar.",
          columns: ["Ditulis", "Dibaca", "Arti"],
          rows: [
            {
              when: "합니다",
              result: "[함니다]",
              example: "melakukan (sopan)",
            },
            { when: "입니다", result: "[임니다]", example: "adalah (sopan)" },
            {
              when: "감사합니다",
              result: "[감사함니다]",
              example: "terima kasih",
            },
          ],
        }),
        rules({
          title: "ㄱ jadi ㅇ sebelum ㄴ atau ㅁ",
          theme: "green",
          columns: ["Ditulis", "Dibaca", "Arti"],
          rows: [
            { when: "한국말", result: "[한궁말]", example: "bahasa Korea" },
            { when: "국물", result: "[궁물]", example: "kuah" },
            { when: "작년", result: "[장년]", example: "tahun lalu" },
          ],
          tip: {
            title: "Salah yang sering",
            text: "Jangan baca 한국말 huruf demi huruf. Orang Korea bilang [한궁말].",
          },
        }),
        contrast(
          "Ejaan dan bunyi",
          "Putar setiap kata dan bandingkan dengan cara bacanya.",
          [
            {
              items: [
                { text: "합니다", meaning: "[함니다]" },
                { text: "입니다", meaning: "adalah · [임니다]" },
              ],
            },
            {
              items: [
                { text: "한국말", meaning: "bahasa Korea · [한궁말]" },
                { text: "국물", meaning: "kuah · [궁물]" },
              ],
            },
          ],
          { showRomanization: false },
        ),
        callout(
          "tip",
          "Ada perubahan bunyi lain juga, misalnya 학교 terdengar [학꾜]. Tidak perlu dihafal: dengarkan saja, nanti kamu terbiasa.",
        ),
        conversation({
          imageKey: "dialogue-thanks",
          imageAlt: "Dua teman bertemu dan memberi hadiah di Seoul",
          eyebrow: "Dialog · bertemu teman",
          number: "08",
          lines: [
            { speaker: "Jisu", korean: "안녕하세요!", translation: "Halo!" },
            {
              speaker: "Rina",
              korean: "안녕하세요, 지수 씨!",
              translation: "Halo, Jisu!",
            },
            {
              speaker: "Jisu",
              korean: "이거 선물이에요.",
              translation: "Ini hadiah untukmu.",
            },
            {
              speaker: "Rina",
              korean: "와, 감사합니다!",
              translation: "Wah, terima kasih!",
            },
          ],
        }),
        p(
          b("Momen yang kamu tunggu: "),
          "tiga frasa dari Perkenalan. Baca sendiri dulu, lalu putar audionya.",
        ),
        audioClip(
          "안녕하세요",
          "Halo. Dibaca persis seperti tulisannya.",
          "안녕하세요",
        ),
        audioClip(
          "사랑해요",
          "Aku sayang kamu. ㅇ di bawah 랑 tidak pindah.",
          "사랑해요",
        ),
        audioClip(
          "감사합니다",
          "Terima kasih. Dibaca [감사함니다], karena ㅂ bertemu ㄴ.",
          "감사합니다",
        ),
        game(
          "word-builder",
          "batchim",
          "Susun kata batchim",
          "Ulangi semua kata dari modul batchim.",
        ),
        assessmentRef("m8-quiz"),
        callout(
          "success",
          b("Ingat: "),
          "sebelum ㄴ atau ㅁ, ㅂ jadi ㅁ dan ㄱ jadi ㅇ: 합니다 [함니다], 한국말 [한궁말].",
        ),
      ],
    },
    {
      type: "assessment",
      key: "m8-quiz",
      title: "Kuis Modul 8: batchim ganda dan perubahan bunyi",
      description:
        "14 soal tentang 연음, batchim ganda, dan perubahan bunyi, ditambah ulasan.",
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
          "Batchim ㅂ bertemu ㄴ, jadi terdengar ㅁ: [함니다].",
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
