"use client";

import type { KeyboardEvent } from "react";

export function EditableBlockText({
  ariaLabel,
  className,
  editable,
  onChange,
  placeholder,
  value,
}: {
  ariaLabel: string;
  className?: string;
  editable: boolean;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  function stopEditorKeyboardHandling(
    event: KeyboardEvent<HTMLTextAreaElement>,
  ) {
    event.stopPropagation();
  }

  if (!editable) {
    return (
      <div
        className={`${className ?? ""} max-w-full min-w-0 [overflow-wrap:anywhere] break-words whitespace-pre-wrap`}
      >
        {value || "\u00a0"}
      </div>
    );
  }

  return (
    <textarea
      aria-label={ariaLabel}
      className={`${className ?? ""} hover:border-border focus:border-ring focus:bg-background/80 focus:ring-ring/30 placeholder:text-muted-foreground/60 block field-sizing-content min-h-[1lh] max-w-full min-w-0 resize-none overflow-hidden rounded-md border border-transparent bg-transparent px-1 [overflow-wrap:anywhere] break-words whitespace-pre-wrap transition outline-none focus:ring-2`}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={stopEditorKeyboardHandling}
      placeholder={placeholder}
      rows={1}
      value={value}
      wrap="soft"
    />
  );
}
