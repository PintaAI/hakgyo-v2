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
import {
  BookOpenIcon,
  HeadphonesIcon,
  ImageIcon,
  LayoutTemplateIcon,
  LightbulbIcon,
} from "lucide-react";

import {
  assetAudioBlockType,
  assetImageBlockType,
  calloutBlockType,
  grammarBlockType,
  lessonPageBlockType,
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
  autoFocus?: boolean;
  editable?: boolean;
  trailingBlock?: boolean;
  onChange?: (document: BlockNoteDocument) => void;
  theme?: "light" | "dark";
  uploadAsset?: UploadEditorAsset;
};

export function BlockNoteEditor({
  initialContent,
  autoFocus,
  editable = true,
  trailingBlock = true,
  onChange,
  theme = "light",
  uploadAsset,
}: BlockNoteEditorProps) {
  const editor = useCreateBlockNote({
    initialContent,
    schema: hakgyoBlockNoteSchema,
    trailingBlock,
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
      title: "Lesson page",
      subtext: "Pembuka visual dengan foto, dialog, fokus, dan tujuan belajar.",
      aliases: ["lesson", "chapter", "cover", "materi", "halaman"],
      group: "Blok Hakgyo",
      icon: <LayoutTemplateIcon className="size-4" />,
      onItemClick: () =>
        insertOrUpdateBlockForSlashMenu(editor, {
          type: lessonPageBlockType,
        }),
    },
    {
      title: "Grammar",
      subtext: "Jelaskan pola tata bahasa, aturan, contoh, dan tip penggunaan.",
      aliases: ["grammar", "tata bahasa", "문법", "conjugation"],
      group: "Blok Hakgyo",
      icon: <BookOpenIcon className="size-4" />,
      onItemClick: () =>
        insertOrUpdateBlockForSlashMenu(editor, {
          type: grammarBlockType,
        }),
    },
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
        autoFocus={autoFocus}
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
