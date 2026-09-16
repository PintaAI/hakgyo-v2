# Organization landing pages

Owners open **Landing page** in the organization sidebar at
`/workspace/{org-slug}/landing-page`. Each organization has at most one page,
enforced by the database primary key on `OrganizationLandingPage.organizationId`.

## Editing and publishing

- The full-screen Site studio keeps a live page canvas beside the inspector.
  Click a section to edit its content, or type directly into the hero headline
  and description. The section list also supports keyboard selection.
- The Design tab controls editorial/split/cover hero composition, gallery/list
  courses, paper/brand/ink surfaces, heading font and scale, spacing, corner
  shape, and hero image crop. Undo/redo tracks changes during the editing session.
- Design settings are saved and published with the page. Existing saved pages
  receive validated design defaults without a database migration.
- Edit hero copy, images, buttons, course selection, organization story,
  benefits, testimonials, FAQ, contact details, and SEO/social metadata.
- Show, hide, and reorder sections. An empty course selection means all eligible
  courses, including future published public courses.
- Preview the draft at desktop or mobile width. Save draft does not change the
  live page; Publish copies the saved configuration to the public snapshot.
- Unpublish immediately removes public content and its sitemap entry.
- Logo, accent colors, and body font follow organization branding. Heading font
  can follow the brand or use the editorial/modern choices in the Design tab.
  Branding and course availability are read live, independently of draft content.
- Hero and social images upload directly to the configured R2 bucket. Existing
  public HTTP(S) image URLs remain valid for previously saved pages. Logo uploads
  remain in the existing organization settings.

## API and visibility

`GET /api/organization-landing/{org-slug}` returns the published organization
branding, configuration, and courses. Missing or unpublished pages return 404.
Responses use `Cache-Control: no-store` so revocation takes effect immediately.

The `organizationLanding` tRPC router exposes `get`, `saveDraft`, `publish`, and
`unpublish` to organization owners only, plus the public `getPublic` query.

Only courses belonging to the organization with status `PUBLISHED` and effective
enrollment mode `OPEN` are exposed. Courses inheriting enrollment settings use the
organization default. Private, archived, and draft courses are excluded, including
their IDs in the returned selection. Public responses never contain draft page
content. Existing application route names are reserved organization slugs.

## SEO and deployment

The public `/{org-slug}` route renders on the server with canonical URLs,
Open Graph/Twitter metadata, organization/course/FAQ structured data, and a
published-page sitemap. `APP_URL` sets the canonical domain; configure it as
`https://hakgyo.com` in production. Search engines choose when to index updates.

Apply migration `20260915120000_organization_landing_page`, regenerate Prisma,
and restart any existing development process that has cached the old Prisma
client. The migration adds one table and a cascading organization foreign key.
