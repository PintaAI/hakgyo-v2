import { WorkspacePagePlaceholder } from "~/components/placeholder/workspace-page-placeholder";
export default function Page({
  params,
}: {
  params: Promise<{ organizationId: string; courseId: string }>;
}) {
  return <WorkspacePagePlaceholder title="Course settings" params={params} />;
}
