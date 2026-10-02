import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AssessmentEvent } from "~/components/learner/assessment/assessment-event";
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
    redirect(
      `/learn/${event.course.id}/items/${event.courseItem.id}/attempts/${attempt.id}`,
    );
  }

  return <AssessmentEvent event={event} />;
}
