"use client";

import { LoaderCircleIcon, RotateCcwIcon, SaveIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import type { AutosaveStatus } from "~/lib/autosave-registry";

/**
 * Saves pending autosave edits right away instead of waiting for the
 * debounce. Shown while an edit is waiting, saving or failed; hidden once
 * everything is saved.
 */
export function SaveNowButton({
  status,
  onSave,
  size = "sm",
}: {
  status: AutosaveStatus;
  /** Flushes the pending save; errors are shown by the editor's status. */
  onSave: () => Promise<unknown>;
  size?: "xs" | "sm" | "default";
}) {
  if (status !== "pending" && status !== "saving" && status !== "error") {
    return null;
  }
  const saving = status === "saving";
  return (
    <Button
      type="button"
      size={size}
      variant={status === "error" ? "outline" : "default"}
      disabled={saving}
      onClick={() => void onSave().catch(() => undefined)}
    >
      {saving ? (
        <LoaderCircleIcon className="animate-spin" data-icon="inline-start" />
      ) : status === "error" ? (
        <RotateCcwIcon data-icon="inline-start" />
      ) : (
        <SaveIcon data-icon="inline-start" />
      )}
      {saving ? "Menyimpan…" : status === "error" ? "Coba lagi" : "Simpan"}
    </Button>
  );
}
