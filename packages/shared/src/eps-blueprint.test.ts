import { describe, expect, test } from "bun:test";

import {
  blueprintIssueText,
  checkBlueprint,
  epsTopikBlueprint,
} from "./eps-blueprint";

const [reading, listening] = epsTopikBlueprint.sections;

/** Questions that match every slot of a section exactly. */
const matching = (section: NonNullable<typeof reading>, work = 0) =>
  section.slots.map((slot, index) => ({
    id: `q${slot.number}`,
    tags: [
      slot.type,
      `level:${slot.difficulty}`,
      index < work ? "topik:k3" : "topik:kehidupan",
    ],
  }));

describe("epsTopikBlueprint", () => {
  test("has 40 numbered slots, 20 per section, and scores to 100", () => {
    const numbers = epsTopikBlueprint.sections.flatMap((section) =>
      section.slots.map(({ number }) => number),
    );
    expect(numbers).toEqual(
      Array.from({ length: 40 }, (_, index) => index + 1),
    );
    expect(numbers.length * epsTopikBlueprint.pointsPerQuestion).toBe(100);
  });

  test("reading tags only reading types, listening only listening types", () => {
    expect(reading!.slots.every((slot) => slot.type.startsWith("eps:R"))).toBe(
      true,
    );
    expect(
      listening!.slots.every((slot) => slot.type.startsWith("eps:L")),
    ).toBe(true);
  });
});

describe("checkBlueprint", () => {
  test("a matching package has no issues", () => {
    const report = checkBlueprint(epsTopikBlueprint, [
      matching(reading!, 9),
      matching(listening!, 9),
    ]);
    expect(report.map((section) => section.issues)).toEqual([[], []]);
    expect(report.every((section) => section.workShareOk)).toBe(true);
  });

  test("alternatives are accepted, wrong types and levels are reported", () => {
    const questions = matching(reading!, 9);
    questions[0] = { id: "q1", tags: ["eps:R13", "level:mudah", "topik:k3"] };
    questions[3] = { id: "q4", tags: ["eps:R1", "level:sulit"] };
    const [report] = checkBlueprint(epsTopikBlueprint, [questions, []]);
    expect(report!.issues.map((issue) => [issue.kind, issue.number])).toEqual([
      ["TYPE", 4],
      ["LEVEL", 4],
    ]);
    expect(blueprintIssueText(report!.issues[0]!)).toBe(
      "Soal 4: seharusnya R2 · Rambu K3, tertulis R1 · Gambar ke kata atau kalimat.",
    );
  });

  test("any allowed tag counts when a question has several", () => {
    const questions = matching(reading!, 9);
    questions[0] = {
      id: "q1",
      tags: ["eps:R2", "eps:R1", "level:sulit", "level:mudah", "topik:k3"],
    };
    const [report] = checkBlueprint(epsTopikBlueprint, [questions, []]);
    expect(report!.issues).toEqual([]);
  });

  test("missing and extra questions, and the work-topic share", () => {
    const report = checkBlueprint(epsTopikBlueprint, [
      matching(reading!).slice(0, 19),
      [...matching(listening!, 15), { id: "extra", tags: [] }],
    ]);
    expect(report[0]!.issues).toMatchObject([{ kind: "MISSING", number: 20 }]);
    expect(report[0]!.workShareOk).toBe(false);
    expect(report[1]!.issues).toMatchObject([{ kind: "EXTRA", number: 21 }]);
    expect(blueprintIssueText(report[0]!.issues[0]!)).toContain(
      "Soal 20 belum ada",
    );
  });
});
