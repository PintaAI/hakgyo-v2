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
import { HeadphonesIcon, ImageIcon, LightbulbIcon } from "lucide-react";

import {
  assetAudioBlockType,
  assetImageBlockType,
  calloutBlockType,
} from "~/lib/blocknote/block-catalog";

import {
  AssetUploadProvider,
  type UploadEditorAsset,
} from "./asset-upload-context";
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
  uploadAsset?: UploadEditorAsset;
};

export function BlockNoteEditor({
  initialContent,
  editable = true,
  onChange,
  theme = "light",
  uploadAsset,
}: BlockNoteEditorProps) {
  const editor = useCreateBlockNote({
    initialContent,
    schema: hakgyoBlockNoteSchema,
  });

  const slashMenuItems = (editor: HakgyoBlockNoteEditor) => [
    ...getDefaultReactSlashMenuItems(editor),
    ...(uploadAsset
      ? [
          {
            title: "Audio assessment",
            subtext: "Unggah dan putar audio dari asset storage.",
            aliases: ["audio", "sound", "listening", "suara"],
            group: "Media Hakgyo",
            icon: <HeadphonesIcon className="size-4" />,
            onItemClick: () =>
              insertOrUpdateBlockForSlashMenu(editor, {
                type: assetAudioBlockType,
              }),
          },
          {
            title: "Gambar assessment",
            subtext: "Unggah gambar dari asset storage.",
            aliases: ["image", "picture", "gambar", "foto"],
            group: "Media Hakgyo",
            icon: <ImageIcon className="size-4" />,
            onItemClick: () =>
              insertOrUpdateBlockForSlashMenu(editor, {
                type: assetImageBlockType,
              }),
          },
        ]
      : []),
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
    <AssetUploadProvider value={uploadAsset ?? null}>
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
    </AssetUploadProvider>
  );
}
