import { expect, test } from "bun:test";

import { buildAssessmentAnswerContentUpdate } from "./assessment-answer-content";

test.skipIf(!process.env.DATABASE_URL)(
  "binds CASE flags as PostgreSQL booleans through the Neon adapter",
  async () => {
    const { db } = await import("./db");

    try {
      const updated = await db.$executeRaw(
        buildAssessmentAnswerContentUpdate("missing-attempt", [
          { questionId: "written-question", content: "answer" },
          { questionId: "choice-question" },
        ]),
      );
      expect(updated).toBe(0);
    } finally {
      await db.$disconnect();
    }
  },
);
