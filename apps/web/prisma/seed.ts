import "dotenv/config";

import { PrismaNeon } from "@prisma/adapter-neon";
import { hashPassword } from "better-auth/crypto";

import { PrismaClient } from "../generated/prisma/client";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DIRECT_URL or DATABASE_URL is required to seed the database",
  );
}

const db = new PrismaClient({
  adapter: new PrismaNeon({ connectionString }),
});

const password = "Hakgyo123!";

async function upsertUser(input: { email: string; id: string; name: string }) {
  const user = await db.user.upsert({
    where: { email: input.email },
    update: {
      emailVerified: true,
      name: input.name,
    },
    create: {
      ...input,
      emailVerified: true,
    },
  });

  const hashedPassword = await hashPassword(password);
  const account = await db.account.findFirst({
    where: { providerId: "credential", accountId: user.id },
    select: { id: true },
  });

  if (account) {
    await db.account.update({
      where: { id: account.id },
      data: { password: hashedPassword },
    });
  } else {
    await db.account.create({
      data: {
        id: `seed-account-${input.id}`,
        accountId: user.id,
        providerId: "credential",
        userId: user.id,
        password: hashedPassword,
      },
    });
  }

  return user;
}

async function main() {
  const [owner, teacher, student] = await Promise.all([
    upsertUser({
      id: "seed-user-owner",
      name: "Nadia Pratama",
      email: "owner@hakgyo.test",
    }),
    upsertUser({
      id: "seed-user-teacher",
      name: "Bima Santoso",
      email: "teacher@hakgyo.test",
    }),
    upsertUser({
      id: "seed-user-student",
      name: "Sari Wulandari",
      email: "student@hakgyo.test",
    }),
  ]);

  const organization = await db.organization.upsert({
    where: { slug: "hakgyo-academy" },
    update: {
      defaultEnrollmentMode: "OPEN",
      name: "Hakgyo Academy",
    },
    create: {
      id: "seed-org-hakgyo",
      defaultEnrollmentMode: "OPEN",
      name: "Hakgyo Academy",
      slug: "hakgyo-academy",
    },
  });

  const ownerMembership = await db.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: owner.id,
      },
    },
    update: { role: "OWNER" },
    create: {
      id: "seed-member-owner",
      organizationId: organization.id,
      role: "OWNER",
      userId: owner.id,
    },
  });

  const teacherMembership = await db.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: teacher.id,
      },
    },
    update: { role: "TEACHER" },
    create: {
      id: "seed-member-teacher",
      organizationId: organization.id,
      role: "TEACHER",
      userId: teacher.id,
    },
  });

  const course = await db.course.upsert({
    where: {
      organizationId_slug: {
        organizationId: organization.id,
        slug: "bahasa-korea-dasar",
      },
    },
    update: {
      description: "Fondasi membaca Hangul dan percakapan sehari-hari.",
      enrollmentMode: "OPEN",
      price: 0,
      progressionMode: "SEQUENTIAL",
      status: "PUBLISHED",
      title: "Bahasa Korea Dasar",
    },
    create: {
      id: "seed-course-korean-basic",
      organizationId: organization.id,
      ownerMembershipId: ownerMembership.id,
      title: "Bahasa Korea Dasar",
      slug: "bahasa-korea-dasar",
      description: "Fondasi membaca Hangul dan percakapan sehari-hari.",
      enrollmentMode: "OPEN",
      price: 0,
      progressionMode: "SEQUENTIAL",
      status: "PUBLISHED",
    },
  });

  await db.course.upsert({
    where: {
      organizationId_slug: {
        organizationId: organization.id,
        slug: "persiapan-topik-i",
      },
    },
    update: { status: "DRAFT" },
    create: {
      id: "seed-course-topik-draft",
      organizationId: organization.id,
      ownerMembershipId: ownerMembership.id,
      title: "Persiapan TOPIK I",
      slug: "persiapan-topik-i",
      description: "Course draft untuk menguji filter publikasi.",
      enrollmentMode: "INVITE_ONLY",
      price: 250_000,
      status: "DRAFT",
    },
  });

  const moduleOne = await db.courseModule.upsert({
    where: { id: "seed-module-hangul" },
    update: {
      description: "Mengenal sistem tulisan Korea.",
      title: "Mengenal Hangul",
    },
    create: {
      id: "seed-module-hangul",
      courseId: course.id,
      organizationId: organization.id,
      title: "Mengenal Hangul",
      description: "Mengenal sistem tulisan Korea.",
      position: 1,
    },
  });

  const moduleTwo = await db.courseModule.upsert({
    where: { id: "seed-module-greetings" },
    update: {
      description: "Ungkapan yang sering dipakai sehari-hari.",
      title: "Sapaan Dasar",
    },
    create: {
      id: "seed-module-greetings",
      courseId: course.id,
      organizationId: organization.id,
      title: "Sapaan Dasar",
      description: "Ungkapan yang sering dipakai sehari-hari.",
      position: 2,
    },
  });

  const material = await db.material.upsert({
    where: { id: "seed-material-hangul-intro" },
    update: {
      content: [
        {
          id: "seed-block-hangul-update",
          type: "paragraph",
          props: {},
          content: [
            {
              type: "text",
              text: "Hangul dibuat agar mudah dipelajari oleh semua orang.",
              styles: {},
            },
          ],
          children: [],
        },
      ],
      title: "Sejarah Singkat Hangul",
    },
    create: {
      id: "seed-material-hangul-intro",
      organizationId: organization.id,
      createdByMembershipId: teacherMembership.id,
      title: "Sejarah Singkat Hangul",
      description: "Pengantar sebelum mulai membaca karakter Hangul.",
      content: [
        {
          id: "seed-block-hangul-create",
          type: "paragraph",
          props: {},
          content: [
            {
              type: "text",
              text: "Hangul dibuat agar mudah dipelajari oleh semua orang.",
              styles: {},
            },
          ],
          children: [],
        },
      ],
    },
  });

  const vocabulary = await db.vocabularySet.upsert({
    where: { id: "seed-vocabulary-greetings" },
    update: { title: "Sapaan Sehari-hari" },
    create: {
      id: "seed-vocabulary-greetings",
      organizationId: organization.id,
      createdByMembershipId: teacherMembership.id,
      title: "Sapaan Sehari-hari",
      description: "Kosakata awal untuk membuka percakapan.",
    },
  });

  const vocabularyEntries = [
    {
      id: "seed-vocab-annyeonghaseyo",
      position: 1,
      term: "안녕하세요",
      definition: "Halo (formal)",
      examples: ["안녕하세요, 만나서 반갑습니다."],
    },
    {
      id: "seed-vocab-gamsahamnida",
      position: 2,
      term: "감사합니다",
      definition: "Terima kasih",
      examples: ["도와주셔서 감사합니다."],
    },
    {
      id: "seed-vocab-annyeonghi-gaseyo",
      position: 3,
      term: "안녕히 가세요",
      definition: "Selamat jalan",
      examples: ["내일 만나요. 안녕히 가세요."],
    },
  ];

  for (const entry of vocabularyEntries) {
    await db.vocabularyEntry.upsert({
      where: { id: entry.id },
      update: entry,
      create: {
        ...entry,
        organizationId: organization.id,
        vocabularySetId: vocabulary.id,
      },
    });
  }

  const assessment = await db.assessment.upsert({
    where: { id: "seed-assessment-hangul" },
    update: { status: "PUBLISHED", title: "Kuis Hangul Dasar" },
    create: {
      id: "seed-assessment-hangul",
      organizationId: organization.id,
      createdByMembershipId: teacherMembership.id,
      title: "Kuis Hangul Dasar",
      description: "Cek pemahaman setelah materi pertama.",
      status: "PUBLISHED",
      instructions: { text: "Pilih satu jawaban yang paling tepat." },
      passingScore: 70,
      maxAttempts: 3,
      publishedAt: new Date("2026-08-01T00:00:00.000Z"),
    },
  });

  const question = await db.assessmentQuestion.upsert({
    where: { id: "seed-question-hangul-creator" },
    update: { prompt: { text: "Siapa yang memperkenalkan Hangul?" } },
    create: {
      id: "seed-question-hangul-creator",
      assessmentId: assessment.id,
      type: "SINGLE_CHOICE",
      prompt: { text: "Siapa yang memperkenalkan Hangul?" },
      explanation: {
        text: "Hangul diperkenalkan oleh Raja Sejong pada abad ke-15.",
      },
      points: 10,
      position: 1,
    },
  });

  const options = [
    {
      id: "seed-option-sejong",
      content: { text: "Raja Sejong" },
      isCorrect: true,
      position: 1,
    },
    {
      id: "seed-option-goryeo",
      content: { text: "Raja Goryeo" },
      isCorrect: false,
      position: 2,
    },
    {
      id: "seed-option-admiral",
      content: { text: "Laksamana Yi" },
      isCorrect: false,
      position: 3,
    },
  ];

  for (const option of options) {
    await db.assessmentOption.upsert({
      where: { id: option.id },
      update: option,
      create: { ...option, questionId: question.id },
    });
  }

  const courseItems = [
    {
      id: "seed-item-material",
      moduleId: moduleOne.id,
      type: "MATERIAL" as const,
      position: 1,
      materialId: material.id,
      assessmentId: null,
      vocabularySetId: null,
    },
    {
      id: "seed-item-assessment",
      moduleId: moduleOne.id,
      type: "ASSESSMENT" as const,
      position: 2,
      materialId: null,
      assessmentId: assessment.id,
      vocabularySetId: null,
    },
    {
      id: "seed-item-vocabulary",
      moduleId: moduleTwo.id,
      type: "VOCABULARY_SET" as const,
      position: 1,
      materialId: null,
      assessmentId: null,
      vocabularySetId: vocabulary.id,
    },
  ];

  for (const item of courseItems) {
    await db.courseItem.upsert({
      where: { id: item.id },
      update: { ...item, isPublished: true },
      create: {
        ...item,
        organizationId: organization.id,
        isPublished: true,
      },
    });
  }

  const cohort = await db.cohort.upsert({
    where: { id: "seed-cohort-august" },
    update: { status: "OPEN" },
    create: {
      id: "seed-cohort-august",
      courseId: course.id,
      organizationId: organization.id,
      name: "Kelas Agustus 2026",
      description: "Cohort aktif untuk menguji jadwal dan enrollment.",
      status: "OPEN",
      enrollmentMode: "OPEN",
      capacity: 30,
      startsAt: new Date("2026-08-17T12:00:00.000Z"),
      endsAt: new Date("2026-10-17T12:00:00.000Z"),
    },
  });

  await db.cohortStaff.upsert({
    where: {
      cohortId_organizationMemberId: {
        cohortId: cohort.id,
        organizationMemberId: teacherMembership.id,
      },
    },
    update: { role: "TEACHER" },
    create: {
      id: "seed-cohort-staff-teacher",
      cohortId: cohort.id,
      organizationId: organization.id,
      organizationMemberId: teacherMembership.id,
      role: "TEACHER",
    },
  });

  await db.courseEnrollment.upsert({
    where: { courseId_userId: { courseId: course.id, userId: student.id } },
    update: { source: "OPEN", status: "ACTIVE" },
    create: {
      id: "seed-course-enrollment-student",
      courseId: course.id,
      userId: student.id,
      source: "OPEN",
      status: "ACTIVE",
    },
  });

  await db.cohortEnrollment.upsert({
    where: { cohortId_userId: { cohortId: cohort.id, userId: student.id } },
    update: { source: "COHORT", status: "ACTIVE" },
    create: {
      id: "seed-cohort-enrollment-student",
      cohortId: cohort.id,
      userId: student.id,
      source: "COHORT",
      status: "ACTIVE",
    },
  });

  await db.contentProgress.upsert({
    where: {
      courseItemId_userId: {
        courseItemId: "seed-item-material",
        userId: student.id,
      },
    },
    update: {
      completedAt: new Date("2026-08-12T08:30:00.000Z"),
      status: "COMPLETED",
    },
    create: {
      id: "seed-progress-material",
      courseItemId: "seed-item-material",
      userId: student.id,
      status: "COMPLETED",
      completedAt: new Date("2026-08-12T08:30:00.000Z"),
    },
  });

  console.info("Seed complete");
  console.info(`Login: owner@hakgyo.test / ${password}`);
  console.info(`Login: teacher@hakgyo.test / ${password}`);
  console.info(`Login: student@hakgyo.test / ${password}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
