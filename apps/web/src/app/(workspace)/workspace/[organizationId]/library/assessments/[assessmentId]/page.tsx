import { WorkspacePlaceholder } from "~/components/routing/workspace-placeholder";
export default function Page({
  params,
}: {
  params: Promise<{ organizationId: string; assessmentId: string }>;
}) {
  return <WorkspacePlaceholder title="Assessment" params={params} />;
}
