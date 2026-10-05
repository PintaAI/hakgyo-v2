import { TRPCError } from "@trpc/server";

import { db } from "~/server/db";
import { renderPublicQuizPreview } from "~/server/public-quiz/images";
import { getPublicQuiz } from "~/server/public-quiz/service";

export const alt = "Quiz online";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ orgSlug: string; quizSlug: string }>;
}) {
  const { orgSlug, quizSlug } = await params;
  try {
    const quiz = await getPublicQuiz(db, {
      organizationSlug: orgSlug,
      slug: quizSlug,
    });
    return renderPublicQuizPreview({
      title: quiz.title,
      organizationName: quiz.organization.name,
      questionCount: quiz.questionCount,
      theme: quiz.organization.theme,
    });
  } catch (error) {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") {
      return new Response("Not found", { status: 404 });
    }
    throw error;
  }
}
