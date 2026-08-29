import { z } from "zod";

export const hrdkSectionKinds = [
  "objectives",
  "vocabulary",
  "grammar",
  "dialogue",
  "pronunciation",
  "culture",
  "reading",
  "listening",
  "exercise",
  "other",
] as const;

export const hrdkSectionSchema = z.object({
  kind: z.enum(hrdkSectionKinds),
  title: z.string().min(1),
  pageStart: z.number().int().positive(),
  pageEnd: z.number().int().positive(),
  lines: z.array(z.string().min(1)),
});

export const hrdkVocabularyEntrySchema = z.object({
  term: z.string().min(1),
  definition: z.string().min(1),
  examples: z.array(z.string()).default([]),
  sourcePage: z.number().int().positive(),
});

export const hrdkAssessmentOptionSchema = z.object({
  content: z.string().min(1),
  isCorrect: z.boolean(),
});

export const hrdkAssessmentQuestionSchema = z.object({
  type: z.literal("SINGLE_CHOICE"),
  prompt: z.string().min(1),
  explanation: z.string().nullable(),
  points: z.number().int().positive(),
  sourcePage: z.number().int().positive(),
  options: z.array(hrdkAssessmentOptionSchema).min(2),
});

export const hrdkLessonSchema = z.object({
  number: z.number().int().positive(),
  title: z.string().min(1),
  pageStart: z.number().int().positive(),
  pageEnd: z.number().int().positive(),
  sections: z.array(hrdkSectionSchema),
  vocabulary: z.array(hrdkVocabularyEntrySchema),
  assessment: z.array(hrdkAssessmentQuestionSchema),
});

export const hrdkManifestSchema = z.object({
  schemaVersion: z.literal(1),
  source: z.object({
    fileName: z.string().min(1),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    pageCount: z.number().int().positive(),
    extractedAt: z.string().datetime(),
    sourceUrl: z.string().url().optional(),
  }),
  course: z.object({
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    title: z.string().min(1).max(200),
    description: z.string().max(10_000),
    status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  }),
  lessons: z.array(hrdkLessonSchema).min(1),
});

export const hrdkIssueSchema = z.object({
  severity: z.enum(["error", "warning"]),
  code: z.string().min(1),
  message: z.string().min(1),
  page: z.number().int().positive().optional(),
  lesson: z.number().int().positive().optional(),
});

export const hrdkReportSchema = z.object({
  valid: z.boolean(),
  generatedAt: z.string().datetime(),
  issues: z.array(hrdkIssueSchema),
  summary: z.object({
    lessons: z.number().int().nonnegative(),
    sections: z.number().int().nonnegative(),
    vocabularyEntries: z.number().int().nonnegative(),
    assessmentQuestions: z.number().int().nonnegative(),
  }),
});

export type HrdkManifest = z.infer<typeof hrdkManifestSchema>;
export type HrdkLesson = z.infer<typeof hrdkLessonSchema>;
export type HrdkSection = z.infer<typeof hrdkSectionSchema>;
export type HrdkIssue = z.infer<typeof hrdkIssueSchema>;
export type HrdkReport = z.infer<typeof hrdkReportSchema>;
