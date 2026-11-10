# Hangeul Mastery

Hangeul Mastery (`hakgyo-foundation-hangeul-mastery`, in the Hakgyo system organization) is the free foundation course every learner is enrolled in at sign-up. It takes an Indonesian speaker with no Korean to reading and writing Hangeul, batchim included, in about 25 short lessons (5–8 minutes each). It teaches only what helps a learner read: no history, romanization theory or letter names. Finishing every item earns the `HANGEUL_MASTERY` achievement and hides the course and the Hangeul game section until the learner shows them again in settings.

The pedagogy research behind the outline (letter order, Indonesian sound comparisons, romanization, assessment design, vocabulary by stage) is summarised below; the sources are in the PR that introduced the course.

## Where things live

| Part | Location |
|---|---|
| Shared contract (block types, prop parsers, game stages, syllable composer, course id, achievement code) | `packages/shared/src/hangeul/` (`@hakgyo/shared/hangeul`) |
| Course content, as typed data | `apps/web/scripts/hangeul-mastery/content/` |
| Block builders for the content | `apps/web/scripts/hangeul-mastery/blocks.ts` |
| Importer (idempotent upsert by stable ids) and audio generation | `apps/web/scripts/hangeul-mastery/` |
| Web blocks (editor and learner rendering) | `apps/web/src/components/editor/blocks/hangeul-*.tsx` |
| Mobile renderers | `apps/mobile/src/components/content-renderer/hangeul-blocks.tsx` |
| Mobile games and their stages | `apps/mobile/src/games/` |
| Completion, badge and hiding | `apps/web/src/server/foundation/` |

## Hangeul blocks

All four are `content: "none"` custom blocks. List props are JSON strings, like the conversation and culture blocks. Every audio clip inside a JSON prop is an `assetId` key, so `collectContentAssetIds` and `collectMaterialAssetIds` pick it up for offline bundles, learner download permissions and starter-course cloning.

### `hangeulLetters`: letter cards

| Prop | Type | Default |
|---|---|---|
| `title` | string | `""` |
| `showRomanization` | boolean | `true` |
| `letters` | JSON string | `"[]"` |

`letters` is an array (up to 30) of `{ id, character, name, cue, romanization, note, assetId, example }`. `example` is `{ word, meaning, romanization, assetId }` or `null`. `cue` is the Indonesian sound aid; `assetId` plays the letter's sound (the letter in a syllable, 아 for ㅏ). Cards show the large character, the name, the cue, the romanization when enabled, the note, and the example word with its meaning; tapping the character or the example plays its clip.

### `hangeulContrast`: minimal pairs

| Prop | Type | Default |
|---|---|---|
| `title` | string | `""` |
| `instructions` | string | `""` |
| `showRomanization` | boolean | `true` |
| `rows` | JSON string | `"[]"` |

`rows` is an array (up to 12) of `{ id, note, items }`, where `items` holds 2 or 3 `{ text, romanization, meaning, assetId }`. Each row shows its items side by side with a play button each, so learners can hear 사다 / 싸다 or 자다 / 차다 / 짜다 back to back.

### `hangeulSyllableGrid`: consonant × vowel table

| Prop | Type | Default |
|---|---|---|
| `title` | string | `""` |
| `consonants` | JSON string of jamo | `"[]"` |
| `vowels` | JSON string of jamo | `"[]"` |
| `final` | string (one batchim jamo or empty) | `""` |
| `showRomanization` | boolean | `false` |
| `audio` | JSON string of `{ syllable, assetId }` | `"[]"` |

Rows are consonants, columns are vowels (up to 14 each); each cell is `composeHangeulSyllable(consonant, vowel, final)` and plays its clip when it has one. Use `ㅇ` as the consonant for vowel-only rows.

### `hangeulGame`: open a game

| Prop | Type | Default |
|---|---|---|
| `gameKey` | `stroke-master`, `syllable-forge` or `word-builder` | `stroke-master` |
| `stage` | a stage id, or empty for everything | `""` |
| `title` | string | `""` |
| `description` | string | `""` |

On mobile the card opens `hangeulGamePath({ gameKey, stage, courseItemId })`, and leaving the game returns to the lesson. On web it is a card explaining that the game is in the app: on an iPhone or Android phone it has a "Buka di aplikasi" link (`hangeulGameDeepLink`) and the store links, on a computer only the store links and a hint to open the lesson in the app on the phone. The platform is decided after mount, like `AppHandoff`, so the server render stays the same.

## Game stages

Stages narrow a game to the letters taught so far. Ids are stored in content, so never rename or remove one (`HANGEUL_GAME_STAGES`). Each stage lists every letter it practises (`letters`) and the letters it adds (`teaches`); the letter game teaches `teaches` and reviews a few of the rest.

| Stage | Teaches | Course chapter |
|---|---|---|
| `vertical-vowels` | ㅇ + ㅏㅓㅣㅑㅕ | 1 |
| `horizontal-vowels` | ㅗㅜㅡㅛㅠ | 2 |
| `compound-vowels` | ㅐㅔㅒㅖㅘㅝㅙㅞㅚㅟㅢ (its Susun 한글 and Susun kata sets mix blocks of every vowel) | 3–4 |
| `core-consonants` | ㄴㅁㅅㅂㄱㄷㅈㅎㄹ (with every vowel) | 5 |
| `aspirated-tense` | ㅋㅌㅍㅊㄲㄸㅃㅆㅉ | 6 |
| `batchim` | nothing new; everything, with batchim | 8–9 |
| `basic-vowels`, `y-vowels`, `w-vowels` | the course's old order (basic vowels, consonants and vowels alternating) | none |

- `stroke-master` (the letter game) teaches and quizzes only the stage's letters.
- `syllable-forge` (Susun 한글) and `word-builder` (Susun kata) use challenge sets per stage that only use the stage's letters; only `batchim` has syllables with a final consonant. ㅇ and the vertical vowels make only five blocks and two words (아이, 아야), so chapter 1 has no Susun kata card. Chapters 1–2 show Susun 한글 as a first try; chapter 4 practises blocks with it properly.
- An app without a stage id plays every letter, so publish the app (OTA) before importing content that uses a new stage.

## Course outline

| # | Module key | Title | Teaches | Items |
|---|---|---|---|---|
| 1 | `m1-basic-vowels` | Vokal tegak | "Kenalan dengan Hangeul Mastery" (the course overview: what each chapter teaches, what the learner can do at the end, the badge and Pola Bahasa); the vertical vowels ㅏㅓㅣㅑㅕ, introducing ㅇ in front | 2 materials, vocabulary A, quiz |
| 2 | `horizontal-vowels` | Vokal mendatar | ㅗㅜㅡㅛㅠ: pronunciation and position below ㅇ | 1 material, vocabulary B, quiz |
| 3 | `m5-w-vowels` | Vokal rangkap | The 11 compound vowels; "Vokal Indonesia dan vokal Korea" (a i u e o in Hangeul, with examples) | 2 materials, vocabulary C, quiz |
| 4 | `syllable-blocks` | Blok suku kata | One block = one syllable, where the vowel goes, reading order, ㅇ silent in front and "ng" below | 1 material, vocabulary D, quiz |
| 5 | `m2-core-consonants` | Konsonan inti | ㄴㅁ, ㅅㅂ, ㄱㄷㅈ, ㅎㄹ (a consonant takes the place of ㅇ); polite phrases and the café dialogue | 5 materials, vocabulary E–G, quiz |
| 6 | `m4-aspirated-tense` | Konsonan berhembus dan tegang | ㅋㅌㅍㅊ, ㄲㄸㅃㅆㅉ, the three-way lab | 3 materials, vocabulary H–J, quiz (75%) |
| 7 | `m6-reading-writing` | Membaca dan menulis | Reading real words block by block; stroke order and typing on a phone | 2 materials, quiz |
| 8 | `m7-batchim-basics` | Batchim | The 7 final sounds; ㄴㅁㅇ, ㄹ, ㄱㅂㄷ and the letters that share their sound | 3 materials, vocabulary, quiz |
| 9 | `m8-batchim-rules` | Batchim ganda dan perubahan bunyi | 연음, double batchim (rule of thumb), ㅂ→ㅁ (합니다) and ㄱ→ㅇ (한국말) before ㄴ/ㅁ; other changes are left to listening | 3 materials, quiz |
| 10 | `m9-final-exam` | Ujian Hangeul Mastery | Everything | Intro material, final exam (30 questions, 80%) |

The vowels come first: Indonesian has five vowel letters, and most Korean vowels are those sounds (ㅏ ㅣ ㅗ ㅜ, ㅐ/ㅔ as the *e* in *bebek*) with a y or a w added, so learners start from what they know and meet only two new sounds (ㅓ, ㅡ) before any consonant. Chapters 1–3 introduce ㅇ in front of a vowel only briefly; chapter 4 teaches syllable blocks with ㅇ and the vowels, and the consonant chapters recall it by putting a consonant where ㅇ was. Chapters 1–4 therefore use only ㅇ and vowels, and their vocabulary is the few real words those spell. Some module keys predate this order (`m5-w-vowels` is chapter 3, `m2-core-consonants` chapter 5) and stay for progress.

The course is `SEQUENTIAL`: a module opens when every item of the earlier ones is done. Materials complete when the learner presses "Lanjutkan" (after any requirements), vocabulary sets when every entry has been practised, assessments when an attempt passes.

## Writing the content

- **Language.** Plain Indonesian, addressed to the learner as "kamu". Short sentences. Korean terms in Hangeul with the Indonesian gloss, not English.
- **Sounds against Indonesian, never English.** Compare with Indonesian words: ㅏ like *apa*, ㅣ like *ini*, ㅗ like the *o* in *obat*, ㅜ like the *u* in *batu*, ㅔ/ㅐ like the *e* in *bebek* (e taling; not *emas*, whose *e* is pepet), ㅊ like *c* in *cari* with a puff of air, ㄲㄸㅃㅉ like Indonesian *k t p c* (already unaspirated) with tense muscles. ㅓ and ㅡ are the only new vowel sounds: ㅓ is *o* with relaxed, unrounded lips; ㅡ is close to the *e* in *emas* (pepet) with flat lips (Korean spells that Indonesian *e* with ㅡ, as in 스마랑 for Semarang). ㄹ is a light single tap between vowels (not a rolled Indonesian *r*) and *l* as in *mobil* at the end.
- **Romanization is scaffolding.** Show it in chapters 1–5 (every vowel, the blocks and the core consonants), keep it off by default (`showRomanization: false`) from chapter 6, never use it in quiz answers. The course does not teach romanization rules.
- **Only what helps reading.** No history, trivia, romanization theory or letter names (기역, 니은). Shape logic ("one more stroke = y" or "= more breath") is welcome when it is the rule being taught; otherwise one short line in a letter card's note.
- **Each lesson is built from custom blocks**, 4–8 minutes, and says each thing once. The page already shows the material's title and description above the content, so start with the content itself; an `info` callout only when the lesson needs a sentence of framing. Then, picking only what the lesson needs: `hangeulLetters` cards (the cue is one comparison with an Indonesian word, the note at most one short sentence, no stroke-by-stroke instructions); a rule card from `rules()` only where there is a real pattern (vowel position, the 7 final sounds, 연음, ㅂ→ㅁ); a `hangeulContrast` where sounds are easy to confuse; a `hangeulSyllableGrid` once a group of letters is complete; a `hangeulGame` card once the stage's letters have all been taught (never with letters still to come); and a `success` callout "Ingat: …" only for a takeaway that is easy to get wrong. Avoid headings, bullet and numbered lists, plain tables, quotes and dividers; keep plain paragraphs to one or two sentences per lesson, and use standalone `audioClip`s only for whole phrases (at most three). Chapters 1–4 (`content/m1-basic-vowels.ts`, `horizontal-vowels.ts`, `compound-vowels.ts`, `syllable-blocks.ts`) are the reference: one lesson per group of letters, the letters with their Indonesian sound cue, the pattern (y, w, position) as one rule card, the confusable pairs, then the games.
- **No vocabulary or tugas cards in a lesson.** The module's vocabulary sets and quiz are items of their own right after the lessons, and the page shows the material's title and description above its content, so `vocabularyRef` / `assessmentRef` would only show the next item twice. Game cards stay: games are not items.
- **Each chapter opens with a `lessonPage`** (`lessonPage()` in `blocks.ts`), first in its first material (chapter 1's opens the whole course instead: what it teaches, what the learner gets, and its goals): a picture, the chapter's letters as the title with an Indonesian subtitle, optionally a two-line exchange the learner can read by the end of the chapter (only letters taught by then; left empty it is hidden), three focus cards and two goals. Labels and goals are Indonesian only. The builder sets every prop, because BlockNote fills omitted ones with the block's EPS sample.
- **Dialogues** use `conversation()`: a picture, the lines with their Indonesian translation (speaker names in Latin letters), and optionally questions; every other part stays empty and hidden. The block has no player, so the lines' `audioClip`s follow it. Chapter 5 (café) and chapter 9 (meeting a friend) have one.
- **Rule cards** are the `grammar` block. `rules()` sets every prop (BlockNote would otherwise fill in the block's Korean sample) and leaves the Korean fields empty, which the web and mobile renderers hide. A row is `when` (shown small), `result` (shown bold) and `example`; keep `result` very short so it fits beside `when` on a phone.
- **The first set.** Daily vocabulary (Hari ini) takes words only from open modules, so the first module must hold a vocabulary set: Kosakata A in chapter 1 gives new learners daily words from their first day (only four, because ㅇ and the vertical vowels spell few words). Perkenalan keeps its old key `m0-why-hangeul` (module 0 "Mulai di sini" was merged into module 1).
- **Vocabulary** sets only use letters taught by then and, before chapter 8, no batchim. Each entry has the Hangeul `term`, the Indonesian `definition`, `romanization`, and optionally an example written `Korean sentence = Indonesian translation` ("우유 주세요. = Minta susu."), using only letters taught by then. The Susun kata game cuts the Korean part of every example of 2–10 words into tiles, so never write notes or explanations as examples; leave the entry without one instead. Prefer words Indonesians recognise (loanwords such as 바나나, 커피, 버스), K-pop and drama words, and EPS-TOPIK basics. Each set is embedded with `vocabularyRef` in a material of the same module.
- **Quizzes** are auto-graded `SINGLE_CHOICE` questions (no written answers: they would need a teacher). Mix: letter → sound cue, sound (an `audioClip` in the prompt) → letter or word, read a word → meaning, which syllable block is built from these letters, spot the minimal-pair item. Distractors are the letters learners confuse (ㅓ/ㅗ, ㅡ/ㅜ, ㄱ/ㅋ/ㄲ). About 30% of each module quiz reviews earlier modules. Passing scores: 80%, the three-way lab quiz in chapter 6 at 75%. Add an explanation in Indonesian to every question.
- **Audio** comes from VoxCPM2. Reference clips with `audio("<Korean text>")`; the builders do this for letter cards, contrasts and grid cells. Speak letters as syllables (아, 가), never as isolated jamo.
- **Keys** are kebab-case and stable: module keys above, item keys like `m1-vowels-o-u` or `m1-quiz`. Never rename a key after the course is in production.

## Completion, badge and hiding

When the last published item of the course is completed (by web, a queued mobile operation or MCP), the same transaction:

1. awards `UserAchievement` `HANGEUL_MASTERY` (idempotent through `@@unique([userId, code])`), and
2. marks the learner's default-cohort enrollment `COMPLETED` with `completedAt`, which keeps access.

Learners who have mastered Hangeul no longer see the course in the web sidebar and the mobile sidebar, or the "Penguasaan Hangeul" section on Latihan. Cari leaves out the course, its modules, materials and quizzes, and the Hangeul games, but keeps its vocabulary sets and words: the vocabulary stays available after mastery, in Cari as in daily practice. Direct links keep working. Pengaturan (web dialog and mobile profile) shows a "Tampilkan Hangeul Mastery" switch once the course is mastered; it is stored in `UserPreference.showHangeulAfterMastery`, whose writes bump the learner's mobile sync state.

How it is wired:

- `awardHangeulMasteryIfComplete(tx, { userId, courseItemIds })` (`apps/web/src/server/foundation/hangeul-mastery-completion.ts`) runs after every completion write: `learning.markContentProgress`, vocabulary completion in `vocabulary/progress-service.ts`, and `markCourseItemCompleted` (passing a quiz, or a teacher grading one). Callers that know the items' course pass `courseId`, so other courses return without a query; the vocabulary path calls it only for placements that complete in that batch. It takes the learner's progress lock (`lockLearnerProgress`) before reading progress, so two overlapping final completions (for example a quiz submit and a teacher's grading) serialize and the later one sees the earlier one's writes. It returns at once for learners who already have the badge, and uses the course outline's completion rules (an assessment counts once a standalone attempt passed). `HANGEUL_MASTERY` is deliberately not in `DEFAULT_ACHIEVEMENT_RULES`, so rebuilding gamification after a content deletion never revokes it.
- Visibility comes from `getHangeulVisibility` (`apps/web/src/server/preferences/hangeul-visibility.ts`), exposed as `preferences.get` / `preferences.setShowHangeulAfterMastery` and in the learner index as `hangeul: { mastered, hidden }`. Indexes cached before the field existed lack it, which the app reads as not hidden.
- Only presentation lists filter the course (web `getMySidebarCourses`; mobile `src/lib/hangeul-visibility.ts`, where `isHiddenHangeulDocument` decides which Cari results to leave out). Access checks, course bundles and practice pools never do.
- The completion badge says the course is now hidden, or, when the learner kept "Tampilkan Hangeul Mastery" on (which means they had the badge already), that it stays listed.

## Updating the content

1. Edit the files in `apps/web/scripts/hangeul-mastery/content/`.
2. `bun run --cwd apps/web hangeul:audio` reports what is missing; add `--execute` to generate the missing clips with VoxCPM2 on the GPU PC, upload them to R2 and register them in the database. Clips are cached by text, so only new text is generated.
   For new or changed pictures (`content/images.ts`), run `bun run --cwd apps/web hangeul:images --execute` too.
3. `bun run --cwd apps/web hangeul:import` shows what would change; add `--execute` to write. Run it against development first, then production.
4. Commit the content, `audio-manifest.json` and `image-manifest.json` together.

The scripts use the database and bucket in `apps/web/.env` and do nothing without `--execute`.

Changing a vocabulary entry's `term` or `definition` resets learners' progress on that entry, and adding an item to a module a learner has finished reopens it.

### The importer

`hangeul:import` turns the content into rows with ids derived from the keys (`apps/web/scripts/hangeul-mastery/ids.ts`): module `hm-<module key>`, item `hm-<item key>-item`, its material, vocabulary set or assessment `hm-<item key>-material`, `-vocab` or `-assessment`, question `hm-<item key>-q-<question key>` with options `…-o-<hash of the option content>`, and vocabulary entry `hm-<item key>-e-<hash of the term>`. Reordering options or entries keeps their rows, so learners' answers and progress stay with them; editing an option's content or an entry's term makes a new row. It compares every row with the database and writes only the fields that differ, so a second run reports everything unchanged. Before writing it:

- replaces `hangeul-item:<key>` with the resource id of that item, which must be in the same module, and `hangeul-audio:<text>` with the clip's asset id;
- turns string prompts, options, explanations and instructions into one-paragraph BlockNote documents;
- checks every document against the block catalog and the course against the readiness rules (assessments complete, embedded and required resources placed and visible in the same module);
- links the files each material and assessment shows (`MaterialAsset`, `AssessmentAsset`) and sets each vocabulary entry's audio.

A text without a clip in this database stops the import; `--allow-missing-audio` strips those clips instead (the player hides). Modules, items and resources of the course that are no longer in the content are only reported, and kept ones move behind the content. `--prune` deletes them with their learner work (progress, attempts, assessment events), which is how the seeded module "Mulai dengan Hangeul" goes away. Removing a question, option or vocabulary entry that learners have answered or practised also needs `--prune`. Nothing outside the course and its system-organization resources is touched.

The whole import is one transaction, with the `--prune` deletions last: it lands completely or not at all, so after a failed run fix the cause and run it again. The content is also checked against the database constraints (whole-number scores, points above 0, a time limit above 0) before anything is written.

The course is owned by the importer. Edits made in the workspace to its modules, items, lessons, vocabulary or quizzes are overwritten by the next import, and files attached to its lessons or quizzes in the workspace are unlinked (the importer links exactly the files the content shows). Change the content files instead. The seed creates only the empty course; its old "Mulai dengan Hangeul" module is no longer seeded.

### Audio

`hangeul:audio` speaks every `hangeul-audio:` text in the content and every vocabulary term. The voice is one Seoul Korean woman, a patient teacher, designed once with VoxCPM2 from a description and kept as `scripts/hangeul-mastery/voice/voice-ref.wav`. Every clip continues from that clip and its exact words in Hi-Fi mode, which keeps one timbre; the reference ends with "따라 읽어 보세요" (read after me), so the next text comes out as a teacher saying it. The job runs in the GPU PC's `hakgyo-video` workspace (`gpu-run`), reusing that repository's `render/tts.py` and `render/whisper.py`.

Single syllables are unstable in TTS, so each text gets up to seven takes in rounds. A take passes when Whisper (Korean) hears the text, with ㅐ/ㅔ, ㅒ/ㅖ and ㅙ/ㅚ/ㅞ counted as the same sound, its speech length fits the number of syllables and a short text has no pause inside. When no take passes the best one is kept and flagged `review` in the manifest; the dry run lists the flagged clips, so listen to them and regenerate with `--only "<text>" --force` if needed. Kept takes are trimmed, levelled to -16 LUFS (true peak at most -1.5 dB), padded and encoded as 48 kHz mono 80 kbps MP3.

Seventeen clips of chapters 1–4 (아야, 요요, 여우, 이유, 여유, 유아, 우와, 외워요, 의외, 예의, 와요, 아이유, 왜요, 오예, 의의, 에이, 와이) were made with OpenAI `gpt-4o-mini-tts` while the GPU PC was off; their manifest voice is `openai-gpt-4o-mini-tts`, so `--stale` remakes them in the course voice.

`--limit <n>` and `--only <text>` (repeatable) narrow a run, `--force` regenerates the selected texts, and `--stale` regenerates clips made with an older voice (changing the reference, the settings or the processing changes the voice version).

### Pictures

`hangeul:images` makes the pictures listed in `content/images.ts` (one per chapter opener and dialogue) with OpenAI (`gpt-image-2.5-flare`, 1536×1024 WebP, `OPENAI_API_KEY`), uploads them to R2 under `hangeul-mastery/images/<sha256 prefix>.webp`, registers a confirmed Asset in the system organization and records them in `image-manifest.json` (committed, no ids). Content refers to a picture as `image("<key>")` (`hangeul-image:<key>`), which the importer swaps for the asset id like an audio clip. Every prompt gets `HANGEUL_IMAGE_STYLE`, which forbids any text in the picture: generated Hangeul comes out wrong. A picture is made again only when its prompt, the style or the model changes (`--force` remakes it anyway, `--only <key>` limits the run); without `--execute` it only reports. Every `--execute` run also makes sure each picture has its object and Asset row in this database, so it sets up another environment like `hangeul:audio`.

### Development and production

Asset ids differ per database, so the committed `audio-manifest.json` holds none. It maps each text to its R2 object key, which is content addressed (`hangeul-mastery/audio/<sha256 prefix>.mp3`), with its size, length, voice version, chosen take and what Whisper heard. Each environment has its own `Asset` row for that object key (`Asset.objectKey` is unique), and the importer looks clips up by object key.

Every `hangeul:audio --execute` run also makes sure each clip of the content has its object in the bucket and a confirmed Asset row in the system organization. To set up production after development:

1. Point `apps/web/.env` at production (or run with its variables).
2. `bun run --cwd apps/web hangeul:audio --execute` registers the clips. When production uses another bucket, add `--source-env <path to the development .env>` to copy the objects from the development bucket. Nothing is generated when the manifest already covers the content.
3. `bun run --cwd apps/web hangeul:import`, then `--execute` (and `--prune` once, to remove the seeded module).
