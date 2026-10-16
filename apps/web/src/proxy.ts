import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

import { isProtectedRoute, routeAccess } from "~/lib/access";

function redirectToSignIn(request: NextRequest) {
  const signInUrl = new URL(routeAccess.signInPath, request.url);
  signInUrl.searchParams.set(
    "redirectTo",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );
  return NextResponse.redirect(signInUrl);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!isProtectedRoute(pathname)) return NextResponse.next();
  return getSessionCookie(request)
    ? NextResponse.next()
    : redirectToSignIn(request);
}

// Only full page loads go through the proxy, to keep the deep link in
// `redirectTo`. Client navigations, prefetches and server actions skip it
// (each proxy run is a separate function call); their layouts and pages still
// redirect signed-out visitors through requireSession. Next reads the matcher
// at build time, so it has to stay literal.
export const config = {
  matcher: [
    {
      source: "/auth/continue",
      missing: [
        { type: "header", key: "rsc" },
        { type: "header", key: "next-action" },
      ],
    },
    {
      source: "/learn/:path*",
      missing: [
        { type: "header", key: "rsc" },
        { type: "header", key: "next-action" },
      ],
    },
    {
      source: "/onboarding",
      missing: [
        { type: "header", key: "rsc" },
        { type: "header", key: "next-action" },
      ],
    },
    {
      source: "/organizations/:path*",
      missing: [
        { type: "header", key: "rsc" },
        { type: "header", key: "next-action" },
      ],
    },
    {
      source: "/workspace/:path*",
      missing: [
        { type: "header", key: "rsc" },
        { type: "header", key: "next-action" },
      ],
    },
    {
      source: "/superadmin/:path*",
      missing: [
        { type: "header", key: "rsc" },
        { type: "header", key: "next-action" },
      ],
    },
  ],
};
