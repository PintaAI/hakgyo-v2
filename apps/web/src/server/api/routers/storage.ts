import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  createOrganizationLogoKey,
  getManagedOrganizationLogoKey,
  getOrganizationLogoPath,
  MAX_ORGANIZATION_LOGO_SIZE,
  organizationLogoContentTypes,
  parseOrganizationLogoKey,
} from "~/lib/organization-logo";
import {
  createProfileImageKey,
  getManagedProfileImageKey,
  getProfileImagePath,
  MAX_PROFILE_IMAGE_SIZE,
  parseProfileImageKey,
  profileImageContentTypes,
} from "~/lib/profile-image";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  requireCourseItemAccess,
  requireOrganizationPermission,
} from "~/server/authorization";
import { db } from "~/server/db";
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
  createProfileImageUploadUrl: protectedProcedure
    .input(
      z.object({
        contentType: z.enum(profileImageContentTypes),
        fileSize: z.number().int().positive().max(MAX_PROFILE_IMAGE_SIZE),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const key = createProfileImageKey(
        ctx.actorUserId,
        input.fileSize,
        input.contentType,
      );
      const uploadUrl = await getSignedUrl(
        r2,
        new PutObjectCommand({
          Bucket: r2Bucket,
          Key: key,
          ContentType: input.contentType,
        }),
        { expiresIn: SIGNED_URL_TTL_SECONDS },
      );

      return {
        key,
        uploadUrl,
        expiresIn: SIGNED_URL_TTL_SECONDS,
        headers: { "Content-Type": input.contentType },
      };
    }),

  confirmProfileImageUpload: protectedProcedure
    .input(z.object({ key: z.string().min(1).max(1024) }))
    .mutation(async ({ ctx, input }) => {
      const parsed = parseProfileImageKey(input.key, ctx.actorUserId);
      if (!parsed) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid image key",
        });
      }

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
          message: status === 404 ? "Uploaded image was not found" : undefined,
          cause,
        });
      }

      if (
        object.ContentLength !== parsed.size ||
        object.ContentType !== parsed.contentType
      ) {
        await r2.send(
          new DeleteObjectCommand({ Bucket: r2Bucket, Key: input.key }),
        );
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Uploaded image does not match the signed request",
        });
      }

      const currentUser = await db.user.findUnique({
        where: { id: ctx.actorUserId },
        select: { image: true },
      });
      const oldKey = getManagedProfileImageKey(
        currentUser?.image,
        ctx.actorUserId,
      );
      const image = getProfileImagePath(ctx.actorUserId, parsed.fileName);
      await db.user.update({
        where: { id: ctx.actorUserId },
        data: { image },
      });

      if (oldKey && oldKey !== input.key) {
        try {
          await r2.send(
            new DeleteObjectCommand({ Bucket: r2Bucket, Key: oldKey }),
          );
        } catch (error) {
          console.error("Failed to remove replaced profile image", error);
        }
      }

      return { image };
    }),

  discardProfileImageUpload: protectedProcedure
    .input(z.object({ key: z.string().min(1).max(1024) }))
    .mutation(async ({ ctx, input }) => {
      if (!parseProfileImageKey(input.key, ctx.actorUserId)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const user = await db.user.findUnique({
        where: { id: ctx.actorUserId },
        select: { image: true },
      });
      if (
        getManagedProfileImageKey(user?.image, ctx.actorUserId) === input.key
      ) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "The image is currently in use",
        });
      }
      await r2.send(
        new DeleteObjectCommand({ Bucket: r2Bucket, Key: input.key }),
      );
      return { deleted: true };
    }),

  deleteProfileImage: protectedProcedure.mutation(async ({ ctx }) => {
    const user = await db.user.findUnique({
      where: { id: ctx.actorUserId },
      select: { image: true },
    });
    const key = getManagedProfileImageKey(user?.image, ctx.actorUserId);
    await db.user.update({
      where: { id: ctx.actorUserId },
      data: { image: null },
    });
    if (key) {
      try {
        await r2.send(new DeleteObjectCommand({ Bucket: r2Bucket, Key: key }));
      } catch (error) {
        console.error("Failed to remove profile image", error);
      }
    }
    return { deleted: true };
  }),

  createOrganizationLogoUploadUrl: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().min(1),
        contentType: z.enum(organizationLogoContentTypes),
        fileSize: z.number().int().positive().max(MAX_ORGANIZATION_LOGO_SIZE),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireOrganizationPermission({
        organizationId: input.organizationId,
        permission: "organization.manage",
        userId: ctx.actorUserId,
      });
      const key = createOrganizationLogoKey(
        input.organizationId,
        input.fileSize,
        input.contentType,
      );
      const uploadUrl = await getSignedUrl(
        r2,
        new PutObjectCommand({
          Bucket: r2Bucket,
          Key: key,
          ContentType: input.contentType,
        }),
        { expiresIn: SIGNED_URL_TTL_SECONDS },
      );

      return {
        key,
        uploadUrl,
        expiresIn: SIGNED_URL_TTL_SECONDS,
        headers: { "Content-Type": input.contentType },
      };
    }),

  confirmOrganizationLogoUpload: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().min(1),
        key: z.string().min(1).max(1024),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireOrganizationPermission({
        organizationId: input.organizationId,
        permission: "organization.manage",
        userId: ctx.actorUserId,
      });
      const parsed = parseOrganizationLogoKey(input.key, input.organizationId);
      if (!parsed) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid logo key",
        });
      }

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
          message: status === 404 ? "Uploaded logo was not found" : undefined,
          cause,
        });
      }

      if (
        object.ContentLength !== parsed.size ||
        object.ContentType !== parsed.contentType
      ) {
        await r2.send(
          new DeleteObjectCommand({ Bucket: r2Bucket, Key: input.key }),
        );
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Uploaded logo does not match the signed request",
        });
      }

      const organization = await db.organization.findUniqueOrThrow({
        where: { id: input.organizationId },
        select: { logoUrl: true },
      });
      const oldKey = getManagedOrganizationLogoKey(
        organization.logoUrl,
        input.organizationId,
      );
      const logoUrl = getOrganizationLogoPath(
        input.organizationId,
        parsed.fileName,
      );
      await db.organization.update({
        where: { id: input.organizationId },
        data: { logoUrl },
      });

      if (oldKey && oldKey !== input.key) {
        try {
          await r2.send(
            new DeleteObjectCommand({ Bucket: r2Bucket, Key: oldKey }),
          );
        } catch (error) {
          console.error("Failed to remove replaced organization logo", error);
        }
      }

      return { logoUrl };
    }),

  discardOrganizationLogoUpload: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().min(1),
        key: z.string().min(1).max(1024),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireOrganizationPermission({
        organizationId: input.organizationId,
        permission: "organization.manage",
        userId: ctx.actorUserId,
      });
      if (!parseOrganizationLogoKey(input.key, input.organizationId)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const organization = await db.organization.findUniqueOrThrow({
        where: { id: input.organizationId },
        select: { logoUrl: true },
      });
      if (
        getManagedOrganizationLogoKey(
          organization.logoUrl,
          input.organizationId,
        ) === input.key
      ) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "The logo is currently in use",
        });
      }
      await r2.send(
        new DeleteObjectCommand({ Bucket: r2Bucket, Key: input.key }),
      );
      return { deleted: true };
    }),

  deleteOrganizationLogo: protectedProcedure
    .input(z.object({ organizationId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await requireOrganizationPermission({
        organizationId: input.organizationId,
        permission: "organization.manage",
        userId: ctx.actorUserId,
      });
      const organization = await db.organization.findUniqueOrThrow({
        where: { id: input.organizationId },
        select: { logoUrl: true },
      });
      const key = getManagedOrganizationLogoKey(
        organization.logoUrl,
        input.organizationId,
      );
      await db.organization.update({
        where: { id: input.organizationId },
        data: { logoUrl: null },
      });
      if (key) {
        try {
          await r2.send(
            new DeleteObjectCommand({ Bucket: r2Bucket, Key: key }),
          );
        } catch (error) {
          console.error("Failed to remove organization logo", error);
        }
      }
      return { deleted: true };
    }),

  createUploadUrl: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().min(1),
        fileName: z.string().trim().min(1).max(255),
        contentType: z
          .string()
          .trim()
          .regex(/^[\w!#$&^_.+-]+\/[\w!#$&^_.+-]+$/),
        fileSize: z.number().int().positive().max(MAX_DOCUMENT_SIZE),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.actorUserId;
      await requireOrganizationPermission({
        organizationId: input.organizationId,
        permission: "asset.create",
        userId,
      });

      const extension =
        /\.[a-z0-9]{1,10}$/i.exec(input.fileName)?.[0].toLowerCase() ?? "";
      const key = `${getUserPrefix(ctx.actorUserId)}${crypto.randomUUID()}-${input.fileSize}${extension}`;
      const command = new PutObjectCommand({
        Bucket: r2Bucket,
        Key: key,
        ContentType: input.contentType,
      });

      const uploadUrl = await getSignedUrl(r2, command, {
        expiresIn: SIGNED_URL_TTL_SECONDS,
      });
      const asset = await db.asset.create({
        data: {
          organizationId: input.organizationId,
          uploadedByUserId: userId,
          objectKey: key,
          fileName: input.fileName,
          contentType: input.contentType,
          size: input.fileSize,
        },
        select: { id: true },
      });

      return {
        assetId: asset.id,
        key,
        uploadUrl,
        expiresIn: SIGNED_URL_TTL_SECONDS,
        headers: { "Content-Type": input.contentType },
      };
    }),

  confirmUpload: protectedProcedure
    .input(z.object({ key: documentKeySchema }))
    .mutation(async ({ ctx, input }) => {
      assertOwnedKey(input.key, ctx.actorUserId);
      const asset = await db.asset.findUnique({
        where: { objectKey: input.key },
      });
      if (asset?.uploadedByUserId !== ctx.actorUserId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const expectedSize = getExpectedSize(input.key);
      if (asset.size !== expectedSize || asset.deletedAt) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid asset" });
      }

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

      const confirmedAsset = await db.asset.update({
        where: { id: asset.id },
        data: {
          confirmedAt: new Date(),
          contentType: object.ContentType ?? asset.contentType,
          etag: object.ETag ?? null,
        },
        select: { id: true },
      });

      return {
        assetId: confirmedAsset.id,
        key: input.key,
        size: object.ContentLength,
        contentType: object.ContentType ?? "application/octet-stream",
        etag: object.ETag ?? null,
      };
    }),

  createDownloadUrl: protectedProcedure
    .input(z.object({ assetId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.actorUserId;
      const asset = await db.asset.findFirst({
        where: {
          id: input.assetId,
          confirmedAt: { not: null },
          deletedAt: null,
        },
        select: {
          objectKey: true,
          uploadedByUserId: true,
          organization: {
            select: {
              members: {
                where: { userId, role: { in: ["OWNER", "ADMIN"] } },
                select: { id: true },
                take: 1,
              },
            },
          },
          materials: {
            select: {
              material: { select: { courseItems: { select: { id: true } } } },
            },
          },
          vocabularyEntries: {
            select: {
              vocabularySet: {
                select: { courseItems: { select: { id: true } } },
              },
            },
          },
        },
      });
      if (!asset) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const hasDirectAccess =
        asset.uploadedByUserId === userId ||
        asset.organization.members.length > 0;
      if (!hasDirectAccess) {
        const courseItemIds = new Set([
          ...asset.materials.flatMap(({ material }) =>
            material.courseItems.map(({ id }) => id),
          ),
          ...asset.vocabularyEntries.flatMap(({ vocabularySet }) =>
            vocabularySet.courseItems.map(({ id }) => id),
          ),
        ]);
        let canAccessAssociatedItem = false;
        for (const courseItemId of courseItemIds) {
          try {
            await requireCourseItemAccess({ courseItemId, userId });
            canAccessAssociatedItem = true;
            break;
          } catch (error) {
            if (
              !(error instanceof TRPCError) ||
              error.code === "INTERNAL_SERVER_ERROR"
            ) {
              throw error;
            }
          }
        }
        if (!canAccessAssociatedItem) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
      }

      const downloadUrl = await getSignedUrl(
        r2,
        new GetObjectCommand({
          Bucket: r2Bucket,
          Key: asset.objectKey,
          ResponseContentDisposition: "attachment",
        }),
        { expiresIn: SIGNED_URL_TTL_SECONDS },
      );

      return { downloadUrl, expiresIn: SIGNED_URL_TTL_SECONDS };
    }),

  deleteDocument: protectedProcedure
    .input(z.object({ key: documentKeySchema }))
    .mutation(async ({ ctx, input }) => {
      assertOwnedKey(input.key, ctx.actorUserId);
      const asset = await db.asset.findUnique({
        where: { objectKey: input.key },
        select: {
          id: true,
          uploadedByUserId: true,
          deletedAt: true,
          _count: {
            select: {
              materials: true,
              vocabularyEntries: true,
            },
          },
        },
      });
      if (asset?.uploadedByUserId !== ctx.actorUserId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      if (asset._count.materials > 0 || asset._count.vocabularyEntries > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Asset is still referenced",
        });
      }
      if (asset.deletedAt) return { deleted: true };

      await r2.send(
        new DeleteObjectCommand({ Bucket: r2Bucket, Key: input.key }),
      );
      await db.asset.update({
        where: { id: asset.id },
        data: { deletedAt: new Date() },
      });
      return { deleted: true };
    }),
});
