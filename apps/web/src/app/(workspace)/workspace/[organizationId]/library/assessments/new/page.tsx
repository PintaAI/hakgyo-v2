import { WorkspacePagePlaceholder } from "~/components/placeholder/workspace-page-placeholder";
export default function Page({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  return <WorkspacePagePlaceholder title="Penilaian baru" params={params} />;
}
