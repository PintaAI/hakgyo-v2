import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  requireCohortPermission,
  requireCoursePermission,
} from "~/server/authorization";
import { db } from "~/server/db";
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

async function requireManagedCohort(cohortId: string, userId: string) {
  await requireCohortPermission({ cohortId, userId });
  return db.cohort.findUniqueOrThrow({
    where: { id: cohortId },
    select: { id: true, courseId: true, organizationId: true },
  });
}

export const cohortRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ courseId: id }))
    .query(async ({ ctx, input }) => {
      await requireCoursePermission({
        courseId: input.courseId,
        permission: "course.manage",
        userId: ctx.session.user.id,
      });
      return db.cohort.findMany({
        where: { courseId: input.courseId },
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { staff: true, enrollments: true, meetings: true },
          },
        },
      });
    }),
  get: protectedProcedure
    .input(z.object({ cohortId: id }))
    .query(async ({ ctx, input }) => {
      await requireCohortPermission({
        cohortId: input.cohortId,
        userId: ctx.session.user.id,
      });
      return db.cohort.findUniqueOrThrow({
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
          meetings: { orderBy: { startsAt: "asc" } },
        },
      });
    }),
  create: protectedProcedure
    .input(cohortFields.extend({ courseId: id }))
    .mutation(async ({ ctx, input }) => {
      const course = await requireCoursePermission({
        courseId: input.courseId,
        permission: "course.manage",
        userId: ctx.session.user.id,
      });
      return db.cohort.create({
        data: { ...input, organizationId: course.organizationId },
      });
    }),
  update: protectedProcedure
    .input(cohortFields.partial().extend({ cohortId: id }))
    .mutation(async ({ ctx, input }) => {
      await requireCohortPermission({
        cohortId: input.cohortId,
        userId: ctx.session.user.id,
      });
      const { cohortId, ...data } = input;
      return db.cohort.update({ where: { id: cohortId }, data });
    }),
  delete: protectedProcedure
    .input(z.object({ cohortId: id }))
    .mutation(async ({ ctx, input }) => {
      await requireCohortPermission({
        cohortId: input.cohortId,
        userId: ctx.session.user.id,
      });
      await db.cohort.delete({ where: { id: input.cohortId } });
      return { deleted: true };
    }),
  addStaff: protectedProcedure
    .input(
      z.object({
        cohortId: id,
        email: z.string().trim().toLowerCase().email().max(320),
        role: z.enum(["TEACHER", "MODERATOR"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const cohort = await requireManagedCohort(
        input.cohortId,
        ctx.session.user.id,
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
        role: z.enum(["TEACHER", "MODERATOR"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireCohortPermission({
        cohortId: input.cohortId,
        userId: ctx.session.user.id,
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
        userId: ctx.session.user.id,
      });
      const result = await db.cohortStaff.deleteMany({
        where: { id: input.staffId, cohortId: input.cohortId },
      });
      if (!result.count) throw new TRPCError({ code: "NOT_FOUND" });
      return { removed: true };
    }),
  listMeetings: protectedProcedure
    .input(z.object({ cohortId: id }))
    .query(async ({ ctx, input }) => {
      await requireCohortPermission({
        cohortId: input.cohortId,
        userId: ctx.session.user.id,
      });
      return db.cohortMeeting.findMany({
        where: { cohortId: input.cohortId },
        orderBy: { startsAt: "asc" },
        include: {
          createdBy: {
            include: { user: { select: { id: true, name: true } } },
          },
        },
      });
    }),
  createMeeting: protectedProcedure
    .input(meetingFields.and(z.object({ cohortId: id })))
    .mutation(async ({ ctx, input }) => {
      const cohort = await requireManagedCohort(
        input.cohortId,
        ctx.session.user.id,
      );
      const member = await db.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: cohort.organizationId,
            userId: ctx.session.user.id,
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
    .input(
      meetingFields.partial().and(z.object({ cohortId: id, meetingId: id })),
    )
    .mutation(async ({ ctx, input }) => {
      await requireCohortPermission({
        cohortId: input.cohortId,
        userId: ctx.session.user.id,
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
        userId: ctx.session.user.id,
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
