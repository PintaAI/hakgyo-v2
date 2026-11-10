import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AssessmentEvent } from "~/components/learner/assessment/assessment-event";
import { assessmentEventAttemptHref } from "~/lib/learner/hrefs";
import { api } from "~/trpc/server";

export const metadata: Metadata = { title: "Event tugas" };

export default async function AssessmentEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const event = await api.assessmentEvent.getForLearner({ eventId });
  const attempt = event.attempts[0];

  if (event.entry.destination === "ATTEMPT" && attempt) {
    redirect(assessmentEventAttemptHref(event, attempt.id));
  }

  return <AssessmentEvent event={event} />;
}
