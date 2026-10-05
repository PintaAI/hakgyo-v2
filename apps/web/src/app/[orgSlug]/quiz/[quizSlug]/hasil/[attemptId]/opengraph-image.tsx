import { loadResultCard } from "./card";
import { renderPublicQuizResult } from "~/server/public-quiz/images";

export const alt = "Hasil quiz";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ orgSlug: string; quizSlug: string; attemptId: string }>;
}) {
  const card = await loadResultCard(await params);
  if (!card) return new Response("Not found", { status: 404 });
  return renderPublicQuizResult(card, "preview");
}
