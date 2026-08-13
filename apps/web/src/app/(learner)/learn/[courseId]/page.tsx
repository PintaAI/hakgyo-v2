import { RoutePlaceholder } from "~/components/routing/route-placeholder";

export default async function LearningCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  return <RoutePlaceholder title="Learning course" params={{ courseId }} />;
}
