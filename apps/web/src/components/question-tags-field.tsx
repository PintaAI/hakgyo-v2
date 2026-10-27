"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { XIcon } from "lucide-react";
import {
  epsTagVocabulary,
  MAX_QUESTION_TAGS,
  MAX_TAG_LENGTH,
  normalizeTag,
  sortTags,
  tagLabel,
} from "@hakgyo/shared";

import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";

/**
 * Tags of one question as removable chips plus an input with the EPS-TOPIK vocabulary as
 * suggestions. Enter or a comma adds the typed tag; any free label is allowed too.
 */
export function QuestionTagsField({
  id,
  tags,
  disabled,
  onChange,
}: {
  id: string;
  tags: string[];
  disabled?: boolean;
  onChange: (tags: string[]) => void;
}) {
  const listId = useId();
  const [draft, setDraft] = useState("");
  const full = tags.length >= MAX_QUESTION_TAGS;

  function add(value: string) {
    const tag = normalizeTag(value.replace(/,/g, " "));
    setDraft("");
    if (!tag || tag.length > MAX_TAG_LENGTH || tags.includes(tag) || full) {
      return;
    }
    onChange(sortTags([...tags, tag]));
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      if (draft.trim()) add(draft);
    } else if (event.key === "Backspace" && !draft && tags.length) {
      onChange(tags.slice(0, -1));
    }
  }

  return (
    <div className="grid gap-2">
      {tags.length ? (
        <ul className="flex flex-wrap gap-1.5" aria-label="Label soal">
          {tags.map((tag) => (
            <li key={tag}>
              <Badge variant="secondary" className="gap-1 pr-1" title={tag}>
                {tagLabel(tag)}
                <button
                  type="button"
                  aria-label={`Hapus label ${tagLabel(tag)}`}
                  className="hover:bg-muted-foreground/20 rounded-sm disabled:opacity-50"
                  disabled={disabled}
                  onClick={() => onChange(tags.filter((item) => item !== tag))}
                >
                  <XIcon className="size-3" />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      ) : null}
      <Input
        id={id}
        disabled={Boolean(disabled) || full}
        list={listId}
        maxLength={MAX_TAG_LENGTH}
        onBlur={() => {
          if (draft.trim()) add(draft);
        }}
        onChange={(event) => {
          const value = event.target.value;
          // Picking a suggestion fills the whole tag at once.
          if (epsTagVocabulary.some((entry) => entry.tag === value)) add(value);
          else setDraft(value);
        }}
        onKeyDown={onKeyDown}
        placeholder={
          full
            ? `Maksimal ${MAX_QUESTION_TAGS} label`
            : "Tambah label, mis. eps:R2 atau topik:k3"
        }
        value={draft}
      />
      <datalist id={listId}>
        {epsTagVocabulary
          .filter((entry) => !tags.includes(entry.tag))
          .map((entry) => (
            <option key={entry.tag} value={entry.tag}>
              {entry.label}
            </option>
          ))}
      </datalist>
    </div>
  );
}
