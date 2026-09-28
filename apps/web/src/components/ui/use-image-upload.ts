"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";

/**
 * File input state shared by the image upload fields: shows a local preview
 * while `onUpload` runs and tracks whether an upload or removal is pending.
 */
export function useImageUpload({
  value,
  onUpload,
  onRemove,
}: {
  value?: string | null;
  onUpload: (file: File) => Promise<void> | void;
  onRemove?: () => Promise<void> | void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [action, setAction] = useState<"upload" | "remove" | null>(null);

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

  return {
    action,
    imageUrl: previewUrl ?? value,
    inputRef,
    previewUrl,
    remove,
    selectFile,
  };
}
