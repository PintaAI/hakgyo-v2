// Imports the two Pola Bahasa courses from ./content into the database in apps/web/.env (DIRECT_URL), in the
// Hakgyo system organization: courses, modules, materials, and each material's quiz (an assessment placed as a
// published ASSESSMENT item right after the material's item).
//
//   bun run --cwd apps/web pola:import [--execute] [--enroll-existing] [--verbose]
//
// Without --execute it validates the content, reads the database and prints what would change, writing nothing.
// Rows have stable ids derived from the manifest keys (./ids.ts) and only differing fields are written, so a second
// run reports everything unchanged. --enroll-existing also gives every existing user a FOUNDATION enrollment in
// both courses (new users get one at sign-up, see src/server/foundation/enrollment.ts).
import { parseArgs } from "node:util";

import { Prisma, type PrismaClient } from "../../generated/prisma/client";
import { ensureDefaultCohort } from "../../src/server/enrollment/default-cohort";
import { HAKGYO_SYSTEM_ORGANIZATION_ID } from "../../src/server/foundation/constants";
import { connectDb } from "../hangeul-mastery/services";

import type {
  DesiredAssessment,
  DesiredCourse,
  DesiredMaterial,
} from "./curriculum";
import {
  planHasChanges,
  planImport,
  type ImportPlan,
  type ModelPlan,
  type Snapshot,
} from "./plan";
import { printValidation, validatePolaContent } from "./validate";

// One transaction for the whole import: it lands completely or not at all.
const TX_OPTIONS = { maxWait: 30_000, timeout: 300_000 };
const ENROLL_BATCH_SIZE = 500;

function usage() {
  console.log(`Import the Pola Bahasa courses (Korea → Indo, Indo → Korea).

Usage: bun run --cwd apps/web pola:import [options]

  --execute          write the changes (default: dry run)
  --enroll-existing  also give every existing user a FOUNDATION enrollment in both courses
  --verbose          list every created and updated row, and the sections nothing links to`);
}

// ---------------------------------------------------------------- snapshot

async function loadSnapshot(
  db: PrismaClient,
  courses: DesiredCourse[],
  materials: DesiredMaterial[],
  assessments: DesiredAssessment[],
): Promise<Snapshot> {
  const organizationId = HAKGYO_SYSTEM_ORGANIZATION_ID;
  const courseIds = courses.map((row) => row.id);
  const modules = courses.flatMap((row) => row.modules);
  const items = modules.flatMap((row) => row.items);
  const questions = assessments.flatMap((row) => row.questions);
  const assessmentIds = assessments.map((row) => row.id);
  const [
    courseRows,
    moduleRows,
    itemRows,
    materialRows,
    assessmentRows,
    questionRows,
  ] = await Promise.all([
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
        enrollmentMode: true,
        price: true,
      },
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
        assessmentId: true,
        isPublished: true,
        module: { select: { courseId: true } },
      },
    }),
    db.material.findMany({
      where: { id: { in: materials.map((row) => row.id) } },
      select: {
        id: true,
        organizationId: true,
        title: true,
        description: true,
        content: true,
        editorSchemaVersion: true,
      },
    }),
    db.assessment.findMany({
      where: { id: { in: assessmentIds } },
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
      },
    }),
    db.assessmentQuestion.findMany({
      where: {
        OR: [
          { assessmentId: { in: assessmentIds } },
          { id: { in: questions.map((row) => row.id) } },
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
  ]);
  const optionRows = await db.assessmentOption.findMany({
    where: {
      OR: [
        { questionId: { in: questionRows.map((row) => row.id) } },
        {
          id: {
            in: questions.flatMap((row) =>
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
  return {
    organizationId,
    courses: courseRows,
    modules: moduleRows,
    items: itemRows.map(({ module, ...row }) => ({
      ...row,
      courseId: module.courseId,
    })),
    materials: materialRows,
    assessments: assessmentRows,
    questions: questionRows.map(({ _count, ...row }) => ({
      ...row,
      answerCount: _count.answers,
    })),
    options: optionRows.map(({ _count, ...row }) => ({
      ...row,
      selectionCount: _count.selections,
    })),
  };
}

// ---------------------------------------------------------------- report

function printPlan(plan: ImportPlan, verbose: boolean) {
  const line = <T>(name: string, model: ModelPlan<T>) => {
    const fields = new Map<string, number>();
    for (const update of model.update) {
      for (const field of update.fields)
        fields.set(field, (fields.get(field) ?? 0) + 1);
    }
    const fieldList = fields.size
      ? ` (${[...fields].map(([field, count]) => `${field} ${count}`).join(", ")})`
      : "";
    console.log(
      `  ${name.padEnd(10)} ${String(model.create.length).padStart(4)} create  ${String(model.update.length).padStart(4)} update  ${String(model.unchanged).padStart(4)} unchanged${fieldList}`,
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
  line("items", plan.items);
  line("quizzes", plan.assessments);
  line("questions", plan.questions);
  line("options", plan.options);
  // Removals are always listed: the import deletes these rows.
  const removals = [
    ...plan.questions.remove.map((row) => `question ${row.id}`),
    ...plan.options.remove.map((row) => `option ${row.id} of ${row.parentId}`),
  ];
  if (removals.length) {
    console.log(
      `\n  ${removals.length} quiz row(s) no longer in the content (no learner answers), deleted by the import:`,
    );
    for (const removal of removals) console.log(`      - ${removal}`);
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

async function writePlan(
  tx: Prisma.TransactionClient,
  plan: ImportPlan,
  ownerMembershipId: string,
) {
  const organizationId = HAKGYO_SYSTEM_ORGANIZATION_ID;

  for (const row of plan.courses.create) {
    await tx.course.create({
      data: { ...row, organizationId, ownerMembershipId },
    });
  }
  for (const row of plan.courses.update) {
    await tx.course.update({ where: { id: row.id }, data: row.data });
  }

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

  // Quizzes before the items that place them.
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
  // Rows the content no longer has (planImport refuses when any carries learner answers).
  if (plan.options.remove.length) {
    await tx.assessmentOption.deleteMany({
      where: { id: { in: plan.options.remove.map((row) => row.id) } },
    });
  }
  if (plan.questions.remove.length) {
    await tx.assessmentQuestion.deleteMany({
      where: { id: { in: plan.questions.remove.map((row) => row.id) } },
    });
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

// ---------------------------------------------------------------- enrollment

/**
 * Gives every user who is not deleted a FOUNDATION enrollment in the default cohort of each course, in batches.
 * Existing enrollments (any source or status) are left as they are.
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
  const { courses, materials, assessments } = validation.result;

  const plan = withParkedPositions(
    planImport(
      courses,
      materials,
      assessments,
      await loadSnapshot(db, courses, materials, assessments),
    ),
    courses,
  );
  printPlan(plan, input.verbose);
  if (plan.errors.length) {
    console.error("\nCannot import:");
    for (const error of plan.errors) console.error(`  - ${error}`);
    return 1;
  }
  const changes = planHasChanges(plan);

  if (!input.execute) {
    if (input.enrollExisting) await enrollExisting(db, courses, false);
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
    await db.$transaction((tx) => writePlan(tx, plan, owner.id), TX_OPTIONS);
    const after = planImport(
      courses,
      materials,
      assessments,
      await loadSnapshot(db, courses, materials, assessments),
    );
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

  if (input.enrollExisting) await enrollExisting(db, courses, true);
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
