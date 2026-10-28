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

  test("nothing is marked reviewed before the founder checks the Korean", () => {
    expect(epsTaxonomy.every((type) => !type.reviewed)).toBe(true);
  });

  test("the reference card marks the key and warns against copying", () => {
    const card = epsReferenceCard(epsTypeByTag("eps:R8")!);
    expect(card).toContain("R8 · Kalimat rumpang");
    expect(card).toContain("① 끄고 (kunci)");
    expect(card).toContain("jangan disalin");
  });
});
