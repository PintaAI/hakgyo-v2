import { NextResponse } from "next/server";

import { env } from "~/env";
import { db } from "~/server/db";
import { recordPublicQuizCtaClick } from "~/server/public-quiz/service";

/** Counts a click on a public quiz's call to action, then opens the organization's page. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ quizId: string }> },
) {
  const { quizId } = await params;
  const organizationSlug = await recordPublicQuizCtaClick(db, quizId);
  return NextResponse.redirect(
    // APP_URL, not the request URL: behind the proxy the request origin is internal.
    new URL(organizationSlug ? `/${organizationSlug}` : "/", env.APP_URL),
    303,
  );
}
