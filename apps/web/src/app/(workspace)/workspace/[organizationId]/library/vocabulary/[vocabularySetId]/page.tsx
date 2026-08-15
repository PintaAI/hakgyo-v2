import { WorkspacePagePlaceholder } from "~/components/placeholder/workspace-page-placeholder";
export default function Page({
  params,
}: {
  params: Promise<{ organizationId: string; vocabularySetId: string }>;
}) {
  return <WorkspacePagePlaceholder title="Vocabulary set" params={params} />;
}
