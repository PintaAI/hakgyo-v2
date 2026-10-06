import { randomUUID } from "node:crypto";

import { collectPdfPageRanges } from "@hakgyo/shared";
import { TRPCError } from "@trpc/server";

import { Prisma } from "../../../generated/prisma/client";
import { collectMaterialReferenceIds } from "~/lib/blocknote/resource-references";
import {
  createCourseThumbnailKey,
  getCourseThumbnailPath,
  getManagedCourseThumbnailKey,
  parseCourseThumbnailKey,
} from "~/lib/course-thumbnail";
import { remapIds } from "~/lib/remap-ids";
import { chunk, createId, settleWithConcurrency } from "~/server/batch";
import { HAKGYO_SYSTEM_ORGANIZATION_ID } from "~/server/foundation/constants";
import { deleteR2Objects } from "~/server/r2";
import { copyObject } from "~/server/storage/objects";

type DatabaseClient = Prisma.DefaultPrismaClient;

/** Rows per `createMany`, keeping each statement under Postgres' parameter limit. */
const INSERT_BATCH_SIZE = 1000;
const COPY_CONCURRENCY = 12;
/**
 * Copies still pending after this are abandoned so the copy is cleaned up
 * before the route's 300 s limit, rather than leaving files no row points to.
 */
const COPY_DEADLINE_MS = 180_000;
const TRANSACTION_TIMEOUT_MS = 60_000;
/** Concurrent creates can take the same slug; the insert is retried with a new one. */
const SLUG_ATTEMPTS = 3;

async function insertInBatches<T>(
  rows: readonly T[],
  insert: (batch: T[]) => Promise<unknown>,
) {
  for (const batch of chunk(rows, INSERT_BATCH_SIZE)) await insert(batch);
}

/** Published courses of the Hakgyo system organization that anyone can copy. */
export async function listStarterCourses(db: DatabaseClient) {
  const courses = await db.course.findMany({
    where: {
      organizationId: HAKGYO_SYSTEM_ORGANIZATION_ID,
      status: "PUBLISHED",
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      title: true,
      description: true,
      thumbnailUrl: true,
      modules: {
        select: {
          _count: { select: { items: { where: { isPublished: true } } } },
        },
      },
    },
  });
  return courses.map(({ modules, ...course }) => ({
    ...course,
    moduleCount: modules.length,
    itemCount: modules.reduce((sum, { _count }) => sum + _count.items, 0),
  }));
}

/**
 * Copies a published Hakgyo system course into `organizationId` as a draft
 * the acting member owns: its modules, published items, and everything they
 * use (materials, tryouts and tasks, vocabulary sets, PDF books). Each file
 * is copied inside R2 so the new organization owns its own objects, and
 * lesson content is rewritten to point at the copies.
 */
export async function cloneStarterCourse(
  db: DatabaseClient,
  input: {
    sourceCourseId: string;
    organizationId: string;
    actorUserId: string;
    ownerMembershipId: string;
    /** Picks the new course's slug from its title. */
    createSlug: (title: string) => Promise<string>;
  },
) {
  const { organizationId, actorUserId, ownerMembershipId } = input;
  const source = await db.course.findFirst({
    where: {
      id: input.sourceCourseId,
      organizationId: HAKGYO_SYSTEM_ORGANIZATION_ID,
      status: "PUBLISHED",
    },
    include: {
      modules: {
        orderBy: { position: "asc" },
        include: {
          items: {
            where: { isPublished: true },
            orderBy: { position: "asc" },
          },
        },
      },
    },
  });
  if (!source) throw new TRPCError({ code: "NOT_FOUND" });

  const items = source.modules.flatMap((courseModule) => courseModule.items);
  const sourceOrganizationId = source.organizationId;
  const materialIds = new Set<string>();
  const assessmentIds = new Set<string>();
  const vocabularySetIds = new Set<string>();
  for (const item of items) {
    if (item.materialId) materialIds.add(item.materialId);
    if (item.assessmentId) assessmentIds.add(item.assessmentId);
    if (item.vocabularySetId) vocabularySetIds.add(item.vocabularySetId);
  }

  const materials = await db.material.findMany({
    where: {
      id: { in: [...materialIds] },
      organizationId: sourceOrganizationId,
    },
    include: {
      completionRequirements: { orderBy: { position: "asc" } },
      assets: { select: { assetId: true } },
    },
  });
  // Lessons also embed tryouts, vocabulary sets, and PDF pages, and can
  // require them, so those resources come along even when not placed.
  const bookIds = new Set<string>();
  for (const material of materials) {
    const references = collectMaterialReferenceIds(material.content);
    references.assessmentIds.forEach((id) => assessmentIds.add(id));
    references.vocabularySetIds.forEach((id) => vocabularySetIds.add(id));
    collectPdfPageRanges(material.content).forEach(({ bookId }) =>
      bookIds.add(bookId),
    );
    for (const requirement of material.completionRequirements) {
      if (requirement.assessmentId) assessmentIds.add(requirement.assessmentId);
      if (requirement.vocabularySetId) {
        vocabularySetIds.add(requirement.vocabularySetId);
      }
    }
  }

  const [assessments, vocabularySets, books] = await Promise.all([
    db.assessment.findMany({
      where: {
        id: { in: [...assessmentIds] },
        organizationId: sourceOrganizationId,
      },
      include: {
        questions: {
          orderBy: { position: "asc" },
          include: { options: { orderBy: { position: "asc" } } },
        },
        assets: { select: { assetId: true } },
      },
    }),
    db.vocabularySet.findMany({
      where: {
        id: { in: [...vocabularySetIds] },
        organizationId: sourceOrganizationId,
      },
      include: { entries: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] } },
    }),
    db.pdfBook.findMany({
      where: {
        id: { in: [...bookIds] },
        organizationId: sourceOrganizationId,
        status: "READY",
      },
      include: { pages: { orderBy: { pageNumber: "asc" } } },
    }),
  ]);

  // Every file the copied resources use. Page images belong to their book;
  // the rest are copied under the acting user like an ordinary upload.
  const pageAssets = new Map<string, { newBookId: string; bookId: string }>();
  const idMap = new Map<string, string>();
  for (const book of books) {
    const newBookId = createId();
    idMap.set(book.id, newBookId);
    for (const page of book.pages) {
      pageAssets.set(page.assetId, { newBookId, bookId: book.id });
      pageAssets.set(page.thumbnailAssetId, { newBookId, bookId: book.id });
    }
  }
  const assetIds = new Set<string>(pageAssets.keys());
  for (const material of materials) {
    material.assets.forEach(({ assetId }) => assetIds.add(assetId));
  }
  for (const assessment of assessments) {
    assessment.assets.forEach(({ assetId }) => assetIds.add(assetId));
  }
  for (const set of vocabularySets) {
    for (const entry of set.entries) {
      if (entry.audioAssetId) assetIds.add(entry.audioAssetId);
      if (entry.imageAssetId) assetIds.add(entry.imageAssetId);
    }
  }
  const assets = await db.asset.findMany({
    where: {
      id: { in: [...assetIds] },
      organizationId: sourceOrganizationId,
      confirmedAt: { not: null },
      deletedAt: null,
    },
  });

  const confirmedAt = new Date();
  const copies: { from: string; to: string }[] = [];
  const assetRows: Prisma.AssetCreateManyInput[] = assets.map((asset) => {
    const id = createId();
    idMap.set(asset.id, id);
    const page = pageAssets.get(asset.id);
    const extension =
      /\.[a-z0-9]{1,10}$/i.exec(asset.fileName)?.[0].toLowerCase() ?? "";
    const objectKey = page
      ? `pdf-books/${organizationId}/${page.newBookId}/${asset.objectKey.slice(asset.objectKey.lastIndexOf("/") + 1)}`
      : `documents/${encodeURIComponent(actorUserId)}/${randomUUID()}-${asset.size}${extension}`;
    copies.push({ from: asset.objectKey, to: objectKey });
    return {
      id,
      organizationId,
      uploadedByUserId: actorUserId,
      objectKey,
      fileName: asset.fileName,
      contentType: asset.contentType,
      size: asset.size,
      etag: asset.etag,
      confirmedAt,
    };
  });
  const remapped = (value: Prisma.JsonValue) =>
    remapIds(value, idMap) as Prisma.InputJsonValue;
  const remappedOptional = (value: Prisma.JsonValue | null) =>
    value === null ? Prisma.JsonNull : remapped(value);
  const copiedAsset = (assetId: string | null) =>
    assetId ? (idMap.get(assetId) ?? null) : null;

  for (const material of materials) idMap.set(material.id, createId());
  for (const assessment of assessments) idMap.set(assessment.id, createId());
  for (const set of vocabularySets) idMap.set(set.id, createId());

  const courseId = createId();
  let thumbnailUrl = source.thumbnailUrl;
  const thumbnailKey = getManagedCourseThumbnailKey(thumbnailUrl, source.id);
  if (thumbnailKey) {
    const parsed = parseCourseThumbnailKey(thumbnailKey, source.id)!;
    const key = createCourseThumbnailKey(
      courseId,
      parsed.size,
      parsed.contentType,
    );
    copies.push({ from: thumbnailKey, to: key });
    thumbnailUrl = getCourseThumbnailPath(
      courseId,
      parseCourseThumbnailKey(key, courseId)!.fileName,
    );
  }

  const deadline = Date.now() + COPY_DEADLINE_MS;
  const results = await settleWithConcurrency(
    copies,
    COPY_CONCURRENCY,
    async ({ from, to }) => {
      if (Date.now() > deadline) throw new Error("Copy deadline exceeded");
      await copyObject(from, to);
    },
  );
  const copiedKeys = copies
    .filter((_, index) => results[index]!.status === "fulfilled")
    .map(({ to }) => to);
  const failed = results.find((result) => result.status === "rejected");
  if (failed) {
    await deleteR2Objects(copiedKeys, "Failed to remove copied R2 object");
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Berkas kurikulum belum berhasil disalin.",
      cause: failed.reason,
    });
  }

  const owned = { organizationId, createdByMembershipId: ownerMembershipId };
  const write = (slug: string) =>
    db.$transaction(
      async (tx) => {
        // First, so a slug conflict fails before the bulk inserts.
        const course = await tx.course.create({
          data: {
            id: courseId,
            organizationId,
            ownerMembershipId,
            title: source.title,
            slug,
            description: source.description,
            thumbnailUrl,
            progressionMode: source.progressionMode,
          },
          select: { id: true, title: true, slug: true, thumbnailUrl: true },
        });
        await insertInBatches(assetRows, (data) =>
          tx.asset.createMany({ data }),
        );

        await tx.pdfBook.createMany({
          data: books.map((book) => ({
            id: idMap.get(book.id)!,
            ...owned,
            title: book.title,
            fileName: book.fileName,
            pageCount: book.pageCount,
            pageOffset: book.pageOffset,
            status: "READY" as const,
          })),
        });
        await insertInBatches(
          books.flatMap((book) =>
            book.pages.flatMap((page) => {
              const assetId = copiedAsset(page.assetId);
              const thumbnailAssetId = copiedAsset(page.thumbnailAssetId);
              return assetId && thumbnailAssetId
                ? [
                    {
                      bookId: idMap.get(book.id)!,
                      organizationId,
                      pageNumber: page.pageNumber,
                      assetId,
                      thumbnailAssetId,
                      width: page.width,
                      height: page.height,
                      text: page.text,
                    },
                  ]
                : [];
            }),
          ),
          (data) => tx.pdfBookPage.createMany({ data }),
        );

        await tx.vocabularySet.createMany({
          data: vocabularySets.map((set) => ({
            id: idMap.get(set.id)!,
            ...owned,
            title: set.title,
            description: set.description,
          })),
        });
        await insertInBatches(
          vocabularySets.flatMap((set) =>
            set.entries.map((entry) => ({
              vocabularySetId: idMap.get(set.id)!,
              organizationId,
              term: entry.term,
              // Entries are listed by creation time; one batch would share a timestamp.
              createdAt: entry.createdAt,
              definition: entry.definition,
              examples: remapped(entry.examples),
              audioAssetId: copiedAsset(entry.audioAssetId),
              imageAssetId: copiedAsset(entry.imageAssetId),
              metadata: remappedOptional(entry.metadata),
            })),
          ),
          (data) => tx.vocabularyEntry.createMany({ data }),
        );

        await tx.assessment.createMany({
          data: assessments.map((assessment) => ({
            id: idMap.get(assessment.id)!,
            ...owned,
            title: assessment.title,
            description: assessment.description,
            editorSchemaVersion: assessment.editorSchemaVersion,
            instructions: remappedOptional(assessment.instructions),
            passingScore: assessment.passingScore,
            maxAttempts: assessment.maxAttempts,
            timeLimitMinutes: assessment.timeLimitMinutes,
            shuffleQuestions: assessment.shuffleQuestions,
            shuffleOptions: assessment.shuffleOptions,
          })),
        });
        const questionRows = assessments.flatMap((assessment) =>
          assessment.questions.map((question) => ({
            question,
            id: createId(),
            assessmentId: idMap.get(assessment.id)!,
          })),
        );
        await insertInBatches(questionRows, (batch) =>
          tx.assessmentQuestion.createMany({
            data: batch.map(({ question, id, assessmentId }) => ({
              id,
              assessmentId,
              type: question.type,
              prompt: remapped(question.prompt),
              explanation: remappedOptional(question.explanation),
              points: question.points,
              position: question.position,
            })),
          }),
        );
        await insertInBatches(
          questionRows.flatMap(({ question, id }) =>
            question.options.map((option) => ({
              questionId: id,
              content: remapped(option.content),
              isCorrect: option.isCorrect,
              position: option.position,
            })),
          ),
          (data) => tx.assessmentOption.createMany({ data }),
        );
        await insertInBatches(
          assessments.flatMap((assessment) =>
            assessment.assets.flatMap(({ assetId }) => {
              const copied = copiedAsset(assetId);
              return copied
                ? [
                    {
                      assessmentId: idMap.get(assessment.id)!,
                      assetId: copied,
                      organizationId,
                    },
                  ]
                : [];
            }),
          ),
          (data) => tx.assessmentAsset.createMany({ data }),
        );

        await tx.material.createMany({
          data: materials.map((material) => ({
            id: idMap.get(material.id)!,
            ...owned,
            title: material.title,
            description: material.description,
            content: remapped(material.content),
            editorSchemaVersion: material.editorSchemaVersion,
            requirementPolicy: material.requirementPolicy,
          })),
        });
        await insertInBatches(
          materials.flatMap((material) =>
            material.completionRequirements.flatMap((requirement) => {
              const assessmentId = requirement.assessmentId
                ? idMap.get(requirement.assessmentId)
                : null;
              const vocabularySetId = requirement.vocabularySetId
                ? idMap.get(requirement.vocabularySetId)
                : null;
              if (!assessmentId && !vocabularySetId) return [];
              return [
                {
                  materialId: idMap.get(material.id)!,
                  organizationId,
                  type: requirement.type,
                  assessmentId,
                  vocabularySetId,
                  minimumScore: requirement.minimumScore,
                  position: requirement.position,
                },
              ];
            }),
          ),
          (data) => tx.materialRequirement.createMany({ data }),
        );
        await insertInBatches(
          materials.flatMap((material) =>
            material.assets.flatMap(({ assetId }) => {
              const copied = copiedAsset(assetId);
              return copied
                ? [
                    {
                      materialId: idMap.get(material.id)!,
                      assetId: copied,
                      organizationId,
                    },
                  ]
                : [];
            }),
          ),
          (data) => tx.materialAsset.createMany({ data }),
        );

        const moduleIds = new Map(
          source.modules.map((courseModule) => [courseModule.id, createId()]),
        );
        await tx.courseModule.createMany({
          data: source.modules.map((courseModule) => ({
            id: moduleIds.get(courseModule.id)!,
            courseId,
            organizationId,
            title: courseModule.title,
            description: courseModule.description,
            position: courseModule.position,
          })),
        });
        await insertInBatches(
          source.modules.flatMap((courseModule) =>
            courseModule.items.map((item) => ({
              moduleId: moduleIds.get(courseModule.id)!,
              organizationId,
              type: item.type,
              position: item.position,
              materialId: item.materialId
                ? (idMap.get(item.materialId) ?? null)
                : null,
              assessmentId: item.assessmentId
                ? (idMap.get(item.assessmentId) ?? null)
                : null,
              vocabularySetId: item.vocabularySetId
                ? (idMap.get(item.vocabularySetId) ?? null)
                : null,
              isPublished: true,
            })),
          ),
          (data) => tx.courseItem.createMany({ data }),
        );
        return course;
      },
      { maxWait: 10_000, timeout: TRANSACTION_TIMEOUT_MS },
    );

  try {
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await write(await input.createSlug(source.title));
      } catch (error) {
        const slugTaken =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002";
        if (!slugTaken || attempt === SLUG_ATTEMPTS) throw error;
      }
    }
  } catch (error) {
    await deleteR2Objects(
      copies.map(({ to }) => to),
      "Failed to remove copied R2 object",
    );
    throw error;
  }
}
