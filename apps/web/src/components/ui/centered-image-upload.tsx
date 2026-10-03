"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import {
  ImageIcon,
  LoaderCircleIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { useImageUpload } from "~/components/ui/use-image-upload";
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
  /** More buttons beside the upload button, such as generating an image. */
  actions?: ReactNode;
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
  actions,
}: CenteredImageUploadProps) {
  const { action, imageUrl, inputRef, previewUrl, remove, selectFile } =
    useImageUpload({ value, onUpload, onRemove });
  const disabled = busy || action !== null;

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
            className="bg-destructive hover:bg-destructive/90 dark:bg-destructive dark:hover:bg-destructive/90 absolute -top-2 -right-2 size-7 rounded-full text-white shadow-md [&_svg]:text-white"
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
      <div className="flex flex-wrap justify-center gap-2">
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
        {actions}
      </div>
    </div>
  );
}

export { CenteredImageUpload, type CenteredImageUploadProps };
