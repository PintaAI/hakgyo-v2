import "dotenv/config";

import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

import { PrismaNeon } from "@prisma/adapter-neon";

import { Prisma, PrismaClient } from "../../generated/prisma/client";
import {
  hrdkManifestSchema,
  hrdkReportSchema,
  type HrdkLesson,
  type HrdkManifest,
} from "../../src/lib/hrdk-content/schema";

function usage() {
  console.log(`
Import a reviewed HRDK manifest into Hakgyo.

Usage:
  bun run content:import-hrdk -- manifest.json --organization <id-or-slug> [options]

Options:
  --organization <value>  Target organization ID or slug (required)
  --owner-email <email>   Membership used as course/content owner
  --allow-warnings        Import even when the extraction report has warnings
  --dry-run               Validate and print the import plan without database writes
  --help                  Show this help
`);
}

function stablePrefix(organizationId: string, courseSlug: string) {
  const organizationHash = createHash("sha1")
    .update(organizationId)
    .digest("hex")
    .slice(0, 8);
  return `hrdk-${organizationHash}-${courseSlug}`;
}

function lessonKey(prefix: string, lesson: HrdkLesson) {
  return `${prefix}-l${String(lesson.number).padStart(3, "0")}`;
}

function paragraph(content: string) {
  return { type: "paragraph", content };
}

function heading(content: string, level: 1 | 2 | 3 = 2) {
  return { type: "heading", props: { level }, content };
}

function lessonDocument(lesson: HrdkLesson) {
  return [
    heading(`${lesson.number}. ${lesson.title}`, 1),
    ...lesson.sections.flatMap((section) => [
      heading(section.title, 2),
      ...section.lines.map(paragraph),
    ]),
  ] as Prisma.InputJsonValue;
}

function textDocument(content: string) {
  return [paragraph(content)] as Prisma.InputJsonValue;
}

async function readOptionalReport(manifestPath: string) {
  const reportPath = manifestPath.replace(/\.json$/i, ".report.json");
  try {
    await access(reportPath);
  } catch {
    return null;
  }
  return hrdkReportSchema.parse(JSON.parse(await readFile(reportPath, "utf8")));
}

async function importLesson(input: {
  db: PrismaClient;
  manifest: HrdkManifest;
  lesson: HrdkLesson;
  prefix: string;
  courseId: string;
  organizationId: string;
  ownerMembershipId: string;
  position: number;
}) {
  const {
    db,
    manifest,
    lesson,
    prefix,
    courseId,
    organizationId,
    ownerMembershipId,
    position,
  } = input;
  const key = lessonKey(prefix, lesson);
  const published = manifest.course.status === "PUBLISHED";
  const courseModule = await db.courseModule.upsert({
    where: { id: `${key}-module` },
    update: {
      title: `${lesson.number}. ${lesson.title}`,
      description: `Materi sumber halaman ${lesson.pageStart}-${lesson.pageEnd}.`,
      position,
    },
    create: {
      id: `${key}-module`,
      courseId,
      organizationId,
      title: `${lesson.number}. ${lesson.title}`,
      description: `Materi sumber halaman ${lesson.pageStart}-${lesson.pageEnd}.`,
      position,
    },
  });

  const material = await db.material.upsert({
    where: { id: `${key}-material` },
    update: {
      title: `Materi ${lesson.number}: ${lesson.title}`,
      description: `Materi teks bab ${lesson.number}, halaman ${lesson.pageStart}-${lesson.pageEnd}.`,
      content: lessonDocument(lesson),
      editorSchemaVersion: 2,
    },
    create: {
      id: `${key}-material`,
      organizationId,
      createdByMembershipId: ownerMembershipId,
      title: `Materi ${lesson.number}: ${lesson.title}`,
      description: `Materi teks bab ${lesson.number}, halaman ${lesson.pageStart}-${lesson.pageEnd}.`,
      content: lessonDocument(lesson),
      editorSchemaVersion: 2,
    },
  });

  const vocabulary = await db.vocabularySet.upsert({
    where: { id: `${key}-vocabulary` },
    update: {
      title: `Kosakata ${lesson.number}: ${lesson.title}`,
      description: `${lesson.vocabulary.length} kosakata hasil ekstraksi halaman ${lesson.pageStart}-${lesson.pageEnd}.`,
    },
    create: {
      id: `${key}-vocabulary`,
      organizationId,
      createdByMembershipId: ownerMembershipId,
      title: `Kosakata ${lesson.number}: ${lesson.title}`,
      description: `${lesson.vocabulary.length} kosakata hasil ekstraksi halaman ${lesson.pageStart}-${lesson.pageEnd}.`,
    },
  });

  for (const [entryIndex, entry] of lesson.vocabulary.entries()) {
    const entryId = `${key}-vocab-${String(entryIndex + 1).padStart(3, "0")}`;
    await db.vocabularyEntry.upsert({
      where: { id: entryId },
      update: {
        term: entry.term,
        definition: entry.definition,
        examples: entry.examples,
        metadata: {
          source: "HRDK textbook",
          sourceFile: manifest.source.fileName,
          sourcePage: entry.sourcePage,
          sourceSha256: manifest.source.sha256,
        },
      },
      create: {
        id: entryId,
        vocabularySetId: vocabulary.id,
        organizationId,
        term: entry.term,
        definition: entry.definition,
        examples: entry.examples,
        metadata: {
          source: "HRDK textbook",
          sourceFile: manifest.source.fileName,
          sourcePage: entry.sourcePage,
          sourceSha256: manifest.source.sha256,
        },
      },
    });
  }

  const assessment = await db.assessment.upsert({
    where: { id: `${key}-assessment` },
    update: {
      title: `Latihan ${lesson.number}: ${lesson.title}`,
      description:
        "Latihan pilihan ganda yang dibuat dari kosakata terverifikasi pada bab ini.",
      status: published && lesson.assessment.length ? "PUBLISHED" : "DRAFT",
      instructions: textDocument("Pilih satu arti yang paling tepat."),
      passingScore: 70,
      maxAttempts: 3,
      editorSchemaVersion: 2,
      publishedAt: published && lesson.assessment.length ? new Date() : null,
    },
    create: {
      id: `${key}-assessment`,
      organizationId,
      createdByMembershipId: ownerMembershipId,
      title: `Latihan ${lesson.number}: ${lesson.title}`,
      description:
        "Latihan pilihan ganda yang dibuat dari kosakata terverifikasi pada bab ini.",
      status: published && lesson.assessment.length ? "PUBLISHED" : "DRAFT",
      instructions: textDocument("Pilih satu arti yang paling tepat."),
      passingScore: 70,
      maxAttempts: 3,
      editorSchemaVersion: 2,
      publishedAt: published && lesson.assessment.length ? new Date() : null,
    },
  });

  for (const [questionIndex, question] of lesson.assessment.entries()) {
    const questionId = `${key}-question-${String(questionIndex + 1).padStart(3, "0")}`;
    const assessmentQuestion = await db.assessmentQuestion.upsert({
      where: { id: questionId },
      update: {
        type: question.type,
        prompt: textDocument(question.prompt),
        explanation: question.explanation
          ? textDocument(question.explanation)
          : Prisma.JsonNull,
        points: question.points,
        position: questionIndex + 1,
      },
      create: {
        id: questionId,
        assessmentId: assessment.id,
        type: question.type,
        prompt: textDocument(question.prompt),
        explanation: question.explanation
          ? textDocument(question.explanation)
          : Prisma.JsonNull,
        points: question.points,
        position: questionIndex + 1,
      },
    });
    for (const [optionIndex, option] of question.options.entries()) {
      const optionId = `${questionId}-option-${optionIndex + 1}`;
      await db.assessmentOption.upsert({
        where: { id: optionId },
        update: {
          content: textDocument(option.content),
          isCorrect: option.isCorrect,
          position: optionIndex + 1,
        },
        create: {
          id: optionId,
          questionId: assessmentQuestion.id,
          content: textDocument(option.content),
          isCorrect: option.isCorrect,
          position: optionIndex + 1,
        },
      });
    }
  }

  const itemInputs = [
    {
      id: `${key}-item-material`,
      type: "MATERIAL" as const,
      position: 1,
      materialId: material.id,
      vocabularySetId: null,
      assessmentId: null,
      isPublished: published,
    },
    {
      id: `${key}-item-vocabulary`,
      type: "VOCABULARY_SET" as const,
      position: 2,
      materialId: null,
      vocabularySetId: vocabulary.id,
      assessmentId: null,
      isPublished: published,
    },
    ...(lesson.assessment.length
      ? [
          {
            id: `${key}-item-assessment`,
            type: "ASSESSMENT" as const,
            position: 3,
            materialId: null,
            vocabularySetId: null,
            assessmentId: assessment.id,
            isPublished: published,
          },
        ]
      : []),
  ];
  for (const item of itemInputs) {
    await db.courseItem.upsert({
      where: { id: item.id },
      update: { ...item, moduleId: courseModule.id },
      create: {
        ...item,
        moduleId: courseModule.id,
        organizationId,
      },
    });
  }
}

async function main() {
  const { values, positionals } = parseArgs({
    args: Bun.argv.slice(2),
    allowPositionals: true,
    strict: true,
    options: {
      organization: { type: "string" },
      "owner-email": { type: "string" },
      "allow-warnings": { type: "boolean", default: false },
      "dry-run": { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  });
  if (values.help) {
    usage();
    return;
  }
  const input = positionals[0];
  if (!input || !values.organization) {
    usage();
    throw new Error("Manifest path and --organization are required.");
  }
  const manifestPath = resolve(input);
  const manifest = hrdkManifestSchema.parse(
    JSON.parse(await readFile(manifestPath, "utf8")),
  );
  const report = await readOptionalReport(manifestPath);
  if (report && !report.valid) {
    throw new Error(
      "Extraction report contains errors. Fix them before import.",
    );
  }
  if (report?.issues.length && !values["allow-warnings"]) {
    throw new Error(
      `Extraction report contains ${report.issues.length} issue(s). Review it, then rerun with --allow-warnings.`,
    );
  }

  const plan = {
    course: manifest.course.title,
    lessons: manifest.lessons.length,
    materials: manifest.lessons.length,
    vocabularyEntries: manifest.lessons.reduce(
      (total, lesson) => total + lesson.vocabulary.length,
      0,
    ),
    assessments: manifest.lessons.filter((lesson) => lesson.assessment.length)
      .length,
    questions: manifest.lessons.reduce(
      (total, lesson) => total + lesson.assessment.length,
      0,
    ),
  };
  if (values["dry-run"]) {
    console.log(JSON.stringify(plan, null, 2));
    return;
  }

  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DIRECT_URL or DATABASE_URL is required for import.");
  }
  const db = new PrismaClient({
    adapter: new PrismaNeon({ connectionString }),
  });
  try {
    const organization = await db.organization.findFirst({
      where: {
        OR: [{ id: values.organization }, { slug: values.organization }],
      },
      select: { id: true },
    });
    if (!organization) throw new Error("Target organization was not found.");

    const ownerMembership = await db.organizationMember.findFirst({
      where: {
        organizationId: organization.id,
        ...(values["owner-email"]
          ? { user: { email: values["owner-email"] } }
          : { role: "OWNER" }),
      },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (!ownerMembership) {
      throw new Error("A matching organization membership was not found.");
    }

    const prefix = stablePrefix(organization.id, manifest.course.slug);
    const course = await db.course.upsert({
      where: {
        organizationId_slug: {
          organizationId: organization.id,
          slug: manifest.course.slug,
        },
      },
      update: {
        ownerMembershipId: ownerMembership.id,
        title: manifest.course.title,
        description: manifest.course.description,
        status: manifest.course.status,
        enrollmentMode: "OPEN",
        price: 0,
        progressionMode: "SEQUENTIAL",
      },
      create: {
        id: `${prefix}-course`,
        organizationId: organization.id,
        ownerMembershipId: ownerMembership.id,
        slug: manifest.course.slug,
        title: manifest.course.title,
        description: manifest.course.description,
        status: manifest.course.status,
        enrollmentMode: "OPEN",
        price: 0,
        progressionMode: "SEQUENTIAL",
      },
    });

    for (const [lessonIndex, lesson] of manifest.lessons.entries()) {
      await importLesson({
        db,
        manifest,
        lesson,
        prefix,
        courseId: course.id,
        organizationId: organization.id,
        ownerMembershipId: ownerMembership.id,
        position: lessonIndex + 1,
      });
      console.log(`Imported lesson ${lesson.number}: ${lesson.title}`);
    }
    console.log(JSON.stringify({ ...plan, courseId: course.id }, null, 2));
  } finally {
    await db.$disconnect();
  }
}

await main();
