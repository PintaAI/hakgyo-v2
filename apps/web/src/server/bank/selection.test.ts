import { describe, expect, test } from "bun:test";
import { epsTopikBlueprint } from "@hakgyo/shared";

import {
  balancedKeyPositions,
  moveKeyTo,
  refersToOptionNumbers,
  selectPackage,
  unitWeight,
  type BankUnit,
} from "./selection";

const now = Date.parse("2026-10-28T00:00:00Z");
const topics = [
  "topik:k3",
  "topik:kehidupan",
  "topik:alat-kerja",
  "topik:budaya",
  "topik:lembaga",
];

/** Three made-up Hangul words that share no trigram with another `index`. */
const words = (index: number) =>
  [0, 1, 2]
    .map((word) =>
      [0, 1, 2]
        .map((char) =>
          String.fromCharCode(
            0xac00 + ((index * 9 + word * 3 + char) % 11_172),
          ),
        )
        .join(""),
    )
    .join(" ");

/** A bank with `perSlot` distinct questions for every slot of the blueprint. */
function bank(perSlot: number): BankUnit[] {
  const units: BankUnit[] = [];
  for (const section of epsTopikBlueprint.sections) {
    for (const slot of section.slots) {
      for (let copy = 0; copy < perSlot; copy += 1) {
        units.push({
          questionIds: [`q${slot.number}-${copy}`],
          groupId: null,
          type: slot.type,
          level: slot.difficulty,
          topic: topics[(slot.number + copy) % topics.length]!,
          text: words(slot.number * 10 + copy),
          organizationUses: 0,
          lastUsedAt: null,
          globalUses: 0,
        });
      }
    }
  }
  return units;
}

describe("selectPackage", () => {
  test("fills all 40 slots in order without repeating a question", () => {
    const result = selectPackage({
      blueprint: epsTopikBlueprint,
      units: bank(3),
      seed: "a",
      now,
    });
    expect(result.missing).toEqual([]);
    expect(result.picks.map((pick) => pick.number)).toEqual(
      Array.from({ length: 40 }, (_, index) => index + 1),
    );
    const ids = result.picks.flatMap((pick) => pick.unit.questionIds);
    expect(new Set(ids).size).toBe(40);
    for (const pick of result.picks) {
      expect(
        pick.unit.type === pick.slot.type ||
          pick.slot.alternatives?.includes(pick.unit.type),
      ).toBe(true);
    }
  });

  test("the same seed gives the same package, another seed another one", () => {
    const units = bank(4);
    const ids = (seed: string) =>
      selectPackage({
        blueprint: epsTopikBlueprint,
        units,
        seed,
        now,
      }).picks.flatMap((pick) => pick.unit.questionIds);
    expect(ids("seed-1")).toEqual(ids("seed-1"));
    expect(ids("seed-1")).not.toEqual(ids("seed-2"));
  });

  test("reports slots the bank cannot fill", () => {
    const units = bank(1).filter((unit) => unit.type !== "eps:L9");
    const result = selectPackage({
      blueprint: epsTopikBlueprint,
      units,
      seed: "a",
      now,
    });
    expect(result.missing).toEqual([
      { number: 40, type: "eps:L9", available: 0 },
    ]);
  });

  test("a group fills consecutive slots of its type", () => {
    const units = bank(1).filter(
      (unit) => !["q12-0", "q13-0"].includes(unit.questionIds[0]!),
    );
    units.push({
      questionIds: ["g-a", "g-b"],
      groupId: "group",
      type: "eps:R8",
      level: "sedang",
      topic: "topik:k3",
      text: "그룹 지문",
      organizationUses: 0,
      lastUsedAt: null,
      globalUses: 0,
    });
    const result = selectPackage({
      blueprint: epsTopikBlueprint,
      units,
      seed: "a",
      now,
    });
    const group = result.picks.find((pick) => pick.unit.groupId === "group");
    expect(group).toBeDefined();
    const covered = result.picks.flatMap((pick) => pick.unit.questionIds);
    expect(covered).toHaveLength(40);
  });

  test("repairs the work-topic share and same-topic runs", () => {
    const work = new Set(epsTopikBlueprint.workTopics.tags);
    // A third of the bank is about work, below the 40% the blueprint wants.
    const units = bank(6).map((unit, index) => ({
      ...unit,
      topic: [
        "topik:k3",
        "topik:alat-kerja",
        "topik:kehidupan",
        "topik:budaya",
        "topik:hobi",
        "topik:makanan",
      ][index % 6]!,
    }));
    for (const seed of ["a", "b", "c", "d", "e"]) {
      const result = selectPackage({
        blueprint: epsTopikBlueprint,
        units,
        seed,
        now,
      });
      expect(result.warnings).toEqual([]);
      for (const section of epsTopikBlueprint.sections) {
        const numbers = new Set(section.slots.map((slot) => slot.number));
        const topics = result.picks
          .filter((pick) => numbers.has(pick.number))
          .map((pick) => pick.unit.topic!);
        const share =
          topics.filter((topic) => work.has(topic)).length / topics.length;
        expect(share).toBeGreaterThanOrEqual(0.4);
        expect(share).toBeLessThanOrEqual(0.5);
        topics.slice(2).forEach((topic, index) => {
          expect(topic === topics[index] && topic === topics[index + 1]).toBe(
            false,
          );
        });
      }
    }
  });

  test("a group's questions each match their own slot", () => {
    const units = bank(1).filter(
      (unit) => !["q39-0", "q40-0"].includes(unit.questionIds[0]!),
    );
    const group: BankUnit = {
      questionIds: ["g-l8", "g-l9"],
      groupId: "dialogue",
      type: "eps:L8",
      memberTypes: ["eps:L8", "eps:L9"],
      level: "sulit",
      topic: "topik:k3",
      text: "긴 대화",
      organizationUses: 0,
      lastUsedAt: null,
      globalUses: 0,
    };
    const result = selectPackage({
      blueprint: epsTopikBlueprint,
      units: [...units, group],
      seed: "a",
      now,
    });
    expect(result.missing).toEqual([]);
    expect(result.picks.find((pick) => pick.unit === group)?.number).toBe(39);
    // Without its own types the group would not fit anywhere.
    const blind = selectPackage({
      blueprint: epsTopikBlueprint,
      units: [...units, { ...group, memberTypes: undefined }],
      seed: "a",
      now,
    });
    expect(blind.missing.map((slot) => slot.number)).toEqual([39, 40]);
  });

  test("near copies of a picked question are left out", () => {
    const units = bank(1);
    const twin = { ...units[0]!, questionIds: ["twin"] };
    const result = selectPackage({
      blueprint: epsTopikBlueprint,
      units: [...units, twin],
      seed: "a",
      now,
    });
    const ids = result.picks.flatMap((pick) => pick.unit.questionIds);
    expect(
      ids.includes("twin") && ids.includes(units[0]!.questionIds[0]!),
    ).toBe(false);
  });
});

describe("unitWeight", () => {
  const slot = epsTopikBlueprint.sections[0]!.slots[4]!; // R4, mudah
  const unit: BankUnit = {
    questionIds: ["q"],
    groupId: null,
    type: "eps:R4",
    level: "mudah",
    topic: null,
    text: "",
    organizationUses: 0,
    lastUsedAt: null,
    globalUses: 0,
  };

  test("prefers unused, unexposed questions of the slot's level", () => {
    const fresh = unitWeight(unit, slot, now);
    expect(
      unitWeight({ ...unit, organizationUses: 2 }, slot, now),
    ).toBeLessThan(fresh);
    expect(unitWeight({ ...unit, globalUses: 5 }, slot, now)).toBeLessThan(
      fresh,
    );
    expect(unitWeight({ ...unit, level: "sulit" }, slot, now)).toBeLessThan(
      fresh,
    );
    expect(
      unitWeight({ ...unit, lastUsedAt: now - 1000 }, slot, now),
    ).toBeLessThan(fresh);
  });
});

describe("answer positions", () => {
  test("keys are spread evenly", () => {
    const positions = balancedKeyPositions(20, "seed");
    expect(
      [0, 1, 2, 3].map(
        (position) => positions.filter((p) => p === position).length,
      ),
    ).toEqual([5, 5, 5, 5]);
    expect(balancedKeyPositions(20, "seed")).toEqual(positions);
  });

  test("text that names options by number is spotted", () => {
    expect(refersToOptionNumbers("Jawaban ② benar karena")).toBe(true);
    expect(refersToOptionNumbers("Pilihan 3 salah")).toBe(true);
    expect(refersToOptionNumbers("2번이 맞습니다")).toBe(true);
    expect(refersToOptionNumbers("안전모를 쓰십시오. 3시에 만나요")).toBe(
      false,
    );
  });

  test("moving the key keeps the other options in order", () => {
    const options = [
      { id: "a", isCorrect: true },
      { id: "b", isCorrect: false },
      { id: "c", isCorrect: false },
      { id: "d", isCorrect: false },
    ];
    expect(moveKeyTo(options, 2).map(({ id }) => id)).toEqual([
      "b",
      "c",
      "a",
      "d",
    ]);
    expect(moveKeyTo(options, 0).map(({ id }) => id)).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
  });
});
