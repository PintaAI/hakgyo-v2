import type { Metadata } from "next";

import { PaymentDetail } from "~/components/learner/payments/payment-detail";

export const metadata: Metadata = {
  title: "Pembayaran",
  robots: { index: false, follow: false },
};

export default async function PaymentPage({
  params,
}: {
  params: Promise<{ paymentId: string }>;
}) {
  const { paymentId } = await params;
  return <PaymentDetail paymentId={paymentId} />;
}
