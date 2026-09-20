import { router } from "expo-router";
import { View } from "react-native";

import { dayLabel } from "../../lib/study";
import { LearningItemRow } from "./learning-item-row";

export type CohortMilestone = {
  courseItemId: string;
  type: "MATERIAL" | "VOCABULARY_SET" | "ASSESSMENT";
  title: string;
  moduleTitle: string;
  completedAt: Date | string | null;
  score: number | null;
  maxScore: number | null;
};

export type CohortMilestoneGroup = {
  cohortId: string;
  cohortName: string;
  courseId: string;
  courseTitle: string;
  totalItems: number;
  completedCount: number;
  progressPercent: number;
  milestones: CohortMilestone[];
};

function milestoneTypeLabel(type: CohortMilestone["type"]) {
  if (type === "VOCABULARY_SET") return "Kosa-kata";
  if (type === "ASSESSMENT") return "Tugas";
  return "Materi";
}

function milestoneStatus(milestone: CohortMilestone) {
  const parts = [milestone.moduleTitle];
  if (
    milestone.type === "ASSESSMENT" &&
    milestone.score !== null &&
    milestone.maxScore !== null
  ) {
    parts.push(`Score ${milestone.score}/${milestone.maxScore}`);
  }
  if (milestone.completedAt) {
    parts.push(dayLabel(new Date(milestone.completedAt)));
  }
  return parts.join(" · ");
}

export function CohortMilestoneTimeline({
  milestones,
  courseId,
}: {
  milestones: CohortMilestone[];
  courseId: string;
}) {
  return (
    <View>
      {milestones.map((milestone, index) => (
        <LearningItemRow
          key={milestone.courseItemId}
          title={milestone.title}
          type={milestone.type}
          typeLabel={milestoneTypeLabel(milestone.type)}
          statusText={milestoneStatus(milestone)}
          completed={false}
          isLast={index === milestones.length - 1}
          titleLines={2}
          onPress={() =>
            router.push({
              pathname: "/courses/[courseId]/items/[courseItemId]",
              params: {
                courseId,
                courseItemId: milestone.courseItemId,
              },
            })
          }
          accessibilityHint={`Open completed ${milestoneTypeLabel(milestone.type).toLowerCase()}`}
        />
      ))}
    </View>
  );
}
