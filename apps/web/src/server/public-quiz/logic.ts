/** Pure rules of public quizzes, kept free of database access for testing. */

export const PUBLIC_QUIZ_ANONYMOUS_NAME = "Anonim";
export const PUBLIC_QUIZ_SLUG_LENGTH = 6;
/** Network latency allowance on top of the assessment time limit. */
export const PUBLIC_QUIZ_SUBMIT_GRACE_MS = 60_000;

// No 0/o/1/l so codes survive being read aloud or retyped from a poster.
const SLUG_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

export function createPublicQuizSlug(random: (size: number) => Uint8Array) {
  return Array.from(
    random(PUBLIC_QUIZ_SLUG_LENGTH),
    (byte) => SLUG_ALPHABET[byte % SLUG_ALPHABET.length],
  ).join("");
}

export type GradableQuestion = {
  id: string;
  type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "WRITTEN";
  points: number;
  options: ReadonlyArray<{ id: string; isCorrect: boolean }>;
};

export type PublicQuizAnswer = { questionId: string; optionIds: string[] };

/**
 * Scores choice answers the same way assessment attempts are auto-graded: a question earns its
 * points only when the selected options match the correct ones exactly. Unknown questions and
 * options are dropped from the stored answers.
 */
export function gradePublicQuiz(
  questions: readonly GradableQuestion[],
  answers: readonly PublicQuizAnswer[],
) {
  const submitted = new Map(
    answers.map((answer) => [answer.questionId, answer.optionIds]),
  );
  let score = 0;
  let maxScore = 0;
  const stored: Array<PublicQuizAnswer & { correct: boolean }> = [];
  for (const question of questions) {
    if (question.type === "WRITTEN") continue;
    maxScore += question.points;
    const optionIds = new Set(question.options.map((option) => option.id));
    const selected = [
      ...new Set(
        (submitted.get(question.id) ?? []).filter((id) => optionIds.has(id)),
      ),
    ].sort();
    const expected = question.options
      .filter((option) => option.isCorrect)
      .map((option) => option.id)
      .sort();
    const correct =
      selected.length === expected.length &&
      expected.every((value, index) => value === selected[index]);
    if (correct) score += question.points;
    stored.push({ questionId: question.id, optionIds: selected, correct });
  }
  return { score, maxScore, answers: stored };
}

/** Problems that keep an assessment from running as a public quiz, in Indonesian UI copy. */
export function publicQuizIssues(questions: readonly GradableQuestion[]) {
  const issues: string[] = [];
  if (!questions.length) issues.push("Tugas ini belum memiliki soal.");
  const written = questions.filter((question) => question.type === "WRITTEN");
  if (written.length) {
    issues.push(
      `${written.length} soal esai perlu dinilai pengajar, jadi tidak bisa dipakai di quiz publik. Hapus soal esai atau duplikat tugas tanpa soal esai.`,
    );
  }
  const withoutAnswer = questions.filter(
    (question) =>
      question.type !== "WRITTEN" &&
      !question.options.some((option) => option.isCorrect),
  );
  if (withoutAnswer.length) {
    issues.push(
      `${withoutAnswer.length} soal pilihan belum memiliki jawaban benar.`,
    );
  }
  return issues;
}

export function normalizeDisplayName(value: string | null | undefined) {
  const name = value?.replace(/\s+/g, " ").trim();
  if (!name) return null;
  return name;
}

// Common Indonesian and English slurs and profanity. Short words must match a whole word;
// longer ones also match inside a word ("anjingg", "dasarbangsat").
const BLOCKED_WORDS = [
  "anjing",
  "anjeng",
  "bangsat",
  "bajingan",
  "kontol",
  "memek",
  "ngentot",
  "entot",
  "jancok",
  "jancuk",
  "goblok",
  "tolol",
  "kampret",
  "pepek",
  "peler",
  "lonte",
  "pelacur",
  "babi",
  "asu",
  "tai",
  "taik",
  "pler",
  "perek",
  "fuck",
  "shit",
  "bitch",
  "asshole",
  "dick",
  "pussy",
  "cunt",
  "nigger",
  "nigga",
  "porn",
];
const LEET: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  $: "s",
};

function canonicalWords(value: string) {
  return value
    .toLowerCase()
    .replace(/[013457@$]/g, (character) => LEET[character] ?? character)
    .split(/[^a-z]+/)
    .filter(Boolean)
    .map((word) => word.replace(/(.)\1+/g, "$1"));
}

const canonicalBlocked = BLOCKED_WORDS.map(
  (word) => canonicalWords(word)[0] ?? word,
);

/** Whether a leaderboard name contains a blocked word. */
export function isOffensiveName(value: string) {
  const words = canonicalWords(value);
  const joined = words.join("");
  return canonicalBlocked.some((blocked) =>
    blocked.length >= 5 ? joined.includes(blocked) : words.includes(blocked),
  );
}

/** The name shown on the leaderboard; empty or offensive names become anonymous. */
export function sanitizeDisplayName(value: string | null | undefined) {
  const name = normalizeDisplayName(value);
  if (!name || isOffensiveName(name)) return null;
  return name;
}

/** Whether visitors may start the quiz at `now`. */
export function isPublicQuizAcceptingStarts(
  quiz: { status: string; closesAt: Date | null },
  now: Date,
) {
  return (
    quiz.status === "OPEN" &&
    (quiz.closesAt === null || quiz.closesAt.getTime() > now.getTime())
  );
}

/** Latest moment a submission of an attempt started at `startedAt` is accepted. */
export function publicQuizSubmitDeadline(
  startedAt: Date,
  timeLimitMinutes: number | null,
) {
  return timeLimitMinutes
    ? new Date(
        startedAt.getTime() +
          timeLimitMinutes * 60_000 +
          PUBLIC_QUIZ_SUBMIT_GRACE_MS,
      )
    : null;
}
