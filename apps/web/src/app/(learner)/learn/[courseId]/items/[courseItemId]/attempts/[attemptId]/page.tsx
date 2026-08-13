import { RoutePlaceholder } from "~/components/routing/route-placeholder";

export default async function AttemptPage({
  params,
}: {
  params: Promise<{
    courseId: string;
    courseItemId: string;
    attemptId: string;
  }>;
}) {
  return <RoutePlaceholder title="Assessment attempt" params={await params} />;
}
