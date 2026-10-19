import { NextResponse } from "next/server";

import { env } from "~/env";
import { db } from "~/server/db";
import { guardRoute, writesBlockedByMaintenance } from "~/server/maintenance";
import {
  getPublicQuizCtaSlug,
  recordPublicQuizCtaClick,
} from "~/server/public-quiz/service";

/** Counts a click on a public quiz's call to action, then opens the organization's page. */
async function handler(
  _request: Request,
  { params }: { params: Promise<{ quizId: string }> },
) {
  const { quizId } = await params;
  // The click count is a write: during read_only maintenance the visitor is
  // still sent on, uncounted.
  const organizationSlug = (await writesBlockedByMaintenance())
    ? await getPublicQuizCtaSlug(db, quizId)
    : await recordPublicQuizCtaClick(db, quizId);
  return NextResponse.redirect(
    // APP_URL, not the request URL: behind the proxy the request origin is internal.
    new URL(organizationSlug ? `/${organizationSlug}` : "/", env.APP_URL),
    303,
  );
}

export const GET = guardRoute("read", handler);
