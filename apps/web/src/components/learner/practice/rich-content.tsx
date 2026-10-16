"use client";

import { useTheme } from "next-themes";

import { DynamicLearnerBlockNoteDocument } from "~/components/editor/dynamic-learner-block-note-document";
import { toBlockNoteDocument } from "~/lib/blocknote/document";

/** Read-only render of stored BlockNote content (question prompts, options, explanations). */
export function RichContent({ content }: { content: unknown }) {
  const { resolvedTheme } = useTheme();
  const blocks = toBlockNoteDocument(content);
  return (
    <div className="[&_.bn-editor]:px-0!">
      {/* BlockNote reads its content once, so new content (the next question) needs a new editor */}
      <DynamicLearnerBlockNoteDocument
        key={JSON.stringify(blocks)}
        content={blocks}
        theme={resolvedTheme === "dark" ? "dark" : "light"}
      />
    </div>
  );
}
