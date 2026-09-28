import { describe, expect, mock, test } from "bun:test";

import { createDefaultLandingHtml } from "./default-template";
import {
  getLandingDraft,
  getPublishedLanding,
  publishLandingPage,
  removeLandingImage,
  saveLandingDraft,
  unpublishLandingPage,
  updateLandingCopy,
} from "./service";

type Database = Parameters<typeof getLandingDraft>[0]["db"];

const validHtml = createDefaultLandingHtml({
  name: "Academy",
  logoUrl: null,
  primaryColor: "#27272A",
});

function setup(
  options: {
    role?: string | null;
    landing?: {
      draftHtml: string | null;
      draftRevisionId: string | null;
      publishedHtml?: string | null;
      publishedRevisionId?: string | null;
      publishedAt?: Date | null;
      imageUrls?: string[];
    } | null;
    swapCount?: number;
    slug?: string;
  } = {},
) {
  const landing =
    options.landing === null || options.landing === undefined
      ? null
      : {
          publishedHtml: null,
          publishedRevisionId: null,
          publishedAt: null,
          imageUrls: [],
          updatedAt: new Date("2026-10-01T00:00:00Z"),
          ...options.landing,
        };
  const organization = {
    id: "org-1",
    name: "Academy",
    slug: options.slug ?? "academy",
    logoUrl: null,
    theme: null,
    themeEnabled: false,
    landingPage: landing,
  };
  const spies = {
    organizationMember: {
      findUnique: mock(async (_args: unknown) =>
        options.role === null ? null : { role: options.role ?? "OWNER" },
      ),
    },
    organization: {
      findUniqueOrThrow: mock(async (_args: unknown) => organization),
      findUnique: mock(async (_args: unknown) => organization),
    },
    course: { findMany: mock(async (_args: unknown) => []) },
    organizationLandingPage: {
      findUnique: mock(async (_args: unknown) => landing),
      upsert: mock(async (_args: unknown) => ({
        draftRevisionId: landing?.draftRevisionId ?? null,
        imageUrls: landing?.imageUrls ?? [],
      })),
      update: mock(async (_args: unknown) => landing),
      updateMany: mock(async (_args: unknown) => ({
        count: options.swapCount ?? 1,
      })),
    },
    organizationLandingRevision: {
      create: mock(async (_args: unknown) => ({ id: "rev-new" })),
      findMany: mock(async (_args: unknown) => []),
      deleteMany: mock(async (_args: unknown) => ({ count: 0 })),
    },
    $transaction: mock(async (run: (tx: unknown) => Promise<unknown>) =>
      run(spies),
    ),
  };
  return { db: spies as unknown as Database, spies };
}

function owner(db: Database) {
  return { db, organizationId: "org-1", actorUserId: "user-1" };
}

async function expectCode(promise: Promise<unknown>, code: string) {
  const error: unknown = await promise.then(
    () => null,
    (error: unknown) => error,
  );
  expect(error).toMatchObject({ code });
}

describe("landing page owner access", () => {
  test("rejects members who are not owners", async () => {
    for (const role of ["ADMIN", "TEACHER", null]) {
      const { db } = setup({ role });
      await expectCode(getLandingDraft(owner(db)), "FORBIDDEN");
    }
  });

  test("starts from the starter template without a saved draft", async () => {
    const { db } = setup();
    const draft = await getLandingDraft(owner(db));
    expect(draft.isStarterTemplate).toBe(true);
    expect(draft.revisionId).toBeNull();
    expect(draft.fields.map((field) => field.key)).toContain("hero.title");
  });
});

describe("saving landing drafts", () => {
  test("returns validation errors without writing", async () => {
    const { db, spies } = setup();
    const result = await saveLandingDraft({
      ...owner(db),
      html: "<p>Hi</p>",
      source: "MCP",
    });
    expect(result.ok).toBe(false);
    expect(spies.$transaction).not.toHaveBeenCalled();
  });

  test("stores a revision and swaps the draft pointer", async () => {
    const { db, spies } = setup({
      landing: { draftHtml: validHtml, draftRevisionId: "rev-1" },
    });
    const result = await saveLandingDraft({
      ...owner(db),
      html: validHtml,
      source: "MCP",
      summary: " New hero ",
      baseRevisionId: "rev-1",
    });
    expect(result).toMatchObject({ ok: true, revisionId: "rev-new" });
    expect(spies.organizationLandingRevision.create.mock.calls[0]?.[0]).toEqual(
      {
        data: {
          organizationId: "org-1",
          html: validHtml,
          source: "MCP",
          summary: "New hero",
          createdByUserId: "user-1",
        },
        select: { id: true },
      },
    );
    expect(spies.organizationLandingPage.updateMany.mock.calls[0]?.[0]).toEqual(
      {
        where: { organizationId: "org-1", draftRevisionId: "rev-1" },
        data: { draftHtml: validHtml, draftRevisionId: "rev-new" },
      },
    );
  });

  test("rejects stale base revisions and lost races", async () => {
    const stale = setup({
      landing: { draftHtml: validHtml, draftRevisionId: "rev-2" },
    });
    await expectCode(
      saveLandingDraft({
        ...owner(stale.db),
        html: validHtml,
        source: "MCP",
        baseRevisionId: "rev-1",
      }),
      "CONFLICT",
    );
    const raced = setup({ swapCount: 0 });
    await expectCode(
      saveLandingDraft({ ...owner(raced.db), html: validHtml, source: "MCP" }),
      "CONFLICT",
    );
  });

  test("edits copy on top of the current draft", async () => {
    const { db, spies } = setup({
      landing: { draftHtml: validHtml, draftRevisionId: "rev-1" },
    });
    await updateLandingCopy({
      ...owner(db),
      baseRevisionId: "rev-1",
      copy: { "hero.title": "Belajar bahasa Korea" },
    });
    const html = spies.organizationLandingPage.updateMany.mock
      .calls[0]?.[0] as {
      data: { draftHtml: string };
    };
    expect(html.data.draftHtml).toContain(
      '<h1 data-hakgyo-edit="hero.title">Belajar bahasa Korea</h1>',
    );
    await expectCode(
      updateLandingCopy({
        ...owner(db),
        baseRevisionId: null,
        copy: { "hero.title": "x" },
      }),
      "CONFLICT",
    );
  });
});

describe("publishing landing pages", () => {
  test("publishes the reviewed draft revision", async () => {
    const { db, spies } = setup({
      landing: { draftHtml: validHtml, draftRevisionId: "rev-1" },
    });
    const result = await publishLandingPage({
      ...owner(db),
      revisionId: "rev-1",
    });
    expect(result.publishedRevisionId).toBe("rev-1");
    expect(
      spies.organizationLandingPage.updateMany.mock.calls[0]?.[0],
    ).toMatchObject({
      where: { organizationId: "org-1", draftRevisionId: "rev-1" },
      data: { publishedHtml: validHtml, publishedRevisionId: "rev-1" },
    });
  });

  test("refuses a draft that changed after review", async () => {
    const { db } = setup({
      landing: { draftHtml: validHtml, draftRevisionId: "rev-2" },
    });
    await expectCode(
      publishLandingPage({ ...owner(db), revisionId: "rev-1" }),
      "CONFLICT",
    );
  });

  test("records the starter template before publishing it", async () => {
    const { db, spies } = setup();
    await publishLandingPage({ ...owner(db), revisionId: null });
    expect(spies.organizationLandingRevision.create).toHaveBeenCalledTimes(1);
    expect(
      spies.organizationLandingPage.updateMany.mock.calls[1]?.[0],
    ).toMatchObject({
      where: { draftRevisionId: "rev-new" },
      data: { publishedRevisionId: "rev-new" },
    });
  });

  test("requires a public slug", async () => {
    const { db } = setup({ slug: "api" });
    await expectCode(
      publishLandingPage({ ...owner(db), revisionId: null }),
      "BAD_REQUEST",
    );
  });

  test("unpublishing clears the public snapshot", async () => {
    const { db, spies } = setup();
    await unpublishLandingPage(owner(db));
    expect(spies.organizationLandingPage.updateMany.mock.calls[0]?.[0]).toEqual(
      {
        where: { organizationId: "org-1" },
        data: {
          publishedHtml: null,
          publishedRevisionId: null,
          publishedAt: null,
        },
      },
    );
  });
});

describe("public landing pages", () => {
  test("only returns published pages for valid slugs", async () => {
    const draftOnly = setup({
      landing: { draftHtml: validHtml, draftRevisionId: "rev-1" },
    });
    expect(
      await getPublishedLanding({ db: draftOnly.db, slug: "academy" }),
    ).toBeNull();
    expect(
      await getPublishedLanding({ db: draftOnly.db, slug: "api" }),
    ).toBeNull();

    const published = setup({
      landing: {
        draftHtml: validHtml,
        draftRevisionId: "rev-1",
        publishedHtml: validHtml,
        publishedAt: new Date("2026-10-01T00:00:00Z"),
      },
    });
    const landing = await getPublishedLanding({
      db: published.db,
      slug: "academy",
    });
    expect(landing?.metadata).toEqual({
      title: "Academy",
      description: "Temukan kelas dari Academy dan mulai belajar hari ini.",
      image: null,
    });
  });
});

describe("landing image library", () => {
  test("keeps images that the draft or live page uses", async () => {
    const imageUrl = "https://cdn.hakgyo.test/hero.jpg";
    const { db } = setup({
      landing: {
        draftHtml: `<img src="${imageUrl}">`,
        draftRevisionId: "rev-1",
        imageUrls: [imageUrl],
      },
    });
    await expectCode(
      removeLandingImage({ ...owner(db), imageUrl }),
      "CONFLICT",
    );
  });
});
