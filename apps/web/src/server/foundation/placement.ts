import {
  PLACEMENT_HANGEUL_STAGE,
  placementXp,
  type PlacementStage,
} from "@hakgyo/shared/placement";

import type { Prisma } from "../../../generated/prisma/client";
import { recordGamificationActivity } from "../gamification/record-activity";
import { HAKGYO_SYSTEM_ORGANIZATION_ID } from "./constants";
import { awardHangeulMasteryFromPlacement } from "./hangeul-mastery-completion";

/**
 * Applies the result of the mobile onboarding placement test: from stage 2
 * (reads Hangeul) the Hangeul Mastery badge and its follow-up classes, and
 * the stage's XP once per learner, booked on the Hakgyo system organization.
 * The device grades the test and the server trusts the stage: it skips a free
 * course and awards at most `placementXp(4)`, once.
 */
export async function applyPlacementResult(
  tx: Prisma.TransactionClient,
  input: { userId: string; stage: PlacementStage; now?: Date },
) {
  if (input.stage >= PLACEMENT_HANGEUL_STAGE) {
    await awardHangeulMasteryFromPlacement(tx, {
      userId: input.userId,
      now: input.now,
    });
  }
  const xp = placementXp(input.stage);
  if (xp > 0) {
    await recordGamificationActivity(tx, {
      action: "PLACEMENT_PASSED",
      xp,
      idempotencyKey: `placement:${input.userId}`,
      metadata: { stage: input.stage },
      organizationId: HAKGYO_SYSTEM_ORGANIZATION_ID,
      occurredAt: input.now,
      userId: input.userId,
    });
  }
}
