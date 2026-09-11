import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import type { db } from "~/server/db";
import {
  MAX_ACTIVE_TARGETS_PER_USER,
  notifyUser,
} from "~/server/notifications/dispatch";
import {
  deviceIdInputSchema,
  notifyInputSchema,
  registerDeviceSchema,
  subscribeWebSchema,
} from "~/server/notifications/schemas";

const deviceSelect = {
  id: true,
  platform: true,
  deviceName: true,
  os: true,
  appVersion: true,
  disabledAt: true,
  lastSeenAt: true,
  lastDeliveredAt: true,
  createdAt: true,
} as const;

type Db = typeof db;

async function enforceTargetCap(db: Db, userId: string) {
  const active = await db.pushTarget.findMany({
    where: { userId, disabledAt: null },
    orderBy: { lastSeenAt: "desc" },
    select: { id: true },
  });
  const overflow = active.slice(MAX_ACTIVE_TARGETS_PER_USER);
  if (overflow.length > 0) {
    await db.pushTarget.deleteMany({
      where: { id: { in: overflow.map((t) => t.id) } },
    });
  }
}

export const notificationRouter = createTRPCRouter({
  subscribeWeb: protectedProcedure
    .input(subscribeWebSchema)
    .mutation(async ({ ctx, input }) => {
      // Endpoint may be orphaned under another deviceId/user (shared device,
      // cleared storage). Remove stale owners before upserting.
      await ctx.db.pushTarget.deleteMany({
        where: {
          endpoint: input.endpoint,
          NOT: { userId: ctx.actorUserId, deviceId: input.deviceId },
        },
      });
      const target = await ctx.db.pushTarget.upsert({
        where: {
          userId_deviceId: {
            userId: ctx.actorUserId,
            deviceId: input.deviceId,
          },
        },
        create: {
          userId: ctx.actorUserId,
          platform: "web",
          deviceId: input.deviceId,
          endpoint: input.endpoint,
          p256dh: input.p256dh,
          auth: input.auth,
          userAgent: input.userAgent,
        },
        update: {
          platform: "web",
          endpoint: input.endpoint,
          p256dh: input.p256dh,
          auth: input.auth,
          userAgent: input.userAgent,
          disabledAt: null,
          disabledReason: null,
          lastSeenAt: new Date(),
        },
        select: { id: true },
      });
      await enforceTargetCap(ctx.db, ctx.actorUserId);
      return { subscribed: true, targetId: target.id };
    }),

  unsubscribeWeb: protectedProcedure
    .input(deviceIdInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { count } = await ctx.db.pushTarget.updateMany({
        where: {
          userId: ctx.actorUserId,
          deviceId: input.deviceId,
          platform: "web",
          disabledAt: null,
        },
        data: { disabledAt: new Date(), disabledReason: "unsubscribed" },
      });
      return { disabled: count > 0 };
    }),

  registerDevice: protectedProcedure
    .input(registerDeviceSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.pushTarget.deleteMany({
        where: {
          expoPushToken: input.expoPushToken,
          NOT: { userId: ctx.actorUserId, deviceId: input.deviceId },
        },
      });
      const target = await ctx.db.pushTarget.upsert({
        where: {
          userId_deviceId: {
            userId: ctx.actorUserId,
            deviceId: input.deviceId,
          },
        },
        create: {
          userId: ctx.actorUserId,
          platform: "expo",
          deviceId: input.deviceId,
          expoPushToken: input.expoPushToken,
          deviceName: input.deviceName,
          os: input.os,
          appVersion: input.appVersion,
        },
        update: {
          platform: "expo",
          expoPushToken: input.expoPushToken,
          deviceName: input.deviceName,
          os: input.os,
          appVersion: input.appVersion,
          disabledAt: null,
          disabledReason: null,
          lastSeenAt: new Date(),
        },
        select: { id: true },
      });
      await enforceTargetCap(ctx.db, ctx.actorUserId);
      return { registered: true, targetId: target.id };
    }),

  /** Disable ONE device (logout). Never touches the user's other devices. */
  disableDevice: protectedProcedure
    .input(deviceIdInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { count } = await ctx.db.pushTarget.updateMany({
        where: {
          userId: ctx.actorUserId,
          deviceId: input.deviceId,
          disabledAt: null,
        },
        data: { disabledAt: new Date(), disabledReason: "logout" },
      });
      return { disabled: count > 0 };
    }),

  listDevices: protectedProcedure.query(({ ctx }) =>
    ctx.db.pushTarget.findMany({
      where: { userId: ctx.actorUserId },
      orderBy: { lastSeenAt: "desc" },
      select: deviceSelect,
    }),
  ),

  revokeDevice: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { count } = await ctx.db.pushTarget.deleteMany({
        where: { id: input.id, userId: ctx.actorUserId },
      });
      return { revoked: count > 0 };
    }),

  inboxList: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().optional(),
        cursor: z.string().optional(),
        limit: z.number().int().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const items = await ctx.db.notification.findMany({
        where: {
          userId: ctx.actorUserId,
          ...(input.organizationId
            ? { organizationId: input.organizationId }
            : {}),
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: input.limit + 1,
        ...(input.cursor
          ? { cursor: { id: input.cursor }, skip: 1 }
          : {}),
        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          path: true,
          mobilePath: true,
          data: true,
          readAt: true,
          createdAt: true,
        },
      });
      const hasMore = items.length > input.limit;
      const page = hasMore ? items.slice(0, input.limit) : items;
      return {
        items: page,
        nextCursor: hasMore ? page[page.length - 1]?.id : undefined,
      };
    }),

  unreadCount: protectedProcedure.query(({ ctx }) =>
    ctx.db.notification.count({
      where: { userId: ctx.actorUserId, readAt: null },
    }),
  ),

  markRead: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const updated = await ctx.db.notification.updateMany({
        where: { id: input.id, userId: ctx.actorUserId, readAt: null },
        data: { readAt: new Date() },
      });
      return { marked: updated.count > 0 };
    }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    const updated = await ctx.db.notification.updateMany({
      where: { userId: ctx.actorUserId, readAt: null },
      data: { readAt: new Date() },
    });
    return { marked: updated.count };
  }),

  /** Sends a test push to the caller's own devices only. Rate-limited. */
  sendTest: protectedProcedure
    .input(notifyInputSchema.pick({ title: true, body: true }).partial())
    .mutation(async ({ ctx, input }) => {
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentTests = await ctx.db.notification.count({
        where: {
          userId: ctx.actorUserId,
          type: "test",
          createdAt: { gte: dayAgo },
        },
      });
      if (recentTests >= 20) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Test notification quota exceeded for today",
        });
      }
      return notifyUser({
        userId: ctx.actorUserId,
        type: "test",
        title: input.title ?? "Hakgyo test",
        body: input.body ?? "Notifikasi percobaan dari Hakgyo.",
        path: "/",
      });
    }),
});
