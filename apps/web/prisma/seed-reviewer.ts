import "dotenv/config";

import { PrismaNeon } from "@prisma/adapter-neon";
import { hashPassword } from "better-auth/crypto";

import { Prisma, PrismaClient } from "../generated/prisma/client";
import { upsertDefaultCohortEnrollment } from "../src/server/enrollment/default-cohort";

/**
 * Seeds the account OpenAI reviewers use to test the ChatGPT plugin (see
 * docs/chatgpt-plugin-submission.md). Safe to re-run: every row has a fixed id
 * and is upserted, and re-running resets the password and the review queue.
 *
 *   REVIEWER_PASSWORD='...' bun run --cwd apps/web db:seed:reviewer
 */

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DIRECT_URL or DATABASE_URL is required to seed reviewers");
}

const password = process.env.REVIEWER_PASSWORD;
if (!password || password.length < 12) {
  throw new Error("Set REVIEWER_PASSWORD to at least 12 characters");
}

const db = new PrismaClient({
  adapter: new PrismaNeon({ connectionString }),
});

const reviewerEmail = "reviewer@hakgyo.id";

function paragraph(id: string, text: string) {
  return {
    id,
    type: "paragraph",
    props: {},
    content: [{ type: "text", text, styles: {} }],
    children: [],
  };
}

function heading(id: string, text: string) {
  return {
    id,
    type: "heading",
    props: { level: 2 },
    content: [{ type: "text", text, styles: {} }],
    children: [],
  };
}

async function upsertUser(input: {
  id: string;
  email: string;
  name: string;
  password?: string;
}) {
  const user = await db.user.upsert({
    where: { id: input.id },
    update: { email: input.email, emailVerified: true, name: input.name },
    create: {
      id: input.id,
      email: input.email,
      emailVerified: true,
      name: input.name,
    },
  });
  if (!input.password) return user;

  const hashedPassword = await hashPassword(input.password);
  await db.account.upsert({
    where: { id: `reviewer-account-${input.id}` },
    update: { password: hashedPassword },
    create: {
      id: `reviewer-account-${input.id}`,
      issuer: "local:credential",
      accountId: user.id,
      providerId: "credential",
      userId: user.id,
      password: hashedPassword,
    },
  });
  return user;
}

async function main() {
  const reviewer = await upsertUser({
    id: "reviewer-user",
    email: reviewerEmail,
    name: "Hakgyo Reviewer",
    password,
  });
  // Learner whose Tugas answers wait in the review queue. No credentials: the
  // account exists only to own sample data.
  const learner = await upsertUser({
    id: "reviewer-demo-learner",
    email: "demo-learner@hakgyo.id",
    name: "Dewi Lestari",
  });

  const organization = await db.organization.upsert({
    where: { id: "reviewer-org" },
    update: { name: "Hakgyo Demo", slug: "hakgyo-demo" },
    create: {
      id: "reviewer-org",
      name: "Hakgyo Demo",
      slug: "hakgyo-demo",
      defaultEnrollmentMode: "INVITE_ONLY",
    },
  });
  const membership = await db.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: reviewer.id,
      },
    },
    update: { role: "OWNER" },
    create: {
      id: "reviewer-membership",
      organizationId: organization.id,
      userId: reviewer.id,
      role: "OWNER",
    },
  });
  const orgRef = {
    organizationId: organization.id,
    createdByMembershipId: membership.id,
  };

  const course = await db.course.upsert({
    where: { id: "reviewer-course-basics" },
    update: {
      title: "Korean Basics 1",
      slug: "korean-basics-1",
      status: "PUBLISHED",
    },
    create: {
      id: "reviewer-course-basics",
      organizationId: organization.id,
      ownerMembershipId: membership.id,
      title: "Korean Basics 1",
      slug: "korean-basics-1",
      description:
        "Hangeul, sapaan dan perkenalan diri untuk pemula bahasa Korea.",
      enrollmentMode: "INVITE_ONLY",
      price: 0,
      progressionMode: "OPEN",
      status: "PUBLISHED",
    },
  });
  const practiceCourse = await db.course.upsert({
    where: { id: "reviewer-course-practice" },
    update: {
      title: "Korean Conversation Practice",
      slug: "korean-conversation-practice",
      status: "PUBLISHED",
    },
    create: {
      id: "reviewer-course-practice",
      organizationId: organization.id,
      ownerMembershipId: membership.id,
      title: "Korean Conversation Practice",
      slug: "korean-conversation-practice",
      description: "Latihan percakapan singkat untuk dipelajari sendiri.",
      enrollmentMode: "INVITE_ONLY",
      price: 0,
      progressionMode: "OPEN",
      status: "PUBLISHED",
    },
  });

  const modules = [
    {
      id: "reviewer-module-hangeul",
      courseId: course.id,
      title: "Mengenal Hangeul",
      description: "Konsonan, vokal dan blok suku kata.",
      position: 1,
    },
    {
      id: "reviewer-module-intro",
      courseId: course.id,
      title: "Perkenalan Diri",
      description: "Menyebut nama dan asal dengan sopan.",
      position: 2,
    },
    {
      id: "reviewer-module-practice",
      courseId: practiceCourse.id,
      title: "Di Kafe",
      description: "Memesan minuman dalam bahasa Korea.",
      position: 1,
    },
  ];
  for (const { id, ...data } of modules) {
    await db.courseModule.upsert({
      where: { id },
      update: data,
      create: { id, ...data, organizationId: organization.id },
    });
  }

  const materials = [
    {
      id: "reviewer-material-hangeul",
      title: "Struktur Hangeul",
      description: "Bagaimana konsonan dan vokal membentuk satu suku kata.",
      content: [
        heading("reviewer-block-hangeul-1", "Satu blok, satu suku kata"),
        paragraph(
          "reviewer-block-hangeul-2",
          "Setiap suku kata Hangeul ditulis dalam satu blok: konsonan awal, vokal, dan kadang konsonan akhir. Contoh: ㅎ + ㅏ + ㄴ = 한.",
        ),
      ],
    },
    {
      id: "reviewer-material-cafe",
      title: "Memesan di Kafe",
      description: "Ungkapan untuk memesan minuman.",
      content: [
        heading("reviewer-block-cafe-1", "Ungkapan penting"),
        paragraph(
          "reviewer-block-cafe-2",
          "아메리카노 한 잔 주세요. (Tolong satu gelas americano.) 얼마예요? (Berapa harganya?)",
        ),
      ],
    },
  ];
  for (const { id, ...data } of materials) {
    await db.material.upsert({
      where: { id },
      update: data,
      create: { id, ...data, ...orgRef },
    });
  }

  const vocabularySet = await db.vocabularySet.upsert({
    where: { id: "reviewer-vocabulary-intro" },
    update: { title: "Kosakata Perkenalan" },
    create: {
      id: "reviewer-vocabulary-intro",
      ...orgRef,
      title: "Kosakata Perkenalan",
      description: "Kata yang dipakai saat memperkenalkan diri.",
    },
  });
  const entries = [
    ["reviewer-vocab-ireum", "이름", "Nama", "제 이름은 데위예요."],
    ["reviewer-vocab-saram", "사람", "Orang", "저는 인도네시아 사람이에요."],
    ["reviewer-vocab-hakseng", "학생", "Pelajar", "저는 학생이에요."],
    [
      "reviewer-vocab-bangapseumnida",
      "반갑습니다",
      "Senang bertemu",
      "만나서 반갑습니다.",
    ],
  ] as const;
  for (const [id, term, definition, example] of entries) {
    await db.vocabularyEntry.upsert({
      where: { id },
      update: { term, definition, examples: [example] },
      create: {
        id,
        organizationId: organization.id,
        vocabularySetId: vocabularySet.id,
        term,
        definition,
        examples: [example],
      },
    });
  }

  const assessments = [
    {
      id: "reviewer-assessment-intro",
      title: "Tugas Perkenalan Diri",
      description: "Tulis perkenalan diri singkat dalam bahasa Korea.",
      prompt: "Perkenalkan dirimu dalam 2-3 kalimat bahasa Korea.",
    },
    {
      id: "reviewer-assessment-cafe",
      title: "Tugas Memesan Minuman",
      description: "Latihan menulis pesanan di kafe.",
      prompt: "Tulis kalimat untuk memesan dua gelas teh.",
    },
  ];
  for (const { id, prompt, ...data } of assessments) {
    await db.assessment.upsert({
      where: { id },
      update: data,
      create: { id, ...data, ...orgRef, passingScore: 70, maxAttempts: 3 },
    });
    await db.assessmentQuestion.upsert({
      where: { id: `${id}-question` },
      update: { prompt: { text: prompt } },
      create: {
        id: `${id}-question`,
        assessmentId: id,
        type: "WRITTEN",
        prompt: { text: prompt },
        points: 10,
        position: 1,
      },
    });
  }

  const items = [
    [
      "reviewer-item-hangeul",
      "reviewer-module-hangeul",
      1,
      { type: "MATERIAL", materialId: "reviewer-material-hangeul" },
    ],
    [
      "reviewer-item-vocabulary",
      "reviewer-module-intro",
      1,
      { type: "VOCABULARY_SET", vocabularySetId: vocabularySet.id },
    ],
    [
      "reviewer-item-intro-tugas",
      "reviewer-module-intro",
      2,
      { type: "ASSESSMENT", assessmentId: "reviewer-assessment-intro" },
    ],
    [
      "reviewer-item-cafe",
      "reviewer-module-practice",
      1,
      { type: "MATERIAL", materialId: "reviewer-material-cafe" },
    ],
    [
      "reviewer-item-cafe-tugas",
      "reviewer-module-practice",
      2,
      { type: "ASSESSMENT", assessmentId: "reviewer-assessment-cafe" },
    ],
  ] as const;
  for (const [id, moduleId, position, content] of items) {
    const data = { moduleId, position, isPublished: true, ...content };
    await db.courseItem.upsert({
      where: { id },
      update: data,
      create: { id, organizationId: organization.id, ...data },
    });
  }

  const cohort = await db.cohort.upsert({
    where: { id: "reviewer-cohort" },
    update: { name: "Kelas Oktober 2026", status: "OPEN" },
    create: {
      id: "reviewer-cohort",
      courseId: course.id,
      organizationId: organization.id,
      name: "Kelas Oktober 2026",
      description: "Group belajar contoh untuk review.",
      status: "OPEN",
      capacity: 20,
      startsAt: new Date("2026-10-01T12:00:00.000Z"),
      endsAt: new Date("2026-12-20T12:00:00.000Z"),
    },
  });
  await db.cohortStaff.upsert({
    where: {
      cohortId_organizationMemberId: {
        cohortId: cohort.id,
        organizationMemberId: membership.id,
      },
    },
    update: { role: "INSTRUCTOR" },
    create: {
      id: "reviewer-cohort-staff",
      cohortId: cohort.id,
      organizationId: organization.id,
      organizationMemberId: membership.id,
      role: "INSTRUCTOR",
    },
  });

  await db.courseEnrollment.upsert({
    where: { courseId_userId: { courseId: course.id, userId: learner.id } },
    update: { status: "ACTIVE" },
    create: {
      id: "reviewer-enrollment-learner",
      courseId: course.id,
      userId: learner.id,
      source: "MANUAL",
      status: "ACTIVE",
    },
  });
  await db.cohortEnrollment.upsert({
    where: { cohortId_userId: { cohortId: cohort.id, userId: learner.id } },
    update: { status: "ACTIVE" },
    create: {
      id: "reviewer-cohort-enrollment-learner",
      cohortId: cohort.id,
      userId: learner.id,
      source: "MANUAL",
      status: "ACTIVE",
    },
  });
  // The reviewer also studies the practice course, so learner tools have data.
  await upsertDefaultCohortEnrollment(db, {
    courseId: practiceCourse.id,
    userId: reviewer.id,
    create: { source: "MANUAL", status: "ACTIVE" },
    update: { status: "ACTIVE" },
  });

  // Reset the learner's attempt to "waiting for review" on every run, since a
  // reviewer may grade it.
  const submittedAt = new Date("2026-10-06T09:15:00.000Z");
  const attempt = await db.assessmentAttempt.upsert({
    where: { id: "reviewer-attempt-learner" },
    update: { status: "IN_REVIEW", score: null, gradedAt: null, submittedAt },
    create: {
      id: "reviewer-attempt-learner",
      assessmentId: "reviewer-assessment-intro",
      courseItemId: "reviewer-item-intro-tugas",
      organizationId: organization.id,
      cohortId: cohort.id,
      userId: learner.id,
      attemptNumber: 1,
      status: "IN_REVIEW",
      maxScore: 10,
      startedAt: new Date("2026-10-06T09:00:00.000Z"),
      submittedAt,
    },
  });
  const answer = {
    content: "안녕하세요. 제 이름은 데위예요. 저는 인도네시아 사람이에요.",
    manualScore: null,
    reviewedByMembershipId: null,
    reviewedAt: null,
  };
  await db.assessmentAnswer.upsert({
    where: { id: "reviewer-answer-learner" },
    update: { ...answer, feedback: Prisma.DbNull },
    create: {
      id: "reviewer-answer-learner",
      attemptId: attempt.id,
      organizationId: organization.id,
      questionId: "reviewer-assessment-intro-question",
      ...answer,
    },
  });

  console.info(`Reviewer seed complete: ${reviewerEmail} owns Hakgyo Demo`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
