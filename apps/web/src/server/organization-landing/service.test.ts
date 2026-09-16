import { describe, expect, mock, test } from "bun:test";
import {
  createDefaultOrganizationLandingConfig,
  organizationLandingConfigSchema,
  organizationPublicSlugSchema,
} from "~/lib/organization-landing";
import {
  getPublicOrganizationLanding,
  getOrganizationLanding,
  saveOrganizationLandingDraft,
  publishOrganizationLanding,
  unpublishOrganizationLanding,
} from "./service";

type Database = Parameters<typeof getPublicOrganizationLanding>[0]["db"];
const time = new Date("2026-09-15T12:00:00Z");
function setup(
  options: {
    role?: string | null;
    published?: boolean;
    slug?: string;
    updated?: number;
    selected?: string[];
  } = {},
) {
  const draft = {
    ...createDefaultOrganizationLandingConfig("Academy"),
    headline: "Draft changes",
    selectedCourseIds: options.selected ?? [],
  };
  const row = {
    draft,
    published:
      options.published === false
        ? null
        : { ...draft, headline: "Public headline" },
    publishedAt: options.published === false ? null : time,
    updatedAt: time,
  };
  const organization = {
    id: "org-1",
    name: "Academy",
    slug: options.slug ?? "academy",
    logoUrl: null,
    theme: null,
    themeEnabled: true,
    landingPage: row,
  };
  const spies = {
    organization: {
      findUnique: mock(async (_args: unknown) => organization),
      findUniqueOrThrow: mock(async (_args: unknown) => organization),
    },
    organizationMember: {
      findUnique: mock(async (_args: unknown) =>
        options.role === null ? null : { role: options.role ?? "OWNER" },
      ),
    },
    organizationLandingPage: {
      findUnique: mock(async (_args: unknown) => row),
      upsert: mock(async (_args: unknown) => row),
      updateMany: mock(async (_args: unknown) => ({
        count: options.updated ?? 1,
      })),
    },
    course: { findMany: mock(async (_args: unknown) => []) },
  };
  return { db: spies as unknown as Database, spies, draft };
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

describe("organization landing boundaries", () => {
  for (const role of [null, "ADMIN", "TEACHER"])
    test(`${role ?? "nonmember"} cannot read or mutate drafts`, async () => {
      const { db, spies, draft } = setup({ role });
      for (const action of [
        () => getOrganizationLanding(owner(db)),
        () => saveOrganizationLandingDraft({ ...owner(db), config: draft }),
        () => publishOrganizationLanding(owner(db)),
        () => unpublishOrganizationLanding(owner(db)),
      ])
        await expectCode(action(), "FORBIDDEN");
      expect(spies.organizationLandingPage.upsert).not.toHaveBeenCalled();
      expect(spies.organizationLandingPage.updateMany).not.toHaveBeenCalled();
      expect(spies.organizationLandingPage.findUnique).not.toHaveBeenCalled();
    });
  test("anonymous reads return only published content and public course filters", async () => {
    const { db, spies } = setup({ selected: ["now-private-course"] });
    const page = await getPublicOrganizationLanding({ db, slug: "academy" });
    expect(page?.config.headline).toBe("Public headline");
    expect(page?.config.selectedCourseIds).toEqual([]);
    expect(page?.organization).not.toHaveProperty("landingPage");
    expect(spies.organizationMember.findUnique).not.toHaveBeenCalled();
    expect(spies.course.findMany.mock.calls[0]).toMatchObject([
      {
        where: {
          organizationId: "org-1",
          status: "PUBLISHED",
          OR: [
            { enrollmentMode: "OPEN" },
            {
              enrollmentMode: null,
              organization: { defaultEnrollmentMode: "OPEN" },
            },
          ],
        },
      },
    ]);
  });
  test("unpublished drafts are not public", async () => {
    const { db, spies } = setup({ published: false });
    expect(
      await getPublicOrganizationLanding({ db, slug: "academy" }),
    ).toBeNull();
    expect(spies.course.findMany).not.toHaveBeenCalled();
  });
  test("draft saves do not update public content", async () => {
    const { db, spies, draft } = setup();
    await saveOrganizationLandingDraft({ ...owner(db), config: draft });
    expect(spies.organizationLandingPage.upsert.mock.calls[0]).toMatchObject([
      { where: { organizationId: "org-1" }, update: { draft } },
    ]);
    expect(
      JSON.stringify(spies.organizationLandingPage.upsert.mock.calls[0]),
    ).not.toContain('"published":');
  });
  test("foreign or private course selection is rejected", async () => {
    const { db, spies, draft } = setup();
    await expectCode(
      saveOrganizationLandingDraft({
        ...owner(db),
        config: { ...draft, selectedCourseIds: ["foreign-course"] },
      }),
      "BAD_REQUEST",
    );
    expect(spies.organizationLandingPage.upsert).not.toHaveBeenCalled();
  });
  test("publishing snapshots saved content", async () => {
    const { db, spies, draft } = setup();
    await publishOrganizationLanding(owner(db));
    expect(
      spies.organizationLandingPage.updateMany.mock.calls[0],
    ).toMatchObject([
      {
        where: { organizationId: "org-1", updatedAt: time },
        data: { published: draft },
      },
    ]);
  });
  test("concurrent changes prevent stale publication", async () => {
    const { db } = setup({ updated: 0 });
    await expectCode(publishOrganizationLanding(owner(db)), "CONFLICT");
  });
  test("reserved slugs cannot publish", async () => {
    const { db, spies } = setup({ slug: "catalog" });
    await expectCode(publishOrganizationLanding(owner(db)), "BAD_REQUEST");
    expect(spies.organizationLandingPage.updateMany).not.toHaveBeenCalled();
  });
  test("main button cannot point to a hidden section, including its default target", async () => {
    for (const ctaUrl of ["", "#courses", "#contact"]) {
      const { db, spies, draft } = setup();
      draft.ctaUrl = ctaUrl;
      draft.hiddenSections = ["courses", "contact"];
      await expectCode(publishOrganizationLanding(owner(db)), "BAD_REQUEST");
      expect(spies.organizationLandingPage.updateMany).not.toHaveBeenCalled();
    }
  });
  test("unpublishing removes visibility", async () => {
    const { db, spies } = setup();
    await unpublishOrganizationLanding(owner(db));
    expect(
      spies.organizationLandingPage.updateMany.mock.calls[0],
    ).toMatchObject([
      { where: { organizationId: "org-1" }, data: { publishedAt: null } },
    ]);
  });
});

describe("public content validation", () => {
  test("older saved pages receive a complete visual design", () => {
    const config = createDefaultOrganizationLandingConfig("Academy");
    const legacy = Object.fromEntries(
      Object.entries(config).filter(([key]) => key !== "design"),
    );
    expect(organizationLandingConfigSchema.parse(legacy).design).toEqual(
      config.design,
    );
  });
  test("visual settings accept only supported layouts and bounded values", () => {
    const config = createDefaultOrganizationLandingConfig("Academy");
    for (const design of [
      { ...config.design, heroLayout: "custom-script" },
      { ...config.design, headingScale: 99 },
      { ...config.design, imagePosition: -1 },
    ]) {
      expect(
        organizationLandingConfigSchema.safeParse({ ...config, design })
          .success,
      ).toBe(false);
    }
  });
  test("rejects unsafe links and image URLs", () => {
    const config = createDefaultOrganizationLandingConfig("Academy");
    for (const value of [
      "javascript:alert(1)",
      "data:image/svg+xml,test",
      "//evil.example",
      "https://user:password@example.com",
    ]) {
      expect(
        organizationLandingConfigSchema.safeParse({
          ...config,
          heroImageUrl: value,
        }).success,
      ).toBe(false);
      expect(
        organizationLandingConfigSchema.safeParse({ ...config, ctaUrl: value })
          .success,
      ).toBe(false);
    }
    expect(
      organizationLandingConfigSchema.safeParse({
        ...config,
        ctaUrl: "#courses",
      }).success,
    ).toBe(true);
  });
  test("rejects duplicate or missing sections", () => {
    const config = createDefaultOrganizationLandingConfig("Academy");
    expect(
      organizationLandingConfigSchema.safeParse({
        ...config,
        sectionOrder: [
          "courses",
          "courses",
          "features",
          "testimonials",
          "faq",
          "contact",
        ],
      }).success,
    ).toBe(false);
    expect(
      organizationLandingConfigSchema.safeParse({ ...config, sectionOrder: [] })
        .success,
    ).toBe(false);
  });
  test("reserves app routes", () => {
    for (const slug of [
      "api",
      "auth",
      "catalog",
      "learn",
      "workspace",
      "oauth",
      "notifications",
      "superadmin",
      "organizations",
    ])
      expect(organizationPublicSlugSchema.safeParse(slug).success).toBe(false);
    expect(organizationPublicSlugSchema.safeParse("my-academy").success).toBe(
      true,
    );
  });
});
