type Identifiable = { id: string };

function seedNumber(seed: string) {
  let hash = 2_166_136_261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

function randomFor(seed: string) {
  let state = seedNumber(seed) || 1;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function shuffleForAttempt<T extends Identifiable>(
  values: readonly T[],
  seed: string,
  enabled: boolean,
  scope: string,
): T[] {
  if (!enabled) return [...values];

  const result = [...values];
  const random = randomFor(`${seed}:${scope}`);
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex]!, result[index]!];
  }
  return result;
}

export function orderAssessmentQuestions<
  T extends Identifiable & { options: readonly Identifiable[] },
>(
  questions: readonly T[],
  seed: string | undefined,
  shuffleQuestions: boolean,
  shuffleOptions: boolean,
): T[] {
  if (!seed) return questions.map((question) => ({ ...question }));

  const orderedQuestions = shuffleForAttempt(
    questions,
    seed,
    shuffleQuestions,
    "questions",
  );
  return orderedQuestions.map((question) => ({
    ...question,
    options: shuffleForAttempt(
      question.options,
      seed,
      shuffleOptions,
      `options:${question.id}`,
    ),
  }));
}
