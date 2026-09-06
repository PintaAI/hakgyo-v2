import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { Prisma } from "../../../../generated/prisma/client";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { rankAssessmentEventAttempts } from "~/server/assessment-event-ranking";
import { deleteAssessmentEventWithProgress } from "~/server/content-resource-deletion";
import {
  activeEnrollmentStatuses,
  requireCohortPermission,
  requireCoursePermission,
} from "~/server/authorization";

const id = z.string().min(1);
const reason = z.string().trim().min(3).max(1000);
const eventSummarySelect = {
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
      assessment: { select: { id: true, title: true } },
    },
  },
  _count: { select: { participants: true, attempts: true } },
} satisfies Prisma.AssessmentEventSelect;

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
  if (event.scope === "COHORT" && event.cohortId) {
    await requireCohortPermission({
      cohortId: event.cohortId,
      permission: "assessment.review",
      userId,
    });
  } else {
    await requireCoursePermission({
      courseId: event.courseId,
      permission: "course.manage",
      userId,
    });
  }
  const membership = await requireMembership(db, event.organizationId, userId);
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
    throw new TRPCError({ code: "BAD_REQUEST", message: "Tryouts belong to a course. Use an on-demand assessment for a cohort." });
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
    .input(z.object({ courseId: id, cohortId: id.optional(), page: z.number().int().min(1).default(1) }))
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
      const where = { courseId: input.courseId, cohortId: input.cohortId ?? null };
      const [items, total] = await Promise.all([ctx.db.assessmentEvent.findMany({
        where: {
          ...where,
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: eventSummarySelect,
        skip: (input.page - 1) * 10, take: 10,
      }), ctx.db.assessmentEvent.count({ where })]);
      return { items, total, pageCount: Math.ceil(total / 10) };
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
      return ctx.db.$transaction(
        async (tx) => {
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
          const participants =
            event.scope === "COHORT" && event.cohortId
              ? await tx.cohortEnrollment.findMany({
                  where: {
                    cohortId: event.cohortId,
                    status: { in: [...activeEnrollmentStatuses] },
                  },
                  select: { userId: true },
                })
              : await tx.courseEnrollment.findMany({
                  where: {
                    courseId: event.courseId,
                    status: { in: [...activeEnrollmentStatuses] },
                    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
                  },
                  select: { userId: true },
                });
          const userIds = [
            ...new Set(participants.map(({ userId }) => userId)),
          ];
          if (userIds.length === 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "The event has no eligible learners",
            });
          }
          await tx.assessmentEventParticipant.createMany({
            data: userIds.map((userId) => ({ eventId: event.id, userId })),
            skipDuplicates: true,
          });
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
              metadata: { participantCount: userIds.length },
            },
          });
          return { opened: true, participantCount: userIds.length };
        },
        { isolationLevel: "Serializable" },
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
      return ctx.db.$transaction(async (tx) => {
        const now = new Date();
        const updated = await tx.assessmentEvent.updateMany({
          where: { id: input.eventId, status: "OPEN" },
          data: { status: "CLOSED", closedAt: now },
        });
        if (updated.count !== 1) throw new TRPCError({ code: "CONFLICT" });
        await tx.assessmentEventAudit.create({
          data: {
            eventId: input.eventId,
            actorMembershipId: access.membership.id,
            action: "CLOSED",
          },
        });
        return { closed: true };
      });
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
      return ctx.db.$transaction(
        async (tx) => {
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
                  assessment: { select: { id: true, status: true } },
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
          const current = await tx.assessmentAttempt.findUnique({
            where: {
              assessmentEventId_userId: {
                assessmentEventId: event.id,
                userId: ctx.actorUserId,
              },
            },
          });
          if (current) return { ...current, courseId: event.courseId };
          const attemptNumber =
            (await tx.assessmentAttempt.count({
              where: {
                courseItemId: event.courseItemId,
                userId: ctx.actorUserId,
              },
            })) + 1;
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
        },
        { isolationLevel: "Serializable" },
      );
    }),

  listForLearner: protectedProcedure.query(({ ctx }) =>
    ctx.db.assessmentEvent.findMany({
      where: {
        status: { not: "CANCELLED" },
        participants: { some: { userId: ctx.actorUserId } },
      },
      orderBy: [{ status: "asc" }, { closesAt: "asc" }, { createdAt: "desc" }],
      select: {
        ...eventSummarySelect,
        participants: {
          where: { userId: ctx.actorUserId },
          select: { invalidatedAt: true, invalidationReason: true },
        },
        attempts: {
          where: { userId: ctx.actorUserId },
          select: {
            id: true,
            status: true,
            score: true,
            maxScore: true,
            startedAt: true,
            submittedAt: true,
          },
          take: 1,
        },
      },
    }).then(events => events.map(event => ({ ...event, attempts: event.attempts.map(attempt => ({ ...attempt, score: attempt.status === "GRADED" && !event.participants[0]?.invalidatedAt ? attempt.score : null, maxScore: attempt.status === "GRADED" && !event.participants[0]?.invalidatedAt ? attempt.maxScore : null })) }))),
  ),

  getForLearner: protectedProcedure
    .input(z.object({ eventId: id }))
    .query(async ({ ctx, input }) => {
      const event = await ctx.db.assessmentEvent.findFirst({
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
            select: {
              id: true,
              status: true,
              score: true,
              maxScore: true,
              startedAt: true,
              submittedAt: true,
            },
            take: 1,
          },
        },
      });
      if (!event) throw new TRPCError({ code: "NOT_FOUND" });
      const learnerEvent = { ...event, attempts: event.attempts.map(attempt => ({ ...attempt, score: attempt.status === "GRADED" && !event.participants[0]?.invalidatedAt && event.status !== "CANCELLED" ? attempt.score : null, maxScore: attempt.status === "GRADED" && !event.participants[0]?.invalidatedAt && event.status !== "CANCELLED" ? attempt.maxScore : null })) };
      if (event.status !== "CLOSED") return { ...learnerEvent, leaderboard: null };
      const attempts = await ctx.db.assessmentAttempt.findMany({
        where: { assessmentEventId: event.id },
        select: {
          id: true,
          userId: true,
          score: true,
          status: true,
          maxScore: true,
          startedAt: true,
          submittedAt: true,
          user: { select: { name: true } },
          assessmentEvent: {
            select: {
              participants: {
                select: { userId: true, invalidatedAt: true },
              },
            },
          },
        },
      });
      const invalidated = new Map(
        attempts[0]?.assessmentEvent?.participants.map((participant) => [
          participant.userId,
          participant.invalidatedAt,
        ]) ?? [],
      );
      return {
        ...learnerEvent,
        leaderboard: rankAssessmentEventAttempts(
          attempts.map((attempt) => ({
            ...attempt,
            name: attempt.user.name,
            invalidatedAt: invalidated.get(attempt.userId) ?? null,
          })),
        ),
      };
    }),

  getManageable: protectedProcedure
    .input(z.object({ eventId: id, page: z.number().int().min(1).default(1), search: z.string().trim().max(200).optional(), status: z.enum(["IN_PROGRESS", "IN_REVIEW", "GRADED", "NOT_STARTED"]).optional() }))
    .query(async ({ ctx, input }) => {
      await requireEventManagement(ctx.db, input.eventId, ctx.actorUserId);
      const participantWhere: Prisma.AssessmentEventParticipantWhereInput = {
        eventId: input.eventId,
        user: {
          ...(input.search ? { OR: [{ name: { contains: input.search, mode: "insensitive" } }, { email: { contains: input.search, mode: "insensitive" } }] } : {}),
          ...(input.status ? { assessmentAttempts: input.status === "NOT_STARTED" ? { none: { assessmentEventId: input.eventId } } : { some: { assessmentEventId: input.eventId, status: input.status } } } : {}),
        },
      };
      const participantTotal = await ctx.db.assessmentEventParticipant.count({ where: participantWhere });
      const event = await ctx.db.assessmentEvent.findUnique({
        where: { id: input.eventId },
        select: {
          ...eventSummarySelect,
          participants: {
            where: participantWhere,
            orderBy: [{ user: { name: "asc" } }, { userId: "asc" }],
            skip: (input.page - 1) * 20, take: 20,
            select: {
              userId: true,
              invalidatedAt: true,
              invalidationReason: true,
              user: { select: { name: true, email: true } },
            },
          },
          attempts: {
            select: {
              id: true,
              userId: true,
              status: true,
              score: true,
              maxScore: true,
              startedAt: true,
              submittedAt: true,
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
      });
      if (!event) throw new TRPCError({ code: "NOT_FOUND" });
      const allParticipants = await ctx.db.assessmentEventParticipant.findMany({ where: { eventId: event.id }, select: { userId: true, invalidatedAt: true, user: { select: { name: true } } } });
      const rankingParticipants = new Map(allParticipants.map(p => [p.userId, p]));
      const leaderboard = rankAssessmentEventAttempts(
        event.attempts.map((attempt) => ({
          ...attempt,
          name: rankingParticipants.get(attempt.userId)?.user.name ?? "Learner",
          invalidatedAt:
            rankingParticipants.get(attempt.userId)?.invalidatedAt ?? null,
        })),
      );
      const attemptsByUserId = new Map(
        event.attempts.map((attempt) => [attempt.userId, attempt]),
      );
      return {
        ...event,
        attempts: undefined,
        leaderboard: leaderboard.slice(0, 20),
        participantTotal, pageCount: Math.ceil(participantTotal / 20),
        counts: { notStarted: event._count.participants - event.attempts.length, inProgress: event.attempts.filter(a => a.status === "IN_PROGRESS").length, inReview: event.attempts.filter(a => a.status === "IN_REVIEW").length, graded: event.attempts.filter(a => a.status === "GRADED").length },
        participantResults: event.participants.map((participant) => ({
          ...participant,
          attempt: attemptsByUserId.get(participant.userId) ?? null,
        })),
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
        if (
          attempt?.status !== "GRADED" ||
          attempt.maxScore === null
        ) {
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
