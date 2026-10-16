import { getSafeRedirectPath, routeAccess } from "~/lib/access";

/** Where verification links land; it forwards, or explains a failed link. */
export const verifiedPath = "/auth/verified";

/**
 * Points Better Auth's verification link at `/auth/verified` instead of the
 * caller's callback URL. Better Auth redirects there with `?error=` when the
 * token is expired or invalid, so the page can explain it rather than
 * dropping the user on the destination signed out. Requests from the Expo app
 * (they carry `expo-origin`) get `app=1`: the browser that opens the link is
 * not the app, so the page sends them back to it instead of a web page.
 */
export function routeVerificationLink(url: string, request?: Request) {
  const link = new URL(url);
  const target = new URLSearchParams();
  if (request?.headers.get("expo-origin")) {
    target.set("app", "1");
  } else {
    const redirectTo = getSafeRedirectPath(
      link.searchParams.get("callbackURL"),
      ["/", routeAccess.signInPath],
    );
    if (redirectTo) target.set("redirectTo", redirectTo);
  }
  const query = target.toString();
  link.searchParams.set(
    "callbackURL",
    query ? `${verifiedPath}?${query}` : verifiedPath,
  );
  return link.toString();
}
