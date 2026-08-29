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
                  _count: { enrollments: 12 },
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

  test("distinguishes course and cohort invitations", async () => {
    const course = await resolveUnifiedInvite(
      database({ enrollment: {} }),
      "course-token-long-enough",
      now,
    );
    const cohort = await resolveUnifiedInvite(
      database({
        enrollment: {
          cohort: {
            id: "cohort-1",
            name: "August Group",
            status: "OPEN",
            startsAt: null,
            endsAt: null,
            _count: { enrollments: 7 },
          },
        },
      }),
      "cohort-token-long-enough",
      now,
    );
    expect(course).toMatchObject({
      type: "COURSE",
      course: { id: "course-1" },
    });
    expect(cohort).toMatchObject({
      type: "COHORT",
      cohort: { id: "cohort-1" },
      joinedCount: 7,
    });
    expect(course).toMatchObject({
      joinedCount: 12,
      course: {
        moduleCount: 1,
        itemCount: 1,
        items: [{ title: "Hangul basics", moduleTitle: "Introduction" }],
      },
    });
  });

  test("reports exhausted reusable enrollment invitations", async () => {
    const invite = await resolveUnifiedInvite(
      database({ enrollment: { maxUses: 2, useCount: 2 } }),
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
