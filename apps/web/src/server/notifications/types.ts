/**
 * Canonical notification contract. Re-exported type-only through
 * `@hakgyo/api` so web, mobile, and the service worker all share one shape.
 *
 * Keep this module free of runtime imports: the service worker (`sw.ts`)
 * documents the same shape inline and must stay dependency-light.
 */

/** Push delivery channel. One `pushTarget` row per device. */
export type PushPlatform = "web" | "expo";

/**
 * Wire payload delivered to every device. Both the web service worker and
 * the future Expo notification handler interpret this shape. Keep it under
 * ~4KB: identifiers + short copy only.
 */
export interface NotifyPayload {
  notificationId: string;
  title: string;
  body: string;
  /** Web route opened on notification click. Defaults to `/`. */
  path: string;
  /** Expo-router route for the native tap handler. Defaults to `path`. */
  mobilePath: string;
  /** Collapse key: same-tag notifications replace each other per device. */
  tag: string;
}

/** Inbox event kinds. Domain triggers reuse these; add new kinds here. */
export type NotificationType =
  | "test"
  | "assessment-graded"
  | "assessment-opened"
  | "assessment-closing"
  | "cohort-meeting"
  | "enrollment"
  | "announcement";
