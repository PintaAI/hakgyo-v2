import { expect, test } from "bun:test";

import { learningRouter } from "~/server/api/routers/learning";
import { db } from "~/server/db";

const integration = test.skipIf(
  process.env.VOCABULARY_PROGRESS_INTEGRATION !== "1",
);

integration(
  "attempts are idempotent, complete practice, and require spaced recall for mastery",
  async () => {
    const userId = crypto.randomUUID();
    const ids: { organizationId?: string } = {};
    try {
      await db.user.create({
        data: {
          id: userId,
          name: "Progress test",
          email: `${userId}@test.invalid`,
        },
      });
      const organization = await db.organization.create({
        data: { name: "Progress test", slug: userId },
      });
      ids.organizationId = organization.id;
      const member = await db.organizationMember.create({
        data: { organizationId: organization.id, userId, role: "OWNER" },
      });
      const course = await db.course.create({
        data: {
          organizationId: organization.id,
          ownerMembershipId: member.id,
          slug: userId,
          title: "Progress",
          status: "PUBLISHED",
        },
      });
      const courseModule = await db.courseModule.create({
        data: {
          courseId: course.id,
          organizationId: organization.id,
          title: "Progress",
          position: 0,
        },
      });
      const vocabularySet = await db.vocabularySet.create({
        data: {
          organizationId: organization.id,
          createdByMembershipId: member.id,
          title: "Progress",
        },
      });
      const entry = await db.vocabularyEntry.create({
        data: {
          organizationId: organization.id,
          vocabularySetId: vocabularySet.id,
          term: "학교",
          definition: "school",
        },
      });
      const item = await db.courseItem.create({
        data: {
          organizationId: organization.id,
          moduleId: courseModule.id,
          vocabularySetId: vocabularySet.id,
          type: "VOCABULARY_SET",
          position: 0,
          isPublished: true,
        },
      });
      const caller = learningRouter.createCaller({
        db,
        actorKind: "mcp",
        actorUserId: userId,
        session: null,
        headers: new Headers(),
        requestCache: new Map(),
      });
      const base = {
        gameKey: "cards",
        attempts: [
          {
            attemptId: "first",
            entryId: entry.id,
            evidence: "RECALL" as const,
            result: "CORRECT" as const,
            sourceCourseItemId: item.id,
            vocabularySetId: vocabularySet.id,
          },
        ],
      };

      const first = await caller.recordVocabularyAttempts({
        ...base,
        sessionId: "session-1",
      });
      expect(first.accepted).toBe(1);
      expect(first.sets[0]).toMatchObject({ practiced: true, mastered: false });
      const completed = await db.contentProgress.findUnique({
        where: { courseItemId_userId: { courseItemId: item.id, userId } },
      });
      expect(completed).toMatchObject({ status: "COMPLETED" });

      const duplicate = await caller.recordVocabularyAttempts({
        ...base,
        sessionId: "session-1",
      });
      expect(duplicate).toMatchObject({ accepted: 0, duplicates: 1 });
      expect(
        await db.contentProgress.findUnique({
          where: { courseItemId_userId: { courseItemId: item.id, userId } },
        }),
      ).toMatchObject({ completedAt: completed!.completedAt });

      await db.vocabularyProgress.update({
        where: { entryId_userId: { entryId: entry.id, userId } },
        data: { nextReviewAt: new Date(0) },
      });
      const mastered = await caller.recordVocabularyAttempts({
        ...base,
        sessionId: "session-2",
        attempts: [{ ...base.attempts[0]!, attemptId: "second" }],
      });
      expect(mastered.sets[0]).toMatchObject({
        practiced: true,
        mastered: true,
      });
      expect(
        await db.userActivityEvent.count({
          where: { userId, action: "VOCABULARY_REVIEWED" },
        }),
      ).toBe(2);

      // Within one batch, a repeated attempt id or session entry is a
      // duplicate, and later attempts build on earlier ones.
      const batch = await caller.recordVocabularyAttempts({
        ...base,
        sessionId: "session-3",
        attempts: [
          { ...base.attempts[0]!, attemptId: "third", result: "INCORRECT" },
          { ...base.attempts[0]!, attemptId: "third" },
          { ...base.attempts[0]!, attemptId: "fourth" },
        ],
      });
      expect(batch).toMatchObject({ accepted: 1, duplicates: 2 });
      expect(
        await db.vocabularyProgress.findUnique({
          where: { entryId_userId: { entryId: entry.id, userId } },
        }),
      ).toMatchObject({ correctRecallCount: 2 });
      expect(
        await db.vocabularyPracticeAttempt.count({ where: { userId } }),
      ).toBe(3);

      // An entry deleted since an offline session is skipped, without
      // failing the other attempts of the batch.
      const removed = await db.vocabularyEntry.create({
        data: {
          organizationId: organization.id,
          vocabularySetId: vocabularySet.id,
          term: "삭제",
          definition: "deleted",
        },
      });
      await db.vocabularyEntry.delete({ where: { id: removed.id } });
      const withMissing = await caller.recordVocabularyAttempts({
        ...base,
        sessionId: "session-4",
        attempts: [
          { ...base.attempts[0]!, attemptId: "missing", entryId: removed.id },
          { ...base.attempts[0]!, attemptId: "fifth", result: "INCORRECT" },
        ],
      });
      expect(withMissing).toMatchObject({
        accepted: 1,
        duplicates: 0,
        skipped: 1,
      });
      expect(
        await db.vocabularyPracticeAttempt.count({ where: { userId } }),
      ).toBe(4);

      // An existing entry of another set is still rejected.
      const otherSet = await db.vocabularySet.create({
        data: {
          organizationId: organization.id,
          createdByMembershipId: member.id,
          title: "Other",
        },
      });
      const otherEntry = await db.vocabularyEntry.create({
        data: {
          organizationId: organization.id,
          vocabularySetId: otherSet.id,
          term: "다른",
          definition: "other",
        },
      });
      const otherSetError = await caller
        .recordVocabularyAttempts({
          ...base,
          sessionId: "session-5",
          attempts: [
            {
              ...base.attempts[0]!,
              attemptId: "other-set",
              entryId: otherEntry.id,
            },
          ],
        })
        .catch((cause: unknown) => cause);
      expect(otherSetError).toMatchObject({ code: "NOT_FOUND" });
    } finally {
      if (ids.organizationId) {
        await db.userActivityEvent.deleteMany({ where: { userId } });
        await db.contentProgress.deleteMany({ where: { userId } });
        await db.vocabularyPracticeAttempt.deleteMany({ where: { userId } });
        await db.vocabularyProgress.deleteMany({ where: { userId } });
        await db.courseItem.deleteMany({
          where: { organizationId: ids.organizationId },
        });
        await db.course.deleteMany({
          where: { organizationId: ids.organizationId },
        });
        await db.vocabularySet.deleteMany({
          where: { organizationId: ids.organizationId },
        });
        await db.organization.delete({ where: { id: ids.organizationId } });
      }
      await db.user.deleteMany({ where: { id: userId } });
    }
  },
  30_000,
);
