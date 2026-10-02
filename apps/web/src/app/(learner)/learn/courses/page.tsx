import type { Metadata } from "next";

import { LearnTab } from "~/components/learner/learn/learn-tab";
import { requireSession } from "~/server/auth/dal";

export const metadata: Metadata = { title: "Belajar" };

export default async function LearningCoursesPage() {
  const session = await requireSession();
  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="sr-only">Belajar</h1>
      <LearnTab userId={session.user.id} />
    </div>
  );
}
