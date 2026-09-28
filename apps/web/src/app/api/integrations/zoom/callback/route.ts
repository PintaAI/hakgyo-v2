import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getActiveSession } from "~/server/better-auth/active-user";
import { db } from "~/server/db";
import {
  findIntegrationManager,
  integrationForbiddenResponse,
  redirectToIntegrationSettings,
} from "~/server/integrations/oauth-routes";
import { encryptZoomToken, exchangeZoomCode } from "~/server/integrations/zoom";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("zoom_oauth_state")?.value;
  const organizationId = cookieStore.get("zoom_oauth_organization")?.value;
  const session = await getActiveSession(request.headers);

  cookieStore.delete("zoom_oauth_state");
  cookieStore.delete("zoom_oauth_organization");

  if (!session?.user || !organizationId) {
    return new NextResponse("Invalid Zoom OAuth callback", { status: 400 });
  }
  const member = await findIntegrationManager({
    organizationId,
    userId: session.user.id,
  });
  if (!member) return integrationForbiddenResponse();
  // The user declined on Zoom's consent screen.
  if (url.searchParams.has("error")) {
    return redirectToIntegrationSettings(organizationId, { zoom: "cancelled" });
  }
  if (!code || !state || state !== expectedState) {
    return new NextResponse("Invalid Zoom OAuth callback", { status: 400 });
  }
  let exchanged: Awaited<ReturnType<typeof exchangeZoomCode>>;
  try {
    exchanged = await exchangeZoomCode(code);
  } catch (error) {
    console.error("Zoom OAuth code exchange failed", error);
    return new NextResponse("Could not connect Zoom. Try again.", {
      status: 502,
    });
  }
  const { tokens, user } = exchanged;
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
  return redirectToIntegrationSettings(organizationId, { zoom: "connected" });
}
