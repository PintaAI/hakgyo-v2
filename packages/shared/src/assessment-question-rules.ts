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
  /** Plays started per question. */
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
  const forwardOnly =
    section.navigation === "FORWARD_ONLY" || section.navigation === "PACED";
  if (forwardOnly && index < (state.furthest.get(section.id) ?? -1)) {
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
  if (
    entry.kind === "AUDIO_PLAYED" &&
    section.audioMaxPlays &&
    (state.plays.get(entry.questionId) ?? 0) >= section.audioMaxPlays
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
    state.plays.set(
      entry.questionId,
      (state.plays.get(entry.questionId) ?? 0) + 1,
    );
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

/** Whether a section's navigation is run by the system or forward only (no going back). */
export function isForwardOnly(navigation: SectionNavigation | undefined) {
  return navigation === "FORWARD_ONLY" || navigation === "PACED";
}

/** Whether an answer holds anything (a choice or text), so it can lock. */
export function answerHasContent(answer: {
  optionIds?: readonly string[] | null;
  content?: string | null;
}) {
  return Boolean(answer.optionIds?.length || answer.content?.trim());
}
