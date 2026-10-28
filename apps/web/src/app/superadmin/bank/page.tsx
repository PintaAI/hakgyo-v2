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

  const [overview] = await Promise.all([
    api.superadmin.bank.overview(),
    // The package builder lists organizations and recent packages.
    api.superadmin.listOrganizations.prefetch(),
    api.superadmin.bank.packages.prefetch(),
  ]);
  // The review queue of the first bank shows first; load it with the page.
  const firstBank = overview.banks[0];
  if (firstBank) {
    await api.superadmin.bank.questions.prefetch({
      assessmentId: firstBank.id,
      status: "REVIEW",
    });
  }
  return (
    <HydrateClient>
      <SuperadminBank initialData={overview} />
    </HydrateClient>
  );
}
