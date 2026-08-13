import { RoutePlaceholder } from "./route-placeholder";

export async function WorkspacePlaceholder({
  title,
  params,
}: {
  title: string;
  params: Promise<Record<string, string>>;
}) {
  return <RoutePlaceholder title={title} params={await params} />;
}
