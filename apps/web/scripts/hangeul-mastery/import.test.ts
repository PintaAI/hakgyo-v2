import { describe, expect, test } from "bun:test";

import { audio, letters, syllableGrid, vocabularyRef } from "./blocks";
import { collectCourseAudioTexts, voiceVersion } from "./audio-manifest";
import type { CourseContent } from "./content-types";
import { buildDesiredCourse, type DesiredCourse } from "./desired";
import { fixtureAudioTexts, fixtureContent } from "./fixture-content";
import {
  entryId,
  isValidKey,
  itemId,
  moduleId,
  optionId,
  questionId,
} from "./ids";
import { collectPlaceholders, replacePlaceholders } from "./placeholders";
import {
  canonicalJson,
  planHasChanges,
  planImport,
  sameValue,
  type Snapshot,
} from "./plan";

const assetIdOf = (text: string) => `asset-${text}`;

function build(content: CourseContent = fixtureContent) {
  return buildDesiredCourse(content, { resolveAudio: assetIdOf });
}

function emptySnapshot(): Snapshot {
  return {
    organizationId: "hakgyo-system-organization",
    course: {
      id: "hakgyo-foundation-hangeul-mastery",
      title: "Hangeul Mastery",
      description: "old",
      status: "PUBLISHED",
      progressionMode: "SEQUENTIAL",
      enrollmentMode: "OPEN",
      price: 0,
    },
    modules: [],
    items: [],
    materials: [],
    requirements: [],
    vocabularySets: [],
    entries: [],
    assessments: [],
    questions: [],
    options: [],
    materialAssets: [],
    assessmentAssets: [],
    placedElsewhere: new Set(),
    setProgress: new Map(),
  };
}

/** The snapshot the database would hold after importing `course` (what loadSnapshot reads back). */
function snapshotOf(course: DesiredCourse): Snapshot {
  const snapshot = emptySnapshot();
  const organizationId = snapshot.organizationId;
  snapshot.course = {
    ...snapshot.course!,
    title: course.title,
    description: course.description,
  };
  // jsonb does not keep key order; reverse it to prove the comparison ignores it.
  const reorder = (value: unknown): unknown =>
    JSON.parse(canonicalJson(value), (_key, node: unknown) =>
      node && typeof node === "object" && !Array.isArray(node)
        ? Object.fromEntries(Object.entries(node).reverse())
        : node,
    );
  for (const courseModule of course.modules) {
    snapshot.modules.push({
      id: courseModule.id,
      courseId: snapshot.course.id,
      title: courseModule.title,
      description: courseModule.description,
      position: courseModule.position,
    });
    for (const item of courseModule.items) {
      snapshot.items.push({
        id: item.id,
        moduleId: item.moduleId,
        courseId: snapshot.course.id,
        type: item.type,
        position: item.position,
        materialId: item.materialId,
        vocabularySetId: item.vocabularySetId,
        assessmentId: item.assessmentId,
        isPublished: true,
        learnerData: {
          progress: 0,
          attempts: 0,
          events: 0,
          practiceAttempts: 0,
        },
      });
      if (item.material) {
        const { requirements, assetIds, ...material } = item.material;
        snapshot.materials.push({
          ...material,
          content: reorder(material.content),
          organizationId,
          requirementPolicy: "ALL",
        });
        snapshot.requirements.push(...requirements);
        snapshot.materialAssets.push(
          ...assetIds.map((assetId) => ({ parentId: material.id, assetId })),
        );
      }
      if (item.vocabularySet) {
        const { entries, ...set } = item.vocabularySet;
        snapshot.vocabularySets.push({ ...set, organizationId });
        snapshot.entries.push(
          ...entries.map((entry) => ({
            ...entry,
            createdAt: new Date(entry.createdAt),
            progressCount: 0,
          })),
        );
      }
      if (item.assessment) {
        const { questions, assetIds, ...assessment } = item.assessment;
        snapshot.assessments.push({ ...assessment, organizationId });
        snapshot.assessmentAssets.push(
          ...assetIds.map((assetId) => ({ parentId: assessment.id, assetId })),
        );
        for (const { options, ...question } of questions) {
          snapshot.questions.push({
            ...question,
            prompt: reorder(question.prompt),
            answerCount: 0,
          });
          snapshot.options.push(
            ...options.map((option) => ({ ...option, selectionCount: 0 })),
          );
        }
      }
    }
  }
  return snapshot;
}

describe("ids", () => {
  test("derive from keys", () => {
    expect(moduleId("m1-basic-vowels")).toBe("hm-m1-basic-vowels");
    expect(itemId("m1-quiz")).toBe("hm-m1-quiz-item");
    expect(questionId("m1-quiz", "listen-a")).toBe("hm-m1-quiz-q-listen-a");
    expect(optionId(questionId("m1-quiz", "listen-a"), "ㅏ")).toMatch(
      /^hm-m1-quiz-q-listen-a-o-[0-9a-f]{12}$/,
    );
  });

  test("option ids hash the authored content, not the position", () => {
    const question = questionId("m1-quiz", "listen-a");
    expect(optionId(question, " ㅏ ")).toBe(optionId(question, "ㅏ"));
    expect(optionId(question, "ㅏ")).not.toBe(optionId(question, "ㅓ"));
    // blocks hash by canonical JSON, so key order does not matter
    expect(
      optionId(question, [{ type: "paragraph", props: { a: 1, b: 2 } }]),
    ).toBe(optionId(question, [{ props: { b: 2, a: 1 }, type: "paragraph" }]));
  });

  test("entry ids hash the normalized term, so order does not matter", () => {
    expect(entryId("m1-vocab", "아이")).toBe(entryId("m1-vocab", " 아이 "));
    // NFD (decomposed jamo) and NFC are the same term
    expect(entryId("m1-vocab", "아이".normalize("NFD"))).toBe(
      entryId("m1-vocab", "아이"),
    );
    expect(entryId("m1-vocab", "아이")).not.toBe(entryId("m1-vocab", "오이"));
    expect(entryId("m1-vocab", "아이")).toMatch(/^hm-m1-vocab-e-[0-9a-f]{12}$/);
  });

  test("keys are kebab-case", () => {
    expect(isValidKey("m1-vowels-o-u")).toBe(true);
    expect(isValidKey("M1_vowels")).toBe(false);
    expect(isValidKey("m1--x")).toBe(false);
  });
});

describe("placeholders", () => {
  test("are found and replaced inside JSON-string props", () => {
    const block = letters("Vokal", [
      {
        character: "ㅏ",
        cue: "a",
        say: "아",
        example: { word: "아이", meaning: "anak" },
      },
    ]);
    expect(collectPlaceholders(block).audio).toEqual(["아", "아이"]);

    const replaced = replacePlaceholders(block, (placeholder) =>
      assetIdOf(placeholder.value),
    );
    const cards = JSON.parse(replaced.props!.letters as string) as {
      assetId: string;
      example: { assetId: string };
    }[];
    expect(cards[0]!.assetId).toBe("asset-아");
    expect(cards[0]!.example.assetId).toBe("asset-아이");
    expect(block.props!.letters).toContain(audio("아"));
  });

  test("leave untouched values identical", () => {
    const block = syllableGrid("Baca", ["ㅇ"], ["ㅏ"], { syllables: [] });
    expect(replacePlaceholders(block, () => "x")).toBe(block);
    const plain = { text: "[not json", list: ["a", 1, null] };
    expect(replacePlaceholders(plain, () => "x")).toBe(plain);
  });

  test("item references are collected separately", () => {
    expect(collectPlaceholders([vocabularyRef("m1-vocab")])).toEqual({
      audio: [],
      items: ["m1-vocab"],
    });
  });
});

describe("audio texts", () => {
  test("cover every placeholder and vocabulary term, once", () => {
    expect(collectCourseAudioTexts(fixtureContent).sort()).toEqual(
      [...fixtureAudioTexts].sort(),
    );
  });

  test("voice version changes with the settings", () => {
    const voice = {
      reference: "voice/voice-ref.wav",
      referenceSha256: "abc",
      referenceText: "안녕하세요",
      description: "",
      cfg: 2,
      steps: 20,
      processing: "v1",
    };
    expect(voiceVersion(voice)).toBe(
      voiceVersion({ ...voice, description: "other" }),
    );
    expect(voiceVersion(voice)).not.toBe(voiceVersion({ ...voice, cfg: 3 }));
  });
});

describe("desired course", () => {
  test("resolves references, audio and documents", () => {
    const { course, errors, missingAudio } = build();
    expect(errors).toEqual([]);
    expect(missingAudio).toEqual([]);
    const [lesson, vocab, review, quiz] = course.modules[0]!.items;
    expect(lesson!.material!.content).toContainEqual({
      type: "vocabularyReference",
      props: { vocabularySetId: "hm-m1-vocab-vocab" },
    });
    expect(review!.material!.content).toContainEqual({
      type: "assessmentReference",
      props: { assessmentId: "hm-m1-quiz-assessment" },
    });
    expect(lesson!.material!.requirements[0]).toMatchObject({
      type: "VOCABULARY_SET",
      vocabularySetId: "hm-m1-vocab-vocab",
      position: 0,
    });
    expect(lesson!.material!.assetIds).toEqual([
      "asset-아",
      "asset-아이",
      "asset-어",
      "asset-오",
    ]);
    expect(
      vocab!.vocabularySet!.entries.map((entry) => entry.audioAssetId),
    ).toEqual(["asset-아이", "asset-오이"]);
    expect(vocab!.vocabularySet!.entries[1]!.createdAt.getTime()).toBe(
      vocab!.vocabularySet!.entries[0]!.createdAt.getTime() + 1,
    );
    const question = quiz!.assessment!.questions[1]!;
    expect(question.prompt).toEqual([
      {
        type: "paragraph",
        content: [{ type: "text", text: "Apa arti 아이?", styles: {} }],
      },
    ]);
    expect(quiz!.assessment!.assetIds).toEqual(["asset-아"]);
  });

  test("reports missing audio unless allowed, and then strips it", () => {
    const failing = buildDesiredCourse(fixtureContent, {
      resolveAudio: () => undefined,
    });
    expect(
      failing.errors.some((error) =>
        error.includes("audio clip(s) have no asset"),
      ),
    ).toBe(true);

    const allowed = buildDesiredCourse(fixtureContent, {
      resolveAudio: () => undefined,
      allowMissingAudio: true,
    });
    expect(allowed.errors).toEqual([]);
    const cards = JSON.parse(
      (
        allowed.course.modules[0]!.items[0]!.material!.content as {
          props?: { letters?: string };
        }[]
      )[2]!.props!.letters!,
    ) as { assetId: string }[];
    expect(cards[0]!.assetId).toBe("");
  });

  test("rejects references to other modules, bad keys and unready assessments", () => {
    const content = structuredClone(fixtureContent);
    content.modules.push({
      key: "m2-core-consonants",
      title: "Konsonan",
      description: "",
      items: [
        {
          type: "material",
          key: "m2-lesson",
          title: "x",
          description: "",
          blocks: [vocabularyRef("m1-vocab")],
        },
        {
          type: "assessment",
          key: "m2-quiz",
          title: "q",
          description: "",
          passingScore: 80,
          questions: [
            {
              key: "Bad_Key",
              prompt: "?",
              options: [
                { content: "a", correct: true },
                { content: "b", correct: true },
              ],
            },
          ],
        },
      ],
    });
    const { errors } = build(content);
    expect(
      errors.some((error) =>
        error.includes('"m1-vocab" is in module m1-basic-vowels'),
      ),
    ).toBe(true);
    expect(
      errors.some((error) => error.includes("key must be kebab-case")),
    ).toBe(true);
    expect(errors.some((error) => error.includes("m2-quiz is not ready"))).toBe(
      true,
    );
  });

  test("validates documents against the block catalog", () => {
    const content = structuredClone(fixtureContent);
    const lesson = content.modules[0]!.items[0]!;
    if (lesson.type !== "material") throw new Error("fixture changed");
    lesson.blocks.push({ type: "notABlock" });
    expect(
      build(content).errors.some((error) =>
        error.includes('Unknown block type "notABlock"'),
      ),
    ).toBe(true);
  });
});

describe("plan", () => {
  test("creates everything in an empty database", () => {
    const { course } = build();
    const plan = planImport(course, emptySnapshot());
    expect(plan.course.update?.fields).toEqual(["description"]);
    expect(plan.modules.create).toHaveLength(1);
    expect(plan.items.create).toHaveLength(4);
    expect(plan.options.create).toHaveLength(4);
    expect(plan.materialAssets.create).toHaveLength(4);
    expect(planHasChanges(plan, false)).toBe(true);
  });

  test("is unchanged when the database already matches (key order ignored)", () => {
    const { course } = build();
    const plan = planImport(course, snapshotOf(course));
    expect(planHasChanges(plan, true)).toBe(false);
    expect(plan.materials.unchanged).toBe(2);
    expect(plan.questions.unchanged).toBe(2);
  });

  test("updates only the fields that changed", () => {
    const { course } = build();
    const snapshot = snapshotOf(course);
    snapshot.entries[0]!.definition = "old";
    snapshot.questions[0]!.position = 5;
    snapshot.materialAssets.push({
      parentId: "hm-m1-review-material",
      assetId: "stale-asset",
    });
    const plan = planImport(course, snapshot);
    expect(plan.entries.update).toEqual([
      {
        id: snapshot.entries[0]!.id,
        data: { definition: "anak" },
        fields: ["definition"],
      },
    ]);
    expect(plan.questions.update.map((row) => row.fields)).toEqual([
      ["position"],
    ]);
    expect(plan.materialAssets.remove.map((row) => row.label)).toEqual([
      "stale-asset",
    ]);
  });

  test("reports stale rows, moves kept ones behind the content and blocks learner data", () => {
    const { course } = build();
    const snapshot = snapshotOf(course);
    snapshot.modules.unshift({
      id: "hakgyo-foundation-hangeul-module",
      courseId: snapshot.course!.id,
      title: "Mulai dengan Hangeul",
      description: null,
      position: 1,
    });
    snapshot.items.push({
      id: "hakgyo-foundation-hangeul-introduction-item",
      moduleId: "hakgyo-foundation-hangeul-module",
      courseId: snapshot.course!.id,
      type: "MATERIAL",
      position: 1,
      materialId: "hakgyo-foundation-hangeul-introduction",
      vocabularySetId: null,
      assessmentId: null,
      isPublished: true,
      learnerData: { progress: 3, attempts: 0, events: 0, practiceAttempts: 0 },
    });
    snapshot.materials.push({
      id: "hakgyo-foundation-hangeul-introduction",
      organizationId: snapshot.organizationId,
      title: "Mengenal Hangeul",
      description: null,
      content: [],
      requirementPolicy: "ALL",
    });
    // a removed entry with progress, and a stale hm- resource nobody places
    snapshot.entries.push({
      ...snapshot.entries[0]!,
      id: entryId("m1-vocab", "우유"),
      term: "우유",
      progressCount: 2,
    });
    snapshot.assessments.push({
      ...snapshot.assessments[0]!,
      id: "hm-old-quiz-assessment",
      title: "Old quiz",
    });
    // placed by another course: never pruned
    snapshot.vocabularySets.push({
      id: "hm-shared-vocab",
      organizationId: snapshot.organizationId,
      title: "Shared",
      description: null,
    });
    snapshot.placedElsewhere.add("hm-shared-vocab");

    const plan = planImport(course, snapshot);
    expect(plan.modules.remove.map((row) => row.id)).toEqual([
      "hakgyo-foundation-hangeul-module",
    ]);
    expect(plan.keptModuleMoves).toEqual([]);
    expect(plan.items.remove[0]!.learnerData).toBe("3 progress");
    expect(plan.staleResources.materials.map((row) => row.id)).toEqual([
      "hakgyo-foundation-hangeul-introduction",
    ]);
    expect(plan.staleResources.assessments.map((row) => row.id)).toEqual([
      "hm-old-quiz-assessment",
    ]);
    expect(plan.staleResources.vocabularySets).toEqual([]);
    expect(plan.blocked).toEqual([
      "우유 (hm-m1-vocab-vocab): 2 learner progress",
    ]);
    expect(planHasChanges(plan, false)).toBe(true);
  });

  test("moves a stale module behind the content when it would collide", () => {
    const { course } = build();
    const snapshot = snapshotOf(course);
    snapshot.modules[0]!.position = 1;
    snapshot.modules.push({
      id: "hakgyo-foundation-hangeul-module",
      courseId: snapshot.course!.id,
      title: "Mulai dengan Hangeul",
      description: null,
      position: 0,
    });
    const plan = planImport(course, snapshot);
    expect(plan.modules.update).toEqual([
      { id: "hm-m1-basic-vowels", data: { position: 0 }, fields: ["position"] },
    ]);
    expect(plan.keptModuleMoves).toEqual([
      { id: "hakgyo-foundation-hangeul-module", position: 1 },
    ]);
  });

  test("reordering options keeps their rows and only moves them", () => {
    const { course } = build();
    const snapshot = snapshotOf(course);
    const content = structuredClone(fixtureContent);
    const quiz = content.modules[0]!.items[3]!;
    if (quiz.type !== "assessment") throw new Error("fixture changed");
    quiz.questions[0]!.options.reverse();
    const plan = planImport(build(content).course, snapshot);
    expect(plan.options.create).toEqual([]);
    expect(plan.options.remove).toEqual([]);
    expect(plan.options.update.map((row) => row.fields)).toEqual([
      ["position"],
      ["position"],
    ]);
  });

  test("an item moved to another module at the same index changes only its module", () => {
    const content = structuredClone(fixtureContent);
    const [lesson] = content.modules[0]!.items.splice(2, 1);
    content.modules.push({
      key: "m2-core-consonants",
      title: "Konsonan",
      description: "",
      items: [lesson!],
    });
    const before = build().course;
    const after = build(content).course;
    const snapshot = snapshotOf(before);
    // the review lesson sat at index 2; put it at index 0 of the new module and give m1's index 0 to the old lesson
    snapshot.items.find((row) => row.id === "hm-m1-review-item")!.position = 0;
    snapshot.items.find(
      (row) => row.id === "hm-m1-vowels-a-eo-o-item",
    )!.position = 2;
    const plan = planImport(after, snapshot);
    expect(plan.modules.create.map((row) => row.id)).toEqual([
      "hm-m2-core-consonants",
    ]);
    expect(plan.items.update).toContainEqual({
      id: "hm-m1-review-item",
      data: { moduleId: "hm-m2-core-consonants" },
      fields: ["moduleId"],
    });
  });

  test("renaming a module key makes a new module and parks the old one behind the content", () => {
    const content = structuredClone(fixtureContent);
    content.modules[0]!.key = "m1-vowels";
    const plan = planImport(build(content).course, snapshotOf(build().course));
    expect(plan.modules.create).toMatchObject([
      { id: "hm-m1-vowels", position: 0 },
    ]);
    expect(plan.keptModuleMoves).toEqual([
      { id: "hm-m1-basic-vowels", position: 1 },
    ]);
    expect(plan.modules.remove.map((row) => row.id)).toEqual([
      "hm-m1-basic-vowels",
    ]);
    expect(
      plan.items.update.every((row) => row.fields.join() === "moduleId"),
    ).toBe(true);
    expect(plan.items.update).toHaveLength(4);
  });

  test("refuses ids that belong to another course", () => {
    const { course } = build();
    const snapshot = snapshotOf(course);
    snapshot.items[0]!.courseId = "someone-else";
    expect(planImport(course, snapshot).errors).toEqual([
      "course item id hm-m1-vowels-a-eo-o-item already belongs to course someone-else",
    ]);
  });
});

describe("comparison", () => {
  test("ignores key order and treats null and undefined alike", () => {
    expect(
      sameValue({ a: 1, b: [{ c: 1, d: 2 }] }, { b: [{ d: 2, c: 1 }], a: 1 }),
    ).toBe(true);
    expect(sameValue([1, 2], [2, 1])).toBe(false);
    expect(sameValue(null, undefined)).toBe(true);
    expect(sameValue(new Date(5), new Date(5))).toBe(true);
    expect(sameValue(new Date(5), new Date(6))).toBe(false);
  });
});
