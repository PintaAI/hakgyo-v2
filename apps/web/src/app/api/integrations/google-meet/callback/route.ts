import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getActiveSession } from "~/server/better-auth/active-user";
import { db } from "~/server/db";
import {
  encryptGoogleToken,
  exchangeGoogleCode,
} from "~/server/integrations/google-calendar";
import {
  findIntegrationManager,
  integrationForbiddenResponse,
  redirectToIntegrationSettings,
} from "~/server/integrations/oauth-routes";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("google_meet_oauth_state")?.value;
  const organizationId = cookieStore.get(
    "google_meet_oauth_organization",
  )?.value;
  const session = await getActiveSession(request.headers);
  cookieStore.delete("google_meet_oauth_state");
  cookieStore.delete("google_meet_oauth_organization");

  if (!session?.user || !organizationId) {
    return new NextResponse("Invalid Google Meet OAuth callback", {
      status: 400,
    });
  }
  const member = await findIntegrationManager({
    organizationId,
    userId: session.user.id,
  });
  if (!member) return integrationForbiddenResponse();
  // The user declined on Google's consent screen.
  if (url.searchParams.has("error")) {
    return redirectToIntegrationSettings(organizationId, {
      googleMeet: "cancelled",
    });
  }
  if (!code || !state || state !== expectedState) {
    return new NextResponse("Invalid Google Meet OAuth callback", {
      status: 400,
    });
  }
  let exchanged: Awaited<ReturnType<typeof exchangeGoogleCode>>;
  try {
    exchanged = await exchangeGoogleCode(code);
  } catch (error) {
    console.error("Google OAuth code exchange failed", error);
    return new NextResponse("Could not connect Google Meet. Try again.", {
      status: 502,
    });
  }
  const { tokens, user } = exchanged;
  if (
    !tokens.scope
      ?.split(" ")
      .includes("https://www.googleapis.com/auth/calendar.events")
  ) {
    return new NextResponse("Google Calendar permission was not granted", {
      status: 400,
    });
  }
  const existing = await db.googleCalendarConnection.findUnique({
    where: { organizationId },
    select: { googleUserId: true, encryptedRefreshToken: true, status: true },
  });
  if (existing && existing.googleUserId !== user.sub) {
    const linkedMeetings = await db.cohortMeeting.count({
      where: { organizationId, googleCalendarEventId: { not: null } },
    });
    if (linkedMeetings > 0) {
      return new NextResponse(
        "Delete existing Google Meet meetings before connecting a different Google account",
        { status: 409 },
      );
    }
  }
  const refreshToken = tokens.refresh_token
    ? encryptGoogleToken(tokens.refresh_token)
    : existing?.googleUserId === user.sub && existing.status === "CONNECTED"
      ? existing.encryptedRefreshToken
      : null;
  if (!refreshToken) {
    return new NextResponse(
      "Google did not grant offline access. Try connecting again.",
      { status: 400 },
    );
  }
  const connection = {
    connectedByMembershipId: member.id,
    googleUserId: user.sub,
    email: user.email,
    encryptedAccessToken: encryptGoogleToken(tokens.access_token),
    encryptedRefreshToken: refreshToken,
    accessTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    scope: tokens.scope,
    status: "CONNECTED" as const,
  };
  await db.googleCalendarConnection.upsert({
    where: { organizationId },
    update: connection,
    create: { ...connection, organizationId },
  });
  return redirectToIntegrationSettings(organizationId, {
    googleMeet: "connected",
  });
}
