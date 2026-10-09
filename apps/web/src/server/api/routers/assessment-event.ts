import { TRPCError } from "@trpc/server";
import {
  assessmentContentAssetIds,
  resolveAssessmentEntry,
} from "@hakgyo/shared";
import { z } from "zod";

import { after } from "next/server";

import { Prisma, type PrismaClient } from "../../../../generated/prisma/client";
import { assertAssessmentComplete } from "~/server/course/readiness-service";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { userSearchWhere } from "~/server/api/user-search";
import { lockAttemptStart } from "~/server/assessment/attempt";
import {
  countLatestAssessmentEventAttemptStatuses,
  getAssessmentEventLeaderboard,
} from "~/server/assessment/event-leaderboard";
import {
  addEventCohorts,
  closeAssessmentEvent,
  finalizeClosedEvent,
  openAssessmentEvent,
  scheduleAssessmentEvent,
} from "~/server/assessment/event-lifecycle";
import {
  assertCanReviewCohort,
  assertTargetableCohorts,
  eventEnrollmentSql,
  eventEnrollmentWhere,
  findEligibleEventCohort,
  learnerEventWhere,
  requireEventAccess,
  resolveEventAccess,
  targetableCohortWhere,
} from "~/server/assessment/event-targets";
import { deleteAssessmentEventWithProgress } from "~/server/content/resource-deletion";
import {
  requireCohortPermission,
  requireCoursePermission,
} from "~/server/authorization";
import {
  isUniqueConstraintError,
  withTransactionRetry,
} from "~/server/db-retry";
import {
  notifyEventCancelled,
  notifyEventOpened,
  notifyInBackground,
  notifyParticipationInvalidated,
} from "~/server/notifications/triggers";

const id = z.string().min(1);
const reason = z.string().trim().min(3).max(1000);
/** "Notify learners" checkbox; pushes go out after the write commits. */
const notify = z.boolean().default(true);
const cohortIds = z.array(id).max(200);
const MANAGE_PAGE_SIZE = 10;
const PARTICIPANT_PAGE_SIZE = 20;
/** Attempts graded right after a manual close; the lifecycle cron grades the rest. */
const CLOSE_FINALIZE_BUDGET = 4;

const targetCohortSelect = {
  id: true,
  name: true,
  defaultForCourseId: true,
} satisfies Prisma.CohortSelect;

/**
 * Event summary fields without relation counts. A relation `_count` in `findMany` compiles to a
 * whole-table grouped subquery, so list queries use this select and attach counts for their page
 * with `withEventSummaryCounts`. Single-row queries keep the counts in `eventSummarySelect`.
 */
const eventSummaryBaseSelect = {
  id: true,
  title: true,
  type: true,
  status: true,
  allCohorts: true,
  durationMinutes: true,
  opensAt: true,
  openedAt: true,
  closesAt: true,
  closedAt: true,
  cancelledAt: true,
  createdAt: true,
  course: { select: { id: true, title: true } },
  courseItem: {
    select: {
      id: true,
      assessment: {
        select: {
          id: true,
          title: true,
          description: true,
          passingScore: true,
          maxAttempts: true,
        },
      },
    },
  },
} satisfies Prisma.AssessmentEventSelect;
const eventSummarySelect = {
  ...eventSummaryBaseSelect,
  courseItem: {
    select: {
      ...eventSummaryBaseSelect.courseItem.select,
      assessment: {
        select: {
          ...eventSummaryBaseSelect.courseItem.select.assessment.select,
          _count: { select: { questions: true } },
        },
      },
    },
  },
  _count: { select: { participants: true, attempts: true } },
} satisfies Prisma.AssessmentEventSelect;
/** Staff views also list the targeted classes. */
const staffTargetsSelect = {
  cohorts: {
    orderBy: [{ cohort: { name: "asc" } }, { cohortId: "asc" }],
    select: { cohort: { select: targetCohortSelect } },
  },
} satisfies Prisma.AssessmentEventSelect;

function shapeTargets(
  targets: Array<{
    cohort: { id: string; name: string; defaultForCourseId: string | null };
  }>,
) {
  return targets.map(({ cohort }) => ({
    id: cohort.id,
    name: cohort.name,
    selfPaced: cohort.defaultForCourseId !== null,
  }));
}

type EventSummaryRow = {
  id: string;
  courseItem: { assessment: { id: string } | null };
};
type WithEventSummaryCounts<T extends EventSummaryRow> = Omit<
  T,
  "courseItem"
> & {
  courseItem: Omit<T["courseItem"], "assessment"> & {
    assessment:
      | (NonNullable<T["courseItem"]["assessment"]> & {
          _count: { questions: number };
        })
      | null;
  };
  _count: { participants: number; attempts: number };
};

/** Adds the `eventSummarySelect` counts to rows loaded with `eventSummaryBaseSelect`. */
async function withEventSummaryCounts<T extends EventSummaryRow>(
  db: Prisma.TransactionClient | Prisma.DefaultPrismaClient,
  events: T[],
): Promise<WithEventSummaryCounts<T>[]> {
  if (events.length === 0) return [];
  const eventIds = events.map((event) => event.id);
  const assessmentIds = [
    ...new Set(
      events.flatMap((event) =>
        event.courseItem.assessment ? [event.courseItem.assessment.id] : [],
      ),
    ),
  ];
  const [participantGroups, attemptGroups, questionGroups] = await Promise.all([
    db.assessmentEventParticipant.groupBy({
      by: ["eventId"],
      where: { eventId: { in: eventIds } },
      _count: { _all: true },
    }),
    db.assessmentAttempt.groupBy({
      by: ["assessmentEventId"],
      where: { assessmentEventId: { in: eventIds } },
      _count: { _all: true },
    }),
    assessmentIds.length
      ? db.assessmentQuestion.groupBy({
          by: ["assessmentId"],
          where: { assessmentId: { in: assessmentIds } },
          _count: { _all: true },
        })
      : [],
  ]);
  const participants = new Map(
    participantGroups.map((group) => [group.eventId, group._count._all]),
  );
  const attempts = new Map(
    attemptGroups.map((group) => [group.assessmentEventId, group._count._all]),
  );
  const questions = new Map(
    questionGroups.map((group) => [group.assessmentId, group._count._all]),
  );
  return events.map((event) => {
    const assessment = event.courseItem.assessment;
    // Generic spreads are not narrowed by TypeScript; the shape matches the declared type.
    return {
      ...event,
      courseItem: {
        ...event.courseItem,
        assessment: assessment
          ? {
              ...assessment,
              _count: { questions: questions.get(assessment.id) ?? 0 },
            }
          : null,
      },
      _count: {
        participants: participants.get(event.id) ?? 0,
        attempts: attempts.get(event.id) ?? 0,
      },
    } as unknown as WithEventSummaryCounts<T>;
  });
}
const learnerAttemptSelect = {
  id: true,
  attemptNumber: true,
  status: true,
  score: true,
  maxScore: true,
  startedAt: true,
  submittedAt: true,
} satisfies Prisma.AssessmentAttemptSelect;
const LEARNER_CLOSED_EVENT_LIMIT = 100;
const LEARNER_LEADERBOARD_LIMIT = 50;
const eventStatusOrder = [
  "DRAFT",
  "OPEN",
  "SCHEDULED",
  "CLOSED",
  "CANCELLED",
] as const;

/** Open events first, then upcoming ones, then history; each by closing time. */
function compareLearnerEvents(
  left: { status: string; closesAt: Date | null; createdAt: Date },
  right: { status: string; closesAt: Date | null; createdAt: Date },
) {
  const status =
    eventStatusOrder.indexOf(left.status as (typeof eventStatusOrder)[number]) -
    eventStatusOrder.indexOf(right.status as (typeof eventStatusOrder)[number]);
  if (status) return status;
  // PostgreSQL sorts NULLs last in ascending order.
  if (left.closesAt?.getTime() !== right.closesAt?.getTime()) {
    if (!left.closesAt) return 1;
    if (!right.closesAt) return -1;
    return left.closesAt.getTime() - right.closesAt.getTime();
  }
  return right.createdAt.getTime() - left.createdAt.getTime();
}

/** Learners can start an open event, or a scheduled one whose opening time has passed. */
function isEventAvailable(
  event: { status: string; opensAt: Date | null; closesAt: Date | null },
  now: Date,
) {
  const started =
    event.status === "OPEN" ||
    (event.status === "SCHEDULED" &&
      event.opensAt !== null &&
      event.opensAt <= now);
  return started && Boolean(event.closesAt && event.closesAt > now);
}

/** The learner's own view of an event: their class, participation and latest attempt. */
function learnerEventSelect(userId: string, now: Date) {
  const { cohort, ...membership } = eventEnrollmentWhere(now);
  return {
    participants: {
      where: { userId },
      select: {
        invalidatedAt: true,
        invalidationReason: true,
        cohort: { select: { id: true, name: true } },
      },
    },
    // The learner's targeted class when they are not a participant yet.
    cohorts: {
      where: {
        cohort: {
          ...cohort,
          enrollments: { some: { ...membership, userId } },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 1,
      select: { cohort: { select: { id: true, name: true } } },
    },
    attempts: {
      where: { userId },
      orderBy: { attemptNumber: "desc" },
      take: 1,
      select: learnerAttemptSelect,
    },
  } satisfies Prisma.AssessmentEventSelect;
}

type LearnerEventRow = {
  status: string;
  opensAt: Date | null;
  closesAt: Date | null;
  participants: Array<{
    invalidatedAt: Date | null;
    invalidationReason: string | null;
    cohort: { id: string; name: string } | null;
  }>;
  cohorts: Array<{ cohort: { id: string; name: string } }>;
  attempts: Array<
    Prisma.AssessmentAttemptGetPayload<{
      select: typeof learnerAttemptSelect;
    }>
  >;
  courseItem: { assessment: { maxAttempts: number | null } | null };
};

/** Shared learner shaping: entry decision, withheld scores and the learner's class. */
function shapeLearnerEvent<T extends LearnerEventRow>(
  { cohorts, ...event }: T,
  attemptCount: number,
  now: Date,
) {
  const latestAttempt = event.attempts[0];
  const participant = event.participants[0];
  const invalidated = Boolean(participant?.invalidatedAt);
  const resultsWithheld = invalidated || event.status === "CANCELLED";
  const entry = resolveAssessmentEntry({
    attemptStatus: latestAttempt?.status,
    attemptsUsed: attemptCount,
    maxAttempts: event.courseItem.assessment?.maxAttempts ?? null,
    available: isEventAvailable(event, now),
    invalidated: resultsWithheld,
  });
  const graded = latestAttempt?.status === "GRADED" && !resultsWithheld;
  return {
    ...event,
    // Kept for app versions that predate class-targeted events.
    scope: "COHORT" as const,
    cohort: participant?.cohort ?? cohorts[0]?.cohort ?? null,
    attemptCount,
    entry,
    attempts: latestAttempt
      ? [
          {
            ...latestAttempt,
            score: graded ? latestAttempt.score : null,
            maxScore: graded ? latestAttempt.maxScore : null,
          },
        ]
      : [],
  };
}

const eventTarget = z
  .object({
    allCohorts: z.boolean(),
    cohortIds,
  })
  .refine((target) => target.allCohorts || target.cohortIds.length > 0, {
    message: "Pilih setidaknya satu kelas.",
  });

/** Manage access for a prospective target set, or FORBIDDEN. */
async function requireTargetManagement(
  db: Prisma.TransactionClient | Prisma.DefaultPrismaClient,
  input: {
    courseId: string;
    allCohorts: boolean;
    cohortIds: string[];
    userId: string;
  },
) {
  await assertTargetableCohorts(db, input.courseId, input.cohortIds);
  const access = await resolveEventAccess(input);
  if (!access?.manage) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: input.allCohorts
        ? "Hanya pengelola course yang bisa membuat event untuk semua kelas."
        : "Kamu hanya bisa memilih kelas yang kamu ajar.",
    });
  }
}

/** Assets referenced by the assessment's instructions, questions and options. */
async function loadAssessmentMediaAssetIds(
  db: Prisma.TransactionClient | Prisma.DefaultPrismaClient,
  assessmentId: string,
) {
  const assessment = await db.assessment.findUnique({
    where: { id: assessmentId },
    select: {
      instructions: true,
      questions: {
        orderBy: { position: "asc" },
        select: { prompt: true, options: { select: { content: true } } },
      },
    },
  });
  return assessment ? assessmentContentAssetIds(assessment) : [];
}

/** Grades a few batches right away; the lifecycle cron finishes larger events. */
function finalizeAfterClose(db: PrismaClient, eventId: string) {
  const run = async () => {
    for (let batch = 0; batch < CLOSE_FINALIZE_BUDGET; batch += 1) {
      const step = await finalizeClosedEvent(db, eventId);
      if (step.done || step.graded === 0) return;
    }
  };
  const guarded = () =>
    run().catch((error: unknown) => {
      console.error("Failed to auto-submit attempts of a closed event", {
        eventId,
        error,
      });
    });
  try {
    after(guarded);
    return Promise.resolve();
  } catch {
    // Outside a Next.js request scope (e.g. MCP, tests): grade inline.
    return guarded();
  }
}

export const assessmentEventRouter = createTRPCRouter({
  /** Assessments of the course that can run as an event. */
  listAssessmentItems: protectedProcedure
    .input(z.object({ courseId: id, cohortId: id.optional() }))
    .query(async ({ ctx, input }) => {
      if (input.cohortId) {
        const cohort = await requireCohortPermission({
          cohortId: input.cohortId,
          permission: "assessment.review",
          userId: ctx.actorUserId,
        });
        if (cohort.courseId !== input.courseId) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
      } else {
        await requireCoursePermission({
          courseId: input.courseId,
          permission: "course.manage",
          userId: ctx.actorUserId,
        });
      }
      return ctx.db.courseItem.findMany({
        where: {
          type: "ASSESSMENT",
          isPublished: true,
          module: { courseId: input.courseId },
          assessment: { questions: { some: {} } },
        },
        orderBy: [{ module: { position: "asc" } }, { position: "asc" }],
        select: {
          id: true,
          module: { select: { id: true, title: true, position: true } },
          assessment: {
            select: {
              id: true,
              title: true,
              description: true,
              timeLimitMinutes: true,
              updatedAt: true,
              _count: { select: { questions: true } },
            },
          },
        },
      });
    }),

  /**
   * Classes an event of the course can target, with their eligible learners and average
   * curriculum progress, and whether the caller may pick them.
   */
  listTargetCohorts: protectedProcedure
    .input(z.object({ courseId: id }))
    .query(async ({ ctx, input }) => {
      await requireCoursePermission({
        courseId: input.courseId,
        permission: "course.view",
        userId: ctx.actorUserId,
      });
      const now = new Date();
      const cohorts = await ctx.db.cohort.findMany({
        where: targetableCohortWhere(input.courseId),
        orderBy: [
          { defaultForCourseId: "asc" },
          { name: "asc" },
          { id: "asc" },
        ],
        select: { ...targetCohortSelect, status: true },
      });
      const [stats, access, courseAccess] = await Promise.all([
        ctx.db.$queryRaw<
          Array<{
            cohortId: string;
            learnerCount: number;
            averageCompleted: number | null;
            itemCount: number;
          }>
        >`
          WITH items AS (
            SELECT item."id"
            FROM "CourseItem" AS item
            JOIN "CourseModule" AS module ON module."id" = item."moduleId"
            WHERE module."courseId" = ${input.courseId} AND item."isPublished"
          ),
          learners AS (
            SELECT DISTINCT enrollment."cohortId", enrollment."userId"
            FROM "CohortEnrollment" AS enrollment
            JOIN "Cohort" AS cohort ON cohort."id" = enrollment."cohortId"
            WHERE cohort."courseId" = ${input.courseId}
              AND ${eventEnrollmentSql(now)}
          ),
          completed AS (
            SELECT learners."cohortId", learners."userId", COUNT(progress."id") AS "done"
            FROM learners
            LEFT JOIN "ContentProgress" AS progress
              ON progress."userId" = learners."userId"
              AND progress."status" = 'COMPLETED'
              AND progress."courseItemId" IN (SELECT "id" FROM items)
            GROUP BY learners."cohortId", learners."userId"
          )
          SELECT
            completed."cohortId",
            COUNT(*)::int AS "learnerCount",
            AVG(completed."done")::float AS "averageCompleted",
            (SELECT COUNT(*) FROM items)::int AS "itemCount"
          FROM completed
          GROUP BY completed."cohortId"
        `,
        Promise.all(
          cohorts.map((cohort) =>
            resolveEventAccess({
              courseId: input.courseId,
              allCohorts: false,
              cohortIds: [cohort.id],
              userId: ctx.actorUserId,
            }),
          ),
        ),
        // Only course managers have access without any class.
        resolveEventAccess({
          courseId: input.courseId,
          allCohorts: true,
          cohortIds: [],
          userId: ctx.actorUserId,
        }),
      ]);
      const statsByCohort = new Map(stats.map((row) => [row.cohortId, row]));
      return {
        canTargetAll: Boolean(courseAccess?.manage),
        cohorts: cohorts.map((cohort, index) => {
          const row = statsByCohort.get(cohort.id);
          return {
            id: cohort.id,
            name: cohort.name,
            status: cohort.status,
            selfPaced: cohort.defaultForCourseId !== null,
            learnerCount: row?.learnerCount ?? 0,
            averageProgress:
              row && row.itemCount > 0 && row.averageCompleted !== null
                ? Math.round((row.averageCompleted * 100) / row.itemCount)
                : null,
            canTarget: Boolean(access[index]?.manage),
          };
        }),
      };
    }),

  /**
   * Events of the course (course managers), or the events of one class: those targeting it,
   * plus "all classes" drafts that will include it.
   */
  listManageable: protectedProcedure
    .input(
      z.object({
        courseId: id,
        cohortId: id.optional(),
        page: z.number().int().min(1).default(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (input.cohortId) {
        const cohort = await requireCohortPermission({
          cohortId: input.cohortId,
          permission: "assessment.review",
          userId: ctx.actorUserId,
        });
        if (cohort.courseId !== input.courseId) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
      } else {
        await requireCoursePermission({
          courseId: input.courseId,
          permission: "course.manage",
          userId: ctx.actorUserId,
        });
      }
      const where: Prisma.AssessmentEventWhereInput = {
        courseId: input.courseId,
        ...(input.cohortId
          ? {
              OR: [
                { cohorts: { some: { cohortId: input.cohortId } } },
                { allCohorts: true, status: "DRAFT" },
              ],
            }
          : {}),
      };
      const [items, total] = await Promise.all([
        ctx.db.assessmentEvent.findMany({
          where,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          select: { ...eventSummaryBaseSelect, ...staffTargetsSelect },
          skip: (input.page - 1) * MANAGE_PAGE_SIZE,
          take: MANAGE_PAGE_SIZE,
        }),
        ctx.db.assessmentEvent.count({ where }),
      ]);
      const withCounts = await withEventSummaryCounts(ctx.db, items);
      const access = await Promise.all(
        items.map((event) =>
          resolveEventAccess({
            courseId: input.courseId,
            allCohorts: event.allCohorts,
            cohortIds: event.cohorts.map((target) => target.cohort.id),
            userId: ctx.actorUserId,
          }),
        ),
      );
      return {
        items: withCounts.map(({ cohorts, ...event }, index) => ({
          ...event,
          targets: shapeTargets(cohorts),
          canManage: Boolean(access[index]?.manage),
        })),
        total,
        pageCount: Math.ceil(total / MANAGE_PAGE_SIZE),
      };
    }),

  /**
   * Creates an event for one or more classes (or every class) of the course and saves it as a
   * draft, schedules it or opens it right away.
   */
  create: protectedProcedure
    .input(
      z.object({
        courseId: id,
        courseItemId: id,
        type: z.enum(["QUICK_ASSESSMENT", "TRYOUT"]),
        target: eventTarget,
        title: z.string().trim().min(1).max(200),
        durationMinutes: z.number().int().min(1).max(480),
        closesAt: z.coerce.date(),
        start: z.discriminatedUnion("mode", [
          z.object({ mode: z.literal("draft") }),
          z.object({ mode: z.literal("now"), notify }),
          z.object({
            mode: z.literal("schedule"),
            opensAt: z.coerce.date(),
            notify,
          }),
        ]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      const targetCohortIds = input.target.allCohorts
        ? []
        : [...new Set(input.target.cohortIds)];
      const course = await ctx.db.course.findUnique({
        where: { id: input.courseId },
        select: { organizationId: true },
      });
      if (!course) throw new TRPCError({ code: "NOT_FOUND" });
      await requireTargetManagement(ctx.db, {
        courseId: input.courseId,
        allCohorts: input.target.allCohorts,
        cohortIds: targetCohortIds,
        userId: ctx.actorUserId,
      });
      if (input.closesAt <= now) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Waktu tutup harus di masa depan.",
        });
      }
      const item = await ctx.db.courseItem.findFirst({
        where: {
          id: input.courseItemId,
          type: "ASSESSMENT",
          isPublished: true,
          module: { courseId: input.courseId },
        },
        select: { id: true, organizationId: true, assessmentId: true },
      });
      if (
        item?.organizationId !== course.organizationId ||
        !item.assessmentId
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Pilih tugas yang tampil di course ini.",
        });
      }
      // Events need a complete assessment (questions, options, answer key).
      await assertAssessmentComplete(ctx.db, item.assessmentId);
      const membership = await ctx.db.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: course.organizationId,
            userId: ctx.actorUserId,
          },
        },
        select: { id: true },
      });
      if (!membership) throw new TRPCError({ code: "FORBIDDEN" });
      const created = await ctx.db.assessmentEvent.create({
        data: {
          organizationId: course.organizationId,
          courseId: input.courseId,
          courseItemId: input.courseItemId,
          createdByMembershipId: membership.id,
          type: input.type,
          allCohorts: input.target.allCohorts,
          title: input.title,
          durationMinutes: input.durationMinutes,
          closesAt: input.closesAt,
          cohorts: {
            create: targetCohortIds.map((cohortId) => ({ cohortId })),
          },
        },
        select: { id: true },
      });
      // A failed opening or scheduling leaves nothing behind: the draft is removed again.
      const discardDraft = () =>
        ctx.db.assessmentEvent
          .deleteMany({ where: { id: created.id, status: "DRAFT" } })
          .catch((error: unknown) => {
            console.error("Failed to discard an event draft", error);
          });
      let participantCount: number | null = null;
      if (input.start.mode === "now") {
        try {
          const opened = await openAssessmentEvent(ctx.db, {
            eventId: created.id,
            now,
            automatic: false,
            actorMembershipId: membership.id,
          });
          participantCount = opened.opened ? opened.participantCount : null;
        } catch (error) {
          await discardDraft();
          throw error;
        }
        if (input.start.notify) {
          await notifyInBackground("event opened", () =>
            notifyEventOpened(created.id),
          );
        }
      } else if (input.start.mode === "schedule") {
        try {
          await scheduleAssessmentEvent(ctx.db, {
            eventId: created.id,
            opensAt: input.start.opensAt,
            notify: input.start.notify,
            actorMembershipId: membership.id,
            now,
          });
        } catch (error) {
          await discardDraft();
          throw error;
        }
      }
      const event = await ctx.db.assessmentEvent.findUniqueOrThrow({
        where: { id: created.id },
        select: { ...eventSummarySelect, ...staffTargetsSelect },
      });
      const { cohorts, ...rest } = event;
      return { ...rest, targets: shapeTargets(cohorts), participantCount };
    }),

  open: protectedProcedure
    .input(z.object({ eventId: id, notify }))
    .mutation(async ({ ctx, input }) => {
      const { membership } = await requireEventAccess(
        ctx.db,
        input.eventId,
        ctx.actorUserId,
        "manage",
      );
      const result = await openAssessmentEvent(ctx.db, {
        eventId: input.eventId,
        now: new Date(),
        automatic: false,
        actorMembershipId: membership.id,
      });
      if (input.notify) {
        await notifyInBackground("event opened", () =>
          notifyEventOpened(input.eventId),
        );
      }
      return {
        opened: true,
        participantCount: result.opened ? result.participantCount : 0,
      };
    }),

  schedule: protectedProcedure
    .input(z.object({ eventId: id, opensAt: z.coerce.date(), notify }))
    .mutation(async ({ ctx, input }) => {
      const { membership } = await requireEventAccess(
        ctx.db,
        input.eventId,
        ctx.actorUserId,
        "manage",
      );
      return scheduleAssessmentEvent(ctx.db, {
        eventId: input.eventId,
        opensAt: input.opensAt,
        notify: input.notify,
        actorMembershipId: membership.id,
        now: new Date(),
      });
    }),

  close: protectedProcedure
    .input(z.object({ eventId: id }))
    .mutation(async ({ ctx, input }) => {
      const { membership } = await requireEventAccess(
        ctx.db,
        input.eventId,
        ctx.actorUserId,
        "manage",
      );
      const closed = await closeAssessmentEvent(ctx.db, {
        eventId: input.eventId,
        closedAt: new Date(),
        actorMembershipId: membership.id,
      });
      if (!closed) {
        // Closing an already closed event re-runs the grading below, which
        // recovers attempts a failed or interrupted auto-submit left open.
        const event = await ctx.db.assessmentEvent.findUnique({
          where: { id: input.eventId },
          select: { status: true },
        });
        if (event?.status !== "CLOSED") {
          throw new TRPCError({ code: "CONFLICT" });
        }
      }
      // Learners can no longer save or submit once the event is closed, so the attempts still
      // in progress are graded as submitted at closing time: a few batches after the response,
      // the rest by the lifecycle cron.
      await finalizeAfterClose(ctx.db, input.eventId);
      return { closed: true };
    }),

  cancel: protectedProcedure
    .input(z.object({ eventId: id, reason, notify }))
    .mutation(async ({ ctx, input }) => {
      const { membership } = await requireEventAccess(
        ctx.db,
        input.eventId,
        ctx.actorUserId,
        "manage",
      );
      const result = await ctx.db.$transaction(async (tx) => {
        const now = new Date();
        const updated = await tx.assessmentEvent.updateMany({
          where: {
            id: input.eventId,
            status: { in: ["DRAFT", "SCHEDULED", "OPEN"] },
          },
          data: { status: "CANCELLED", cancelledAt: now },
        });
        if (updated.count !== 1) throw new TRPCError({ code: "CONFLICT" });
        await tx.assessmentEventAudit.create({
          data: {
            eventId: input.eventId,
            actorMembershipId: membership.id,
            action: "CANCELLED",
            reason: input.reason,
          },
        });
        return { cancelled: true };
      });
      // Only opened events have participants to notify.
      if (input.notify) {
        await notifyInBackground("event cancelled", () =>
          notifyEventCancelled(input.eventId, input.reason),
        );
      }
      return result;
    }),

  delete: protectedProcedure
    .input(z.object({ eventId: id }))
    .mutation(async ({ ctx, input }) => {
      const { membership } = await requireEventAccess(
        ctx.db,
        input.eventId,
        ctx.actorUserId,
        "manage",
      );
      const removed = await ctx.db.$transaction((tx) =>
        deleteAssessmentEventWithProgress(tx, input.eventId),
      );
      return { deleted: true, actorMembershipId: membership.id, removed };
    }),

  /** Adds classes to an event that has not closed yet; classes are never removed. */
  addCohorts: protectedProcedure
    .input(z.object({ eventId: id, cohortIds: cohortIds.min(1), notify }))
    .mutation(async ({ ctx, input }) => {
      const { event, membership } = await requireEventAccess(
        ctx.db,
        input.eventId,
        ctx.actorUserId,
        "manage",
      );
      await requireTargetManagement(ctx.db, {
        courseId: event.courseId,
        allCohorts: event.allCohorts,
        cohortIds: [
          ...new Set([
            ...event.cohorts.map((target) => target.cohortId),
            ...input.cohortIds,
          ]),
        ],
        userId: ctx.actorUserId,
      });
      const result = await addEventCohorts(ctx.db, {
        eventId: input.eventId,
        cohortIds: input.cohortIds,
        actorMembershipId: membership.id,
        now: new Date(),
      });
      if (result.open && result.added.length > 0 && input.notify) {
        await notifyInBackground("event classes added", () =>
          notifyEventOpened(input.eventId, result.added),
        );
      }
      return {
        added: result.added.length,
        participantCount: result.participantCount,
      };
    }),

  startAttempt: protectedProcedure
    .input(z.object({ eventId: id }))
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      // A scheduled event that is due opens on the first start instead of waiting for the cron.
      const due = await ctx.db.assessmentEvent.findFirst({
        where: {
          id: input.eventId,
          status: "SCHEDULED",
          opensAt: { lte: now },
        },
        select: { id: true, notifyOnOpen: true },
      });
      if (due) {
        const opened = await openAssessmentEvent(ctx.db, {
          eventId: due.id,
          now,
          automatic: true,
        });
        if (opened.opened && opened.notify) {
          await notifyInBackground("event opened", () =>
            notifyEventOpened(due.id),
          );
        }
      }
      // READ COMMITTED + a per-learner/item advisory lock (shared with standalone attempts, which
      // use the same attempt numbering). The (courseItemId, userId, attemptNumber) unique
      // constraint stays as a backstop: on P2002 the transaction re-runs and returns the
      // in-progress attempt created by the winner.
      return withTransactionRetry(
        () =>
          ctx.db.$transaction(async (tx) => {
            // FOR SHARE makes `close` wait for in-flight starts, so its auto-submit sees them.
            const [eventItem] = await tx.$queryRaw<
              Array<{ courseItemId: string }>
            >`
              SELECT "courseItemId" FROM "AssessmentEvent"
              WHERE "id" = ${input.eventId}
              FOR SHARE
            `;
            if (!eventItem) throw new TRPCError({ code: "NOT_FOUND" });
            await lockAttemptStart(tx, ctx.actorUserId, eventItem.courseItemId);
            const event = await tx.assessmentEvent.findUnique({
              where: { id: input.eventId },
              select: {
                id: true,
                status: true,
                closesAt: true,
                courseId: true,
                courseItemId: true,
                organizationId: true,
                participants: {
                  where: { userId: ctx.actorUserId },
                  select: {
                    invalidatedAt: true,
                    cohort: {
                      select: { id: true, defaultForCourseId: true },
                    },
                  },
                },
                courseItem: {
                  select: {
                    isPublished: true,
                    assessment: {
                      select: {
                        id: true,
                        maxAttempts: true,
                      },
                    },
                  },
                },
              },
            });
            if (!event) throw new TRPCError({ code: "NOT_FOUND" });
            let participant = event.participants[0];
            if (participant?.invalidatedAt) {
              throw new TRPCError({ code: "NOT_FOUND" });
            }
            if (
              event.status !== "OPEN" ||
              !event.closesAt ||
              event.closesAt <= new Date()
            ) {
              throw new TRPCError({
                code: participant ? "PRECONDITION_FAILED" : "NOT_FOUND",
                message: participant
                  ? "Tugas atau tryout ini sudah ditutup."
                  : undefined,
              });
            }
            if (!participant) {
              // Learners who joined a targeted class after the event opened take part now.
              const cohortId = await findEligibleEventCohort(
                tx,
                event.id,
                ctx.actorUserId,
                now,
              );
              if (!cohortId) throw new TRPCError({ code: "NOT_FOUND" });
              const joined = await tx.assessmentEventParticipant.upsert({
                where: {
                  eventId_userId: {
                    eventId: event.id,
                    userId: ctx.actorUserId,
                  },
                },
                create: {
                  eventId: event.id,
                  userId: ctx.actorUserId,
                  cohortId,
                },
                update: {},
                select: {
                  invalidatedAt: true,
                  cohort: { select: { id: true, defaultForCourseId: true } },
                },
              });
              if (joined.invalidatedAt) {
                throw new TRPCError({ code: "NOT_FOUND" });
              }
              participant = joined;
            }
            if (!event.courseItem.isPublished || !event.courseItem.assessment) {
              throw new TRPCError({
                code: "PRECONDITION_FAILED",
                message: "Tugas ini sudah tidak tersedia.",
              });
            }
            const current = await tx.assessmentAttempt.findFirst({
              where: {
                assessmentEventId: event.id,
                userId: ctx.actorUserId,
                status: "IN_PROGRESS",
              },
              orderBy: { attemptNumber: "desc" },
            });
            if (current) return { ...current, courseId: event.courseId };
            // One grouped query serves both the per-event limit and the item-wide attempt number
            // (event attempts always use the event's course item).
            const attemptGroups = await tx.assessmentAttempt.groupBy({
              by: ["assessmentEventId"],
              where: {
                courseItemId: event.courseItemId,
                userId: ctx.actorUserId,
              },
              _count: { _all: true },
              _max: { attemptNumber: true },
            });
            const eventAttemptCount =
              attemptGroups.find(
                (group) => group.assessmentEventId === event.id,
              )?._count._all ?? 0;
            if (
              event.courseItem.assessment.maxAttempts !== null &&
              eventAttemptCount >= event.courseItem.assessment.maxAttempts
            ) {
              throw new TRPCError({
                code: "FORBIDDEN",
                message: "Batas jumlah pengerjaan sudah tercapai.",
              });
            }
            // max + 1 (not count + 1): numbers stay unique after an event's attempts are deleted.
            const attemptNumber =
              attemptGroups.reduce(
                (max, group) => Math.max(max, group._max.attemptNumber ?? 0),
                0,
              ) + 1;
            // Like chapter attempts, event attempts carry the learner's class but never the
            // self-paced cohort.
            const attemptCohortId =
              participant.cohort && !participant.cohort.defaultForCourseId
                ? participant.cohort.id
                : null;
            const created = await tx.assessmentAttempt.create({
              data: {
                assessmentId: event.courseItem.assessment.id,
                courseItemId: event.courseItemId,
                organizationId: event.organizationId,
                cohortId: attemptCohortId,
                userId: ctx.actorUserId,
                attemptNumber,
                shuffleSeed: crypto.randomUUID(),
                assessmentEventId: event.id,
              },
            });
            return { ...created, courseId: event.courseId };
          }),
        { shouldRetry: isUniqueConstraintError },
      );
    }),

  listForLearner: protectedProcedure
    .input(
      z
        .object({
          organizationId: id.optional(),
          /** Upcoming (scheduled) events; app versions that predate them leave this unset. */
          includeScheduled: z.boolean().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      // Every scheduled/open event is returned; closed history is bounded to the most recent
      // ones. The display order (status, closesAt, createdAt desc) is restored in memory.
      const now = new Date();
      const visible = learnerEventWhere(ctx.actorUserId, now, {
        includeScheduled: input?.includeScheduled ?? false,
      });
      const select = {
        ...eventSummaryBaseSelect,
        ...learnerEventSelect(ctx.actorUserId, now),
      } satisfies Prisma.AssessmentEventSelect;
      const [activeEvents, closedEvents, attemptCounts] = await Promise.all([
        ctx.db.assessmentEvent.findMany({
          where: {
            AND: [
              visible,
              {
                organizationId: input?.organizationId,
                status: { in: ["SCHEDULED", "OPEN"] },
              },
            ],
          },
          select,
        }),
        ctx.db.assessmentEvent.findMany({
          where: {
            AND: [
              visible,
              { organizationId: input?.organizationId, status: "CLOSED" },
            ],
          },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: LEARNER_CLOSED_EVENT_LIMIT,
          select,
        }),
        ctx.db.assessmentAttempt.groupBy({
          by: ["assessmentEventId"],
          where: {
            organizationId: input?.organizationId,
            userId: ctx.actorUserId,
            assessmentEventId: { not: null },
          },
          _count: { _all: true },
        }),
      ]);
      const attemptCountByEventId = new Map(
        attemptCounts.map((group) => [
          group.assessmentEventId,
          group._count._all,
        ]),
      );
      const events = await withEventSummaryCounts(ctx.db, [
        ...activeEvents,
        ...closedEvents,
      ]);
      return events
        .sort(compareLearnerEvents)
        .map((event) =>
          shapeLearnerEvent(
            event,
            attemptCountByEventId.get(event.id) ?? 0,
            now,
          ),
        );
    }),

  getForLearner: protectedProcedure
    .input(z.object({ eventId: id }))
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const [event, attemptCount] = await Promise.all([
        ctx.db.assessmentEvent.findFirst({
          where: {
            AND: [
              { id: input.eventId },
              learnerEventWhere(ctx.actorUserId, now, {
                includeScheduled: true,
              }),
            ],
          },
          select: {
            ...eventSummarySelect,
            ...learnerEventSelect(ctx.actorUserId, now),
          },
        }),
        ctx.db.assessmentAttempt.count({
          where: { assessmentEventId: input.eventId, userId: ctx.actorUserId },
        }),
      ]);
      if (!event) throw new TRPCError({ code: "NOT_FOUND" });
      const learnerEvent = shapeLearnerEvent(event, attemptCount, now);
      // Images and audio the learner can download ahead, once the event has opened (never
      // before, so listening material is not handed out early).
      const mediaAssetIds =
        (learnerEvent.entry.canStart ||
          learnerEvent.entry.canReattempt ||
          learnerEvent.entry.state === "IN_PROGRESS") &&
        event.courseItem.assessment
          ? await loadAssessmentMediaAssetIds(
              ctx.db,
              event.courseItem.assessment.id,
            )
          : [];
      if (
        event.status !== "CLOSED" &&
        (learnerEvent.entry.state === "NOT_STARTED" ||
          learnerEvent.entry.state === "IN_PROGRESS")
      )
        return { ...learnerEvent, mediaAssetIds, leaderboard: null };
      // Top entries plus the learner's own row, ranked in SQL.
      const leaderboard = await getAssessmentEventLeaderboard(ctx.db, {
        eventId: event.id,
        limit: LEARNER_LEADERBOARD_LIMIT,
        userId: ctx.actorUserId,
      });
      return { ...learnerEvent, mediaAssetIds, leaderboard };
    }),

  /**
   * Event detail for staff. Class staff who do not manage the event only see the participants
   * of the classes they review; the leaderboard always covers every class.
   */
  getManageable: protectedProcedure
    .input(
      z.object({
        eventId: id,
        page: z.number().int().min(1).default(1),
        search: z.string().trim().max(200).optional(),
        status: z
          .enum(["IN_PROGRESS", "IN_REVIEW", "GRADED", "NOT_STARTED"])
          .optional(),
        cohortId: id.optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { access } = await requireEventAccess(
        ctx.db,
        input.eventId,
        ctx.actorUserId,
        "review",
      );
      if (input.cohortId) assertCanReviewCohort(access, input.cohortId);
      const cohortFilter = input.cohortId
        ? [input.cohortId]
        : access.reviewCohortIds;
      const participantWhere: Prisma.AssessmentEventParticipantWhereInput = {
        eventId: input.eventId,
        ...(cohortFilter ? { cohortId: { in: cohortFilter } } : {}),
        user: {
          ...(input.search ? userSearchWhere(input.search) : {}),
          ...(input.status
            ? {
                assessmentAttempts:
                  input.status === "NOT_STARTED"
                    ? { none: { assessmentEventId: input.eventId } }
                    : {
                        some: {
                          assessmentEventId: input.eventId,
                          status: input.status,
                        },
                      },
              }
            : {}),
        },
      };
      const now = new Date();
      const [
        participantTotal,
        participantCount,
        event,
        leaderboard,
        latestStatusCounts,
        [notJoined],
      ] = await Promise.all([
        ctx.db.assessmentEventParticipant.count({ where: participantWhere }),
        ctx.db.assessmentEventParticipant.count({
          where: {
            eventId: input.eventId,
            ...(cohortFilter ? { cohortId: { in: cohortFilter } } : {}),
          },
        }),
        ctx.db.assessmentEvent.findUnique({
          where: { id: input.eventId },
          select: {
            ...eventSummarySelect,
            ...staffTargetsSelect,
            participants: {
              where: participantWhere,
              orderBy: [{ user: { name: "asc" } }, { userId: "asc" }],
              skip: (input.page - 1) * PARTICIPANT_PAGE_SIZE,
              take: PARTICIPANT_PAGE_SIZE,
              select: {
                userId: true,
                invalidatedAt: true,
                invalidationReason: true,
                cohort: { select: { id: true, name: true } },
                user: {
                  select: {
                    name: true,
                    email: true,
                    // Latest attempt in this event, only for the participants on this page.
                    assessmentAttempts: {
                      where: { assessmentEventId: input.eventId },
                      orderBy: { attemptNumber: "desc" },
                      take: 1,
                      select: {
                        id: true,
                        userId: true,
                        attemptNumber: true,
                        status: true,
                        score: true,
                        maxScore: true,
                        startedAt: true,
                        submittedAt: true,
                      },
                    },
                  },
                },
              },
            },
            audits: {
              orderBy: { createdAt: "desc" },
              take: 20,
              select: {
                id: true,
                action: true,
                reason: true,
                metadata: true,
                createdAt: true,
                attemptId: true,
                actor: { select: { user: { select: { name: true } } } },
              },
            },
          },
        }),
        getAssessmentEventLeaderboard(ctx.db, {
          eventId: input.eventId,
          limit: 20,
        }),
        countLatestAssessmentEventAttemptStatuses(
          ctx.db,
          input.eventId,
          cohortFilter,
        ),
        // Learners of a targeted class who have not opened the event yet (joined it late).
        ctx.db.$queryRaw<Array<{ count: number }>>`
          SELECT COUNT(DISTINCT enrollment."userId")::int AS "count"
          FROM "AssessmentEventCohort" AS target
          JOIN "AssessmentEvent" AS event ON event."id" = target."eventId"
          JOIN "Cohort" AS cohort ON cohort."id" = target."cohortId"
          JOIN "CohortEnrollment" AS enrollment ON enrollment."cohortId" = target."cohortId"
          WHERE target."eventId" = ${input.eventId}
            AND event."status" = 'OPEN'
            ${cohortFilter ? Prisma.sql`AND target."cohortId" IN (${Prisma.join(cohortFilter)})` : Prisma.empty}
            AND ${eventEnrollmentSql(now)}
            AND NOT EXISTS (
              SELECT 1 FROM "AssessmentEventParticipant" AS participant
              WHERE participant."eventId" = target."eventId"
                AND participant."userId" = enrollment."userId"
            )
        `,
      ]);
      if (!event) throw new TRPCError({ code: "NOT_FOUND" });
      const participants = event.participants.map(
        ({ user: { assessmentAttempts, ...user }, ...participant }) => ({
          ...participant,
          user,
          attempt: assessmentAttempts[0] ?? null,
        }),
      );
      const learnersWithAttempts = [...latestStatusCounts.values()].reduce(
        (total, count) => total + count,
        0,
      );
      const { cohorts, ...rest } = event;
      return {
        ...rest,
        targets: shapeTargets(cohorts),
        canManage: access.manage,
        reviewCohortIds: access.reviewCohortIds,
        participants: participants.map(
          ({ attempt: _attempt, ...participant }) => participant,
        ),
        leaderboard,
        participantTotal,
        pageCount: Math.ceil(participantTotal / PARTICIPANT_PAGE_SIZE),
        counts: {
          notStarted:
            participantCount -
            learnersWithAttempts +
            Number(notJoined?.count ?? 0),
          inProgress: latestStatusCounts.get("IN_PROGRESS") ?? 0,
          inReview:
            (latestStatusCounts.get("IN_REVIEW") ?? 0) +
            (latestStatusCounts.get("SUBMITTED") ?? 0),
          graded: latestStatusCounts.get("GRADED") ?? 0,
        },
        participantResults: participants,
      };
    }),

  invalidateAttempt: protectedProcedure
    .input(z.object({ eventId: id, attemptId: id, reason }))
    .mutation(async ({ ctx, input }) => {
      const { access, membership } = await requireEventAccess(
        ctx.db,
        input.eventId,
        ctx.actorUserId,
        "review",
      );
      const result = await ctx.db.$transaction(async (tx) => {
        const attempt = await tx.assessmentAttempt.findFirst({
          where: { id: input.attemptId, assessmentEventId: input.eventId },
          select: { id: true, userId: true },
        });
        if (!attempt) throw new TRPCError({ code: "NOT_FOUND" });
        const participant = await tx.assessmentEventParticipant.findUnique({
          where: {
            eventId_userId: { eventId: input.eventId, userId: attempt.userId },
          },
          select: { cohortId: true },
        });
        if (!participant) throw new TRPCError({ code: "NOT_FOUND" });
        assertCanReviewCohort(access, participant.cohortId);
        await tx.assessmentEventParticipant.update({
          where: {
            eventId_userId: { eventId: input.eventId, userId: attempt.userId },
          },
          data: {
            invalidatedAt: new Date(),
            invalidationReason: input.reason,
            invalidatedByMembershipId: membership.id,
          },
        });
        await tx.assessmentEventAudit.create({
          data: {
            eventId: input.eventId,
            actorMembershipId: membership.id,
            attemptId: attempt.id,
            action: "ATTEMPT_INVALIDATED",
            reason: input.reason,
          },
        });
        return { invalidated: true, userId: attempt.userId };
      });
      await notifyInBackground("participation invalidated", () =>
        notifyParticipationInvalidated(
          input.eventId,
          result.userId,
          input.reason,
        ),
      );
      return { invalidated: result.invalidated };
    }),

  adjustResult: protectedProcedure
    .input(
      z.object({
        eventId: id,
        attemptId: id,
        score: z.number().int().min(0),
        reason,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { access, membership } = await requireEventAccess(
        ctx.db,
        input.eventId,
        ctx.actorUserId,
        "review",
      );
      return ctx.db.$transaction(async (tx) => {
        const attempt = await tx.assessmentAttempt.findFirst({
          where: { id: input.attemptId, assessmentEventId: input.eventId },
          select: {
            id: true,
            userId: true,
            status: true,
            score: true,
            maxScore: true,
          },
        });
        if (attempt?.status !== "GRADED" || attempt.maxScore === null) {
          throw new TRPCError({ code: "CONFLICT" });
        }
        const participant = await tx.assessmentEventParticipant.findUnique({
          where: {
            eventId_userId: { eventId: input.eventId, userId: attempt.userId },
          },
          select: { cohortId: true },
        });
        assertCanReviewCohort(access, participant?.cohortId ?? null);
        if (input.score > attempt.maxScore) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Score cannot exceed the maximum score",
          });
        }
        await tx.assessmentAttempt.update({
          where: { id: attempt.id },
          data: { score: input.score, gradedAt: new Date() },
        });
        await tx.assessmentEventAudit.create({
          data: {
            eventId: input.eventId,
            actorMembershipId: membership.id,
            attemptId: attempt.id,
            action: "RESULT_ADJUSTED",
            reason: input.reason,
            metadata: { from: attempt.score, to: input.score },
          },
        });
        return { adjusted: true };
      });
    }),
});
