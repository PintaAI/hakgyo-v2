import { redirect } from "next/navigation";

export default async function LibraryPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId: organizationSlug } = await params;
  redirect(`/workspace/${organizationSlug}/library/materials`);
}
