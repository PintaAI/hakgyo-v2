import { epsTopikBlueprint, type BlueprintSection } from "@hakgyo/shared";
import { TRPCError } from "@trpc/server";

import type { PrismaClient } from "../../../generated/prisma/client";
import { requireEditableAssessment } from "~/server/assessment/access";
import { repairQuestionGroups } from "~/server/assessment/groups";
import { lockAssessment } from "~/server/assessment/lock";
import { normalizeQuestionPositions } from "~/server/assessment/sections";
import { withTransactionRetry } from "~/server/db-retry";
import { toPrismaJsonValue } from "~/server/prisma-json";

/**
 * "Terapkan format EPS-TOPIK" (docs/eps-topik-simulation.md section 5.9): two timed sections
 * (Membaca free, Mendengar paced with audio played twice), 2.5 points per question, the score
 * bands of the blueprint and authored order. Every value stays editable afterwards.
 *
 * Sections: none yet creates both, the first 20 questions in Membaca and the rest in Mendengar;
 * one becomes Membaca and gets Mendengar after it (with the questions past the 20th); two are set
 * up as Membaca and Mendengar in their order. More than two are refused, since the preset can't
 * tell which ones to keep.
 */

const paragraphs = (text: string) => [{ type: "paragraph", content: text }];

function sectionData(section: BlueprintSection) {
  return {
    title: section.title,
    instructions: toPrismaJsonValue(paragraphs(section.instructions)),
    timeLimitSeconds: section.timeLimitSeconds,
    navigation: section.navigation,
    lockAnswers: section.lockAnswers,
    allowEarlyFinish: section.allowEarlyFinish,
    shuffleQuestions: false,
    audioMaxPlays: section.audioMaxPlays,
    audioAutoplay: section.audioAutoplay,
    audioRepeatGapSeconds: section.audioRepeatGapSeconds,
    pacedAnswerSeconds: section.pacedAnswerSeconds,
    pacedQuestionSeconds: null,
  };
}

export async function applyEpsTopikPreset(
  db: PrismaClient,
  assessmentId: string,
  userId: string,
) {
  await requireEditableAssessment(db, assessmentId, userId);
  const blueprint = epsTopikBlueprint;
  const [reading, listening] = blueprint.sections;
  if (!reading || !listening)
    throw new Error("EPS blueprint needs two sections");
  return withTransactionRetry(() =>
    db.$transaction(async (tx) => {
      await lockAssessment(tx, assessmentId);
      const [sections, questions] = await Promise.all([
        tx.assessmentSection.findMany({
          where: { assessmentId },
          orderBy: { position: "asc" },
          select: { id: true },
        }),
        tx.assessmentQuestion.findMany({
          where: { assessmentId },
          orderBy: { position: "asc" },
          select: { id: true, sectionId: true },
        }),
      ]);
      if (sections.length > 2) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Format EPS-TOPIK memakai dua bagian (Membaca dan Mendengar). Hapus bagian lain dulu, lalu terapkan lagi.",
        });
      }
      const readingCount = reading.slots.length;
      let readingId = sections[0]?.id;
      let listeningId = sections[1]?.id;
      if (readingId) {
        await tx.assessmentSection.update({
          where: { id: readingId },
          data: sectionData(reading),
        });
      } else {
        readingId = (
          await tx.assessmentSection.create({
            data: { assessmentId, position: 0, ...sectionData(reading) },
            select: { id: true },
          })
        ).id;
      }
      if (listeningId) {
        await tx.assessmentSection.update({
          where: { id: listeningId },
          data: sectionData(listening),
        });
      } else {
        listeningId = (
          await tx.assessmentSection.create({
            data: { assessmentId, position: 1, ...sectionData(listening) },
            select: { id: true },
          })
        ).id;
      }
      // New sections take the questions in order: the blueprint's reading count first.
      if (sections.length < 2) {
        const inReading = sections.length
          ? questions.filter(({ sectionId }) => sectionId === readingId)
          : questions;
        const moveToListening = inReading
          .slice(readingCount)
          .map(({ id }) => id);
        if (!sections.length) {
          await tx.assessmentQuestion.updateMany({
            where: { assessmentId },
            data: { sectionId: readingId },
          });
        }
        if (moveToListening.length) {
          await tx.assessmentQuestion.updateMany({
            where: { id: { in: moveToListening } },
            data: { sectionId: listeningId },
          });
        }
      }
      await normalizeQuestionPositions(tx, assessmentId);
      // A group split by the move keeps its longer part.
      await repairQuestionGroups(tx, assessmentId);
      await tx.assessmentQuestion.updateMany({
        where: { assessmentId },
        data: { points: blueprint.pointsPerQuestion },
      });
      await tx.assessment.update({
        where: { id: assessmentId },
        data: {
          shuffleQuestions: false,
          scoreBands: toPrismaJsonValue(blueprint.scoreBands),
        },
      });
      return {
        blueprint: blueprint.version,
        sections: 2,
        questions: questions.length,
      };
    }),
  );
}
