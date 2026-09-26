import { describe, expect, mock, test } from "bun:test";

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

function assessment(
  id: string,
  status: "PUBLISHED" | "DRAFT" = "PUBLISHED",
): Assessment {
  return {
    id,
    title: `Assessment ${id}`,
    description: null,
    instructions: null,
    passingScore: 70,
    maxAttempts: null,
    timeLimitMinutes: null,
    shuffleQuestions: false,
    shuffleOptions: false,
    status,
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
        definition: "definition",
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
const draftAssessment = assessment("assess-draft", "DRAFT");
const setA = vocabularySet("set-a");
const setB = vocabularySet("set-b");

// Module 1 places set-a and the published assessment. Module 2 places set-b
// and the draft assessment. Materials in each module embed both sets and
// both assessments; only same-module, published placements may resolve.
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
                assessmentId: "assess-draft",
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
              assessmentId: "assess-draft",
              vocabularySetId: "set-b",
            }),
          ),
        }),
        item("item-m2-set", 1, { vocabularySet: setB }),
        item("item-m2-assess", 2, { assessment: draftAssessment }),
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
    expect(bundle.schema).toBe(1);
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

  test("keeps draft assessments out of the content while listing their placement", async () => {
    const { db } = fakeDb({ course });
    const bundle = await loadCourseBundle(db, "course-1", "1");
    expect(Object.keys(bundle.content.assessments)).toEqual(["assess-pub"]);
    expect(bundle.content.assessments["assess-pub"]).toMatchObject({
      status: "PUBLISHED",
      questionCount: 1,
    });
    const module2 = bundle.structure.modules[1]!;
    expect(module2.items.map((entry) => entry.id)).toEqual([
      "item-m2-material",
      "item-m2-set",
      "item-m2-assess",
    ]);
    expect(module2.items[2]).toMatchObject({
      assessmentId: "assess-draft",
      assessmentPassingScore: 70,
      title: "Assessment assess-draft",
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
    // Module 2 embeds a set placed in its module (resolves) and a draft
    // assessment placed in its module (does not).
    expect(bundle.content.placements["item-m2-material"]?.embedded).toEqual({
      vocabularySetIds: [{ id: "set-b", courseItemId: "item-m2-set" }],
      assessmentIds: [],
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
