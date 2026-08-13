import { RoutePlaceholder } from "~/components/routing/route-placeholder";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <RoutePlaceholder title="Accept invitation" params={{ token }} />;
}
