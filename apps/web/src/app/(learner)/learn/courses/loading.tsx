import {
  CohortCardSkeleton,
  PageSkeleton,
} from "~/components/learner/skeletons";

export default function LearningCoursesLoading() {
  return (
    <PageSkeleton width="3xl" label="Memuat Belajar">
      <CohortCardSkeleton />
    </PageSkeleton>
  );
}
