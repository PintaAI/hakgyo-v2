import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "../../../../generated/prisma/client";

import { createTRPCRouter, superadminProcedure } from "~/server/api/trpc";
import { userSearchWhere } from "~/server/api/user-search";
import {
  deleteCourseTree,
  deleteOrganizationTree,
} from "~/server/superadmin/deletion";
import {
  createMediaUpload,
  deleteMedia,
  listMedia,
  MAX_MEDIA_BYTES,
  MEDIA_FOLDERS,
  mediaDownloadUrl,
} from "~/server/superadmin/media";
import { revokeUserAccess } from "~/server/superadmin/user-access";
import { createAiDrafts, createAiDraftsInput } from "~/server/bank/ai-drafts";
import {
  generateBankImage,
  generateBankImageInput,
} from "~/server/bank/images";
import { requestTts, runTtsWithOpenAi } from "~/server/bank/tts";
import {
  bankQuestionInput,
  createBankGroup,
  createBankGroupInput,
  createBankOption,
  createBankOptionInput,
  createBankQuestion,
  createBankQuestionInput,
  deleteBankOption,
  deleteBankOptionInput,
  deleteBankQuestion,
  deleteBankQuestionInput,
  getBankOverview,
  getBankQuestion,
  leaveBankGroup,
  leaveBankGroupInput,
  listBankQuestions,
  listBankQuestionsInput,
  setBankStatus,
  setBankStatusInput,
  updateBankGroup,
  updateBankGroupInput,
  updateBankOption,
  updateBankOptionInput,
  updateBankQuestion,
  updateBankQuestionInput,
} from "~/server/bank/bank";

const pageInput = z.object({
  search: z.string().trim().max(100).default(""),
  page: z.number().int().min(1).default(1),
});

const pageSize = 20;

/** AI failures as tRPC errors: a missing key is a setup problem, anything else a retry. */
function aiError(error: unknown, message: string) {
  if (error instanceof TRPCError) return error;
  if (error instanceof Error && error.message === "OPENAI_API_KEY_MISSING") {
    return new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "OPENAI_API_KEY belum dikonfigurasi di server.",
    });
  }
  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message,
    cause: error,
  });
}

async function audit(
  database: Database,
  input: {
    actorUserId: string;
    targetUserId?: string;
    targetId?: string;
    targetType?: string;
    action: string;
  },
) {
  await database.adminAuditLog.create({
    data: {
      actorUserId: input.actorUserId,
      targetUserId: input.targetUserId,
      targetId: input.targetId,
      targetType: input.targetType,
      action: input.action,
      outcome: "success",
    },
  });
}

export const superadminRouter = createTRPCRouter({
  dashboard: superadminProcedure.query(async ({ ctx }) => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [recentSignIns, users, firstPage] = await Promise.all([
      ctx.db.session.count({ where: { createdAt: { gte: since } } }),
      ctx.db.user.count({ where: { deletedAt: null } }),
      listUsers(ctx.db, { search: "", page: 1 }),
    ]);

    return { metrics: { recentSignIns, users }, users: firstPage };
  }),

  listUsers: superadminProcedure
    .input(pageInput)
    .query(({ ctx, input }) => listUsers(ctx.db, input)),

  updateProfile: superadminProcedure
    .input(
      z.object({
        userId: z.string().min(1),
        name: z.string().trim().min(1).max(120),
        image: z.string().url().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const target = await ctx.db.user.findUnique({
        where: { id: input.userId },
        select: { id: true, deletedAt: true },
      });
      if (!target || target.deletedAt) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      await ctx.db.user.update({
        where: { id: input.userId },
        data: { name: input.name, image: input.image },
      });
      await audit(ctx.db, {
        actorUserId: ctx.actorUserId,
        targetUserId: input.userId,
        action: "update_profile",
      });
      return { success: true };
    }),

  setSuspended: superadminProcedure
    .input(z.object({ userId: z.string().min(1), suspended: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const target = await ctx.db.user.findUnique({
        where: { id: input.userId },
        select: { id: true, deletedAt: true },
      });
      if (!target || target.deletedAt) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      await ctx.db.user.update({
        where: { id: input.userId },
        data: { suspendedAt: input.suspended ? new Date() : null },
      });
      if (input.suspended) {
        await revokeUserAccess(ctx.db, input.userId);
      }
      await audit(ctx.db, {
        actorUserId: ctx.actorUserId,
        targetUserId: input.userId,
        action: input.suspended ? "suspend_user" : "restore_user",
      });
      return { success: true };
    }),

  softDelete: superadminProcedure
    .input(z.object({ userId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const target = await ctx.db.user.findUnique({
        where: { id: input.userId },
        select: { id: true, deletedAt: true },
      });
      if (!target || target.deletedAt) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      await ctx.db.user.update({
        where: { id: input.userId },
        data: { deletedAt: new Date(), suspendedAt: new Date() },
      });
      await revokeUserAccess(ctx.db, input.userId);
      await audit(ctx.db, {
        actorUserId: ctx.actorUserId,
        targetUserId: input.userId,
        action: "soft_delete_user",
      });
      return { success: true };
    }),

  revokeSessions: superadminProcedure
    .input(z.object({ userId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await revokeUserAccess(ctx.db, input.userId);
      await audit(ctx.db, {
        actorUserId: ctx.actorUserId,
        targetUserId: input.userId,
        action: "revoke_sessions",
      });
      return { success: true };
    }),

  listOrganizations: superadminProcedure.query(({ ctx }) =>
    ctx.db.organization.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
        _count: { select: { members: true, courses: true } },
      },
    }),
  ),

  listCourses: superadminProcedure.query(({ ctx }) =>
    ctx.db.course.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        organization: { select: { name: true } },
        _count: {
          select: { modules: true, cohorts: true },
        },
      },
    }),
  ),

  deleteCourse: superadminProcedure
    .input(z.object({ courseId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const deleted = await deleteCourseTree(input.courseId, ctx.actorUserId);
      if (!deleted) throw new TRPCError({ code: "NOT_FOUND" });
      return { deleted: true };
    }),

  media: createTRPCRouter({
    list: superadminProcedure.query(() => listMedia()),

    createUpload: superadminProcedure
      .input(
        z.object({
          folder: z.enum(MEDIA_FOLDERS),
          filename: z.string().trim().min(1).max(200),
          contentType: z.string().max(200),
          size: z.number().int().min(1).max(MAX_MEDIA_BYTES),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const upload = await createMediaUpload(input);
        await audit(ctx.db, {
          actorUserId: ctx.actorUserId,
          targetId: upload.key,
          targetType: "media",
          action: "media.upload",
        });
        return upload;
      }),

    downloadUrl: superadminProcedure
      .input(
        z.object({
          key: z.string().min(1).max(500),
          disposition: z.enum(["attachment", "inline"]).default("attachment"),
        }),
      )
      .mutation(async ({ input }) => ({
        url: await mediaDownloadUrl(input.key, input.disposition),
      })),

    delete: superadminProcedure
      .input(z.object({ key: z.string().min(1).max(500) }))
      .mutation(async ({ ctx, input }) => {
        await deleteMedia(input.key);
        await audit(ctx.db, {
          actorUserId: ctx.actorUserId,
          targetId: input.key,
          targetType: "media",
          action: "media.delete",
        });
        return { deleted: true };
      }),
  }),

  /**
   * The EPS-TOPIK question bank (docs/eps-question-generator.md section 6): standalone bank
   * questions edited here. Content edits (autosaves) are not audited; creating, deleting, status
   * moves and AI work are.
   */
  bank: createTRPCRouter({
    overview: superadminProcedure.query(({ ctx }) => getBankOverview(ctx.db)),
    questions: superadminProcedure
      .input(listBankQuestionsInput)
      .query(({ ctx, input }) => listBankQuestions(ctx.db, input)),
    question: superadminProcedure
      .input(bankQuestionInput)
      .query(({ ctx, input }) => getBankQuestion(ctx.db, input)),
    createQuestion: superadminProcedure
      .input(createBankQuestionInput)
      .mutation(async ({ ctx, input }) => {
        const question = await createBankQuestion(
          ctx.db,
          input,
          ctx.actorUserId,
        );
        await audit(ctx.db, {
          actorUserId: ctx.actorUserId,
          targetId: question.id,
          targetType: "bank-question",
          action: "bank.question-create",
        }).catch((error: unknown) => console.error("Audit failed", error));
        return question;
      }),
    updateQuestion: superadminProcedure
      .input(updateBankQuestionInput)
      .mutation(({ ctx, input }) => updateBankQuestion(ctx.db, input)),
    createOption: superadminProcedure
      .input(createBankOptionInput)
      .mutation(({ ctx, input }) => createBankOption(ctx.db, input)),
    updateOption: superadminProcedure
      .input(updateBankOptionInput)
      .mutation(({ ctx, input }) => updateBankOption(ctx.db, input)),
    deleteOption: superadminProcedure
      .input(deleteBankOptionInput)
      .mutation(({ ctx, input }) => deleteBankOption(ctx.db, input)),
    deleteQuestion: superadminProcedure
      .input(deleteBankQuestionInput)
      .mutation(async ({ ctx, input }) => {
        const result = await deleteBankQuestion(ctx.db, input);
        await audit(ctx.db, {
          actorUserId: ctx.actorUserId,
          targetId: input.id,
          targetType: "bank-question",
          action: "bank.question-delete",
        }).catch((error: unknown) => console.error("Audit failed", error));
        return result;
      }),
    createGroup: superadminProcedure
      .input(createBankGroupInput)
      .mutation(({ ctx, input }) => createBankGroup(ctx.db, input)),
    updateGroup: superadminProcedure
      .input(updateBankGroupInput)
      .mutation(({ ctx, input }) => updateBankGroup(ctx.db, input)),
    leaveGroup: superadminProcedure
      .input(leaveBankGroupInput)
      .mutation(({ ctx, input }) => leaveBankGroup(ctx.db, input)),
    createDrafts: superadminProcedure
      .input(createAiDraftsInput)
      .mutation(async ({ ctx, input }) => {
        try {
          const { openAiDraftModels } = await import("~/server/ai/bank-drafts");
          const result = await createAiDrafts(
            ctx.db,
            input,
            ctx.actorUserId,
            openAiDraftModels,
          );
          // A failed log line must not report saved work as failed.
          await audit(ctx.db, {
            actorUserId: ctx.actorUserId,
            targetId: input.type,
            targetType: "bank",
            action: "bank.ai-drafts",
          }).catch((error: unknown) => console.error("Audit failed", error));
          return result;
        } catch (error) {
          throw aiError(error, "Draf AI gagal dibuat. Silakan coba lagi.");
        }
      }),
    generateImage: superadminProcedure
      .input(generateBankImageInput)
      .mutation(async ({ ctx, input }) => {
        try {
          const { generateBankIllustration } =
            await import("~/server/ai/bank-image");
          const result = await generateBankImage(
            ctx.db,
            input,
            ctx.actorUserId,
            generateBankIllustration,
          );
          // A failed log line must not report saved work as failed.
          await audit(ctx.db, {
            actorUserId: ctx.actorUserId,
            targetId: input.questionId,
            targetType: "bank-question",
            action: "bank.ai-image",
          }).catch((error: unknown) => console.error("Audit failed", error));
          return result;
        } catch (error) {
          throw aiError(error, "Gambar AI gagal dibuat. Silakan coba lagi.");
        }
      }),
    /** Queues audio for the VPS poller (VoxCPM2 on the GPU worker). */
    requestAudio: superadminProcedure
      .input(z.object({ questionId: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const job = await requestTts(ctx.db, input.questionId, ctx.actorUserId);
        await audit(ctx.db, {
          actorUserId: ctx.actorUserId,
          targetId: input.questionId,
          targetType: "bank-question",
          action: "bank.tts-request",
        }).catch((error: unknown) => console.error("Audit failed", error));
        return job;
      }),
    /** "Buat dengan cloud sekarang": speaks the question with OpenAI right away. */
    generateAudioNow: superadminProcedure
      .input(z.object({ questionId: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        try {
          const job = await requestTts(
            ctx.db,
            input.questionId,
            ctx.actorUserId,
          );
          const { openAiSpeakLine } = await import("~/server/ai/bank-tts");
          const result = await runTtsWithOpenAi(
            ctx.db,
            job.id,
            openAiSpeakLine,
          );
          await audit(ctx.db, {
            actorUserId: ctx.actorUserId,
            targetId: input.questionId,
            targetType: "bank-question",
            action: "bank.tts-openai",
          }).catch((error: unknown) => console.error("Audit failed", error));
          return result;
        } catch (error) {
          throw aiError(error, "Audio cloud gagal dibuat. Silakan coba lagi.");
        }
      }),
    setStatus: superadminProcedure
      .input(setBankStatusInput)
      .mutation(async ({ ctx, input }) => {
        const result = await setBankStatus(ctx.db, input);
        if (result.moved) {
          await audit(ctx.db, {
            actorUserId: ctx.actorUserId,
            targetId: input.questionIds.join(","),
            targetType: "bank-question",
            action: `bank.status.${input.status.toLowerCase()}`,
          });
        }
        return result;
      }),
  }),

  deleteOrganization: superadminProcedure
    .input(z.object({ organizationId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const deleted = await deleteOrganizationTree(
        input.organizationId,
        ctx.actorUserId,
      );
      if (!deleted) throw new TRPCError({ code: "NOT_FOUND" });
      return { deleted: true };
    }),
});

async function listUsers(database: Database, input: z.infer<typeof pageInput>) {
  const where = input.search ? userSearchWhere(input.search) : undefined;
  const [users, total] = await Promise.all([
    database.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (input.page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        suspendedAt: true,
        deletedAt: true,
        createdAt: true,
      },
    }),
    database.user.count({ where }),
  ]);
  // Session counts for this page only; a relation `_count` in the findMany
  // aggregates every session in the database.
  const sessionCounts =
    users.length === 0
      ? []
      : await database.session.groupBy({
          by: ["userId"],
          where: { userId: { in: users.map((user) => user.id) } },
          _count: { _all: true },
        });
  const sessionCountByUser = new Map(
    sessionCounts.map((row) => [row.userId, row._count._all]),
  );
  const items = users.map((user) => ({
    ...user,
    _count: { sessions: sessionCountByUser.get(user.id) ?? 0 },
  }));
  return { items, total, page: input.page, pageSize };
}

type Database = PrismaClient;
