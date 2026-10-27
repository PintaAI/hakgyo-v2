import { describe, expect, mock, test } from "bun:test";
import {
  MAX_LOG_ENTRIES_PER_WRITE,
  type AttemptLogEntry,
} from "@hakgyo/shared";

void mock.module("expo-sqlite/kv-store", () => ({
  default: {
    getItemSync: () => null,
    setItemSync: () => undefined,
    removeItemSync: () => undefined,
  },
}));

const { appendAttemptLog, compactAttemptLog } = await import("./attempt-log");

const clientAt = "2026-10-27T10:00:00.000Z";

describe("attempt log", () => {
  test("appends entries with increasing sequence numbers", () => {
    let log = {
      entries: [] as AttemptLogEntry[],
      nextSeq: 4,
      clockOffsetMs: 0,
    };
    log = appendAttemptLog(log, "QUESTION_SHOWN", { questionId: "q1" });
    log = appendAttemptLog(log, "ANSWERED", {
      questionId: "q1",
      optionIds: ["a"],
    });
    expect(log.entries.map((entry) => entry.seq)).toEqual([4, 5]);
    expect(log.nextSeq).toBe(6);
  });

  test("compacts without losing the last answer of any question", () => {
    const entries: AttemptLogEntry[] = [];
    let seq = 1;
    for (let round = 0; round < 30; round += 1) {
      for (let question = 0; question < 40; question += 1) {
        entries.push({
          seq: seq++,
          kind: "QUESTION_SHOWN",
          questionId: `q${question}`,
          clientAt,
        });
        entries.push({
          seq: seq++,
          kind: "ANSWERED",
          questionId: `q${question}`,
          optionIds: [`o${round}`],
          clientAt,
        });
      }
    }
    const compacted = compactAttemptLog(entries);
    expect(compacted.length).toBeLessThanOrEqual(MAX_LOG_ENTRIES_PER_WRITE);
    const answers = compacted.filter((entry) => entry.kind === "ANSWERED");
    expect(answers).toHaveLength(40);
    expect(answers.every((entry) => entry.optionIds?.[0] === "o29")).toBe(true);
  });
});
