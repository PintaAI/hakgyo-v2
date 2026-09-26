import { describe, expect, mock, test } from "bun:test";

// The hooks module imports the tRPC client (which needs Expo config) and the
// theme provider; the pure decision helpers under test never touch them.
mock.module("../lib/trpc", () => ({ api: {} }));
mock.module("../providers/AppThemeProvider", () => ({
  useAppTheme: () => ({ activeOrganizationId: null }),
}));
mock.module("@trpc/react-query", () => ({ getQueryKey: () => [] }));

const { composeSafely, lessonItemIds, resolveLocalFirst, toBundle } =
  await import("./hooks");

type Online = {
  data: string | undefined;
  isPending: boolean;
  error: Error | null;
};

const idle: Online = { data: undefined, isPending: true, error: null };

describe("resolveLocalFirst", () => {
  test("local data wins and the online query stays disabled", () => {
    const result = resolveLocalFirst({
      enabled: true,
      local: "local",
      localResolved: true,
      online: { data: "online", isPending: false, error: null },
    });
    expect(result).toEqual({
      data: "local",
      isPending: false,
      isError: false,
      error: null,
      needsOnline: false,
      source: "local",
    });
  });

  test("stays pending without consulting the network while local loads", () => {
    const result = resolveLocalFirst({
      enabled: true,
      local: undefined,
      localResolved: false,
      online: { data: "stale-online", isPending: false, error: null },
    });
    expect(result.isPending).toBe(true);
    expect(result.needsOnline).toBe(false);
    expect(result.data).toBeUndefined();
  });

  test("falls back to the online query only once local settled empty", () => {
    const pending = resolveLocalFirst({
      enabled: true,
      local: undefined,
      localResolved: true,
      online: idle,
    });
    expect(pending).toMatchObject({
      isPending: true,
      needsOnline: true,
      source: "none",
    });
    const loaded = resolveLocalFirst({
      enabled: true,
      local: undefined,
      localResolved: true,
      online: { data: "online", isPending: false, error: null },
    });
    expect(loaded).toMatchObject({
      data: "online",
      isPending: false,
      needsOnline: true,
      source: "online",
    });
  });

  test("surfaces the online error when there is no local data", () => {
    const error = new Error("offline");
    const result = resolveLocalFirst({
      enabled: true,
      local: undefined,
      localResolved: true,
      online: { data: undefined, isPending: false, error },
    });
    expect(result.error).toBe(error);
    expect(result.isError).toBe(true);
  });

  test("a disabled lookup is neither pending nor online", () => {
    const result = resolveLocalFirst({
      enabled: false,
      local: undefined,
      localResolved: false,
      online: idle,
    });
    expect(result).toMatchObject({
      isPending: false,
      needsOnline: false,
      source: "none",
    });
  });
});

describe("composeSafely", () => {
  test("treats null results and throws as 'not available locally'", () => {
    expect(composeSafely(() => null)).toBeUndefined();
    expect(
      composeSafely(() => {
        throw new Error("bad bundle");
      }),
    ).toBeUndefined();
    expect(composeSafely(() => ({ id: "x" }))).toEqual({ id: "x" });
  });
});

const structure = {
  title: "Korean 101",
  description: null,
  thumbnailUrl: null,
  status: "PUBLISHED" as const,
  progressionMode: "SEQUENTIAL" as const,
  modules: [
    {
      id: "m2",
      title: "Module 2",
      description: null,
      position: 2,
      items: [
        {
          id: "i3",
          type: "MATERIAL" as const,
          position: 1,
          title: "Lesson 3",
          materialId: "mat3",
          vocabularySetId: null,
          assessmentId: null,
          assessmentPassingScore: null,
        },
      ],
    },
    {
      id: "m1",
      title: "Module 1",
      description: null,
      position: 1,
      items: [
        {
          id: "i2",
          type: "VOCABULARY_SET" as const,
          position: 2,
          title: "Words",
          materialId: null,
          vocabularySetId: "set1",
          assessmentId: null,
          assessmentPassingScore: null,
        },
        {
          id: "i1",
          type: "MATERIAL" as const,
          position: 1,
          title: "Lesson 1",
          materialId: "mat1",
          vocabularySetId: null,
          assessmentId: null,
          assessmentPassingScore: null,
        },
      ],
    },
  ],
};

describe("lessonItemIds", () => {
  test("returns the item and the next one in module/item order", () => {
    expect(lessonItemIds(structure, "i1")).toEqual(["i1", "i2"]);
    expect(lessonItemIds(structure, "i2")).toEqual(["i2", "i3"]);
    expect(lessonItemIds(structure, "i3")).toEqual(["i3"]);
    expect(lessonItemIds(structure, "missing")).toEqual([]);
  });
});

describe("toBundle", () => {
  test("builds a compose bundle from stored records, with empty content by default", () => {
    const record = {
      courseId: "c1",
      revision: "7",
      schema: 1,
      updatedAt: 0,
      data: structure,
    };
    const bundle = toBundle(record, null, "org1");
    expect(bundle).toMatchObject({
      courseId: "c1",
      organizationId: "org1",
      revision: "7",
      schema: 1,
    });
    expect(bundle.structure).toBe(structure);
    expect(bundle.content.materials).toEqual({});
    const content = {
      courseId: "c1",
      revision: "7",
      schema: 1,
      updatedAt: 0,
      data: {
        placements: {},
        materials: { mat1: { id: "mat1" } },
        vocabularySets: {},
        assessments: {},
        pdfBooks: {},
        assets: {},
      },
    };
    expect(toBundle(record, content as never).content).toBe(
      content.data as never,
    );
  });
});
