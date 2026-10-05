import { notFound } from "next/navigation";
import { TRPCError } from "@trpc/server";

import { SuperadminMedia } from "~/components/superadmin-media";
import { requireSuperadminSession } from "~/server/auth/dal";
import { api } from "~/trpc/server";

export default async function SuperadminMediaPage() {
  try {
    await requireSuperadminSession();
  } catch (error) {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") notFound();
    throw error;
  }

  const media = await api.superadmin.media.list();
  return <SuperadminMedia initialData={media} />;
}
