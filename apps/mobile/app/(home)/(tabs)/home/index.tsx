import { router, Stack } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { api } from "../../../../src/lib/trpc";
import { useDrawer } from "../../../../src/providers/DrawerProvider";
import { toolbarIcons } from "../../../../src/theme/toolbar-icons";
import {
  Card,
  Empty,
  Eyebrow,
  PrimaryAction,
  QueryState,
  StudyScreen,
} from "../../../../src/components/learning-ui";
import { WeeklyStreak } from "../../../../src/components/weekly-streak";
import { CourseActivities } from "../../../../src/components/course-activities";
import { SessionBlock } from "../../../../src/components/learn/cohort-card";
import { meetingState } from "../../../../src/lib/study";

export default function HomeTab() {
  const { open } = useDrawer();
  const courses = api.learning.listMyCourses.useQuery();
  const cohorts = api.learning.listMyCohorts.useQuery();
  const utils = api.useUtils();
  const now = Date.now();
  const upcoming = cohorts.data
    ?.flatMap((cohort) =>
      cohort.meetings.map((meeting) => ({ ...meeting, cohort: cohort.name })),
    )
    .filter((meeting) => meetingState(meeting) !== "ended")
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())[0];
  const upcomingState = upcoming
    ? (meetingState(upcoming, now) as "live" | "joining" | "upcoming")
    : null;
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
        <WeeklyStreak />
        <PrimaryAction
          eyebrow="Daily practice"
          title="Start practicing"
          detail="Recall a few words, then return to your next lesson."
          accessibilityHint="Opens the practice tab"
          onPress={() => router.navigate("/(home)/(tabs)/assessments")}
        />
        <Card>
          <Eyebrow>Next live session</Eyebrow>
          <QueryState
            pending={cohorts.isPending}
            error={cohorts.error}
            retry={() => void cohorts.refetch()}
          />
          {upcoming && upcomingState ? (
            <>
              <Text className="text-xs font-semibold uppercase tracking-[1px] text-muted-foreground">
                {upcoming.cohort}
              </Text>
              <SessionBlock meeting={upcoming} state={upcomingState} />
            </>
          ) : cohorts.data ? (
            <Empty>No upcoming live sessions.</Empty>
          ) : null}
        </Card>
        <QueryState
          pending={courses.isPending}
          error={courses.error}
          retry={() => void courses.refetch()}
        />
        {courses.data?.length === 0 ? (
          <Card>
            <Eyebrow>Continue learning</Eyebrow>
            <Empty>
              Your enrolled courses will appear here when they’re available.
            </Empty>
          </Card>
        ) : null}
        {courses.data?.map((course) => (
          <View
            key={course.id}
            className="gap-3 overflow-hidden rounded-2xl border border-border bg-card p-4"
          >
            <Pressable
              accessibilityHint={`Opens ${course.title}`}
              accessibilityRole="button"
              className="gap-1 active:opacity-70"
              onPress={() =>
                router.push({
                  pathname: "/courses/[courseId]",
                  params: { courseId: course.id },
                })
              }
            >
              <Text className="text-[11px] font-bold uppercase tracking-[1.5px] text-muted-foreground">
                {course.organization.name}
              </Text>
              <View className="flex-row items-center gap-3">
                <Text className="flex-1 text-2xl font-black leading-7 tracking-tight text-foreground">
                  {course.title}
                </Text>
                <Text className="text-2xl text-muted-foreground">›</Text>
              </View>
            </Pressable>
            <CourseActivities courseId={course.id} nextOnly />
          </View>
        ))}
      </StudyScreen>
    </>
  );
}
