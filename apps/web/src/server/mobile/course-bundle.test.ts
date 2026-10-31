import { describe, expect, mock, test } from "bun:test";

import { BUNDLE_SCHEMA } from "@hakgyo/shared/mobile-sync";

import type { Prisma } from "../../../generated/prisma/client";
import {
  loadCourseBundle,
  shapeCourseBundle,
  type CourseBundleDb,
  type CourseBundleSource,
} from "./course-bundle";

const ORG = "org-1";

type Item = CourseBundleSource["modules"][number]["items"][number];
type Assessment = NonNullable<Item["assessment"]>;

function question(id: string): Assessment["questions"][number] {
  // Answer-revealing fields the select never loads; present here to prove
  // the shaping drops them even if they leaked in.
  return {
    id,
    type: "SINGLE_CHOICE",
    prompt: [{ type: "paragraph", content: `Prompt ${id}` }],
    explanation: `secret explanation ${id}`,
    points: 1,
    position: 0,
    options: [
      { id: `${id}-a`, content: "A", position: 0, isCorrect: true },
      { id: `${id}-b`, content: "B", position: 1, isCorrect: false },
    ],
  } as unknown as Assessment["questions"][number];
}

function assessment(id: string): Assessment {
  return {
    id,
    title: `Assessment ${id}`,
    description: null,
    instructions: null,
    passingScore: 70,
    scoreBands: null,
    sections: [],
    questionGroups: [],
    maxAttempts: null,
    timeLimitMinutes: null,
    shuffleQuestions: false,
    shuffleOptions: false,
    questions: [question(`${id}-q1`)],
  };
}

function vocabularySet(id: string): NonNullable<Item["vocabularySet"]> {
  return {
    id,
    title: `Set ${id}`,
    description: null,
    entries: [
      {
        id: `${id}-e1`,
        term: "term",
        meanings: ["perut", "kapal"],
        definition: "perut; kapal",
        examples: [],
        metadata: null,
        audioAssetId: `${id}-audio`,
        imageAssetId: null,
      },
    ],
  };
}

function embeddedContent(refs: {
  assessmentId?: string;
  vocabularySetId?: string;
}): Prisma.JsonArray {
  return [
    ...(refs.assessmentId
      ? [
          {
            type: "assessmentReference",
            props: { assessmentId: refs.assessmentId },
          },
        ]
      : []),
    ...(refs.vocabularySetId
      ? [
          {
            type: "vocabularyReference",
            props: { vocabularySetId: refs.vocabularySetId },
          },
        ]
      : []),
  ];
}

function item(
  id: string,
  position: number,
  resource: Partial<Pick<Item, "material" | "vocabularySet" | "assessment">>,
): Item {
  const type = resource.material
    ? "MATERIAL"
    : resource.vocabularySet
      ? "VOCABULARY_SET"
      : "ASSESSMENT";
  return {
    id,
    organizationId: ORG,
    type,
    position,
    materialId: resource.material?.id ?? null,
    vocabularySetId: resource.vocabularySet?.id ?? null,
    assessmentId: resource.assessment?.id ?? null,
    material: resource.material ?? null,
    vocabularySet: resource.vocabularySet ?? null,
    assessment: resource.assessment ?? null,
  };
}

function material(
  id: string,
  content: Prisma.JsonValue,
  extra: Partial<NonNullable<Item["material"]>> = {},
): NonNullable<Item["material"]> {
  return {
    id,
    title: `Material ${id}`,
    description: null,
    content,
    editorSchemaVersion: 1,
    requirementPolicy: "ALL",
    completionRequirements: [],
    assets: [],
    ...extra,
  };
}

const publishedAssessment = assessment("assess-pub");
const module2Assessment = assessment("assess-m2");
const setA = vocabularySet("set-a");
const setB = vocabularySet("set-b");

// Module 1 places set-a and assess-pub. Module 2 places set-b and assess-m2.
// Materials in each module embed both sets and both assessments; only
// same-module placements may resolve.
const course: CourseBundleSource = {
  id: "course-1",
  organizationId: ORG,
  title: "Course",
  description: null,
  thumbnailUrl: null,
  status: "PUBLISHED",
  progressionMode: "SEQUENTIAL",
  modules: [
    {
      id: "module-1",
      title: "Module 1",
      description: null,
      position: 0,
      items: [
        item("item-m1-material", 0, {
          material: material(
            "material-1",
            [
              ...embeddedContent({
                assessmentId: "assess-pub",
                vocabularySetId: "set-a",
              }),
              ...embeddedContent({
                assessmentId: "assess-m2",
                vocabularySetId: "set-b",
              }),
            ],
            {
              completionRequirements: [
                {
                  id: "req-vocab",
                  type: "VOCABULARY_SET",
                  minimumScore: null,
                  vocabularySet: { id: "set-a", title: "Set set-a" },
                  assessment: null,
                },
                {
                  id: "req-assess",
                  type: "ASSESSMENT",
                  minimumScore: 80,
                  vocabularySet: null,
                  assessment: {
                    id: "assess-pub",
                    title: "Assessment",
                    passingScore: 70,
                  },
                },
                {
                  id: "req-other-module",
                  type: "VOCABULARY_SET",
                  minimumScore: null,
                  vocabularySet: { id: "set-b", title: "Set set-b" },
                  assessment: null,
                },
              ],
              assets: [
                {
                  asset: {
                    id: "asset-confirmed",
                    fileName: "a.png",
                    contentType: "image/png",
                    size: 10,
                  },
                },
              ],
            },
          ),
        }),
        item("item-m1-set", 1, { vocabularySet: setA }),
        item("item-m1-assess", 2, { assessment: publishedAssessment }),
      ],
    },
    {
      id: "module-2",
      title: "Module 2",
      description: null,
      position: 1,
      items: [
        item("item-m2-material", 0, {
          material: material(
            "material-2",
            embeddedContent({
              assessmentId: "assess-m2",
              vocabularySetId: "set-b",
            }),
          ),
        }),
        item("item-m2-set", 1, { vocabularySet: setB }),
        item("item-m2-assess", 2, { assessment: module2Assessment }),
      ],
    },
  ],
};

function fakeDb(input: { course?: CourseBundleSource | null }) {
  const findUnique = mock(() => Promise.resolve(input.course ?? null));
  // Only confirmed, undeleted assets come back: the vocabulary audio asset is
  // "unconfirmed" and must disappear from the bundle.
  const findAssets = mock((args: { where: { id: { in: string[] } } }) =>
    Promise.resolve(
      args.where.id.in
        .filter((id) => id !== "set-a-audio" && id !== "set-b-audio")
        .map((id) => ({
          id,
          fileName: `${id}.bin`,
          contentType: "x",
          size: 1,
        })),
    ),
  );
  const findPages = mock(() => Promise.resolve([]));
  return {
    db: {
      course: { findUnique },
      asset: { findMany: findAssets },
      pdfBookPage: { findMany: findPages },
    } as unknown as CourseBundleDb,
    findUnique,
    findAssets,
    findPages,
  };
}

describe("loadCourseBundle", () => {
  test("never leaks answer keys or explanations", async () => {
    const { db } = fakeDb({ course });
    const bundle = await loadCourseBundle(db, "course-1", "42");
    const json = JSON.stringify(bundle);
    expect(json).not.toContain("isCorrect");
    expect(json).not.toContain("explanation");
    expect(json).not.toContain("secret explanation");
    expect(
      bundle.content.assessments["assess-pub"]?.questions[0]?.options,
    ).toEqual([
      { id: "assess-pub-q1-a", content: "A", position: 0 },
      { id: "assess-pub-q1-b", content: "B", position: 1 },
    ]);
    expect(bundle.revision).toBe("42");
    expect(bundle.schema).toBe(BUNDLE_SCHEMA);
  });

  test("only loads published items and confirmed assets", async () => {
    const { db, findUnique, findAssets } = fakeDb({ course });
    await loadCourseBundle(db, "course-1", "1");
    const select = (
      findUnique.mock.calls[0] as unknown as [{ select: never }]
    )[0].select as {
      modules: { select: { items: { where: unknown } } };
    };
    expect(select.modules.select.items.where).toEqual({ isPublished: true });
    const assetWhere = (
      findAssets.mock.calls[0] as unknown as [
        { where: Record<string, unknown> },
      ]
    )[0].where;
    expect(assetWhere).toMatchObject({
      confirmedAt: { not: null },
      deletedAt: null,
    });
  });

  test("includes every placed assessment in the content", async () => {
    const { db } = fakeDb({ course });
    const bundle = await loadCourseBundle(db, "course-1", "1");
    expect(Object.keys(bundle.content.assessments)).toEqual([
      "assess-pub",
      "assess-m2",
    ]);
    expect(bundle.content.assessments["assess-pub"]).toMatchObject({
      questionCount: 1,
    });
    expect(bundle.content.assessments["assess-pub"]).not.toHaveProperty(
      "status",
    );
    const module2 = bundle.structure.modules[1]!;
    expect(module2.items.map((entry) => entry.id)).toEqual([
      "item-m2-material",
      "item-m2-set",
      "item-m2-assess",
    ]);
    expect(module2.items[2]).toMatchObject({
      assessmentId: "assess-m2",
      assessmentPassingScore: 70,
      title: "Assessment assess-m2",
    });
  });

  test("resolves embedded references and requirements within the module only", async () => {
    const { db } = fakeDb({ course });
    const bundle = await loadCourseBundle(db, "course-1", "1");
    expect(bundle.content.placements["item-m1-material"]).toEqual({
      embedded: {
        vocabularySetIds: [{ id: "set-a", courseItemId: "item-m1-set" }],
        assessmentIds: [{ id: "assess-pub", courseItemId: "item-m1-assess" }],
        pdfBookIds: [],
      },
      requirements: [
        {
          id: "req-vocab",
          type: "VOCABULARY_SET",
          minimumScore: null,
          resourceId: "set-a",
          title: "Set set-a",
          courseItemId: "item-m1-set",
          passingScore: null,
        },
        {
          id: "req-assess",
          type: "ASSESSMENT",
          minimumScore: 80,
          resourceId: "assess-pub",
          title: "Assessment",
          courseItemId: "item-m1-assess",
          passingScore: 70,
        },
        {
          id: "req-other-module",
          type: "VOCABULARY_SET",
          minimumScore: null,
          resourceId: "set-b",
          title: "Set set-b",
          courseItemId: null,
          passingScore: null,
        },
      ],
    });
    // Module 2 embeds a set and an assessment placed in its module (both
    // resolve).
    expect(bundle.content.placements["item-m2-material"]?.embedded).toEqual({
      vocabularySetIds: [{ id: "set-b", courseItemId: "item-m2-set" }],
      assessmentIds: [{ id: "assess-m2", courseItemId: "item-m2-assess" }],
      pdfBookIds: [],
    });
  });

  test("drops assets the asset query does not confirm", async () => {
    const { db } = fakeDb({ course });
    const bundle = await loadCourseBundle(db, "course-1", "1");
    expect(Object.keys(bundle.content.assets).sort()).toEqual([
      "asset-confirmed",
    ]);
    expect(bundle.content.materials["material-1"]?.assetIds).toEqual([
      "asset-confirmed",
    ]);
    // The entry keeps its asset id; the client resolves it against `assets`.
    expect(
      bundle.content.vocabularySets["set-a"]?.entries[0]?.audioAssetId,
    ).toBe("set-a-audio");
    // Meanings ship next to the joined definition older apps still read.
    expect(bundle.content.vocabularySets["set-a"]?.entries[0]).toMatchObject({
      meanings: ["perut", "kapal"],
      definition: "perut; kapal",
    });
  });

  test("adds no linked materials (and no queries) without material links", async () => {
    const { db } = fakeDb({ course });
    const bundle = await loadCourseBundle(db, "course-1", "1");
    expect(bundle.content.linkedMaterials).toEqual({});
  });

  test("resolves material link targets, this course's placement first", async () => {
    const link = (href: string) => ({
      type: "paragraph",
      content: [{ type: "link", href, content: [{ type: "text", text: "x" }] }],
    });
    const linking: CourseBundleSource = {
      ...course,
      modules: [
        {
          ...course.modules[0]!,
          items: [
            item("item-a", 0, {
              material: material("material-a", [
                link("hakgyo-material:material-b#heading-b"),
                link("hakgyo-material:material-x"),
                link("hakgyo-material:material-unplaced"),
              ]),
            }),
            item("item-b", 1, {
              material: material("material-b", [
                {
                  id: "heading-b",
                  type: "heading",
                  props: { level: 2 },
                  content: "Partikel",
                },
                { type: "paragraph", content: "은/는 menandai topik." },
              ]),
            }),
          ],
        },
      ],
    };
    const { db: base } = fakeDb({ course: linking });
    const findItems = mock((_args: unknown) =>
      Promise.resolve([
        {
          id: "other-b",
          materialId: "material-b",
          module: { courseId: "course-2" },
        },
        {
          id: "other-x",
          materialId: "material-x",
          module: { courseId: "course-2" },
        },
        {
          id: "other-x-2",
          materialId: "material-x",
          module: { courseId: "course-2" },
        },
      ]),
    );
    const findMaterials = mock((_args: unknown) =>
      Promise.resolve([
        {
          id: "material-x",
          title: "X",
          description: "Desc",
          content: [{ type: "paragraph", content: "Awal X" }],
        },
        {
          id: "material-unplaced",
          title: "Hidden",
          description: null,
          content: [],
        },
      ]),
    );
    const db = {
      ...(base as object),
      courseItem: { findMany: findItems },
      material: { findMany: findMaterials },
    } as unknown as CourseBundleDb;

    const bundle = await loadCourseBundle(db, "course-1", "1");
    expect(bundle.content.linkedMaterials).toEqual({
      "material-b": {
        id: "material-b",
        title: "Material material-b",
        description: null,
        excerpt: "Partikel 은/는 menandai topik.",
        sections: {
          "heading-b": { title: "Partikel", excerpt: "은/는 menandai topik." },
        },
        placements: [
          { courseId: "course-1", courseItemId: "item-b" },
          { courseId: "course-2", courseItemId: "other-b" },
        ],
      },
      "material-x": {
        id: "material-x",
        title: "X",
        description: "Desc",
        excerpt: "Awal X",
        sections: {},
        placements: [{ courseId: "course-2", courseItemId: "other-x" }],
      },
    });
    const itemWhere = (findItems.mock.calls[0]![0] as { where: unknown }).where;
    expect(itemWhere).toMatchObject({
      isPublished: true,
      organizationId: ORG,
      module: {
        courseId: { not: "course-1" },
        course: { status: "PUBLISHED" },
      },
    });
    // Materials already in the bundle are not loaded again.
    const materialWhere = (
      findMaterials.mock.calls[0]![0] as { where: { id: { in: string[] } } }
    ).where;
    expect(materialWhere.id.in.sort()).toEqual([
      "material-unplaced",
      "material-x",
    ]);
  });

  test("throws NOT_FOUND for a missing course", async () => {
    const { db } = fakeDb({ course: null });
    const error = await loadCourseBundle(db, "missing", "1").catch(
      (cause: unknown) => cause,
    );
    expect(error).toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("shapeCourseBundle", () => {
  test("titles items from their resource", () => {
    const shaped = shapeCourseBundle(course);
    expect(
      shaped.structure.modules[0]?.items.map((entry) => entry.title),
    ).toEqual(["Material material-1", "Set set-a", "Assessment assess-pub"]);
    expect([...shaped.assetIds].sort()).toEqual([
      "asset-confirmed",
      "set-a-audio",
      "set-b-audio",
    ]);
  });
});
