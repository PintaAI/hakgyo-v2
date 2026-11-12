import Storage from "expo-sqlite/kv-store";

import {
  pruneCorrectQuestions,
  type CorrectQuestionMemory,
} from "./today-question-pick";

// Soal harian answers are graded on the server but not stored there, so the
// questions answered right live here, on the device only. kv-store, which a
// sign-out clears.
const STORAGE_KEY = "hakgyo:today-correct-questions:v1";

export function readCorrectQuestions(): CorrectQuestionMemory {
  try {
    const raw = Storage.getItemSync(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, number] => typeof entry[1] === "number",
      ),
    );
  } catch {
    return {};
  }
}

export function rememberCorrectQuestion(
  questionId: string,
  now: number = Date.now(),
) {
  const next = {
    ...pruneCorrectQuestions(readCorrectQuestions(), now),
    [questionId]: now,
  };
  try {
    Storage.setItemSync(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Only a hint for the next round; losing it repeats a question.
  }
}
