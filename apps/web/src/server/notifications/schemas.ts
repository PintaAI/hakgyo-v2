import { z } from "zod";

/** Client-generated stable device id (localStorage / SecureStore UUID). */
export const deviceIdSchema = z.string().uuid();

const PUSH_SERVICE_HOSTS = [
  "fcm.googleapis.com",
  "updates.push.services.mozilla.com",
  "notify.windows.com",
  "push.apple.com",
  "web.push.apple.com",
];

/** HTTPS endpoint belonging to a known browser push service. */
export const pushEndpointSchema = z
  .string()
  .url()
  .max(2000)
  .refine(
    (endpoint) => {
      let host: string;
      try {
        const url = new URL(endpoint);
        if (url.protocol !== "https:") return false;
        host = url.hostname.toLowerCase();
      } catch {
        return false;
      }
      return PUSH_SERVICE_HOSTS.some(
        (allowed) => host === allowed || host.endsWith(`.${allowed}`),
      );
    },
    { message: "Push endpoint must belong to a known push service" },
  );

export const subscribeWebSchema = z.object({
  deviceId: deviceIdSchema,
  endpoint: pushEndpointSchema,
  p256dh: z.string().min(1).max(500),
  auth: z.string().min(1).max(500),
  userAgent: z.string().max(1000).optional(),
});

const expoTokenSchema = z
  .string()
  .regex(/^ExponentPushToken\[[^\]]+\]$/, {
    message: "Invalid Expo push token",
  })
  .max(500);

export const registerDeviceSchema = z.object({
  deviceId: deviceIdSchema,
  expoPushToken: expoTokenSchema,
  deviceName: z.string().max(200).optional(),
  os: z.string().max(50).optional(),
  appVersion: z.string().max(50).optional(),
});

export const deviceIdInputSchema = z.object({ deviceId: deviceIdSchema });

export const notificationTypeSchema = z.enum([
  "test",
  "assessment-graded",
  "assessment-opened",
  "assessment-closing",
  "cohort-meeting",
  "enrollment",
  "announcement",
]);

export const notifyInputSchema = z.object({
  type: notificationTypeSchema,
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(1000),
  path: z.string().max(2000).default("/"),
  mobilePath: z.string().max(2000).optional(),
  data: z.record(z.string(), z.string()).optional(),
  organizationId: z.string().optional(),
  tag: z.string().max(200).optional(),
});
