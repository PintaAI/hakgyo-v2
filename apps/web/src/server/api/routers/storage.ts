import {
  createCourseThumbnailKey,
  courseThumbnailContentTypes,
  getCourseThumbnailPath,
  MAX_COURSE_THUMBNAIL_SIZE,
  parseCourseThumbnailKey,
} from "~/lib/course-thumbnail";
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
import { hasImageSignature } from "~/lib/image-signature";
import {
  createOrganizationLandingImageKey,
  getOrganizationLandingImagePath,
  MAX_ORGANIZATION_LANDING_IMAGE_SIZE,
  organizationLandingImageContentTypes,
  organizationLandingImagePurposes,
  parseOrganizationLandingImageKey,
} from "~/lib/organization-landing-image";
import { organizationLandingConfigSchema } from "~/lib/organization-landing";
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
import { requireLandingOwner } from "~/server/organization-landing/service";
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

async function removeObject(key: string) {
  try {
    await r2.send(new DeleteObjectCommand({ Bucket: r2Bucket, Key: key }));
  } catch (error) {
    console.error("Failed to remove rejected upload", error);
  }
}

async function validateImageObject(
  key: string,
  expectedSize: number,
  expectedContentType: string,
  label: string,
) {
  let object;
  try {
    object = await r2.send(
      new HeadObjectCommand({ Bucket: r2Bucket, Key: key }),
    );
  } catch (cause) {
    const status = (cause as { $metadata?: { httpStatusCode?: number } })
      .$metadata?.httpStatusCode;
    throw new TRPCError({
      code: status === 404 ? "NOT_FOUND" : "INTERNAL_SERVER_ERROR",
      message: status === 404 ? `Uploaded ${label} was not found` : undefined,
      cause,
    });
  }

  if (
    object.ContentLength !== expectedSize ||
    object.ContentType !== expectedContentType
  ) {
    await removeObject(key);
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Uploaded ${label} does not match the signed request`,
    });
  }

  let headerBytes: Uint8Array;
  try {
    const headerObject = await r2.send(
      new GetObjectCommand({
        Bucket: r2Bucket,
        Key: key,
        Range: "bytes=0-15",
      }),
    );
    if (!headerObject.Body) throw new Error(`Uploaded ${label} has no body`);
    headerBytes = await headerObject.Body.transformToByteArray();
  } catch (cause) {
    await removeObject(key);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Uploaded ${label} could not be validated`,
      cause,
    });
  }

  if (!hasImageSignature(headerBytes, expectedContentType)) {
    await removeObject(key);
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Uploaded file is not a valid ${label}`,
    });
  }
}

function landingConfigReferencesImage(value: unknown, imageUrl: string) {
  const parsed = organizationLandingConfigSchema.safeParse(value);
  return (
    parsed.success &&
    [parsed.data.heroImageUrl, parsed.data.socialImageUrl].includes(imageUrl)
  );
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
  const downloadUrl = await getSignedUrl(
    r2,
    new GetObjectCommand({
      Bucket: r2Bucket,
      Key: asset.objectKey,
      ResponseContentDisposition: disposition,
    }),
    { expiresIn: SIGNED_URL_TTL_SECONDS },
  );
  return {
    downloadUrl,
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
      const course = await requireCoursePermission({
        courseId: input.courseId,
        permission: "course.manage",
        userId: ctx.actorUserId,
      });
      const key = createCourseThumbnailKey(
        input.courseId,
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
        courseId: course.id,
        key,
        uploadUrl,
        expiresIn: SIGNED_URL_TTL_SECONDS,
        headers: { "Content-Type": input.contentType },
      };
    }),

  confirmCourseThumbnailUpload: protectedProcedure
    .input(z.object({ courseId: z.string().min(1), key: documentKeySchema }))
    .mutation(async ({ ctx, input }) => {
      await requireCoursePermission({
        courseId: input.courseId,
        permission: "course.manage",
        userId: ctx.actorUserId,
      });
      const parsed = parseCourseThumbnailKey(input.key, input.courseId);
      if (!parsed) throw new TRPCError({ code: "BAD_REQUEST" });
      let object;
      try {
        object = await r2.send(
          new HeadObjectCommand({ Bucket: r2Bucket, Key: input.key }),
        );
      } catch (cause) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Uploaded thumbnail was not found",
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
          message: "Uploaded thumbnail does not match the signed request",
        });
      }
      return {
        key: input.key,
        thumbnailUrl: getCourseThumbnailPath(input.courseId, parsed.fileName),
      };
    }),

  deleteCourseThumbnail: protectedProcedure
    .input(z.object({ courseId: z.string().min(1), key: documentKeySchema }))
    .mutation(async ({ ctx, input }) => {
      await requireCoursePermission({
        courseId: input.courseId,
        permission: "course.manage",
        userId: ctx.actorUserId,
      });
      if (!parseCourseThumbnailKey(input.key, input.courseId)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await r2.send(
        new DeleteObjectCommand({ Bucket: r2Bucket, Key: input.key }),
      );
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
      const uploadUrl = await getSignedUrl(
        r2,
        new PutObjectCommand({
          Bucket: r2Bucket,
          Key: key,
          ContentType: input.contentType,
          CacheControl: "public, max-age=31536000, immutable",
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
          CacheControl: "public, max-age=31536000, immutable",
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

      await validateImageObject(
        input.key,
        parsed.size,
        parsed.contentType,
        "organization logo",
      );

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
      const uploadUrl = await getSignedUrl(
        r2,
        new PutObjectCommand({
          Bucket: r2Bucket,
          Key: key,
          ContentType: input.contentType,
          CacheControl: "public, max-age=31536000, immutable",
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
      await validateImageObject(
        input.key,
        parsed.size,
        parsed.contentType,
        "landing page image",
      );
      return {
        key: input.key,
        imageUrl: getOrganizationLandingImagePath(
          input.organizationId,
          parsed.purpose,
          parsed.fileName,
        ),
      };
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
      const landing = await ctx.db.organizationLandingPage.findUnique({
        where: { organizationId: input.organizationId },
        select: { draft: true, published: true },
      });
      if (
        landingConfigReferencesImage(landing?.draft, imageUrl) ||
        landingConfigReferencesImage(landing?.published, imageUrl)
      ) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "The landing image is currently in use",
        });
      }
      await r2.send(
        new DeleteObjectCommand({ Bucket: r2Bucket, Key: input.key }),
      );
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
      const asset = await db.asset.findUnique({
        where: { objectKey: input.key },
        select: {
          id: true,
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
      if (asset?.uploadedByUserId !== ctx.actorUserId) {
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

      await r2.send(
        new DeleteObjectCommand({ Bucket: r2Bucket, Key: input.key }),
      );
      await db.asset.update({
        where: { id: asset.id },
        data: { deletedAt: new Date() },
      });
      return { deleted: true };
    }),

  deleteAsset: protectedProcedure
    .input(z.object({ assetId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const asset = await db.asset.findUnique({
        where: { id: input.assetId },
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
      if (asset?.uploadedByUserId !== ctx.actorUserId) {
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

      await r2.send(
        new DeleteObjectCommand({ Bucket: r2Bucket, Key: asset.objectKey }),
      );
      await db.asset.update({
        where: { id: asset.id },
        data: { deletedAt: new Date() },
      });
      return { deleted: true };
    }),
});
