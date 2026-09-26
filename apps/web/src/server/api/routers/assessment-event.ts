import { TRPCError } from "@trpc/server";
import { resolveAssessmentEntry } from "@hakgyo/shared";
import { z } from "zod";

import { after } from "next/server";

import { Prisma } from "../../../../generated/prisma/client";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  autoSubmitEventAttempts,
  lockAttemptStart,
} from "~/server/assessment-attempt";
import {
  countLatestAssessmentEventAttemptStatuses,
  getAssessmentEventLeaderboard,
} from "~/server/assessment-event-leaderboard";
import { deleteAssessmentEventWithProgress } from "~/server/content-resource-deletion";
import {
  activeEnrollmentStatuses,
  requireCohortPermission,
  requireCoursePermission,
} from "~/server/authorization";
import {
  isUniqueConstraintError,
  withTransactionRetry,
} from "~/server/db-retry";

const id = z.string().min(1);
const reason = z.string().trim().min(3).max(1000);
/**
 * Event summary fields without relation counts. A relation `_count` in `findMany` compiles to a
 * whole-table grouped subquery, so list queries use this select and attach counts for their page
 * with `withEventSummaryCounts`. Single-row queries keep the counts in `eventSummarySelect`.
 */
const eventSummaryBaseSelect = {
  id: true,
  title: true,
  type: true,
  scope: true,
  status: true,
  durationMinutes: true,
  openedAt: true,
  closesAt: true,
  closedAt: true,
  cancelledAt: true,
  createdAt: true,
  course: { select: { id: true, title: true } },
  cohort: { select: { id: true, name: true } },
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
const eventStatusOrder = ["DRAFT", "OPEN", "CLOSED", "CANCELLED"] as const;

/** Mirrors `orderBy: [{ status: "asc" }, { closesAt: "asc" }, { createdAt: "desc" }]`. */
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

async function requireMembership(
  db: Prisma.TransactionClient | Prisma.DefaultPrismaClient,
  organizationId: string,
  userId: string,
) {
  const membership = await db.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
    select: { id: true },
  });
  if (!membership) throw new TRPCError({ code: "FORBIDDEN" });
  return membership;
}

async function requireEventManagement(
  db: Prisma.TransactionClient | Prisma.DefaultPrismaClient,
  eventId: string,
  userId: string,
) {
  const event = await db.assessmentEvent.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      organizationId: true,
      courseId: true,
      cohortId: true,
      scope: true,
      status: true,
    },
  });
  if (!event) throw new TRPCError({ code: "NOT_FOUND" });
  const [, membership] = await Promise.all([
    event.scope === "COHORT" && event.cohortId
      ? requireCohortPermission({
          cohortId: event.cohortId,
          permission: "assessment.review",
          userId,
        })
      : requireCoursePermission({
          courseId: event.courseId,
          permission: "course.manage",
          userId,
        }),
    requireMembership(db, event.organizationId, userId),
  ]);
  return { event, membership };
}

function assertEventConfiguration(input: {
  type: "QUICK_ASSESSMENT" | "TRYOUT";
  scope: "COHORT" | "COURSE";
  cohortId?: string;
}) {
  if (input.type === "QUICK_ASSESSMENT" && input.scope !== "COHORT") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Quick assessments must be scoped to a cohort",
    });
  }
  if (input.type === "TRYOUT" && input.scope !== "COURSE") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Tryouts belong to a course. Use an on-demand assessment for a cohort.",
    });
  }
  if ((input.scope === "COHORT") !== Boolean(input.cohortId)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "A cohort is required only for cohort-scoped events",
    });
  }
}

export const assessmentEventRouter = createTRPCRouter({
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
          assessment: { status: "PUBLISHED", questions: { some: {} } },
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
              _count: { select: { questions: true } },
            },
          },
        },
      });
    }),

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
      const where = {
        courseId: input.courseId,
        cohortId: input.cohortId ?? null,
      };
      const [items, total] = await Promise.all([
        ctx.db.assessmentEvent.findMany({
          where: {
            ...where,
          },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          select: eventSummaryBaseSelect,
          skip: (input.page - 1) * 10,
          take: 10,
        }),
        ctx.db.assessmentEvent.count({ where }),
      ]);
      return {
        items: await withEventSummaryCounts(ctx.db, items),
        total,
        pageCount: Math.ceil(total / 10),
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        courseId: id,
        cohortId: id.optional(),
        courseItemId: id,
        type: z.enum(["QUICK_ASSESSMENT", "TRYOUT"]),
        scope: z.enum(["COHORT", "COURSE"]),
        title: z.string().trim().min(1).max(200),
        durationMinutes: z.number().int().min(1).max(480),
        closesAt: z.coerce.date(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertEventConfiguration(input);
      let organizationId: string;
      if (input.scope === "COHORT" && input.cohortId) {
        const cohort = await requireCohortPermission({
          cohortId: input.cohortId,
          permission: "assessment.review",
          userId: ctx.actorUserId,
        });
        if (cohort.courseId !== input.courseId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid cohort",
          });
        }
        const course = await ctx.db.course.findUnique({
          where: { id: input.courseId },
          select: { organizationId: true },
        });
        if (!course) throw new TRPCError({ code: "NOT_FOUND" });
        organizationId = course.organizationId;
      } else {
        const course = await requireCoursePermission({
          courseId: input.courseId,
          permission: "course.manage",
          userId: ctx.actorUserId,
        });
        organizationId = course.organizationId;
      }
      if (input.closesAt <= new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "The event close time must be in the future",
        });
      }
      const item = await ctx.db.courseItem.findFirst({
        where: {
          id: input.courseItemId,
          type: "ASSESSMENT",
          isPublished: true,
          module: { courseId: input.courseId },
          assessment: { status: "PUBLISHED", questions: { some: {} } },
        },
        select: { id: true, organizationId: true },
      });
      if (item?.organizationId !== organizationId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Select a published assessment from this course",
        });
      }
      const membership = await requireMembership(
        ctx.db,
        item.organizationId,
        ctx.actorUserId,
      );
      return ctx.db.assessmentEvent.create({
        data: {
          organizationId: item.organizationId,
          courseId: input.courseId,
          cohortId: input.cohortId,
          courseItemId: input.courseItemId,
          createdByMembershipId: membership.id,
          type: input.type,
          scope: input.scope,
          title: input.title,
          durationMinutes: input.durationMinutes,
          closesAt: input.closesAt,
        },
        select: eventSummarySelect,
      });
    }),

  open: protectedProcedure
    .input(z.object({ eventId: id }))
    .mutation(async ({ ctx, input }) => {
      const access = await requireEventManagement(
        ctx.db,
        input.eventId,
        ctx.actorUserId,
      );
      // READ COMMITTED with the event row locked: concurrent open/close/cancel of this event wait
      // for each other, and the DRAFT -> OPEN transition is re-checked by the conditional update.
      // Participants are inserted with ON CONFLICT DO NOTHING.
      return withTransactionRetry(() =>
        ctx.db.$transaction(async (tx) => {
          await tx.$queryRaw`
            SELECT "id" FROM "AssessmentEvent" WHERE "id" = ${input.eventId} FOR UPDATE
          `;
          const event = await tx.assessmentEvent.findUnique({
            where: { id: input.eventId },
            select: {
              id: true,
              courseId: true,
              cohortId: true,
              scope: true,
              status: true,
              closesAt: true,
              courseItem: {
                select: {
                  isPublished: true,
                  assessment: { select: { status: true } },
                },
              },
            },
          });
          if (event?.status !== "DRAFT") {
            throw new TRPCError({ code: "CONFLICT" });
          }
          const now = new Date();
          if (!event.closesAt || event.closesAt <= now) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "The event close time must be in the future",
            });
          }
          if (
            !event.courseItem.isPublished ||
            event.courseItem.assessment?.status !== "PUBLISHED"
          ) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "The selected assessment is no longer published",
            });
          }
          // Enroll every eligible learner in one statement instead of reading all enrollments
          // into memory. `participantCount` is the number of distinct eligible learners, which
          // matches the previous read-then-createMany(skipDuplicates) behaviour.
          const statuses = Prisma.join([...activeEnrollmentStatuses]);
          const eligible =
            event.scope === "COHORT" && event.cohortId
              ? Prisma.sql`
                  SELECT DISTINCT enrollment."userId"
                  FROM "CohortEnrollment" AS enrollment
                  WHERE enrollment."cohortId" = ${event.cohortId}
                    AND enrollment."status"::text IN (${statuses})
                `
              : Prisma.sql`
                  SELECT DISTINCT enrollment."userId"
                  FROM "CourseEnrollment" AS enrollment
                  WHERE enrollment."courseId" = ${event.courseId}
                    AND enrollment."status"::text IN (${statuses})
                    AND (
                      enrollment."expiresAt" IS NULL
                      OR enrollment."expiresAt" > ${now}::timestamp(3)
                    )
                `;
          const [enrolled] = await tx.$queryRaw<
            Array<{ participantCount: number }>
          >`
            WITH eligible AS (${eligible}),
            inserted AS (
              INSERT INTO "AssessmentEventParticipant" ("eventId", "userId")
              SELECT ${event.id}, eligible."userId" FROM eligible
              ON CONFLICT DO NOTHING
              RETURNING 1
            )
            SELECT (SELECT COUNT(*) FROM eligible)::int AS "participantCount"
          `;
          const participantCount = Number(enrolled?.participantCount ?? 0);
          if (participantCount === 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "The event has no eligible learners",
            });
          }
          const updated = await tx.assessmentEvent.updateMany({
            where: { id: event.id, status: "DRAFT" },
            data: { status: "OPEN", openedAt: now },
          });
          if (updated.count !== 1) throw new TRPCError({ code: "CONFLICT" });
          await tx.assessmentEventAudit.create({
            data: {
              eventId: event.id,
              actorMembershipId: access.membership.id,
              action: "OPENED",
              metadata: { participantCount },
            },
          });
          return { opened: true, participantCount };
        }),
      );
    }),

  close: protectedProcedure
    .input(z.object({ eventId: id }))
    .mutation(async ({ ctx, input }) => {
      const access = await requireEventManagement(
        ctx.db,
        input.eventId,
        ctx.actorUserId,
      );
      let now = new Date();
      await ctx.db.$transaction(async (tx) => {
        const updated = await tx.assessmentEvent.updateMany({
          where: { id: input.eventId, status: "OPEN" },
          data: { status: "CLOSED", closedAt: now },
        });
        if (updated.count !== 1) {
          // Closing an already closed event re-runs the grading below, which
          // recovers attempts a failed or interrupted auto-submit left open.
          const event = await tx.assessmentEvent.findUnique({
            where: { id: input.eventId },
            select: { status: true, closedAt: true },
          });
          if (event?.status !== "CLOSED") {
            throw new TRPCError({ code: "CONFLICT" });
          }
          now = event.closedAt ?? now;
          return;
        }
        await tx.assessmentEventAudit.create({
          data: {
            eventId: input.eventId,
            actorMembershipId: access.membership.id,
            action: "CLOSED",
          },
        });
      });
      // Learners can no longer save or submit once the event is closed, so grade the attempts
      // still in progress as submitted at close time. The close itself is already committed; a
      // grading failure leaves those attempts in progress until the event is closed again.
      // Grading a large event takes a while, so it runs after the response when possible.
      const gradeOpenAttempts = () =>
        autoSubmitEventAttempts(ctx.db, input.eventId, now).catch(
          (error: unknown) => {
            console.error("Failed to auto-submit attempts of a closed event", {
              eventId: input.eventId,
              error,
            });
          },
        );
      try {
        after(gradeOpenAttempts);
      } catch {
        // Outside a Next.js request scope (e.g. MCP, tests): grade inline.
        await gradeOpenAttempts();
      }
      return { closed: true };
    }),

  cancel: protectedProcedure
    .input(z.object({ eventId: id, reason }))
    .mutation(async ({ ctx, input }) => {
      const access = await requireEventManagement(
        ctx.db,
        input.eventId,
        ctx.actorUserId,
      );
      return ctx.db.$transaction(async (tx) => {
        const now = new Date();
        const updated = await tx.assessmentEvent.updateMany({
          where: { id: input.eventId, status: { in: ["DRAFT", "OPEN"] } },
          data: { status: "CANCELLED", cancelledAt: now },
        });
        if (updated.count !== 1) throw new TRPCError({ code: "CONFLICT" });
        await tx.assessmentEventAudit.create({
          data: {
            eventId: input.eventId,
            actorMembershipId: access.membership.id,
            action: "CANCELLED",
            reason: input.reason,
          },
        });
        return { cancelled: true };
      });
    }),

  delete: protectedProcedure
    .input(z.object({ eventId: id }))
    .mutation(async ({ ctx, input }) => {
      const access = await requireEventManagement(
        ctx.db,
        input.eventId,
        ctx.actorUserId,
      );
      const removed = await ctx.db.$transaction((tx) =>
        deleteAssessmentEventWithProgress(tx, input.eventId),
      );
      return {
        deleted: true,
        actorMembershipId: access.membership.id,
        removed,
      };
    }),

  startAttempt: protectedProcedure
    .input(z.object({ eventId: id }))
    .mutation(async ({ ctx, input }) => {
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
            const event = await tx.assessmentEvent.findFirst({
              where: {
                id: input.eventId,
                participants: {
                  some: {
                    userId: ctx.actorUserId,
                    invalidatedAt: null,
                  },
                },
              },
              select: {
                id: true,
                status: true,
                closesAt: true,
                courseId: true,
                cohortId: true,
                courseItemId: true,
                organizationId: true,
                courseItem: {
                  select: {
                    isPublished: true,
                    assessment: {
                      select: {
                        id: true,
                        status: true,
                        maxAttempts: true,
                      },
                    },
                  },
                },
              },
            });
            if (!event) throw new TRPCError({ code: "NOT_FOUND" });
            if (
              event.status !== "OPEN" ||
              !event.closesAt ||
              event.closesAt <= new Date()
            ) {
              throw new TRPCError({
                code: "PRECONDITION_FAILED",
                message: "This assessment event is no longer open",
              });
            }
            if (
              !event.courseItem.isPublished ||
              event.courseItem.assessment?.status !== "PUBLISHED"
            ) {
              throw new TRPCError({
                code: "PRECONDITION_FAILED",
                message: "The assessment is no longer available",
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
                message: "Maximum attempts reached",
              });
            }
            // max + 1 (not count + 1): numbers stay unique after an event's attempts are deleted.
            const attemptNumber =
              attemptGroups.reduce(
                (max, group) => Math.max(max, group._max.attemptNumber ?? 0),
                0,
              ) + 1;
            const created = await tx.assessmentAttempt.create({
              data: {
                assessmentId: event.courseItem.assessment.id,
                courseItemId: event.courseItemId,
                organizationId: event.organizationId,
                cohortId: event.cohortId,
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
    .input(z.object({ organizationId: id.optional() }).optional())
    .query(async ({ ctx, input }) => {
      // Every draft/open event is returned; closed history is bounded to the most recent ones.
      // The display order (status, closesAt, createdAt desc) is restored in memory.
      const learnerEventWhere = (
        status: Prisma.AssessmentEventWhereInput["status"],
      ): Prisma.AssessmentEventWhereInput => ({
        organizationId: input?.organizationId,
        status,
        participants: { some: { userId: ctx.actorUserId } },
      });
      const learnerEventSelect = {
        ...eventSummaryBaseSelect,
        participants: {
          where: { userId: ctx.actorUserId },
          select: { invalidatedAt: true, invalidationReason: true },
        },
        attempts: {
          where: { userId: ctx.actorUserId },
          orderBy: { attemptNumber: "desc" },
          take: 1,
          select: learnerAttemptSelect,
        },
      } satisfies Prisma.AssessmentEventSelect;
      const [activeEvents, closedEvents, attemptCounts] = await Promise.all([
        ctx.db.assessmentEvent.findMany({
          where: learnerEventWhere({ in: ["DRAFT", "OPEN"] }),
          select: learnerEventSelect,
        }),
        ctx.db.assessmentEvent.findMany({
          where: learnerEventWhere("CLOSED"),
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: LEARNER_CLOSED_EVENT_LIMIT,
          select: learnerEventSelect,
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
      const now = new Date();
      const events = await withEventSummaryCounts(ctx.db, [
        ...activeEvents,
        ...closedEvents,
      ]);
      return events.sort(compareLearnerEvents).map(({ attempts, ...event }) => {
        const latestAttempt = attempts[0];
        const attemptCount = attemptCountByEventId.get(event.id) ?? 0;
        const invalidated = Boolean(event.participants[0]?.invalidatedAt);
        const available =
          event.status === "OPEN" &&
          Boolean(event.closesAt && event.closesAt > now);
        return {
          ...event,
          attemptCount,
          entry: resolveAssessmentEntry({
            attemptStatus: latestAttempt?.status,
            attemptsUsed: attemptCount,
            maxAttempts: event.courseItem.assessment?.maxAttempts ?? null,
            available,
            invalidated,
          }),
          attempts: latestAttempt
            ? [
                {
                  ...latestAttempt,
                  score:
                    latestAttempt.status === "GRADED" && !invalidated
                      ? latestAttempt.score
                      : null,
                  maxScore:
                    latestAttempt.status === "GRADED" && !invalidated
                      ? latestAttempt.maxScore
                      : null,
                },
              ]
            : [],
        };
      });
    }),

  getForLearner: protectedProcedure
    .input(z.object({ eventId: id }))
    .query(async ({ ctx, input }) => {
      const [event, attemptCount] = await Promise.all([
        ctx.db.assessmentEvent.findFirst({
          where: {
            id: input.eventId,
            participants: { some: { userId: ctx.actorUserId } },
          },
          select: {
            ...eventSummarySelect,
            participants: {
              where: { userId: ctx.actorUserId },
              select: { invalidatedAt: true, invalidationReason: true },
            },
            attempts: {
              where: { userId: ctx.actorUserId },
              orderBy: { attemptNumber: "desc" },
              take: 1,
              select: learnerAttemptSelect,
            },
          },
        }),
        ctx.db.assessmentAttempt.count({
          where: { assessmentEventId: input.eventId, userId: ctx.actorUserId },
        }),
      ]);
      if (!event) throw new TRPCError({ code: "NOT_FOUND" });
      const latestAttempt = event.attempts[0];
      const participantInvalidated = Boolean(
        event.participants[0]?.invalidatedAt,
      );
      const available =
        event.status === "OPEN" &&
        Boolean(event.closesAt && event.closesAt > new Date());
      const entry = resolveAssessmentEntry({
        attemptStatus: latestAttempt?.status,
        attemptsUsed: attemptCount,
        maxAttempts: event.courseItem.assessment?.maxAttempts ?? null,
        available,
        invalidated: participantInvalidated || event.status === "CANCELLED",
      });
      const learnerEvent = {
        ...event,
        attemptCount,
        entry,
        attempts: latestAttempt
          ? [
              {
                ...latestAttempt,
                score:
                  latestAttempt.status === "GRADED" &&
                  !participantInvalidated &&
                  event.status !== "CANCELLED"
                    ? latestAttempt.score
                    : null,
                maxScore:
                  latestAttempt.status === "GRADED" &&
                  !participantInvalidated &&
                  event.status !== "CANCELLED"
                    ? latestAttempt.maxScore
                    : null,
              },
            ]
          : [],
      };
      if (
        event.status !== "CLOSED" &&
        (entry.state === "NOT_STARTED" || entry.state === "IN_PROGRESS")
      )
        return { ...learnerEvent, leaderboard: null };
      // Top entries plus the learner's own row, ranked in SQL.
      const leaderboard = await getAssessmentEventLeaderboard(ctx.db, {
        eventId: event.id,
        limit: LEARNER_LEADERBOARD_LIMIT,
        userId: ctx.actorUserId,
      });
      return { ...learnerEvent, leaderboard };
    }),

  getManageable: protectedProcedure
    .input(
      z.object({
        eventId: id,
        page: z.number().int().min(1).default(1),
        search: z.string().trim().max(200).optional(),
        status: z
          .enum(["IN_PROGRESS", "IN_REVIEW", "GRADED", "NOT_STARTED"])
          .optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await requireEventManagement(ctx.db, input.eventId, ctx.actorUserId);
      const participantWhere: Prisma.AssessmentEventParticipantWhereInput = {
        eventId: input.eventId,
        user: {
          ...(input.search
            ? {
                OR: [
                  { name: { contains: input.search, mode: "insensitive" } },
                  { email: { contains: input.search, mode: "insensitive" } },
                ],
              }
            : {}),
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
      const [participantTotal, event, leaderboard, latestStatusCounts] =
        await Promise.all([
          ctx.db.assessmentEventParticipant.count({ where: participantWhere }),
          ctx.db.assessmentEvent.findUnique({
            where: { id: input.eventId },
            select: {
              ...eventSummarySelect,
              participants: {
                where: participantWhere,
                orderBy: [{ user: { name: "asc" } }, { userId: "asc" }],
                skip: (input.page - 1) * 20,
                take: 20,
                select: {
                  userId: true,
                  invalidatedAt: true,
                  invalidationReason: true,
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
          countLatestAssessmentEventAttemptStatuses(ctx.db, input.eventId),
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
      return {
        ...event,
        participants: participants.map(
          ({ attempt: _attempt, ...participant }) => participant,
        ),
        leaderboard,
        participantTotal,
        pageCount: Math.ceil(participantTotal / 20),
        counts: {
          notStarted: event._count.participants - learnersWithAttempts,
          inProgress: latestStatusCounts.get("IN_PROGRESS") ?? 0,
          inReview: latestStatusCounts.get("IN_REVIEW") ?? 0,
          graded: latestStatusCounts.get("GRADED") ?? 0,
        },
        participantResults: participants,
      };
    }),

  invalidateAttempt: protectedProcedure
    .input(z.object({ eventId: id, attemptId: id, reason }))
    .mutation(async ({ ctx, input }) => {
      const access = await requireEventManagement(
        ctx.db,
        input.eventId,
        ctx.actorUserId,
      );
      return ctx.db.$transaction(async (tx) => {
        const attempt = await tx.assessmentAttempt.findFirst({
          where: { id: input.attemptId, assessmentEventId: input.eventId },
          select: { id: true, userId: true },
        });
        if (!attempt) throw new TRPCError({ code: "NOT_FOUND" });
        await tx.assessmentEventParticipant.update({
          where: {
            eventId_userId: { eventId: input.eventId, userId: attempt.userId },
          },
          data: {
            invalidatedAt: new Date(),
            invalidationReason: input.reason,
            invalidatedByMembershipId: access.membership.id,
          },
        });
        await tx.assessmentEventAudit.create({
          data: {
            eventId: input.eventId,
            actorMembershipId: access.membership.id,
            attemptId: attempt.id,
            action: "ATTEMPT_INVALIDATED",
            reason: input.reason,
          },
        });
        return { invalidated: true };
      });
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
      const access = await requireEventManagement(
        ctx.db,
        input.eventId,
        ctx.actorUserId,
      );
      return ctx.db.$transaction(async (tx) => {
        const attempt = await tx.assessmentAttempt.findFirst({
          where: { id: input.attemptId, assessmentEventId: input.eventId },
          select: { id: true, status: true, score: true, maxScore: true },
        });
        if (attempt?.status !== "GRADED" || attempt.maxScore === null) {
          throw new TRPCError({ code: "CONFLICT" });
        }
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
            actorMembershipId: access.membership.id,
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
