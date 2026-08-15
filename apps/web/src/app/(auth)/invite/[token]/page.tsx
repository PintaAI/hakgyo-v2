import { PagePlaceholder } from "~/components/placeholder/page-placeholder";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <PagePlaceholder title="Accept invitation" params={{ token }} />;
}
