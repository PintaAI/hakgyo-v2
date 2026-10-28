import { epsTagVocabulary, type EpsSection } from "./assessment-tags";

/**
 * The 25 EPS-TOPIK question types, described once (docs/eps-question-generator.md section 2,
 * research in docs/research/eps-topik-question-patterns.md sections 2 and 5). It is the reference
 * card for writers and the AI draft service, and tells the bank which media each type needs.
 *
 * The examples are **original** items written for Hakgyo, never HRDK material (KOGL Type 3, no
 * derivatives). Until the founder has reviewed their Korean, `reviewed` stays false and they must
 * not be copied into the bank as they are.
 */

export type EpsTypeCode =
  | "R1"
  | "R2"
  | "R3"
  | "R4"
  | "R5"
  | "R6"
  | "R7"
  | "R8"
  | "R9"
  | "R10"
  | "R11"
  | "R12"
  | "R13"
  | "L1"
  | "L2"
  | "L3"
  | "L4"
  | "L5"
  | "L6"
  | "L7"
  | "L8"
  | "L9"
  | "L10"
  | "L11"
  | "L12";

/** How a type's media are made (section 6, production lanes). */
export type ProductionLane = "text" | "template" | "illustrated";

export type AudioShape =
  | "none"
  /** One word or one sentence, one voice. */
  | "single"
  /** A question, then each option read aloud (one clip per option). */
  | "prompt-and-options"
  /** Two speakers (man and woman). */
  | "dialogue"
  /** One speaker telling a short story. */
  | "monologue";

export type EpsTypeExample = {
  /** The question as shown (the type's instruction comes first on screen). */
  prompt: string;
  /** What the picture, document or chart shows, for whoever makes it. */
  mediaBrief?: string;
  /** What the audio says (listening types). */
  script?: string;
  /** Four options; with `optionsAreImages`, briefs of four pictures. */
  options: readonly [string, string, string, string];
  /** Index of the correct option. */
  key: 0 | 1 | 2 | 3;
  /** Why the key is right, in Indonesian. */
  explanation: string;
};

export type EpsTypeDefinition = {
  code: EpsTypeCode;
  tag: `eps:${EpsTypeCode}`;
  section: EpsSection;
  /** Indonesian name, the same as the tag label. */
  name: string;
  /** The type's standard instruction line. */
  instructionKo: string;
  /** What it tests, in Indonesian. */
  tests: string;
  frequency: "always" | "often" | "sometimes";
  lane: ProductionLane;
  /** What the prompt needs besides text. */
  promptMedia: "none" | "image" | "sign" | "document" | "chart";
  optionsAreImages: boolean;
  audio: AudioShape;
  /** Good distractors, in Indonesian. */
  distractors: string;
  /** Writing mistakes to avoid, in Indonesian. */
  pitfalls: string;
  /** What makes an item easy or hard, in Indonesian. */
  difficulty: string;
  examples: readonly EpsTypeExample[];
  /** The founder has checked the Korean of the examples. */
  reviewed: boolean;
};

const nameOf = (code: EpsTypeCode) => {
  const entry = epsTagVocabulary.find((tag) => tag.tag === `eps:${code}`);
  if (!entry) throw new Error(`Unknown EPS type ${code}`);
  return entry.label.slice(`${code} · `.length);
};

type Definition = Omit<
  EpsTypeDefinition,
  "tag" | "section" | "name" | "reviewed"
>;

const define = (definition: Definition): EpsTypeDefinition => ({
  ...definition,
  tag: `eps:${definition.code}`,
  section: definition.code.startsWith("R") ? "reading" : "listening",
  name: nameOf(definition.code),
  reviewed: false,
});

export const epsTaxonomy: readonly EpsTypeDefinition[] = [
  define({
    code: "R1",
    instructionKo: "다음 그림을 보고 맞는 단어나 문장을 고르십시오.",
    tests: "Kosakata benda, alat atau mesin, dan aksi (-고 있습니다).",
    frequency: "always",
    lane: "illustrated",
    promptMedia: "image",
    optionsAreImages: false,
    audio: "none",
    distractors:
      "Benda satu kategori (gunting, pisau, tang, gergaji); aksi dengan benda yang tidak ada di gambar.",
    pitfalls: "Gambar ambigu, atau dua opsi sama-sama benar.",
    difficulty:
      "Mudah: benda sehari-hari. Lebih sulit: alat kerja yang mirip, atau aksi.",
    examples: [
      {
        prompt: "다음 그림을 보고 맞는 단어를 고르십시오.",
        mediaBrief: "Gunting di atas meja kerja, latar putih.",
        options: ["가위입니다.", "칼입니다.", "망치입니다.", "드라이버입니다."],
        key: 0,
        explanation: "Gambar menunjukkan gunting (가위).",
      },
    ],
  }),
  define({
    code: "R2",
    instructionKo: "다음 그림이 나타내는 의미로 알맞은 것을 고르십시오.",
    tests: "Makna rambu K3 (peringatan, larangan, instruksi, informasi).",
    frequency: "always",
    lane: "illustrated",
    promptMedia: "sign",
    optionsAreImages: false,
    audio: "none",
    distractors: "Kalimat bahaya lain yang umum: listrik, licin, jatuh, panas.",
    pitfalls:
      "Rambu yang tidak mengikuti kategori 산업안전보건 Korea (peringatan segitiga kuning, larangan lingkaran merah, instruksi biru, informasi hijau).",
    difficulty:
      "Mudah: larangan merokok atau api. Lebih sulit: instruksi alat pelindung tertentu.",
    examples: [
      {
        prompt: "다음 그림이 나타내는 의미로 알맞은 것을 고르십시오.",
        mediaBrief: "Rambu larangan: lingkaran merah, api dicoret.",
        options: [
          "불이 나면 이 문으로 나가세요.",
          "여기에서 불을 붙이면 안 됩니다.",
          "뜨거우니까 만지지 마세요.",
          "소화기가 여기에 있습니다.",
        ],
        key: 1,
        explanation:
          "Rambu lingkaran merah dengan api dicoret berarti dilarang menyalakan api.",
      },
    ],
  }),
  define({
    code: "R3",
    instructionKo: "다음 그림을 보고 빈칸에 들어갈 글자를 고르십시오.",
    tests: "Ejaan kata dari gambar.",
    frequency: "sometimes",
    lane: "illustrated",
    promptMedia: "image",
    optionsAreImages: false,
    audio: "none",
    distractors: "Suku kata yang bunyinya dekat.",
    pitfalls: "Kata di luar buku ajar.",
    difficulty:
      "Mudah; lebih sulit bila suku katanya punya konsonan akhir yang mirip.",
    examples: [
      {
        prompt: "다음 그림을 보고 빈칸에 들어갈 글자를 고르십시오. 우( )",
        mediaBrief:
          "Payung terbuka, dengan dua kotak suku kata: 우 dan kotak kosong.",
        options: ["산", "상", "선", "삼"],
        key: 0,
        explanation: "Payung adalah 우산.",
      },
    ],
  }),
  define({
    code: "R4",
    instructionKo: "밑줄 친 부분이 맞는 것을 고르십시오.",
    tests:
      "Partikel (을/를, 이/가, 에/에서, 에게/한테서) dan konjugasi tak beraturan (ㄷ/ㄹ/ㅂ).",
    frequency: "always",
    lane: "text",
    promptMedia: "none",
    optionsAreImages: false,
    audio: "none",
    distractors:
      "Kesalahan khas: 을/가 tertukar, 에/에서, 한테/한테서; ㄷ/ㄹ tak beraturan yang diregulerkan (듣어요, 달으세요).",
    pitfalls: "Lebih dari satu kalimat benar secara tata bahasa.",
    difficulty: "Mudah: partikel tempat. Lebih sulit: konjugasi tak beraturan.",
    examples: [
      {
        prompt: "밑줄 친 부분이 맞는 것을 고르십시오.",
        options: [
          "저는 회사에 일해요.",
          "저는 회사에서 일해요.",
          "저는 회사을 일해요.",
          "저는 회사가 일해요.",
        ],
        key: 1,
        explanation: "Tempat melakukan kegiatan memakai 에서: 회사에서 일해요.",
      },
    ],
  }),
  define({
    code: "R5",
    instructionKo: "다음을 보고 물음에 답하십시오.",
    tests: "Mencari informasi pada kartu nama, papan, jam buka atau jadwal.",
    frequency: "always",
    lane: "template",
    promptMedia: "document",
    optionsAreImages: false,
    audio: "none",
    distractors:
      "Informasi lain yang ada di dokumen yang sama: nama, alamat, telepon, jam.",
    pitfalls: "Dokumen yang meniru merek atau orang nyata.",
    difficulty:
      "Mudah: satu informasi tertulis jelas. Lebih sulit: harus membandingkan dua baris.",
    examples: [
      {
        prompt: "진료 시간은 언제입니까?",
        mediaBrief:
          "Kartu nama fiktif: 한빛병원 내과, 의사 박민수, 전화 031-555-0123, 진료 시간 09:00~18:00.",
        options: [
          "오전 9시부터 오후 6시까지",
          "오전 8시부터 오후 5시까지",
          "오전 10시부터 오후 7시까지",
          "오후 1시부터 오후 6시까지",
        ],
        key: 0,
        explanation: "Di kartu tertulis 진료 시간 09:00~18:00.",
      },
    ],
  }),
  define({
    code: "R6",
    instructionKo: "다음 단어와 관계있는 것을 고르십시오.",
    tests: "Relasi kata: kata ke kata terkait, atau kata ke definisi.",
    frequency: "often",
    lane: "text",
    promptMedia: "none",
    optionsAreImages: false,
    audio: "none",
    distractors:
      "Kata dari ranah yang sama; definisi dengan kata kerja tempat yang berbeda.",
    pitfalls: "Definisi yang membocorkan kata kunci.",
    difficulty: "Mudah: kategori umum. Lebih sulit: definisi.",
    examples: [
      {
        prompt: "다음 단어와 관계있는 것을 고르십시오. 작업복",
        options: ["옷", "음식", "날씨", "교통"],
        key: 0,
        explanation: "작업복 adalah pakaian kerja, jadi berhubungan dengan 옷.",
      },
    ],
  }),
  define({
    code: "R7",
    instructionKo: "다음 그래프의 내용과 같은 것을 고르십시오.",
    tests: "Membaca persentase dan peringkat pada grafik.",
    frequency: "often",
    lane: "template",
    promptMedia: "chart",
    optionsAreImages: false,
    audio: "none",
    distractors:
      "Urutan peringkat yang salah; batas 미만/이상; perbandingan dua kategori.",
    pitfalls: "Angka yang bisa ditebak dari judul saja.",
    difficulty:
      "Sedang; lebih sulit dengan 5–6 kategori yang angkanya berdekatan.",
    examples: [
      {
        prompt: "다음 그래프의 내용과 같은 것을 고르십시오.",
        mediaBrief:
          'Diagram lingkaran fiktif "한국에 온 이유": 돈을 벌려고 45%, 기술을 배우려고 25%, 한국 문화가 좋아서 20%, 기타 10%.',
        options: [
          "돈을 벌려고 온 사람이 가장 많습니다.",
          "기술을 배우려고 온 사람이 가장 많습니다.",
          "한국 문화가 좋아서 온 사람이 가장 적습니다.",
          "기타는 이십 퍼센트입니다.",
        ],
        key: 0,
        explanation: "Angka terbesar adalah 돈을 벌려고 (45%).",
      },
    ],
  }),
  define({
    code: "R8",
    instructionKo: "빈칸에 들어갈 가장 알맞은 것을 고르십시오.",
    tests:
      "Kosakata konteks, konektor, bentuk kalimat dan ekspresi akhir kalimat.",
    frequency: "always",
    lane: "text",
    promptMedia: "none",
    optionsAreImages: false,
    audio: "none",
    distractors:
      "Kata yang sama dengan akhiran berbeda (틀면/틀고/틀려면/틀려고); kata satu akar (운행/운전/운동/운반).",
    pitfalls: "Konteks yang membuat dua opsi bisa diterima.",
    difficulty:
      "Mudah: kosakata formulir. Sedang: konektor. Sulit: ekspresi akhir kalimat dalam teks K3.",
    examples: [
      {
        prompt: "기계를 청소할 때는 먼저 전원을 (     ) 장갑을 끼십시오.",
        options: ["끄고", "끄면", "끄려고", "끄느라고"],
        key: 0,
        explanation:
          "Dua tindakan berurutan memakai -고: matikan listrik, lalu pakai sarung tangan.",
      },
    ],
  }),
  define({
    code: "R9",
    instructionKo: "다음 설명에 알맞은 어휘를 고르십시오.",
    tests: "Nama alat atau konsep dari deskripsi fungsinya.",
    frequency: "often",
    lane: "text",
    promptMedia: "none",
    optionsAreImages: false,
    audio: "none",
    distractors:
      "Alat dari ranah yang sama (alat pelindung dengan alat pelindung).",
    pitfalls: "Deskripsi yang memuat kata jawabannya.",
    difficulty: "Sedang; lebih sulit bila fungsinya mirip.",
    examples: [
      {
        prompt: "일할 때 머리를 보호하려고 씁니다.",
        options: ["안전모", "장갑", "안전화", "마스크"],
        key: 0,
        explanation:
          "Yang dipakai untuk melindungi kepala adalah 안전모 (helm).",
      },
    ],
  }),
  define({
    code: "R10",
    instructionKo: "다음은 무엇에 대한 글입니까?",
    tests: "Gagasan utama paragraf pendek (budaya atau kehidupan di Korea).",
    frequency: "often",
    lane: "text",
    promptMedia: "none",
    optionsAreImages: false,
    audio: "none",
    distractors:
      "Kata yang ada di teks tetapi terlalu sempit atau terlalu luas.",
    pitfalls: "Judul yang terlalu jelas dari kalimat pertama.",
    difficulty: "Sedang.",
    examples: [
      {
        prompt:
          "한국 사람들은 설날에 가족과 함께 떡국을 먹습니다. 떡국을 먹으면 한 살을 더 먹는다고 생각합니다.",
        options: ["설날 음식", "생일 선물", "한국 날씨", "가족 여행"],
        key: 0,
        explanation: "Teks membahas 떡국, makanan saat 설날.",
      },
    ],
  }),
  define({
    code: "R11",
    instructionKo: "다음 글의 내용과 같은 것을 고르십시오.",
    tests:
      "Pemahaman detail pengumuman atau teks penjelasan, termasuk kewajiban dan larangan.",
    frequency: "always",
    lane: "text",
    promptMedia: "none",
    optionsAreImages: false,
    audio: "none",
    distractors:
      "Parafrasa yang membalik satu detail: semua/sebagian, wajib/boleh, sebelum/sesudah, pekerja/pemberi kerja.",
    pitfalls:
      "Pengecoh yang menyalin kalimat teks persis; kunci yang bisa dijawab tanpa membaca.",
    difficulty: "Sulit: teks hukum, asuransi atau hak pekerja.",
    examples: [
      {
        prompt:
          "신입 직원은 첫 출근 날 오전 9시에 2층 교육실에서 안전 교육을 받아야 합니다.",
        options: [
          "신입 직원은 안전 교육을 받아야 합니다.",
          "안전 교육은 오후에 합니다.",
          "모든 직원이 매일 교육을 받습니다.",
          "교육은 1층에서 합니다.",
        ],
        key: 0,
        explanation:
          "Teks mewajibkan karyawan baru mengikuti pelatihan keselamatan.",
      },
    ],
  }),
  define({
    code: "R12",
    instructionKo: "다음 글을 읽고 물음에 답하십시오.",
    tests:
      "Informasi spesifik dari paragraf (kapan, mengapa); kadang satu teks untuk dua soal.",
    frequency: "sometimes",
    lane: "text",
    promptMedia: "none",
    optionsAreImages: false,
    audio: "none",
    distractors: "Informasi lain dari teks yang menjawab pertanyaan lain.",
    pitfalls: "Jawaban yang tertulis persis sama dengan pertanyaan.",
    difficulty: "Sedang.",
    examples: [
      {
        prompt:
          "저는 공장에서 일합니다. 일이 끝나면 한국어 학원에 갑니다. 한국어를 잘하고 싶어서 매일 공부합니다. 이 사람은 왜 한국어를 공부합니까?",
        options: [
          "한국어를 잘하고 싶어서",
          "학원이 가까워서",
          "일이 일찍 끝나서",
          "친구가 공부해서",
        ],
        key: 0,
        explanation: "Alasannya tertulis: 한국어를 잘하고 싶어서.",
      },
    ],
  }),
  define({
    code: "R13",
    instructionKo: "다음 문장에 알맞은 그림을 고르십시오.",
    tests: "Mencocokkan kalimat K3 dengan gambar atau rambu.",
    frequency: "sometimes",
    lane: "illustrated",
    promptMedia: "none",
    optionsAreImages: true,
    audio: "none",
    distractors:
      "Gambar dengan objek sama tetapi aksi berbeda, atau rambu kategori lain.",
    pitfalls: "Gambar terlalu kecil di layar ponsel.",
    difficulty: "Mudah sampai sedang.",
    examples: [
      {
        prompt: "표면이 뜨거우니까 조심하십시오.",
        options: [
          "Rambu peringatan permukaan panas (segitiga kuning)",
          "Rambu larangan merokok",
          "Rambu wajib memakai sarung tangan",
          "Rambu jalur evakuasi",
        ],
        key: 0,
        explanation: "Kalimat memperingatkan permukaan yang panas.",
      },
    ],
  }),
  define({
    code: "L1",
    instructionKo: "들은 것을 고르십시오.",
    tests: "Membedakan bunyi: vokal ㅓ/ㅗ/ㅣ, konsonan akhir ㅇ/ㄴ, aspirasi.",
    frequency: "always",
    lane: "template",
    promptMedia: "none",
    optionsAreImages: false,
    audio: "single",
    distractors:
      "Pasangan minimal nyata: ㅓ/ㅗ, ㅡ/ㅜ, ㅐ/ㅔ, ㄴ/ㅇ akhir, polos/aspirasi/tegang.",
    pitfalls: "Kata di luar buku, atau pembacaan yang dilebih-lebihkan.",
    difficulty: "Mudah.",
    examples: [
      {
        prompt: "들은 것을 고르십시오.",
        script: "가방",
        options: ["가방", "가반", "가봉", "거방"],
        key: 0,
        explanation: "Yang dibacakan adalah 가방 (tas).",
      },
    ],
  }),
  define({
    code: "L2",
    instructionKo: "들은 내용과 관계있는 그림을 고르십시오.",
    tests: "Kalimat ke gambar: benda, alat, aktivitas, tindakan kerja.",
    frequency: "always",
    lane: "illustrated",
    promptMedia: "none",
    optionsAreImages: true,
    audio: "single",
    distractors:
      "Gambar dari satu seri dengan satu atribut berbeda (orang sama, aksi berbeda).",
    pitfalls: "Gaya gambar yang campur aduk.",
    difficulty: "Mudah.",
    examples: [
      {
        prompt: "들은 내용과 관계있는 그림을 고르십시오.",
        script: "망치입니다.",
        options: [
          "Gambar palu",
          "Gambar gergaji",
          "Gambar obeng",
          "Gambar kunci pas",
        ],
        key: 0,
        explanation: "망치 adalah palu.",
      },
    ],
  }),
  define({
    code: "L3",
    instructionKo: "대화를 듣고 알맞은 그림을 고르십시오.",
    tests: "Situasi dari dialog pendek dua giliran.",
    frequency: "always",
    lane: "illustrated",
    promptMedia: "none",
    optionsAreImages: true,
    audio: "dialogue",
    distractors:
      "Adegan yang memakai benda atau tempat yang disebut, tetapi situasinya salah.",
    pitfalls: "Dialog yang bisa dijawab dari satu kata saja.",
    difficulty: "Sedang.",
    examples: [
      {
        prompt: "대화를 듣고 알맞은 그림을 고르십시오.",
        script: "남: 이 상자를 어디에 놓을까요?\n여: 저기 선반 위에 놓으세요.",
        options: [
          "Pria meletakkan kotak di atas rak",
          "Pria membuka kotak",
          "Wanita membawa kotak ke mobil",
          "Wanita membersihkan rak",
        ],
        key: 0,
        explanation: "Wanita menyuruh pria meletakkan kotak di atas rak.",
      },
    ],
  }),
  define({
    code: "L4",
    instructionKo: "질문에 알맞은 대답을 고르십시오.",
    tests: "Menangkap jenis pertanyaan (apa, di mana, kapan, ya atau tidak).",
    frequency: "always",
    lane: "text",
    promptMedia: "none",
    optionsAreImages: false,
    audio: "prompt-and-options",
    distractors:
      "Respons yang mengulang kata kunci pertanyaan tetapi menjawab jenis pertanyaan lain.",
    pitfalls: "Opsi yang tetap benar bila konteks diabaikan.",
    difficulty: "Sedang.",
    examples: [
      {
        prompt: "질문에 알맞은 대답을 고르십시오.",
        script: "여: 내일 안전 교육은 몇 시에 시작해요?",
        options: [
          "회의실에서 해요.",
          "오전 아홉 시에 해요.",
          "반장님이 가르쳐요.",
          "네, 꼭 받아야 돼요.",
        ],
        key: 1,
        explanation: 'Pertanyaannya "jam berapa" (몇 시), jadi jawabannya jam.',
      },
    ],
  }),
  define({
    code: "L5",
    instructionKo: "이어지는 말로 알맞은 것을 고르십시오.",
    tests: "Respons yang wajar terhadap sebuah informasi.",
    frequency: "often",
    lane: "text",
    promptMedia: "none",
    optionsAreImages: false,
    audio: "prompt-and-options",
    distractors:
      '"네/그럼요" diikuti isi yang bertentangan; respons yang memakai kata yang sama tanpa nyambung.',
    pitfalls: "Lebih dari satu respons yang wajar.",
    difficulty: "Sedang.",
    examples: [
      {
        prompt: "이어지는 말로 알맞은 것을 고르십시오.",
        script: "여: 오늘 작업장 바닥이 미끄러워요.",
        options: [
          "그럼 조심해서 걸어야겠어요.",
          "네, 바닥이 깨끗해요.",
          "오늘은 날씨가 좋아요.",
          "작업장이 아주 넓네요.",
        ],
        key: 0,
        explanation:
          "Lantai licin, jadi tanggapan yang wajar adalah berjalan hati-hati.",
      },
    ],
  }),
  define({
    code: "L6",
    instructionKo: "대화를 듣고 알맞은 그림을 고르십시오.",
    tests: "Angka: tanggal, harga, jumlah.",
    frequency: "always",
    lane: "template",
    promptMedia: "none",
    optionsAreImages: true,
    audio: "dialogue",
    distractors:
      "Matriks 2×2 angka dengan dua digit berubah; tanggal yang dibaca mirip (이/일, 십/십일).",
    pitfalls: "Angka di luar kebiasaan Korea (harga tidak bulat).",
    difficulty: "Sedang.",
    examples: [
      {
        prompt: "대화를 듣고 알맞은 그림을 고르십시오.",
        script: "남: 이 안전화는 얼마예요?\n여: 사만 이천 원이에요.",
        options: [
          "Label harga 32.000원",
          "Label harga 42.000원",
          "Label harga 34.000원",
          "Label harga 44.000원",
        ],
        key: 1,
        explanation: "사만 이천 원 = 42.000 won.",
      },
    ],
  }),
  define({
    code: "L7",
    instructionKo: "그림을 보고 질문에 알맞은 대답을 고르십시오.",
    tests: "Posisi benda (위, 아래, 옆, 안) atau aksi dalam gambar.",
    frequency: "often",
    lane: "illustrated",
    promptMedia: "image",
    optionsAreImages: false,
    audio: "prompt-and-options",
    distractors: "Kata posisi yang benar untuk benda lain di gambar yang sama.",
    pitfalls: "Gambar yang membuat dua jawaban benar.",
    difficulty: "Sedang.",
    examples: [
      {
        prompt: "그림을 보고 질문에 알맞은 대답을 고르십시오.",
        mediaBrief:
          "Ruang ganti: helm di atas lemari, sarung tangan di dalam laci, sepatu kerja di bawah meja.",
        script: "여: 안전모는 어디에 있습니까?",
        options: [
          "사물함 위에 있습니다.",
          "서랍 안에 있습니다.",
          "책상 아래에 있습니다.",
          "의자 옆에 있습니다.",
        ],
        key: 0,
        explanation: "Helm ada di atas lemari (사물함 위).",
      },
    ],
  }),
  define({
    code: "L8",
    instructionKo: "대화를 듣고 물음에 답하십시오.",
    tests:
      "Menyimpulkan tujuan (-(으)려고) atau alasan (-아서/어서) dari dialog panjang.",
    frequency: "always",
    lane: "text",
    promptMedia: "none",
    optionsAreImages: false,
    audio: "dialogue",
    distractors:
      "Alasan atau tujuan yang disebut di dialog sebagai latar, bukan jawabannya.",
    pitfalls: "Jawaban yang muncul persis di kalimat terakhir.",
    difficulty: "Sulit.",
    examples: [
      {
        prompt: "여자는 왜 여기에 왔습니까?",
        script:
          "남: 어떻게 오셨어요?\n여: 외국인 등록증을 새로 받으려고 왔어요. 지난주에 잃어버렸어요.\n남: 그럼 이 서류를 먼저 써 주세요.",
        options: [
          "외국인 등록증을 받으려고",
          "서류를 내려고",
          "지갑을 찾으려고",
          "일을 배우려고",
        ],
        key: 0,
        explanation:
          "Wanita datang untuk mendapatkan kartu registrasi orang asing yang baru.",
      },
    ],
  }),
  define({
    code: "L9",
    instructionKo: "들은 내용과 같은 것을 고르십시오.",
    tests: "Pemahaman menyeluruh dialog panjang.",
    frequency: "always",
    lane: "text",
    promptMedia: "none",
    optionsAreImages: false,
    audio: "dialogue",
    distractors: "Pernyataan yang membalik satu detail dialog.",
    pitfalls: "Opsi yang benar tanpa mendengar dialog.",
    difficulty: "Sulit.",
    examples: [
      {
        prompt: "들은 내용과 같은 것을 고르십시오.",
        script:
          "여: 새 공장 일은 어때요?\n남: 처음에는 힘들었는데 지금은 괜찮아요.\n여: 동료들은 친절해요?\n남: 네, 반장님이 일을 잘 가르쳐 주세요.",
        options: [
          "남자는 지금 일이 괜찮습니다.",
          "남자는 지금도 일이 힘듭니다.",
          "남자는 반장님을 모릅니다.",
          "동료들이 불친절합니다.",
        ],
        key: 0,
        explanation:
          "Pria berkata awalnya berat, sekarang sudah tidak apa-apa.",
      },
    ],
  }),
  define({
    code: "L10",
    instructionKo: "무엇에 대해 이야기하고 있습니까?",
    tests: "Topik percakapan.",
    frequency: "sometimes",
    lane: "text",
    promptMedia: "none",
    optionsAreImages: false,
    audio: "dialogue",
    distractors: "Kata yang disebut di dialog tetapi bukan topiknya.",
    pitfalls: "Topik yang disebut langsung di kalimat pertama.",
    difficulty: "Sedang.",
    examples: [
      {
        prompt: "무엇에 대해 이야기하고 있습니까?",
        script:
          "남: 주말에 뭐 했어요?\n여: 친구하고 한강에서 자전거를 탔어요. 날씨가 좋아서 재미있었어요.",
        options: ["주말 활동", "날씨 예보", "친구 소개", "교통 규칙"],
        key: 0,
        explanation: "Mereka membicarakan kegiatan akhir pekan.",
      },
    ],
  }),
  define({
    code: "L11",
    instructionKo: "대화를 듣고 이어서 할 행동을 고르십시오.",
    tests: "Menyimpulkan tindakan berikutnya.",
    frequency: "sometimes",
    lane: "text",
    promptMedia: "none",
    optionsAreImages: false,
    audio: "dialogue",
    distractors:
      "Tindakan yang disebut tetapi sudah dilakukan, atau akan dilakukan orang lain.",
    pitfalls: "Tindakan yang tidak bisa disimpulkan dari dialog.",
    difficulty: "Sedang.",
    examples: [
      {
        prompt: "남자는 이어서 무엇을 하겠습니까?",
        script:
          "여: 기계 소리가 이상해요.\n남: 그래요? 그럼 먼저 기계를 끄고 반장님께 말할게요.",
        options: [
          "기계를 끕니다.",
          "기계를 고칩니다.",
          "집에 갑니다.",
          "소리를 녹음합니다.",
        ],
        key: 0,
        explanation: "Pria akan mematikan mesin terlebih dahulu.",
      },
    ],
  }),
  define({
    code: "L12",
    instructionKo: "이야기를 듣고 물음에 답하십시오.",
    tests: "Detail dari cerita satu penutur.",
    frequency: "sometimes",
    lane: "text",
    promptMedia: "none",
    optionsAreImages: false,
    audio: "monologue",
    distractors: "Detail lain dari cerita yang menjawab pertanyaan lain.",
    pitfalls: "Cerita terlalu panjang untuk diingat setelah dua kali dengar.",
    difficulty: "Sedang.",
    examples: [
      {
        prompt: "이 사람은 어떻게 공장에 갑니까?",
        script:
          "저는 매일 아침 일곱 시에 일어납니다. 회사 버스를 타고 공장에 갑니다. 점심은 회사 식당에서 동료들과 먹습니다.",
        options: [
          "회사 버스를 탑니다.",
          "걸어서 갑니다.",
          "지하철을 탑니다.",
          "자전거를 탑니다.",
        ],
        key: 0,
        explanation: "Ia naik bus perusahaan ke pabrik.",
      },
    ],
  }),
];

const byCode = new Map(epsTaxonomy.map((type) => [type.code, type]));

export function epsTypeByTag(tag: string) {
  return tag.startsWith("eps:")
    ? byCode.get(tag.slice("eps:".length) as EpsTypeCode)
    : undefined;
}

const laneLabels: Record<ProductionLane, string> = {
  text: "teks saja",
  template: "media dari templat",
  illustrated: "ilustrasi",
};

const audioLabels: Record<AudioShape, string> = {
  none: "tanpa audio",
  single: "satu kata atau kalimat, satu suara",
  "prompt-and-options": "pertanyaan lalu setiap opsi dibacakan",
  dialogue: "dialog dua penutur (laki-laki dan perempuan)",
  monologue: "cerita satu penutur",
};

/**
 * The reference card of a type as plain text, for writers and the AI draft prompt. Examples are
 * marked as style references only: new items must be original and not paraphrase them.
 */
export function epsReferenceCard(type: EpsTypeDefinition) {
  const lines = [
    `${type.code} · ${type.name} (${type.section === "reading" ? "membaca" : "mendengar"})`,
    `Instruksi: ${type.instructionKo}`,
    `Menguji: ${type.tests}`,
    `Media: ${laneLabels[type.lane]}; soal ${type.promptMedia === "none" ? "teks" : type.promptMedia}; opsi ${type.optionsAreImages ? "gambar" : "teks"}; audio ${audioLabels[type.audio]}.`,
    `Pengecoh yang baik: ${type.distractors}`,
    `Hindari: ${type.pitfalls}`,
    `Tingkat: ${type.difficulty}`,
    "Contoh gaya (jangan disalin atau diparafrasa):",
  ];
  for (const example of type.examples) {
    lines.push(`- Soal: ${example.prompt}`);
    if (example.mediaBrief) lines.push(`  Media: ${example.mediaBrief}`);
    if (example.script)
      lines.push(`  Audio: ${example.script.replaceAll("\n", " / ")}`);
    example.options.forEach((option, index) => {
      lines.push(
        `  ${"①②③④"[index]} ${option}${index === example.key ? " (kunci)" : ""}`,
      );
    });
    lines.push(`  Penjelasan: ${example.explanation}`);
  }
  return lines.join("\n");
}
