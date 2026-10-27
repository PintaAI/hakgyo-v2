import { formatScoreOutOf } from "@hakgyo/shared";
import { View } from "react-native";

import { openCourseItem } from "../../lib/navigation";
import { dayLabel } from "../../lib/study";
import { LearningItemRow } from "./learning-item-row";
import { getLearningItemTypeMeta } from "../../lib/learning-item-type";

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

function milestoneStatus(milestone: CohortMilestone) {
  const parts = [milestone.moduleTitle];
  if (
    milestone.type === "ASSESSMENT" &&
    milestone.score !== null &&
    milestone.maxScore !== null
  ) {
    parts.push(`Skor ${formatScoreOutOf(milestone.score, milestone.maxScore)}`);
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
          typeLabel={getLearningItemTypeMeta(milestone.type).label}
          statusText={milestoneStatus(milestone)}
          completed={false}
          isLast={index === milestones.length - 1}
          titleLines={2}
          onPress={() =>
            openCourseItem({ courseId, courseItemId: milestone.courseItemId })
          }
          accessibilityHint={`Buka ${getLearningItemTypeMeta(milestone.type).label.toLowerCase()} yang sudah selesai`}
        />
      ))}
    </View>
  );
}
