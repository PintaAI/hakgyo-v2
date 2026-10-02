import { redirect } from "next/navigation";

// Practising a vocabulary set opens its flip-card session. Materials and the
// learning footer link here with the course item the set was reached through.
export default async function VocabularyPracticePage({
  searchParams,
}: {
  params: Promise<{ vocabularySetId: string }>;
  searchParams: Promise<{ source?: string }>;
}) {
  const { source } = await searchParams;
  redirect(source ? `/learn/practice/cards/${source}` : "/learn/assessments");
}
