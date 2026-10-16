import { redirect } from "next/navigation";

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId: organizationSlug } = await params;
  redirect(`/workspace/${organizationSlug}/analitik/performa`);
}
