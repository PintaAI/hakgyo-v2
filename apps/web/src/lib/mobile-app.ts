// Learning happens in the native app; the web only hands learners over to it.
// Store links stay null until the app is published, which renders the store
// badges as "Segera hadir".
export const mobileAppStoreLinks: {
  appStore: string | null;
  playStore: string | null;
} = {
  appStore: null,
  playStore: null,
};

export const mobileAppScheme = "hakgyo";

/** Web page that hands a learner over to the app for one course. */
export function appHandoffPath(courseId: string) {
  return `/open/courses/${encodeURIComponent(courseId)}`;
}

/** Custom-scheme deep link handled by `apps/mobile/app/courses/[courseId].tsx`. */
export function appCourseDeepLink(courseId: string) {
  return `${mobileAppScheme}://courses/${encodeURIComponent(courseId)}`;
}

/**
 * Chrome on Android resolves `intent:` URLs and, when no installed app handles
 * the scheme, silently navigates to the fallback instead of showing an error.
 * No package is pinned so both the dev and production builds can answer it.
 */
export function androidCourseIntent(courseId: string, fallbackUrl: string) {
  return [
    `intent://courses/${encodeURIComponent(courseId)}#Intent`,
    `scheme=${mobileAppScheme}`,
    `S.browser_fallback_url=${encodeURIComponent(fallbackUrl)}`,
    "end",
  ].join(";");
}

export type HandoffPlatform = "ios" | "android" | "desktop";

export function detectHandoffPlatform(
  userAgent: string,
  maxTouchPoints = 0,
): HandoffPlatform {
  if (/android/i.test(userAgent)) return "android";
  if (/iphone|ipad|ipod/i.test(userAgent)) return "ios";
  // iPadOS reports a desktop Safari user agent but has a touch screen.
  if (/macintosh/i.test(userAgent) && maxTouchPoints > 1) return "ios";
  return "desktop";
}
