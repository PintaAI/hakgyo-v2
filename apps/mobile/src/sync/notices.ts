import type {
  BundleContent,
  BundleItem,
  BundleStructure,
} from "@hakgyo/shared/mobile-sync";

import type { LearnerIndex } from "./types";

/**
 * Sync notices: what genuinely changed on the server between two successful
 * syncs of the same user and organization.
 *
 * News, compared with the previous server index of the same scope:
 * - an enrolled course or a joined cohort that was not there before;
 * - a new upcoming meeting in a known cohort, a rescheduled or cancelled one;
 * - a Tugas that opened, whose deadline moved, or that was cancelled;
 * - an attempt the learner submitted for review that is now graded (or
 *   regraded with another score).
 *
 * News, compared with the previous download of the same course bundle:
 * - new modules, new items in known modules, and items whose material,
 *   vocabulary or questions changed.
 *
 * Not news: the learner's own progress, XP and streaks, auto-graded attempts,
 * practice samples, read markers, renames and reordering, time-driven status
 * changes (a meeting starting), removals, and anything seen on the first sync
 * of a scope or course (that sync only records the baseline).
 */

export type SyncNoticeItem = { id: string; title: string; moduleId: string };

type SyncNoticeBase = {
  /** `${group}@${version}`: the same change always produces the same id. */
  id: string;
  /** The changed entity; a newer version replaces its older notice. */
  group: string;
  organizationId: string | null;
  createdAt: number;
};

export type SyncNotice = SyncNoticeBase &
  (
    | { kind: "COURSE_ADDED"; courseId: string; courseTitle: string }
    | {
        kind: "COHORT_ADDED";
        courseId: string;
        courseTitle: string;
        cohortId: string;
        cohortName: string;
      }
    | {
        kind: "MEETING_SCHEDULED" | "MEETING_RESCHEDULED" | "MEETING_CANCELLED";
        courseId: string;
        cohortId: string;
        cohortName: string;
        meetingId: string;
        meetingTitle: string;
        startsAt: string;
      }
    | {
        kind: "EVENT_OPENED" | "EVENT_DEADLINE_CHANGED" | "EVENT_CANCELLED";
        courseId: string;
        courseTitle: string;
        eventId: string;
        eventTitle: string;
        closesAt: string | null;
      }
    | {
        kind: "ATTEMPT_GRADED";
        courseId: string;
        courseItemId: string;
        attemptId: string;
        assessmentTitle: string;
        score: number | null;
        maxScore: number | null;
      }
    | {
        kind: "COURSE_CONTENT";
        courseId: string;
        courseTitle: string;
        revision: string;
        modulesAdded: Array<{ id: string; title: string }>;
        itemsAdded: SyncNoticeItem[];
        itemsUpdated: SyncNoticeItem[];
      }
  );

export type SyncNoticeKind = SyncNotice["kind"];
export type CourseContentNotice = Extract<
  SyncNotice,
  { kind: "COURSE_CONTENT" }
>;

/** Notices and baselines written together (atomically) by the store. */
export type SyncNoticeUpdate = {
  baselines: Array<{ key: string; value: string }>;
  notices: SyncNotice[];
};

/** Sync notices kept per user (dismissed ones included, for deduplication). */
export const MAX_SYNC_NOTICES = 100;
/** Sync notices older than this are hidden and dropped. */
export const SYNC_NOTICE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export const noticeBaselineKeys = {
  index: (scope: string) => `index:${scope}`,
  bundle: (courseId: string) => `bundle:${courseId}`,
};

type Distributive<T> = T extends unknown ? Omit<T, "id" | "createdAt"> : never;

function notice(
  input: Distributive<SyncNotice> & { version: string },
  createdAt: number,
): SyncNotice {
  const { version, ...rest } = input;
  return {
    ...rest,
    id: `${rest.group}@${version}`,
    createdAt,
  } as SyncNotice;
}

function isoDate(value: Date | string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

// ---------------------------------------------------------------------------
// Learner index
// ---------------------------------------------------------------------------

/** The parts of a server index that notices compare, per scope. */
export type IndexNoticeBaseline = {
  courseIds: string[];
  /** cohortId → meetingId → [status, startsAt]. */
  cohorts: Record<string, Record<string, [string, string | null]>>;
  /** eventId → [status, closesAt]. */
  events: Record<string, [string, string | null]>;
  /** attemptId → [status, score]. */
  attempts: Record<string, [string, number | null]>;
};

export function indexNoticeBaseline(index: LearnerIndex): IndexNoticeBaseline {
  return {
    courseIds: index.courses.map((course) => course.id),
    cohorts: Object.fromEntries(
      index.cohorts.map((cohort) => [
        cohort.id,
        Object.fromEntries(
          cohort.meetings.map((meeting) => [
            meeting.id,
            [meeting.status, isoDate(meeting.startsAt)],
          ]),
        ),
      ]),
    ),
    events: Object.fromEntries(
      index.events.map((event) => [
        event.id,
        [event.status, isoDate(event.closesAt)],
      ]),
    ),
    attempts: Object.fromEntries(
      index.attempts.map((attempt) => [
        attempt.id,
        [attempt.status, attempt.score ?? null],
      ]),
    ),
  };
}

const AWAITING_GRADE = new Set(["SUBMITTED", "IN_REVIEW"]);

export function diffIndexNotices(
  previous: IndexNoticeBaseline,
  index: LearnerIndex,
  createdAt: number,
): SyncNotice[] {
  const courses = new Map<
    string,
    { title: string; organizationId: string | null }
  >();
  for (const course of index.courses) {
    courses.set(course.id, {
      title: course.title,
      organizationId: course.organization.id,
    });
  }
  for (const cohort of index.cohorts) {
    if (courses.has(cohort.course.id)) continue;
    courses.set(cohort.course.id, {
      title: cohort.course.title,
      organizationId: cohort.course.organization.id,
    });
  }
  const organizationFor = (courseId: string) =>
    courses.get(courseId)?.organizationId ?? index.organizationId ?? null;
  const reference = new Date(index.generatedAt).getTime() || createdAt;
  const notices: SyncNotice[] = [];

  const knownCourses = new Set(previous.courseIds);
  for (const course of index.courses) {
    if (knownCourses.has(course.id)) continue;
    notices.push(
      notice(
        {
          kind: "COURSE_ADDED",
          group: `course:${course.id}`,
          version: "added",
          organizationId: course.organization.id,
          courseId: course.id,
          courseTitle: course.title,
        },
        createdAt,
      ),
    );
  }

  for (const cohort of index.cohorts) {
    const knownMeetings = previous.cohorts[cohort.id];
    const organizationId = cohort.course.organization.id;
    if (!knownMeetings) {
      // Its meetings arrive with it; the cohort notice covers them.
      notices.push(
        notice(
          {
            kind: "COHORT_ADDED",
            group: `cohort:${cohort.id}`,
            version: "added",
            organizationId,
            courseId: cohort.course.id,
            courseTitle: cohort.course.title,
            cohortId: cohort.id,
            cohortName: cohort.name,
          },
          createdAt,
        ),
      );
      continue;
    }
    for (const meeting of cohort.meetings) {
      const startsAt = isoDate(meeting.startsAt);
      if (!startsAt) continue;
      const upcoming = new Date(startsAt).getTime() > reference;
      const known = knownMeetings[meeting.id];
      const kind =
        !known && meeting.status === "SCHEDULED" && upcoming
          ? "MEETING_SCHEDULED"
          : known?.[0] === "SCHEDULED" &&
              meeting.status === "SCHEDULED" &&
              known[1] !== startsAt &&
              upcoming
            ? "MEETING_RESCHEDULED"
            : known?.[0] === "SCHEDULED" && meeting.status === "CANCELLED"
              ? "MEETING_CANCELLED"
              : null;
      if (!kind) continue;
      notices.push(
        notice(
          {
            kind,
            group: `meeting:${meeting.id}`,
            version: `${kind}:${startsAt}`,
            organizationId,
            courseId: cohort.course.id,
            cohortId: cohort.id,
            cohortName: cohort.name,
            meetingId: meeting.id,
            meetingTitle: meeting.title,
            startsAt,
          },
          createdAt,
        ),
      );
    }
  }

  for (const event of index.events) {
    const known = previous.events[event.id];
    const closesAt = isoDate(event.closesAt);
    const kind =
      event.status === "OPEN" && known?.[0] !== "OPEN"
        ? "EVENT_OPENED"
        : event.status === "OPEN" && closesAt && known?.[1] !== closesAt
          ? "EVENT_DEADLINE_CHANGED"
          : event.status === "CANCELLED" && known?.[0] === "OPEN"
            ? "EVENT_CANCELLED"
            : null;
    if (!kind) continue;
    notices.push(
      notice(
        {
          kind,
          group: `event:${event.id}`,
          version: `${kind}:${closesAt ?? ""}`,
          organizationId: organizationFor(event.course.id),
          courseId: event.course.id,
          courseTitle: event.course.title,
          eventId: event.id,
          eventTitle: event.title,
          closesAt,
        },
        createdAt,
      ),
    );
  }

  for (const attempt of index.attempts) {
    const known = previous.attempts[attempt.id];
    if (!known || attempt.status !== "GRADED") continue;
    const score = attempt.score ?? null;
    // Auto-graded attempts (IN_PROGRESS → GRADED) show their result on
    // submit; only a review finishing later is news.
    const graded =
      AWAITING_GRADE.has(known[0]) ||
      (known[0] === "GRADED" && known[1] !== score);
    if (!graded) continue;
    const courseId = attempt.courseItem.module.courseId;
    notices.push(
      notice(
        {
          kind: "ATTEMPT_GRADED",
          group: `attempt:${attempt.id}`,
          version: `graded:${score ?? ""}`,
          organizationId: organizationFor(courseId),
          courseId,
          courseItemId: attempt.courseItemId,
          attemptId: attempt.id,
          assessmentTitle: attempt.assessment.title,
          score,
          maxScore: attempt.maxScore ?? null,
        },
        createdAt,
      ),
    );
  }

  return notices;
}

// ---------------------------------------------------------------------------
// Course bundles
// ---------------------------------------------------------------------------

export type BundleNoticeInput = {
  courseId: string;
  organizationId: string | null;
  revision: string;
  structure: BundleStructure;
  content: BundleContent;
};

/** Per course (kept across organization switches and bundle pruning). */
export type BundleNoticeBaseline = {
  revision: string;
  /** moduleId → itemId → content fingerprint. */
  modules: Record<string, Record<string, string>>;
};

/** FNV-1a: a cheap change detector, not a security hash. */
function fingerprint(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

/** What the learner studies in an item; titles and settings are left out. */
function itemFingerprint(item: BundleItem, content: BundleContent) {
  const source =
    item.type === "MATERIAL"
      ? item.materialId
        ? content.materials[item.materialId]?.content
        : null
      : item.type === "VOCABULARY_SET"
        ? item.vocabularySetId
          ? content.vocabularySets[item.vocabularySetId]?.entries.map(
              (entry) => [entry.term, entry.definition, entry.examples],
            )
          : null
        : item.assessmentId
          ? content.assessments[item.assessmentId]?.questions.map(
              (question) => [
                question.type,
                question.prompt,
                question.points,
                question.options.map((option) => option.content),
              ],
            )
          : null;
  return fingerprint(JSON.stringify(source ?? null));
}

export function bundleNoticeBaseline(
  bundle: Pick<BundleNoticeInput, "revision" | "structure" | "content">,
): BundleNoticeBaseline {
  return {
    revision: bundle.revision,
    modules: Object.fromEntries(
      bundle.structure.modules.map((module) => [
        module.id,
        Object.fromEntries(
          module.items.map((item) => [
            item.id,
            itemFingerprint(item, bundle.content),
          ]),
        ),
      ]),
    ),
  };
}

/** `next` is `bundleNoticeBaseline(bundle)` (the caller stores it too). */
export function diffBundleNotices(
  previous: BundleNoticeBaseline,
  next: BundleNoticeBaseline,
  bundle: BundleNoticeInput,
  createdAt: number,
): CourseContentNotice | null {
  const knownItems = new Map<string, string>();
  for (const items of Object.values(previous.modules)) {
    for (const [itemId, hash] of Object.entries(items)) {
      knownItems.set(itemId, hash);
    }
  }
  const modulesAdded: Array<{ id: string; title: string }> = [];
  const itemsAdded: SyncNoticeItem[] = [];
  const itemsUpdated: SyncNoticeItem[] = [];
  for (const module of bundle.structure.modules) {
    const moduleIsNew = !previous.modules[module.id];
    if (moduleIsNew && module.items.length) {
      modulesAdded.push({ id: module.id, title: module.title });
    }
    for (const item of module.items) {
      const known = knownItems.get(item.id);
      const entry = { id: item.id, title: item.title, moduleId: module.id };
      if (known === undefined) {
        // A new module's items are counted by the module.
        if (!moduleIsNew) itemsAdded.push(entry);
      } else if (known !== next.modules[module.id]?.[item.id]) {
        itemsUpdated.push(entry);
      }
    }
  }
  if (!modulesAdded.length && !itemsAdded.length && !itemsUpdated.length) {
    return null;
  }
  return notice(
    {
      kind: "COURSE_CONTENT",
      // One notice per downloaded revision; the UI merges unread ones.
      group: `content:${bundle.courseId}:${bundle.revision}`,
      version: "changed",
      organizationId: bundle.organizationId,
      courseId: bundle.courseId,
      courseTitle: bundle.structure.title,
      revision: bundle.revision,
      modulesAdded,
      itemsAdded,
      itemsUpdated,
    },
    createdAt,
  ) as CourseContentNotice;
}

export function parseNoticeBaseline<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}
