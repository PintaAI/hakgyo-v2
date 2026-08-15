import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  getSafeRedirectPath,
  getWorkspaceFallback,
  getWorkspaceRoute,
  isProtectedRoute,
  organizationRoleHeader,
  routeAccess,
} from "~/routing/access";
import { auth } from "~/server/better-auth";
import { db } from "~/server/db";

async function getSignedInDestination(userId: string) {
  const memberships = await db.organizationMember.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { organizationId: true, role: true },
  });
  const membership =
    memberships.find(({ role }) => role === "OWNER" || role === "ADMIN") ??
    memberships[0];

  if (membership) {
    return getWorkspaceFallback(membership.organizationId, membership.role);
  }

  const enrollment = await db.course.findFirst({
    where: {
      status: "PUBLISHED",
      OR: [
        {
          enrollments: {
            some: { userId, status: { in: ["ACTIVE", "COMPLETED"] } },
          },
        },
        {
          cohorts: {
            some: {
              enrollments: {
                some: { userId, status: { in: ["ACTIVE", "COMPLETED"] } },
              },
            },
          },
        },
      ],
    },
    select: { id: true },
  });

  return enrollment ? "/learn/courses" : routeAccess.signedInFallbackPath;
}

function redirectToSignIn(request: NextRequest) {
  const signInUrl = new URL(routeAccess.signInPath, request.url);
  signInUrl.searchParams.set(
    "redirectTo",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );
  return NextResponse.redirect(signInUrl);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!isProtectedRoute(pathname)) return NextResponse.next();

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return redirectToSignIn(request);

  if (pathname === routeAccess.postSignInPath) {
    const requestedPath = getSafeRedirectPath(
      request.nextUrl.searchParams.get("redirectTo"),
    );
    const destination =
      requestedPath ?? (await getSignedInDestination(session.user.id));
    return NextResponse.redirect(new URL(destination, request.url));
  }

  const workspaceRoute = getWorkspaceRoute(pathname);
  if (!workspaceRoute) return NextResponse.next();

  const membership = await db.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: workspaceRoute.organizationId,
        userId: session.user.id,
      },
    },
    select: { role: true },
  });

  if (!membership) {
    const destination = await getSignedInDestination(session.user.id);
    return NextResponse.redirect(new URL(destination, request.url));
  }

  if (pathname === `/workspace/${workspaceRoute.organizationId}`) {
    const destination = getWorkspaceFallback(
      workspaceRoute.organizationId,
      membership.role,
    );
    return NextResponse.redirect(new URL(destination, request.url));
  }

  if (!workspaceRoute.allowedRoles.includes(membership.role)) {
    const destination = getWorkspaceFallback(
      workspaceRoute.organizationId,
      membership.role,
    );
    return NextResponse.redirect(new URL(destination, request.url));
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(organizationRoleHeader, membership.role);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
