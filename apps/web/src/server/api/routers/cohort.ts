import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  type CohortPermission,
  requireCohortPermission,
  requireCoursePermission,
  requireOrganizationMembership,
  requireOrganizationPermission,
} from "~/server/authorization";
import { getOrganizationCohortScope } from "~/server/authorization/cohort-scope";
import { Prisma } from "../../../../generated/prisma/client";
import { db } from "~/server/db";
import {
  grantCohortCourseAccessForUsers,
  reconcileCohortCourseAccess,
} from "~/server/enrollment/cohort-access";
import { pageInput, pageResult } from "~/server/api/pagination";
import {
  createZoomMeeting,
  deleteZoomMeeting,
  updateZoomMeeting,
  type ZoomMeetingInput,
} from "~/server/integrations/zoom";
import {
  createGoogleMeeting,
  deleteGoogleMeeting,
  getGoogleMeetingJoinUrl,
  updateGoogleMeeting,
} from "~/server/integrations/google-calendar";

const id = z.string().min(1);
const cohortFields = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().max(10000).nullable().optional(),
  whatsappGroupUrl: z.string().url().max(2048).nullable().optional(),
  status: z
    .enum(["DRAFT", "OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"])
    .optional(),
  enrollmentMode: z.enum(["OPEN", "INVITE_ONLY"]).nullable().optional(),
  price: z.number().int().nonnegative().nullable().optional(),
  capacity: z.number().int().positive().nullable().optional(),
  startsAt: z.date().nullable().optional(),
  endsAt: z.date().nullable().optional(),
});
const meetingFields = z.object({
  title: z.string().trim().min(1).max(200),
  agenda: z.string().max(10000).nullable().optional(),
  startsAt: z.date(),
  durationMinutes: z.number().int().positive().max(1440),
  timezone: z.string().trim().min(1).max(100),
  moduleId: id.nullable().optional(),
});

async function validateMeetingModule(
  courseId: string,
  moduleId: string | null | undefined,
) {
  if (!moduleId) return;
  const courseModule = await db.courseModule.findFirst({
    where: { id: moduleId, courseId },
    select: { id: true },
  });
  if (!courseModule)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Module does not belong to this cohort's course",
    });
}

async function createRemoteMeeting(
  provider: "ZOOM" | "GOOGLE_MEET",
  organizationId: string,
  input: ZoomMeetingInput,
) {
  if (provider === "ZOOM") {
    const meeting = await createZoomMeeting(organizationId, input);
    return {
      provider,
      zoomMeetingId: String(meeting.id),
      zoomMeetingUuid: meeting.uuid,
      googleCalendarId: null,
      googleCalendarEventId: null,
      joinUrl: meeting.join_url,
    };
  }
  const meeting = await createGoogleMeeting(organizationId, input);
  return {
    provider,
    zoomMeetingId: null,
    zoomMeetingUuid: null,
    googleCalendarId: meeting.calendarId,
    googleCalendarEventId: meeting.eventId,
    joinUrl: meeting.joinUrl,
  };
}

async function deleteRemoteMeeting(
  organizationId: string,
  meeting: {
    zoomMeetingId: string | null;
    googleCalendarId: string | null;
    googleCalendarEventId: string | null;
  },
) {
  if (meeting.zoomMeetingId)
    await deleteZoomMeeting(organizationId, meeting.zoomMeetingId);
  if (meeting.googleCalendarEventId) {
    await deleteGoogleMeeting(
      organizationId,
      meeting.googleCalendarId ?? "primary",
      meeting.googleCalendarEventId,
    );
  }
}

async function requireManagedCohort(
  cohortId: string,
  userId: string,
  permission: CohortPermission,
) {
  const { id, courseId, organizationId, access } =
    await requireCohortPermission({ cohortId, userId, permission });
  return { id, courseId, organizationId, access };
}

/**
 * Relation `_count` inside a list `findMany` is compiled into a grouped
 * aggregate over the whole child table, so page counts are loaded with one
 * follow-up query per relation keyed by the page's cohort ids instead.
 */
async function withCohortCounts<T extends { id: string }>(cohorts: T[]) {
  if (cohorts.length === 0) return [];
  const cohortIds = cohorts.map((cohort) => cohort.id);
  const where = { cohortId: { in: cohortIds } };
  const [staff, enrollments, meetings] = await Promise.all([
    db.cohortStaff.groupBy({ by: ["cohortId"], where, _count: { _all: true } }),
    db.cohortEnrollment.groupBy({
      by: ["cohortId"],
      where,
      _count: { _all: true },
    }),
    db.cohortMeeting.groupBy({
      by: ["cohortId"],
      where,
      _count: { _all: true },
    }),
  ]);
  const toMap = (rows: Array<{ cohortId: string; _count: { _all: number } }>) =>
    new Map(rows.map((row) => [row.cohortId, row._count._all]));
  const staffCounts = toMap(staff);
  const enrollmentCounts = toMap(enrollments);
  const meetingCounts = toMap(meetings);
  return cohorts.map((cohort) => ({
    ...cohort,
    _count: {
      staff: staffCounts.get(cohort.id) ?? 0,
      enrollments: enrollmentCounts.get(cohort.id) ?? 0,
      meetings: meetingCounts.get(cohort.id) ?? 0,
    },
  }));
}

type LearnerPreview = { id: string; name: string; image: string | null };

/** Latest four enrolled learners per cohort, limited in SQL per cohort. */
async function getCohortLearnerPreviews(cohortIds: string[]) {
  const previews = new Map<string, LearnerPreview[]>();
  if (cohortIds.length === 0) return previews;
  const rows = await db.$queryRaw<Array<LearnerPreview & { cohortId: string }>>(
    Prisma.sql`
      SELECT c."cohortId", u."id", u."name", u."image"
      FROM unnest(${cohortIds}::text[]) AS c("cohortId")
      CROSS JOIN LATERAL (
        SELECT e."userId", e."enrolledAt", e."id"
        FROM "CohortEnrollment" e
        WHERE e."cohortId" = c."cohortId"
        ORDER BY e."enrolledAt" DESC, e."id" DESC
        LIMIT 4
      ) e
      JOIN "user" u ON u."id" = e."userId"
      ORDER BY c."cohortId", e."enrolledAt" DESC, e."id" DESC
    `,
  );
  for (const { cohortId, ...user } of rows) {
    const list = previews.get(cohortId);
    if (list) list.push(user);
    else previews.set(cohortId, [user]);
  }
  return previews;
}

export const cohortRouter = createTRPCRouter({
  listByOrganization: protectedProcedure
    .input(
      pageInput.extend({
        organizationId: id,
        search: z.string().trim().max(200).optional(),
        status: cohortFields.shape.status,
      }),
    )
    .query(async ({ ctx, input }) => {
      await requireOrganizationPermission({
        organizationId: input.organizationId,
        permission: "organization.manage",
        userId: ctx.actorUserId,
      });
      const where = {
        organizationId: input.organizationId,
        status: input.status,
        ...(input.search
          ? {
              OR: [
                {
                  name: {
                    contains: input.search,
                    mode: "insensitive" as const,
                  },
                },
                {
                  course: {
                    is: {
                      title: {
                        contains: input.search,
                        mode: "insensitive" as const,
                      },
                    },
                  },
                },
              ],
            }
          : {}),
      };
      const [items, total] = await Promise.all([
        db.cohort.findMany({
          where,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: input.limit + 1,
          cursor: input.cursor ? { id: input.cursor } : undefined,
          skip: input.cursor ? 1 : undefined,
          include: {
            course: { select: { id: true, title: true, thumbnailUrl: true } },
          },
        }),
        input.includeTotal
          ? db.cohort.count({ where })
          : Promise.resolve(undefined),
      ]);
      return pageResult(await withCohortCounts(items), input.limit, total);
    }),
  listForCurrentMember: protectedProcedure
    .input(
      pageInput.extend({
        organizationId: id,
        status: cohortFields.shape.status,
      }),
    )
    .query(async ({ ctx, input }) => {
      const member = await requireOrganizationMembership({
        organizationId: input.organizationId,
        userId: ctx.actorUserId,
      });
      const where = {
        organizationId: input.organizationId,
        status: input.status,
        ...getOrganizationCohortScope({
          membershipId: member.id,
          permissionMode: member.organization.permissionMode,
          role: member.role,
        }),
      };
      const [items, total] = await Promise.all([
        db.cohort.findMany({
          where,
          orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
          take: input.limit + 1,
          cursor: input.cursor ? { id: input.cursor } : undefined,
          skip: input.cursor ? 1 : undefined,
          include: {
            course: { select: { id: true, title: true, thumbnailUrl: true } },
          },
        }),
        input.includeTotal
          ? db.cohort.count({ where })
          : Promise.resolve(undefined),
      ]);
      return pageResult(await withCohortCounts(items), input.limit, total);
    }),
  list: protectedProcedure
    .input(
      pageInput.extend({
        courseId: id,
        search: z.string().trim().max(200).optional(),
        status: cohortFields.shape.status,
        sort: z.enum(["name", "createdAt", "updatedAt"]).default("updatedAt"),
        sortDirection: z.enum(["asc", "desc"]).default("desc"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const course = await requireCoursePermission({
        courseId: input.courseId,
        permission: "course.view",
        userId: ctx.actorUserId,
      });
      const where = {
        courseId: input.courseId,
        status: input.status,
        ...(input.search
          ? {
              name: {
                contains: input.search,
                mode: "insensitive" as const,
              },
            }
          : {}),
        ...(course.access.canViewAllCohorts
          ? {}
          : {
              staff: {
                some: {
                  organizationMember: { userId: ctx.actorUserId },
                },
              },
            }),
      };
      const orderBy =
        input.sort === "name"
          ? [{ name: input.sortDirection }, { id: input.sortDirection }]
          : input.sort === "createdAt"
            ? [{ createdAt: input.sortDirection }, { id: input.sortDirection }]
            : [{ updatedAt: input.sortDirection }, { id: input.sortDirection }];
      const [cohorts, total] = await Promise.all([
        db.cohort.findMany({
          where,
          orderBy,
          take: input.limit + 1,
          cursor: input.cursor ? { id: input.cursor } : undefined,
          skip: input.cursor ? 1 : undefined,
        }),
        input.includeTotal
          ? db.cohort.count({ where })
          : Promise.resolve(undefined),
      ]);
      const cohortIds = cohorts.map((cohort) => cohort.id);
      const [counted, learnerPreviews] = await Promise.all([
        withCohortCounts(cohorts),
        getCohortLearnerPreviews(cohortIds),
      ]);
      const items = counted.map((cohort) => ({
        ...cohort,
        learnerPreview: learnerPreviews.get(cohort.id) ?? [],
      }));
      return pageResult(items, input.limit, total);
    }),
  get: protectedProcedure
    .input(z.object({ cohortId: id }))
    .query(async ({ ctx, input }) => {
      const cohortAccess = await requireCohortPermission({
        cohortId: input.cohortId,
        permission: "view",
        userId: ctx.actorUserId,
      });
      const cohort = await db.cohort.findUniqueOrThrow({
        where: { id: input.cohortId },
        include: {
          course: {
            select: { id: true, title: true, thumbnailUrl: true },
          },
          staff: {
            include: {
              organizationMember: {
                include: {
                  user: {
                    select: { id: true, name: true, email: true, image: true },
                  },
                },
              },
            },
          },
        },
      });
      return { ...cohort, access: cohortAccess.access };
    }),
  create: protectedProcedure
    .input(cohortFields.extend({ courseId: id }))
    .mutation(async ({ ctx, input }) => {
      const course = await requireCoursePermission({
        courseId: input.courseId,
        permission: "course.view",
        userId: ctx.actorUserId,
      });
      if (!course.access.canCreateCohort) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return db.cohort.create({
        data: { ...input, organizationId: course.organizationId },
      });
    }),
  update: protectedProcedure
    .input(cohortFields.partial().extend({ cohortId: id }))
    .mutation(async ({ ctx, input }) => {
      const cohort = await requireCohortPermission({
        cohortId: input.cohortId,
        permission: "update",
        userId: ctx.actorUserId,
      });
      const { cohortId, ...data } = input;
      return ctx.db.$transaction(async (tx) => {
        const updated = await tx.cohort.update({
          where: { id: cohortId },
          data,
        });
        if (data.status === undefined && data.endsAt === undefined) {
          return updated;
        }

        const enrollments = await tx.cohortEnrollment.findMany({
          where: {
            cohortId,
            status: { in: ["ACTIVE", "COMPLETED"] },
          },
          select: { userId: true },
        });
        const userIds = enrollments.map(({ userId }) => userId);
        const now = new Date();
        const grantsAccess =
          (updated.status === "OPEN" || updated.status === "IN_PROGRESS") &&
          (updated.endsAt === null || updated.endsAt > now);
        if (grantsAccess) {
          await grantCohortCourseAccessForUsers(tx, {
            courseId: cohort.courseId,
            userIds,
            now,
          });
        } else {
          await tx.enrollmentInvite.updateMany({
            where: { cohortId, revokedAt: null },
            data: { revokedAt: new Date() },
          });
          await reconcileCohortCourseAccess(tx, {
            courseId: cohort.courseId,
            userIds,
            now,
          });
        }
        return updated;
      });
    }),
  delete: protectedProcedure
    .input(z.object({ cohortId: id }))
    .mutation(async ({ ctx, input }) => {
      const cohort = await requireCohortPermission({
        cohortId: input.cohortId,
        permission: "delete",
        userId: ctx.actorUserId,
      });
      await ctx.db.$transaction(async (tx) => {
        const enrollments = await tx.cohortEnrollment.findMany({
          where: { cohortId: input.cohortId },
          select: { userId: true },
        });
        await tx.cohortEnrollment.deleteMany({
          where: { cohortId: input.cohortId },
        });
        await tx.cohort.delete({ where: { id: input.cohortId } });
        await reconcileCohortCourseAccess(tx, {
          courseId: cohort.courseId,
          userIds: enrollments.map(({ userId }) => userId),
        });
      });
      return { deleted: true };
    }),
  addStaff: protectedProcedure
    .input(
      z.object({
        cohortId: id,
        email: z.string().trim().toLowerCase().email().max(320),
        role: z.enum(["INSTRUCTOR", "ASSISTANT"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const cohort = await requireManagedCohort(
        input.cohortId,
        ctx.actorUserId,
        "staff.manage",
      );
      const membership = await db.organizationMember.findFirst({
        where: {
          organizationId: cohort.organizationId,
          user: { email: input.email },
        },
        select: { id: true },
      });
      if (!membership) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No organization member was found for this email",
        });
      }
      const existing = await db.cohortStaff.findUnique({
        where: {
          cohortId_organizationMemberId: {
            cohortId: input.cohortId,
            organizationMemberId: membership.id,
          },
        },
        select: { id: true },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This member is already assigned to the cohort",
        });
      }
      return db.cohortStaff.create({
        data: {
          cohortId: input.cohortId,
          organizationMemberId: membership.id,
          organizationId: cohort.organizationId,
          role: input.role,
        },
      });
    }),
  updateStaff: protectedProcedure
    .input(
      z.object({
        cohortId: id,
        staffId: id,
        role: z.enum(["INSTRUCTOR", "ASSISTANT"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireCohortPermission({
        cohortId: input.cohortId,
        permission: "staff.manage",
        userId: ctx.actorUserId,
      });
      const result = await db.cohortStaff.updateMany({
        where: { id: input.staffId, cohortId: input.cohortId },
        data: { role: input.role },
      });
      if (!result.count) throw new TRPCError({ code: "NOT_FOUND" });
      return db.cohortStaff.findUniqueOrThrow({ where: { id: input.staffId } });
    }),
  removeStaff: protectedProcedure
    .input(z.object({ cohortId: id, staffId: id }))
    .mutation(async ({ ctx, input }) => {
      await requireCohortPermission({
        cohortId: input.cohortId,
        permission: "staff.manage",
        userId: ctx.actorUserId,
      });
      const result = await db.cohortStaff.deleteMany({
        where: { id: input.staffId, cohortId: input.cohortId },
      });
      if (!result.count) throw new TRPCError({ code: "NOT_FOUND" });
      return { removed: true };
    }),
  listMeetings: protectedProcedure
    .input(
      pageInput.extend({
        cohortId: id,
        search: z.string().trim().max(200).optional(),
        status: z
          .enum(["SCHEDULED", "STARTED", "ENDED", "CANCELLED"])
          .optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await requireCohortPermission({
        cohortId: input.cohortId,
        permission: "view",
        userId: ctx.actorUserId,
      });
      const where = {
        cohortId: input.cohortId,
        status: input.status,
        ...(input.search
          ? {
              title: {
                contains: input.search,
                mode: "insensitive" as const,
              },
            }
          : {}),
      };
      const [items, total] = await Promise.all([
        db.cohortMeeting.findMany({
          where,
          orderBy: [{ startsAt: "asc" }, { id: "asc" }],
          take: input.limit + 1,
          cursor: input.cursor ? { id: input.cursor } : undefined,
          skip: input.cursor ? 1 : undefined,
          include: {
            module: { select: { id: true, title: true } },
            createdBy: {
              include: { user: { select: { id: true, name: true } } },
            },
          },
        }),
        input.includeTotal
          ? db.cohortMeeting.count({ where })
          : Promise.resolve(undefined),
      ]);
      await Promise.all(
        items
          .filter((item) => item.googleCalendarEventId && !item.joinUrl)
          .map(async (item) => {
            try {
              const joinUrl = await getGoogleMeetingJoinUrl(
                item.organizationId,
                item.googleCalendarId ?? "primary",
                item.googleCalendarEventId!,
              );
              if (joinUrl) {
                await db.cohortMeeting.update({
                  where: { id: item.id },
                  data: { joinUrl },
                });
                item.joinUrl = joinUrl;
              }
            } catch (error) {
              console.error("Google Meet link could not be refreshed", {
                meetingId: item.id,
                error,
              });
            }
          }),
      );
      return pageResult(items, input.limit, total);
    }),
  listMeetingModules: protectedProcedure
    .input(z.object({ cohortId: id }))
    .query(async ({ ctx, input }) => {
      const cohort = await requireManagedCohort(
        input.cohortId,
        ctx.actorUserId,
        "view",
      );
      return db.courseModule.findMany({
        where: { courseId: cohort.courseId },
        select: { id: true, title: true, position: true },
        orderBy: [{ position: "asc" }, { id: "asc" }],
      });
    }),
  getMeetingIntegrationStatus: protectedProcedure
    .input(z.object({ cohortId: id }))
    .query(async ({ ctx, input }) => {
      const cohort = await requireManagedCohort(
        input.cohortId,
        ctx.actorUserId,
        "view",
      );
      const [organization, connection, googleConnection, membership] =
        await Promise.all([
          db.organization.findUniqueOrThrow({
            where: { id: cohort.organizationId },
            select: { meetingProvider: true },
          }),
          db.zoomConnection.findUnique({
            where: { organizationId: cohort.organizationId },
            select: { status: true },
          }),
          db.googleCalendarConnection.findUnique({
            where: { organizationId: cohort.organizationId },
            select: { status: true },
          }),
          db.organizationMember.findUnique({
            where: {
              organizationId_userId: {
                organizationId: cohort.organizationId,
                userId: ctx.actorUserId,
              },
            },
            select: { role: true },
          }),
        ]);

      return {
        provider: organization.meetingProvider,
        isConnected:
          organization.meetingProvider === "ZOOM"
            ? connection?.status === "CONNECTED"
            : googleConnection?.status === "CONNECTED",
        canConfigure:
          membership?.role === "OWNER" || membership?.role === "ADMIN",
      };
    }),
  createMeeting: protectedProcedure
    .input(meetingFields.extend({ cohortId: id }))
    .mutation(async ({ ctx, input }) => {
      const cohort = await requireManagedCohort(
        input.cohortId,
        ctx.actorUserId,
        "meetings.manage",
      );
      const member = await db.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: cohort.organizationId,
            userId: ctx.actorUserId,
          },
        },
      });
      if (!member) throw new TRPCError({ code: "FORBIDDEN" });
      await validateMeetingModule(cohort.courseId, input.moduleId);
      const organization = await db.organization.findUniqueOrThrow({
        where: { id: cohort.organizationId },
        select: { meetingProvider: true },
      });
      const provider = organization.meetingProvider;
      const remote = await createRemoteMeeting(
        provider,
        cohort.organizationId,
        input,
      );
      try {
        return await db.cohortMeeting.create({
          data: {
            ...input,
            ...remote,
            organizationId: cohort.organizationId,
            createdByMembershipId: member.id,
          },
        });
      } catch (error) {
        try {
          await deleteRemoteMeeting(cohort.organizationId, remote);
        } catch (cleanupError) {
          console.error("Orphaned meeting could not be removed", {
            provider,
            cleanupError,
          });
        }
        throw error;
      }
    }),
  updateMeeting: protectedProcedure
    .input(meetingFields.partial().extend({ cohortId: id, meetingId: id }))
    .mutation(async ({ ctx, input }) => {
      const cohort = await requireCohortPermission({
        cohortId: input.cohortId,
        permission: "meetings.manage",
        userId: ctx.actorUserId,
      });
      const { cohortId, meetingId, ...data } = input;
      const existing = await db.cohortMeeting.findFirst({
        where: { id: meetingId, cohortId },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      await validateMeetingModule(cohort.courseId, data.moduleId);
      const remoteInput = {
        title: data.title ?? existing.title,
        agenda: data.agenda === undefined ? existing.agenda : data.agenda,
        startsAt: data.startsAt ?? existing.startsAt,
        durationMinutes: data.durationMinutes ?? existing.durationMinutes,
        timezone: data.timezone ?? existing.timezone,
      };
      if (existing.provider === "ZOOM") {
        if (!existing.zoomMeetingId)
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Meeting is not linked to Zoom",
          });
        await updateZoomMeeting(
          existing.organizationId,
          existing.zoomMeetingId,
          remoteInput,
        );
      } else {
        if (!existing.googleCalendarEventId)
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Meeting is not linked to Google Meet",
          });
        await updateGoogleMeeting(
          existing.organizationId,
          existing.googleCalendarId ?? "primary",
          existing.googleCalendarEventId,
          remoteInput,
        );
      }
      const result = await db.cohortMeeting.updateMany({
        where: { id: meetingId, cohortId },
        data,
      });
      if (!result.count) throw new TRPCError({ code: "NOT_FOUND" });
      return db.cohortMeeting.findUniqueOrThrow({ where: { id: meetingId } });
    }),
  deleteMeeting: protectedProcedure
    .input(z.object({ cohortId: id, meetingId: id }))
    .mutation(async ({ ctx, input }) => {
      await requireCohortPermission({
        cohortId: input.cohortId,
        permission: "meetings.manage",
        userId: ctx.actorUserId,
      });
      const meeting = await db.cohortMeeting.findFirst({
        where: { id: input.meetingId, cohortId: input.cohortId },
      });
      if (!meeting) throw new TRPCError({ code: "NOT_FOUND" });
      await deleteRemoteMeeting(meeting.organizationId, meeting);
      const result = await db.cohortMeeting.deleteMany({
        where: { id: input.meetingId, cohortId: input.cohortId },
      });
      if (!result.count) throw new TRPCError({ code: "NOT_FOUND" });
      return { deleted: true };
    }),
});
