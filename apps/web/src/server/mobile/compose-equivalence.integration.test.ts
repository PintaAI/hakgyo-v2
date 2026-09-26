/**
 * Phase 2 regression guard for mobile sync v2: the screens a learner sees
 * offline, composed on the device from `buildCourseBundle` + the learner
 * state, must equal what the online procedures return.
 *
 *   composeCourseOutline      ≙ getCourseOutlineForUser(…, { managementAccess: false })
 *   composeCourseItem         ≙ getCourseItemDetails (learning.getCourseItem)
 *   composeLearnerAssessment  ≙ getLearnerAssessmentsForCourseItems (no attempt)
 *
 * Runs against a throwaway local PostgreSQL with every migration applied and
 * `prisma/seed.ts` loaded. It writes (and removes) its own fixture, so it
 * refuses to run against anything but a local database:
 *
 *   MOBILE_SYNC_INTEGRATION=1 \
 *   DATABASE_URL=postgresql://postgres@127.0.0.1:5432/hakgyo \
 *   bun test compose-equivalence
 *
 * The app's Prisma client speaks to Neon over WebSockets only, so the test
 * starts an in-process WebSocket → TCP proxy and points the Neon driver at it.
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { dirname } from "node:path";

import {
  composeCourseItem,
  composeCourseOutline,
  composeLearnerAssessment,
} from "@hakgyo/shared/mobile-sync";

import type { getLearnerAssessmentsForCourseItems as GetLearnerAssessmentsForCourseItems } from "~/server/assessment/learner-view";
import type { db as AppDb } from "~/server/db";
import type { getCourseItemDetails as GetCourseItemDetails } from "~/server/learning/course-item-detail";
import type { getCourseOutlineForUser as GetCourseOutlineForUser } from "~/server/learning/course-outline";
import type { buildCourseBundle as BuildCourseBundle } from "./course-bundle";
import type { buildLearnerState as BuildLearnerState } from "./learner-state";

const databaseUrl = process.env.DATABASE_URL ?? "";
const isLocalDatabase = (() => {
  try {
    const { hostname } = new URL(databaseUrl);
    return ["localhost", "127.0.0.1", "::1", "[::1]"].includes(hostname);
  } catch {
    return false;
  }
})();
const enabled = process.env.MOBILE_SYNC_INTEGRATION === "1" && isLocalDatabase;

const SEED_STUDENT_ID = "seed-user-student";
const SEED_ORGANIZATION_ID = "seed-org-hakgyo";
const SEED_OWNER_MEMBER_ID = "seed-member-owner";

// ---------------------------------------------------------------------------
// Neon driver → local Postgres
// ---------------------------------------------------------------------------

type ProxySocket = Awaited<ReturnType<typeof Bun.connect>>;
type ProxyData = { address: string; socket?: ProxySocket; queue: Uint8Array[] };

async function routeNeonToLocalPostgres() {
  const adapterEntry = Bun.resolveSync("@prisma/adapter-neon", import.meta.dir);
  const neonEntry = Bun.resolveSync(
    "@neondatabase/serverless",
    dirname(adapterEntry),
  );
  const { neonConfig } = (await import(neonEntry)) as {
    neonConfig: Record<string, unknown>;
  };
  const server = Bun.serve<ProxyData, never>({
    hostname: "127.0.0.1",
    port: 0,
    fetch(request, srv) {
      const address = new URL(request.url).searchParams.get("address") ?? "";
      if (srv.upgrade(request, { data: { address, queue: [] } })) {
        return undefined;
      }
      return new Response("Upgrade required", { status: 426 });
    },
    websocket: {
      async open(ws) {
        const [hostname = "127.0.0.1", port = "5432"] =
          ws.data.address.split(":");
        ws.data.socket = await Bun.connect({
          hostname,
          port: Number(port),
          socket: {
            data: (_socket, chunk) => void ws.sendBinary(chunk),
            close: () => ws.close(),
            error: () => ws.close(),
          },
        });
        for (const chunk of ws.data.queue) ws.data.socket.write(chunk);
        ws.data.queue = [];
      },
      message(ws, message) {
        const chunk =
          typeof message === "string"
            ? new TextEncoder().encode(message)
            : new Uint8Array(message);
        if (ws.data.socket) ws.data.socket.write(chunk);
        else ws.data.queue.push(chunk);
      },
      close(ws) {
        ws.data.socket?.end();
      },
    },
  });
  neonConfig.wsProxy = (host: string, port: string | number) =>
    `127.0.0.1:${server.port}/v1?address=${host}:${port}`;
  neonConfig.useSecureWebSocket = false;
  neonConfig.pipelineConnect = false;
  neonConfig.pipelineTLS = false;
  neonConfig.forceDisablePgSSL = true;
  return server;
}

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

/**
 * Plain JSON for comparison: `undefined` keys disappear and Dates become
 * `{ $date: iso }`, so a Date on one side and an ISO string on the other
 * (the bundle and learner state carry strings) still differ.
 */
function plain<T>(value: T): unknown {
  return JSON.parse(
    JSON.stringify(value, function (this: Record<string, unknown>, key, raw) {
      const original = this[key];
      return original instanceof Date
        ? { $date: original.toISOString() }
        : (raw as unknown);
    }),
  ) as unknown;
}

/** What the device stores: plain JSON with Dates as ISO strings. */
function wire<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

const byId = (left: { id: string }, right: { id: string }) =>
  left.id.localeCompare(right.id);

/**
 * Arrays whose server order comes from an unordered query (`findMany`
 * without `orderBy`) are sorted; everything else must match in order.
 */
function normalizeItem(detail: unknown) {
  const value = plain(detail) as {
    material: { assets: Array<{ asset: { id: string } }> } | null;
    embeddedResources: {
      vocabularySets: Array<{ id: string }>;
      assessments: Array<{ id: string }>;
    };
  } | null;
  if (!value) return value;
  value.material?.assets.sort((left, right) => byId(left.asset, right.asset));
  value.embeddedResources.vocabularySets.sort(byId);
  value.embeddedResources.assessments.sort(byId);
  return value;
}

// ---------------------------------------------------------------------------
// Test
// ---------------------------------------------------------------------------

describe.skipIf(!enabled)("mobile sync compose ≙ online procedures", () => {
  let proxy: Awaited<ReturnType<typeof routeNeonToLocalPostgres>>;
  // Loaded in `beforeAll`, once the Neon driver points at the local proxy.
  let modules: {
    db: typeof AppDb;
    getCourseOutlineForUser: typeof GetCourseOutlineForUser;
    getCourseItemDetails: typeof GetCourseItemDetails;
    getLearnerAssessmentsForCourseItems: typeof GetLearnerAssessmentsForCourseItems;
    buildCourseBundle: typeof BuildCourseBundle;
    buildLearnerState: typeof BuildLearnerState;
  };
  const run = crypto.randomUUID().slice(0, 8);
  const fixtureId = (name: string) => `eq-${run}-${name}`;
  const fixtureCourseId = fixtureId("course");
  const organizationId = SEED_ORGANIZATION_ID;
  const ownerMembershipId = SEED_OWNER_MEMBER_ID;

  async function createFixture() {
    const { db } = modules;
    const now = new Date();
    const asset = async (name: string, contentType = "image/png") =>
      db.asset.create({
        data: {
          id: fixtureId(name),
          organizationId,
          objectKey: fixtureId(name),
          fileName: `${name}.bin`,
          contentType,
          size: 100,
          confirmedAt: now,
        },
      });
    await asset("image");
    await asset("audio", "audio/mpeg");
    // Uploaded but never confirmed: hidden everywhere.
    await db.asset.create({
      data: {
        id: fixtureId("unconfirmed"),
        organizationId,
        objectKey: fixtureId("unconfirmed"),
        fileName: "unconfirmed.png",
        contentType: "image/png",
        size: 1,
      },
    });

    await db.pdfBook.create({
      data: {
        id: fixtureId("book"),
        organizationId,
        createdByMembershipId: ownerMembershipId,
        title: "Workbook",
        fileName: "workbook.pdf",
        pageCount: 4,
        pageOffset: 1,
        status: "READY",
      },
    });
    for (const pageNumber of [1, 2, 3, 4]) {
      await asset(`page-${pageNumber}`);
      await asset(`thumb-${pageNumber}`);
      await db.pdfBookPage.create({
        data: {
          bookId: fixtureId("book"),
          pageNumber,
          organizationId,
          assetId: fixtureId(`page-${pageNumber}`),
          thumbnailAssetId: fixtureId(`thumb-${pageNumber}`),
          width: 800,
          height: 1200,
        },
      });
    }

    await db.vocabularySet.create({
      data: {
        id: fixtureId("set"),
        organizationId,
        createdByMembershipId: ownerMembershipId,
        title: "Greetings",
        description: "Everyday greetings",
      },
    });
    await db.vocabularyEntry.createMany({
      data: [
        {
          vocabularySetId: fixtureId("set"),
          id: fixtureId("entry-1"),
          organizationId,
          term: "안녕하세요",
          definition: "Hello",
          examples: ["안녕하세요, 선생님"],
          metadata: { romanization: "annyeonghaseyo" },
          audioAssetId: fixtureId("audio"),
          createdAt: new Date(now.getTime() - 2_000),
        },
        {
          id: fixtureId("entry-2"),
          organizationId,
          term: "감사합니다",
          vocabularySetId: fixtureId("set"),
          definition: "Thank you",
          imageAssetId: fixtureId("image"),
          createdAt: new Date(now.getTime() - 1_000),
        },
      ],
    });

    const assessment = (
      name: string,
      status: "PUBLISHED" | "DRAFT",
      extra: { passingScore?: number | null; timeLimitMinutes?: number } = {},
    ) => createAssessment(name, status, extra);
    const createAssessment = async (
      name: string,
      status: "PUBLISHED" | "DRAFT",
      extra: { passingScore?: number | null; timeLimitMinutes?: number },
    ) => {
      await db.assessment.create({
        data: {
          id: fixtureId(name),
          organizationId,
          createdByMembershipId: ownerMembershipId,
          title: `Assessment ${name}`,
          description: "Check your understanding",
          status,
          publishedAt: status === "PUBLISHED" ? now : null,
          instructions: [{ type: "paragraph", content: "Answer all." }],
          passingScore: extra.passingScore ?? 70,
          maxAttempts: 3,
          timeLimitMinutes: extra.timeLimitMinutes ?? null,
          shuffleQuestions: true,
          shuffleOptions: true,
        },
      });
      await db.assessmentQuestion.createMany({
        data: [1, 2].map((position) => ({
          id: fixtureId(`${name}-q${position}`),
          assessmentId: fixtureId(name),
          type: "SINGLE_CHOICE" as const,
          prompt: [{ type: "paragraph", content: `Question ${position}` }],
          explanation: [{ type: "paragraph", content: "Secret" }],
          points: position,
          position,
        })),
      });
      await db.assessmentOption.createMany({
        data: [1, 2].flatMap((position) =>
          [2, 1].map((optionPosition) => ({
            id: fixtureId(`${name}-q${position}-o${optionPosition}`),
            questionId: fixtureId(`${name}-q${position}`),
            content: `Option ${optionPosition}`,
            isCorrect: optionPosition === 1,
            position: optionPosition,
          })),
        ),
      });
    };
    await assessment("quiz", "PUBLISHED", { timeLimitMinutes: 15 });
    await assessment("final", "PUBLISHED", { passingScore: null });
    await assessment("draft", "DRAFT");

    const material = (
      name: string,
      content: unknown,
      extra: {
        requirementPolicy?: "ALL" | "ANY";
        requirements?: Array<
          | { type: "VOCABULARY_SET"; vocabularySetId: string }
          | { type: "ASSESSMENT"; assessmentId: string; minimumScore?: number }
        >;
        assetNames?: string[];
      } = {},
    ) => createMaterial(name, content, extra);
    const createMaterial = async (
      name: string,
      content: unknown,
      extra: {
        requirementPolicy?: "ALL" | "ANY";
        requirements?: Array<
          | { type: "VOCABULARY_SET"; vocabularySetId: string }
          | { type: "ASSESSMENT"; assessmentId: string; minimumScore?: number }
        >;
        assetNames?: string[];
      },
    ) => {
      await db.material.create({
        data: {
          id: fixtureId(name),
          organizationId,
          createdByMembershipId: ownerMembershipId,
          title: `Material ${name}`,
          description: `About ${name}`,
          content: content as never,
          editorSchemaVersion: 2,
          requirementPolicy: extra.requirementPolicy ?? "ALL",
        },
      });
      await db.materialRequirement.createMany({
        data: (extra.requirements ?? []).map((requirement, position) => ({
          materialId: fixtureId(name),
          organizationId,
          position,
          ...requirement,
        })),
      });
      await db.materialAsset.createMany({
        data: (extra.assetNames ?? []).map((assetName) => ({
          materialId: fixtureId(name),
          organizationId,
          assetId: fixtureId(assetName),
        })),
      });
    };
    await material(
      "lesson",
      [
        { type: "paragraph", content: "Welcome" },
        {
          type: "vocabularyReference",
          props: { vocabularySetId: fixtureId("set") },
        },
        {
          type: "assessmentReference",
          props: { assessmentId: fixtureId("quiz") },
        },
        // Placed only in module 2: never resolves from module 1.
        {
          type: "assessmentReference",
          props: { assessmentId: fixtureId("final") },
        },
        // Draft: never resolves.
        {
          type: "assessmentReference",
          props: { assessmentId: fixtureId("draft") },
        },
        {
          type: "pdfPages",
          props: { bookId: fixtureId("book"), startPage: 2, endPage: 3 },
          children: [
            {
              type: "pdfPages",
              props: { bookId: fixtureId("book"), startPage: 3, endPage: 4 },
            },
          ],
        },
      ],
      {
        requirements: [
          { type: "VOCABULARY_SET", vocabularySetId: fixtureId("set") },
          {
            type: "ASSESSMENT",
            assessmentId: fixtureId("quiz"),
            minimumScore: 80,
          },
        ],
        assetNames: ["image", "unconfirmed"],
      },
    );
    await material("review", [{ type: "paragraph", content: "Review" }], {
      requirementPolicy: "ANY",
      requirements: [
        { type: "ASSESSMENT", assessmentId: fixtureId("final") },
        // Not placed in the course: counts, but is never offered as an activity.
        { type: "ASSESSMENT", assessmentId: fixtureId("draft") },
      ],
    });
    await material("hidden", [{ type: "paragraph", content: "Hidden" }]);

    await db.course.create({
      data: {
        id: fixtureCourseId,
        organizationId,
        ownerMembershipId,
        title: "Equivalence course",
        slug: fixtureCourseId,
        description: "Sequential fixture",
        thumbnailUrl: "https://example.test/thumb.png",
        status: "PUBLISHED",
        progressionMode: "SEQUENTIAL",
      },
    });
    const courseModule = (name: string, position: number) =>
      db.courseModule.create({
        data: {
          id: fixtureId(name),
          courseId: fixtureCourseId,
          organizationId,
          title: `Module ${name}`,
          description: name === "m1" ? "First steps" : null,
          position,
        },
      });
    await courseModule("m1", 0);
    await courseModule("m2", 1);
    await courseModule("m3", 2);
    const item = (
      name: string,
      moduleName: string,
      position: number,
      resource:
        | { type: "MATERIAL"; materialId: string }
        | { type: "VOCABULARY_SET"; vocabularySetId: string }
        | { type: "ASSESSMENT"; assessmentId: string },
      isPublished = true,
    ) =>
      db.courseItem.create({
        data: {
          id: fixtureId(name),
          moduleId: fixtureId(moduleName),
          organizationId,
          position,
          isPublished,
          ...resource,
        },
      });
    await item("i-lesson", "m1", 0, {
      type: "MATERIAL",
      materialId: fixtureId("lesson"),
    });
    await item("i-set", "m1", 1, {
      type: "VOCABULARY_SET",
      vocabularySetId: fixtureId("set"),
    });
    await item("i-quiz", "m1", 2, {
      type: "ASSESSMENT",
      assessmentId: fixtureId("quiz"),
    });
    await item(
      "i-hidden",
      "m1",
      3,
      { type: "MATERIAL", materialId: fixtureId("hidden") },
      false,
    );
    await item("i-review", "m2", 0, {
      type: "MATERIAL",
      materialId: fixtureId("review"),
    });
    await item("i-final", "m2", 1, {
      type: "ASSESSMENT",
      assessmentId: fixtureId("final"),
    });
    // Module 3 stays empty.

    await db.courseEnrollment.create({
      data: {
        courseId: fixtureCourseId,
        userId: SEED_STUDENT_ID,
        status: "ACTIVE",
        source: "OPEN",
      },
    });
    await db.cohort.create({
      data: {
        id: fixtureId("cohort"),
        courseId: fixtureCourseId,
        organizationId,
        name: "Equivalence cohort",
        status: "IN_PROGRESS",
      },
    });
    await db.cohortEnrollment.create({
      data: {
        cohortId: fixtureId("cohort"),
        userId: SEED_STUDENT_ID,
        status: "ACTIVE",
        source: "INVITE",
      },
    });

    // Learner state: lesson completed, set only started, a failed standalone
    // quiz attempt, a passing event attempt on the same quiz (counts for the
    // lesson requirement but not for module completion) and an in-progress
    // final.
    await db.contentProgress.create({
      data: {
        courseItemId: fixtureId("i-lesson"),
        userId: SEED_STUDENT_ID,
        status: "COMPLETED",
        startedAt: new Date("2026-09-01T08:00:00.000Z"),
        completedAt: new Date("2026-09-01T09:00:00.000Z"),
      },
    });
    await db.contentProgress.create({
      data: {
        courseItemId: fixtureId("i-set"),
        userId: SEED_STUDENT_ID,
        status: "IN_PROGRESS",
        startedAt: new Date("2026-09-02T08:00:00.000Z"),
      },
    });
    await db.assessmentAttempt.create({
      data: {
        id: fixtureId("attempt-quiz-1"),
        assessmentId: fixtureId("quiz"),
        courseItemId: fixtureId("i-quiz"),
        organizationId,
        userId: SEED_STUDENT_ID,
        cohortId: fixtureId("cohort"),
        attemptNumber: 1,
        status: "GRADED",
        score: 1,
        maxScore: 3,
        startedAt: new Date("2026-09-03T08:00:00.000Z"),
        submittedAt: new Date("2026-09-03T08:10:00.000Z"),
        gradedAt: new Date("2026-09-03T08:10:00.000Z"),
      },
    });
    await db.assessmentEvent.create({
      data: {
        id: fixtureId("event"),
        organizationId,
        courseId: fixtureCourseId,
        courseItemId: fixtureId("i-quiz"),
        createdByMembershipId: ownerMembershipId,
        type: "QUICK_ASSESSMENT",
        scope: "COURSE",
        title: "Quick check",
        durationMinutes: 10,
        status: "CLOSED",
        openedAt: new Date("2026-09-04T08:00:00.000Z"),
        closesAt: new Date("2026-09-04T09:00:00.000Z"),
        closedAt: new Date("2026-09-04T09:00:00.000Z"),
      },
    });
    await db.assessmentEventParticipant.create({
      data: { eventId: fixtureId("event"), userId: SEED_STUDENT_ID },
    });
    await db.assessmentAttempt.create({
      data: {
        id: fixtureId("attempt-quiz-event"),
        assessmentId: fixtureId("quiz"),
        courseItemId: fixtureId("i-quiz"),
        organizationId,
        userId: SEED_STUDENT_ID,
        assessmentEventId: fixtureId("event"),
        attemptNumber: 2,
        status: "GRADED",
        score: 3,
        maxScore: 3,
        startedAt: new Date("2026-09-04T08:00:00.000Z"),
        submittedAt: new Date("2026-09-04T08:05:00.000Z"),
        gradedAt: new Date("2026-09-04T08:05:00.000Z"),
      },
    });
    await db.assessmentAttempt.create({
      data: {
        id: fixtureId("attempt-final-1"),
        assessmentId: fixtureId("final"),
        courseItemId: fixtureId("i-final"),
        organizationId,
        userId: SEED_STUDENT_ID,
        attemptNumber: 1,
        status: "IN_PROGRESS",
        shuffleSeed: "seed",
        startedAt: new Date("2026-09-05T08:00:00.000Z"),
      },
    });
  }

  async function removeFixture() {
    const { db } = modules;
    const inFixture = { startsWith: `eq-${run}-` };
    await db.assessmentAttempt.deleteMany({ where: { id: inFixture } });
    await db.assessmentEventParticipant.deleteMany({
      where: { eventId: inFixture },
    });
    await db.assessmentEvent.deleteMany({ where: { id: inFixture } });
    await db.contentProgress.deleteMany({
      where: { courseItemId: inFixture },
    });
    await db.cohortEnrollment.deleteMany({ where: { cohortId: inFixture } });
    await db.cohort.deleteMany({ where: { id: inFixture } });
    await db.courseEnrollment.deleteMany({
      where: { courseId: fixtureCourseId },
    });
    await db.courseItem.deleteMany({ where: { id: inFixture } });
    await db.courseModule.deleteMany({ where: { id: inFixture } });
    await db.course.deleteMany({ where: { id: fixtureCourseId } });
    await db.material.deleteMany({ where: { id: inFixture } });
    await db.assessment.deleteMany({ where: { id: inFixture } });
    await db.vocabularySet.deleteMany({ where: { id: inFixture } });
    await db.pdfBook.deleteMany({ where: { id: inFixture } });
    await db.asset.deleteMany({ where: { id: inFixture } });
  }

  beforeAll(async () => {
    proxy = await routeNeonToLocalPostgres();
    const [
      { db },
      { getCourseOutlineForUser },
      { getCourseItemDetails },
      { getLearnerAssessmentsForCourseItems },
      { buildCourseBundle },
      { buildLearnerState },
    ] = await Promise.all([
      import("~/server/db"),
      import("~/server/learning/course-outline"),
      import("~/server/learning/course-item-detail"),
      import("~/server/assessment/learner-view"),
      import("./course-bundle"),
      import("./learner-state"),
    ]);
    modules = {
      db,
      getCourseOutlineForUser,
      getCourseItemDetails,
      getLearnerAssessmentsForCourseItems,
      buildCourseBundle,
      buildLearnerState,
    };
    await removeFixture();
    await createFixture();
  }, 60_000);

  afterAll(async () => {
    if (modules) {
      await removeFixture();
      await modules.db.$disconnect();
    }
    await proxy?.stop(true);
  }, 60_000);

  async function enrolledCourseIds() {
    const { db } = modules;
    const [direct, cohorts] = await Promise.all([
      db.courseEnrollment.findMany({
        where: { userId: SEED_STUDENT_ID, status: "ACTIVE" },
        select: { courseId: true },
      }),
      db.cohortEnrollment.findMany({
        where: { userId: SEED_STUDENT_ID, status: "ACTIVE" },
        select: { cohort: { select: { courseId: true } } },
      }),
    ]);
    const ids = new Set([
      ...direct.map((entry) => entry.courseId),
      ...cohorts.map((entry) => entry.cohort.courseId),
    ]);
    const published = await db.course.findMany({
      where: { id: { in: [...ids] }, status: "PUBLISHED" },
      select: { id: true },
      orderBy: { id: "asc" },
    });
    return published.map((course) => course.id);
  }

  async function composeInputs(courseId: string) {
    const { db, buildCourseBundle, buildLearnerState } = modules;
    const [bundle, state, organization] = await Promise.all([
      buildCourseBundle(db, courseId),
      buildLearnerState(db, SEED_STUDENT_ID, [courseId]),
      db.course
        .findUniqueOrThrow({
          where: { id: courseId },
          select: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
                logoUrl: true,
                theme: true,
                themeEnabled: true,
              },
            },
          },
        })
        .then((course) => course.organization),
    ]);
    // Both travel to the device as plain JSON.
    return { bundle: wire(bundle), state: wire(state), organization };
  }

  test("covers the seeded courses and the sequential fixture", async () => {
    const courseIds = await enrolledCourseIds();
    expect(courseIds).toContain(fixtureCourseId);
    expect(courseIds.length).toBeGreaterThan(1);
  });

  test("composeCourseOutline equals getCourseOutlineForUser (learner view)", async () => {
    for (const courseId of await enrolledCourseIds()) {
      const { bundle, state, organization } = await composeInputs(courseId);
      const online = await modules.getCourseOutlineForUser(
        courseId,
        SEED_STUDENT_ID,
        { managementAccess: false },
      );
      const local = composeCourseOutline(bundle, state, { organization });
      expect({ courseId, outline: plain(local) }).toEqual({
        courseId,
        outline: plain(online),
      });
    }
  });

  test("the fixture exercises locking, attempts and completion", async () => {
    const { bundle, state } = await composeInputs(fixtureCourseId);
    const outline = composeCourseOutline(bundle, state);
    expect(outline.modules.map((module) => module.access)).toEqual([
      "AVAILABLE",
      "LOCKED",
      "LOCKED",
    ]);
    const [lesson, set, quiz] = outline.modules[0]!.items;
    expect([lesson?.isCompleted, set?.isCompleted, quiz?.isCompleted]).toEqual([
      true,
      false,
      // Only the standalone attempt counts, and it failed.
      false,
    ]);
    expect(quiz?.attempt?.id).toBe(fixtureId("attempt-quiz-1"));
    expect(outline.modules[0]!.items.map((item) => item.id)).not.toContain(
      fixtureId("i-hidden"),
    );
  });

  test("composeCourseItem equals getCourseItemDetails for every item", async () => {
    for (const courseId of await enrolledCourseIds()) {
      const { bundle, state } = await composeInputs(courseId);
      const itemIds = bundle.structure.modules.flatMap((module) =>
        module.items.map((item) => item.id),
      );
      const online = await modules.getCourseItemDetails(
        modules.db,
        SEED_STUDENT_ID,
        itemIds,
      );
      for (const itemId of itemIds) {
        const local = composeCourseItem(bundle, state, itemId);
        expect({ itemId, detail: normalizeItem(local) }).toEqual({
          itemId,
          detail: normalizeItem(online.get(itemId) ?? null),
        });
      }
    }
  });

  test("the fixture lesson resolves requirements, embeds and pdf pages", async () => {
    const { bundle, state } = await composeInputs(fixtureCourseId);
    const lesson = composeCourseItem(bundle, state, fixtureId("i-lesson"));
    // The quiz requirement is met by the event attempt; the set is not practiced.
    expect(
      lesson?.material?.requiredActivities.map((activity) => activity.type),
    ).toEqual(["VOCABULARY_SET"]);
    expect(lesson?.material?.assets.map(({ asset }) => asset.id)).toEqual([
      fixtureId("image"),
    ]);
    expect(
      lesson?.embeddedResources.assessments.map((assessment) => assessment.id),
    ).toEqual([fixtureId("quiz")]);
    expect(
      lesson?.embeddedResources.pdfBooks[0]?.pages.map(
        (page) => page.pageNumber,
      ),
    ).toEqual([2, 3, 4]);
    const review = composeCourseItem(bundle, state, fixtureId("i-review"));
    expect(
      review?.material?.requiredActivities.map(
        (activity) => activity.courseItemId,
      ),
    ).toEqual([fixtureId("i-final")]);
  });

  test("composeLearnerAssessment equals getLearnerAssessmentsForCourseItems", async () => {
    for (const courseId of await enrolledCourseIds()) {
      const { bundle, state } = await composeInputs(courseId);
      const itemIds = bundle.structure.modules.flatMap((module) =>
        module.items.map((item) => item.id),
      );
      const online = await modules.getLearnerAssessmentsForCourseItems(
        modules.db,
        SEED_STUDENT_ID,
        itemIds,
      );
      for (const itemId of itemIds) {
        const local = composeLearnerAssessment(bundle, state, itemId);
        expect({ itemId, assessment: plain(local) }).toEqual({
          itemId,
          assessment: plain(online.get(itemId) ?? null),
        });
      }
    }
  });

  test("the fixture assessments carry attempts and cohorts", async () => {
    const { bundle, state } = await composeInputs(fixtureCourseId);
    const quiz = composeLearnerAssessment(bundle, state, fixtureId("i-quiz"));
    expect(quiz?.latestStandaloneAttempt?.id).toBe(fixtureId("attempt-quiz-1"));
    expect(quiz?.standaloneAttemptCount).toBe(1);
    expect(quiz?.eligibleCohorts).toEqual([
      { id: fixtureId("cohort"), name: "Equivalence cohort" },
    ]);
    const final = composeLearnerAssessment(bundle, state, fixtureId("i-final"));
    expect(final?.latestStandaloneAttempt?.status).toBe("IN_PROGRESS");
    expect(JSON.stringify(final?.questions).includes("isCorrect")).toBe(false);
  });
});
