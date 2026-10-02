import type { Metadata } from "next";

import { CohortCheckout } from "~/components/learner/payments/cohort-checkout";

export const metadata: Metadata = {
  title: "Checkout Group belajar",
  robots: { index: false, follow: false },
};

export default async function CohortCheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ cohortId: string }>;
  searchParams: Promise<{ invite?: string | string[] }>;
}) {
  const [{ cohortId }, { invite }] = await Promise.all([params, searchParams]);
  return (
    <div className="mx-auto w-full max-w-5xl">
      <CohortCheckout
        cohortId={cohortId}
        inviteToken={typeof invite === "string" ? invite : undefined}
      />
    </div>
  );
}
