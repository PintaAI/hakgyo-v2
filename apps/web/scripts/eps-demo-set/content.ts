// The authored demo set: 40 original EPS-TOPIK questions for blueprint eps-topik@2025.1
// (packages/shared/src/eps-blueprint.ts), written for Hakgyo. Never HRDK material, and never a copy
// or paraphrase of the style examples in packages/shared/src/eps-taxonomy.ts.
//
// Every question is written with its key as the first option; build.ts moves keys to balanced
// positions. Explanations are Indonesian, Korean only inside quotes, and never name an option by
// number (positions change).

export type Inline =
  string | { text: string; underline?: boolean; bold?: boolean };

/** One paragraph of inline parts. */
export type Paragraph = readonly Inline[];

export type TemplateSpec =
  | { template: "sign-electric" }
  | { template: "notice-counseling" }
  | { template: "chart-weekend" }
  | { template: "notice-health" }
  | { template: "calendar"; month: number; day: number }
  | { template: "price"; amount: number };

export type ImageSpec =
  { kind: "ai"; brief: string } | ({ kind: "template" } & TemplateSpec);

export type ScriptLine = { speaker: "M" | "F"; text: string };

export type OptionSpec =
  { text: Paragraph } | { image: ImageSpec; label: string };

export type QuestionSpec = {
  number: number;
  /** Type code, `R1`…`L12`. */
  type: string;
  level: "mudah" | "sedang" | "sulit";
  topic: string;
  /** The type's instruction line, the first line of the prompt. */
  instruction?: string;
  /** Paragraphs after the instruction: the question, or a passage. */
  stem?: readonly Paragraph[];
  promptImage?: ImageSpec;
  /** Listening: what the prompt audio says. */
  script?: readonly ScriptLine[];
  /** Listening types whose options are read aloud (prompt-and-options). */
  optionsReadAloud?: boolean;
  /** Key first. */
  options: readonly [OptionSpec, OptionSpec, OptionSpec, OptionSpec];
  explanation: string;
  /** A question group this question belongs to. */
  group?: string;
};

export type GroupSpec = {
  key: string;
  instruction: string;
  script: readonly ScriptLine[];
};

const t = (...parts: Inline[]): OptionSpec => ({ text: parts });
const u = (text: string): Inline => ({ text, underline: true });
const b = (text: string): Inline => ({ text, bold: true });
const ai = (brief: string): ImageSpec => ({ kind: "ai", brief });
const pic = (brief: string, label: string): OptionSpec => ({
  image: ai(brief),
  label,
});
const blank = "(          )";

/** Two recurring workers, so a picture series shows the same people. */
const MAN =
  "a Southeast Asian man in his late twenties with short black hair, wearing a plain grey work jacket";
const WOMAN =
  "a Korean woman in her thirties with shoulder-length hair tied back, wearing a navy work vest over a white shirt";

export const set = {
  key: "eps-demo-set-1",
  version: "2026-11-02.1",
  title: "Contoh Set EPS-TOPIK 1",
  description:
    "Set contoh 40 soal format EPS-TOPIK (20 membaca, 20 mendengar) buatan Hakgyo, lengkap dengan kunci jawaban dan penjelasan. Audio dibuat dengan suara AI.",
} as const;

export const groups: readonly GroupSpec[] = [
  {
    key: "g39",
    instruction: "대화를 듣고 물음에 답하십시오.",
    script: [
      { speaker: "F", text: "부디 씨, 오늘은 왜 이렇게 일찍 퇴근해요?" },
      {
        speaker: "M",
        text: "병원에 가려고요. 며칠 전부터 손목이 계속 아파서요.",
      },
      { speaker: "F", text: "혹시 일하다가 다쳤어요?" },
      {
        speaker: "M",
        text: "네, 무거운 부품을 계속 옮겨서 그런 것 같아요.",
      },
      {
        speaker: "F",
        text: "그럼 반장님께 꼭 말씀드리세요. 일하다가 다치면 산재 보험으로 치료받을 수 있어요.",
      },
      {
        speaker: "M",
        text: "아, 그래요? 몰랐어요. 내일 아침에 말씀드릴게요.",
      },
    ],
  },
];

export const questions: readonly QuestionSpec[] = [
  // ───────────── 읽기 (Membaca) ─────────────
  {
    number: 1,
    type: "R1",
    level: "mudah",
    topic: "benda",
    instruction: "다음 그림을 보고 맞는 단어나 문장을 고르십시오.",
    promptImage: ai(
      "A tall two-door refrigerator standing alone against a plain kitchen wall, doors closed, simple handles. Nothing else in the picture.",
    ),
    options: [
      t("냉장고입니다."),
      t("세탁기입니다."),
      t("전자레인지입니다."),
      t("선풍기입니다."),
    ],
    explanation:
      "Gambar menunjukkan lemari es, dalam bahasa Korea '냉장고'. '세탁기' adalah mesin cuci, '전자레인지' microwave, dan '선풍기' kipas angin.",
  },
  {
    number: 2,
    type: "R1",
    level: "mudah",
    topic: "alat-kerja",
    instruction: "다음 그림을 보고 맞는 단어나 문장을 고르십시오.",
    promptImage: ai(
      "A forklift in a warehouse lifting a wooden pallet stacked with cardboard boxes on its two forks, seen from the side, with the driver seated. Nothing else in the picture.",
    ),
    options: [
      t("지게차입니다."),
      t("굴착기입니다."),
      t("트럭입니다."),
      t("손수레입니다."),
    ],
    explanation:
      "Kendaraan pengangkat palet di gudang ini adalah forklift, '지게차'. '굴착기' adalah ekskavator, '트럭' truk, dan '손수레' gerobak dorong.",
  },
  {
    number: 3,
    type: "R1",
    level: "mudah",
    topic: "kehidupan",
    instruction: "다음 그림을 보고 맞는 단어나 문장을 고르십시오.",
    promptImage: ai(
      `${MAN}, sweeping the floor with a long broom held in both hands, in an empty room with bare walls and a plain floor.`,
    ),
    options: [
      t("바닥을 쓸고 있습니다."),
      t("창문을 닦고 있습니다."),
      t("상자를 나르고 있습니다."),
      t("의자를 고치고 있습니다."),
    ],
    explanation:
      "Pria di gambar sedang menyapu lantai dengan sapu. '쓸다' berarti menyapu, dan '-고 있습니다' menyatakan kegiatan yang sedang berlangsung.",
  },
  {
    number: 4,
    type: "R2",
    level: "mudah",
    topic: "k3",
    instruction: "다음 그림이 나타내는 의미로 알맞은 것을 고르십시오.",
    promptImage: { kind: "template", template: "sign-electric" },
    options: [
      t("감전될 수 있으니까 조심하십시오."),
      t("미끄러질 수 있으니까 조심하십시오."),
      t("물건이 떨어질 수 있으니까 조심하십시오."),
      t("불이 날 수 있으니까 조심하십시오."),
    ],
    explanation:
      "Segitiga kuning adalah rambu peringatan, dan gambar petir berarti bahaya listrik. '감전되다' berarti tersengat listrik.",
  },
  {
    number: 5,
    type: "R4",
    level: "mudah",
    topic: "kehidupan",
    instruction: "밑줄 친 부분이 맞는 것을 고르십시오.",
    options: [
      t("어제 ", u("시장에서"), " 과일을 샀어요."),
      t("저는 매일 아침 ", u("버스가"), " 타요."),
      t("동생은 ", u("도서관을"), " 공부해요."),
      t("저는 한국 ", u("음식이"), " 좋아해요."),
    ],
    explanation:
      "'시장에서' benar karena tempat terjadinya kegiatan memakai '에서'. Yang lain seharusnya '버스를 타요', '도서관에서 공부해요', dan '음식을 좋아해요'.",
  },
  {
    number: 6,
    type: "R4",
    level: "sedang",
    topic: "kehidupan",
    instruction: "밑줄 친 부분이 맞는 것을 고르십시오.",
    options: [
      t("작업장이 ", u("더워서"), " 창문을 열었어요."),
      t("저는 쉬는 시간에 음악을 ", u("듣어요"), "."),
      t("이 상자는 너무 ", u("무겁어요"), "."),
      t("처음에는 한국어를 잘 ", u("모랐어요"), "."),
    ],
    explanation:
      "'덥다' adalah kata sifat tak beraturan 'ㅂ', jadi 'ㅂ' berubah menjadi '우': '덥 + 어서 → 더워서'. Bentuk yang benar untuk kalimat lain adalah '들어요', '무거워요', dan '몰랐어요'.",
  },
  {
    number: 7,
    type: "R5",
    level: "mudah",
    topic: "lembaga",
    instruction: "다음을 보고 물음에 답하십시오.",
    stem: [["일요일에 상담할 수 있는 시간은 언제입니까?"]],
    promptImage: { kind: "template", template: "notice-counseling" },
    options: [
      t("오후 1시부터 오후 5시까지"),
      t("오전 10시부터 오후 6시까지"),
      t("오전 10시부터 오후 5시까지"),
      t("오후 1시부터 오후 6시까지"),
    ],
    explanation:
      "Pada papan tertulis hari Minggu (일요일) pukul 13.00–17.00, yaitu '오후 1시부터 오후 5시까지'. Pukul 10.00–18.00 adalah jam hari kerja (평일).",
  },
  {
    number: 8,
    type: "R6",
    level: "mudah",
    topic: "kehidupan",
    instruction: "다음 단어와 관계있는 것을 고르십시오.",
    stem: [[b("병원")]],
    options: [t("의사"), t("요리사"), t("운전기사"), t("미용사")],
    explanation:
      "'병원' (rumah sakit) berhubungan dengan '의사' (dokter). '요리사' adalah juru masak, '운전기사' sopir, dan '미용사' penata rambut.",
  },
  {
    number: 9,
    type: "R6",
    level: "sedang",
    topic: "tindakan-kerja",
    instruction: "다음 단어와 관계있는 것을 고르십시오.",
    stem: [[b("퇴근")]],
    options: [
      t("일을 마치고 회사에서 나오는 것"),
      t("일을 하러 아침에 회사에 가는 것"),
      t("회사를 그만두고 다른 일을 찾는 것"),
      t("일하는 중간에 잠깐 쉬는 것"),
    ],
    explanation:
      "'퇴근' berarti pulang kerja setelah jam kerja selesai. Berangkat kerja adalah '출근', berhenti dari perusahaan '퇴사', dan istirahat sejenak '휴식'.",
  },
  {
    number: 10,
    type: "R7",
    level: "sedang",
    topic: "kehidupan",
    instruction: "다음 그래프의 내용과 같은 것을 고르십시오.",
    promptImage: { kind: "template", template: "chart-weekend" },
    options: [
      t("친구를 만나는 사람이 운동하는 사람보다 많습니다."),
      t("한국어를 공부하는 사람이 집에서 쉬는 사람보다 많습니다."),
      t("쇼핑하는 사람이 운동하는 사람보다 많습니다."),
      t("집에서 쉬는 사람이 친구를 만나는 사람보다 적습니다."),
    ],
    explanation:
      "Pada grafik, bertemu teman (25%) lebih banyak daripada olahraga (12%). Belajar bahasa Korea (20%) lebih sedikit daripada istirahat di rumah (35%), dan belanja (8%) lebih sedikit daripada olahraga.",
  },
  {
    number: 11,
    type: "R8",
    level: "mudah",
    topic: "kehidupan",
    instruction: "빈칸에 들어갈 가장 알맞은 것을 고르십시오.",
    stem: [[`신청서의 ${blank} 칸에는 태어난 날을 씁니다.`]],
    options: [t("생년월일"), t("국적"), t("주소"), t("성별")],
    explanation:
      "Tanggal lahir di formulir ditulis pada kolom '생년월일'. '국적' adalah kewarganegaraan, '주소' alamat, dan '성별' jenis kelamin.",
  },
  {
    number: 12,
    type: "R8",
    level: "sedang",
    topic: "alat-kerja",
    instruction: "빈칸에 들어갈 가장 알맞은 것을 고르십시오.",
    stem: [
      [
        `공장 기계가 갑자기 고장 났습니다. ${blank} 오늘은 일을 일찍 끝냈습니다.`,
      ],
    ],
    options: [t("그래서"), t("그렇지만"), t("그러면"), t("그래도")],
    explanation:
      "Kalimat kedua adalah akibat dari kalimat pertama (mesin rusak, jadi pekerjaan selesai lebih awal), maka penghubungnya '그래서' (karena itu).",
  },
  {
    number: 13,
    type: "R8",
    level: "sedang",
    topic: "kehidupan",
    instruction: "빈칸에 들어갈 가장 알맞은 것을 고르십시오.",
    stem: [
      [`다음 달부터 한국 공장에서 ${blank} 지금 한국어를 공부하고 있습니다.`],
    ],
    options: [t("일하려고"), t("일하면서"), t("일하지만"), t("일하거나")],
    explanation:
      "'-(으)려고' menyatakan tujuan: ia belajar bahasa Korea sekarang supaya bisa bekerja di pabrik Korea mulai bulan depan.",
  },
  {
    number: 14,
    type: "R8",
    level: "sedang",
    topic: "kehidupan",
    instruction: "빈칸에 들어갈 가장 알맞은 것을 고르십시오.",
    stem: [
      [
        `기숙사 문은 밤 11시에 닫힙니다. 그러니까 11시 전에는 기숙사에 ${blank}.`,
      ],
    ],
    options: [
      t("돌아와야 합니다"),
      t("돌아오면 안 됩니다"),
      t("돌아올 필요가 없습니다"),
      t("돌아오지 못합니다"),
    ],
    explanation:
      "Pintu asrama ditutup pukul 23.00, jadi penghuni wajib kembali sebelum jam itu. Kewajiban dinyatakan dengan '-아야/어야 합니다'.",
  },
  {
    number: 15,
    type: "R8",
    level: "sulit",
    topic: "k3",
    instruction: "빈칸에 들어갈 가장 알맞은 것을 고르십시오.",
    stem: [
      [
        `크레인으로 무거운 물건을 옮길 때는 줄이 끊어지는 일도 생깁니다. 그래서 크레인 아래에 서 있으면 ${blank}.`,
      ],
    ],
    options: [
      t("크게 다칠 수도 있습니다"),
      t("크게 다쳐도 됩니다"),
      t("크게 다치지 않을 것입니다"),
      t("크게 다칠 뻔했습니다"),
    ],
    explanation:
      "Tali crane bisa putus, jadi berdiri di bawahnya berbahaya. Kemungkinan seperti ini dinyatakan dengan '-(으)ㄹ 수도 있다': bisa saja terluka parah.",
  },
  {
    number: 16,
    type: "R8",
    level: "sulit",
    topic: "k3",
    instruction: "빈칸에 들어갈 가장 알맞은 것을 고르십시오.",
    stem: [
      [
        `화학 물질이 눈에 들어갔을 때 손으로 눈을 비비면 더 위험해집니다. 그러니까 이때는 눈을 ${blank}. 바로 깨끗한 물로 씻어 내십시오.`,
      ],
    ],
    options: [
      t("비비면 안 됩니다"),
      t("비벼야 합니다"),
      t("비벼도 됩니다"),
      t("비빌 수밖에 없습니다"),
    ],
    explanation:
      "Mengucek mata yang terkena bahan kimia justru makin berbahaya, jadi yang tepat adalah larangan '-(으)면 안 됩니다'. Pilihan lain menyatakan kewajiban, izin, atau keterpaksaan.",
  },
  {
    number: 17,
    type: "R9",
    level: "sedang",
    topic: "alat-kerja",
    instruction: "다음 설명에 알맞은 어휘를 고르십시오.",
    stem: [["나무나 쇠를 자를 때 사용합니다. 날을 앞뒤로 움직이면서 씁니다."]],
    options: [t("톱"), t("망치"), t("드라이버"), t("가위")],
    explanation:
      "Alat untuk memotong kayu atau besi dengan mata yang digerakkan maju-mundur adalah gergaji, '톱'. '망치' adalah palu, '드라이버' obeng, dan '가위' gunting (untuk kertas atau kain).",
  },
  {
    number: 18,
    type: "R10",
    level: "sedang",
    topic: "kehidupan",
    instruction: "다음은 무엇에 대한 글입니까?",
    stem: [
      [
        "한국에서는 쓰레기를 일반 쓰레기, 음식물 쓰레기, 재활용 쓰레기로 나누어서 버려야 합니다. 일반 쓰레기는 동네 가게에서 파는 종량제 봉투에 넣어서 버립니다. 정해진 요일과 장소에 버리지 않으면 벌금을 낼 수도 있습니다.",
      ],
    ],
    options: [
      t("쓰레기를 버리는 방법"),
      t("봉투를 파는 장소"),
      t("벌금을 내는 방법"),
      t("동네를 청소하는 시간"),
    ],
    explanation:
      "Seluruh teks menjelaskan cara membuang sampah di Korea: memilah jenisnya, memakai kantong khusus, serta membuang pada hari dan tempat yang ditentukan.",
  },
  {
    number: 19,
    type: "R11",
    level: "sulit",
    topic: "lembaga",
    instruction: "다음 글의 내용과 같은 것을 고르십시오.",
    promptImage: { kind: "template", template: "notice-health" },
    options: [
      t("검진 때 외국인등록증을 가져가야 합니다."),
      t("검진 전날 밤 9시부터는 물도 마시면 안 됩니다."),
      t("검진은 이틀 동안 오후에도 받을 수 있습니다."),
      t("직원들은 검진 비용을 각자 내야 합니다."),
    ],
    explanation:
      "Pengumuman meminta karyawan membawa tanda pengenal (외국인등록증). Air putih tetap boleh diminum, pemeriksaan hanya pukul 08.00–11.00, dan biayanya ditanggung perusahaan.",
  },
  {
    number: 20,
    type: "R11",
    level: "sulit",
    topic: "lembaga",
    instruction: "다음 글의 내용과 같은 것을 고르십시오.",
    stem: [
      [
        "출국만기보험은 외국인 근로자가 일을 마치고 한국을 떠날 때 받을 돈을 준비하는 보험입니다. 보험료는 모두 회사가 매달 냅니다. 같은 회사에서 1년 이상 일한 근로자가 받을 수 있고, 보험금은 출국한 후에 받습니다.",
      ],
    ],
    options: [
      t("근로자는 보험료를 내지 않습니다."),
      t("보험료는 근로자와 회사가 함께 냅니다."),
      t("일한 지 6개월이 지나면 받을 수 있습니다."),
      t("한국을 떠나기 전에 보험금을 받습니다."),
    ],
    explanation:
      "Teks menyebut premi asuransi seluruhnya dibayar perusahaan, jadi pekerja tidak membayar. Uangnya bisa diterima setelah bekerja minimal 1 tahun dan dibayarkan setelah pekerja meninggalkan Korea.",
  },

  // ───────────── 듣기 (Mendengar) ─────────────
  {
    number: 21,
    type: "L1",
    level: "mudah",
    topic: "kehidupan",
    instruction: "들은 것을 고르십시오.",
    script: [{ speaker: "F", text: "서점" }],
    options: [t("서점"), t("소점"), t("수점"), t("시점")],
    explanation:
      "Yang dibacakan adalah '서점' (toko buku), dengan vokal 'ㅓ' pada suku kata pertama.",
  },
  {
    number: 22,
    type: "L1",
    level: "mudah",
    topic: "kehidupan",
    instruction: "들은 것을 고르십시오.",
    script: [{ speaker: "F", text: "공항" }],
    options: [t("공항"), t("공학"), t("고향"), t("콩항")],
    explanation:
      "Yang dibacakan adalah '공항' (bandara): konsonan awal 'ㄱ' tanpa aspirasi dan akhiran 'ㅇ' pada kedua suku kata.",
  },
  {
    number: 23,
    type: "L2",
    level: "mudah",
    topic: "benda",
    instruction: "들은 내용과 관계있는 그림을 고르십시오.",
    script: [{ speaker: "F", text: "냄비입니다." }],
    options: [
      pic(
        "A cooking pot with a lid and two small side handles, alone on a plain background.",
        "Panci bertutup",
      ),
      pic(
        "A shallow, flat frying pan with one long handle, alone on a plain background.",
        "Wajan",
      ),
      pic(
        "A kettle with a spout and a handle on top, alone on a plain background.",
        "Ketel",
      ),
      pic("A flat round dinner plate, alone on a plain background.", "Piring"),
    ],
    explanation:
      "'냄비' adalah panci, jadi gambar yang tepat adalah panci bertutup dengan dua pegangan.",
  },
  {
    number: 24,
    type: "L2",
    level: "mudah",
    topic: "alat-kerja",
    instruction: "들은 내용과 관계있는 그림을 고르십시오.",
    script: [{ speaker: "F", text: "사다리입니다." }],
    options: [
      pic(
        "An A-frame step ladder standing open, alone on a plain background.",
        "Tangga lipat",
      ),
      pic(
        "A two-wheeled hand cart (hand truck) standing upright, alone on a plain background.",
        "Troli dorong",
      ),
      pic(
        "A shovel with a long wooden handle, alone on a plain background.",
        "Sekop",
      ),
      pic(
        "A metal bucket with a handle, alone on a plain background.",
        "Ember",
      ),
    ],
    explanation:
      "'사다리' adalah tangga yang dipakai untuk naik ke tempat tinggi.",
  },
  {
    number: 25,
    type: "L2",
    level: "mudah",
    topic: "kehidupan",
    instruction: "들은 내용과 관계있는 그림을 고르십시오.",
    script: [{ speaker: "F", text: "남자가 자전거를 타고 있습니다." }],
    options: [
      pic(`${MAN}, riding a bicycle along a street.`, "Pria naik sepeda"),
      pic(
        `${MAN}, crouching next to a bicycle and repairing its wheel with a wrench. He is not on the bicycle.`,
        "Pria memperbaiki sepeda",
      ),
      pic(
        `${MAN}, walking on foot and pushing a bicycle by its handlebars beside him.`,
        "Pria menuntun sepeda",
      ),
      pic(
        `${MAN}, washing a parked bicycle with a sponge and a bucket of water.`,
        "Pria mencuci sepeda",
      ),
    ],
    explanation:
      "'자전거를 타다' berarti mengendarai sepeda, jadi gambarnya pria yang sedang bersepeda.",
  },
  {
    number: 26,
    type: "L2",
    level: "mudah",
    topic: "tindakan-kerja",
    instruction: "들은 내용과 관계있는 그림을 고르십시오.",
    script: [{ speaker: "F", text: "여자가 상자에 테이프를 붙이고 있습니다." }],
    options: [
      pic(
        `${WOMAN}, sealing a closed cardboard box on a table with a tape dispenser.`,
        "Wanita melakban kardus",
      ),
      pic(
        `${WOMAN}, carrying a closed cardboard box in both arms while walking.`,
        "Wanita membawa kardus",
      ),
      pic(
        `${WOMAN}, standing at a table with the flaps of an open cardboard box folded back, lifting a folded shirt out of it. No tape and no tools in sight.`,
        "Wanita mengeluarkan barang dari kardus",
      ),
      pic(
        `${WOMAN}, writing on the side of a cardboard box with a marker pen.`,
        "Wanita menulis di kardus",
      ),
    ],
    explanation:
      "'테이프를 붙이다' berarti merekatkan lakban, jadi gambarnya wanita yang sedang melakban kardus.",
  },
  {
    number: 27,
    type: "L3",
    level: "sedang",
    topic: "kehidupan",
    instruction: "대화를 듣고 알맞은 그림을 고르십시오.",
    script: [
      { speaker: "M", text: "저기요, 죄송한데 사진 좀 찍어 주시겠어요?" },
      { speaker: "F", text: "네, 그럴게요. 자, 웃으세요. 하나, 둘, 셋!" },
    ],
    options: [
      pic(
        `In a park, ${WOMAN} holds a smartphone up and takes a photo of ${MAN}, who stands alone a few steps away, smiling and posing.`,
        "Wanita memotret pria",
      ),
      pic(
        `In a park, ${MAN} holds a smartphone up and takes a photo of ${WOMAN}, who stands alone a few steps away, smiling and posing.`,
        "Pria memotret wanita",
      ),
      pic(
        `In a park, ${MAN} and ${WOMAN} sit side by side on a bench looking at photos on one smartphone together.`,
        "Keduanya melihat foto di ponsel",
      ),
      pic(
        `In a small electronics shop, ${WOMAN} stands behind a counter and hands a camera to ${MAN}, a customer.`,
        "Pria membeli kamera",
      ),
    ],
    explanation:
      "Pria minta difoto, lalu wanita memotretnya. Jadi gambarnya wanita yang sedang memotret pria.",
  },
  {
    number: 28,
    type: "L3",
    level: "sedang",
    topic: "k3",
    instruction: "대화를 듣고 알맞은 그림을 고르십시오.",
    script: [
      {
        speaker: "F",
        text: "투안 씨, 이 안전모 한번 써 보세요. 크기가 맞아요?",
      },
      { speaker: "M", text: "조금 커요. 더 작은 건 없어요?" },
    ],
    options: [
      pic(
        `In a factory storeroom, ${MAN} is putting a hard hat on his head with both hands while ${WOMAN} stands next to him watching.`,
        "Pria mencoba helm",
      ),
      pic(
        `In a factory storeroom, ${MAN} sits on a bench trying on a pair of safety boots while ${WOMAN} stands next to him watching.`,
        "Pria mencoba sepatu keselamatan",
      ),
      pic(
        `In a factory storeroom, ${MAN} is pulling on a pair of work gloves while ${WOMAN} stands next to him watching.`,
        "Pria memakai sarung tangan",
      ),
      pic(
        `In a factory storeroom, ${WOMAN} is putting a hard hat on her own head while ${MAN} stands next to her watching.`,
        "Wanita mencoba helm",
      ),
    ],
    explanation:
      "Wanita meminta pria mencoba helm (안전모), dan pria menjawab helmnya agak besar. Jadi gambarnya pria yang sedang mencoba helm.",
  },
  {
    number: 29,
    type: "L4",
    level: "sedang",
    topic: "kehidupan",
    instruction: "질문에 알맞은 대답을 고르십시오.",
    script: [{ speaker: "M", text: "오늘 점심 메뉴가 뭐예요?" }],
    optionsReadAloud: true,
    options: [
      t("오늘은 불고기예요."),
      t("열두 시 반에 먹어요."),
      t("2층 식당에서 먹어요."),
      t("동료하고 같이 가요."),
    ],
    explanation:
      "Pertanyaannya menanyakan menu makan siang ('메뉴가 뭐예요?'), jadi jawabannya nama makanan: bulgogi. Jawaban lain menyebut waktu, tempat, dan teman makan.",
  },
  {
    number: 30,
    type: "L4",
    level: "sedang",
    topic: "lembaga",
    instruction: "질문에 알맞은 대답을 고르십시오.",
    script: [{ speaker: "F", text: "외국인등록증은 어디에서 신청해요?" }],
    optionsReadAloud: true,
    options: [
      t("출입국 사무소에서 신청해요."),
      t("입국하고 90일 안에 신청해요."),
      t("여권하고 사진이 필요해요."),
      t("회사 직원이 도와줄 거예요."),
    ],
    explanation:
      "Pertanyaannya memakai '어디에서' (di mana), jadi jawabannya tempat: kantor imigrasi (출입국 사무소).",
  },
  {
    number: 31,
    type: "L4",
    level: "sedang",
    topic: "kehidupan",
    instruction: "질문에 알맞은 대답을 고르십시오.",
    script: [{ speaker: "M", text: "이번 달 월급은 언제 받아요?" }],
    optionsReadAloud: true,
    options: [
      t("다음 주 금요일에 받아요."),
      t("은행 통장으로 받아요."),
      t("이백만 원쯤 받아요."),
      t("사무실에서 받아요."),
    ],
    explanation:
      "Pertanyaannya memakai '언제' (kapan), jadi jawabannya waktu: Jumat minggu depan.",
  },
  {
    number: 32,
    type: "L4",
    level: "sedang",
    topic: "tindakan-kerja",
    instruction: "질문에 알맞은 대답을 고르십시오.",
    script: [{ speaker: "F", text: "내일도 야간 근무를 해요?" }],
    optionsReadAloud: true,
    options: [
      t("네, 내일도 밤에 일해요."),
      t("네, 내일은 쉬는 날이에요."),
      t("아니요, 내일도 야간이에요."),
      t("야간 근무는 수당이 많아요."),
    ],
    explanation:
      "Pertanyaan ya/tidak harus dijawab dengan isi yang sesuai: '네' lalu menyatakan besok juga kerja malam. Dua jawaban lain isinya bertentangan dengan '네' atau '아니요' di depannya, dan satu lagi tidak menjawab pertanyaan.",
  },
  {
    number: 33,
    type: "L5",
    level: "sedang",
    topic: "k3",
    instruction: "이어지는 말로 알맞은 것을 고르십시오.",
    script: [
      {
        speaker: "M",
        text: "이 상자는 너무 무거워서 혼자 들면 허리를 다칠 수 있어요.",
      },
    ],
    optionsReadAloud: true,
    options: [
      t("그럼 다른 사람하고 같이 들게요."),
      t("네, 상자가 아주 가볍네요."),
      t("어제 허리가 아파서 병원에 갔어요."),
      t("상자 안에 서류를 넣었어요."),
    ],
    explanation:
      "Pria memperingatkan bahwa kotaknya terlalu berat untuk diangkat sendiri, jadi tanggapan yang wajar adalah mengangkatnya bersama orang lain.",
  },
  {
    number: 34,
    type: "L6",
    level: "sedang",
    topic: "angka",
    instruction: "대화를 듣고 알맞은 그림을 고르십시오.",
    script: [
      { speaker: "M", text: "한국어 시험이 언제예요?" },
      { speaker: "F", text: "시월 이십육 일이에요. 아직 한 달쯤 남았어요." },
    ],
    options: [
      {
        image: { kind: "template", template: "calendar", month: 10, day: 26 },
        label: "10월 26일",
      },
      {
        image: { kind: "template", template: "calendar", month: 10, day: 16 },
        label: "10월 16일",
      },
      {
        image: { kind: "template", template: "calendar", month: 11, day: 26 },
        label: "11월 26일",
      },
      {
        image: { kind: "template", template: "calendar", month: 11, day: 16 },
        label: "11월 16일",
      },
    ],
    explanation:
      "'시월 이십육 일' adalah 26 Oktober. Perhatikan bahwa bulan 10 dibaca '시월', bukan '십월'.",
  },
  {
    number: 35,
    type: "L6",
    level: "sedang",
    topic: "angka",
    instruction: "대화를 듣고 알맞은 그림을 고르십시오.",
    script: [
      { speaker: "F", text: "이 모자 얼마예요?" },
      { speaker: "M", text: "만 오천 원이에요." },
    ],
    options: [
      {
        image: { kind: "template", template: "price", amount: 15000 },
        label: "15,000원",
      },
      {
        image: { kind: "template", template: "price", amount: 50000 },
        label: "50,000원",
      },
      {
        image: { kind: "template", template: "price", amount: 5000 },
        label: "5,000원",
      },
      {
        image: { kind: "template", template: "price", amount: 10500 },
        label: "10,500원",
      },
    ],
    explanation:
      "'만 오천 원' adalah 15.000 won: '만' = 10.000 dan '오천' = 5.000.",
  },
  {
    number: 36,
    type: "L6",
    level: "sedang",
    topic: "k3",
    instruction: "대화를 듣고 알맞은 그림을 고르십시오.",
    stem: [["남자가 낼 돈은 모두 얼마입니까?"]],
    script: [
      { speaker: "M", text: "보안경 하나에 얼마예요?" },
      {
        speaker: "F",
        text: "하나에 칠천 원이에요. 두 개 사시면 만 삼천 원에 드릴게요.",
      },
      { speaker: "M", text: "그럼 두 개 주세요." },
    ],
    options: [
      {
        image: { kind: "template", template: "price", amount: 13000 },
        label: "13,000원",
      },
      {
        image: { kind: "template", template: "price", amount: 7000 },
        label: "7,000원",
      },
      {
        image: { kind: "template", template: "price", amount: 14000 },
        label: "14,000원",
      },
      {
        image: { kind: "template", template: "price", amount: 30000 },
        label: "30,000원",
      },
    ],
    explanation:
      "Pria membeli dua kacamata pelindung dengan harga paket '만 삼천 원', yaitu 13.000 won, bukan 2 × 7.000 won.",
  },
  {
    number: 37,
    type: "L7",
    level: "sedang",
    topic: "benda",
    instruction: "그림을 보고 질문에 알맞은 대답을 고르십시오.",
    promptImage: ai(
      "A small, tidy office room drawn from the front. On the left, a door; a fire extinguisher stands on the floor right next to the door. In the middle, a desk; several cardboard boxes are stacked on the floor under the desk. On the right, a bookshelf; one first-aid box with a large plus sign on its side sits on top of the bookshelf, and nothing else is on top of the bookshelf. The window is on the back wall between the door and the desk, far from the bookshelf; a potted plant stands on the floor in front of the window. The bookshelf is full of books; the first-aid box sits on its top surface, not on a shelf. Each object appears once.",
    ),
    script: [{ speaker: "F", text: "구급상자는 어디에 있습니까?" }],
    optionsReadAloud: true,
    options: [
      t("책장 위에 있습니다."),
      t("문 옆에 있습니다."),
      t("책상 아래에 있습니다."),
      t("창문 앞에 있습니다."),
    ],
    explanation:
      "Kotak P3K (구급상자) ada di atas rak buku. Di samping pintu ada alat pemadam api, di bawah meja ada kardus, dan di depan jendela ada tanaman.",
  },
  {
    number: 38,
    type: "L8",
    level: "sulit",
    topic: "lembaga",
    instruction: "대화를 듣고 물음에 답하십시오.",
    stem: [["남자는 왜 전화했습니까?"]],
    script: [
      { speaker: "M", text: "여보세요, 고용센터지요?" },
      { speaker: "F", text: "네, 무엇을 도와드릴까요?" },
      {
        speaker: "M",
        text: "지금 다니는 회사가 다음 달에 문을 닫아서 다른 회사로 옮겨야 하는데요, 어떤 서류를 준비해야 하는지 궁금해서요.",
      },
      {
        speaker: "F",
        text: "사업장 변경 신청서를 쓰시고, 외국인등록증하고 여권을 가지고 오시면 됩니다.",
      },
      { speaker: "M", text: "네, 알겠습니다. 감사합니다." },
    ],
    options: [
      t("필요한 서류를 물어보려고"),
      t("신청서를 보내 달라고 하려고"),
      t("회사가 문을 닫는 이유를 물어보려고"),
      t("외국인등록증을 찾으려고"),
    ],
    explanation:
      "Perusahaan pria akan tutup bulan depan sehingga ia harus pindah, dan ia menelepon Pusat Ketenagakerjaan (고용센터) untuk menanyakan dokumen yang perlu disiapkan.",
  },
  {
    number: 39,
    type: "L8",
    level: "sulit",
    topic: "k3",
    group: "g39",
    stem: [["남자는 손목이 왜 아프다고 생각합니까?"]],
    options: [
      t("무거운 물건을 많이 들어서"),
      t("기계에 손을 다쳐서"),
      t("병원에 늦게 가서"),
      t("반장님께 말하지 않아서"),
    ],
    explanation:
      "Pria mengira pergelangan tangannya sakit karena terus memindahkan komponen yang berat. Ia tidak menyebut kecelakaan mesin, dan rumah sakit serta mandor disebut untuk hal lain.",
  },
  {
    number: 40,
    type: "L9",
    level: "sulit",
    topic: "lembaga",
    group: "g39",
    instruction: "들은 내용과 같은 것을 고르십시오.",
    options: [
      t("남자는 내일 반장님께 이야기할 것입니다."),
      t("남자는 이미 반장님께 말씀드렸습니다."),
      t("여자는 산재 보험에 대해 몰랐습니다."),
      t("남자는 오늘 평소보다 늦게 퇴근합니다."),
    ],
    explanation:
      "Pria berjanji melapor ke mandor besok pagi, jadi ia belum melapor. Yang belum tahu soal asuransi kecelakaan kerja adalah pria, dan hari ini ia pulang lebih awal.",
  },
];
