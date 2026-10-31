// Content -> the rows the two Pola Bahasa courses should have (pure, no database). Assembles each material's
// BlockNote document (intro, one level-2 heading per section, outro) with deterministic block ids, resolves
// `pola-ref:` links into `hakgyo-material:` links, and checks everything the import relies on, so the same code
// serves `pola:validate` (offline), the unit tests and `pola:import`.
import { formatMaterialLinkHref, MATERIAL_LINK_PREFIX } from "@hakgyo/shared";

import { findBlockNoteDocumentIssues } from "~/lib/blocknote/document-validation";
import { collectMaterialReferenceIds } from "~/lib/blocknote/resource-references";
import {
  computeCourseReadiness,
  summarizeAssessmentReadiness,
  type ReadinessAssessment,
  type ReadinessItem,
  type ReadinessMaterial,
} from "~/server/course/readiness";

import {
  inline,
  p,
  QUIZ_REFERENCE,
  REF_PREFIX,
  type BlockNoteBlock,
  type MaterialContent,
  type QuizContent,
} from "./blocks";
import {
  blockId,
  courseId,
  INTRO_PART,
  isReservedSectionKey,
  isValidKey,
  itemId,
  materialId,
  moduleId,
  OUTRO_PART,
  quizId,
  quizItemId,
  quizOptionId,
  quizQuestionId,
  sectionBlockId,
} from "./ids";
import {
  POLA_COURSES,
  POLA_MATERIALS,
  POLA_MODULES,
  type PolaCourseKey,
  type PolaMaterialKey,
} from "./manifest";

/** Limits of the grammar card (the editor and renderer drop rows past these). */
export const GRAMMAR_MAX_RULES = 12;
export const GRAMMAR_MAX_EXAMPLES = 12;

/** Quiz size and shape (see QuizContent in ./blocks.ts). */
export const QUIZ_MIN_QUESTIONS = 5;
export const QUIZ_MAX_QUESTIONS = 15;
export const QUIZ_MIN_OPTIONS = 3;
export const QUIZ_MAX_OPTIONS = 4;
export const QUIZ_DEFAULT_PASSING_SCORE = 70;
/** Limits of the conversation block built by chat(). */
export const CHAT_MAX_LINES = 16;
export const CHAT_MAX_QUESTIONS = 8;
/** Every material's intro must start with an opener() (lessonPage block); false makes a missing one a warning. */
export const OPENER_REQUIRED = true;

/** Words that mark unfinished writing; content containing them is not imported. */
const DRAFT_MARKER = /\b(TODO|TBD|FIXME|XXX|lorem ipsum)\b/i;

// ---------------------------------------------------------------- desired rows

export type DesiredMaterial = {
  id: string;
  title: string;
  description: string | null;
  content: BlockNoteBlock[];
  editorSchemaVersion: 1;
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
  type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE";
  prompt: BlockNoteBlock[];
  explanation: BlockNoteBlock[];
  points: 1;
  position: number;
  options: DesiredOption[];
};

/** A material's quiz. Assessments have no publish state; the published course item makes it visible. */
export type DesiredAssessment = {
  id: string;
  /** The material the quiz belongs to. */
  key: PolaMaterialKey;
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
  /** The material the item belongs to (its own item, or its quiz item). */
  key: PolaMaterialKey;
  moduleId: string;
  type: "MATERIAL" | "ASSESSMENT";
  position: number;
  materialId: string | null;
  assessmentId: string | null;
  isPublished: true;
};

export type DesiredModule = {
  id: string;
  key: string;
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
  progressionMode: "OPEN";
  /** Invite only for now: learners cannot join on their own, so no cohort exists until one is set up. */
  enrollmentMode: "INVITE_ONLY";
  price: 0;
  modules: DesiredModule[];
};

// ---------------------------------------------------------------- links and stats

export type LinkEnd = { material: string; section: string | null };
/** One `pola-ref:` link, from the part of a material it sits in to its target. */
export type LinkUse = { from: LinkEnd; to: LinkEnd; text: string };

export type MaterialStats = {
  key: PolaMaterialKey;
  course: PolaCourseKey;
  sections: number;
  blocks: number;
  linksOut: number;
  /** Links from other places (other materials or other sections) to this material or one of its sections. */
  linksIn: number;
};

export type CurriculumResult = {
  courses: DesiredCourse[];
  /** Assembled materials, in manifest order (only those that have content). */
  materials: DesiredMaterial[];
  /** Quizzes of the valid materials, in manifest order. */
  assessments: DesiredAssessment[];
  links: LinkUse[];
  stats: MaterialStats[];
  /** Sections no link points at, as `<material>#<section>`. */
  unlinkedSections: string[];
  /** Manifest materials without content (the import refuses partial courses). */
  missing: PolaMaterialKey[];
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

/** Problems of one lesson opener (opener()). */
export function openerIssues(props: Record<string, unknown>): string[] {
  const required = [
    "chapterNumber",
    "title",
    "subtitle",
    "grammarTitle",
    "vocabularyTitle",
    "cultureTitle",
    "objectiveOne",
    "objectiveTwo",
  ];
  return required
    .filter((field) => !nonEmpty(props[field]))
    .map((field) => `opener needs a ${field}`);
}

/** Problems of a material's quiz content (before ids are derived). */
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
    if (type !== "SINGLE_CHOICE" && type !== "MULTIPLE_CHOICE") {
      issues.push(`${where}: unknown type "${String(type)}"`);
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
      typeof option?.text === "string"
        ? option.text.normalize("NFC").trim().replace(/\s+/g, " ")
        : "",
    );
    if (new Set(texts).size !== texts.length) {
      issues.push(`${where}: two options have the same text`);
    }
    const correct = options.filter((option) => option?.correct === true).length;
    if (type === "SINGLE_CHOICE" && correct !== 1) {
      issues.push(
        `${where}: needs exactly one correct option (has ${correct})`,
      );
    }
    if (
      type === "MULTIPLE_CHOICE" &&
      (correct < 1 || correct === options.length)
    ) {
      issues.push(`${where}: needs at least one correct and one wrong option`);
    }
  });
  return issues;
}

/** The quiz rows of a material; only called once quizIssues() found nothing. */
export function buildQuiz(
  materialKey: PolaMaterialKey,
  quiz: QuizContent,
): DesiredAssessment {
  const id = quizId(materialKey);
  return {
    id,
    key: materialKey,
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
      const questionId = quizQuestionId(materialKey, question.key);
      return {
        id: questionId,
        assessmentId: id,
        type: question.type ?? "SINGLE_CHOICE",
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

/** Parses `pola-ref:<material>[#<section>]`; null when malformed. */
export function parseRef(href: string): LinkEnd | null {
  if (!href.startsWith(REF_PREFIX)) return null;
  const rest = href.slice(REF_PREFIX.length);
  const hash = rest.indexOf("#");
  const material = hash === -1 ? rest : rest.slice(0, hash);
  const section = hash === -1 ? null : rest.slice(hash + 1);
  if (!material || section === "") return null;
  return { material, section };
}

/** The `hakgyo-material:` href of a resolved ref, or an error message. */
export function resolveRef(
  target: LinkEnd,
): { href: string } | { error: string } {
  const material = (
    POLA_MATERIALS as Record<string, { sections: readonly string[] }>
  )[target.material];
  if (!material) {
    return { error: `unknown material "${target.material}"` };
  }
  if (target.section !== null && !material.sections.includes(target.section)) {
    return {
      error: `unknown section "${target.section}" of ${target.material}`,
    };
  }
  return {
    href: formatMaterialLinkHref({
      materialId: materialId(target.material),
      anchor:
        target.section === null
          ? null
          : sectionBlockId(target.material, target.section),
    }),
  };
}

// ---------------------------------------------------------------- assembly

type AssemblyContext = {
  materialKey: PolaMaterialKey;
  errors: string[];
  links: LinkUse[];
};

/** Copies inline content (or table content), resolving every link's href. */
function resolveLinks(
  value: unknown,
  context: AssemblyContext,
  part: string,
): unknown {
  if (Array.isArray(value))
    return value.map((item) => resolveLinks(item, context, part));
  if (!isRecord(value)) return value;
  const copy: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    copy[key] = resolveLinks(item, context, part);
  }
  if (value.type !== "link") return copy;

  const where = `${context.materialKey}#${part}`;
  const text = inlineText(value.content).trim();
  const href = typeof value.href === "string" ? value.href : "";
  if (!text) context.errors.push(`${where}: a link has no text`);
  if (href.startsWith(REF_PREFIX)) {
    const target = parseRef(href);
    const resolved = target
      ? resolveRef(target)
      : { error: `malformed link "${href}"` };
    if ("error" in resolved) {
      context.errors.push(`${where}: link "${text}": ${resolved.error}`);
    } else {
      copy.href = resolved.href;
      context.links.push({
        from: {
          material: context.materialKey,
          section: part === INTRO_PART || part === OUTRO_PART ? null : part,
        },
        to: target!,
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

/** Copies blocks with deterministic ids (pre-order, numbered within the part) and resolved links. */
function prepareBlocks(
  blocks: readonly BlockNoteBlock[],
  context: AssemblyContext,
  part: string,
  counter: { next: number },
): BlockNoteBlock[] {
  // A nested list (chat() without a spread) is reported by checkPartBlocks; flatten it so it is reported once.
  const flat = (blocks as readonly unknown[]).flat(
    Infinity,
  ) as BlockNoteBlock[];
  return flat.map((block) => {
    // Authored ids are replaced: every id derives from the block's place in the material.
    const { children, content, ...rest } = block;
    const prepared: BlockNoteBlock = {
      ...rest,
      id: blockId(context.materialKey, part, counter.next++),
    };
    // quizRef() embeds this material's own quiz.
    if (
      block.type === "assessmentReference" &&
      block.props?.assessmentId === QUIZ_REFERENCE
    ) {
      prepared.props = {
        ...block.props,
        assessmentId: quizId(context.materialKey),
      };
    }
    if (content !== undefined)
      prepared.content = resolveLinks(content, context, part);
    if (children?.length) {
      prepared.children = prepareBlocks(children, context, part, counter);
    }
    return prepared;
  });
}

function checkPartBlocks(
  blocks: readonly BlockNoteBlock[],
  where: string,
  errors: string[],
) {
  const visit = (list: readonly BlockNoteBlock[]) => {
    for (const block of list) {
      if (Array.isArray(block) || !isRecord(block)) {
        errors.push(
          `${where}: a block is ${Array.isArray(block) ? "a list of blocks; spread it (...chat([...]))" : "not an object"}`,
        );
        continue;
      }
      const level = headingLevel(block);
      if (level !== null && level <= 2) {
        errors.push(
          `${where}: has a level-${level} heading "${inlineText(block.content)}"; sections get their level-2 heading automatically, use h3() inside them`,
        );
      }
      const issues =
        block.type === "grammar"
          ? grammarCardIssues(block.props ?? {})
          : block.type === "conversation"
            ? conversationIssues(block.props ?? {})
            : block.type === "culture"
              ? cultureIssues(block.props ?? {})
              : block.type === "lessonPage"
                ? openerIssues(block.props ?? {})
                : [];
      for (const issue of issues) errors.push(`${where}: ${issue}`);
      if (
        block.type === "assessmentReference" &&
        block.props?.assessmentId !== QUIZ_REFERENCE
      ) {
        errors.push(
          `${where}: embeds an assessment other than the material's own quiz; use quizRef()`,
        );
      }
      if (block.type === "vocabularyReference") {
        errors.push(
          `${where}: embeds a vocabulary set, which the Pola Bahasa importer does not place`,
        );
      }
      if (block.children) visit(block.children);
    }
  };
  visit(blocks);
  const strings: string[] = [];
  collectStrings(blocks, strings);
  const marker = strings.find((text) => DRAFT_MARKER.test(text));
  if (marker) {
    errors.push(
      `${where}: contains a draft marker: "${marker.trim().slice(0, 80)}"`,
    );
  }
}

/** One material's BlockNote document: intro, a level-2 heading plus blocks per section, outro. */
export function assembleMaterial(
  content: MaterialContent,
  context: AssemblyContext,
): BlockNoteBlock[] {
  const key = context.materialKey;
  const document: BlockNoteBlock[] = [];
  document.push(
    ...prepareBlocks(content.intro ?? [], context, INTRO_PART, { next: 1 }),
  );
  for (const section of content.sections) {
    document.push({
      id: sectionBlockId(key, section.key),
      type: "heading",
      props: { level: 2 },
      content: inline([(section.title ?? "").trim()]),
    });
    document.push(
      ...prepareBlocks(section.blocks ?? [], context, section.key, {
        next: 1,
      }),
    );
  }
  document.push(
    ...prepareBlocks(content.outro ?? [], context, OUTRO_PART, { next: 1 }),
  );
  return document;
}

// ---------------------------------------------------------------- manifest

/** Problems of the outline itself (keys, module and course references). */
export function manifestErrors(): string[] {
  const errors: string[] = [];
  for (const [key, courseModule] of Object.entries(POLA_MODULES)) {
    if (!isValidKey(key)) errors.push(`module key "${key}" is not kebab-case`);
    if (!(courseModule.course in POLA_COURSES)) {
      errors.push(`module ${key}: unknown course "${courseModule.course}"`);
    }
  }
  for (const key of Object.keys(POLA_COURSES)) {
    if (!isValidKey(key)) errors.push(`course key "${key}" is not kebab-case`);
  }
  for (const [key, material] of Object.entries(POLA_MATERIALS)) {
    if (!isValidKey(key))
      errors.push(`material key "${key}" is not kebab-case`);
    // `pb-<key>-quiz-item` would collide with the quiz item of material `<key minus -quiz>`.
    if (key.endsWith("-quiz"))
      errors.push(`material key "${key}" must not end with -quiz`);
    const courseModule = (
      POLA_MODULES as Record<string, { course: string } | undefined>
    )[material.module];
    if (!courseModule) {
      errors.push(`material ${key}: unknown module "${material.module}"`);
    } else if (courseModule.course !== material.course) {
      errors.push(
        `material ${key}: module ${material.module} belongs to ${courseModule.course}, not ${material.course}`,
      );
    }
    const seen = new Set<string>();
    for (const section of material.sections as readonly string[]) {
      if (!isValidKey(section))
        errors.push(`${key}#${section}: section key is not kebab-case`);
      if (isReservedSectionKey(section))
        errors.push(`${key}#${section}: section key is reserved`);
      if (seen.has(section)) errors.push(`${key}#${section}: listed twice`);
      seen.add(section);
    }
    if (!material.sections.length) errors.push(`${key}: has no sections`);
  }
  for (const key of Object.keys(POLA_MODULES)) {
    if (!Object.values(POLA_MATERIALS).some((row) => row.module === key)) {
      errors.push(`module ${key} has no materials`);
    }
  }
  return errors;
}

// ---------------------------------------------------------------- build

function sectionOrderErrors(
  key: string,
  expected: readonly string[],
  actual: readonly string[],
): string[] {
  const errors: string[] = [];
  const missing = expected.filter((section) => !actual.includes(section));
  const extra = actual.filter((section) => !expected.includes(section));
  const duplicated = actual.filter(
    (section, index) => actual.indexOf(section) !== index,
  );
  if (missing.length)
    errors.push(`${key}: missing sections ${missing.join(", ")}`);
  if (extra.length)
    errors.push(`${key}: sections not in manifest.ts: ${extra.join(", ")}`);
  if (duplicated.length)
    errors.push(`${key}: sections listed twice: ${duplicated.join(", ")}`);
  if (
    !missing.length &&
    !extra.length &&
    !duplicated.length &&
    expected.join() !== actual.join()
  ) {
    errors.push(
      `${key}: sections are out of order; expected ${expected.join(", ")}`,
    );
  }
  return errors;
}

/**
 * Builds and checks both courses from the loaded content. `contents` holds the materials that loaded; manifest
 * materials without content are listed in `missing`.
 */
export function buildCurricula(
  contents: ReadonlyMap<string, MaterialContent>,
): CurriculumResult {
  const errors = manifestErrors();
  const warnings: string[] = [];
  const links: LinkUse[] = [];
  const materials: DesiredMaterial[] = [];
  const assessments: DesiredAssessment[] = [];
  const blockCounts = new Map<string, number>();
  const missing: PolaMaterialKey[] = [];

  for (const [key, manifest] of Object.entries(POLA_MATERIALS) as [
    PolaMaterialKey,
    (typeof POLA_MATERIALS)[PolaMaterialKey],
  ][]) {
    const content = contents.get(key);
    if (!content) {
      missing.push(key);
      continue;
    }
    const before = errors.length;
    if (content.key !== key) {
      errors.push(
        `${key}: content/${key}.ts declares key "${content.key}"; the key must match the file name`,
      );
    }
    if (!nonEmpty(content.title)) errors.push(`${key}: title is empty`);
    if (!nonEmpty(content.description))
      errors.push(`${key}: description is empty`);
    if (!Array.isArray(content.intro) || !content.intro.length) {
      warnings.push(`${key}: has no intro`);
    }
    const first = Array.isArray(content.intro) ? content.intro[0] : undefined;
    if (!first || Array.isArray(first) || first.type !== "lessonPage") {
      (OPENER_REQUIRED ? errors : warnings).push(
        `${key}: the intro does not start with opener()`,
      );
    }
    const expected = manifest.sections as readonly string[];
    const actual = content.sections.map((section) => String(section.key));
    errors.push(...sectionOrderErrors(key, expected, actual));
    const titles = new Set<string>();
    for (const section of content.sections) {
      const where = `${key}#${section.key}`;
      if (!nonEmpty(section.title)) errors.push(`${where}: title is empty`);
      else if (titles.has(section.title.trim())) {
        warnings.push(`${where}: another section has the same title`);
      }
      titles.add(section.title.trim());
      if (!Array.isArray(section.blocks) || !section.blocks.length) {
        errors.push(`${where}: has no blocks`);
      }
      checkPartBlocks(section.blocks ?? [], where, errors);
    }
    checkPartBlocks(content.intro ?? [], `${key}#${INTRO_PART}`, errors);
    checkPartBlocks(content.outro ?? [], `${key}#${OUTRO_PART}`, errors);

    const document = assembleMaterial(content, {
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
    // checkPartBlocks rejects every embed but quizRef(); a quiz and its quizRef() come together.
    const quizRefs = countQuizReferences(document, quizId(key));
    if (content.quiz && quizRefs !== 1) {
      errors.push(
        `${key}: has a quiz, so it needs exactly one quizRef() (has ${quizRefs})`,
      );
    }
    if (!content.quiz && quizRefs) {
      errors.push(`${key}: has a quizRef() but no quiz`);
    }
    if (content.quiz) {
      for (const issue of quizIssues(content.quiz)) {
        errors.push(`${key}: ${issue}`);
      }
      const strings: string[] = [];
      collectStrings(content.quiz, strings);
      const marker = strings.find((text) => DRAFT_MARKER.test(text));
      if (marker) {
        errors.push(
          `${key}: the quiz contains a draft marker: "${marker.trim().slice(0, 80)}"`,
        );
      }
    }
    if (errors.length === before) {
      materials.push({
        id: materialId(key),
        title: content.title.trim(),
        description: content.description.trim(),
        content: document,
        editorSchemaVersion: 1,
      });
      if (content.quiz) assessments.push(buildQuiz(key, content.quiz));
    }
  }

  const courses = (Object.keys(POLA_COURSES) as PolaCourseKey[]).map(
    (courseKey): DesiredCourse => {
      const id = courseId(courseKey);
      const modules = Object.entries(POLA_MODULES)
        .filter(([, row]) => row.course === courseKey)
        .map(([moduleKey, row], position): DesiredModule => {
          const rowId = moduleId(moduleKey);
          return {
            id: rowId,
            key: moduleKey,
            courseId: id,
            title: row.title,
            description: null,
            position,
            // Each material, then its quiz: an embedded assessment only resolves to an item of the same module.
            items: (Object.keys(POLA_MATERIALS) as PolaMaterialKey[])
              .filter((key) => POLA_MATERIALS[key].module === moduleKey)
              .flatMap((key): DesiredItem[] => [
                {
                  id: itemId(key),
                  key,
                  moduleId: rowId,
                  type: "MATERIAL",
                  position: 0,
                  materialId: materialId(key),
                  assessmentId: null,
                  isPublished: true,
                },
                ...(contents.get(key)?.quiz
                  ? [
                      {
                        id: quizItemId(key),
                        key,
                        moduleId: rowId,
                        type: "ASSESSMENT" as const,
                        position: 0,
                        materialId: null,
                        assessmentId: quizId(key),
                        isPublished: true as const,
                      },
                    ]
                  : []),
              ])
              .map((item, itemPosition) => ({
                ...item,
                position: itemPosition,
              })),
          };
        });
      return {
        id,
        key: courseKey,
        title: POLA_COURSES[courseKey].title,
        slug: `pola-${courseKey}`,
        description: POLA_COURSES[courseKey].description,
        status: "PUBLISHED",
        progressionMode: "OPEN",
        enrollmentMode: "INVITE_ONLY",
        price: 0,
        modules,
      };
    },
  );

  // Incoming links: from anywhere but the target itself (a section linking to itself does not count).
  const incoming = new Map<string, number>();
  for (const link of links) {
    const target = link.to.section
      ? `${link.to.material}#${link.to.section}`
      : link.to.material;
    const source = link.from.section
      ? `${link.from.material}#${link.from.section}`
      : link.from.material;
    if (target === source) continue;
    incoming.set(target, (incoming.get(target) ?? 0) + 1);
  }
  const stats: MaterialStats[] = [];
  const unlinkedSections: string[] = [];
  for (const [key, manifest] of Object.entries(POLA_MATERIALS) as [
    PolaMaterialKey,
    (typeof POLA_MATERIALS)[PolaMaterialKey],
  ][]) {
    if (!contents.has(key)) continue;
    let linksIn = incoming.get(key) ?? 0;
    for (const section of manifest.sections as readonly string[]) {
      const count = incoming.get(`${key}#${section}`) ?? 0;
      linksIn += count;
      if (!count) unlinkedSections.push(`${key}#${section}`);
    }
    stats.push({
      key,
      course: manifest.course,
      sections: manifest.sections.length,
      blocks: blockCounts.get(key) ?? 0,
      linksOut: links.filter((link) => link.from.material === key).length,
      linksIn,
    });
  }

  errors.push(...readinessErrors(courses, materials, assessments));

  return {
    courses,
    materials,
    assessments,
    links,
    stats,
    unlinkedSections,
    missing,
    errors,
    warnings,
  };
}

function countQuizReferences(blocks: readonly BlockNoteBlock[], id: string) {
  let count = 0;
  const visit = (list: readonly BlockNoteBlock[]) => {
    for (const block of list) {
      if (
        block.type === "assessmentReference" &&
        block.props?.assessmentId === id
      )
        count += 1;
      if (block.children) visit(block.children);
    }
  };
  visit(blocks);
  return count;
}

/**
 * The workspace's course readiness rules (what keeps a visible item complete) applied to the desired rows: every
 * embedded quiz is placed as a published item of the material's module and has a complete answer key. Only the
 * materials and quizzes that passed their own checks are known here, so the others are skipped.
 */
export function readinessErrors(
  courses: DesiredCourse[],
  materials: DesiredMaterial[],
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
  const errors: string[] = [];
  for (const course of courses) {
    const items = course.modules
      .flatMap((row) => row.items)
      .filter((item) =>
        item.materialId
          ? materialRows.has(item.materialId)
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
        vocabularySetId: null,
      })),
      materials: materialRows,
      assessments: assessmentRows,
      vocabularySets: new Map(),
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
