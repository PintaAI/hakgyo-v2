import { db } from "~/server/db";
import { ttsUploadsInput, ttsUploadTargets } from "~/server/bank/tts";
import {
  isTtsWorker,
  ttsErrorResponse,
  unauthorized,
} from "~/server/bank/tts-auth";
import { guardRoute } from "~/server/maintenance";

/** Signed R2 uploads for a claimed job's audio files. */
export const POST = guardRoute(
  "write",
  async (request: Request, context: { params: Promise<{ jobId: string }> }) => {
    if (!isTtsWorker(request)) return unauthorized();
    const parsed = ttsUploadsInput.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success)
      return Response.json({ error: "Invalid input" }, { status: 400 });
    try {
      const { jobId } = await context.params;
      return Response.json({
        uploads: await ttsUploadTargets(db, jobId, parsed.data),
      });
    } catch (error) {
      return ttsErrorResponse(error);
    }
  },
);
