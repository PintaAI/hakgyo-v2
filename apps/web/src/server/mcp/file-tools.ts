import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

import { db } from "~/server/db";
import { assertMaintenanceAllows } from "~/server/maintenance";
import { importOrganizationFileFromUrl } from "~/server/storage/import-file";

import { requireMcpUserId } from "./auth";
import { sanitizeMcpResult } from "./domain-actions";

/**
 * ChatGPT fills `openai/fileParams` fields with a file the user shared in the
 * conversation ({ download_url, file_id, mime_type, file_name }). Other hosts
 * can pass any public https URL as `download_url`.
 */
const fileInput = z.object({
  download_url: z
    .string()
    .url()
    .describe("Public https URL of the image or audio file"),
  file_id: z.string().optional(),
  mime_type: z.string().optional(),
  file_name: z.string().optional(),
});

export function registerFileTools(server: McpServer) {
  server.registerTool(
    "import_material_file",
    {
      title: "Import file for materials",
      description:
        "Copy an image (PNG, JPEG, GIF, WebP) or audio file (MP3, M4A, OGG, WAV, WebM), up to 25 MB, from a public https URL or a file the user shared in the conversation into the organization's file library. Returns the assetId, fileName and contentType to put in material block props (see get_material_block_catalog). Files the user attached to a Claude conversation have no URL: ask them to upload the file in Hakgyo instead and find it with list_organization_files.",
      inputSchema: z.object({
        organizationId: z
          .string()
          .min(1)
          .describe("Organization id from get_current_user"),
        file: fileInput,
        fileName: z
          .string()
          .max(200)
          .optional()
          .describe("Name to show for the file; defaults to the source name"),
      }),
      outputSchema: z.object({ result: z.unknown() }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
      _meta: { "openai/fileParams": ["file"] },
    },
    async (input, ctx) => {
      try {
        // Calls the service directly, so it checks maintenance itself.
        await assertMaintenanceAllows("write");
        const asset = await importOrganizationFileFromUrl(db, {
          actorUserId: requireMcpUserId(ctx.http?.authInfo),
          organizationId: input.organizationId,
          url: input.file.download_url,
          fileName: input.fileName ?? input.file.file_name,
          contentType: input.file.mime_type,
        });
        const result = sanitizeMcpResult({
          assetId: asset.id,
          fileName: asset.fileName,
          contentType: asset.contentType,
          size: asset.size,
        });
        return {
          content: [
            {
              type: "text",
              text: `Imported ${asset.fileName} (${asset.contentType}) as assetId ${asset.id}.\n${JSON.stringify(result, null, 2)}`,
            },
          ],
          structuredContent: { result },
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text:
                error instanceof Error
                  ? error.message
                  : "The file could not be imported",
            },
          ],
          isError: true,
        };
      }
    },
  );
}
