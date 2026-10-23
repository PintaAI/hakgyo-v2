// Imports the Hangeul Mastery course from ./content into the database in apps/web/.env (DIRECT_URL).
//
//   bun run --cwd apps/web hangeul:import [--execute] [--prune] [--allow-missing-audio] [--content <file>] [--verbose]
//
// Without --execute it prints what would change and writes nothing. Rows have stable ids derived from the content
// keys (./ids.ts) and only differing fields are written, so a second run reports everything unchanged. Modules,
// items and resources of the course that are no longer in the content are only reported, unless --prune deletes
// them with their learner work. Nothing outside the course and its system-organization resources is touched.
import { parseArgs } from "node:util";
import { resolve } from "node:path";

import { Prisma, type PrismaClient } from "../../generated/prisma/client";
import {
  deleteAssessmentWithProgress,
  deleteCourseItemsWithProgress,
  deleteMaterialWithProgress,
  deleteVocabularySetWithProgress,
} from "../../src/server/content/resource-deletion";
import {
  HAKGYO_SYSTEM_ORGANIZATION_ID,
  HANGEUL_MASTERY_COURSE_ID,
} from "../../src/server/foundation/constants";
import { readManifest } from "./audio-manifest";
import { loadContent } from "./load-content";
import type { CourseContent } from "./content-types";
import { buildDesiredCourse, type DesiredCourse } from "./desired";
import { ID_PREFIX } from "./ids";
import { connectDb } from "./services";
import {
  planHasChanges,
  planImport,
  type ImportPlan,
  type ModelPlan,
  type Snapshot,
} from "./plan";

// One transaction for the whole import; generous, a full first import is a few hundred statements.
const TX_OPTIONS = { maxWait: 30_000, timeout: 900_000 };

function usage() {
  console.log(`Import the Hangeul Mastery course content.

Usage: bun run --cwd apps/web hangeul:import [options]

  --execute              write the changes (default: dry run)
  --prune                delete modules, items and resources of the course that are no longer
                         in the content, with their learner progress (default: only report them)
  --allow-missing-audio  strip clips that have no asset in this database instead of failing
  --content <file>       content module (default: scripts/hangeul-mastery/content/index.ts)
  --verbose              list every created, updated and removed row`);
}

// ---------------------------------------------------------------- snapshot

async function loadSnapshot(
  db: PrismaClient,
  desired: DesiredCourse,
): Promise<Snapshot> {
  const organizationId = HAKGYO_SYSTEM_ORGANIZATION_ID;
  const desiredItems = desired.modules.flatMap((row) => row.items);
  const course = await db.course.findUnique({
    where: { id: HANGEUL_MASTERY_COURSE_ID },
    select: {
      id: true,
      organizationId: true,
      title: true,
      description: true,
      status: true,
      progressionMode: true,
      enrollmentMode: true,
      price: true,
    },
  });
  if (course && course.organizationId !== organizationId) {
    throw new Error(`${course.id} is not in ${organizationId}`);
  }
  const courseId = course?.id ?? HANGEUL_MASTERY_COURSE_ID;

  const [modules, items] = await Promise.all([
    db.courseModule.findMany({
      where: {
        OR: [
          { courseId },
          { id: { in: desired.modules.map((row) => row.id) } },
        ],
      },
      select: {
        id: true,
        courseId: true,
        title: true,
        description: true,
        position: true,
      },
    }),
    db.courseItem.findMany({
      where: {
        OR: [
          { module: { courseId } },
          { id: { in: desiredItems.map((row) => row.id) } },
        ],
      },
      select: {
        id: true,
        moduleId: true,
        type: true,
        position: true,
        materialId: true,
        vocabularySetId: true,
        assessmentId: true,
        isPublished: true,
        module: { select: { courseId: true } },
        _count: {
          select: {
            progress: true,
            attempts: true,
            assessmentEvents: true,
            practiceAttempts: true,
          },
        },
      },
    }),
  ]);
  const courseItems = items.filter((row) => row.module.courseId === courseId);
  const ids = (values: (string | null | undefined)[]) => [
    ...new Set(values.filter((value): value is string => Boolean(value))),
  ];
  const resourceWhere = (wanted: string[], placed: string[]) => ({
    OR: [
      { id: { in: ids([...wanted, ...placed]) } },
      { organizationId, id: { startsWith: ID_PREFIX } },
    ],
  });

  const [materials, vocabularySets, assessments] = await Promise.all([
    db.material.findMany({
      where: resourceWhere(
        ids(desiredItems.map((row) => row.materialId)),
        ids(courseItems.map((row) => row.materialId)),
      ),
      select: {
        id: true,
        organizationId: true,
        title: true,
        description: true,
        content: true,
        requirementPolicy: true,
      },
    }),
    db.vocabularySet.findMany({
      where: resourceWhere(
        ids(desiredItems.map((row) => row.vocabularySetId)),
        ids(courseItems.map((row) => row.vocabularySetId)),
      ),
      select: {
        id: true,
        organizationId: true,
        title: true,
        description: true,
      },
    }),
    db.assessment.findMany({
      where: resourceWhere(
        ids(desiredItems.map((row) => row.assessmentId)),
        ids(courseItems.map((row) => row.assessmentId)),
      ),
      select: {
        id: true,
        organizationId: true,
        title: true,
        description: true,
        instructions: true,
        passingScore: true,
        maxAttempts: true,
        timeLimitMinutes: true,
        shuffleQuestions: true,
        shuffleOptions: true,
      },
    }),
  ]);
  const materialIds = materials.map((row) => row.id);
  const setIds = vocabularySets.map((row) => row.id);
  const assessmentIds = assessments.map((row) => row.id);

  const [
    requirements,
    entries,
    questions,
    materialAssets,
    assessmentAssets,
    elsewhere,
  ] = await Promise.all([
    db.materialRequirement.findMany({
      where: { materialId: { in: materialIds } },
      select: {
        id: true,
        materialId: true,
        type: true,
        assessmentId: true,
        vocabularySetId: true,
        minimumScore: true,
        position: true,
      },
    }),
    db.vocabularyEntry.findMany({
      where: { vocabularySetId: { in: setIds } },
      select: {
        id: true,
        vocabularySetId: true,
        term: true,
        definition: true,
        examples: true,
        metadata: true,
        audioAssetId: true,
        createdAt: true,
        _count: { select: { progress: true } },
      },
    }),
    db.assessmentQuestion.findMany({
      where: { assessmentId: { in: assessmentIds } },
      select: {
        id: true,
        assessmentId: true,
        type: true,
        prompt: true,
        explanation: true,
        points: true,
        position: true,
        _count: { select: { answers: true } },
        options: {
          select: {
            id: true,
            questionId: true,
            content: true,
            isCorrect: true,
            position: true,
            _count: { select: { selections: true } },
          },
        },
      },
    }),
    db.materialAsset.findMany({
      where: { materialId: { in: materialIds } },
      select: { materialId: true, assetId: true },
    }),
    db.assessmentAsset.findMany({
      where: { assessmentId: { in: assessmentIds } },
      select: { assessmentId: true, assetId: true },
    }),
    db.courseItem.findMany({
      where: {
        module: { courseId: { not: courseId } },
        OR: [
          { materialId: { in: materialIds } },
          { vocabularySetId: { in: setIds } },
          { assessmentId: { in: assessmentIds } },
        ],
      },
      select: { materialId: true, vocabularySetId: true, assessmentId: true },
    }),
  ]);

  const setProgress = new Map<string, number>();
  for (const entry of entries) {
    setProgress.set(
      entry.vocabularySetId,
      (setProgress.get(entry.vocabularySetId) ?? 0) + entry._count.progress,
    );
  }

  return {
    organizationId,
    course: course
      ? {
          id: course.id,
          title: course.title,
          description: course.description,
          status: course.status,
          progressionMode: course.progressionMode,
          enrollmentMode: course.enrollmentMode,
          price: course.price,
        }
      : null,
    modules,
    items: items.map(({ module, _count, ...row }) => ({
      ...row,
      courseId: module.courseId,
      learnerData: {
        progress: _count.progress,
        attempts: _count.attempts,
        events: _count.assessmentEvents,
        practiceAttempts: _count.practiceAttempts,
      },
    })),
    materials,
    requirements,
    vocabularySets,
    entries: entries.map(({ _count, ...row }) => ({
      ...row,
      progressCount: _count.progress,
    })),
    assessments,
    questions: questions.map(({ _count, options: _options, ...row }) => ({
      ...row,
      answerCount: _count.answers,
    })),
    options: questions.flatMap((question) =>
      question.options.map(({ _count, ...row }) => ({
        ...row,
        selectionCount: _count.selections,
      })),
    ),
    materialAssets: materialAssets.map((row) => ({
      parentId: row.materialId,
      assetId: row.assetId,
    })),
    assessmentAssets: assessmentAssets.map((row) => ({
      parentId: row.assessmentId,
      assetId: row.assetId,
    })),
    placedElsewhere: new Set(
      elsewhere.flatMap((row) =>
        ids([row.materialId, row.vocabularySetId, row.assessmentId]),
      ),
    ),
    setProgress,
  };
}

// ---------------------------------------------------------------- report

function printPlan(
  plan: ImportPlan,
  options: { prune: boolean; verbose: boolean },
) {
  const line = <T>(
    name: string,
    model: ModelPlan<T>,
    removeLabel = "remove",
  ) => {
    const fields = new Map<string, number>();
    for (const update of model.update) {
      for (const field of update.fields)
        fields.set(field, (fields.get(field) ?? 0) + 1);
    }
    const fieldList = fields.size
      ? ` (${[...fields].map(([field, count]) => `${field} ${count}`).join(", ")})`
      : "";
    console.log(
      `  ${name.padEnd(18)} ${String(model.create.length).padStart(4)} create  ${String(model.update.length).padStart(4)} update${fieldList.padEnd(0)}  ${String(model.unchanged).padStart(4)} unchanged  ${String(model.remove.length).padStart(3)} ${removeLabel}`,
    );
    if (options.verbose) {
      for (const row of model.create) {
        console.log(
          `      + ${(row as { id?: string }).id ?? JSON.stringify(row)}`,
        );
      }
      for (const row of model.update)
        console.log(`      ~ ${row.id}: ${row.fields.join(", ")}`);
      for (const row of model.remove) console.log(`      - ${row.label}`);
    }
  };
  console.log("\nCourse");
  if (plan.course.create) console.log("  course             create");
  else if (plan.course.update)
    console.log(
      `  course             update (${plan.course.update.fields.join(", ")})`,
    );
  else console.log("  course             unchanged");
  const prune = options.prune ? "prune" : "stale";
  line("modules", plan.modules, prune);
  line("items", plan.items, prune);
  line(
    "materials",
    { ...plan.materials, remove: plan.staleResources.materials },
    prune,
  );
  line("requirements", plan.requirements);
  line(
    "vocabulary sets",
    { ...plan.vocabularySets, remove: plan.staleResources.vocabularySets },
    prune,
  );
  line("vocabulary entries", plan.entries);
  line(
    "assessments",
    { ...plan.assessments, remove: plan.staleResources.assessments },
    prune,
  );
  line("questions", plan.questions);
  line("options", plan.options);
  line("material assets", plan.materialAssets);
  line("assessment assets", plan.assessmentAssets);
  if (plan.keptModuleMoves.length || plan.keptItemMoves.length) {
    console.log(
      `  (${plan.keptModuleMoves.length} stale modules and ${plan.keptItemMoves.length} stale items move behind the content${options.prune ? ", then --prune deletes them" : ""})`,
    );
  }

  const stale = [
    ...plan.modules.remove.map((row) => ({ kind: "module", ...row })),
    ...plan.items.remove.map((row) => ({ kind: "item", ...row })),
    ...plan.staleResources.materials.map((row) => ({
      kind: "material",
      ...row,
    })),
    ...plan.staleResources.vocabularySets.map((row) => ({
      kind: "vocabulary set",
      ...row,
    })),
    ...plan.staleResources.assessments.map((row) => ({
      kind: "assessment",
      ...row,
    })),
  ];
  if (stale.length) {
    console.log(
      options.prune
        ? "\nDeleted with --prune (learner work on them is lost):"
        : "\nNo longer in the content (kept; --prune deletes them with their learner work):",
    );
    for (const row of stale) {
      console.log(
        `  ${row.kind} ${row.id}: ${row.label}${row.learnerData ? `  [${row.learnerData}]` : ""}`,
      );
    }
    if (!options.prune && plan.items.remove.length) {
      console.log(
        "  Note: learners must complete every published item to master the course, so stale items block mastery until pruned.",
      );
    }
  }
  const learnerLoss = [
    ...plan.entries.remove,
    ...plan.questions.remove,
    ...plan.options.remove,
  ].filter((row) => row.learnerData);
  if (learnerLoss.length) {
    console.log(
      `\nRemoved rows with learner work (${options.prune ? "deleted with --prune" : "need --prune"}):`,
    );
    for (const row of learnerLoss)
      console.log(`  ${row.label}: ${row.learnerData}`);
  }
  const resetEntries = plan.entries.update.filter((row) =>
    row.fields.some((field) => field === "term" || field === "definition"),
  );
  if (resetEntries.length) {
    console.log(
      `\n${resetEntries.length} vocabulary entries change their definition: learners' progress on them restarts.`,
    );
  }
}

// ---------------------------------------------------------------- apply

const json = (value: unknown) => value as Prisma.InputJsonValue;
const nullableJson = (value: unknown) =>
  value === null || value === undefined ? Prisma.JsonNull : json(value);

// Positions must be >= 0 (CHECK constraints), so rows are parked far above any real position while positions are
// reshuffled. The range starts at a per-run offset, so rows left parked by an interrupted run never collide with
// this run's parking spots (the run moves them to their real positions anyway).
let tempCounter = 1_000_000_000 + (Date.now() % 100_000_000) * 10;
const tempPosition = () => tempCounter++;

/**
 * Writes the plan in one transaction: an import either lands completely or not at all, so a failed run leaves the
 * database as it was and can simply be run again.
 */
async function applyPlan(
  db: PrismaClient,
  desired: DesiredCourse,
  plan: ImportPlan,
  options: { prune: boolean; ownerMembershipId: string },
) {
  await db.$transaction(
    (tx) => writePlan(tx, desired, plan, options),
    TX_OPTIONS,
  );
}

async function writePlan(
  tx: Prisma.TransactionClient,
  desired: DesiredCourse,
  plan: ImportPlan,
  options: { prune: boolean; ownerMembershipId: string },
) {
  const organizationId = HAKGYO_SYSTEM_ORGANIZATION_ID;
  const courseId = HANGEUL_MASTERY_COURSE_ID;

  // 2. The course and its module order.
  {
    if (plan.course.create) {
      await tx.course.create({
        data: {
          id: courseId,
          organizationId,
          ownerMembershipId: options.ownerMembershipId,
          slug: "hangeul-mastery",
          ...plan.course.data,
        },
      });
    } else if (plan.course.update) {
      await tx.course.update({
        where: { id: courseId },
        data: plan.course.update.data,
      });
    }
    // Stale modules always move behind the content first (with --prune they are deleted at the end, once the
    // content's items have moved out of them).
    const keptMoves = plan.keptModuleMoves;
    const moving = [
      ...plan.modules.update
        .filter((row) => row.fields.includes("position"))
        .map((row) => row.id),
      ...keptMoves.map((row) => row.id),
    ];
    for (const id of moving) {
      await tx.courseModule.update({
        where: { id },
        data: { position: tempPosition() },
      });
    }
    for (const row of plan.modules.update) {
      await tx.courseModule.update({ where: { id: row.id }, data: row.data });
    }
    for (const row of keptMoves) {
      await tx.courseModule.update({
        where: { id: row.id },
        data: { position: row.position },
      });
    }
    if (plan.modules.create.length) {
      await tx.courseModule.createMany({
        data: plan.modules.create.map((row) => ({
          ...row,
          courseId,
          organizationId,
        })),
      });
    }
  }

  // 3. Park every item that changes module or position, so the modules below can place them in any order. Parked
  // items are always written back with their position, even when only their module changed.
  const keptItemMoves = plan.keptItemMoves;
  const desiredItemPosition = new Map(
    desired.modules.flatMap((row) =>
      row.items.map((item) => [item.id, item.position] as const),
    ),
  );
  const movingItems = [
    ...plan.items.update
      .filter(
        (row) =>
          row.fields.includes("position") || row.fields.includes("moduleId"),
      )
      .map((row) => row.id),
    ...keptItemMoves.map((row) => row.id),
  ];
  const parkedItems = new Set(movingItems);
  if (movingItems.length) {
    {
      for (const id of movingItems) {
        await tx.courseItem.update({
          where: { id },
          data: { position: tempPosition() },
        });
      }
    }
  }

  // 4. One transaction per module: its resources, their rows, its items and the asset links.
  for (const courseModule of desired.modules) {
    const items = courseModule.items;
    const itemIds = new Set(items.map((row) => row.id));
    const materialIds = new Set(
      items.flatMap((row) => (row.material ? [row.material.id] : [])),
    );
    const setIds = new Set(
      items.flatMap((row) => (row.vocabularySet ? [row.vocabularySet.id] : [])),
    );
    const assessmentIds = new Set(
      items.flatMap((row) => (row.assessment ? [row.assessment.id] : [])),
    );
    const materials = items.flatMap((row) =>
      row.material ? [row.material] : [],
    );
    const sets = items.flatMap((row) =>
      row.vocabularySet ? [row.vocabularySet] : [],
    );
    const questions = items.flatMap((row) => row.assessment?.questions ?? []);
    const requirementIds = new Set(
      materials.flatMap((row) => row.requirements.map((r) => r.id)),
    );
    const entryIds = new Set(
      sets.flatMap((row) => row.entries.map((entry) => entry.id)),
    );
    const questionIds = new Set(questions.map((row) => row.id));
    const optionIds = new Set(
      questions.flatMap((row) => row.options.map((option) => option.id)),
    );
    const removedQuestions = plan.questions.remove
      .filter((row) => row.parentId && assessmentIds.has(row.parentId))
      .map((row) => row.id);
    const removedOf = (
      rows: ImportPlan["entries"]["remove"],
      parents: Set<string>,
    ) =>
      rows
        .filter((row) => row.parentId && parents.has(row.parentId))
        .map((row) => row.id);
    const inModule = <T extends { id: string }>(rows: T[], ids: Set<string>) =>
      rows.filter((row) => ids.has(row.id));

    const parentOf = (row: { parentId?: string }, ...parents: Set<string>[]) =>
      Boolean(row.parentId && parents.some((set) => set.has(row.parentId!)));
    const touches = (rows: readonly { id: string }[], ids: Set<string>) =>
      rows.some((row) => ids.has(row.id));
    const hasWork =
      touches(
        [...plan.materials.create, ...plan.materials.update],
        materialIds,
      ) ||
      touches(
        [...plan.vocabularySets.create, ...plan.vocabularySets.update],
        setIds,
      ) ||
      touches(
        [...plan.assessments.create, ...plan.assessments.update],
        assessmentIds,
      ) ||
      touches([...plan.items.create, ...plan.items.update], itemIds) ||
      touches(
        [...plan.questions.create, ...plan.questions.update],
        questionIds,
      ) ||
      touches([...plan.options.create, ...plan.options.update], optionIds) ||
      touches([...plan.entries.create, ...plan.entries.update], entryIds) ||
      touches(
        [...plan.requirements.create, ...plan.requirements.update],
        requirementIds,
      ) ||
      keptItemMoves.some((row) => row.moduleId === courseModule.id) ||
      [
        plan.questions.remove,
        plan.entries.remove,
        plan.requirements.remove,
        plan.materialAssets.remove,
        plan.assessmentAssets.remove,
      ]
        .flat()
        .some((row) => parentOf(row, assessmentIds, setIds, materialIds)) ||
      plan.options.remove.some((row) =>
        parentOf(row, questionIds, new Set(removedQuestions)),
      ) ||
      [...plan.materialAssets.create, ...plan.assessmentAssets.create].some(
        (row) =>
          materialIds.has(row.parentId) || assessmentIds.has(row.parentId),
      );
    if (!hasWork) continue;

    {
      // Resources
      for (const row of inModule(plan.materials.create, materialIds)) {
        await tx.material.create({
          data: {
            ...row,
            content: json(row.content),
            organizationId,
            createdByMembershipId: options.ownerMembershipId,
            editorSchemaVersion: 1,
          },
        });
      }
      for (const row of inModule(plan.materials.update, materialIds)) {
        const { content, ...data } = row.data;
        await tx.material.update({
          where: { id: row.id },
          data: {
            ...data,
            ...(content !== undefined ? { content: json(content) } : {}),
          },
        });
      }
      for (const row of inModule(plan.vocabularySets.create, setIds)) {
        await tx.vocabularySet.create({
          data: {
            ...row,
            organizationId,
            createdByMembershipId: options.ownerMembershipId,
          },
        });
      }
      for (const row of inModule(plan.vocabularySets.update, setIds)) {
        await tx.vocabularySet.update({
          where: { id: row.id },
          data: row.data,
        });
      }
      for (const row of inModule(plan.assessments.create, assessmentIds)) {
        await tx.assessment.create({
          data: {
            ...row,
            instructions: nullableJson(row.instructions),
            organizationId,
            createdByMembershipId: options.ownerMembershipId,
            editorSchemaVersion: 1,
          },
        });
      }
      for (const row of inModule(plan.assessments.update, assessmentIds)) {
        const { instructions, ...data } = row.data;
        await tx.assessment.update({
          where: { id: row.id },
          data: {
            ...data,
            ...(instructions !== undefined
              ? { instructions: nullableJson(instructions) }
              : {}),
          },
        });
      }

      // Removed rows of these resources (learner answers only with --prune, checked before)
      const optionRemovals = removedOf(
        plan.options.remove,
        new Set([...questionIds, ...removedQuestions]),
      );
      if (optionRemovals.length) {
        await tx.assessmentAnswerSelection.deleteMany({
          where: { optionId: { in: optionRemovals } },
        });
        await tx.assessmentOption.deleteMany({
          where: { id: { in: optionRemovals } },
        });
      }
      if (removedQuestions.length) {
        await tx.assessmentAnswer.deleteMany({
          where: { questionId: { in: removedQuestions } },
        });
        await tx.assessmentOption.deleteMany({
          where: { questionId: { in: removedQuestions } },
        });
        await tx.assessmentQuestion.deleteMany({
          where: { id: { in: removedQuestions } },
        });
      }
      const entryRemovals = removedOf(plan.entries.remove, setIds);
      if (entryRemovals.length) {
        await tx.vocabularyEntry.deleteMany({
          where: { id: { in: entryRemovals } },
        });
      }
      const requirementRemovals = removedOf(
        plan.requirements.remove,
        materialIds,
      );
      if (requirementRemovals.length) {
        await tx.materialRequirement.deleteMany({
          where: { id: { in: requirementRemovals } },
        });
      }

      // Questions and options: park the ones that move, then write
      const questionUpdates = plan.questions.update.filter((row) =>
        questionIds.has(row.id),
      );
      for (const row of questionUpdates.filter((row) =>
        row.fields.includes("position"),
      )) {
        await tx.assessmentQuestion.update({
          where: { id: row.id },
          data: { position: tempPosition() },
        });
      }
      for (const row of questionUpdates) {
        const { prompt, explanation, ...data } = row.data;
        await tx.assessmentQuestion.update({
          where: { id: row.id },
          data: {
            ...data,
            ...(prompt !== undefined ? { prompt: json(prompt) } : {}),
            ...(explanation !== undefined
              ? { explanation: nullableJson(explanation) }
              : {}),
          },
        });
      }
      const questionCreates = plan.questions.create.filter((row) =>
        questionIds.has(row.id),
      );
      if (questionCreates.length) {
        await tx.assessmentQuestion.createMany({
          data: questionCreates.map((row) => ({
            ...row,
            prompt: json(row.prompt),
            explanation: nullableJson(row.explanation),
          })),
        });
      }
      const optionUpdates = plan.options.update.filter((row) =>
        optionIds.has(row.id),
      );
      for (const row of optionUpdates.filter((row) =>
        row.fields.includes("position"),
      )) {
        await tx.assessmentOption.update({
          where: { id: row.id },
          data: { position: tempPosition() },
        });
      }
      for (const row of optionUpdates) {
        const { content, ...data } = row.data;
        await tx.assessmentOption.update({
          where: { id: row.id },
          data: {
            ...data,
            ...(content !== undefined ? { content: json(content) } : {}),
          },
        });
      }
      const optionCreates = plan.options.create.filter((row) =>
        questionIds.has(row.questionId),
      );
      if (optionCreates.length) {
        await tx.assessmentOption.createMany({
          data: optionCreates.map((row) => ({
            ...row,
            content: json(row.content),
          })),
        });
      }

      // Vocabulary entries
      for (const row of plan.entries.update.filter((row) =>
        entryIds.has(row.id),
      )) {
        const { examples, metadata, ...data } = row.data;
        await tx.vocabularyEntry.update({
          where: { id: row.id },
          data: {
            ...data,
            ...(examples !== undefined ? { examples: json(examples) } : {}),
            ...(metadata !== undefined
              ? { metadata: nullableJson(metadata) }
              : {}),
          },
        });
      }
      const entryCreates = plan.entries.create.filter((row) =>
        setIds.has(row.vocabularySetId),
      );
      if (entryCreates.length) {
        await tx.vocabularyEntry.createMany({
          data: entryCreates.map((row) => ({
            ...row,
            organizationId,
            examples: json(row.examples),
            metadata: nullableJson(row.metadata),
          })),
        });
      }

      // Items (moving ones were parked in step 3)
      for (const row of inModule(plan.items.update, itemIds)) {
        await tx.courseItem.update({
          where: { id: row.id },
          data: parkedItems.has(row.id)
            ? { ...row.data, position: desiredItemPosition.get(row.id)! }
            : row.data,
        });
      }
      const itemCreates = inModule(plan.items.create, itemIds);
      if (itemCreates.length) {
        await tx.courseItem.createMany({
          data: itemCreates.map((row) => ({ ...row, organizationId })),
        });
      }
      for (const row of keptItemMoves.filter(
        (row) => row.moduleId === courseModule.id,
      )) {
        await tx.courseItem.update({
          where: { id: row.id },
          data: { position: row.position },
        });
      }

      // Requirements
      const requirementUpdates = plan.requirements.update.filter((row) =>
        requirementIds.has(row.id),
      );
      for (const row of requirementUpdates.filter((row) =>
        row.fields.includes("position"),
      )) {
        await tx.materialRequirement.update({
          where: { id: row.id },
          data: { position: tempPosition() },
        });
      }
      for (const row of requirementUpdates) {
        await tx.materialRequirement.update({
          where: { id: row.id },
          data: row.data,
        });
      }
      const requirementCreates = plan.requirements.create.filter((row) =>
        materialIds.has(row.materialId),
      );
      if (requirementCreates.length) {
        await tx.materialRequirement.createMany({
          data: requirementCreates.map((row) => ({ ...row, organizationId })),
        });
      }

      // Asset links
      const materialLinks = plan.materialAssets.create.filter((row) =>
        materialIds.has(row.parentId),
      );
      if (materialLinks.length) {
        await tx.materialAsset.createMany({
          data: materialLinks.map((row) => ({
            materialId: row.parentId,
            assetId: row.assetId,
            organizationId,
          })),
          skipDuplicates: true,
        });
      }
      for (const row of plan.materialAssets.remove) {
        if (!row.parentId || !materialIds.has(row.parentId)) continue;
        await tx.materialAsset.deleteMany({
          where: { materialId: row.parentId, assetId: row.label },
        });
      }
      const assessmentLinks = plan.assessmentAssets.create.filter((row) =>
        assessmentIds.has(row.parentId),
      );
      if (assessmentLinks.length) {
        await tx.assessmentAsset.createMany({
          data: assessmentLinks.map((row) => ({
            assessmentId: row.parentId,
            assetId: row.assetId,
            organizationId,
          })),
          skipDuplicates: true,
        });
      }
      for (const row of plan.assessmentAssets.remove) {
        if (!row.parentId || !assessmentIds.has(row.parentId)) continue;
        await tx.assessmentAsset.deleteMany({
          where: { assessmentId: row.parentId, assetId: row.label },
        });
      }
    }
    console.log(`module ${courseModule.key}: written`);
  }

  // 5. With --prune, after every upsert: stale items with their learner work, then the resources and modules no
  // item of the content places any more.
  if (options.prune) {
    if (plan.items.remove.length) {
      const result = await deleteCourseItemsWithProgress(
        tx,
        plan.items.remove.map((row) => row.id),
      );
      console.log(
        `pruned ${result.courseItems} items (${result.progress} progress, ${result.attempts} attempts, ${result.events} events, ${result.activityEvents} activity events)`,
      );
    }
    {
      for (const row of plan.staleResources.materials)
        await deleteMaterialWithProgress(tx, row.id);
      for (const row of plan.staleResources.vocabularySets) {
        await deleteVocabularySetWithProgress(tx, row.id);
      }
      for (const row of plan.staleResources.assessments)
        await deleteAssessmentWithProgress(tx, row.id);
      if (plan.modules.remove.length) {
        await tx.courseModule.deleteMany({
          where: {
            courseId,
            id: { in: plan.modules.remove.map((row) => row.id) },
          },
        });
      }
    }
    const pruned =
      plan.staleResources.materials.length +
      plan.staleResources.vocabularySets.length +
      plan.staleResources.assessments.length;
    if (pruned || plan.modules.remove.length) {
      console.log(
        `pruned ${pruned} resources and ${plan.modules.remove.length} modules`,
      );
    }
  }
}

// ---------------------------------------------------------------- main

async function resolveAudioAssets(db: PrismaClient) {
  const manifest = readManifest();
  const objectKeyByText = new Map(
    Object.entries(manifest?.clips ?? {}).map(([text, clip]) => [
      text,
      clip.objectKey,
    ]),
  );
  const assets = objectKeyByText.size
    ? await db.asset.findMany({
        where: {
          organizationId: HAKGYO_SYSTEM_ORGANIZATION_ID,
          objectKey: { in: [...objectKeyByText.values()] },
          confirmedAt: { not: null },
          deletedAt: null,
        },
        select: { id: true, objectKey: true },
      })
    : [];
  const assetByKey = new Map(assets.map((row) => [row.objectKey, row.id]));
  return (text: string) => {
    const objectKey = objectKeyByText.get(text);
    return objectKey ? assetByKey.get(objectKey) : undefined;
  };
}

export async function runImport(input: {
  db: PrismaClient;
  content: CourseContent;
  execute: boolean;
  prune: boolean;
  allowMissingAudio: boolean;
  verbose: boolean;
}) {
  const { db } = input;
  const resolveAudio = await resolveAudioAssets(db);
  const built = buildDesiredCourse(input.content, {
    resolveAudio,
    allowMissingAudio: input.allowMissingAudio,
  });
  const itemCount = built.course.modules.reduce(
    (sum, row) => sum + row.items.length,
    0,
  );
  console.log(
    `Content: ${built.course.modules.length} modules, ${itemCount} items${built.missingAudio.length ? `, ${built.missingAudio.length} clips without an asset${input.allowMissingAudio ? " (stripped)" : ""}` : ""}`,
  );
  if (built.errors.length) {
    console.error(`\nThe content has ${built.errors.length} problem(s):`);
    for (const error of built.errors) console.error(`  - ${error}`);
    return 1;
  }

  const plan = planImport(built.course, await loadSnapshot(db, built.course));
  printPlan(plan, input);
  if (plan.errors.length) {
    console.error("\nCannot import:");
    for (const error of plan.errors) console.error(`  - ${error}`);
    return 1;
  }
  if (!planHasChanges(plan, input.prune)) {
    console.log("\nEverything is unchanged.");
    return 0;
  }
  if (!input.execute) {
    console.log("\nDry run: nothing written. Add --execute to apply.");
    return 0;
  }
  if (plan.blocked.length && !input.prune) {
    console.error(
      `\n${plan.blocked.length} removed row(s) still have learner work (listed above). Rerun with --prune to delete them.`,
    );
    return 1;
  }

  const owner = await db.organizationMember.findFirst({
    where: { organizationId: HAKGYO_SYSTEM_ORGANIZATION_ID, role: "OWNER" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!owner)
    throw new Error(
      "The system organization has no owner membership (run db:seed).",
    );

  console.log("");
  await applyPlan(db, built.course, plan, {
    prune: input.prune,
    ownerMembershipId: owner.id,
  });

  const after = planImport(built.course, await loadSnapshot(db, built.course));
  if (planHasChanges(after, input.prune)) {
    console.error(
      "\nThe database still differs from the content after the import:",
    );
    printPlan(after, { ...input, verbose: true });
    return 1;
  }
  console.log("\nImported; a second run would change nothing.");
  return 0;
}

async function main() {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    strict: true,
    options: {
      execute: { type: "boolean", default: false },
      prune: { type: "boolean", default: false },
      "allow-missing-audio": { type: "boolean", default: false },
      content: { type: "string" },
      verbose: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  });
  if (values.help) {
    usage();
    return 0;
  }
  const content = await loadContent(
    values.content ? resolve(values.content) : undefined,
  );
  const { db, host } = connectDb();
  console.log(`Database: ${host}${values.execute ? "" : " (dry run)"}`);
  try {
    return await runImport({
      db,
      content,
      execute: values.execute,
      prune: values.prune,
      allowMissingAudio: values["allow-missing-audio"],
      verbose: values.verbose,
    });
  } finally {
    await db.$disconnect();
  }
}

if (import.meta.main) process.exit(await main());
