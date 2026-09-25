"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import Image from "next/image";
import { ImageIcon, LoaderCircleIcon, Trash2Icon, UploadIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";

type CenteredImageUploadProps = {
  id: string;
  value?: string | null;
  alt: string;
  accept: string;
  busy?: boolean;
  onUpload: (file: File) => Promise<void>;
  onRemove?: () => Promise<void> | void;
  previewClassName?: string;
  placeholder?: ReactNode;
  uploadLabel?: string;
  replaceLabel?: string;
};

function CenteredImageUpload({
  id,
  value,
  alt,
  accept,
  busy = false,
  onUpload,
  onRemove,
  previewClassName,
  placeholder,
  uploadLabel = "Unggah gambar",
  replaceLabel = "Ganti gambar",
}: CenteredImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [action, setAction] = useState<"upload" | "remove" | null>(null);
  const disabled = busy || action !== null;

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

  async function remove() {
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
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={alt}
            width={320}
            height={180}
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
        {value && !previewUrl && onRemove ? (
          <Button
            type="button"
            size="icon"
            variant="destructive"
            disabled={disabled}
            onClick={() => void remove()}
            aria-label="Hapus gambar"
            className="bg-destructive text-white absolute -top-2 -right-2 size-7 rounded-full shadow-md hover:bg-destructive/90 dark:bg-destructive dark:hover:bg-destructive/90 [&_svg]:text-white"
          >
            {action === "remove" ? (
              <LoaderCircleIcon className="size-3.5 animate-spin" />
            ) : (
              <Trash2Icon className="size-3.5" />
            )}
          </Button>
        ) : null}
      </div>
      <Input
        ref={inputRef}
        id={id}
        accept={accept}
        className="sr-only"
        type="file"
        disabled={disabled}
        onChange={(event) => void selectFile(event)}
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled}
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
    </div>
  );
}

export { CenteredImageUpload, type CenteredImageUploadProps };
