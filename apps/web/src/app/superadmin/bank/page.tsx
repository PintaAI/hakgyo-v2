import { notFound } from "next/navigation";
import { TRPCError } from "@trpc/server";

import { SuperadminBank } from "~/components/superadmin-bank";
import { requireSuperadminSession } from "~/server/auth/dal";
import { api, HydrateClient } from "~/trpc/server";

export default async function SuperadminBankPage() {
  try {
    await requireSuperadminSession();
  } catch (error) {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") notFound();
    throw error;
  }

  // Coverage and the review queue (the first tab) load with the page.
  await Promise.all([
    api.superadmin.bank.overview.prefetch(),
    api.superadmin.bank.questions.prefetch({ status: "REVIEW" }),
  ]);
  return (
    <HydrateClient>
      <SuperadminBank />
    </HydrateClient>
  );
}
