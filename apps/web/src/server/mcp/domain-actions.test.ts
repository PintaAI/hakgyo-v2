import { describe, expect, test } from "bun:test";

import {
  addAssessmentAppLinks,
  getMcpToolAnnotations,
  mcpDomainActions,
  mcpDomainTools,
  normalizeMcpProcedureInput,
  sanitizeMcpResult,
} from "./domain-actions";

describe("MCP domain action allowlist", () => {
  test("contains the supported application domains", () => {
    expect(Object.keys(mcpDomainActions).sort()).toEqual([
      "account",
      "assessment",
      "cohort",
      "content",
      "course",
      "enrollment",
      "learning",
      "organization",
    ]);
  });

  test("does not expose destructive or secret-bearing procedures", () => {
    const actions = Object.values(mcpDomainActions).flat();

    expect(actions).not.toContain("removeMember");
    expect(actions).not.toContain("disconnectZoom");
    expect(actions).not.toContain("revokeInvite");
    expect(actions).not.toContain("createInvite");
    expect(actions).not.toContain("redeemInvite");
    expect(actions.some((action) => action.startsWith("delete"))).toBe(false);
    expect(actions.some((action) => action.includes("UploadUrl"))).toBe(false);
    expect(actions.some((action) => action.includes("DownloadUrl"))).toBe(
      false,
    );
  });

  test("gives every action a unique snake_case tool name and description", () => {
    const tools = Object.values(mcpDomainTools).flat();
    const names = tools.map((tool) => tool.name);

    expect(new Set(names).size).toBe(names.length);
    for (const tool of tools) {
      expect(tool.name).toMatch(/^[a-z][a-z0-9_]*$/);
      expect(tool.description.length).toBeGreaterThan(20);
    }
  });

  test("annotates reads, additive writes and overwrites", () => {
    const tool = (domain: keyof typeof mcpDomainTools, action: string) =>
      getMcpToolAnnotations(
        mcpDomainTools[domain].find((entry) => entry.action === action)!,
      );

    expect(tool("course", "get")).toEqual({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    });
    expect(tool("course", "create")).toMatchObject({
      readOnlyHint: false,
      destructiveHint: false,
    });
    expect(tool("course", "update")).toMatchObject({
      readOnlyHint: false,
      destructiveHint: true,
    });
    expect(tool("cohort", "createMeeting").openWorldHint).toBe(true);
  });

  test("keeps Tugas attempts in the mobile app", () => {
    const actions = mcpDomainActions.assessment as readonly string[];

    for (const action of [
      "getForCourseItem",
      "startAttempt",
      "saveAnswers",
      "submitAttempt",
      "getMyAttempt",
    ]) {
      expect(actions).not.toContain(action);
    }
  });

  test("links assessment outline items to the mobile app", () => {
    const result = addAssessmentAppLinks({
      action: "getCourseOutline",
      domain: "learning",
      result: {
        id: "c1",
        modules: [
          {
            id: "m1",
            items: [
              { id: "i1", type: "MATERIAL" },
              { id: "i2", type: "ASSESSMENT" },
            ],
          },
        ],
      },
    });

    expect(result).toEqual({
      id: "c1",
      modules: [
        {
          id: "m1",
          items: [
            { id: "i1", type: "MATERIAL" },
            {
              id: "i2",
              type: "ASSESSMENT",
              appUrl: "hakgyo://courses/c1/items/i2",
            },
          ],
        },
      ],
    });
  });

  test("links assessment course items and material references", () => {
    const result = addAssessmentAppLinks({
      action: "getCourseItem",
      domain: "learning",
      result: {
        id: "i1",
        type: "MATERIAL",
        module: { courseId: "c1" },
        material: {
          requiredActivities: [
            { type: "VOCABULARY_SET", courseItemId: "i2" },
            { type: "ASSESSMENT", courseItemId: "i3" },
          ],
        },
        embeddedResources: {
          courseId: "c1",
          assessments: [{ id: "a1", courseItemId: "i4" }],
        },
      },
    }) as Record<string, unknown>;

    expect(result.appUrl).toBeUndefined();
    expect(result.material).toEqual({
      requiredActivities: [
        { type: "VOCABULARY_SET", courseItemId: "i2" },
        {
          type: "ASSESSMENT",
          courseItemId: "i3",
          appUrl: "hakgyo://courses/c1/items/i3",
        },
      ],
    });
    expect(result.embeddedResources).toEqual({
      courseId: "c1",
      assessments: [
        {
          id: "a1",
          courseItemId: "i4",
          appUrl: "hakgyo://courses/c1/items/i4",
        },
      ],
    });
    expect(
      addAssessmentAppLinks({
        action: "getCourseItem",
        domain: "learning",
        result: {
          id: "i3",
          type: "ASSESSMENT",
          module: { courseId: "c1" },
          material: null,
          embeddedResources: { assessments: [] },
        },
      }),
    ).toMatchObject({ appUrl: "hakgyo://courses/c1/items/i3" });
  });

  test("normalizes meeting dates and removes private storage metadata", () => {
    const normalized = normalizeMcpProcedureInput({
      action: "createMeeting",
      domain: "cohort",
      procedureInput: {
        startsAt: "2026-08-16T12:00:00.000Z",
        endsAt: null,
      },
    });

    expect(normalized.startsAt).toBeInstanceOf(Date);
    const normalizedCohort = normalizeMcpProcedureInput({
      action: "update",
      domain: "cohort",
      procedureInput: {
        startsAt: "2026-08-16T12:00:00.000Z",
        endsAt: "2026-08-16T13:00:00.000Z",
      },
    });
    expect(normalizedCohort.startsAt).toBeInstanceOf(Date);
    expect(normalizedCohort.endsAt).toBeInstanceOf(Date);
    expect(
      sanitizeMcpResult({
        asset: {
          fileName: "lesson.pdf",
          objectKey: "private/object-key",
          etag: "secret-etag",
          joinUrl: "https://zoom.example/join",
        },
      }),
    ).toEqual({ asset: { fileName: "lesson.pdf" } });
    expect(
      sanitizeMcpResult({
        id: "c1",
        createdAt: new Date("2026-08-16T12:00:00.000Z"),
        updatedAt: new Date("2026-08-16T12:00:00.000Z"),
        createdByMembershipId: "m1",
        startsAt: new Date("2026-08-16T12:00:00.000Z"),
        _count: { modules: 2 },
      }),
    ).toEqual({
      id: "c1",
      createdAt: "2026-08-16T12:00:00.000Z",
      startsAt: "2026-08-16T12:00:00.000Z",
      counts: { modules: 2 },
    });
  });
});
