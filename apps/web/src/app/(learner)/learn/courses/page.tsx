import type { Metadata } from "next";

import { LearnTab } from "~/components/learner/learn/learn-tab";
import { requireSession } from "~/server/auth/dal";
import { api, HydrateClient } from "~/trpc/server";

export const metadata: Metadata = { title: "Belajar" };

export default async function LearningCoursesPage() {
  const session = await requireSession();
  // The same inputs LearnTab queries with, so it hydrates without a request.
  // Awaited so the server HTML matches the browser's first render.
  await Promise.all([
    api.learning.listMyCohorts.prefetch(),
    api.assessmentEvent.listForLearner.prefetch({ includeScheduled: true }),
    api.learning.listMyCohortMilestones.prefetch(),
  ]);
  return (
    <HydrateClient>
      <div className="mx-auto w-full max-w-6xl">
        <h1 className="sr-only">Belajar</h1>
        <LearnTab userId={session.user.id} />
      </div>
    </HydrateClient>
  );
}
