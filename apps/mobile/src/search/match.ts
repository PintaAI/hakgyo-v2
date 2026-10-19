import type { SearchDocument, SearchKind } from "./documents";
import {
  boundedEditDistance,
  choseong,
  isChoseongQuery,
  normalizeSearchText,
  tokenMatcher,
  type TokenMatcher,
} from "./text";

type PreparedField = {
  weight: number;
  normalized: string;
  words: string[];
  initials: string;
};

/** A document with its text normalized once, ready to be matched. */
export type PreparedDocument = {
  document: SearchDocument;
  fields: PreparedField[];
  /** Normalized body segments, parallel to `document.body`. */
  body: string[];
};

export function prepareDocument(document: SearchDocument): PreparedDocument {
  return {
    document,
    fields: document.fields.map((field) => {
      const normalized = normalizeSearchText(field.text);
      return {
        weight: field.weight,
        normalized,
        words: normalized.split(" ").filter(Boolean),
        initials: choseong(normalized),
      };
    }),
    body: document.body.map(normalizeSearchText),
  };
}

export type SearchSnippet = {
  text: string;
  /** Range of the matched text within `text`, when it could be located. */
  highlight: { start: number; end: number } | null;
};

export type SearchResult = {
  document: SearchDocument;
  score: number;
  /** The body text that matched, when no title field did. */
  snippet: SearchSnippet | null;
};

const KIND_BOOST: Record<SearchKind, number> = {
  course: 8,
  module: 5,
  material: 4,
  vocabularySet: 4,
  assessment: 4,
  event: 4,
  cohort: 4,
  game: 3,
  vocabularyEntry: 0,
};

const MIN_FUZZY_LENGTH = 4;
const latinToken = /^[a-z0-9]+$/;

function isWordStart(text: string, index: number) {
  return index === 0 || text[index - 1] === " ";
}

function fuzzyLimit(token: string) {
  return token.length >= 7 ? 2 : 1;
}

function scoreField(
  field: PreparedField,
  matcher: TokenMatcher,
  initialsQuery: boolean,
): number {
  const { token } = matcher;
  if (initialsQuery) {
    const index = field.initials.indexOf(token);
    if (index < 0) return 0;
    return (
      (index === 0 ? 70 : isWordStart(field.initials, index) ? 60 : 45) *
      field.weight
    );
  }

  const index = matcher.find(field.normalized);
  if (index >= 0) {
    if (field.normalized === token) return 100 * field.weight;
    if (index === 0) return 85 * field.weight;
    if (isWordStart(field.normalized, index)) return 70 * field.weight;
    return 50 * field.weight;
  }

  if (token.length < MIN_FUZZY_LENGTH || !latinToken.test(token)) return 0;
  const limit = fuzzyLimit(token);
  let best = limit + 1;
  for (const word of field.words) {
    // Compare against the word and its same-length prefix, so a typo in a
    // half-typed word ("kosakt" → "kosakata") still matches.
    const distance = Math.min(
      boundedEditDistance(token, word, limit),
      word.length > token.length
        ? boundedEditDistance(token, word.slice(0, token.length), limit)
        : limit + 1,
    );
    if (distance < best) best = distance;
    if (best === 0) break;
  }
  return best <= limit ? (35 - best * 10) * field.weight : 0;
}

function scoreBody(body: string[], matcher: TokenMatcher) {
  let best = 0;
  let segment = -1;
  for (let index = 0; index < body.length; index += 1) {
    const text = body[index]!;
    const found = matcher.find(text);
    if (found < 0) continue;
    const score = isWordStart(text, found) ? 25 : 18;
    if (score > best) {
      best = score;
      segment = index;
      if (score === 25) break;
    }
  }
  return { score: best, segment };
}

const SNIPPET_BEFORE = 36;
const SNIPPET_LENGTH = 140;

/**
 * A short excerpt of a body segment around the first query token. The match is
 * located in the original text case-insensitively; accent or punctuation
 * differences only lose the highlight.
 */
export function buildSnippet(
  original: string,
  tokens: string[],
): SearchSnippet {
  const lower = original.toLowerCase();
  let start = -1;
  let length = 0;
  for (const token of tokens) {
    const index = lower.indexOf(token);
    if (index >= 0) {
      start = index;
      length = token.length;
      break;
    }
  }
  const compact = (text: string) => text.replace(/\s+/g, " ");
  if (start < 0) {
    const text = compact(original);
    return {
      text:
        text.length > SNIPPET_LENGTH
          ? `${text.slice(0, SNIPPET_LENGTH).trimEnd()}…`
          : text,
      highlight: null,
    };
  }
  let from = Math.max(0, start - SNIPPET_BEFORE);
  if (from > 0) {
    const space = original.lastIndexOf(" ", start);
    if (space > from && space < start) from = space + 1;
  }
  const to = Math.min(original.length, from + SNIPPET_LENGTH);
  const prefix = from > 0 ? "…" : "";
  const suffix = to < original.length ? "…" : "";
  const before = compact(original.slice(from, start));
  const match = compact(original.slice(start, start + length));
  const after = compact(original.slice(start + length, to));
  const highlightStart = prefix.length + before.length;
  return {
    text: `${prefix}${before}${match}${after.trimEnd()}${suffix}`,
    highlight: { start: highlightStart, end: highlightStart + match.length },
  };
}

export type SearchOptions = {
  kinds?: ReadonlySet<SearchKind>;
  limit?: number;
};

export type SearchOutcome = {
  results: SearchResult[];
  /** Matches per kind before the `kinds` filter and the limit. */
  counts: Partial<Record<SearchKind, number>>;
  total: number;
};

/**
 * Ranks documents for a query. Every query word must match somewhere in a
 * document (a title-like field, typo-tolerant for Latin words, or the body);
 * title matches outrank body matches, and the last Korean character may still
 * be composing.
 */
export function searchDocuments(
  documents: PreparedDocument[],
  query: string,
  { kinds, limit = 60 }: SearchOptions = {},
): SearchOutcome {
  const normalized = normalizeSearchText(query);
  const counts: Partial<Record<SearchKind, number>> = {};
  if (!normalized) return { results: [], counts, total: 0 };

  const initialsQuery = isChoseongQuery(normalized);
  const tokens = initialsQuery
    ? [normalized.replace(/ /g, "")]
    : normalized.split(" ").filter(Boolean);
  const matchers = tokens.map(tokenMatcher);
  const matches: (Omit<SearchResult, "snippet"> & { segment: number })[] = [];
  let total = 0;

  for (const prepared of documents) {
    let score = 0;
    let snippetSegment = -1;
    let allFieldMatches = true;
    let matched = true;

    for (const matcher of matchers) {
      let best = 0;
      for (const field of prepared.fields) {
        const fieldScore = scoreField(field, matcher, initialsQuery);
        if (fieldScore > best) best = fieldScore;
      }
      if (best === 0 && !initialsQuery) {
        const body = scoreBody(prepared.body, matcher);
        best = body.score;
        if (body.score > 0) {
          allFieldMatches = false;
          if (snippetSegment < 0) snippetSegment = body.segment;
        }
      }
      if (best === 0) {
        matched = false;
        break;
      }
      score += best;
    }
    if (!matched) continue;

    // The whole phrase in one field beats the same words spread apart.
    if (matchers.length > 1) {
      for (const field of prepared.fields) {
        const index = field.normalized.indexOf(normalized);
        if (index < 0) continue;
        score += (index === 0 ? 40 : 25) * field.weight;
        break;
      }
    }

    const { kind } = prepared.document;
    counts[kind] = (counts[kind] ?? 0) + 1;
    total += 1;
    if (kinds && !kinds.has(kind)) continue;
    matches.push({
      document: prepared.document,
      score: score + KIND_BOOST[kind],
      segment: allFieldMatches ? -1 : snippetSegment,
    });
  }

  matches.sort(
    (a, b) =>
      b.score - a.score ||
      a.document.title.length - b.document.title.length ||
      a.document.title.localeCompare(b.document.title),
  );
  const results = matches
    .slice(0, limit)
    .map(({ document, score, segment }) => ({
      document,
      score,
      snippet:
        segment >= 0 ? buildSnippet(document.body[segment]!, tokens) : null,
    }));
  return { results, counts, total };
}
