import { describe, expect, test } from "bun:test";

import type { Prisma } from "../../../generated/prisma/client";
import { resolveUnifiedInvite } from "./unified";

const now = new Date("2026-08-19T00:00:00.000Z");

function database(input: {
  enrollment?: {
    cohort?: {
      id: string;
      name: string;
      status: "OPEN" | "IN_PROGRESS";
      startsAt: Date | null;
      endsAt: Date | null;
      _count: { enrollments: number };
    } | null;
    maxUses?: number | null;
    useCount?: number;
  };
  organization?: boolean;
}) {
  return {
    organizationInvite: {
      findUnique: () =>
        Promise.resolve(
          input.organization
            ? {
                email: "teacher@example.com",
                role: "TEACHER",
                expiresAt: new Date("2026-08-26T00:00:00.000Z"),
                acceptedAt: null,
                revokedAt: null,
                organization: { name: "Hakgyo", slug: "hakgyo" },
              }
            : null,
        ),
    },
    enrollmentInvite: {
      findUnique: () =>
        Promise.resolve(
          input.enrollment
            ? {
                expiresAt: new Date("2026-08-26T00:00:00.000Z"),
                maxUses: input.enrollment.maxUses ?? null,
                useCount: input.enrollment.useCount ?? 0,
                revokedAt: null,
                course: {
                  id: "course-1",
                  title: "Korean Basics",
                  description: "Learn Korean from the basics.",
                  thumbnailUrl: "https://example.com/course.jpg",
                  organization: { name: "Hakgyo", slug: "hakgyo" },
                  modules: [
                    {
                      id: "module-1",
                      title: "Introduction",
                      _count: { items: 1 },
                      items: [
                        {
                          id: "item-1",
                          type: "MATERIAL",
                          material: { title: "Hangul basics" },
                          assessment: null,
                          vocabularySet: null,
                        },
                      ],
                    },
                  ],
                },
                cohort: input.enrollment.cohort ?? null,
              }
            : null,
        ),
    },
  } as unknown as Prisma.DefaultPrismaClient;
}

describe("resolveUnifiedInvite", () => {
  test("resolves organization invitations with a masked email", async () => {
    const invite = await resolveUnifiedInvite(
      database({ organization: true }),
      "organization-token-long-enough",
      now,
      "teacher@example.com",
    );
    expect(invite).toMatchObject({
      type: "ORGANIZATION",
      status: "PENDING",
      emailHint: "t***@example.com",
      emailMatches: true,
      role: "TEACHER",
    });
  });

  const augustGroup = {
    id: "cohort-1",
    name: "August Group",
    status: "OPEN" as const,
    startsAt: null,
    endsAt: null,
    _count: { enrollments: 7 },
  };

  test("previews a class invitation with its curriculum", async () => {
    const invite = await resolveUnifiedInvite(
      database({ enrollment: { cohort: augustGroup } }),
      "cohort-token-long-enough",
      now,
    );
    expect(invite).toMatchObject({
      type: "COHORT",
      status: "PENDING",
      cohort: { id: "cohort-1" },
      joinedCount: 7,
      course: {
        id: "course-1",
        moduleCount: 1,
        itemCount: 1,
        items: [{ title: "Hangul basics", moduleTitle: "Introduction" }],
      },
    });
  });

  test("shows a retired course-level invitation as no longer valid", async () => {
    const invite = await resolveUnifiedInvite(
      database({ enrollment: {} }),
      "course-token-long-enough",
      now,
    );
    expect(invite).toEqual({
      type: "RETIRED",
      status: "REVOKED",
      organization: { name: "Hakgyo", slug: "hakgyo" },
    });
  });

  test("reports exhausted reusable enrollment invitations", async () => {
    const invite = await resolveUnifiedInvite(
      database({
        enrollment: { cohort: augustGroup, maxUses: 2, useCount: 2 },
      }),
      "exhausted-token-long-enough",
      now,
    );
    expect(invite.status).toBe("EXHAUSTED");
  });

  test("rejects an unknown token", async () => {
    try {
      await resolveUnifiedInvite(
        database({}),
        "unknown-token-long-enough",
        now,
      );
      throw new Error("Expected rejection");
    } catch (error) {
      expect(error).toMatchObject({ code: "NOT_FOUND" });
    }
  });
});
