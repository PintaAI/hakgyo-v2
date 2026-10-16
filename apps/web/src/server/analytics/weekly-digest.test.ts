import { describe, expect, test } from "bun:test";

import { buildWeeklyDigestBody } from "./weekly-digest";

const summary = {
  learners: 104,
  activeLearners: { current: 46, previous: 43 },
  averageScore: { current: 0.734, previous: 0.82 },
  revenue: { current: 7_500_000, previous: 3_600_000 },
};

describe("buildWeeklyDigestBody", () => {
  test("summarizes learners, scores and revenue", () => {
    expect(buildWeeklyDigestBody(summary)).toBe(
      "7 hari terakhir: 46 dari 104 murid aktif (+7%), rata-rata nilai 73%, pendapatan Rp\u00a07.500.000 (+108%).",
    );
  });

  test("leaves out revenue for teachers and missing scores", () => {
    expect(
      buildWeeklyDigestBody({
        ...summary,
        averageScore: { current: null, previous: null },
        revenue: null,
      }),
    ).toBe("7 hari terakhir: 46 dari 104 murid aktif (+7%).");
  });

  test("sends nothing without learners", () => {
    expect(buildWeeklyDigestBody({ ...summary, learners: 0 })).toBeNull();
  });
});
