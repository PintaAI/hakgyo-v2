"use client";

import { EyeIcon, RotateCcwIcon } from "lucide-react";

import { useDialogs } from "~/components/ui/use-dialogs";

import { useBlockPreview } from "../block-preview-context";

export function CustomBlockToolbar({
  block,
  editable,
  onClear,
}: {
  block: unknown;
  editable: boolean;
  onClear: () => void;
}) {
  const previewBlock = useBlockPreview();
  const { confirm, dialogs } = useDialogs();

  if (!editable) return null;

  return (
    <div
      className="flex items-center gap-1.5"
      contentEditable={false}
      data-custom-block-toolbar
    >
      <button
        className="border-border bg-background/70 text-muted-foreground hover:bg-background hover:text-foreground inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs font-medium transition"
        disabled={!previewBlock}
        onClick={() => previewBlock?.(block)}
        type="button"
      >
        <EyeIcon className="size-3.5" /> Pratinjau
      </button>
      <button
        className="border-border bg-background/70 text-muted-foreground hover:bg-destructive/10 hover:text-destructive inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs font-medium transition"
        onClick={async () => {
          const confirmed = await confirm({
            title: "Kosongkan block ini?",
            description: "Semua isi block ini akan dihapus.",
            confirmLabel: "Kosongkan",
            destructive: true,
          });
          if (confirmed) onClear();
        }}
        type="button"
      >
        <RotateCcwIcon className="size-3.5" /> Kosongkan
      </button>
      {dialogs}
    </div>
  );
}
