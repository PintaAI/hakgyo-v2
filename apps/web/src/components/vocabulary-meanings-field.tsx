"use client";

import { MAX_VOCABULARY_MEANINGS } from "@hakgyo/shared";
import { PlusIcon, XIcon } from "lucide-react";
import { useEffect, useRef, type KeyboardEvent } from "react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

/**
 * Edits the meanings of one vocabulary entry, one field per meaning. Enter
 * adds a field below; Backspace in an empty field removes it.
 */
export function VocabularyMeaningsField({
  id,
  invalid,
  meanings,
  onChange,
}: {
  id: string;
  invalid?: boolean;
  meanings: string[];
  onChange: (meanings: string[]) => void;
}) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const focusIndexRef = useRef<number | null>(null);
  const rows = meanings.length > 0 ? meanings : [""];
  const canAdd = rows.length < MAX_VOCABULARY_MEANINGS;

  useEffect(() => {
    const index = focusIndexRef.current;
    if (index === null) return;
    focusIndexRef.current = null;
    inputRefs.current[index]?.focus();
  });

  function insertAfter(index: number) {
    if (!canAdd) return;
    focusIndexRef.current = index + 1;
    onChange([...rows.slice(0, index + 1), "", ...rows.slice(index + 1)]);
  }

  function remove(index: number) {
    focusIndexRef.current = Math.max(0, index - 1);
    onChange(rows.filter((_, rowIndex) => rowIndex !== index));
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
    index: number,
  ) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      insertAfter(index);
    } else if (
      event.key === "Backspace" &&
      rows.length > 1 &&
      event.currentTarget.value === ""
    ) {
      event.preventDefault();
      remove(index);
    }
  }

  return (
    <div className="grid gap-1.5">
      {rows.map((meaning, index) => (
        <div className="flex items-center gap-1.5" key={index}>
          {rows.length > 1 ? (
            <span className="text-muted-foreground w-4 shrink-0 text-right text-xs tabular-nums">
              {index + 1}.
            </span>
          ) : null}
          <Input
            aria-invalid={invalid && !meaning.trim() ? true : undefined}
            aria-label={rows.length > 1 ? `Arti ${index + 1}` : "Arti"}
            className="h-9"
            id={index === 0 ? id : undefined}
            maxLength={1000}
            onChange={(event) =>
              onChange(
                rows.map((value, rowIndex) =>
                  rowIndex === index ? event.target.value : value,
                ),
              )
            }
            onKeyDown={(event) => handleKeyDown(event, index)}
            ref={(element) => {
              inputRefs.current[index] = element;
            }}
            value={meaning}
          />
          {rows.length > 1 ? (
            <Button
              aria-label={`Hapus arti ${index + 1}`}
              onClick={() => remove(index)}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <XIcon />
            </Button>
          ) : null}
        </div>
      ))}
      {canAdd ? (
        <Button
          className="justify-self-start"
          onClick={() => insertAfter(rows.length - 1)}
          size="xs"
          type="button"
          variant="ghost"
        >
          <PlusIcon data-icon="inline-start" />
          Tambah arti
        </Button>
      ) : null}
    </div>
  );
}
