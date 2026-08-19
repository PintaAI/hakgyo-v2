import { createMcpHandler } from "mcp-handler";
import { z } from "zod";

import { hakgyoBlockCatalog } from "~/lib/blocknote/block-catalog";

import { requireMcpUserId } from "./auth";
import { sanitizeMcpResult } from "./domain-actions";
import { getMcpCatalogCourse, listMcpCatalog } from "./services/catalog";
import { getMcpContext } from "./services/context";
import {
  getMcpCapabilitySchemas,
  invokeMcpDomainAction,
  mcpDomainActions,
  type McpDomain,
} from "./services/domains";

const organizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
});

const catalogCourseSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
  price: z.number().int(),
  currency: z.string(),
  organization: organizationSchema,
  _count: z.object({ modules: z.number().int(), cohorts: z.number().int() }),
});

const catalogCourseDetailSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
  price: z.number().int(),
  currency: z.string(),
  progressionMode: z.enum(["OPEN", "SEQUENTIAL"]),
  organization: organizationSchema,
  modules: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string().nullable(),
      position: z.number().int(),
      items: z.array(
        z.object({
          id: z.string(),
          type: z.enum(["MATERIAL", "ASSESSMENT", "VOCABULARY_SET"]),
          position: z.number().int(),
        }),
      ),
    }),
  ),
});

export const mcpHandler = createMcpHandler(
  (server) => {
    server.registerTool(
      "hakgyo.context.get",
      {
        title: "Get Hakgyo context",
        description:
          "Show the current Hakgyo user and their organization roles.",
        outputSchema: z.object({
          id: z.string(),
          name: z.string(),
          organizations: z.array(
            z.object({
              membershipId: z.string(),
              role: z.enum(["OWNER", "ADMIN", "TEACHER"]),
              organization: organizationSchema,
            }),
          ),
        }),
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
      async (ctx) => {
        const user = await getMcpContext(requireMcpUserId(ctx.http?.authInfo));
        const result = {
          id: user.id,
          name: user.name,
          organizations: user.organizationMemberships.map((membership) => ({
            membershipId: membership.id,
            role: membership.role,
            organization: membership.organization,
          })),
        };
        return {
          content: [
            {
              type: "text",
              text: `Signed in as ${result.name} with ${result.organizations.length} organization membership(s).`,
            },
          ],
          structuredContent: result,
        };
      },
    );

    server.registerTool(
      "hakgyo.catalog.list_courses",
      {
        title: "List published courses",
        description: "Browse published courses in the Hakgyo catalog.",
        inputSchema: z.object({
          organizationId: z.string().min(1).optional(),
          limit: z.number().int().min(1).max(50).default(20),
          cursor: z.string().min(1).optional(),
        }),
        outputSchema: z.object({
          courses: z.array(catalogCourseSchema),
          nextCursor: z.string().optional(),
        }),
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
      async (input) => {
        const result = await listMcpCatalog(input);
        return {
          content: [
            {
              type: "text",
              text: `Found ${result.courses.length} published course(s).`,
            },
          ],
          structuredContent: result,
        };
      },
    );

    server.registerTool(
      "hakgyo.catalog.get_course",
      {
        title: "Get published course",
        description:
          "Read published course details and its public kurikulum outline.",
        inputSchema: z.object({ courseId: z.string().min(1) }),
        outputSchema: catalogCourseDetailSchema,
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
      async ({ courseId }) => {
        const result = await getMcpCatalogCourse(courseId);
        return {
          content: [
            {
              type: "text",
              text: `${result.title} has ${result.modules.length} kurikulum module(s).`,
            },
          ],
          structuredContent: result,
        };
      },
    );

    server.registerTool(
      "hakgyo.content.get_block_catalog",
      {
        title: "Get Hakgyo BlockNote catalog",
        description:
          "Return the current BlockNote document format, supported built-in blocks, and Hakgyo custom blocks. Call this before creating or updating material content.",
        inputSchema: z.object({}),
        outputSchema: z.object({ catalog: z.unknown() }),
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
      async (_input, ctx) => {
        requireMcpUserId(ctx.http?.authInfo);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(hakgyoBlockCatalog, null, 2),
            },
          ],
          structuredContent: { catalog: hakgyoBlockCatalog },
        };
      },
    );

    server.registerTool(
      "hakgyo.capabilities.get",
      {
        title: "Get Hakgyo capability schemas",
        description:
          "List safe role-aware Hakgyo operations and their exact input schemas. Use this before calling a domain operation.",
        inputSchema: z.object({
          domain: z
            .enum([
              "account",
              "organization",
              "course",
              "content",
              "cohort",
              "enrollment",
              "learning",
              "assessment",
            ])
            .optional(),
          action: z.string().min(1).optional(),
        }),
        outputSchema: z.object({ capabilities: z.unknown() }),
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
      async (input, ctx) => {
        requireMcpUserId(ctx.http?.authInfo);
        const capabilities = getMcpCapabilitySchemas(input);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(capabilities, null, 2),
            },
          ],
          structuredContent: { capabilities },
        };
      },
    );

    for (const [domain, actions] of Object.entries(mcpDomainActions)) {
      const contentGuidance =
        domain === "content"
          ? " Before createMaterial or updateMaterial, call hakgyo.content.get_block_catalog and generate BlockNote editor.document JSON using its current catalog version."
          : "";
      server.registerTool(
        `hakgyo.${domain}.manage`,
        {
          title: `Hakgyo ${domain} operations`,
          description: `Run a safe ${domain} operation using the current user's live Hakgyo permissions. Call hakgyo.capabilities.get first for exact action input schemas.${contentGuidance} Destructive and secret-bearing operations are not available.`,
          inputSchema: z.object({
            action: z.enum(actions),
            input: z.record(z.string(), z.unknown()).default({}),
          }),
          outputSchema: z.object({ result: z.unknown() }),
          annotations: {
            readOnlyHint: false,
            destructiveHint: true,
            idempotentHint: false,
            openWorldHint: true,
          },
        },
        async ({ action, input }, ctx) => {
          try {
            const result = await invokeMcpDomainAction({
              action,
              actorUserId: requireMcpUserId(ctx.http?.authInfo),
              domain: domain as McpDomain,
              procedureInput: input,
            });
            const serialized = sanitizeMcpResult(result);
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(serialized, null, 2),
                },
              ],
              structuredContent: { result: serialized },
            };
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : "Hakgyo operation failed";
            return {
              content: [{ type: "text", text: message }],
              isError: true,
            };
          }
        },
      );
    }
  },
  {
    serverInfo: { name: "hakgyo", version: "0.1.0" },
    maxSubscriptions: 0,
  },
);
