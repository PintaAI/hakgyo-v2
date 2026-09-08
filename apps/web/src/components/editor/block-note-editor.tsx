"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/shadcn/style.css";

import { useRef, useState } from "react";
import {
  filterSuggestionItems,
  insertOrUpdateBlockForSlashMenu,
} from "@blocknote/core/extensions";
import { en } from "@blocknote/core/locales";
import {
  getDefaultReactSlashMenuItems,
  SuggestionMenuController,
  useCreateBlockNote,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import {
  BookOpenIcon,
  Building2Icon,
  HeadphonesIcon,
  LayoutTemplateIcon,
  LightbulbIcon,
  MessagesSquareIcon,
  NotebookTabsIcon,
  ClipboardCheckIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  assessmentReferenceBlockType,
  assetAudioBlockType,
  assetImageBlockType,
  calloutBlockType,
  conversationBlockType,
  cultureBlockType,
  grammarBlockType,
  lessonPageBlockType,
  vocabularyReferenceBlockType,
} from "~/lib/blocknote/block-catalog";
import { getCultureAssetIds } from "~/lib/blocknote/culture-content";

import {
  AssetUploadProvider,
  type UploadEditorAsset,
} from "./asset-upload-context";
import { BlockPreviewProvider } from "./block-preview-context";
import {
  hakgyoBlockNoteSchema,
  type HakgyoBlock,
  type HakgyoBlockNoteEditor,
  type HakgyoPartialBlock,
} from "./block-note-schema";
import { DynamicLearnerBlockNoteDocument } from "./dynamic-learner-block-note-document";
import { Dialog, DialogContent } from "~/components/ui/dialog";
import { api } from "~/trpc/react";
import {
  ResourceReferenceProvider,
  type EditorResourceLibrary,
} from "./resource-reference-context";

const assetUrlPrefix = "hakgyo-asset:";

function getAssetId(url: string) {
  return url.startsWith(assetUrlPrefix)
    ? url.slice(assetUrlPrefix.length)
    : null;
}

function collectAssetIds(blocks: HakgyoBlock[]) {
  const assetIds = new Set<string>();
  const visit = (block: HakgyoBlock) => {
    if (
      block.type === assetAudioBlockType ||
      block.type === assetImageBlockType ||
      block.type === conversationBlockType ||
      block.type === lessonPageBlockType
    ) {
      if (block.props.assetId) assetIds.add(block.props.assetId);
      if (block.type === conversationBlockType && block.props.practiceAssetId) {
        assetIds.add(block.props.practiceAssetId);
      }
    } else if (block.type === cultureBlockType) {
      getCultureAssetIds(block.props.sections).forEach((assetId) =>
        assetIds.add(assetId),
      );
    } else if (
      block.type === "audio" ||
      block.type === "file" ||
      block.type === "image" ||
      block.type === "video"
    ) {
      const assetId = getAssetId(block.props.url);
      if (assetId) assetIds.add(assetId);
    }
    block.children.forEach(visit);
  };
  blocks.forEach(visit);
  return assetIds;
}

export type BlockNoteDocument = HakgyoBlock[];

export type EditorAssetStorageOptions = {
  organizationId: string;
  onAttach?: (assetId: string) => Promise<void> | void;
  onDetach?: (assetId: string) => Promise<void> | void;
};

export type BlockNoteEditorProps = {
  initialContent?: HakgyoPartialBlock[];
  autoFocus?: boolean;
  editable?: boolean;
  trailingBlock?: boolean;
  onChange?: (document: BlockNoteDocument) => void;
  placeholder?: string;
  theme?: "light" | "dark";
  assetStorage?: EditorAssetStorageOptions;
  resourceLibrary?: EditorResourceLibrary;
};

export function BlockNoteEditor({
  initialContent,
  autoFocus,
  editable = true,
  trailingBlock = true,
  onChange,
  placeholder = "Tulis sesuatu atau ketik '/' untuk memilih blok",
  theme = "light",
  assetStorage,
  resourceLibrary,
}: BlockNoteEditorProps) {
  const [previewBlock, setPreviewBlock] = useState<HakgyoBlock | null>(null);
  const utils = api.useUtils();
  const createUpload = api.storage.createUploadUrl.useMutation();
  const confirmUpload = api.storage.confirmUpload.useMutation();
  const discardUpload = api.storage.deleteDocument.useMutation();
  const deleteAsset = api.storage.deleteAsset.useMutation();

  const uploadAsset: UploadEditorAsset | undefined = assetStorage
    ? async (file, kind) => {
        const expectedPrefix = kind === "file" ? null : `${kind}/`;
        const maximumSize =
          kind === "file"
            ? 100 * 1024 * 1024
            : kind === "audio"
              ? 50 * 1024 * 1024
              : 10 * 1024 * 1024;
        if (expectedPrefix && !file.type.startsWith(expectedPrefix)) {
          throw new Error(
            kind === "audio"
              ? "Pilih file audio yang valid."
              : "Pilih file gambar yang valid.",
          );
        }
        if (file.size > maximumSize) {
          throw new Error(
            kind === "file"
              ? "Ukuran file maksimal 100 MB."
              : kind === "audio"
                ? "Ukuran audio maksimal 50 MB."
                : "Ukuran gambar maksimal 10 MB.",
          );
        }

        const upload = await createUpload.mutateAsync({
          organizationId: assetStorage.organizationId,
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
          fileSize: file.size,
        });
        let retained = false;
        try {
          const response = await fetch(upload.uploadUrl, {
            method: "PUT",
            body: file,
            headers: upload.headers,
          });
          if (!response.ok) {
            throw new Error(`Upload file gagal (${response.status}).`);
          }
          const asset = await confirmUpload.mutateAsync({ key: upload.key });
          await assetStorage.onAttach?.(asset.assetId);
          retained = true;
          return {
            assetId: asset.assetId,
            fileName: file.name,
            contentType: asset.contentType,
          };
        } catch (error) {
          if (!retained) {
            await discardUpload
              .mutateAsync({ key: upload.key })
              .catch(() => undefined);
          }
          throw error;
        }
      }
    : undefined;

  const removeAsset = assetStorage
    ? async (assetId: string) => {
        await assetStorage.onDetach?.(assetId);
        await deleteAsset.mutateAsync({ assetId });
      }
    : undefined;

  const resolveFileUrl = async (url: string) => {
    const assetId = getAssetId(url);
    if (!assetId) return url;
    const result = await utils.client.storage.createDownloadUrl.mutate({
      assetId,
      disposition: "inline",
    });
    return result.downloadUrl;
  };

  const editor = useCreateBlockNote({
    dictionary: {
      ...en,
      placeholders: {
        ...en.placeholders,
        default: placeholder,
        heading: "Judul",
        toggleListItem: "Daftar buka-tutup",
        bulletListItem: "Daftar",
        numberedListItem: "Daftar",
        checkListItem: "Daftar",
        emptyDocument: placeholder,
        new_comment: "Tulis komentar...",
        edit_comment: "Edit komentar...",
        comment_reply: "Tambahkan balasan...",
      },
    },
    initialContent,
    schema: hakgyoBlockNoteSchema,
    trailingBlock,
    uploadFile: uploadAsset
      ? async (file) => {
          const asset = await uploadAsset(
            file,
            file.type.startsWith("image/")
              ? "image"
              : file.type.startsWith("audio/")
                ? "audio"
                : "file",
          );
          return {
            props: {
              name: asset.fileName,
              url: `${assetUrlPrefix}${asset.assetId}`,
            },
          };
        }
      : undefined,
    resolveFileUrl,
  });
  const assetIdsRef = useRef(collectAssetIds(editor.document));

  const slashMenuItems = (editor: HakgyoBlockNoteEditor) => [
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
      title: "Conversation",
      subtext: "Dialog bilingual dengan gambar, pertanyaan, dan tip bahasa.",
      aliases: ["conversation", "dialog", "dialogue", "대화", "percakapan"],
      group: "Blok Hakgyo",
      icon: <MessagesSquareIcon className="size-4" />,
      onItemClick: () =>
        insertOrUpdateBlockForSlashMenu(editor, {
          type: conversationBlockType,
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
      title: "Culture & Information",
      subtext: "Artikel budaya bilingual dengan foto dan self assessment.",
      aliases: ["culture", "budaya", "문화", "정보", "information"],
      group: "Blok Hakgyo",
      icon: <Building2Icon className="size-4" />,
      onItemClick: () =>
        insertOrUpdateBlockForSlashMenu(editor, {
          type: cultureBlockType,
        }),
    },
    ...(resourceLibrary
      ? [
          {
            title: "Vocabulary set",
            subtext:
              "Tampilkan kosakata live dari library dan tautkan latihan hafalan.",
            aliases: ["vocabulary", "vocab", "kosakata", "어휘"],
            group: "Blok Hakgyo",
            icon: <NotebookTabsIcon className="size-4" />,
            onItemClick: () =>
              insertOrUpdateBlockForSlashMenu(editor, {
                type: vocabularyReferenceBlockType,
              }),
          },
          {
            title: "Assessment",
            subtext: "Tampilkan ringkasan assessment live dan tombol mulai.",
            aliases: ["assessment", "quiz", "test", "ujian", "penilaian"],
            group: "Blok Hakgyo",
            icon: <ClipboardCheckIcon className="size-4" />,
            onItemClick: () =>
              insertOrUpdateBlockForSlashMenu(editor, {
                type: assessmentReferenceBlockType,
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
        ]
      : []),
    ...getDefaultReactSlashMenuItems(editor),
  ];

  return (
    <ResourceReferenceProvider editorLibrary={resourceLibrary}>
      <BlockPreviewProvider
        previewBlock={(block) => setPreviewBlock(block as HakgyoBlock)}
      >
        <AssetUploadProvider
          value={
            uploadAsset ? { upload: uploadAsset, remove: removeAsset } : null
          }
        >
          <BlockNoteView
            autoFocus={autoFocus}
            editable={editable}
            editor={editor}
            onChange={() => {
              const currentAssetIds = collectAssetIds(editor.document);
              if (removeAsset) {
                for (const assetId of assetIdsRef.current) {
                  if (!currentAssetIds.has(assetId)) {
                    void removeAsset(assetId).catch(() =>
                      toast.error("File gagal dihapus dari penyimpanan."),
                    );
                  }
                }
              }
              assetIdsRef.current = currentAssetIds;
              onChange?.(editor.document);
            }}
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

        <Dialog
          onOpenChange={(open) => {
            if (!open) setPreviewBlock(null);
          }}
          open={previewBlock !== null}
        >
          <DialogContent className="bg-background h-[min(52rem,calc(100svh-2rem))] gap-0 overflow-y-auto p-0 sm:max-w-5xl">
            {previewBlock ? (
              <DynamicLearnerBlockNoteDocument
                content={[previewBlock]}
                theme={theme}
              />
            ) : null}
          </DialogContent>
        </Dialog>
      </BlockPreviewProvider>
    </ResourceReferenceProvider>
  );
}
