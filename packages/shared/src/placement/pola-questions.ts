// Copied from the Pola Bahasa quizzes (apps/web/scripts/pola-bahasa/content), the
// placement test's stage 4 for learners not preparing for EPS-TOPIK. A copy, so
// shared code never imports the web scripts; the answer is always the first choice.

import type { PlacementSourceQuestion } from "./types";

export const POLA_PLACEMENT_QUESTIONS: readonly PlacementSourceQuestion[] = [
  {
    id: "pola-ki-01-0",
    prompt:
      "Kimbap ini satu ya. Terus airnya juga satu. → 이 김밥 주세요. ___ 물도 하나 주세요.",
    choices: ["그리고", "그래서", "그래도", "아니면"],
  },
  {
    id: "pola-ki-01-1",
    prompt:
      "Aku ketinggalan bus. Makanya telat. → 버스를 놓쳤어요. ___ 늦었어요.",
    choices: ["그래서", "그래도", "아니면", "그럼"],
  },
  {
    id: "pola-ki-01-5",
    prompt:
      "A: 오늘 너무 바빠요. B: ___ 내일 만나요. (Kalau gitu besok aja ketemu.)",
    choices: ["그럼", "그래서", "하지만", "그래도"],
  },
  {
    id: "pola-ki-01-10",
    prompt:
      "Udah kenyang. Tapi dessert tetap aku makan. → 배가 불러요. ___ 디저트는 먹을 거예요.",
    choices: ["그래도", "그래서", "그리고", "그럼"],
  },
  {
    id: "pola-ki-01-11",
    prompt: "Mau bibimbap? Atau kimbap? → 비빔밥 드실래요? ___ 김밥 드실래요?",
    choices: ["아니면", "그리고", "그래도", "그럼"],
  },
  {
    id: "pola-ki-02-13",
    prompt: "Kamu telat masuk kerja. Mana kalimat minta maaf yang bener?",
    choices: [
      "늦어서 죄송합니다.",
      "늦었어서 죄송합니다.",
      "늦었으니까 죄송합니다.",
      "늦지만 죄송합니다.",
    ],
  },
  {
    id: "pola-ki-02-15",
    prompt: "Pertama kali ketemu orang baru. Mana salam yang bener?",
    choices: ["만나서 반가워요.", "만나니까 반가워요.", "만나고 반가워요."],
  },
  {
    id: "pola-ki-02-21",
    prompt:
      "“Aku belajar bahasa Korea biar bisa kerja di Korea.” Mana yang bener?",
    choices: [
      "한국에서 일하려고 한국어를 배워요.",
      "한국에서 일하러 한국어를 배워요.",
      "한국에서 일하면서 한국어를 배워요.",
    ],
  },
  {
    id: "pola-ki-02-23",
    prompt: "Kasir nanya “Mau kopi atau teh hijau?” → 커피___ 녹차 드릴까요?",
    choices: ["나", "거나", "고", "지만"],
  },
  {
    id: "pola-ki-03-25",
    prompt: "Apoteker bilang “Obatnya diminum abis makan ya.” Mana yang benar?",
    choices: [
      "밥을 먹은 후에 약을 드세요.",
      "밥을 먹었은 후에 약을 드세요.",
      "밥을 먹는 후에 약을 드세요.",
      "밥을 먹기 후에 약을 드세요.",
    ],
  },
  {
    id: "pola-ki-04-38",
    prompt:
      "사장님 mau nanya: “Besok bisa dateng lebih pagi?” Pilih yang bener.",
    choices: [
      "내일 일찍 올 수 있어요?",
      "내일 일찍 올 줄 알아요?",
      "내일 일찍 오고 싶어 해요?",
    ],
  },
  {
    id: "pola-ki-04-39",
    prompt: "“Aku nggak bisa nyetir.” Mana yang benar?",
    choices: ["운전 못 해요.", "못 운전해요.", "운전하면 안 돼요."],
  },
  {
    id: "pola-ki-04-41",
    prompt: "“Pas kerja wajib pakai sepatu safety.” Pilih yang bener.",
    choices: [
      "일할 때는 안전화를 신어야 해요.",
      "일할 때는 안전화를 신어도 돼요.",
      "일할 때는 안전화를 신으면 안 돼요.",
    ],
  },
  {
    id: "pola-ki-04-42",
    prompt: "“Hari ini nggak harus lembur.” Mana yang natural?",
    choices: [
      "오늘은 야근 안 해도 돼요.",
      "오늘은 야근 안 해야 돼요.",
      "오늘은 야근하면 안 돼요.",
    ],
  },
  {
    id: "pola-ki-04-44",
    prompt: "Tanda di pabrik: “Di sini nggak boleh foto.” Pilih yang bener.",
    choices: [
      "여기서 사진을 찍으면 안 돼요.",
      "여기서 사진을 안 찍어도 돼요.",
      "여기서 사진을 찍어야 돼요.",
    ],
  },
  {
    id: "pola-ki-05-49",
    prompt:
      "반장님 pulang duluan, kamu masih di pabrik. Kamu bilang apa ke dia?",
    choices: ["안녕히 가세요.", "안녕히 계세요.", "안녕히 주무세요."],
  },
  {
    id: "pola-ki-05-53",
    prompt:
      "Ajak temen kerja: “Abis kerja, makan ayam goreng bareng yuk?” (ayam goreng = 치킨)",
    choices: [
      "퇴근하고 같이 치킨 먹을까요?",
      "퇴근하고 같이 치킨 먹을게요?",
      "퇴근하고 같이 치킨 먹어 주세요.",
      "퇴근하고 같이 치킨 먹지 마세요.",
    ],
  },
  {
    id: "pola-ki-06-66",
    prompt: "반장님 nyuruh kamu beresin gudang. Jawaban yang benar?",
    choices: ["네, 할게요!", "네, 할걸요.", "네, 하네요.", "네, 하잖아요."],
  },
  {
    id: "pola-ki-06-68",
    prompt:
      "반장님 selesai ngasih instruksi kerja. Kamu mau bilang “siap, saya ngerti”. Yang pas?",
    choices: ["네, 알겠습니다.", "네, 알아요.", "네, 알걸요.", "네, 아네요."],
  },
  {
    id: "pola-ki-07-72",
    prompt: "“Aku belum pernah lihat salju.” Yang benar?",
    choices: [
      "저는 눈을 본 적이 없어요.",
      "저는 눈을 보고 있지 않아요.",
      "저는 눈을 볼 뻔했어요.",
      "저는 눈을 본 척했어요.",
    ],
  },
];
