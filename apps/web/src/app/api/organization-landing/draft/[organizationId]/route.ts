import { TRPCError } from "@trpc/server";

import { getActiveSession } from "~/server/better-auth/active-user";
import { db } from "~/server/db";
import {
  landingDocumentResponse,
  landingNotFoundResponse,
} from "~/server/organization-landing/response";
import { renderDraftLanding } from "~/server/organization-landing/service";

export const dynamic = "force-dynamic";

/** Owner-only draft or revision preview framed by the landing page editor. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ organizationId: string }> },
) {
  const session = await getActiveSession(request.headers);
  if (!session) return landingNotFoundResponse();
  const { organizationId } = await params;
  const query = new URL(request.url).searchParams;
  try {
    return landingDocumentResponse(
      await renderDraftLanding({
        db,
        organizationId,
        actorUserId: session.user.id,
        editable: query.get("edit") === "1",
        revisionId: query.get("preview") ?? undefined,
      }),
    );
  } catch (error) {
    if (
      error instanceof TRPCError &&
      (error.code === "FORBIDDEN" || error.code === "NOT_FOUND")
    )
      return landingNotFoundResponse();
    throw error;
  }
}
