import { epsTopikBlueprint, type BlueprintSection } from "@hakgyo/shared";
import { TRPCError } from "@trpc/server";

import type { PrismaClient } from "../../../generated/prisma/client";
import { requireEditableAssessment } from "~/server/assessment/access";
import { repairQuestionGroups } from "~/server/assessment/groups";
import { lockAssessment } from "~/server/assessment/lock";
import { normalizeQuestionPositions } from "~/server/assessment/sections";
import { withTransactionRetry } from "~/server/db-retry";
import { plainTextToBlockNote } from "~/lib/blocknote/document";
import { toPrismaJsonValue } from "~/server/prisma-json";

/**
 * "Terapkan format EPS-TOPIK" (docs/eps-topik-simulation.md section 5.9): two timed sections
 * (Membaca free, Mendengar paced with audio played twice), 2.5 points per question, the score
 * bands of the blueprint and authored order for questions and options. It overwrites the sections'
 * settings and instructions and every question's points. Every value stays editable afterwards.
 *
 * Sections: none yet creates both, the first 20 questions in Membaca and the rest in Mendengar;
 * one becomes Membaca and gets Mendengar after it (with the questions past the 20th); two are set
 * up as Membaca and Mendengar in their order. More than two are refused, since the preset can't
 * tell which ones to keep.
 */

function sectionData(section: BlueprintSection) {
  return {
    title: section.title,
    instructions: toPrismaJsonValue(plainTextToBlockNote(section.instructions)),
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
  const reading = blueprint.sections[0];
  if (!reading || blueprint.sections.length !== 2) {
    throw new Error("EPS blueprint needs two sections");
  }
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
      // Existing sections are set up in their order; missing ones are added after them.
      const [readingId, listeningId] = await Promise.all(
        blueprint.sections.map(async (section, index) => {
          const existing = sections[index];
          const data = sectionData(section);
          if (existing) {
            await tx.assessmentSection.update({
              where: { id: existing.id },
              data,
            });
            return existing.id;
          }
          const created = await tx.assessmentSection.create({
            data: { assessmentId, position: index, ...data },
            select: { id: true },
          });
          return created.id;
        }),
      );
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
        // Fixed order, options included: listening audio and picture grids name options ①–④.
        data: {
          shuffleQuestions: false,
          shuffleOptions: false,
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
