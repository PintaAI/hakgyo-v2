import { z } from "zod";

import { db } from "~/server/db";
import { failTtsJob } from "~/server/bank/tts";
import {
  isTtsWorker,
  ttsErrorResponse,
  unauthorized,
} from "~/server/bank/tts-auth";
import { guardRoute } from "~/server/maintenance";

const input = z.object({ error: z.string().max(2000) });

/** A run failed on the worker: try again later, or fail for good after the last attempt. */
export const POST = guardRoute(
  "write",
  async (request: Request, context: { params: Promise<{ jobId: string }> }) => {
    if (!isTtsWorker(request)) return unauthorized();
    const parsed = input.safeParse(await request.json().catch(() => null));
    if (!parsed.success)
      return Response.json({ error: "Invalid input" }, { status: 400 });
    try {
      const { jobId } = await context.params;
      return Response.json(await failTtsJob(db, jobId, parsed.data.error));
    } catch (error) {
      return ttsErrorResponse(error);
    }
  },
);
