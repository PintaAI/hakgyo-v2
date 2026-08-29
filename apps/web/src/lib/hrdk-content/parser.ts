import type {
  HrdkIssue,
  HrdkLesson,
  HrdkManifest,
  HrdkReport,
  HrdkSection,
} from "./schema";

export type ExtractedPdfPage = {
  pageNumber: number;
  lines: string[];
};

type SectionKind = HrdkSection["kind"];

const sectionPatterns: Array<{
  kind: SectionKind;
  pattern: RegExp;
  fallbackTitle: string;
}> = [
  {
    kind: "objectives",
    pattern: /^(?:학습\s*목표|tujuan\s+pembelajaran|learning\s+objectives?)/iu,
    fallbackTitle: "Tujuan pembelajaran",
  },
  {
    kind: "vocabulary",
    pattern: /^(?:어휘|kosakata|vocabulary)(?:\s*\d+)?(?:\s|$)/iu,
    fallbackTitle: "Kosakata",
  },
  {
    kind: "grammar",
    pattern: /^(?:문법|tata\s+bahasa|grammar)(?:\s*\d+)?(?:\s|$)/iu,
    fallbackTitle: "Grammar",
  },
  {
    kind: "dialogue",
    pattern: /^(?:대화|percakapan|dialogue)(?:\s*\d+)?(?:\s|$)/iu,
    fallbackTitle: "Percakapan",
  },
  {
    kind: "pronunciation",
    pattern: /^(?:발음|pelafalan|pronunciation)(?:\s|$)/iu,
    fallbackTitle: "Pelafalan",
  },
  {
    kind: "culture",
    pattern: /^(?:문화|budaya|culture)(?:\s|$)/iu,
    fallbackTitle: "Budaya",
  },
  {
    kind: "reading",
    pattern: /^(?:읽기|membaca|reading)(?:\s|$)/iu,
    fallbackTitle: "Membaca",
  },
  {
    kind: "listening",
    pattern: /^(?:듣기|menyimak|listening)(?:\s|$)/iu,
    fallbackTitle: "Menyimak",
  },
  {
    kind: "exercise",
    pattern: /^(?:연습(?:문제)?|latihan|exercise)(?:\s|$)/iu,
    fallbackTitle: "Latihan",
  },
];

const lessonHeadingPattern = /^(?:제\s*)?(\d{1,3})\s*과\s+(.{2,100})$/u;
const chapterHeadingPattern =
  /^(?:C\s*H\s*A\s*P\s*T\s*E\s*R|LESSON|단원)\s*(\d{1,3})(?:\s+(.{2,100}))?$/iu;
const chapterMarkerPattern =
  /^(?:C\s*H\s*A\s*P\s*T\s*E\s*R|CHAPTER)$/iu;
const spacedChapterNumberPattern = /^((?:\d\s+)*\d{1,3})(?:\s+(.+))?$/u;
const hangulPattern = /\p{Script=Hangul}/u;
const latinPattern = /[A-Za-zÀ-ÿ]/u;

function cleanLine(line: string) {
  return line
    .normalize("NFC")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/ {3,}/g, "\t")
    .replace(/[ \t]+$/g, "")
    .trim();
}

function detectSection(line: string) {
  if (line.length > 100) return null;
  const match = sectionPatterns.find(({ pattern }) => pattern.test(line));
  return match
    ? {
        kind: match.kind,
        title: line || match.fallbackTitle,
      }
    : null;
}

function lessonCandidate(page: ExtractedPdfPage) {
  const lines = page.lines.slice(0, 20).map(cleanLine).filter(Boolean);
  const sectionCount = lines.filter((line) => detectSection(line)).length;
  const hasObjectives = lines.some(
    (line) => detectSection(line)?.kind === "objectives",
  );
  if (!hasObjectives && sectionCount < 2) return null;

  for (const [lineIndex, line] of lines.entries()) {
    if (chapterMarkerPattern.test(line)) {
      const title = lines[lineIndex + 1];
      const numberLine = lines[lineIndex + 2];
      const numberMatch = spacedChapterNumberPattern.exec(numberLine ?? "");
      const chapterNumber = Number(numberMatch?.[1]?.replace(/\s/g, ""));
      if (
        title &&
        Number.isInteger(chapterNumber) &&
        chapterNumber > 0 &&
        !detectSection(title)
      ) {
        return { number: chapterNumber, title };
      }
    }

    const match = lessonHeadingPattern.exec(line);
    const number = Number(match?.[1]);
    const title = match?.[2]?.trim();
    if (Number.isInteger(number) && number > 0 && title) {
      return { number, title };
    }

    const chapterMatch = chapterHeadingPattern.exec(line);
    const chapterNumber = Number(chapterMatch?.[1]);
    const nextLine = lines[lineIndex + 1];
    const chapterTitle = chapterMatch?.[2]?.trim() ?? nextLine;
    if (
      Number.isInteger(chapterNumber) &&
      chapterNumber > 0 &&
      chapterTitle &&
      !detectSection(chapterTitle)
    ) {
      return { number: chapterNumber, title: chapterTitle };
    }
  }
  return null;
}

function cleanVocabularyCell(value: string) {
  return value
    .replace(/^[➊➋➌➍➎➏➐➑➒➓①-⑳\d.)\s]+/u, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isVocabularyPair(term: string, definition: string) {
  if (!term || !definition) return false;
  if (!hangulPattern.test(term) || latinPattern.test(term)) return false;
  if (!latinPattern.test(definition) || hangulPattern.test(definition)) {
    return false;
  }
  if (term.length > 35 || definition.length > 120) return false;
  if (/[.!?。]$/u.test(term)) return false;
  if (/^[•●▪◦·]/u.test(term) || /[‘’"\[\]{}]/u.test(term)) {
    return false;
  }
  if (
    /^(?:은\/는|이\/가|을\/를|와\/과|으로\/로|에|에서|도|의)$/u.test(term)
  ) {
    return false;
  }
  if (
    /(?:그림을 보고|알맞은|완성하세요|한국어 표준교재|학습 목표|듣기지문|보기와 같이)/u.test(
      term,
    )
  ) {
    return false;
  }
  if (
    /^(?:GRAMMAR|VOCABULARY|LEARNING|SELF|DAILY|Look\b|Complete\b|When\b|in the example\b|as shown\b|TODAY\b)/i.test(
      definition,
    )
  ) {
    return false;
  }
  if (
    /(?:\b(?:a|an|the|to|of|for|with|from|one['’]s)|\/)$/i.test(
      definition,
    ) ||
    /^(?:to provide\/receive|to receive free medical)$/i.test(definition) ||
    (definition.includes("(") && !definition.includes(")"))
  ) {
    return false;
  }
  return true;
}

function splitInlineVocabularyCell(cell: string) {
  const cleaned = cleanVocabularyCell(cell);
  const pair =
    /^(\p{Script=Hangul}[\p{Script=Hangul}\s·/()~+,-]*?)\s+([A-Za-zÀ-ÿ].+)$/u.exec(
      cleaned,
    );
  const term = cleanVocabularyCell(pair?.[1] ?? "");
  const definition = cleanVocabularyCell(pair?.[2] ?? "");
  return isVocabularyPair(term, definition) ? { term, definition } : null;
}

function extractVocabulary(sections: HrdkSection[]) {
  const entries: HrdkLesson["vocabulary"] = [];
  const seen = new Set<string>();

  const addEntry = (
    pair: { term: string; definition: string },
    sourcePage: number,
  ) => {
    const key = pair.term.toLocaleLowerCase("ko-KR");
    if (seen.has(key) || !isVocabularyPair(pair.term, pair.definition)) return;
    seen.add(key);
    entries.push({ ...pair, examples: [], sourcePage });
  };

  for (const section of sections.filter(
    ({ kind, title }) => kind === "vocabulary" && /^어휘(?:\s|$)/u.test(title),
  )) {
    for (let lineIndex = 0; lineIndex < section.lines.length; lineIndex += 1) {
      const cells = section.lines[lineIndex]!
        .split("\t")
        .map(cleanVocabularyCell)
        .filter(Boolean);
      const inlinePairs = cells
        .map(splitInlineVocabularyCell)
        .filter((pair) => pair !== null);
      if (inlinePairs.length) {
        inlinePairs.forEach((pair) => addEntry(pair, section.pageStart));
        continue;
      }

      const nextCells = (section.lines[lineIndex + 1] ?? "")
        .split("\t")
        .map(cleanVocabularyCell)
        .filter(Boolean);
      const isTermRow =
        cells.length > 0 &&
        cells.every(
          (cell) => hangulPattern.test(cell) && !latinPattern.test(cell),
        );
      const isDefinitionRow =
        nextCells.length > 0 &&
        nextCells.every(
          (cell) => latinPattern.test(cell) && !hangulPattern.test(cell),
        );
      if (
        isTermRow &&
        isDefinitionRow &&
        cells.length >= 2 &&
        cells.length === nextCells.length
      ) {
        const pairCount = cells.length;
        for (let pairIndex = 0; pairIndex < pairCount; pairIndex += 1) {
          addEntry(
            {
              term: cells[pairIndex] ?? "",
              definition: nextCells[pairIndex] ?? "",
            },
            section.pageStart,
          );
        }
        lineIndex += 1;
      }
    }
  }
  return entries;
}

function buildVocabularyAssessment(vocabulary: HrdkLesson["vocabulary"]) {
  const usable = vocabulary.filter(
    (entry, index, entries) =>
      entries.findIndex(({ definition }) => definition === entry.definition) ===
      index,
  );
  if (usable.length < 4) return [];

  return usable.slice(0, 10).map((entry, entryIndex) => {
    const distractors: typeof usable = [];
    for (let offset = 1; distractors.length < 3; offset += 1) {
      const candidate = usable[(entryIndex + offset) % usable.length];
      if (candidate && candidate.definition !== entry.definition) {
        distractors.push(candidate);
      }
    }
    const correctPosition = entryIndex % 4;
    const incorrect = distractors.map(({ definition }) => definition);
    const options = Array.from({ length: 4 }, (_, optionIndex) => {
      const content =
        optionIndex === correctPosition
          ? entry.definition
          : (incorrect[
              optionIndex < correctPosition ? optionIndex : optionIndex - 1
            ] ?? "-");
      return { content, isCorrect: optionIndex === correctPosition };
    });
    return {
      type: "SINGLE_CHOICE" as const,
      prompt: `Apa arti kosakata “${entry.term}”?`,
      explanation: `${entry.term}: ${entry.definition}`,
      points: 1,
      sourcePage: entry.sourcePage,
      options,
    };
  });
}

function buildSections(pages: ExtractedPdfPage[]) {
  const sections: HrdkSection[] = [];
  let current: HrdkSection | null = null;

  for (const page of pages) {
    for (const originalLine of page.lines) {
      const line = cleanLine(originalLine);
      if (!line) continue;
      const marker = detectSection(line);
      if (marker) {
        current = {
          ...marker,
          pageStart: page.pageNumber,
          pageEnd: page.pageNumber,
          lines: [],
        };
        sections.push(current);
        continue;
      }
      if (!current) {
        current = {
          kind: "other",
          title: "Pengantar",
          pageStart: page.pageNumber,
          pageEnd: page.pageNumber,
          lines: [],
        };
        sections.push(current);
      }
      current.pageEnd = page.pageNumber;
      current.lines.push(line);
    }
  }
  return sections.filter(({ lines }) => lines.length > 0);
}

function makeLesson(
  pages: ExtractedPdfPage[],
  number: number,
  title: string,
): HrdkLesson {
  const sections = buildSections(pages);
  const vocabulary = extractVocabulary(sections);
  return {
    number,
    title,
    pageStart: pages[0]?.pageNumber ?? 1,
    pageEnd: pages.at(-1)?.pageNumber ?? 1,
    sections,
    vocabulary,
    assessment: buildVocabularyAssessment(vocabulary),
  };
}

export function parseHrdkPages(
  pages: ExtractedPdfPage[],
  options: { pagesPerLesson?: number } = {},
) {
  const issues: HrdkIssue[] = [];
  const starts = pages.flatMap((page, index) => {
    const candidate = lessonCandidate(page);
    return candidate ? [{ ...candidate, index }] : [];
  });

  const lessons: HrdkLesson[] = [];
  if (starts.length) {
    starts.forEach((start, startIndex) => {
      const endIndex = starts[startIndex + 1]?.index ?? pages.length;
      lessons.push(
        makeLesson(
          pages.slice(start.index, endIndex),
          start.number,
          start.title,
        ),
      );
    });
  } else {
    const pagesPerLesson = options.pagesPerLesson ?? 10;
    issues.push({
      severity: "warning",
      code: "LESSON_BOUNDARY_FALLBACK",
      message: `Judul bab tidak terdeteksi; halaman dikelompokkan setiap ${pagesPerLesson} halaman.`,
    });
    for (let index = 0; index < pages.length; index += pagesPerLesson) {
      const lessonPages = pages.slice(index, index + pagesPerLesson);
      const number = lessons.length + 1;
      lessons.push(makeLesson(lessonPages, number, `Bab ${number}`));
    }
  }

  for (const page of pages) {
    if (page.lines.join("").trim().length < 20) {
      issues.push({
        severity: "warning",
        code: "PAGE_NEEDS_OCR",
        message:
          "Halaman tidak memiliki cukup text layer dan mungkin membutuhkan OCR.",
        page: page.pageNumber,
      });
    }
  }
  for (const lesson of lessons) {
    if (!lesson.vocabulary.length) {
      issues.push({
        severity: "warning",
        code: "VOCABULARY_NOT_FOUND",
        message:
          "Tidak ada pasangan kosakata-terjemahan yang berhasil dikenali.",
        lesson: lesson.number,
      });
    }
    if (!lesson.assessment.length) {
      issues.push({
        severity: "warning",
        code: "ASSESSMENT_NOT_GENERATED",
        message: "Assessment membutuhkan minimal empat definisi kosakata unik.",
        lesson: lesson.number,
      });
    }
  }
  return { lessons, issues };
}

export function validateHrdkManifest(
  manifest: HrdkManifest,
  extractionIssues: HrdkIssue[] = [],
): HrdkReport {
  const issues = [...extractionIssues];
  const duplicateNumbers = manifest.lessons.filter(
    (lesson, index, lessons) =>
      lessons.findIndex(({ number }) => number === lesson.number) !== index,
  );
  for (const lesson of duplicateNumbers) {
    issues.push({
      severity: "error",
      code: "DUPLICATE_LESSON_NUMBER",
      message: `Nomor bab ${lesson.number} muncul lebih dari sekali.`,
      lesson: lesson.number,
    });
  }

  return {
    valid: !issues.some(({ severity }) => severity === "error"),
    generatedAt: new Date().toISOString(),
    issues,
    summary: {
      lessons: manifest.lessons.length,
      sections: manifest.lessons.reduce(
        (total, lesson) => total + lesson.sections.length,
        0,
      ),
      vocabularyEntries: manifest.lessons.reduce(
        (total, lesson) => total + lesson.vocabulary.length,
        0,
      ),
      assessmentQuestions: manifest.lessons.reduce(
        (total, lesson) => total + lesson.assessment.length,
        0,
      ),
    },
  };
}
