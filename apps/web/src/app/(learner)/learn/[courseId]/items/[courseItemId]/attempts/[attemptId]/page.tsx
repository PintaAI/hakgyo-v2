import { PagePlaceholder } from "~/components/placeholder/page-placeholder";

export default async function AttemptPage({
  params,
}: {
  params: Promise<{
    courseId: string;
    courseItemId: string;
    attemptId: string;
  }>;
}) {
  return <PagePlaceholder title="Attempt tugas" params={await params} />;
}
