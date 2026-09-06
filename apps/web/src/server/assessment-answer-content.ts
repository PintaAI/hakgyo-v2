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
