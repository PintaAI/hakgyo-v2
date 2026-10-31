// Loads an assembled document into a headless BlockNote editor with the app's schema and compares what comes back,
// so content the editor would silently change (unknown props dropped, text or links rewritten, blocks lost) fails
// validation instead of differing from what learners and teachers see. Kept apart from ./curriculum.ts because the
// schema pulls in the React block components.
import { BlockNoteEditor } from "@blocknote/core";

import { hakgyoBlockNoteSchema } from "~/components/editor/block-note-schema";

import type { BlockNoteBlock } from "./blocks";
import { canonicalJson } from "../hangeul-mastery/ids";

type Run = { text: string; styles: string; href: string | null };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Inline content as text runs (adjacent runs with the same styles and link merged, as BlockNote does). */
function runs(content: unknown) {
  const out: Run[] = [];
  collectRuns(content, null, out);
  const merged: Run[] = [];
  for (const run of out) {
    const last = merged.at(-1);
    if (last?.styles === run.styles && last.href === run.href) {
      last.text += run.text;
    } else if (run.text) {
      merged.push({ ...run });
    }
  }
  return merged;
}

function collectRuns(content: unknown, href: string | null, out: Run[]) {
  if (typeof content === "string") {
    out.push({ text: content, styles: "{}", href });
  } else if (Array.isArray(content)) {
    for (const node of content) collectRuns(node, href, out);
  } else if (isRecord(content)) {
    if (content.type === "text" && typeof content.text === "string") {
      out.push({
        text: content.text,
        styles: canonicalJson(content.styles ?? {}),
        href,
      });
    } else if (content.type === "link") {
      collectRuns(
        content.content,
        typeof content.href === "string" ? content.href : "",
        out,
      );
    } else if (content.type === "tableContent" && Array.isArray(content.rows)) {
      // One run list per cell, separated so cell boundaries count.
      content.rows.forEach((row, rowIndex) => {
        const cells =
          isRecord(row) && Array.isArray(row.cells) ? row.cells : [];
        cells.forEach((cell, cellIndex) => {
          out.push({
            text: `\u0000${rowIndex}:${cellIndex}`,
            styles: "",
            href: null,
          });
          collectRuns(isRecord(cell) ? cell.content : cell, href, out);
        });
      });
    }
  }
}

const describe = (value: unknown) => {
  const text = canonicalJson(value);
  return text.length > 120 ? `${text.slice(0, 117)}...` : text;
};

/** Differences between `input` and what BlockNote keeps of it; empty when it round-trips. */
export function blockNoteRoundTripIssues(input: BlockNoteBlock[]): string[] {
  let output: unknown[];
  try {
    const editor = BlockNoteEditor.create({
      schema: hakgyoBlockNoteSchema,
      initialContent: input as never,
    });
    output = editor.document;
  } catch (error) {
    return [
      `BlockNote cannot load the document: ${error instanceof Error ? error.message : String(error)}`,
    ];
  }

  const issues: string[] = [];
  const compare = (
    wanted: readonly BlockNoteBlock[],
    got: readonly unknown[],
    path: string,
  ) => {
    if (wanted.length !== got.length) {
      issues.push(
        `${path || "document"}: ${wanted.length} blocks became ${got.length}`,
      );
    }
    wanted.forEach((block, index) => {
      const result = got[index];
      const where = block.id ?? `${path}${index}`;
      if (!isRecord(result)) return;
      if (result.id !== block.id) {
        issues.push(`${where}: id became ${String(result.id)}`);
      }
      if (result.type !== block.type) {
        issues.push(
          `${where}: type ${block.type} became ${String(result.type)}`,
        );
        return;
      }
      const props = isRecord(result.props) ? result.props : {};
      for (const [name, value] of Object.entries(block.props ?? {})) {
        if (!(name in props)) {
          issues.push(`${where}: prop ${name} is not in the schema (dropped)`);
        } else if (canonicalJson(props[name]) !== canonicalJson(value)) {
          issues.push(
            `${where}: prop ${name} ${describe(value)} became ${describe(props[name])}`,
          );
        }
      }
      const before = runs(block.content);
      const after = runs(result.content);
      if (canonicalJson(before) !== canonicalJson(after)) {
        issues.push(
          `${where}: text or links changed: ${describe(before)} became ${describe(after)}`,
        );
      }
      compare(
        block.children ?? [],
        Array.isArray(result.children) ? result.children : [],
        `${where}.`,
      );
    });
  };
  compare(input, output, "");
  return issues;
}
