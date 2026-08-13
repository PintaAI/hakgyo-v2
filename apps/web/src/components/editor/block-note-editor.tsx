"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/shadcn/style.css";

import type { Block, PartialBlock } from "@blocknote/core";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";

export type BlockNoteDocument = Block[];

export type BlockNoteEditorProps = {
  initialContent?: PartialBlock[];
  editable?: boolean;
  onChange?: (document: BlockNoteDocument) => void;
  theme?: "light" | "dark";
};

export function BlockNoteEditor({
  initialContent,
  editable = true,
  onChange,
  theme = "light",
}: BlockNoteEditorProps) {
  const editor = useCreateBlockNote({ initialContent });

  return (
    <BlockNoteView
      editable={editable}
      editor={editor}
      onChange={() => onChange?.(editor.document)}
      theme={theme}
    />
  );
}
