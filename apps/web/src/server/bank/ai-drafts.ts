import {
  epsReferenceCard,
  epsTypeByTag,
  type EpsTypeDefinition,
} from "@hakgyo/shared/eps-taxonomy";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { PrismaClient } from "../../../generated/prisma/client";
import {
  getBlockNotePlainText,
  plainTextToBlockNote,
} from "~/lib/blocknote/document";
import {
  checkDraft,
  mostSimilar,
  type DraftFlag,
} from "~/server/bank/draft-checks";
import { lockAssessment } from "~/server/assessment/lock";
import { HAKGYO_SYSTEM_ORGANIZATION_ID } from "~/server/foundation/constants";
import { toPrismaJsonValue } from "~/server/prisma-json";

/**
 * AI drafts for the question bank (docs/eps-question-generator.md section 6): a writer model drafts
 * a few original questions of one type from its reference card, a second model answers them blind,
 * automated checks flag what the reviewer should look at, and the drafts enter the bank as DRAFT.
 * The models are injected so tests never call an AI service.
 */

/** About five questions per call keeps a request within function limits. */
export const MAX_DRAFTS_PER_CALL = 5;

/** The two models of the trial the design asks for before picking one. */
export const draftModels = ["gpt-5.4", "gpt-5.4-mini"] as const;
export type DraftModel = (typeof draftModels)[number];

const topicSlugs = [
  "k3",
  "alat-kerja",
  "lembaga",
  "kehidupan",
  "budaya",
  "angka",
  "benda",
  "tindakan-kerja",
] as const;

export const createAiDraftsInput = z.object({
  assessmentId: z.string().min(1),
  type: z.string().regex(/^eps:[RL]\d{1,2}$/),
  count: z.number().int().min(1).max(MAX_DRAFTS_PER_CALL),
  level: z.enum(["mudah", "sedang", "sulit"]),
  topic: z.enum(topicSlugs).optional(),
  keywords: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
  chapter: z.number().int().min(1).max(60).optional(),
  model: z.enum(draftModels).default("gpt-5.4"),
});

export type CreateAiDraftsInput = z.infer<typeof createAiDraftsInput>;

export const draftOutputSchema = z.object({
  questions: z
    .array(
      z.object({
        prompt: z.string(),
        options: z.array(z.string()).length(4),
        key: z.number().int().min(0).max(3),
        explanation: z.string(),
        mediaBrief: z.string(),
        script: z.array(
          z.object({ speaker: z.enum(["M", "F", "N"]), text: z.string() }),
        ),
        topic: z.enum(topicSlugs),
      }),
    )
    .max(MAX_DRAFTS_PER_CALL),
});

export type DraftOutput = z.infer<
  typeof draftOutputSchema
>["questions"][number];

export const blindOutputSchema = z.object({
  answers: z.array(
    z.object({
      index: z.number().int().min(0),
      answer: z.number().int().min(0).max(3),
      plausible: z.array(z.number().int().min(0).max(3)),
    }),
  ),
});

export type DraftModels = {
  write: (input: {
    model: DraftModel;
    instructions: string;
    request: string;
  }) => Promise<DraftOutput[]>;
  answerBlind: (input: {
    model: DraftModel;
    questions: ReadonlyArray<{
      prompt: string;
      options: readonly string[];
      script: string;
    }>;
  }) => Promise<z.infer<typeof blindOutputSchema>["answers"]>;
};

/** What the writer model is told; the reference card carries the type's rules. */
export function draftInstructions(type: EpsTypeDefinition) {
  return [
    "You write original EPS-TOPIK practice questions for Hakgyo, an Indonesian school preparing workers for Korea.",
    "Never reproduce, translate back or paraphrase official HRDK/EPS-TOPIK items or the style examples in the reference card; every question must be new.",
    "Write natural standard Korean (Seoul) at the requested level, with workplace, safety (K3), daily-life and institution topics as the reference card describes.",
    "Each question has exactly four options and one correct key (index 0-3). Options are parallel: same word class, same sentence pattern, similar length. Vary the key position across the batch.",
    "prompt is what the learner reads on screen: the type's instruction line, then the question (and a passage when the type needs one). For listening types do not put the audio text in prompt.",
    "script holds what is spoken for listening types as lines (speaker M = man, F = woman, N = narrator); write numbers the way they are spoken. Reading types have an empty script.",
    type.optionsAreImages
      ? "This type has picture options: each option is a short Indonesian description of the picture to draw (the four pictures share one style and differ in one detail)."
      : "Options are Korean text.",
    "mediaBrief describes, in Indonesian, the picture, sign, document or chart the prompt needs (with fictional names and data); empty when the type needs none.",
    "explanation is one or two Indonesian sentences on why the key is right.",
    "topic is the closest topic slug.",
    "Reference card:",
    epsReferenceCard(type),
  ].join("\n");
}

export function draftRequest(
  input: CreateAiDraftsInput,
  type: EpsTypeDefinition,
) {
  return [
    `Write ${input.count} question(s) of type ${type.code} (${type.name}).`,
    `Level: ${input.level}.`,
    input.topic ? `Topic: ${input.topic}.` : "",
    input.keywords.length
      ? `Use these words: ${input.keywords.join(", ")}.`
      : "",
    input.chapter
      ? `Stay within the vocabulary and grammar of NEW 표준교재 chapter ${input.chapter}.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}

const scriptText = (script: DraftOutput["script"]) =>
  script.map((line) => `${line.speaker}: ${line.text}`).join("\n");

/** Checked drafts, ready to store. */
export async function prepareDrafts(input: {
  request: CreateAiDraftsInput;
  type: EpsTypeDefinition;
  models: DraftModels;
  existing: ReadonlyArray<{ text: string; position: number }>;
}) {
  const drafts = (
    await input.models.write({
      model: input.request.model,
      instructions: draftInstructions(input.type),
      request: draftRequest(input.request, input.type),
    })
  ).slice(0, input.request.count);
  if (!drafts.length) return [];
  const checkModel =
    draftModels.find((model) => model !== input.request.model) ??
    input.request.model;
  const blind = await input.models.answerBlind({
    model: checkModel,
    questions: drafts.map((draft) => ({
      prompt: draft.prompt,
      options: draft.options,
      script: scriptText(draft.script),
    })),
  });
  return drafts.map((draft, index) => {
    const answer = blind.find((entry) => entry.index === index) ?? null;
    const flags: DraftFlag[] = checkDraft({
      draft,
      batch: drafts,
      keywords: input.request.keywords,
      similar: mostSimilar(
        [draft.prompt, ...draft.options].join(" "),
        input.existing,
      ),
      blind: answer,
    });
    return { draft, flags, checkModel };
  });
}

export type BankMeta = {
  origin: "ai";
  model: DraftModel;
  checkModel: DraftModel;
  mediaBrief: string | null;
  script: DraftOutput["script"];
  /** Picture types: what each option's picture shows (the options hold it until drawn). */
  optionBriefs: string[] | null;
  flags: DraftFlag[];
  createdAt: string;
};

/** Writes AI drafts into a bank as DRAFT questions with their tags, key and production notes. */
export async function createAiDrafts(
  db: PrismaClient,
  input: CreateAiDraftsInput,
  models: DraftModels,
) {
  const type = epsTypeByTag(input.type);
  if (!type)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Tipe soal tidak dikenal.",
    });
  const bank = await db.assessment.findFirst({
    where: {
      id: input.assessmentId,
      kind: "BANK",
      organizationId: HAKGYO_SYSTEM_ORGANIZATION_ID,
    },
    select: {
      id: true,
      questions: {
        orderBy: { position: "asc" },
        select: {
          position: true,
          prompt: true,
          options: { select: { content: true } },
        },
      },
    },
  });
  if (!bank) throw new TRPCError({ code: "NOT_FOUND" });
  const existing = bank.questions.map((question) => ({
    position: question.position,
    text: [
      getBlockNotePlainText(question.prompt),
      ...question.options.map((option) =>
        getBlockNotePlainText(option.content),
      ),
    ].join(" "),
  }));
  const prepared = await prepareDrafts({
    request: input,
    type,
    models,
    existing,
  });
  if (!prepared.length) return { created: 0, flagged: 0 };

  const now = new Date().toISOString();
  const tags = (draft: DraftOutput) => [
    type.tag,
    `level:${input.level}`,
    `topik:${input.topic ?? draft.topic}`,
    ...(input.chapter ? [`bab:${input.chapter}`] : []),
  ];
  await db.$transaction(async (tx) => {
    await lockAssessment(tx, bank.id);
    const last = await tx.assessmentQuestion.aggregate({
      where: { assessmentId: bank.id },
      _max: { position: true },
    });
    const start = (last._max.position ?? -1) + 1;
    const questions = await tx.assessmentQuestion.createManyAndReturn({
      data: prepared.map(({ draft, flags, checkModel }, index) => {
        const meta: BankMeta = {
          origin: "ai",
          model: input.model,
          checkModel,
          mediaBrief: draft.mediaBrief.trim() || null,
          script: draft.script,
          optionBriefs: type.optionsAreImages ? [...draft.options] : null,
          flags,
          createdAt: now,
        };
        return {
          assessmentId: bank.id,
          type: "SINGLE_CHOICE" as const,
          position: start + index,
          points: 1,
          tags: tags(draft),
          prompt: toPrismaJsonValue(plainTextToBlockNote(draft.prompt)),
          explanation: toPrismaJsonValue(
            plainTextToBlockNote(draft.explanation),
          ),
          bankMeta: meta,
        };
      }),
      select: { id: true, position: true },
    });
    const byPosition = new Map(questions.map((row) => [row.position, row.id]));
    await tx.assessmentOption.createMany({
      data: prepared.flatMap(({ draft }, index) =>
        draft.options.map((option, optionIndex) => ({
          questionId: byPosition.get(start + index)!,
          content: toPrismaJsonValue(plainTextToBlockNote(option)),
          isCorrect: optionIndex === draft.key,
          position: optionIndex,
        })),
      ),
    });
  });
  return {
    created: prepared.length,
    flagged: prepared.filter(({ flags }) => flags.length).length,
  };
}
