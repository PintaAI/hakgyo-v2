// EPS-TOPIK style reading questions written for the placement test's stage 4 (learners preparing
// for EPS-TOPIK). Original to Hakgyo: never HRDK material, and never a copy or paraphrase of the
// style examples in eps-taxonomy.ts. Text only, so the test runs offline before sign-in. The
// answer is always the first choice. The Korean needs the founder's review before release.

import type { PlacementSourceQuestion } from "./types";

const MEANING = "Apa artinya?";
const FILL = "Pilih kata yang paling tepat untuk mengisi bagian kosong.";
const SIGN = "Apa arti tulisan di tanda ini?";

export const EPS_PLACEMENT_QUESTIONS: readonly PlacementSourceQuestion[] = [
  // Workplace and daily vocabulary.
  {
    id: "eps-anjeonmo",
    instruction: MEANING,
    prompt: "안전모",
    choices: ["helm pengaman", "sarung tangan", "sepatu kerja", "masker"],
  },
  {
    id: "eps-janggap",
    instruction: MEANING,
    prompt: "장갑",
    choices: ["sarung tangan", "helm pengaman", "kacamata", "celemek"],
  },
  {
    id: "eps-chulgeun",
    instruction: MEANING,
    prompt: "출근하다",
    choices: ["berangkat kerja", "pulang kerja", "lembur", "cuti"],
  },
  {
    id: "eps-toegeun",
    instruction: MEANING,
    prompt: "퇴근하다",
    choices: ["pulang kerja", "berangkat kerja", "istirahat", "pindah kerja"],
  },
  {
    id: "eps-wolgeup",
    instruction: MEANING,
    prompt: "월급",
    choices: ["gaji bulanan", "uang lembur", "pajak", "tabungan"],
  },
  {
    id: "eps-gisuksa",
    instruction: MEANING,
    prompt: "기숙사",
    choices: ["asrama", "kantor", "gudang", "kantin"],
  },
  {
    id: "eps-wiheom",
    instruction: MEANING,
    prompt: "위험",
    choices: ["bahaya", "aman", "darurat", "selesai"],
  },
  {
    id: "eps-hyuil",
    instruction: MEANING,
    prompt: "휴일",
    choices: ["hari libur", "hari kerja", "jam istirahat", "hari gajian"],
  },
  // Filling a blank.
  {
    id: "eps-oetu",
    instruction: FILL,
    prompt: "날씨가 추워요. ___ 입으세요.",
    choices: ["외투를", "반바지를", "수영복을", "선글라스를"],
  },
  {
    id: "eps-byeongwon",
    instruction: FILL,
    prompt: "머리가 아파요. ___에 가요.",
    choices: ["병원", "은행", "시장", "우체국"],
  },
  {
    id: "eps-eunhaeng",
    instruction: FILL,
    prompt: "고향에 돈을 보내고 싶어요. ___에 가요.",
    choices: ["은행", "병원", "식당", "미용실"],
  },
  {
    id: "eps-yageun",
    instruction: FILL,
    prompt: "일이 많아서 오늘은 ___ 해야 해요.",
    choices: ["야근을", "휴가를", "산책을", "쇼핑을"],
  },
  {
    id: "eps-ireonayo",
    instruction: FILL,
    prompt: "저는 매일 아침 6시에 ___.",
    choices: ["일어나요", "자요", "퇴근해요", "저녁을 먹어요"],
  },
  {
    id: "eps-mugeowo",
    instruction: FILL,
    prompt: "이 상자는 너무 ___ 혼자 들 수 없어요.",
    choices: ["무거워서", "가벼워서", "작아서", "싸서"],
  },
  {
    id: "eps-pimyeon",
    instruction: FILL,
    prompt: "작업장에서 담배를 피우___ 안 됩니다.",
    choices: ["면", "고", "서", "지만"],
  },
  {
    id: "eps-jeone",
    instruction: FILL,
    prompt: "기계를 사용하기 ___ 설명서를 읽으세요.",
    choices: ["전에", "후에", "때문에", "동안"],
  },
  {
    id: "eps-waseo",
    instruction: FILL,
    prompt: "어제는 비가 많이 ___ 밖에 나가지 않았어요.",
    choices: ["와서", "오면", "오지만", "오고"],
  },
  // Signs.
  {
    id: "eps-churip",
    instruction: SIGN,
    prompt: "출입 금지",
    choices: [
      "Dilarang masuk",
      "Pintu keluar",
      "Awas licin",
      "Wajib pakai helm",
    ],
  },
  {
    id: "eps-mikkeureom",
    instruction: SIGN,
    prompt: "미끄럼 주의",
    choices: [
      "Awas licin",
      "Dilarang merokok",
      "Awas listrik",
      "Dilarang lewat",
    ],
  },
  {
    id: "eps-geumyeon",
    instruction: SIGN,
    prompt: "금연",
    choices: [
      "Dilarang merokok",
      "Dilarang makan",
      "Dilarang parkir",
      "Dilarang memotret",
    ],
  },
  {
    id: "eps-bisanggu",
    instruction: SIGN,
    prompt: "비상구",
    choices: ["Pintu darurat", "Pintu masuk", "Toilet", "Ruang istirahat"],
  },
  // Short reading.
  {
    id: "eps-jeomgeom",
    instruction: "Apa isi pengumuman ini?",
    prompt:
      "내일은 기계 점검이 있어서 일을 하지 않습니다. 모레 아침 8시까지 출근하십시오.",
    choices: [
      "Besok libur, lusa masuk jam 8 pagi",
      "Besok masuk jam 8 pagi",
      "Besok dan lusa libur",
      "Besok lembur sampai jam 8",
    ],
  },
  {
    id: "eps-jeomsim",
    instruction: "Mana yang sesuai dengan pengumuman ini?",
    prompt: "점심시간은 12시부터 1시까지입니다. 식당은 1층에 있습니다.",
    choices: [
      "Kantin ada di lantai 1",
      "Istirahat siang 2 jam",
      "Kantin ada di lantai 2",
      "Istirahat siang mulai jam 1",
    ],
  },
  {
    id: "eps-geumyoil",
    instruction: "Kapan pekerjaan ini harus selesai?",
    prompt: "가: 이 일을 언제까지 끝내야 해요?\n나: 금요일까지 끝내 주세요.",
    choices: ["Hari Jumat", "Hari Senin", "Hari ini", "Akhir bulan"],
  },
];
