import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { r2, r2Bucket } from "~/server/r2";

const MAX_DOCUMENT_SIZE = 100 * 1024 * 1024;
const SIGNED_URL_TTL_SECONDS = 5 * 60;

const documentKeySchema = z.string().min(1).max(1024);

const getUserPrefix = (userId: string) =>
  `documents/${encodeURIComponent(userId)}/`;

const assertOwnedKey = (key: string, userId: string) => {
  if (!key.startsWith(getUserPrefix(userId))) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
};

const getExpectedSize = (key: string) => {
  const fileName = key.slice(key.lastIndexOf("/") + 1);
  const match = /^[0-9a-f-]{36}-(\d+)(?:\.[a-z0-9]{1,10})?$/.exec(fileName);
  const expectedSize = Number(match?.[1]);

  if (!Number.isSafeInteger(expectedSize) || expectedSize <= 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid object key" });
  }

  return expectedSize;
};

export const storageRouter = createTRPCRouter({
  createUploadUrl: protectedProcedure
    .input(
      z.object({
        fileName: z.string().trim().min(1).max(255),
        contentType: z
          .string()
          .trim()
          .regex(/^[\w!#$&^_.+-]+\/[\w!#$&^_.+-]+$/),
        fileSize: z.number().int().positive().max(MAX_DOCUMENT_SIZE),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const extension =
        /\.[a-z0-9]{1,10}$/i.exec(input.fileName)?.[0].toLowerCase() ?? "";
      const key = `${getUserPrefix(ctx.session.user.id)}${crypto.randomUUID()}-${input.fileSize}${extension}`;
      const command = new PutObjectCommand({
        Bucket: r2Bucket,
        Key: key,
        ContentType: input.contentType,
      });

      const uploadUrl = await getSignedUrl(r2, command, {
        expiresIn: SIGNED_URL_TTL_SECONDS,
      });

      return {
        key,
        uploadUrl,
        expiresIn: SIGNED_URL_TTL_SECONDS,
        headers: { "Content-Type": input.contentType },
      };
    }),

  confirmUpload: protectedProcedure
    .input(z.object({ key: documentKeySchema }))
    .mutation(async ({ ctx, input }) => {
      assertOwnedKey(input.key, ctx.session.user.id);
      const expectedSize = getExpectedSize(input.key);

      let object;
      try {
        object = await r2.send(
          new HeadObjectCommand({ Bucket: r2Bucket, Key: input.key }),
        );
      } catch (cause) {
        const status = (cause as { $metadata?: { httpStatusCode?: number } })
          .$metadata?.httpStatusCode;
        throw new TRPCError({
          code: status === 404 ? "NOT_FOUND" : "INTERNAL_SERVER_ERROR",
          message:
            status === 404 ? "Uploaded document was not found" : undefined,
          cause,
        });
      }

      if (
        object.ContentLength !== expectedSize ||
        object.ContentLength > MAX_DOCUMENT_SIZE
      ) {
        await r2.send(
          new DeleteObjectCommand({ Bucket: r2Bucket, Key: input.key }),
        );
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Uploaded document size does not match the signed request",
        });
      }

      return {
        key: input.key,
        size: object.ContentLength,
        contentType: object.ContentType ?? "application/octet-stream",
        etag: object.ETag ?? null,
      };
    }),

  createDownloadUrl: protectedProcedure
    .input(z.object({ key: documentKeySchema }))
    .mutation(async ({ ctx, input }) => {
      assertOwnedKey(input.key, ctx.session.user.id);

      const downloadUrl = await getSignedUrl(
        r2,
        new GetObjectCommand({
          Bucket: r2Bucket,
          Key: input.key,
          ResponseContentDisposition: "attachment",
        }),
        { expiresIn: SIGNED_URL_TTL_SECONDS },
      );

      return { downloadUrl, expiresIn: SIGNED_URL_TTL_SECONDS };
    }),

  deleteDocument: protectedProcedure
    .input(z.object({ key: documentKeySchema }))
    .mutation(async ({ ctx, input }) => {
      assertOwnedKey(input.key, ctx.session.user.id);
      await r2.send(
        new DeleteObjectCommand({ Bucket: r2Bucket, Key: input.key }),
      );
      return { deleted: true };
    }),
});
