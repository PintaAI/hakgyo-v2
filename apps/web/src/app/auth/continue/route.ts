import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { env } from "~/env";
import { getSafeRedirectPath, routeAccess } from "~/lib/access";
import { getSignedInDestination } from "~/server/auth/dal";
import { getSession } from "~/server/better-auth/server";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.redirect(new URL(routeAccess.signInPath, env.APP_URL));
  }

  const requestedPath = getSafeRedirectPath(
    request.nextUrl.searchParams.get("redirectTo"),
    [routeAccess.signInPath, routeAccess.postSignInPath],
  );
  const destination =
    requestedPath ?? (await getSignedInDestination(session.user.id));

  return NextResponse.redirect(new URL(destination, env.APP_URL));
}
