import { WorkspacePagePlaceholder } from "~/components/placeholder/workspace-page-placeholder";
export default function Page({
  params,
}: {
  params: Promise<{
    organizationId: string;
    courseId: string;
    cohortId: string;
  }>;
}) {
  return <WorkspacePagePlaceholder title="Cohort overview" params={params} />;
}
