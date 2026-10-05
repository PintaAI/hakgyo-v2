import { loadResultCard } from "../card";
import { renderPublicQuizResult } from "~/server/public-quiz/images";

/** A 9:16 result image participants save or share to their stories. */
export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ orgSlug: string; quizSlug: string; attemptId: string }>;
  },
) {
  const card = await loadResultCard(await params);
  if (!card) return new Response("Not found", { status: 404 });
  return renderPublicQuizResult(card, "story");
}
