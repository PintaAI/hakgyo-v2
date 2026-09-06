import { expect, test } from "bun:test";

import type { Prisma } from "../../generated/prisma/client";
import {
  deleteAssessmentEventWithProgress,
  deleteAssessmentWithProgress,
  deleteCourseItemsWithProgress,
  deleteMaterialWithProgress,
  deleteVocabularySetWithProgress,
} from "./content-resource-deletion";
import { db } from "./db";
import { recordGamificationActivity } from "./gamification/record-activity";

class RollbackFixture extends Error {}

async function withRollbackFixture(
  callback: (tx: Prisma.TransactionClient) => Promise<void>,
) {
  try {
    await db.$transaction(async (tx) => {
      await callback(tx);
      throw new RollbackFixture();
    });
  } catch (error) {
    if (!(error instanceof RollbackFixture)) throw error;
  }
}

async function createCourseFixture(tx: Prisma.TransactionClient) {
  const member = await tx.organizationMember.findFirst({
    select: { id: true, organizationId: true, userId: true },
  });
  if (!member) throw new Error("Integration fixture needs an organization member");

  const fixtureId = crypto.randomUUID();
  const course = await tx.course.create({
    data: {
      organizationId: member.organizationId,
      ownerMembershipId: member.id,
      slug: `deletion-regression-${fixtureId}`,
      title: `Deletion regression ${fixtureId}`,
    },
  });
  const courseModule = await tx.courseModule.create({
    data: {
      courseId: course.id,
      organizationId: member.organizationId,
      position: 0,
      title: "Deletion regression module",
    },
  });

  return { course, courseModule, member };
}

test("deletes an assessment and all related learner progress atomically", () =>
  withRollbackFixture(async (tx) => {
    const { course, courseModule, member } = await createCourseFixture(tx);
    const assessment = await tx.assessment.create({
      data: {
        organizationId: member.organizationId,
        createdByMembershipId: member.id,
        title: `Deletion regression ${crypto.randomUUID()}`,
      },
    });
    const question = await tx.assessmentQuestion.create({
      data: {
        assessmentId: assessment.id,
        position: 0,
        prompt: [{ type: "paragraph", content: "Question" }],
        type: "SINGLE_CHOICE",
      },
    });
    const option = await tx.assessmentOption.create({
      data: {
        questionId: question.id,
        position: 0,
        content: [{ type: "paragraph", content: "Answer" }],
        isCorrect: true,
      },
    });
    const item = await tx.courseItem.create({
      data: {
        moduleId: courseModule.id,
        organizationId: member.organizationId,
        type: "ASSESSMENT",
        assessmentId: assessment.id,
        position: 0,
      },
    });
    const event = await tx.assessmentEvent.create({
      data: {
        organizationId: member.organizationId,
        courseId: course.id,
        courseItemId: item.id,
        createdByMembershipId: member.id,
        durationMinutes: 30,
        scope: "COURSE",
        title: "Deletion regression event",
        type: "TRYOUT",
      },
    });
    await tx.assessmentEventParticipant.create({
      data: { eventId: event.id, userId: member.userId },
    });
    await tx.contentProgress.create({
      data: { courseItemId: item.id, userId: member.userId },
    });
    const attempt = await tx.assessmentAttempt.create({
      data: {
        assessmentId: assessment.id,
        assessmentEventId: event.id,
        courseItemId: item.id,
        organizationId: member.organizationId,
        userId: member.userId,
        attemptNumber: 1,
      },
    });
    const answer = await tx.assessmentAnswer.create({
      data: {
        attemptId: attempt.id,
        organizationId: member.organizationId,
        questionId: question.id,
      },
    });
    await tx.assessmentAnswerSelection.create({
      data: { answerId: answer.id, optionId: option.id },
    });
    await tx.assessmentEventAudit.create({
      data: {
        action: "OPENED",
        actorMembershipId: member.id,
        attemptId: attempt.id,
        eventId: event.id,
      },
    });

    const removed = await deleteAssessmentWithProgress(tx, assessment.id);

    expect(removed).toEqual({
      activityEvents: 0,
      attempts: 1,
      courseItems: 1,
      events: 1,
      materialRequirements: 0,
      progress: 1,
    });
    expect(
      await tx.assessment.findUnique({ where: { id: assessment.id } }),
    ).toBeNull();
    expect(
      await tx.assessmentAttempt.count({ where: { assessmentId: assessment.id } }),
    ).toBe(0);
    expect(
      await tx.contentProgress.count({ where: { courseItemId: item.id } }),
    ).toBe(0);
    expect(
      await tx.assessmentEvent.count({ where: { courseItemId: item.id } }),
    ).toBe(0);
  }));

test("deletes a closed assessment event and its attempts without deleting the assessment", () =>
  withRollbackFixture(async (tx) => {
    const { course, courseModule, member } = await createCourseFixture(tx);
    const assessment = await tx.assessment.create({
      data: {
        createdByMembershipId: member.id,
        organizationId: member.organizationId,
        title: "Reusable event assessment",
      },
    });
    const item = await tx.courseItem.create({
      data: {
        assessmentId: assessment.id,
        moduleId: courseModule.id,
        organizationId: member.organizationId,
        position: 0,
        type: "ASSESSMENT",
      },
    });
    const event = await tx.assessmentEvent.create({
      data: {
        closedAt: new Date(),
        courseId: course.id,
        courseItemId: item.id,
        createdByMembershipId: member.id,
        durationMinutes: 30,
        organizationId: member.organizationId,
        scope: "COURSE",
        status: "CLOSED",
        title: "Closed deletion regression event",
        type: "TRYOUT",
      },
    });
    await tx.assessmentEventParticipant.create({
      data: { eventId: event.id, userId: member.userId },
    });
    await tx.assessmentAttempt.create({
      data: {
        assessmentEventId: event.id,
        assessmentId: assessment.id,
        attemptNumber: 1,
        courseItemId: item.id,
        organizationId: member.organizationId,
        userId: member.userId,
      },
    });

    const removed = await deleteAssessmentEventWithProgress(tx, event.id);

    expect(removed).toEqual({ attempts: 1 });
    expect(await tx.assessmentEvent.count({ where: { id: event.id } })).toBe(0);
    expect(
      await tx.assessmentAttempt.count({ where: { assessmentEventId: event.id } }),
    ).toBe(0);
    expect(await tx.assessment.count({ where: { id: assessment.id } })).toBe(1);
    expect(await tx.courseItem.count({ where: { id: item.id } })).toBe(1);
  }));

test("deletes a material, every placement, and all related learner progress", () =>
  withRollbackFixture(async (tx) => {
    const { courseModule, member } = await createCourseFixture(tx);
    const material = await tx.material.create({
      data: {
        content: [],
        createdByMembershipId: member.id,
        organizationId: member.organizationId,
        title: "Deletion regression material",
      },
    });
    const item = await tx.courseItem.create({
      data: {
        materialId: material.id,
        moduleId: courseModule.id,
        organizationId: member.organizationId,
        position: 0,
        type: "MATERIAL",
      },
    });
    await tx.contentProgress.create({
      data: {
        courseItemId: item.id,
        status: "COMPLETED",
        userId: member.userId,
      },
    });
    const activityKey = `content-completed:${member.userId}:${item.id}`;
    await recordGamificationActivity(tx, {
      action: "MATERIAL_COMPLETED",
      idempotencyKey: activityKey,
      metadata: { courseItemId: item.id },
      organizationId: member.organizationId,
      userId: member.userId,
    });

    const removed = await deleteMaterialWithProgress(tx, material.id);

    expect(removed).toEqual({
      activityEvents: 1,
      attempts: 0,
      courseItems: 1,
      events: 0,
      progress: 1,
    });
    expect(await tx.material.findUnique({ where: { id: material.id } })).toBeNull();
    expect(await tx.courseItem.count({ where: { id: item.id } })).toBe(0);
    expect(await tx.contentProgress.count({ where: { courseItemId: item.id } })).toBe(0);
    expect(
      await tx.userActivityEvent.count({ where: { idempotencyKey: activityKey } }),
    ).toBe(0);
  }));

test("deletes a course placement and its progress without deleting the library resource", () =>
  withRollbackFixture(async (tx) => {
    const { courseModule, member } = await createCourseFixture(tx);
    const material = await tx.material.create({
      data: {
        content: [],
        createdByMembershipId: member.id,
        organizationId: member.organizationId,
        title: "Reusable deletion regression material",
      },
    });
    const item = await tx.courseItem.create({
      data: {
        materialId: material.id,
        moduleId: courseModule.id,
        organizationId: member.organizationId,
        position: 0,
        type: "MATERIAL",
      },
    });
    await tx.contentProgress.create({
      data: { courseItemId: item.id, userId: member.userId },
    });

    const removed = await deleteCourseItemsWithProgress(tx, [item.id]);

    expect(removed).toEqual({
      activityEvents: 0,
      attempts: 0,
      courseItems: 1,
      events: 0,
      progress: 1,
    });
    expect(await tx.courseItem.count({ where: { id: item.id } })).toBe(0);
    expect(await tx.contentProgress.count({ where: { courseItemId: item.id } })).toBe(0);
    expect(await tx.material.findUnique({ where: { id: material.id } })).not.toBeNull();
  }));

test("deletes a vocabulary set, requirement links, and all learner progress", () =>
  withRollbackFixture(async (tx) => {
    const { courseModule, member } = await createCourseFixture(tx);
    const material = await tx.material.create({
      data: {
        content: [],
        createdByMembershipId: member.id,
        organizationId: member.organizationId,
        title: "Vocabulary requirement host",
      },
    });
    const vocabularySet = await tx.vocabularySet.create({
      data: {
        createdByMembershipId: member.id,
        organizationId: member.organizationId,
        title: "Deletion regression vocabulary",
      },
    });
    await tx.vocabularyEntry.create({
      data: {
        definition: "Definition",
        organizationId: member.organizationId,
        term: "Term",
        vocabularySetId: vocabularySet.id,
      },
    });
    const requirement = await tx.materialRequirement.create({
      data: {
        materialId: material.id,
        organizationId: member.organizationId,
        position: 0,
        type: "VOCABULARY_SET",
        vocabularySetId: vocabularySet.id,
      },
    });
    const item = await tx.courseItem.create({
      data: {
        moduleId: courseModule.id,
        organizationId: member.organizationId,
        position: 0,
        type: "VOCABULARY_SET",
        vocabularySetId: vocabularySet.id,
      },
    });
    await tx.contentProgress.create({
      data: {
        courseItemId: item.id,
        status: "COMPLETED",
        userId: member.userId,
      },
    });
    const activityKey = `content-completed:${member.userId}:${item.id}`;
    await recordGamificationActivity(tx, {
      action: "VOCABULARY_REVIEWED",
      idempotencyKey: activityKey,
      metadata: { courseItemId: item.id },
      organizationId: member.organizationId,
      userId: member.userId,
    });

    const removed = await deleteVocabularySetWithProgress(tx, vocabularySet.id);

    expect(removed).toEqual({
      activityEvents: 1,
      attempts: 0,
      courseItems: 1,
      events: 0,
      materialRequirements: 1,
      progress: 1,
    });
    expect(
      await tx.vocabularySet.findUnique({ where: { id: vocabularySet.id } }),
    ).toBeNull();
    expect(
      await tx.materialRequirement.count({ where: { id: requirement.id } }),
    ).toBe(0);
    expect(await tx.courseItem.count({ where: { id: item.id } })).toBe(0);
    expect(await tx.contentProgress.count({ where: { courseItemId: item.id } })).toBe(0);
    expect(
      await tx.userActivityEvent.count({ where: { idempotencyKey: activityKey } }),
    ).toBe(0);
  }));
