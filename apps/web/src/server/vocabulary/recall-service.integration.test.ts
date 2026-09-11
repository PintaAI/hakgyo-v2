import { expect, test } from "bun:test";
import { db } from "~/server/db";
import { requireCourseItemAccess } from "~/server/authorization";
import { learningRouter } from "~/server/api/routers/learning";
import { getCourseOutlineForUser } from "~/server/learning/course-outline";
import { createVocabularyRecallService } from "./recall-service";

async function expectCode(operation: Promise<unknown>, code: string) {
  let caught: unknown;
  try {
    await operation;
  } catch (error) {
    caught = error;
  }
  expect(caught).toMatchObject({ code });
}

// Opt in only with a disposable, migrated database.
const integration = test.skipIf(
  process.env.VOCABULARY_RECALL_INTEGRATION !== "1",
);

async function fixture(
  run: (f: Awaited<ReturnType<typeof createFixture>>) => Promise<void>,
) {
  const f = await createFixture();
  try {
    await run(f);
  } finally {
    await db.userActivityEvent.deleteMany({ where: { userId: f.userId } });
    await db.contentProgress.deleteMany({ where: { userId: f.userId } });
    await db.courseItem.deleteMany({ where: { organizationId: f.org.id } });
    await db.materialRequirement.deleteMany({
      where: { organizationId: f.org.id },
    });
    await db.course.deleteMany({ where: { organizationId: f.org.id } });
    await db.material.deleteMany({ where: { organizationId: f.org.id } });
    await db.vocabularySet.deleteMany({ where: { organizationId: f.org.id } });
    await db.organization.delete({ where: { id: f.org.id } });
    await db.user.delete({ where: { id: f.userId } });
  }
}

async function createFixture() {
  const userId = crypto.randomUUID();
  await db.user.create({
    data: { id: userId, name: "Recall test", email: `${userId}@test.invalid` },
  });
  const org = await db.organization.create({
    data: { name: "Recall test", slug: userId },
  });
  const member = await db.organizationMember.create({
    data: { organizationId: org.id, userId, role: "OWNER" },
  });
  const course = await db.course.create({
    data: {
      organizationId: org.id,
      ownerMembershipId: member.id,
      slug: userId,
      title: "Recall",
      status: "PUBLISHED",
    },
  });
  const courseModule = await db.courseModule.create({
    data: {
      courseId: course.id,
      organizationId: org.id,
      title: "Recall",
      position: 0,
    },
  });
  const set = await db.vocabularySet.create({
    data: {
      organizationId: org.id,
      createdByMembershipId: member.id,
      title: "Recall",
    },
  });
  const entry = await db.vocabularyEntry.create({
    data: {
      organizationId: org.id,
      vocabularySetId: set.id,
      term: "학교",
      definition: "school",
    },
  });
  const item = await db.courseItem.create({
    data: {
      organizationId: org.id,
      moduleId: courseModule.id,
      vocabularySetId: set.id,
      type: "VOCABULARY_SET",
      position: 0,
      isPublished: true,
    },
  });
  const material = await db.material.create({
    data: {
      organizationId: org.id,
      createdByMembershipId: member.id,
      title: "Dependent",
      content: [],
    },
  });
  await db.materialRequirement.create({
    data: {
      organizationId: org.id,
      materialId: material.id,
      vocabularySetId: set.id,
      type: "VOCABULARY_SET",
      position: 0,
    },
  });
  const materialItem = await db.courseItem.create({
    data: {
      organizationId: org.id,
      moduleId: courseModule.id,
      materialId: material.id,
      type: "MATERIAL",
      position: 1,
      isPublished: true,
    },
  });
  const service = createVocabularyRecallService(db, requireCourseItemAccess);
  const caller = learningRouter.createCaller({
    db,
    actorKind: "mcp",
    actorUserId: userId,
    session: null,
    headers: new Headers(),
  });
  const scope = { sourceCourseItemId: item.id, vocabularySetId: set.id };
  const start = () => service.start(userId, { ...scope, entryId: entry.id });
  const answer = async (value: string) => {
    await db.vocabularyMemory.updateMany({
      where: { userId },
      data: { nextReviewAt: new Date(0) },
    });
    const c = await start();
    return service.submit(userId, {
      challengeId: c.challengeId,
      answer: value,
    });
  };
  return {
    userId,
    org,
    course,
    material,
    item,
    materialItem,
    entry,
    service,
    caller,
    scope,
    start,
    answer,
  };
}

integration(
  "completion gates, concurrent retries, revocation and reward deduplication",
  () =>
    fixture(async (f) => {
      await db.contentProgress.create({
        data: {
          userId: f.userId,
          courseItemId: f.item.id,
          status: "COMPLETED",
        },
      });
      expect(
        (await getCourseOutlineForUser(f.course.id, f.userId)).modules[0]
          ?.items[0]?.isCompleted,
      ).toBe(false);
      for (const courseItemId of [f.item.id, f.materialItem.id]) {
        await expectCode(
          f.caller.markContentProgress({ courseItemId, status: "COMPLETED" }),
          "PRECONDITION_FAILED",
        );
      }
      expect(
        (await f.caller.getCourseItem({ courseItemId: f.item.id }))?.progress[0]
          ?.status,
      ).toBe("IN_PROGRESS");
      expect(
        (
          await f.caller.markContentProgress({
            courseItemId: f.item.id,
            status: "IN_PROGRESS",
          })
        ).status,
      ).toBe("IN_PROGRESS");
      const [a, b] = await Promise.all([f.start(), f.start()]);
      expect(a.challengeId).toBe(b.challengeId);
      expect(a).not.toHaveProperty("expectedAnswer");
      const results = await Promise.all(
        [a, b].map((c) =>
          f.service.submit(f.userId, {
            challengeId: c.challengeId,
            answer: "학교",
          }),
        ),
      );
      expect(results.filter((r) => r.applied)).toHaveLength(1);
      expect(results[0]?.items[0]?.passStreak).toBe(1);
      await expectCode(f.start(), "PRECONDITION_FAILED");
      expect((await f.answer("학교")).remembered).toBe(false);
      expect((await f.answer("학교")).remembered).toBe(true);
      await f.caller.markContentProgress({
        courseItemId: f.item.id,
        status: "COMPLETED",
      });
      await f.caller.markContentProgress({
        courseItemId: f.materialItem.id,
        status: "COMPLETED",
      });
      expect((await f.answer("wrong")).remembered).toBe(true);
      const [failed] = await Promise.all([
        f.answer("wrong"),
        f.caller
          .markContentProgress({
            courseItemId: f.materialItem.id,
            status: "COMPLETED",
          })
          .catch((error: unknown) => {
            expect(error).toMatchObject({ code: "PRECONDITION_FAILED" });
          }),
      ]);
      expect(failed.remembered).toBe(false);
      expect(
        await db.contentProgress.count({
          where: { userId: f.userId, status: "COMPLETED" },
        }),
      ).toBe(0);
      for (let i = 0; i < 3; i++) await f.answer("학교");
      await f.caller.markContentProgress({
        courseItemId: f.item.id,
        status: "COMPLETED",
      });
      expect(
        await db.userActivityEvent.count({
          where: { userId: f.userId, action: "VOCABULARY_REVIEWED" },
        }),
      ).toBe(1);
    }),
  30_000,
);

integration(
  "ownership, expiration, access revocation and changed content",
  () =>
    fixture(async (f) => {
      await expectCode(
        f.service.start(f.userId, { ...f.scope, entryId: "foreign" }),
        "NOT_FOUND",
      );
      const anonymous = learningRouter.createCaller({
        db,
        actorKind: "session",
        actorUserId: null,
        session: null,
        headers: new Headers(),
      });
      await expectCode(anonymous.getVocabularyMemory(f.scope), "UNAUTHORIZED");
      const first = await f.start();
      await expectCode(
        f.service.submit("other-user", {
          challengeId: first.challengeId,
          answer: "학교",
        }),
        "NOT_FOUND",
      );
      await db.vocabularyRecallChallenge.update({
        where: { id: first.challengeId },
        data: { expiresAt: new Date(0) },
      });
      await expectCode(
        f.service.submit(f.userId, {
          challengeId: first.challengeId,
          answer: "학교",
        }),
        "PRECONDITION_FAILED",
      );
      const second = await f.start();
      await db.courseItem.update({
        where: { id: f.item.id },
        data: { isPublished: false },
      });
      await expectCode(
        f.service.submit(f.userId, {
          challengeId: second.challengeId,
          answer: "학교",
        }),
        "NOT_FOUND",
      );
      await db.courseItem.update({
        where: { id: f.item.id },
        data: { isPublished: true },
      });
      await db.vocabularyEntry.update({
        where: { id: f.entry.id },
        data: { definition: "a school" },
      });
      await expectCode(
        f.service.submit(f.userId, {
          challengeId: second.challengeId,
          answer: "학교",
        }),
        "PRECONDITION_FAILED",
      );
      for (let i = 0; i < 3; i++) await f.answer("학교");
      await db.vocabularyEntry.update({
        where: { id: f.entry.id },
        data: { term: "학생" },
      });
      expect(
        (await f.service.getStatus(f.userId, f.scope)).items[0]?.remembered,
      ).toBe(false);
      expect((await f.answer("학생")).items[0]?.passStreak).toBe(1);
    }),
  30_000,
);

integration(
  "all words are required and embedded entry points share evidence",
  () =>
    fixture(async (f) => {
      await expectCode(
        f.service.getStatus("not-enrolled", f.scope),
        "FORBIDDEN",
      );
      const second = await db.vocabularyEntry.create({
        data: {
          organizationId: f.org.id,
          vocabularySetId: f.scope.vocabularySetId,
          term: "학생",
          definition: "student",
        },
      });
      for (let i = 0; i < 3; i++) await f.answer("학교");
      const partial = await f.service.getStatus(f.userId, f.scope);
      expect(
        partial.items.find((item) => item.entryId === f.entry.id)?.remembered,
      ).toBe(true);
      expect(partial.remembered).toBe(false);
      await expectCode(
        f.caller.markContentProgress({
          courseItemId: f.item.id,
          status: "COMPLETED",
        }),
        "PRECONDITION_FAILED",
      );
      const embedded = { ...f.scope, sourceCourseItemId: f.materialItem.id };
      await expectCode(f.service.getStatus(f.userId, embedded), "NOT_FOUND");
      await db.material.update({
        where: { id: f.material.id },
        data: {
          content: [
            {
              type: "vocabularyReference",
              props: { vocabularySetId: f.scope.vocabularySetId },
            },
          ],
        },
      });
      expect((await f.service.getStatus(f.userId, embedded)).items).toEqual(
        partial.items,
      );
      const old = await f.service.start(f.userId, {
        ...f.scope,
        entryId: second.id,
      });
      const current = await f.service.start(f.userId, {
        ...embedded,
        entryId: second.id,
      });
      await expectCode(
        f.service.submit(f.userId, {
          challengeId: old.challengeId,
          answer: "학생",
        }),
        "PRECONDITION_FAILED",
      );
      await f.service.submit(f.userId, {
        challengeId: current.challengeId,
        answer: "학생",
      });
      for (let i = 0; i < 2; i++) {
        await db.vocabularyMemory.updateMany({
          where: { userId: f.userId, entryId: second.id },
          data: { nextReviewAt: new Date(0) },
        });
        const challenge = await f.service.start(f.userId, {
          ...embedded,
          entryId: second.id,
        });
        await f.service.submit(f.userId, {
          challengeId: challenge.challengeId,
          answer: "학생",
        });
      }
      expect((await f.service.getStatus(f.userId, f.scope)).remembered).toBe(
        true,
      );
      await f.caller.markContentProgress({
        courseItemId: f.item.id,
        status: "COMPLETED",
      });
      await db.vocabularyEntry.deleteMany({
        where: { vocabularySetId: f.scope.vocabularySetId },
      });
      expect((await f.service.getStatus(f.userId, f.scope)).remembered).toBe(
        false,
      );
      expect(
        await db.vocabularyMemory.count({ where: { userId: f.userId } }),
      ).toBe(0);
      await expectCode(
        f.caller.markContentProgress({
          courseItemId: f.item.id,
          status: "COMPLETED",
        }),
        "PRECONDITION_FAILED",
      );
    }),
  30_000,
);

integration(
  "ANY material keeps completion when another vocabulary requirement still passes",
  () =>
    fixture(async (f) => {
      const source = await db.vocabularySet.findUniqueOrThrow({
        where: { id: f.scope.vocabularySetId },
      });
      const alternate = await db.vocabularySet.create({
        data: {
          organizationId: f.org.id,
          createdByMembershipId: source.createdByMembershipId,
          title: "Alternative",
        },
      });
      const entry = await db.vocabularyEntry.create({
        data: {
          organizationId: f.org.id,
          vocabularySetId: alternate.id,
          term: "학생",
          definition: "student",
        },
      });
      const placement = await db.courseItem.create({
        data: {
          organizationId: f.org.id,
          moduleId: f.item.moduleId,
          vocabularySetId: alternate.id,
          type: "VOCABULARY_SET",
          position: 2,
          isPublished: true,
        },
      });
      await db.material.update({
        where: { id: f.material.id },
        data: { requirementPolicy: "ANY" },
      });
      await db.materialRequirement.create({
        data: {
          organizationId: f.org.id,
          materialId: f.material.id,
          vocabularySetId: alternate.id,
          type: "VOCABULARY_SET",
          position: 1,
        },
      });
      for (let i = 0; i < 3; i++) {
        await db.vocabularyMemory.updateMany({
          where: { userId: f.userId },
          data: { nextReviewAt: new Date(0) },
        });
        const challenge = await f.service.start(f.userId, {
          sourceCourseItemId: placement.id,
          vocabularySetId: alternate.id,
          entryId: entry.id,
        });
        await f.service.submit(f.userId, {
          challengeId: challenge.challengeId,
          answer: "학생",
        });
        await f.answer("학교");
      }
      await f.caller.markContentProgress({
        courseItemId: f.materialItem.id,
        status: "COMPLETED",
      });
      await f.answer("wrong");
      await f.answer("wrong");
      expect(
        await db.contentProgress.count({
          where: {
            userId: f.userId,
            courseItemId: f.materialItem.id,
            status: "COMPLETED",
          },
        }),
      ).toBe(1);
    }),
  30_000,
);
