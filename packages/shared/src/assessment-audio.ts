import {
  sectionMaxPlays,
  type SectionNavigation,
} from "./assessment-question-rules";

/**
 * Audio and pacing of a section during an attempt (docs/eps-topik-simulation.md section 5.6),
 * shared by the web and mobile players.
 */

/** Answer window after the last play of a paced question, when the section sets none. */
export const PACED_DEFAULT_ANSWER_SECONDS = 7;
/** Window of a paced question without audio, when the section sets none. */
export const PACED_DEFAULT_QUESTION_SECONDS = 30;

export type AudioSource = { assetId: string } | { url: string };

const assetUrlPrefix = "hakgyo-asset:";

/**
 * The audio of rich content in reading order: `assetAudio` blocks and BlockNote `audio` blocks
 * (whose URL may point at an asset), children included.
 */
export function contentAudioSources(...values: unknown[]): AudioSource[] {
  const sources: AudioSource[] = [];
  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    if (!value || typeof value !== "object") return;
    const block = value as {
      type?: unknown;
      props?: Record<string, unknown>;
      children?: unknown;
    };
    if (block.type === "assetAudio") {
      const assetId = block.props?.assetId;
      if (typeof assetId === "string" && assetId) sources.push({ assetId });
    } else if (block.type === "audio") {
      const url = block.props?.url;
      if (typeof url === "string" && url) {
        sources.push(
          url.startsWith(assetUrlPrefix)
            ? { assetId: url.slice(assetUrlPrefix.length) }
            : { url },
        );
      }
    }
    if (block.children) visit(block.children);
  };
  for (const value of values) visit(value);
  return sources;
}

/** A question's playlist: the prompt's audio, then each option's in the order shown. */
export function questionAudioSources(question: {
  prompt: unknown;
  options: ReadonlyArray<{ content: unknown }>;
}) {
  return contentAudioSources(
    question.prompt,
    ...question.options.map((option) => option.content),
  );
}

export type AudioPolicySection = {
  navigation: SectionNavigation;
  audioMaxPlays: number | null;
  audioAutoplay: boolean;
  audioRepeatGapSeconds: number;
};

export type AudioPolicy = {
  /** Plays per question (one play is the whole playlist); null is unlimited. */
  maxPlays: number | null;
  /** Plays by itself when shown, then again after the gap up to `maxPlays` (once if unlimited). */
  autoplay: boolean;
  repeatGapSeconds: number;
};

/**
 * How a section's audio plays, or null when the content's own players stay (no limit, no
 * autoplay, not paced). A paced section plays by itself, at least once, so it can move on.
 */
export function sectionAudioPolicy(
  section: AudioPolicySection | undefined,
): AudioPolicy | null {
  if (!section) return null;
  const paced = section.navigation === "PACED";
  if (!paced && section.audioMaxPlays === null && !section.audioAutoplay) {
    return null;
  }
  return {
    maxPlays: sectionMaxPlays(section),
    autoplay: paced || section.audioAutoplay,
    repeatGapSeconds: Math.max(0, section.audioRepeatGapSeconds),
  };
}

/**
 * When a paced question's time is up: the answer window after its audio ended, or its own window
 * from when it was shown. Null while its audio has not finished yet.
 */
export function pacedQuestionEndsAt(input: {
  section: {
    pacedAnswerSeconds: number | null;
    pacedQuestionSeconds: number | null;
  };
  hasAudio: boolean;
  shownAt: Date;
  audioEndedAt: Date | null;
}) {
  if (input.hasAudio) {
    if (!input.audioEndedAt) return null;
    return new Date(
      input.audioEndedAt.getTime() +
        (input.section.pacedAnswerSeconds ?? PACED_DEFAULT_ANSWER_SECONDS) *
          1000,
    );
  }
  return new Date(
    input.shownAt.getTime() +
      (input.section.pacedQuestionSeconds ?? PACED_DEFAULT_QUESTION_SECONDS) *
        1000,
  );
}
