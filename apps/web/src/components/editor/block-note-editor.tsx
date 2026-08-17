"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/shadcn/style.css";

import {
  filterSuggestionItems,
  insertOrUpdateBlockForSlashMenu,
} from "@blocknote/core/extensions";
import {
  getDefaultReactSlashMenuItems,
  SuggestionMenuController,
  useCreateBlockNote,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import { LightbulbIcon } from "lucide-react";

import { calloutBlockType } from "~/lib/blocknote/block-catalog";

import {
  hakgyoBlockNoteSchema,
  type HakgyoBlock,
  type HakgyoBlockNoteEditor,
  type HakgyoPartialBlock,
} from "./block-note-schema";

export type BlockNoteDocument = HakgyoBlock[];

export type BlockNoteEditorProps = {
  initialContent?: HakgyoPartialBlock[];
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
  const editor = useCreateBlockNote({
    initialContent,
    schema: hakgyoBlockNoteSchema,
  });

  const slashMenuItems = (editor: HakgyoBlockNoteEditor) => [
    ...getDefaultReactSlashMenuItems(editor),
    {
      title: "Callout",
      subtext: "Sorot catatan, tip, peringatan, atau poin penting.",
      aliases: ["callout", "note", "tip", "warning"],
      group: "Blok Hakgyo",
      icon: <LightbulbIcon className="size-4" />,
      onItemClick: () =>
        insertOrUpdateBlockForSlashMenu(editor, {
          type: calloutBlockType,
          props: { tone: "tip" },
          content: "Tambahkan tip belajar yang mudah diingat...",
        }),
    },
  ];

  return (
    <BlockNoteView
      editable={editable}
      editor={editor}
      onChange={() => onChange?.(editor.document)}
      slashMenu={false}
      theme={theme}
    >
      <SuggestionMenuController
        getItems={async (query) =>
          filterSuggestionItems(slashMenuItems(editor), query)
        }
        triggerCharacter="/"
      />
    </BlockNoteView>
  );
}
