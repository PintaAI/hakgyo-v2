import { WorkspacePlaceholder } from "~/components/routing/workspace-placeholder";
export default function Page({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  return <WorkspacePlaceholder title="Assessment library" params={params} />;
}
