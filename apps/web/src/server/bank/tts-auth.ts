import { timingSafeEqual } from "node:crypto";

import { env } from "~/env";

/** The TTS poller's bearer token (TTS_WORKER_SECRET); without it the internal routes stay closed. */
export function isTtsWorker(request: Request) {
  const secret = env.TTS_WORKER_SECRET;
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export const unauthorized = () =>
  Response.json({ error: "Unauthorized" }, { status: 401 });

/** Maps service errors (tRPC codes) to HTTP for the poller. */
export function ttsErrorResponse(error: unknown) {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : "";
  const status =
    code === "NOT_FOUND"
      ? 404
      : code === "CONFLICT"
        ? 409
        : code === "BAD_REQUEST"
          ? 400
          : 500;
  if (status === 500) console.error("TTS route failed", error);
  return Response.json(
    { error: error instanceof Error ? error.message : "Failed" },
    { status },
  );
}
