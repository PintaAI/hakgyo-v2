// Imports the two Pola Bahasa courses from ./content into the database in apps/web/.env (DIRECT_URL), in the
// Hakgyo system organization. Each chapter (bab) is a module: one material per pattern, then the chapter's
// vocabulary set, then its quiz, all published.
//
//   bun run --cwd apps/web pola:import [--execute] [--verbose] [--enroll-existing]
//
// Without --execute it validates the content, reads the database and prints what would change, writing nothing.
// Rows have stable ids derived from the manifest keys (./ids.ts) and only differing fields are written, so a second
// run reports everything unchanged. Pola rows the content no longer has (modules and items of the two courses, `pb-`
// resources of the system organization) are listed in every run and deleted by --execute; the plan refuses when any
// of them carries learner data (./plan.ts). No cohort or enrollment is ever created unless --enroll-existing is given.
import { parseArgs } from "node:util";

import { Prisma, type PrismaClient } from "../../generated/prisma/client";
import { ensureDefaultCohort } from "../../src/server/enrollment/default-cohort";
import { HAKGYO_SYSTEM_ORGANIZATION_ID } from "../../src/server/foundation/constants";
import { connectDb } from "../hangeul-mastery/services";

import type {
  DesiredAssessment,
  DesiredCourse,
  DesiredMaterial,
  DesiredVocabularySet,
} from "./curriculum";
import { ID_PREFIX } from "./ids";
import {
  planHasChanges,
  planImport,
  planRemovals,
  type ImportPlan,
  type ModelPlan,
  type Removal,
  type Snapshot,
} from "./plan";
import { printValidation, validatePolaContent } from "./validate";

// One transaction for the whole import: it lands completely or not at all.
const TX_OPTIONS = { maxWait: 30_000, timeout: 300_000 };
const ENROLL_BATCH_SIZE = 500;

function usage() {
  console.log(`Import the Pola Bahasa courses (Korea → Indo, Indo → Korea).

Usage: bun run --cwd apps/web pola:import [options]

  --execute          write the changes, including the listed deletions (default: dry run)
  --verbose          list every created, updated and deleted row, and the materials nothing links to
  --enroll-existing  rollout only, never needed for the import: also enroll every existing user in both
                     courses (creates each course's default cohort)`);
}

type Desired = {
  courses: DesiredCourse[];
  materials: DesiredMaterial[];
  vocabularySets: DesiredVocabularySet[];
  assessments: DesiredAssessment[];
};

// ---------------------------------------------------------------- snapshot

const pbOrDesired = (
  organizationId: string,
  ids: string[],
  placed: (string | null)[],
) => ({
  OR: [
    { id: { in: ids } },
    { id: { in: placed.filter((id): id is string => !!id) } },
    { organizationId, id: { startsWith: ID_PREFIX } },
  ],
});

async function loadSnapshot(
  db: PrismaClient,
  desired: Desired,
): Promise<Snapshot> {
  const organizationId = HAKGYO_SYSTEM_ORGANIZATION_ID;
  const { courses, materials, vocabularySets, assessments } = desired;
  const courseIds = courses.map((row) => row.id);
  const modules = courses.flatMap((row) => row.modules);
  const items = modules.flatMap((row) => row.items);

  const [courseRows, cohortRows, moduleRows, itemRows] = await Promise.all([
    db.course.findMany({
      where: {
        OR: [
          { id: { in: courseIds } },
          { organizationId, slug: { in: courses.map((row) => row.slug) } },
        ],
      },
      select: {
        id: true,
        organizationId: true,
        title: true,
        slug: true,
        description: true,
        status: true,
        progressionMode: true,
      },
    }),
    db.cohort.findMany({
      where: { courseId: { in: courseIds } },
      select: { courseId: true, _count: { select: { enrollments: true } } },
    }),
    db.courseModule.findMany({
      where: {
        OR: [
          { courseId: { in: courseIds } },
          { id: { in: modules.map((row) => row.id) } },
        ],
      },
      select: {
        id: true,
        courseId: true,
        title: true,
        description: true,
        position: true,
        _count: { select: { cohortMeetings: true } },
      },
    }),
    db.courseItem.findMany({
      where: {
        OR: [
          { module: { courseId: { in: courseIds } } },
          { id: { in: items.map((row) => row.id) } },
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

  const [materialRows, setRows, assessmentRows] = await Promise.all([
    db.material.findMany({
      where: pbOrDesired(
        organizationId,
        materials.map((row) => row.id),
        itemRows.map((row) => row.materialId),
      ),
      select: {
        id: true,
        organizationId: true,
        title: true,
        description: true,
        content: true,
        editorSchemaVersion: true,
      },
    }),
    db.vocabularySet.findMany({
      where: pbOrDesired(
        organizationId,
        vocabularySets.map((row) => row.id),
        itemRows.map((row) => row.vocabularySetId),
      ),
      select: {
        id: true,
        organizationId: true,
        title: true,
        description: true,
        _count: { select: { materialRequirements: true } },
      },
    }),
    db.assessment.findMany({
      where: pbOrDesired(
        organizationId,
        assessments.map((row) => row.id),
        itemRows.map((row) => row.assessmentId),
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
        editorSchemaVersion: true,
        publicQuiz: { select: { id: true } },
        _count: { select: { attempts: true, materialRequirements: true } },
      },
    }),
  ]);

  const setIds = setRows.map((row) => row.id);
  const assessmentIds = assessmentRows.map((row) => row.id);
  const desiredQuestions = assessments.flatMap((row) => row.questions);
  const [entryRows, questionRows, placementRows] = await Promise.all([
    db.vocabularyEntry.findMany({
      where: {
        OR: [
          { vocabularySetId: { in: setIds } },
          {
            id: {
              in: vocabularySets.flatMap((row) =>
                row.entries.map((entry) => entry.id),
              ),
            },
          },
        ],
      },
      select: {
        id: true,
        vocabularySetId: true,
        term: true,
        meanings: true,
        definition: true,
        examples: true,
        createdAt: true,
        _count: { select: { progress: true, practiceAttempts: true } },
      },
    }),
    db.assessmentQuestion.findMany({
      where: {
        OR: [
          { assessmentId: { in: assessmentIds } },
          { id: { in: desiredQuestions.map((row) => row.id) } },
        ],
      },
      select: {
        id: true,
        assessmentId: true,
        type: true,
        prompt: true,
        explanation: true,
        points: true,
        position: true,
        _count: { select: { answers: true } },
      },
    }),
    db.courseItem.findMany({
      where: {
        OR: [
          { materialId: { in: materialRows.map((row) => row.id) } },
          { vocabularySetId: { in: setIds } },
          { assessmentId: { in: assessmentIds } },
        ],
      },
      select: {
        id: true,
        materialId: true,
        vocabularySetId: true,
        assessmentId: true,
        module: { select: { courseId: true } },
      },
    }),
  ]);
  const optionRows = await db.assessmentOption.findMany({
    where: {
      OR: [
        { questionId: { in: questionRows.map((row) => row.id) } },
        {
          id: {
            in: desiredQuestions.flatMap((row) =>
              row.options.map((option) => option.id),
            ),
          },
        },
      ],
    },
    select: {
      id: true,
      questionId: true,
      content: true,
      isCorrect: true,
      position: true,
      _count: { select: { selections: true } },
    },
  });

  const cohortEnrollments = new Map<string, number>();
  for (const row of cohortRows) {
    cohortEnrollments.set(
      row.courseId,
      (cohortEnrollments.get(row.courseId) ?? 0) + row._count.enrollments,
    );
  }
  return {
    organizationId,
    courses: courseRows.map((row) => ({
      ...row,
      enrollmentCount: cohortEnrollments.get(row.id) ?? 0,
    })),
    modules: moduleRows.map(({ _count, ...row }) => ({
      ...row,
      meetingCount: _count.cohortMeetings,
    })),
    items: itemRows.map(({ module, _count, ...row }) => ({
      ...row,
      courseId: module.courseId,
      learnerData: {
        progress: _count.progress,
        attempts: _count.attempts,
        events: _count.assessmentEvents,
        practiceAttempts: _count.practiceAttempts,
      },
    })),
    materials: materialRows,
    vocabularySets: setRows.map(({ _count, ...row }) => ({
      ...row,
      requirementCount: _count.materialRequirements,
    })),
    entries: entryRows.map(({ _count, ...row }) => ({
      ...row,
      progressCount: _count.progress,
      practiceCount: _count.practiceAttempts,
    })),
    assessments: assessmentRows.map(({ _count, publicQuiz, ...row }) => ({
      ...row,
      attemptCount: _count.attempts,
      requirementCount: _count.materialRequirements,
      publicQuiz: publicQuiz !== null,
    })),
    questions: questionRows.map(({ _count, ...row }) => ({
      ...row,
      answerCount: _count.answers,
    })),
    options: optionRows.map(({ _count, ...row }) => ({
      ...row,
      selectionCount: _count.selections,
    })),
    placements: placementRows.map((row) => ({
      itemId: row.id,
      courseId: row.module.courseId,
      materialId: row.materialId,
      vocabularySetId: row.vocabularySetId,
      assessmentId: row.assessmentId,
    })),
  };
}

const planFor = async (db: PrismaClient, desired: Desired) =>
  planImport(
    desired.courses,
    desired.materials,
    desired.vocabularySets,
    desired.assessments,
    await loadSnapshot(db, desired),
  );

// ---------------------------------------------------------------- report

const REMOVAL_LABELS: Record<keyof ReturnType<typeof planRemovals>, string> = {
  items: "item",
  modules: "module",
  options: "option",
  questions: "question",
  entries: "vocabulary entry",
  materials: "material",
  vocabularySets: "vocabulary set",
  assessments: "quiz",
};

function printPlan(plan: ImportPlan, verbose: boolean) {
  const line = <T>(
    name: string,
    model: ModelPlan<T> & { remove?: Removal[] },
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
      `  ${name.padEnd(12)} ${String(model.create.length).padStart(4)} create  ${String(model.update.length).padStart(4)} update  ${String(model.remove?.length ?? 0).padStart(4)} delete  ${String(model.unchanged).padStart(4)} unchanged${fieldList}`,
    );
    if (verbose) {
      for (const row of model.create)
        console.log(`      + ${(row as { id: string }).id}`);
      for (const row of model.update)
        console.log(`      ~ ${row.id}: ${row.fields.join(", ")}`);
    }
  };
  console.log("\nPlan");
  line("courses", plan.courses);
  line("modules", plan.modules);
  line("materials", plan.materials);
  line("vocab sets", plan.vocabularySets);
  line("vocab entries", plan.entries);
  line("items", plan.items);
  line("quizzes", plan.assessments);
  line("questions", plan.questions);
  line("options", plan.options);

  // Deletions are always listed (options and entries only counted unless --verbose).
  const removals = Object.entries(planRemovals(plan)) as [
    keyof typeof REMOVAL_LABELS,
    Removal[],
  ][];
  const total = removals.reduce((sum, [, rows]) => sum + rows.length, 0);
  if (!total) return;
  console.log(
    `\n  ${total} Pola row(s) are no longer in the content and are deleted by --execute:`,
  );
  for (const [kind, rows] of removals) {
    if (!rows.length) continue;
    if (
      !verbose &&
      (kind === "options" || kind === "questions" || kind === "entries")
    ) {
      console.log(
        `      - ${rows.length} ${REMOVAL_LABELS[kind]}(s) (--verbose lists them)`,
      );
      continue;
    }
    for (const row of rows) {
      console.log(
        `      - ${REMOVAL_LABELS[kind]} ${row.id}${row.title ? ` "${row.title}"` : ""}`,
      );
    }
  }
}

// ---------------------------------------------------------------- apply

const json = (value: unknown) => value as Prisma.InputJsonValue;
const nullableJson = (value: unknown) =>
  value === null || value === undefined
    ? Prisma.DbNull
    : (value as Prisma.InputJsonValue);

// Positions must be >= 0 and unique per parent, so rows that move are parked far above any real position first.
let tempCounter = 1_000_000_000 + (Date.now() % 100_000_000) * 10;
const tempPosition = () => tempCounter++;

const idsOf = (rows: Removal[]) => rows.map((row) => row.id);

/** Fails the transaction when a delete did not hit exactly the planned rows. */
function expectDeleted(
  kind: string,
  planned: Removal[],
  result: { count: number },
) {
  if (result.count !== planned.length) {
    throw new Error(
      `planned to delete ${planned.length} ${kind} rows but ${result.count} matched; nothing was written`,
    );
  }
}

/**
 * Re-checks inside the transaction that nothing about to be deleted carries learner data (the plan was made from a
 * snapshot read before it). Vocabulary progress cascades with its entry, so it must be checked before deleting.
 */
async function assertNoLearnerData(
  tx: Prisma.TransactionClient,
  plan: ImportPlan,
  courseIds: string[],
) {
  const removals = planRemovals(plan);
  if (!Object.values(removals).some((rows) => rows.length)) return;
  const itemIds = idsOf(removals.items);
  const entryWhere = {
    OR: [
      { id: { in: idsOf(removals.entries) } },
      { vocabularySetId: { in: idsOf(removals.vocabularySets) } },
    ],
  };
  const found = {
    enrollments: await tx.cohortEnrollment.count({
      where: { cohort: { courseId: { in: courseIds } } },
    }),
    progress: await tx.contentProgress.count({
      where: { courseItemId: { in: itemIds } },
    }),
    attempts: await tx.assessmentAttempt.count({
      where: {
        OR: [
          { courseItemId: { in: itemIds } },
          { assessmentId: { in: idsOf(removals.assessments) } },
        ],
      },
    }),
    events: await tx.assessmentEvent.count({
      where: { courseItemId: { in: itemIds } },
    }),
    answers: await tx.assessmentAnswer.count({
      where: { questionId: { in: idsOf(removals.questions) } },
    }),
    selections: await tx.assessmentAnswerSelection.count({
      where: { optionId: { in: idsOf(removals.options) } },
    }),
    vocabularyProgress: await tx.vocabularyProgress.count({
      where: { entry: entryWhere },
    }),
    practiceAttempts: await tx.vocabularyPracticeAttempt.count({
      where: {
        OR: [{ entry: entryWhere }, { sourceCourseItemId: { in: itemIds } }],
      },
    }),
  };
  const blocking = Object.entries(found).filter(([, count]) => count > 0);
  if (blocking.length) {
    throw new Error(
      `learner data appeared since the plan was made (${blocking.map(([name, count]) => `${count} ${name}`).join(", ")}); nothing was written`,
    );
  }
}

async function writePlan(
  tx: Prisma.TransactionClient,
  plan: ImportPlan,
  courseIds: string[],
  ownerMembershipId: string,
) {
  const organizationId = HAKGYO_SYSTEM_ORGANIZATION_ID;
  const removals = planRemovals(plan);
  await assertNoLearnerData(tx, plan, courseIds);

  for (const row of plan.courses.create) {
    await tx.course.create({
      data: { ...row, organizationId, ownerMembershipId },
    });
  }
  for (const row of plan.courses.update) {
    await tx.course.update({ where: { id: row.id }, data: row.data });
  }

  // 1. Stale items and modules of the Pola courses first: they free module and item positions.
  if (removals.items.length) {
    expectDeleted(
      "item",
      removals.items,
      await tx.courseItem.deleteMany({
        where: {
          id: { in: idsOf(removals.items) },
          module: { courseId: { in: courseIds } },
        },
      }),
    );
  }
  if (removals.modules.length) {
    expectDeleted(
      "module",
      removals.modules,
      await tx.courseModule.deleteMany({
        where: {
          id: { in: idsOf(removals.modules) },
          courseId: { in: courseIds },
        },
      }),
    );
  }

  // 2. Modules
  const movingModules = plan.modules.update.filter((row) =>
    row.fields.includes("position"),
  );
  for (const row of movingModules) {
    await tx.courseModule.update({
      where: { id: row.id },
      data: { position: tempPosition() },
    });
  }
  for (const row of plan.modules.update) {
    await tx.courseModule.update({ where: { id: row.id }, data: row.data });
  }
  if (plan.modules.create.length) {
    await tx.courseModule.createMany({
      data: plan.modules.create.map((row) => ({ ...row, organizationId })),
    });
  }

  // 3. Materials
  for (const row of plan.materials.create) {
    await tx.material.create({
      data: {
        ...row,
        content: json(row.content),
        organizationId,
        createdByMembershipId: ownerMembershipId,
      },
    });
  }
  for (const row of plan.materials.update) {
    const { content, ...data } = row.data;
    await tx.material.update({
      where: { id: row.id },
      data: {
        ...data,
        ...(content !== undefined ? { content: json(content) } : {}),
      },
    });
  }

  // 4. Vocabulary sets and their entries
  for (const row of plan.vocabularySets.create) {
    await tx.vocabularySet.create({
      data: {
        ...row,
        organizationId,
        createdByMembershipId: ownerMembershipId,
      },
    });
  }
  for (const row of plan.vocabularySets.update) {
    await tx.vocabularySet.update({ where: { id: row.id }, data: row.data });
  }
  if (removals.entries.length) {
    expectDeleted(
      "vocabulary entry",
      removals.entries,
      await tx.vocabularyEntry.deleteMany({
        where: { id: { in: idsOf(removals.entries) }, organizationId },
      }),
    );
  }
  for (const row of plan.entries.update) {
    const { examples, ...data } = row.data;
    await tx.vocabularyEntry.update({
      where: { id: row.id },
      data: {
        ...data,
        ...(examples !== undefined ? { examples: json(examples) } : {}),
      },
    });
  }
  if (plan.entries.create.length) {
    await tx.vocabularyEntry.createMany({
      data: plan.entries.create.map((row) => ({
        ...row,
        organizationId,
        examples: json(row.examples),
      })),
    });
  }

  // 5. Quizzes, questions and options
  for (const row of plan.assessments.create) {
    await tx.assessment.create({
      data: {
        ...row,
        instructions: nullableJson(row.instructions),
        organizationId,
        createdByMembershipId: ownerMembershipId,
      },
    });
  }
  for (const row of plan.assessments.update) {
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
  if (removals.options.length) {
    expectDeleted(
      "option",
      removals.options,
      await tx.assessmentOption.deleteMany({
        where: { id: { in: idsOf(removals.options) } },
      }),
    );
  }
  if (removals.questions.length) {
    expectDeleted(
      "question",
      removals.questions,
      await tx.assessmentQuestion.deleteMany({
        where: { id: { in: idsOf(removals.questions) } },
      }),
    );
  }
  // Positions are unique per assessment and per question: park the rows that move, then write.
  for (const row of plan.questions.update.filter((row) =>
    row.fields.includes("position"),
  )) {
    await tx.assessmentQuestion.update({
      where: { id: row.id },
      data: { position: tempPosition() },
    });
  }
  for (const row of plan.questions.update) {
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
  if (plan.questions.create.length) {
    await tx.assessmentQuestion.createMany({
      data: plan.questions.create.map((row) => ({
        ...row,
        prompt: json(row.prompt),
        explanation: nullableJson(row.explanation),
      })),
    });
  }
  for (const row of plan.options.update.filter((row) =>
    row.fields.includes("position"),
  )) {
    await tx.assessmentOption.update({
      where: { id: row.id },
      data: { position: tempPosition() },
    });
  }
  for (const row of plan.options.update) {
    const { content, ...data } = row.data;
    await tx.assessmentOption.update({
      where: { id: row.id },
      data: {
        ...data,
        ...(content !== undefined ? { content: json(content) } : {}),
      },
    });
  }
  if (plan.options.create.length) {
    await tx.assessmentOption.createMany({
      data: plan.options.create.map((row) => ({
        ...row,
        content: json(row.content),
      })),
    });
  }

  // 6. Items
  const movingItems = plan.items.update.filter(
    (row) => row.fields.includes("position") || row.fields.includes("moduleId"),
  );
  for (const row of movingItems) {
    await tx.courseItem.update({
      where: { id: row.id },
      data: { position: tempPosition() },
    });
  }
  // Parked items carry their desired position in the update (see withParkedPositions).
  for (const row of plan.items.update) {
    await tx.courseItem.update({ where: { id: row.id }, data: row.data });
  }
  if (plan.items.create.length) {
    await tx.courseItem.createMany({
      data: plan.items.create.map((row) => ({ ...row, organizationId })),
    });
  }

  // 7. Stale `pb-` resources, now that no item places them (questions, options and entries cascade).
  const ownedPola = { organizationId, id: { startsWith: ID_PREFIX } };
  if (removals.materials.length) {
    expectDeleted(
      "material",
      removals.materials,
      await tx.material.deleteMany({
        where: {
          ...ownedPola,
          id: { ...ownedPola.id, in: idsOf(removals.materials) },
        },
      }),
    );
  }
  if (removals.vocabularySets.length) {
    expectDeleted(
      "vocabulary set",
      removals.vocabularySets,
      await tx.vocabularySet.deleteMany({
        where: {
          ...ownedPola,
          id: { ...ownedPola.id, in: idsOf(removals.vocabularySets) },
        },
      }),
    );
  }
  if (removals.assessments.length) {
    expectDeleted(
      "quiz",
      removals.assessments,
      await tx.assessment.deleteMany({
        where: {
          ...ownedPola,
          id: { ...ownedPola.id, in: idsOf(removals.assessments) },
        },
      }),
    );
  }
}

/**
 * An item that changes module keeps its position number, so its update has no position; but writePlan parks every
 * moving item, so give those updates the item's desired position too.
 */
function withParkedPositions(
  plan: ImportPlan,
  courses: DesiredCourse[],
): ImportPlan {
  const position = new Map(
    courses.flatMap((course) =>
      course.modules.flatMap((row) =>
        row.items.map((item) => [item.id, item.position] as const),
      ),
    ),
  );
  return {
    ...plan,
    items: {
      ...plan.items,
      update: plan.items.update.map((row) =>
        row.fields.includes("moduleId") && !row.fields.includes("position")
          ? { ...row, data: { ...row.data, position: position.get(row.id)! } }
          : row,
      ),
    },
  };
}

// ---------------------------------------------------------------- enrollment (rollout only, opt-in)

/**
 * Gives every user who is not deleted a FOUNDATION enrollment in the default cohort of each course, in batches.
 * Existing enrollments (any source or status) are left as they are. Only runs with --enroll-existing.
 */
async function enrollExisting(
  db: PrismaClient,
  courses: DesiredCourse[],
  execute: boolean,
) {
  const users = await db.user.count({ where: { deletedAt: null } });
  console.log(`\nEnroll existing users (${users} users)`);
  for (const course of courses) {
    const row = await db.course.findUnique({
      where: { id: course.id },
      select: { status: true },
    });
    const cohort = await db.cohort.findUnique({
      where: { defaultForCourseId: course.id },
      select: { id: true },
    });
    const missing = cohort
      ? await db.user.count({
          where: {
            deletedAt: null,
            cohortEnrollments: { none: { cohortId: cohort.id } },
          },
        })
      : users;
    if (!execute) {
      console.log(
        `  ${course.id.padEnd(16)} ${missing} to enroll${row ? "" : " (after the course is created)"}`,
      );
      continue;
    }
    if (row?.status !== "PUBLISHED") {
      throw new Error(`${course.id} is not published; not enrolling.`);
    }
    const { id: cohortId } = await ensureDefaultCohort(db, course.id);
    let created = 0;
    let cursor: string | undefined;
    for (;;) {
      const batch = await db.user.findMany({
        where: { deletedAt: null },
        select: { id: true },
        orderBy: { id: "asc" },
        take: ENROLL_BATCH_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      if (!batch.length) break;
      const result = await db.cohortEnrollment.createMany({
        data: batch.map((user) => ({
          cohortId,
          userId: user.id,
          source: "FOUNDATION" as const,
          status: "ACTIVE" as const,
        })),
        skipDuplicates: true,
      });
      created += result.count;
      cursor = batch[batch.length - 1]!.id;
    }
    console.log(`  ${course.id.padEnd(16)} ${created} enrolled`);
  }
}

// ---------------------------------------------------------------- main

export async function runImport(input: {
  db: PrismaClient;
  execute: boolean;
  enrollExisting: boolean;
  verbose: boolean;
}) {
  const { db } = input;
  const validation = await validatePolaContent();
  printValidation(validation, { verbose: input.verbose });
  if (validation.errors.length) {
    console.error("\nFix the content errors above before importing.");
    return 1;
  }
  const desired: Desired = validation.result;
  const courseIds = desired.courses.map((row) => row.id);

  const plan = withParkedPositions(await planFor(db, desired), desired.courses);
  printPlan(plan, input.verbose);
  if (plan.errors.length) {
    console.error("\nCannot import:");
    for (const error of plan.errors) console.error(`  - ${error}`);
    return 1;
  }
  const changes = planHasChanges(plan);

  if (!input.execute) {
    if (input.enrollExisting) await enrollExisting(db, desired.courses, false);
    console.log(
      changes || input.enrollExisting
        ? "\nDry run: nothing written. Add --execute to apply."
        : "\nEverything is unchanged.",
    );
    return 0;
  }

  if (changes) {
    const owner = await db.organizationMember.findFirst({
      where: { organizationId: HAKGYO_SYSTEM_ORGANIZATION_ID, role: "OWNER" },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (!owner) {
      throw new Error(
        "The system organization has no owner membership (run db:seed).",
      );
    }
    await db.$transaction(
      (tx) => writePlan(tx, plan, courseIds, owner.id),
      TX_OPTIONS,
    );
    const after = await planFor(db, desired);
    if (planHasChanges(after) || after.errors.length) {
      console.error(
        "\nThe database still differs from the content after the import:",
      );
      printPlan(after, true);
      for (const error of after.errors) console.error(`  - ${error}`);
      return 1;
    }
    console.log("\nImported; a second run would change nothing.");
  } else {
    console.log("\nCourses and materials are unchanged.");
  }

  if (input.enrollExisting) await enrollExisting(db, desired.courses, true);
  return 0;
}

async function main() {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    strict: true,
    options: {
      execute: { type: "boolean", default: false },
      "enroll-existing": { type: "boolean", default: false },
      verbose: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  });
  if (values.help) {
    usage();
    return 0;
  }
  const { db, host } = connectDb();
  console.log(`Database: ${host}${values.execute ? "" : " (dry run)"}\n`);
  try {
    return await runImport({
      db,
      execute: values.execute,
      enrollExisting: values["enroll-existing"],
      verbose: values.verbose,
    });
  } finally {
    await db.$disconnect();
  }
}

if (import.meta.main) process.exit(await main());
