import type { LearnerState } from "@hakgyo/shared/mobile-sync";

import { createUserRecordStore } from "./user-json-store";

/**
 * Course badges. The badge itself is not stored anywhere: a course whose
 * every lesson is done has earned it, which the synced progress shows on any
 * phone. This device only remembers that the learner claimed it (tapped
 * "Klaim lencana" in the card's Bab list); on another phone or after a
 * reinstall a finished course simply offers the claim again.
 */
export type BadgeClaim = {
  claimedAt: string;
  /** Kept for Profil, which lists badges of every organization. */
  title?: string;
  /** When the course was finished (see `courseCompletedAt`), if known. */
  completedAt?: string | null;
};

function isClaim(value: unknown): value is BadgeClaim {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as Record<string, unknown>).claimedAt === "string"
  );
}

const store = createUserRecordStore("hakgyo:badge-claims:v1", isClaim);

export function claimBadge(
  userId: string,
  courseId: string,
  details: { title: string; completedAt: Date | null },
  now = new Date(),
) {
  store.set(userId, courseId, {
    claimedAt: now.toISOString(),
    title: details.title,
    completedAt: details.completedAt?.toISOString() ?? null,
  });
}

/** When the badge counts as earned: the finish date, else the claim. */
export function badgeEarnedAt(claim: BadgeClaim) {
  return new Date(claim.completedAt ?? claim.claimedAt);
}

/** The badges claimed on this device, by course, following changes. */
export const useBadgeClaims = store.useRecords;

/**
 * When the course was finished: the latest completion or graded attempt of
 * its lessons, from the synced progress. Null when none carries a date (for
 * example a course of vocabulary sets only).
 */
export function courseCompletedAt(
  outline: { modules: { items: { id: string }[] }[] } | undefined,
  learner:
    Pick<LearnerState, "contentProgress" | "standaloneAttempts"> | undefined,
): Date | null {
  if (!outline || !learner) return null;
  let latest: string | null = null;
  for (const module of outline.modules) {
    for (const item of module.items) {
      const attempt = learner.standaloneAttempts[item.id]?.latest;
      for (const value of [
        learner.contentProgress[item.id]?.completedAt,
        attempt?.gradedAt ?? attempt?.submittedAt,
      ]) {
        if (value && (!latest || value > latest)) latest = value;
      }
    }
  }
  return latest ? new Date(latest) : null;
}

/** The first letter of the course, for its medal; 한 for Hangeul. */
export function medalGlyph(courseTitle: string, isHangeul = false) {
  if (isHangeul) return "한";
  return Array.from(courseTitle.trim())[0]?.toUpperCase() ?? "★";
}
