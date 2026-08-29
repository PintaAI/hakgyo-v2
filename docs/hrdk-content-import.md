# HRDK PDF content import

The importer turns an authorized local HRDK textbook PDF into reviewable Hakgyo
content. It does not download the textbook and does not bypass publisher access
controls. Confirm that Hakgyo may reproduce the source before importing it. The
official EPS-TOPIK download page currently labels the material as Korea Open
Government License Type 3 (attribution and no modification), so transformed or
adapted publication needs a separate rights review.

## 1. Extract

Run from `apps/web`:

```bash
bun run content:extract-hrdk -- /path/to/textbook.pdf \
  --title "EPS-TOPIK Bahasa Korea" \
  --slug eps-topik-bahasa-korea \
  --source-url "https://official.example/textbook.pdf" \
  --start-page 11
```

By default, output is written under `apps/web/generated/`, which is ignored by
Git. The command writes:

- `<name>.json`: structured course manifest;
- `<name>.report.json`: extraction warnings and summary.

The parser recognizes Korean and Indonesian headings for objectives,
vocabulary, grammar, dialogue, pronunciation, culture, reading, listening, and
exercise sections. If chapter headings cannot be found, it falls back to groups
of ten pages. Override that behavior with `--pages-per-lesson`.

Pages with little or no text layer automatically use Tesseract OCR with Korean,
English, and Indonesian language data. The first run downloads/caches language
data and can be slow. Use `--ocr-languages`, `--ocr-scale`, or `--skip-ocr` to
control it. Pages that remain unreadable are marked `PAGE_NEEDS_OCR`.

## 2. Review and validate

Review Korean text order, translations, lesson boundaries, and generated quiz
answers. Then validate:

```bash
bun run content:validate-hrdk -- generated/textbook.json
```

Assessment questions are generated only from lessons with at least four unique
vocabulary definitions. Grammar, listening, and reading answer keys are never
guessed.

## 3. Dry-run and import

```bash
bun run content:import-hrdk -- generated/textbook.json \
  --organization hakgyo-academy \
  --dry-run

bun run content:import-hrdk -- generated/textbook.json \
  --organization hakgyo-academy \
  --allow-warnings
```

Use `--owner-email teacher@example.com` to select a specific organization
membership. Without it, the earliest owner membership is used.

The importer uses deterministic IDs and Prisma upserts. Running the same
manifest again updates the generated course, modules, BlockNote materials,
vocabulary sets, entries, assessments, questions, options, and course items
without creating duplicates. Existing records that disappear from a later
manifest are not deleted automatically.

Courses are generated as drafts unless extraction uses `--publish`. Publishing
should happen only after the extraction report and course preview have been
reviewed.
