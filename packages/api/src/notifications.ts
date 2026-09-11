/**
 * Shared notification contract for web (Web Push + service worker) and
 * native (Expo Push + `expo-notifications`).
 *
 * TYPE-ONLY module: everything here must remain erasable so mobile can
 * import it without runtime transpilation of workspace sources.
 */
export type {
  NotificationType,
  NotifyPayload,
  PushPlatform,
} from "../../../apps/web/src/server/notifications/types";
