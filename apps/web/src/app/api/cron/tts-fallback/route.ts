import { timingSafeEqual } from "node:crypto";

import { env } from "~/env";
import { db } from "~/server/db";
import { overdueTtsJobs, runTtsWithOpenAi } from "~/server/bank/tts";
import { skipCronDuringMaintenance } from "~/server/maintenance";

export const runtime = "nodejs";
// Runs under Fluid compute's default 300-second limit (vercel.json enables Fluid); no
// `maxDuration`, so it shares a function with the other route handlers.

/** Jobs per run: each speaks a few lines, well inside the time limit. */
const JOBS_PER_RUN = 2;

function isAuthorized(request: Request) {
  const secret = env.CRON_SECRET;
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/**
 * Hourly fallback for question bank audio (docs/eps-question-generator.md section 6): jobs that
 * waited more than two hours for the GPU worker are spoken by OpenAI. Called by
 * `.github/workflows/tts-fallback.yml` with `Authorization: Bearer ${CRON_SECRET}`.
 */
async function handler(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const skipped = await skipCronDuringMaintenance();
  if (skipped) return skipped;
  if (!env.OPENAI_API_KEY) return Response.json({ skipped: "no-openai-key" });
  const { openAiSpeakLine } = await import("~/server/ai/bank-tts");
  const jobs = await overdueTtsJobs(db, JOBS_PER_RUN);
  let done = 0;
  let failed = 0;
  for (const job of jobs) {
    try {
      await runTtsWithOpenAi(db, job.id, openAiSpeakLine);
      done += 1;
    } catch (error) {
      console.error("TTS fallback failed", job.id, error);
      failed += 1;
    }
  }
  return Response.json({ done, failed });
}

export { handler as GET, handler as POST };
