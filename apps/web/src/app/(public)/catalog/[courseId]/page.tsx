import { RoutePlaceholder } from "~/components/routing/route-placeholder";

export default async function CatalogCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  return <RoutePlaceholder title="Catalog course" params={{ courseId }} />;
}
