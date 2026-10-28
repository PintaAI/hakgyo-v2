import { notFound } from "next/navigation";
import { TRPCError } from "@trpc/server";

import { BankQuestionEditor } from "~/components/bank-question-editor";
import { requireSuperadminSession } from "~/server/auth/dal";
import { api, HydrateClient } from "~/trpc/server";

export default async function SuperadminBankQuestionPage({
  params,
}: {
  params: Promise<{ questionId: string }>;
}) {
  try {
    await requireSuperadminSession();
  } catch (error) {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") notFound();
    throw error;
  }

  const { questionId } = await params;
  await api.superadmin.bank.question.prefetch({ id: questionId });
  return (
    <HydrateClient>
      <BankQuestionEditor questionId={questionId} />
    </HydrateClient>
  );
}
