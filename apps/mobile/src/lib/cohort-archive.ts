import { meetingState } from "./study";

/**
 * Diarsipkan on Belajar: a class card moves below the carousel once its
 * curriculum is finished and nothing waits in it, or when the learner
 * archives it. The learner's own choices live on this device, per course
 * (Belajar shows one card per course), in `ArchiveOverrides`.
 */
export type ArchiveOverride =
  /** Archived by hand: stays down until shown again. */
  | { state: "archived" }
  /**
   * Shown again while finished: stays up until the curriculum changes
   * (`itemCount`), so finishing new lessons files it away again.
   */
  | { state: "shown"; itemCount: number };

export type ArchiveOverrides = Readonly<Record<string, ArchiveOverride>>;

export type OutlineProgress = { itemCount: number; completedCount: number };

export function outlineProgress(
  outline: { modules: { items: { isCompleted: boolean }[] }[] } | undefined,
): OutlineProgress | undefined {
  if (!outline) return undefined;
  let itemCount = 0;
  let completedCount = 0;
  for (const module of outline.modules) {
    for (const item of module.items) {
      itemCount += 1;
      if (item.isCompleted) completedCount += 1;
    }
  }
  return { itemCount, completedCount };
}

type PendingEvent = {
  status?: string | null;
  opensAt?: Date | null;
  closesAt: Date | null;
  attempts: { status: string }[];
};

/**
 * Something in the class still needs the learner: a meeting that has not
 * ended, an assessment that opens later, or an open one not yet submitted.
 */
export function hasPendingWork(
  input: {
    meetings: { startsAt: Date; durationMinutes: number; status: string }[];
    events: PendingEvent[];
  },
  now: number,
) {
  if (input.meetings.some((meeting) => meetingState(meeting, now) !== "ended"))
    return true;
  return input.events.some((event) => {
    if (event.status === "SCHEDULED") return true;
    if (event.status === "CLOSED" || event.status === "CANCELLED") return false;
    if (event.closesAt && event.closesAt.getTime() <= now) return false;
    const attempt = event.attempts[0];
    return !attempt || attempt.status === "IN_PROGRESS";
  });
}

/**
 * Every lesson is done (an empty curriculum never is), nothing waits, and
 * the learner claimed the badge, so the card stays up to offer the claim.
 */
export function isClassFinished(
  progress: OutlineProgress | undefined,
  pendingWork: boolean,
  badgeClaimed: boolean,
) {
  return (
    badgeClaimed &&
    !!progress &&
    progress.itemCount > 0 &&
    progress.completedCount === progress.itemCount &&
    !pendingWork
  );
}

/**
 * Whether the card sits under Diarsipkan. `itemCount` is unknown where the
 * outline is not composed (Latihan, Cari); a "shown" choice then holds.
 */
export function isArchived(
  finished: boolean,
  override: ArchiveOverride | undefined,
  itemCount?: number,
) {
  if (override?.state === "archived") return true;
  if (
    override?.state === "shown" &&
    (itemCount === undefined || override.itemCount === itemCount)
  )
    return false;
  return finished;
}

/** A "shown" choice made for a curriculum that has changed since. */
export function isStaleShownOverride(
  override: ArchiveOverride | undefined,
  itemCount: number | undefined,
) {
  return (
    override?.state === "shown" &&
    itemCount !== undefined &&
    override.itemCount !== itemCount
  );
}
