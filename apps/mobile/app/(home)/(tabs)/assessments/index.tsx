import { router } from "expo-router";
import { api } from "../../../../src/lib/trpc";
import {
  Empty,
  QueryState,
  Row,
  Section,
  StudyScreen,
} from "../../../../src/components/learning-ui";
import { CourseActivities } from "../../../../src/components/course-activities";
import { assessmentAttemptPresentation } from "../../../../src/lib/assessment-state";
import { dateLabel } from "../../../../src/lib/study";

export default function PracticeTab() {
  const courses = api.learning.listMyCourses.useQuery();
  const events = api.assessmentEvent.listForLearner.useQuery();
  const attempts = api.assessment.listMyAttempts.useQuery();
  const utils = api.useUtils();
  return (
    <StudyScreen
      title="Practice"
      refreshing={
        courses.isRefetching || events.isRefetching || attempts.isRefetching
      }
      onRefresh={() => {
        void utils.learning.invalidate();
        void utils.assessmentEvent.invalidate();
        void attempts.refetch();
      }}
    >
      <Section title="Tryouts & live assessments">
        <QueryState
          pending={events.isPending}
          error={events.error}
          retry={() => void events.refetch()}
        />
        {events.data?.length === 0 ? (
          <Empty>Invited tryouts and live assessments will appear here.</Empty>
        ) : null}
        {events.data?.map((event) => {
          const attemptState = assessmentAttemptPresentation(event.attempts[0]);
          return (
            <Row
              key={event.id}
              title={event.title}
              detail={`${event.type === "TRYOUT" ? "Tryout" : "On-demand assessment"} · ${event.course.title} · ${attemptState.detail}${event.closesAt ? ` · closes ${dateLabel(event.closesAt)}` : ""}`}
              onPress={() =>
                router.push({
                  pathname: "/events/[eventId]",
                  params: { eventId: event.id },
                })
              }
            />
          );
        })}
      </Section>
      <Section title="Recent attempts">
        <QueryState
          pending={attempts.isPending}
          error={attempts.error}
          retry={() => void attempts.refetch()}
        />
        {attempts.data?.length === 0 ? (
          <Empty>Your saved attempts and results will appear here.</Empty>
        ) : null}
        {attempts.data?.map((attempt) => {
          const attemptState = assessmentAttemptPresentation(attempt);
          return (
            <Row
              key={attempt.id}
              title={attempt.assessment.title}
              disabled={
                !!attempt.assessmentEvent?.participants[0]?.invalidatedAt
              }
              detail={`${attemptState.detail} · ${dateLabel(attempt.startedAt)}`}
              onPress={() =>
                router.push({
                  pathname:
                    "/courses/[courseId]/items/[courseItemId]/attempts/[attemptId]",
                  params: {
                    courseId: attempt.courseItem.module.courseId,
                    courseItemId: attempt.courseItemId,
                    attemptId: attempt.id,
                  },
                })
              }
            />
          );
        })}
        {attempts.data?.length === 50 ? (
          <Empty>Showing your 50 most recent attempts.</Empty>
        ) : null}
      </Section>
      <Section title="Vocabulary & on-demand assessments">
        <QueryState
          pending={courses.isPending}
          error={courses.error}
          retry={() => void courses.refetch()}
        />
        {courses.data?.length === 0 ? (
          <Empty>
            Practice follows your enrolled courses. Join a course to begin.
          </Empty>
        ) : null}
        {courses.data?.map((course) => (
          <Section key={course.id} title={course.title}>
            <CourseActivities courseId={course.id} practice />
          </Section>
        ))}
      </Section>
    </StudyScreen>
  );
}
