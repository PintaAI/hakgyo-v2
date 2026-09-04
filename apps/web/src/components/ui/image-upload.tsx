"use client";

import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { ImageIcon, LoaderCircleIcon, UploadIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";

type ImageUploadProps = {
  id: string;
  value?: string | null;
  alt: string;
  accept: string;
  helpText: ReactNode;
  onUpload: (file: File) => Promise<void> | void;
  onRemove?: () => Promise<void> | void;
  disabled?: boolean;
  isPending?: boolean;
  uploadLabel?: string;
  replaceLabel?: string;
  removeLabel?: string;
  className?: string;
  previewClassName?: string;
  placeholder?: ReactNode;
  renderPreview?: (previewUrl: string | null) => ReactNode;
};

function ImageUpload({
  id,
  value,
  alt,
  accept,
  helpText,
  onUpload,
  onRemove,
  disabled = false,
  isPending = false,
  uploadLabel = "Pilih gambar",
  replaceLabel = "Ganti gambar",
  removeLabel = "Hapus gambar",
  className,
  previewClassName,
  placeholder,
  renderPreview,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [action, setAction] = useState<"upload" | "remove" | null>(null);
  const busy = disabled || isPending || action !== null;

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;

    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const nextPreviewUrl = URL.createObjectURL(file);
    previewUrlRef.current = nextPreviewUrl;
    setPreviewUrl(nextPreviewUrl);
    setAction("upload");

    try {
      await onUpload(file);
    } finally {
      if (previewUrlRef.current === nextPreviewUrl) {
        URL.revokeObjectURL(nextPreviewUrl);
        previewUrlRef.current = null;
        setPreviewUrl(null);
      }
      setAction(null);
    }
  }

  async function removeImage() {
    if (!onRemove) return;
    setAction("remove");
    try {
      await onRemove();
    } finally {
      setAction(null);
    }
  }

  const imageUrl = previewUrl ?? value;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-4 rounded-lg border p-3",
        className,
      )}
    >
      {renderPreview ? (
        renderPreview(previewUrl)
      ) : imageUrl ? (
        <Image
          src={imageUrl}
          alt={alt}
          width={160}
          height={90}
          unoptimized
          className={cn(
            "aspect-video w-40 rounded-md object-cover",
            previewClassName,
          )}
        />
      ) : (
        <div
          className={cn(
            "bg-muted text-muted-foreground flex aspect-video w-40 items-center justify-center rounded-md",
            previewClassName,
          )}
        >
          {placeholder ?? <ImageIcon className="size-6" />}
        </div>
      )}

      <div className="min-w-48 flex-1 space-y-2">
        <Input
          ref={inputRef}
          id={id}
          accept={accept}
          className="sr-only"
          type="file"
          disabled={busy}
          onChange={(event) => void selectFile(event)}
        />
        <p className="text-muted-foreground text-xs">{helpText}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {action === "upload" ? (
              <LoaderCircleIcon className="animate-spin" />
            ) : (
              <UploadIcon />
            )}
            {action === "upload"
              ? "Mengunggah..."
              : value
                ? replaceLabel
                : uploadLabel}
          </Button>
          {value && onRemove ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => void removeImage()}
            >
              {action === "remove" ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : null}
              {action === "remove" ? "Menghapus..." : removeLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export { ImageUpload, type ImageUploadProps };
