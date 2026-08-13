import { WorkspacePlaceholder } from "~/components/routing/workspace-placeholder";
export default function Page({
  params,
}: {
  params: Promise<{ organizationId: string; materialId: string }>;
}) {
  return <WorkspacePlaceholder title="Material" params={params} />;
}
