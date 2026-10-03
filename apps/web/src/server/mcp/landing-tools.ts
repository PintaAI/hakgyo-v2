import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

import { db } from "~/server/db";
import { MAX_LANDING_HTML_BYTES } from "~/server/organization-landing/html";
import {
  LANDING_GUIDELINES_VERSION,
  landingGuidelines,
} from "~/server/organization-landing/guidelines";
import {
  getLandingContext,
  getLandingDraft,
  listLandingRevisions,
  restoreLandingRevision,
  saveLandingDraft,
  type SaveLandingDraftResult,
} from "~/server/organization-landing/service";

import { requireMcpUserId } from "./auth";
import { sanitizeMcpResult } from "./domain-actions";

type AuthContext = Parameters<typeof requireMcpUserId>[0];

const organizationInput = z.object({
  organizationId: z
    .string()
    .min(1)
    .describe("Organization id from get_current_user (OWNER role required)"),
});

const readOnly = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

const draftWrite = {
  readOnlyHint: false,
  // Drafts never change the live page, and every revision can be restored.
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
} as const;

function json(value: unknown) {
  const result = sanitizeMcpResult(value);
  return {
    content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    structuredContent: { result },
  };
}

function failure(error: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text:
          error instanceof Error ? error.message : "Hakgyo operation failed",
      },
    ],
    isError: true,
  };
}

async function run<T>(
  authInfo: AuthContext,
  action: (actorUserId: string) => Promise<T>,
  format: (result: T) => ReturnType<typeof json> | ReturnType<typeof failure>,
) {
  try {
    return format(await action(requireMcpUserId(authInfo)));
  } catch (error) {
    return failure(error);
  }
}

function saved(result: SaveLandingDraftResult) {
  if (!result.ok) {
    const issues = result.errors
      .map((issue) =>
        issue.line
          ? `- line ${issue.line}: ${issue.message}`
          : `- ${issue.message}`,
      )
      .join("\n");
    return {
      content: [
        {
          type: "text" as const,
          text: `The draft was not saved. Fix these ${result.errors.length} error(s) and send the full document again:\n${issues}`,
        },
      ],
      isError: true,
    };
  }
  const warnings = result.warnings.map((issue) => `- ${issue.message}`);
  const response = json(result);
  response.content[0]!.text = [
    `Saved draft revision ${result.revisionId}. The owner can review, edit copy, and publish at ${result.editorUrl}`,
    ...(warnings.length ? ["Warnings:", ...warnings] : []),
  ].join("\n");
  return response;
}

const resultSchema = z.object({ result: z.unknown() });

/** Owner-only tools for designing the organization landing page as one HTML file. */
export function registerLandingTools(server: McpServer) {
  server.registerTool(
    "get_landing_page_guidelines",
    {
      title: "Get landing page guidelines",
      description:
        "Read the rules for Hakgyo landing page HTML: required structure, allowed URLs, editable copy markers, the course slot, and design do's and don'ts. Call this before designing or revising a landing page.",
      inputSchema: z.object({}),
      outputSchema: z.object({ version: z.string(), guidelines: z.string() }),
      annotations: readOnly,
    },
    async (_input, ctx) => {
      requireMcpUserId(ctx.http?.authInfo);
      return {
        content: [{ type: "text", text: landingGuidelines }],
        structuredContent: {
          version: LANDING_GUIDELINES_VERSION,
          guidelines: landingGuidelines,
        },
      };
    },
  );

  server.registerTool(
    "get_landing_page_context",
    {
      title: "Get landing page context",
      description:
        "Organization name, logo, colors, public courses, uploaded images, allowed asset origins, and the exact Hakgyo links a landing page may use.",
      inputSchema: organizationInput,
      outputSchema: resultSchema,
      annotations: readOnly,
    },
    ({ organizationId }, ctx) =>
      run(
        ctx.http?.authInfo,
        (actorUserId) => getLandingContext({ db, organizationId, actorUserId }),
        json,
      ),
  );

  server.registerTool(
    "get_landing_page_draft",
    {
      title: "Get landing page draft",
      description:
        "Current draft HTML, its revisionId, and the owner-editable copy fields. Starts from Hakgyo's starter template when no draft exists. Pass revisionId as baseRevisionId to update_draft.",
      inputSchema: organizationInput,
      outputSchema: resultSchema,
      annotations: readOnly,
    },
    ({ organizationId }, ctx) =>
      run(
        ctx.http?.authInfo,
        (actorUserId) => getLandingDraft({ db, organizationId, actorUserId }),
        json,
      ),
  );

  server.registerTool(
    "update_landing_page_draft",
    {
      title: "Update landing page draft",
      description:
        "Validate and save a complete single-file HTML landing page as a new draft revision. Returns validation errors to fix, or the editor URL where the owner reviews and publishes. Never changes the live page.",
      inputSchema: organizationInput.extend({
        html: z
          .string()
          .min(1)
          .max(MAX_LANDING_HTML_BYTES)
          .describe("The complete HTML document"),
        summary: z
          .string()
          .trim()
          .min(1)
          .max(500)
          .describe("One sentence describing what changed, shown to the owner"),
        baseRevisionId: z
          .string()
          .min(1)
          .nullable()
          .optional()
          .describe(
            "revisionId from get_draft; rejects the save if the owner changed the draft since",
          ),
      }),
      outputSchema: resultSchema,
      annotations: draftWrite,
    },
    ({ organizationId, html, summary, baseRevisionId }, ctx) =>
      run(
        ctx.http?.authInfo,
        (actorUserId) =>
          saveLandingDraft({
            db,
            organizationId,
            actorUserId,
            html,
            summary,
            baseRevisionId,
            source: "MCP",
          }),
        saved,
      ),
  );

  server.registerTool(
    "list_landing_page_revisions",
    {
      title: "List landing page revisions",
      description:
        "Recent draft revisions, newest first, with who made them and from where (MCP, web editor, or restore).",
      inputSchema: organizationInput.extend({
        limit: z.number().int().min(1).max(50).default(20),
      }),
      outputSchema: resultSchema,
      annotations: readOnly,
    },
    ({ organizationId, limit }, ctx) =>
      run(
        ctx.http?.authInfo,
        (actorUserId) =>
          listLandingRevisions({ db, organizationId, actorUserId, limit }),
        json,
      ),
  );

  server.registerTool(
    "restore_landing_page_revision",
    {
      title: "Restore landing page revision",
      description:
        "Make an earlier revision the current draft again, as a new revision. Never changes the live page.",
      inputSchema: organizationInput.extend({ revisionId: z.string().min(1) }),
      outputSchema: resultSchema,
      annotations: draftWrite,
    },
    ({ organizationId, revisionId }, ctx) =>
      run(
        ctx.http?.authInfo,
        (actorUserId) =>
          restoreLandingRevision({
            db,
            organizationId,
            actorUserId,
            revisionId,
          }),
        saved,
      ),
  );
}
