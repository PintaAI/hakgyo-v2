import type { NotifyPayload } from "~/server/notifications/types";

import { db } from "~/server/db";
import {
  type PushTargetRef,
  type SendOutcome,
  sendExpoPushes,
  sendWebPush,
} from "~/server/notifications/sender";

export const MAX_ACTIVE_TARGETS_PER_USER = 20;

export type NotifyContent = {
  type: string;
  title: string;
  body: string;
  path?: string;
  /** Expo Router route opened on tap; omit when the app has no screen. */
  mobilePath?: string;
  data?: Record<string, string>;
  organizationId?: string;
  /** Collapse key; same-tag notifications replace each other per device. */
  tag?: string;
};

export type NotifyArgs = NotifyContent & { userId: string };

export type NotifyUsersResult = {
  notified: number;
  sent: number;
  failed: number;
  pruned: number;
};

export type NotifyResult = NotifyUsersResult & {
  notificationId: string;
  unreadCount: number;
};

/**
 * The ONLY entry point domain code should use to notify users.
 *
 * 1. Persists one inbox row per user (source of truth shared by web + mobile).
 * 2. Fans out to every active push target (web / iOS / Android) with
 *    per-target error isolation; one dead token never blocks the rest.
 *    Expo messages are batched and their tickets kept for receipt checks.
 * 3. Prunes tokens the push services report as permanently gone.
 *
 * Never called inside the same transaction as the domain write: a broken
 * push provider must not roll back a stored grade, enrollment, or meeting.
 */
export async function notifyUsers(
  userIds: readonly string[],
  content: NotifyContent,
): Promise<{
  result: NotifyUsersResult;
  notificationIds: Map<string, string>;
}> {
  const recipients = [...new Set(userIds)];
  const notificationIds = new Map<string, string>();
  if (recipients.length === 0) {
    return {
      result: { notified: 0, sent: 0, failed: 0, pruned: 0 },
      notificationIds,
    };
  }
  const path = content.path ?? "/";
  const notifications = await db.notification.createManyAndReturn({
    data: recipients.map((userId) => ({
      userId,
      organizationId: content.organizationId,
      type: content.type,
      title: content.title,
      body: content.body,
      path,
      mobilePath: content.mobilePath ?? null,
      data: content.data ?? undefined,
    })),
    select: { id: true, userId: true },
  });
  for (const notification of notifications) {
    notificationIds.set(notification.userId, notification.id);
  }

  const allTargets = await db.pushTarget.findMany({
    where: { userId: { in: recipients }, disabledAt: null },
    orderBy: { lastSeenAt: "desc" },
    select: {
      id: true,
      userId: true,
      platform: true,
      endpoint: true,
      p256dh: true,
      auth: true,
      expoPushToken: true,
    },
  });
  const perUser = new Map<string, number>();
  const sends: Array<{ target: PushTargetRef; payload: NotifyPayload }> = [];
  for (const target of allTargets) {
    const count = perUser.get(target.userId) ?? 0;
    if (count >= MAX_ACTIVE_TARGETS_PER_USER) continue;
    perUser.set(target.userId, count + 1);
    const notificationId = notificationIds.get(target.userId);
    if (!notificationId) continue;
    sends.push({
      target,
      payload: {
        notificationId,
        title: content.title,
        body: content.body,
        path,
        mobilePath: content.mobilePath,
        tag: content.tag ?? `${content.type}:${notificationId}`,
        data: content.data,
      },
    });
  }

  const webSends = sends.filter(({ target }) => target.platform === "web");
  const expoSends = sends.filter(({ target }) => target.platform === "expo");
  const [webOutcomes, expoOutcomes] = await Promise.all([
    Promise.all(
      webSends.map(({ target, payload }) =>
        sendWebPush(target, payload).catch((error: unknown): SendOutcome => ({
          status: "failed",
          reason: error instanceof Error ? error.message : "web-push error",
        })),
      ),
    ),
    sendExpoPushes(expoSends),
  ]);

  let failed = sends.length - webSends.length - expoSends.length;
  const sentIds: string[] = [];
  const goneIds: string[] = [];
  const tickets: Array<{ pushTargetId: string; ticketId: string }> = [];
  const record = (target: PushTargetRef, outcome: SendOutcome) => {
    if (outcome.status === "sent") sentIds.push(target.id);
    else if (outcome.status === "gone") goneIds.push(target.id);
    else failed += 1;
  };
  webSends.forEach(({ target }, index) => {
    const outcome = webOutcomes[index];
    if (outcome) record(target, outcome);
  });
  expoSends.forEach(({ target }, index) => {
    const outcome = expoOutcomes[index];
    if (!outcome) return;
    record(target, outcome);
    if (outcome.ticketId) {
      tickets.push({ pushTargetId: target.id, ticketId: outcome.ticketId });
    }
  });

  await Promise.all([
    // Best-effort bookkeeping; delivery already happened.
    sentIds.length > 0
      ? db.pushTarget
          .updateMany({
            where: { id: { in: sentIds } },
            data: { lastDeliveredAt: new Date() },
          })
          .catch(() => undefined)
      : null,
    tickets.length > 0
      ? db.pushTicket
          .createMany({ data: tickets, skipDuplicates: true })
          .catch(() => undefined)
      : null,
    goneIds.length > 0
      ? db.pushTarget.updateMany({
          where: { id: { in: goneIds } },
          data: { disabledAt: new Date(), disabledReason: "endpoint gone" },
        })
      : null,
  ]);

  return {
    result: {
      notified: notifications.length,
      sent: sentIds.length,
      failed,
      pruned: goneIds.length,
    },
    notificationIds,
  };
}

/** Notifies one user and returns their new unread count. */
export async function notifyUser(args: NotifyArgs): Promise<NotifyResult> {
  const { userId, ...content } = args;
  const { result, notificationIds } = await notifyUsers([userId], content);
  const unreadCount = await db.notification.count({
    where: { userId, readAt: null },
  });
  return {
    ...result,
    notificationId: notificationIds.get(userId) ?? "",
    unreadCount,
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
