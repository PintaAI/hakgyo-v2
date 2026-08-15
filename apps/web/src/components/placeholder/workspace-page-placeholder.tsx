import { PagePlaceholder } from "./page-placeholder";

export async function WorkspacePagePlaceholder({
  title,
  params,
}: {
  title: string;
  params: Promise<Record<string, string>>;
}) {
  return <PagePlaceholder title={title} params={await params} />;
}
