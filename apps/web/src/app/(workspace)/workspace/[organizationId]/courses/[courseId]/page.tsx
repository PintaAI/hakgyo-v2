import { CourseWorkspace } from "~/components/course-workspace";
import { api } from "~/trpc/server";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ organizationId: string; courseId: string }>;
}) {
  const { organizationId: organizationSlug, courseId } = await params;
  const workspace = await api.course.getWorkspaceOverview({
    courseId,
    organizationSlug,
  });

  return (
    <div className="w-full">
      <CourseWorkspace workspace={workspace} />
    </div>
  );
}
