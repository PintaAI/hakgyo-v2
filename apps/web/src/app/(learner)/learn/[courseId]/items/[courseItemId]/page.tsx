import { RoutePlaceholder } from "~/components/routing/route-placeholder";

export default async function CourseItemPage({
  params,
}: {
  params: Promise<{ courseId: string; courseItemId: string }>;
}) {
  const values = await params;
  return <RoutePlaceholder title="Course item" params={values} />;
}
