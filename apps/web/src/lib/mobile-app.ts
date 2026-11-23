// Learning happens in the native app; the web only hands learners over to it.
// Store links stay null until the app is published, which renders the store
// badges as "Segera hadir". Until the store listings exist, iPhone users join
// the public TestFlight beta and Android users join the Google Play closed
// test: they join the Google Group the test is shared with, opt in as a
// tester, then install from Google Play.
export const mobileAppStoreLinks: {
  appStore: string | null;
  playStore: string | null;
  testFlight: string | null;
  androidBeta: {
    /** Public Google Group; only its members can opt in. */
    group: string;
    /** Play opt-in page, where a group member becomes a tester. */
    optIn: string;
    /** The listing, which installs only for testers until release. */
    install: string;
  } | null;
} = {
  appStore: null,
  playStore: null,
  testFlight: "https://testflight.apple.com/join/yGEtbK2q",
  androidBeta: {
    group: "https://groups.google.com/g/hakgyo-beta-testers",
    optIn: "https://play.google.com/apps/testing/com.rorez.hakgyo",
    install: "https://play.google.com/store/apps/details?id=com.rorez.hakgyo",
  },
};

/** The install steps on the app page, which the Android beta needs. */
export const appInstallGuidePath = "/aplikasi#pasang";

export const mobileAppScheme = "hakgyo";

/** Web page that hands a learner over to the app for one course. */
export function appHandoffPath(courseId: string) {
  return `/open/courses/${encodeURIComponent(courseId)}`;
}

/** Custom-scheme deep link handled by `apps/mobile/app/courses/[courseId].tsx`. */
export function appCourseDeepLink(courseId: string) {
  return `${mobileAppScheme}://courses/${encodeURIComponent(courseId)}`;
}

/** Custom-scheme deep link handled by `apps/mobile/app/courses/[courseId]/items/[courseItemId].tsx`. */
export function appCourseItemDeepLink(courseId: string, courseItemId: string) {
  return `${appCourseDeepLink(courseId)}/items/${encodeURIComponent(courseItemId)}`;
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
