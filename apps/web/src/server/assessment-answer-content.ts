import { Prisma } from "../../generated/prisma/client";

type ContentAnswer = {
  questionId: string;
  content?: Prisma.InputJsonValue;
};

export function buildAssessmentAnswerContentUpdate(
  attemptId: string,
  answers: ContentAnswer[],
) {
  const contentRows = Prisma.join(
    answers.map(
      (answer) => Prisma.sql`(
        ${answer.questionId},
        ${answer.content !== undefined}::boolean,
        ${answer.content === undefined ? null : JSON.stringify(answer.content)}
      )`,
    ),
  );

  return Prisma.sql`
    UPDATE "AssessmentAnswer" AS answer
    SET
      "content" = CASE
        WHEN incoming."hasContent" THEN incoming."content"::jsonb
        ELSE answer."content"
      END,
      "autoScore" = NULL,
      "manualScore" = NULL
    FROM (VALUES ${contentRows}) AS incoming("questionId", "hasContent", "content")
    WHERE answer."attemptId" = ${attemptId}
      AND answer."questionId" = incoming."questionId"
  `;
}

type AnswerReview = {
  answerId: string;
  score: number;
  feedback?: Prisma.InputJsonValue;
};

/**
 * Applies every manual review score/feedback of one attempt in a single statement. Omitted
 * feedback keeps the stored value, matching Prisma's `feedback: undefined` update semantics.
 */
export function buildAssessmentAnswerReviewUpdate(input: {
  attemptId: string;
  reviewedByMembershipId: string;
  reviewedAt: Date;
  reviews: AnswerReview[];
}) {
  const reviewRows = Prisma.join(
    input.reviews.map(
      (review) => Prisma.sql`(
        ${review.answerId}::text,
        ${review.score}::int,
        ${review.feedback !== undefined}::boolean,
        ${review.feedback === undefined ? null : JSON.stringify(review.feedback)}::text
      )`,
    ),
  );

  return Prisma.sql`
    UPDATE "AssessmentAnswer" AS answer
    SET
      "manualScore" = incoming."manualScore",
      "feedback" = CASE
        WHEN incoming."hasFeedback" THEN incoming."feedback"::jsonb
        ELSE answer."feedback"
      END,
      "reviewedByMembershipId" = ${input.reviewedByMembershipId},
      "reviewedAt" = ${input.reviewedAt}::timestamp(3),
      "updatedAt" = ${input.reviewedAt}::timestamp(3)
    FROM (VALUES ${reviewRows}) AS incoming("answerId", "manualScore", "hasFeedback", "feedback")
    WHERE answer."attemptId" = ${input.attemptId}
      AND answer."id" = incoming."answerId"
  `;
}
