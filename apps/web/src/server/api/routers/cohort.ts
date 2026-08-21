import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  type CohortPermission,
  requireCohortPermission,
  requireCoursePermission,
  requireOrganizationPermission,
} from "~/server/authorization";
import { db } from "~/server/db";
import { pageInput, pageResult } from "~/server/api/pagination";
import {
  createZoomMeeting,
  deleteZoomMeeting,
  updateZoomMeeting,
} from "~/server/integrations/zoom";

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
});

async function requireManagedCohort(
  cohortId: string,
  userId: string,
  permission: CohortPermission,
) {
  const access = await requireCohortPermission({
    cohortId,
    userId,
    permission,
  });
  const cohort = await db.cohort.findUniqueOrThrow({
    where: { id: cohortId },
    select: { id: true, courseId: true, organizationId: true },
  });
  return { ...cohort, access: access.access };
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
            course: { select: { id: true, title: true } },
            _count: {
              select: { staff: true, enrollments: true, meetings: true },
            },
          },
        }),
        input.includeTotal
          ? db.cohort.count({ where })
          : Promise.resolve(undefined),
      ]);
      return pageResult(items, input.limit, total);
    }),
  list: protectedProcedure
    .input(
      pageInput.extend({
        courseId: id,
        search: z.string().trim().max(200).optional(),
        status: cohortFields.shape.status,
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
      const [items, total] = await Promise.all([
        db.cohort.findMany({
          where,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: input.limit + 1,
          cursor: input.cursor ? { id: input.cursor } : undefined,
          skip: input.cursor ? 1 : undefined,
          include: {
            _count: {
              select: { staff: true, enrollments: true, meetings: true },
            },
          },
        }),
        input.includeTotal
          ? db.cohort.count({ where })
          : Promise.resolve(undefined),
      ]);
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
      await requireCohortPermission({
        cohortId: input.cohortId,
        permission: "update",
        userId: ctx.actorUserId,
      });
      const { cohortId, ...data } = input;
      return db.cohort.update({ where: { id: cohortId }, data });
    }),
  delete: protectedProcedure
    .input(z.object({ cohortId: id }))
    .mutation(async ({ ctx, input }) => {
      await requireCohortPermission({
        cohortId: input.cohortId,
        permission: "delete",
        userId: ctx.actorUserId,
      });
      await db.cohort.delete({ where: { id: input.cohortId } });
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
            createdBy: {
              include: { user: { select: { id: true, name: true } } },
            },
          },
        }),
        input.includeTotal
          ? db.cohortMeeting.count({ where })
          : Promise.resolve(undefined),
      ]);
      return pageResult(items, input.limit, total);
    }),
  getMeetingIntegrationStatus: protectedProcedure
    .input(z.object({ cohortId: id }))
    .query(async ({ ctx, input }) => {
      const cohort = await requireManagedCohort(
        input.cohortId,
        ctx.actorUserId,
        "view",
      );
      const [connection, membership] = await Promise.all([
        db.zoomConnection.findUnique({
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
        isConnected: connection?.status === "CONNECTED",
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
      const meeting = await createZoomMeeting(cohort.organizationId, input);
      try {
        return await db.cohortMeeting.create({
          data: {
            ...input,
            organizationId: cohort.organizationId,
            createdByMembershipId: member.id,
            zoomMeetingId: String(meeting.id),
            zoomMeetingUuid: meeting.uuid,
            joinUrl: meeting.join_url,
          },
        });
      } catch (error) {
        try {
          await deleteZoomMeeting(cohort.organizationId, String(meeting.id));
        } catch (cleanupError) {
          console.error("Orphaned Zoom meeting could not be removed", {
            meetingId: meeting.id,
            cleanupError,
          });
        }
        throw error;
      }
    }),
  updateMeeting: protectedProcedure
    .input(meetingFields.partial().extend({ cohortId: id, meetingId: id }))
    .mutation(async ({ ctx, input }) => {
      await requireCohortPermission({
        cohortId: input.cohortId,
        permission: "meetings.manage",
        userId: ctx.actorUserId,
      });
      const { cohortId, meetingId, ...data } = input;
      const existing = await db.cohortMeeting.findFirst({
        where: { id: meetingId, cohortId },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      if (!existing.zoomMeetingId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Meeting is not linked to Zoom",
        });
      }
      await updateZoomMeeting(existing.organizationId, existing.zoomMeetingId, {
        title: data.title ?? existing.title,
        agenda: data.agenda === undefined ? existing.agenda : data.agenda,
        startsAt: data.startsAt ?? existing.startsAt,
        durationMinutes: data.durationMinutes ?? existing.durationMinutes,
        timezone: data.timezone ?? existing.timezone,
      });
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
      if (meeting.zoomMeetingId) {
        await deleteZoomMeeting(meeting.organizationId, meeting.zoomMeetingId);
      }
      const result = await db.cohortMeeting.deleteMany({
        where: { id: input.meetingId, cohortId: input.cohortId },
      });
      if (!result.count) throw new TRPCError({ code: "NOT_FOUND" });
      return { deleted: true };
    }),
});
