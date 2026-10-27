import { describe, expect, test } from "bun:test";

import {
  epsTagVocabulary,
  normalizeTag,
  questionTagsSchema,
  sortTags,
  tagLabel,
  tagResults,
} from "./assessment-tags";

describe("question tags", () => {
  test("normalizes known prefixes", () => {
    expect(normalizeTag(" EPS:r2 ")).toBe("eps:R2");
    expect(normalizeTag("Topik:K3")).toBe("topik:k3");
    expect(normalizeTag("bab:12")).toBe("bab:12");
    expect(normalizeTag("partikel  을/를")).toBe("partikel 을/를");
  });

  test("validates and deduplicates", () => {
    expect(questionTagsSchema.parse(["eps:r2", "EPS:R2", "topik:k3"])).toEqual([
      "eps:R2",
      "topik:k3",
    ]);
    expect(questionTagsSchema.safeParse(["a,b"]).success).toBe(false);
    expect(questionTagsSchema.safeParse([""]).success).toBe(false);
    expect(
      questionTagsSchema.safeParse(
        Array.from({ length: 13 }, (_, i) => `t${i}`),
      ).success,
    ).toBe(false);
  });

  test("labels and orders like the blueprint", () => {
    expect(tagLabel("eps:R2")).toBe("R2 · Rambu K3");
    expect(tagLabel("bab:3")).toBe("Bab 3");
    expect(tagLabel("custom")).toBe("custom");
    expect(
      sortTags([
        "custom",
        "level:sulit",
        "eps:R10",
        "topik:k3",
        "eps:R2",
        "eps:L1",
      ]),
    ).toEqual([
      "eps:R2",
      "eps:R10",
      "eps:L1",
      "topik:k3",
      "level:sulit",
      "custom",
    ]);
    expect(
      epsTagVocabulary.filter((entry) => entry.group === "eps"),
    ).toHaveLength(25);
    expect(
      epsTagVocabulary.find((entry) => entry.tag === "eps:L4")?.section,
    ).toBe("listening");
  });

  test("summarizes an attempt per tag without the answer key", () => {
    const groups = tagResults(
      [
        { id: "q1", points: 2.5, tags: ["eps:R2", "topik:k3"] },
        { id: "q2", points: 2.5, tags: ["eps:R2"] },
        { id: "q3", points: 2.5, tags: [] },
      ],
      [
        { questionId: "q1", autoScore: 2.5 },
        { questionId: "q2", autoScore: 0 },
      ],
    );
    expect(groups.map((group) => group.label)).toEqual(["Tipe soal", "Topik"]);
    expect(groups[0]!.rows[0]).toMatchObject({
      tag: "eps:R2",
      correct: 1,
      total: 2,
      earned: 2.5,
      max: 5,
    });
    expect(groups[1]!.rows[0]).toMatchObject({
      tag: "topik:k3",
      correct: 1,
      total: 1,
    });
  });
});
