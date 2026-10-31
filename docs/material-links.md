# Material Links

A material link connects text in one material to another material, or to one
section of it. Learners tapping the link see a short preview and can open the
target. The contract lives in `@hakgyo/shared/material-links`
(`packages/shared/src/material-links.ts`) and is shared by the web and mobile
clients.

## Format

A material link is an ordinary BlockNote `link` inline node. Only its href is
special:

```json
{
  "type": "link",
  "href": "hakgyo-material:<materialId>#<blockId>",
  "content": [{ "type": "text", "text": "-아서/어서", "styles": {} }]
}
```

- `hakgyo-material:<materialId>` links the whole material.
- `#<blockId>` is optional and names a top-level block of the target, usually a
  heading. The section runs from that block to the next heading of the same or
  a higher level (`materialLinkSection`).
- No schema change and no new inline content type: clients that do not know
  the scheme still show the text. Use `formatMaterialLinkHref` /
  `parseMaterialLinkHref` rather than building strings by hand.

## Saving

- `sanitizeMaterialContent` (`src/server/content/material-references.ts`)
  turns links to materials that do not exist or belong to another organization
  into plain text (`unlinkInvalidMaterialLinks`, `src/lib/blocknote/material-links.ts`).
  The text stays; only the link goes.
- Links are not readiness requirements: a link to a material that is not in the
  course never blocks publishing.
- Course cloning remaps `hakgyo-material:<id>` hrefs through `remapIds`, keeping
  the anchor (block ids are copied unchanged with the content). Links to
  materials outside the cloned course keep pointing at the original.

## Resolving for learners

`learning.getCourseItem` returns `materialLinks: ResolvedMaterialLink[]`
(`resolveMaterialLinksForSources`, `src/server/learning/material-links.ts`).
Each entry is a target the viewer can open:

- An item placing the target material in the same course is preferred.
  Otherwise any item the viewer may study elsewhere: a published item of a
  published course they belong to through a cohort (any enrollment source,
  including FOUNDATION), or any item of a course they manage or staff. Items
  in locked modules of sequential courses are skipped.
- `description` is the material description, or an excerpt of its start
  (`materialExcerpt`) when it has none.
- `sections` holds a preview (`title`, `excerpt`) for each anchor the source
  links to.
- Targets the viewer cannot open are absent. Clients show "Materi ini belum ada
  di kelasmu" for them.

The resolution is batched: one material query and one course item query for
all items, plus one outline load when a sequential course is involved.

## Web

- Editor (`src/components/editor/material-link-editing.tsx`): with text
  selected, the formatting toolbar's **Tautkan materi** button opens a picker
  of the organization's materials (`content.listMaterials`), then the target's
  headings (`listMaterialHeadings` on `content.getMaterial`). The slash menu's
  **Tautan materi** inserts the chosen title as link text. The link toolbar
  names the target instead of the raw href and offers **Ubah tautan materi**.
  Both are only offered in the material editor (`resourceLibrary` set).
- BlockNote only keeps hrefs its `links.isValidLink` allows, so every editor
  and read-only document passes `isValidEditorLink`, which adds the
  `hakgyo-material:` scheme to BlockNote's default allowlist. Clicking a
  material link in the editor does nothing.
- Learner view (`learner-block-note-document.tsx`, `material-link-preview.tsx`):
  a click on a material link opens a popover from `sm` up and a bottom sheet
  on phones, with **Baca lengkap** linking to
  `/learn/<courseId>/items/<courseItemId>#<blockId>`. Documents rendered
  without `materialLinks` (block previews, practice content) leave material
  links inert.
- Anchor landing (`block-anchor.ts`): the learner item page waits for the
  block whose `data-id` matches the URL hash, scrolls it into view and
  highlights it briefly. It reruns on client-side navigation between items and
  on `hashchange`.
- Styling: `globals.css` gives `a[href^="hakgyo-material:"]` a dotted
  underline and a book icon in both the editor and the learner view.

## MCP

The block catalog notes (`src/lib/blocknote/block-catalog.ts`) describe the
href format. A section link needs the target heading to keep its block id, so
authors writing content meant to be linked should set explicit heading ids.
