import { db } from "~/server/db";
import { claimTtsJobs } from "~/server/bank/tts";
import {
  isTtsWorker,
  ttsErrorResponse,
  unauthorized,
} from "~/server/bank/tts-auth";
import { guardRoute } from "~/server/maintenance";

/** The VPS poller claims waiting TTS jobs (`?limit=`, default 3). */
export const POST = guardRoute("write", async (request: Request) => {
  if (!isTtsWorker(request)) return unauthorized();
  const limit = Math.min(
    10,
    Math.max(
      1,
      Number(new URL(request.url).searchParams.get("limit") ?? 3) || 3,
    ),
  );
  try {
    return Response.json({ jobs: await claimTtsJobs(db, limit) });
  } catch (error) {
    return ttsErrorResponse(error);
  }
});
