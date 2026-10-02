import type { Metadata } from "next";

import { PaymentList } from "~/components/learner/payments/payment-list";

export const metadata: Metadata = { title: "Pembayaran" };

export default function PaymentsPage() {
  return <PaymentList />;
}
