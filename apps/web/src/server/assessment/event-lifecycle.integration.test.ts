import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import { assessmentEventRouter } from "../api/routers/assessment-event";
import { db } from "../db";
import {
  closeAssessmentEvent,
  runAssessmentEventLifecycle,
} from "./event-lifecycle";
import { authorizeEventManager } from "./event-management";

// Runs against DATABASE_URL with its own organization, removed afterwards.
const run = Bun.env.DATABASE_URL ? describe : describe.skip;

const fixture = crypto.randomUUID().slice(0, 8);
const ids = {
  organization: `evt-org-${fixture}`,
  course: `evt-course-${fixture}`,
  item: `evt-item-${fixture}`,
  k1: `evt-k1-${fixture}`,
  k2: `evt-k2-${fixture}`,
  selfPaced: `evt-self-${fixture}`,
  audio: `evt-audio-${fixture}`,
};
const users = {
  owner: `evt-owner-${fixture}`,
  teacher: `evt-teacher-${fixture}`,
  l1: `evt-l1-${fixture}`,
  l2: `evt-l2-${fixture}`,
  l3: `evt-l3-${fixture}`,
  self: `evt-self-learner-${fixture}`,
  late: `evt-late-${fixture}`,
};

function caller(userId: string) {
  return assessmentEventRouter.createCaller({
    db,
    actorKind: "mcp",
    actorUserId: userId,
    session: null,
    headers: new Headers(),
    requestCache: new Map(),
  });
}

const inOneHour = () => new Date(Date.now() + 60 * 60_000);

function eventInput(
  overrides: Partial<Parameters<ReturnType<typeof caller>["create"]>[0]> = {},
) {
  return {
    courseId: ids.course,
    courseItemId: ids.item,
    type: "TRYOUT" as const,
    target: { allCohorts: false, cohortIds: [ids.k1] },
    title: `Event ${crypto.randomUUID().slice(0, 6)}`,
    durationMinutes: 30,
    closesAt: inOneHour(),
    start: { mode: "now" as const, notify: false },
    ...overrides,
  };
}

async function enroll(userId: string, cohortId: string, enrolledAt: Date) {
  await db.cohortEnrollment.create({
    data: { userId, cohortId, source: "MANUAL", status: "ACTIVE", enrolledAt },
  });
}

/** The error a promise rejects with, or null when it resolves. */
async function rejection(promise: Promise<unknown>) {
  try {
    await promise;
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

async function participants(eventId: string) {
  const rows = await db.assessmentEventParticipant.findMany({
    where: { eventId },
    select: { userId: true, cohortId: true },
  });
  return Object.fromEntries(rows.map((row) => [row.userId, row.cohortId]));
}

run("class-targeted assessment events", () => {
  beforeAll(async () => {
    await db.user.createMany({
      data: Object.values(users).map((id) => ({
        id,
        email: `${id}@example.test`,
        name: id,
      })),
    });
    await db.organization.create({
      data: {
        id: ids.organization,
        name: "Event fixture",
        slug: ids.organization,
        permissionMode: "ADVANCED",
        members: {
          create: [
            { id: `m-owner-${fixture}`, userId: users.owner, role: "OWNER" },
            {
              id: `m-teacher-${fixture}`,
              userId: users.teacher,
              role: "TEACHER",
            },
          ],
        },
      },
    });
    await db.course.create({
      data: {
        id: ids.course,
        organizationId: ids.organization,
        ownerMembershipId: `m-owner-${fixture}`,
        slug: ids.course,
        title: "Event fixture course",
        status: "PUBLISHED",
      },
    });
    await db.asset.create({
      data: {
        id: ids.audio,
        organizationId: ids.organization,
        objectKey: `fixtures/${ids.audio}.mp3`,
        fileName: "listening.mp3",
        contentType: "audio/mpeg",
        size: 2048,
        confirmedAt: new Date(),
      },
    });
    const assessment = await db.assessment.create({
      data: {
        organizationId: ids.organization,
        createdByMembershipId: `m-owner-${fixture}`,
        title: "Fixture assessment",
        questions: {
          create: {
            type: "SINGLE_CHOICE",
            position: 0,
            prompt: [
              { type: "paragraph", content: "Q" },
              { type: "assetAudio", props: { assetId: ids.audio } },
            ],
            options: {
              create: [
                {
                  position: 0,
                  content: [{ type: "paragraph", content: "A" }],
                  isCorrect: true,
                },
                {
                  position: 1,
                  content: [{ type: "paragraph", content: "B" }],
                },
              ],
            },
          },
        },
      },
    });
    const courseModule = await db.courseModule.create({
      data: {
        organizationId: ids.organization,
        courseId: ids.course,
        position: 0,
        title: "Module",
      },
    });
    await db.courseItem.create({
      data: {
        id: ids.item,
        moduleId: courseModule.id,
        organizationId: ids.organization,
        type: "ASSESSMENT",
        assessmentId: assessment.id,
        position: 0,
        isPublished: true,
      },
    });
    await db.cohort.createMany({
      data: [
        { id: ids.k1, name: "Kelas 1", status: "IN_PROGRESS" as const },
        { id: ids.k2, name: "Kelas 2", status: "COMPLETED" as const },
        {
          id: ids.selfPaced,
          name: "Belajar mandiri",
          status: "OPEN" as const,
          defaultForCourseId: ids.course,
        },
      ].map((cohort) => ({
        ...cohort,
        organizationId: ids.organization,
        courseId: ids.course,
      })),
    });
    await db.cohortStaff.create({
      data: {
        cohortId: ids.k1,
        organizationId: ids.organization,
        organizationMemberId: `m-teacher-${fixture}`,
        role: "INSTRUCTOR",
      },
    });
    const day = 24 * 60 * 60_000;
    await enroll(users.l1, ids.k1, new Date(Date.now() - 3 * day));
    await enroll(users.l2, ids.k2, new Date(Date.now() - 3 * day));
    // l3 joined Kelas 2 first, then Kelas 1.
    await enroll(users.l3, ids.k2, new Date(Date.now() - 2 * day));
    await enroll(users.l3, ids.k1, new Date(Date.now() - day));
    await enroll(users.self, ids.selfPaced, new Date(Date.now() - day));
  });

  afterAll(async () => {
    const events = await db.assessmentEvent.findMany({
      where: { organizationId: ids.organization },
      select: { id: true },
    });
    const eventIds = events.map((event) => event.id);
    await db.assessmentAttempt.deleteMany({
      where: { organizationId: ids.organization },
    });
    await db.assessmentEventAudit.deleteMany({
      where: { eventId: { in: eventIds } },
    });
    await db.assessmentEvent.deleteMany({
      where: { organizationId: ids.organization },
    });
    await db.cohortEnrollment.deleteMany({
      where: { cohort: { organizationId: ids.organization } },
    });
    await db.cohortStaff.deleteMany({
      where: { organizationId: ids.organization },
    });
    await db.cohort.deleteMany({ where: { organizationId: ids.organization } });
    await db.courseItem.deleteMany({
      where: { organizationId: ids.organization },
    });
    await db.courseModule.deleteMany({
      where: { organizationId: ids.organization },
    });
    await db.course.deleteMany({ where: { organizationId: ids.organization } });
    await db.assessment.deleteMany({
      where: { organizationId: ids.organization },
    });
    await db.asset.deleteMany({ where: { organizationId: ids.organization } });
    await db.organizationMember.deleteMany({
      where: { organizationId: ids.organization },
    });
    await db.organization.deleteMany({ where: { id: ids.organization } });
    await db.user.deleteMany({ where: { id: { in: Object.values(users) } } });
  });

  test("class staff open events for their own classes only", async () => {
    const teacher = caller(users.teacher);
    const event = await teacher.create(eventInput());
    expect(event.status).toBe("OPEN");
    expect(event.targets.map((target) => target.id)).toEqual([ids.k1]);
    // l3 takes part through their earliest targeted class.
    expect(await participants(event.id)).toEqual({
      [users.l1]: ids.k1,
      [users.l3]: ids.k1,
    });

    expect(
      await rejection(
        teacher.create(
          eventInput({
            target: { allCohorts: false, cohortIds: [ids.k1, ids.k2] },
          }),
        ),
      ),
    ).toContain("kelas yang kamu ajar");
    expect(
      await rejection(
        teacher.create(
          eventInput({ target: { allCohorts: true, cohortIds: [] } }),
        ),
      ),
    ).toContain("semua kelas");
    expect(
      await rejection(
        teacher.addCohorts({
          eventId: event.id,
          cohortIds: [ids.k2],
          notify: false,
        }),
      ),
    ).not.toBeNull();

    // Course managers can extend it; the new class's learners join right away.
    const added = await caller(users.owner).addCohorts({
      eventId: event.id,
      cohortIds: [ids.k2],
      notify: false,
    });
    expect(added.added).toBe(1);
    expect((await participants(event.id))[users.l2]).toBe(ids.k2);
  });

  test("all-class events target every class, and late joiners take part", async () => {
    const owner = caller(users.owner);
    const event = await owner.create(
      eventInput({ target: { allCohorts: true, cohortIds: [] } }),
    );
    expect(event.targets.map((target) => target.id).sort()).toEqual(
      [ids.k1, ids.k2, ids.selfPaced].sort(),
    );
    expect(Object.keys(await participants(event.id)).sort()).toEqual(
      [users.l1, users.l2, users.l3, users.self].sort(),
    );

    // Self-paced attempts carry no class, like chapter attempts.
    const selfAttempt = await caller(users.self).startAttempt({
      eventId: event.id,
    });
    expect(selfAttempt.cohortId).toBeNull();

    await enroll(users.late, ids.k2, new Date());
    const late = caller(users.late);
    const listed = await late.listForLearner();
    const visible = listed.find((entry) => entry.id === event.id);
    expect(visible?.entry.canStart).toBe(true);
    expect(visible?.cohort?.id).toBe(ids.k2);
    const attempt = await late.startAttempt({ eventId: event.id });
    expect(attempt.cohortId).toBe(ids.k2);
    expect((await participants(event.id))[users.late]).toBe(ids.k2);

    // A class staff member reviews only their class on someone else's event.
    const managed = await caller(users.teacher).getManageable({
      eventId: event.id,
    });
    expect(managed.canManage).toBe(false);
    expect(managed.reviewCohortIds).toEqual([ids.k1]);
    expect(
      managed.participants.every(
        (participant) => participant.cohort?.id === ids.k1,
      ),
    ).toBe(true);
    expect(
      await rejection(caller(users.teacher).close({ eventId: event.id })),
    ).not.toBeNull();
  });

  test("scheduled events are visible ahead and open when due", async () => {
    const owner = caller(users.owner);
    const event = await owner.create(
      eventInput({
        start: {
          mode: "schedule",
          opensAt: new Date(Date.now() + 10 * 60_000),
          notify: true,
        },
      }),
    );
    expect(event.status).toBe("SCHEDULED");
    const learner = caller(users.l1);
    const upcoming = (
      await learner.listForLearner({ includeScheduled: true })
    ).find((entry) => entry.id === event.id);
    expect(upcoming?.status).toBe("SCHEDULED");
    expect(upcoming?.entry.canStart).toBe(false);
    // Media is only listed once the event opens, so listening files are not handed out early.
    expect((await learner.getForLearner({ eventId: event.id })).media).toEqual(
      [],
    );
    // App versions that predate scheduling never see it.
    expect(
      (await learner.listForLearner()).some((entry) => entry.id === event.id),
    ).toBe(false);
    expect(
      await rejection(learner.startAttempt({ eventId: event.id })),
    ).not.toBeNull();

    // Due: the first learner to start opens it without waiting for the cron.
    await db.assessmentEvent.update({
      where: { id: event.id },
      data: { opensAt: new Date(Date.now() - 1000) },
    });
    const attempt = await learner.startAttempt({ eventId: event.id });
    expect(attempt.status).toBe("IN_PROGRESS");
    expect((await learner.getForLearner({ eventId: event.id })).media).toEqual([
      { assetId: ids.audio, size: 2048 },
    ]);
    const opened = await db.assessmentEvent.findUniqueOrThrow({
      where: { id: event.id },
      select: { status: true },
    });
    expect(opened.status).toBe("OPEN");
  });

  test("the lifecycle cron opens, closes and grades events", async () => {
    const owner = caller(users.owner);
    const scheduled = await owner.create(
      eventInput({
        start: {
          mode: "schedule",
          opensAt: new Date(Date.now() + 10 * 60_000),
          notify: true,
        },
      }),
    );
    const open = await owner.create(eventInput());
    const attempt = await caller(users.l1).startAttempt({ eventId: open.id });
    await db.assessmentEvent.update({
      where: { id: scheduled.id },
      data: { opensAt: new Date(Date.now() - 1000) },
    });
    const closesAt = new Date(Date.now() - 1000);
    await db.assessmentEvent.update({
      where: { id: open.id },
      data: { closesAt },
    });

    const result = await runAssessmentEventLifecycle(
      db,
      new Date(),
      Date.now() + 30_000,
    );
    expect(result.opened).toContain(scheduled.id);
    expect(result.notified).toBeGreaterThan(0);
    expect(result.closed).toContain(open.id);
    // The scheduled opening's push is claimed exactly once.
    const announced = await db.assessmentEvent.findUniqueOrThrow({
      where: { id: scheduled.id },
      select: { openNotificationSentAt: true },
    });
    expect(announced.openNotificationSentAt).not.toBeNull();

    const closed = await db.assessmentEvent.findUniqueOrThrow({
      where: { id: open.id },
      select: { status: true, closedAt: true, attemptsFinalizedAt: true },
    });
    expect(closed.status).toBe("CLOSED");
    expect(closed.closedAt?.getTime()).toBe(closesAt.getTime());
    expect(closed.attemptsFinalizedAt).not.toBeNull();
    const graded = await db.assessmentAttempt.findUniqueOrThrow({
      where: { id: attempt.id },
      select: { status: true, submittedAt: true },
    });
    expect(graded.status).toBe("GRADED");
    expect(graded.submittedAt?.getTime()).toBe(closesAt.getTime());

    // A second run has nothing left to do.
    const again = await runAssessmentEventLifecycle(
      db,
      new Date(),
      Date.now() + 30_000,
    );
    expect(again.closed).not.toContain(open.id);
    expect(again.opened).not.toContain(scheduled.id);
  });

  test("changes are authorized against the targets under the row lock", async () => {
    const teacherEvent = await caller(users.teacher).create(eventInput());
    // The teacher passed every up-front check; meanwhile the owner adds a class they do not teach.
    await caller(users.owner).addCohorts({
      eventId: teacherEvent.id,
      cohortIds: [ids.k2],
      notify: false,
    });
    expect(
      await rejection(
        closeAssessmentEvent(db, {
          eventId: teacherEvent.id,
          closedAt: new Date(),
          actorMembershipId: `m-teacher-${fixture}`,
          authorize: authorizeEventManager(users.teacher),
        }),
      ),
    ).toContain("kelas yang kamu ajar");
    expect(
      await rejection(
        caller(users.teacher).delete({ eventId: teacherEvent.id }),
      ),
    ).not.toBeNull();
    const still = await db.assessmentEvent.findUnique({
      where: { id: teacherEvent.id },
      select: { status: true },
    });
    expect(still?.status).toBe("OPEN");
  });

  test("a pending opened push is retried by the next cron run", async () => {
    const event = await caller(users.owner).create(eventInput());
    // Simulates a request that opened the event but died before its push went out.
    await db.assessmentEvent.update({
      where: { id: event.id },
      data: { openNotificationSentAt: null },
    });
    await runAssessmentEventLifecycle(db, new Date(), Date.now() + 30_000);
    const announced = await db.assessmentEvent.findUniqueOrThrow({
      where: { id: event.id },
      select: { openNotificationSentAt: true },
    });
    expect(announced.openNotificationSentAt).not.toBeNull();
  });

  test("target cohort picker reports learners and access", async () => {
    const teacherView = await caller(users.teacher).listTargetCohorts({
      courseId: ids.course,
    });
    expect(teacherView.canTargetAll).toBe(false);
    const byId = new Map(
      teacherView.cohorts.map((cohort) => [cohort.id, cohort]),
    );
    expect(byId.get(ids.k1)?.canTarget).toBe(true);
    expect(byId.get(ids.k2)?.canTarget).toBe(false);
    expect(byId.get(ids.k1)?.learnerCount).toBe(2);
    expect(byId.get(ids.selfPaced)?.selfPaced).toBe(true);
    const ownerView = await caller(users.owner).listTargetCohorts({
      courseId: ids.course,
    });
    expect(ownerView.canTargetAll).toBe(true);
    expect(ownerView.cohorts.every((cohort) => cohort.canTarget)).toBe(true);
  });
});
