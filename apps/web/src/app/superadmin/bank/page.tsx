import { notFound } from "next/navigation";
import { TRPCError } from "@trpc/server";

import { SuperadminBank } from "~/components/superadmin-bank";
import { requireSuperadminSession } from "~/server/auth/dal";
import { api } from "~/trpc/server";

export default async function SuperadminBankPage() {
  try {
    await requireSuperadminSession();
  } catch (error) {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") notFound();
    throw error;
  }

  const overview = await api.superadmin.bank.overview();
  return <SuperadminBank initialData={overview} />;
}
