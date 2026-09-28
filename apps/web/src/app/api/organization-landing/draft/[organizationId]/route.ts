import { TRPCError } from "@trpc/server";

import { auth } from "~/server/better-auth";
import { db } from "~/server/db";
import {
  landingDocumentResponse,
  landingNotFoundResponse,
} from "~/server/organization-landing/response";
import { renderDraftLanding } from "~/server/organization-landing/service";

export const dynamic = "force-dynamic";

/** Owner-only draft preview framed by the landing page editor. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ organizationId: string }> },
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return landingNotFoundResponse();
  const { organizationId } = await params;
  try {
    return landingDocumentResponse(
      await renderDraftLanding({
        db,
        organizationId,
        actorUserId: session.user.id,
        editable: new URL(request.url).searchParams.get("edit") === "1",
      }),
    );
  } catch (error) {
    if (error instanceof TRPCError && error.code === "FORBIDDEN")
      return landingNotFoundResponse();
    throw error;
  }
}
