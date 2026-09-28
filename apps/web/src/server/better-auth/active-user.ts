import { auth } from ".";
import { db } from "~/server/db";

// Suspended and soft-deleted accounts lose access whatever credential they
// present: a browser session, a mobile cookie or an MCP access token.
export function isActiveUser(user: {
  suspendedAt?: Date | null;
  deletedAt?: Date | null;
}) {
  return !user.suspendedAt && !user.deletedAt;
}

/** Session for route handlers that sit outside tRPC; null when inactive. */
export async function getActiveSession(headers: Headers) {
  const session = await auth.api.getSession({ headers });
  return session && isActiveUser(session.user) ? session : null;
}

export async function isActiveUserId(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { suspendedAt: true, deletedAt: true },
  });
  return !!user && isActiveUser(user);
}
