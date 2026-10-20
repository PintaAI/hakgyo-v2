/**
 * Pacing for the WhatsApp outbox. Evolution API has no outbound rate limit of
 * its own, and WhatsApp publishes none for linked devices, so these are
 * conservative guesses kept low to protect the organization's number.
 */

export const MESSAGES_PER_CONNECTION_PER_RUN = 10;
export const MIN_SEND_GAP_MS = 3_000;
export const MAX_SEND_GAP_MS = 8_000;
export const GROUPS_PER_HOUR = 3;
export const GROUPS_PER_DAY = 10;
export const GROUP_MESSAGES_PER_DAY = 100;
export const MAX_ATTEMPTS = 5;
/** A row claimed longer ago than this was abandoned by a crashed run. */
export const STALE_CLAIM_MS = 10 * 60_000;

const HOUR_MS = 60 * 60_000;
const RETRY_DELAYS_MS = [10 * 60_000, 30 * 60_000, 2 * HOUR_MS];

/** Delay before the next try after `attempts` failed ones (1-based). */
export function retryDelayMs(attempts: number) {
  const index = Math.min(Math.max(attempts, 1), RETRY_DELAYS_MS.length) - 1;
  return RETRY_DELAYS_MS[index]!;
}

/** Random gap between two sends from one number, so they do not look scripted. */
export function sendGapMs(random = Math.random()) {
  return Math.round(
    MIN_SEND_GAP_MS + (MAX_SEND_GAP_MS - MIN_SEND_GAP_MS) * random,
  );
}

export type SentCounts = {
  groupsLastHour: number;
  groupsLastDay: number;
  messagesLastDay: number;
};

/** How many more rows of each kind one connection may send right now. */
export function remainingBudget(counts: SentCounts) {
  return {
    CREATE_GROUP: Math.max(
      0,
      Math.min(
        GROUPS_PER_HOUR - counts.groupsLastHour,
        GROUPS_PER_DAY - counts.groupsLastDay,
      ),
    ),
    GROUP_MESSAGE: Math.max(0, GROUP_MESSAGES_PER_DAY - counts.messagesLastDay),
  };
}

/** When a row held back by the budget should be looked at again. */
export function deferredUntil(
  kind: "CREATE_GROUP" | "GROUP_MESSAGE",
  now: Date,
) {
  return new Date(
    now.getTime() + (kind === "CREATE_GROUP" ? HOUR_MS : 3 * HOUR_MS),
  );
}
