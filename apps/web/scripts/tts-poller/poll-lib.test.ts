import { describe, expect, test } from "bun:test";

import { jobResult, workerInput, type ClaimedJob } from "./poll-lib";

const job: ClaimedJob = {
  id: "job1",
  token: "claim-1",
  clips: [
    { key: "prompt", lines: [{ voice: "F", text: "내일 몇 시에 와요?" }] },
    { key: "option-0", lines: [{ voice: "F", text: "아홉 시에 와요." }] },
  ],
  voices: { M: "man", F: "woman" },
};

describe("tts poller", () => {
  test("sends the worker only what it reads", () => {
    expect(workerInput([job])).toEqual([
      { id: "job1", clips: job.clips, voices: { M: "man", F: "woman" } },
    ]);
  });

  test("a job is done only with every clip's mp3", () => {
    expect(jobResult(job, { status: { ok: true }, has: () => true })).toEqual({
      ok: true,
      files: [
        { key: "prompt", path: "out/job1/prompt.mp3" },
        { key: "option-0", path: "out/job1/option-0.mp3" },
      ],
    });
    expect(
      jobResult(job, {
        status: { ok: true },
        has: (path) => path.endsWith("prompt.mp3"),
      }),
    ).toEqual({ ok: false, error: "Missing audio for option-0" });
  });

  test("worker errors and missing results fail the job", () => {
    expect(
      jobResult(job, {
        status: { ok: false, error: "CUDA out of memory" },
        has: () => false,
      }),
    ).toEqual({ ok: false, error: "CUDA out of memory" });
    expect(jobResult(job, { status: null, has: () => false })).toEqual({
      ok: false,
      error: "No result from the worker",
    });
  });
});
