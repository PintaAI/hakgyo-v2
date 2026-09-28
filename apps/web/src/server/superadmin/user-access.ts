import type { PrismaClient } from "../../../generated/prisma/client";

/**
 * Signs a user out everywhere. MCP clients hold OAuth tokens that outlive
 * browser sessions, so those go too; access tokens already issued as JWTs are
 * rejected by the MCP route's active-account check until they expire.
 */
export async function revokeUserAccess(database: PrismaClient, userId: string) {
  await database.$transaction([
    database.session.deleteMany({ where: { userId } }),
    database.oauthAccessToken.deleteMany({ where: { userId } }),
    database.oauthRefreshToken.deleteMany({ where: { userId } }),
  ]);
}
