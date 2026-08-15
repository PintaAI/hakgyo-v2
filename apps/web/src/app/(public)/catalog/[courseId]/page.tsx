import { PagePlaceholder } from "~/components/placeholder/page-placeholder";

export default async function CatalogCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  return <PagePlaceholder title="Catalog course" params={{ courseId }} />;
}
