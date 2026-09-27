import { TRPCError } from "@trpc/server";

import { Prisma } from "../../../generated/prisma/client";
import { collectMaterialReferenceIds } from "~/lib/blocknote/resource-references";
import {
  assessmentReferenceBlockType,
  vocabularyReferenceBlockType,
} from "~/lib/blocknote/block-catalog";
import {
  computeCourseReadiness,
  findBrokenVisibleItems,
  itemTitle,
  joinTitles,
  summarizeAssessmentReadiness,
  type ReadinessAssessment,
  type ReadinessItem,
  type ReadinessMaterial,
  type ReadinessSnapshot,
} from "~/server/course/readiness";

type DatabaseClient = Prisma.TransactionClient | Prisma.DefaultPrismaClient;

const readinessItemSelect = {
  id: true,
  moduleId: true,
  position: true,
  type: true,
  isPublished: true,
  materialId: true,
  assessmentId: true,
  vocabularySetId: true,
} satisfies Prisma.CourseItemSelect;

/**
 * Loads everything the readiness rules need for a course, optionally restricted to some
 * modules (dependencies never cross modules). Material documents are only transferred when they
 * mention a reference block; the text match is a cheap superset filter and
 * `collectMaterialReferenceIds` still does the exact extraction.
 */
export async function loadReadinessSnapshot(
  db: DatabaseClient,
  input: { courseId: string; moduleIds?: readonly string[] },
): Promise<ReadinessSnapshot> {
  const course = await db.course.findUnique({
    where: { id: input.courseId },
    select: {
      id: true,
      status: true,
      organization: { select: { slug: true } },
      modules: {
        where: input.moduleIds ? { id: { in: [...input.moduleIds] } } : {},
        orderBy: { position: "asc" },
        select: {
          id: true,
          title: true,
          position: true,
          items: { orderBy: { position: "asc" }, select: readinessItemSelect },
        },
      },
    },
  });
  if (!course) throw new TRPCError({ code: "NOT_FOUND" });
  const items: ReadinessItem[] = course.modules.flatMap(
    (module) => module.items,
  );
  const materials = await loadReadinessMaterials(
    db,
    items.flatMap((item) => (item.materialId ? [item.materialId] : [])),
  );
  return completeSnapshot(db, {
    organizationSlug: course.organization.slug,
    courseId: course.id,
    courseStatus: course.status,
    modules: course.modules.map(({ id, title, position }) => ({
      id,
      title,
      position,
    })),
    items,
    materials,
  });
}

export async function loadReadinessMaterials(
  db: DatabaseClient,
  materialIds: readonly string[],
) {
  const ids = [...new Set(materialIds)];
  const materials = new Map<string, ReadinessMaterial>();
  if (ids.length === 0) return materials;
  const [rows, contents] = await Promise.all([
    db.material.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        title: true,
        completionRequirements: {
          orderBy: { position: "asc" },
          select: { type: true, assessmentId: true, vocabularySetId: true },
        },
      },
    }),
    db.$queryRaw<Array<{ id: string; content: Prisma.JsonValue }>>(Prisma.sql`
      SELECT m."id", m."content"
      FROM "Material" m
      WHERE m."id" IN (${Prisma.join(ids)})
        AND (
          strpos(m."content"::text, ${`"${assessmentReferenceBlockType}"`}) > 0
          OR strpos(m."content"::text, ${`"${vocabularyReferenceBlockType}"`}) > 0
        )
    `),
  ]);
  const embedsById = new Map(
    contents.map(({ id, content }) => [
      id,
      collectMaterialReferenceIds(content),
    ]),
  );
  for (const row of rows) {
    materials.set(row.id, {
      id: row.id,
      title: row.title,
      requirements: row.completionRequirements,
      embeds: embedsById.get(row.id) ?? {
        assessmentIds: [],
        vocabularySetIds: [],
      },
    });
  }
  return materials;
}

export async function loadReadinessAssessments(
  db: DatabaseClient,
  assessmentIds: readonly string[],
) {
  const ids = [...new Set(assessmentIds)];
  const result = new Map<string, ReadinessAssessment>();
  if (ids.length === 0) return result;
  const assessments = await db.assessment.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      title: true,
      questions: {
        orderBy: { position: "asc" },
        select: {
          type: true,
          prompt: true,
          options: {
            orderBy: { position: "asc" },
            select: { content: true, isCorrect: true },
          },
        },
      },
    },
  });
  for (const { questions, ...assessment } of assessments) {
    result.set(
      assessment.id,
      summarizeAssessmentReadiness(assessment, questions),
    );
  }
  return result;
}

/** Loads the assessments and vocabulary sets referenced by the items and materials. */
async function completeSnapshot(
  db: DatabaseClient,
  base: Omit<ReadinessSnapshot, "assessments" | "vocabularySets">,
): Promise<ReadinessSnapshot> {
  const assessmentIds = new Set<string>();
  const vocabularySetIds = new Set<string>();
  for (const item of base.items) {
    if (item.assessmentId) assessmentIds.add(item.assessmentId);
    if (item.vocabularySetId) vocabularySetIds.add(item.vocabularySetId);
  }
  for (const material of base.materials.values()) {
    for (const requirement of material.requirements) {
      if (requirement.assessmentId) assessmentIds.add(requirement.assessmentId);
      if (requirement.vocabularySetId)
        vocabularySetIds.add(requirement.vocabularySetId);
    }
    material.embeds.assessmentIds.forEach((id) => assessmentIds.add(id));
    material.embeds.vocabularySetIds.forEach((id) => vocabularySetIds.add(id));
  }
  const [assessments, vocabularySets] = await Promise.all([
    loadReadinessAssessments(db, [...assessmentIds]),
    vocabularySetIds.size
      ? db.vocabularySet.findMany({
          where: { id: { in: [...vocabularySetIds] } },
          select: { id: true, title: true },
        })
      : [],
  ]);
  return {
    ...base,
    assessments,
    vocabularySets: new Map(vocabularySets.map((set) => [set.id, set])),
  };
}

/** Full-course readiness for the curriculum UI. */
export async function getCourseReadiness(db: DatabaseClient, courseId: string) {
  return computeCourseReadiness(await loadReadinessSnapshot(db, { courseId }));
}

function reasonsText(reasons: Array<{ message: string }>) {
  return reasons.map((reason) => reason.message).join(" ");
}

export type SnapshotChange = (snapshot: ReadinessSnapshot) => ReadinessSnapshot;

/**
 * Applies `change` to the module snapshot and rejects it when
 * - an item in `mustBeReady` (being made visible) is not ready afterwards, or
 * - a visible lesson that is ready now would stop being ready (a dependency hidden, removed or
 *   broken).
 *
 * `blockedMessage(titles)` phrases the second error, naming the dependent lessons.
 */
export async function assertReadinessChange(
  db: DatabaseClient,
  input: {
    courseId: string;
    moduleIds: readonly string[];
    change: SnapshotChange;
    mustBeReady?: readonly string[];
    blockedMessage: (titles: string, details: string) => string;
  },
) {
  const snapshot = await loadReadinessSnapshot(db, {
    courseId: input.courseId,
    moduleIds: input.moduleIds,
  });
  let changed = input.change(snapshot);
  // A change may reference resources the snapshot has not loaded yet (a new placement or
  // requirement); fill them in before computing.
  changed = await fillMissingResources(db, changed);
  const before = computeCourseReadiness(snapshot);
  const after = computeCourseReadiness(changed);

  for (const itemId of input.mustBeReady ?? []) {
    const readiness = after.items.find((item) => item.courseItemId === itemId);
    if (readiness && !readiness.ready) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `${itemLabel(itemTitle(changed, itemId))} belum bisa ditampilkan. ${reasonsText(readiness.reasons)}`,
      });
    }
  }

  const mustBeReady = new Set(input.mustBeReady ?? []);
  const broken = findBrokenVisibleItems(before, after).filter(
    (item) => !mustBeReady.has(item.courseItemId),
  );
  if (broken.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: input.blockedMessage(
        joinTitles(broken.map((item) => itemTitle(changed, item.courseItemId))),
        reasonsText(broken.flatMap((item) => item.reasons)),
      ),
    });
  }
}

function itemLabel(title: string) {
  return title === "item" ? "Item" : `Item ${title}`;
}

async function fillMissingResources(
  db: DatabaseClient,
  snapshot: ReadinessSnapshot,
): Promise<ReadinessSnapshot> {
  const missingMaterials = snapshot.items.flatMap((item) =>
    item.materialId && !snapshot.materials.has(item.materialId)
      ? [item.materialId]
      : [],
  );
  const materials = missingMaterials.length
    ? new Map([
        ...snapshot.materials,
        ...(await loadReadinessMaterials(db, missingMaterials)),
      ])
    : snapshot.materials;
  const assessmentIds = new Set<string>();
  const vocabularySetIds = new Set<string>();
  for (const item of snapshot.items) {
    if (item.assessmentId && !snapshot.assessments.has(item.assessmentId))
      assessmentIds.add(item.assessmentId);
    if (
      item.vocabularySetId &&
      !snapshot.vocabularySets.has(item.vocabularySetId)
    )
      vocabularySetIds.add(item.vocabularySetId);
  }
  for (const material of materials.values()) {
    const ids = [
      ...material.requirements.map((requirement) => requirement.assessmentId),
      ...material.embeds.assessmentIds,
    ];
    for (const id of ids)
      if (id && !snapshot.assessments.has(id)) assessmentIds.add(id);
    const setIds = [
      ...material.requirements.map(
        (requirement) => requirement.vocabularySetId,
      ),
      ...material.embeds.vocabularySetIds,
    ];
    for (const id of setIds)
      if (id && !snapshot.vocabularySets.has(id)) vocabularySetIds.add(id);
  }
  if (
    materials === snapshot.materials &&
    assessmentIds.size === 0 &&
    vocabularySetIds.size === 0
  ) {
    return snapshot;
  }
  const [assessments, vocabularySets] = await Promise.all([
    loadReadinessAssessments(db, [...assessmentIds]),
    vocabularySetIds.size
      ? db.vocabularySet.findMany({
          where: { id: { in: [...vocabularySetIds] } },
          select: { id: true, title: true },
        })
      : [],
  ]);
  return {
    ...snapshot,
    materials,
    assessments: new Map([...snapshot.assessments, ...assessments]),
    vocabularySets: new Map([
      ...snapshot.vocabularySets,
      ...vocabularySets.map((set) => [set.id, set] as const),
    ]),
  };
}

/** Snapshot transforms used by the content routes. */
export const readinessChanges = {
  setPublished:
    (itemId: string, isPublished: boolean): SnapshotChange =>
    (snapshot) => ({
      ...snapshot,
      items: snapshot.items.map((item) =>
        item.id === itemId ? { ...item, isPublished } : item,
      ),
    }),
  removeItems:
    (itemIds: readonly string[]): SnapshotChange =>
    (snapshot) => ({
      ...snapshot,
      items: snapshot.items.filter((item) => !itemIds.includes(item.id)),
    }),
  replaceItem:
    (itemId: string, patch: Partial<ReadinessItem>): SnapshotChange =>
    (snapshot) => ({
      ...snapshot,
      items: snapshot.items.map((item) =>
        item.id === itemId ? { ...item, ...patch } : item,
      ),
    }),
  addItem:
    (item: ReadinessItem, material?: ReadinessMaterial): SnapshotChange =>
    (snapshot) => ({
      ...snapshot,
      items: [...snapshot.items, item],
      materials: material
        ? new Map([...snapshot.materials, [material.id, material]])
        : snapshot.materials,
    }),
  updateMaterial:
    (
      materialId: string,
      update: (material: ReadinessMaterial) => ReadinessMaterial,
    ): SnapshotChange =>
    (snapshot) => {
      const material = snapshot.materials.get(materialId);
      if (!material) return snapshot;
      return {
        ...snapshot,
        materials: new Map([
          ...snapshot.materials,
          [materialId, update(material)],
        ]),
      };
    },
};

/** Temporary id for an item that a create-as-visible mutation is about to insert. */
export const NEW_ITEM_ID = "__new_course_item__";

/**
 * Rejects removing (deleting or hiding) placements that visible lessons in their modules depend
 * on. Groups the placements by course so each course is checked once.
 */
export async function assertPlacementsRemovable(
  db: DatabaseClient,
  itemIds: readonly string[],
  mode: "delete" | "hide",
  subject = "Item ini",
) {
  if (itemIds.length === 0) return;
  const items = await db.courseItem.findMany({
    where: { id: { in: [...itemIds] } },
    select: {
      id: true,
      moduleId: true,
      module: { select: { courseId: true } },
    },
  });
  const byCourse = new Map<string, { moduleIds: Set<string>; ids: string[] }>();
  for (const item of items) {
    const entry = byCourse.get(item.module.courseId) ?? {
      moduleIds: new Set<string>(),
      ids: [],
    };
    entry.moduleIds.add(item.moduleId);
    entry.ids.push(item.id);
    byCourse.set(item.module.courseId, entry);
  }
  for (const [courseId, entry] of byCourse) {
    await assertReadinessChange(db, {
      courseId,
      moduleIds: [...entry.moduleIds],
      change:
        mode === "delete"
          ? readinessChanges.removeItems(entry.ids)
          : (snapshot) =>
              entry.ids.reduce(
                (current, id) =>
                  readinessChanges.setPublished(id, false)(current),
                snapshot,
              ),
      blockedMessage: (titles) =>
        `${subject} tidak bisa ${mode === "delete" ? "dihapus" : "disembunyikan"} karena lesson ${titles} yang sedang ditampilkan memakainya sebagai syarat penyelesaian atau sisipan. Sembunyikan lesson tersebut atau hapus rujukannya terlebih dahulu.`,
    });
  }
}

/**
 * Rejects a material edit (content or completion requirements) that would leave one of its
 * visible placements not ready.
 */
export async function assertMaterialChangeKeepsReadiness(
  db: DatabaseClient,
  materialId: string,
  update: (material: ReadinessMaterial) => ReadinessMaterial,
) {
  const placements = await db.courseItem.findMany({
    where: { materialId, isPublished: true },
    select: { moduleId: true, module: { select: { courseId: true } } },
  });
  const byCourse = new Map<string, Set<string>>();
  for (const placement of placements) {
    const moduleIds = byCourse.get(placement.module.courseId) ?? new Set();
    moduleIds.add(placement.moduleId);
    byCourse.set(placement.module.courseId, moduleIds);
  }
  for (const [courseId, moduleIds] of byCourse) {
    await assertReadinessChange(db, {
      courseId,
      moduleIds: [...moduleIds],
      change: readinessChanges.updateMaterial(materialId, update),
      blockedMessage: (_titles, details) =>
        `Perubahan belum bisa disimpan karena materi ini sedang ditampilkan dan harus tetap lengkap. ${details} Atau sembunyikan materi ini terlebih dahulu.`,
    });
  }
}

/** Rejects publishing a course while a visible item is not ready. */
export async function assertCoursePublishable(
  db: DatabaseClient,
  courseId: string,
) {
  const snapshot = await loadReadinessSnapshot(db, { courseId });
  const readiness = computeCourseReadiness({
    ...snapshot,
    courseStatus: "PUBLISHED",
  });
  const blocking = readiness.items.filter(
    (item) => item.isPublished && !item.ready,
  );
  if (blocking.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Course belum bisa dipublikasikan karena item ${joinTitles(
        blocking.map((item) => itemTitle(snapshot, item.courseItemId)),
      )} belum lengkap. Lengkapi atau sembunyikan item tersebut terlebih dahulu.`,
    });
  }
}

/** Readiness of one assessment (no questions / invalid questions), for events. */
export async function assertAssessmentComplete(
  db: DatabaseClient,
  assessmentId: string,
) {
  const assessment = (await loadReadinessAssessments(db, [assessmentId])).get(
    assessmentId,
  );
  if (!assessment) throw new TRPCError({ code: "NOT_FOUND" });
  if (assessment.questionCount === 0 || assessment.validationError) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Tugas "${assessment.title}" belum lengkap: ${
        assessment.validationError ?? "Tambahkan setidaknya satu soal."
      }`,
    });
  }
}
