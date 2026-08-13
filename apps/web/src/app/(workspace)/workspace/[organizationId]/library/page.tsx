import { redirect } from "next/navigation";

export default async function LibraryPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  redirect(`/workspace/${organizationId}/library/materials`);
}
