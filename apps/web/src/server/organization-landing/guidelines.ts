import {
  FONT_FILE_ORIGIN,
  FONT_STYLESHEET_ORIGIN,
  landingCourseFields,
  MAX_LANDING_HTML_BYTES,
} from "./html";
import { MAX_LANDING_FIELD_LENGTH } from "~/lib/organization-landing";

export const LANDING_GUIDELINES_VERSION = "2026-10-01";

/** Served by `hakgyo.landing.get_guidelines`; the validator enforces the "must" rules. */
export const landingGuidelines = `# Hakgyo landing page guidelines (version ${LANDING_GUIDELINES_VERSION})

You are designing the public landing page of one Hakgyo organization: a single
HTML file with inline CSS and JavaScript. Hakgyo validates every upload and
returns a list of errors to fix. The page is served in a sandboxed frame with
no network access, so everything must be inline.

## Workflow
1. Call hakgyo.landing.get_context for the organization's data, courses, images,
   and the exact URLs the page may link to.
2. Call hakgyo.landing.get_draft to start from the current page when revising it.
3. Send the complete document to hakgyo.landing.update_draft. Fix every returned
   error and send it again.
4. Share the returned editor URL. The owner reviews, edits copy, and publishes
   there. You cannot publish.

## Document requirements (enforced)
- Start with <!doctype html>, set <html lang>, and include
  <meta name="viewport" content="width=device-width, initial-scale=1">,
  a non-empty <title>, and <meta name="description" content="…">.
- At most ${MAX_LANDING_HTML_BYTES} bytes. No external scripts: inline all
  JavaScript and CSS.
- Web fonts may load only from ${FONT_STYLESHEET_ORIGIN} (stylesheets) and
  ${FONT_FILE_ORIGIN} (font files).
- Images, video posters, icons, og:image, and CSS url() must use https:// URLs
  from the allowed asset origins in get_context, or small inline data:image URIs.
- Links to Hakgyo (the app origin or hakgyo://) must be copied exactly from the
  links list in get_context. In-page links (#id) must point to an existing id.
  mailto: and tel: are allowed. Other external links must be https:// and are
  reported back as warnings to confirm with the owner.
- Not allowed: <form>, <input>, <textarea>, <select>, <iframe>, <object>,
  <embed>, <base>, <meta http-equiv>, and scripts that use eval, new Function,
  cookies, browser storage, network requests (fetch, XMLHttpRequest, WebSocket,
  EventSource, sendBeacon), dynamic import(), parent/top/opener windows, or
  script redirects.

## Editable copy (enforced)
Mark every visible piece of copy the owner may want to change with
data-hakgyo-edit="<key>", using lowercase keys such as hero.title,
hero.description, about.body, or faq.1.question.
- The marked element must contain only text (no nested elements) and at most
  ${MAX_LANDING_FIELD_LENGTH} characters. Wrap icons or links around it instead.
- Keys must be unique. Keep existing keys when revising so owner edits carry over.
- <title data-hakgyo-edit="seo.title"> and
  <meta name="description" data-hakgyo-edit="seo.description" content="…">
  are editable too (the meta edits its content attribute).

## Course slot (enforced)
Never hardcode the course list. Add an element with data-hakgyo-slot="courses"
containing exactly one <template> that designs a single course card. Hakgyo
fills it with the organization's live public courses on every request.
Supported data-hakgyo-field values inside the template: ${landingCourseFields.join(", ")}.
- title (required): text is replaced with the course title.
- link (required, on an <a>): href is set to the course page.
- image (on an <img>): src is set to the thumbnail; removed when missing.
- description: text replaced; removed when missing.
- price: text replaced, e.g. "Gratis" or "Rp150.000".
The filled slot gets data-hakgyo-count="<n>"; style the empty state with
[data-hakgyo-count="0"].

Example:
<div class="courses" data-hakgyo-slot="courses">
  <template>
    <a class="card" data-hakgyo-field="link" href="#">
      <img data-hakgyo-field="image" alt="">
      <h3 data-hakgyo-field="title">Course title</h3>
      <p data-hakgyo-field="description">Description</p>
      <span data-hakgyo-field="price">Gratis</span>
    </a>
  </template>
</div>

## Do
- Design mobile-first and responsive; test layouts from 360px wide upward.
- Use the organization's name, logo, and theme colors from get_context.
- Write in the organization's language (Indonesian unless the owner says
  otherwise), in a warm, clear, confident tone.
- Use semantic HTML (header, main, section, footer, h1–h3), descriptive alt
  text, visible focus styles, and at least WCAG AA color contrast.
- Keep the page readable without JavaScript; use JS only for enhancement
  (menus, accordions, carousels, subtle reveal animations).
- Respect prefers-reduced-motion.
- Give the main call to action a course link or the #id of the course slot.

## Don't
- Don't invent facts: no made-up testimonials, student counts, ratings,
  prices, teacher names, awards, addresses, or contact details. Leave out a
  section rather than filling it with placeholders, unless the owner supplied
  the content.
- Don't collect visitor data or imitate login screens.
- Don't add analytics, tracking pixels, ads, chat widgets, or third-party embeds.
- Don't copy another brand's design, logo, or copy.
- Don't autoplay audio or video, and avoid heavy animation.
`;
