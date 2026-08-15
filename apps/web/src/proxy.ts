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

export const config = {
  matcher: [
    "/account/:path*",
    "/auth/continue",
    "/invite/:path*",
    "/learn/:path*",
    "/workspace/:path*",
  ],
};
