import { createHash } from "node:crypto";

import {
  INDEX_SCHEMA,
  type LearnerIndexBase,
  type SyncRevision,
} from "@hakgyo/shared/mobile-sync";
import { TRPCError } from "@trpc/server";

import type { Prisma } from "../../../generated/prisma/client";
import { assessmentRouter } from "~/server/api/routers/assessment";
import { assessmentEventRouter } from "~/server/api/routers/assessment-event";
import { gamificationRouter } from "~/server/api/routers/gamification";
import { learningRouter } from "~/server/api/routers/learning";
import {
  getAssessmentSample,
  getVocabularyPool,
  practiceItemsFromOutlines,
} from "~/server/api/routers/practice";
import type { TRPCContext } from "~/server/api/trpc";
import type { organizationBrandSelect } from "~/server/brand/context";
import { getLocalDateKey } from "~/server/gamification/logic";
import { getCourseOutlineViewsForUser } from "~/server/learning/course-outline";
import { enrolledCourseWhere } from "~/server/learning/enrolled-courses";
import { buildLearnerState } from "~/server/mobile/learner-state";
import { buildSidebarIndicatorCandidates } from "~/server/mobile/sidebar-indicators";
import {
  getCourseRevisions,
  getOrganizationMetaRevision,
  getUserStateRevision,
  maxRevision,
  ZERO_REVISION,
  type CourseRevisions,
} from "~/server/mobile/sync-log";
import { createRequestCache } from "~/server/request-cache";

type LearnerContext = TRPCContext & { actorUserId: string };
type AccessDb = Pick<
  Prisma.TransactionClient,
  "organizationMember" | "courseEnrollment" | "cohortEnrollment"
>;

const MOBILE_PRACTICE_SEED = "mobile-sync-v1";
const MAX_INDEX_VALIDITY_MS = 24 * 60 * 60 * 1000;

/**
 * A learner may scope sync to an organization they belong to, are enrolled
 * in a course of, or are enrolled in a cohort of.
 */
export async function requireOrganizationAccess(
  db: AccessDb,
  userId: string,
  organizationId: string | undefined,
) {
  if (!organizationId) return;
  const access = await Promise.all([
    db.organizationMember.findFirst({
      where: { userId, organizationId },
      select: { id: true },
    }),
    db.courseEnrollment.findFirst({
      where: { userId, course: { organizationId } },
      select: { id: true },
    }),
    db.cohortEnrollment.findFirst({
      where: { userId, cohort: { organizationId } },
      select: { id: true },
    }),
  ]);
  if (access.every((entry) => !entry)) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
}

export type EnrolledCourseRevision = {
  courseId: string;
  organizationId: string;
  revisions: CourseRevisions;
};

/**
 * The learner's enrolled (published) courses with their current revisions,
 * plus the index token those revisions and the user's own state determine.
 * Read before any index data so a concurrent write invalidates the token.
 */
export async function getIndexToken(
  ctx: Pick<LearnerContext, "db" | "actorUserId">,
  input: { organizationId?: string },
): Promise<{ indexToken: string; courses: EnrolledCourseRevision[] }> {
  const userId = ctx.actorUserId;
  const courses = await ctx.db.course.findMany({
    where: await enrolledCourseWhere({
      userId,
      organizationId: input.organizationId,
    }),
    orderBy: { id: "asc" },
    select: { id: true, organizationId: true },
  });
  const organizationIds = [
    ...new Set(courses.map((course) => course.organizationId)),
  ].sort();
  const [userRevision, organizationRevisions, courseRevisions] =
    await Promise.all([
      getUserStateRevision(ctx.db, userId),
      Promise.all(
        organizationIds.map(async (organizationId) => ({
          organizationId,
          revision: await getOrganizationMetaRevision(ctx.db, organizationId),
        })),
      ),
      getCourseRevisions(
        ctx.db,
        courses.map((course) => course.id),
      ),
    ]);
  const enrolled = courses.map((course) => ({
    courseId: course.id,
    organizationId: course.organizationId,
    revisions: courseRevisions.get(course.id) ?? {
      structure: ZERO_REVISION,
      content: ZERO_REVISION,
      roster: ZERO_REVISION,
      bundle: ZERO_REVISION,
    },
  }));
  const rosterRevision = enrolled.reduce<SyncRevision>(
    (max, course) => maxRevision(max, course.revisions.roster),
    ZERO_REVISION,
  );
  const indexToken = createHash("sha256")
    .update(
      JSON.stringify([
        userRevision,
        organizationRevisions.map((entry) => [
          entry.organizationId,
          entry.revision,
        ]),
        rosterRevision,
        enrolled.map((course) => course.courseId),
        INDEX_SCHEMA,
      ]),
    )
    .digest("hex");
  return { indexToken, courses: enrolled };
}

/** Instant of the next local midnight in `timeZone` (best effort across DST). */
export function nextLocalMidnight(now: Date, timeZone: string): Date {
  const today = getLocalDateKey(now, timeZone);
  const tomorrowUtc = new Date(`${today}T00:00:00.000Z`);
  tomorrowUtc.setUTCDate(tomorrowUtc.getUTCDate() + 1);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(tomorrowUtc);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");
  const localAsUtc = Date.UTC(
    read("year"),
    read("month") - 1,
    read("day"),
    read("hour"),
    read("minute"),
    read("second"),
  );
  const offsetMs = localAsUtc - tomorrowUtc.getTime();
  return new Date(tomorrowUtc.getTime() - offsetMs);
}

/**
 * Earliest time-driven change of the index: streak day rollover, an event
 * closing, a cohort ending or an enrollment expiring; capped at 24 hours.
 */
export function computeValidUntil(input: {
  now: Date;
  timeZone: string;
  deadlines: ReadonlyArray<Date | null | undefined>;
}): Date {
  const cap = new Date(input.now.getTime() + MAX_INDEX_VALIDITY_MS);
  let earliest = nextLocalMidnight(input.now, input.timeZone);
  for (const deadline of input.deadlines) {
    if (deadline && deadline > input.now && deadline < earliest) {
      earliest = deadline;
    }
  }
  return earliest < cap ? earliest : cap;
}

/**
 * The per-user index of protocol 2: everything the mobile client shows that
 * is not shared course content. Sections reuse the existing tRPC procedure
 * outputs verbatim (see `LearnerIndexBase`).
 */
export async function buildLearnerIndex(
  ctx: LearnerContext,
  input: { organizationId?: string },
) {
  const actorUserId = ctx.actorUserId;
  const scope = input.organizationId
    ? { organizationId: input.organizationId }
    : undefined;
  // Token first: a write landing during the reads makes the manifest report
  // a newer token, so the client fetches again.
  const { indexToken, courses: enrolledCourses } = await getIndexToken(
    ctx,
    input,
  );
  const courseIds = enrolledCourses.map((course) => course.courseId);
  const now = new Date();

  // Fresh request cache: no read below may reuse a lookup from before a
  // write in the same HTTP batch (commit -> index).
  const callerCtx = { ...ctx, requestCache: createRequestCache() };
  const learning = learningRouter.createCaller(callerCtx);
  const assessment = assessmentRouter.createCaller(callerCtx);
  const assessmentEvent = assessmentEventRouter.createCaller(callerCtx);
  const gamification = gamificationRouter.createCaller(callerCtx);

  const coursesPromise = learning.listMyCourses(scope);
  const cohortsPromise = learning.listMyCohorts(scope);
  // Both outline views of every enrolled course from one batched load: the
  // default view drives sidebar indicators, the learner view drives practice.
  const outlineViewsPromise = Promise.all([
    coursesPromise,
    cohortsPromise,
  ]).then(async ([courses, cohorts]) => {
    const ids = [
      ...new Set([
        ...courses.map((course) => course.id),
        ...cohorts.map((cohort) => cohort.course.id),
      ]),
    ];
    const views = ids.length
      ? await getCourseOutlineViewsForUser({ id: { in: ids } }, actorUserId)
      : [];
    const viewsById = new Map(views.map((view) => [view.outline.id, view]));
    return ids.flatMap((courseId) => {
      const view = viewsById.get(courseId);
      return view ? [[courseId, view] as const] : [];
    });
  });
  const practiceContext = { db: ctx.db, actorUserId };
  const practicePromise = Promise.all([
    coursesPromise,
    outlineViewsPromise,
  ]).then(([courses, outlineViews]) => {
    const viewsById = new Map(outlineViews);
    const available = practiceItemsFromOutlines(
      courses.flatMap((course) => {
        const view = viewsById.get(course.id);
        return view ? [view.learnerOutline] : [];
      }),
    );
    return Promise.all([
      getVocabularyPool(
        practiceContext,
        { ...scope, limit: 30, seed: MOBILE_PRACTICE_SEED },
        available,
      ),
      getAssessmentSample(
        practiceContext,
        { ...scope, limit: 10, seed: MOBILE_PRACTICE_SEED },
        available,
      ),
    ]);
  });
  const attemptsPromise = assessment.listMyAttempts(scope);
  const resumableAttemptsPromise = attemptsPromise.then((attempts) =>
    Promise.all(
      attempts
        .filter((attempt) => attempt.status === "IN_PROGRESS")
        .map(async (attempt) => {
          const [attemptDetail, assessmentDetail] = await Promise.all([
            assessment.getMyAttempt({ attemptId: attempt.id }),
            assessment.getForCourseItem({
              courseItemId: attempt.courseItemId,
              attemptId: attempt.id,
            }),
          ]);
          return [
            attempt.id,
            { attempt: attemptDetail, assessmentDetail },
          ] as const;
        }),
    ),
  );

  const [
    courses,
    cohorts,
    events,
    milestones,
    attempts,
    gamificationSummary,
    [vocabularyPractice, assessmentPractice],
    outlineViews,
    resumableAttemptEntries,
    learner,
    enrollments,
  ] = await Promise.all([
    coursesPromise,
    cohortsPromise,
    assessmentEvent.listForLearner(scope),
    learning.listMyCohortMilestones(scope),
    attemptsPromise,
    gamification.getMySummary(),
    practicePromise,
    outlineViewsPromise,
    resumableAttemptsPromise,
    buildLearnerState(ctx.db, actorUserId, courseIds, now),
    ctx.db.courseEnrollment.findMany({
      where: { userId: actorUserId, expiresAt: { gt: now } },
      select: { expiresAt: true },
    }),
  ]);

  const organizations: Record<
    string,
    Prisma.OrganizationGetPayload<{ select: typeof organizationBrandSelect }>
  > = {};
  for (const course of courses) {
    organizations[course.organization.id] ??= course.organization;
  }
  for (const cohort of cohorts) {
    organizations[cohort.course.organization.id] ??= cohort.course.organization;
  }

  const outlineEntries = outlineViews.map(
    ([courseId, { outline }]) => [courseId, outline] as const,
  );
  const sidebarOrganizationId = input.organizationId;
  const sidebarCandidates = sidebarOrganizationId
    ? buildSidebarIndicatorCandidates({
        outlines: outlineEntries,
        events,
        cohorts,
        now,
      })
    : [];
  const sidebarSeen =
    sidebarOrganizationId && sidebarCandidates.length
      ? await ctx.db.learnerSidebarSeen.findMany({
          where: {
            userId: actorUserId,
            organizationId: sidebarOrganizationId,
            indicatorKey: {
              in: sidebarCandidates.map((candidate) => candidate.key),
            },
          },
          select: { indicatorKey: true },
        })
      : [];
  const seenKeys = new Set(sidebarSeen.map((entry) => entry.indicatorKey));
  const sidebarItems = sidebarCandidates.map((candidate) => ({
    ...candidate,
    unread: !seenKeys.has(candidate.key),
  }));

  const validUntil = computeValidUntil({
    now,
    timeZone: gamificationSummary.summary.timeZone,
    deadlines: [
      ...events.map((event) => event.closesAt),
      ...cohorts.map((cohort) => cohort.endsAt),
      ...enrollments.map((enrollment) => enrollment.expiresAt),
    ],
  });

  const base = {
    indexToken,
    indexSchema: INDEX_SCHEMA,
    generatedAt: now.toISOString(),
    organizationId: input.organizationId ?? null,
    validUntil: validUntil.toISOString(),
    learner,
  } satisfies LearnerIndexBase<Record<never, never>>;

  return {
    ...base,
    organizations,
    courses,
    cohorts,
    events,
    milestones,
    attempts,
    gamification: gamificationSummary,
    practice: {
      vocabulary: vocabularyPractice,
      assessment: assessmentPractice,
    },
    sidebarIndicators: {
      unreadCount: sidebarItems.filter((item) => item.unread).length,
      items: sidebarItems,
    },
    resumableAttempts: Object.fromEntries(resumableAttemptEntries),
  };
}

/** Output of `mobileSyncV2.getIndex` (`status: "ok"`). */
export type LearnerIndex = Awaited<ReturnType<typeof buildLearnerIndex>>;
