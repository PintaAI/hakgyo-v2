import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

import { auth } from "~/server/better-auth";
import { requireOrganizationPermission } from "~/server/authorization";
import { getZoomAuthorizationUrl } from "~/server/integrations/zoom";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const organizationId = new URL(request.url).searchParams.get(
    "organizationId",
  );
  if (!organizationId) {
    return new NextResponse("organizationId is required", { status: 400 });
  }
  await requireOrganizationPermission({
    organizationId,
    permission: "organization.manage",
    userId: session.user.id,
  });

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
