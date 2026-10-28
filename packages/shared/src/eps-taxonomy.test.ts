import { describe, expect, test } from "bun:test";

import { epsTagVocabulary } from "./assessment-tags";
import { epsTopikBlueprint } from "./eps-blueprint";
import { epsReferenceCard, epsTaxonomy, epsTypeByTag } from "./eps-taxonomy";

describe("epsTaxonomy", () => {
  test("describes every EPS type tag exactly once", () => {
    const typeTags = epsTagVocabulary
      .filter((entry) => entry.group === "eps")
      .map((entry) => entry.tag);
    expect(epsTaxonomy.map((type) => type.tag)).toEqual(typeTags);
  });

  test("covers every type the blueprint uses", () => {
    const used = epsTopikBlueprint.sections.flatMap((section) =>
      section.slots.flatMap((slot) => [
        slot.type,
        ...(slot.alternatives ?? []),
      ]),
    );
    for (const tag of used) expect(epsTypeByTag(tag)?.tag).toBe(tag);
  });

  test("examples are complete and listening examples have a script", () => {
    for (const type of epsTaxonomy) {
      expect(type.examples.length).toBeGreaterThan(0);
      for (const example of type.examples) {
        expect(new Set(example.options).size).toBe(4);
        expect(example.key).toBeLessThan(4);
        if (type.audio !== "none") expect(example.script).toBeTruthy();
      }
    }
  });

  test("keys are spread over the four positions", () => {
    const keys = epsTaxonomy.flatMap((type) =>
      type.examples.map((example) => example.key),
    );
    const counts = [0, 1, 2, 3].map(
      (position) => keys.filter((key) => key === position).length,
    );
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
  });

  test("moving the key keeps the answer", () => {
    const r8 = epsTypeByTag("EPS:r8")!;
    expect(r8.examples[0]!.options[r8.examples[0]!.key]).toBe("끄고");
  });

  test("the reference card marks the key and warns against copying", () => {
    const card = epsReferenceCard(epsTypeByTag("eps:R8")!);
    expect(card).toContain("R8 · Kalimat rumpang");
    expect(card).toMatch(/[①②③④] 끄고 \(kunci\)/);
    expect(card).toContain("jangan disalin");
  });
});
