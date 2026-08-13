import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "~/server/better-auth";
import { requireOrganizationPermission } from "~/server/authorization";
import { db } from "~/server/db";
import { encryptZoomToken, exchangeZoomCode } from "~/server/integrations/zoom";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("zoom_oauth_state")?.value;
  const organizationId = cookieStore.get("zoom_oauth_organization")?.value;
  const session = await auth.api.getSession({ headers: request.headers });

  if (
    !session?.user ||
    !code ||
    !state ||
    state !== expectedState ||
    !organizationId
  ) {
    return new NextResponse("Invalid Zoom OAuth callback", { status: 400 });
  }
  const member = await requireOrganizationPermission({
    organizationId,
    permission: "organization.manage",
    userId: session.user.id,
  });
  const { tokens, user } = await exchangeZoomCode(code);
  await db.zoomConnection.upsert({
    where: { organizationId },
    update: {
      connectedByMembershipId: member.id,
      zoomAccountId: user.account_id,
      zoomUserId: user.id,
      encryptedAccessToken: encryptZoomToken(tokens.access_token),
      encryptedRefreshToken: encryptZoomToken(tokens.refresh_token),
      accessTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      scope: tokens.scope,
      status: "CONNECTED",
    },
    create: {
      organizationId,
      connectedByMembershipId: member.id,
      zoomAccountId: user.account_id,
      zoomUserId: user.id,
      encryptedAccessToken: encryptZoomToken(tokens.access_token),
      encryptedRefreshToken: encryptZoomToken(tokens.refresh_token),
      accessTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      scope: tokens.scope,
    },
  });

  const response = NextResponse.redirect(
    new URL("/?zoom=connected", request.url),
  );
  response.cookies.delete("zoom_oauth_state");
  response.cookies.delete("zoom_oauth_organization");
  return response;
}
