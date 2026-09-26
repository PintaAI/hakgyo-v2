"use client";

import {
  AiImageImportDialog,
  useAiImageImport,
  type PreparedImportImage,
} from "~/components/ai-image-import";
import { Badge } from "~/components/ui/badge";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";

export type ExtractedVocabularyEntry = {
  term: string;
  romanization: string;
  definition: string;
  examples: string[];
  duplicate: boolean;
};

export type ImportedVocabularyEntry = Omit<
  ExtractedVocabularyEntry,
  "duplicate"
>;

type ReviewRow = {
  key: number;
  term: string;
  romanization: string;
  definition: string;
  examples: string;
  selected: boolean;
  duplicate: boolean;
};

/** Vocabulary list screenshot → AI scan → adjust rows → save to the set. */
export function useVocabularyImageImport({
  onExtract,
  onSave,
}: {
  onExtract: (
    image: PreparedImportImage,
  ) => Promise<ExtractedVocabularyEntry[]>;
  onSave: (entries: ImportedVocabularyEntry[]) => Promise<boolean>;
}) {
  const importer = useAiImageImport<ReviewRow>({
    emptyMessage: "Tidak ada daftar kosakata yang terbaca dari gambar ini.",
    extract: async (image) =>
      (await onExtract(image)).map((entry, key) => ({
        key,
        term: entry.term,
        romanization: entry.romanization,
        definition: entry.definition,
        examples: entry.examples.join("\n"),
        selected: !entry.duplicate,
        duplicate: entry.duplicate,
      })),
  });
  const { rows } = importer;

  function updateRow(key: number, patch: Partial<ReviewRow>) {
    importer.updateRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  const selectedRows = rows.filter((row) => row.selected);
  const allSelected = rows.length > 0 && selectedRows.length === rows.length;
  const invalidSelected = selectedRows.some(
    (row) => !row.term.trim() || !row.definition.trim(),
  );

  const dialog = (
    <AiImageImportDialog
      importer={importer}
      onSave={() =>
        void importer.save(() =>
          onSave(
            selectedRows.map((row) => ({
              term: row.term.trim(),
              romanization: row.romanization.trim(),
              definition: row.definition.trim(),
              examples: row.examples
                .split("\n")
                .map((example) => example.trim())
                .filter(Boolean),
            })),
          ),
        )
      }
      reviewDescription="Periksa dan sesuaikan hasil bacaan AI, lalu simpan ke set."
      saveDisabled={!selectedRows.length || invalidSelected}
      saveLabel={`Simpan ${selectedRows.length} istilah`}
      scanningDescription="AI sedang memindai gambar dan menyusun daftar kosakata."
      scanningLabel="Membaca istilah, romanisasi, dan definisi…"
      skeleton={Array.from({ length: 5 }, (_, index) => (
        <div
          className="grid grid-cols-[1rem_1fr_1fr_1.3fr] gap-2 rounded-lg border p-2"
          key={index}
        >
          <Skeleton className="mt-2.5 size-4" />
          <Skeleton className="h-9" />
          <Skeleton className="h-9" />
          <Skeleton className="h-9" />
        </div>
      ))}
      title="Impor kosakata dengan AI"
    >
      <div className="flex items-center justify-between gap-2 text-xs">
        <label className="flex items-center gap-2 font-medium">
          <Checkbox
            checked={allSelected}
            indeterminate={!allSelected && selectedRows.length > 0}
            onCheckedChange={(checked) =>
              importer.updateRows((current) =>
                current.map((row) => ({ ...row, selected: checked })),
              )
            }
          />
          {rows.length} istilah terbaca
        </label>
        <span className="text-muted-foreground">
          Definisi dalam Bahasa Indonesia
        </span>
      </div>
      <ol className="-mr-2 grid min-h-0 flex-1 content-start gap-2 overflow-y-auto pr-2">
        {rows.map((row) => (
          <li
            className={cn(
              "grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)] items-start gap-2 rounded-lg border p-2 transition-opacity",
              !row.selected && "opacity-55",
            )}
            key={row.key}
          >
            <Checkbox
              aria-label={`Simpan ${row.term}`}
              checked={row.selected}
              className="mt-2.5"
              onCheckedChange={(checked) =>
                updateRow(row.key, { selected: checked })
              }
            />
            <Input
              aria-invalid={row.selected && !row.term.trim()}
              aria-label="Istilah"
              className="font-heading h-9 font-semibold"
              maxLength={500}
              onChange={(event) =>
                updateRow(row.key, { term: event.target.value })
              }
              value={row.term}
            />
            <Input
              aria-label="Romanisasi"
              className="h-9 italic"
              maxLength={500}
              onChange={(event) =>
                updateRow(row.key, { romanization: event.target.value })
              }
              placeholder="Romanisasi"
              value={row.romanization}
            />
            <Input
              aria-invalid={row.selected && !row.definition.trim()}
              aria-label="Definisi"
              className="h-9"
              maxLength={5000}
              onChange={(event) =>
                updateRow(row.key, { definition: event.target.value })
              }
              value={row.definition}
            />
            <div className="col-span-3 col-start-2 flex items-start gap-2">
              {row.duplicate ? (
                <Badge className="mt-1.5" variant="outline">
                  Sudah ada
                </Badge>
              ) : null}
              <Textarea
                aria-label="Contoh pemakaian"
                className="min-h-8 flex-1 resize-none py-1.5 text-xs"
                onChange={(event) =>
                  updateRow(row.key, { examples: event.target.value })
                }
                placeholder="Contoh pemakaian (opsional, satu per baris)"
                rows={1}
                value={row.examples}
              />
            </div>
          </li>
        ))}
      </ol>
    </AiImageImportDialog>
  );

  return { busy: importer.busy, dialog, start: importer.start };
}
