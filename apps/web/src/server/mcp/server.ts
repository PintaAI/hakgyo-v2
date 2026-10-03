import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

import { hakgyoBlockCatalog } from "~/lib/blocknote/block-catalog";

import { requireMcpUserId } from "./auth";
import { getMcpToolAnnotations, sanitizeMcpResult } from "./domain-actions";
import { registerLandingTools } from "./landing-tools";
import { getMcpCatalogCourse, listMcpCatalog } from "./services/catalog";
import { getMcpContext } from "./services/context";
import {
  getMcpActionInputSchema,
  invokeMcpDomainAction,
  mcpDomainTools,
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
  moduleCount: z.number().int(),
  cohortCount: z.number().int(),
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
  () => {
    const server = new McpServer({ name: "hakgyo", version: "0.1.0" });

    server.registerTool(
      "get_current_user",
      {
        title: "Get current user",
        description:
          "Show the signed-in Hakgyo user and their staff role (OWNER, ADMIN or TEACHER) in each organization. Call this first to find organization ids and membership ids.",
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
      "list_catalog_courses",
      {
        title: "List published courses",
        description:
          "Browse published courses anyone can find in the Hakgyo catalog, optionally within one organization. Results are paginated with cursor.",
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
        const { courses, nextCursor } = await listMcpCatalog(input);
        const result = {
          courses: courses.map(({ _count, ...course }) => ({
            ...course,
            moduleCount: _count.modules,
            cohortCount: _count.cohorts,
          })),
          nextCursor,
        };
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
      "get_catalog_course",
      {
        title: "Get published course",
        description:
          "Read a published course's public details, price and kurikulum outline from the Hakgyo catalog.",
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
      "get_material_block_catalog",
      {
        title: "Get material block catalog",
        description:
          "Return the BlockNote document format and the built-in and Hakgyo custom blocks a learning material can contain. Call this before create_material or update_material.",
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

    for (const [domain, tools] of Object.entries(mcpDomainTools)) {
      for (const tool of tools) {
        server.registerTool(
          tool.name,
          {
            title: tool.title,
            description: tool.description,
            inputSchema: getMcpActionInputSchema(
              domain as McpDomain,
              tool.action,
            ),
            outputSchema: z.object({ result: z.unknown() }),
            annotations: getMcpToolAnnotations(tool),
          },
          async (input, ctx) => {
            try {
              const result = await invokeMcpDomainAction({
                action: tool.action,
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
    }

    registerLandingTools(server);

    return server;
  },
  {
    legacy: "reject",
    maxSubscriptions: 0,
  },
);
