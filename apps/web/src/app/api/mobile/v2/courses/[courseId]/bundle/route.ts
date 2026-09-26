import { gunzipSync } from "node:zlib";

import {
  bundleEtag,
  CLIENT_HEADER,
  MIN_SYNC_PROTOCOL,
  parseClientHeader,
  UPGRADE_REQUIRED_MESSAGE,
  type UpgradeRequiredData,
} from "@hakgyo/shared/mobile-sync";
import type { NextRequest } from "next/server";

import { createTRPCContext } from "~/server/api/trpc";
import { enrolledCourseWhere } from "~/server/learning/enrolled-courses";
import { courseBundleCache } from "~/server/mobile/course-bundle-cache";
import { getCourseRevisions } from "~/server/mobile/sync-log";

/**
 * Shared course bundle for protocol 2 mobile clients.
 *
 * The body is identical for every learner of the course, so it is built once
 * per revision and served gzip-compressed from the in-process cache. The
 * response is still private: it is only sent to learners enrolled in the
 * course, and `no-store` keeps intermediaries out of the picture.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ courseId: string }> },
) {
  const client = parseClientHeader(request.headers.get(CLIENT_HEADER));
  if (client.protocol === null || client.protocol < MIN_SYNC_PROTOCOL) {
    const body: { message: string; upgradeRequired: UpgradeRequiredData } = {
      message: UPGRADE_REQUIRED_MESSAGE,
      upgradeRequired: { minProtocol: MIN_SYNC_PROTOCOL },
    };
    return Response.json(body, { status: 426 });
  }

  const { courseId } = await context.params;
  const ctx = await createTRPCContext({ headers: request.headers });
  const userId = ctx.actorUserId;
  if (!userId)
    return Response.json({ message: "UNAUTHORIZED" }, { status: 401 });

  // Enrolled, published courses only; a course outside that set reads as
  // missing so the route never confirms which courses exist.
  const course = await ctx.db.course.findFirst({
    where: { AND: [await enrolledCourseWhere({ userId }), { id: courseId }] },
    select: { id: true },
  });
  if (!course) return Response.json({ message: "NOT_FOUND" }, { status: 404 });

  const revision =
    (await getCourseRevisions(ctx.db, [courseId])).get(courseId)?.bundle ?? "0";
  const currentEtag = bundleEtag(courseId, revision);
  if (request.headers.get("if-none-match") === currentEtag) {
    return new Response(null, {
      status: 304,
      headers: {
        ETag: currentEtag,
        "X-Bundle-Revision": revision,
        "Cache-Control": "private, no-store",
        Vary: "Accept-Encoding",
      },
    });
  }

  // May be a slightly older build (rebuild throttling); the headers carry the
  // revision actually served, so the next manifest check catches up.
  const bundle = await courseBundleCache.get(courseId, revision);
  // Native clients always accept gzip; anything else gets plain JSON.
  const acceptsGzip = /\bgzip\b/i.test(
    request.headers.get("accept-encoding") ?? "",
  );
  const body = acceptsGzip ? bundle.gzip : gunzipSync(bundle.gzip);
  return new Response(new Uint8Array(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      ...(acceptsGzip ? { "Content-Encoding": "gzip" } : {}),
      "Content-Length": String(body.byteLength),
      ETag: bundle.etag,
      "X-Bundle-Revision": bundle.revision,
      "Cache-Control": "private, no-store",
      Vary: "Accept-Encoding",
    },
  });
}
