import type { NotifyPayload } from "~/server/notifications/types";
import type { Expo, ExpoPushMessage } from "expo-server-sdk";
import type * as WebPush from "web-push";

import { env } from "~/env";

export type PushTargetRef = {
  id: string;
  platform: string;
  endpoint: string | null;
  p256dh: string | null;
  auth: string | null;
  expoPushToken: string | null;
};

export type SendOutcome =
  | { status: "sent" }
  | { status: "gone"; reason: string }
  | { status: "failed"; reason: string };

// The push SDKs load on the first send instead of in the cold start of every
// function that imports this module (about 190 ms together).
let webPush: Promise<typeof WebPush> | undefined;

/** web-push with VAPID details set, or null when the keys are missing. */
async function getWebPush() {
  const publicKey = env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return null;
  webPush ??= import("web-push").then((module) => {
    module.setVapidDetails(
      `mailto:${env.VAPID_CONTACT_EMAIL ?? "owner@hakgyo.test"}`,
      publicKey,
      privateKey,
    );
    return module;
  });
  return webPush;
}

let expoClient: Promise<Expo> | undefined;

export function getExpo() {
  // With "enhanced push security" enabled in EAS, Expo rejects sends without
  // this token.
  expoClient ??= import("expo-server-sdk").then(
    ({ Expo }) =>
      new Expo(
        env.EXPO_ACCESS_TOKEN ? { accessToken: env.EXPO_ACCESS_TOKEN } : {},
      ),
  );
  return expoClient;
}

/** Android channel created by the mobile app (`DEFAULT_CHANNEL_ID`). */
const EXPO_CHANNEL_ID = "default";

export async function sendWebPush(
  target: PushTargetRef,
  payload: NotifyPayload,
): Promise<SendOutcome> {
  if (!target.endpoint || !target.p256dh || !target.auth) {
    return { status: "failed", reason: "missing subscription keys" };
  }
  const webpush = await getWebPush();
  if (!webpush) {
    return { status: "failed", reason: "VAPID keys not configured" };
  }
  try {
    await webpush.sendNotification(
      {
        endpoint: target.endpoint,
        keys: { p256dh: target.p256dh, auth: target.auth },
      },
      JSON.stringify({
        notificationId: payload.notificationId,
        title: payload.title,
        body: payload.body,
        path: payload.path,
        tag: payload.tag,
      }),
      { TTL: 60 * 60 * 24 },
    );
    return { status: "sent" };
  } catch (error) {
    const statusCode =
      typeof error === "object" &&
      error !== null &&
      "statusCode" in error &&
      typeof error.statusCode === "number"
        ? error.statusCode
        : undefined;
    // 404/410: the subscription is dead and will never recover — prune it.
    if (statusCode === 404 || statusCode === 410) {
      return { status: "gone", reason: `push service ${statusCode}` };
    }
    return {
      status: "failed",
      reason: error instanceof Error ? error.message : "web-push error",
    };
  }
}

export type ExpoSendOutcome = SendOutcome & { ticketId?: string };

/**
 * Sends one message per target through Expo in chunks of 100. Outcomes are
 * returned in input order; `ticketId` is set for accepted messages so their
 * receipts can be checked later.
 */
export async function sendExpoPushes(
  sends: Array<{ target: PushTargetRef; payload: NotifyPayload }>,
): Promise<ExpoSendOutcome[]> {
  const outcomes: ExpoSendOutcome[] = sends.map(() => ({
    status: "failed",
    reason: "not sent",
  }));
  const indexed: Array<{ index: number; message: ExpoPushMessage }> = [];
  const expo = await getExpo();
  const { Expo } = await import("expo-server-sdk");
  sends.forEach(({ target, payload }, index) => {
    if (!target.expoPushToken) {
      outcomes[index] = { status: "failed", reason: "missing Expo push token" };
    } else if (!Expo.isExpoPushToken(target.expoPushToken)) {
      outcomes[index] = { status: "gone", reason: "malformed Expo push token" };
    } else {
      indexed.push({
        index,
        message: {
          to: target.expoPushToken,
          title: payload.title,
          body: payload.body,
          data: {
            ...payload.data,
            notificationId: payload.notificationId,
            path: payload.path,
            mobilePath: payload.mobilePath,
          },
          sound: "default",
          priority: "high",
          channelId: EXPO_CHANNEL_ID,
          // Same-tag notifications replace each other (iOS / Android).
          collapseId: payload.tag,
          tag: payload.tag,
        },
      });
    }
  });

  for (let start = 0; start < indexed.length; start += 100) {
    const chunk = indexed.slice(start, start + 100);
    try {
      const tickets = await expo.sendPushNotificationsAsync(
        chunk.map(({ message }) => message),
      );
      chunk.forEach(({ index }, position) => {
        const ticket = tickets[position];
        if (!ticket) {
          outcomes[index] = { status: "failed", reason: "empty ticket" };
        } else if (ticket.status === "ok") {
          outcomes[index] = { status: "sent", ticketId: ticket.id };
        } else if (ticket.details?.error === "DeviceNotRegistered") {
          outcomes[index] = { status: "gone", reason: "DeviceNotRegistered" };
        } else {
          outcomes[index] = {
            status: "failed",
            reason: ticket.details?.error ?? ticket.message,
          };
        }
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "expo send error";
      for (const { index } of chunk) {
        outcomes[index] = { status: "failed", reason };
      }
    }
  }
  return outcomes;
}
