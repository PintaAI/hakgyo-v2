import { router, Stack } from "expo-router";
import { Text, View } from "react-native";
import { authClient } from "../../../../src/lib/auth-client";
import { api } from "../../../../src/lib/trpc";
import { useDrawer } from "../../../../src/providers/DrawerProvider";
import { toolbarIcons } from "../../../../src/theme/toolbar-icons";
import {
  Action,
  Empty,
  QueryState,
  Row,
  Section,
  StudyScreen,
} from "../../../../src/components/learning-ui";
import { LearningProgress } from "../../../../src/components/learning-progress";
import { CourseActivities } from "../../../../src/components/course-activities";
import { dateLabel, meetingState } from "../../../../src/lib/study";

export default function HomeTab() {
  const { data: session } = authClient.useSession();
  const { open } = useDrawer();
  const courses = api.learning.listMyCourses.useQuery();
  const cohorts = api.learning.listMyCohorts.useQuery();
  const utils = api.useUtils();
  const upcoming = cohorts.data
    ?.flatMap((cohort) =>
      cohort.meetings.map((meeting) => ({ ...meeting, cohort: cohort.name })),
    )
    .filter((meeting) => meetingState(meeting) !== "ended")
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())[0];
  return (
    <>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          icon={toolbarIcons.menu}
          accessibilityLabel="Open menu"
          onPress={open}
        />
      </Stack.Toolbar>
      <StudyScreen
        title="Today"
        refreshing={courses.isRefetching || cohorts.isRefetching}
        onRefresh={() => {
          void utils.learning.invalidate();
          void utils.gamification.invalidate();
        }}
      >
        <View className="gap-2">
          <Text className="text-2xl font-bold text-foreground">
            Welcome back
            {session?.user.name ? `, ${session.user.name.split(" ")[0]}` : ""}.
          </Text>
          <Text className="text-base text-muted-foreground">
            A little practice, a little closer.
          </Text>
        </View>
        <LearningProgress />
        <Section title="Your daily practice">
          <Text className="text-base leading-6 text-muted-foreground">
            Recall a few words, then return to your next lesson.
          </Text>
          <Action onPress={() => router.navigate("/(home)/(tabs)/assessments")}>
            Start practicing
          </Action>
        </Section>
        <Section title="Next live session">
          <QueryState
            pending={cohorts.isPending}
            error={cohorts.error}
            retry={() => void cohorts.refetch()}
          />
          {upcoming ? (
            <Row
              title={upcoming.title}
              detail={`${upcoming.cohort} · ${dateLabel(upcoming.startsAt)}`}
              onPress={() => router.navigate("/(home)/(tabs)/cohorts")}
            />
          ) : cohorts.data ? (
            <Empty>No upcoming live sessions.</Empty>
          ) : null}
        </Section>
        <Section title="Continue learning">
          <QueryState
            pending={courses.isPending}
            error={courses.error}
            retry={() => void courses.refetch()}
          />
          {courses.data?.length === 0 ? (
            <Empty>
              Your enrolled courses will appear here when they’re available.
            </Empty>
          ) : null}
          {courses.data?.map((course) => (
            <View key={course.id} className="gap-1">
              <Row
                title={course.title}
                detail={course.organization.name}
                onPress={() =>
                  router.push({
                    pathname: "/courses/[courseId]",
                    params: { courseId: course.id },
                  })
                }
              />
              <CourseActivities courseId={course.id} nextOnly />
            </View>
          ))}
        </Section>
      </StudyScreen>
    </>
  );
}
