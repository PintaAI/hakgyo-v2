import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { env } from "~/env";
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

  cookieStore.delete("zoom_oauth_state");
  cookieStore.delete("zoom_oauth_organization");

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
  const existingConnection = await db.zoomConnection.findUnique({
    where: { organizationId },
    select: { zoomUserId: true },
  });
  if (existingConnection && existingConnection.zoomUserId !== user.id) {
    const linkedMeetings = await db.cohortMeeting.count({
      where: { organizationId, zoomMeetingId: { not: null } },
    });
    if (linkedMeetings > 0) {
      return new NextResponse(
        "Delete existing Zoom meetings before connecting a different Zoom account",
        { status: 409 },
      );
    }
  }
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
    new URL(
      `/zoom-test?zoom=connected&organizationId=${encodeURIComponent(organizationId)}`,
      env.APP_URL,
    ),
  );
  return response;
}
