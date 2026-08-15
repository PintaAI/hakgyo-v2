import { redirect } from "next/navigation";

import { getSafeRedirectPath, routeAccess } from "~/lib/access";
import { getSignedInDestination, requireSession } from "~/server/auth/dal";

export default async function ContinuePage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const [session, query] = await Promise.all([requireSession(), searchParams]);
  const requestedPath = getSafeRedirectPath(query.redirectTo, [
    routeAccess.signInPath,
    routeAccess.postSignInPath,
  ]);
  redirect(requestedPath ?? (await getSignedInDestination(session.user.id)));
}
