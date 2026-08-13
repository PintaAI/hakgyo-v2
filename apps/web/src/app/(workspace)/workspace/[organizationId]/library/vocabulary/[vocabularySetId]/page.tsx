import { WorkspacePlaceholder } from "~/components/routing/workspace-placeholder";
export default function Page({
  params,
}: {
  params: Promise<{ organizationId: string; vocabularySetId: string }>;
}) {
  return <WorkspacePlaceholder title="Vocabulary set" params={params} />;
}
