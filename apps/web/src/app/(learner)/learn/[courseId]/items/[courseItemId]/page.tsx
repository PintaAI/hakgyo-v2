import { PagePlaceholder } from "~/components/placeholder/page-placeholder";

export default async function CourseItemPage({
  params,
}: {
  params: Promise<{ courseId: string; courseItemId: string }>;
}) {
  const values = await params;
  return <PagePlaceholder title="Course item" params={values} />;
}
