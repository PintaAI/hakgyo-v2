import { describe, expect, test } from "bun:test";

import {
  mcpDomainActions,
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
  });
});
