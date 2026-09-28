import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  createCourseThumbnailKey,
  courseThumbnailContentTypes,
  getCourseThumbnailPath,
  MAX_COURSE_THUMBNAIL_SIZE,
  parseCourseThumbnailKey,
} from "~/lib/course-thumbnail";
import {
  createOrganizationLandingImageKey,
  getOrganizationLandingImagePath,
  MAX_ORGANIZATION_LANDING_IMAGE_SIZE,
  organizationLandingImageContentTypes,
  organizationLandingImagePurposes,
  parseOrganizationLandingImageKey,
} from "~/lib/organization-landing-image";
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
  requireCoursePermission,
  requireCourseItemAccess,
  requireOrganizationPermission,
} from "~/server/authorization";
import { db } from "~/server/db";
import {
  addLandingImage,
  removeLandingImage,
  requireLandingOwner,
} from "~/server/organization-landing/service";
import {
  createUploadUrl,
  deleteObject,
  headUploadedObject,
  removeObject,
  SIGNED_URL_TTL_SECONDS,
  signDownloadUrl,
  validateImageObject,
} from "~/server/storage/objects";

const MAX_DOCUMENT_SIZE = 100 * 1024 * 1024;

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

const requireCourseManager = (courseId: string, userId: string) =>
  requireCoursePermission({ courseId, permission: "course.manage", userId });

const requireOrganizationManager = (organizationId: string, userId: string) =>
  requireOrganizationPermission({
    organizationId,
    permission: "organization.manage",
    userId,
  });

async function getProfileImageKey(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { image: true },
  });
  return getManagedProfileImageKey(user?.image, userId);
}

async function getOrganizationLogoKey(organizationId: string) {
  const organization = await db.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { logoUrl: true },
  });
  return getManagedOrganizationLogoKey(organization.logoUrl, organizationId);
}

/**
 * Soft-deletes one of the user's own uploaded documents, refusing while any
 * material, assessment, vocabulary entry or PDF book still references it.
 */
async function deleteOwnAsset(
  where: { id: string } | { objectKey: string },
  userId: string,
) {
  const asset = await db.asset.findUnique({
    where,
    select: {
      id: true,
      objectKey: true,
      uploadedByUserId: true,
      deletedAt: true,
      pdfBookPage: { select: { bookId: true } },
      pdfBookThumbnail: { select: { bookId: true } },
      _count: {
        select: {
          materials: true,
          assessments: true,
          vocabularyEntries: true,
        },
      },
    },
  });
  if (asset?.uploadedByUserId !== userId) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }
  if (
    asset.pdfBookPage ||
    asset.pdfBookThumbnail ||
    asset._count.materials > 0 ||
    asset._count.assessments > 0 ||
    asset._count.vocabularyEntries > 0
  ) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Asset is still referenced",
    });
  }
  if (asset.deletedAt) return { deleted: true };

  await deleteObject(asset.objectKey);
  await db.asset.update({
    where: { id: asset.id },
    data: { deletedAt: new Date() },
  });
  return { deleted: true };
}

const downloadDispositionSchema = z
  .enum(["attachment", "inline"])
  .default("attachment");
const MAX_DOWNLOAD_URL_BATCH = 100;

type DownloadableAsset = {
  id: string;
  objectKey: string;
  fileName: string;
  contentType: string;
  size: number;
};

/**
 * Returns the confirmed, non-deleted assets from `assetIds` that the user may
 * download: their own uploads, anything in an organization they own or
 * administer, PDF book pages for any staff member, and otherwise files linked
 * to a course item the user can open.
 */
async function findDownloadableAssets(
  assetIds: readonly string[],
  userId: string,
): Promise<DownloadableAsset[]> {
  const assets = await db.asset.findMany({
    where: {
      id: { in: [...assetIds] },
      confirmedAt: { not: null },
      deletedAt: null,
    },
    select: {
      id: true,
      objectKey: true,
      fileName: true,
      contentType: true,
      size: true,
      uploadedByUserId: true,
      organization: {
        select: {
          members: {
            where: { userId },
            select: { role: true },
            take: 1,
          },
        },
      },
      pdfBookPage: { select: { bookId: true } },
      pdfBookThumbnail: { select: { bookId: true } },
    },
  });

  const allowed: DownloadableAsset[] = [];
  const needsCourseItem = new Map<string, DownloadableAsset>();
  for (const {
    organization,
    pdfBookPage,
    pdfBookThumbnail,
    uploadedByUserId,
    ...asset
  } of assets) {
    const memberRole = organization.members[0]?.role;
    // Any staff member may browse PDF book pages while authoring lessons.
    const isPdfBookImage = Boolean(pdfBookPage ?? pdfBookThumbnail);
    const hasDirectAccess =
      uploadedByUserId === userId ||
      memberRole === "OWNER" ||
      memberRole === "ADMIN" ||
      (isPdfBookImage && memberRole !== undefined);
    if (hasDirectAccess) allowed.push(asset);
    else needsCourseItem.set(asset.id, asset);
  }
  if (!needsCourseItem.size) return allowed;

  const courseItems = { select: { id: true, isPublished: true } } as const;
  const links = await db.asset.findMany({
    where: { id: { in: [...needsCourseItem.keys()] } },
    select: {
      id: true,
      materials: { select: { material: { select: { courseItems } } } },
      assessments: { select: { assessment: { select: { courseItems } } } },
      vocabularyEntries: {
        select: { vocabularySet: { select: { courseItems } } },
      },
      vocabularyEntryImages: {
        select: { vocabularySet: { select: { courseItems } } },
      },
    },
  });

  // Each course item is checked at most once per call, and each asset stops
  // at the first item that grants access. Published items come first because
  // learners can only ever open those.
  const itemAccess = new Map<string, Promise<boolean>>();
  const canAccessItem = (courseItemId: string) => {
    let access = itemAccess.get(courseItemId);
    if (!access) {
      access = requireCourseItemAccess({ courseItemId, userId }).then(
        () => true,
        (error: unknown) => {
          if (
            !(error instanceof TRPCError) ||
            error.code === "INTERNAL_SERVER_ERROR"
          ) {
            throw error;
          }
          return false;
        },
      );
      itemAccess.set(courseItemId, access);
    }
    return access;
  };
  for (const link of links) {
    const items = new Map<string, boolean>();
    for (const { id, isPublished } of [
      ...link.materials.flatMap(({ material }) => material.courseItems),
      ...link.assessments.flatMap(({ assessment }) => assessment.courseItems),
      ...link.vocabularyEntries.flatMap(
        ({ vocabularySet }) => vocabularySet.courseItems,
      ),
      ...link.vocabularyEntryImages.flatMap(
        ({ vocabularySet }) => vocabularySet.courseItems,
      ),
    ]) {
      items.set(id, isPublished);
    }
    const ordered = [...items]
      .sort(([, a], [, b]) => Number(b) - Number(a))
      .map(([id]) => id);
    // Prefer items another asset in this batch already unlocked.
    const cached = ordered.filter((id) => itemAccess.has(id));
    for (const courseItemId of [
      ...cached,
      ...ordered.filter((id) => !itemAccess.has(id)),
    ]) {
      if (await canAccessItem(courseItemId)) {
        allowed.push(needsCourseItem.get(link.id)!);
        break;
      }
    }
  }
  return allowed;
}

async function signDownload(
  asset: DownloadableAsset,
  disposition: "attachment" | "inline",
) {
  return {
    downloadUrl: await signDownloadUrl(asset.objectKey, disposition),
    expiresIn: SIGNED_URL_TTL_SECONDS,
    fileName: asset.fileName,
    contentType: asset.contentType,
    size: asset.size,
  };
}

export const storageRouter = createTRPCRouter({
  createCourseThumbnailUploadUrl: protectedProcedure
    .input(
      z.object({
        courseId: z.string().min(1),
        contentType: z.enum(courseThumbnailContentTypes),
        fileSize: z.number().int().positive().max(MAX_COURSE_THUMBNAIL_SIZE),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const course = await requireCourseManager(
        input.courseId,
        ctx.actorUserId,
      );
      const key = createCourseThumbnailKey(
        input.courseId,
        input.fileSize,
        input.contentType,
      );
      return {
        courseId: course.id,
        ...(await createUploadUrl(key, input.contentType)),
      };
    }),

  confirmCourseThumbnailUpload: protectedProcedure
    .input(z.object({ courseId: z.string().min(1), key: documentKeySchema }))
    .mutation(async ({ ctx, input }) => {
      await requireCourseManager(input.courseId, ctx.actorUserId);
      const parsed = parseCourseThumbnailKey(input.key, input.courseId);
      if (!parsed) throw new TRPCError({ code: "BAD_REQUEST" });
      await validateImageObject(input.key, parsed, "thumbnail");
      return {
        key: input.key,
        thumbnailUrl: getCourseThumbnailPath(input.courseId, parsed.fileName),
      };
    }),

  deleteCourseThumbnail: protectedProcedure
    .input(z.object({ courseId: z.string().min(1), key: documentKeySchema }))
    .mutation(async ({ ctx, input }) => {
      await requireCourseManager(input.courseId, ctx.actorUserId);
      if (!parseCourseThumbnailKey(input.key, input.courseId)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await deleteObject(input.key);
      return { deleted: true };
    }),

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
      return createUploadUrl(key, input.contentType, { immutable: true });
    }),

  confirmProfileImageUpload: protectedProcedure
    .input(z.object({ key: documentKeySchema }))
    .mutation(async ({ ctx, input }) => {
      const parsed = parseProfileImageKey(input.key, ctx.actorUserId);
      if (!parsed) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid image key",
        });
      }
      await validateImageObject(input.key, parsed, "image");

      const oldKey = await getProfileImageKey(ctx.actorUserId);
      const image = getProfileImagePath(ctx.actorUserId, parsed.fileName);
      await db.user.update({
        where: { id: ctx.actorUserId },
        data: { image },
      });
      if (oldKey && oldKey !== input.key) {
        await removeObject(oldKey, "replaced profile image");
      }
      return { image };
    }),

  discardProfileImageUpload: protectedProcedure
    .input(z.object({ key: documentKeySchema }))
    .mutation(async ({ ctx, input }) => {
      if (!parseProfileImageKey(input.key, ctx.actorUserId)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      if ((await getProfileImageKey(ctx.actorUserId)) === input.key) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "The image is currently in use",
        });
      }
      await deleteObject(input.key);
      return { deleted: true };
    }),

  deleteProfileImage: protectedProcedure.mutation(async ({ ctx }) => {
    const key = await getProfileImageKey(ctx.actorUserId);
    await db.user.update({
      where: { id: ctx.actorUserId },
      data: { image: null },
    });
    if (key) await removeObject(key, "profile image");
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
      await requireOrganizationManager(input.organizationId, ctx.actorUserId);
      const key = createOrganizationLogoKey(
        input.organizationId,
        input.fileSize,
        input.contentType,
      );
      return createUploadUrl(key, input.contentType, { immutable: true });
    }),

  confirmOrganizationLogoUpload: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().min(1),
        key: documentKeySchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireOrganizationManager(input.organizationId, ctx.actorUserId);
      const parsed = parseOrganizationLogoKey(input.key, input.organizationId);
      if (!parsed) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid logo key",
        });
      }
      await validateImageObject(input.key, parsed, "organization logo");

      const oldKey = await getOrganizationLogoKey(input.organizationId);
      const logoUrl = getOrganizationLogoPath(
        input.organizationId,
        parsed.fileName,
      );
      await db.organization.update({
        where: { id: input.organizationId },
        data: { logoUrl },
      });
      if (oldKey && oldKey !== input.key) {
        await removeObject(oldKey, "replaced organization logo");
      }
      return { logoUrl };
    }),

  discardOrganizationLogoUpload: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().min(1),
        key: documentKeySchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireOrganizationManager(input.organizationId, ctx.actorUserId);
      if (!parseOrganizationLogoKey(input.key, input.organizationId)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      if ((await getOrganizationLogoKey(input.organizationId)) === input.key) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "The logo is currently in use",
        });
      }
      await deleteObject(input.key);
      return { deleted: true };
    }),

  deleteOrganizationLogo: protectedProcedure
    .input(z.object({ organizationId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await requireOrganizationManager(input.organizationId, ctx.actorUserId);
      const key = await getOrganizationLogoKey(input.organizationId);
      await db.organization.update({
        where: { id: input.organizationId },
        data: { logoUrl: null },
      });
      if (key) await removeObject(key, "organization logo");
      return { deleted: true };
    }),

  createOrganizationLandingImageUploadUrl: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().min(1),
        purpose: z.enum(organizationLandingImagePurposes),
        contentType: z.enum(organizationLandingImageContentTypes),
        fileSize: z
          .number()
          .int()
          .positive()
          .max(MAX_ORGANIZATION_LANDING_IMAGE_SIZE),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireLandingOwner({
        db: ctx.db,
        organizationId: input.organizationId,
        actorUserId: ctx.actorUserId,
      });
      const key = createOrganizationLandingImageKey(
        input.organizationId,
        input.purpose,
        input.fileSize,
        input.contentType,
      );
      return createUploadUrl(key, input.contentType, { immutable: true });
    }),

  confirmOrganizationLandingImageUpload: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().min(1),
        purpose: z.enum(organizationLandingImagePurposes),
        key: documentKeySchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireLandingOwner({
        db: ctx.db,
        organizationId: input.organizationId,
        actorUserId: ctx.actorUserId,
      });
      const parsed = parseOrganizationLandingImageKey(
        input.key,
        input.organizationId,
        input.purpose,
      );
      if (!parsed) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid landing image key",
        });
      }
      await validateImageObject(input.key, parsed, "landing page image");
      const imageUrl = getOrganizationLandingImagePath(
        input.organizationId,
        parsed.purpose,
        parsed.fileName,
      );
      await addLandingImage({
        db: ctx.db,
        organizationId: input.organizationId,
        actorUserId: ctx.actorUserId,
        imageUrl,
      });
      return { key: input.key, imageUrl };
    }),

  discardOrganizationLandingImageUpload: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().min(1),
        key: documentKeySchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireLandingOwner({
        db: ctx.db,
        organizationId: input.organizationId,
        actorUserId: ctx.actorUserId,
      });
      const parsed = parseOrganizationLandingImageKey(
        input.key,
        input.organizationId,
      );
      if (!parsed) throw new TRPCError({ code: "FORBIDDEN" });
      const imageUrl = getOrganizationLandingImagePath(
        input.organizationId,
        parsed.purpose,
        parsed.fileName,
      );
      await removeLandingImage({
        db: ctx.db,
        organizationId: input.organizationId,
        actorUserId: ctx.actorUserId,
        imageUrl,
      });
      await deleteObject(input.key);
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
      const key = `${getUserPrefix(userId)}${crypto.randomUUID()}-${input.fileSize}${extension}`;
      const upload = await createUploadUrl(key, input.contentType);
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

      return { assetId: asset.id, ...upload };
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

      const object = await headUploadedObject(input.key, "document");
      if (
        object.ContentLength !== expectedSize ||
        object.ContentLength > MAX_DOCUMENT_SIZE
      ) {
        await deleteObject(input.key);
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
    .input(
      z.object({
        assetId: z.string().min(1),
        disposition: downloadDispositionSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [asset] = await findDownloadableAssets(
        [input.assetId],
        ctx.actorUserId,
      );
      if (!asset) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return signDownload(asset, input.disposition);
    }),

  /**
   * Batched `createDownloadUrl` for documents that show many files. Assets
   * the user may not download (or that don't exist) map to `null`.
   */
  createDownloadUrls: protectedProcedure
    .input(
      z.object({
        assetIds: z.array(z.string().min(1)).min(1).max(MAX_DOWNLOAD_URL_BATCH),
        disposition: downloadDispositionSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const assetIds = [...new Set(input.assetIds)];
      const assets = new Map(
        (await findDownloadableAssets(assetIds, ctx.actorUserId)).map(
          (asset) => [asset.id, asset],
        ),
      );
      return Object.fromEntries(
        await Promise.all(
          assetIds.map(async (assetId) => {
            const asset = assets.get(assetId);
            return [
              assetId,
              asset ? await signDownload(asset, input.disposition) : null,
            ] as const;
          }),
        ),
      );
    }),

  deleteDocument: protectedProcedure
    .input(z.object({ key: documentKeySchema }))
    .mutation(async ({ ctx, input }) => {
      assertOwnedKey(input.key, ctx.actorUserId);
      return deleteOwnAsset({ objectKey: input.key }, ctx.actorUserId);
    }),

  deleteAsset: protectedProcedure
    .input(z.object({ assetId: z.string().min(1) }))
    .mutation(({ ctx, input }) =>
      deleteOwnAsset({ id: input.assetId }, ctx.actorUserId),
    ),
});
