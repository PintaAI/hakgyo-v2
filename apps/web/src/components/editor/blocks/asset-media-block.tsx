"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { createReactBlockSpec } from "@blocknote/react";
import {
  HeadphonesIcon,
  ImageIcon,
  LoaderCircleIcon,
  UploadIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  assetAudioBlockType,
  assetImageBlockType,
} from "~/lib/blocknote/block-catalog";
import { api } from "~/trpc/react";

import { useEditorAssetUpload } from "../asset-upload-context";

const mediaProps = {
  assetId: { default: "" },
  fileName: { default: "" },
  contentType: { default: "" },
  caption: { default: "" },
};

export function AssetUrl({
  assetId,
  children,
}: {
  assetId: string;
  children: (url: string | null, loading: boolean) => React.ReactNode;
}) {
  const utils = api.useUtils();
  const [result, setResult] = useState<{
    assetId: string;
    url: string | null;
  } | null>(null);

  useEffect(() => {
    let active = true;
    if (!assetId) return;
    void utils.client.storage.createDownloadUrl
      .mutate({ assetId, disposition: "inline" })
      .then(({ downloadUrl }) => {
        if (active) setResult({ assetId, url: downloadUrl });
      })
      .catch(() => {
        if (active) {
          setResult({ assetId, url: null });
          toast.error("Media gagal dimuat.");
        }
      });
    return () => {
      active = false;
    };
  }, [assetId, utils.client]);

  return children(
    result?.assetId === assetId ? result.url : null,
    result?.assetId !== assetId,
  );
}

function MediaPicker({
  accept,
  kind,
  onUploaded,
}: {
  accept: string;
  kind: "audio" | "image";
  onUploaded: (asset: {
    assetId: string;
    fileName: string;
    contentType: string;
  }) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useEditorAssetUpload();
  const [uploading, setUploading] = useState(false);

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !upload) return;
    setUploading(true);
    try {
      onUploaded(await upload(file, kind));
      toast.success(kind === "audio" ? "Audio diunggah." : "Gambar diunggah.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Upload media gagal.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="bg-muted/30 flex min-h-28 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-5 text-center">
      <input
        ref={inputRef}
        accept={accept}
        className="hidden"
        onChange={(event) => void selectFile(event)}
        type="file"
      />
      <p className="text-muted-foreground text-sm">
        {upload
          ? "Pilih file untuk block ini."
          : "Upload media tidak tersedia di sini."}
      </p>
      {upload ? (
        <button
          className="bg-primary text-primary-foreground inline-flex h-9 items-center gap-2 rounded-md px-4 text-sm font-medium disabled:opacity-50"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          {uploading ? (
            <LoaderCircleIcon className="size-4 animate-spin" />
          ) : (
            <UploadIcon className="size-4" />
          )}
          Unggah {kind === "audio" ? "audio" : "gambar"}
        </button>
      ) : null}
    </div>
  );
}

export const assetAudioBlock = createReactBlockSpec(
  {
    type: assetAudioBlockType,
    propSchema: mediaProps,
    content: "none",
  },
  {
    render: ({ block, editor }) => (
      <div
        className="my-2 w-full rounded-xl border p-4"
        contentEditable={false}
      >
        {block.props.assetId ? (
          <AssetUrl assetId={block.props.assetId}>
            {(url, loading) =>
              loading ? (
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                  <LoaderCircleIcon className="size-4 animate-spin" /> Memuat
                  audio
                </div>
              ) : url ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <HeadphonesIcon className="size-4" />
                    {block.props.fileName || "Audio"}
                  </div>
                  <audio
                    className="w-full"
                    controls
                    preload="metadata"
                    src={url}
                  />
                  {block.props.caption ? (
                    <p className="text-muted-foreground text-sm">
                      {block.props.caption}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="text-destructive text-sm">
                  Audio tidak tersedia.
                </p>
              )
            }
          </AssetUrl>
        ) : editor.isEditable ? (
          <MediaPicker
            accept="audio/*"
            kind="audio"
            onUploaded={(asset) => editor.updateBlock(block, { props: asset })}
          />
        ) : (
          <p className="text-muted-foreground text-sm">Audio belum dipilih.</p>
        )}
      </div>
    ),
  },
)();

export const assetImageBlock = createReactBlockSpec(
  {
    type: assetImageBlockType,
    propSchema: mediaProps,
    content: "none",
  },
  {
    render: ({ block, editor }) => (
      <figure
        className="my-2 w-full rounded-xl border p-3"
        contentEditable={false}
      >
        {block.props.assetId ? (
          <AssetUrl assetId={block.props.assetId}>
            {(url, loading) =>
              loading ? (
                <div className="text-muted-foreground flex min-h-36 items-center justify-center gap-2 text-sm">
                  <LoaderCircleIcon className="size-4 animate-spin" /> Memuat
                  gambar
                </div>
              ) : url ? (
                <>
                  {/* Asset URLs are generated by the authenticated storage API. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt={
                      block.props.caption ||
                      block.props.fileName ||
                      "Gambar assessment"
                    }
                    className="mx-auto max-h-[32rem] max-w-full rounded-lg object-contain"
                    src={url}
                  />
                  {block.props.caption ? (
                    <figcaption className="text-muted-foreground mt-2 text-center text-sm">
                      {block.props.caption}
                    </figcaption>
                  ) : null}
                </>
              ) : (
                <p className="text-destructive text-sm">
                  Gambar tidak tersedia.
                </p>
              )
            }
          </AssetUrl>
        ) : editor.isEditable ? (
          <MediaPicker
            accept="image/*"
            kind="image"
            onUploaded={(asset) => editor.updateBlock(block, { props: asset })}
          />
        ) : (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <ImageIcon className="size-4" /> Gambar belum dipilih.
          </div>
        )}
      </figure>
    ),
  },
)();
