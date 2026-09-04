import { notFound } from "next/navigation";
import { TRPCError } from "@trpc/server";

import { SuperadminConsole } from "~/components/superadmin-console";
import { requireSuperadminSession } from "~/server/auth/dal";
import { api } from "~/trpc/server";

export default async function SuperadminPage() {
  try {
    await requireSuperadminSession();
  } catch (error) {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") notFound();
    throw error;
  }

  const dashboard = await api.superadmin.dashboard();
  return <SuperadminConsole initialData={dashboard} />;
}
