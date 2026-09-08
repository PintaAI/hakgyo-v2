# BlockNote native image upload with Hakgyo R2 assets

Research date: 2026-09-08
Current upstream inspected: BlockNote 0.54.0
Repository version inspected: `@blocknote/core` and `@blocknote/react` 0.53.0

## Key conclusion

Use BlockNote's native `image` block and native file panel. It can use Hakgyo's existing private R2 flow without persisting an expiring signed URL: upload to R2, store the stable `hakgyo-asset:<assetId>` value in the image block's `url` prop, and have `resolveFileUrl` exchange that value for a signed download URL. This is the same pattern BlockNote officially demonstrates with a stored `s3://bucket/key` value and a resolver. [Official S3 example](https://www.blocknotejs.org/examples/backend/s3)

The current Hakgyo editor already contains the required bridge: its `uploadFile` delegates to the presigned-PUT/confirm flow and returns a nested block update containing the stable asset ID; its `resolveFileUrl` calls `storage.createDownloadUrl`; and its asset collector recognizes native `image`, `audio`, `video`, and `file` URLs. See [`block-note-editor.tsx`](../../apps/web/src/components/editor/block-note-editor.tsx). The custom image slash item is therefore unnecessary; retaining `getDefaultReactSlashMenuItems(editor)` provides the native Image item.

## Exact upload contract

The public File Panel guide presents the simple contract as:

```ts
(file: File) => Promise<string>;
```

The returned string becomes the block URL. Supplying `uploadFile` also makes the native file panel's Upload tab available; without it, only embedding by URL is available. [Official File Panel documentation](https://www.blocknotejs.org/docs/react/components/image-toolbar)

Current first-party source exposes the broader actual contract:

```ts
(file: File, blockId?: string) => Promise<string | Record<string, any>>;
```

The second argument identifies the block receiving the upload. The source describes an object result as props/data to apply to the file block. [BlockNoteEditor source, v0.54.0](https://github.com/TypeCellOS/BlockNote/blob/v0.54.0/packages/core/src/editor/BlockNoteEditor.ts#L307-L320)

The React upload panel handles the two return forms differently:

- A string is converted to `{ props: { name: file.name, url: result } }`.
- An object is passed directly to `editor.updateBlock(blockId, result)`.

Therefore an object result must have `PartialBlock` structure. For Hakgyo the correct result is:

```ts
return {
  props: {
    name: file.name,
    url: `hakgyo-asset:${assetId}`,
  },
};
```

Returning `{ name, url }` at the top level is not the expected update shape. An object result is preferable here because it also preserves the name in BlockNote's clipboard/file-insertion path, whereas that path wraps a string result with only `props.url`. [UploadTab source, v0.54.0](https://github.com/TypeCellOS/BlockNote/blob/v0.54.0/packages/react/src/components/FilePanel/DefaultTabs/UploadTab.tsx#L45-L77) and [file insertion source, v0.54.0](https://github.com/TypeCellOS/BlockNote/blob/v0.54.0/packages/core/src/api/clipboard/fromClipboard/handleFileInsertion.ts#L190-L207)

BlockNote catches a rejected upload, shows its generic upload error state, and leaves the block unpopulated. Validation, authorization, progress detail, and cleanup of any partially created backend object remain the application's responsibility.

## Native image block data

The native image block stores:

```ts
{
  type: "image";
  props: {
    backgroundColor: string;
    textAlignment: "left" | "center" | "right" | "justify";
    name: string;
    url: string;
    caption: string;
    showPreview: boolean;
    previewWidth: number | undefined;
  };
  content: undefined;
  children: Block[];
}
```

Defaults are an empty `name`, `url`, and `caption`, `showPreview: true`, and no fixed `previewWidth`. The native image spec accepts `image/*`. [Official embed-block reference](https://www.blocknotejs.org/docs/features/blocks/embeds#image) and [image block source, v0.54.0](https://github.com/TypeCellOS/BlockNote/blob/v0.54.0/packages/core/src/blocks/Image/block.ts)

`name` is also used as image alt text by the current renderer, so using the uploaded filename supplies a fallback but not a meaningful authored description. `caption` is separate. If accessibility-quality alt text is required, the product needs an explicit authoring convention or UI beyond simply copying the filename.

## `resolveFileUrl` and stable asset IDs

`resolveFileUrl` has the contract `(url: string) => Promise<string>`. It is called when BlockNote needs a usable file URL, including rendering an image and downloading a file. [Official File Panel documentation](https://www.blocknotejs.org/docs/react/components/image-toolbar#resolving-urls) and [resolver hook source, v0.54.0](https://github.com/TypeCellOS/BlockNote/blob/v0.54.0/packages/react/src/blocks/File/useResolveUrl.tsx)

Yes, the native image block's string `url` may contain an opaque asset identifier or a custom scheme such as `asset://<id>`. BlockNote's first-party S3 example deliberately stores `s3://bucket/key`, detects that prefix in `resolveFileUrl`, and returns a presigned GET URL. [Official S3 example](https://www.blocknotejs.org/examples/backend/s3)

Hakgyo currently uses `hakgyo-asset:<id>`, not literally `asset://<id>`. That is valid and avoids saving an expiring R2 URL in document JSON. The resolver should return unknown/ordinary URLs unchanged so pasted external image URLs continue to work.

One caveat: live editor rendering and native download actions resolve the URL, but the image block's external-HTML serializer writes the stored `block.props.url` directly. If Hakgyo later exports BlockNote content to standalone HTML, it must resolve or rewrite `hakgyo-asset:` values as part of that export pipeline. [Image serializer source, v0.54.0](https://github.com/TypeCellOS/BlockNote/blob/v0.54.0/packages/core/src/blocks/Image/block.ts#L121-L165)

## Slash-menu behavior

The default Image slash item exists when the active schema contains an `image` block with a string `url` prop. Choosing it inserts an empty native image block and immediately opens the file panel. The panel includes Upload only when `uploadFile` is configured and always includes Embed. [Default slash-menu source, v0.54.0](https://github.com/TypeCellOS/BlockNote/blob/v0.54.0/packages/core/src/extensions/SuggestionMenu/getDefaultSlashMenuItems.ts#L230-L251) and [FilePanel source, v0.54.0](https://github.com/TypeCellOS/BlockNote/blob/v0.54.0/packages/react/src/components/FilePanel/FilePanel.tsx#L38-L62)

Hakgyo disables the stock controller and supplies its own controller, but appends `getDefaultReactSlashMenuItems(editor)`. That still includes the native Image item. BlockNote documents filtering that returned array to remove defaults, but no filtering is needed if the goal is to keep native Image and remove only Hakgyo's custom image item. [Official suggestion-menu documentation](https://www.blocknotejs.org/docs/react/components/suggestion-menus#finding-inserting-removing--reordering-items)

## Deletion and lifecycle limitations

BlockNote does not own uploaded-file lifecycle. Its native file delete button calls only `editor.removeBlocks([block.id])`; there is no storage-delete callback paired with `uploadFile`. [FileDeleteButton source, v0.54.0](https://github.com/TypeCellOS/BlockNote/blob/v0.54.0/packages/react/src/components/FormattingToolbar/DefaultButtons/FileDeleteButton.tsx)

Consequences:

- The application must detect removed or replaced asset references and detach/delete them itself.
- Undo/redo needs deliberate semantics. Physically deleting R2 as soon as a block disappears can make an undone block point at a deleted asset; deferred cleanup or garbage collection is safer.
- Upload completion races need cleanup. The native upload panel checks whether the target block still exists before applying the result, but an application that confirms/attaches the R2 asset inside `uploadFile` may leave an orphan if the user deletes the empty block while upload is in flight. [UploadTab source, v0.54.0](https://github.com/TypeCellOS/BlockNote/blob/v0.54.0/packages/react/src/components/FilePanel/DefaultTabs/UploadTab.tsx#L51-L72)
- Reference counting is outside BlockNote. An asset reused by multiple blocks/documents must not be physically removed until no persisted relationship still references it.
- Failed uploads and abandoned unconfirmed uploads require application cleanup; BlockNote only reports upload failure in its UI.

Hakgyo already compares asset IDs before and after editor changes and delegates detach/delete to its R2 asset flow. Its server also rejects deletion while persisted material, assessment, or vocabulary relations still reference an asset. This covers the basic native-block path, but immediate deletion still deserves an explicit undo/orphan policy before the custom image block is fully retired. See [`block-note-editor.tsx`](../../apps/web/src/components/editor/block-note-editor.tsx) and [`storage.ts`](../../apps/web/src/server/api/routers/storage.ts).

## Recommended wiring

1. Keep one R2 upload function: create the upload record and signed PUT URL, PUT the file, confirm it, and attach the returned asset ID to the owning material/assessment.
2. Give that function to BlockNote as `uploadFile` and return a `PartialBlock` update whose `props` contain the file `name` and `url: "hakgyo-asset:<assetId>"`.
3. Keep `resolveFileUrl` on every editor/renderer that displays native file blocks; resolve Hakgyo IDs through `storage.createDownloadUrl` and pass external URLs through.
4. Keep the default native Image slash item and remove the custom image item/block only after existing custom-block documents have a migration or backward-compatible renderer.
5. Keep lifecycle management outside BlockNote, preferably with deferred orphan cleanup so undo and upload races do not create broken references.
