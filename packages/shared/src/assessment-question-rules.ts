/**
 * Per-question rules of a section (docs/eps-topik-simulation.md sections 4.2 and 5.1), shared by
 * web, mobile and the server:
 *
 * - `FORWARD_ONLY` and `PACED` navigation: a question once left behind cannot be shown, answered
 *   or played again. (`PACED` timing itself, the answer window after the audio, runs on the
 *   device; the server enforces its order and play counts.)
 * - `lockAnswers`: the first choice of a single-choice question is final.
 * - `audioMaxPlays`: a question's audio plays at most that many times (one play is the whole
 *   playlist of the question).
 */

export type SectionNavigation = "FREE" | "FORWARD_ONLY" | "PACED";

export type RuleSection = {
  id: string;
  navigation?: SectionNavigation;
  lockAnswers?: boolean;
  audioMaxPlays?: number | null;
  /** In the order this attempt shows them. */
  questionIds: readonly string[];
  /** Single-choice questions, the ones `lockAnswers` applies to. */
  lockableQuestionIds?: readonly string[];
  /**
   * The key each question's plays count under (`audioKeysFor`): a group whose stimulus has audio
   * shares one count. Missing: the question id.
   */
  audioKeyOf?: Readonly<Record<string, string>>;
};

export type RuleEntry = {
  kind: string;
  questionId?: string | null;
  /** ANSWERED: whether it holds a choice or text (an emptied answer does not lock). */
  hasAnswer?: boolean;
};

export type RuleState = {
  /** Highest question index reached per section. */
  furthest: Map<string, number>;
  /** Questions with a locked answer. */
  answered: Set<string>;
  /** Plays started per audio key (a question, or a group with stimulus audio). */
  plays: Map<string, number>;
};

export type RuleRejection = "NAVIGATION" | "LOCKED" | "AUDIO";

export function emptyRuleState(): RuleState {
  return { furthest: new Map(), answered: new Set(), plays: new Map() };
}

function locate(sections: readonly RuleSection[], questionId: string) {
  for (const section of sections) {
    const index = section.questionIds.indexOf(questionId);
    if (index >= 0) return { section, index };
  }
  return null;
}

const questionKinds = new Set(["QUESTION_SHOWN", "ANSWERED", "AUDIO_PLAYED"]);

/** Entry kinds that move the section timeline (the rest belong to questions). */
export function isTimelineKind(kind: string) {
  return (
    kind === "SECTION_STARTED" ||
    kind === "SECTION_ENDED" ||
    kind === "SUBMITTED"
  );
}

/** Whether a section's navigation is run by the system or forward only (no going back). */
export function isForwardOnly(navigation: SectionNavigation | undefined) {
  return navigation === "FORWARD_ONLY" || navigation === "PACED";
}

/**
 * Plays allowed per question, or null for unlimited. A paced section plays at least once, so it
 * can move on (the same limit the players show).
 */
export function sectionMaxPlays(section: {
  navigation?: SectionNavigation;
  audioMaxPlays?: number | null;
}) {
  return section.navigation === "PACED"
    ? (section.audioMaxPlays ?? 1)
    : (section.audioMaxPlays ?? null);
}

/** Whether a section has a rule the shared engine enforces per question. */
export function sectionHasQuestionRules(section: {
  navigation?: SectionNavigation;
  lockAnswers?: boolean;
  audioMaxPlays?: number | null;
}) {
  return (
    isForwardOnly(section.navigation) ||
    Boolean(section.lockAnswers) ||
    sectionMaxPlays(section) !== null
  );
}

/** Rule sections with their questions in the order shown (`questions` is in that order). */
export function ruleSectionsFor<S extends { id: string }>(
  sections: readonly S[],
  questions: ReadonlyArray<{ id: string; sectionId?: string | null }>,
  audioKeyOf?: Readonly<Record<string, string>>,
) {
  return sections.map((section) => ({
    ...section,
    questionIds: questions
      .filter((question) => question.sectionId === section.id)
      .map(({ id }) => id),
    audioKeyOf,
  }));
}

function audioKey(section: RuleSection, questionId: string) {
  return section.audioKeyOf?.[questionId] ?? questionId;
}

/** Why the entry breaks a rule, or null when it may be accepted. */
export function checkRuleEntry(
  sections: readonly RuleSection[],
  state: RuleState,
  entry: RuleEntry,
): RuleRejection | null {
  if (!questionKinds.has(entry.kind) || !entry.questionId) return null;
  const located = locate(sections, entry.questionId);
  if (!located) return null;
  const { section, index } = located;
  if (
    isForwardOnly(section.navigation) &&
    index < (state.furthest.get(section.id) ?? -1)
  ) {
    return "NAVIGATION";
  }
  if (
    entry.kind === "ANSWERED" &&
    section.lockAnswers &&
    section.lockableQuestionIds?.includes(entry.questionId) &&
    state.answered.has(entry.questionId)
  ) {
    return "LOCKED";
  }
  const maxPlays = sectionMaxPlays(section);
  if (
    entry.kind === "AUDIO_PLAYED" &&
    maxPlays !== null &&
    (state.plays.get(audioKey(section, entry.questionId)) ?? 0) >= maxPlays
  ) {
    return "AUDIO";
  }
  return null;
}

/** Updates the state with an accepted entry. */
export function applyRuleEntry(
  sections: readonly RuleSection[],
  state: RuleState,
  entry: RuleEntry,
) {
  if (!questionKinds.has(entry.kind) || !entry.questionId) return;
  const located = locate(sections, entry.questionId);
  if (!located) return;
  const { section, index } = located;
  state.furthest.set(
    section.id,
    Math.max(state.furthest.get(section.id) ?? -1, index),
  );
  if (entry.kind === "ANSWERED" && entry.hasAnswer) {
    state.answered.add(entry.questionId);
  }
  if (entry.kind === "AUDIO_PLAYED") {
    const key = audioKey(section, entry.questionId);
    state.plays.set(key, (state.plays.get(key) ?? 0) + 1);
  }
}

export function ruleStateFrom(
  sections: readonly RuleSection[],
  entries: readonly RuleEntry[],
) {
  const state = emptyRuleState();
  for (const entry of entries) applyRuleEntry(sections, state, entry);
  return state;
}

/** Whether an answer holds anything (a choice or text), so it can lock. */
export function answerHasContent(answer: {
  optionIds?: readonly string[] | null;
  content?: string | null;
}) {
  return Boolean(answer.optionIds?.length || answer.content?.trim());
}

/**
 * How an assessment is worked through, in one line for its intro screen (web and mobile): free
 * navigation, or sections in order with the strictest rule they use.
 */
export function attemptFlowSummary(
  sections: ReadonlyArray<{
    navigation: SectionNavigation;
    lockAnswers: boolean;
  }>,
) {
  if (!sections.length)
    return "Bebas berpindah antarsoal. Kirim jika sudah siap.";
  const parts = [
    `Terdiri dari ${sections.length} bagian yang dikerjakan berurutan.`,
  ];
  if (sections.some((section) => section.navigation === "PACED")) {
    parts.push("Di sebagian bagian, soal berganti sendiri.");
  } else if (
    sections.some((section) => section.navigation === "FORWARD_ONLY")
  ) {
    parts.push(
      "Di sebagian bagian, soal yang sudah dilewati tidak bisa dibuka lagi.",
    );
  }
  if (sections.some((section) => section.lockAnswers)) {
    parts.push("Ada bagian yang langsung mengunci pilihan pertama.");
  }
  return parts.join(" ");
}
