import type { NotifyPayload } from "~/server/notifications/types";
import { Expo } from "expo-server-sdk";
import webpush from "web-push";

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

let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured) return true;
  const publicKey = env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(
    `mailto:${env.VAPID_CONTACT_EMAIL ?? "owner@hakgyo.test"}`,
    publicKey,
    privateKey,
  );
  vapidConfigured = true;
  return true;
}

const expo = new Expo();

export async function sendToTarget(
  target: PushTargetRef,
  payload: NotifyPayload,
): Promise<SendOutcome> {
  if (target.platform === "web") {
    return sendWebPush(target, payload);
  }
  if (target.platform === "expo") {
    return sendExpoPush(target, payload);
  }
  return { status: "failed", reason: `unknown platform ${target.platform}` };
}

async function sendWebPush(
  target: PushTargetRef,
  payload: NotifyPayload,
): Promise<SendOutcome> {
  if (!target.endpoint || !target.p256dh || !target.auth) {
    return { status: "failed", reason: "missing subscription keys" };
  }
  if (!ensureVapid()) {
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

async function sendExpoPush(
  target: PushTargetRef,
  payload: NotifyPayload,
): Promise<SendOutcome> {
  if (!target.expoPushToken) {
    return { status: "failed", reason: "missing Expo push token" };
  }
  if (!Expo.isExpoPushToken(target.expoPushToken)) {
    return { status: "gone", reason: "malformed Expo push token" };
  }
  try {
    const [ticket] = await expo.sendPushNotificationsAsync([
      {
        to: target.expoPushToken,
        title: payload.title,
        body: payload.body,
        data: {
          notificationId: payload.notificationId,
          path: payload.path,
          mobilePath: payload.mobilePath,
        },
      },
    ]);
    if (!ticket) return { status: "failed", reason: "empty ticket" };
    if (ticket.status === "ok") return { status: "sent" };
    if (ticket.details?.error === "DeviceNotRegistered") {
      return { status: "gone", reason: "DeviceNotRegistered" };
    }
    return {
      status: "failed",
      reason: ticket.details?.error ?? "expo ticket error",
    };
  } catch (error) {
    return {
      status: "failed",
      reason: error instanceof Error ? error.message : "expo send error",
    };
  }
}
