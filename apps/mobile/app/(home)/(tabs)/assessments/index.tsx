import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { api } from "../../../../src/lib/trpc";
import {
  Card,
  Empty,
  Eyebrow,
  QueryState,
  Row,
  StudyScreen,
  TintedAction,
} from "../../../../src/components/learning-ui";
import { CourseActivities } from "../../../../src/components/course-activities";
import {
  assessmentAttemptPresentation,
  isStaleClosedOnDemandAssessment,
} from "../../../../src/lib/assessment-state";
import { dateLabel } from "../../../../src/lib/study";
import {
  assessmentSourceBadge,
  closesLabel,
} from "../../../../src/components/learn/cohort-card";

export default function PracticeTab() {
  const courses = api.learning.listMyCourses.useQuery();
  const events = api.assessmentEvent.listForLearner.useQuery();
  const attempts = api.assessment.listMyAttempts.useQuery();
  const utils = api.useUtils();
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const visibleEvents = (events.data ?? []).filter(
    (event) => !isStaleClosedOnDemandAssessment(event, now),
  );
  const actionableEvents = visibleEvents.filter((event) => {
    const attempt = event.attempts[0];
    return !attempt || attempt.status === "IN_PROGRESS";
  });
  const finishedEvents = visibleEvents.filter((event) => {
    const attempt = event.attempts[0];
    return !!attempt && attempt.status !== "IN_PROGRESS";
  });
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
      <QueryState
        pending={events.isPending}
        error={events.error}
        retry={() => void events.refetch()}
      />
      {events.data && visibleEvents.length === 0 ? (
        <Card>
          <Eyebrow>Tryouts & live assessments</Eyebrow>
          <Empty>Invited tryouts and live assessments will appear here.</Empty>
        </Card>
      ) : null}
      {actionableEvents.map((event) => {
        const attemptState = assessmentAttemptPresentation(event.attempts[0]);
        const urgent =
          !!event.closesAt && event.closesAt.getTime() - now < 48 * 3_600_000;
        return (
          <TintedAction
            key={event.id}
            eyebrow={`${urgent ? "Due soon • " : ""}${assessmentSourceBadge(event)}`}
            title={event.title}
            detail={`${event.course.title} · ${attemptState.detail}${event.closesAt ? ` · ${closesLabel(event.closesAt, now)}` : ""}`}
            accessibilityHint={`Opens ${event.title}`}
            onPress={() =>
              router.push({
                pathname: "/events/[eventId]",
                params: { eventId: event.id },
              })
            }
          />
        );
      })}
      {finishedEvents.length > 0 ? (
        <Card>
          <Eyebrow>Completed assessments</Eyebrow>
          {finishedEvents.map((event) => {
            const attemptState = assessmentAttemptPresentation(
              event.attempts[0],
            );
            return (
              <Row
                key={event.id}
                title={event.title}
                detail={`${assessmentSourceBadge(event)} · ${event.course.title} · ${attemptState.detail}`}
                onPress={() =>
                  router.push({
                    pathname: "/events/[eventId]",
                    params: { eventId: event.id },
                  })
                }
              />
            );
          })}
        </Card>
      ) : null}
      <Card>
        <Eyebrow>Recent attempts</Eyebrow>
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
          <Text className="text-xs text-muted-foreground">
            Showing your 50 most recent attempts.
          </Text>
        ) : null}
      </Card>
      <QueryState
        pending={courses.isPending}
        error={courses.error}
        retry={() => void courses.refetch()}
      />
      {courses.data?.length === 0 ? (
        <Card>
          <Eyebrow>Vocabulary & on-demand</Eyebrow>
          <Empty>
            Practice follows your enrolled courses. Join a course to begin.
          </Empty>
        </Card>
      ) : null}
      {courses.data?.map((course) => (
        <View
          key={course.id}
          className="gap-3 overflow-hidden rounded-2xl border border-border bg-card p-4"
        >
          <View className="gap-1">
            <Text className="text-[11px] font-bold uppercase tracking-[1.5px] text-muted-foreground">
              Practice · {course.organization.name}
            </Text>
            <Text className="text-2xl font-black leading-7 tracking-tight text-foreground">
              {course.title}
            </Text>
          </View>
          <CourseActivities courseId={course.id} practice />
        </View>
      ))}
    </StudyScreen>
  );
}
