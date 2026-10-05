import { cache } from "react";
import { TRPCError } from "@trpc/server";

import { db } from "~/server/db";
import { getPublicQuizResultCard } from "~/server/public-quiz/service";

/** The result card of an attempt, or null when the quiz or attempt is not public. */
export const loadResultCard = cache(
  async (params: { orgSlug: string; quizSlug: string; attemptId: string }) => {
    try {
      return await getPublicQuizResultCard(db, {
        organizationSlug: params.orgSlug,
        slug: params.quizSlug,
        attemptId: params.attemptId,
      });
    } catch (error) {
      if (error instanceof TRPCError && error.code === "NOT_FOUND") return null;
      throw error;
    }
  },
);
