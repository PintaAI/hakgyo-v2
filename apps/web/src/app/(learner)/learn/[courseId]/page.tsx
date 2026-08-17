import { PagePlaceholder } from "~/components/placeholder/page-placeholder";

export default async function LearningCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  return <PagePlaceholder title="Course pembelajaran" params={{ courseId }} />;
}
