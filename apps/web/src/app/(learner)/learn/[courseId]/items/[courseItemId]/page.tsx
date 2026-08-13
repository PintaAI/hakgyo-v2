import Link from "next/link";
import { RoutePlaceholder } from "~/components/routing/route-placeholder";

export default async function CourseItemPage({
  params,
}: {
  params: Promise<{ courseId: string; courseItemId: string }>;
}) {
  const values = await params;
  return (
    <div className="space-y-4">
      <RoutePlaceholder title="Course item" params={values} />
      <Link
        className="text-sm underline"
        href={`/learn/${values.courseId}/items/${values.courseItemId}/attempts/attempt-demo`}
      >
        Open sample attempt
      </Link>
    </div>
  );
}
