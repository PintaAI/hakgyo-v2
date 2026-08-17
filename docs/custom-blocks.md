# Hakgyo BlockNote Custom Blocks

Hakgyo stores lesson content as BlockNote `editor.document` JSON. This is an
array of BlockNote blocks, not a Tiptap or raw ProseMirror document. The editor,
server contract, and MCP block catalog must stay aligned whenever a custom block
is added or changed.

## Current Example: Callout

The example custom block is `callout`. Authors can insert it from the BlockNote
slash menu and AI clients discover it through
`hakgyo.content.get_block_catalog`.

```json
{
  "type": "callout",
  "props": { "tone": "tip" },
  "content": "Remember: the denominator represents the total equal parts.",
  "children": []
}
```

Supported tones are `info`, `tip`, `warning`, and `success`.

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
model to call `hakgyo.content.get_block_catalog` before `createMaterial` or
`updateMaterial`.

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
