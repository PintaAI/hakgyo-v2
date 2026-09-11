import type { NotifyPayload } from "~/server/notifications/types";

import { db } from "~/server/db";
import { sendToTarget } from "~/server/notifications/sender";

export const MAX_ACTIVE_TARGETS_PER_USER = 20;

export type NotifyArgs = {
  userId: string;
  type: string;
  title: string;
  body: string;
  path?: string;
  mobilePath?: string;
  data?: Record<string, string>;
  organizationId?: string;
  tag?: string;
};

export type NotifyResult = {
  notificationId: string;
  unreadCount: number;
  sent: number;
  failed: number;
  pruned: number;
};

/**
 * The ONLY entry point domain code should use to notify a user.
 *
 * 1. Persists one inbox row (source of truth shared by web + mobile).
 * 2. Fans out to every active push target (web / iOS / Android) with
 *    per-target error isolation — one dead token never blocks the rest.
 * 3. Prunes tokens the push services report as permanently gone.
 *
 * Never called inside the same transaction as the domain write: a broken
 * push provider must not roll back a stored grade, enrollment, or meeting.
 */
export async function notifyUser(args: NotifyArgs): Promise<NotifyResult> {
  const path = args.path ?? "/";
  const notification = await db.notification.create({
    data: {
      userId: args.userId,
      organizationId: args.organizationId,
      type: args.type,
      title: args.title,
      body: args.body,
      path,
      mobilePath: args.mobilePath ?? path,
      data: args.data ?? undefined,
    },
    select: { id: true },
  });

  const [unreadCount, targets] = await Promise.all([
    db.notification.count({
      where: { userId: args.userId, readAt: null },
    }),
    db.pushTarget.findMany({
      where: { userId: args.userId, disabledAt: null },
      orderBy: { lastSeenAt: "desc" },
      take: MAX_ACTIVE_TARGETS_PER_USER,
      select: {
        id: true,
        platform: true,
        endpoint: true,
        p256dh: true,
        auth: true,
        expoPushToken: true,
      },
    }),
  ]);

  const payload: NotifyPayload = {
    notificationId: notification.id,
    title: args.title,
    body: args.body,
    path,
    mobilePath: args.mobilePath ?? path,
    tag: args.tag ?? `${args.type}:${notification.id}`,
  };

  const results = await Promise.allSettled(
    targets.map((target) => sendToTarget(target, payload)),
  );

  let sent = 0;
  let failed = 0;
  const goneIds: string[] = [];
  results.forEach((result, index) => {
    const target = targets[index];
    if (!target) return;
    if (result.status === "fulfilled" && result.value.status === "sent") {
      sent += 1;
      void db.pushTarget
        .update({
          where: { id: target.id },
          data: { lastDeliveredAt: new Date() },
        })
        .catch(() => undefined);
    } else if (
      result.status === "fulfilled" &&
      result.value.status === "gone"
    ) {
      goneIds.push(target.id);
    } else {
      failed += 1;
    }
  });

  if (goneIds.length > 0) {
    await db.pushTarget.updateMany({
      where: { id: { in: goneIds } },
      data: { disabledAt: new Date(), disabledReason: "endpoint gone" },
    });
  }

  return {
    notificationId: notification.id,
    unreadCount,
    sent,
    failed,
    pruned: goneIds.length,
  };
}

/** Disable every push target of a user (account deletion / suspension). */
export async function disableAllUserTargets(
  userId: string,
  reason: string,
): Promise<void> {
  await db.pushTarget.updateMany({
    where: { userId, disabledAt: null },
    data: { disabledAt: new Date(), disabledReason: reason },
  });
}
