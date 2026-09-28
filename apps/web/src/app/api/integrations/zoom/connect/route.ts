import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

import { getActiveSession } from "~/server/better-auth/active-user";
import { getZoomAuthorizationUrl } from "~/server/integrations/zoom";
import {
  findIntegrationManager,
  integrationForbiddenResponse,
} from "~/server/integrations/oauth-routes";

export async function GET(request: Request) {
  const session = await getActiveSession(request.headers);
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const organizationId = new URL(request.url).searchParams.get(
    "organizationId",
  );
  if (!organizationId) {
    return new NextResponse("organizationId is required", { status: 400 });
  }
  const member = await findIntegrationManager({
    organizationId,
    userId: session.user.id,
  });
  if (!member) return integrationForbiddenResponse();

  const state = randomBytes(32).toString("base64url");
  const response = NextResponse.redirect(getZoomAuthorizationUrl(state));
  response.cookies.set("zoom_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });
  response.cookies.set("zoom_oauth_organization", organizationId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });
  return response;
}
