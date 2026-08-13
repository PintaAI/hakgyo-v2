import { WorkspacePlaceholder } from "~/components/routing/workspace-placeholder";
export default function Page({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  return <WorkspacePlaceholder title="Material library" params={params} />;
}
