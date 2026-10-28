import { db } from "~/server/db";
import { completeTtsInput, completeTtsJob } from "~/server/bank/tts";
import {
  isTtsWorker,
  ttsErrorResponse,
  unauthorized,
} from "~/server/bank/tts-auth";
import { guardRoute } from "~/server/maintenance";

/** The poller uploaded a job's files: store them and put them in the question. */
export const POST = guardRoute(
  "write",
  async (request: Request, context: { params: Promise<{ jobId: string }> }) => {
    if (!isTtsWorker(request)) return unauthorized();
    const parsed = completeTtsInput.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success)
      return Response.json({ error: "Invalid input" }, { status: 400 });
    try {
      const { jobId } = await context.params;
      return Response.json(await completeTtsJob(db, jobId, parsed.data));
    } catch (error) {
      return ttsErrorResponse(error);
    }
  },
);
