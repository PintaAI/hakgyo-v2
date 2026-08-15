import { WorkspacePagePlaceholder } from "~/components/placeholder/workspace-page-placeholder";
export default function Page({
  params,
}: {
  params: Promise<{ organizationId: string; materialId: string }>;
}) {
  return <WorkspacePagePlaceholder title="Material" params={params} />;
}
