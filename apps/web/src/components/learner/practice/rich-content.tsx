"use client";

import { useTheme } from "next-themes";

import { DynamicLearnerBlockNoteDocument } from "~/components/editor/dynamic-learner-block-note-document";
import { toBlockNoteDocument } from "~/lib/blocknote/document";

/** Read-only render of stored BlockNote content (question prompts, options, explanations). */
export function RichContent({ content }: { content: unknown }) {
  const { resolvedTheme } = useTheme();
  return (
    <div className="[&_.bn-editor]:px-0!">
      <DynamicLearnerBlockNoteDocument
        content={toBlockNoteDocument(content)}
        theme={resolvedTheme === "dark" ? "dark" : "light"}
      />
    </div>
  );
}
