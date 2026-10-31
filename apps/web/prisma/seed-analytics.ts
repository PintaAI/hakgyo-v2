/**
 * Fills a separate demo organization with twelve months of synthetic
 * activity so the workspace analytics (Performa, Murid, Pendapatan) have
 * something to show in development and demo recordings. Run the main seed
 * first: the demo organization reuses owner@hakgyo.test and
 * teacher@hakgyo.test. Re-running replaces the demo organization; nothing
 * outside it is touched.
 *
 *   bun run --cwd apps/web db:seed:analytics
 */
import "dotenv/config";

import { vocabularyMeaningFields } from "@hakgyo/shared";
import { PrismaNeon } from "@prisma/adapter-neon";

import { PrismaClient } from "../generated/prisma/client";
import { sendWeeklyAnalyticsDigests } from "../src/server/analytics/weekly-digest";
import { DEFAULT_COHORT_NAME } from "../src/server/enrollment/default-cohort";
import type {
  CohortStatus,
  EnrollmentSource,
  EnrollmentStatus,
  GamificationAction,
  PaymentMethod,
  PaymentStatus,
} from "../generated/prisma/enums";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DIRECT_URL or DATABASE_URL is required to seed the database",
  );
}
const db = new PrismaClient({
  adapter: new PrismaNeon({ connectionString }),
});

const ORG_ID = "analytics-demo-org";
const ORG_SLUG = "akademi-hangeul";
const ORG_NAME = "Akademi Hangeul Nusantara";
const LEARNER_PREFIX = "analytics-demo-learner-";
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const now = new Date();

// Deterministic randomness so every run produces the same demo.
let seed = 20261014;
function random() {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const between = (min: number, max: number) => min + random() * (max - min);
const chance = (probability: number) => random() < probability;
const pick = <T>(items: readonly T[]) =>
  items[Math.floor(random() * items.length)]!;
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
const daysAgo = (days: number) => new Date(now.getTime() - days * DAY);
const before = (date: Date, limit: Date) =>
  date.getTime() < limit.getTime() ? date : limit;
const addMs = (date: Date, ms: number) => new Date(date.getTime() + ms);

const firstNames = [
  "Aditya",
  "Ayu",
  "Bagus",
  "Bella",
  "Dimas",
  "Dewi",
  "Fajar",
  "Fitri",
  "Gilang",
  "Hana",
  "Indra",
  "Intan",
  "Joko",
  "Kirana",
  "Lukman",
  "Maya",
  "Nanda",
  "Nisa",
  "Oki",
  "Putri",
  "Raka",
  "Rina",
  "Sari",
  "Satria",
  "Tari",
  "Teguh",
  "Umar",
  "Vina",
  "Wulan",
  "Yoga",
  "Zahra",
  "Anisa",
  "Bima",
  "Citra",
  "Danu",
  "Eka",
  "Farah",
  "Gita",
  "Hendra",
  "Ilham",
];
const lastNames = [
  "Pratama",
  "Lestari",
  "Saputra",
  "Wijaya",
  "Hidayat",
  "Kusuma",
  "Permata",
  "Santoso",
  "Nugroho",
  "Rahma",
  "Siregar",
  "Utami",
  "Gunawan",
  "Halim",
  "Maharani",
  "Setiawan",
  "Anggraini",
  "Ramadhan",
  "Purnama",
  "Wibowo",
];

type CourseSpec = {
  key: string;
  title: string;
  price: number;
  modules: string[];
  /** Harder courses score lower. */
  difficulty: number;
};
const courseSpecs: CourseSpec[] = [
  {
    key: "dasar",
    title: "Bahasa Korea Dasar 1",
    price: 750_000,
    modules: ["Hangeul & Pelafalan", "Perkenalan Diri", "Angka & Waktu"],
    difficulty: 0,
  },
  {
    key: "topik",
    title: "Persiapan TOPIK I",
    price: 1_250_000,
    modules: ["Strategi Membaca", "Strategi Menyimak", "Simulasi Soal"],
    difficulty: 0.08,
  },
  {
    key: "percakapan",
    title: "Percakapan Sehari-hari",
    price: 450_000,
    modules: ["Di Kafe", "Belanja", "Transportasi"],
    difficulty: -0.04,
  },
];

type CohortSpec = {
  course: string;
  /** Days before now the class starts (negative: in the future). */
  startsDaysAgo: number;
  durationDays: number;
  size: number;
  teacher?: boolean;
  label: string;
};
const cohortSpecs: CohortSpec[] = [
  {
    course: "dasar",
    startsDaysAgo: 340,
    durationDays: 90,
    size: 14,
    label: "Batch",
  },
  {
    course: "topik",
    startsDaysAgo: 275,
    durationDays: 90,
    size: 12,
    label: "Kelas TOPIK",
  },
  {
    course: "dasar",
    startsDaysAgo: 225,
    durationDays: 90,
    size: 18,
    label: "Batch",
  },
  {
    course: "percakapan",
    startsDaysAgo: 165,
    durationDays: 60,
    size: 11,
    label: "Kelas Malam",
  },
  {
    course: "dasar",
    startsDaysAgo: 100,
    durationDays: 120,
    size: 24,
    teacher: true,
    label: "Batch",
  },
  {
    course: "topik",
    startsDaysAgo: 72,
    durationDays: 90,
    size: 17,
    teacher: true,
    label: "Kelas TOPIK",
  },
  {
    course: "percakapan",
    startsDaysAgo: 37,
    durationDays: 60,
    size: 15,
    label: "Kelas Malam",
  },
  {
    course: "dasar",
    startsDaysAgo: -5,
    durationDays: 90,
    size: 13,
    label: "Batch",
  },
];
const monthName = new Intl.DateTimeFormat("id-ID", {
  month: "long",
  year: "numeric",
  timeZone: "Asia/Jakarta",
});

async function chunked<T>(rows: T[], insert: (chunk: T[]) => Promise<unknown>) {
  for (let index = 0; index < rows.length; index += 500) {
    await insert(rows.slice(index, index + 500));
  }
}

async function removeDemo() {
  await db.user.deleteMany({ where: { id: { startsWith: LEARNER_PREFIX } } });
  const organization = await db.organization.findUnique({
    where: { id: ORG_ID },
    select: { id: true },
  });
  if (!organization) return;
  const where = { organizationId: ORG_ID };
  await db.assessmentAnswer.deleteMany({ where });
  await db.assessmentAttempt.deleteMany({ where });
  await db.assessmentEventParticipant.deleteMany({
    where: { event: where },
  });
  await db.assessmentEventCohort.deleteMany({ where: { event: where } });
  await db.assessmentEvent.deleteMany({ where });
  await db.payment.deleteMany({ where });
  await db.userActivityEvent.deleteMany({ where });
  await db.contentProgress.deleteMany({ where: { courseItem: where } });
  await db.cohortEnrollment.deleteMany({ where: { cohort: where } });
  await db.cohortStaff.deleteMany({ where });
  await db.cohort.deleteMany({ where });
  await db.courseItem.deleteMany({ where });
  await db.courseModule.deleteMany({ where });
  await db.course.deleteMany({ where });
  await db.assessment.deleteMany({ where });
  await db.vocabularySet.deleteMany({ where });
  await db.material.deleteMany({ where });
  await db.organizationMember.deleteMany({ where });
  await db.organization.delete({ where: { id: ORG_ID } });
}

type Item = {
  id: string;
  type: "MATERIAL" | "VOCABULARY_SET" | "ASSESSMENT";
  assessmentId?: string;
  maxScore?: number;
  written?: boolean;
  writtenQuestionId?: string;
  choiceQuestionIds?: string[];
  difficulty: number;
};

async function main() {
  const [owner, teacher] = await Promise.all([
    db.user.findUnique({ where: { email: "owner@hakgyo.test" } }),
    db.user.findUnique({ where: { email: "teacher@hakgyo.test" } }),
  ]);
  if (!owner || !teacher) {
    throw new Error(
      "Run `bun run db:seed` first: the demo reuses the seeded owner and teacher.",
    );
  }

  console.log("Removing the previous demo organization…");
  await removeDemo();

  console.log("Creating the organization, courses and classes…");
  await db.organization.create({
    data: {
      id: ORG_ID,
      name: ORG_NAME,
      slug: ORG_SLUG,
      permissionMode: "SIMPLE",
      defaultEnrollmentMode: "OPEN",
      createdAt: daysAgo(380),
    },
  });
  const ownerMembership = await db.organizationMember.create({
    data: {
      id: "analytics-demo-member-owner",
      organizationId: ORG_ID,
      userId: owner.id,
      role: "OWNER",
      createdAt: daysAgo(380),
    },
  });
  const teacherMembership = await db.organizationMember.create({
    data: {
      id: "analytics-demo-member-teacher",
      organizationId: ORG_ID,
      userId: teacher.id,
      role: "TEACHER",
      createdAt: daysAgo(370),
    },
  });

  const courseItems = new Map<string, Item[]>();
  const courseIds = new Map<string, string>();
  for (const spec of courseSpecs) {
    const courseId = `analytics-demo-course-${spec.key}`;
    courseIds.set(spec.key, courseId);
    await db.course.create({
      data: {
        id: courseId,
        organizationId: ORG_ID,
        ownerMembershipId: ownerMembership.id,
        title: spec.title,
        slug: `demo-${spec.key}`,
        description: `Kurikulum ${spec.title} untuk demo analitik.`,
        status: "PUBLISHED",
        createdAt: daysAgo(370),
      },
    });
    const items: Item[] = [];
    for (const [moduleIndex, moduleTitle] of spec.modules.entries()) {
      const moduleId = `${courseId}-module-${moduleIndex + 1}`;
      await db.courseModule.create({
        data: {
          id: moduleId,
          courseId,
          organizationId: ORG_ID,
          title: moduleTitle,
          position: moduleIndex + 1,
        },
      });
      const base = `${courseId}-${moduleIndex + 1}`;
      const material = await db.material.create({
        data: {
          id: `${base}-material`,
          organizationId: ORG_ID,
          createdByMembershipId: teacherMembership.id,
          title: `${moduleTitle}: Materi`,
          content: [
            {
              id: `${base}-block`,
              type: "paragraph",
              props: {},
              content: [
                { type: "text", text: `Ringkasan ${moduleTitle}.`, styles: {} },
              ],
              children: [],
            },
          ],
        },
      });
      const vocabulary = await db.vocabularySet.create({
        data: {
          id: `${base}-vocabulary`,
          organizationId: ORG_ID,
          createdByMembershipId: teacherMembership.id,
          title: `${moduleTitle}: Kosakata`,
          entries: {
            create: [
              ["안녕하세요", "Halo"],
              ["감사합니다", "Terima kasih"],
              ["네", "Ya"],
            ].map(([term, definition], index) => ({
              id: `${base}-entry-${index + 1}`,
              term: term!,
              ...vocabularyMeaningFields([definition!]),
            })),
          },
        },
      });
      // The middle module's test has a written question, reviewed by hand.
      const written = moduleIndex === 1;
      const assessmentId = `${base}-assessment`;
      const choiceQuestionIds = [1, 2, 3].map(
        (position) => `${assessmentId}-q${position}`,
      );
      const writtenQuestionId = `${assessmentId}-q4`;
      await db.assessment.create({
        data: {
          id: assessmentId,
          organizationId: ORG_ID,
          createdByMembershipId: teacherMembership.id,
          title: written ? `Ujian ${moduleTitle}` : `Kuis ${moduleTitle}`,
          passingScore: 70,
          maxAttempts: 3,
          questions: {
            create: [
              ...choiceQuestionIds.map((id, index) => ({
                id,
                type: "SINGLE_CHOICE" as const,
                prompt: {
                  text: `Pertanyaan ${index + 1} tentang ${moduleTitle}`,
                },
                points: 10,
                position: index + 1,
                options: {
                  create: [
                    {
                      content: { text: "Jawaban benar" },
                      isCorrect: true,
                      position: 1,
                    },
                    {
                      content: { text: "Jawaban lain" },
                      isCorrect: false,
                      position: 2,
                    },
                  ],
                },
              })),
              ...(written
                ? [
                    {
                      id: writtenQuestionId,
                      type: "WRITTEN" as const,
                      prompt: {
                        text: `Tulis tiga kalimat tentang ${moduleTitle}.`,
                      },
                      points: 10,
                      position: 4,
                    },
                  ]
                : []),
            ],
          },
        },
      });
      const moduleItems: Item[] = [
        { id: `${base}-item-material`, type: "MATERIAL", difficulty: 0 },
        {
          id: `${base}-item-vocabulary`,
          type: "VOCABULARY_SET",
          difficulty: 0,
        },
        {
          id: `${base}-item-assessment`,
          type: "ASSESSMENT",
          assessmentId,
          maxScore: written ? 40 : 30,
          written,
          writtenQuestionId,
          choiceQuestionIds,
          difficulty:
            spec.difficulty + moduleIndex * 0.05 + (written ? 0.06 : 0),
        },
      ];
      await db.courseItem.createMany({
        data: moduleItems.map((item, index) => ({
          id: item.id,
          moduleId,
          organizationId: ORG_ID,
          type: item.type,
          position: index + 1,
          materialId: item.type === "MATERIAL" ? material.id : null,
          vocabularySetId:
            item.type === "VOCABULARY_SET" ? vocabulary.id : null,
          assessmentId: item.type === "ASSESSMENT" ? assessmentId : null,
          isPublished: true,
        })),
      });
      items.push(...moduleItems);
    }
    courseItems.set(spec.key, items);

    // The course's Kelas Mandiri, its open-ended cohort.
    await db.cohort.create({
      data: {
        id: `${courseId}-self-paced`,
        courseId,
        organizationId: ORG_ID,
        name: DEFAULT_COHORT_NAME,
        status: "OPEN",
        defaultForCourseId: courseId,
        createdAt: daysAgo(370),
      },
    });
  }

  type CohortRow = {
    id: string;
    course: string;
    price: number;
    startsAt: Date;
    endsAt: Date;
    status: CohortStatus;
    size: number;
    teacher: boolean;
    selfPaced: boolean;
  };
  const cohorts: CohortRow[] = [];
  for (const [index, spec] of cohortSpecs.entries()) {
    const startsAt = daysAgo(spec.startsDaysAgo);
    const endsAt = addMs(startsAt, spec.durationDays * DAY);
    const status: CohortStatus =
      startsAt > now ? "OPEN" : endsAt < now ? "COMPLETED" : "IN_PROGRESS";
    const courseSpec = courseSpecs.find(
      (course) => course.key === spec.course,
    )!;
    const id = `analytics-demo-cohort-${index + 1}`;
    const name = `${spec.label} ${monthName.format(startsAt)}`.replace(
      /^./,
      (c) => c.toUpperCase(),
    );
    await db.cohort.create({
      data: {
        id,
        courseId: courseIds.get(spec.course)!,
        organizationId: ORG_ID,
        name,
        status,
        enrollmentMode: "OPEN",
        price: courseSpec.price,
        capacity: spec.size + 6,
        startsAt,
        endsAt,
        createdAt: addMs(startsAt, -40 * DAY),
      },
    });
    if (spec.teacher) {
      await db.cohortStaff.create({
        data: {
          cohortId: id,
          organizationId: ORG_ID,
          organizationMemberId: teacherMembership.id,
          role: "INSTRUCTOR",
        },
      });
    }
    cohorts.push({
      id,
      course: spec.course,
      price: courseSpec.price,
      startsAt,
      endsAt,
      status,
      size: spec.size,
      teacher: Boolean(spec.teacher),
      selfPaced: false,
    });
  }
  for (const spec of courseSpecs) {
    const courseId = courseIds.get(spec.key)!;
    cohorts.push({
      id: `${courseId}-self-paced`,
      course: spec.key,
      price: 0,
      startsAt: daysAgo(360),
      endsAt: daysAgo(-365),
      status: "OPEN",
      size: spec.key === "dasar" ? 7 : 4,
      teacher: false,
      selfPaced: true,
    });
  }

  console.log("Creating learners and their activity…");
  const learnerCount = 105;
  const learners = Array.from({ length: learnerCount }, (_, index) => {
    const name = `${firstNames[index % firstNames.length]} ${lastNames[(index * 7) % lastNames.length]}`;
    return {
      id: `${LEARNER_PREFIX}${String(index + 1).padStart(3, "0")}`,
      name,
      email: `murid${String(index + 1).padStart(3, "0")}@demo.hakgyo.test`,
      // How engaged and how strong each learner is.
      engagement: clamp(between(0.25, 1.05), 0.2, 1),
      ability: clamp(between(0.55, 0.98), 0.4, 1),
      firstSeen: now,
    };
  });

  const enrollments: Array<{
    cohortId: string;
    userId: string;
    status: EnrollmentStatus;
    source: EnrollmentSource;
    enrolledAt: Date;
    completedAt: Date | null;
  }> = [];
  const payments: Array<{
    id: string;
    reference: string;
    organizationId: string;
    cohortId: string;
    userId: string;
    amount: number;
    method: PaymentMethod;
    status: PaymentStatus;
    instructions: object;
    submittedAt: Date | null;
    reviewedByUserId: string | null;
    reviewedAt: Date | null;
    reviewNote: string | null;
    paidAt: Date | null;
    createdAt: Date;
    payerName: string | null;
  }> = [];
  const activities: Array<{
    userId: string;
    organizationId: string;
    action: GamificationAction;
    xpAwarded: number;
    contributesToStreak: boolean;
    activityDate: Date;
    occurredAt: Date;
    idempotencyKey: string;
  }> = [];
  const progress: Array<{
    courseItemId: string;
    userId: string;
    status: "COMPLETED";
    startedAt: Date;
    completedAt: Date;
  }> = [];
  const attempts: Array<{
    id: string;
    assessmentId: string;
    courseItemId: string;
    organizationId: string;
    cohortId: string | null;
    userId: string;
    attemptNumber: number;
    status: "GRADED" | "IN_REVIEW";
    score: number;
    maxScore: number;
    startedAt: Date;
    submittedAt: Date;
    gradedAt: Date | null;
    assessmentEventId: string | null;
  }> = [];
  const answers: Array<{
    attemptId: string;
    organizationId: string;
    questionId: string;
    content?: { text: string };
    autoScore: number | null;
    manualScore: number | null;
    reviewedByMembershipId: string | null;
    reviewedAt: Date | null;
  }> = [];
  const attemptNumbers = new Map<string, number>();
  const nextAttemptNumber = (userId: string, itemId: string) => {
    const key = `${userId}:${itemId}`;
    const next = (attemptNumbers.get(key) ?? 0) + 1;
    attemptNumbers.set(key, next);
    return next;
  };
  const xp = {
    MATERIAL_COMPLETED: 20,
    ASSESSMENT_SUBMITTED: 10,
    ASSESSMENT_PASSED: 40,
    VOCABULARY_REVIEWED: 5,
  } as const;
  const localDate = (instant: Date) => {
    const local = new Date(instant.getTime() + 7 * HOUR);
    return new Date(`${local.toISOString().slice(0, 10)}T00:00:00.000Z`);
  };
  const record = (
    userId: string,
    action: GamificationAction,
    occurredAt: Date,
    key: string,
  ) => {
    activities.push({
      userId,
      organizationId: ORG_ID,
      action,
      xpAwarded: xp[action],
      contributesToStreak: true,
      activityDate: localDate(occurredAt),
      occurredAt,
      idempotencyKey: `analytics-demo:${key}`,
    });
  };
  // Moves an instant to the evening of its WIB day (18:00–22:00 WIB is
  // 11:00–15:00 UTC).
  const studyHour = (date: Date) =>
    addMs(localDate(date), (11 + between(0, 4)) * HOUR);

  let paymentNumber = 0;
  const makePayment = (input: {
    cohort: CohortRow;
    userId: string;
    payerName: string;
    status: PaymentStatus;
    createdAt: Date;
    paidAt?: Date;
  }) => {
    paymentNumber += 1;
    const method: PaymentMethod = chance(0.62) ? "QRIS" : "BANK_TRANSFER";
    const submitted =
      input.status === "PAID" ||
      input.status === "SUBMITTED" ||
      input.status === "REJECTED";
    const submittedAt = submitted
      ? before(addMs(input.createdAt, between(0.2, 20) * HOUR), now)
      : null;
    const reviewedAt =
      input.status === "PAID"
        ? (input.paidAt ?? null)
        : input.status === "REJECTED" && submittedAt
          ? before(addMs(submittedAt, between(1, 20) * HOUR), now)
          : null;
    payments.push({
      id: `analytics-demo-payment-${paymentNumber}`,
      reference: `DEMO${String(paymentNumber).padStart(5, "0")}`,
      organizationId: ORG_ID,
      cohortId: input.cohort.id,
      userId: input.userId,
      amount: input.cohort.price,
      method,
      status: input.status,
      instructions:
        method === "QRIS"
          ? {
              kind: "QRIS",
              payload: "00020101021226",
              merchantName: ORG_NAME,
              merchantCity: "JAKARTA",
            }
          : {
              kind: "BANK_TRANSFER",
              accounts: [
                {
                  bankCode: "014",
                  bankName: "BCA",
                  accountNumber: "1234567890",
                  accountHolder: ORG_NAME,
                },
              ],
            },
      submittedAt,
      reviewedByUserId: reviewedAt ? owner.id : null,
      reviewedAt,
      reviewNote:
        input.status === "REJECTED" ? "Nominal transfer tidak sesuai." : null,
      paidAt: input.status === "PAID" ? (input.paidAt ?? null) : null,
      createdAt: input.createdAt,
      payerName: submitted ? input.payerName : null,
    });
  };

  const learnersByCohort = new Map<string, Set<string>>();
  let cursor = 0;
  for (const cohort of cohorts) {
    const members = new Set<string>();
    learnersByCohort.set(cohort.id, members);
    while (members.size < cohort.size) {
      // Mostly new learners; some return for a second class.
      const learner = chance(0.78)
        ? learners[cursor++ % learnerCount]!
        : pick(learners);
      members.add(learner.id);
    }
    const items = courseItems.get(cohort.course)!;
    for (const userId of members) {
      const learner = learners.find((row) => row.id === userId)!;
      const enrolledAt = cohort.selfPaced
        ? daysAgo(between(3, 340))
        : before(
            addMs(cohort.startsAt, -between(1, 26) * DAY),
            addMs(now, -between(0.2, 3) * DAY),
          );
      if (enrolledAt < learner.firstSeen) learner.firstSeen = enrolledAt;

      const source: EnrollmentSource = cohort.selfPaced
        ? "OPEN"
        : chance(0.8)
          ? "PURCHASE"
          : chance(0.6)
            ? "INVITE"
            : "MANUAL";
      const cancelled = chance(0.05);
      const status: EnrollmentStatus = cancelled
        ? "CANCELLED"
        : cohort.status === "COMPLETED"
          ? "COMPLETED"
          : "ACTIVE";
      enrollments.push({
        cohortId: cohort.id,
        userId,
        status,
        source,
        enrolledAt,
        completedAt: status === "COMPLETED" ? cohort.endsAt : null,
      });
      if (source === "PURCHASE") {
        makePayment({
          cohort,
          userId,
          payerName: learner.name,
          status: "PAID",
          createdAt: addMs(enrolledAt, -between(2, 30) * HOUR),
          paidAt: enrolledAt,
        });
      }
      if (cancelled) continue;

      // Study window: from enrolling (or class start) until the class ends,
      // today, or the day the learner drifted away.
      const windowStart = cohort.selfPaced
        ? enrolledAt
        : new Date(Math.max(enrolledAt.getTime(), cohort.startsAt.getTime()));
      let windowEnd = before(cohort.endsAt, now);
      const driftsAway =
        cohort.status !== "COMPLETED" && chance(cohort.selfPaced ? 0.45 : 0.18);
      if (driftsAway) {
        const lastActive = daysAgo(between(32, 70));
        if (lastActive > windowStart) windowEnd = lastActive;
        else windowEnd = windowStart;
      }
      const span = windowEnd.getTime() - windowStart.getTime();
      if (span <= DAY) continue;

      const finished = cohort.status === "COMPLETED";
      const reach = clamp(
        learner.engagement * (finished ? 1.1 : 0.95) + between(-0.1, 0.1),
        0.1,
        1,
      );
      const elapsed = finished
        ? 1
        : clamp(
            span / (cohort.endsAt.getTime() - windowStart.getTime()),
            0.15,
            1,
          );
      const itemsDone = Math.max(1, Math.round(items.length * reach * elapsed));
      for (const [index, item] of items.slice(0, itemsDone).entries()) {
        const at = studyHour(
          addMs(windowStart, (span * (index + 0.6)) / (itemsDone + 0.4)),
        );
        if (at > now) break;
        if (item.type === "MATERIAL") {
          progress.push({
            courseItemId: item.id,
            userId,
            status: "COMPLETED",
            startedAt: addMs(at, -HOUR),
            completedAt: at,
          });
          record(
            userId,
            "MATERIAL_COMPLETED",
            at,
            `material:${userId}:${item.id}`,
          );
          continue;
        }
        if (item.type === "VOCABULARY_SET") {
          progress.push({
            courseItemId: item.id,
            userId,
            status: "COMPLETED",
            startedAt: addMs(at, -HOUR),
            completedAt: at,
          });
          const reviews = 2 + Math.floor(learner.engagement * 6);
          for (let review = 0; review < reviews; review += 1) {
            const reviewAt = addMs(at, review * between(0.5, 2.5) * DAY);
            if (reviewAt > windowEnd || reviewAt > now) break;
            record(
              userId,
              "VOCABULARY_REVIEWED",
              reviewAt,
              `vocab:${userId}:${item.id}:${review}`,
            );
          }
          continue;
        }

        // Assessment: up to two tries, best counts.
        const maxScore = item.maxScore!;
        let submittedAt = at;
        for (let attempt = 0; attempt < 2; attempt += 1) {
          const share = clamp(
            learner.ability -
              item.difficulty +
              attempt * 0.08 +
              between(-0.16, 0.12),
            0.2,
            1,
          );
          const score = Math.round((share * maxScore) / 5) * 5;
          const passed = (score / maxScore) * 100 >= 70;
          const id = `analytics-demo-attempt-${attempts.length + 1}`;
          const recent = now.getTime() - submittedAt.getTime() < 6 * DAY;
          const waitingReview = Boolean(item.written) && recent;
          const gradedAt = item.written
            ? waitingReview
              ? null
              : before(addMs(submittedAt, between(3, 54) * HOUR), now)
            : submittedAt;
          attempts.push({
            id,
            assessmentId: item.assessmentId!,
            courseItemId: item.id,
            organizationId: ORG_ID,
            cohortId: cohort.selfPaced ? null : cohort.id,
            userId,
            attemptNumber: nextAttemptNumber(userId, item.id),
            status: waitingReview ? "IN_REVIEW" : "GRADED",
            score: waitingReview ? Math.min(score, 30) : score,
            maxScore,
            startedAt: addMs(submittedAt, -between(10, 35) * 60 * 1000),
            submittedAt,
            gradedAt,
            assessmentEventId: null,
          });
          record(
            userId,
            "ASSESSMENT_SUBMITTED",
            submittedAt,
            `submitted:${id}`,
          );
          if (item.written) {
            const writtenScore = clamp(score - 30, 0, 10);
            for (const questionId of item.choiceQuestionIds!) {
              answers.push({
                attemptId: id,
                organizationId: ORG_ID,
                questionId,
                autoScore: 10,
                manualScore: null,
                reviewedByMembershipId: null,
                reviewedAt: null,
              });
            }
            answers.push({
              attemptId: id,
              organizationId: ORG_ID,
              questionId: item.writtenQuestionId!,
              content: {
                text: "저는 한국어를 공부해요. 재미있어요. 매일 연습해요.",
              },
              autoScore: null,
              manualScore: waitingReview ? null : writtenScore,
              reviewedByMembershipId: waitingReview
                ? null
                : teacherMembership.id,
              reviewedAt: waitingReview ? null : gradedAt,
            });
          }
          if (waitingReview) break;
          if (passed) {
            const passedAt = gradedAt ?? submittedAt;
            progress.push({
              courseItemId: item.id,
              userId,
              status: "COMPLETED",
              startedAt: addMs(submittedAt, -HOUR),
              completedAt: passedAt,
            });
            record(
              userId,
              "ASSESSMENT_PASSED",
              passedAt,
              `passed:${userId}:${item.id}`,
            );
            break;
          }
          submittedAt = addMs(submittedAt, between(1, 4) * DAY);
          if (submittedAt > windowEnd || submittedAt > now) break;
        }
      }
    }
  }

  // Abandoned and pending checkouts, for conversion and the review queue.
  for (const cohort of cohorts.filter((row) => !row.selfPaced)) {
    const abandoned = Math.round(cohort.size * between(0.15, 0.35));
    for (let index = 0; index < abandoned; index += 1) {
      const learner = pick(learners);
      const createdAt = before(
        addMs(cohort.startsAt, -between(1, 25) * DAY),
        addMs(now, -between(0.5, 4) * DAY),
      );
      makePayment({
        cohort,
        userId: learner.id,
        payerName: learner.name,
        status: chance(0.25) ? "REJECTED" : "CANCELLED",
        createdAt,
      });
    }
    if (cohort.status !== "COMPLETED") {
      const waiting = cohort.startsAt > now ? 3 : 1;
      for (let index = 0; index < waiting; index += 1) {
        const learner = learners[(cursor + index * 13) % learnerCount]!;
        if (learnersByCohort.get(cohort.id)!.has(learner.id)) continue;
        makePayment({
          cohort,
          userId: learner.id,
          payerName: learner.name,
          status: "SUBMITTED",
          createdAt: addMs(now, -between(3, 40) * HOUR),
        });
      }
    }
  }

  // Latihan/Tryout in the classes the teacher runs.
  const eventSpecs = [
    {
      cohort: "analytics-demo-cohort-5",
      type: "TRYOUT" as const,
      title: "Tryout Tengah Semester",
      daysAgo: 24,
      item: 5,
    },
    {
      cohort: "analytics-demo-cohort-5",
      type: "QUICK_ASSESSMENT" as const,
      title: "Latihan Angka & Waktu",
      daysAgo: 6,
      item: 8,
    },
    {
      cohort: "analytics-demo-cohort-6",
      type: "TRYOUT" as const,
      title: "Simulasi TOPIK I #1",
      daysAgo: 15,
      item: 5,
    },
  ];
  const events: Array<{
    id: string;
    spec: (typeof eventSpecs)[number];
    cohort: CohortRow;
    item: Item;
  }> = [];
  for (const [index, spec] of eventSpecs.entries()) {
    const cohort = cohorts.find((row) => row.id === spec.cohort)!;
    const item = courseItems.get(cohort.course)![spec.item]!;
    const openedAt = studyHour(daysAgo(spec.daysAgo));
    const closesAt = addMs(openedAt, 3 * HOUR);
    const id = `analytics-demo-event-${index + 1}`;
    await db.assessmentEvent.create({
      data: {
        id,
        organizationId: ORG_ID,
        courseId: courseIds.get(cohort.course)!,
        courseItemId: item.id,
        createdByMembershipId: teacherMembership.id,
        type: spec.type,
        title: spec.title,
        durationMinutes: 60,
        status: "CLOSED",
        opensAt: openedAt,
        openedAt,
        closesAt,
        closedAt: closesAt,
        attemptsFinalizedAt: closesAt,
        notifyOnOpen: false,
        openNotificationSentAt: openedAt,
        closingReminderSentAt: closesAt,
        createdAt: addMs(openedAt, -3 * DAY),
        cohorts: { create: { cohortId: cohort.id } },
      },
    });
    events.push({ id, spec, cohort, item });
  }
  const participants: Array<{
    eventId: string;
    userId: string;
    cohortId: string;
    invalidatedAt: Date | null;
    invalidationReason: string | null;
    invalidatedByMembershipId: string | null;
  }> = [];
  for (const event of events) {
    const members = enrollments.filter(
      (row) => row.cohortId === event.cohort.id && row.status === "ACTIVE",
    );
    const openedAt = studyHour(daysAgo(event.spec.daysAgo));
    for (const [index, member] of members.entries()) {
      const invalid = index === 3;
      participants.push({
        eventId: event.id,
        userId: member.userId,
        cohortId: event.cohort.id,
        invalidatedAt: invalid ? addMs(openedAt, 4 * HOUR) : null,
        invalidationReason: invalid ? "Terindikasi bekerja sama." : null,
        invalidatedByMembershipId: invalid ? teacherMembership.id : null,
      });
      if (!chance(0.86)) continue;
      const learner = learners.find((row) => row.id === member.userId)!;
      const maxScore = event.item.maxScore!;
      const share = clamp(
        learner.ability - event.item.difficulty + between(-0.18, 0.1),
        0.2,
        1,
      );
      const submittedAt = addMs(openedAt, between(25, 60) * 60 * 1000);
      const id = `analytics-demo-attempt-${attempts.length + 1}`;
      attempts.push({
        id,
        assessmentId: event.item.assessmentId!,
        courseItemId: event.item.id,
        organizationId: ORG_ID,
        cohortId: event.cohort.id,
        userId: member.userId,
        attemptNumber: nextAttemptNumber(member.userId, event.item.id),
        status: "GRADED",
        score: Math.round((share * maxScore) / 5) * 5,
        maxScore,
        startedAt: addMs(openedAt, between(1, 20) * 60 * 1000),
        submittedAt,
        gradedAt: event.item.written
          ? addMs(submittedAt, between(4, 30) * HOUR)
          : submittedAt,
        assessmentEventId: event.id,
      });
      record(
        member.userId,
        "ASSESSMENT_SUBMITTED",
        submittedAt,
        `submitted:${id}`,
      );
    }
  }

  console.log(
    `Writing ${learnerCount} learners, ${enrollments.length} enrollments, ${payments.length} payments, ${attempts.length} attempts and ${activities.length} activity events…`,
  );
  await db.user.createMany({
    data: learners.map((learner) => ({
      id: learner.id,
      name: learner.name,
      email: learner.email,
      emailVerified: true,
      createdAt: addMs(learner.firstSeen, -between(1, 72) * HOUR),
    })),
  });
  await chunked(enrollments, (data) =>
    db.cohortEnrollment.createMany({ data }),
  );
  await chunked(payments, (data) => db.payment.createMany({ data }));
  await chunked(attempts, (data) => db.assessmentAttempt.createMany({ data }));
  await chunked(answers, (data) => db.assessmentAnswer.createMany({ data }));
  await chunked(participants, (data) =>
    db.assessmentEventParticipant.createMany({ data }),
  );
  // A learner can complete the same item through two classes; keep one row.
  const uniqueProgress = [
    ...new Map(
      progress.map((row) => [`${row.courseItemId}:${row.userId}`, row]),
    ).values(),
  ];
  await chunked(uniqueProgress, (data) =>
    db.contentProgress.createMany({ data, skipDuplicates: true }),
  );
  await chunked(activities, (data) =>
    db.userActivityEvent.createMany({ data, skipDuplicates: true }),
  );

  const totals = new Map<string, { xp: number; count: number; last: Date }>();
  for (const activity of activities) {
    const total = totals.get(activity.userId) ?? {
      xp: 0,
      count: 0,
      last: activity.activityDate,
    };
    total.xp += activity.xpAwarded;
    total.count += 1;
    if (activity.activityDate > total.last) total.last = activity.activityDate;
    totals.set(activity.userId, total);
  }
  await chunked([...totals.entries()], (rows) =>
    db.userGamification.createMany({
      data: rows.map(([userId, total]) => ({
        userId,
        totalXp: total.xp,
        completedActivities: total.count,
        lastActivityDate: total.last,
        timeZone: "Asia/Jakarta",
      })),
      skipDuplicates: true,
    }),
  );

  // Puts this week's digest in the owner's and teacher's inbox for demos.
  const digest = await sendWeeklyAnalyticsDigests(db, {
    organizationId: ORG_ID,
  });
  console.log(`Sent ${digest.sent} weekly digests to the demo staff.`);

  console.log(
    `Done. Sign in as owner@hakgyo.test and open /workspace/${ORG_SLUG}/analitik.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void db.$disconnect();
  });
