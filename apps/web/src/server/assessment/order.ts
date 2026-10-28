import { questionUnits } from "@hakgyo/shared";

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

/**
 * Shuffles questions with a group's questions kept together in their order (a group moves as one
 * unit). Without groups this is exactly `shuffleForAttempt`, so existing attempts keep their order.
 */
function shuffleQuestionUnits<
  T extends Identifiable & { groupId?: string | null },
>(questions: readonly T[], seed: string, enabled: boolean, scope: string): T[] {
  if (!enabled) return [...questions];
  const units = questionUnits(questions).map((unit) => ({
    id: unit[0]!.id,
    unit,
  }));
  return shuffleForAttempt(units, seed, true, scope).flatMap(
    ({ unit }) => unit,
  );
}

/**
 * Whether an attempt shuffles its questions: an event's own setting wins, and an event without
 * one (null) follows the assessment, so a Tryout keeps the authored order unless staff chose
 * otherwise.
 */
export function shufflesQuestions(
  assessmentShuffleQuestions: boolean,
  eventShuffleQuestions?: boolean | null,
) {
  return eventShuffleQuestions ?? assessmentShuffleQuestions;
}

export type OrderableSection = {
  id: string;
  position: number;
  shuffleQuestions: boolean;
};

/**
 * Questions in the order an attempt shows them. Without sections: by position, shuffled when
 * `shuffleQuestions`. With sections: section by section (in section position order), each
 * shuffled by the event's override when set, else by its own setting; shuffling never crosses a
 * section, and a group's questions stay together. Options are shuffled per question when
 * `shuffleOptions`. Without a seed (no attempt
 * yet) the authored order is kept.
 */
export function orderAssessmentQuestions<
  T extends Identifiable & {
    options: readonly Identifiable[];
    sectionId?: string | null;
    groupId?: string | null;
  },
>(
  questions: readonly T[],
  seed: string | undefined,
  shuffleQuestions: boolean,
  shuffleOptions: boolean,
  layout: {
    sections?: readonly OrderableSection[];
    eventShuffleQuestions?: boolean | null;
  } = {},
): T[] {
  if (!seed) return arrangeBySection(questions, layout.sections);

  const sections = [...(layout.sections ?? [])].sort(
    (left, right) => left.position - right.position,
  );
  const orderedQuestions = sections.length
    ? sectionGroups(questions, sections).flatMap(({ section, questions }) =>
        shuffleQuestionUnits(
          questions,
          seed,
          section
            ? (layout.eventShuffleQuestions ?? section.shuffleQuestions)
            : shuffleQuestions,
          section ? `questions:${section.id}` : "questions",
        ),
      )
    : shuffleQuestionUnits(questions, seed, shuffleQuestions, "questions");
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

/** Questions grouped by section in section order; unassigned ones form a last group. */
function sectionGroups<T extends { sectionId?: string | null }>(
  questions: readonly T[],
  sections: readonly OrderableSection[],
) {
  const groups = sections.map(
    (section): { section: OrderableSection | null; questions: T[] } => ({
      section,
      questions: questions.filter(
        (question) => question.sectionId === section.id,
      ),
    }),
  );
  const known = new Set(sections.map(({ id }) => id));
  const rest = questions.filter(
    (question) => !question.sectionId || !known.has(question.sectionId),
  );
  if (rest.length) groups.push({ section: null, questions: rest });
  return groups;
}

/** The authored order: by section, then by the questions' own order. */
export function arrangeBySection<
  T extends { sectionId?: string | null; options: readonly Identifiable[] },
>(questions: readonly T[], sections: readonly OrderableSection[] = []): T[] {
  const sorted = [...sections].sort(
    (left, right) => left.position - right.position,
  );
  const arranged = sorted.length
    ? sectionGroups(questions, sorted).flatMap(({ questions }) => questions)
    : [...questions];
  return arranged.map((question) => ({ ...question }));
}
