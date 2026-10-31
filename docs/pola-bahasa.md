# Pola Bahasa

Two linked courses that teach everyday Korean patterns to Indonesian speakers. Hakgyo publishes both as system content:

| Course                        | Id              | Slug              | Idea                                                                                                              |
| ----------------------------- | --------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------- |
| Pola Korea → Indo: Paham Pola | `pb-korea-indo` | `pola-korea-indo` | Start from a Korean pattern (-는데, -거든요, 좀) and explain it through Indonesian logic.                         |
| Indo → Korea: Berani Ngomong  | `pb-indo-korea` | `pola-indo-korea` | Start from words Indonesians say every day (padahal, kok, soalnya, ketiduran) and find how to say them in Korean. |

Each course is a list of chapters (bab), and each chapter is a module holding one short material per pattern (2–3 minutes of reading), then one vocabulary set with the chapter's patterns, then one quiz. Materials link to each other across both courses, so a learner reading about _padahal_ can open the -는데 material, and the reverse. Links are ordinary BlockNote link nodes whose href is `hakgyo-material:<materialId>` (contract in `packages/shared/src/material-links.ts`); they point at whole materials, without anchors.

Both courses belong to the hidden Hakgyo system organization (`hakgyo-system-organization`), and the importer creates them with the organization's OWNER membership. They are published and free (price 0), with OPEN progression so links can jump to any material without module locks.

**Rollout state: course only.** The courses are imported with INVITE_ONLY enrollment and without any cohort or enrollment, so no learner can join them yet and no "Belajar mandiri" cohort exists. New users are not enrolled at sign-up either: `ensureFoundationEnrollments` (`apps/web/src/server/foundation/enrollment.ts`) only covers Hangeul Mastery, and `POLA_BAHASA_COURSE_IDS` is kept for when the rollout is decided. Learners can only follow a link into a course they are enrolled in, so material links between the two courses resolve only after enrollments exist. As published system courses they do appear in the "Salin dari Hakgyo" starter list when an organization is created.

To roll out later: switch `enrollmentMode` in `curriculum.ts` to OPEN if learners should join from the catalog, add `POLA_BAHASA_COURSE_IDS` to `FOUNDATION_COURSE_IDS` for new users, and run the import with `--enroll-existing` for existing users (this creates each course's default cohort).

## Where things live

| Part                                                                                  | Location                                                                              |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Outline: courses, chapters (`POLA_BABS`) and their materials, titles, stars           | `apps/web/scripts/pola-bahasa/manifest.ts`                                            |
| Writing guide (Indonesian)                                                            | `apps/web/scripts/pola-bahasa/STYLE.md`                                               |
| Block builders (`defineBab`, `ref`, `grammar`, `ex`, `chat`, `table`, `callout`, ...) | `apps/web/scripts/pola-bahasa/blocks.ts`                                              |
| Content, one file per chapter, default-exporting `defineBab(...)`                     | `apps/web/scripts/pola-bahasa/content/<bab-key>.ts`, registered in `content/index.ts` |
| Stable ids                                                                            | `apps/web/scripts/pola-bahasa/ids.ts`                                                 |
| Assembly and checks (pure)                                                            | `apps/web/scripts/pola-bahasa/curriculum.ts`                                          |
| Plan (pure) and importer                                                              | `apps/web/scripts/pola-bahasa/plan.ts`, `import.ts`                                   |
| Offline validation, and the BlockNote round trip                                      | `apps/web/scripts/pola-bahasa/validate.ts`, `roundtrip.ts`                            |
| Course id constants                                                                   | `apps/web/src/server/foundation/constants.ts`                                         |

A chapter file is `defineBab({ key, materials: { [materialKey]: { description, blocks } }, vocabulary: { title, description, entries }, quiz })`. The material title comes from the manifest (`materialTitle()` appends " · ★" for `star`), never from the content.

## Keys never change

Every id comes from a manifest key:

| Row or block                | Id                                                                    |
| --------------------------- | --------------------------------------------------------------------- |
| Course                      | `pb-<courseKey>`                                                      |
| Module (chapter)            | `pb-<babKey>`                                                         |
| Material                    | `pb-<materialKey>-material`                                           |
| Material course item        | `pb-<materialKey>-item`                                               |
| Material block              | `pb-<materialKey>-b<n>`, `n` counting blocks in document order from 1 |
| Vocabulary set and its item | `pb-<babKey>-vocab`, `pb-<babKey>-vocab-item`                         |
| Vocabulary entry            | `pb-<babKey>-v-<materialKey>` (one per material)                      |
| Quiz (assessment) and item  | `pb-<babKey>-quiz`, `pb-<babKey>-quiz-item`                           |
| Quiz question               | `pb-<babKey>-quiz-q-<questionKey>`                                    |
| Quiz option                 | `<questionId>-o-<hash of the option text>`                            |

Learner progress hangs on the item, entry and question ids, and links point at the material ids. Never rename or reuse a course, chapter, material or question key once the courses are imported; adding is fine. Entries are keyed by material, so editing a term keeps its progress. Options are keyed by a hash of their text (as in Hangeul Mastery): reordering keeps them, editing an option's text makes a new option.

## Assembly

Per chapter, the module's items are, in order and all published: the materials in manifest order, the vocabulary set, the quiz. A material's document is its `blocks` with derived ids. `ref(text, materialKey)` writes a `pola-ref:<materialKey>` href, and assembly turns it into `hakgyo-material:pb-<materialKey>-material`.

The vocabulary set has one entry per material, in the same order: `term`, `meanings`, `definition` (the meanings joined with "; "), and `examples` as one string `"<Korean> = <Indonesian>"`, the shape Hangeul Mastery and the vocabulary editor use. Entry order is fixed through `createdAt` (a fixed base plus the entry's index in milliseconds).

The quiz is an assessment with 8 to 12 SINGLE_CHOICE questions (options shuffled, questions in order, no attempt or time limit, `passingScore` defaulting to 70).

## Validate (offline)

```bash
bun run --cwd apps/web pola:validate            # summary per chapter
bun run --cwd apps/web pola:validate --verbose  # also blocks and links per material, and materials nothing links to
```

It needs no database. It loads each chapter file separately, so a missing or broken file is named without hiding the others, and it checks:

- every manifest chapter has `content/<bab-key>.ts`, `content/index.ts` imports it, and no other files exist; each file's `key` matches its name;
- every manifest material of the chapter has a body with a description and blocks, and the chapter has no other materials;
- the vocabulary set has exactly one entry per material, in order, each with a term, at least one meaning and an example (Korean and Indonesian); a term used twice is a warning;
- the quiz has 8 to 12 SINGLE_CHOICE questions with unique kebab-case keys, a prompt and an explanation, and 3 or 4 distinct options with exactly one correct;
- every `ref()` names a manifest material (no `#anchors`), every link has text, and no hand-written `hakgyo-material:` hrefs exist;
- STYLE.md rules: no `opener()` (lessonPage), level-1 or level-2 headings, embedded assessments or vocabulary sets, and no `culture()` outside `ki-banmal-kapan` (one at most there) are errors; more than 18 blocks, or a table wider than 2 columns in `ik-*` (3 in `ki-*`), are warnings;
- grammar cards, conversations and culture blocks are well formed, there are no nested block lists and no draft markers (TODO, TBD, FIXME, XXX, lorem ipsum);
- each document passes the app's `findBlockNoteDocumentIssues`, has unique block ids, and loads into a headless BlockNote editor with the app schema unchanged; the workspace's course readiness rules pass.

`bun test scripts/pola-bahasa/import.test.ts` (from `apps/web`) runs the id, assembly, validation and plan tests on fixtures, plus the same checks over the chapter files that exist. `bun run --cwd apps/web typecheck` also checks the content: `content/index.ts` requires every chapter, and `ref()` only accepts manifest keys.

## Import

`pola:import` uses `DIRECT_URL` (or `DATABASE_URL`) from `apps/web/.env`. It validates the content first and refuses to run with any error. Make sure the system organization exists with an OWNER membership (`db:seed` creates it).

```bash
# Dry run: reads the database, prints what would be created, updated and deleted, writes nothing.
bun run --cwd apps/web pola:import
bun run --cwd apps/web pola:import --verbose

# Write everything, deletions included, in one transaction; then read back and verify.
bun run --cwd apps/web pola:import --execute
```

The import is idempotent: only fields that differ are written, and after writing it reads the database back and fails if anything still differs, so a second run reports everything unchanged. Materials are stored with `editorSchemaVersion` 1. It never creates cohorts or enrollments.

### Deletions (and the move from the old structure)

Rows the content no longer has are listed in every run and deleted by `--execute`: modules and items of the two Pola courses that the manifest does not list, `pb-` materials, vocabulary sets and quizzes of the system organization that no desired item places, and vocabulary entries, quiz questions and options that dropped out of a set or quiz. This is how the first import of the chapter structure replaces the old one (modules `pb-ki-sambung`, `pb-ik-mulai`, ...; long materials like `pb-ki-kata-sambung-material` with their `-item` and `-quiz-item` items and `pb-<oldKey>-quiz` quizzes). Nothing outside the two courses or without the `pb-` prefix is ever deleted.

The plan refuses, and nothing is written, when a row to delete has learner data (progress, attempts, assessment events, answers, option selections, vocabulary progress or practice), when a resource to delete is still placed by an item outside the Pola courses or required by a material, when a module to delete has cohort meetings, or when either course has any enrollment. `--execute` checks the same learner data again inside the transaction before deleting, and every delete must hit exactly the planned rows. Remove such rows by hand if they really must go.

### Rollout (not yet)

`--enroll-existing` is opt-in and never part of an import: it enrolls every existing (not deleted) user in both courses in batches of 500 and creates each course's default "Belajar mandiri" cohort (`--enroll-existing` alone is a dry run that counts them; add `--execute` to write). After that, deletions are refused because the courses have enrollments.
