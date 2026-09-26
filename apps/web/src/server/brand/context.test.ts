import { describe, expect, mock, test } from "bun:test";

import { brandRouter } from "~/server/api/routers/brand";
import {
  getActiveBrandContext,
  listAvailableBrandContexts,
  resolveBrandContext,
} from "~/server/brand/context";

const validTheme = {
  version: 2 as const,
  primary: "#112233",
  secondary: "#445566",
  accent: "#778899",
  destructive: "#DC2626",
};

function organization(
  id: string,
  overrides: Partial<{
    logoUrl: string | null;
    members: { id: string }[];
    theme: unknown;
    themeEnabled: boolean;
  }> = {},
) {
  return {
    id,
    name: `Organization ${id}`,
    slug: `organization-${id}`,
    logoUrl: null,
    theme: validTheme,
    themeEnabled: true,
    members: [],
    ...overrides,
  };
}

function database(input: { course?: unknown; cohort?: unknown }) {
  const findCourse = mock(() => Promise.resolve(input.course ?? null));
  const findCohort = mock(() => Promise.resolve(input.cohort ?? null));
  return {
    value: {
      course: { findUnique: findCourse },
      cohort: { findUnique: findCohort },
    },
    findCourse,
    findCohort,
  };
}

describe("resolveBrandContext", () => {
  test("sanitizes and returns a valid stored theme", () => {
    const result = resolveBrandContext({
      organization: organization("one"),
      source: "course",
    });

    expect(result).toMatchObject({
      organizationId: "one",
      source: "course",
      themeEnabled: true,
      isThemed: true,
      theme: validTheme,
    });
  });

  test("keeps identity while falling back for disabled, null, or invalid themes", () => {
    for (const overrides of [
      {
        logoUrl: "https://example.com/logo.png",
        themeEnabled: false,
        theme: validTheme,
      },
      { themeEnabled: true, theme: null },
      { themeEnabled: true, theme: { primary: null } },
    ]) {
      expect(
        resolveBrandContext({
          organization: organization("fallback", overrides),
          source: "organization",
        }),
      ).toMatchObject({
        organizationId: "fallback",
        name: "Organization fallback",
        theme: null,
        isThemed: false,
      });
    }

    expect(
      resolveBrandContext({
        organization: organization("fallback", {
          logoUrl: "https://example.com/logo.png",
          themeEnabled: false,
        }),
        source: "organization",
      }).logoUrl,
    ).toBe("https://example.com/logo.png");
  });
});

describe("getActiveBrandContext", () => {
  test("returns the default without querying when no route resource is provided", async () => {
    const fake = database({});

    const result = await getActiveBrandContext({
      db: fake.value as never,
      actorUserId: null,
    });

    expect(result).toMatchObject({
      organizationId: null,
      name: "Hakgyo",
      source: "default",
      isThemed: false,
    });
    expect(fake.findCourse).not.toHaveBeenCalled();
    expect(fake.findCohort).not.toHaveBeenCalled();
  });

  test("resolves public published courses for anonymous callers in one query", async () => {
    const fake = database({
      course: {
        status: "PUBLISHED",
        organization: organization("public"),
        enrollments: [],
        cohorts: [],
      },
    });

    const result = await getActiveBrandContext({
      db: fake.value as never,
      actorUserId: null,
      courseId: "course-public",
    });

    expect(result).toMatchObject({
      organizationId: "public",
      source: "course",
    });
    expect(fake.findCourse).toHaveBeenCalledTimes(1);
    expect(fake.findCohort).not.toHaveBeenCalled();
  });

  test("does not reveal missing, archived, or unpublished courses to non-members", async () => {
    for (const course of [
      null,
      {
        status: "ARCHIVED",
        organization: organization("archived"),
        enrollments: [],
        cohorts: [],
      },
      {
        status: "DRAFT",
        organization: organization("draft"),
        enrollments: [{ id: "enrollment" }],
        cohorts: [],
      },
    ]) {
      const fake = database({ course });
      const result = await getActiveBrandContext({
        db: fake.value as never,
        actorUserId: course ? "learner" : null,
        courseId: "hidden-course",
      });

      expect(result).toMatchObject({ source: "default", isThemed: false });
      expect(fake.findCourse).toHaveBeenCalledTimes(1);
    }
  });

  test("allows organization members to preview a draft course", async () => {
    const fake = database({
      course: {
        status: "DRAFT",
        organization: organization("member", {
          members: [{ id: "membership" }],
        }),
        enrollments: [],
        cohorts: [],
      },
    });

    const result = await getActiveBrandContext({
      db: fake.value as never,
      actorUserId: "owner",
      courseId: "draft-course",
    });

    expect(result).toMatchObject({
      organizationId: "member",
      source: "course",
    });
  });

  test("resolves cohort context per route instead of per user", async () => {
    const first = database({
      cohort: {
        status: "IN_PROGRESS",
        endsAt: null,
        enrollments: [{ id: "first-enrollment" }],
        course: {
          status: "PUBLISHED",
          organization: organization("first"),
        },
      },
    });
    const second = database({
      cohort: {
        status: "IN_PROGRESS",
        endsAt: null,
        enrollments: [{ id: "second-enrollment" }],
        course: {
          status: "PUBLISHED",
          organization: organization("second"),
        },
      },
    });

    const [firstResult, secondResult] = await Promise.all([
      getActiveBrandContext({
        db: first.value as never,
        actorUserId: "same-user",
        cohortId: "first-cohort",
      }),
      getActiveBrandContext({
        db: second.value as never,
        actorUserId: "same-user",
        cohortId: "second-cohort",
      }),
    ]);

    expect(firstResult.organizationId).toBe("first");
    expect(secondResult.organizationId).toBe("second");
    expect(first.findCohort).toHaveBeenCalledTimes(1);
    expect(second.findCohort).toHaveBeenCalledTimes(1);
  });

  test("returns the default for a missing cohort", async () => {
    const fake = database({ cohort: null });

    const result = await getActiveBrandContext({
      db: fake.value as never,
      actorUserId: "learner",
      cohortId: "missing-cohort",
    });

    expect(result).toMatchObject({ source: "default", isThemed: false });
    expect(fake.findCohort).toHaveBeenCalledTimes(1);
    expect(fake.findCourse).not.toHaveBeenCalled();
  });

  test("prioritizes cohort input and exposes the procedure publicly", async () => {
    const fake = database({
      cohort: {
        status: "OPEN",
        endsAt: null,
        enrollments: [],
        course: {
          status: "PUBLISHED",
          organization: organization("cohort-public"),
        },
      },
    });
    const caller = brandRouter.createCaller({
      db: fake.value as never,
      actorKind: "session",
      actorUserId: null,
      session: null,
      headers: new Headers(),
      requestCache: new Map(),
    });

    const result = await caller.getContext({
      cohortId: "cohort-public",
      courseId: "ignored-course",
    });

    expect(result).toMatchObject({
      organizationId: "cohort-public",
      source: "cohort",
    });
    expect(fake.findCohort).toHaveBeenCalledTimes(1);
    expect(fake.findCourse).not.toHaveBeenCalled();
  });
});

describe("listAvailableBrandContexts", () => {
  test("returns switchable identities in one query and sanitizes disabled themes", async () => {
    const findMany = mock(() =>
      Promise.resolve([
        organization("first"),
        organization("second", {
          logoUrl: "https://example.com/second.png",
          themeEnabled: false,
        }),
      ]),
    );

    const result = await listAvailableBrandContexts({
      db: { organization: { findMany } } as never,
      actorUserId: "learner-in-two-organizations",
    });

    expect(findMany).toHaveBeenCalledTimes(1);
    expect(result.map(({ organizationId }) => organizationId)).toEqual([
      "first",
      "second",
    ]);
    expect(result[0]).toMatchObject({
      source: "organization",
      isThemed: true,
      theme: validTheme,
    });
    expect(result[1]).toMatchObject({
      logoUrl: "https://example.com/second.png",
      source: "organization",
      isThemed: false,
      theme: null,
    });
  });
});
