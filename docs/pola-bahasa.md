# Pola Bahasa

Two linked courses that teach everyday Korean patterns to Indonesian speakers. Hakgyo publishes both as system content:

| Course                        | Id              | Slug              | Idea                                                                                                              |
| ----------------------------- | --------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------- |
| Pola Korea → Indo: Paham Pola | `pb-korea-indo` | `pola-korea-indo` | Start from a Korean pattern (-는데, -거든요, 좀) and explain it through Indonesian logic.                         |
| Indo → Korea: Berani Ngomong  | `pb-indo-korea` | `pola-indo-korea` | Start from words Indonesians say every day (padahal, kok, soalnya, ketiduran) and find how to say them in Korean. |

Every material in one course links to the matching sections of the other, so a learner reading about _padahal_ can open the -는데 section, and the reverse. Links are ordinary BlockNote link nodes whose href is `hakgyo-material:<materialId>#<blockId>` (contract in `packages/shared/src/material-links.ts`).

Both courses belong to the hidden Hakgyo system organization (`hakgyo-system-organization`), and the importer creates them with the organization's OWNER membership. They are published and free (price 0), with OPEN progression so links can jump to any material without module locks.

**Rollout state: course only.** The courses are imported with INVITE_ONLY enrollment and without any cohort or enrollment, so no learner can join them yet and no "Belajar mandiri" cohort exists. New users are not enrolled at sign-up either: `ensureFoundationEnrollments` (`apps/web/src/server/foundation/enrollment.ts`) only covers Hangeul Mastery, and `POLA_BAHASA_COURSE_IDS` is kept for when the rollout is decided. Learners can only follow a link into a course they are enrolled in, so material links between the two courses resolve only after enrollments exist. As published system courses they do appear in the "Salin dari Hakgyo" starter list when an organization is created.

To roll out later: switch `enrollmentMode` in `curriculum.ts` to OPEN if learners should join from the catalog, add `POLA_BAHASA_COURSE_IDS` to `FOUNDATION_COURSE_IDS` for new users, and run the import with `--enroll-existing` for existing users (this creates each course's default cohort).

## Where things live

| Part                                                                                                   | Location                                                                                   |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Outline: courses, modules, materials and their section keys                                            | `apps/web/scripts/pola-bahasa/manifest.ts`                                                 |
| Writing guide (Indonesian)                                                                             | `apps/web/scripts/pola-bahasa/STYLE.md`                                                    |
| Block builders (`defineMaterial`, `ref`, `grammar`, `ex`, `chat`, `opener`, `culture`, `quizRef`, ...) | `apps/web/scripts/pola-bahasa/blocks.ts`                                                   |
| Content, one file per material, default-exporting `defineMaterial(...)`                                | `apps/web/scripts/pola-bahasa/content/<material-key>.ts`, registered in `content/index.ts` |
| Stable ids                                                                                             | `apps/web/scripts/pola-bahasa/ids.ts`                                                      |
| Assembly and checks (pure)                                                                             | `apps/web/scripts/pola-bahasa/curriculum.ts`                                               |
| Plan (pure) and importer                                                                               | `apps/web/scripts/pola-bahasa/plan.ts`, `import.ts`                                        |
| Offline validation, and the BlockNote round trip                                                       | `apps/web/scripts/pola-bahasa/validate.ts`, `roundtrip.ts`                                 |
| Course id constants                                                                                    | `apps/web/src/server/foundation/constants.ts`                                              |

## Keys never change

Every id comes from a manifest key:

| Row or block                           | Id                                                                                                                                              |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Course                                 | `pb-<courseKey>`                                                                                                                                |
| Module                                 | `pb-<moduleKey>`                                                                                                                                |
| Material                               | `pb-<materialKey>-material`                                                                                                                     |
| Course item                            | `pb-<materialKey>-item`                                                                                                                         |
| Quiz (assessment)                      | `pb-<materialKey>-quiz`                                                                                                                         |
| Quiz course item                       | `pb-<materialKey>-quiz-item`                                                                                                                    |
| Quiz question                          | `pb-<materialKey>-quiz-q-<questionKey>`                                                                                                         |
| Quiz option                            | `<questionId>-o-<hash of the option text>`                                                                                                      |
| Section heading (level 2, link anchor) | `pb-<materialKey>--<sectionKey>`                                                                                                                |
| Any other block                        | `pb-<materialKey>--<part>-b<n>`, where `<part>` is `intro`, `outro` or the section key and `n` counts blocks in document order within that part |

Learner progress hangs on the item ids, and links from other materials point at the material and section ids. Renaming a key therefore breaks progress and links. Never rename or reuse a course, module, material or section key once the courses are imported. Adding new materials, modules or sections is fine. If something really must go away, remove it by hand in the workspace: the importer refuses to run while the courses hold modules or items the manifest does not list.

Block numbering restarts in every section. Editing one section only renumbers the blocks of that section, and section anchors never move.

Learner answers hang on the question ids, so never rename a question key either. Options are keyed by a hash of their text (as in Hangeul Mastery): reordering keeps them, editing an option's text makes a new option.

## Assembly

For each material the importer builds one BlockNote document: the `intro` blocks, then for each section a level-2 heading (the section title) followed by the section's blocks, then the `outro` blocks. Content files never add level-2 headings themselves; use `h3()` inside sections.

`ref(text, materialKey, sectionKey?)` writes a `pola-ref:<materialKey>[#<sectionKey>]` href, and assembly turns it into `hakgyo-material:pb-<materialKey>-material[#pb-<materialKey>--<sectionKey>]`.

Besides paragraphs, lists, tables, callouts and grammar cards, content uses three more custom blocks: `opener()` (a `lessonPage` lesson opener without an image, first in every `intro`), `chat()` (one `conversation` block) and `culture()` (a text-only `culture` block). The builders blank every sample text of the block defaults and empty the image, audio-track, practice, useful-expression and pronunciation parts; the learner renderers on web and mobile hide such blank optional parts.

### Quizzes

A material may have a `quiz` (title, description, optional `passingScore` defaulting to 70, and 5 to 15 questions with 3 or 4 options and an explanation each). The importer creates it as the assessment `pb-<materialKey>-quiz` (options shuffled, questions in order, no attempt or time limit) and places it as a published ASSESSMENT item `pb-<materialKey>-quiz-item` right after the material's item in the same module; later items of the module move one position down. The material embeds it with `quizRef()`, whose `pola-quiz:self` placeholder assembly replaces with the quiz id. An embedded assessment only resolves to an item of the material's own module (`getLearnerMaterialReferencesForSources` and the mobile course bundle), which is why the quiz item sits in that module.

## Validate (offline)

```bash
bun run --cwd apps/web pola:validate            # summary
bun run --cwd apps/web pola:validate --verbose  # also lists the sections nothing links to
```

It needs no database. It loads each content file separately, so a missing or broken file is named without hiding the others, and it checks:

- every manifest material has `content/<key>.ts`, `content/index.ts` imports it, and no other material files exist;
- each file's `key` matches its file name, and the title and description are not empty;
- the sections match the manifest exactly and in order, each has a title and at least one block;
- every `ref()` resolves to a manifest material and section, every link has text, and no hand-written `hakgyo-material:` hrefs exist;
- the assembled document passes the app's own `findBlockNoteDocumentIssues`, block ids are unique, and it loads into a headless BlockNote editor with the app schema (`hakgyoBlockNoteSchema`) with the same blocks, ids, types, props, text and links;
- no embedded vocabulary sets, and no embedded assessments but the material's own `quizRef()`; a material has a quiz exactly when it has one `quizRef()`;
- quizzes: 5 to 15 questions with unique kebab-case keys, a prompt and an explanation, 3 or 4 distinct non-empty options, exactly one correct option for SINGLE_CHOICE (at least one correct and one wrong for MULTIPLE_CHOICE), and the workspace's course readiness rules pass;
- grammar cards have a title, Korean and Indonesian descriptions, at most 12 rules and 12 examples, and well-formed rows;
- conversations have 1 to 16 complete lines and at most 8 questions, culture blocks have titles and non-empty Korean and Indonesian paragraphs, and openers have their title, subtitle, focus titles and objectives;
- every intro starts with `opener()` (an error once `OPENER_REQUIRED` in `curriculum.ts` is true, a warning before);
- no level-1 or level-2 headings inside the content, no nested block lists (spread `...chat([...])`), and no draft markers (TODO, TBD, FIXME, XXX, lorem ipsum).

It then prints sections, blocks and links in and out per material, the number of quizzes and questions, the number of links between the two courses, and warns about sections nothing links to. It exits non-zero on any error. `bun test scripts/pola-bahasa/import.test.ts` (from `apps/web`) runs the same checks over the content files that exist, plus the id, assembly and plan tests.

`bun run --cwd apps/web typecheck` also checks the content: `content/index.ts` requires every material, and `ref()` only accepts keys from the manifest.

## Import

`pola:import` uses `DIRECT_URL` (or `DATABASE_URL`) from `apps/web/.env`. It validates the content first and refuses to run with any error. Make sure the system organization exists with an OWNER membership (`db:seed` creates it).

```bash
# Dry run: reads the database, prints what would be created or updated, writes nothing.
bun run --cwd apps/web pola:import
bun run --cwd apps/web pola:import --verbose

# Write the courses, modules, materials, quizzes and items in one transaction.
bun run --cwd apps/web pola:import --execute

# Rollout only (not yet): enroll every existing (not deleted) user in both courses, in batches of 500.
# This creates each course's default "Belajar mandiri" cohort.
bun run --cwd apps/web pola:import --enroll-existing             # dry run: counts who would be enrolled
bun run --cwd apps/web pola:import --execute --enroll-existing
```

The import is idempotent: only fields that differ are written, and after writing it reads the database back and fails if anything still differs, so a second run reports everything unchanged. Materials are stored with `editorSchemaVersion` 1. `--enroll-existing` leaves existing enrollments as they are and only adds missing ones, so it is safe to run again.

Quiz questions and options the content no longer has (a removed question key, an option whose text changed) are listed in every run and deleted by `--execute` when no learner answered or chose them. When learners did, the import refuses: restore the key or text, or remove the row by hand. Nothing else is ever deleted.
