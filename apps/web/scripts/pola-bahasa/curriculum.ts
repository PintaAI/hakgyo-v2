// Content -> the rows the two Pola Bahasa courses should have (pure, no database). Every chapter (bab) becomes a
// module holding one short material per pattern, then the chapter's vocabulary set, then its quiz. Material blocks
// get deterministic ids, `pola-ref:` links become `hakgyo-material:` links, and everything the import relies on is
// checked, so the same code serves `pola:validate` (offline), the unit tests and `pola:import`.
import {
  formatMaterialLinkHref,
  MATERIAL_LINK_PREFIX,
  vocabularyMeaningFields,
} from "@hakgyo/shared";

import { findBlockNoteDocumentIssues } from "~/lib/blocknote/document-validation";
import { collectMaterialReferenceIds } from "~/lib/blocknote/resource-references";
import {
  computeCourseReadiness,
  summarizeAssessmentReadiness,
  type ReadinessAssessment,
  type ReadinessItem,
  type ReadinessMaterial,
} from "~/server/course/readiness";

import { normalizeTerm } from "../hangeul-mastery/ids";
import {
  p,
  REF_PREFIX,
  type BabContent,
  type BlockNoteBlock,
  type MaterialBody,
  type QuizContent,
  type VocabularyContent,
} from "./blocks";
import {
  blockId,
  courseId,
  isValidKey,
  materialId,
  materialItemId,
  moduleId,
  quizId,
  quizItemId,
  quizOptionId,
  quizQuestionId,
  vocabularyEntryCreatedAt,
  vocabularyEntryId,
  vocabularyItemId,
  vocabularySetId,
} from "./ids";
import {
  materialTitle,
  POLA_BABS,
  POLA_COURSES,
  POLA_MATERIALS,
  type PolaBabKey,
  type PolaCourseKey,
  type PolaMaterialKey,
} from "./manifest";

/** Limits of the grammar card (the editor and renderer drop rows past these). */
export const GRAMMAR_MAX_RULES = 12;
export const GRAMMAR_MAX_EXAMPLES = 12;

/** Chapter quiz size and shape (see QuizContent in ./blocks.ts and STYLE.md). */
export const QUIZ_MIN_QUESTIONS = 8;
export const QUIZ_MAX_QUESTIONS = 12;
export const QUIZ_MIN_OPTIONS = 3;
export const QUIZ_MAX_OPTIONS = 4;
export const QUIZ_DEFAULT_PASSING_SCORE = 70;
/** Limits of the conversation block built by chat(). */
export const CHAT_MAX_LINES = 16;
export const CHAT_MAX_QUESTIONS = 8;
/** A material is meant to be short (STYLE.md: about 15 blocks); above this many top-level blocks it warns. */
export const MATERIAL_MAX_BLOCKS = 18;
/** Widest table that still fits a phone, per course (STYLE.md). */
export const TABLE_MAX_COLUMNS: Record<PolaCourseKey, number> = {
  "indo-korea": 2,
  "korea-indo": 3,
};
/** The only materials that may use a culture() block. */
export const CULTURE_MATERIALS: readonly PolaMaterialKey[] = [
  "ki-banmal-kapan",
];
/** Blocks a material must not contain (the chapter quiz and vocabulary set are their own items). */
const FORBIDDEN_BLOCKS: Record<string, string> = {
  lessonPage:
    "an opener() (lessonPage) block; materials start with the pattern itself",
  assessmentReference:
    "an embedded assessment; the chapter quiz is its own item at the end of the chapter",
  vocabularyReference:
    "an embedded vocabulary set; the chapter vocabulary set is its own item",
};

/** Words that mark unfinished writing; content containing them is not imported. */
const DRAFT_MARKER = /\b(TODO|TBD|FIXME|XXX|lorem ipsum)\b/i;

/** How a vocabulary example is stored: one string, Korean then the Indonesian meaning (as in Hangeul Mastery). */
export const formatVocabularyExample = (example: { ko: string; id: string }) =>
  `${example.ko.trim()} = ${example.id.trim()}`;

// ---------------------------------------------------------------- desired rows

export type DesiredMaterial = {
  id: string;
  key: PolaMaterialKey;
  title: string;
  description: string | null;
  content: BlockNoteBlock[];
  editorSchemaVersion: 1;
};

export type DesiredEntry = {
  id: string;
  vocabularySetId: string;
  term: string;
  meanings: string[];
  /** `meanings` joined with "; " (see VocabularyEntry in prisma/schema.prisma). */
  definition: string;
  /** Exactly one example, `<Korean> = <Indonesian>`. */
  examples: string[];
  /** Fixes the order the app lists entries in (createdAt, then id). */
  createdAt: Date;
};

export type DesiredVocabularySet = {
  id: string;
  key: PolaBabKey;
  title: string;
  description: string | null;
  entries: DesiredEntry[];
};

export type DesiredOption = {
  id: string;
  questionId: string;
  content: BlockNoteBlock[];
  isCorrect: boolean;
  position: number;
};

export type DesiredQuestion = {
  id: string;
  assessmentId: string;
  type: "SINGLE_CHOICE";
  prompt: BlockNoteBlock[];
  explanation: BlockNoteBlock[];
  points: 1;
  position: number;
  options: DesiredOption[];
};

/** A chapter's quiz. Assessments have no publish state; the published course item makes it visible. */
export type DesiredAssessment = {
  id: string;
  key: PolaBabKey;
  title: string;
  description: string | null;
  instructions: null;
  passingScore: number;
  maxAttempts: null;
  timeLimitMinutes: null;
  shuffleQuestions: false;
  shuffleOptions: true;
  editorSchemaVersion: 1;
  questions: DesiredQuestion[];
};

export type DesiredItem = {
  id: string;
  /** The material key, or the chapter key for the vocabulary set and quiz items. */
  key: string;
  moduleId: string;
  type: "MATERIAL" | "VOCABULARY_SET" | "ASSESSMENT";
  position: number;
  materialId: string | null;
  vocabularySetId: string | null;
  assessmentId: string | null;
  isPublished: true;
};

export type DesiredModule = {
  id: string;
  key: PolaBabKey;
  courseId: string;
  title: string;
  description: null;
  position: number;
  items: DesiredItem[];
};

export type DesiredCourse = {
  id: string;
  key: PolaCourseKey;
  title: string;
  slug: string;
  description: string;
  status: "PUBLISHED";
  /** Learners join through a class, and none exists until one is set up. */
  progressionMode: "OPEN";
  modules: DesiredModule[];
};

// ---------------------------------------------------------------- links and stats

/** One `pola-ref:` link between materials. */
export type LinkUse = {
  from: PolaMaterialKey;
  to: PolaMaterialKey;
  text: string;
};

export type MaterialStats = {
  key: PolaMaterialKey;
  bab: PolaBabKey;
  course: PolaCourseKey;
  blocks: number;
  linksOut: number;
  /** Links from other materials. */
  linksIn: number;
};

export type CurriculumResult = {
  courses: DesiredCourse[];
  /** Assembled materials of the valid chapters, in manifest order. */
  materials: DesiredMaterial[];
  /** Vocabulary sets of the valid chapters, in manifest order. */
  vocabularySets: DesiredVocabularySet[];
  /** Quizzes of the valid chapters, in manifest order. */
  assessments: DesiredAssessment[];
  links: LinkUse[];
  stats: MaterialStats[];
  /** Materials no other material links to. */
  unlinkedMaterials: PolaMaterialKey[];
  /** Manifest chapters without content (the import refuses partial courses). */
  missing: PolaBabKey[];
  /** Problems in the content that is there. */
  errors: string[];
  warnings: string[];
};

// ---------------------------------------------------------------- helpers

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function inlineText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(inlineText).join("");
  if (!isRecord(value)) return "";
  if (value.type === "text" && typeof value.text === "string")
    return value.text;
  if (value.type === "link") return inlineText(value.content);
  return "";
}

function headingLevel(block: BlockNoteBlock): number | null {
  if (block.type !== "heading") return null;
  const level = Number(block.props?.level ?? 1);
  return Number.isFinite(level) ? level : 1;
}

/** Every text string in a value (inline content, table cells, string props), for the draft-marker check. */
function collectStrings(value: unknown, out: string[]) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value))
    for (const item of value) collectStrings(item, out);
  else if (isRecord(value))
    for (const [key, item] of Object.entries(value)) {
      if (key === "href" || key === "id" || key === "type") continue;
      collectStrings(item, out);
    }
}

function draftMarker(value: unknown) {
  const strings: string[] = [];
  collectStrings(value, strings);
  return strings.find((text) => DRAFT_MARKER.test(text));
}

function parseJsonArray(value: unknown): unknown[] | null {
  if (typeof value !== "string") return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

const nonEmpty = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0;

/** Problems of one grammar card's props. */
export function grammarCardIssues(props: Record<string, unknown>): string[] {
  const issues: string[] = [];
  for (const field of ["title", "descriptionKo", "descriptionTranslation"]) {
    if (!nonEmpty(props[field])) issues.push(`grammar card needs a ${field}`);
  }
  const rules = parseJsonArray(props.ruleRows);
  if (!rules) issues.push("grammar ruleRows must be a JSON array");
  else {
    if (rules.length > GRAMMAR_MAX_RULES) {
      issues.push(
        `grammar card has ${rules.length} rules (at most ${GRAMMAR_MAX_RULES}; the card drops the rest)`,
      );
    }
    rules.forEach((row, index) => {
      if (
        !isRecord(row) ||
        !nonEmpty(row.form) ||
        typeof row.condition !== "string" ||
        typeof row.example !== "string"
      ) {
        issues.push(
          `grammar rule ${index + 1} needs { condition, form, example } strings with a form`,
        );
      }
    });
  }
  const examples = parseJsonArray(props.examples);
  if (!examples) issues.push("grammar examples must be a JSON array");
  else {
    if (examples.length > GRAMMAR_MAX_EXAMPLES) {
      issues.push(
        `grammar card has ${examples.length} examples (at most ${GRAMMAR_MAX_EXAMPLES}; the card drops the rest)`,
      );
    }
    examples.forEach((example, index) => {
      if (
        !isRecord(example) ||
        !nonEmpty(example.emphasis) ||
        typeof example.before !== "string" ||
        typeof example.after !== "string"
      ) {
        issues.push(
          `grammar example ${index + 1} needs { before, emphasis, after } strings with an emphasis`,
        );
      }
    });
  }
  if (props.showTip === true && !nonEmpty(props.tipTranslation)) {
    issues.push("grammar tip is shown but tipTranslation is empty");
  }
  return issues;
}

/** Problems of one conversation block (chat()). */
export function conversationIssues(props: Record<string, unknown>): string[] {
  const issues: string[] = [];
  const lines = parseJsonArray(props.lines);
  if (!lines) issues.push("conversation lines must be a JSON array");
  else {
    if (!lines.length) issues.push("conversation has no lines");
    if (lines.length > CHAT_MAX_LINES) {
      issues.push(
        `conversation has ${lines.length} lines (at most ${CHAT_MAX_LINES})`,
      );
    }
    lines.forEach((line, index) => {
      if (
        !isRecord(line) ||
        !nonEmpty(line.speaker) ||
        !nonEmpty(line.korean) ||
        !nonEmpty(line.translation)
      ) {
        issues.push(
          `conversation line ${index + 1} needs a speaker, Korean and Indonesian`,
        );
      }
    });
  }
  const questions = parseJsonArray(props.questions);
  if (!questions) issues.push("conversation questions must be a JSON array");
  else {
    if (questions.length > CHAT_MAX_QUESTIONS) {
      issues.push(
        `conversation has ${questions.length} questions (at most ${CHAT_MAX_QUESTIONS})`,
      );
    }
    questions.forEach((question, index) => {
      if (
        !isRecord(question) ||
        !nonEmpty(question.korean) ||
        !nonEmpty(question.translation)
      ) {
        issues.push(
          `conversation question ${index + 1} needs Korean and Indonesian`,
        );
      }
    });
  }
  if (
    props.showTip === true &&
    (!nonEmpty(props.tipTitle) ||
      (!nonEmpty(props.tipBody) && !nonEmpty(props.tipTranslation)))
  ) {
    issues.push("conversation tip is shown but has no title or text");
  }
  return issues;
}

/** Problems of one culture block (culture()). */
export function cultureIssues(props: Record<string, unknown>): string[] {
  const issues: string[] = [];
  if (!nonEmpty(props.titleKo) || !nonEmpty(props.titleEn)) {
    issues.push("culture block needs a Korean and an Indonesian title");
  }
  const sections = parseJsonArray(props.sections);
  if (!sections) issues.push("culture sections must be a JSON array");
  else {
    if (!sections.length) issues.push("culture block has no paragraphs");
    sections.forEach((section, index) => {
      if (
        !isRecord(section) ||
        section.type !== "text" ||
        !nonEmpty(section.ko) ||
        !nonEmpty(section.en)
      ) {
        issues.push(
          `culture paragraph ${index + 1} needs Korean and Indonesian text`,
        );
      }
    });
  }
  const checklist = parseJsonArray(props.checklistItems);
  if (!checklist) issues.push("culture checklistItems must be a JSON array");
  else {
    if (props.showChecklist === true && !checklist.length) {
      issues.push("culture checklist is shown but empty");
    }
    checklist.forEach((item, index) => {
      if (!isRecord(item) || !nonEmpty(item.ko) || !nonEmpty(item.en)) {
        issues.push(
          `culture checklist item ${index + 1} needs Korean and Indonesian`,
        );
      }
    });
  }
  return issues;
}

/** Columns of a table block (its widest row). */
function tableColumns(block: BlockNoteBlock): number {
  const content = block.content;
  if (!isRecord(content) || !Array.isArray(content.rows)) return 0;
  return Math.max(
    0,
    ...content.rows.map((row) =>
      isRecord(row) && Array.isArray(row.cells) ? row.cells.length : 0,
    ),
  );
}

// ---------------------------------------------------------------- vocabulary and quiz

/** Problems of a chapter's vocabulary set content (one entry per material, in manifest order). */
export function vocabularyIssues(
  vocabulary: VocabularyContent,
  materialKeys: readonly PolaMaterialKey[],
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!nonEmpty(vocabulary.title)) errors.push("vocabulary title is empty");
  if (typeof vocabulary.description !== "string") {
    errors.push("vocabulary description must be a string");
  }
  const entries = Array.isArray(vocabulary.entries) ? vocabulary.entries : [];
  if (entries.length !== materialKeys.length) {
    errors.push(
      `vocabulary has ${entries.length} entries; it needs exactly one per material (${materialKeys.length}), in manifest order`,
    );
  }
  const terms = new Map<string, number>();
  entries.forEach((entry, index) => {
    const where = `vocabulary entry ${index + 1}${materialKeys[index] ? ` (${materialKeys[index]})` : ""}`;
    if (!isRecord(entry)) {
      errors.push(`${where} is not an object`);
      return;
    }
    if (!nonEmpty(entry.term)) errors.push(`${where}: term is empty`);
    else {
      const term = normalizeTerm(entry.term);
      if (terms.has(term)) {
        warnings.push(
          `${where}: term "${term}" is also entry ${terms.get(term)! + 1}`,
        );
      } else terms.set(term, index);
    }
    const meanings = Array.isArray(entry.meanings)
      ? vocabularyMeaningFields(
          entry.meanings.filter((meaning) => typeof meaning === "string"),
        ).meanings
      : [];
    if (!meanings.length) errors.push(`${where}: meanings are empty`);
    if (
      !isRecord(entry.example) ||
      !nonEmpty(entry.example.ko) ||
      !nonEmpty(entry.example.id)
    ) {
      errors.push(`${where}: example needs Korean (ko) and Indonesian (id)`);
    }
  });
  const marker = draftMarker(vocabulary);
  if (marker) {
    errors.push(
      `vocabulary contains a draft marker: "${marker.trim().slice(0, 80)}"`,
    );
  }
  return { errors, warnings };
}

/** The vocabulary set rows of a chapter; only called once vocabularyIssues() found no errors. */
export function buildVocabularySet(
  babKey: PolaBabKey,
  vocabulary: VocabularyContent,
  materialKeys: readonly PolaMaterialKey[],
): DesiredVocabularySet {
  const id = vocabularySetId(babKey);
  return {
    id,
    key: babKey,
    title: vocabulary.title.trim(),
    description: vocabulary.description.trim() || null,
    entries: vocabulary.entries.map((entry, index): DesiredEntry => ({
      id: vocabularyEntryId(babKey, materialKeys[index]!),
      vocabularySetId: id,
      term: normalizeTerm(entry.term),
      ...vocabularyMeaningFields(entry.meanings),
      examples: [formatVocabularyExample(entry.example)],
      createdAt: vocabularyEntryCreatedAt(index),
    })),
  };
}

/** Problems of a chapter's quiz content (before ids are derived). */
export function quizIssues(quiz: QuizContent): string[] {
  const issues: string[] = [];
  if (!nonEmpty(quiz.title)) issues.push("quiz title is empty");
  if (typeof quiz.description !== "string") {
    issues.push("quiz description must be a string");
  }
  const passing = quiz.passingScore ?? QUIZ_DEFAULT_PASSING_SCORE;
  if (!Number.isInteger(passing) || passing < 0 || passing > 100) {
    issues.push("quiz passingScore must be a whole number 0-100");
  }
  const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
  if (
    questions.length < QUIZ_MIN_QUESTIONS ||
    questions.length > QUIZ_MAX_QUESTIONS
  ) {
    issues.push(
      `quiz has ${questions.length} questions (${QUIZ_MIN_QUESTIONS}-${QUIZ_MAX_QUESTIONS})`,
    );
  }
  const keys = new Set<string>();
  questions.forEach((question, index) => {
    const where = `quiz question ${index + 1}${typeof question.key === "string" ? ` (${question.key})` : ""}`;
    if (typeof question.key !== "string" || !isValidKey(question.key)) {
      issues.push(`${where}: key must be kebab-case`);
    } else if (keys.has(question.key)) {
      issues.push(`${where}: key is used twice`);
    }
    if (typeof question.key === "string") keys.add(question.key);
    const type = question.type ?? "SINGLE_CHOICE";
    if (type !== "SINGLE_CHOICE") {
      issues.push(
        `${where}: chapter quizzes use SINGLE_CHOICE only (has ${String(type)})`,
      );
    }
    if (!nonEmpty(question.prompt)) issues.push(`${where}: prompt is empty`);
    if (!nonEmpty(question.explanation)) {
      issues.push(`${where}: explanation is empty`);
    }
    const options = Array.isArray(question.options) ? question.options : [];
    if (
      options.length < QUIZ_MIN_OPTIONS ||
      options.length > QUIZ_MAX_OPTIONS
    ) {
      issues.push(
        `${where}: has ${options.length} options (${QUIZ_MIN_OPTIONS}-${QUIZ_MAX_OPTIONS})`,
      );
    }
    if (options.some((option) => !nonEmpty(option?.text))) {
      issues.push(`${where}: an option has no text`);
    }
    const texts = options.map((option) =>
      typeof option?.text === "string" ? normalizeTerm(option.text) : "",
    );
    if (new Set(texts).size !== texts.length) {
      issues.push(`${where}: two options have the same text`);
    }
    const correct = options.filter((option) => option?.correct === true).length;
    if (correct !== 1) {
      issues.push(
        `${where}: needs exactly one correct option (has ${correct})`,
      );
    }
  });
  const marker = draftMarker(quiz);
  if (marker) {
    issues.push(
      `quiz contains a draft marker: "${marker.trim().slice(0, 80)}"`,
    );
  }
  return issues;
}

/** The quiz rows of a chapter; only called once quizIssues() found nothing. */
export function buildQuiz(
  babKey: PolaBabKey,
  quiz: QuizContent,
): DesiredAssessment {
  const id = quizId(babKey);
  return {
    id,
    key: babKey,
    title: quiz.title.trim(),
    description: quiz.description.trim() || null,
    instructions: null,
    passingScore: quiz.passingScore ?? QUIZ_DEFAULT_PASSING_SCORE,
    maxAttempts: null,
    timeLimitMinutes: null,
    shuffleQuestions: false,
    shuffleOptions: true,
    editorSchemaVersion: 1,
    questions: quiz.questions.map((question, position): DesiredQuestion => {
      const questionId = quizQuestionId(babKey, question.key);
      return {
        id: questionId,
        assessmentId: id,
        type: "SINGLE_CHOICE",
        prompt: [p(question.prompt.trim())],
        explanation: [p(question.explanation.trim())],
        points: 1,
        position,
        options: question.options.map((option, index) => ({
          id: quizOptionId(questionId, option.text),
          questionId,
          content: [p(option.text.trim())],
          isCorrect: option.correct === true,
          position: index,
        })),
      };
    }),
  };
}

// ---------------------------------------------------------------- links

/** The material key of a `pola-ref:<materialKey>` href; null when malformed. */
export function parseRef(href: string): string | null {
  if (!href.startsWith(REF_PREFIX)) return null;
  const key = href.slice(REF_PREFIX.length);
  return key && !key.includes("#") ? key : null;
}

/** The `hakgyo-material:` href of a ref, or an error message. */
export function resolveRef(key: string): { href: string } | { error: string } {
  if (!(key in POLA_MATERIALS)) {
    return { error: `unknown material "${key}"` };
  }
  return {
    href: formatMaterialLinkHref({ materialId: materialId(key), anchor: null }),
  };
}

// ---------------------------------------------------------------- assembly

type AssemblyContext = {
  materialKey: PolaMaterialKey;
  errors: string[];
  links: LinkUse[];
};

/** Copies inline content (or table content), resolving every link's href. */
function resolveLinks(value: unknown, context: AssemblyContext): unknown {
  if (Array.isArray(value))
    return value.map((item) => resolveLinks(item, context));
  if (!isRecord(value)) return value;
  const copy: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    copy[key] = resolveLinks(item, context);
  }
  if (value.type !== "link") return copy;

  const where = context.materialKey;
  const text = inlineText(value.content).trim();
  const href = typeof value.href === "string" ? value.href : "";
  if (!text) context.errors.push(`${where}: a link has no text`);
  if (href.startsWith(REF_PREFIX)) {
    const target = parseRef(href);
    const resolved = target
      ? resolveRef(target)
      : {
          error: `malformed link "${href}" (refs point at a whole material, without #anchors)`,
        };
    if ("error" in resolved) {
      context.errors.push(`${where}: link "${text}": ${resolved.error}`);
    } else {
      copy.href = resolved.href;
      context.links.push({
        from: context.materialKey,
        to: target as PolaMaterialKey,
        text,
      });
    }
  } else if (href.startsWith(MATERIAL_LINK_PREFIX)) {
    context.errors.push(
      `${where}: link "${text}" uses a hakgyo-material: href; write links between materials with ref()`,
    );
  } else if (!/^https?:\/\//.test(href)) {
    context.errors.push(`${where}: link "${text}" has no usable href`);
  }
  return copy;
}

/** Copies blocks with deterministic ids (pre-order, numbered from 1 across the material) and resolved links. */
function prepareBlocks(
  blocks: readonly BlockNoteBlock[],
  context: AssemblyContext,
  counter: { next: number },
): BlockNoteBlock[] {
  // A nested list (chat() without a spread) is reported by checkBlocks; flatten it so it is reported once.
  const flat = (blocks as readonly unknown[]).flat(
    Infinity,
  ) as BlockNoteBlock[];
  return flat.map((block) => {
    // Authored ids are replaced: every id derives from the block's place in the material.
    const { children, content, ...rest } = block;
    const prepared: BlockNoteBlock = {
      ...rest,
      id: blockId(context.materialKey, counter.next++),
    };
    if (content !== undefined)
      prepared.content = resolveLinks(content, context);
    if (children?.length) {
      prepared.children = prepareBlocks(children, context, counter);
    }
    return prepared;
  });
}

/** Grammar card color per course, so learners can tell the courses apart. */
const GRAMMAR_THEME = {
  "korea-indo": "amber",
  "indo-korea": "blue",
} as const;

/** More rule rows than this make the card too long on a phone. */
const GRAMMAR_CARD_MAX_RULES = 6;

/** Per-material rules of STYLE.md and the custom block checks. */
function checkBlocks(
  key: PolaMaterialKey,
  blocks: readonly BlockNoteBlock[],
  errors: string[],
  warnings: string[],
) {
  const course = POLA_MATERIALS[key].course;
  const maxColumns = TABLE_MAX_COLUMNS[course];
  let cultures = 0;
  const visit = (list: readonly BlockNoteBlock[]) => {
    for (const block of list) {
      if (Array.isArray(block) || !isRecord(block)) {
        errors.push(
          `${key}: a block is ${Array.isArray(block) ? "a list of blocks; spread it (...chat([...]))" : "not an object"}`,
        );
        continue;
      }
      const level = headingLevel(block);
      if (level !== null && level <= 2) {
        errors.push(
          `${key}: has a level-${level} heading "${inlineText(block.content)}"; use h3()`,
        );
      }
      const forbidden = FORBIDDEN_BLOCKS[block.type];
      if (forbidden) errors.push(`${key}: has ${forbidden}`);
      if (block.type === "culture") {
        cultures += 1;
        if (!CULTURE_MATERIALS.includes(key)) {
          errors.push(
            `${key}: has a culture() block; only ${CULTURE_MATERIALS.join(", ")} may use one`,
          );
        }
      }
      if (block.type === "table") {
        const columns = tableColumns(block);
        if (columns > maxColumns) {
          warnings.push(
            `${key}: a table has ${columns} columns (at most ${maxColumns} in ${course} to fit a phone)`,
          );
        }
      }
      const issues =
        block.type === "grammar"
          ? grammarCardIssues(block.props ?? {})
          : block.type === "conversation"
            ? conversationIssues(block.props ?? {})
            : block.type === "culture"
              ? cultureIssues(block.props ?? {})
              : [];
      for (const issue of issues) errors.push(`${key}: ${issue}`);
      if (block.children) visit(block.children);
    }
  };
  visit(blocks);
  // Every material opens with exactly one grammar card ("Tata bahasa"), in
  // the course's color, so all 142 materials read the same way.
  const first = blocks[0];
  if (!isRecord(first) || first.type !== "grammar") {
    errors.push(`${key}: must start with a grammar() card`);
  }
  const cards = blocks.filter(
    (block) => isRecord(block) && block.type === "grammar",
  );
  if (cards.length > 1) {
    errors.push(`${key}: has ${cards.length} grammar() cards (exactly one)`);
  }
  const card = cards[0];
  if (card && isRecord(card)) {
    const theme = card.props?.theme;
    if (theme !== GRAMMAR_THEME[course]) {
      errors.push(
        `${key}: grammar card theme is "${String(theme)}"; ${course} uses "${GRAMMAR_THEME[course]}"`,
      );
    }
    const rules = parseJsonArray(card.props?.ruleRows) ?? [];
    if (rules.length === 0 || rules.length > GRAMMAR_CARD_MAX_RULES) {
      errors.push(
        `${key}: grammar card has ${rules.length} rule rows (1 to ${GRAMMAR_CARD_MAX_RULES})`,
      );
    }
    const examples = parseJsonArray(card.props?.examples) ?? [];
    if (examples.length < 2 || examples.length > 4) {
      errors.push(
        `${key}: grammar card has ${examples.length} examples (2 to 4)`,
      );
    }
  }
  if (cultures > 1)
    errors.push(`${key}: has ${cultures} culture() blocks (at most one)`);
  const blockCount = (blocks as readonly unknown[]).flat(Infinity).length;
  if (blockCount > MATERIAL_MAX_BLOCKS) {
    warnings.push(
      `${key}: has ${blockCount} blocks; a material should stay short (about 15, warning above ${MATERIAL_MAX_BLOCKS})`,
    );
  }
  const marker = draftMarker(blocks);
  if (marker) {
    errors.push(
      `${key}: contains a draft marker: "${marker.trim().slice(0, 80)}"`,
    );
  }
}

/** One material's BlockNote document. */
export function assembleMaterial(
  body: MaterialBody,
  context: AssemblyContext,
): BlockNoteBlock[] {
  return prepareBlocks(body.blocks ?? [], context, { next: 1 });
}

// ---------------------------------------------------------------- manifest

/** Problems of the outline itself (keys, courses, id collisions). */
export function manifestErrors(): string[] {
  const errors: string[] = [];
  for (const key of Object.keys(POLA_COURSES)) {
    if (!isValidKey(key)) errors.push(`course key "${key}" is not kebab-case`);
  }
  const babKeys = new Set<string>();
  const materialKeys = new Set<string>();
  for (const bab of POLA_BABS as readonly {
    key: string;
    course: string;
    title: string;
    materials: readonly { key: string; title: string }[];
  }[]) {
    if (!isValidKey(bab.key))
      errors.push(`chapter key "${bab.key}" is not kebab-case`);
    if (babKeys.has(bab.key)) errors.push(`chapter ${bab.key} is listed twice`);
    babKeys.add(bab.key);
    if (!(bab.course in POLA_COURSES)) {
      errors.push(`chapter ${bab.key}: unknown course "${bab.course}"`);
    }
    if (!nonEmpty(bab.title)) errors.push(`chapter ${bab.key}: title is empty`);
    if (!bab.materials.length)
      errors.push(`chapter ${bab.key} has no materials`);
    for (const material of bab.materials) {
      if (!isValidKey(material.key)) {
        errors.push(`material key "${material.key}" is not kebab-case`);
      }
      // `pb-<key>-item` would collide with the vocabulary or quiz item of chapter `<key minus the suffix>`.
      if (/-(vocab|quiz)$/.test(material.key)) {
        errors.push(
          `material key "${material.key}" must not end with -vocab or -quiz`,
        );
      }
      if (materialKeys.has(material.key)) {
        errors.push(`material ${material.key} is listed twice`);
      }
      materialKeys.add(material.key);
      if (!nonEmpty(material.title))
        errors.push(`material ${material.key}: title is empty`);
    }
  }
  for (const key of materialKeys) {
    if (babKeys.has(key))
      errors.push(`"${key}" is both a chapter and a material key`);
  }
  return errors;
}

// ---------------------------------------------------------------- build

/** Problems of one chapter file's shape and its materials, vocabulary set and quiz; assembled rows when valid. */
function buildBab(
  bab: (typeof POLA_BABS)[number],
  content: BabContent,
  links: LinkUse[],
  blockCounts: Map<PolaMaterialKey, number>,
  errors: string[],
  warnings: string[],
) {
  const babKey = bab.key;
  const before = errors.length;
  const materialKeys = bab.materials.map((row) => row.key);
  if (content.key !== babKey) {
    errors.push(
      `${babKey}: content/${babKey}.ts declares key "${content.key}"; the key must match the file name`,
    );
  }
  const bodies = (
    isRecord(content.materials) ? content.materials : {}
  ) as Record<string, MaterialBody | undefined>;
  const extra = Object.keys(bodies).filter(
    (key) => !materialKeys.includes(key as PolaMaterialKey),
  );
  if (extra.length) {
    errors.push(
      `${babKey}: materials not in this chapter of manifest.ts: ${extra.join(", ")}`,
    );
  }

  const materials: DesiredMaterial[] = [];
  for (const manifest of bab.materials) {
    const key = manifest.key;
    const body = bodies[key];
    if (!body) {
      errors.push(`${babKey}: material ${key} has no body`);
      continue;
    }
    if (!nonEmpty(body.description))
      errors.push(`${key}: description is empty`);
    if (!Array.isArray(body.blocks) || !body.blocks.length) {
      errors.push(`${key}: has no blocks`);
      continue;
    }
    checkBlocks(key, body.blocks, errors, warnings);
    const document = assembleMaterial(body, {
      materialKey: key,
      errors,
      links,
    });
    for (const issue of findBlockNoteDocumentIssues(document)) {
      errors.push(
        `${key}: block ${issue.path.join(".")} (${blockAt(document, issue.path)}): ${issue.message}`,
      );
    }
    const ids = new Set<string>();
    const visitIds = (blocks: readonly BlockNoteBlock[]) => {
      for (const block of blocks) {
        if (block.id && ids.has(block.id))
          errors.push(`${key}: block id ${block.id} is used twice`);
        if (block.id) ids.add(block.id);
        if (block.children) visitIds(block.children);
      }
    };
    visitIds(document);
    blockCounts.set(key, ids.size);
    materials.push({
      id: materialId(key),
      key,
      title: materialTitle(manifest),
      description: body.description.trim(),
      content: document,
      editorSchemaVersion: 1,
    });
  }

  const vocabulary = isRecord(content.vocabulary)
    ? vocabularyIssues(content.vocabulary, materialKeys)
    : { errors: ["the vocabulary set is missing"], warnings: [] };
  errors.push(...vocabulary.errors.map((issue) => `${babKey}: ${issue}`));
  warnings.push(...vocabulary.warnings.map((issue) => `${babKey}: ${issue}`));
  const quiz = isRecord(content.quiz)
    ? quizIssues(content.quiz)
    : ["the quiz is missing"];
  errors.push(...quiz.map((issue) => `${babKey}: ${issue}`));

  if (errors.length !== before) return null;
  return {
    materials,
    vocabularySet: buildVocabularySet(babKey, content.vocabulary, materialKeys),
    assessment: buildQuiz(babKey, content.quiz),
  };
}

/** The course rows from the manifest: per chapter its materials, then its vocabulary set, then its quiz. */
export function buildCourses(): DesiredCourse[] {
  return (Object.keys(POLA_COURSES) as PolaCourseKey[]).map(
    (courseKey): DesiredCourse => {
      const id = courseId(courseKey);
      const modules = POLA_BABS.filter((bab) => bab.course === courseKey).map(
        (bab, position): DesiredModule => {
          const rowId = moduleId(bab.key);
          const item = (
            row: Pick<DesiredItem, "id" | "key" | "type"> &
              Partial<DesiredItem>,
          ): DesiredItem => ({
            moduleId: rowId,
            position: 0,
            materialId: null,
            vocabularySetId: null,
            assessmentId: null,
            isPublished: true,
            ...row,
          });
          return {
            id: rowId,
            key: bab.key,
            courseId: id,
            title: bab.title,
            description: null,
            position,
            items: [
              ...bab.materials.map((material) =>
                item({
                  id: materialItemId(material.key),
                  key: material.key,
                  type: "MATERIAL",
                  materialId: materialId(material.key),
                }),
              ),
              item({
                id: vocabularyItemId(bab.key),
                key: bab.key,
                type: "VOCABULARY_SET",
                vocabularySetId: vocabularySetId(bab.key),
              }),
              item({
                id: quizItemId(bab.key),
                key: bab.key,
                type: "ASSESSMENT",
                assessmentId: quizId(bab.key),
              }),
            ].map((row, itemPosition) => ({ ...row, position: itemPosition })),
          };
        },
      );
      return {
        id,
        key: courseKey,
        title: POLA_COURSES[courseKey].title,
        slug: POLA_COURSES[courseKey].slug,
        description: POLA_COURSES[courseKey].description,
        status: "PUBLISHED",
        progressionMode: "OPEN",
        modules,
      };
    },
  );
}

/**
 * Builds and checks both courses from the loaded chapters. `babs` holds the chapters that loaded; manifest
 * chapters without content are listed in `missing`.
 */
export function buildCurricula(
  babs: ReadonlyMap<string, BabContent>,
): CurriculumResult {
  const errors = manifestErrors();
  const warnings: string[] = [];
  const links: LinkUse[] = [];
  const materials: DesiredMaterial[] = [];
  const vocabularySets: DesiredVocabularySet[] = [];
  const assessments: DesiredAssessment[] = [];
  const blockCounts = new Map<PolaMaterialKey, number>();
  const missing: PolaBabKey[] = [];

  for (const bab of POLA_BABS) {
    const content = babs.get(bab.key);
    if (!content) {
      missing.push(bab.key);
      continue;
    }
    const built = buildBab(bab, content, links, blockCounts, errors, warnings);
    if (!built) continue;
    materials.push(...built.materials);
    vocabularySets.push(built.vocabularySet);
    assessments.push(built.assessment);
  }

  const courses = buildCourses();

  const incoming = new Map<string, number>();
  for (const link of links) {
    if (link.from === link.to) continue;
    incoming.set(link.to, (incoming.get(link.to) ?? 0) + 1);
  }
  const stats: MaterialStats[] = [];
  const unlinkedMaterials: PolaMaterialKey[] = [];
  for (const bab of POLA_BABS) {
    if (!babs.has(bab.key)) continue;
    for (const material of bab.materials) {
      const key = material.key;
      const linksIn = incoming.get(key) ?? 0;
      if (!linksIn) unlinkedMaterials.push(key);
      stats.push({
        key,
        bab: bab.key,
        course: bab.course,
        blocks: blockCounts.get(key) ?? 0,
        linksOut: links.filter((link) => link.from === key).length,
        linksIn,
      });
    }
  }

  errors.push(
    ...readinessErrors(courses, materials, vocabularySets, assessments),
  );

  return {
    courses,
    materials,
    vocabularySets,
    assessments,
    links,
    stats,
    unlinkedMaterials,
    missing,
    errors,
    warnings,
  };
}

/**
 * The workspace's course readiness rules (what keeps a visible item complete) applied to the desired rows. Only the
 * resources of chapters that passed their own checks are known here, so items of the others are skipped.
 */
export function readinessErrors(
  courses: DesiredCourse[],
  materials: DesiredMaterial[],
  vocabularySets: DesiredVocabularySet[],
  assessments: DesiredAssessment[],
): string[] {
  const materialRows = new Map<string, ReadinessMaterial>(
    materials.map((row) => [
      row.id,
      {
        id: row.id,
        title: row.title,
        requirements: [],
        embeds: collectMaterialReferenceIds(row.content),
      },
    ]),
  );
  const assessmentRows = new Map<string, ReadinessAssessment>(
    assessments.map((row) => [
      row.id,
      summarizeAssessmentReadiness(row, row.questions),
    ]),
  );
  const setRows = new Map(
    vocabularySets.map((row) => [row.id, { id: row.id, title: row.title }]),
  );
  const errors: string[] = [];
  for (const course of courses) {
    const items = course.modules
      .flatMap((row) => row.items)
      .filter((item) =>
        item.materialId
          ? materialRows.has(item.materialId)
          : item.vocabularySetId
            ? setRows.has(item.vocabularySetId)
            : assessmentRows.has(item.assessmentId ?? ""),
      );
    const readiness = computeCourseReadiness({
      organizationSlug: "hakgyo-system",
      courseId: course.id,
      courseStatus: course.status,
      modules: course.modules.map(({ id, title, position }) => ({
        id,
        title,
        position,
      })),
      items: items.map((item): ReadinessItem => ({
        id: item.id,
        moduleId: item.moduleId,
        position: item.position,
        type: item.type,
        isPublished: item.isPublished,
        materialId: item.materialId,
        assessmentId: item.assessmentId,
        vocabularySetId: item.vocabularySetId,
      })),
      materials: materialRows,
      assessments: assessmentRows,
      vocabularySets: setRows,
    });
    for (const item of readiness.items) {
      if (item.ready) continue;
      errors.push(
        `${item.courseItemId} is not ready: ${item.reasons.map((reason) => reason.message).join(" ")}`,
      );
    }
  }
  return errors;
}

/** The id of the top-level block an issue path points into, for readable messages. */
function blockAt(document: BlockNoteBlock[], path: (string | number)[]) {
  const index = path[0];
  return typeof index === "number" ? (document[index]?.id ?? "?") : "?";
}
