# Hakgyo BlockNote Custom Blocks

Hakgyo stores lesson content as BlockNote `editor.document` JSON. This is an
array of BlockNote blocks, not a Tiptap or raw ProseMirror document. The editor,
server contract, and MCP block catalog must stay aligned whenever a custom block
is added or changed.

## Current Example: Callout

The example custom block is `callout`. Authors can insert it from the BlockNote
slash menu and AI clients discover it through
`get_material_block_catalog`.

```json
{
  "type": "callout",
  "props": { "tone": "tip" },
  "content": "Remember: the denominator represents the total equal parts.",
  "children": []
}
```

Supported tones are `info`, `tip`, `warning`, and `success`.

## Hangeul Blocks

Four blocks teach Hangeul, mainly in the Hangeul Mastery foundation course.
Their props are defined in `docs/hangeul-mastery.md` ("Hangeul blocks"); the
type names, parsers, game keys and stages live in `@hakgyo/shared/hangeul`, so
the web editor, the web learner view and the mobile renderer read the JSON
props the same way.

| Type                  | Slash menu          | Shows                                                                                       |
| --------------------- | ------------------- | ------------------------------------------------------------------------------------------- |
| `hangeulLetters`      | Kartu huruf Hangeul | Letter cards: large character, name, Indonesian sound cue, romanization, note, example word |
| `hangeulContrast`     | Pasangan bunyi      | Rows of two or three similar-sounding words side by side                                    |
| `hangeulSyllableGrid` | Tabel suku kata     | Consonant × vowel table of composed syllables, optional batchim                             |
| `hangeulGame`         | Permainan Hangeul   | A card that opens a mobile Hangeul game at a stage                                          |

- Every clip is an `assetId` inside a JSON prop. `collectMaterialAssetIds`
  reads them with `collectContentAssetIds`, so saving links the files to the
  material (learner access, offline bundles, starter-course cloning through
  `remapIds`), and the editor deletes a clip's file when it leaves the
  document.
- Web components: `components/editor/blocks/hangeul-*.tsx`, with the shared
  play button, upload control and header in `hangeul-block-parts.tsx`. Clip
  URLs are signed when a block mounts (batched like other media) so a click can
  start playback right away; one clip plays at a time on the page. A missing or
  unavailable asset hides its play button.
- Authors edit titles, cues and rows in place. Each letter, example word,
  contrast item and grid syllable has its own audio upload (`audio/*`, up to
  50 MB, through the editor's asset storage); there is no picker for files
  already in the library. Grid audio is listed under the table in "Audio suku
  kata"; entries whose syllable is no longer in the table stay until removed
  there.
- While editing, empty cards and rows with fewer than two items are kept so
  they can be filled in; learners only see what the shared parsers accept.
- Grid romanization is `romanizeHangeulSyllable`, the Revised Romanization of
  each syllable read on its own (no sound changes between syllables).
- `hangeulGame` on the web explains that the game is in the app and links to
  `hangeulGameDeepLink(...)` plus the store badges (`components/store-badges.tsx`).
  On mobile it pushes `hangeulGamePath({ gameKey, stage, courseItemId })` with
  the `courseItemId` passed to `NativeContentRenderer`. Content rendered without
  one (assessment questions and options) shows the card without opening the
  game, so a learner never leaves an attempt by accident.
- Mobile renderers: `apps/mobile/src/components/content-renderer/hangeul-blocks.tsx`,
  one expo-audio player per block, resolving clips through the renderer's asset
  resolver (offline copies first). The grid keeps its consonant column fixed
  while the vowels scroll horizontally.

## Source Of Truth

- `apps/web/src/lib/blocknote/block-catalog.ts` contains AI-facing metadata,
  stable type names, prop values, guidance, and examples.
- `apps/web/src/components/editor/blocks/` contains React block
  implementations.
- `apps/web/src/components/editor/block-note-schema.ts` registers custom blocks
  with the default BlockNote schema.
- `apps/web/src/components/editor/block-note-editor.tsx` exposes blocks in the
  slash menu.
- `apps/web/src/server/mcp/server.ts` exposes the shared catalog through MCP.

Do not duplicate a custom block type as unrelated string literals. Export its
type and constrained prop values from `block-catalog.ts`, then import those
constants in the React block implementation and schema registration.

## Adding A Custom Block

1. Add the type, purpose, content mode, props, usage guidance, and one valid
   example to `hakgyoBlockCatalog.customBlocks`.
2. Increment `catalogVersion` when the accepted AI-facing contract changes.
3. Implement the block with `createReactBlockSpec` under
   `components/editor/blocks`.
4. Register the resulting block spec in `hakgyoBlockNoteSchema` alongside
   `defaultBlockSpecs`.
5. Add a slash-menu item so human authors can insert the same block.
6. If an existing block shape changes, increment `editorSchemaVersion` and add
   a migration before writing the new shape.
7. Add catalog contract tests for the type, enum props, and example.
8. Run lint, typecheck, tests, and the production build before deployment.

The MCP tool itself has a stable schema and reads the shared catalog at runtime.
After deploying a new block, AI clients can discover it without adding another
MCP tool. Content prompts and tool descriptions must continue instructing the
model to call `get_material_block_catalog` before `create_material` or
`update_material`.

## Block Contract Rules

- Use BlockNote JSON, never `{ "type": "doc", "content": [...] }` Tiptap JSON.
- The root value is an array of blocks.
- New blocks may omit `id`; BlockNote generates it.
- `type`, `props`, `content`, and `children` must match the current catalog.
- Custom block examples must render when passed as `initialContent`.
- Unknown types and unsupported enum props should be rejected before database
  writes once strict server validation is introduced.
- Never expose credentials, signed URLs, or internal storage keys as block
  props.

## AI Verification Prompt

After deployment, verify with:

```text
Use Hakgyo to read the current BlockNote block catalog. Create a draft material
that contains a heading, two paragraphs, and a tip callout. Use only the exact
BlockNote JSON structure and custom block props returned by the catalog.
```
