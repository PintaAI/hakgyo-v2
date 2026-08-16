import { createMcpHandler } from "mcp-handler";
import { z } from "zod";

import { requireMcpUserId } from "./auth";
import { getMcpCatalogCourse, listMcpCatalog } from "./services/catalog";
import { getMcpContext } from "./services/context";

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
          "Read published course details and its public curriculum outline.",
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
              text: `${result.title} has ${result.modules.length} curriculum module(s).`,
            },
          ],
          structuredContent: result,
        };
      },
    );
  },
  {
    serverInfo: { name: "hakgyo", version: "0.1.0" },
    maxSubscriptions: 0,
  },
);
