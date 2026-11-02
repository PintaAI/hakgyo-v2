import { TRPCError } from "@trpc/server";

import { env } from "~/env";
import { db } from "~/server/db";
import { guardRoute } from "~/server/maintenance";
import { renderPublicQuizPoster } from "~/server/public-quiz/images";
import { getPublicQuiz } from "~/server/public-quiz/service";

/** A file name from the quiz title, for the downloaded poster. */
function posterFileName(title: string) {
  const slug = title
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "-")
    .slice(0, 60);
  return `poster-quiz-${slug || "hakgyo"}.png`;
}

/**
 * The quiz poster (QR code, logo, title, question count) staff print or share. Public like the
 * quiz page itself; `?unduh=1` downloads it instead of showing it.
 */
async function handler(
  request: Request,
  { params }: { params: Promise<{ orgSlug: string; quizSlug: string }> },
) {
  const { orgSlug, quizSlug } = await params;
  let quiz;
  try {
    quiz = await getPublicQuiz(db, {
      organizationSlug: orgSlug,
      slug: quizSlug,
    });
  } catch (error) {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") {
      return new Response("Not found", { status: 404 });
    }
    throw error;
  }

  const image = await renderPublicQuizPoster({
    title: quiz.title,
    organizationName: quiz.organization.name,
    logoUrl: quiz.organization.logoUrl,
    questionCount: quiz.questionCount,
    timeLimitMinutes: quiz.timeLimitMinutes,
    theme: quiz.organization.theme,
    url: `${env.APP_URL}/${quiz.organization.slug}/quiz/${quiz.slug}`,
  });
  const download = new URL(request.url).searchParams.has("unduh");
  return new Response(image.body, {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${posterFileName(quiz.title)}"`,
      // Title, logo or question count may change; a few minutes of caching is enough.
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}

export const GET = guardRoute("read", handler);
