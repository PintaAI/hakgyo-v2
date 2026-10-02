import { LearningItemRow } from "./learning-item-row";
import { dayLabel } from "~/lib/learner/study";
import { learningItemHref } from "~/lib/learner/hrefs";
import type { LearningItemType } from "~/lib/learner/learning-item-type";

export type CohortMilestone = {
  courseItemId: string;
  type: LearningItemType;
  title: string;
  moduleTitle: string;
  completedAt: Date | string | null;
  score: number | null;
  maxScore: number | null;
};

function milestoneTypeLabel(type: LearningItemType) {
  if (type === "VOCABULARY_SET") return "Kosakata";
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
    parts.push(`Skor ${milestone.score}/${milestone.maxScore}`);
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
    <ol>
      {milestones.map((milestone, index) => (
        <LearningItemRow
          key={milestone.courseItemId}
          title={milestone.title}
          type={milestone.type}
          typeLabel={milestoneTypeLabel(milestone.type)}
          statusText={milestoneStatus(milestone)}
          completed={false}
          isLast={index === milestones.length - 1}
          href={learningItemHref(courseId, milestone.courseItemId)}
        />
      ))}
    </ol>
  );
}
