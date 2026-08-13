import { WorkspacePlaceholder } from "~/components/routing/workspace-placeholder";
export default function Page({
  params,
}: {
  params: Promise<{ organizationId: string; courseId: string }>;
}) {
  return <WorkspacePlaceholder title="Course cohorts" params={params} />;
}
