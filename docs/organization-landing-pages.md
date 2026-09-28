# Organization landing pages

Each organization has at most one public landing page at `/{org-slug}`,
enforced by the primary key on `OrganizationLandingPage.organizationId`. The page
is a single HTML file with inline CSS and JavaScript. It is designed by the
owner's own AI client through MCP; the web editor only edits copy, reviews
revisions, and publishes. Only organization owners can manage the page.

## Authoring flow

1. The owner connects an MCP client (Claude, ChatGPT, Cursor, …) to Hakgyo and
   asks it to design the page. The editor's **Desain dengan AI** tab has a
   ready-made prompt.
2. The AI reads `hakgyo.landing.get_guidelines` and `hakgyo.landing.get_context`,
   then sends the full document to `hakgyo.landing.update_draft`.
3. The server validates the document and returns a list of errors (with line
   numbers) for the AI to fix, or stores it as a new draft revision.
4. The editor at `/workspace/{org-slug}/landing-page` polls
   `organizationLanding.status` every 3 seconds and reloads the preview when a
   new revision arrives. It does not reload while the owner has unsaved copy
   edits; it shows a banner instead.
5. The owner edits copy, restores revisions if needed, and publishes. AI clients
   cannot publish.

Organizations without a draft start from a starter template
(`src/server/organization-landing/default-template.ts`) that follows the same
contract and passes the same validation.

## Document contract

`src/server/organization-landing/guidelines.ts` is the source of truth given to
AI clients. `validateLandingHtml` in `html.ts` enforces it:

- Required structure: doctype, `<html lang>`, viewport meta, `<title>`, and meta
  description. Maximum 500,000 bytes.
- No forms or inputs, frames, plugins, `<base>`, `<meta http-equiv>`, external
  scripts, or scripts using eval, cookies, storage, network APIs, parent windows,
  or redirects.
- Hakgyo links (app origin or `hakgyo://`) must match the allowlist from
  `get_context`: the landing page, catalog, sign-in, each public course page,
  and each course's app handoff page. External `https://` links are accepted
  with a warning for the AI to confirm with the owner.
- Images, media, icons, `og:image`, and CSS `url()` must come from allowed
  origins: the app, the R2 public bucket, and the origins of the logo, course
  thumbnails, and uploaded images. Fonts may load only from Google Fonts.
- `data-hakgyo-edit="key"` marks owner-editable copy. Marked elements contain
  only text; `<meta name="description">` edits its `content`.
- `data-hakgyo-slot="courses"` contains one `<template>` course card with
  `data-hakgyo-field` values `title`, `link`, `image`, `description`, and
  `price`. The server fills it with live public courses on every request.

The editor saves copy by replacing the text of marked elements
(`applyLandingCopy`), so owners never edit markup.

Owners edit copy directly on the preview canvas. The editor loads the draft
preview with `?edit=1`, which injects `editor-bridge.ts`: it makes marked
elements `contenteditable="plaintext-only"` and exchanges `postMessage` updates
with the editor, keeping the canvas and the side panel in sync. The frame stays
sandboxed; because AI-authored scripts share it, the editor validates every
message and only accepts plain text for known copy keys. Nothing is stored
until the owner saves.

## Serving and isolation

- `/{org-slug}` is a server-rendered wrapper: metadata (title, description,
  Open Graph image) comes from the published document's `<head>`, and the page
  itself is a full-screen `<iframe sandbox="allow-scripts allow-popups
allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation">`.
- `/api/organization-landing/published/{slug}` serves the published document;
  `/api/organization-landing/draft/{organizationId}` serves the owner's draft
  preview. Both fill the course slot, add `<base target="_top">`, and send a
  CSP with `sandbox`, so the document has an opaque origin even when opened
  directly. It cannot read Hakgyo cookies or call the API as the visitor, and
  `connect-src 'none'` blocks network access.
- `next.config.js` allows same-origin framing for these routes only; the rest
  of the app keeps `X-Frame-Options: DENY`.
- Responses use `Cache-Control: no-store`, so unpublishing takes effect
  immediately. Published pages appear in the sitemap.

SEO is limited while the page lives in a frame. Serving documents from a
separate domain (for example `{slug}.hakgyo.site`) would remove the frame
without changing the document contract.

## Data model

- `draftHtml` and `draftRevisionId` point at the newest revision.
- `publishedHtml`, `publishedRevisionId`, and `publishedAt` hold the public
  snapshot. Publishing requires the revision the owner reviewed; a changed draft
  returns `CONFLICT`.
- `OrganizationLandingRevision` stores every draft change with its source
  (`MCP`, `EDITOR`, or `RESTORE`), summary, and author. The newest 50 revisions
  are kept. Saves compare-and-swap `draftRevisionId`, and clients may pass
  `baseRevisionId` to reject edits made on a stale draft.
- `imageUrls` is the owner's image library. Uploads go to R2 through the
  existing landing image upload procedures; images used by the draft or live
  page cannot be deleted.

Migration `20261001000000_ai_landing_html` is additive. The legacy `draft` and
`published` JSON columns from the section editor are unused and can be dropped
in a follow-up migration after deployment. Pages published with the section
editor are not served until the owner publishes an HTML draft.

## MCP tools

| Tool                              | Purpose                                             |
| --------------------------------- | --------------------------------------------------- |
| `hakgyo.landing.get_guidelines`   | Contract, allowed URLs rules, and do's and don'ts   |
| `hakgyo.landing.get_context`      | Organization, courses, images, links, asset origins |
| `hakgyo.landing.get_draft`        | Draft HTML, `revisionId`, and editable fields       |
| `hakgyo.landing.update_draft`     | Validate and save a document as a new revision      |
| `hakgyo.landing.list_revisions`   | Recent revisions                                    |
| `hakgyo.landing.restore_revision` | Make an earlier revision the draft again            |

Every tool re-checks the caller's live OWNER role.
