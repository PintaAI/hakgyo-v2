"use client";

import { toast } from "sonner";

import type { BankStatus } from "~/lib/bank-status";
import { api } from "~/trpc/react";

/** Status moves of bank questions, shared by the bank list and the bank question editor. */

const moveLabels: Record<BankStatus, string> = {
  DRAFT: "Kembalikan ke draf",
  REVIEW: "Kirim ke review",
  LIVE: "Setujui",
  RETIRED: "Pensiunkan",
};

export function bankQuestionHref(questionId: string) {
  return `/superadmin/bank/questions/${questionId}`;
}

/** The button label for moving questions from `from` to `to`. */
export function bankMoveLabel(from: BankStatus, to: BankStatus) {
  return to === "REVIEW" && from === "LIVE"
    ? "Kembalikan ke review"
    : moveLabels[to];
}

/**
 * Moves bank questions to another status and reports what moved; `describe` names a skipped
 * question in the warning (for example by its text).
 */
export function useMoveBankQuestions() {
  const utils = api.useUtils();
  const setStatus = api.superadmin.bank.setStatus.useMutation();

  async function move(
    questionIds: string[],
    status: BankStatus,
    describe: (questionId: string) => string = () => "soal",
  ) {
    try {
      const result = await setStatus.mutateAsync({ questionIds, status });
      await Promise.all([
        utils.superadmin.bank.overview.invalidate(),
        utils.superadmin.bank.questions.invalidate(),
        utils.superadmin.bank.question.invalidate(),
      ]);
      if (result.skipped.length) {
        const reasons = result.skipped
          .slice(0, 3)
          .map((entry) => `${describe(entry.questionId)} ${entry.reason}`)
          .join("; ");
        toast.warning(
          result.moved
            ? `${result.moved} soal dipindah. ${result.skipped.length} tidak: ${reasons}${result.skipped.length > 3 ? "; …" : ""}.`
            : `Soal tidak dipindah: ${reasons}${result.skipped.length > 3 ? "; …" : ""}.`,
        );
      } else {
        toast.success(`${result.moved} soal dipindah.`);
      }
      return result;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memindah.");
      return null;
    }
  }

  return { move, isPending: setStatus.isPending };
}
